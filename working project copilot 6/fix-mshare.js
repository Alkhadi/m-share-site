// fix-mshare.js
// Run once from your project root:  node fix-mshare.js

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outJS = path.join(root, 'assets/js/mshare-one-shot-fix.js');
const outCSS = path.join(root, 'assets/css/mshare-one-shot-fix.css');

// ---------- helper: ensure folders
function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
ensureDir(path.dirname(outJS));
ensureDir(path.dirname(outCSS));

// ---------- write CSS
const CSS = `/* mshare-one-shot-fix.css */

/* Mobile nav (hamburger) — minimal, additive */
.site-header .nav-toggle { cursor:pointer; }
@media (max-width: 992px){
  .site-header .main-nav {
    position: fixed; top:0; right:0; bottom:0; width: 86vw; max-width: 360px;
    background: var(--nav-bg, #0b122a); color: #e5e7eb;
    overflow-y: auto; padding: 16px 12px; box-shadow: -14px 0 40px rgba(0,0,0,.35);
    transform: translateX(100%); opacity: .0; visibility: hidden;
    transition: transform .2s ease, opacity .2s ease, visibility .2s ease;
    z-index: 1000;
  }
  .site-header .main-nav.open { transform: translateX(0); opacity: 1; visibility: visible; }
  body.nav-open { overflow: hidden; }
}
.main-nav .submenu { display: none; }
.main-nav .submenu.open { display: block; }

/* Focus session overlay (breathing ring + controls) */
.msh-overlay{position:fixed;inset:0;background:rgba(8,13,26,.82);backdrop-filter:saturate(140%) blur(6px);
  display:none;align-items:center;justify-content:center;z-index:2147483000;color:#dbeafe;font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;}
.msh-overlay.open{display:flex;}
.msh-card{width:min(820px,92vw);padding:28px 20px 24px;border-radius:20px;background:linear-gradient(180deg,#0e1528 0%, #0a1020 100%);
  box-shadow:0 6px 40px rgba(0,0,0,.45);text-align:center;border:1px solid rgba(255,255,255,.06)}
.msh-title{font-size:24px;font-weight:700;margin:0 0 18px}
.msh-ring{--pct:0.0;--track:#1f2937;--arc:#86efac;--fill:#0b1222;
  width:min(520px,84vw);height:min(520px,84vw);border-radius:50%;
  background: conic-gradient(var(--arc) calc(var(--pct)*1%), rgba(255,255,255,.08) 0),
              radial-gradient(circle at 50% 50%, rgba(255,255,255,.08) 0 34%, transparent 34% 70%, rgba(255,255,255,.04) 70% 100%);
  display:flex;align-items:center;justify-content:center;margin:0 auto 18px; position:relative;
}
.msh-ring::after{content:'';position:absolute;inset:10%;border-radius:50%;
  background: radial-gradient(120% 120% at 50% 18%, rgba(255,255,255,.06) 0%, transparent 60%);
  pointer-events:none;
}
.msh-phase{font-weight:800;font-size:40px;letter-spacing:.3px;color:#fff}
.msh-sub{opacity:.75;font-size:14px;margin-top:4px}
.msh-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:12px}
.msh-btn{appearance:none;border:1px solid rgba(255,255,255,.12);background:#0f172a;color:#e5e7eb;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer}
.msh-btn:hover{background:#0b1326}
.msh-bad{background:#4b5563;border-color:#4b5563}
.msh-ok{background:#14532d;border-color:#14532d}
.msh-danger{background:#7f1d1d;border-color:#7f1d1d}

/* Floating Voice Coach control (appears if not present on page) */
.msh-voice{position:fixed;right:18px;bottom:18px;background:#0f172a;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);
  border-radius:12px;padding:12px 12px 10px;z-index:2147483200;min-width:220px;box-shadow:0 6px 24px rgba(0,0,0,.35)}
.msh-voice h4{margin:0 0 8px;font-weight:800;font-size:14px}
.msh-voice .row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}
.msh-voice select,.msh-voice input[type="range"]{width:140px}
.msh-chip{background:#1f2937;border-radius:999px;padding:4px 10px;font-size:12px}
`;
fs.writeFileSync(outCSS, CSS, 'utf8');

