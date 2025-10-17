/* Mobile nav/runtime — idempotent, accessible, vanilla JS */
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
