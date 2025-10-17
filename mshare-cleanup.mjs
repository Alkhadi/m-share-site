#!/usr/bin/env node
/**
 * One-shot fixer and cleaner for M Share HTML workspace.
 *
 * 1. For every .html file except About, removes all footers and injects the About/footer (or default).
 * 2. Ensures mobile-nav-final.js, footer-explore.js, and mobile-nav-final.css are linked once.
 * 3. Removes unnecessary files: *.bak, *.bak.*, *.old, *.orig, .DS_Store, Thumbs.db, zero-length, temp, etc.
 * 4. Removes empty directories under project root.
 * 5. Strips trailing whitespace and superfluous blank lines from HTML files.
 * 6. Logs all actions and changes.
 *
 * Usage: node mshare-cleanup.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CSS_FILE = 'assets/css/mobile-nav-final.css';
const JS_FILE = 'assets/js/mobile-nav-final.js';
const EXPLORE_FILE = 'assets/js/footer-explore.js';

const DEFAULT_FOOTER = `  <footer id="footer2025" class="footer-2025 mpl-footer-v3">
    <div class="mpl-footer-wrap">
      <div class="mpl-footer-grid" role="navigation" aria-label="Site footer">
        <section class="col brand">
          <div class="brandline"> <span class="logo" aria-hidden="true">M</span>
            <div><b>M Share</b>
              <div class="muted">Quiet, practical tools for mental health and wellbeing.</div>
            </div>
          </div>
          <div class="mpl-pay" aria-label="Support links"> <a class="pay-link" href="coffee.html" target="_blank"
              rel="noopener">Support Us</a> <a class="pay-link" href="https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00"
              target="_blank" rel="noopener">☕ Support Us</a> </div>
        </section>
        <section class="col center"> <!-- Theme Explorer (center) -->
          <div id="mpl-theme-slot" aria-label="Theme controls"></div>
        </section>
        <section class="col right"> <!-- Explore menu (chevrons) -->
          <nav class="mpl-footer-explore" aria-label="Explore">
            <h4>Explore</h4>
            <div id="mpl-footer-explore"></div>
          </nav>
        </section>
      </div>
      <div class="bottom">
        <div>© <span id="yearFooter"></span> MindPayLink · Educational information only; not medical advice.</div>
        <div class="credit">Designed by <b>Alkhadi M Koroma</b></div>
      </div>
    </div>
    <script>(function () { var y = document.getElementById('yearFooter'); if (y) y.textContent = (new Date).getFullYear(); })();</script>
  </footer>`;

function walk(dir, acc = []) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site', '.next', '.vercel', '.cache'].includes(d.name)) continue;
            walk(p, acc);
        } else {
            acc.push(p);
        }
    }
    return acc;
}
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function isAboutPage(fp) {
    const n = fp.replace(/\\/g, '/').toLowerCase();
    const bn = path.basename(n);
    if (bn === 'about.html' || n.endsWith('/about.html') || n.endsWith('/about/index.html')) return true;
    return false;
}
function extractFooterFromHtml(html) {
    const m = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    return m ? m[0] : null;
}
function ensureLinkInHead(html, href) {
    const needle = new RegExp('href\\s*=\\s*[\'"]' + href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]', 'i');
    if (needle.test(html)) return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, `$&\n  <link rel="stylesheet" href="${href}">`);
    return `<!doctype html>\n<head>\n  <link rel="stylesheet" href="${href}">\n</head>\n` + html;
}
function ensureScriptBeforeBody(html, src) {
    const needle = new RegExp('src\\s*=\\s*[\'"]' + src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\'"]', 'i');
    if (needle.test(html)) return html;
    const tag = `<script defer src="${src}"></script>`;
    if (/<\/body>\s*<\/html>/i.test(html)) return html.replace(/<\/body>\s*<\/html>/i, `${tag}\n</body>\n</html>`);
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}\n</body>`);
    return html + `\n${tag}\n`;
}
function stripAllFooters(html) {
    return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
}
function stripOldAssetReferences(html) {
    html = html.replace(/<script[^>]+src=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']*footer-explore[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<link[^>]+href=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*/gi, '');
    return html;
}
function stripTrailingWhitespace(html) {
    return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}
