
// assets/js/voice-coach-pro.js
(() => {
  if (window.MShareVoiceCoach) return; // singleton
  const cfgUrl = (document.currentScript && document.currentScript.src)
    ? document.currentScript.src.replace(/voice-coach-pro\.js$/, 'voice-coach-config.json')
    : 'assets/js/voice-coach-config.json';

  const S = {
    on: true,
    rate: parseFloat(localStorage.getItem('vc_rate')) || 0.98,
    voiceName: localStorage.getItem('vc_voice') || '',
    voice: null,
    speaking: false,
    current: null,
    audioUnlocked: false,
    provider: 'webspeech',
    providerCfg: {},
    focus: null
  };

  // ---------- helpers ----------
  const qs  = (s, c=document) => c.querySelector(s);
  const qsa = (s, c=document) => Array.from(c.querySelectorAll(s));
  const on  = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts||{passive:true});
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  function unlock() {
    if (S.audioUnlocked) return;
    const unlockFn = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ac = new Ctx();
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          g.gain.value = 0.0001; o.start(); o.stop(ac.currentTime + 0.05);
          if (ac.state === 'suspended') ac.resume();
          setTimeout(()=>ac.close(), 50);
        }
      } catch {}
      S.audioUnlocked = true;
      window.removeEventListener('pointerdown', unlockFn, true);
      window.removeEventListener('keydown', unlockFn, true);
    };
    window.addEventListener('pointerdown', unlockFn, true);
    window.addEventListener('keydown',   unlockFn, true);
  }

  // ---------- provider config load ----------
  async function loadCfg(){
    try {
      const r = await fetch(cfgUrl, { cache:'no-store' });
      if (!r.ok) throw 0;
      const j = await r.json();
      S.provider = (j.provider || 'webspeech').toLowerCase();
      S.providerCfg = j;
    } catch {
      S.provider = 'webspeech';
      S.providerCfg = {};
    }
  }

  // ---------- voices (Web Speech) ----------
  async function voicesReady(timeout=6000) {
    let done = false;
    return new Promise(resolve => {
      const start = performance.now();
      const onVoices = () => {
        if (done) return;
        const v = speechSynthesis.getVoices();
        if (v && v.length) { done = true; resolve(v); }
      };
      try { speechSynthesis.addEventListener('voiceschanged', onVoices, { once:true }); } catch {}
      const check = () => {
        const v = speechSynthesis.getVoices();
        if ((v && v.length) || performance.now() - start > timeout) {
          done = true; resolve(v || []);
        } else setTimeout(check, 140);
      };
      check();
    });
  }
  function pickVoice(list, wanted=''){
    if (!list || !list.length) return null;
    const lc = s => (s||'').toLowerCase();
    const en = list.filter(v => /^en([-_]|$)/i.test(v.lang||''));
    if (wanted) {
      const byName = list.find(v => lc(v.name).includes(lc(wanted)));
      if (byName) return byName;
    }
    const prefs = ['Google UK English Male','Google UK English Female','Google US English','Microsoft Jenny','Microsoft Aria','Microsoft Guy','Samantha','Alex','Daniel','Serena','Karen','Moira','Tessa','Tom'];
    for (const p of prefs) {
      const m = list.find(v => lc(v.name).includes(lc(p)));
      if (m) return m;
    }
    return en[0] || list[0];
  }
  function splitSentences(t) {
    if (!t) return [];
    const clean = t.replace(/\s+/g,' ').replace(/[–—]/g,'—').trim();
    const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/g);
    const out = [];
    for (const p of parts) { if (p.length <= 260) out.push(p); else p.split(/,\s+/g).forEach(x=>out.push(x)); }
    return out.filter(Boolean);
  }

  // ---------- speech: Web Speech or external ----------
  async function speakWebSpeech(text) {
    if (!('speechSynthesis' in window)) return;
    await voicesReady();
    const voices = speechSynthesis.getVoices();
    S.voice = pickVoice(voices, S.voiceName);
    if (!S.voice) return;
    const chunk = new SpeechSynthesisUtterance(text.replace(/;|—/g, ','));
    chunk.voice  = S.voice;
    chunk.rate   = clamp(S.rate, 0.9, 1.15);
    chunk.pitch  = 1.0;
    chunk.volume = 1.0;
    S.speaking = true;
    S.current = chunk;
    await new Promise(res=>{
      chunk.onend = chunk.onerror = () => { S.speaking=false; S.current=null; res(); };
      speechSynthesis.speak(chunk);
    });
  }

  async function speakAzure(text) {
    const key = S.providerCfg.azureKey, region = S.providerCfg.azureRegion, voice = S.providerCfg.azureVoice || 'en-GB-RyanNeural';
    if (!key || !region) return speakWebSpeech(text);
    const ssml = `<speak version="1.0" xml:lang="en-GB"><voice name="${voice}"><prosody rate="${(S.rate*100)|0}%">${text}</prosody></voice></speak>`;
    try {
      const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method:'POST',
        headers:{
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
        },
        body: ssml
      });
      if (!r.ok) throw 0;
      const buf = await r.arrayBuffer();
      await playAudioBuffer(buf, 'audio/mpeg');
    } catch {
      await speakWebSpeech(text);
    }
  }

  async function speakEleven(text) {
    const key = S.providerCfg.elevenApiKey, voiceId = S.providerCfg.elevenVoiceId || '21m00Tcm4TlvDq8ikWAM';
    if (!key || !voiceId) return speakWebSpeech(text);
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method:'POST',
        headers:{ 'xi-api-key': key, 'Content-Type':'application/json' },
        body: JSON.stringify({ text, model_id:'eleven_turbo_v2_5', voice_settings:{ stability:0.32, similarity_boost:0.8, style:0.2, use_speaker_boost:true } })
      });
      if (!r.ok) throw 0;
      const buf = await r.arrayBuffer();
      await playAudioBuffer(buf, 'audio/mpeg');
    } catch {
      await speakWebSpeech(text);
    }
  }

  async function playAudioBuffer(buf, type) {
    S.speaking = true;
    const blob = new Blob([buf], { type: type || 'audio/mpeg' });
    const url  = URL.createObjectURL(blob);
    await new Promise(res => {
      const a = new Audio(); a.src = url; a.onended = () => { URL.revokeObjectURL(url); S.speaking=false; res(); };
      a.onerror = () => { URL.revokeObjectURL(url); S.speaking=false; res(); };
      a.play().catch(()=>{ S.speaking=false; res(); });
    });
  }

  async function speak(text) {
    if (!S.on || !text) return;
    unlock();
    if (S.provider === 'azure') return speakAzure(text);
    if (S.provider === 'elevenlabs') return speakEleven(text);
    return speakWebSpeech(text);
  }
  function pause(){ try{ speechSynthesis.pause(); }catch{} }
  function resume(){ try{ speechSynthesis.resume(); }catch{} }
  function stop(){ try{ speechSynthesis.cancel(); }catch{} S.speaking=false; S.current=null; }

  // ---------- UI panel ----------
  function installPanel() {
    if (qs('#vc-panel')) return;
    const el = document.createElement('div');
    el.id = 'vc-panel';
    el.innerHTML = `
      <h3>Voice Coach</h3>
      <div class="row">
        <span class="pill">Status</span>
        <div class="group"><button id="vc-toggle" class="btn">On</button></div>
      </div>
      <div class="row">
        <span class="pill">Voice</span>
        <select id="vc-voice"></select>
      </div>
      <div class="row">
        <span class="pill">Speed</span>
        <input id="vc-rate" type="range" min="0.90" max="1.15" step="0.01" value="${S.rate}">
      </div>
      <div class="row">
        <span class="pill">Controls</span>
        <div class="group">
          <button id="vc-start" class="btn">Start</button>
          <button id="vc-pause" class="btn">Pause</button>
          <button id="vc-stop"  class="btn">Stop</button>
        </div>
      </div>
      <div class="row mini">Tip: use your page’s own <b>Start</b> buttons. On breathing pages, the coach guides <em>Inhale/Hold/Exhale</em> in sync.</div>
    `;
    document.body.appendChild(el);

    // Voice picker (only for Web Speech)
    const sel = qs('#vc-voice', el);
    const rate = qs('#vc-rate', el);
    const toggle = qs('#vc-toggle', el);

    (async () => {
      if (!('speechSynthesis' in window)) { sel.disabled = true; return; }
      const v = await voicesReady();
      const en = v.filter(x => /^en([-_]|$)/i.test(x.lang||''));
      sel.innerHTML = en.map(x => `<option value="${x.name}">${x.name}</option>`).join('');
      const best = pickVoice(v, S.voiceName);
      if (best) { S.voiceName = best.name; sel.value = best.name; localStorage.setItem('vc_voice', S.voiceName); }
    })();

    on(sel,'change', () => { S.voiceName = sel.value; localStorage.setItem('vc_voice', S.voiceName); speak('Voice selected.'); });
    on(rate,'input', () => { S.rate = Number(rate.value); localStorage.setItem('vc_rate', String(S.rate)); });
    on(toggle,'click', () => { S.on = !S.on; toggle.textContent = S.on ? 'On' : 'Off'; if (!S.on) stop(); else speak('Voice Coach ready.'); });
    on(qs('#vc-start',el),'click', () => {
      // Start reading nearest major section (non-breathing pages)
      const scope = nearestScope(el);
      const text = collectText(scope);
      if (isBreathingPage()) { startBreathingFromPage(); }
      else { (async ()=>{ for (const p of splitSentences(text)) await speak(p); })(); }
    });
    on(qs('#vc-pause',el),'click', () => { pause(); speak('Paused.'); });
    on(qs('#vc-stop', el),'click', () => { stop(); closeFocus(); });
  }

  // ---------- Focus overlay + ring animation for breathing ----------
  function installFocus(){
    if (qs('#vc-focus')) return;
    const el = document.createElement('div');
    el.id = 'vc-focus';
    el.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-label="Practice Focus">
        <button class="btn back">Back to hub/section</button>
        <div class="title" id="vc-focus-title">Session</div>
        <div class="ring"></div><div class="inner"></div>
        <div class="state" id="vc-focus-state">Ready</div>
        <div class="sub" id="vc-focus-sub"></div>
      </div>`;
    document.body.appendChild(el);
    on(qs('.back', el),'click', () => { closeFocus(); try{
      const s = qsa('h1,h2,h3,#setup,[data-section],section,article').find(h=>/setup|settings|start/i.test(h.textContent||h.id||''));
      if (s) s.scrollIntoView({behavior:'smooth',block:'start'}); }catch{}
    });
  }
  function openFocus(title){ installFocus(); const el = qs('#vc-focus'); qs('#vc-focus-title',el).textContent = title||'Session'; el.classList.add('visible'); }
  function closeFocus(){ const el = qs('#vc-focus'); if (!el) return; el.classList.remove('visible'); setRing(0); S.focus=null; stop(); }
  function setRing(frac){ const r = qs('#vc-focus .ring'); if (r) r.style.setProperty('--deg', (360*frac).toFixed(1)+'deg'); }
  function setState(t){ const s = qs('#vc-focus-state'); if (s) s.textContent = t; }
  function setSub(t){ const s = qs('#vc-focus-sub'); if (s) s.textContent = t; }

  function nearestScope(el){ return el.closest('section,article,main,.card,.panel') || document.body; }
  function collectText(el){
    const toSkip = new Set(['NAV','FOOTER','ASIDE','SCRIPT','STYLE']);
    const c = el.cloneNode(true);
    qsa('#vc-panel,#vc-focus,.vc-bar', c).forEach(n=>n.remove());
    qsa('button,select,input,textarea', c).forEach(n=>n.remove());
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT, null);
    const parts = [];
    while (w.nextNode()) {
      const n = w.currentNode;
      const p = n.parentElement;
      if (p && toSkip.has(p.tagName)) continue;
      const s = String(n.nodeValue||'').replace(/\s+/g,' ').trim();
      if (s) parts.push(s);
    }
    return parts.join(' ');
  }

  function isBreathingPage(){
    const t = (document.body.innerText||'').toLowerCase();
    return t.includes('4-7-8 breathing') || t.includes('box breathing') || t.includes('coherent 5-5') || t.includes('coherent 5 – 5') || t.includes('5‑5');
  }

  function animate(seconds) {
    return new Promise(res => {
      const start = performance.now();
      function step(t){
        const p = Math.min(1, (t-start)/(seconds*1000));
        setRing(p);
        if (p>=1) { setRing(0); res(); }
        else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  async function runBreathing(pattern, labels, title='Session', cycles=6){
    openFocus(title);
    S.focus = { running:true };
    let cycle=0;
    while (S.focus && S.focus.running && cycle<cycles) {
      for (let i=0;i<pattern.length;i++){
        const secs = Number(pattern[i])||4;
        const label= labels[i] || 'Breathe';
        setState(label); setSub(`${cycle+1}/${cycles} breaths`);
        await speak(`${label} ${secs} seconds.`);
        await animate(secs);
        if (!S.focus || !S.focus.running) break;
      }
      cycle++;
    }
    if (S.focus){ setState('Ready'); setSub(''); speak('Session complete.'); S.focus=null; }
  }

  function infer478(){ return [4,7,8]; }
  function inferBox(){ return [4,4,4,4]; }
  function inferCoherent(){ return [5,5]; }

  function startBreathingFromPage(){
    const text = (document.body.innerText||'').toLowerCase();
    if (text.includes('4-7-8')) return runBreathing(infer478(), ['Inhale','Hold','Exhale'], '4‑7‑8 Breathing', 6);
    if (text.includes('box breathing')) return runBreathing(inferBox(), ['Inhale','Hold','Exhale','Hold'], 'Box Breathing', 6);
    return runBreathing(inferCoherent(), ['Inhale','Exhale'], 'Coherent 5‑5', 10);
  }

  // ---------- Nav wiring for Start/Pause/Stop semantics ----------
  function wireClicks(){
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button,a,[role="button"],.btn,input[type="button"],input[type="submit"]');
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.value || el.textContent || '').trim().toLowerCase();

      // Breathing pages: only run breathing focus (no reading big setup text first)
      if (/^start\b|\bbegin\b|\bopen\b|\bplay\b|\brun\b|\bgo\b/.test(label)) {
        if (isBreathingPage()) { startBreathingFromPage(); return; }
        const scope = nearestScope(el);
        const text = collectText(scope);
        (async ()=>{ for (const p of splitSentences(text)) await speak(p); })();
        return;
      }
      if (/\bpause\b/.test(label)) { pause(); return; }
      if (/\b(stop|end|finish)\b/.test(label)) { stop(); closeFocus(); return; }
    }, true);
  }

  function install(){
    installPanel();
    installFocus();
    unlock();
    wireClicks();

    // Refresh voices without reload when returning to tab
    document.addEventListener('visibilitychange', () => { try{ speechSynthesis.getVoices(); }catch{} });
  }

  (async function boot(){
    await loadCfg();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
    window.MShareVoiceCoach = { speak, pause, resume, stop };
  })();
})();
