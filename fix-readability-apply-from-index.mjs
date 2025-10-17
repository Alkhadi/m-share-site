#!/usr/bin/env node
/**
 * One-shot site patcher (idempotent, safe).
 *
 * This script ONLY does the following:
 * 1) Replaces the <header> and <footer> blocks on every HTML page with the exact ones from index.html
 *    (keeps working hamburger menu/submenus and all existing scripts intact; JS is not modified).
 * 2) Ensures ChatGPT 5 Pro typography site-wide:
 *    - Adds class "gpt5-typography" to <html>
 *    - Ensures assets/css/chatgpt5-typography.css is linked (writes a minimal scaffold if missing)
 * 3) Adds a professional readability stylesheet (assets/css/readability-professional.css):
 *    - Forces readable contrast across the site
 *    - Default text is WHITE on dark/colored surfaces and BLACK on truly 100 percent white surfaces
 *    - H1–H6, paragraphs and lists inherit surface color for proper readability
 *    - All button text is WHITE with hover/active/visited/focus-visible states
 *    - Common colored sections get WHITE text automatically (hero/banner/oncolor/bg-*, .dark etc.)
 *    - Adds 2% bottom margin on sections/.section/.card and grid children so cards never touch
 *    - Makes all cards border professionally visible
 *    - Improves link states and form readability on dark backgrounds
 * 4) Creates timestamped backups next to each modified HTML: *.oneshot.bak.YYYY-MM-DDTHH-MM-SSZ
 *
 * Usage:
 *   node fix-readability-apply-from-index.mjs
 *   node fix-readability-apply-from-index.mjs --dry-run  (preview; no writes)
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const CHATGPT5_CSS = 'assets/css/chatgpt5-typography.css';
const READABILITY_CSS = 'assets/css/readability-professional.css';

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

/**
 * Professional, accessible, calm palette + contrast fixes
 * - Default text: white (for dark/colored surfaces)
 * - white surfaces: black text
 * - Titles/body text inherit surface color for readability (h1–h6, p, li)
 * - Buttons: white text with states
 * - Links: hover/active/visited/focus-visible states
 * - Forms: readable text/placeholders on dark
 * - 2% bottom margin on sections, .section, .card, and grid children
 * - Header/nav on colored backgrounds: white text
 * - All cards have visible borders
 */
