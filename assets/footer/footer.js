/* footer.js — enforce the supplied footer on all pages */
(function(){
  if (window.__MPL_FOOTER_V3__) return; window.__MPL_FOOTER_V3__ = 1;

  /* Insert minimal CSS if page doesn't already have footer-2025.css */
  (function ensureStyles(){
    // Theme vars (safe, minimal)
    if (!document.getElementById('mpl-theme-vars-css-v3')){
      const s = document.createElement('style');
      s.id = 'mpl-theme-vars-css-v3';
      s.textContent = ':root{--bg:#f7f7fb;--fg:#111;--muted:#6b7280;--b:rgba(0,0,0,.12);--brightness:1;color-scheme:light dark;}html{background:var(--bg);color:var(--fg);filter:brightness(var(--brightness));}body{background:transparent}';
      document.head.appendChild(s);
    }
    // Footer layout polish (matches your snippet)
    if (!document.getElementById('mpl-footer-css-v3')){
      const s = document.createElement('style');
      s.id = 'mpl-footer-css-v3';
      s.textContent = '#footer2025.mpl-footer-v3{border-top:1px solid var(--b,rgba(0,0,0,.12));font:inherit}#footer2025.mpl-footer-v3 .mpl-footer-wrap{max-width:min(1220px,96vw);margin:0 auto;padding:20px 12px}#footer2025.mpl-footer-v3 .mpl-footer-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;align-items:start}#footer2025.mpl-footer-v3 .brandline{display:flex;align-items:center;gap:.65rem}#footer2025.mpl-footer-v3 .brandline .logo{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:6px;background:currentColor;color:#fff;font-weight:700}#footer2025.mpl-footer-v3 .muted{color:var(--muted,#6b7280)}#footer2025.mpl-footer-v3 .mpl-pay{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}#footer2025.mpl-footer-v3 .mpl-pay a{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .55rem;border:1px solid var(--b,rgba(0,0,0,.12));border-radius:.4rem;text-decoration:none}#footer2025.mpl-footer-v3 .mpl-pay a:focus{outline:2px solid currentColor;outline-offset:2px}#footer2025.mpl-footer-v3 .mpl-theme-host details{border:1px solid var(--b,rgba(0,0,0,.12));border-radius:.5rem;padding:.35rem .5rem}#footer2025.mpl-footer-v3 .mpl-theme-host summary{cursor:pointer;user-select:none}#footer2025.mpl-footer-v3 .mpl-theme-host label{margin-right:.25rem}#footer2025.mpl-footer-v3 .mpl-theme-host input{margin:.25rem .5rem .25rem 0}#footer2025.mpl-footer-v3 .mpl-footer-explore h4{margin:0 0 .25rem 0}#footer2025.mpl-footer-v3 .mpl-footer-explore section{margin:.25rem 0}#footer2025.mpl-footer-v3 .mpl-footer-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;background:transparent;border:1px solid var(--b,rgba(0,0,0,.12));padding:.4rem .6rem;border-radius:.4rem;cursor:pointer}#footer2025.mpl-footer-v3 .mpl-footer-toggle:focus{outline:2px solid currentColor;outline-offset:2px}[data-mpl-footer-list]{margin:.35rem 0 0 0;padding-left:1rem}[data-mpl-footer-list] li{margin:.2rem 0}.bottom{display:flex;justify-content:space-between;gap:1rem;margin-top:16px;padding-top:12px;border-top:1px solid var(--b,rgba(0,0,0,.12))}@media (max-width:900px){#footer2025.mpl-footer-v3 .mpl-footer-grid{grid-template-columns:1fr}.bottom{flex-direction:column}}';
      document.head.appendChild(s);
    }
    // Keep external footer-2025.css if present; we don't remove anything.
  })();

  /* Replace any existing <footer> with the supplied footer HTML */
  (function mountFooter(){
    const html = "<footer id=\"footer2025\" class=\"footer-2025 mpl-footer-v3\">\n  <div class=\"mpl-footer-wrap\">\n    <div class=\"mpl-footer-grid\" role=\"navigation\" aria-label=\"Site footer\">\n      <section class=\"col brand\">\n        <div class=\"brandline\">\n          <span class=\"logo\" aria-hidden=\"true\">M</span>\n          <div><b>M Share</b><div class=\"muted\">Quiet, practical tools for mental health and wellbeing.</div></div>\n        </div>\n        <div class=\"mpl-pay\" aria-label=\"Support links\">\n          <a class=\"pay-link\" href=\"coffee.html\" target=\"_blank\" rel=\"noopener\">Support Us</a>\n          <a class=\"pay-link\" href=\"https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00\" target=\"_blank\" rel=\"noopener\">☕ Support Us</a>\n        </div>\n      </section>\n\n      <section class=\"col center\">\n        <div id=\"mpl-theme-slot\" aria-label=\"Theme controls\"></div>\n      </section>\n\n      <section class=\"col right\">\n        <nav class=\"mpl-footer-explore\" aria-label=\"Explore\">\n          <h4>Explore</h4>\n          <div id=\"mpl-footer-explore\"></div>\n        </nav>\n      </section>\n    </div>\n\n    <div class=\"bottom\">\n      <div>© <span id=\"yearFooter\"></span> MindPayLink · Educational information only; not medical advice.</div>\n      <div class=\"credit\">Designed by <b>Alkhadi M Koroma</b></div>\n    </div>\n  </div>\n</footer>";
    let existing = document.getElementById('footer2025');
    if (!existing) existing = document.querySelector('.footer-2025') || document.querySelector('footer');
    if (existing) {
      const container = document.createElement('div');
      container.innerHTML = html;
      existing.replaceWith(container.firstElementChild);
    } else {
      const el = document.createElement('div');
      el.innerHTML = html;
      document.body.appendChild(el.firstElementChild);
    }
  })();

  /* Year */
  (function year(){
    const y = document.getElementById('yearFooter'); if (y) y.textContent = (new Date).getFullYear();
  })();

  /* Theme controls (your snippet logic, compact) */
  (function themeAuto(){
    const KEY='mpl.theme.v2', DAY_START=7, DAY_END=19;
    const state = (()=>{ try{ return Object.assign({auto:true,color:null,brightness:1}, JSON.parse(localStorage.getItem(KEY)||'{}')); }catch{ return {auto:true,color:null,brightness:1}; }})();
    function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch{} }
    function hexToRgb(hex){ if(!hex) return {r:255,g:255,b:255}; const s=hex.replace('#',''); const v=s.length===3? s.split('').map(c=>c+c).join(''):s; const n=parseInt(v,16); return {r:(n>>16)&255,g:(n>>8)&255,b:(n)&255}; }
    function lum({r,g,b}){ const t=c=>{c/=255; return c<=.03928? c/12.92 : Math.pow((c+.055)/1.055,2.4)}; const [R,G,B]=[t(r),t(g),t(b)]; return .2126*R+.7152*G+.0722*B; }
    function pal(base){ const rgb=hexToRgb(base); const L=lum(rgb); const fg=(1-L)>0.45?'#fff':'#111'; const muted=(L>0.5)?'#6b7280':'#9ca3af'; const b=(L>0.5)?'rgba(0,0,0,.12)':'rgba(255,255,255,.18)'; return {bg:base,fg,muted,b}; }
    function isDay(){ const h=new Date().getHours(); return h>=DAY_START && h<DAY_END; }
    function apply(){
      const root=document.documentElement;
      let p; if (state.auto){ p=pal(isDay() ? '#f7f7fb' : '#0b0b10'); root.dataset.mplTheme=isDay()?'day-auto':'night-auto'; }
      else { p=pal(state.color||'#f7f7fb'); delete root.dataset.mplTheme; }
      root.style.setProperty('--bg',p.bg); root.style.setProperty('--fg',p.fg); root.style.setProperty('--muted',p.muted); root.style.setProperty('--b',p.b);
      root.style.setProperty('--brightness', String(Number(state.brightness||1)||1));
    }
    function ui(){
      let slot = document.getElementById('mpl-theme-slot');
      if (!slot){ const f=document.getElementById('footer2025')||document.querySelector('footer'); slot=document.createElement('div'); slot.id='mpl-theme-slot'; (f||document.body).appendChild(slot); }
      if (slot.querySelector('.mpl-theme-host')) return;
      const host=document.createElement('div'); host.className='mpl-theme-host';
      const details=document.createElement('details'); const summary=document.createElement('summary');
      summary.textContent='Theme'; details.appendChild(summary);
      const wrap=document.createElement('div');

      const auto=document.createElement('input'); auto.type='checkbox'; auto.id='mpl-theme-auto';
      const autoL=document.createElement('label'); autoL.htmlFor=auto.id; autoL.textContent='Auto';

      const color=document.createElement('input'); color.type='color'; color.id='mpl-theme-color'; color.value=state.color||'#f7f7fb';
      const colorL=document.createElement('label'); colorL.htmlFor=color.id; colorL.textContent='Color';

      const br=document.createElement('input'); br.type='range'; br.min='0.85'; br.max='1.25'; br.step='0.01'; br.id='mpl-theme-brightness'; br.value=String(state.brightness||1);
      const brL=document.createElement('label'); brL.htmlFor=br.id; brL.textContent='Brightness';

      const reset=document.createElement('button'); reset.type='button'; reset.textContent='Reset';

      function reflect(){ auto.checked=!!state.auto; color.disabled=!!state.auto; br.disabled=!!state.auto; if(!state.color) color.value='#f7f7fb'; }
      wrap.append(autoL,auto,colorL,color,brL,br,reset); details.appendChild(wrap); host.appendChild(details); slot.appendChild(host);

      reflect();
      auto.addEventListener('change', ()=>{ state.auto=auto.checked; save(); apply(); reflect(); });
      color.addEventListener('input', ()=>{ if(state.auto) return; state.color=color.value; save(); apply(); });
      br.addEventListener('input', ()=>{ if(state.auto) return; state.brightness=Number(br.value)||1; save(); apply(); });
      reset.addEventListener('click', ()=>{ state.auto=true; state.color=null; state.brightness=1; save(); apply(); reflect(); });
    }
    function ticks(){ if(!state.auto) return; const now=new Date(); const ms=(60-now.getSeconds())*1000 - now.getMilliseconds(); setTimeout(()=>{ apply(); setInterval(()=>{ if(state.auto) apply(); },60000); }, Math.max(0,ms)); }
    function init(){ apply(); ui(); ticks(); }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
  })();

  /* Footer Explore builder — copies top navigation groups into footer accordions */
  (function footerExplore(){
    function q(sel,ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
    function findSubmenu(el){ return el.querySelector(':scope > .menu, :scope > .submenu, :scope > [role="menu"], :scope > ul, :scope > .dropdown-menu, :scope > ol'); }
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
      const mount = document.getElementById('mpl-footer-explore');
      if (!mount || mount.__mplBuilt) return; mount.__mplBuilt = true;
      const groups = topNavGroups();
      if (!groups.length){ mount.style.display='none'; return; }
      mount.innerHTML = '';
      function closeOthers(except){
        q('.mpl-footer-toggle[aria-expanded="true"]', mount).forEach(btn=>{
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

        sec.appendChild(btn); sec.appendChild(list); mount.appendChild(sec);
      });
    }
    if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', mount, {once:true}); else mount();
  })();
})();
