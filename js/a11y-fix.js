(function(){
  function hasName(el){
    if(el.hasAttribute('aria-label')||el.hasAttribute('aria-labelledby')||el.hasAttribute('title')||el.hasAttribute('placeholder')) return true;
    var id=el.id; if(!id) return false;
    return !!document.querySelector('label[for="'+id+'"]');
  }
  function apply(){
    document.querySelectorAll('input:not([type="hidden"]),textarea,select').forEach(function(el){
      if(hasName(el)) return;
      var t=el.tagName.toLowerCase();
      var name=(el.getAttribute('name')||el.id||'Control').replace(/[_\-]+/g,' ').trim()||'Control';
      el.setAttribute('aria-label',name);
      el.setAttribute('title',name);
      if(t==='input'&&!el.getAttribute('placeholder')) el.setAttribute('placeholder',' ');
    });
    document.querySelectorAll('button:not([type])').forEach(function(b){ b.setAttribute('type','button'); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply); else apply();
})();
