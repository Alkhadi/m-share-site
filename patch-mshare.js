/* -----------------------------------------------------------
   One-shot patcher for M Share (Voice Coach + Mobile Nav)
   Run once from your project root:
     node patch-mshare.js
   ----------------------------------------------------------- */

const fs = require('fs');
const path = require('path');

// ---------- utility helpers ----------
const enc = 'utf8';
const here = process.cwd();

function writeFileSafe(filePath, content) {
    fs.writeFileSync(filePath, content, { encoding: enc });
    console.log('✔ wrote', path.relative(here, filePath));
}

function ensureInHead(html, snippet) {
    if (html.includes(snippet)) return html;
    return html.replace(/<\/head>/i, `  ${snippet}\n</head>`);
}

function ensureBeforeBodyClose(html, snippet) {
    if (html.includes(snippet)) return html;
    return html.replace(/<\/body>/i, `  ${snippet}\n</body>`);
}

function listHtmlFiles(dir) {
    const out = [];
    function walk(d) {
        const ents = fs.readdirSync(d, { withFileTypes: true });
        for (const e of ents) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) {
                if (['node_modules', '.git', 'dist', 'build', '.next', 'out', '.cache'].includes(e.name)) continue;
                walk(p);
            } else if (e.isFile() && /\.html?$/i.test(e.name)) {
                out.push(p);
            }
        }
    }
    walk(dir);
    return out;
}

// ---------- assets to install ----------

const CSS = `
/* -----------------------------------------------------------
   Voice Coach & Mobile Nav Fixes (global, small + safe)
   ----------------------------------------------------------- */

:root {
  --vcz: 9999;                 /* Voice Coach z-index */
  --navz: 9998;                /* Mobile menu z-index (below coach) */
  --vcpad: 12px;
  --vcgap: 8px;
  --vcbg: #0e1726;
  --vcfg: #d4d9e6;
  --vcmuted: #8a93a6;
  --vcaccent: #a5b4fc;         /* subtle indigo accent */
  --vcbd: rgba(255,255,255,.08);
  --vcshadow: 0 8px 30px rgba(0,0,0,.35);
}

/* Sticky Voice Coach shell (works with your existing panel;
   if none exists, JS will create it using these classes) */
.voice-coach, #voice-coach {
  position: fixed !important;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: var(--vcz) !important;
  background: var(--vcbg);
  color: var(--vcfg);
  border-radius: 14px;
  box-shadow: var(--vcshadow);
  border: 1px solid var(--vcbd);
  padding: var(--vcpad);
  max-width: 320px;
  width: calc(100vw - 32px);
  pointer-events: auto;
}

/* minimal structure when JS builds the panel (keeps your look) */
.vc-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-row-gap: var(--vcgap);
  grid-column-gap: 10px;
}
.vc-row { display: contents; }
.vc-label { color: var(--vcmuted); font-size: 12px; letter-spacing:.02em; }
.vc-value { font-size: 13px; }
.vc-controls { grid-column: 1 / -1; display: flex; gap: 8px; flex-wrap: wrap; }
.vc-btn {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid var(--vcbd);
  background: #111827;
  color: var(--vcfg);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
}
.vc-btn:focus-visible { outline: 2px solid var(--vcaccent); outline-offset: 2px; }
.vc-btn[aria-pressed="true"] { border-color: var(--vcaccent); box-shadow: inset 0 0 0 1px var(--vcaccent); }

/* Headphone speak buttons (existing or injected) */
button.vc-speak, .vc-speak.btn, .btn-speak, .headphone, .icon-headphone-btn {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: 10px; border: 1px solid var(--vcbd);
  background:#0b1220; color: var(--vcfg); padding:6px 10px; cursor:pointer;
}

/* Focus screen Start / Pause / Stop group */
.vc-focus-controls {
  position: absolute;
  left: 24px; bottom: 24px;
  display: flex; gap: 10px; z-index: var(--vcz);
}
.vc-chip {
  border: 1px solid rgba(255,255,255,.08);
  background: #0b1220; color:#d8dde8; padding:10px 14px;
  border-radius: 12px; font-size:14px; line-height:18px; cursor:pointer;
}

/* Remove duplicate/hidden focus screens visually (fallback) */
.vc-hide { display: none !important; }

/* Mobile overlay menu (centered) */
#vc-mobile-overlay {
  position: fixed; inset: 0; z-index: var(--navz);
  background: rgba(7, 11, 18, .82);
  backdrop-filter: blur(10px);
  display: none; align-items: center; justify-content: center;
}
#vc-mobile-overlay[open] { display: flex; }
#vc-mobile-menu {
  max-height: 80vh; width: min(92vw, 420px);
  background: #0e1726; color: #e5e7ef; border-radius: 16px;
  box-shadow: var(--vcshadow); border:1px solid var(--vcbd);
  overflow: auto; padding: 14px;
}
#vc-mobile-menu nav, #vc-mobile-menu ul { list-style: none; margin: 0; padding: 0; }
#vc-mobile-menu li { border-bottom: 1px solid rgba(255,255,255,.06); }
#vc-mobile-menu a { display:flex; align-items:center; justify-content:space-between;
  text-decoration: none; color: inherit; padding: 14px 8px; }
#vc-mobile-menu .chevron { transition: transform .2s ease; margin-left: 8px; opacity: .7; }
#vc-mobile-menu details[open] > summary .chevron { transform: rotate(90deg); }
#vc-mobile-menu summary { list-style: none; cursor: pointer; display:flex; align-items:center; justify-content:space-between; padding: 14px 8px; }
#vc-mobile-menu summary::-webkit-details-marker { display: none; }

.vc-visually-hidden { position:absolute!important; width:1px;height:1px;margin:-1px;border:0;padding:0;clip:rect(0 0 0 0); overflow:hidden; }
`;

