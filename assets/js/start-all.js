(function(){
  var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
  function label(el){return (el.textContent||el.value||'').trim().toLowerCase()}
  function isStartBtn(b){return b && (b.dataset.act==='start' || /^start$/.test(label(b)) || /^begin$/.test(label(b)) || /^(go|run)$/.test(label(b)) || /pStart$/i.test(b.id||''))}
  function isStopBtn(b){return b && (b.dataset.act==='stop' || /^stop$/.test(label(b)) || /^end$/.test(label(b)) || /pStop$/i.test(b.id||''))}
  function ensureStopFor(group){
    var stop = group.querySelector('button[data-act="stop"],button#pStop,button#sStop,button#schStop,button#ranStop');
    if(!stop){
      stop=document.createElement('button');
      stop.type='button'; stop.className='btn'; stop.dataset.act='stop'; stop.textContent='Stop';
      stop.disabled=true; group.appendChild(stop);
    }
    return stop;
  }
  function wireGroup(group){
    if(group.__wired) return; group.__wired=true;
    var start = group.querySelector('button[data-act="start"],button#pStart,button#sStart,button#schStart,button#ranGo') || Array.from(group.querySelectorAll('button')).find(isStartBtn);
    if(!start) return;
    var stop = ensureStopFor(group);
    function container(){ return start.closest('.card,[data-tech],section,main') || document.body }
    start.addEventListener('click', function(){
      try{ stop.disabled=false; start.disabled=true; container().classList.add('is-running'); }catch(e){}
    }, {capture:false});
    stop.addEventListener('click', function(){
      try{ stop.disabled=true; start.disabled=false; container().classList.remove('is-running'); }catch(e){}
    }, {capture:false});
  }
  function sweep(){ $$('.actions').forEach(wireGroup) }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', sweep); } else { sweep() }
  setTimeout(sweep, 350);
  document.addEventListener('mshare:navigated', sweep);
  document.addEventListener('click', function(e){
    var b=e.target.closest('button'); if(!b) return;
    if(isStartBtn(b)){ var g=b.closest('.actions')||b.parentElement; if(g) wireGroup(g); }
  });
})();