// ---------- write JS (core fixes)
const JS = `/* mshare-one-shot-fix.js  —  one-shot navigation + session + voice coach + pdf fixes
   Safe to load on every page. Idempotent (no duplicate init). */

(function(){
  if (window.__MSHARE_ONE_SHOT__) return;
  window.__MSHARE_ONE_SHOT__ = true;

  // ---- small utils
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const $  = (s, r=document) => r.querySelector(s);
  const on = (t, h, o) => document.addEventListener(t, h, o||false);
  const isMobile = () => window.matchMedia('(max-width: 992px)').matches;

  // ---- 0) convert data-href => href (not just in nav)
  $$('a[data-href]').forEach(a => {
    if (!a.getAttribute('href')) a.setAttribute('href', a.getAttribute('data-href'));
  });

  // ---- 1) HAMBURGER / NAV FIX (keeps desktop nav; makes mobile robust)
  (function navFix(){
    const nav = $('#mainNav');
    const toggle = $('#navToggle');
    if (!nav || !toggle) return;

    // Ensure aria-controls is correct
    if (!toggle.getAttribute('aria-controls')) toggle.setAttribute('aria-controls','mainNav');

    const closeAllSub = ()=> {
      $$('.menu-group .menu-toggle[aria-expanded="true"]', nav).forEach(b=>{
        b.setAttribute('aria-expanded','false');
        b.nextElementSibling && b.nextElementSibling.classList.remove('open');
      });
    };

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      if (!open) closeAllSub();
    };

    toggle.addEventListener('click', (e)=>{
      e.preventDefault();
      const ex = toggle.getAttribute('aria-expanded')==='true';
      setOpen(!ex);
    });

    // Close if clicking outside
    document.addEventListener('click', (e)=>{
      if (!nav.classList.contains('open')) return;
      const inside = nav.contains(e.target) || e.target===toggle;
      if (!inside) setOpen(false);
    });

    // Esc to close
    document.addEventListener('keydown', (e)=>{
      if (e.key==='Escape' && nav.classList.contains('open')) setOpen(false);
    });

    // Submenus: tap to open/close on mobile; hover open on desktop
    $$('[class~="menu-group"]', nav).forEach(group=>{
      const btn = $('.menu-toggle', group);
      const menu= $('.submenu', group);
      if (!btn || !menu) return;

      // mobile: click to toggle
      btn.addEventListener('click', (e)=>{
        if (!isMobile()) return; // desktop handled by hover
        e.preventDefault();
        const ex = btn.getAttribute('aria-expanded')==='true';
        $$('[class~="menu-group"] .menu-toggle', nav).forEach(b=>{
          if (b!==btn) { b.setAttribute('aria-expanded','false'); b.nextElementSibling && b.nextElementSibling.classList.remove('open'); }
        });
        btn.setAttribute('aria-expanded', String(!ex));
        menu.classList.toggle('open', !ex);
      });

      // desktop: hover to open
      group.addEventListener('mouseenter', ()=>{ if (isMobile()) return; btn.setAttribute('aria-expanded','true'); menu.classList.add('open'); });
      group.addEventListener('mouseleave', ()=>{ if (isMobile()) return; btn.setAttribute('aria-expanded','false'); menu.classList.remove('open'); });
    });

    // When a link is clicked in the mobile drawer, close the drawer
    nav.addEventListener('click', (e)=>{
      const a = e.target.closest('a[href]');
      if (a && isMobile()) setOpen(false);
    });
  })();

  // ---- 2) PDF button fix — uses site method if available, else print-to-PDF fallback
  (function pdfFix(){
    function quickDownload(){
      try {
        const MS = window.__MSHARE__ || window.MS || {};
        if (typeof MS.quickDownloadPdf === 'function') {
          MS.quickDownloadPdf();
          return;
        }
      } catch(_) {}
      // Fallback: open a print-friendly summary and trigger print dialog (user can "Save as PDF")
      const s = (window.__MSHARE__ && __MSHARE__.Stats && __MSHARE__.Stats.summary) ? __MSHARE__.Stats.summary() : {minutes:0,streak:0,sessions:0,breaths:0};
      const html = \`<!doctype html><meta charset="utf-8">
        <title>M Share — Profile</title>
        <style>body{font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:28px;background:#0f172a;color:#e5e7eb}
        .card{border:1px solid #334155;border-radius:12px;padding:18px;margin:14px 0;background:#0b1222}
        h1{margin:0 0 6px} .muted{opacity:.8}</style>
        <h1>M Share — Profile</h1><div class="muted">Quick profile export (fallback).</div>
        <div class="card"><b>Minutes:</b> \${s.minutes} &nbsp; <b>Streak:</b> \${s.streak} days &nbsp; <b>Sessions:</b> \${s.sessions} &nbsp; <b>Breaths:</b> \${s.breaths}</div>
        <div class="card">Tip: use your browser’s “Save as PDF”.</div>\`;
      const w = window.open('about:blank','_blank','noopener,noreferrer');
      if (w) { w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.print(); }catch(_){ } }, 350); }
    }
    // There can be more than one button with the same id in your pages
    $$('#downloadPdf, [data-action="download-pdf"]').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.preventDefault(); quickDownload(); });
    });
  })();

  // ---- 3) Voice Coach utility (TTS)  + floating panel if page doesn’t already render one
  const Voice = (function(){
    const state = { enabled: true, rate: 1.0, voiceName: 'Daniel', langLike: 'en-GB' };
    let voices = [];
    const loadVoices = () => (voices = window.speechSynthesis ? speechSynthesis.getVoices() : []);
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    function pickVoice(){
      if (!voices || !voices.length) return null;
      // Prefer same-name; else any en-GB/en-US
      let v = voices.find(v=>v.name.toLowerCase().includes(state.voiceName.toLowerCase()));
      if (!v) v = voices.find(v=>/en-GB|en_GB/i.test(v.lang));
      if (!v) v = voices.find(v=>/en/i.test(v.lang));
      return v || voices[0];
    }
    function speak(text){
      try{
        if (!state.enabled || !window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) u.voice = v;
        u.rate = state.rate;
        u.pitch = 1;
        speechSynthesis.cancel(); // don’t overlap cues
        speechSynthesis.speak(u);
      }catch(_){}
    }
    // Floating controller (only if a similar control isn’t already present)
    function ensurePanel(){
      if (document.querySelector('.msh-voice')) return;
      const p = document.createElement('div');
      p.className = 'msh-voice';
      p.innerHTML = '<h4>Voice Coach</h4>\
        <div class="row"><span class="msh-chip">Status</span>\
          <button class="msh-btn msh-ok" data-t="toggle">On</button></div>\
        <div class="row"><span class="msh-chip">Voice</span>\
          <select data-t="voice"></select></div>\
        <div class="row"><span class="msh-chip">Speed</span>\
          <input type="range" min="0.6" max="1.4" step="0.05" value="1" data-t="rate"></div>';
      document.body.appendChild(p);

      // Populate voices once available
      const fill = ()=>{
        const sel = p.querySelector('select[data-t="voice"]');
        if (!sel) return;
        sel.innerHTML = voices.map(v=>'<option>'+v.name+'</option>').join('');
        // preselect
        const wanted = voices.findIndex(v=>v.name.toLowerCase().includes(state.voiceName.toLowerCase())) >= 0 ? state.voiceName : (voices[0] ? voices[0].name : '');
        sel.value = wanted;
      };
      setTimeout(fill, 280);
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = ()=>{ loadVoices(); fill(); };

      p.querySelector('[data-t="toggle"]').addEventListener('click', (e)=>{
        state.enabled = !state.enabled;
        e.currentTarget.textContent = state.enabled ? 'On' : 'Off';
        e.currentTarget.classList.toggle('msh-ok', state.enabled);
        e.currentTarget.classList.toggle('msh-bad', !state.enabled);
      });
      p.querySelector('[data-t="rate"]').addEventListener('input', e=>{ state.rate = parseFloat(e.target.value||'1')||1; });
      p.querySelector('select[data-t="voice"]').addEventListener('change', e=>{ state.voiceName = String(e.target.value||''); });
    }
    // If a page already shows its own voice panel, don’t duplicate it.
    ensurePanel();
    return { speak, state };
  })();

  // ---- 4) Focus Session Overlay (breathing ring + cues)
  const Session = (function(){
    const PHASES = ['Inhale','Hold','Exhale','Hold'];
    let raf = 0;

    function buildUI(){
      let wrap = $('.msh-overlay');
      if (wrap) return wrap;
      wrap = document.createElement('div');
      wrap.className = 'msh-overlay';
      wrap.innerHTML = '<div class="msh-card" role="dialog" aria-modal="true" aria-label="Breathing Session">\
          <div class="msh-title">Session</div>\
          <div class="msh-ring"><div><div class="msh-phase">Ready</div><div class="msh-sub">–</div></div></div>\
          <div class="msh-actions">\
            <button class="msh-btn" data-a="pause">Pause</button>\
            <button class="msh-btn" data-a="resume" style="display:none">Resume</button>\
            <button class="msh-btn" data-a="stop">Stop</button>\
          </div>\
        </div>';
      document.body.appendChild(wrap);
      return wrap;
    }

    function vibrate(ms){ try{ navigator.vibrate && navigator.vibrate(ms); }catch(_){ } }

    function run(opt){
      const o = Object.assign({
        pattern:[4,4,4,4], // inhale,hold,exhale,hold
        breaths: 15,
        tts: true,
      }, opt||{});

      const wrap = buildUI();
      wrap.classList.add('open');
      const ring = $('.msh-ring', wrap);
      const phaseEl = $('.msh-phase', wrap);
      const subEl = $('.msh-sub', wrap);
      const btnPause = $('[data-a="pause"]', wrap);
      const btnResume= $('[data-a="resume"]', wrap);
      const btnStop  = $('[data-a="stop"]', wrap);

      let breath = 0, idx=0, left=o.pattern[0], total=o.pattern.reduce((a,b)=>a+b,0), paused=false, last=performance.now();

      function cue(){
        const label = PHASES[idx];
        phaseEl.textContent = label;
        subEl.textContent = (breath+1)+'/'+o.breaths+' breaths';
        if (o.tts && Voice.state.enabled) Voice.speak(label);
        vibrate(18);
      }

      function step(now){
        const dt = Math.max(0,(now-last)/1000); last = now;
        if (!paused){
          left -= dt;
          const elapsedInBreath = o.pattern.slice(0,idx).reduce((a,b)=>a+b,0) + (o.pattern[idx]-left);
          const pct = Math.min(0.999, (elapsedInBreath / total) * 100);
          ring.style.setProperty('--pct', pct);
          if (left <= 0.001){
            idx = (idx+1) % 4;
            if (idx===0){ breath++; if (breath >= o.breaths) return stop(); }
            left = o.pattern[idx];
            cue();
          }
        }
        raf = requestAnimationFrame(step);
      }

      function pause(){ paused = true; btnPause.style.display='none'; btnResume.style.display='inline-block'; }
      function resume(){ paused = false; last = performance.now(); btnResume.style.display='none'; btnPause.style.display='inline-block'; }
      function stop(){
        cancelAnimationFrame(raf); raf=0;
        wrap.classList.remove('open');
      }

      btnPause.onclick = pause; btnResume.onclick = resume; btnStop.onclick = stop;
      cue(); last=performance.now(); raf = requestAnimationFrame(step);
      return { pause, resume, stop };
    }
    return { run };
  })();

  // ---- 5) START buttons: make ANY Start launch a session + voice coach (works site-wide)
  function pageDefaults(){
    const u = (location.pathname || '').toLowerCase();
    if (u.includes('4-7-8')) return { pattern:[4,7,8,0], breaths: 15 };
    if (u.includes('coherent') || u.includes('5-5')) return { pattern:[5,0,5,0], breaths: 17 };
    if (u.includes('sos')) return { pattern:[4,4,4,4], breaths: 6 };
    if (u.includes('box-breathing')) return { pattern:[4,4,4,4], breaths: 17 };
    return { pattern:[4,4,4,4], breaths: 15 };
  }
  function minutesAndBpm(){
    // try read from common UI controls if present
    const minutes = parseFloat(($('select[name="minutes"]')||$('select:has(option[value="3 minutes"])')||$('select[data-role="minutes"]')||{}).value || '') || 
                    parseFloat(($('select')||{}).value||'') || null;
    const bpm = parseFloat(($('input[name="bpm"]')||$('input[data-role="bpm"]')||$('input[aria-label*="Breaths"]')||{}).value || '') || null;
    return { minutes, bpm };
  }
  function computeBreaths({minutes,bpm}, fallbackBreaths){
    if (minutes && bpm) return Math.max(1, Math.round(minutes * bpm));
    if (minutes && !bpm) return Math.round(minutes * 5.5); // sensible default
    return fallbackBreaths;
  }

  function startFromContext(){
    // pattern from page or data-attrs
    let def = pageDefaults();
    // If there are numeric inputs for inhale/hold/exhale/hold, read them
    const nums = $$('input[type="number"], input[type="range"]').map(i=>({el:i, lbl:(i.getAttribute('aria-label')||i.previousElementSibling?.textContent||'').toLowerCase(), val: parseFloat(i.value)}));
    const findVal = (kw)=> (nums.find(n=>n.lbl.includes(kw))||{}).val;
    const p = [findVal('inhale')||def.pattern[0], findVal('hold')||def.pattern[1], findVal('exhale')||def.pattern[2], findVal('after exhale')||def.pattern[3]];
    const mm = minutesAndBpm();
    const breaths = computeBreaths(mm, def.breaths);
    const ttsOn = true; // the floating panel has its own On/Off; keep TTS allowed
    return Session.run({ pattern:p, breaths, tts: ttsOn });
  }

  // capture-phase so we beat other scripts that might preventDefault incorrectly
  on('click', (e)=>{
    const b = e.target.closest('button, a');
    if (!b) return;

    const label = (b.dataset.action || b.getAttribute('aria-label') || b.textContent || '').trim().toLowerCase();

    // Generic Start buttons
    if (label === 'start' || b.id === 'start' || b.classList.contains('start') || b.dataset.action === 'start'){
      e.preventDefault();
      startFromContext();
    }

    // Fallback SOS from any element explicitly wired
    if (b.id === 'sosBtn'){
      e.preventDefault();
      // If site preset is available, honour it; else use robust fallback
      try{
        const MS = window.__MSHARE__ || {};
        if (MS.CoachPresets && typeof MS.CoachPresets.panic==='function'){
          const r = MS.CoachPresets.panic();
          const q = new URLSearchParams(r.q || '');
          location.href = (r.page || 'sos-60.html') + (q.toString() ? ('?'+q.toString()) : '');
          return;
        }
      }catch(_){}
      startFromContext(); // same overlay
    }
  }, true);

  // ---- 6) Small quality-of-life: smooth “Back to top” if present
  const back = $('#backToTop');
  if (back) back.addEventListener('click', (e)=>{ e.preventDefault(); try{ (document.getElementById('top')||document.body).scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ location.hash='#top'; } });

})();`;
fs.writeFileSync(outJS, JS, 'utf8');

