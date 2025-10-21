// mshare-voicecoach-one-shot.mjs
// One‑shot project patcher for M Share
// - Remove old/duplicate Voice Coach UI + bars
// - Keep ONE Voice Coach panel per page (natural voice, cross‑browser)
// - Narrate the text in the section/page where a user taps an existing Start/Open button
// - Speak Inhale/Hold/Exhale during breathing sessions immediately
// - No page-wide layout overrides; minimal contained CSS
//
// Run once from the project root:
//   node mshare-voicecoach-one-shot.mjs

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const rel = (...p) => path.join(root, ...p);
const assetsDir = rel('_coach');
const cssFile = rel('_coach/voice-coach.css');
const jsFile = rel('_coach/voice-coach.js');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name.startsWith('.') ||
      entry.name === 'node_modules' ||
      entry.name === '_coach' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === 'coverage' ||
      entry.name === 'out'
    ) continue;

    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function relativeFrom(file, target) {
  const dir = path.dirname(file);
  return path.relative(dir, target).split(path.sep).join('/');
}
function insertOnce(src, beforeNeedle, toInsert) {
  if (src.includes(toInsert)) return src;
  const i = src.indexOf(beforeNeedle);
  if (i === -1) return src.trimEnd() + '\n' + toInsert + '\n';
  return src.slice(0, i) + toInsert + '\n' + src.slice(i);
}
function removeAll(src, patterns) {
  let out = src;
  for (const re of patterns) out = out.replace(re, '');
  return out;
}

// ---------------------- ASSETS ----------------------
ensureDir(assetsDir);

// Minimal, contained CSS (no global layout overrides)
const CSS = `
/* ============ Voice Coach (single panel) ============ */
#vc-panel{position:fixed;right:24px;bottom:24px;z-index:999999;background:#0b1220;color:#e5e7eb;
  border:1px solid rgba(255,255,255,.14);border-radius:14px;box-shadow:0 10px 26px rgba(0,0,0,.35);
  padding:14px 16px;width:320px;max-width:94vw;font-family:system-ui,-apple-system,Segoe UI,Inter,Roboto,Arial}
#vc-panel *{box-sizing:border-box}
#vc-panel h3{margin:0 0 8px;font-size:16px;font-weight:700}
#vc-panel .row{display:flex;align-items:center;justify-content:space-between;margin:8px 0}
#vc-panel .pill{background:#1a2440;color:#e5e7eb;border-radius:999px;padding:6px 10px;font-size:12px}
#vc-panel .btn{cursor:pointer;border-radius:10px;padding:8px 12px;border:1px solid rgba(255,255,255,.16);background:#0e1730;color:#e5e7eb}
#vc-panel .btn:hover{background:#121e3b}
#vc-panel .group{display:flex;gap:8px}
#vc-panel select,#vc-panel input[type="range"]{width:180px;background:#0e1730;color:#e5e7eb;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:6px 8px}
#vc-panel .mini{opacity:.75;font-size:12px}

/* Focus overlay (no Start/Pause/Stop buttons here) */
#vc-focus{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,10,16,.72);
  backdrop-filter:blur(4px);z-index:999998}
#vc-focus.visible{display:flex}
#vc-focus .card{width:min(900px,92vw);height:min(620px,88vh);background:radial-gradient(ellipse at center,#0f172a 15%,#0b1324 60%,#0a0f1a 100%);
  border:1px solid rgba(255,255,255,.08);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.55);position:relative;overflow:hidden;color:#e5e7eb}
#vc-focus .title{position:absolute;top:18px;left:0;right:0;text-align:center;font-size:20px;font-weight:700;letter-spacing:.3px}
#vc-focus .ring{position:absolute;inset:70px;border-radius:50%;background:conic-gradient(#6ee7b7 var(--deg,0deg),transparent 0)}
#vc-focus .inner{position:absolute;inset:120px;border-radius:50%;background:rgba(255,255,255,.04)}
#vc-focus .state{position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:40px;font-weight:800}
#vc-focus .sub{position:absolute;left:0;right:0;bottom:80px;text-align:center;font-size:14px;opacity:.85}
#vc-focus .back{position:absolute;right:18px;top:14px}
`;

