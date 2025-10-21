// apply-mshare-fixes.mjs
// One-shot project patcher for M Share: Voice Coach (cross-browser), breathing cues,
// section readers, hamburger menu layering, footer and back-to-top placement,
// and GP-mapping grid (2x3). Run once:  node apply-mshare-fixes.mjs

import fs from 'fs';
import path from 'path';
import url from 'url';

const root = process.cwd();
const rel = (...p) => path.join(root, ...p);
const assetsDir = rel('_coach');
const cssFile = rel('_coach/voice-coach.css');
const jsFile = rel('_coach/voice-coach.js');

function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '_coach') continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, acc);
        else acc.push(p);
    }
    return acc;
}
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function insertOnce(src, needle, insert) {
    if (src.includes(insert)) return src; // already present
    const idx = src.indexOf(needle);
    if (idx === -1) return src + '\n' + insert + '\n';
    return src.slice(0, idx) + insert + '\n' + src.slice(idx);
}

function relativeFrom(file, target) {
    const dir = path.dirname(file);
    return path.relative(dir, target).split(path.sep).join('/');
}

// ---------- 1) Create assets (_coach) ----------
ensureDir(assetsDir);

// --- CSS (panel, overlay, hamburger/back-to-top/footer fixes) ---
const CSS = `
/* ===== Voice Coach universal CSS ===== */
#vc-panel{position:fixed;right:24px;bottom:24px;z-index:999999;background:#111827; /* slate-900 */
color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);
padding:14px 16px; width:320px; max-width:94vw; font-family:system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial; backdrop-filter:blur(8px)}
#vc-panel *{box-sizing:border-box}
#vc-panel h3{margin:0 0 10px;font-size:16px;font-weight:700}
#vc-panel .row{display:flex;align-items:center;justify-content:space-between;margin:8px 0}
#vc-panel .pill{background:#1f2937;color:#e5e7eb;border-radius:999px;padding:6px 10px;font-size:13px}
#vc-panel select,#vc-panel input[type="range"]{width:180px;background:#0b1220;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px 8px}
#vc-panel .toggle{display:inline-flex;align-items:center;gap:10px}
#vc-panel .btn{cursor:pointer;border-radius:10px;padding:8px 12px;border:1px solid rgba(255,255,255,.15);background:#0b1220}
#vc-panel .btn:hover{background:#111b2f}
#vc-panel .mini{font-size:12px;opacity:.75}

/* Floating section action bar (added to each section) */
.vc-bar{position:sticky;top:8px;z-index:9999;display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:6px 0 10px}
.vc-bar .vc-start,.vc-bar .vc-pause,.vc-bar .vc-stop{cursor:pointer;border-radius:10px;padding:6px 10px;border:1px solid rgba(255,255,255,.15);background:#0b1220;color:#e5e7eb;font-size:13px}
.vc-bar .vc-start:hover{background:#133a2a} /* subtle green */
.vc-bar .vc-pause:hover{background:#2c2c14} /* subtle amber */
.vc-bar .vc-stop:hover{background:#3a1313}   /* subtle red */

/* Focus overlay */
#vc-focus{position:fixed;inset:0;background:rgba(8,11,15,.72);backdrop-filter:blur(4px);z-index:999998;display:none;align-items:center;justify-content:center}
#vc-focus.visible{display:flex}
#vc-focus .card{width:min(900px,92vw);height:min(620px,88vh);background:radial-gradient(ellipse at center,#0f172a 20%,#0b1324 60%,#0a0f1a 100%);border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.55);position:relative;overflow:hidden;color:#e5e7eb}
#vc-focus .title{position:absolute;top:18px;width:100%;text-align:center;font-size:22px;font-weight:700;letter-spacing:.3px}
#vc-focus .ring{position:absolute;inset:70px;border-radius:50%;background:conic-gradient(#6ee7b7 var(--deg,0deg), transparent 0);filter:drop-shadow(0 12px 28px rgba(0,0,0,.5))}
#vc-focus .inner{position:absolute;inset:120px;border-radius:50%;background:rgba(255,255,255,.04)}
#vc-focus .state{position:absolute;inset:auto 0 110px; text-align:center;font-size:42px;font-weight:800}
#vc-focus .sub{position:absolute;inset:auto 0 80px;text-align:center;font-size:14px;opacity:.8}
#vc-focus .controls{position:absolute;left:0;right:0;bottom:24px;display:flex;gap:10px;justify-content:center}
#vc-focus .controls .btn{cursor:pointer;border-radius:12px;padding:10px 14px;border:1px solid rgba(255,255,255,.2);background:#0b1220;color:#e5e7eb}
#vc-focus .controls .btn:hover{background:#111b2f}
#vc-focus .back{position:absolute;right:18px;top:14px}

/* Back-to-top bubble fix (always bottom-right and above content) */
#back-to-top,.back-to-top{position:fixed !important;right:24px;bottom:110px;z-index:999997}

/* Hamburger drawer general fix: place above everything and prevent "behind sections" */
.nav-drawer,.mobile-nav,.site-drawer,#mobileMenu,#nav-drawer{position:fixed;inset:0;z-index:100000;background:rgba(6,9,12,.96);backdrop-filter:blur(6px);display:none}
.nav-drawer.open,.mobile-nav.open,.site-drawer.open,#mobileMenu.open,#nav-drawer.open{display:block}
.hamburger,.menu-toggle,[data-hamburger]{cursor:pointer}
body.menu-open{overflow:hidden}

/* Footer bottom-right credit alignment (non-destructive) */
html,body{height:100%}
body{min-height:100vh;display:flex;flex-direction:column}
main{flex:1 0 auto}
footer{margin-top:auto}
footer .credit,.footer-credit{display:block;text-align:right}
`;

