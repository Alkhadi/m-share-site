/* Auto-contrast text for cards and buttons: black on light backgrounds; white on dark backgrounds. */
(function () {
    const SEL = ['.card', '.btn', 'button.btn', '.badge'].join(',');
    const KEY = 'mshare.contrast.fix.v1';
    let ran = false;
    function relLuminance(r, g, b) { const toL = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4) }; const [R, G, B] = [toL(r), toL(g), toL(b)]; return .2126 * R + .7152 * G + .0722 * B; }
    function parseBg(el) {
        const cs = getComputedStyle(el);
        let bg = cs.backgroundColor || cs.background;
        if (!bg || bg === 'transparent' || /gradient/i.test(bg)) {
            // climb up to find a solid color
            let p = el.parentElement; let guard = 0;
            while (p && guard++ < 5) {
                const csp = getComputedStyle(p); const b = csp.backgroundColor;
                if (b && b !== 'transparent') { bg = b; break; }
                p = p.parentElement;
            }
        }
        const m = bg && bg.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (!m) return null; return { r: +m[1], g: +m[2], b: +m[3] };
    }
    function apply() {
        if (ran) return; ran = true;
        document.querySelectorAll(SEL).forEach(el => {
            try {
                const rgb = parseBg(el); if (!rgb) return;
                const L = relLuminance(rgb.r, rgb.g, rgb.b);
                const darkBg = L < 0.5;
                el.style.color = darkBg ? '#ffffff' : '#0b1220';
                const m = el.querySelector('.muted'); if (m) m.style.color = darkBg ? 'rgba(255,255,255,.85)' : '#334155';
            } catch { }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true }); else apply();
    // Re-apply on theme changes when our theme UI toggles
    document.addEventListener('mpl:theme-change', () => { ran = false; apply(); });
})();
