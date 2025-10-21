#!/usr/bin/env node
/**
 * Apply the current footer markup from index.html to all pages site-wide.
 * - Uses the footer element found in index.html as the single source of truth.
 * - Replaces any existing <footer ...>...</footer> block in target pages.
 * - If a page has no footer, injects the footer before </body>.
 * - Skips *.bak snapshots and non-HTML files.
 * - Idempotent: only writes files when content changes.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); }
function listHtmlFiles(dir) {
    const out = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            // Skip typical non-page folders
            if (/^(assets|cloudflare|icons|js|scripts|node_modules)$/i.test(e.name)) continue;
            out.push(...listHtmlFiles(p));
        } else if (e.isFile() && /\.html$/i.test(e.name) && !/\.bak\.html$/i.test(e.name) && !/\.html\.bak$/i.test(e.name)) {
            out.push(p);
        }
    }
    return out;
}

function extractFooter(html) {
    const m = html.match(/<footer[\s\S]*?<\/footer>/i);
    return m ? m[0] : null;
}

function replaceFooter(doc, footerHtml) {
    if (!footerHtml) return doc;
    const hasFooter = /<footer[\s\S]*?<\/footer>/i.test(doc);
    if (hasFooter) return doc.replace(/<footer[\s\S]*?<\/footer>/i, footerHtml);
    // inject before </body> if possible
    if (/<\/body>/i.test(doc)) return doc.replace(/<\/body>/i, footerHtml + '\n</body>');
    // fallback: append at end
    return doc.trimEnd() + '\n' + footerHtml + '\n';
}

function main() {
    const indexPath = path.join(ROOT, 'index.html');
    if (!fs.existsSync(indexPath)) { console.error('index.html not found at', indexPath); process.exit(1); }
    const indexHtml = read(indexPath);
    const footer = extractFooter(indexHtml);
    if (!footer) { console.error('No <footer> found in index.html'); process.exit(1); }

    const targets = listHtmlFiles(ROOT).filter(p => path.resolve(p) !== path.resolve(indexPath));
    let changed = 0;
    for (const p of targets) {
        try {
            const html = read(p);
            const next = replaceFooter(html, footer);
            if (next !== html) { write(p, next); changed++; console.log('Updated footer in', path.relative(ROOT, p)); }
        } catch (e) {
            console.warn('Skip', p, e.message);
        }
    }
    console.log('Done. Pages updated:', changed);
}

main();