function cleanEmptyDirs(dir, removed = []) {
    const entries = fs.readdirSync(dir);
    if (entries.length === 0) {
        if (dir !== ROOT) {
            fs.rmdirSync(dir);
            removed.push(dir);
        }
        return;
    }
    for (const entry of entries) {
        const p = path.join(dir, entry);
        if (fs.statSync(p).isDirectory()) cleanEmptyDirs(p, removed);
    }
    // After cleaning subdirs, check self again
    if (fs.readdirSync(dir).length === 0 && dir !== ROOT) {
        fs.rmdirSync(dir);
        removed.push(dir);
    }
}
function shouldDeleteFile(fp) {
    const name = path.basename(fp);
    if (/\.(bak(\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*)?)$/.test(name)) return true;
    if (/\.(old|orig|tmp|temp|swp|~)$/.test(name)) return true;
    if (/^\.DS_Store$|^Thumbs\.db$|^\.AppleDouble$|^\.Spotlight-V100$|^\.Trashes$|^desktop\.ini$/.test(name)) return true;
    try { if (fs.statSync(fp).size === 0) return true; } catch { }
    return false;
}

// Main
function main() {
    console.log('Running one-shot fix & clean...');
    const allFiles = walk(ROOT);
    const htmlFiles = allFiles.filter(f => f.toLowerCase().endsWith('.html'));
    const bakFiles = allFiles.filter(shouldDeleteFile);
    let cleaned = 0, fixed = 0, footers = 0, deleted = 0, emptydirs = 0;

    // Find About page footer
    let canonicalFooter = DEFAULT_FOOTER;
    const about = htmlFiles.find(isAboutPage);
    if (about) {
        try {
            const aboutHtml = fs.readFileSync(about, 'utf8');
            const ext = extractFooterFromHtml(aboutHtml);
            if (ext) {
                canonicalFooter = ext;
                console.log('Extracted canonical footer from:', path.relative(ROOT, about));
            }
        } catch { }
    }

    // Patch HTML files
    for (const fp of htmlFiles) {
        if (isAboutPage(fp)) continue;
        let html = fs.readFileSync(fp, 'utf8');
        const orig = html;

        html = stripOldAssetReferences(html);
        html = stripAllFooters(html);
        html = ensureLinkInHead(html, CSS_FILE);
        html = ensureScriptBeforeBody(html, JS_FILE);
        html = ensureScriptBeforeBody(html, EXPLORE_FILE);
        if (/<\/body>/i.test(html)) {
            html = html.replace(/<\/body>/i, `${canonicalFooter}\n</body>`);
        } else {
            html = html + `\n${canonicalFooter}\n`;
        }
        html = stripTrailingWhitespace(html);

        if (html !== orig) {
            const bak = fp + '.preclean.bak.' + nowStamp();
            fs.copyFileSync(fp, bak);
            fs.writeFileSync(fp, html, 'utf8');
            fixed++; footers++;
            console.log('Fixed/cleaned:', path.relative(ROOT, fp), 'backup->', path.relative(ROOT, bak));
        }
    }

    // Delete unwanted files
    for (const fp of bakFiles) {
        try {
            fs.unlinkSync(fp);
            deleted++;
            console.log('Removed:', path.relative(ROOT, fp));
        } catch { }
    }

    // Remove empty dirs
    cleanEmptyDirs(ROOT);
    emptydirs = 0;
    walk(ROOT).forEach(p => {
        if (fs.statSync(p).isDirectory() && fs.readdirSync(p).length === 0 && p !== ROOT) {
            fs.rmdirSync(p);
            emptydirs++;
            console.log('Removed empty dir:', path.relative(ROOT, p));
        }
    });

    // Summary
    console.log('\nAll done!');
    console.log(`HTML pages fixed: ${fixed}`);
    console.log(`Footers unified: ${footers}`);
    console.log(`Deleted extra/unwanted files: ${deleted}`);
    console.log(`Empty directories removed: ${emptydirs}`);
    console.log('You may now test your site. If any file looks wrong, restore the .preclean.bak.{timestamp} next to it.');
}

main();
