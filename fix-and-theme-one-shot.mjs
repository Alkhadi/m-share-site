#!/usr/bin/env node
/**
 * One-shot: Fix hamburger + make menu text white + apply ChatGPT5 typography + use About footer globally.
 *
 * Changes only:
 *  - Writes assets/css/mobile-nav-final.css (mobile nav CSS)
 *  - Writes assets/css/nav-contrast-fix.css (forces white text on header/nav items)
 *  - Writes assets/js/mobile-nav-final.js (mobile nav runtime)
 *  - Writes assets/js/footer-explore.js (footer Explore builder)
 *  - Ensures the above assets are linked once per page
 *  - Ensures ChatGPT 5 typography is applied (adds link if missing; adds 'gpt5-typography' class to <html>)
 *  - Replaces every page’s footer (except About) with the About page footer
 *  - Removes legacy footer injector script tag (assets/footer/footer.js) to prevent duplicates
 *
 * Nothing else is changed.
 *
 * Usage:
 *   node fix-and-theme-one-shot.mjs
 *   node fix-and-theme-one-shot.mjs --dry-run
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

const CSS_MOBILE = 'assets/css/mobile-nav-final.css';
const CSS_CONTRAST = 'assets/css/nav-contrast-fix.css';
const JS_MOBILE = 'assets/js/mobile-nav-final.js';
const JS_EXPLORE = 'assets/js/footer-explore.js';
const CHATGPT5_CSS = 'assets/css/chatgpt5-typography.css'; // assumed path per your site

function ensureDir(d) { if (!DRY) fs.mkdirSync(d, { recursive: true }); }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function walk(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (['.git', 'node_modules', 'dist', 'build', '_backup', '_site', '.next', '.cache', '.vercel'].includes(e.name)) continue;
            walk(p, acc);
        } else acc.push(p);
    }
    return acc;
}
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

const MOBILE_CSS = `/* Mobile nav final — scoped to header.site-header */
@media (max-width:1024px){
  header.site-header #mainNav[hidden],
  header.site-header .menu[hidden],
  header.site-header .submenu[hidden],
  header.site-header ul[hidden]{ display:none!important; }

  header.site-header #navToggle,
  header.site-header .nav-toggle{
    position:relative; z-index:10010;
    -webkit-tap-highlight-color:transparent;
    color:#fff !important;
  }

  header.site-header .mnav-subwrap{ overflow:hidden; max-height:0; transition:max-height .24s ease; }
  header.site-header .mnav-subwrap.is-open{ max-height:2000px; }

  header.site-header .mnav-chevron{
    background:none; border:0; cursor:pointer; padding:.25rem; margin-left:.4rem;
    display:inline-flex; align-items:center; justify-content:center; line-height:1; color:#fff;
  }
  header.site-header .mnav-chevron svg{ width:16px; height:16px; transition:transform .18s ease; }
  header.site-header .mnav-chevron[aria-expanded="true"] svg{ transform:rotate(180deg); }

  header.site-header .menu-group, header.site-header .nav-group{ display:block; width:100%; }
  header.site-header nav.main-nav{ background:inherit; padding:.5rem 0; }
  header.site-header .submenu{ display:block; }
  header.site-header .submenu[hidden]{ display:none!important; }
}
@media (min-width:1025px){ #navToggle{ display:none!important; } }
`;

const CONTRAST_CSS = `/* Force white text on colored header/nav */
header.site-header, header.site-header .navbar{ color:#fff; }
header.site-header .brand, header.site-header .brand .brand-text, header.site-header .logo{ color:#fff !important; }
header.site-header .main-nav > a,
header.site-header .main-nav .nav-button,
header.site-header .main-nav .menu-toggle,
header.site-header .nav-group > a,
header.site-header .menu-group > a,
header.site-header #navToggle { color:#fff !important; }
header.site-header .menu-label, header.site-header .menu-title { color:#fff !important; }
header.site-header .main-nav > a:focus,
header.site-header .nav-button:focus,
header.site-header .menu-toggle:focus,
header.site-header #navToggle:focus { outline:2px solid #fff; outline-offset:2px; }
header.site-header .nav-group .icon, header.site-header .menu-group .icon { color:#fff !important; }
/* Keep dropdown link color readable; comment next line if your submenu background is light */
header.site-header .submenu a{ color:#fff; }
`;

const MOBILE_JS = `/* Mobile nav/runtime — idempotent, accessible, vanilla JS */
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

  function clearOverlays(){
    document.documentElement.classList.remove('nav-open','menu-open','overlay-open','drawer-open');
    document.body.classList.remove('nav-open','menu-open','overlay-open','drawer-open','no-scroll','modal-open');
    document.querySelectorAll('.overlay,[data-overlay],.backdrop,.drawer,.drawer-backdrop').forEach(el=>{ try{ el.style.display=''; }catch(e){} });
  }
  function lockBody(v){ document.body.classList.toggle('mpl-mobile-nav-open', !!v); }

  function onEsc(e){ if(e.key==='Escape'){ closeNav(); toggle.focus(); } }
  function onOutside(e){ if (!nav.contains(e.target) && !toggle.contains(e.target)) closeNav(); }

  function openNav(){
    if (!mql.matches) return;
    clearOverlays();
    nav.hidden=false; nav.style.display='';
    toggle.setAttribute('aria-expanded','true');
    lockBody(true);
    document.addEventListener('keydown', onEsc, true);
    document.addEventListener('click', onOutside, true);
  }
  function closeNav(){
    nav.hidden=true; nav.style.display='';
    toggle.setAttribute('aria-expanded','false');
    lockBody(false);
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

  try { const fresh = toggle.cloneNode(true); toggle.parentNode.replaceChild(fresh, toggle); toggle = fresh; toggle.setAttribute('aria-controls', nav.id); } catch(e){}

  function initSubmenus(){
    const groups = Array.from(nav.querySelectorAll('.nav-group, .menu-group, :scope > ul > li'));
    let idx=0;
    groups.forEach(group=>{
      const submenu = group.querySelector(':scope > .menu, :scope > .submenu, :scope > ul, :scope > .dropdown-menu, :scope > ol');
      if (!submenu) return;
      let trigger = group.querySelector(':scope > .menu-toggle, :scope > .nav-button, :scope > a, :scope > button');
      if (!trigger){
        trigger = document.createElement('button'); trigger.type='button'; trigger.className='mnav-created-trigger'; trigger.style.display='none';
        group.insertBefore(trigger, submenu);
      } else {
        try{ const c = trigger.cloneNode(true); trigger.parentNode.replaceChild(c, trigger); trigger = c; }catch(e){}
      }
      let wrap = group.querySelector(':scope > .mnav-subwrap');
      if (!wrap){ wrap = document.createElement('div'); wrap.className='mnav-subwrap'; group.insertBefore(wrap, submenu); wrap.appendChild(submenu); }
      if (!submenu.id) submenu.id = 'mpl-sub-'+(++idx)+'-'+Math.random().toString(36).slice(2);
      trigger.setAttribute('aria-controls', submenu.id);
      trigger.setAttribute('aria-expanded','false');

      let chev = group.querySelector(':scope > .mnav-chevron');
      if (!chev){
        chev = document.createElement('button'); chev.type='button'; chev.className='mnav-chevron'; chev.setAttribute('aria-label','Toggle submenu'); chev.setAttribute('aria-expanded','false');
        chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (trigger.nextSibling) trigger.parentNode.insertBefore(chev, trigger.nextSibling); else group.appendChild(chev);
      }

      function openSub(){ submenu.hidden=false; wrap.classList.add('is-open'); trigger.setAttribute('aria-expanded','true'); chev.setAttribute('aria-expanded','true'); }
      function closeSub(){ submenu.hidden=true;  wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); chev.setAttribute('aria-expanded','false'); }
      function t(e){ if (!mql.matches) return; if (e){ e.preventDefault(); e.stopPropagation(); } const h = submenu.hidden===true || submenu.hasAttribute('hidden'); h?openSub():closeSub(); }

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

const EXPLORE_JS = `/* Build footer Explore from header nav (idempotent) */
(function(){
  if (!document.querySelector) return;
  const BUILT='mplFooterExploreBuiltV2';
  function q(s,c){ return Array.from((c||document).querySelectorAll(s)); }
  function findSub(n){ return n && n.querySelector(':scope > .menu, :scope > .submenu, :scope > ul, :scope > ol, :scope > .dropdown-menu'); }
  function topGroups(){
    const nav = document.getElementById('mainNav') || document.querySelector('header nav') || document.querySelector('nav.main-nav');
    if (!nav) return [];
    const groups=[];
    q(':scope > .nav-group, :scope > .menu-group, :scope > ul > li', nav).forEach(n=>{ if (findSub(n)) groups.push(n); });
    return groups;
  }
  function mount(){
    const host = document.getElementById('mpl-footer-explore');
    if (!host || host[BUILT]) return; host[BUILT]=true;
    const groups = topGroups();
    if (!groups.length){ host.style.display='none'; return; }
    host.innerHTML='';

    function closeOthers(except){
      q('.mpl-footer-toggle[aria-expanded="true"]', host).forEach(btn=>{
        if (btn===except) return;
        btn.setAttribute('aria-expanded','false');
        const nxt=btn.nextElementSibling; if (nxt) nxt.style.display='none';
      });
    }

    groups.forEach((g,i)=>{
      const sec=document.createElement('section');
      const btn=document.createElement('button'); btn.type='button'; btn.className='mpl-footer-toggle'; btn.setAttribute('aria-expanded','false');
      const labelNode = g.querySelector(':scope > .nav-button, :scope > .menu-toggle, :scope > a, :scope > button, :scope > [role="button"], :scope > .label, :scope > .menu-label');
      const labelText = (labelNode && (labelNode.textContent||'').trim()) || ('Menu '+(i+1));
      btn.innerHTML = labelText + ' <span aria-hidden="true">▾</span>';

      const list=document.createElement('ul'); list.setAttribute('data-mpl-footer-list',''); list.style.display='none';
      const submenu = findSub(g);
      if (submenu){
        q('a[href], [data-href]', submenu).forEach(a=>{
          const href=a.getAttribute('href')||a.getAttribute('data-href')||'#';
          const text=(a.textContent||'').trim()||href;
          const li=document.createElement('li'); const link=document.createElement('a'); link.href=href; link.textContent=text;
          li.appendChild(link); list.appendChild(li);
        });
      }

      const onToggle=()=>{ const open=btn.getAttribute('aria-expanded')==='true'; closeOthers(btn); btn.setAttribute('aria-expanded', String(!open)); list.style.display=open?'none':''; };
      btn.addEventListener('click', onToggle);
      btn.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onToggle(); } if(e.key==='Escape'){ btn.setAttribute('aria-expanded','false'); list.style.display='none'; btn.focus(); } });

      sec.appendChild(btn); sec.appendChild(list); host.appendChild(sec);
    });
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
})();
`;

function writeFile(p, content) {
    const abs = path.join(ROOT, p);
    if (!DRY) {
        ensureDir(path.dirname(abs));
        fs.writeFileSync(abs, content, 'utf8');
    }
    console.log((DRY ? '[dry] ' : 'Wrote: ') + p);
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
function extractFooterFromHtml(html) {
    const m = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    return m ? m[0] : null;
}
function removeLegacyFooterInjectors(html) {
    // Remove assets/footer/footer.js and known inline footer builders to prevent duplicates
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
function ensureHtmlHasClass(html, klass) {
    const has = new RegExp('<html\\b[^>]*\\bclass=["\'][^"\']*\\b' + escapeRegExp(klass) + '\\b[^"\']*["\']', 'i').test(html);
    if (has) return html;
    if (/<html\b[^>]*\bclass=["'][^"']*["'][^>]*>/i.test(html)) {
        return html.replace(/(<html\b[^>]*\bclass=["'])([^"']*)(["'][^>]*>)/i, (m, p1, p2, p3) => p1 + (p2 ? p2 + ' ' : '') + klass + p3);
    }
    if (/<html\b[^>]*>/i.test(html)) {
        return html.replace(/<html\b([^>]*)>/i, `<html$1 class="${klass}">`);
    }
    // If no <html> tag (unlikely), leave html unchanged
    return html;
}
function isAboutPage(fp) {
    const n = fp.replace(/\\/g, '/').toLowerCase();
    const bn = path.basename(n);
    return bn === 'about.html' || n.endsWith('/about.html') || n.endsWith('/about/index.html');
}

function main() {
    console.log('One-shot fix starting', DRY ? '(DRY RUN)' : '');
    // 1) Write assets
    writeFile(CSS_MOBILE, MOBILE_CSS);
    writeFile(CSS_CONTRAST, CONTRAST_CSS);
    writeFile(JS_MOBILE, MOBILE_JS);
    writeFile(JS_EXPLORE, EXPLORE_JS);

    // 2) Scan HTMLs
    const files = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
    if (!files.length) { console.log('No HTML files found. Done.'); return; }

    // 3) Extract About footer
    let canonicalFooter = null;
    const about = files.find(isAboutPage);
    if (about) {
        try {
            const content = fs.readFileSync(about, 'utf8');
            const ext = extractFooterFromHtml(content);
            if (ext) { canonicalFooter = ext; console.log('Using About footer from:', path.relative(ROOT, about)); }
            else console.log('About page has no <footer>; will use default About provided earlier in your site.');
        } catch (e) {
            console.log('Could not read About page; will proceed without extracted footer.');
        }
    }
    if (!canonicalFooter) {
        // Fallback footer (same structure as your About sample)
        canonicalFooter = String.raw`  <footer id="footer2025" class="footer-2025 mpl-footer-v3">
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
        <section class="col center">
          <div id="mpl-theme-slot" aria-label="Theme controls"></div>
        </section>
        <section class="col right">
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
        console.log('Fallback footer will be used (About footer not found).');
    }

    // 4) Patch each HTML (skip About)
    let modified = 0;
    for (const fp of files) {
        const isAbout = isAboutPage(fp);
        let html = fs.readFileSync(fp, 'utf8');
        const before = html;

        // Make menu text readable (white) via CSS link, and apply ChatGPT5 typography
        html = ensureLinkInHead(html, CSS_MOBILE);
        html = ensureLinkInHead(html, CSS_CONTRAST);
        html = ensureLinkInHead(html, CHATGPT5_CSS);
        html = ensureHtmlHasClass(html, 'gpt5-typography');

        // Ensure mobile JS + footer explore once, and remove legacy footer injectors/old injections
        html = removeLegacyFooterInjectors(html);
        html = stripOldMobileInjections(html);
        html = ensureScriptBeforeBody(html, JS_MOBILE);
        html = ensureScriptBeforeBody(html, JS_EXPLORE);

        // Footer: replace on all pages except About
        if (!isAbout) {
            html = stripAllFooters(html);
            if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `${canonicalFooter}\n</body>`);
            else html = html + `\n${canonicalFooter}\n`;
        }

        if (html !== before) {
            modified++;
            const bak = fp + '.onefix.bak.' + nowStamp();
            if (!DRY) {
                fs.copyFileSync(fp, bak);
                fs.writeFileSync(fp, html, 'utf8');
            }
            console.log((DRY ? '[dry] ' : 'Patched: ') + path.relative(ROOT, fp) + (DRY ? '' : (' backup-> ' + path.relative(ROOT, bak))));
        }
    }

    console.log('\nSummary:');
    console.log('  HTML files modified:', modified);
    console.log(DRY ? '  DRY RUN complete. No files were written.' : '  Done.');
}

main();