// The core logic. Carefully kept framework-agnostic and additive-only.
const JS = `
/* -----------------------------------------------------------
   Voice Coach + Mobile Nav Fix
   - Cross-browser speech synthesis (Chrome, Safari, Firefox, Edge)
   - Sticky Voice Coach panel
   - Headphone buttons work consistently
   - Focus screen Start/Pause/Stop + duplicate cleanup
   - Mobile hamburger overlay menu (centered) with chevrons
   ----------------------------------------------------------- */
(() => {
  // ---------- tiny DOM helpers ----------
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const byText = (el) => (el.textContent || '').trim().toLowerCase();

  // ---------- SPEECH ENGINE ----------
  class SpeechEngine {
    constructor() {
      this.voices = [];
      this.ready = this._initVoices();
      this._queue = [];
      this._speaking = false;
      this._paused = false;
      this.voiceNamePref = localStorage.getItem('vc.voice') || 'Daniel';
      this.rate = parseFloat(localStorage.getItem('vc.rate') || '1') || 1;
      this.pitch = parseFloat(localStorage.getItem('vc.pitch') || '1') || 1;
      this.langPref = localStorage.getItem('vc.lang') || 'en';
    }

    _initVoices() {
      return new Promise((resolve) => {
        const load = () => {
          const list = window.speechSynthesis.getVoices();
          if (list && list.length) {
            this.voices = list;
            resolve(list);
          } else {
            // Chrome: voices often load async after first getVoices() call
            setTimeout(() => {
              this.voices = window.speechSynthesis.getVoices() || [];
              resolve(this.voices);
            }, 300);
          }
        };
        try { window.speechSynthesis.getVoices(); } catch {}
        if ('onvoiceschanged' in window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = () => load();
        }
        load();
      });
    }

    _chooseVoice() {
      const list = this.voices;
      if (!list || !list.length) return null;
      // Preferred exact name
      let v = list.find(v => v.name === this.voiceNamePref);
      if (v) return v;
      // Smart fallbacks by common Chrome voices
      const fallbacks = [
        'Google UK English Male',
        'Google US English',
        'Google UK English Female',
        'Samantha','Alex','Victoria','Fred', // macOS voices
      ];
      v = list.find(v => fallbacks.includes(v.name));
      if (v) return v;
      // Language fallback
      v = list.find(v => (v.lang || '').toLowerCase().startsWith(this.langPref.toLowerCase()));
      return v || list[0];
    }

    async speak(text, opts={}) {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported.');
        return;
      }
      await this.ready;
      // Stop any current speech if requested (default true on explicit speak buttons)
      if (opts.clear !== false) window.speechSynthesis.cancel();

      // Split long text into shorter utterances to avoid Chrome truncation
      const parts = this._splitText(text);
      for (const part of parts) {
        const u = new SpeechSynthesisUtterance(part);
        const v = this._chooseVoice();
        if (v) u.voice = v;
        u.rate = (opts.rate ?? this.rate);
        u.pitch = (opts.pitch ?? this.pitch);
        u.lang  = (opts.lang  ?? v?.lang ?? 'en-US');
        await this._speakOne(u);
      }
    }

    _splitText(t) {
      const s = (t || '').replace(/\\s+/g,' ').trim();
      if (!s) return [];
      // split by sentence stops but keep it robust
      const raw = s.split(/(?<=[\\.\\?!])\\s+(?=[A-Z0-9])/g);
      const out = [];
      for (const r of raw) {
        if (r.length <= 220) { out.push(r); continue; }
        // chunk very long sentences
        for (let i=0; i<r.length; i+=220) out.push(r.slice(i, i+220));
      }
      return out;
    }

    _speakOne(u) {
      return new Promise((resolve) => {
        u.onend = () => { this._speaking = false; resolve(); };
        u.onerror = () => { this._speaking = false; resolve(); }; // don't block
        this._speaking = true;
        window.speechSynthesis.speak(u);
      });
    }

    pause() { try { window.speechSynthesis.pause(); this._paused = true; } catch{} }
    resume() { try { window.speechSynthesis.resume(); this._paused = false; } catch{} }
    stop() { try { window.speechSynthesis.cancel(); this._speaking = false; this._paused = false; } catch{} }

    setRate(x){ this.rate = x; localStorage.setItem('vc.rate', String(x)); }
    setVoiceByName(name){ this.voiceNamePref = name; localStorage.setItem('vc.voice', name); }
  }

  const VC = new SpeechEngine();

  // ---------- BUILD / WIRE THE VOICE COACH PANEL ----------
  function ensureVoiceCoachPanel() {
    let panel = document.querySelector('.voice-coach, #voice-coach');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'voice-coach';
      panel.className = 'voice-coach';
      panel.innerHTML = \`
        <div class="vc-grid" role="group" aria-label="Voice Coach">
          <div class="vc-row">
            <div class="vc-label">Status</div>
            <div class="vc-value"><button class="vc-btn" id="vc-toggle" aria-pressed="true">On</button></div>
          </div>
          <div class="vc-row">
            <label class="vc-label" for="vc-voice">Voice</label>
            <div class="vc-value"><select id="vc-voice" style="min-width:160px"></select></div>
          </div>
          <div class="vc-row">
            <label class="vc-label" for="vc-rate">Speed</label>
            <div class="vc-value">
              <input id="vc-rate" type="range" min="0.7" max="1.4" step="0.05" value="\${VC.rate}" />
            </div>
          </div>
          <div class="vc-controls">
            <button class="vc-btn" id="vc-start">Start</button>
            <button class="vc-btn" id="vc-pause">Pause</button>
            <button class="vc-btn" id="vc-stop">Stop</button>
          </div>
          <p class="vc-label" style="grid-column:1/-1;margin:6px 0 0">
            Tip: Use the headphone buttons on any page to narrate selected text.
          </p>
        </div>\`;
      document.body.appendChild(panel);
    }
    // Populate voices (async-safe)
    VC.ready.then(() => {
      const sel = $('#vc-voice', panel);
      if (!sel) return;
      const voices = VC.voices.filter(v => /en/i.test(v.lang || 'en'));
      if (!voices.length) return;
      sel.innerHTML = voices.map(v => \`<option value="\${v.name}">\${v.name}</option>\`).join('');
      const match = voices.find(v => v.name === VC.voiceNamePref) ? VC.voiceNamePref : voices[0].name;
      sel.value = match;
      VC.setVoiceByName(sel.value);
      sel.onchange = () => VC.setVoiceByName(sel.value);
    });

    // Buttons
    const $toggle = $('#vc-toggle', panel);
    const $rate = $('#vc-rate', panel);
    const $start = $('#vc-start', panel);
    const $pause = $('#vc-pause', panel);
    const $stop = $('#vc-stop', panel);

    $toggle?.addEventListener('click', () => {
      const on = $toggle.getAttribute('aria-pressed') !== 'true';
      $toggle.setAttribute('aria-pressed', String(on));
      $toggle.textContent = on ? 'On' : 'Off';
      if (!on) VC.stop();
    });
    $rate?.addEventListener('input', () => VC.setRate(parseFloat($rate.value)));
    $pause?.addEventListener('click', () => VC.pause());
    $stop?.addEventListener('click', () => VC.stop());
    $start?.addEventListener('click', () => {
      const candidate = document.getSelection()?.toString().trim() ||
        $('[data-read-target]')?.textContent ||
        document.querySelector('main, [role="main"]')?.textContent ||
        document.body.textContent;
      if (candidate) VC.speak(candidate, { clear: true });
    });
  }

  // ---------- HEADPHONE BUTTONS ----------
  function bindHeadphoneButtons() {
    // Works for any existing markup: use data attributes or common classes
    const selectors = [
      '[data-say]', '[data-voice]', '[data-read]',
      '.headphone', '.btn-speak', '.vc-speak', '.icon-headphone-btn', 'button[aria-label*="read" i]'
    ].join(',');
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest(selectors);
      if (!btn) return;
      const off = $('#vc-toggle')?.getAttribute('aria-pressed') === 'false';
      if (off) return;
      ev.preventDefault();
      // Possible targets
      let text = btn.getAttribute('data-say') || btn.getAttribute('data-read');
      const targetSel = btn.getAttribute('data-read-target');
      const target = targetSel ? document.querySelector(targetSel) : null;
      if (!text && target) text = target.textContent;
      if (!text) {
        // Try nearest textual container
        const host = btn.closest('[data-voice], article, section, .card, .panel') || btn.parentElement;
        text = (host?.textContent || '').trim();
      }
      if (text) VC.speak(text, { clear: true });
    });
  }

  // ---------- FOCUS SCREEN FIX (controls + duplicate cleanup) ----------
  function fixFocusScreens() {
    // Remove duplicate/hidden background focus screens if more than one exists
    const screens = $$('.focus-screen, .breathing-focus, .breath-player, .breathing-viewport, #focus, .focus');
    if (screens.length > 1) {
      // Keep the one most visible (closest to viewport center)
      let keep = screens[0], keepDist = Infinity, vh = window.innerHeight;
      screens.forEach(s => {
        const r = s.getBoundingClientRect();
        const centerDist = Math.abs((r.top + r.bottom)/2 - vh/2);
        if (centerDist < keepDist) { keep = s; keepDist = centerDist; }
      });
      screens.forEach(s => { if (s !== keep) s.classList.add('vc-hide'); });
    }

    // Add Start/Pause/Stop chips inside the visible focus/player container
    const host = $('.focus-screen:not(.vc-hide), .breathing-focus:not(.vc-hide), .breath-player:not(.vc-hide), .breathing-viewport:not(.vc-hide), #focus:not(.vc-hide), .focus:not(.vc-hide)') || screens[0];
    if (!host) return;

    // Remove Back-to-hub/section button
    $$('a,button', host).forEach(b => {
      const t = byText(b);
      if (t === 'back to hub/section' || t === 'back to hub' || t === 'back') b.remove();
    });

    if (!$('.vc-focus-controls', host)) {
      const box = document.createElement('div');
      box.className = 'vc-focus-controls';
      box.innerHTML = \`
        <button type="button" class="vc-chip" data-vc="start">Start</button>
        <button type="button" class="vc-chip" data-vc="pause">Pause</button>
        <button type="button" class="vc-chip" data-vc="stop">Stop</button>\`;
      host.style.position = host.style.position || 'relative';
      host.appendChild(box);

      box.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-vc]');
        if (!btn) return;
        const kind = btn.getAttribute('data-vc');
        if (kind === 'start') {
          // Try to narrate visible instruction (Inhale/Hold/Exhale) if present
          const visible = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);
          const maybeText = (visible?.textContent || '').trim();
          const program = detectBreathingProgram(host) || defaultBoxProgram();
          narrateBreathing(program);
          if (maybeText) VC.speak(maybeText, { clear: false });
        } else if (kind === 'pause') {
          VC.pause();
          document.dispatchEvent(new CustomEvent('breathing:pause'));
        } else if (kind === 'stop') {
          VC.stop();
          document.dispatchEvent(new CustomEvent('breathing:stop'));
        }
      });
    }
  }

  function defaultBoxProgram() {
    // 4-4-4-4 classic box; can be overridden on pages with data attributes
    return [
      { label: 'Inhale', seconds: 4 },
      { label: 'Hold',   seconds: 4 },
      { label: 'Exhale', seconds: 4 },
      { label: 'Hold',   seconds: 4 },
    ];
  }

  function detectBreathingProgram(root) {
    // If your HTML provides timing via data attributes, pick them up.
    const stepNodes = $$('[data-breath-step]', root);
    if (!stepNodes.length) return null;
    const steps = stepNodes.map(n => ({
      label: n.getAttribute('data-breath-step') || n.getAttribute('aria-label') || n.textContent.trim(),
      seconds: parseFloat(n.getAttribute('data-seconds') || '0') || 0
    })).filter(s => s.seconds > 0);
    return steps.length ? steps : null;
  }

  let breathingTimer = null;
  async function narrateBreathing(steps) {
    clearTimeout(breathingTimer);
    document.dispatchEvent(new CustomEvent('breathing:start', { detail: steps }));
    let idx = 0;
    const run = async () => {
      const step = steps[idx % steps.length];
      await VC.speak(step.label, { clear: false });
      breathingTimer = setTimeout(() => {
        idx++; run();
      }, step.seconds * 1000);
    };
    run();
  }

  // ---------- MOBILE NAV OVERLAY ----------
  function ensureMobileOverlay() {
    if ($('#vc-mobile-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'vc-mobile-overlay';
    overlay.innerHTML = \`
      <div id="vc-mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
        <button class="vc-btn" id="vc-menu-close" style="float:right;margin:6px 6px 8px 0">Close</button>
        <div id="vc-mobile-menu-body"></div>
      </div>\`;
    document.body.appendChild(overlay);

    $('#vc-menu-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target.id === 'vc-mobile-overlay') closeOverlay(); });

    // Hook common hamburger toggles
    const triggers = $$('.hamburger, .menu-toggle, #menu-toggle, [data-menu-toggle], button[aria-label*="menu" i]');
    triggers.forEach(t => {
      t.addEventListener('click', (e) => { e.preventDefault(); openOverlay(); }, { passive: false });
    });

    function openOverlay() {
      // Prefer cloning your existing <nav> to keep links accurate
      const nav = document.querySelector('nav') || $('header nav') || $('[role="navigation"]');
      const body = $('#vc-mobile-menu-body');
      body.innerHTML = '';
      if (nav) {
        const clone = nav.cloneNode(true);
        normalizeMobileMenu(clone);
        body.appendChild(clone);
      } else {
        const list = document.createElement('ul');
        list.innerHTML = '<li><a href="./index.html">Home</a></li>';
        body.appendChild(list);
      }
      document.body.style.overflow = 'hidden';
      $('#vc-mobile-overlay').setAttribute('open','');
    }
    function closeOverlay() {
      document.body.style.overflow = '';
      $('#vc-mobile-overlay').removeAttribute('open');
    }

    function normalizeMobileMenu(root) {
      // Turn nested lists into <details> so chevrons work reliably on mobile
      $$('li', root).forEach(li => {
        const sub = $('ul,ol', li);
        const a = $('a', li);
        if (sub && a) {
          const details = document.createElement('details');
          const summary = document.createElement('summary');
          summary.innerHTML = a.outerHTML + ' <span class="chevron">›</span>';
          details.appendChild(summary);
          sub.querySelectorAll('script,style').forEach(n => n.remove());
          details.appendChild(sub);
          li.replaceWith(details);
        }
      });
    }
  }

  // ---------- INIT ----------
  function init() {
    ensureVoiceCoachPanel();
    bindHeadphoneButtons();
    fixFocusScreens();
    ensureMobileOverlay();

    // If pages are dynamically swapped, keep us alive
    const ro = new MutationObserver((muts) => {
      let needs = false;
      muts.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) needs = true;
      });
      if (needs) {
        bindHeadphoneButtons();
        fixFocusScreens();
      }
    });
    ro.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
`;


// ---------- write assets ----------
const cssPath = path.join(here, 'voice-coach-fix.css');
const jsPath = path.join(here, 'voice-coach-fix.js');
writeFileSafe(cssPath, CSS);
writeFileSafe(jsPath, JS);

// ---------- inject into all HTML files ----------
const files = listHtmlFiles(here);
if (!files.length) {
    console.log('⚠ No HTML files found. Run this script from your project root.');
    process.exit(0);
}
files.forEach(fp => {
    let html = fs.readFileSync(fp, enc);

    // Add stylesheet
    html = ensureInHead(html, `<link rel="stylesheet" href="voice-coach-fix.css">`);

    // Add script (defer, placed before </body>)
    html = ensureBeforeBodyClose(html, `<script defer src="voice-coach-fix.js"></script>`);

    // Save
    fs.writeFileSync(fp, html, enc);
    console.log('✔ patched', path.relative(here, fp));
});

console.log('\\nAll done. Reload your pages normally — no hard refresh required.\\n');