// --- JS (UI + engine) ---
const JS = `
// ===== Voice Coach: cross-browser TTS + section reader + breathing focus =====
// Exposes window.VoiceCoach. Automatically installs UI, section bars, and
// Start/Pause/Stop hooks for common "Start/Open/Begin/Play" buttons.
// Works in Chrome, Edge, Safari, Firefox (where supported).

(() => {
  if (window.VoiceCoach) return; // avoid duplicates

  const state = {
    enabled: true,
    rate: parseFloat(localStorage.getItem('vc_rate')) || 0.95,
    voiceName: localStorage.getItem('vc_voice') || '',
    voice: null,
    speaking: false,
    currentUtt: null,
    queue: [],
    audioUnlocked: false,
    lastSection: null,
    breathing: null, // {pattern:[n..], phase, id}
  };

  // ---------- Utilities ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { passive: true });
  const qs = (sel, ctx=document) => ctx.querySelector(sel);
  const qsa = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  // Unlock audio on first user gesture (Chrome autoplay policies)
  const ensureUserGesture = () => {
    if (state.audioUnlocked) return;
    const unlock = () => {
      try {
        if (window.AudioContext) {
          const ac = new AudioContext();
          if (ac.state === 'suspended') ac.resume();
          (new OscillatorNode(ac)).connect(ac.destination); // create+discard to force route
          ac.close();
        }
      } catch(e){}
      state.audioUnlocked = true;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  };

  // Wait for voices (Chrome loads them async)
  function voicesReady(timeout=4000) {
    return new Promise(resolve => {
      const start = performance.now();
      const check = () => {
        const v = speechSynthesis.getVoices();
        if (v && v.length) return resolve(v);
        if (performance.now() - start > timeout) return resolve(v || []);
        setTimeout(check, 100);
      };
      if (speechSynthesis.getVoices().length) return resolve(speechSynthesis.getVoices());
      window.speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
      check();
    });
  }

  function pickBestVoice(list, preferredName='') {
    if (!list || !list.length) return null;
    const clean = s => s.toLowerCase();
    const byLang = list.filter(v => /^en(-|_)?/i.test(v.lang));
    const byName = preferredName ? list.find(v => clean(v.name).includes(clean(preferredName))) : null;
    if (byName) return byName;

    // Preference order: Google (Chrome), Microsoft (Edge), Apple Siri (Safari), Daniel (e.g., en‑GB), high-quality voices
    const prefs = [
      'Google UK English Male','Google UK English Female','Google US English',
      'Microsoft Aria','Microsoft Guy','Microsoft Jenny','Microsoft Ryan',
      'Samantha','Alex','Tom','Daniel','Moira','Serena','Tessa','Victoria','Karen'
    ];
    for (const p of prefs) {
      const v = list.find(v => clean(v.name).includes(clean(p)));
      if (v) return v;
    }
    return byLang[0] || list[0];
  }

  function splitIntoChunks(text) {
    // split by sentence-ish punctuation; keep short phrases together
    const parts = text.replace(/\\s+/g,' ').trim().split(/(?<=[.!?;])\\s+(?=[A-Z0-9])/g);
    // further split if any part is very long
    const chunks = [];
    for (const p of parts) {
      if (p.length <= 260) chunks.push(p);
      else {
        p.split(/,\\s+/).forEach(seg => chunks.push(seg));
      }
    }
    return chunks.filter(Boolean);
  }

  // Speak a single chunk
  function speakChunk(chunk, opts={}) {
    return new Promise(async (resolve) => {
      if (!state.enabled || !window.speechSynthesis) return resolve();
      await voicesReady();
      const voices = speechSynthesis.getVoices();
      state.voice = pickBestVoice(voices, state.voiceName);
      if (!state.voice) return resolve();

      const utter = new SpeechSynthesisUtterance(chunk);
      utter.voice = state.voice;
      utter.rate = clamp(opts.rate ?? state.rate, 0.7, 1.2);
      utter.pitch = clamp(opts.pitch ?? 1.02, 0.8, 1.2);
      utter.volume = clamp(opts.volume ?? 1, 0, 1);
      utter.onstart = () => { state.speaking = true; state.currentUtt = utter; };
      utter.onend = () => { state.speaking = false; state.currentUtt = null; resolve(); };
      utter.onerror = () => { state.speaking = false; state.currentUtt = null; resolve(); };
      speechSynthesis.speak(utter);
    });
  }

  async function speak(text, opts={}) {
    if (!text) return;
    ensureUserGesture();
    if (!state.enabled) return;
    // Cancel anything already in progress before speaking new content
    speechSynthesis.cancel();
    const chunks = Array.isArray(text) ? text : splitIntoChunks(text);
    for (const c of chunks) {
      if (!state.enabled) break;
      await speakChunk(c, opts);
      await sleep(30);
    }
  }

  function pause()  { try{ speechSynthesis.pause(); }catch(e){} }
  function resume() { try{ speechSynthesis.resume(); }catch(e){} }
  function stop()   { try{ state.enabled && speechSynthesis.cancel(); }catch(e){} }

  // ----- UI Panel -----
  function installPanel() {
    if (qs('#vc-panel')) return;

    const el = document.createElement('div');
    el.id = 'vc-panel';
    el.innerHTML = \`
      <h3>Voice Coach</h3>
      <div class="row"><span class="pill">Status</span>
        <span class="toggle">
          <button class="btn" id="vc-toggle">On</button>
        </span>
      </div>
      <div class="row"><span class="pill">Voice</span>
        <select id="vc-voice"></select>
      </div>
      <div class="row"><span class="pill">Speed</span>
        <input id="vc-rate" type="range" min="0.80" max="1.20" step="0.01" value="\${state.rate}">
      </div>
      <div class="row mini">Tip: Use the Start/Pause/Stop buttons added to each section.</div>
    \`;
    document.body.appendChild(el);

    const sel = qs('#vc-voice', el);
    const rate = qs('#vc-rate', el);
    const toggle = qs('#vc-toggle', el);

    const populate = async () => {
      const list = await voicesReady();
      const english = list.filter(v => /^en(-|_)?/i.test(v.lang));
      sel.innerHTML = english.map(v => \`<option value="\${v.name}">\${v.name}</option>\`).join('');
      // Try to select saved voice or best pick
      let chosen = state.voiceName;
      if (!english.find(v => v.name === state.voiceName)) {
        const best = pickBestVoice(list, state.voiceName || '');
        chosen = best ? best.name : '';
      }
      if (chosen) sel.value = chosen;
      state.voiceName = sel.value;
      localStorage.setItem('vc_voice', state.voiceName);
    };
    populate();

    on(sel, 'change', () => {
      state.voiceName = sel.value;
      localStorage.setItem('vc_voice', state.voiceName);
      if (state.enabled) speak('Voice selected.');
    });
    on(rate, 'input', () => {
      state.rate = Number(rate.value);
      localStorage.setItem('vc_rate', String(state.rate));
    });
    on(toggle, 'click', () => {
      state.enabled = !state.enabled;
      toggle.textContent = state.enabled ? 'On' : 'Off';
      if (!state.enabled) stop();
      else speak('Voice Coach is on.');
    });
  }

  // ----- Focus Overlay + Breathing Engine -----
  function installFocus() {
    if (qs('#vc-focus')) return;
    const el = document.createElement('div');
    el.id = 'vc-focus';
    el.innerHTML = \`
      <div class="card" role="dialog" aria-modal="true" aria-label="Practice Focus">
        <button class="btn back">Back to hub/section</button>
        <div class="title" id="vc-focus-title">Session</div>
        <div class="ring"></div>
        <div class="inner"></div>
        <div class="state" id="vc-focus-state">Ready</div>
        <div class="sub" id="vc-focus-sub"></div>
        <div class="controls">
          <button class="btn" id="vc-focus-start">Start</button>
          <button class="btn" id="vc-focus-pause">Pause</button>
          <button class="btn" id="vc-focus-stop">Stop</button>
        </div>
      </div>
    \`;
    document.body.appendChild(el);

    const card = qs('.card', el);
    const ring = qs('.ring', el);
    const stateLbl = qs('#vc-focus-state', el);
    const subLbl = qs('#vc-focus-sub', el);

    let raf = null, startTs = 0, dur = 1000, running = false;

    function setDeg(frac) { ring.style.setProperty('--deg', (360*frac).toFixed(1) + 'deg'); }
    setDeg(0);

    function animate(ts) {
      if (!running) return;
      if (!startTs) startTs = ts;
      const p = (ts - startTs) / dur;
      setDeg(Math.min(1, p));
      if (p >= 1) { running = false; }
      else raf = requestAnimationFrame(animate);
    }

    function playPhase(label, seconds) {
      stateLbl.textContent = label;
      dur = seconds * 1000;
      startTs = 0; running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(animate);
    }

    function speakPhase(label, s) {
      speak(label + ' ' + s + ' seconds.');
    }

    function runBreathing(pattern, opts={ cycles: 6, labels:['Inhale','Hold','Exhale'] }) {
      const cyc = opts.cycles ?? 6;
      const names = opts.labels || ['Inhale','Hold','Exhale'];
      let count = 0;
      state.breathing = { pattern, phase:0, id: Math.random().toString(36).slice(2) };
      const id = state.breathing.id;

      const next = async () => {
        if (!state.breathing || state.breathing.id !== id) return;
        const ph = state.breathing.phase % pattern.length;
        const seconds = pattern[ph];
        const label = names[ph] || 'Breathe';
        playPhase(label, seconds);
        speakPhase(label, seconds);
        await sleep(seconds*1000 + 150);
        state.breathing.phase++;
        if (state.breathing.phase % pattern.length === 0) {
          count++;
          subLbl.textContent = \`\${count}/\${cyc} breaths\`;
        }
        if (count < cyc && state.breathing) next();
        else { state.breathing = null; speak('Session complete.'); }
      };
      next();
    }

    on(qs('#vc-focus-start', el), 'click', () => {
      if (!state.lastSection) state.lastSection = document.body;
      el.classList.add('visible');
      // Infer technique from title text if present
      const t = (qs('#vc-focus-title', el).textContent || '').toLowerCase();
      if (t.includes('4-7-8')) runBreathing([4,7,8], { cycles:6, labels:['Inhale','Hold','Exhale'] });
      else if (t.includes('coherent') || t.includes('5-5') || t.includes('5 – 5') || t.includes('5‑5')) runBreathing([5,5], { cycles:12, labels:['Inhale','Exhale'] });
      else if (t.includes('box')) runBreathing([4,4,4,4], { cycles:6, labels:['Inhale','Hold','Exhale','Hold'] });
      else runBreathing([4,4,6], { cycles:6, labels:['Inhale','Hold','Exhale'] });
    });
    on(qs('#vc-focus-pause', el), 'click', () => { pause(); running=false; speak('Paused.'); });
    on(qs('#vc-focus-stop', el), 'click', () => { stop(); el.classList.remove('visible'); state.breathing=null; setDeg(0); stateLbl.textContent='Ready'; subLbl.textContent=''; });
    on(qs('.back', el), 'click', () => { el.classList.remove('visible'); state.breathing=null; setDeg(0); });

    window._vc_focus = {
      open: (title='Session', sectionEl=null) => {
        qs('#vc-focus-title', el).textContent = title;
        state.lastSection = sectionEl || null;
        el.classList.add('visible');
      },
      close: () => { qs('#vc-focus-stop', el).click(); }
    };
  }

  // ----- Section bars and autowiring -----
  function addVoiceBar(section) {
    if (!section || section.dataset.vcBarInstalled) return;
    section.dataset.vcBarInstalled = '1';

    const bar = document.createElement('div');
    bar.className = 'vc-bar';
    bar.innerHTML = \`
      <button class="vc-start">Start</button>
      <button class="vc-pause">Pause</button>
      <button class="vc-stop">Stop</button>
    \`;
    const firstChild = section.firstElementChild;
    if (firstChild) section.insertBefore(bar, firstChild); else section.appendChild(bar);

    on(bar.querySelector('.vc-start'), 'click', () => {
      const title = (section.querySelector('h1,h2,h3,h4')?.textContent || 'Practice').trim();
      _vc_focus.open(title, section);
      // Also read the section text right after opening
      const text = section.innerText || '';
      speak(text);
    });
    on(bar.querySelector('.vc-pause'), 'click', () => pause());
    on(bar.querySelector('.vc-stop'),  'click', () => stop());
  }

  function autoBars() {
    // Install on semantic sections and articles; fall back to major content blocks
    const targets = new Set([
      ...qsa('section'),
      ...qsa('article'),
      ...qsa('[data-section],[data-block]'),
      ...qsa('main > div, .card, .panel').filter(d => (d.querySelector('h1,h2,h3,h4') && d.textContent.length > 80))
    ]);
    targets.forEach(addVoiceBar);
  }

  function removeLegacyCoaches() {
    // Remove old duplicated "voice coach" boxes that conflict with the new one
    qsa('.voice-coach, .old-voice-coach, #voice-coach, [data-voice-coach]').forEach(el => {
      if (el.id !== 'vc-panel') el.remove();
    });
  }

  // ----- Bind common start/pause/stop buttons -----
  function bindGlobalButtons() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('button,a,[role="button"],.btn');
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase();

      // Recognize "Start/Open/Begin/Play"
      if (/^(start|open|begin|play)/.test(label)) {
        // Infer technique from surrounding text/page
        const pageText = document.body.innerText.toLowerCase();
        let title = 'Session';
        if (pageText.includes('4-7-8')) title = '4‑7‑8 Breathing';
        else if (pageText.includes('coherent 5-5') || pageText.includes('coherent') || pageText.includes('5‑5')) title = 'Coherent 5‑5';
        else if (pageText.includes('box breathing')) title = 'Box Breathing';
        _vc_focus.open(title, el.closest('section,article,main') || document.body);
        return;
      }
      if (label.includes('pause')) { pause(); return; }
      if (label.includes('stop') || label.includes('end')) { stop(); return; }
    }, true);
  }

  // ----- Hamburger & overlay fixes (non-destructive) -----
  function fixHamburger() {
    const toggles = qsa('.hamburger,.menu-toggle,[data-hamburger],[aria-label="Menu"]');
    const drawers = qsa('.nav-drawer,.mobile-nav,.site-drawer,#mobileMenu,#nav-drawer,nav .menu,nav .drawer');
    const open = () => { drawers.forEach(d => d.classList.add('open')); document.body.classList.add('menu-open'); };
    const close = () => { drawers.forEach(d => d.classList.remove('open')); document.body.classList.remove('menu-open'); };
    toggles.forEach(t => {
      t.setAttribute('aria-expanded','false');
      on(t, 'click', () => {
        const isOpen = drawers.some(d => d.classList.contains('open'));
        if (isOpen) { close(); t.setAttribute('aria-expanded','false'); }
        else { open(); t.setAttribute('aria-expanded','true'); }
      });
    });
    // Close when clicking a drawer background
    drawers.forEach(d => on(d, 'click', (ev) => { if (ev.target === d) close(); }));
  }

  // ----- GP mapping: add grid reader hook if the grid exists -----
  function speakElement(el) {
    if (!el) return;
    const text = (el.innerText || '').trim();
    if (text) speak(text);
  }

  function enhanceGPGrid() {
    const grid = qs('#gp-mapping-grid');
    if (!grid) return;
    addVoiceBar(grid.closest('section,article,div') || grid);
  }

  // ----- Boot sequence -----
  function boot() {
    removeLegacyCoaches();
    installPanel();
    installFocus();
    autoBars();
    bindGlobalButtons();
    fixHamburger();
    enhanceGPGrid();
  }

  // On dom ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Public API
  window.VoiceCoach = {
    speak, pause, resume, stop,
    openFocus: (t) => _vc_focus.open(t),
    closeFocus: () => _vc_focus.close()
  };
})();
`;