// Single, robust Voice Coach (one instance site‑wide)
const JS = `
// ===== Voice Coach (single instance) =====
(() => {
  if (window.VoiceCoach) return;

  // ---------- State ----------
  const S = {
    on: true,
    rate: parseFloat(localStorage.getItem('vc_rate')) || 0.98,
    voiceName: localStorage.getItem('vc_voice') || '',
    voice: null,
    speaking: false,
    currentUtt: null,
    audioUnlocked: false,
    focus: null,     // { id, running }
    lastScope: null, // section/article containing the Start that was clicked
    primed: false
  };

  // ---------- Utilities ----------
  const qs  = (s, c=document) => c.querySelector(s);
  const qsa = (s, c=document) => Array.from(c.querySelectorAll(s));
  const on  = (el, ev, fn, opts) => el && el.addEventListener && el.addEventListener(ev, fn, opts || { passive:true });
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  // Unlock & prime audio/voices (no hard refresh needed; works on Safari/Chrome/Edge)
  function unlock() {
    if (S.audioUnlocked) return;
    const unlockFn = () => {
      try {
        // Prime WebAudio (some mobile browsers require a gesture)
        if (window.AudioContext) {
          const ac = new AudioContext();
          const o = new OscillatorNode(ac); o.connect(ac.destination); o.start(); o.stop();
          if (ac.state === 'suspended') ac.resume();
          setTimeout(() => ac.close(), 0);
        }
        // Prime TTS on WebKit/iOS (silent 1-char utterance)
        if (!S.primed && window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(' ');
          u.volume = 0;
          speechSynthesis.speak(u);
          // Cancel quickly to flush and trigger voiceschanged
          setTimeout(() => { try { speechSynthesis.cancel(); } catch{} }, 30);
          S.primed = true;
        }
      } catch(e){}
      S.audioUnlocked = true;
      window.removeEventListener('pointerdown', unlockFn, true);
      window.removeEventListener('keydown', unlockFn, true);
    };
    window.addEventListener('pointerdown', unlockFn, true);
    window.addEventListener('keydown',   unlockFn, true);
  }

  async function voicesReady(timeout=6000) {
    let done = false;
    return new Promise(resolve => {
      const start = performance.now();
      const resolveOnce = (v) => { if (done) return; done = true; resolve(v || []); };

      function check() {
        try {
          const v = window.speechSynthesis ? speechSynthesis.getVoices() : [];
          if ((v && v.length) || performance.now() - start > timeout) resolveOnce(v);
          else setTimeout(check, 120);
        } catch { resolveOnce([]); }
      }

      if (window.speechSynthesis) {
        on(speechSynthesis, 'voiceschanged', () => resolveOnce(speechSynthesis.getVoices() || []), { once:true });
      }
      check();
    });
  }

  function pickVoice(list, wanted='') {
    if (!list || !list.length) return null;
    const lc = s => s.toLowerCase();
    const en = list.filter(v => /^en([-_]|$)/i.test(v.lang));
    if (wanted) {
      const byName = list.find(v => lc(v.name).includes(lc(wanted)));
      if (byName) return byName;
    }
    const prefs = [
      // Chrome
      'Google US English','Google UK English Male','Google UK English Female',
      // Edge
      'Microsoft Aria','Microsoft Jenny','Microsoft Guy','Microsoft Ryan',
      // Safari/macOS
      'Samantha','Alex','Moira','Daniel','Serena','Tessa','Karen','Tom'
    ];
    for (const p of prefs) {
      const v = list.find(v => lc(v.name).includes(lc(p)));
      if (v) return v;
    }
    return en[0] || list[0];
  }

  // Natural prosody: split, add short breaks, pace punctuation
  function splitText(t) {
    if (!t) return [];
    const cleaned = t.replace(/\\s+/g,' ').replace(/[–—]/g,'—').trim();
    const sentences = cleaned.split(/(?<=[.!?])\\s+(?=[A-Z0-9])/g);
    const chunks = [];
    for (const s of sentences) {
      if (s.length <= 240) chunks.push(s);
      else s.split(/,\\s+/g).forEach(p => chunks.push(p));
    }
    return chunks.filter(Boolean);
  }

  async function speakChunk(text, opts={}) {
    if (!S.on || !window.speechSynthesis) return;
    await voicesReady();
    const voices = speechSynthesis.getVoices();
    S.voice = pickVoice(voices, S.voiceName);
    if (!S.voice) return;

    const withPauses = text
      .replace(/:/g, ',')
      .replace(/;|—/g, ',')
      .replace(/\\((.*?)\\)/g, ', $1 ,');

    const u = new SpeechSynthesisUtterance(withPauses);
    u.voice = S.voice;
    u.rate = clamp(opts.rate ?? S.rate, 0.9, 1.15);
    u.pitch = clamp(opts.pitch ?? 1.0, 0.9, 1.1);
    u.volume = clamp(opts.volume ?? 1, 0, 1);

    u.onstart = () => { S.speaking = true; S.currentUtt = u; };
    u.onend   = () => { S.speaking = false; S.currentUtt = null; };
    u.onerror = () => { S.speaking = false; S.currentUtt = null; };

    speechSynthesis.speak(u);
    await new Promise(res => { u.addEventListener('end', res, {once:true}); u.addEventListener('error', res, {once:true}); });
    await sleep(20);
  }

  async function speak(text) {
    if (!S.on || !text) return;
    unlock();
    try { speechSynthesis.cancel(); } catch {}
    const parts = Array.isArray(text) ? text : splitText(text);
    for (const p of parts) {
      if (!S.on) break;
      await speakChunk(p);
    }
  }
  function pause(){ try{ speechSynthesis.pause(); }catch(e){} }
  function resume(){ try{ speechSynthesis.resume(); }catch(e){} }
  function stop(){ try{ speechSynthesis.cancel(); S.speaking=false; S.currentUtt=null; }catch(e){} }

  // ---------- Panel ----------
  function installPanel() {
    if (qs('#vc-panel')) return;
    const el = document.createElement('div');
    el.id = 'vc-panel';
    el.innerHTML = \`
      <h3>Voice Coach</h3>
      <div class="row">
        <span class="pill">Status</span>
        <div class="group">
          <button id="vc-toggle" class="btn">On</button>
        </div>
      </div>
      <div class="row">
        <span class="pill">Voice</span>
        <select id="vc-voice"></select>
      </div>
      <div class="row">
        <span class="pill">Speed</span>
        <input id="vc-rate" type="range" min="0.90" max="1.15" step="0.01" value="\${S.rate}">
      </div>
      <div class="row">
        <span class="pill">Controls</span>
        <div class="group">
          <button id="vc-start" class="btn">Start</button>
          <button id="vc-pause" class="btn">Pause</button>
          <button id="vc-stop"  class="btn">Stop</button>
        </div>
      </div>
      <div class="row mini">Tip: press your page’s own <strong>Start</strong> button; Voice Coach will narrate that section and guide breathing. Pause/Stop here anytime.</div>
    \`;
    document.body.appendChild(el);

    const voiceSel = qs('#vc-voice', el);
    const rate = qs('#vc-rate', el);

    (async () => {
      const list = await voicesReady();
      const en = list.filter(v => /^en([-_]|$)/i.test(v.lang));
      voiceSel.innerHTML = en.map(v => \`<option value="\${v.name}">\${v.name}</option>\`).join('');
      const best = pickVoice(list, S.voiceName);
      if (best) { S.voiceName = best.name; voiceSel.value = best.name; }
      localStorage.setItem('vc_voice', S.voiceName);
    })();

    on(voiceSel,'change', () => { S.voiceName = voiceSel.value; localStorage.setItem('vc_voice', S.voiceName); speak('Voice selected.'); });
    on(rate,'input', () => { S.rate = Number(rate.value); localStorage.setItem('vc_rate', String(S.rate)); });

    on(qs('#vc-toggle',el), 'click', () => {
      S.on = !S.on;
      qs('#vc-toggle',el).textContent = S.on ? 'On' : 'Off';
      if (!S.on) stop(); else speak('Voice Coach ready.');
    });

    on(qs('#vc-start',el), 'click', () => {
      const scope = S.lastScope || qs('main') || document.body;
      narrateScope(scope, { maybeBreathing:true });
    });
    on(qs('#vc-pause',el), 'click', () => { pause(); speak('Paused.'); });
    on(qs('#vc-stop',el),  'click', () => { stop(); closeFocus(); });
  }

  // ---------- Focus overlay (no extra Start/Pause/Stop here) ----------
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
      </div>
    \`;
    document.body.appendChild(el);

    on(qs('.back', el),'click', () => {
      const setup = qsa('h1,h2,h3,#setup,[data-section],section,article').find(h => /setup|settings|start/i.test(h.textContent||h.id||''));
      if (setup) { el.classList.remove('visible'); setup.scrollIntoView({behavior:'smooth', block:'start'}); stop(); return; }
      if (history.length > 1) history.back(); else el.classList.remove('visible');
    });
  }
  function openFocus(title='Session'){ installFocus(); const el = qs('#vc-focus'); qs('#vc-focus-title',el).textContent = title; el.classList.add('visible'); }
  function closeFocus(){ const el = qs('#vc-focus'); if (el) el.classList.remove('visible'); }

  // ---------- Breathing engine ----------
  function setRing(frac){ const el = qs('#vc-focus .ring'); if (el) el.style.setProperty('--deg', (360*frac).toFixed(1)+'deg'); }
  function setState(t){ const el = qs('#vc-focus-state'); if (el) el.textContent = t; }
  function setSub(t){ const el = qs('#vc-focus-sub'); if (el) el.textContent = t; }

  function animateRing(seconds) {
    return new Promise(res => {
      const el = qs('#vc-focus');
      const start = performance.now();
      function step(t){
        if (!S.focus || !S.focus.running || !el.classList.contains('visible')) { setRing(0); return res(); }
        const p = Math.min(1,(t-start)/(seconds*1000));
        setRing(p);
        if (p>=1) { setRing(0); return res(); }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  async function runBreathing(pattern, opts={cycles:6, labels:['Inhale','Hold','Exhale']}) {
    openFocus(opts.title || 'Session');
    let cycle = 0;
    const id = Math.random().toString(36).slice(2);
    S.focus = { id, running:true };

    while (S.focus && S.focus.running && cycle < (opts.cycles||6)) {
      for (let i=0;i<pattern.length;i++){
        if (!S.focus || !S.focus.running) break;
        const label = opts.labels[i] || 'Breathe';
        const secs  = Number(pattern[i])||4;
        setState(label); setSub(\`\${cycle+1}/\${opts.cycles||6} breaths\`);
        // Speak the phase immediately for instant feedback
        await speakChunk(\`\${label} \${secs} seconds.\`);
        await animateRing(secs);
      }
      cycle++;
    }
    if (S.focus && S.focus.id===id) {
      setState('Ready'); setSub(''); setRing(0);
      speak('Session complete.');
      S.focus=null;
    }
  }

  // ---------- Scoping + narration ----------
  function nearestScope(el) {
    return el.closest('section,article,[data-section],main,.card,.panel') || document.body;
  }
  function collectText(el) {
    const toSkip = new Set(['NAV','FOOTER','ASIDE','SCRIPT','STYLE']);
    const clone = el.cloneNode(true);
    qsa('#vc-panel,#vc-focus,.vc-bar,.voice-coach,.old-voice-coach,#voice-coach,[data-voice-coach]', clone).forEach(n => n.remove());
    qsa('button,select,input,textarea', clone).forEach(n => n.remove());
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null);
    const parts = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.nodeValue) continue;
      const parent = n.parentElement;
      if (parent && toSkip.has(parent.tagName)) continue;
      const s = n.nodeValue.replace(/\\s+/g,' ').trim();
      if (s) parts.push(s);
    }
    return parts.join(' ');
  }

  function detectTechnique(text) {
    const t = (text||document.body.innerText||'').toLowerCase();
    if (t.includes('4-7-8') || t.includes('4 – 7 – 8') || t.includes('4‑7‑8')) return { name:'4‑7‑8 Breathing', pattern: infer478(), labels:['Inhale','Hold','Exhale'] };
    if (t.includes('box breathing') || t.includes('four-square')) return { name:'Box Breathing', pattern: inferBox(), labels:['Inhale','Hold','Exhale','Hold'] };
    if (t.includes('coherent') || t.includes('5-5') || t.includes('5 – 5') || t.includes('5‑5')) return { name:'Coherent 5‑5', pattern: inferCoherent(), labels:['Inhale','Exhale'] };
    return null;
  }
  function findNumberNear(label) {
    const el = qsa('label,span,strong,b,em').find(n => (n.textContent||'').toLowerCase().includes(label));
    if (!el) return null;
    const box = el.closest('label,div,section,article') || el.parentElement;
    const inp = box && qsa('input[type="number"],input[type="text"]', box).find(x => /^\\d+$/.test(x.value.trim()));
    return inp ? Number(inp.value) : null;
  }
  function infer478(){ const inh = findNumberNear('inhale') ?? 4; const hold = findNumberNear('hold') ?? 7; const ex = findNumberNear('exhale') ?? 8; return [inh,hold,ex]; }
  function inferBox(){ const n = findNumberNear('seconds') || 4; return [n,n,n,n]; }
  function inferCoherent(){ const n = findNumberNear('breaths') || findNumberNear('seconds') || 5; return [n,n]; }

  async function narrateScope(scope, { maybeBreathing=false }={}) {
    S.lastScope = scope;
    const text = collectText(scope);
    const technique = maybeBreathing ? detectTechnique(text) : null;

    if (technique) {
      // Start immediately with the practice cues; then read the section text
      await speakChunk('Starting ' + technique.name + '.');
      runBreathing(technique.pattern, { title: technique.name, labels: technique.labels, cycles: 6 });
      // Give the engine a moment to start, then narrate the section in the background
      setTimeout(() => { speak(text); }, 250);
    } else {
      await speak(text || 'Starting.');
    }
  }

  // ---------- Wire up existing buttons ----------
  function wire() {
    // Remove any old/duplicate injected UIs
    qsa('.voice-coach, .old-voice-coach, #voice-coach, [data-voice-coach], .vc-bar').forEach(el => el.remove());

    installPanel(); installFocus(); unlock();

    document.addEventListener('click', (e) => {
      const el = e.target.closest('button,a,[role="button"],.btn,input[type="button"],input[type="submit"]');
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.value || el.textContent || '').trim().toLowerCase();

      // Treat "open" as start too (cards with Open -> flow)
      if (/\\b(start|begin|play|run|go|open|launch|enter)\\b/.test(label)) {
        const scope = nearestScope(el);
        narrateScope(scope, { maybeBreathing:true });
        return;
      }
      if (/\\bpause\\b/.test(label)) { pause(); return; }
      if (/\\b(stop|end|finish|close|back)\\b/.test(label)) { stop(); closeFocus(); return; }
    }, true);

    // Re-fetch voices when page becomes visible again (prevents WebKit race)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { try { speechSynthesis.getVoices(); } catch(e){} }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  window.VoiceCoach = { speak, pause, resume, stop, openFocus, closeFocus };
})();
`;

