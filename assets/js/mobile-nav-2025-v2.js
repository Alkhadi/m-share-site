/* Mobile Nav 2025 – scoped & non-invasive
   - Works at <=1024px.
   - Hamburger toggles panel with ESC/outside-click close.
   - Chevron buttons toggle submenus (ul inside li).
   - Full ARIA support; no desktop changes; no layout changes.
*/
(() => {
  const mq = matchMedia('(max-width:1024px)');

  function injectCSS(){
    if (document.querySelector('style[data-mnav-2025]')) return;
    const s = document.createElement('style'); s.setAttribute('data-mnav-2025','');
    s.textContent = `
    [data-mnav-2025] .mnav-hidden { display:none !important; }
    @media (max-width:1024px){
      [data-mnav-2025] .mnav-panel[hidden]{ display:none !important; }
      [data-mnav-2025] .mnav-panel{ width:100%; }
      [data-mnav-2025] .mnav-sub { overflow:hidden; max-height:0; transition:max-height .24s ease; }
      [data-mnav-2025] .mnav-sub.is-open { max-height:100vh; }
      [data-mnav-2025] .mnav-chevron{
        background:none;border:0;cursor:pointer;padding:.5rem;margin-left:.25rem;
        display:inline-flex;align-items:center;justify-content:center; line-height:1;
        color: inherit;
      }
      [data-mnav-2025] .mnav-chevron svg{ width:16px;height:16px; transition:transform .18s ease; }
      [data-mnav-2025] .mnav-chevron[aria-expanded="true"] svg{ transform:rotate(180deg); }
      /* Improve tap targets */
      [data-mnav-2025] a, [data-mnav-2025] button { -webkit-tap-highlight-color: transparent; }
    }`;
    document.head.appendChild(s);
  }

  const findHeader = () => document.querySelector('header.site-header, header[role="banner"], .site-header, header');
  const findNav = (root) => (root && (root.querySelector('nav[role="navigation"]') || root.querySelector('nav.primary') || root.querySelector('nav'))) || document.querySelector('nav[role="navigation"]') || document.querySelector('nav');
  const findToggle = (root) => (root && root.querySelector('#menu-toggle, .menu-toggle, .hamburger, #hamburger, [data-menu-toggle], .nav-toggle, button[aria-controls]')) || document.querySelector('#menu-toggle, .menu-toggle, .hamburger, #hamburger, [data-menu-toggle], .nav-toggle, button[aria-controls]');
  const findPanel = (nav) => (nav && (nav.querySelector('#primary-nav, .nav-links, .menu, ul[role="menubar"], .menu-list, #mobile-menu'))) || nav;

  function setup(){
    const header = findHeader();
    const nav = findNav(header);
    if (!header || !nav) return;

    header.setAttribute('data-mnav-2025',''); // scope all styles/behaviour here

    let btn = findToggle(header);
    if (!btn) {
      // Create a hidden toggle if site has no explicit button – avoids layout change
      btn = document.createElement('button');
      btn.className = 'mnav-hidden'; header.appendChild(btn);
    }
    btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Menu');
    btn.setAttribute('aria-expanded','false');

    let panel = findPanel(nav);
    if (!panel) return;
    if (!panel.id) panel.id = 'mnav-panel';
    panel.classList.add('mnav-panel');
    panel.hidden = true;
    btn.setAttribute('aria-controls', panel.id);

    const open = () => { if (!mq.matches) return; panel.hidden=false; btn.setAttribute('aria-expanded','true'); document.addEventListener('keydown',onEsc,true); document.addEventListener('click',onOutside,true); };
    const close= () => { panel.hidden=true; btn.setAttribute('aria-expanded','false'); document.removeEventListener('keydown',onEsc,true); document.removeEventListener('click',onOutside,true); };
    const toggle=() => (panel.hidden? open(): close());
    const onEsc = (e)=>{ if (e.key==='Escape') close(); };
    const onOutside=(e)=>{ if (!panel.contains(e.target) && !btn.contains(e.target)) close(); };

    btn.addEventListener('click', (e)=>{ if (!mq.matches) return; e.preventDefault(); toggle(); });
    btn.addEventListener('keydown',(e)=>{ if (!mq.matches) return; if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggle(); }});
    mq.addEventListener('change', ()=>{ if (!mq.matches) close(); });

    // Submenus (mobile only): any li that has a direct child ul
    Array.from(panel.querySelectorAll('li')).forEach((li)=>{
      const sub = Array.from(li.children).find((el)=> el.tagName==='UL');
      if (!sub) return;

      // wrap UL in controlled container (does not affect desktop)
      const wrap = document.createElement('div');
      wrap.className = 'mnav-sub';
      li.insertBefore(wrap, sub);
      wrap.appendChild(sub);

      // main trigger (anchor or text node container)
      const trigger = li.querySelector('a, button') || li.firstElementChild || li;

      const chev = document.createElement('button');
      chev.type='button'; chev.className='mnav-chevron';
      chev.setAttribute('aria-label','Toggle submenu');
      chev.setAttribute('aria-expanded','false');
      chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      if (trigger.nextSibling) trigger.parentNode.insertBefore(chev, trigger.nextSibling); else trigger.parentNode.appendChild(chev);

      const openSub = ()=>{ wrap.classList.add('is-open'); chev.setAttribute('aria-expanded','true'); wrap.style.maxHeight = wrap.scrollHeight + 'px'; };
      const closeSub= ()=>{ wrap.classList.remove('is-open'); chev.setAttribute('aria-expanded','false'); wrap.style.maxHeight = '0px'; };
      const toggleSub=()=> (wrap.classList.contains('is-open') ? closeSub() : openSub());

      chev.addEventListener('click', (e)=>{ if (!mq.matches) return; e.preventDefault(); e.stopPropagation(); toggleSub(); });
      chev.addEventListener('keydown',(e)=>{ if (!mq.matches) return; if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggleSub(); } });

      // Mobile first-tap: open submenu; second tap on the link navigates
      if (trigger.tagName === 'A') {
        let armed = false;
        trigger.addEventListener('click', (e)=>{
          if (!mq.matches) return;
          if (!wrap.classList.contains('is-open') && !armed) { e.preventDefault(); openSub(); armed = true; setTimeout(()=>armed=false, 800); }
        }, { capture:true });
      }
    });
  }

  // Boot once, idempotent
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=>{ injectCSS(); setup(); }, { once:true });
  } else {
    injectCSS(); setup();
  }
})();
