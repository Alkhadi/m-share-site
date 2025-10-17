#!/usr/bin/env node
/**
 * fix-mobile-nav-final-dryrun.mjs
 *
 * Dry-run scanner for the "fix-mobile-nav-final" patch.
 * This script DOES NOT write any files. It only reports what WOULD be changed:
 *  - assets/css/mobile-nav-final.css (would be created)
 *  - assets/js/mobile-nav-final.js (would be created)
 *  - assets/js/footer-explore.js (would be created)
 *  - which .html pages would be modified and why (links/scripts inserted, existing footers removed, footer inserted)
 *
 * Usage:
 *   node fix-mobile-nav-final-dryrun.mjs
 *
 * Node: 14+ (16+ recommended)
 *
 * Notes:
 *  - The dry run follows the same detection logic the real patch would use:
 *    it looks for an About page and attempts to extract its <footer>…</footer> to be used as the canonical footer.
 *  - No files are written or modified by this script.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const JS_DIR = path.join(ROOT, 'assets', 'js');
const CSS_DIR = path.join(ROOT, 'assets', 'css');

const CSS_MOBILE  = 'mobile-nav-final.css';
const JS_MOBILE   = 'mobile-nav-final.js';
const JS_EXPLORE  = 'footer-explore.js';

const DEFAULT_FOOTER = String.raw`  <footer id="footer2025" class="footer-2025 mpl-footer-v3">
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
  for (const d of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['.git','node_modules','dist','build','_backup','_site'].includes(d.name)) continue;
      walk(p, acc);
    } else acc.push(p);
  }
  return acc;
}

function escapeRegExp(str){
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripOldMobileInjections(html){
  return html
    .replace(/<script[^>]+src=["'][^"']*mobile-nav-(?:2025|final|fix|restore|clean)[^"']*["'][^>]*>\s*<\/script>/gi, '')
    .replace(/<link[^>]+href=["'][^"']*mobile-nav-(?:2025|final|fix|restore|clean)[^"']*["'][^>]*>\s*/gi, '');
}

function stripAllFooters(html){
  return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
}

