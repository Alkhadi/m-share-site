(()=>{'use strict';
const $=(s,el=document)=>el.querySelector(s);const $$=(s,el=document)=>el.querySelectorAll(s);

/* Scroll lock + nav backdrop */
function lockScroll(on){const b=document.body;if(on){if(b.classList.contains('no-scroll'))return;b.dataset.scrollTop=String(window.scrollY);b.style.top=`-${window.scrollY}px`;b.classList.add('no-scroll');}else{if(!b.classList.contains('no-scroll'))return;b.classList.remove('no-scroll');const y=parseInt(b.dataset.scrollTop||'0',10);b.style.top='';window.scrollTo(0,y);delete b.dataset.scrollTop;}}
function enhanceNav(){const nav=$('#mainNav');const btn=$('#navToggle');if(!nav||!btn)return;let backdrop=$('.nav-backdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.className='nav-backdrop';document.body.appendChild(backdrop);}
function sync(){const open=nav.classList.contains('open');btn.setAttribute('aria-expanded',open?'true':'false');backdrop.style.display=open?'block':'none';document.body.classList.toggle('is-nav',open);lockScroll(open);}
btn.addEventListener('click',()=>setTimeout(sync,0),{passive:true});backdrop.addEventListener('click',()=>{nav.classList.remove('open');sync();});nav.addEventListener('click',(e)=>{if(e.target.closest('a')){nav.classList.remove('open');sync();}});document.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');sync();}});sync();}
function wireSmoothScroll(){document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);if(!id)return;const t=document.getElementById(id);if(!t)return;e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});history.pushState({},"",'#'+id);});}

/* Soft navigation (fetch <main>) */
const SoftNav=(()=>{let enabled=true;function sameOrigin(url){try{const u=new URL(url,location.href);return u.origin===location.origin;}catch{return false;}}
function wantsSoft(a){if(!a)return false;const href=a.getAttribute('href')||'';if(!href)return false;if(a.hasAttribute('download'))return false;if(a.target&&a.target!=='_self')return false;if(/^(mailto:|tel:|sms:|javascript:)/i.test(href))return false;if(a.dataset.noSoft==='true'||a.classList.contains('no-soft'))return false;if(/\.(pdf|png|jpg|jpeg|gif|svg|webp|zip|mp4|mp3)(\?|#|$)/i.test(href))return false;const url=new URL(href,location.href);return sameOrigin(url)&&url.pathname!==location.pathname;}
async function fetchDoc(url){const r=await fetch(url,{headers:{'X-Requested-With':'fetch'}});if(!r.ok)throw new Error('HTTP '+r.status);const html=await r.text();return new DOMParser().parseFromString(html,'text/html');}
function executeScripts(scope){scope.querySelectorAll('script').forEach(old=>{const s=document.createElement('script');if(old.src)s.src=old.src;if(old.type)s.type=old.type;if(!old.src)s.textContent=old.textContent;document.body.appendChild(s);});}
function swapMain(doc){const nm=doc.querySelector('main');const cm=document.querySelector('main');if(!nm||!cm){location.replace(doc.URL);return;}function doSwap(){cm.replaceWith(nm);document.title=doc.title||document.title;executeScripts(nm);enhanceNav();wireSmoothScroll();pairControls();applyExcerpts();attachSaveResetPrint();Theme.apply();AppInstall.initCta();Progress.renderBadges();window.dispatchEvent(new CustomEvent('mshare:navigated',{detail:{url:doc.URL}}));}
if(document.startViewTransition)document.startViewTransition(doSwap);else{document.body.classList.add('is-nav');setTimeout(()=>{doSwap();document.body.classList.remove('is-nav');},120);}}
async function go(url,{replace=false}={}){try{const doc=await fetchDoc(url);if(replace)history.replaceState({},"",url);else history.pushState({},"",url);swapMain(doc);window.scrollTo({top:0,behavior:'smooth'});}catch(e){location.href=url;}}
function init(){document.addEventListener('click',e=>{if(!enabled)return;const a=e.target.closest&&e.target.closest('a[href]');if(!a||!wantsSoft(a))return;e.preventDefault();go(a.href);});window.addEventListener('popstate',()=>go(location.href,{replace:true}));}return{init,go,enable:(v=true)=>{enabled=!!v;}}})();

/* Theme + Brightness */
const Theme=(()=>{const KEY='mshare_theme_v2';function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return{};}}
function setColor(hex){document.documentElement.style.setProperty('--bg',hex);save({...load(),color:hex});}
function setMode(mode){document.documentElement.setAttribute('data-theme',mode);save({...load(),mode});}
function setBrightness(v){document.documentElement.style.setProperty('--brightness',String(v));save({...load(),brightness:v});}
function apply(){const s=load();if(s.color)document.documentElement.style.setProperty('--bg',s.color);if(s.mode)document.documentElement.setAttribute('data-theme',s.mode);if(s.brightness)document.documentElement.style.setProperty('--brightness',String(s.brightness));
const cp=$('#themeColor');const br=$('#themeBrightness');const mode=$('#themeMode');if(cp&&s.color)cp.value=s.color;if(br&&s.brightness)br.value=s.brightness;if(mode&&s.mode)mode.value=s.mode;}
function wire(){const cp=$('#themeColor');const br=$('#themeBrightness');const mode=$('#themeMode');if(cp)cp.addEventListener('input',e=>setColor(e.target.value));if(br)br.addEventListener('input',e=>setBrightness(e.target.value));if(mode)mode.addEventListener('change',e=>setMode(e.target.value));apply();}
return{apply,wire,setColor,setMode,setBrightness};})();

/* App Install (PWA) */
const AppInstall=(()=>{let deferred=null;function init(){window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferred=e;const b=$('#installAppBtn');if(b)b.style.display='inline-flex';});}
function prompt(){if(!deferred){alert('Use your browser “Add to Home Screen” to install.');return;}deferred.prompt();deferred.userChoice.finally(()=>{deferred=null;const b=$('#installAppBtn');if(b)b.style.display='none';});}
function initCta(){const b=$('#installAppBtn');if(b){b.addEventListener('click',prompt);if(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone){b.style.display='none';}}}
return{init,initCta};})();

