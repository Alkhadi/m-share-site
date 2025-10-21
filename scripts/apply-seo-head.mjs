#!/usr/bin/env node
// apply-seo-head.mjs
// Inject a small, idempotent SEO block into every HTML page:
// - canonical URL (if missing)
// - Open Graph + Twitter tags (derived from title/description)
// - JSON-LD WebSite snippet
// Uses a removable marker block so it can be re-run safely.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { fs.writeFileSync(file, content, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function list(dir) { try { return fs.readdirSync(dir); } catch { return []; } }

const CNAME_PATH = path.join(root, 'CNAME');
const host = exists(CNAME_PATH) ? read(CNAME_PATH).trim() : 'www.mindpaylink.com';
const origin = host.startsWith('http') ? host.replace(/\/$/, '') : `https://${host}`;

const iconsDir = path.join(root, 'icons');
const ogImageCandidate = ['logo-wordmark-800x200.png', 'logo-wordmark.png', 'android-chrome-512x512.png', 'maskable-icon-512.png']
    .find(n => exists(path.join(iconsDir, n)));
const ogImage = `${origin}/icons/${ogImageCandidate || 'android-chrome-512x512.png'}`;

function htmlEscape(s = '') {
    return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function computeCanonical(fileAbs) {
    const rel = path.relative(root, fileAbs).replace(/\\/g, '/');
    const base = rel.replace(/^\/?/, '/');
    if (base === '/index.html') return `${origin}/`;
    return `${origin}${base}`;
}

function getTitle(html) {
    const m = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (m) return m[1].trim();
    return 'M Share — Practical wellbeing tools';
}

function getDescription(html) {
    const m = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    return m ? m[1].trim() : null;
}

function upsertSeo(file) {
    let html = read(file);
    const before = html;

    // Remove any previous injected block
    html = html.replace(/\n?\s*<!--\s*mshare-seo-start\s*-->[\s\S]*?<!--\s*mshare-seo-end\s*-->\s*/i, '\n');

    const title = getTitle(html);
    const existingDesc = getDescription(html);
    const desc = existingDesc || 'Quiet, practical mental-health tools for UK audiences — easy breathing and wellbeing techniques (educational, not medical advice).';

    // Canonical handling
    const hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
    const canonicalUrl = hasCanonical ? (html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)?.[1] || computeCanonical(file)) : computeCanonical(file);

    // If missing a meta description entirely, add one via our block; else leave existing alone
    const shouldAddDescMeta = !existingDesc;

    const block = [
        '<!-- mshare-seo-start -->',
        // Canonical only if missing
        !hasCanonical ? `  <link rel="canonical" href="${htmlEscape(canonicalUrl)}" />` : null,
        shouldAddDescMeta ? `  <meta name="description" content="${htmlEscape(desc)}" />` : null,
        `  <meta property="og:type" content="website" />`,
        `  <meta property="og:site_name" content="M Share" />`,
        `  <meta property="og:title" content="${htmlEscape(title)}" />`,
        `  <meta property="og:description" content="${htmlEscape(desc)}" />`,
        `  <meta property="og:url" content="${htmlEscape(canonicalUrl)}" />`,
        `  <meta property="og:image" content="${htmlEscape(ogImage)}" />`,
        `  <meta name="twitter:card" content="summary_large_image" />`,
        `  <meta name="twitter:title" content="${htmlEscape(title)}" />`,
        `  <meta name="twitter:description" content="${htmlEscape(desc)}" />`,
        `  <meta name="twitter:image" content="${htmlEscape(ogImage)}" />`,
        '  <script type="application/ld+json">',
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'M Share',
            url: `${origin}/`,
        }, null, 2)
            .split('\n').map(l => `    ${l}`).join('\n'),
        '  </script>',
        '<!-- mshare-seo-end -->'
    ].filter(Boolean).join('\n');

    // Insert before </head>
    if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, `${block}\n</head>`);
    } else {
        // Fallback: append at end
        html += `\n${block}\n`;
    }

    if (html !== before) {
        write(file, html);
        return true;
    }
    return false;
}

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
        if (upsertSeo(file)) {
            console.log('Updated', path.relative(root, file));
            changed++;
        }
    } catch (e) {
        console.warn('Skip (error):', path.relative(root, file), e.message);
    }
}

console.log('\nDone. Files updated:', changed);
