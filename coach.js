/* M Share • coach.js — small, dependency‑free helpers
   - UK voice preference + safe TTS wrapper
   - Breath Coach (box / 4‑7‑8 / coherent 5‑5)
   - Simple Pomodoro (Focus Sprint)
   - PDF (links) quick builder
   - Grounding (5‑4‑3‑2‑1) voice guide
   - Local storage helpers
*/
(function(){
  'use strict';
  const Coach = {};

  // ---------- TTS ----------
  const PREF_KEY = 'mshare_tts_pref_v2';
  function getVoicePref(){ try{ return localStorage.getItem(PREF_KEY) || 'uk-auto'; }catch{ return 'uk-auto'; } }
  function setVoicePref(v){ try{ localStorage.setItem(PREF_KEY, v); }catch{} }
  function pickVoice(want){
    const list = (typeof speechSynthesis !== 'undefined') ? speechSynthesis.getVoices() || [] : [];
    if (!list.length) return null;
    // Prefer en-GB
    const score = v => {
      let s = 0, name=(v.name||'').toLowerCase(), lang=(v.lang||'').toLowerCase();
      if (lang.startsWith('en-gb')) s += 100;
      if (want === 'uk-f' && /female/.test(name)) s += 20;
      if (want === 'uk-m' && /male/.test(name)) s += 20;
      if (/google uk english/.test(name)) s += 15;
      if (/microsoft/.test(name)) s += 8;
      return s;
    };
    const wantPref = getVoicePref();
    let best = list[0], bestScore = -1;
    list.forEach(v => { const sc = score(v); if (sc > bestScore) { best = v; bestScore = sc; } });
    return best;
  }
  function speak(text, {rate=1, pitch=1} = {}){
    if (typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const want = getVoicePref();
      const v = pickVoice(want);
      if (v) u.voice = v;
      u.rate = rate; u.pitch = pitch;
      speechSynthesis.speak(u);
    } catch {}
  }
  Coach.speak = speak;
  Coach.getVoicePref = getVoicePref;
  Coach.setVoicePref = setVoicePref;

  // ---------- Breath Coach ----------
  // Usage: Coach.mountBreath('#breath1', { pattern:[4,4,4,4], minutes:1, title:'Box 4‑4‑4‑4' });
  Coach.mountBreath = function(selector, cfg){
    const el = document.querySelector(selector);
    if(!el) return;
    const c = Object.assign({ pattern:[4,4,4,4], minutes:1, voice:true, metronome:false, title:'Breath' }, cfg||{});
    const states = ['Inhale','Hold','Exhale','Hold'];
    el.innerHTML = `
      <div class="card" aria-live="polite">
        <h3 style="margin-top:0">${c.title || 'Breathing'}</h3>
        <div class="grid cols-3" style="gap:10px">
          <div class="tile">
            <label>Pattern (seconds)</label>
            <div class="kv-grid">
              <div><small>In</small><input type="number" min="1" max="20" value="${c.pattern[0]||4}" data-part="0"/></div>
              <div><small>Hold</small><input type="number" min="0" max="20" value="${c.pattern[1]||0}" data-part="1"/></div>
              <div><small>Out</small><input type="number" min="1" max="20" value="${c.pattern[2]||4}" data-part="2"/></div>
              <div><small>Hold</small><input type="number" min="0" max="20" value="${c.pattern[3]||0}" data-part="3"/></div>
            </div>
          </div>
          <div class="tile">
            <label>Duration (min)</label>
            <input type="number" min="1" max="20" value="${c.minutes||1}" data-mins/>
            <div class="actions" style="margin-top:6px">
              <label class="btn"><input type="checkbox" ${c.voice?'checked':''} data-voice/> Voice cues</label>
              <label class="btn"><input type="checkbox" ${c.metronome?'checked':''} data-beep/> Metronome</label>
            </div>
          </div>
          <div class="tile">
            <label>&nbsp;</label>
            <div class="actions">
              <button class="btn btn-success" data-act="start">Start</button>
              <button class="btn" data-act="pause" disabled>Pause</button>
              <button class="btn" data-act="stop" disabled>Stop</button>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:2rem;text-align:center" data-status>Ready</div>
        <div class="muted" style="text-align:center" data-meta>—</div>
      </div>`;
    const inp = Array.from(el.querySelectorAll('input[data-part]'));
    const mins = el.querySelector('input[data-mins]');
    const voice = el.querySelector('input[data-voice]');
    const beep = el.querySelector('input[data-beep]');
    const status = el.querySelector('[data-status]');
    const meta = el.querySelector('[data-meta]');
    const btnStart = el.querySelector('[data-act="start"]');
    const btnPause = el.querySelector('[data-act="pause"]');
    const btnStop  = el.querySelector('[data-act="stop"]');
    let timer=null, t0=0, remaining=0, phase=0, phaseLeft=0, running=false, paused=false;

    function readPattern(){ return inp.map(i=>Math.max(0, Math.min(20, parseInt(i.value||'0',10)||0))); }
    function tone(){
      if(!beep.checked) return;
      try{
        const ac = Coach.__ac || (Coach.__ac = new (window.AudioContext||window.webkitAudioContext)());
        const o=ac.createOscillator(), g=ac.createGain();
        o.type='sine'; o.frequency.value = (phase===0? 420 : phase===1? 300 : phase===2? 340 : 280);
        g.gain.value=0.0001; o.connect(g); g.connect(ac.destination);
        o.start(); g.gain.exponentialRampToValueAtTime(0.06, ac.currentTime+0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime+0.15); o.stop(ac.currentTime+0.16);
      }catch{}
    }
    function say(text){ if(voice.checked) Coach.speak(text, {rate:.98}); }
    function fmt(ms){ const s=Math.max(0,Math.round(ms/1000)); const m=String((s/60)|0).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return m+":"+ss; }
    function update(){ const pattern = readPattern(); const label = states[phase]; status.textContent = label + ' ' + phaseLeft + 's'; meta.textContent = 'Remaining: ' + fmt(remaining*1000); }
    function nextPhase(){
      const pattern = readPattern();
      phase = (phase + 1) % 4;
      phaseLeft = pattern[phase] || 0;
      if (phaseLeft === 0) { nextPhase(); return; }
      tone();
      say(states[phase]);
    }
    function tick(){
      if (!running || paused) return;
      if (phaseLeft <= 0){
        nextPhase();
      }
      phaseLeft--;
      remaining--;
      update();
      if (remaining <= 0){ stop(false); }
    }
    function start(){
      const pattern = readPattern();
      const totalPhase = pattern.reduce((a,b)=>a+b,0) || 1;
      remaining = Math.max(1, parseInt(mins.value||'1',10))*60;
      phase = 3; phaseLeft = 0; // will advance to 0 on first tick
      running = true; paused = false; t0 = performance.now();
      btnStart.disabled = true; btnPause.disabled = false; btnStop.disabled = false;
      say('Starting in 3, 2, 1'); setTimeout(()=>tone(), 300);
      clearInterval(timer); timer = setInterval(tick, 1000);
    }
    function pause(){
      if (!running) return;
      paused = !paused;
      btnPause.textContent = paused ? 'Resume' : 'Pause';
      if (!paused) { clearInterval(timer); timer = setInterval(tick, 1000); }
    }
    function stop(byUser = true){
      running = false; paused = false;
      btnStart.disabled = false; btnPause.disabled = true; btnPause.textContent='Pause'; btnStop.disabled = true;
      clearInterval(timer);
      status.textContent = 'Done'; meta.textContent = '—';
      if (byUser) {/* no-op */}
    }
    btnStart.addEventListener('click', start);
    btnPause.addEventListener('click', pause);
    btnStop.addEventListener('click', ()=>stop(true));
    update();
  };

  // ---------- Simple Pomodoro ----------
  // mountPomo('#pomo', {work:25*60, break:5*60})
  Coach.mountPomo = function(selector, cfg){
    const el = document.querySelector(selector); if(!el) return;
    const c = Object.assign({work:25*60, break:5*60}, cfg||{});
    el.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0">Focus Sprint</h3>
        <div class="grid cols-3" style="gap:10px">
          <div class="tile">
            <label>Work (min)</label><input type="number" min="5" max="60" value="${(c.work/60)|0}" data-work />
          </div>
          <div class="tile">
            <label>Break (min)</label><input type="number" min="1" max="20" value="${(c.break/60)|0}" data-break />
          </div>
          <div class="tile">
            <label>&nbsp;</label>
            <div class="actions">
              <button class="btn btn-success" data-act="start">Start</button>
              <button class="btn" data-act="pause" disabled>Pause</button>
              <button class="btn" data-act="stop" disabled>Stop</button>
            </div>
          </div>
        </div>
        <div style="text-align:center;font-size:2rem" data-label>Ready</div>
        <div class="muted" style="text-align:center" data-meta>—</div>
      </div>`;
    const w = el.querySelector('[data-work]');
    const b = el.querySelector('[data-break]');
    const btnStart = el.querySelector('[data-act="start"]');
    const btnPause = el.querySelector('[data-act="pause"]');
    const btnStop  = el.querySelector('[data-act="stop"]');
    const label = el.querySelector('[data-label]');
    const meta  = el.querySelector('[data-meta]');
    let mode='work', remain=0, timer=null, running=false, paused=false, t0=0;
    function fmt(s){ s=Math.max(0,s|0); const m=String((s/60)|0).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return m+':'+ss; }
    function update(){ label.textContent = (mode==='work'?'Focus ':'Break ') + fmt(remain); meta.textContent = (mode==='work'?'Working…':'Resting…'); }
    function tick(){ if(!running||paused) return; remain--; if(remain<=0){ if(mode==='work'){ mode='break'; remain=(parseInt(b.value||'5',10))*60; Coach.speak('Break time. Stand, breathe, soft eyes.'); } else { mode='work'; remain=(parseInt(w.value||'25',10))*60; Coach.speak('Focus round. Back to it.'); } } update(); }
    function start(){ mode='work'; remain=(parseInt(w.value||'25',10))*60; running=true; paused=false; t0=performance.now(); btnStart.disabled=true; btnPause.disabled=false; btnStop.disabled=false; clearInterval(timer); timer=setInterval(tick,1000); update(); }
    function pause(){ if(!running) return; paused=!paused; btnPause.textContent=paused?'Resume':'Pause'; }
    function stop(){ running=false; paused=false; clearInterval(timer); btnStart.disabled=false; btnPause.disabled=true; btnPause.textContent='Pause'; btnStop.disabled=true; label.textContent='Done'; meta.textContent='—'; }
    btnStart.addEventListener('click', start);
    btnPause.addEventListener('click', pause);
    btnStop.addEventListener('click', stop);
    update();
  };

  // ---------- Grounding (5‑4‑3‑2‑1) ----------
  Coach.mountGrounding = function(selector){
    const el = document.querySelector(selector); if(!el) return;
    el.innerHTML = `
      <div class="card">
        <h3 style="margin-top:0">5‑4‑3‑2‑1 Grounding</h3>
        <p class="muted">Name 5 things you can see, 4 you can feel, 3 you can hear, 2 you can smell, 1 you can taste. Use a calm voice.</p>
        <div class="actions">
          <button class="btn btn-success" data-act="voice">Start voice coach</button>
          <button class="btn" data-act="stop" disabled>Stop</button>
        </div>
        <div class="grid cols-3" style="gap:10px;margin-top:8px">
          <textarea rows="3" placeholder="5 things I can see…"></textarea>
          <textarea rows="3" placeholder="4 things I can feel…"></textarea>
          <textarea rows="3" placeholder="3 things I can hear…"></textarea>
          <textarea rows="3" placeholder="2 things I can smell…"></textarea>
          <textarea rows="3" placeholder="1 thing I can taste…"></textarea>
        </div>
      </div>`;
    const btnV = el.querySelector('[data-act="voice"]');
    const btnS = el.querySelector('[data-act="stop"]');
    let idx=0, loop=null, steps=[
      'Name five things you can see.',
      'Name four things you can feel with your skin.',
      'Name three things you can hear.',
      'Name two things you can smell.',
      'Name one thing you can taste.'
    ];
    function start(){ stop(false); idx=0; Coach.speak('We will ground now. Slow breath in, slow breath out.'); loop=setInterval(()=>{ if(idx<steps.length){ Coach.speak(steps[idx], {rate: .98}); idx++; } else { stop(false); } }, 8000); btnV.disabled=true; btnS.disabled=false; }
    function stop(byUser=true){ clearInterval(loop); btnV.disabled=false; btnS.disabled=true; if(byUser) Coach.speak('Grounding complete.'); }
    btnV.addEventListener('click', start); btnS.addEventListener('click', ()=>stop(true));
  };

  // ---------- PDF (links) builder ----------
  // Coach.downloadLinksPdf('Anxiety — UK Resources', [{name:'NHS — Breathing', url:'https://www.nhs.uk/...'}])
  Coach.downloadLinksPdf = async function(title, links){
    const W=1224, H=1584;
    const cnv=document.createElement('canvas'); cnv.width=W; cnv.height=H;
    const ctx=cnv.getContext('2d');
    ctx.fillStyle='#0a1020'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff'; ctx.font='bold 52px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillText(title, 72, 110);
    ctx.font='500 24px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.fillText('Generated by M Share — ' + new Date().toLocaleDateString(), 72, 150);
    let y=210; const boxes=[];
    ctx.font='600 28px ui-sans-serif,system-ui,Segoe UI,Roboto';
    links.forEach((r,i)=>{
      ctx.fillStyle='rgba(255,255,255,.96)';
      const name=(r.name||('Link '+(i+1)));
      ctx.fillText((i+1)+'. '+name, 72, y);
      y+=34;
      const url=r.url||''; ctx.fillStyle='#bfe6ff'; ctx.font='500 24px ui-sans-serif,system-ui,Segoe UI,Roboto';
      ctx.fillText(url, 92, y);
      const w=ctx.measureText(url).width;
      boxes.push({x:92,y:y-24,w:Math.max(w,220),h:30,url});
      y+=44; ctx.font='600 28px ui-sans-serif,system-ui,Segoe UI,Roboto';
    });
    // Simple 1‑page PDF with link annotations
    function b64ToBytes(b64){ const bin=atob(b64.replace(/^data:.*;base64,/,'')); const out=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
    function parseJpeg(bytes){ let i=2; while(i<bytes.length){ if(bytes[i]!==0xFF){ i++; continue; } const m=bytes[i+1], L=(bytes[i+2]<<8)|bytes[i+3]; if(m>=0xC0 && m<=0xC3){ return {w:(bytes[i+7]<<8)|bytes[i+8], h:(bytes[i+5]<<8)|bytes[i+6]}; } i+=2+L; } return {w:1224,h:1584}; }
    const jpeg=cnv.toDataURL('image/jpeg', .92); const img=b64ToBytes(jpeg); const dim=parseJpeg(img);
    const PW=595, PH=842, enc=new TextEncoder();
    const chunks=[], offs=[]; let off=0;
    function push(x){ const a=(typeof x==='string')?enc.encode(x):x; chunks.push(a); offs.push(off); off+=a.length; }
    function obj(n, body){ push(`${n} 0 obj\n`); push(body); push(`\nendobj\n`); }
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
    obj(2, `<< /Type /Pages /Count 1 /Kids [3 0 R] >>`);
    const annotRefs = links.map((_,i)=> `${6+i} 0 R`).join(' ');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R ${links.length?('/Annots ['+annotRefs+']'):''} >>`);
    const content = `q\n${PW} 0 0 ${PH} 0 0 cm\n/Im0 Do\nQ\n`;
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}endstream`);
    obj(5, `<< /Type /XObject /Subtype /Image /Name /Im0 /Width ${dim.w} /Height ${dim.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img); push(`\nendstream\nendobj\n`);
    boxes.forEach((a,i)=>{
      const sx = PW/1224, sy = PH/1584;
      const x1=a.x*sx, y1=PH-(a.y+a.h)*sy, x2=(a.x+a.w)*sx, y2=PH-(a.y)*sy;
      obj(6+i, `<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect [${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}] /A << /S /URI /URI (${(a.url||'').replace(/[()]/g,'\\$&')}) >> >>`);
    });
    const xrefStart = off; push('xref\n'); const count = 6 + boxes.length;
    push(`0 ${count+1}\n`); push('0000000000 65535 f \n'); for(let i=0;i<count;i++){ push(String(offs[i]).padStart(10,'0')+' 00000 n \n'); }
    push(`trailer << /Size ${count+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);
    const blob = new Blob(chunks.map(b=>b.buffer?b:new Uint8Array(b)), {type:'application/pdf'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(title||'resources')+'.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 8000);
  };

  // ---------- Expose ----------
  window.MSCoach = Coach;
})();