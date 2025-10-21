(() => {
    const HEADER_HTML = `
	<header class="site-header">
		<div class="container navbar">
			<a id="brandLink" class="brand" data-href="index.html" href="index.html"><span class="logo">M</span> <span class="brand-text">M Share</span></a>

            <nav class="main-nav" id="mainNav">
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Conditions <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">Neurodevelopmental</div>
			<a data-href="autism.html">Autism</a>
            <a data-href="autism-parent.html">Autism Parent</a>
			<a data-href="adhd.html">ADHD</a>
			<a data-href="dyslexia-reading-training.html">Dyslexia</a>
			<div class="menu-label">Mental Health</div>
			<a data-href="anxiety.html">Anxiety</a>
			<a data-href="depression.html">Depression</a>
			<a data-href="stress.html">Stress</a>
			<a data-href="sleep.html">Sleep</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Breathing &amp; Focus <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">Guides</div>
			<a data-href="breath.html">Breath (how‑to)</a>
			<a data-href="focus.html">Focus</a>
			<a data-href="mindfulness.html">Mindfulness</a>
			<div class="menu-label">Techniques</div>
			<a data-href="sos-60.html">60‑second Reset</a>
			<a data-href="box-breathing.html">Box Breathing</a>
			<a data-href="4-7-8-breathing.html">4‑7‑8 Breathing</a>
			<a data-href="coherent-5-5.html">Coherent 5‑5</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">Toolkits <span class="icon">▾</span></button>
		<div class="submenu">
			<div class="menu-label">General</div>
			<a data-href="sleep-tools.html">Sleep Tools</a>
			<a data-href="breath-tools.html">Breath Tools</a>
			<a data-href="mood-tools.html">Mood Tools</a>
			<div class="menu-label">Condition‑specific</div>
			<a data-href="adhd-tools.html">ADHD Tools</a>
			<a data-href="autism-tools.html">Autism Tools</a>
			<a data-href="depression-tools.html">Depression Tools</a>
			<a data-href="anxiety-tools.html">Anxiety Tools</a>
			<a data-href="stress-tools.html">Stress Tools</a>
		</div>
	</div>
	<div class="menu-group">
		<button class="menu-toggle" aria-expanded="false">About <span class="icon">▾</span></button>
		<div class="submenu">
			<a data-href="about.html">About</a>
            <a data-href="downloads.html">Downloads</a>
            <a href="/assets/pdfs/parent-quick-pack.zip">Parent Quick Pack (ZIP)</a>
			<a data-href="coffee.html">Support Us</a>
			<a data-href="contact.html">Contact</a>
		</div>
	</div>
</nav>

			<button id="navToggle" class="nav-toggle" aria-label="Menu" aria-expanded="false"
				aria-controls="mainNav">☰</button>
		</div>
	</header>`;

    function applyHeader() {
        // Remove any extra headers and inject the canonical one
        const headers = Array.from(document.querySelectorAll('header'));
        if (headers.length) {
            headers.forEach((h, i) => { if (i > 0) h.remove(); });
            headers[0].outerHTML = HEADER_HTML;
        } else {
            const wrap = document.createElement('div');
            wrap.innerHTML = HEADER_HTML;
            document.body.insertBefore(wrap.firstElementChild, document.body.firstChild);
        }

        // Ensure brand link routes with existing query string
        const link = document.getElementById('brandLink');
        if (link) {
            const qs = location.search || '';
            link.setAttribute('href', 'index.html' + qs);
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href'); if (!href) return; e.preventDefault(); location.href = href;
            });
        }

        installNavCSS();
        applyDataHref(document.querySelector('header'));
        wireNavBehavior();
    }

    function installNavCSS() {
        // Inject minimal, safe CSS for desktop and mobile nav if missing
        if (!document.getElementById('mpl-mobile-nav-style-v4')) {
            const s = document.createElement('style'); s.id = 'mpl-mobile-nav-style-v4'; s.textContent = `
  /* Ensure [hidden] truly hides dropdowns in any theme */
  nav .menu[hidden], nav .submenu[hidden] { display:none !important; }
  @media (max-width: 1024px) {
    #mainNav[hidden] { display: none !important; }
    .nav-group, .menu-group { position: relative; }
    .nav-group.open > .menu,
    .menu-group.open > .submenu { display:block; }
    .nav-group > .menu-toggle,
    .nav-group > .chevron,
    .nav-group [data-chevron],
    .menu-group > .menu-toggle,
    .menu-group > .chevron,
    .menu-group [data-chevron] { cursor:pointer; touch-action: manipulation; }
        .nav-group > a:focus-visible,
        .nav-group > button:focus-visible,
        .nav-group > .menu-toggle:focus-visible,
        .nav-group > .chevron:focus-visible,
        .menu-group > a:focus-visible,
        .menu-group > button:focus-visible,
        .menu-group > .menu-toggle:focus-visible,
        .menu-group > .chevron:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
  }
  @media (min-width: 1025px) { #navToggle{ display:none !important; } }
`;
            document.head.appendChild(s);
        }
        if (!document.getElementById('mpl-desktop-nav-css-v3')) {
            const s = document.createElement('style'); s.id = 'mpl-desktop-nav-css-v3'; s.textContent = `
@media (min-width:1025px){
  .mpl-nav-toggle{display:inline-flex;align-items:center;gap:.25rem;background:none;border:0;padding:.25rem;margin-left:.25rem;cursor:pointer;line-height:1}
  .mpl-nav-toggle:focus,.mpl-nav-toggle:focus-visible{outline:2px solid currentColor;outline-offset:2px}
  [data-mpl-submenu]{display:none !important;visibility:hidden}
  [data-mpl-open="true"] > [data-mpl-submenu]{display:block !important;visibility:visible}
  .mpl-chevron{display:inline-block;transform:rotate(0deg);transition:transform .2s ease}
  [data-mpl-open="true"] .mpl-chevron{transform:rotate(180deg)}
  .mpl-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
}
`;
            document.head.appendChild(s);
        }
        // Mobile overlay CSS
        if (!document.getElementById('mpl-mobile-overlay-css')) {
            const s = document.createElement('style'); s.id = 'mpl-mobile-overlay-css'; s.textContent = `
#mpl-mobile-overlay{position:fixed;inset:0;background:rgba(7,11,18,.86);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:9998;display:none}
#mpl-mobile-overlay[open]{display:block}
/* Fill-screen sheet to remove empty space above menu on mobile */
    #mpl-mobile-sheet{position:absolute;left:0;right:0;top:0;bottom:0;max-height:none;background:#0e1726;color:#ffffff;border-radius:0;border:1px solid rgba(255,255,255,.12);box-shadow:none;overflow:auto;padding:12px 12px 18px}
    #mpl-mobile-sheet h4{margin:.25rem 0 .5rem}
    #mpl-mobile-sheet section{border-top:1px solid rgba(255,255,255,.08);padding:.25rem 0}
#mpl-mobile-sheet section:first-of-type{border-top:0}
    #mpl-mobile-sheet .mm-toggle{display:flex;justify-content:space-between;align-items:center;gap:.75rem;width:100%;background:transparent;border:1px solid rgba(255,255,255,.12);padding:.7rem .9rem;border-radius:.7rem;cursor:pointer;margin:.3rem 0;min-height:44px}
    #mpl-mobile-sheet .mm-toggle:focus{outline:2px solid #6AE6B7;outline-offset:2px}
    #mpl-mobile-sheet .mm-label{flex:1 1 auto;text-align:left}
    #mpl-mobile-sheet .mm-chevron{display:inline-block;transition:transform .2s ease}
    #mpl-mobile-sheet .mm-toggle[aria-expanded="true"] .mm-chevron{transform:rotate(180deg)}
#mpl-mobile-sheet [data-mm-list]{margin:.25rem 0 0 0;padding-left:1rem;display:none}
#mpl-mobile-sheet [data-mm-list] li{margin:.2rem 0}
#mpl-mobile-sheet a{color:inherit;text-decoration:none}
    #mpl-mobile-close{position:sticky;top:0;margin-left:auto;display:inline-flex;gap:.35rem;align-items:center;background:#0b1220;border:1px solid rgba(255,255,255,.12);padding:.5rem .7rem;border-radius:.6rem;min-height:44px}
`;
            document.head.appendChild(s);
        }
    }

    function applyDataHref(root) {
        if (!root) return;
        const qs = location.search || '';
        root.querySelectorAll('a[data-href]').forEach(a => {
            const base = a.getAttribute('data-href');
            if (!base) return;
            a.setAttribute('href', base + qs);
        });
    }

    function wireNavBehavior() {
        const mq = window.matchMedia('(min-width:1025px)');
        let enabled = false; let cleanups = [];
        const q = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

        function findSubmenu(el) {
            return el.querySelector(':scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol');
        }
        function findTopNavGroups() {
            const nav = document.getElementById('mainNav'); if (!nav) return [];
            const groups = [];
            Array.from(nav.children).forEach(node => { if (findSubmenu(node)) groups.push(node); });
            return groups;
        }
        function closeAll(except) {
            q('[data-mpl-open="true"]').forEach(g => {
                if (except && g === except) return;
                g.setAttribute('data-mpl-open', 'false');
                const t = g.querySelector(':scope > .mpl-nav-toggle'); if (t) t.setAttribute('aria-expanded', 'false');
            });
        }
        function enhanceDesktop() {
            if (enabled) return; enabled = true;
            const groups = findTopNavGroups(); if (!groups.length) return;
            groups.forEach(group => {
                const submenu = findSubmenu(group); if (!submenu) return;
                submenu.setAttribute('data-mpl-submenu', 'true');
                group.setAttribute('data-mpl-nav-group', 'true');
                if (!group.hasAttribute('data-mpl-open')) group.setAttribute('data-mpl-open', 'false');
                let label = group.querySelector(':scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
                if (!label) label = group.firstElementChild;
                let toggle = group.querySelector(':scope > .mpl-nav-toggle');
                if (!toggle) {
                    toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'mpl-nav-toggle';
                    toggle.setAttribute('aria-haspopup', 'menu'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('title', 'Toggle submenu');
                    toggle.innerHTML = '<span class="mpl-chevron" aria-hidden="true">▾<\/span><span class="mpl-sr-only">Toggle submenu<\/span>';
                    if (label && label.nextSibling) group.insertBefore(toggle, label.nextSibling); else group.appendChild(toggle);
                }
                let closeTimer = null;
                const open = () => { if (!mq.matches) return; if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } closeAll(group); group.setAttribute('data-mpl-open', 'true'); toggle.setAttribute('aria-expanded', 'true'); };
                const close = () => { if (!mq.matches) return; group.setAttribute('data-mpl-open', 'false'); toggle.setAttribute('aria-expanded', 'false'); };
                const onEnter = () => open();
                const onLeave = (e) => { const rel = e.relatedTarget; if (rel && group.contains(rel)) return; if (closeTimer) clearTimeout(closeTimer); closeTimer = setTimeout(() => { close(); }, 150); };
                const onToggle = (e) => { if (!mq.matches) return; e.preventDefault(); const isOpen = group.getAttribute('data-mpl-open') === 'true'; if (isOpen) close(); else open(); };
                const onKeys = (e) => { if (!mq.matches) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(e); } else if (e.key === 'Escape') { e.preventDefault(); close(); toggle.focus(); } };
                group.addEventListener('mouseenter', onEnter);
                group.addEventListener('mouseleave', onLeave);
                toggle.addEventListener('click', onToggle);
                toggle.addEventListener('keydown', onKeys);
                cleanups.push(() => { group.removeEventListener('mouseenter', onEnter); group.removeEventListener('mouseleave', onLeave); toggle.removeEventListener('click', onToggle); toggle.removeEventListener('keydown', onKeys); });
            });
            const onDocClick = (e) => { if (!mq.matches) return; const openEl = document.querySelector('[data-mpl-open="true"]'); if (!openEl) return; if (openEl.contains(e.target)) return; openEl.setAttribute('data-mpl-open', 'false'); const t = openEl.querySelector(':scope > .mpl-nav-toggle'); if (t) t.setAttribute('aria-expanded', 'false'); };
            const onDocEsc = (e) => { if (!mq.matches) return; if (e.key === 'Escape') { const openEl = document.querySelector('[data-mpl-open="true"]'); if (!openEl) return; openEl.setAttribute('data-mpl-open', 'false'); const t = openEl.querySelector(':scope > .mpl-nav-toggle'); if (t) { t.setAttribute('aria-expanded', 'false'); t.focus(); } } };
            document.addEventListener('click', onDocClick);
            document.addEventListener('keydown', onDocEsc);
            cleanups.push(() => { document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onDocEsc); });
        }
        function teardownDesktop() { if (!enabled) return; closeAll(); cleanups.forEach(fn => { try { fn(); } catch { } }); cleanups = []; enabled = false; }
        function wireMobile() {
            const toggle = document.getElementById('navToggle'); if (!toggle) return;
            ensureMobileOverlay();
            const open = () => {
                const ov = document.getElementById('mpl-mobile-overlay');
                ov.setAttribute('open', '');
                toggle.setAttribute('aria-expanded', 'true');
                document.body.classList.add('nav-open');
                const nav = document.getElementById('mainNav');
                if (nav && !mq.matches) nav.setAttribute('hidden', '');
                buildMobileMenu();
            };
            const close = () => {
                const ov = document.getElementById('mpl-mobile-overlay');
                ov.removeAttribute('open');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
                // Keep header nav hidden on mobile; the overlay is the nav
                const nav = document.getElementById('mainNav');
                if (nav && !mq.matches) nav.setAttribute('hidden', '');
                toggle.focus && toggle.focus();
            };

            const onToggle = (e) => { e.preventDefault(); const openNow = toggle.getAttribute('aria-expanded') === 'true'; if (openNow) close(); else open(); };
            const onBackdropClick = (e) => { const ov = document.getElementById('mpl-mobile-overlay'); if (!ov) return; if (ov.hasAttribute('open') && e.target === ov) close(); };
            const onEsc = (e) => { if (e.key === 'Escape') { const ov = document.getElementById('mpl-mobile-overlay'); if (ov && ov.hasAttribute('open')) { e.preventDefault(); close(); } } };

            toggle.addEventListener('click', onToggle);
            document.addEventListener('click', onBackdropClick);
            document.addEventListener('keydown', onEsc);

            // Delegate link clicks inside the sheet to close the menu
            const mount = document.getElementById('mpl-mobile-body');
            if (mount && !mount.hasAttribute('data-delegate')) {
                const onMountClick = (e) => {
                    const a = e.target.closest && e.target.closest('a[href],button[data-href]');
                    if (!a) return;
                    // Allow normal navigation then close overlay promptly
                    setTimeout(() => close(), 0);
                };
                mount.addEventListener('click', onMountClick);
                mount.setAttribute('data-delegate', '1');
                mobileCleanupFns.push(() => { try { mount.removeEventListener('click', onMountClick); mount.removeAttribute('data-delegate'); } catch { } });
            }

            // Ensure cleanup when switching back to desktop
            mobileCleanupFns.push(() => { try { toggle.removeEventListener('click', onToggle); } catch { } });
            mobileCleanupFns.push(() => { try { document.removeEventListener('click', onBackdropClick); } catch { } });
            mobileCleanupFns.push(() => { try { document.removeEventListener('keydown', onEsc); } catch { } });
        }

        function ensureMobileOverlay() {
            if (document.getElementById('mpl-mobile-overlay')) return;
            const ov = document.createElement('div'); ov.id = 'mpl-mobile-overlay';
            ov.innerHTML = '<div id="mpl-mobile-sheet" role="dialog" aria-modal="true" aria-label="Site menu"><button id="mpl-mobile-close" type="button" aria-label="Close">Close</button><div id="mpl-mobile-body"></div></div>';
            document.body.appendChild(ov);
            document.getElementById('mpl-mobile-close').addEventListener('click', () => {
                ov.removeAttribute('open');
                const t = document.getElementById('navToggle');
                if (t) t.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('nav-open');
                const nav = document.getElementById('mainNav');
                if (nav && !mq.matches) nav.setAttribute('hidden', '');
            });
        }

        function buildMobileMenu() {
            const mount = document.getElementById('mpl-mobile-body'); if (!mount) return; mount.innerHTML = '';
            const nav = document.getElementById('mainNav');
            if (nav && !mq.matches) nav.setAttribute('hidden', '');
            const groups = findTopNavGroups();
            groups.forEach((g, idx) => {
                const sec = document.createElement('section');
                const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mm-toggle'; btn.setAttribute('aria-expanded', 'false');
                let labelNode = g.querySelector(':scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
                const labelText = (labelNode && (labelNode.textContent || '').trim()) || ('Menu ' + (idx + 1));
                const listId = 'mm-list-' + idx;
                btn.setAttribute('aria-controls', listId);
                btn.innerHTML = `<span class="mm-label">${labelText}</span><span class="mm-chevron" aria-hidden="true">▾</span>`;
                const list = document.createElement('ul'); list.id = listId; list.setAttribute('data-mm-list', ''); list.style.display = 'none';
                const submenu = findSubmenu(g);
                if (submenu) {
                    Array.from(submenu.querySelectorAll('a[href], [data-href]')).forEach(a => {
                        let href = a.getAttribute('href') || a.getAttribute('data-href') || '#';
                        // Merge current query string robustly
                        const q = (location.search || '');
                        if (q) {
                            const hashIndex = href.indexOf('#');
                            if (hashIndex >= 0) {
                                const base = href.slice(0, hashIndex);
                                const hash = href.slice(hashIndex);
                                href = base + (base.includes('?') ? '&' + q.slice(1) : q) + hash;
                            } else {
                                href = href + (href.includes('?') ? '&' + q.slice(1) : q);
                            }
                        }
                        const text = (a.textContent || '').trim() || href;
                        const li = document.createElement('li'); const cl = document.createElement('a');
                        cl.setAttribute('href', href); cl.textContent = text;
                        li.appendChild(cl); list.appendChild(li);
                    });
                }
                const toggleOne = () => {
                    const open = btn.getAttribute('aria-expanded') === 'true';
                    if (!open) {
                        // accordion: close others
                        mount.querySelectorAll('.mm-toggle[aria-expanded="true"]').forEach(t => {
                            if (t !== btn) { t.setAttribute('aria-expanded', 'false'); const id = t.getAttribute('aria-controls'); const l = id && document.getElementById(id); if (l) l.style.display = 'none'; }
                        });
                    }
                    btn.setAttribute('aria-expanded', String(!open));
                    // Inline style must override CSS [data-mm-list]{display:none}; use block when opened
                    list.style.display = open ? 'none' : 'block';
                };
                // Allow clicking anywhere on the toggle (label or chevron) to open/close
                btn.addEventListener('click', (e) => { e.preventDefault(); toggleOne(); });
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOne(); }
                    else if (e.key === 'Escape') { e.preventDefault(); btn.setAttribute('aria-expanded', 'false'); list && (list.style.display = 'none'); btn.focus(); }
                });
                // Explicitly make chevron also a hit target (inside button already, but ensure for AT/analytics)
                btn.querySelector('.mm-chevron')?.addEventListener('click', (e) => { e.preventDefault(); toggleOne(); });
                sec.appendChild(btn); sec.appendChild(list); mount.appendChild(sec);
            });
        }
        const react = () => {
            const nav = document.getElementById('mainNav');
            if (mq.matches) {
                // Desktop: ensure header nav is visible
                if (nav) nav.removeAttribute('hidden');
                wireMobileCleanup();
                enhanceDesktop();
            } else {
                // Mobile: hide header nav; we use the full-screen overlay menu instead
                if (nav) nav.setAttribute('hidden', '');
                teardownDesktop();
                wireMobile();
            }
        };
        let mobileCleanupFns = []; function wireMobileCleanup() { mobileCleanupFns.forEach(fn => { try { fn(); } catch { } }); mobileCleanupFns = []; }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', react, { once: true }); else react();
        mq.addEventListener('change', react);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyHeader, { once: true });
    else applyHeader();

    // Also enforce Voice Coach / narration defaults globally
    try {
        localStorage.setItem('vc.enabled', 'true');
    } catch { }
    // If a page exposes a TTS select, default it to "on"
    try {
        const setTts = () => {
            const ttsSel = document.getElementById('tts');
            if (ttsSel) { ttsSel.value = 'on'; }
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setTts, { once: true });
        else setTts();
    } catch { }

    // Ensure PDF helper is available globally for data-pdf links
    try {
        if (!document.querySelector('script[src*="assets/js/pdf-links.js"]')) {
            const s = document.createElement('script'); s.src = 'assets/js/pdf-links.js'; s.async = true; document.head.appendChild(s);
        }
    } catch { }
})();
