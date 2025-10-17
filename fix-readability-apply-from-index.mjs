#!/usr/bin/env node
/**
 * One-shot site patcher (idempotent, safe).
 *
 * This script does the following:
 * 1) Replaces the <header> on every HTML page with the exact one from index.html
 *    (keeps your working hamburger menu/submenus and all existing scripts intact; JS is not modified).
 * 2) Replaces every page <footer> with the new 2025 footer (below), built from optional assets/footer-nav.json.
 * 3) Ensures ChatGPT 5 Pro typography site-wide:
 *    - Adds class "gpt5-typography" to <html>
 *    - Ensures assets/css/chatgpt5-typography.css is linked (writes a minimal scaffold if missing)
 * 4) Adds a professional readability stylesheet (assets/css/readability-professional.css)
 * 5) Injects footer CSS (assets/css/footer-2025.css) and theme JS (assets/js/theme-switcher.js)
 * 6) Creates timestamped backups next to each modified HTML: *.oneshot.bak.YYYY-MM-DDTHH-MM-SSZ
 *
 * Usage:
 *   node fix-readability-apply-from-index.mjs
 *   node fix-readability-apply-from-index.mjs --dry-run   (preview; no writes)
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const CHATGPT5_CSS = 'assets/css/chatgpt5-typography.css';
const READABILITY_CSS = 'assets/css/readability-professional.css';
const FOOTER_CSS = 'assets/css/footer-2025.css';
const THEME_JS = 'assets/js/theme-switcher.js';
const NAV_JSON = 'assets/footer-nav.json';

function ensureDir(d) { if (!DRY) fs.mkdirSync(d, { recursive: true }); }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site', '.next', '.cache', '.vercel'].includes(e.name)) continue;
            walk(p, acc);
        } else acc.push(p);
    }
    return acc;
}
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function readFileSafe(fp) { try { return fs.readFileSync(fp, 'utf8'); } catch { return ''; } }
function writeFileSafe(fp, content) {
    if (DRY) { console.log('[dry] write', fp); return; }
    ensureDir(path.dirname(fp));
    fs.writeFileSync(fp, content, 'utf8');
}
function ensureLinkInHead(html, href) {
    const needle = new RegExp('href\\s*=\\s*[\'"]' + escapeRegExp(href) + '[\'"]', 'i');
    if (needle.test(html)) return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
    if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, m => m + `\n  <link rel="stylesheet" href="${href}">`);
    return `<!doctype html>\n<head>\n  <link rel="stylesheet" href="${href}">\n</head>\n` + html;
}
function ensureScriptBeforeBodyEnd(html, src) {
    const needle = new RegExp('<script\\b[^>]*\\bsrc=["\']' + escapeRegExp(src) + '["\'][^>]*>\\s*</script>', 'i');
    if (needle.test(html)) return html;
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `  <script src="${src}" defer></script>\n</body>`);
    return html + `\n<script src="${src}" defer></script>\n`;
}
function ensureHtmlHasClass(html, klass) {
    const has = new RegExp('<html\\b[^>]*\\bclass=["\'][^"\']*\\b' + escapeRegExp(klass) + '\\b[^"\']*["\']', 'i').test(html);
    if (has) return html;
    if (/<html\b[^>]*\bclass=["'][^"']*["'][^>]*>/i.test(html)) {
        return html.replace(/(<html\b[^>]*\bclass=["'])([^"']*)(["'][^>]*>)/i, (m, p1, p2, p3) => p1 + (p2 ? p2 + ' ' : '') + klass + p3);
    }
    if (/<html\b[^>]*>/i.test(html)) {
        return html.replace(/<html\b([^>]*)>/i, `<html$1 class="${klass}">`);
    }
    return html;
}
function extractBlock(html, tag) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
    const m = html.match(re);
    return m ? m[0] : null;
}
function replaceBlock(html, tag, replacement) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
    if (re.test(html)) return html.replace(re, replacement);
    // If missing, insert after <body> (header) or before </body> (footer)
    if (tag === 'header' && /<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, m => m + '\n' + replacement + '\n');
    if (tag === 'footer') {
        if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${replacement}\n</body>`);
        return html + '\n' + replacement + '\n';
    }
    return html;
}

/* Readability & contrast stylesheet (kept from your original, slight footer touch-ups are in footer-2025.css) */
const READABILITY_EMBED = `/* Readability & Contrast — M Share (idempotent) */
:root{
  --primary:#0f172a;
  --primary-contrast:#ffffff;
  --accent:#14b8a6;
  --accent-contrast:#0b0b10;
  --success:#16a34a;
  --danger:#dc2626;
  --warning:#f59e0b;
  --info:#2563eb;

  --ink:#ffffff;
  --ink-muted:#cbd5e1;
  --ink-strong:#f8fafc;
  --ink-dark:#0f172a;
  --ink-black:#111111;

  --surface:#0b0f1c;
  --surface-2:#0f172a;
  --surface-light:#ffffff;

  --border-dark:rgba(255,255,255,.14);
  --border-light:rgba(17,24,39,.14);

  /* Page background can be customized by Theme panel */
  --page-bg: var(--surface);
}
html, body { color: var(--ink, #fff); background: var(--page-bg); }
h1,h2,h3,h4,h5,h6, p, li, dt, dd, small, strong, em { color: inherit !important; }

/* Light surfaces → black ink */
.card:not(.dark), .sheet-card:not(.dark), .paper, .surface, .panel,
.bg-white, .bg-light, .white, .paper-white,
section.light, .section.light, .card.light,
.container.light, .content.light,
[style*="background:#fff"], [style*="background: #fff"], [style*="rgb(255, 255, 255)"], [data-surface="light"] {
  color: var(--ink-black) !important;
}

/* Links */
a { color: #9dd5ff; text-decoration: none; }
a:hover { color: #ffffff; text-decoration: underline; }
a:active { color: #7ac1ff; }
a:visited { color: #b9c7ff; }
a:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

/* Buttons base */
.btn, button, .button, a.btn, input[type="button"], input[type="submit"]{
  color:#fff !important; background: var(--primary);
  border:1px solid color-mix(in srgb, var(--primary), #000 20%);
  transition: background .15s ease, transform .05s ease, box-shadow .15s ease;
}
.btn:hover, button:hover, .button:hover, a.btn:hover{
  background: color-mix(in srgb, var(--primary), #fff 10%);
}
.btn:active, button:active, .button:active, a.btn:active{
  transform: translateY(1px);
  background: color-mix(in srgb, var(--primary), #000 8%);
}
.btn:visited, a.btn:visited{ color:#fff !important; }
.btn:focus-visible{ outline:2px solid #fff; outline-offset:2px; }

/* Variants */
.btn-success { background: var(--success) !important; color:#fff !important; }
.btn-danger  { background: var(--danger) !important; color:#fff !important; }
.btn-warning { background: var(--warning) !important; color:#111 !important; }
.btn-info    { background: var(--info)    !important; color:#fff !important; }
.btn-accent  { background: var(--accent)  !important; color: var(--accent-contrast) !important; }

/* Forms */
label { color: inherit; }
input, textarea, select {
  color: inherit;
  background-color: color-mix(in srgb, currentColor, transparent 94%);
  border: 1px solid color-mix(in srgb, currentColor, #000 75%);
}
input::placeholder, textarea::placeholder { color: color-mix(in srgb, currentColor, #000 65%); }

/* Focus rings */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid currentColor; outline-offset: 2px;
}

/* Spacing */
section, .section, .card { margin-bottom: 2% !important; }
.grid > * { margin-bottom: 2% !important; }
`;

