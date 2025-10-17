/* Build footer Explore from header nav (idempotent) */
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
