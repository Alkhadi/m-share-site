/* Normalized global navigation behavior (mobile + desktop)
   - One open submenu
   - ESC/outside-click closes
   - Hamburger toggle for mobile (<=1024px)
   - Idempotent; safe to load on all pages
*/
(function () {
    if (document.documentElement.hasAttribute('data-mpl-nav-wired')) return;
    document.documentElement.setAttribute('data-mpl-nav-wired', '1');

    var MQ = window.matchMedia ? window.matchMedia('(max-width: 1024px)') : { matches: true, addEventListener: function () { } };
    var nav = document.getElementById('mainNav') || document.querySelector('nav.main-nav') || document.querySelector('header nav') || document.querySelector('nav');
    if (!nav) return;

    // Ensure data-href becomes href so links work without app.js
    Array.prototype.forEach.call(document.querySelectorAll('a[data-href]'), function (a) { if (!a.getAttribute('href')) a.setAttribute('href', a.getAttribute('data-href')); });

    var toggle = document.getElementById('navToggle') || document.querySelector('.nav-toggle, .hamburger, [aria-controls="mainNav"]');
    function isOpen() { return toggle && toggle.getAttribute('aria-expanded') === 'true'; }
    function openNav() { if (!MQ.matches || !nav || !toggle) return; toggle.setAttribute('aria-expanded', 'true'); nav.removeAttribute('hidden'); var cs = getComputedStyle(nav); if (cs.display === 'none') nav.style.display = 'block'; document.body.classList.add('nav-open'); }
    function closeNav() { if (!nav || !toggle) return; toggle.setAttribute('aria-expanded', 'false'); if (MQ.matches) { nav.setAttribute('hidden', ''); nav.style.display = 'none'; } document.body.classList.remove('nav-open'); }

    if (toggle && !toggle.hasAttribute('data-wired')) {
        toggle.setAttribute('aria-controls', nav.id || 'mainNav');
        if (!toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', function (e) { if (!MQ.matches) return; e.preventDefault(); isOpen() ? closeNav() : openNav(); }, { passive: false });
        document.addEventListener('click', function (e) { if (!MQ.matches || !isOpen()) return; if (e.target.closest('#mainNav, #navToggle, .nav-toggle, .hamburger')) return; closeNav(); }, { passive: true });
        document.addEventListener('keydown', function (e) { if (MQ.matches && e.key === 'Escape' && isOpen()) closeNav(); }, { passive: true });
        toggle.setAttribute('data-wired', '1');
    }

    function closeOthers(except) {
        Array.prototype.forEach.call(nav.querySelectorAll('.menu-group.open, [data-mpl-open="true"]'), function (g) {
            if (g === except) return;
            var menu = g.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul');
            if (menu) menu.setAttribute('hidden', '');
            g.classList.remove('open');
            g.setAttribute('data-mpl-open', 'false');
            var t = g.querySelector(':scope > .menu-toggle, :scope > .chevron, [data-chevron], :scope > a, :scope > button, :scope > .mpl-nav-toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
        });
    }

    Array.prototype.forEach.call(nav.querySelectorAll('.menu-group'), function (g) {
        var menu = g.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul'); if (!menu) return;
        var btn = g.querySelector(':scope > .menu-toggle, :scope > .chevron, [data-chevron]') || g.querySelector(':scope > a, :scope > button');

        function init() {
            if (!MQ.matches) {
                // Desktop default closed; rely on hover/click to open
                menu.setAttribute('hidden', '');
                g.classList.remove('open');
                g.setAttribute('data-mpl-open', 'false');
                if (btn) { btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); }
            } else {
                // Mobile closed by default
                menu.setAttribute('hidden', '');
                g.classList.remove('open');
                g.setAttribute('data-mpl-open', 'false');
                if (btn) { btn.setAttribute('tabindex', '0'); btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false'); }
            }
        }
        init();
        if (MQ.addEventListener) MQ.addEventListener('change', init); else if (MQ.addListener) MQ.addListener(init);

        function open() { closeOthers(g); menu.removeAttribute('hidden'); g.classList.add('open'); g.setAttribute('data-mpl-open', 'true'); if (btn) btn.setAttribute('aria-expanded', 'true'); }
        function close() { menu.setAttribute('hidden', ''); g.classList.remove('open'); g.setAttribute('data-mpl-open', 'false'); if (btn) btn.setAttribute('aria-expanded', 'false'); }
        function toggleOpen(e) { if (e) e.preventDefault(); (g.classList.contains('open') ? close : open)(); }

        // Click/keyboard open (both mobile and desktop)
        if (btn && !btn.hasAttribute('data-wired')) {
            btn.addEventListener('click', function (e) { toggleOpen(e); }, { passive: false });
            btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOpen(e); } if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); } }, { passive: false });
            btn.setAttribute('data-wired', '1');
        }

        // Desktop hover/focus (pointer:fine only)
        if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
            g.addEventListener('mouseenter', function () { if (!MQ.matches) open(); }, { passive: true });
            g.addEventListener('mouseleave', function () { if (!MQ.matches) close(); }, { passive: true });
            g.addEventListener('focusin', function () { if (!MQ.matches) open(); }, { passive: true });
            g.addEventListener('focusout', function (ev) { if (MQ.matches) return; if (!g.contains(ev.relatedTarget)) close(); }, { passive: true });
        }
    });

    // Outside click to close any open submenu (works for both modes)
    document.addEventListener('click', function (e) {
        if (e.target.closest('.menu-group, #mainNav, .nav-toggle, #navToggle')) return;
        closeOthers(null);
    }, { passive: true });

})();
