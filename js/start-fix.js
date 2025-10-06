(function(){
  var isTech=function(){
    var f=(location.pathname.split('/').pop()||'').toLowerCase();
    return window.__START_FIX_OFF===true || /^(box-breathing|4-7-8-breathing|coherent-5-5|sos|sos-60)\.html$/.test(f);
  };
  function normalize(){
    try{ document.querySelectorAll('button:not([type])').forEach(function(b){ b.setAttribute('type','button'); }); }catch(_){}
  }
  function run(){ if(isTech()) return; normalize(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
})();
