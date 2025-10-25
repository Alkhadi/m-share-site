(() => {
  const $ = (s,c=document)=>c.querySelector(s);
  const el = {i:$("#rwInput"),b:$("#btnParaphrase"),c:$("#btnClear"),o:$("#outParaphrase")};
  async function go(){
    const t = el.i.value.trim();
    if(!t){el.o.textContent="Enter text.";return;}
    el.o.textContent="Processing…";
    try{
      const r=await fetch("/api/paraphrase",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t,region:"UK"})});
      const d=await r.json();
      el.o.textContent=d.paraphrase||d.error||"No result.";
    }catch(e){console.error(e);el.o.textContent="Error contacting server.";}
  }
  el.b?.addEventListener("click",go);
  el.c?.addEventListener("click",()=>{el.i.value="";el.o.textContent="";});
})();