
// assets/js/nav-unified.js
(() => {
  function setup(){
    const header = document.querySelector('header.site-header');
    if (!header) return;
    const mainNav = header.querySelector('.main-nav');
    const burger  = header.querySelector('#navToggle, .nav-toggle');

    // Overlay (single)
    let overlay = document.getElementById('navOverlay');
    if (!overlay){ overlay = document.createElement('div'); overlay.id='navOverlay'; document.body.appendChild(overlay); }

    function open(){ document.body.classList.add('nav-open'); if (burger) burger.setAttribute('aria-expanded','true'); }
    function close(){ document.body.classList.remove('nav-open'); if (burger) burger.setAttribute('aria-expanded','false'); header.querySelectorAll('.menu-group .submenu').forEach(s=>s.classList.remove('open')); header.querySelectorAll('.menu-group > .menu-toggle').forEach(b=>b.setAttribute('aria-expanded','false')); }

    if (burger) burger.addEventListener('click', (e)=>{ e.preventDefault(); const isOpen = document.body.classList.contains('nav-open'); (isOpen?close:open)(); });
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });

    // Submenu toggles (mobile)
    header.querySelectorAll('.menu-group > .menu-toggle').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const openNow = btn.getAttribute('aria-expanded') === 'true';
        header.querySelectorAll('.menu-group .submenu').forEach(s=>s.classList.remove('open'));
        header.querySelectorAll('.menu-group > .menu-toggle').forEach(b=>b.setAttribute('aria-expanded','false'));
        if (!openNow) { btn.setAttribute('aria-expanded','true'); btn.nextElementSibling && btn.nextElementSibling.classList.add('open'); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
