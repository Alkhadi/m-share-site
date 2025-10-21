#!/usr/bin/env node
// apply-header-footer-from-adhd.mjs
// Use the <header> and <footer> from adhd.html across all site pages.
// Idempotent. Skips *.bak and common non-page folders.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Repo root assumed to be the parent of scripts/
const root = path.resolve(__dirname, '..');
const rel = (...p) => path.join(root, ...p);

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
    fs.writeFileSync(file, content, 'utf8');
}

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

function extractSection(html, startTag) {
    const tag = startTag.toLowerCase();
    const re = new RegExp(`<${tag}[^>]*>[\s\S]*?<\/${tag}>`, 'i');
    const m = html.match(re);
    if (m && m[0]) return m[0];
    // Fallback: manual search
    const openIdx = html.toLowerCase().indexOf(`<${tag}`);
    if (openIdx === -1) return '';
    const afterOpen = html.indexOf('>', openIdx);
    if (afterOpen === -1) return '';
    const closeIdx = html.toLowerCase().indexOf(`</${tag}>`, afterOpen);
    if (closeIdx === -1) return '';
    return html.slice(openIdx, closeIdx + tag.length + 3);
}

function replaceSection(src, startTag, replacement) {
    const tag = startTag.toLowerCase();
    // Remove ALL existing blocks of this tag (global)
    const reAll = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'ig');
    src = src.replace(reAll, '');

    // Normalise whitespace after removal
    src = src.replace(/\n{3,}/g, '\n\n');

    // Insert at canonical spot
    if (tag === 'header') {
        const bodyOpen = src.match(/<body[^>]*>/i);
        if (bodyOpen) {
            const at = bodyOpen.index + bodyOpen[0].length;
            return src.slice(0, at) + '\n' + replacement + '\n' + src.slice(at);
        }
        return replacement + '\n' + src;
    }
    if (tag === 'footer') {
        const bodyClose = src.search(/<\/body>/i);
        if (bodyClose !== -1) {
            return src.slice(0, bodyClose) + '\n' + replacement + '\n' + src.slice(bodyClose);
        }
        return src + '\n' + replacement;
    }
    return src;
}

// ---- main ----
const argv = process.argv.slice(2);
const FORCE = argv.includes('--force') || argv.includes('-f');
const refFile = rel('adhd.html');
if (!fs.existsSync(refFile)) {
    console.error('Reference file not found:', refFile);
    process.exit(1);
}

const refHtml = read(refFile);
const REF_HEADER = extractSection(refHtml, 'header');
const REF_FOOTER = extractSection(refHtml, 'footer');
if (!REF_HEADER || !REF_FOOTER) {
    console.error('Could not extract header/footer from adhd.html', {
        headerLen: REF_HEADER ? REF_HEADER.length : 0,
        footerLen: REF_FOOTER ? REF_FOOTER.length : 0,
    });
    process.exit(1);
}

const files = walk(root).filter(f => /\.html?$/i.test(f) && !/\.bak$/i.test(f));
let changed = 0;

for (const file of files) {
    try {
        let html = read(file);
        const before = html;
        html = replaceSection(html, 'header', REF_HEADER);
        html = replaceSection(html, 'footer', REF_FOOTER);
        if (FORCE || html !== before) {
            write(file, html);
            changed++;
            console.log('Updated', path.relative(root, file));
        }
    } catch (e) {
        console.warn('Skip (error):', path.relative(root, file), e.message);
    }
}

console.log('\nDone. Files updated:', changed);
