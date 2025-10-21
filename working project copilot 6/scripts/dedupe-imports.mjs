#!/usr/bin/env node
// dedupe-imports.mjs
// Remove duplicate <link rel="stylesheet" href="…"> and <script src="…"></script> within each HTML file.
// Idempotent: safe to run repeatedly. Keeps the first occurrence and removes later duplicates.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function walk(dir, acc = []) {
    const SKIP = new Set(['.git', 'node_modules', 'assets', 'icons', 'js', 'cloudflare', 'scripts', '_coach']);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        if (SKIP.has(entry.name)) continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p, acc);
        else acc.push(p);
    }
    return acc;
}

function dedupeHtml(html) {
    const ranges = [];
    const linkRe = /<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/ig;
    const hrefRe = /href=["']([^"']+)["']/i;
    const seenLinks = new Set();
    let m;
    while ((m = linkRe.exec(html))) {
        const full = m[0];
        const start = m.index;
        const end = start + full.length;
        const hm = full.match(hrefRe);
        const href = hm ? hm[1] : null;
        if (!href) continue;
        const key = href.trim();
        if (seenLinks.has(key)) {
            ranges.push({ start, end });
        } else {
            seenLinks.add(key);
        }
    }

    const scriptRe = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/ig;
    const seenScripts = new Set();
    let s;
    while ((s = scriptRe.exec(html))) {
        const full = s[0];
        const start = s.index;
        const end = start + full.length;
        const src = s[1];
        const key = src.trim();
        if (seenScripts.has(key)) {
            ranges.push({ start, end });
        } else {
            seenScripts.add(key);
        }
    }

    if (!ranges.length) return { html, removed: 0 };
    ranges.sort((a, b) => b.start - a.start);
    let out = html;
    for (const { start, end } of ranges) {
        out = out.slice(0, start) + out.slice(end);
    }
    return { html: out, removed: ranges.length };
}

const files = walk(root).filter(f => /\.html?$/i.test(f) && !/\.bak$/i.test(f));
let totalRemoved = 0;
let changedFiles = 0;

for (const file of files) {
    try {
        const src = fs.readFileSync(file, 'utf8');
        const { html, removed } = dedupeHtml(src);
        if (removed > 0) {
            fs.writeFileSync(file, html, 'utf8');
            changedFiles++;
            totalRemoved += removed;
            console.log(`Deduped ${removed} import(s): ${path.relative(root, file)}`);
        }
    } catch (e) {
        console.warn('Skip (error):', path.relative(root, file), e.message);
    }
}

console.log(`\nDone. Files changed: ${changedFiles}, imports removed: ${totalRemoved}`);
