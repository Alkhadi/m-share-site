; (() => {
    function once(el) { if (el.__mplExploreBuilt) return false; el.__mplExploreBuilt = true; return true; }
    function normUrl(u) { try { const url = new URL(u, location.href); return url.origin === location.origin ? url.pathname.replace(/\/index\.html$/, '/') : null; } catch { return null; } }
    function parseList(attr) { return String(attr || '').split(',').map(s => s.trim()).filter(Boolean); }
    function matchesAny(str, arr) { const s = String(str).toLowerCase(); return arr.some(x => s.includes(String(x).toLowerCase())); }
    function build() {
        const slot = document.getElementById('mpl-footer-explore');
        if (!slot || !once(slot)) return;
        const nav = document.querySelector('header nav#mainNav') || document.querySelector('header nav');
        if (!nav) return;

        const container = slot.closest('.mpl-footer-explore') || slot.parentElement;
        const includeList = parseList(container?.getAttribute('data-include'));
        const excludeList = parseList(container?.getAttribute('data-exclude'));

        const links = Array.from(nav.querySelectorAll('a'))
            .map(a => {
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                let href = a.getAttribute('href');
                if (!href) {
                    const dh = a.getAttribute('data-href');
                    if (dh) href = dh + (location.search || '');
                }
                const key = normUrl(href) || href;
                return { text, href, key };
            })
            .filter(x => x.text && x.href && /\.html(\?|$)/.test(x.href))
            .reduce((acc, x) => {
                if (!x.key || acc.seen.has(x.key)) return acc;
                acc.seen.add(x.key); acc.items.push(x); return acc;
            }, { seen: new Set(), items: [] }).items
            .filter(x => {
                if (includeList.length) {
                    // Keep only if label or path matches include tokens
                    return matchesAny(x.text, includeList) || matchesAny(x.key, includeList);
                }
                if (excludeList.length) {
                    // Drop if label or path matches exclude tokens
                    return !(matchesAny(x.text, excludeList) || matchesAny(x.key, excludeList));
                }
                return true;
            });

        if (!links.length) return;
        const ul = document.createElement('ul');
        ul.className = 'footer-explore-list';
        ul.style.listStyle = 'none';
        ul.style.margin = '0';
        ul.style.padding = '0';
        ul.style.columns = '2';
        ul.style.columnGap = '14px';

        links.forEach(({ text, href }) => {
            const li = document.createElement('li');
            li.style.breakInside = 'avoid';
            const a = document.createElement('a');
            a.textContent = text;
            a.href = href;
            a.setAttribute('data-href', href.replace(location.search, ''));
            li.appendChild(a);
            ul.appendChild(li);
        });

        slot.innerHTML = '';
        slot.appendChild(ul);

        // Default accordion state: collapsed on small screens, open on larger; persist for the session
        try {
            const details = slot.closest('.mpl-footer-explore')?.querySelector('details.explore');
            if (details) {
                const KEY = 'mpl.explore.open';
                const saved = sessionStorage.getItem(KEY);
                if (saved === '0' || saved === '1') {
                    details.open = saved === '1';
                } else {
                    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
                    details.open = !!isDesktop;
                }
                details.addEventListener('toggle', () => {
                    try { sessionStorage.setItem(KEY, details.open ? '1' : '0'); } catch { }
                });
            }
        } catch { }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else setTimeout(build, 0);
})();
