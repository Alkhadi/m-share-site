(function () {
    // Minimal MSCoach implementation to avoid runtime errors and provide basic guidance
    var TTS = {
        speak: function (text, opts) {
            try { if (window.__MSHARE__ && window.__MSHARE__.TTS && typeof window.__MSHARE__.TTS.speak === 'function') return window.__MSHARE__.TTS.speak(String(text || ''), opts || {}); } catch { }
            if (!('speechSynthesis' in window)) return;
            try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(String(text || '')); if (opts && opts.rate) u.rate = opts.rate; if (opts && opts.pitch) u.pitch = opts.pitch; speechSynthesis.speak(u); } catch { }
        },
        stop: function () { try { if (window.__MSHARE__ && window.__MSHARE__.TTS && typeof window.__MSHARE__.TTS.stop === 'function') return window.__MSHARE__.TTS.stop(); speechSynthesis && speechSynthesis.cancel(); } catch { } }
    };

    function $(s, el) { return (el || document).querySelector(s) }
    function el(tag, attrs) { var n = document.createElement(tag); if (attrs) { Object.keys(attrs).forEach(function (k) { if (k === 'text') { n.textContent = attrs[k]; } else if (k === 'html') { n.innerHTML = attrs[k]; } else { n.setAttribute(k, attrs[k]); } }); } return n; }

    function mountBreath(hostSel, opts) {
        var host = $(hostSel); if (!host) return;
        var conf = Object.assign({ pattern: [4, 4, 4, 4], minutes: 2, title: 'Guided Breathing' }, opts || {});
        host.innerHTML = ''; host.classList.add('mscoach-breath');
        var title = el('div', { class: 'vc-title', text: conf.title });
        var status = el('div', { class: 'vc-status', text: 'Ready' });
        var actions = el('div', { class: 'actions' });
        var bStart = el('button', { type: 'button', class: 'btn', text: 'Start' });
        var bPause = el('button', { type: 'button', class: 'btn', text: 'Pause' });
        var bStop = el('button', { type: 'button', class: 'btn', text: 'Stop' });
        actions.appendChild(bStart); actions.appendChild(bPause); actions.appendChild(bStop);
        host.appendChild(title); host.appendChild(status); host.appendChild(actions);

        var steps = []; var labels = ['Inhale', 'Hold', 'Exhale', 'Hold'];
        for (var i = 0; i < conf.pattern.length; i++) { var sec = parseFloat(conf.pattern[i] || 0); if (sec > 0) steps.push({ label: labels[i % labels.length], seconds: sec }); }
        if (!steps.length) { steps = [{ label: 'Inhale', seconds: 4 }, { label: 'Hold', seconds: 4 }, { label: 'Exhale', seconds: 4 }, { label: 'Hold', seconds: 4 }]; }

        var running = false, paused = false, idx = 0, timer = null, endAt = 0;
        function loop() { if (!running || paused) return; var s = steps[idx % steps.length]; status.textContent = s.label + '…'; TTS.speak(s.label, { clear: false, rate: 0.95 }); timer = setTimeout(function () { idx++; if (Date.now() > endAt) { return stop(); } loop(); }, Math.max(500, s.seconds * 1000)); }
        function start() { clearTimeout(timer); running = true; paused = false; idx = 0; endAt = Date.now() + Math.max(1, Math.round(conf.minutes * 60)) * 1000; status.textContent = 'Starting…'; loop(); }
        function pause() { paused = !paused; status.textContent = paused ? 'Paused' : 'Resumed'; if (!paused) loop(); }
        function stop() { running = false; paused = false; clearTimeout(timer); status.textContent = 'Stopped'; TTS.stop(); }

        bStart.addEventListener('click', start);
        bPause.addEventListener('click', pause);
        bStop.addEventListener('click', stop);
    }

    function mountGrounding(hostSel) {
        var host = $(hostSel); if (!host) return;
        host.innerHTML = ''; host.classList.add('mscoach-ground');
        var title = el('div', { class: 'vc-title', text: '5-4-3-2-1 Grounding' });
        var status = el('div', { class: 'vc-status', text: 'Notice 5 things you can see.' });
        var actions = el('div', { class: 'actions' });
        var bStart = el('button', { type: 'button', class: 'btn', text: 'Start' });
        var bNext = el('button', { type: 'button', class: 'btn', text: 'Next' });
        var bStop = el('button', { type: 'button', class: 'btn', text: 'Stop' });
        actions.appendChild(bStart); actions.appendChild(bNext); actions.appendChild(bStop);
        host.appendChild(title); host.appendChild(status); host.appendChild(actions);

        var lines = [
            'Notice five things you can see.',
            'Notice four things you can feel.',
            'Notice three things you can hear.',
            'Notice two things you can smell.',
            'Notice one thing you can taste.'
        ];
        var i = 0; function say() { status.textContent = lines[i]; TTS.speak(lines[i], { rate: 0.95 }); }
        bStart.addEventListener('click', function () { i = 0; say(); });
        bNext.addEventListener('click', function () { i = Math.min(lines.length - 1, i + 1); say(); });
        bStop.addEventListener('click', function () { status.textContent = 'Done'; TTS.stop(); });
    }

    function mountPomo(hostSel, opts) {
        var host = $(hostSel); if (!host) return; var conf = Object.assign({ work: 25 * 60, break: 5 * 60 }, opts || {});
        host.innerHTML = ''; host.classList.add('mscoach-pomo');
        var title = el('div', { class: 'vc-title', text: 'Focus Sprint' });
        var timerEl = el('div', { class: 'vc-status', text: '25:00' });
        var actions = el('div', { class: 'actions' });
        var bStart = el('button', { type: 'button', class: 'btn', text: 'Start' });
        var bPause = el('button', { type: 'button', class: 'btn', text: 'Pause' });
        var bStop = el('button', { type: 'button', class: 'btn', text: 'Stop' });
        actions.appendChild(bStart); actions.appendChild(bPause); actions.appendChild(bStop);
        host.appendChild(title); host.appendChild(timerEl); host.appendChild(actions);

        var t = conf.work, mode = 'work', running = false, paused = false, h = null;
        function fmt(s) { var m = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0'); return m + ':' + ss; }
        function tick() {
            if (!running || paused) return; if (t <= 0) { if (mode === 'work') { mode = 'break'; t = conf.break; TTS.speak('Break time', { rate: 1 }); } else { mode = 'work'; t = conf.work; TTS.speak('Work sprint', { rate: 1 }); } }
            timerEl.textContent = fmt(t); t--; h = setTimeout(tick, 1000);
        }
        function start() { clearTimeout(h); running = true; paused = false; tick(); }
        function pause() { paused = !paused; if (!paused) tick(); }
        function stop() { running = false; paused = false; clearTimeout(h); t = conf.work; mode = 'work'; timerEl.textContent = fmt(t); }

        timerEl.textContent = fmt(conf.work);
        bStart.addEventListener('click', start);
        bPause.addEventListener('click', pause);
        bStop.addEventListener('click', stop);
    }

    // Attach without clobbering existing
    window.MSCoach = window.MSCoach || {};
    if (!window.MSCoach.mountBreath) window.MSCoach.mountBreath = mountBreath;
    if (!window.MSCoach.mountGrounding) window.MSCoach.mountGrounding = mountGrounding;
    if (!window.MSCoach.mountPomo) window.MSCoach.mountPomo = mountPomo;
})();