/* Minimal ChatGPT 5 Pro typography scaffold (only written if missing) */
const CHATGPT5_EMBED = `/* ChatGPT 5 Pro Typography (minimal scaffold) */
.gpt5-typography {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Inter, Arial, "Noto Sans", "Liberation Sans", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}
.gpt5-typography code, .gpt5-typography pre { font-family: var(--font-mono); }
`;

/* ---------- Footer Builder ---------- */
function buildExplorerFromJson() {
    const p = path.join(ROOT, NAV_JSON);
    if (!fs.existsSync(p)) return null;
    try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        // data format:
        // { "Explore":[ { "title":"Conditions", "links":[{"label":"Anxiety","href":"/conditions/anxiety"}, ...] }, ... ] }
        const sec = (data.Explore || []).map(group => {
            const items = (group.links || []).map(l => `        <li><a href="${l.href}">${l.label}</a></li>`).join('\n');
            return `
      <details class="explore-block">
        <summary>${group.title}</summary>
        <ul class="link-list">
${items}
        </ul>
      </details>`;
        }).join('\n');
        return sec || null;
    } catch (e) {
        console.warn('WARN: Could not parse', NAV_JSON, e.message);
        return null;
    }
}

function footerHtmlTemplate(explorerHtml) {
    // If explorerHtml not provided, fall back to sensible defaults
    const explorer = explorerHtml || `
      <details class="explore-block"><summary>Conditions</summary>
        <ul class="link-list">
          <li><a href="/conditions/anxiety">Anxiety</a></li>
          <li><a href="/conditions/depression">Depression</a></li>
          <li><a href="/conditions/insomnia">Insomnia</a></li>
        </ul>
      </details>
      <details class="explore-block"><summary>Breathing &amp; Focus</summary>
        <ul class="link-list">
          <li><a href="/breathing/box">Box Breathing</a></li>
          <li><a href="/breathing/478">4-7-8 Breathing</a></li>
          <li><a href="/focus/pomodoro">Pomodoro</a></li>
        </ul>
      </details>
      <details class="explore-block"><summary>Toolkits</summary>
        <ul class="link-list">
          <li><a href="/toolkits/grounding">Grounding</a></li>
          <li><a href="/toolkits/journaling">Journaling</a></li>
          <li><a href="/toolkits/sleep">Sleep</a></li>
        </ul>
      </details>
      <details class="explore-block"><summary>About</summary>
        <ul class="link-list">
          <li><a href="/about">About Us</a></li>
          <li><a href="/privacy">Privacy</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </details>
  `;

    return `
<footer id="footer2025" class="mpl-footer-v3" role="contentinfo" aria-label="Site footer">
  <div class="footer-inner">
    <!-- Left: Brand -->
    <div class="brand-col">
      <div class="brand-row">
        <span class="logo-dot" aria-hidden="true">M</span>
        <div class="brand-text">
          <div class="brand-name">M Share</div>
          <div class="brand-tagline">Quiet, practical tools for mental health and wellbeing.</div>
        </div>
      </div>
    </div>

    <!-- Middle: CTA + Theme -->
    <div class="cta-col">
      <div class="cta-stack">
        <a class="pill-btn" href="/support" aria-label="Support Us">Support Us</a>
        <a class="pill-btn secondary" href="/donate" aria-label="Donate">🫖 Support Us</a>
      </div>

      <section class="theme-card" aria-labelledby="theme-title">
        <details open>
          <summary id="theme-title">Theme</summary>
          <div class="theme-controls">
            <label class="row">
              <input type="checkbox" id="theme-auto" checked>
              <span>Auto</span>
            </label>
            <label class="row color-row">
              <input type="color" id="theme-color" value="#0b0f1c" aria-label="Page background color">
              <span>Color</span>
            </label>
            <label class="row range-row">
              <span>Brightness</span>
              <input type="range" id="theme-brightness" min="-50" max="50" step="1" value="0" aria-label="Brightness">
            </label>
            <button type="button" id="theme-reset" class="reset-btn" aria-label="Reset theme">Reset</button>
          </div>
        </details>
      </section>
    </div>

    <!-- Right: Explore -->
    <nav class="explore-col" aria-labelledby="explore-title">
      <div class="explore-heading" id="explore-title">Explore</div>
      <div class="explore-stack">
${explorer}
      </div>
    </nav>
  </div>

  <div class="footer-bar">
    <div class="left">© 2025 MindPayLink • Educational information only; not medical advice.</div>
    <div class="right">Designed by <a href="https://mindpaylink.com" rel="noopener">Alkhadi M Koroma</a></div>
  </div>
</footer>
`;
}