fs.writeFileSync(cssFile, CSS, 'utf8');
fs.writeFileSync(jsFile, JS, 'utf8');

// ---------- 2) Patch every HTML file ----------
const htmlFiles = walk(root).filter(f => f.toLowerCase().endsWith('.html'));

const GP_GRID_HTML = `
<!-- Injected by apply-mshare-fixes.mjs -->
<section id="gp-mapping" aria-label="Grapheme–phoneme practice (GP mapping)">
  <div class="vc-bar"><button class="vc-start">Start</button><button class="vc-pause">Pause</button><button class="vc-stop">Stop</button></div>
  <h3>2) Grapheme–phoneme practice (GP mapping)</h3>
  <p class="mini">Why it helps: fluent mapping turns symbols into reliable sounds. Rotate sets during the week. Keep each mini‑set short (3–6 items).</p>

  <div id="gp-mapping-grid" class="gp-grid">
    <article class="gp-card">
      <h4>Short vowels</h4>
      <ul>
        <li><strong>a</strong> /a/ — cat, map</li>
        <li><strong>e</strong> /e/ — bed, hem</li>
        <li><strong>i</strong> /i/ — sit, milk</li>
        <li><strong>o</strong> /o/ — hot, pond</li>
        <li><strong>u</strong> /u/ — sun, drum</li>
      </ul>
    </article>
    <article class="gp-card">
      <h4>Long vowels</h4>
      <ul>
        <li><strong>a</strong> /ā/ — late, paper</li>
        <li><strong>e</strong> /ē/ — tree, even</li>
        <li><strong>i</strong> /ī/ — time, pilot</li>
        <li><strong>o</strong> /ō/ — home, open</li>
        <li><strong>u</strong> /yoo/ — unit, music</li>
      </ul>
    </article>
    <article class="gp-card">
      <h4>Digraphs / trigraphs</h4>
      <p class="mini">sh, ch, th, ph, wh, igh, tch, dge</p>
      <ul>
        <li><strong>sh</strong> — ship, brush</li>
        <li><strong>ch</strong> — chat, teacher</li>
        <li><strong>th</strong> (/θ/ or /ð/) — thin, this</li>
        <li><strong>ph</strong> — phone, graph</li>
        <li><strong>wh</strong> — when, whale</li>
        <li><strong>igh</strong> — high, night</li>
        <li><strong>tch</strong> — catch, match</li>
        <li><strong>dge</strong> — bridge, edge</li>
      </ul>
    </article>
    <article class="gp-card">
      <h4>Vowel teams</h4>
      <p class="mini">ai/ay, ee/ea, oa/ow, oi/oy, ou/ow, au/aw</p>
      <ul>
        <li><strong>ai/ay</strong> — rain / day</li>
        <li><strong>ee/ea</strong> — see / team</li>
        <li><strong>oa/ow</strong> — boat / snow</li>
        <li><strong>oi/oy</strong> — coin / boy</li>
        <li><strong>ou/ow</strong> — sound / cloud</li>
        <li><strong>au/aw</strong> — cause / saw</li>
      </ul>
    </article>
    <article class="gp-card">
      <h4>R‑controlled vowels</h4>
      <ul>
        <li><strong>ar</strong> — car, start</li>
        <li><strong>er/ir/ur</strong> — her, bird, turn</li>
        <li><strong>or</strong> — fork, north</li>
      </ul>
    </article>
    <article class="gp-card">
      <h4>Silent letters</h4>
      <p class="mini">kn/gn, wr, mb, igh, tch</p>
      <ul>
        <li><strong>kn/gn</strong> — knee, gnome</li>
        <li><strong>wr</strong> — write, wrist</li>
        <li><strong>mb</strong> — thumb, comb</li>
        <li><strong>igh</strong> — light (single sound /ī/)</li>
      </ul>
    </article>
  </div>
</section>
`;

