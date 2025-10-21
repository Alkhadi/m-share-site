(function(){
  var STRIPE='https://buy.stripe.com/28E4gy5j6cmD2wu3pk4Rq00';
  function fix(a){if(!a)return; a.href=STRIPE; a.target='_blank'; a.rel='noopener';}
  document.addEventListener('DOMContentLoaded',function(){
    Array.from(document.querySelectorAll('a')).forEach(function(a){
      var t=(a.textContent||'').toLowerCase();
      if(/support us|buy me coffee|buy me a coffee|donate/.test(t)) fix(a);
      if(a.dataset && a.dataset.href && /coffee\.html/i.test(a.dataset.href)) a.setAttribute('href',STRIPE);
    });
  });
})();
