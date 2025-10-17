#!/usr/bin/env node
/**
 * M Share — One-shot FIX + CLEAN script
 *
 * What this does:
 *  - Writes/updates mobile-nav assets:
 *      assets/css/mobile-nav-final.css
 *      assets/js/mobile-nav-final.js
 *      assets/js/footer-explore.js
 *  - Replaces ALL <footer>…</footer> blocks on every HTML page (except About page) with the About page’s footer.
 *    If About has no footer, uses a safe default footer.
 *  - Removes duplicate/legacy footer injections by stripping <script src="assets/footer/footer.js"> (if present).
 *  - Ensures mobile CSS in <head> once and mobile/footer scripts deferred before </body> once.
 *  - Deletes unnecessary files: *.bak, *.old, *.orig, *.tmp, *.swp, .DS_Store, Thumbs.db, zero-byte files.
 *  - Removes empty directories after cleanup.
 *  - Creates per-file backups of modified HTML files: *.onefix.bak.YYYY-MM-DDTHH-MM-SSZ
 *
 * Safety:
 *  - HTML backups are created for every modified file.
 *  - Use --dry-run to preview without writing changes.
 *
 * Usage:
 *    node mshare-one-shot-fix-and-clean.mjs
 *    node mshare-one-shot-fix-and-clean.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';

// --------------------------------------------------
// Configuration and embedded asset contents
// --------------------------------------------------

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');

const CSS_PATH = 'assets/css/mobile-nav-final.css';
const JS_MOBILE = 'assets/js/mobile-nav-final.js';
const JS_EXPLORE = 'assets/js/footer-explore.js';

const EMBED_CSS = `/* Mobile nav final — scoped to header.site-header */
@media (max-width:1024px){
  header.site-header #mainNav[hidden],
  header.site-header .menu[hidden],
  header.site-header .submenu[hidden],
  header.site-header ul[hidden] { display:none!important; }

  header.site-header #navToggle,
  header.site-header .nav-toggle {
    position: relative;
    z-index: 10010;
    -webkit-tap-highlight-color: transparent;
  }

  /* wrap for submenu with smooth max-height animation */
  header.site-header .mnav-subwrap {
    overflow: hidden;
    max-height: 0;
    transition: max-height .24s ease;
  }
  header.site-header .mnav-subwrap.is-open {
    max-height: 2000px; /* large enough to show content */
  }

  /* chevron */
  header.site-header .mnav-chevron {
    background: none;
    border: 0;
    cursor: pointer;
    padding: .25rem;
    margin-left: .4rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  header.site-header .mnav-chevron svg { width: 16px; height: 16px; transition: transform .18s ease; }
  header.site-header .mnav-chevron[aria-expanded="true"] svg { transform: rotate(180deg); }

  /* ensure nav groups are block level on mobile */
  header.site-header .menu-group,
  header.site-header .nav-group {
    display: block;
    width: 100%;
  }

  header.site-header nav.main-nav {
    background: inherit;
    padding: .5rem 0;
  }

  /* hide default submenu when closed */
  header.site-header .submenu { display: block; }
  header.site-header .submenu[hidden] { display: none !important; }
}

/* Desktop: hide mobile toggle */
@media (min-width:1025px){
  #navToggle { display: none !important; }
}
`;

const EMBED_JS_MOBILE = `/* Mobile nav/runtime — idempotent, accessible, vanilla JS */
(function () {
  if (!('querySelector' in document) || !('addEventListener' in window)) return;
  const header = document.querySelector('header.site-header') || document.querySelector('header');
  if (!header || header.dataset.mplMobileNavInit === '1') return;
  header.dataset.mplMobileNavInit = '1';

  let nav = header.querySelector('#mainNav') || header.querySelector('nav.main-nav') || header.querySelector('nav');
  let toggle = header.querySelector('#navToggle') || header.querySelector('.nav-toggle') || header.querySelector('[data-menu-toggle]') || header.querySelector('button[aria-controls="mainNav"]');
  if (!nav || !toggle) return;

  if (!nav.id) nav.id = 'mainNav';
  toggle.setAttribute('aria-controls', nav.id);

  const mql = window.matchMedia('(max-width:1024px)');

  function clearLegacyOverlays() {
    document.documentElement.classList.remove('nav-open','menu-open','overlay-open','drawer-open');
    document.body.classList.remove('nav-open','menu-open','overlay-open','drawer-open','no-scroll','modal-open');
    document.querySelectorAll('.overlay,[data-overlay],.backdrop,.drawer,.drawer-backdrop').forEach(el=>{
      try { el.style.display = ''; } catch(e){}
    });
  }
  function setBodyLocked(locked) {
    document.body.classList.toggle('mpl-mobile-nav-open', !!locked);
  }

  function onEsc(e){ if (e.key === 'Escape'){ closeNav(); toggle.focus(); } }
  function onOutside(e){ if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav(); }

  function openNav(){
    if (!mql.matches) return;
    clearLegacyOverlays();
    nav.hidden = false; nav.style.display = '';
    toggle.setAttribute('aria-expanded','true');
    setBodyLocked(true);
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('click', onOutside, true);
  }
  function closeNav(){
    nav.hidden = true; nav.style.display = '';
    toggle.setAttribute('aria-expanded','false');
    setBodyLocked(false);
    document.removeEventListener('keydown', onEsc, true);
    document.removeEventListener('click', onOutside, true);
    if (mql.matches){
      nav.querySelectorAll('.mnav-subwrap').forEach(w => w.classList.remove('is-open'));
      nav.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded','false'));
      nav.querySelectorAll('.menu, .submenu, ul').forEach(s => s.hidden = true);
    }
  }
  function toggleNav(e){
    if (!mql.matches) return;
    if (e){ e.preventDefault(); e.stopPropagation(); }
    const isHidden = nav.hidden === true || nav.hasAttribute('hidden');
    if (isHidden) openNav(); else closeNav();
  }

  // Refresh toggle to remove legacy listeners
  try {
    const fresh = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(fresh, toggle);
    toggle = fresh;
    toggle.setAttribute('aria-controls', nav.id);
  } catch(e){}

  // Submenus on mobile
  function initSubmenus(){
    const groups = Array.from(nav.querySelectorAll('.nav-group, .menu-group, :scope > ul > li'));
    let idx = 0;
    groups.forEach(group=>{
      const submenu = group.querySelector(':scope > .menu, :scope > .submenu, :scope > ul, :scope > .dropdown-menu, :scope > ol');
      if (!submenu) return;
      let trigger = group.querySelector(':scope > .menu-toggle, :scope > .nav-button, :scope > a, :scope > button');
      if (!trigger) {
        trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'mnav-created-trigger';
        trigger.style.display = 'none';
        group.insertBefore(trigger, submenu);
      } else {
        try {
          const c = trigger.cloneNode(true);
          trigger.parentNode.replaceChild(c, trigger);
          trigger = c;
        } catch(e){}
      }
      let wrap = group.querySelector(':scope > .mnav-subwrap');
      if (!wrap){
        wrap = document.createElement('div');
        wrap.className = 'mnav-subwrap';
        group.insertBefore(wrap, submenu);
        wrap.appendChild(submenu);
      }
      if (!submenu.id) submenu.id = 'mpl-sub-' + (++idx) + '-' + Math.random().toString(36).slice(2);
      trigger.setAttribute('aria-controls', submenu.id);
      trigger.setAttribute('aria-expanded','false');

      let chev = group.querySelector(':scope > .mnav-chevron');
      if (!chev){
        chev = document.createElement('button');
        chev.type = 'button';
        chev.className = 'mnav-chevron';
        chev.setAttribute('aria-label','Toggle submenu');
        chev.setAttribute('aria-expanded','false');
        chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (trigger.nextSibling) trigger.parentNode.insertBefore(chev, trigger.nextSibling);
        else group.appendChild(chev);
      }

      function openSub(){ submenu.hidden=false; wrap.classList.add('is-open'); trigger.setAttribute('aria-expanded','true'); chev.setAttribute('aria-expanded','true'); }
      function closeSub(){ submenu.hidden=true;  wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); chev.setAttribute('aria-expanded','false'); }
      function t(e){ if (!mql.matches) return; if (e){ e.preventDefault(); e.stopPropagation(); } const h = submenu.hidden === true || submenu.hasAttribute('hidden'); h?openSub():closeSub(); }

      ['click','touchstart'].forEach(tg => { trigger.addEventListener(tg, t, {capture:true}); chev.addEventListener(tg, t, {capture:true}); });
      trigger.addEventListener('keydown', e => { if (!mql.matches) return; if (e.key==='Enter'||e.key===' '){ e.preventDefault(); t(e); } }, {capture:true});

      if (mql.matches) closeSub(); else openSub();
    });
  }

  function setResponsive(){
    if (mql.matches){
      nav.hidden = true;
      nav.querySelectorAll('.menu, .submenu, ul').forEach(s => s.hidden = true);
      toggle.setAttribute('aria-expanded','false');
    } else {
      nav.hidden = false;
      nav.querySelectorAll('.menu, .submenu, ul').forEach(s => s.hidden = false);
      toggle.setAttribute('aria-expanded','false');
    }
  }

  toggle.addEventListener('click', toggleNav, {capture:true});
  toggle.addEventListener('touchstart', toggleNav, {capture:true});
  toggle.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); toggleNav(e); } }, {capture:true});

  const onBreak = () => { setResponsive(); initSubmenus(); };
  if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onBreak);
  else if (typeof mql.addListener === 'function') mql.addListener(onBreak);

  setResponsive();
  initSubmenus();
})();
`;

const EMBED_JS_EXPLORE = `/* Build the Explore accordion in the global footer from header nav (idempotent) */
(function () {
  if (!document.querySelector) return;
  const BUILT = 'mplFooterExploreBuiltV2';
  function q(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }
  function findSub(node){ return node && node.querySelector(':scope > .menu, :scope > .submenu, :scope > ul, :scope > ol, :scope > .dropdown-menu'); }
  function topGroups(){
    const nav = document.getElementById('mainNav') || document.querySelector('header nav') || document.querySelector('nav[role="navigation"]') || document.querySelector('nav.main-nav');
    if (!nav) return [];
    const groups = [];
    q(':scope > .nav-group, :scope > .menu-group, :scope > ul > li', nav).forEach(node => { if (findSub(node)) groups.push(node); });
    return groups;
  }
  function mount(){
    const host = document.getElementById('mpl-footer-explore');
    if (!host || host[BUILT]) return; host[BUILT] = true;
    const groups = topGroups();
    if (!groups.length){ host.style.display='none'; return; }
    host.innerHTML = '';
    function closeOthers(except){
      q('.mpl-footer-toggle[aria-expanded="true"]', host).forEach(btn=>{
        if (btn===except) return;
        btn.setAttribute('aria-expanded','false');
        const nxt=btn.nextElementSibling; if (nxt) nxt.style.display='none';
      });
    }
    groups.forEach((g, i)=>{
      const sec=document.createElement('section');
      const btn=document.createElement('button'); btn.type='button'; btn.className='mpl-footer-toggle'; btn.setAttribute('aria-expanded','false');
      const labelNode = g.querySelector(':scope > .nav-button, :scope > .menu-toggle, :scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
      const labelText = (labelNode && (labelNode.textContent||'').trim()) || ('Menu '+(i+1));
      btn.innerHTML = labelText + ' <span aria-hidden="true">▾</span>';
      const list=document.createElement('ul'); list.setAttribute('data-mpl-footer-list',''); list.style.display='none';
      const submenu = findSub(g);
      if (submenu){
        q('a[href], [data-href]', submenu).forEach(a=>{
          const href = a.getAttribute('href') || a.getAttribute('data-href') || '#';
          const text = (a.textContent||'').trim() || href;
          const li=document.createElement('li'); const link=document.createElement('a'); link.href=href; link.textContent=text;
          li.appendChild(link); list.appendChild(li);
        });
      }
      const onToggle=()=>{ const open=btn.getAttribute('aria-expanded')==='true'; closeOthers(btn); btn.setAttribute('aria-expanded', String(!open)); list.style.display=open?'none':''; };
      btn.addEventListener('click', onToggle);
      btn.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onToggle(); } if(e.key==='Escape'){ btn.setAttribute('aria-expanded','false'); list.style.display='none'; btn.focus(); }});
      sec.appendChild(btn); sec.appendChild(list); host.appendChild(sec);
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
`;

// Canonical default footer if About page has no footer
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
    <script>(function(){var y=document.getElementById('yearFooter'); if(y) y.textContent=(new Date).getFullYear();})();</script>
  </footer>`;

// --------------------------------------------------
// Utilities
// --------------------------------------------------

function ensureDir(d) { if (!DRY_RUN) fs.mkdirSync(d, { recursive: true }); }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function walk(dir, acc = []) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site', '.next', '.cache', '.vercel'].includes(d.name)) continue;
            walk(p, acc);
        } else {
            acc.push(p);
        }
    }
    return acc;
}

