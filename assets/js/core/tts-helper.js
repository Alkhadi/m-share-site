(function () {
    'use strict';
    var g = (typeof window !== 'undefined') ? window : {};
    if (g.MS_TTS) { return; }

    var STORE_KEY = 'mshare_tts_voice_v1';
    var hasSS = function () { return typeof g.speechSynthesis !== 'undefined'; };
    var _voices = [];
    var _ready = false;
    var _primed = false;
    var _waitingResolvers = [];
    var _boundSelects = new Set(); // keep references to repopulate on late voice load

    function _loadVoices() {
        try {
            _voices = hasSS() ? (g.speechSynthesis.getVoices() || []) : [];
            if (_voices && _voices.length) {
                _ready = true;
                _waitingResolvers.splice(0).forEach(function (r) { try { r(_voices); } catch (_) { } });
                // Repopulate any selects that have been bound already
                try { _boundSelects.forEach(function (sel) { populateSelect(sel); }); } catch (_) { }
            }
        } catch (_) { _ready = false; }
    }

    function waitForVoices(timeoutMs) {
        return new Promise(function (resolve) {
            if (!hasSS()) { resolve([]); return; }
            if (_ready && _voices.length) { resolve(_voices); return; }
            _waitingResolvers.push(resolve);
            var start = Date.now();
            (function tick() {
                _loadVoices();
                if (_ready) return; // resolver called in _loadVoices
                if (Date.now() - start > (timeoutMs || 3000)) { resolve(_voices || []); return; }
                setTimeout(tick, 120);
            })();
        });
    }

    if (hasSS()) {
        _loadVoices();
        g.speechSynthesis.onvoiceschanged = function () { _loadVoices(); };
    }

    function listVoices(opts) {
        var vs = (_voices || []).slice();
        var pref = (opts && opts.preferLangs) || ['en-GB', 'en-US'];
        vs.sort(function (a, b) {
            var ai = pref.findIndex(function (p) { return (a.lang || '').toLowerCase().startsWith(p.toLowerCase()); });
            var bi = pref.findIndex(function (p) { return (b.lang || '').toLowerCase().startsWith(p.toLowerCase()); });
            ai = ai === -1 ? 999 : ai; bi = bi === -1 ? 999 : bi;
            if (ai !== bi) return ai - bi;
            return (a.name || '').localeCompare(b.name || '');
        });
        return vs;
    }

    function getStored() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_) { return {}; }
    }
    function setStored(v) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(v || {})); } catch (_) { }
    }

    function pickVoiceByURI(uri) {
        if (!uri) return null;
        return (_voices || []).find(function (v) { return v && (v.voiceURI === uri || v.name === uri); }) || null;
    }

    function pickDefault() {
        var vs = listVoices();
        return vs[0] || null;
    }

    function prime() {
        if (!hasSS() || _primed) return;
        try {
            var u = new SpeechSynthesisUtterance('.');
            u.volume = 0.001; // effectively silent
            u.rate = 2;
            u.onend = function () { _primed = true; };
            g.speechSynthesis.speak(u);
        } catch (_) { }
    }

    function choose(uri) { setStored({ voiceURI: uri }); }

    function populateSelect(selectEl) {
        if (!selectEl) return;
        var sel = selectEl;
        sel.innerHTML = '';
        // Always include a system default
        var opt = document.createElement('option'); opt.value = ''; opt.textContent = 'System default'; sel.appendChild(opt);

        // Build a clean, de-duplicated list of voices (by voiceURI/name) and format labels nicely
        var seen = new Set();
        listVoices().forEach(function (v) {
            if (!v) return;
            var key = (v.voiceURI || v.name || '') + '|' + (v.lang || '');
            if (seen.has(key)) return; seen.add(key);
            var o = document.createElement('option');
            o.value = v.voiceURI || v.name || '';
            // Label: "Name · en-GB" (no stray characters)
            var nm = (v.name || '').trim();
            var lg = (v.lang || '').trim();
            o.textContent = lg ? (nm + ' · ' + lg) : nm;
            sel.appendChild(o);
        });
        var st = getStored();
        if (st.voiceURI) {
            // If stored voice no longer exists on this browser, fall back to System default
            var exists = Array.prototype.some.call(sel.options, function (o) { return o.value === st.voiceURI; });
            sel.value = exists ? st.voiceURI : '';
            if (!exists) setStored({ voiceURI: '' });
        }
        sel.addEventListener('change', function () { choose(sel.value); });
    }

    function connectUI(selectEl, testBtn) {
        // Always present a usable UI, even if speechSynthesis is unsupported
        if (!hasSS()) {
            try {
                if (selectEl) {
                    selectEl.innerHTML = '';
                    var opt = document.createElement('option');
                    opt.value = '';
                    opt.textContent = 'System default';
                    selectEl.appendChild(opt);
                    selectEl.disabled = true;
                    selectEl.title = 'Text-to-speech not supported in this browser';
                }
                if (testBtn) { testBtn.disabled = true; testBtn.title = 'Text-to-speech not supported in this browser'; }
            } catch (_) { }
            return;
        }
        // Bind select for late population and immediate default option
        if (selectEl) { _boundSelects.add(selectEl); populateSelect(selectEl); }
        waitForVoices(3000).then(function () { if (selectEl) populateSelect(selectEl); });
        if (testBtn) {
            testBtn.addEventListener('click', function () {
                prime();
                speak('Inhale', { rate: 1.0, selectEl: selectEl });
            });
        }
    }

    function speak(text, opts) {
        if (!hasSS()) return;
        try {
            var triedRetry = false;
            var attempt = function () {
                try { if (g.speechSynthesis.paused) g.speechSynthesis.resume(); } catch (_) { }
                try { if (g.speechSynthesis.speaking) g.speechSynthesis.cancel(); } catch (_) { }

                var u = new SpeechSynthesisUtterance(String(text || ''));
                var rate = (opts && typeof opts.rate === 'number') ? opts.rate : 1.0;
                u.rate = Math.max(0.5, Math.min(2, rate));
                var selEl = opts && opts.selectEl;
                var chosenURI = (selEl && selEl.value) || (getStored().voiceURI) || null;

                var v = pickVoiceByURI(chosenURI) || pickDefault();
                if (v) u.voice = v; // If no voice chosen, let browser default handle it (key for Chrome)
                try {
                    var lang = (v && v.lang) || (opts && opts.lang) || (navigator.language) || 'en-US';
                    if (lang) u.lang = lang;
                } catch (_) { }

                var startedAt = 0;
                u.onstart = function () { startedAt = (g.performance && g.performance.now && g.performance.now()) || Date.now(); };
                u.onerror = u.onend = function () {
                    var dur = startedAt ? (((g.performance && g.performance.now && g.performance.now()) || Date.now()) - startedAt) : 0;
                    // Chrome sometimes ends instantly before voices are ready; retry once after a quick voices wait
                    if (!triedRetry && dur < 80) {
                        triedRetry = true;
                        waitForVoices(1000).then(function () {
                            setTimeout(attempt, 0);
                        });
                        return;
                    }
                };
                // Defer slightly after resume/cancel for Chrome reliability
                setTimeout(function () { try { g.speechSynthesis.speak(u); } catch (_) { } }, 0);
            };
            attempt();
        } catch (_) { }
    }

    g.MS_TTS = {
        waitForVoices: waitForVoices,
        listVoices: listVoices,
        populateSelect: populateSelect,
        connectUI: connectUI,
        choose: choose,
        prime: prime,
        speak: speak
    };
})();
