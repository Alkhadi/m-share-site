#!/usr/bin/env node
/**
 * Inject `<script defer src="assets/js/contrast-fix.js"></script>` on all HTML pages (non-*.bak).
 * Idempotent: adds only if missing, placed before closing </body>.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const EXTS = new Set(['.html', '.htm']);

function walk(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const fp = path.join(dir, name);
        const st = fs.statSync(fp);
        if (st.isDirectory()) {
            // Skip folders we don't want
            if (/^(?:assets|cloudflare|icons|js|scripts)$/i.test(name)) continue;
            out.push(...walk(fp));
        } else if (st.isFile()) {
            const ext = path.extname(name).toLowerCase();
            if (!EXTS.has(ext)) continue;
            if (name.endsWith('.bak' + ext)) continue;
            out.push(fp);
        }
    }
    return out;
}

function hasContrastScript(html) {
    return /<script[^>]+src=["']assets\/js\/contrast-fix\.js["'][^>]*><\/script>/i.test(html);
}

function inject(html) {
    if (hasContrastScript(html)) return html;
    const tag = '\n  <script defer src="assets/js/contrast-fix.js"></script>\n';
    if (/<\/body>/i.test(html)) {
        return html.replace(/<\/body>/i, tag + '</body>');
    }
    return html + tag;
}

function main() {
    const files = walk(ROOT);
    let count = 0;
    files.forEach(fp => {
        try {
            const src = fs.readFileSync(fp, 'utf8');
            const next = inject(src);
            if (next !== src) {
                fs.writeFileSync(fp, next);
                console.log('Updated', path.relative(ROOT, fp));
                count++;
            }
        } catch (e) {
            console.warn('Skip', fp, e.message);
        }
    });
    console.log('Done. Pages updated:', count);
}

main();
