(function () {
    try {
        var s = document.createElement('script');
        var cur = (document.currentScript && document.currentScript.src) || '';
        // Rewrite legacy path assets/js/voice-coach-pro.js -> js/voice-coach-pro.js (preserve query if present)
        var url = cur
            .replace(/assets\/js\/voice-coach-pro\.js(\?.*)?$/i, 'js/voice-coach-pro.js$1')
            .replace(/\/assets\/js\/voice-coach-pro\.js(\?.*)?$/i, '/js/voice-coach-pro.js$1');
        if (url === cur) url = '../../js/voice-coach-pro.js';
        s.src = url; s.defer = true; document.head.appendChild(s);
    } catch (e) { /* noop */ }
})();