const GP_GRID_CSS = `
/* ===== GP mapping grid, 2 rows × 3 columns ===== */
.gp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,auto);gap:16px;margin:12px 0}
@media (max-width: 980px){.gp-grid{grid-template-columns:1fr}}
.gp-card{background:#0b1220;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px}
.gp-card h4{margin:0 0 8px;font-size:16px;font-weight:700}
.gp-card .mini{opacity:.8;margin:.2rem 0 .6rem}
.gp-card ul{margin:6px 0 0 18px}
.gp-card li{margin:2px 0}
`;

// helper: make relative src/href path
function addLinksAndScripts(htmlPath, html) {
    const relCSS = relativeFrom(htmlPath, cssFile);
    const relJS = relativeFrom(htmlPath, jsFile);

    // <head> injection
    const headEnd = '</head>';
    const cssTag = `<link rel="stylesheet" href="${relCSS}">`;
    const jsTagHead = ''; // keep JS at end of body for safety

    let out = insertOnce(html, headEnd, `  ${cssTag}`);

    // Add extra CSS for GP grid and minor fixes if not present
    if (!out.includes('/* ===== GP mapping grid')) {
        const extraStyle = `<style>\n${GP_GRID_CSS}\n</style>`;
        out = insertOnce(out, headEnd, extraStyle);
    }

    // </body> injection
    const bodyEnd = '</body>';
    const jsTag = `  <script defer src="${relJS}"></script>`;
    out = insertOnce(out, bodyEnd, jsTag);

    return out;
}

