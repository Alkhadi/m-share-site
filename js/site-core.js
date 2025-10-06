(function(){
  var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
  function lockScroll(on){var b=document.body;if(on){if(b.classList.contains('no-scroll'))return;b.dataset.scrollTop=String(window.scrollY);b.style.top='-'+window.scrollY+'px';b.classList.add('no-scroll')}else{if(!b.classList.contains('no-scroll'))return;b.classList.remove('no-scroll');var y=parseInt(b.dataset.scrollTop||'0',10);b.style.top='';window.scrollTo(0,y);delete b.dataset.scrollTop}}
  function enhanceNav(){
    var nav=$('#mainNav'),btn=$('#navToggle'); if(!nav||!btn) return;
    var backdrop=$('.nav-backdrop'); if(!backdrop){backdrop=document.createElement('div');backdrop.className='nav-backdrop';document.body.appendChild(backdrop)}
    $$('nav.main-nav a').forEach(function(a){if(a.dataset.href&&!a.getAttribute('href')) a.setAttribute('href',a.dataset.href+(location.search||'')); a.dataset.noSoft='true'; a.classList.add('no-soft')});
    function sync(){var open=nav.classList.contains('open');btn.setAttribute('aria-expanded',open?'true':'false');backdrop.style.display=open?'block':'none';lockScroll(open)}
    btn.addEventListener('click',function(){nav.classList.toggle('open');sync()},{passive:true});
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
    var qs=location.search||''; $$('[data-href]').forEach(function(a){if(!a.getAttribute('href')) a.setAttribute('href',a.getAttribute('data-href')+qs)}); var brand=$('#brandLink'); if(brand) brand.setAttribute('href','index.html'+qs);
    sync();
  }
  function wireSmoothAnchors(){
    document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]'); if(!a) return; var id=a.getAttribute('href').slice(1); if(!id) return; var t=document.getElementById(id); if(!t) return; e.preventDefault(); t.scrollIntoView({behavior:'smooth',block:'start'}); history.pushState({},'', '#'+id)});
  }
  function applyExcerpts(){
    var isMobile=window.matchMedia('(max-width:640px)').matches;
    $$('[data-excerpt]').forEach(function(el){
      var lines=parseInt(el.getAttribute('data-excerpt')||'3',10);
      if(isMobile){
        el.style.display='-webkit-box'; el.style.webkitBoxOrient='vertical'; el.style.overflow='hidden'; el.style.webkitLineClamp=String(lines);
        var t=el.nextElementSibling; if(!t||!t.classList.contains('excerpt-toggle')){t=document.createElement('button');t.type='button';t.className='btn excerpt-toggle';t.textContent='Read more';el.after(t);t.addEventListener('click',function(){var open=el.classList.toggle('excerpt-open');el.style.webkitLineClamp=open?'unset':String(lines);el.style.display=open?'block':'-webkit-box';t.textContent=open?'Show less':'Read more'})}
      }else{
        el.style.webkitLineClamp='unset'; el.style.display='block'; var t2=el.nextElementSibling; if(t2&&t2.classList.contains('excerpt-toggle')) t2.remove();
      }
    });
  }
  function pairControls(root){
    (root||document).querySelectorAll('.actions').forEach(function(group){
      var btns=Array.from(group.querySelectorAll('button,.btn'));
      if(!btns.length) return;
      var hasStart=btns.some(function(b){return /^\s*start\b/i.test(b.textContent)||b.dataset.act==='start'});
      var hasStop=btns.some(function(b){return /^\s*stop\b/i.test(b.textContent)||b.dataset.act==='stop'});
      var hasBegin=btns.some(function(b){return /^\s*begin\b/i.test(b.textContent)||b.dataset.act==='begin'});
      var hasEnd=btns.some(function(b){return /^\s*end\b/i.test(b.textContent)||b.dataset.act==='end'});
      function mk(label,act){var b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent=label; b.dataset.act=act; b.addEventListener('click',function(){if(act==='stop'||act==='end'){group.classList.remove('is-running')}else{group.classList.add('is-running')} group.scrollIntoView({behavior:'smooth',block:'center'})}); return b}
      if(hasStart && !hasStop){var bs=mk('Stop','stop');bs.disabled=true;group.appendChild(bs)}
      if(hasBegin && !hasEnd){var be=mk('End','end');be.disabled=true;group.appendChild(be)}
      var startBtn=group.querySelector('[data-act="start"], .btn.start'), stopBtn=group.querySelector('[data-act="stop"], .btn.stop'), beginBtn=group.querySelector('[data-act="begin"]'), endBtn=group.querySelector('[data-act="end"]');
      if(startBtn&&stopBtn){startBtn.addEventListener('click',function(){stopBtn.disabled=false; startBtn.blur(); group.focus&&group.focus()}); stopBtn.addEventListener('click',function(){stopBtn.disabled=true; showBack(group)})}
      if(beginBtn&&endBtn){beginBtn.addEventListener('click',function(){endBtn.disabled=false; beginBtn.blur(); group.focus&&group.focus()}); endBtn.addEventListener('click',function(){endBtn.disabled=true; showBack(group)})}
      function showBack(g){if(g.querySelector('.btn.back')) return; var b=document.createElement('button'); b.type='button'; b.className='btn back'; b.textContent='← Back'; b.addEventListener('click',function(){if(history.length>1) history.back(); else location.href='index.html'}); g.appendChild(b)}
    });
  }
  function addResetForAddButtons(){
    $$('.card, .tool, section').forEach(function(scope){
      var addBtn=Array.from(scope.querySelectorAll('button,.btn')).find(function(b){return /^\s*add\b/i.test(b.textContent)});
      if(addBtn && !scope.querySelector('.btn.reset')){
        var r=document.createElement('button'); r.type='button'; r.className='btn reset'; r.textContent='Reset'; addBtn.after(r);
        r.addEventListener('click',function(){Array.from(scope.querySelectorAll('input[type="text"], input[type="number"], textarea')).forEach(function(i){i.value=''}); Array.from(scope.querySelectorAll('input[type="checkbox"], input[type="radio"]')).forEach(function(i){i.checked=false}); scope.classList.remove('is-running')})
      }
    });
  }
  function themeInit(){
    var root=document.documentElement;
    function apply(bg,br){if(bg) root.style.setProperty('--app-bg',bg); if(br) root.style.setProperty('--app-bri',br); document.body.style.background=getComputedStyle(root).getPropertyValue('--app-bg')}
    var saved=localStorage.getItem('user_theme_bg')||''; var bri=localStorage.getItem('user_theme_bri')||'';
    if(saved||bri) apply(saved,bri);
    var c=$('#themeColor'), r=$('#themeBrightness');
    if(c){if(saved) c.value=saved; c.addEventListener('input',function(){localStorage.setItem('user_theme_bg',c.value); apply(c.value,localStorage.getItem('user_theme_bri'))})}
    if(r){if(bri) r.value=bri; r.addEventListener('input',function(){localStorage.setItem('user_theme_bri',r.value); apply(localStorage.getItem('user_theme_bg'),r.value)})}
  }
  function voiceCoach(){
    var synth=window.speechSynthesis; if(!synth) return;
    function voices(){return synth.getVoices().filter(function(v){return v.lang&&/^en/i.test(v.lang)})}
    function extractText(el){var out=[]; $$('ol li,ul li',el).forEach(function(li){var t=li.textContent.trim(); if(t) out.push(t)}); if(!out.length){$$('p',el).forEach(function(p){var t=p.textContent.trim(); if(t) out.push(t)}); if(!out.length){var t=el.textContent.trim(); if(t) out.push(t)}} return out.join('. ')}
    function attach(el){
      if(el.__vc_ok) return; el.__vc_ok=true;
      var bar=document.createElement('div'); bar.className='vc'; bar.style.display='flex'; bar.style.gap='8px'; bar.style.alignItems='center'; bar.style.margin='6px 0';
      var sel=document.createElement('select'); sel.className='vc-voice'; sel.style.minWidth='160px';
      var start=document.createElement('button'); start.type='button'; start.className='btn start'; start.textContent='🎧 Start'; start.dataset.act='start';
      var stop=document.createElement('button'); stop.type='button'; stop.className='btn stop'; stop.textContent='■ Stop'; stop.dataset.act='stop';
      bar.appendChild(sel); bar.appendChild(start); bar.appendChild(stop);
      var insAt=el.querySelector('h2, h3')||el.firstElementChild||el; el.insertBefore(bar,insAt.nextSibling);
      function fill(){var vs=voices(); sel.innerHTML=''; vs.forEach(function(v){var o=document.createElement('option'); o.value=v.name; o.textContent=v.name+' ('+v.lang+')'; sel.appendChild(o)}); var saved=localStorage.getItem('vc_voice'); if(saved){var opt=$$('option',sel).find(function(o){return o.value===saved}); if(opt) sel.value=saved}}
      fill(); if(voices().length===0){synth.onvoiceschanged=fill}
      start.addEventListener('click',function(){synth.cancel(); var u=new SpeechSynthesisUtterance(extractText(el)); var vv=voices().find(function(o){return o.name===sel.value}); if(vv) u.voice=vv; localStorage.setItem('vc_voice',sel.value); u.rate=1; u.pitch=1; u.onend=function(){el.classList.remove('vc-speaking')}; el.classList.add('vc-speaking'); synth.speak(u)});
      stop.addEventListener('click',function(){synth.cancel(); el.classList.remove('vc-speaking')});
    }
    $$('.card, [data-voice-coach], .technique').forEach(function(el){if(el.querySelector('ol,ul,p')) attach(el)});
  }
  function bytesFromB64(b64){var bin=atob(b64.replace(/^data:.*;base64,/,''));var len=bin.length,bytes=new Uint8Array(len);for(var i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return bytes}
  function jpegDim(bytes){var i=2;while(i<bytes.length){if(bytes[i]!==255){i++;continue}var m=bytes[i+1];var len=(bytes[i+2]<<8)|bytes[i+3];if(m>=192&&m<=195){return {height:(bytes[i+5]<<8)|bytes[i+6],width:(bytes[i+7]<<8)|bytes[i+8]};}i+=2+len}return {width:1224,height:1584}}
  async function loadImg(src){return await new Promise(function(res,rej){var i=new Image();i.crossOrigin='anonymous';i.onload=function(){res(i)};i.onerror=rej;i.src=src})}
  async function makeQR(text,size){var img=new Image();img.crossOrigin='anonymous';img.referrerPolicy='no-referrer';img.src='https://api.qrserver.com/v1/create-qr-code/?size='+(size||240)+'x'+(size||240)+'&data='+encodeURIComponent(text);await new Promise(function(r){img.onload=r;img.onerror=r});var c=document.createElement('canvas');c.width=size||240;c.height=size||240;var cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);try{cx.drawImage(img,0,0,c.width,c.height)}catch{}return c}
  function rr(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
  async function buildProfileCanvas(){
    var MS=window.__MSHARE__||{}; var d=MS.data||{name:'Alkhadi Koroma',title:'Professional Title · Flutter Developer',phone:'',email:'info@mindpaylink.com',site:'https://mindpaylink.com',avatar:'assets/alkhadi.png'};
    var W=1224,H=1584; var cnv=Object.assign(document.createElement('canvas'),{width:W,height:H}); var ctx=cnv.getContext('2d');
    var bg=getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim()||'#0f172a'; ctx.fillStyle=bg; ctx.fillRect(0,0,W,H); var g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'rgba(255,255,255,.06)'); g.addColorStop(1,'rgba(0,0,0,.35)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    var y=120; try{var av=await loadImg(d.avatar||'assets/alkhadi.png');var S=340;var cx=W/2;ctx.save();ctx.beginPath();ctx.arc(cx,y+S/2,S/2,0,Math.PI*2);ctx.closePath();ctx.fillStyle='rgba(255,255,255,.08)';ctx.fill();ctx.clip();ctx.drawImage(av,cx-S/2,y,S,S);ctx.restore();ctx.lineWidth=8;ctx.strokeStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.arc(cx,y+S/2,S/2,0,Math.PI*2);ctx.stroke();y+=S+46}catch(e){y+=46}
    ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='800 62px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillText(d.name||'',W/2,y); y+=72; ctx.font='600 34px ui-sans-serif,system-ui,Segoe UI,Roboto'; ctx.fillStyle='rgba(236,253,245,.95)'; ctx.fillText(d.title||'',W/2,y); y+=44;
    var btns=[{label:'📞 Call',url:d.phone?('tel:'+d.phone):''},{label:'✉️ Email',url:d.email?('mailto:'+d.email):''},{label:'🌐 Website',url:d.site||''}],links=[]; var bw=460,bh=90,gap=18,bx=(W-bw)/2; ctx.font='600 30px ui-sans-serif,system-ui,Segoe UI,Roboto';
    btns.forEach(function(b,i){var by=y+i*(bh+gap);ctx.fillStyle='rgba(0,0,0,.35)';ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;rr(ctx,bx,by,bw,bh,16);ctx.fill();ctx.stroke();ctx.fillStyle='#e5f7ff';ctx.fillText(b.label,W/2,by+bh/2+10);links.push({x:bx,y:by,w:bw,h:bh,url:b.url})}); y+=btns.length*(bh+gap)+30;
    var qp=(MS.qp||''); var dest=location.origin+location.pathname.replace(/[^/]*$/,'')+'about.html'+qp; var qr=await makeQR(dest,280); var qx=(W-qr.width)/2, qy=Math.min(H-qr.height-80,y); ctx.drawImage(qr,qx,qy); links.push({x:qx,y:qy,w:qr.width,h:qr.height,url:dest});
    return {canvas:cnv,links:links};
  }
  async function pdfFromCanvas(cnv,links){
    var dataUrl=cnv.toDataURL('image/jpeg',.92); var imgBytes=bytesFromB64(dataUrl); var dim=jpegDim(imgBytes); var PW=595,PH=842; var contentStr='q\n'+PW+' 0 0 '+PH+' 0 0 cm\n/Im0 Do\nQ\n';
    var encoder=[],idx=[],off=0; function push(s){var bytes=(typeof s==='string')?new TextEncoder().encode(s):s; idx.push(off); encoder.push(bytes); off+=bytes.length}
    function obj(n,body){push(n+' 0 obj\n');push(body);push('\nendobj\n')}
    var annots=links.filter(function(l){return l.url}).map(function(l){var sx=PW/1224,sy=PH/1584;var x1=l.x*sx,y1=PH-(l.y+l.h)*sy,x2=(l.x+l.w)*sx,y2=PH-(l.y)*sy;return {rect:[x1,y1,x2,y2],url:l.url}});
    push('%PDF-1.4\n'); obj(1,'<< /Type /Catalog /Pages 2 0 R >>'); obj(2,'<< /Type /Pages /Count 1 /Kids [3 0 R] >>'); var ann=annots.map(function(_,i){return (6+i)+' 0 R'}).join(' '); obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+PW+' '+PH+'] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R '+(annots.length?('/Annots ['+ann+']'):'')+' >>'); obj(4,'<< /Length '+contentStr.length+' >>\nstream\n'+contentStr+'endstream'); obj(5,'<< /Type /XObject /Subtype /Image /Name /Im0 /Width '+dim.width+' /Height '+dim.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+imgBytes.length+' >>\nstream\n'); push(imgBytes); push('\nendstream\nendobj\n'); annots.forEach(function(a,i){obj(6+i,'<< /Type /Annot /Subtype /Link /Border [0 0 0] /Rect ['+a.rect.map(function(v){return v.toFixed(2)}).join(' ')+'] /A << /S /URI /URI ('+a.url+') >> >>')});
    var xrefStart=off; push('xref\n'); var count=6+annots.length; push('0 '+(count+1)+'\n'); push('0000000000 65535 f \n'); for(var i=0;i<count;i++){push(String(idx[i]).padStart(10,'0')+' 00000 n \n')} push('trailer << /Size '+(count+1)+' /Root 1 0 R >>\nstartxref\n'+xrefStart+'\n%%EOF');
    return new Blob(encoder.map(function(b){return b.buffer?b:new Uint8Array(b)}),{type:'application/pdf'});
  }
  async function downloadProfilePdf(){
    try{
      var built=await buildProfileCanvas(); var blob=await pdfFromCanvas(built.canvas,built.links); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='profile.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href)},1200);
    }catch(e){}
  }
  function hookProfilePdfButtons(){
    document.addEventListener('click',function(e){
      var b=e.target.closest('#downloadProfilePdf,#downloadPdf,[data-action="download-profile"],button, a');
      if(!b) return;
      var t=(b.textContent||'').toLowerCase();
      if(t.includes('download profile pdf')||b.id==='downloadPdf'){e.preventDefault(); downloadProfilePdf()}
    });
  }
  function coachPdfFix(){
    window.MSCoach=window.MSCoach||{};
    if(!window.MSCoach.downloadLinksPdf){
      window.MSCoach.downloadLinksPdf=async function(title,items){
        try{
          var list=Array.isArray(items)?items:[]; var W=1224,H=1584; var cnv=Object.assign(document.createElement('canvas'),{width:W,height:H}); var ctx=cnv.getContext('2d'); ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font='700 54px ui-sans-serif,system-ui,Segoe UI'; ctx.fillText(title||'Resources',80,110);
          ctx.font='500 28px ui-sans-serif,system-ui,Segoe UI'; var y=160; var links=[]; list.forEach(function(it){var label=(it.title||it.name||String(it)); var url=it.url||it.link||String(it); ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fillText('• '+label,80,y); ctx.fillStyle='#93c5fd'; ctx.fillText(url,80,y+28); links.push({x:80,y:y+6,w:960,h:30,url:url}); y+=64});
          var blob=await pdfFromCanvas(cnv,links); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(title||'resources')+'.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href)},1200);
        }catch(e){}
      }
    }
  }
  function run(){
    enhanceNav(); wireSmoothAnchors(); applyExcerpts(); pairControls(); addResetForAddButtons(); themeInit(); voiceCoach(); hookProfilePdfButtons(); coachPdfFix();
    window.addEventListener('resize',function(){clearTimeout(window.__excerptTO); window.__excerptTO=setTimeout(applyExcerpts,150)});
    document.addEventListener('mshare:navigated',function(){applyExcerpts(); pairControls(); voiceCoach(); addResetForAddButtons()});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
