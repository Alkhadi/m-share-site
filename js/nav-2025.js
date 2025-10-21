(function(){
  if(window.__NAV2025__) return; window.__NAV2025__=true;
  var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
  function lockScroll(on){var b=document.body;if(on){if(b.classList.contains('no-scroll'))return;b.dataset.scrollTop=String(window.scrollY);b.style.top='-'+window.scrollY+'px';b.classList.add('no-scroll')}else{if(!b.classList.contains('no-scroll'))return;b.classList.remove('no-scroll');var y=parseInt(b.dataset.scrollTop||'0',10);b.style.top='';window.scrollTo(0,y);delete b.dataset.scrollTop}}
  function hydrateHrefs(){var qs=location.search||''; $$('[data-href]').forEach(function(a){if(!a.getAttribute('href')) a.setAttribute('href',a.getAttribute('data-href')+qs)}); var brand=$('#brandLink'); if(brand&&!brand.getAttribute('href')) brand.setAttribute('href','index.html'+qs)}
  function wireNav(){
    var nav=$('#mainNav'),btn=$('#navToggle'); if(!nav||!btn) return;
    var backdrop=$('.nav-backdrop'); if(!backdrop){backdrop=document.createElement('div');backdrop.className='nav-backdrop';document.body.appendChild(backdrop)}
    function sync(){var open=nav.classList.contains('open');btn.setAttribute('aria-expanded',open?'true':'false');backdrop.style.display=open?'block':'none';lockScroll(open)}
    btn.addEventListener('click',function(){nav.classList.toggle('open');sync()});
    backdrop.addEventListener('click',function(){nav.classList.remove('open');sync()});
    document.addEventListener('click',function(e){if(e.target.closest('.nav-group .menu a')){nav.classList.remove('open');sync()}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');sync()}});
    var groups=$$('.nav-group',nav);
    function closeAll(ex){groups.forEach(function(g){if(g!==ex){g.classList.remove('open');var b=g.querySelector('.nav-button');if(b)b.setAttribute('aria-expanded','false')}})}
    groups.forEach(function(g){
      var b=g.querySelector('.nav-button'),m=g.querySelector('.menu'); if(!b||!m) return;
      b.addEventListener('click',function(){var willOpen=!g.classList.contains('open');closeAll(willOpen?g:null);g.classList.toggle('open',willOpen);b.setAttribute('aria-expanded',willOpen?'true':'false')});
      b.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();g.classList.add('open');b.setAttribute('aria-expanded','true');(m.querySelector('a,button')||b).focus()} if(e.key==='Escape'){e.preventDefault();g.classList.remove('open');b.setAttribute('aria-expanded','false');b.focus()}});
      m.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();g.classList.remove('open');b.setAttribute('aria-expanded','false');b.focus()}});
    });
    document.addEventListener('click',function(e){var inside=e.target.closest&&e.target.closest('.nav-group,.nav-toggle,.main-nav'); if(!inside) closeAll(null)});
    sync();
  }
  function themeInit(){
    var root=document.documentElement;
    function apply(bg,bri){if(bg) root.style.setProperty('--app-bg',bg); if(bri) root.style.setProperty('--app-bri',bri); document.body.style.background=getComputedStyle(root).getPropertyValue('--app-bg')}
    var c=$('#themeColor'), r=$('#themeBrightness'); var saved=localStorage.getItem('user_theme_bg')||'', bri=localStorage.getItem('user_theme_bri')||'';
    if(saved||bri) apply(saved,bri);
    if(c){if(saved) c.value=saved; c.addEventListener('input',function(){localStorage.setItem('user_theme_bg',c.value); apply(c.value,localStorage.getItem('user_theme_bri'))})}
    if(r){if(bri) r.value=bri; r.addEventListener('input',function(){localStorage.setItem('user_theme_bri',r.value); apply(localStorage.getItem('user_theme_bg'),r.value)})}
  }
  function backToTop(){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#backToTop'); if(!b) return; e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'})})}
  function run(){hydrateHrefs(); wireNav(); themeInit(); backToTop()}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