// Replace long text block with our structured grid if we find the marker
function maybeReplaceGPMapping(html) {
    const startMarker = /2\)\s*Grapheme[\s–-]*phoneme practice \(GP mapping\)/i;
    if (!startMarker.test(html)) return html;

    // Try to cut between our header and the next major header (How to run / Sound Training Studio / 3))
    const startIdx = html.search(startMarker);
    if (startIdx === -1) return html;

    // Find an end boundary
    const endMatch = html.slice(startIdx).search(/(How to run|Sound Training Studio|3\)|<\/section>|<\/article>)/i);
    let before = html.slice(0, startIdx);
    if (endMatch === -1) {
        return before + GP_GRID_HTML; // append if we can't find end
    }
    const after = html.slice(startIdx + endMatch);
    return before + GP_GRID_HTML + after;
}

// Move/ensure back-to-top button id/class for consistent positioning
function normalizeBackToTop(html) {
    if (html.includes('id="back-to-top"') || html.includes('class="back-to-top"')) return html;
    // Try to add a standard back-to-top button if none exists
    const end = '</body>';
    const btn = `
  <button id="back-to-top" aria-label="Back to top" onclick="window.scrollTo({top:0,behavior:'smooth'})" style="display:none">▲</button>
  <script>
  (function(){var b=document.getElementById('back-to-top');var t=null;window.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(function(){b.style.display=(window.scrollY>600)?'block':'none';},50)})})();
  </script>`;
    return insertOnce(html, end, btn);
}