function isAboutPage(fp) {
    const n = fp.replace(/\\/g, '/').toLowerCase();
    const bn = path.basename(n);
    return bn === 'about.html' || n.endsWith('/about.html') || n.endsWith('/about/index.html');
}

function extractFooterFromHtml(html) {
    const m = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    return m ? m[0] : null;
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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

function stripLegacyFooterScripts(html) {
    // Remove known legacy footer builder or theme scripts that can inject duplicate footers
    html = html.replace(/<script[^>]+src=["']assets\/footer\/footer\.js["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<script[^>]*id=["']mpl-footer-menu-js-v3["'][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*id=["']mpl-theme-auto-js-v3["'][^>]*>[\s\S]*?<\/script>/gi, '');
    return html;
}

function stripOldMobileInjections(html) {
    html = html.replace(/<script[^>]+src=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<script[^>]+src=["'][^"']*footer-explore[^"']*["'][^>]*>\s*<\/script>/gi, '');
    html = html.replace(/<link[^>]+href=["'][^"']*mobile-nav-final[^"']*["'][^>]*>\s*/gi, '');
    return html;
}

function stripTrailingWhitespace(html) {
    return html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

function writeFileSafe(filePath, content) {
    if (DRY_RUN) { console.log('[dry] write', filePath); return; }
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
}

function backupFile(fp) {
    const bak = fp + '.onefix.bak.' + nowStamp();
    if (!DRY_RUN) fs.copyFileSync(fp, bak);
    return bak;
}

function shouldDeleteFile(fp) {
    const name = path.basename(fp);
    if (/\.(bak(\.|$)|old|orig|tmp|temp|swp|~)$/.test(name)) return true;
    if (/^\.DS_Store$|^Thumbs\.db$|^\.AppleDouble$|^\.Spotlight-V100$|^\.Trashes$|^desktop\.ini$/.test(name)) return true;
    try { if (fs.statSync(fp).size === 0) return true; } catch { }
    return false;
}

function removeEmptyDirs(root) {
    const all = walk(root);
    const dirs = Array.from(new Set(all.map(p => path.dirname(p)))).sort((a, b) => b.length - a.length);
    let removed = 0;
    for (const d of dirs) {
        try {
            if (d && d !== root) {
                const entries = fs.readdirSync(d);
                if (!entries.length) { if (!DRY_RUN) fs.rmdirSync(d); removed++; console.log('Removed empty dir:', path.relative(root, d)); }
            }
        } catch { }
    }
    return removed;
}

// --------------------------------------------------
// Main logic
// --------------------------------------------------

function main() {
    console.log('M Share — One-shot FIX + CLEAN');
    console.log('Root:', ROOT);
    if (DRY_RUN) console.log('Mode: DRY RUN (no files written)');
    console.log('');

    // 1) Write assets (always overwrite with embedded canonical versions)
    console.log('Ensuring assets...');
    writeFileSafe(path.join(ROOT, CSS_PATH), EMBED_CSS);
    writeFileSafe(path.join(ROOT, JS_MOBILE), EMBED_JS_MOBILE);
    writeFileSafe(path.join(ROOT, JS_EXPLORE), EMBED_JS_EXPLORE);
    console.log(' -', CSS_PATH);
    console.log(' -', JS_MOBILE);
    console.log(' -', JS_EXPLORE);
    console.log('');

    // 2) Patch HTML files
    const all = walk(ROOT);
    const htmlFiles = all.filter(p => /\.html?$/i.test(p));
    if (!htmlFiles.length) { console.log('No HTML files found. Done.'); return; }

    // Determine canonical footer
    let canonicalFooter = DEFAULT_FOOTER;
    const aboutFile = htmlFiles.find(isAboutPage);
    if (aboutFile) {
        try {
            const aboutHtml = fs.readFileSync(aboutFile, 'utf8');
            const ext = extractFooterFromHtml(aboutHtml);
            if (ext) { canonicalFooter = ext; console.log('Using About page footer from:', path.relative(ROOT, aboutFile)); }
            else console.log('About page found but no <footer> block; using default canonical footer.');
        } catch (e) {
            console.log('Could not read About page; using default canonical footer.');
        }
    } else {
        console.log('No About page detected; using default canonical footer.');
    }

    let modified = 0;
    for (const fp of htmlFiles) {
        if (isAboutPage(fp)) continue;

        let html = fs.readFileSync(fp, 'utf8');
        const before = html;

        // Strip legacy and duplicate injections
        html = stripLegacyFooterScripts(html);
        html = stripOldMobileInjections(html);

        // Remove any and all footer blocks
        html = stripAllFooters(html);

        // Ensure assets and canonical footer
        html = ensureLinkInHead(html, CSS_PATH);
        html = ensureScriptBeforeBody(html, JS_MOBILE);
        html = ensureScriptBeforeBody(html, JS_EXPLORE);

        if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${canonicalFooter}\n</body>`);
        else html = html + `\n${canonicalFooter}\n`;

        html = stripTrailingWhitespace(html);

        if (html !== before) {
            const bak = backupFile(fp);
            if (!DRY_RUN) fs.writeFileSync(fp, html, 'utf8');
            modified++;
            console.log('Patched:', path.relative(ROOT, fp), 'backup ->', path.relative(ROOT, bak));
        }
    }

    console.log('');
    console.log('HTML files patched:', modified);

    // 3) Workspace clean: remove unwanted files
    console.log('');
    console.log('Cleaning workspace (unnecessary files)...');
    let deleted = 0;
    for (const p of walk(ROOT)) {
        if (shouldDeleteFile(p)) {
            if (!DRY_RUN) fs.unlinkSync(p);
            deleted++;
            console.log('Removed:', path.relative(ROOT, p));
        }
    }

    // 4) Remove empty directories
    const removedDirs = removeEmptyDirs(ROOT);

    console.log('');
    console.log('Summary');
    console.log(' - HTML modified:', modified);
    console.log(' - Files removed:', deleted);
    console.log(' - Empty dirs removed:', removedDirs);
    console.log(DRY_RUN ? 'DRY RUN complete. No files were written.' : 'Done.');
}

main();