const READABILITY_EMBED = `/* Readability & Contrast — M Share (idempotent) */

/* Calm palette aligned to site theme */
:root{
  --primary:#0f172a;              /* slate-900 */
  --primary-contrast:#ffffff;
  --accent:#14b8a6;               /* teal-500 */
  --accent-contrast:#0b0b10;
  --success:#16a34a;              /* green-600 */
  --danger:#dc2626;               /* red-600 */
  --warning:#f59e0b;              /* amber-500 */
  --info:#2563eb;                 /* blue-600 */

  --ink:#ffffff;                  /* default text on dark */
  --ink-muted:#cbd5e1;            /* slate-300 */
  --ink-strong:#f8fafc;           /* slate-50 */
  --ink-dark:#0f172a;             /* deep readable ink */
  --ink-black:#111111;            /* high contrast on white */

  --surface:#0b0f1c;              /* dark base */
  --surface-2:#0f172a;            /* header/nav surface */
  --surface-light:#ffffff;        /* white/light */

  --border-dark:rgba(255,255,255,.14);
  --border-light:rgba(17,24,39,.14);
}

/* Default: white text on dark backgrounds */
html, body { color: var(--ink, #fff); }

/* Titles/body/list inherit surface color for proper readability */
h1,h2,h3,h4,h5,h6,
p, li, dt, dd, small, strong, em { color: inherit !important; }

/* Common LIGHT/WHITE surfaces: switch to black ink if background is 100 percent white */
.card:not(.dark),
.sheet-card:not(.dark),
.paper, .surface, .panel,
.bg-white, .bg-light, .white, .paper-white,
section.light, .section.light, .card.light,
.container.light, .content.light,
[style*="background:#fff"], [style*="background: #fff"], [style*="background:#ffffff"], [style*="background: #ffffff"], [style*="rgb(255, 255, 255)"],
[data-surface="light"] {
  color: var(--ink-black) !important;
}

/* Muted text */
.muted, .text-muted, .subtle { color: var(--ink-muted) !important; }

/* Links (professional states) */
a { color: #9dd5ff; text-decoration: none; }
a:hover { color: #cfe8ff; text-decoration: underline; }
a:active { color: #7ac1ff; }
a:visited { color: #b9c7ff; }
a:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

/* Buttons: white text everywhere; solid contrast backgrounds */
.btn, button, .button, a.btn, input[type="button"], input[type="submit"]{
  color:#fff !important;
  background: var(--primary);
  border:2px solid color-mix(in srgb, var(--primary), #000 20%);
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
.btn:focus-visible, button:focus-visible, .button:focus-visible, a.btn:focus-visible{
  outline:4px solid #fff; outline-offset:2px;
}

/* Button variants (if present) */
.btn-success, .badge.ok { background: var(--success) !important; color:#fff !important; }
.btn-danger  { background: var(--danger) !important; color:#fff !important; }
.btn-warning { background: var(--warning) !important; color:#111 !important; }
.btn-info    { background: var(--info)    !important; color:#fff !important; }
.btn-accent  { background: var(--accent)  !important; color: var(--accent-contrast) !important; }

/* Badges/chips readable */
.badge, .chip { color:#fff !important; background: color-mix(in srgb, var(--primary), #fff 10%); border:1px solid var(--border-dark); }

/* Header/nav on colored background: enforce white */
header.site-header, header.site-header .navbar { color:#fff; background: var(--surface-2); }
header.site-header .brand, header.site-header .brand .brand-text, header.site-header .logo { color:#fff !important; }
header.site-header .main-nav > a,
header.site-header .menu-toggle,
header.site-header .nav-button,
header.site-header .icon,
header.site-header #navToggle { color:#fff !important; }
header.site-header .main-nav > a:hover,
header.site-header .menu-toggle:hover,
header.site-header .nav-button:hover { text-decoration: underline; }
header.site-header .submenu a{ color:#fff; }

/* DARK/COLORED sections: make text white automatically */
.hero, .banner, .oncolor, .on-color, .section.oncolor, .section.on-color,
[class*="bg-"], [data-colored], [class*="dark"], .dark,
.card.dark, .section.dark, .sheet-card.dark, .panel.dark, .surface.dark {
  color:#fff !important;
}
.hero a, .banner a, .oncolor a, .on-color a, [class*="bg-"] a, [data-colored] a,
[class*="dark"] a, .dark a, .card.dark a, .section.dark a, .sheet-card.dark a { color:#fff; }

/* Forms readable on dark surfaces */
label { color: inherit; }
input, textarea, select {
  color: inherit;
  background-color: color-mix(in srgb, currentColor, transparent 94%);
  border: 2px solid color-mix(in srgb, currentColor, #000 75%);
}
input::placeholder, textarea::placeholder { color: color-mix(in srgb, currentColor, #000 65%); }

/* Focus rings globally */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 4px solid currentColor;
  outline-offset: 4px;
}

/* Spacing: 2% bottom margin so blocks/cards never touch */
section, .section, .card { margin-bottom: 2% !important; }
.grid > * { margin-bottom: 2% !important; }

/* Cards: visible borders */
.card, .sheet-card, .panel, .surface {
  border: 2px solid var(--border-dark);
  border-radius: 8px;
}
.card.light, .sheet-card.light, .panel.light, .surface.light,
.card:not(.dark), .sheet-card:not(.dark), .panel:not(.dark), .surface:not(.dark) {
  border: 2px solid var(--border-light);
}

/* Footer readability */
#footer2025.mpl-footer-v3{
  color: var(--ink);
  background: color-mix(in srgb, var(--surface), #000 0%);
  border-top:1px solid var(--border-dark);
}
#footer2025 .muted{ color: #94a3b8 !important; }
#footer2025 a{ color:#e5f0ff; }
#footer2025 a:hover{ color:#ffffff; text-decoration: underline; }
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

function writeSupportCss() {
    // Always (re)write readability css to keep it current (safe/idempotent)
    writeFileSafe(path.join(ROOT, READABILITY_CSS), READABILITY_EMBED);
    // Only create ChatGPT 5 CSS if missing (do not overwrite user's custom one)
    const cgpt = path.join(ROOT, CHATGPT5_CSS);
    if (!fs.existsSync(cgpt)) writeFileSafe(cgpt, CHATGPT5_EMBED);
}

function main() {
    console.log('One-shot: Replace header/footer from index.html + readability/typography', DRY ? '(DRY RUN)' : '');

    // Load canonical header & footer from index.html (your local working file mirrors live site)
    const idxPath = path.join(ROOT, 'index.html');
    const idx = readFileSafe(idxPath);
    if (!idx) { console.error('ERROR: index.html not found. Aborting.'); process.exit(1); }
    const canonicalHeader = extractBlock(idx, 'header');
    const canonicalFooter = extractBlock(idx, 'footer');
    if (!canonicalHeader) { console.error('ERROR: <header> not found in index.html. Aborting.'); process.exit(1); }
    if (!canonicalFooter) { console.error('ERROR: <footer> not found in index.html. Aborting.'); process.exit(1); }

    // Write styles
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

        // Readability/contrast stylesheet (spacing, colors, states)
        html = ensureLinkInHead(html, READABILITY_CSS);

        // Replace header & footer with the ones from index.html
        html = replaceBlock(html, 'header', canonicalHeader);
        // Remove all existing footers then insert canonical footer from index
        html = html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
        if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${canonicalFooter}\n</body>`);
        else html += `\n${canonicalFooter}\n`;

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
