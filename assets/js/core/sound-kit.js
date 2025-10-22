(() => {
    if (window.__SOUND_KIT__) return; window.__SOUND_KIT__ = true;
    let AC = null, UNLOCKED = false;
    function makeAC() {
        if (!AC) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (C) AC = new C();
        }
        return AC;
    }
    function resumeAC() {
        const ac = makeAC();
        if (!ac) return null;
        if (ac.state === 'suspended') {
            try { ac.resume(); } catch { }
        }
        return ac;
    }
    // Tiny WAV fallback (440Hz 50ms) for environments without WebAudio
    const BEEP_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYAAAChAAAAAAAAP/8AAP//AAD//wAA//8AAP//AAD//wAA';
    function fallbackBeep() {
        try { const a = new Audio(BEEP_WAV); a.volume = 0.35; a.play().catch(() => { }); } catch { }
    }
    function unlock() {
        if (UNLOCKED) return;
        const ac = resumeAC();
        if (!ac) { UNLOCKED = true; return; }
        try {
            // Play a near-silent buffer to satisfy gesture policies (Chrome/Tesla browsers)
            const buf = ac.createBuffer(1, Math.max(1, ac.sampleRate / 100), ac.sampleRate); // ~10ms
            const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
            src.start(0);
            UNLOCKED = true;
        } catch { UNLOCKED = true; }
    }
    function ensure() { const ac = resumeAC(); return ac; }
    function tone({ freq = 528, dur = .12, type = 'sine', vol = .18 }) {
        const ac = ensure();
        if (!ac) { fallbackBeep(); return; }
        try {
            const o = ac.createOscillator(), g = ac.createGain();
            o.type = type; o.frequency.value = freq; g.gain.value = 0; o.connect(g); g.connect(ac.destination);
            const t = ac.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
            o.start(t); o.stop(t + dur + .02);
        } catch { fallbackBeep(); }
    }
    function click() { tone({ freq: 520, dur: .08, type: 'sine', vol: .14 }) }
    function start() { tone({ freq: 640, dur: .16, type: 'triangle', vol: .2 }) }
    function stop() { tone({ freq: 340, dur: .18, type: 'square', vol: .22 }) }

    // Resume/unlock on typical gestures (helps Chrome/Tesla embedded browsers)
    const unlockEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'];
    unlockEvents.forEach(ev => document.addEventListener(ev, unlock, { passive: true, once: false }));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resumeAC(); }, { passive: true });

    // Click feedback on buttons/links
    document.addEventListener('click', e => {
        const b = e.target.closest('button,.btn,a'); if (!b) return;
        try { ensure(); click() } catch { fallbackBeep(); }
    }, { passive: true });

    // Wire common start/stop ids
    function wire(aSel, sSel) {
        const a = document.querySelector(aSel), s = document.querySelector(sSel);
        a && a.addEventListener('click', () => { try { ensure(); start() } catch { fallbackBeep(); } }, { passive: true });
        s && s.addEventListener('click', () => { try { ensure(); stop() } catch { fallbackBeep(); } }, { passive: true });
    }
    wire('#pbStart', '#pbStop'); wire('#nbStart', '#nbStop'); wire('#stStart', '#stStop');
    document.addEventListener('keydown', e => { if (e.code === 'Space') { try { ensure(); click() } catch { fallbackBeep(); } } });
})();
