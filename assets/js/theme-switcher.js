/* Theme panel logic (persists across pages via localStorage)
   Controls:
   - Auto (prefers-color-scheme)
   - Color (page background color)
   - Brightness (relative lighten/darken on chosen color)
   - Reset (defaults)
*/
(function () {
    const qs = s => document.querySelector(s);
    const autoEl = qs('#theme-auto');
    const colorEl = qs('#theme-color');
    const rangeEl = qs('#theme-brightness');
    const resetEl = qs('#theme-reset');

    if (!autoEl || !colorEl || !rangeEl) return;

    const STORAGE_KEY = 'mpl_theme_v1';

    const DEFAULTS = {
        auto: true,
        color: '#0b0f1c',     // deep slate/navy base to match screenshot
        brightness: 0         // -50..50
    };

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    function hexToHsl(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    function hslToCss(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }

    // brightness is -50..50, adjust lightness by +/- 20% range
    function adjustBrightnessHex(hex, amount) {
        const { h, s, l } = hexToHsl(hex);
        const delta = (amount / 50) * 20; // up to ±20 points of lightness
        const nl = clamp(l + delta, 0, 100);
        return hslToCss(h, s, nl);
    }

    function loadState() {
        try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
        catch { return { ...DEFAULTS }; }
    }
    function saveState(st) { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }

    function applyState(st) {
        // Auto mode: follow system scheme, choose a sensible background
        if (st.auto) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const autoColor = prefersDark ? '#0b0f1c' : '#ffffff';
            document.documentElement.style.setProperty('--page-bg', adjustBrightnessHex(autoColor, 0));
            document.documentElement.classList.add('theme-auto');
            document.documentElement.classList.remove('theme-custom');
            // lock inputs visually but leave them interactive for quick toggling
            colorEl.disabled = true; rangeEl.disabled = true;
        } else {
            document.documentElement.classList.remove('theme-auto');
            document.documentElement.classList.add('theme-custom');
            const adjusted = adjustBrightnessHex(st.color, st.brightness || 0);
            document.documentElement.style.setProperty('--page-bg', adjusted);
            colorEl.disabled = false; rangeEl.disabled = false;
        }
    }

    const state = loadState();

    // Initialize UI from state
    autoEl.checked = !!state.auto;
    colorEl.value = state.color;
    rangeEl.value = String(clamp(Number(state.brightness || 0), -50, 50));

    applyState(state);

    // Bindings
    autoEl.addEventListener('change', () => {
        state.auto = !!autoEl.checked;
        saveState(state); applyState(state);
    });
    colorEl.addEventListener('input', () => {
        state.color = colorEl.value;
        state.auto = false; autoEl.checked = false;
        saveState(state); applyState(state);
    });
    rangeEl.addEventListener('input', () => {
        state.brightness = clamp(Number(rangeEl.value), -50, 50);
        state.auto = false; autoEl.checked = false;
        saveState(state); applyState(state);
    });
    resetEl && resetEl.addEventListener('click', () => {
        state.auto = DEFAULTS.auto;
        state.color = DEFAULTS.color;
        state.brightness = DEFAULTS.brightness;
        autoEl.checked = state.auto;
        colorEl.value = state.color;
        rangeEl.value = String(state.brightness);
        saveState(state); applyState(state);
    });

    // Keep in sync with system changes while in Auto
    if (window.matchMedia) {
        const m = window.matchMedia('(prefers-color-scheme: dark)');
        m.addEventListener?.('change', () => {
            if (autoEl.checked) applyState(loadState());
        });
    }
})();
