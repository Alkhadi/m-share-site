
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
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byText = (el) => (el.textContent || '').trim().toLowerCase();

  // Flag to let other scripts know this VC enhancer is active
  window.__VC_FIX_ACTIVE = true;

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
            try { document.dispatchEvent(new CustomEvent('vc:voiceschanged', { detail: { voices: list } })); } catch { }
            resolve(list);
          } else {
            // Chrome: voices often load async after first getVoices() call
            setTimeout(() => {
              this.voices = window.speechSynthesis.getVoices() || [];
              try { document.dispatchEvent(new CustomEvent('vc:voiceschanged', { detail: { voices: this.voices } })); } catch { }
              resolve(this.voices);
            }, 300);
          }
        };
        try { window.speechSynthesis.getVoices(); } catch { }
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
        'Samantha', 'Alex', 'Victoria', 'Fred', // macOS voices
      ];
      v = list.find(v => fallbacks.includes(v.name));
      if (v) return v;
      // Language fallback
      v = list.find(v => (v.lang || '').toLowerCase().startsWith(this.langPref.toLowerCase()));
      return v || list[0];
    }

    _sanitizeText(t) {
      if (!t) return '';
      // collapse whitespace
      let s = String(t).replace(/\s+/g, ' ').trim();
      // remove URLs/emails
      s = s.replace(/https?:\/\/\S+/gi, '');
      s = s.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '');
      // strip noisy symbols (keep basic punctuation for prosody)
      s = s.replace(/[•·●►▶▪︎▸▹▻▵▿§©®™¤€£¥°≠≈±×÷=+*_#@^<>\[\]{}()\|\\]/g, ' ');
      // collapse multiple punctuation to one
      s = s.replace(/[.,!?;:]{2,}/g, (m) => m[m.length - 1]);
      // clean leftover doublespaces
      s = s.replace(/\s{2,}/g, ' ');
      return s;
    }

    async speak(text, opts = {}) {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported.');
        return;
      }
      await this.ready;
      try { window.speechSynthesis.resume(); } catch { }
      // Stop any current speech if requested (default true on explicit speak buttons)
      if (opts.clear !== false) window.speechSynthesis.cancel();

      const cleaned = this._sanitizeText(text);
      // Split long text into shorter utterances to avoid Chrome truncation
      const parts = this._splitText(cleaned);
      for (const part of parts) {
        const u = new SpeechSynthesisUtterance(part);
        const v = this._chooseVoice();
        if (v) u.voice = v; // first try with chosen voice
        u.rate = (opts.rate ?? this.rate);
        u.pitch = (opts.pitch ?? this.pitch);
        u.lang = (opts.lang ?? v?.lang ?? 'en-US');
        // Retry without explicit voice if Chrome ends instantly (rare voice bug)
        await this._speakOneWithRetry(u, v);
      }
    }

    _splitText(t) {
      const s = (t || '').replace(/\s+/g, ' ').trim();
      if (!s) return [];
      // split by sentence stops but keep it robust
      const raw = s.split(/(?<=[\.\?!])\s+(?=[A-Z0-9])/g);
      const out = [];
      for (const r of raw) {
        if (r.length <= 220) { out.push(r); continue; }
        // chunk very long sentences
        for (let i = 0; i < r.length; i += 220) out.push(r.slice(i, i + 220));
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

    _speakOneWithRetry(u, v) {
      return new Promise((resolve) => {
        let startedAt = 0;
        const onEnd = async () => {
          this._speaking = false;
          const dur = startedAt ? (performance.now() - startedAt) : 0;
          // If it ended almost immediately and we set a specific voice, retry using default voice
          if (dur < 80 && v) {
            try { window.speechSynthesis.cancel(); } catch { }
            const u2 = new SpeechSynthesisUtterance(u.text);
            u2.rate = u.rate; u2.pitch = u.pitch; u2.lang = u.lang;
            u2.onend = () => resolve();
            u2.onerror = () => resolve();
            try { window.speechSynthesis.resume(); } catch { }
            this._speaking = true;
            try { window.speechSynthesis.speak(u2); } catch { resolve(); }
            return;
          }
          resolve();
        };
        u.onstart = () => { startedAt = performance.now(); };
        u.onend = onEnd;
        u.onerror = onEnd; // treat error same as quick end → resolve or retry path
        this._speaking = true;
        try { window.speechSynthesis.speak(u); } catch { resolve(); }
      });
    }

    pause() { try { window.speechSynthesis.pause(); this._paused = true; } catch { } }
    resume() { try { window.speechSynthesis.resume(); this._paused = false; } catch { } }
    stop() { try { window.speechSynthesis.cancel(); this._speaking = false; this._paused = false; } catch { } }

    setRate(x) { this.rate = x; localStorage.setItem('vc.rate', String(x)); }
    setVoiceByName(name) { this.voiceNamePref = name; localStorage.setItem('vc.voice', name); }
  }

  const VC = new SpeechEngine();
  // Default Voice Coach ON across the site if not set
  try { if (localStorage.getItem('vc.enabled') === null) localStorage.setItem('vc.enabled', 'true'); } catch { }

  // Prime/unlock speech on first user gesture (iOS/Safari policies)
  let __vc_unlocked = false;
  function unlockSpeechOnce() {
    if (__vc_unlocked) return;
    __vc_unlocked = true;
    try { window.speechSynthesis.resume(); } catch { }
    try {
      const u = new SpeechSynthesisUtterance('.');
      u.volume = 0; // silent primer
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
      // Cancel quickly to avoid audible blip
      setTimeout(() => { try { window.speechSynthesis.cancel(); } catch { } }, 60);
    } catch { }
  }
  window.addEventListener('pointerdown', unlockSpeechOnce, { once: true, passive: true });
  window.addEventListener('keydown', unlockSpeechOnce, { once: true });

  // ---------- BUILD / WIRE THE VOICE COACH PANEL ----------
  function ensureVoiceCoachPanel() {
    let panel = document.querySelector('.voice-coach, #voice-coach');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'voice-coach';
      panel.className = 'voice-coach';
      panel.innerHTML = `
        <div class="vc-grid" role="group" aria-label="Voice Coach">
          <div class="vc-drag" id="vc-drag" role="button" tabindex="0" aria-label="Move Voice Coach; use arrow keys to move; hold Shift for larger steps" style="cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;background:rgba(255,255,255,.06);border-radius:10px;padding:6px 10px;margin:-2px -2px 8px -2px;display:flex;align-items:center;gap:8px">
            <span aria-hidden="true">⋮⋮</span>
            <span class="vc-label" style="font-size:12px;opacity:.8">Move</span>
          </div>
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
            <button class="vc-btn" id="vc-reset" title="Reset position">Reset</button>
            <button class="vc-btn" id="vc-diag" title="Toggle tap diagnostic">Diag</button>
            <button class="vc-btn" id="vc-hide" title="Hide panel">Hide</button>
          </div>
          <p class="vc-label" style="grid-column:1/-1;margin:2px 0 0;display:none">
            Tip
          </p>
        </div>`;
      document.body.appendChild(panel);
    }
    // Ensure fixed positioning and high z-index
    if (!panel.style.position) panel.style.position = 'fixed';
    panel.style.zIndex = panel.style.zIndex || '100000';

    // Restore saved position or default to bottom-right
    try {
      const saved = JSON.parse(localStorage.getItem('vc.pos') || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        panel.style.left = saved.x + 'px';
        panel.style.top = saved.y + 'px';
        panel.style.right = '';
        panel.style.bottom = '';
      } else {
        // Default corner if no saved position
        if (!panel.style.left && !panel.style.top) {
          panel.style.right = '24px';
          panel.style.bottom = '24px';
        }
      }
    } catch { }

    // Ensure explicit fixed positioning
    panel.style.position = 'fixed';

    // If overlapping the site header, nudge panel downward within viewport bounds
    try {
      const header = document.querySelector('header.site-header, header, .site-header');
      const pr = panel.getBoundingClientRect();
      const hr = header ? header.getBoundingClientRect() : null;
      const needsNudge = hr && pr.top < hr.bottom && pr.right > hr.left && pr.left < hr.right;
      if (needsNudge) {
        const dy = Math.ceil(hr.bottom - pr.top + 12);
        const y = Math.min(Math.max((pr.top + dy), 6), Math.max(6, window.innerHeight - pr.height - 6));
        const x = Math.min(Math.max(pr.left, 6), Math.max(6, window.innerWidth - pr.width - 6));
        panel.style.top = y + 'px';
        panel.style.left = x + 'px';
        panel.style.right = '';
        panel.style.bottom = '';
        try { localStorage.setItem('vc.pos', JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch { }
      }
    } catch { }
    // Persisted enabled state (default: ON)
    const savedEnabled = (() => { try { return localStorage.getItem('vc.enabled'); } catch { return null; } })();
    const enabledDefault = (savedEnabled == null) ? true : (savedEnabled === 'true');

    // Populate voices (async-safe) with System default and repopulate when voices arrive
    function populateVcVoices() {
      const sel = $('#vc-voice', panel);
      if (!sel) return;
      const voices = (VC.voices || []).filter(v => /en/i.test(v.lang || 'en'));
      sel.innerHTML = '';
      // System default first
      const def = document.createElement('option'); def.value = ''; def.textContent = 'System default'; sel.appendChild(def);
      // Add available voices if any
      voices.forEach(v => { const o = document.createElement('option'); o.value = v.name; o.textContent = v.name; sel.appendChild(o); });
      // Choose saved or default
      const pref = (VC.voiceNamePref || '');
      const hasPref = Array.from(sel.options).some(o => o.value === pref);
      sel.value = hasPref ? pref : '';
      VC.setVoiceByName(sel.value); // empty string means let browser choose
      sel.onchange = () => VC.setVoiceByName(sel.value);
    }
    VC.ready.then(populateVcVoices);
    document.addEventListener('vc:voiceschanged', populateVcVoices);

    // Buttons
    const $toggle = $('#vc-toggle', panel);
    const $rate = $('#vc-rate', panel);
    const $start = $('#vc-start', panel);
    const $pause = $('#vc-pause', panel);
    const $stop = $('#vc-stop', panel);
    const $reset = $('#vc-reset', panel);
    const $diag = $('#vc-diag', panel);
    const $hide = $('#vc-hide', panel);

    // Initialize toggle from storage (default ON)
    if ($toggle) {
      const on = enabledDefault;
      $toggle.setAttribute('aria-pressed', String(on));
      $toggle.textContent = on ? 'On' : 'Off';
      if (!on) VC.stop();
      try { localStorage.setItem('vc.enabled', String(on)); } catch { }
    }

    $toggle?.addEventListener('click', () => {
      const on = $toggle.getAttribute('aria-pressed') !== 'true';
      $toggle.setAttribute('aria-pressed', String(on));
      $toggle.textContent = on ? 'On' : 'Off';
      if (!on) VC.stop();
      try { localStorage.setItem('vc.enabled', String(on)); } catch { }
    });
    $rate?.addEventListener('input', () => VC.setRate(parseFloat($rate.value)));
    $pause?.addEventListener('click', () => VC.pause());
    $stop?.addEventListener('click', () => VC.stop());
    $start?.addEventListener('click', () => {
      unlockSpeechOnce();
      ensureEnabled();
      const candidate = document.getSelection()?.toString().trim() ||
        $('[data-read-target]')?.textContent ||
        document.querySelector('main, [role="main"]')?.textContent ||
        document.body.textContent;
      if (candidate) VC.speak(candidate, { clear: true });
    });

    // Hide panel -> show mini toggle
    ensureMiniToggle();
    $hide?.addEventListener('click', () => {
      try { localStorage.setItem('vc.hidden', 'true'); } catch { }
      panel.style.display = 'none';
      showMiniToggle(true);
    });

    function ensureEnabled() {
      if ($toggle?.getAttribute('aria-pressed') === 'false') {
        $toggle.setAttribute('aria-pressed', 'true');
        $toggle.textContent = 'On';
        try { localStorage.setItem('vc.enabled', 'true'); } catch { }
      }
    }

    // Reset position to bottom-right
    $reset?.addEventListener('click', () => {
      try { localStorage.removeItem('vc.pos'); } catch { }
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '24px';
      panel.style.bottom = '24px';
    });

    // Toggle diagnostic overlay
    $diag?.addEventListener('click', () => {
      const on = toggleTapDiagnostic();
      try { localStorage.setItem('vc.tapdiag', String(on)); } catch { }
      $diag.textContent = on ? 'Diag✓' : 'Diag';
    });

    // Lock initial size so it doesn't grow when dragging
    lockPanelSize(panel);

    // ----- Draggable behavior (handle + keyboard) -----
    const handle = $('#vc-drag', panel);
    makeDraggable(panel, handle);
    // Keyboard move on handle
    if (handle) {
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      const save = (x, y) => { try { localStorage.setItem('vc.pos', JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch { } };
      function toFixedPosition() {
        const r = panel.getBoundingClientRect();
        panel.style.left = r.left + 'px';
        panel.style.top = r.top + 'px';
        panel.style.right = '';
        panel.style.bottom = '';
      }
      handle.addEventListener('keydown', (e) => {
        const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!ARROWS.includes(e.key)) return;
        e.preventDefault();
        toFixedPosition();
        const step = e.shiftKey ? 10 : 2;
        const r = panel.getBoundingClientRect();
        let x = r.left; let y = r.top;
        if (e.key === 'ArrowLeft') x -= step;
        if (e.key === 'ArrowRight') x += step;
        if (e.key === 'ArrowUp') y -= step;
        if (e.key === 'ArrowDown') y += step;
        const maxX = Math.max(0, window.innerWidth - r.width);
        const maxY = Math.max(0, window.innerHeight - r.height);
        x = clamp(x, 6, Math.max(6, maxX - 6));
        y = clamp(y, 6, Math.max(6, maxY - 6));
        panel.style.left = x + 'px';
        panel.style.top = y + 'px';
        save(x, y);
      });
    }
  }

  function lockPanelSize(panel) {
    try {
      const r = panel.getBoundingClientRect();
      // Fix width/height to current render size so height won't grow while dragging
      panel.style.boxSizing = panel.style.boxSizing || 'border-box';
      const maxH = Math.min(Math.round(window.innerHeight * 0.7), 520);
      const maxW = Math.max(240, Math.min(360, Math.round(window.innerWidth - 32)));
      panel.style.width = Math.min(Math.round(r.width), maxW) + 'px';
      panel.style.height = Math.min(Math.round(r.height), maxH) + 'px';
      // If content exceeds height, allow vertical scroll instead of growing
      if (!panel.style.overflow) panel.style.overflow = 'auto';
    } catch { }
  }

  function makeDraggable(panel, handle) {
    if (!panel) return;

    let dragging = false;
    let startX = 0, startY = 0; // pointer screen coords
    let panelX = 0, panelY = 0; // panel top-left
    const dragTarget = handle || panel; // default to whole panel

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function save(x, y) {
      try { localStorage.setItem('vc.pos', JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch { }
    }

    function rect() { return panel.getBoundingClientRect(); }

    function toFixedPosition() {
      // Convert current position to explicit left/top to avoid right/bottom conflicts
      const r = rect();
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = '';
      panel.style.bottom = '';
    }

    function isInteractive(el) {
      return !!el.closest('button,a,select,input,textarea,[role="button"],[contenteditable="true"],label');
    }

    function onPointerDown(e) {
      e.preventDefault();
      // Only left button / primary pointer
      if (e.button !== undefined && e.button !== 0) return;
      // Ignore drags from interactive controls
      if (isInteractive(e.target)) return;
      dragTarget.setPointerCapture?.(e.pointerId || 0);
      toFixedPosition();
      const r = rect();
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      panelX = r.left; panelY = r.top;
    }
    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nx = panelX + dx;
      const ny = panelY + dy;
      const r = rect();
      const maxX = window.innerWidth - r.width;
      const maxY = window.innerHeight - r.height;
      const cx = clamp(nx, 6, Math.max(6, maxX - 6));
      const cy = clamp(ny, 6, Math.max(6, maxY - 6));
      panel.style.left = cx + 'px';
      panel.style.top = cy + 'px';
    }
    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      dragTarget.releasePointerCapture?.(e.pointerId || 0);
      const r = rect();
      save(r.left, r.top);
    }

    // Improve drag UX
    dragTarget.style.touchAction = 'none';
    // Optional: show move cursor for the panel background (don’t override when inside form controls)
    if (!panel.style.cursor) panel.style.cursor = 'move';

    dragTarget.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    // Keep the panel within viewport on resize/rotation
    window.addEventListener('resize', () => {
      const r = rect();
      // Responsively cap width/height to viewport, but do not increase them
      const currentW = parseFloat(panel.style.width || r.width);
      const currentH = parseFloat(panel.style.height || r.height);
      const maxW = Math.max(240, Math.min(360, window.innerWidth - 32));
      const maxH = Math.min(Math.round(window.innerHeight * 0.7), 520);
      const newW = Math.min(currentW, maxW);
      const newH = Math.min(currentH, maxH);
      panel.style.width = Math.round(newW) + 'px';
      panel.style.height = Math.round(newH) + 'px';

      const maxX = Math.max(0, window.innerWidth - newW);
      const maxY = Math.max(0, window.innerHeight - newH);
      const x = clamp(r.left, 6, maxX - 6);
      const y = clamp(r.top, 6, maxY - 6);
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = '';
      panel.style.bottom = '';
      save(x, y);
    });
  }

  // ---- Mini toggle button when hidden ----
  function ensureMiniToggle() {
    let btn = document.getElementById('vc-mini-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'vc-mini-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'Show Voice Coach');
      btn.textContent = '🎧';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        const panel = document.querySelector('.voice-coach, #voice-coach');
        if (panel) {
          panel.style.display = '';
          try { localStorage.setItem('vc.hidden', 'false'); } catch { }
        }
        showMiniToggle(false);
      });
    }
    // Respect saved state
    const hidden = (localStorage.getItem('vc.hidden') === 'true');
    showMiniToggle(hidden);
    const panel = document.querySelector('.voice-coach, #voice-coach');
    if (panel) panel.style.display = hidden ? 'none' : '';
  }

  function showMiniToggle(on) {
    const btn = document.getElementById('vc-mini-btn');
    if (btn) btn.style.display = on ? 'inline-flex' : 'none';
  }

  // ---- Tap diagnostic overlay ----
  function installTapDiagnostic() {
    if (document.getElementById('vc-tap-diag')) return;
    const box = document.createElement('div');
    box.id = 'vc-tap-diag';
    box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1000000;display:none';
    const marker = document.createElement('div');
    marker.style.cssText = 'position:absolute;border:2px solid #22c55e;border-radius:8px;background:rgba(34,197,94,.12);left:0;top:0;width:0;height:0;box-shadow:0 0 0 2px rgba(34,197,94,.4) inset';
    const label = document.createElement('div');
    label.style.cssText = 'position:fixed;left:8px;bottom:8px;background:#0b1220;color:#e5e7eb;border:1px solid rgba(255,255,255,.15);padding:6px 8px;border-radius:8px;font:12px system-ui;max-width:70vw';
    box.appendChild(marker); box.appendChild(label);
    document.body.appendChild(box);

    function showAt(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el || el === box) return;
      const r = el.getBoundingClientRect();
      marker.style.left = r.left + 'px';
      marker.style.top = r.top + 'px';
      marker.style.width = r.width + 'px';
      marker.style.height = r.height + 'px';
      const cs = getComputedStyle(el);
      label.textContent = `tap@(${Math.round(x)},${Math.round(y)}) → ${el.tagName.toLowerCase()}${el.id ? ('#' + el.id) : ''}${el.className ? ('.' + String(el.className).trim().replace(/\s+/g, '.')) : ''} · pointer-events:${cs.pointerEvents} · z:${cs.zIndex}`;
    }
    function onTap(e) { showAt(e.clientX, e.clientY); }
    window.addEventListener('pointerdown', onTap, { passive: true });
    box.__vc_cleanup = () => window.removeEventListener('pointerdown', onTap);
  }

  function toggleTapDiagnostic() {
    let box = document.getElementById('vc-tap-diag');
    if (!box) installTapDiagnostic(), box = document.getElementById('vc-tap-diag');
    const on = box.style.display !== 'block';
    box.style.display = on ? 'block' : 'none';
    return on;
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
      unlockSpeechOnce();
      // Turn on automatically if currently off
      const toggle = $('#vc-toggle');
      if (toggle?.getAttribute('aria-pressed') === 'false') {
        toggle.setAttribute('aria-pressed', 'true');
        toggle.textContent = 'On';
        try { localStorage.setItem('vc.enabled', 'true'); } catch { }
      }
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

  // ---------- PER-CARD NARRATOR BUTTONS ----------
  // Removed per user request: do NOT inject extra Start/Stop buttons into cards.
  // Keep function present as a no-op to avoid breaking existing init flow.
  function ensureCardNarrators() { /* no-op (duplicate controls removed site-wide) */ }

  // ---------- FOCUS SCREEN FIX (controls + duplicate cleanup) ----------
  function fixFocusScreens() {
    // Remove duplicate/hidden background focus screens if more than one exists
    const screens = $$('.focus-screen, .breathing-focus, .breath-player, .breathing-viewport, #focus, .focus');
    if (screens.length > 1) {
      // Keep the one most visible (closest to viewport center)
      let keep = screens[0], keepDist = Infinity, vh = window.innerHeight;
      screens.forEach(s => {
        const r = s.getBoundingClientRect();
        const centerDist = Math.abs((r.top + r.bottom) / 2 - vh / 2);
        if (centerDist < keepDist) { keep = s; keepDist = centerDist; }
      });
      screens.forEach(s => { if (s !== keep) s.classList.add('vc-hide'); });
    }

    // Identify the visible focus/player container (for potential non-button cleanups)
    const host = $('.focus-screen:not(.vc-hide), .breathing-focus:not(.vc-hide), .breath-player:not(.vc-hide), .breathing-viewport:not(.vc-hide), #focus:not(.vc-hide), .focus:not(.vc-hide)') || screens[0];
    if (!host) return;

    // Remove Back-to-hub/section button if present inside the focus container
    $$('a,button', host).forEach(b => {
      const t = byText(b);
      if (t === 'back to hub/section' || t === 'back to hub' || t === 'back') b.remove();
    });

    // Do NOT add Start/Pause/Stop chips here; pages already provide their own controls.
  }

  function defaultBoxProgram() {
    // 4-4-4-4 classic box; can be overridden on pages with data attributes
    return [
      { label: 'Inhale', seconds: 4 },
      { label: 'Hold', seconds: 4 },
      { label: 'Exhale', seconds: 4 },
      { label: 'Hold', seconds: 4 },
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
      $('#vc-mobile-overlay').setAttribute('open', '');
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
    ensureCardNarrators();
    fixFocusScreens();
    ensureMobileOverlay();
    try { if (typeof window.enhanceCoachRunner === 'function') window.enhanceCoachRunner(); else setTimeout(() => { if (typeof window.enhanceCoachRunner === 'function') window.enhanceCoachRunner(); }, 0); } catch { }
    // Force any page-level TTS select to 'on' so narration is enabled by default
    try { const ttsSel = document.getElementById('tts'); if (ttsSel) ttsSel.value = 'on'; } catch { }

    // If pages are dynamically swapped, keep us alive
    const ro = new MutationObserver((muts) => {
      let needs = false;
      muts.forEach(m => {
        if (m.addedNodes && m.addedNodes.length) needs = true;
      });
      if (needs) {
        bindHeadphoneButtons();
        ensureCardNarrators();
        fixFocusScreens();
        try { if (typeof window.enhanceCoachRunner === 'function') window.enhanceCoachRunner(); } catch { }
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

// -------- Coach Runner enhancements: readability + drag/persist --------
(function () {
  const KEY = 'vc.runner.pos';

  function ensureDragHandle(dlg) {
    if (!dlg) return null;
    let h = dlg.querySelector('.cr-drag');
    if (!h) {
      h = document.createElement('div');
      h.className = 'cr-drag';
      h.id = 'coachRunnerDrag';
      h.setAttribute('role', 'button');
      h.setAttribute('tabindex', '0');
      h.setAttribute('aria-label', 'Move coach window; use arrow keys to move; hold Shift for larger steps');
      h.innerHTML = '<span aria-hidden="true">⋮⋮</span><span class="vc-label" style="font-size:12px;opacity:.8">Move</span>';
      // Insert at top of dialog
      const first = dlg.firstElementChild;
      dlg.insertBefore(h, first || null);
    }
    return h;
  }

  function savePos(x, y) { try { localStorage.setItem(KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) })); } catch { } }
  function loadPos() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function toFixed(dlg) {
    const r = dlg.getBoundingClientRect();
    dlg.style.left = r.left + 'px';
    dlg.style.top = r.top + 'px';
    dlg.style.right = '';
    dlg.style.bottom = '';
    dlg.style.position = 'fixed';
  }

  function makeDialogDraggable(dlg, handle) {
    if (!dlg || !handle) return;
    // Avoid double-binding
    if (handle.__vc_bound) return; handle.__vc_bound = true;
    handle.style.touchAction = 'none';
    let dragging = false, sx = 0, sy = 0, px = 0, py = 0;
    function rect() { return dlg.getBoundingClientRect(); }
    function onDown(e) {
      e.preventDefault();
      if (e.button !== undefined && e.button !== 0) return;
      toFixed(dlg);
      const r = rect(); dragging = true; sx = e.clientX; sy = e.clientY; px = r.left; py = r.top;
      handle.setPointerCapture?.(e.pointerId || 0);
    }
    function onMove(e) { if (!dragging) return; const dx = e.clientX - sx, dy = e.clientY - sy; const r = rect(); let nx = px + dx, ny = py + dy; const maxX = window.innerWidth - r.width; const maxY = window.innerHeight - r.height; nx = clamp(nx, 6, Math.max(6, maxX - 6)); ny = clamp(ny, 6, Math.max(6, maxY - 6)); dlg.style.left = nx + 'px'; dlg.style.top = ny + 'px'; }
    function onUp(e) { if (!dragging) return; dragging = false; handle.releasePointerCapture?.(e.pointerId || 0); const r = rect(); savePos(r.left, r.top); }
    handle.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });

    // Keyboard move on handle
    handle.addEventListener('keydown', (e) => {
      const AR = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (!AR.includes(e.key)) return; e.preventDefault(); toFixed(dlg);
      const step = e.shiftKey ? 10 : 2; const r = rect(); let x = r.left, y = r.top;
      if (e.key === 'ArrowLeft') x -= step; if (e.key === 'ArrowRight') x += step; if (e.key === 'ArrowUp') y -= step; if (e.key === 'ArrowDown') y += step;
      const maxX = Math.max(0, window.innerWidth - r.width); const maxY = Math.max(0, window.innerHeight - r.height);
      x = clamp(x, 6, Math.max(6, maxX - 6)); y = clamp(y, 6, Math.max(6, maxY - 6));
      dlg.style.left = x + 'px'; dlg.style.top = y + 'px'; savePos(x, y);
    });
  }

  function restoreDialogPos(dlg) {
    const p = loadPos(); if (!p) return;
    dlg.style.position = 'fixed'; dlg.style.left = p.x + 'px'; dlg.style.top = p.y + 'px'; dlg.style.right = ''; dlg.style.bottom = '';
  }

  function enhance() {
    const dlg = document.getElementById('coachRunnerDialog');
    if (!dlg) return;
    // Force readable theme (CSS already ensures); ensure role and tabindex for focus trap friendliness
    dlg.setAttribute('role', dlg.getAttribute('role') || 'dialog');
    dlg.setAttribute('tabindex', dlg.getAttribute('tabindex') || '-1');
    restoreDialogPos(dlg);
    const handle = ensureDragHandle(dlg);
    makeDialogDraggable(dlg, handle);
  }

  // Public for reuse in init/mutation
  window.enhanceCoachRunner = enhance;

  // If dialog already present on load, enhance once
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true }); else enhance();
})();