function removeOldFooterScripts(html){
  html = html.replace(/<script[^>]*id=["']mpl-footer-menu-js-v3["'][^>]*>[\s\S]*?<\/script>/gi,'');
  html = html.replace(/<script[^>]*id=["']mpl-theme-auto-js-v3["'][^>]*>[\s\S]*?<\/script>/gi,'');
  return html;
}

function ensureLinkTagPreview(html, href){
  const needle = new RegExp('href\\s*=\\s*[\'"]' + escapeRegExp(href) + '[\'"]', 'i');
  if (needle.test(html)) return {changed:false, html};
  if (/<\/head>/i.test(html)) return {changed:true, html: html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`)};
  if (/<head[^>]*>/i.test(html)) return {changed:true, html: html.replace(/<head[^>]*>/i, `$&\n  <link rel="stylesheet" href="${href}">`)};
  return {changed:true, html: `<!doctype html>\n<head>\n  <link rel="stylesheet" href="${href}">\n</head>\n` + html};
}

function ensureScriptDeferPreview(html, src){
  const needle = new RegExp('src\\s*=\\s*[\'"]' + escapeRegExp(src) + '[\'"]', 'i');
  if (needle.test(html)) return {changed:false, html};
  const tag = `<script defer src="${src}"></script>`;
  if (/<\/body>\s*<\/html>/i.test(html)) return {changed:true, html: html.replace(/<\/body>\s*<\/html>/i, `${tag}\n</body>\n</html>`)};
  if (/<\/body>/i.test(html)) return {changed:true, html: html.replace(/<\/body>/i, `${tag}\n</body>`)};
  return {changed:true, html: html + `\n${tag}\n`};
}

function isAboutPage(fp){
  const n = fp.replace(/\\/g, '/').toLowerCase();
  const bn = path.basename(n);
  if (bn === 'about.html' || n.endsWith('/about.html') || n.endsWith('/about/index.html')) return true;
  return false;
}

function extractFooterFromHtml(html){
  const m = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
  return m ? m[0] : null;
}

/* Dry-run patch simulation for a single file: returns an object describing changes */
function simulatePatchHtml(fp, footerHtml){
  const info = { file: fp, exists: true, willModify: false, reasons: [] };
  let html;
  try { html = fs.readFileSync(fp, 'utf8'); } catch (e){ info.exists=false; info.error = e.message; return info; }

  const before = html;

  // 0) Clean conflicting injections (preview)
  const cleaned = stripOldMobileInjections(html);
  if (cleaned !== html){ info.willModify = true; info.reasons.push('remove old mobile-nav injections'); html = cleaned; }

  const cleaned2 = removeOldFooterScripts(html);
  if (cleaned2 !== html){ info.willModify = true; info.reasons.push('remove old footer-related inline scripts'); html = cleaned2; }

  // 1) Footer CSS (only flag, do not assume present)
  const footerCssPath = 'assets/css/footer-2025.css';
  if (fs.existsSync(path.join(ROOT, footerCssPath))) {
    const res = ensureLinkTagPreview(html, footerCssPath);
    if (res.changed){ info.willModify = true; info.reasons.push(`insert link to ${footerCssPath}`); html = res.html; }
  }

  // 2) Ensure mobile CSS & JS
  let res = ensureLinkTagPreview(html, `assets/css/${CSS_MOBILE}`);
  if (res.changed){ info.willModify = true; info.reasons.push(`insert link to assets/css/${CSS_MOBILE}`); html = res.html; }

  res = ensureScriptDeferPreview(html, `assets/js/${JS_MOBILE}`);
  if (res.changed){ info.willModify = true; info.reasons.push(`insert script defer to assets/js/${JS_MOBILE}`); html = res.html; }

  // 3) Remove ALL footers and insert canonical footer
  const withoutFooters = stripAllFooters(html);
  if (withoutFooters !== html){ info.willModify = true; info.reasons.push('remove existing <footer> blocks'); html = withoutFooters; }
  // In simulation always plan to insert footerHtml before </body> (or append)
  if (/<\/body>/i.test(html)){
    const newHtml = html.replace(/<\/body>/i, `${footerHtml}\n</body>`);
    if (newHtml !== html){ info.willModify = true; info.reasons.push('insert canonical footer before </body>'); html = newHtml; }
  } else {
    const newHtml = html + `\n${footerHtml}\n`;
    if (newHtml !== html){ info.willModify = true; info.reasons.push('append canonical footer at EOF'); html = newHtml; }
  }

  // 4) Ensure footer explore script
  res = ensureScriptDeferPreview(html, `assets/js/${JS_EXPLORE}`);
  if (res.changed){ info.willModify = true; info.reasons.push(`insert script defer to assets/js/${JS_EXPLORE}`); html = res.html; }

  info.previewReasons = info.reasons.slice();
  info.previewSummary = info.reasons.length ? info.reasons.join('; ') : 'no changes detected';
  return info;
}

function main(){
  const allFiles = walk(ROOT);
  const htmlFiles = allFiles.filter(p => p.toLowerCase().endsWith('.html'));

  // find About page among html files
  const aboutFile = htmlFiles.find(fp => {
    const bn = path.basename(fp).toLowerCase();
    const p = fp.replace(/\\/g, '/').toLowerCase();
    return bn === 'about.html' || p.endsWith('/about.html') || p.endsWith('/about/index.html');
  });

  let footerHtml = DEFAULT_FOOTER;
  if (aboutFile && fs.existsSync(aboutFile)) {
    try {
      const aboutContent = fs.readFileSync(aboutFile, 'utf8');
      const extracted = extractFooterFromHtml(aboutContent);
      if (extracted) {
        footerHtml = extracted;
        console.log('ℹ Using footer extracted from:', path.relative(ROOT, aboutFile));
      } else {
        console.log('ℹ About file found but no <footer> block detected; dry-run will use default embedded footer.');
      }
    } catch (e) {
      console.warn('⚠ Could not read About file; dry-run will use default footer:', e.message);
    }
  } else {
    console.log('ℹ No About file detected; dry-run will use default embedded footer.');
  }

  // Assets that would be created
  const wouldCreate = [
    path.join('assets','css', CSS_MOBILE),
    path.join('assets','js', JS_MOBILE),
    path.join('assets','js', JS_EXPLORE)
  ];

  console.log('--- DRY RUN: planned asset files (would be created) ---');
  wouldCreate.forEach(p => console.log('  •', p));
  console.log('');

  const results = [];
  let wouldModifyCount = 0;
  htmlFiles.forEach(fp => {
    if (isAboutPage(fp)) {
      results.push({ file: fp, about: true, willModify: false, summary: 'About page — skipped' });
      return;
    }
    const sim = simulatePatchHtml(fp, footerHtml);
    if (sim.willModify) wouldModifyCount++;
    results.push({ file: fp, about: false, willModify: sim.willModify, reasons: sim.previewReasons || [], error: sim.error || null });
  });

  console.log('--- DRY RUN: HTML files scan results ---');
  results.forEach(r => {
    const rel = path.relative(ROOT, r.file);
    if (r.about) {
      console.log(`SKIP : ${rel}   (About page)`);
    } else if (r.error) {
      console.log(`ERROR: ${rel}   (${r.error})`);
    } else if (r.willModify) {
      console.log(`MODIF: ${rel}   -> would be updated: ${r.reasons.join('; ')}`);
    } else {
      console.log(`OK   : ${rel}   -> no changes needed`);
    }
  });

  console.log('');
  console.log(`Summary: ${wouldCreate.length} asset files would be created; ${wouldModifyCount} HTML files would be modified (About pages skipped).`);
  console.log('No files were written. This was a dry run.');
  console.log('To apply changes, run the real script (the non-dry-run version). Reply "apply" if you want a version that writes and makes backups, or "write-no-backup" to write directly.');
}

main();