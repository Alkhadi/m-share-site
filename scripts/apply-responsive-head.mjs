#!/usr/bin/env node
// apply-responsive-head.mjs
// Ensure every page includes responsive essentials:
// - <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
// - <link rel="stylesheet" href="assets/css/responsive-fixes.css" />
// Idempotent; skips *.bak and non-page folders.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const rel = (...p) => path.join(root, ...p);

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function walk(dir, acc = []) {
    const SKIP = new Set(['.git', 'node_modules', 'assets', 'icons', 'js', 'cloudflare', 'scripts', '_coach']);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        if (SKIP.has(entry.name)) continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, acc); else acc.push(p);
    }
    return acc;
}

const files = walk(root).filter(f => /\.html?$/i.test(f) && !/\.bak$/i.test(f));
let changed = 0;

for (const file of files) {
    try {
        let html = read(file);
        const before = html;

        // Normalize viewport meta
        html = html.replace(/<meta[^>]*name=["']viewport["'][^>]*>\s*/ig, '');
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />`);

        // Ensure responsive-fixes.css link present
        const hasResp = /<link[^>]+href=["'][^"']*assets\/css\/responsive-fixes\.css["'][^>]*>/i.test(html);
        if (!hasResp) {
            // Inject before closing </head>, after any other css links
            html = html.replace(/<\/head>/i, (m) => `  <link rel="stylesheet" href="assets/css/responsive-fixes.css" />\n${m}`);
        }

        if (html !== before) { write(file, html); changed++; console.log('Updated', path.relative(root, file)); }
    } catch (e) {
        console.warn('Skip (error):', path.relative(root, file), e.message);
    }
}

console.log('\nDone. Files updated:', changed);