fs.writeFileSync(cssFile, CSS, 'utf8');
fs.writeFileSync(jsFile, JS, 'utf8');

// ---------------------- PATCH EVERY HTML FILE ----------------------
const htmlFiles = walk(root).filter(f => /\.html?$/i.test(f));
let patched = 0, cleaned = 0, deduped = 0;

// Remove legacy UI bars, old panels, and prior injector comments
const LEGACY_PATTERNS = [
  /<div\s+class=["']vc-bar["'][\s\S]*?<\/div>\s*/gi,
  /<div\s+id=["']voice-coach["'][\s\S]*?<\/div>\s*/gi,
  /<div\s+class=["'](?:old-)?voice-coach[^"']*["'][\s\S]*?<\/div>\s*/gi,
  /<!--\s*Injected by[\s\S]*?mshare[\s\S]*?fix(?:es)?[\s\S]*?-->\s*/gi
];

// Remove any existing voice‑coach asset tags to avoid duplicates
const ASSET_TAG_PATTERNS = [
  /<link\b[^>]*href=["'][^"']*voice-coach\.css["'][^>]*\/?>\s*/gi,
  /<script\b[^>]*src=["'][^"']*voice-coach\.js["'][^>]*>\s*<\/script>\s*/gi
];

for (const file of htmlFiles) {
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  // 1) Remove legacy UIs + injector comments
  const beforeClean = src;
  src = removeAll(src, LEGACY_PATTERNS);
  if (src !== beforeClean) cleaned++;

  // 2) Remove any previously linked voice-coach assets (dedupe)
  const beforeDedupe = src;
  src = removeAll(src, ASSET_TAG_PATTERNS);
  if (src !== beforeDedupe) deduped++;

  // 3) Ensure new (minimal) Voice Coach assets are linked once
  const relCSS = relativeFrom(file, cssFile);
  const relJS = relativeFrom(file, jsFile);
  const headEnd = '</head>';
  const bodyEnd = '</body>';
  const cssTag = `  <link rel="stylesheet" href="${relCSS}">`;
  const jsTag = `  <script defer src="${relJS}"></script>`;

  src = insertOnce(src, headEnd, cssTag);
  src = insertOnce(src, bodyEnd, jsTag);

  try {
    fs.writeFileSync(file, src, 'utf8');
    patched++;
  } catch {
    // continue
  }
}

// ---------------------- RESULT ----------------------
console.log('✅ Voice Coach assets written to', path.relative(root, assetsDir));
console.log('✅ HTML files patched:', patched);
console.log('✅ Removed legacy Voice Coach UI from', cleaned, 'file(s).');
console.log('✅ Deduped old voice-coach <link>/<script> tags in', deduped, 'file(s).');
console.log('All set. Use your existing Start/Open buttons; one Voice Coach will narrate the section and guide breathing with natural speech.');
