(() => {
    if (window.__NAV_CORE__) return; window.__NAV_CORE__ = true; const ready = f => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', f, { once: true }); else f(); }; ready(() => {
        // If the newer unified header is present, skip this legacy wiring to avoid conflicts
        if (document.querySelector('#mpl-mobile-overlay') || document.getElementById('mpl-mobile-overlay-css') || document.querySelector('header .mpl-nav-toggle')) return;
        const nav = document.getElementById('mainNav'); const toggle = document.getElementById('navToggle'); if (!nav) return; if (toggle) { toggle.addEventListener('click', e => { e.preventDefault(); const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); }); }
        const groups = [...nav.querySelectorAll('.menu-group')]; const closeAll = () => groups.forEach(g => { g.classList.remove('open'); const b = g.querySelector('.menu-toggle'); b && b.setAttribute('aria-expanded', 'false'); }); groups.forEach(g => { const b = g.querySelector('.menu-toggle'); if (!b) return; b.addEventListener('click', e => { e.preventDefault(); const was = g.classList.contains('open'); if (window.innerWidth > 760) closeAll(); g.classList.toggle('open', !was); b.setAttribute('aria-expanded', !was ? 'true' : 'false'); }); });
        document.addEventListener('click', e => { if (!nav.contains(e.target) && !e.target.closest('#navToggle')) { closeAll(); nav.classList.remove('open'); toggle && toggle.setAttribute('aria-expanded', 'false'); } });
        nav.addEventListener('click', e => { const a = e.target.closest('a[data-href]'); if (!a) return; const href = a.getAttribute('data-href') || a.getAttribute('href'); if (href) { e.preventDefault(); location.href = href; } });
    });
})();
