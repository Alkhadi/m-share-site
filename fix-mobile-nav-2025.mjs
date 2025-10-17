#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const JS_DIR = path.join(ROOT, 'assets', 'js');
const OUT = path.join(JS_DIR, 'mobile-nav-2025.js');

function ensureDir(p){ fs.mkdirSync(p, { recursive:true }); }
function walk(dir, acc=[]){
  for (const d of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, d.name);
    d.isDirectory() ? walk(p, acc) : acc.push(p);
  }
  return acc;
}

function writeRuntime(){
  ensureDir(JS_DIR);
  const js = `/* Mobile Nav 2025 (scoped, non-invasive)
     - Finds your header/nav and hamburger button.
     - Adds ARIA, toggles panel on mobile only.
     - Adds chevron toggles for submenus (tap/click/keyboard).
     - No effect on desktop widths.
  */
(() => {
  const mq = window.matchMedia('(max-width: 1024px)');

  // Find likely elements without relying on your CSS names
  const findHeader = () => document.querySelector(
    'header.site-header, header[role="banner"], .site-header, header'
  );
  const findNav = (root) => root && (root.querySelector('nav[role="navigation"]')
    || root.querySelector('nav.primary')
    || root.querySelector('nav')
    || document.querySelector('nav[role="navigation"]')
  );
  const findToggleBtn = (root) => (root && (root.querySelector('#menu-toggle, .menu-toggle, .hamburger, #hamburger, [data-menu-toggle], .nav-toggle')))
    || document.querySelector('#menu-toggle, .menu-toggle, .hamburger, #hamburger, [data-menu-toggle], .nav-toggle');
  const findMenuPanel = (nav) => nav && (nav.querySelector('#primary-nav, .nav-links, .menu, ul[role="menubar"], .menu-list, #mobile-menu') || nav);

  function injectCSS() {
    if (document.querySelector('style[data-mobile-nav-2025]')) return;
    const s = document.createElement('style');
    s.setAttribute('data-mobile-nav-2025','');
    s.textContent = \`
      /* Scope with [data-mnav-2025] to avoid any bleed */
      [data-mnav-2025] .mnav-hidden { display: none !important; }
      @media (max-width:1024px){
        [data-mnav-2025] .mnav-panel[hidden]{ display:none !important; }
        [data-mnav-2025] .mnav-panel{ width:100%; }
        /* submenu container animation (height-based, safe) */
        [data-mnav-2025] .mnav-sub { overflow:hidden; max-height:0; transition:max-height .25s ease; }
        [data-mnav-2025] .mnav-sub.is-open { max-height: 100vh; }
        /* chevron button */
        [data-mnav-2025] .mnav-chevron {
          background:none;border:0;cursor:pointer;padding:.5rem;line-height:1;
          display:inline-flex;align-items:center;justify-content:center;
        }
        [data-mnav-2025] .mnav-chevron svg{ width:16px;height:16px; transition:transform .2s ease; }
        [data-mnav-2025] .mnav-chevron[aria-expanded="true"] svg{ transform:rotate(180deg); }
      }
    \`;
    document.head.appendChild(s);
  }

  function setup() {
    const header = findHeader();
    const nav = findNav(header) || document.querySelector('nav');
    if (!header || !nav) return;

    header.setAttribute('data-mnav-2025',''); // scope

    // --- Hamburger ---
    let btn = findToggleBtn(header);
    if (!btn) {
      // Create a safe invisible button if no toggle exists (does not change layout)
      btn = document.createElement('button');
      btn.className = 'mnav-hidden';
      header.insertBefore(btn, header.firstChild);
    }
    btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Menu');
    btn.setAttribute('aria-expanded', 'false');

    // Panel to open/close
    let panel = findMenuPanel(nav);
    if (!panel) return;
    if (!panel.id) panel.id = 'mnav-panel';
    panel.classList.add('mnav-panel');
    panel.hidden = true;
    btn.setAttribute('aria-controls', panel.id);

    // Toggle open/close (mobile only)
    const open = () => { panel.hidden = false; btn.setAttribute('aria-expanded','true'); document.addEventListener('keydown', onEsc, true); document.addEventListener('click', onOutside, true); };
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded','false'); document.removeEventListener('keydown', onEsc, true); document.removeEventListener('click', onOutside, true); };
    const toggle = () => (panel.hidden ? open() : close());
    const onEsc = (e)=>{ if (e.key === 'Escape') close(); };
    const onOutside = (e)=>{ if (!panel.contains(e.target) && !btn.contains(e.target)) close(); };

    btn.addEventListener('click', (e)=>{ if (!mq.matches) return; e.preventDefault(); toggle(); });
    btn.addEventListener('keydown', (e)=>{ if (!mq.matches) return; if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); } });

    // Auto-close when going to desktop
    mq.addEventListener('change', () => { if (!mq.matches) close(); });

    // --- Submenus with chevrons (mobile only) ---
    const submenuParents = Array.from(panel.querySelectorAll('li')).filter(li => li.querySelector('ul'));
    submenuParents.forEach((li, idx) => {
      let sub = li.querySelector('ul');
      if (!sub) return;

      // Wrap UL in a container we control (non-destructive)
      let wrap = document.createElement('div');
      wrap.className = 'mnav-sub';
      sub.parentNode.insertBefore(wrap, sub);
      wrap.appendChild(sub);

      // Insert a chevron button right after the first anchor/text
      let trigger = li.querySelector('a, button') || li.firstElementChild || li;
      let chev = document.createElement('button');
      chev.type = 'button';
      chev.className = 'mnav-chevron';
      chev.setAttribute('aria-expanded','false');
      chev.setAttribute('aria-label','Toggle submenu');

      // Simple inline SVG chevron
      chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      // Insert after trigger (but before submenu container)
      if (trigger.nextSibling) trigger.parentNode.insertBefore(chev, trigger.nextSibling);
      else trigger.parentNode.appendChild(chev);

      const openSub = ()=>{ wrap.classList.add('is-open'); chev.setAttribute('aria-expanded','true'); wrap.style.maxHeight = wrap.scrollHeight + 'px'; };
      const closeSub = ()=>{ wrap.classList.remove('is-open'); chev.setAttribute('aria-expanded','false'); wrap.style.maxHeight = '0px'; };
      const toggleSub = ()=> (wrap.classList.contains('is-open') ? closeSub() : openSub());

      chev.addEventListener('click', (e)=>{ if (!mq.matches) return; e.stopPropagation(); e.preventDefault(); toggleSub(); });
      chev.addEventListener('keydown', (e)=>{ if (!mq.matches) return; if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggleSub(); } });

      // Prevent accidental navigation on first tap of the parent link on mobile (open first, follow on second)
      if (trigger.tagName === 'A') {
        let armed = false;
        trigger.addEventListener('click', (e)=>{
          if (!mq.matches) return;
          if (!wrap.classList.contains('is-open') && !armed) { e.preventDefault(); openSub(); armed = true; setTimeout(()=>armed=false, 800); }
        }, { capture:true });
      }
    });
  }

  // Boot (idempotent)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectCSS(); setup(); }, { once:true });
  } else {
    injectCSS(); setup();
  }
})();`;
  fs.writeFileSync(OUT, js, 'utf8');
}

function patchHTML(filePath){
  let html = fs.readFileSync(filePath, 'utf8');
  if (/mobile-nav-2025\.js/i.test(html)) return false;
  const tag = '<script defer src="assets/js/mobile-nav-2025.js"></script>';
  if (/<\/body>\s*<\/html>/i.test(html)) {
    html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tag}\n</body>\n</html>`);
  } else {
    html += `\n${tag}\n`;
  }
  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

(function main(){
  writeRuntime();
  const pages = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
  let updated = 0;
  for (const f of pages) if (patchHTML(f)) updated++;
  console.log('✔ Wrote JS:', path.relative(ROOT, OUT));
  console.log('✔ HTML pages scanned:', pages.length);
  console.log('✔ Pages updated with mobile-nav-2025:', updated);
  console.log('Done. Mobile hamburger & chevron submenus enabled (scoped, non-invasive).');
})();
