#!/usr/bin/env node
/**
 * Verbose apply script: writes assets, patches HTML pages, creates timestamped .bak backups,
 * prints the list of modified files and a small unified diff for each change.
 *
 * Usage:
 *   node fix-mobile-nav-final-apply-verbose.mjs
 *
 * Run from your project root. Node 14+ (16+ recommended).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const JS_DIR = path.join(ROOT, 'assets', 'js');
const CSS_DIR = path.join(ROOT, 'assets', 'css');

const CSS_MOBILE = 'mobile-nav-final.css';
const JS_MOBILE = 'mobile-nav-final.js';
const JS_EXPLORE = 'footer-explore.js';

function nowStamp() {
    const d = new Date();
    return d.toISOString().replace(/[:.]/g, '-');
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

function walk(dir, acc = []) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site'].includes(d.name)) continue;
            walk(p, acc);
        } else acc.push(p);
    }
    return acc;
}

function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* asset contents (same as earlier) */
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

/* helpers */
function stripOldMobileInjections(html) {
    return html
        .replace(/<script[^>]+src=["'][^"']*mobile-nav-(?:2025|final|fix|restore|clean)[^"']*["'][^>]*>\s*<\/script>/gi, '')
        .replace(/<link[^>]+href=["'][^"']*mobile-nav-(?:2025|final|fix|restore|clean)[^"']*["'][^>]*>\s*/gi, '');
}
function stripAllFooters(html) {
    return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
}
function removeOldFooterScripts(html) {
    html = html.replace(/<script[^>]*id=["']mpl-footer-menu-js-v3["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*id=["']mpl-theme-auto-js-v3["'][^>]*>[\s\S]*?<\/script>/gi, '');
    return html;
}

function ensureLinkTag(html, href) {
    const needle = new RegExp('href\\s*=\\s*[\'"]' + escapeRegExp(href) + '[\'"]', 'i');
    if (needle.test(html)) return html;
    if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `  <link rel="stylesheet" href="${href}">\n</head>`);
    if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, `$&\n  <link rel="stylesheet" href="${href}">`);
    return `<!doctype html>\n<head>\n  <link rel="stylesheet" href="${href}">\n</head>\n` + html;
}
function ensureScriptDefer(html, src) {
    const needle = new RegExp('src\\s*=\\s*[\'"]' + escapeRegExp(src) + '[\'"]', 'i');
    if (needle.test(html)) return html;
    const tag = `<script defer src="${src}"></script>`;
    if (/<\/body>\s*<\/html>/i.test(html)) return html.replace(/<\/body>\s*<\/html>/i, `${tag}\n</body>\n</html>`);
    if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}\n</body>`);
    return html + `\n${tag}\n`;
}

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

/* write asset files */
function writeMobileCss() {
    ensureDir(CSS_DIR);
    const css = `/* Mobile nav final — scoped */
@media (max-width:1024px){
  header.site-header #mainNav[hidden],
  header.site-header .menu[hidden],
  header.site-header .submenu[hidden],
  header.site-header ul[hidden]{display:none!important}

  header.site-header #navToggle,
  header.site-header .nav-toggle{
    position:relative; z-index:10010;
    -webkit-tap-highlight-color:transparent;
  }

  header.site-header .mnav-subwrap{overflow:hidden;max-height:0;transition:max-height .25s ease;will-change:max-height}
  header.site-header .mnav-subwrap.is-open{max-height:100vh}

  header.site-header .mnav-chevron{
    background:none;border:0;cursor:pointer;padding:.5rem;margin-left:.25rem;
    display:inline-flex;align-items:center;justify-content:center;line-height:1
  }
  header.site-header .mnav-chevron svg{width:16px;height:16px;transition:transform .18s ease}
  header.site-header .mnav-chevron[aria-expanded="true"] svg{transform:rotate(180deg)}
}
@media (min-width:1025px){ #navToggle{display:none!important} }
`;
    fs.writeFileSync(path.join(CSS_DIR, CSS_MOBILE), css, 'utf8');
}

function writeMobileJs() {
    ensureDir(JS_DIR);
    const js = `/* Mobile nav runtime (idempotent) */
(function(){
  if (!document.querySelector || !window.matchMedia) return;
  const mql = window.matchMedia('(max-width:1024px)');
  const header = document.querySelector('header.site-header') || document.querySelector('header');
  if (!header || header.dataset.mplMobileInit === '1') return;
  header.dataset.mplMobileInit = '1';

  const nav = header.querySelector('#mainNav') || header.querySelector('nav.main-nav') || header.querySelector('nav');
  const oldBtn = header.querySelector('#navToggle') || header.querySelector('.nav-toggle') || header.querySelector('[data-menu-toggle]') || header.querySelector('button[aria-controls="mainNav"]');
  if (!nav || !oldBtn) return;

  function clearOverlays(){
    document.documentElement.classList.remove('nav-open','menu-open','overlay-open','drawer-open');
    document.body.classList.remove('nav-open','menu-open','overlay-open','drawer-open','no-scroll','modal-open');
    document.querySelectorAll('.overlay,[data-overlay],.backdrop,.drawer,.drawer-backdrop').forEach(el=>{
      try{ if (getComputedStyle(el).position !== 'static') el.style.display = ''; }catch(e){}
    });
  }

  const btn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(btn, oldBtn);

  function onEsc(e){ if (e.key === 'Escape') closeNav(); }
  function openNav(){
    if (!mql.matches) return;
    clearOverlays();
    nav.hidden = false;
    nav.style.display = '';
    btn.setAttribute('aria-expanded','true');
    document.addEventListener('keydown', onEsc, true);
  }
  function closeNav(){
    nav.hidden = true;
    nav.style.display = '';
    btn.setAttribute('aria-expanded','false');
    document.removeEventListener('keydown', onEsc, true);
    if (mql.matches){
      nav.querySelectorAll('.mnav-subwrap').forEach(w => w.classList.remove('is-open'));
      nav.querySelectorAll('.menu, .submenu, ul').forEach(sub => sub.hidden = true);
      nav.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded','false'));
    }
  }
  function toggleNav(e){
    if (!mql.matches) return;
    if (e){ e.preventDefault(); e.stopImmediatePropagation(); }
    const isHidden = (nav.hidden === true) || nav.hasAttribute('hidden');
    if (isHidden) openNav(); else closeNav();
  }

  ['click','touchstart'].forEach(t => btn.addEventListener(t, toggleNav, true));
  btn.addEventListener('keydown', e => {
    if (!mql.matches) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNav(e); }
  }, true);

  function initSubmenus(){
    const groups = Array.from(nav.querySelectorAll('.nav-group, .menu-group, :scope > ul > li'));
    let idx = 0;

    groups.forEach(group=>{
      const origTrigger = group.querySelector(':scope > .nav-button, :scope > .menu-toggle, :scope > a, :scope > button');
      const submenu     = group.querySelector(':scope > .menu, :scope > .submenu, :scope > ul, :scope > .dropdown-menu, :scope > ol');
      if (!origTrigger || !submenu) return;

      const trigger = origTrigger.cloneNode(true);
      origTrigger.parentNode.replaceChild(trigger, origTrigger);

      let wrap = group.querySelector(':scope > .mnav-subwrap');
      if (!wrap){
        wrap = document.createElement('div');
        wrap.className = 'mnav-subwrap';
        group.insertBefore(wrap, submenu);
        wrap.appendChild(submenu);
      }

      if (!submenu.id) submenu.id = 'sub-'+(++idx)+'-'+Math.random().toString(36).slice(2);
      trigger.setAttribute('aria-controls', submenu.id);
      trigger.setAttribute('aria-expanded','false');

      let chev = group.querySelector(':scope > .mnav-chevron');
      if (!chev){
        chev = document.createElement('button');
        chev.type = 'button';
        chev.className = 'mnav-chevron';
        chev.setAttribute('aria-label','Toggle submenu');
        chev.setAttribute('aria-expanded','false');
        chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        trigger.insertAdjacentElement('afterend', chev);
      }

      function openSub(){ submenu.hidden=false; wrap.classList.add('is-open'); trigger.setAttribute('aria-expanded','true'); chev.setAttribute('aria-expanded','true'); }
      function closeSub(){ submenu.hidden=true;  wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); chev.setAttribute('aria-expanded','false'); }
      function toggleSub(e){
        if (!mql.matches) return;
        if (e){ e.preventDefault(); e.stopImmediatePropagation(); }
        const isHidden = (submenu.hidden === true) || submenu.hasAttribute('hidden');
        if (isHidden) openSub(); else closeSub();
      }
      const keyToggle = e => { if (!mql.matches) return; if (e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleSub(e); } };

      ['click','touchstart'].forEach(t => { trigger.addEventListener(t, toggleSub, true); chev.addEventListener(t, toggleSub, true); });
      trigger.addEventListener('keydown', keyToggle, true);

      if (mql.matches){ submenu.hidden=true;  wrap.classList.remove('is-open'); }
      else            { submenu.hidden=false; wrap.classList.remove('is-open'); }
    });
  }

  function onChange(){
    if (mql.matches){
      nav.hidden = true;
      btn.setAttribute('aria-expanded','false');
      nav.querySelectorAll('.menu, .submenu, ul').forEach(sub => sub.hidden = true);
      nav.querySelectorAll('.mnav-subwrap').forEach(w => w.classList.remove('is-open'));
    } else {
      nav.hidden = false;
      btn.setAttribute('aria-expanded','false');
      nav.querySelectorAll('.menu, .submenu, ul').forEach(sub => sub.hidden = false);
      nav.querySelectorAll('.mnav-subwrap').forEach(w => w.classList.remove('is-open'));
    }
    clearOverlays();
  }

  const init = () => {
    if (mql.matches){
      nav.hidden = true;
      nav.querySelectorAll('.menu, .submenu, ul').forEach(sub => sub.hidden = true);
    } else {
      nav.hidden = false;
      nav.querySelectorAll('.menu, .submenu, ul').forEach(sub => sub.hidden = false);
    }
    initSubmenus();
  };

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  if (mql.addEventListener) mql.addEventListener('change', onChange); else if (mql.addListener) mql.addListener(onChange);
})();
`;
    fs.writeFileSync(path.join(JS_DIR, JS_MOBILE), js, 'utf8');
}

function writeFooterExploreJs() {
    ensureDir(JS_DIR);
    const js = `/* Build the Explore accordion in the global footer from header nav */
(function(){
  function q(sel,ctx=document){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function findSubmenu(el){ return el && (el.querySelector(':scope > .menu, :scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol')); }
  function topNavGroups(){
    const nav = document.getElementById('mainNav') || document.querySelector('header nav') || document.querySelector('nav[role="navigation"]') || document.querySelector('nav.main-nav');
    if (!nav) return [];
    const groups = [];
    q(':scope > .nav-group, :scope > .menu-group, :scope > ul > li', nav).forEach(node=>{
      const sub = findSubmenu(node); if (sub) groups.push(node);
    });
    return groups;
  }
  function mount(){
    const host = document.getElementById('mpl-footer-explore');
    if (!host || host.__mplBuilt) return; host.__mplBuilt = true;
    const groups = topNavGroups();
    if (!groups.length){ host.style.display='none'; return; }
    host.innerHTML = '';
    function closeOthers(except){
      q('.mpl-footer-toggle[aria-expanded="true"]', host).forEach(btn=>{
        if (btn===except) return;
        btn.setAttribute('aria-expanded','false');
        const nxt = btn.nextElementSibling; if (nxt) nxt.style.display='none';
      });
    }
    groups.forEach((g,idx)=>{
      const sec = document.createElement('section');
      const btn = document.createElement('button');
      btn.type='button'; btn.className='mpl-footer-toggle'; btn.setAttribute('aria-expanded','false');
      const labelNode = g.querySelector(':scope > .nav-button, :scope > .menu-toggle, :scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
      const labelText = (labelNode && (labelNode.textContent||'').trim()) || ('Menu '+(idx+1));
      btn.innerHTML = labelText + ' <span aria-hidden="true">▾</span>';

      const list = document.createElement('ul'); list.setAttribute('data-mpl-footer-list',''); list.style.display='none';
      const submenu = findSubmenu(g);
      if (submenu){
        q('a[href], [data-href]', submenu).forEach(a=>{
          const href = a.getAttribute('href') || a.getAttribute('data-href') || '#';
          const text = (a.textContent||'').trim() || href;
          const li = document.createElement('li'); const link = document.createElement('a'); link.href=href; link.textContent=text;
          li.appendChild(link); list.appendChild(li);
        });
      }

      const toggle = () => {
        const open = btn.getAttribute('aria-expanded')==='true';
        closeOthers(btn);
        btn.setAttribute('aria-expanded', String(!open));
        list.style.display = open ? 'none' : '';
      };
      btn.addEventListener('click', toggle);
      btn.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } if(e.key==='Escape'){ btn.setAttribute('aria-expanded','false'); list.style.display='none'; btn.focus(); } });

      sec.appendChild(btn); sec.appendChild(list); host.appendChild(sec);
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
`;
    fs.writeFileSync(path.join(JS_DIR, JS_EXPLORE), js, 'utf8');
}

/* produce a small unified diff between old and new content */
function unifiedDiff(oldStr, newStr, aPath, bPath) {
    const oldLines = oldStr.split(/\r?\n/);
    const newLines = newStr.split(/\r?\n/);
    const diffs = [];
    diffs.push(`--- ${aPath}`);
    diffs.push(`+++ ${bPath}`);
    const max = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < max; i++) {
        const o = oldLines[i] ?? '';
        const n = newLines[i] ?? '';
        if (o !== n) {
            diffs.push(`@@ line ${i + 1}`);
            diffs.push(`- ${o}`);
            diffs.push(`+ ${n}`);
        }
    }
    return diffs.join('\n');
}

/* patch a single HTML file, returns {changed, beforeHash, afterHash, diff} */
function patchHtmlVerbose(fp, footerHtml) {
    let html;
    try { html = fs.readFileSync(fp, 'utf8'); } catch (e) { return { error: e.message }; }
    const before = html;

    html = stripOldMobileInjections(html);
    html = removeOldFooterScripts(html);

    const footerCssPath = 'assets/css/footer-2025.css';
    if (fs.existsSync(path.join(ROOT, footerCssPath))) html = ensureLinkTag(html, footerCssPath);

    html = ensureLinkTag(html, `assets/css/${CSS_MOBILE}`);
    html = ensureScriptDefer(html, `assets/js/${JS_MOBILE}`);

    html = stripAllFooters(html);
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${footerHtml}\n</body>`);
    else html += `\n${footerHtml}\n`;

    html = ensureScriptDefer(html, `assets/js/${JS_EXPLORE}`);

    if (html === before) return { changed: false };

    // backup with timestamp
    const bak = fp + '.bak.' + nowStamp();
    fs.copyFileSync(fp, bak);

    // write new content
    fs.writeFileSync(fp, html, 'utf8');

    // produce diff
    const diff = unifiedDiff(before, html, fp + '.orig', fp);
    return { changed: true, bak, diff };
}

/* main */
function main() {
    console.log('Working directory:', ROOT);
    console.log('Node version:', process.version);
    writeMobileCss();
    writeMobileJs();
    writeFooterExploreJs();
    console.log('Wrote asset files (or updated them):');
    console.log('  -', path.join('assets', 'css', CSS_MOBILE));
    console.log('  -', path.join('assets', 'js', JS_MOBILE));
    console.log('  -', path.join('assets', 'js', JS_EXPLORE));
    console.log('');

    const allFiles = walk(ROOT);
    const htmlFiles = allFiles.filter(p => p.toLowerCase().endsWith('.html'));
    if (!htmlFiles.length) {
        console.log('No .html files found under project root. Nothing to patch.');
        return;
    }

    // find an About page and extract footer if present
    const aboutFile = htmlFiles.find(fp => {
        const bn = path.basename(fp).toLowerCase();
        const p = fp.replace(/\\/g, '/').toLowerCase();
        return bn === 'about.html' || p.endsWith('/about.html') || p.endsWith('/about/index.html');
    });

    let footerHtml = DEFAULT_FOOTER;
    if (aboutFile) {
        try {
            const content = fs.readFileSync(aboutFile, 'utf8');
            const ext = extractFooterFromHtml(content);
            if (ext) { footerHtml = ext; console.log('Using footer extracted from', path.relative(ROOT, aboutFile)); }
            else { console.log('About page found, but no <footer> block detected; using default footer.'); }
        } catch (e) { console.warn('Could not read About page; using default footer:', e.message); }
    } else {
        console.log('No About page found; using default footer.');
    }
    console.log('');

    const results = [];
    for (const fp of htmlFiles) {
        if (isAboutPage(fp)) { results.push({ file: fp, skipped: true }); continue; }
        const res = patchHtmlVerbose(fp, footerHtml);
        results.push({ file: fp, ...res });
    }

    // report
    const modified = results.filter(r => r.changed);
    const skipped = results.filter(r => r.skipped);
    const errors = results.filter(r => r.error);

    console.log('--- Patch summary ---');
    console.log('Total HTML files scanned:', htmlFiles.length);
    console.log('Files skipped (About):', skipped.length);
    console.log('Files modified:', modified.length);
    console.log('Files with errors:', errors.length);
    console.log('');

    if (modified.length) {
        console.log('Modified files and diffs:');
        for (const m of modified) {
            console.log('---', path.relative(ROOT, m.file));
            console.log('Backup created:', m.bak);
            console.log(m.diff);
            console.log('');
        }
    } else {
        console.log('No HTML files required modification (maybe they already had the canonical footer and assets).');
    }

    if (errors.length) {
        console.log('Errors encountered:');
        for (const e of errors) console.log(' -', path.relative(ROOT, e.file), e.error);
    }

    console.log('Done.');
}

main();
