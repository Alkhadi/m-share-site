#!/usr/bin/env node
/**
 * One-shot site updater (from index.html):
 * - Use header and footer from index.html for ALL pages (including hamburger & submenus).
 * - Ensure ChatGPT 5 Pro typography site-wide (adds class "gpt5-typography" to <html> and links assets/css/chatgpt5-typography.css).
 * - Improve readability:
 *     • Buttons text white,
 *     • Common colored sections text white,
 *     • Default body text black on light/white backgrounds.
 * - Back up each modified HTML as *.oneshot.bak.TIMESTAMP.
 *
 * It does NOT add or change any other scripts/CSS beyond the above.
 *
 * Usage:
 *   node fix-site-from-index-oneshot.mjs
 *   node fix-site-from-index-oneshot.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const CHATGPT5_CSS = 'assets/css/chatgpt5-typography.css';
const READABILITY_CSS = 'assets/css/readability-contrast.css';

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
function stripAllFooters(html) {
    return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
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

const READABILITY_EMBED = `/* Readability defaults:
   - Default body text black for contrast on light sections
   - Buttons and chips: white text
   - Common "colored" sections: white text
*/
html, body { color: #111; }
main, section, article, .container, .card { color: #111; }

/* Buttons and chips as white text */
.btn, button.btn, button, a.btn, .badge, .chip { color: #fff !important; }

/* Common colored sections (override to white text) */
.hero, .banner, .oncolor, .on-color, .section.oncolor, .section.on-color,
[class*="bg-"], [data-colored], .card.dark, .section.dark, .sheet-card.dark { color: #fff !important; }

/* Ensure links inside dark/colored sections are readable */
.hero a, .banner a, .oncolor a, .on-color a, [class*="bg-"] a, [data-colored] a { color: #fff; }
.hero a:focus, .banner a:focus, .oncolor a:focus, .on-color a:focus { outline: 2px solid #fff; outline-offset: 2px; }
`;

const CHATGPT5_EMBED = `/* Minimal ChatGPT 5 Pro typography scaffold */
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
    // Write/readability and ChatGPT5 typography files if missing
    const readPath = path.join(ROOT, READABILITY_CSS);
    if (!fs.existsSync(readPath)) writeFileSafe(readPath, READABILITY_EMBED);

    const cgptPath = path.join(ROOT, CHATGPT5_CSS);
    if (!fs.existsSync(cgptPath)) writeFileSafe(cgptPath, CHATGPT5_EMBED);
}

function main() {
    console.log('One-shot: replace header/footer from index.html', DRY ? '(DRY RUN)' : '');

    // 1) Load canonical header and footer from index.html
    const idxPath = path.join(ROOT, 'index.html');
    const idx = readFileSafe(idxPath);
    if (!idx) { console.error('ERROR: index.html not found at project root. Aborting.'); process.exit(1); }
    const canonicalHeader = extractBlock(idx, 'header');
    const canonicalFooter = extractBlock(idx, 'footer');
    if (!canonicalHeader) { console.error('ERROR: Could not extract <header> from index.html. Aborting.'); process.exit(1); }
    if (!canonicalFooter) { console.error('ERROR: Could not extract <footer> from index.html. Aborting.'); process.exit(1); }

    // 2) Ensure CSS support files exist (readability + ChatGPT5)
    writeSupportCss();

    // 3) Patch all HTML files
    const files = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
    if (!files.length) { console.log('No HTML files found. Done.'); return; }

    let modified = 0;
    for (const fp of files) {
        let html = readFileSafe(fp);
        const before = html;

        // ChatGPT 5 Pro typography site-wide
        html = ensureHtmlHasClass(html, 'gpt5-typography');
        html = ensureLinkInHead(html, CHATGPT5_CSS);

        // Readability CSS (buttons white, colored sections white, body text black on light bg)
        html = ensureLinkInHead(html, READABILITY_CSS);

        // Replace header and footer with those from index.html
        html = replaceBlock(html, 'header', canonicalHeader);
        html = stripAllFooters(html);
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
