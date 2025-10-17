#!/usr/bin/env node
/**
 * One-shot readability + typography fixer (idempotent)
 *
 * What it does:
 * - Adds site-wide readability CSS that:
 *   • Ensures body text is black on light/white backgrounds
 *   • Ensures buttons text is white
 *   • Ensures text is white on common "colored sections" (hero/banner/oncolor/bg-* etc.)
 *   • Keeps accessible focus styles
 *   • Aligns with your site's calm, high-contrast palette (primary ~ #0f172a)
 * - Applies ChatGPT 5 Pro typography site-wide:
 *   • Adds class "gpt5-typography" to <html>
 *   • Ensures assets/css/chatgpt5-typography.css is linked (writes a minimal one if missing)
 *
 * What it does NOT do:
 * - Does NOT change or add any nav/hamburger/JS behavior
 * - Does NOT replace headers or footers
 * - Does NOT alter other stylesheets
 *
 * Safety:
 * - Creates per-file backups: *.oneshot.bak.TIMESTAMP
 *
 * Usage:
 *   node fix-readability-oneshot.mjs
 *   node fix-readability-oneshot.mjs --dry-run
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

// Calm, accessible palette tuned for your site (primary ~ #0f172a)
const READABILITY_EMBED = `/* Professional Readability for M Share (idempotent) */

/* Root palette (calm, high-contrast) */
:root{
  /* Base surface vars (your site already uses these) */
  --bg: #f7f7fb;
  --fg: #111111;
  --muted: #6b7280;
  --b: rgba(0,0,0,.12);

  /* App palette (derived from your site's theme-color ~ #0f172a) */
  --primary: #0f172a;           /* slate-900 */
  --primary-contrast: #ffffff;
  --accent: #14b8a6;            /* teal-500 */
  --accent-contrast: #0b0b10;
  --success: #16a34a;           /* green-600 */
  --danger: #dc2626;            /* red-600 */
  --warning: #f59e0b;           /* amber-500 */
  --info: #2563eb;              /* blue-600 */

  /* Links on light */
  --link: #0f172a;
  --link-hover: #0b1222;
}

/* Typography defaults for light surfaces */
html, body {
  color: var(--fg, #111111);
}
main, section, article, .container, .card, .sheet-card:not(.dark) {
  color: var(--fg, #111111);
}

/* Muted text on light */
.muted, .text-muted, .subtle { color: var(--muted, #6b7280); }

/* Links (light surfaces) */
a { color: var(--link, #0f172a); }
a:hover { color: var(--link-hover, #0b1222); }

/* Buttons: ensure white text & solid contrast backgrounds */
.btn, button, .button, input[type="button"], input[type="submit"], a.btn {
  color: #fff !important;
  background-color: var(--primary, #0f172a);
  border: 1px solid color-mix(in srgb, var(--primary, #0f172a), #000 20%);
}
.btn:focus, button:focus, .button:focus, a.btn:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Button variants (if you use these class names) */
.btn-success, .badge.ok { background-color: var(--success, #16a34a) !important; color: #fff !important; }
.btn-danger { background-color: var(--danger, #dc2626) !important; color: #fff !important; }
.btn-warning { background-color: var(--warning, #f59e0b) !important; color: #111 !important; }
.btn-info { background-color: var(--info, #2563eb) !important; color: #fff !important; }
.btn-accent { background-color: var(--accent, #14b8a6) !important; color: var(--primary, #0f172a) !important; }

/* Chips/badges */
.badge, .chip { color: #fff !important; background-color: var(--primary, #0f172a); }

/* Colored/dark sections: force white foreground for readability */
.hero, .banner, .oncolor, .on-color, .section.oncolor, .section.on-color,
[class*="bg-"], [data-colored], .card.dark, .section.dark, .sheet-card.dark,
header.site-header, header.site-header .navbar {
  color: #fff !important;
}
.hero a, .banner a, .oncolor a, .on-color a, [class*="bg-"] a, [data-colored] a,
.card.dark a, .section.dark a, header.site-header a {
  color: #fff !important;
}
.hero a:focus, .banner a:focus, .oncolor a:focus, .on-color a:focus,
[class*="bg-"] a:focus, [data-colored] a:focus, header.site-header a:focus {
  outline: 2px solid #fff; outline-offset: 2px;
}

/* Menus on colored headers */
header.site-header .main-nav > a,
header.site-header .menu-toggle,
header.site-header .nav-button,
header.site-header .brand,
header.site-header .brand .brand-text,
header.site-header .logo,
header.site-header #navToggle,
header.site-header .icon { color: #fff !important; }

/* Submenus inheriting dark/colored headers */
header.site-header .submenu a { color: #fff; }

/* Focus rings always visible */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Respect your existing spacing/cards; do not alter layout */
`;

/* Minimal ChatGPT 5 Pro typography scaffold */
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
    // Ensure readability CSS exists (always overwrite to keep idempotent updates)
    const readPath = path.join(ROOT, READABILITY_CSS);
    writeFileSafe(readPath, READABILITY_EMBED);

    // Ensure ChatGPT 5 CSS present (write if missing; do not overwrite if user has a custom one)
    const cgptPath = path.join(ROOT, CHATGPT5_CSS);
    if (!fs.existsSync(cgptPath)) writeFileSafe(cgptPath, CHATGPT5_EMBED);
}

function main() {
    console.log('Readability + Typography one-shot', DRY ? '(DRY RUN)' : '');
    writeSupportCss();

    const files = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
    if (!files.length) { console.log('No HTML files found. Done.'); return; }

    let modified = 0;
    for (const fp of files) {
        let html = readFileSafe(fp);
        const before = html;

        // Apply ChatGPT 5 Pro style font
        html = ensureHtmlHasClass(html, 'gpt5-typography');
        html = ensureLinkInHead(html, CHATGPT5_CSS);

        // Add readability stylesheet (buttons white text, colored sections white, body black on light)
        html = ensureLinkInHead(html, READABILITY_CSS);

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
