(()=>{ 
  if (window.__NAV_FIX_2025__) return;
  window.__NAV_FIX_2025__ = true;
  function ready(fn){ 
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, {once:true});
    else fn();
  }
  ready(()=> {
    try{
      const nav = document.getElementById('mainNav');
      const toggle = document.getElementById('navToggle');
      if (toggle && nav){
        toggle.addEventListener('click', (e)=>{
          e.preventDefault();
          const open = nav.classList.toggle('open');
          toggle.setAttribute('aria-expanded', open ? 'true':'false');
        });
      }
      if (nav){
        const groups = nav.querySelectorAll('.menu-group');
        groups.forEach(g=>{
          const b = g.querySelector('.menu-toggle');
          if(!b) return;
          b.addEventListener('click', (e)=>{
            e.preventDefault();
            const nowOpen = g.classList.toggle('open');
            b.setAttribute('aria-expanded', nowOpen ? 'true':'false');
            if (window.innerWidth > 760 && nowOpen){
              groups.forEach(o=>{
                if (o!==g){
                  o.classList.remove('open');
                  const ob=o.querySelector('.menu-toggle');
                  ob && ob.setAttribute('aria-expanded','false');
                }
              });
            }
          });
        });
        document.addEventListener('click', (e)=>{
          if (!nav.contains(e.target)){
            groups.forEach(o=>{
              o.classList.remove('open');
              const ob=o.querySelector('.menu-toggle');
              ob && ob.setAttribute('aria-expanded','false');
            });
          }
        });
        nav.addEventListener('click', (e)=>{
          const a = e.target.closest('a[data-href]');
          if (!a) return;
          const href = a.getAttribute('data-href');
          if (href){
            e.preventDefault();
            if (nav.classList.contains('open')) nav.classList.remove('open');
            window.location.href = href;
          }
        });
      }
    }catch(err){}
  });
})();