/* Minimal PDF builder (text) */
const PDFKit=(()=>{function base64ToBytes(b64){const bin=atob(b64.replace(/^data:.*;base64,/,''));const len=bin.length,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return bytes;}
function parseJpegSize(bytes){let i=2;while(i<bytes.length){if(bytes[i]!==0xFF){i++;continue;}const marker=bytes[i+1];const len=(bytes[i+2]<<8)|bytes[i+3];if(marker>=0xC0&&marker<=0xC3){return{height:(bytes[i+5]<<8)|bytes[i+6],width:(bytes[i+7]<<8)|bytes[i+8]};}i+=2+len;}return{width:1224,height:1584};}
async function fromCanvas(cnv){const dataUrl=cnv.toDataURL('image/jpeg',.92);const imgBytes=base64ToBytes(dataUrl);const dim=parseJpegSize(imgBytes);const PW=595,PH=842;const contentStr=`q\n${PW} 0 0 ${PH} 0 0 cm\n/Im0 Do\nQ\n`;const encoder=[];const idx=[];let off=0;function push(s){const bytes=(typeof s==='string')?new TextEncoder().encode(s):s;idx.push(off);encoder.push(bytes);off+=bytes.length;}function obj(n,body){push(`${n} 0 obj\n`);push(body);push(`\nendobj\n`);}push('%PDF-1.4\n');obj(1,`<< /Type /Catalog /Pages 2 0 R >>`);obj(2,`<< /Type /Pages /Count 1 /Kids [3 0 R] >>`);obj(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`);obj(4,`<< /Length ${contentStr.length} >>\nstream\n${contentStr}endstream`);obj(5,`<< /Type /XObject /Subtype /Image /Name /Im0 /Width ${dim.width} /Height ${dim.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);push(imgBytes);push(`\nendstream\nendobj\n`);const xrefStart=off;push('xref\n');const count=5;push(`0 ${count+1}\n`);push('0000000000 65535 f \n');for(let i=0;i<count;i++){push(String(idx[i]).padStart(10,'0')+' 00000 n \n');}push(`trailer << /Size ${count+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);return new Blob(encoder.map(b=>b.buffer?b:new Uint8Array(b)),{type:'application/pdf'});}
async function textPdf(title,lines){const W=1224,H=1584;const cnv=Object.assign(document.createElement('canvas'),{width:W,height:H});const ctx=cnv.getContext('2d');ctx.fillStyle='#0a1020';ctx.fillRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(30,64,175,.35)');g.addColorStop(1,'rgba(0,0,0,.65)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='700 56px ui-sans-serif,system-ui,Segoe UI,Roboto';ctx.fillText(title, W/2, 110);ctx.textAlign='left';ctx.font='500 30px ui-sans-serif,system-ui,Segoe UI,Roboto';let y=170;const x=100;lines.forEach(t=>{const words=String(t).split(' ');let line='';words.forEach(w=>{const test=line?w+' '+line: w;ctx.font='500 28px ui-sans-serif,system-ui,Segoe UI,Roboto';const m=ctx.measureText((line+' '+w).trim());if(m.width>W-200){ctx.fillText(line,x,y);y+=40;line=w;}else{line=(line?line+' ':'')+w;}});if(line){ctx.fillText(line,x,y);y+=40;}});return fromCanvas(cnv);}
return{textPdf};})();

/* Progress + session tracking */
const Progress=(()=>{const KEY='mshare_training_progress_v1';function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return{};}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
function start(tech){const s=load();s.active=s.active||{};s.active[tech]=Date.now();s.count=s.count||{};s.count[tech]=(s.count[tech]||0);save(s);}
function stop(tech){const s=load();const t=(s.active&&s.active[tech])||Date.now();const sec=Math.max(1,Math.round((Date.now()-t)/1000));delete s.active?.[tech];s.total=s.total||{};s.total[tech]=(s.total[tech]||0)+sec;save(s);try{const MS=window.__MSHARE__||{};if(MS.Stats&&typeof MS.Stats.addSession==='function'){MS.Stats.addSession({techId:tech,seconds:sec,breaths:0});}}catch{}}
function reset(tech){const s=load();if(s.total)delete s.total[tech];if(s.count)delete s.count[tech];if(s.active)delete s.active[tech];save(s);}
function renderBadges(){const s=load();$$('[data-progress-tech]').forEach(el=>{const id=el.getAttribute('data-progress-tech');const sec=(s.total&&s.total[id])||0;const min=Math.round(sec/60);el.textContent=min+' min';});}
return{start,stop,reset,renderBadges};})();

/* Pair controls: Start/Stop + Begin/End with focus */
function pairControls(root=document){root.querySelectorAll('.actions').forEach(group=>{const btns=Array.from(group.querySelectorAll('.btn,button'));if(!btns.length)return;const hasStart=btns.some(b=>/^\s*start\b/i.test(b.textContent)||b.dataset.act==='start');const hasStop=btns.some(b=>/^\s*stop\b/i.test(b.textContent)||b.dataset.act==='stop');const hasBegin=btns.some(b=>/^\s*begin\b/i.test(b.textContent)||b.dataset.act==='begin');const hasEnd=btns.some(b=>/^\s*end\b/i.test(b.textContent)||b.dataset.act==='end');function mk(label,act){const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.dataset.act=act;b.disabled=(act==='stop'||act==='end');b.addEventListener('click',()=>{if(act==='stop'||act==='end'){group.classList.remove('is-running');}else{group.classList.add('is-running');}});return b;}
if(hasStart&&!hasStop){group.appendChild(mk('Stop','stop'));}
if(hasBegin&&!hasEnd){group.appendChild(mk('End','end'));}
const startBtn=group.querySelector('[data-act="start"]');const stopBtn=group.querySelector('[data-act="stop"]');const beginBtn=group.querySelector('[data-act="begin"]');const endBtn=group.querySelector('[data-act="end"]');const container=group.closest('.card,.tech-card')||group.parentElement;function focusHost(){if(stopBtn)stopBtn.focus({preventScroll:false});if(container){container.setAttribute('tabindex','-1');container.classList.add('tech-card');container.focus({preventScroll:true});}}
function techId(){const id=(container&&container.id)||group.getAttribute('data-tech')||((group.previousElementSibling&&group.previousElementSibling.textContent)||'tech').toLowerCase().replace(/\s+/g,'-').slice(0,40);return id;}
if(startBtn&&stopBtn){startBtn.addEventListener('click',()=>{stopBtn.disabled=false;group.classList.add('is-running');Progress.start(techId());focusHost();});stopBtn.addEventListener('click',()=>{stopBtn.disabled=true;Progress.stop(techId());});}
if(beginBtn&&endBtn){beginBtn.addEventListener('click',()=>{endBtn.disabled=false;group.classList.add('is-running');Progress.start(techId());focusHost();});endBtn.addEventListener('click',()=>{endBtn.disabled=true;Progress.stop(techId());});}});}

/* Excerpts on mobile */
function applyExcerpts(){const isMobile=window.matchMedia('(max-width:640px)').matches;document.querySelectorAll('[data-excerpt]').forEach(el=>{const lines=parseInt(el.getAttribute('data-excerpt')||'3',10);if(isMobile){el.style.setProperty('--excerpt-lines',String(lines));el.classList.add('excerpted');let t=el.nextElementSibling;if(!t||!t.classList.contains('excerpt-toggle')){t=document.createElement('button');t.type='button';t.className='btn excerpt-toggle';t.textContent='More';el.after(t);t.addEventListener('click',()=>{const open=el.classList.toggle('excerpt-open');t.textContent=open?'Less':'More';});}}else{el.classList.remove('excerpted','excerpt-open');const t=el.nextElementSibling;if(t&&t.classList.contains('excerpt-toggle'))t.remove();}});}

/* Save/Reset/Print companion for Save buttons */
function attachSaveResetPrint(root=document){root.querySelectorAll('button, .btn').forEach(b=>{const label=(b.textContent||'').trim().toLowerCase();if(/^\s*save\b/.test(label)&&!b.dataset.paired){const wrap=b.parentElement||b;const reset=document.createElement('button');reset.type='button';reset.className='btn btn-reset';reset.textContent='Reset';const print=document.createElement('button');print.type='button';print.className='btn btn-print';print.textContent='Print';wrap.insertBefore(reset,b.nextSibling);wrap.insertBefore(print,reset.nextSibling);b.dataset.paired='1';reset.addEventListener('click',()=>{const scope=wrap.closest('.card,form,section,main')||document;scope.querySelectorAll('input,textarea').forEach(x=>{if(x.type==='checkbox'||x.type==='radio')x.checked=false;else x.value='';});Progress.reset((wrap.closest('.card')?.id)||'scope');});print.addEventListener('click',()=>{window.print();});}});}

/* ADHD page PDF fix helper (create real content) */
async function ensureAdhdPdfButton(){const adhdBtn=$('#adhdPdfDownload');if(!adhdBtn)return;adhdBtn.addEventListener('click',async()=>{const lines=[
'ADHD Quick Guide (UK)',
'Focus sprints 25/5 (Pomodoro): 25 min focus, 5 min break x4, then 20–30 min rest.',
'Break work into “First Action” steps; time‑box to 5–10 minutes.',
'Use body‑double: work alongside someone (in‑person/virtual).',
'Externalise tasks: Today Top 3, then “Do • Schedule • Delegate • Drop”.',
'Reduce friction: clear desk, single tab, notifications off, headphones.',
'Sleep/routine: wake time consistent, light on waking; move daily.',
'Educational only; not medical advice.'
];const blob=await PDFKit.textPdf('ADHD Support',lines);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='adhd_quick_guide.pdf';document.body.appendChild(a);a.click();a.remove();});}

/* Wire footer controls once present */
function wireFooter(){Theme.wire();const btn=$('#installAppBtn');if(btn)btn.addEventListener('click',e=>{e.preventDefault();});}

/* Boot */
document.addEventListener('DOMContentLoaded',()=>{enhanceNav();wireSmoothScroll();SoftNav.init();applyExcerpts();pairControls();attachSaveResetPrint();Theme.apply();AppInstall.init();AppInstall.initCta();ensureAdhdPdfButton();Progress.renderBadges();window.addEventListener('resize',()=>{clearTimeout(window.__exTO);window.__exTO=setTimeout(applyExcerpts,150);});wireFooter();});
})();
