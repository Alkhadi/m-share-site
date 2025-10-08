
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
      const s = (t || '').replace(/\s+/g,' ').trim();
      if (!s) return [];
      // split by sentence stops but keep it robust
      const raw = s.split(/(?<=[\.\?!])\s+(?=[A-Z0-9])/g);
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
      panel.innerHTML = `
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
              <input id="vc-rate" type="range" min="0.7" max="1.4" step="0.05" value="${VC.rate}" />
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
        </div>`;
      document.body.appendChild(panel);
    }
    // Populate voices (async-safe)
    VC.ready.then(() => {
      const sel = $('#vc-voice', panel);
      if (!sel) return;
      const voices = VC.voices.filter(v => /en/i.test(v.lang || 'en'));
      if (!voices.length) return;
      sel.innerHTML = voices.map(v => `<option value="${v.name}">${v.name}</option>`).join('');
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
      box.innerHTML = `
        <button type="button" class="vc-chip" data-vc="start">Start</button>
        <button type="button" class="vc-chip" data-vc="pause">Pause</button>
        <button type="button" class="vc-chip" data-vc="stop">Stop</button>`;
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
    overlay.innerHTML = `
      <div id="vc-mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
        <button class="vc-btn" id="vc-menu-close" style="float:right;margin:6px 6px 8px 0">Close</button>
        <div id="vc-mobile-menu-body"></div>
      </div>`;
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