// ---------- recursively patch all html files
function walk(dir, out = []) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        const s = fs.statSync(p);
        if (s.isDirectory()) walk(p, out);
        else if (s.isFile() && /\.html?$/i.test(f)) out.push(p);
    }
    return out;
}

const files = walk(root);
let touched = 0;

for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Inject CSS <link> (once)
    if (!html.includes('assets/css/mshare-one-shot-fix.css')) {
        html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="assets/css/mshare-one-shot-fix.css" />\n</head>');
        changed = true;
    }

    // Inject JS <script> (once) — last script before </body>
    if (!html.includes('assets/js/mshare-one-shot-fix.js')) {
        html = html.replace(/<\/body>/i, '  <script defer src="assets/js/mshare-one-shot-fix.js"></script>\n</body>');
        changed = true;
    }

    // Ensure #navToggle knows it controls #mainNav
    html = html.replace(/<button([^>]*?)id=['"]navToggle['"]([^>]*?)>/i, (m, a, b) => {
        if (/aria-controls=/i.test(m)) return m;
        changed = true;
        return `<button${a}id="navToggle"${b} aria-controls="mainNav">`;
    });

    // data-href -> href for anchors without href
    const before = html;
    html = html.replace(/<a([^>]*?)\sdata-href="([^"]+)"([^>]*?)>([\s\S]*?)<\/a>/gi, (m, pre, url, post, inner) => {
        if (/href\s*=/.test(m)) return m;
        changed = true;
        return `<a${pre} data-href="${url}" href="${url}"${post}>${inner}</a>`;
    });

    if (changed) { fs.writeFileSync(file, html, 'utf8'); touched++; }
}

console.log('✅ Wrote:', path.relative(root, outCSS));
console.log('✅ Wrote:', path.relative(root, outJS));
console.log('✅ Patched HTML files:', touched);
console.log('Done.');
