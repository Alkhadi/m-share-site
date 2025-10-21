const fs=require('fs');const path=require('path');  
const refPath=path.join(__dirname,'c822a680-eb51-4fb7-87ce-8516602c61e3.html');  
if(!fs.existsSync(refPath)){console.error('Reference file not found:',refPath);process.exit(1);}  
const ref=fs.readFileSync(refPath,'utf8');  
function pick(re,s){const m=s.match(re);return m?m[0]:'';}  
const refHeader=pick(/<header[^>]*class="site-header"[\s\S]*?<\/header>/i,ref);  
const refFooter=pick(/<footer[^>]*class="footer-2025"[\s\S]*?<\/footer>/i,ref);  
const cssList=['style.css','assets/css/ux-fixes.css','assets/css/footer-2025.css','assets/css/header-2025.css','assets/css/nav-footer-uni.css','assets/css/responsive-fixes.css'];  
const jsList=['app.js','coach.js','assets/js/ux-fixes.js','assets/js/paylinks.js','assets/js/site-core.js','assets/js/a11y-fix.js','assets/js/start-fix.js','assets/js/nav-core.js','assets/js/sound-kit.js','assets/js/core/nav-autofix.js','assets/js/core/nav-core.js','assets/js/core/voice-coach.js','assets/js/core/sound-kit.js','assets/header/header.js','assets/footer/footer.js'];  
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}  
function ensureCss(html){  
  html=html.replace(/<style[^>]*id=["']breathing-responsive-fix["'][^>]*>[\s\S]*?<\/style>/gi,'');  
  cssList.forEach(href=>{  
    const re=new RegExp(`<link[^>]+href=["']${esc(href)}["'][^>]*>`,`i`);  
    if(!re.test(html)) html=html.replace(/<\/head>/i,`<link rel="stylesheet" href="${href}" />\n</head>`);  
  });  
  return html;  
}  
function removeKnownScripts(html){  
  const toRemove=jsList.concat(['assets/js/nav-2025.js']);  
  toRemove.forEach(src=>{  
    const re=new RegExp(`<script[^>]+src=["']${esc(src)}["'][^>]*>\\s*<\\/script>`,'gi');  
    html=html.replace(re,'');  
  });  
  return html;  
}  
function appendScripts(html){  
  const block='\n'+jsList.map(s=>`<script src="${s}"></script>`).join('\n')+'\n';  
  return html.replace(/<\/body>/i,block+'</body>');  
}  
function replaceHeaderFooter(html){  
  html=html.replace(/<header[^>]*class="site-header"[\s\S]*?<\/header>/i,refHeader||'$&');  
  html=html.replace(/<footer[\s\S]*?<\/footer>/gi,'');  
  return html.replace(/<\/body>/i,(refFooter||'')+'\n</body>');  
}  
function processFile(p){  
  let html=fs.readFileSync(p,'utf8');  
  html=ensureCss(html);  
  html=replaceHeaderFooter(html);  
  html=removeKnownScripts(html);  
  html=appendScripts(html);  
  fs.writeFileSync(p,html,'utf8');  
  console.log('Updated',p);  
}  
const targets=['box-breathing.html','4-7-8-breathing.html','coherent-5-5.html','sos-60.html'];  
['', 'extracted'].forEach(dir=>{  
  targets.forEach(name=>{  
    const p=path.join(__dirname,dir,name);  
    if(fs.existsSync(p)) processFile(p);  
  });  
});  