let patched = 0, gridPatched = 0;

for (const file of htmlFiles) {
    let src = fs.readFileSync(file, 'utf8');

    // 2a) Remove visible duplicates of prior voice coach markup
    src = src.replace(/<[^>]+class="[^"]*(?:voice-coach|old-voice-coach)[^"]*"[^>]*>[^]*?<\/[^>]+>/gi, '');

    // 2b) Inject links and scripts
    src = addLinksAndScripts(file, src);

    // 2c) Normalize back-to-top
    src = normalizeBackToTop(src);

    // 2d) Replace GP mapping block to a 2x3 grid (when present)
    const before = src;
    src = maybeReplaceGPMapping(src);
    if (before !== src) gridPatched++;

    fs.writeFileSync(file, src, 'utf8');
    patched++;
}

// ---------- 3) Done ----------
console.log('✅ Voice Coach assets written to', path.relative(root, assetsDir));
console.log('✅ HTML files patched:', patched);
if (gridPatched) console.log('✅ GP mapping grid inserted on', gridPatched, 'page(s).');

console.log('\\nNext steps: just reload your site in the browser. On first click/tap, the Voice Coach will unlock audio and speak across Chrome, Edge, Safari. All sections gain Start/Pause/Stop, and breathing Start opens the focus screen with cues.');
