#!/usr/bin/env node
/**
 * Apply script: writes assets (css/js) and patches HTML files (backups).
 * - Replaces all <footer> blocks on every HTML page except About pages with the About page's footer (if found).
 * - Ensures assets/css/mobile-nav-final.css is linked in <head> once.
 * - Ensures assets/js/mobile-nav-final.js and assets/js/footer-explore.js are included once before </body> (defer).
 * - Creates timestamped .bak backups for edited HTML files.
 *
 * Run from project root:
 *   node fix-mobile-nav-final-apply-2.mjs
 *
 * Make a git commit or zip backup before running if you want.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const CSS_DIR = path.join(ROOT, 'assets', 'css');
const JS_DIR = path.join(ROOT, 'assets', 'js');

const CSS_FILE = 'assets/css/mobile-nav-final.css';
const JS_FILE = 'assets/js/mobile-nav-final.js';
const EXPLORE_FILE = 'assets/js/footer-explore.js';

// Default footer used if About page isn't available
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

// Helper utilities
function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site'].includes(e.name)) continue;
            walk(p, acc);
        } else {
            acc.push(p);
        }
    }
    return acc;
}
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Write provided asset files (content must match those you saved separately)
function writeAsset(filePath, content) {
    const abs = path.join(ROOT, filePath);
    ensureDir(path.dirname(abs));
    fs.writeFileSync(abs, content, 'utf8');
}

// Read the 'About' footer if present
function extractFooterFromHtml(html) {
    const m = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    return m ? m[0] : null;
}

function isAboutPage(fp) {
    const n = fp.replace(/\\/g, '/').toLowerCase();
    const bn = path.basename(n);
    if (bn === 'about.html' || n.endsWith('/about.html') || n.endsWith('/about/index.html')) return true;
    return false;
}

function ensureLinkInHead(html, href) {
    const needle = new RegExp('href\\s*=\\s*[\'"]' + escapeRegExp(href) + '[\'"]', 'i');
    if (needle.test(html)) return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, `$&\n  <link rel="stylesheet" href="${href}">`);
    return `<!doctype html>\n<head>\n  <link rel="stylesheet" href="${href}">\n</head>\n` + html;
}

function ensureScriptBeforeBody(html, src) {
    const needle = new RegExp('src\\s*=\\s*[\'"]' + escapeRegExp(src) + '[\'"]', 'i');
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
    // remove previous mobile-nav-final + footer-explore references to avoid duplicates
    html = html.replace(/<script[^>]+src=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']*footer-explore[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<link[^>]+href=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*/gi, '');
    return html;
}

function main() {
    console.log('Running patcher from:', ROOT);

    // Ensure assets folder exists
    ensureDir(path.join(ROOT, 'assets', 'js'));
    ensureDir(path.join(ROOT, 'assets', 'css'));

    // Write the three asset files with the content provided in the chat.
    const mobileJs = fs.readFileSync(path.join(process.cwd(), 'assets/js/mobile-nav-final.js'), 'utf8');
    const exploreJs = fs.readFileSync(path.join(process.cwd(), 'assets/js/footer-explore.js'), 'utf8');
    const mobileCss = fs.readFileSync(path.join(process.cwd(), 'assets/css/mobile-nav-final.css'), 'utf8');

    fs.writeFileSync(path.join(ROOT, JS_FILE), mobileJs, 'utf8');
    fs.writeFileSync(path.join(ROOT, EXPLORE_FILE), exploreJs, 'utf8');
    fs.writeFileSync(path.join(ROOT, CSS_FILE), mobileCss, 'utf8');

    console.log('Wrote/updated asset files:');
    console.log(' -', JS_FILE);
    console.log(' -', EXPLORE_FILE);
    console.log(' -', CSS_FILE);
    console.log('');

    const all = walk(ROOT).filter(f => f.toLowerCase().endsWith('.html'));
    if (!all.length) { console.log('No .html files found under project root. Aborting.'); return; }

    // find About page and extract its footer, else use default
    let canonicalFooter = DEFAULT_FOOTER;
    const about = all.find(isAboutPage);
    if (about) {
        try {
            const aboutHtml = fs.readFileSync(about, 'utf8');
            const ext = extractFooterFromHtml(aboutHtml);
            if (ext) {
                canonicalFooter = ext;
                console.log('Extracted footer from About page:', path.relative(ROOT, about));
            } else {
                console.log('About page found but no footer; using default canonical footer.');
            }
        } catch (e) { console.warn('Failed to read About page; using default footer.'); }
    } else {
        console.log('No About page detected; using default canonical footer.');
    }

    // patch each HTML (skip about)
    let modified = 0;
    for (const fp of all) {
        if (isAboutPage(fp)) continue;
        let html = fs.readFileSync(fp, 'utf8');
        const orig = html;

        // remove old asset refs to avoid duplicates
        html = stripOldAssetReferences(html);

        // remove all <footer> blocks
        html = stripAllFooters(html);

        // ensure CSS link in head
        html = ensureLinkInHead(html, CSS_FILE);

        // ensure scripts before body (we will add both but avoid duplication due to prior strip)
        html = ensureScriptBeforeBody(html, JS_FILE);
        html = ensureScriptBeforeBody(html, EXPLORE_FILE);

        // insert canonical footer just before </body>
        if (/<\/body>/i.test(html)) {
            html = html.replace(/<\/body>/i, `${canonicalFooter}\n</body>`);
        } else {
            html = html + `\n${canonicalFooter}\n`;
        }

        if (html !== orig) {
            const bak = fp + '.bak.' + nowStamp();
            fs.copyFileSync(fp, bak);
            fs.writeFileSync(fp, html, 'utf8');
            modified++;
            console.log('Patched:', path.relative(ROOT, fp), 'backup->', path.relative(ROOT, bak));
        }
    }

    console.log('');
    console.log('Done. HTML files patched:', modified);
    console.log('Check pages locally. If anything looks wrong, restore individual .bak files created next to each modified HTML.');
}

main();
