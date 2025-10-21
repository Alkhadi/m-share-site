(() => {
    // PDF/link base resolution:
    // Priority: localStorage.mshare_pdf_base > meta[name="pdf-base"][content] > window.__PDF_BASE__ > "/assets/pdfs"
    function getBase() {
        const fromLS = (() => { try { return localStorage.getItem('mshare_pdf_base'); } catch { return null; } })();
        const meta = document.querySelector('meta[name="pdf-base"][content]');
        const fromMeta = meta && meta.getAttribute('content');
        const fromWin = window.__PDF_BASE__;
        const base = (fromLS || fromMeta || fromWin || '/assets/pdfs').replace(/\/$/, '');
        return base;
    }

    function apply() {
        const base = getBase();
        const qs = location.search || '';
        document.querySelectorAll('a[data-pdf]').forEach(a => {
            const file = a.getAttribute('data-pdf');
            if (!file) return;
            const url = `${base}/${encodeURIComponent(file)}`;
            a.setAttribute('href', url + (url.startsWith('http') ? '' : qs));
            a.setAttribute('download', '');
            // If no visible text, set from filename
            if (!a.textContent.trim()) a.textContent = file;
        });
        // Also support images via data-img
        document.querySelectorAll('img[data-img]').forEach(img => {
            const file = img.getAttribute('data-img');
            if (!file) return;
            const url = `${base}/${encodeURIComponent(file)}`;
            img.setAttribute('src', url);
            img.setAttribute('loading', 'lazy');
            img.setAttribute('decoding', 'async');
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
})();