/* ---------- Write support assets ---------- */
function writeSupportCss() {
    // (Re)write readability to keep it current
    writeFileSafe(path.join(ROOT, READABILITY_CSS), READABILITY_EMBED);
    // Create ChatGPT5 CSS if missing
    const cgpt = path.join(ROOT, CHATGPT5_CSS);
    if (!fs.existsSync(cgpt)) writeFileSafe(cgpt, CHATGPT5_EMBED);
    // Ensure footer CSS exists (user can edit)
    const footerCss = path.join(ROOT, FOOTER_CSS);
    if (!fs.existsSync(footerCss)) {
        console.log('NOTE: footer CSS missing, writing scaffold at', FOOTER_CSS, '(edit as needed)');
        writeFileSafe(footerCss, `/* See assets/css/footer-2025.css in assistant output for full styles */`);
    }
    // Ensure theme JS exists
    const themeJs = path.join(ROOT, THEME_JS);
    if (!fs.existsSync(themeJs)) {
        console.log('NOTE: theme JS missing, writing scaffold at', THEME_JS, '(edit as needed)');
        writeFileSafe(themeJs, `/* See assets/js/theme-switcher.js in assistant output for full script */`);
    }
}

function main() {
    console.log('One-shot: Replace header (from index.html) + inject new footer + readability/typography', DRY ? '(DRY RUN)' : '');

    // Load canonical header from index.html
    const idxPath = path.join(ROOT, 'index.html');
    const idx = readFileSafe(idxPath);
    if (!idx) { console.error('ERROR: index.html not found. Aborting.'); process.exit(1); }
    const canonicalHeader = extractBlock(idx, 'header');
    if (!canonicalHeader) { console.error('ERROR: <header> not found in index.html. Aborting.'); process.exit(1); }

    // Build footer HTML (prefer JSON, fallback to default content)
    const explorerFromJson = buildExplorerFromJson();
    const NEW_FOOTER = footerHtmlTemplate(explorerFromJson);

    // Write styles/scripts
    writeSupportCss();

    // Patch every HTML file
    const files = walk(ROOT).filter(f => f.toLowerCase().endsWith('.html'));
    if (!files.length) { console.log('No HTML files found. Done.'); return; }

    let modified = 0;
    for (const fp of files) {
        let html = readFileSafe(fp);
        const before = html;

        // Typography site-wide
        html = ensureHtmlHasClass(html, 'gpt5-typography');
        html = ensureLinkInHead(html, CHATGPT5_CSS);

        // Readability/contrast stylesheet + footer css
        html = ensureLinkInHead(html, READABILITY_CSS);
        html = ensureLinkInHead(html, FOOTER_CSS);

        // Ensure theme script
        html = ensureScriptBeforeBodyEnd(html, THEME_JS);

        // Replace header & footer
        html = replaceBlock(html, 'header', canonicalHeader);
        html = html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
        if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${NEW_FOOTER}\n</body>`);
        else html += `\n${NEW_FOOTER}\n`;

        if (html !== before) {
            modified++;
            const bak = fp + '.oneshot.bak.' + nowStamp();
            if (!DRY) {
                fs.copyFileSync(fp, bak);
                fs.writeFileSync(fp, html, 'utf8');
            }
            console.log((DRY ? '[dry] ' : 'Patched: ') + path.relative(ROOT, fp) + (DRY ? '' : (' backup-> ' + path.relative(ROOT, bak))));
        }
    }

    console.log('\nSummary:');
    console.log('  HTML files modified:', modified);
    console.log(DRY ? '  DRY RUN complete. No files were written.' : '  Done.');
}

main();
