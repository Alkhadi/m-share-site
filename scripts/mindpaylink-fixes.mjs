#!/usr/bin/env node
/**
 * scripts/mindpaylink-fixes.mjs
 * Version: v4 (2025-10-09)
 *
 * One-shot, idempotent patcher for MindPayLink:
 *  - Mobile nav (≤1024px): hamburger + chevrons open/close submenus on tap/click; outside-click & Esc close.
 *  - Desktop nav (>1024px): untouched by JS (no behavior change).
 *  - Voice Coach panel: add Pin/Unpin and Drag; persist position via localStorage.
 *  - Dyslexia Section 2 (GP mapping): rebuild into 6 cards (3x2), add +6 examples per line, focus overlay on Start.
 *  - Section 4 (Reading): green Start button becomes a natural TTS narrator (selection first; else default text).
 *  - Focus overlays: de-duplicate; keep only one visible layer.
 *
 * Usage:
 *   node scripts/mindpaylink-fixes.mjs         # from project root
 *   node scripts/mindpaylink-fixes.mjs /path/to/site/root
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || process.cwd());

/* ---------- helpers ---------- */
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
function insertBefore(html, marker, injection) {
  const i = html.toLowerCase().lastIndexOf(marker.toLowerCase());
  if (i === -1) return html;
  return html.slice(0, i) + injection + html.slice(i);
}
function backupWrite(file, content) {
  const bak = file + '.bak';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, content, 'utf8');
}
function stripTagById(html, ...ids) {
  for (const id of ids) {
    const re = new RegExp(`<(?:script|style)[^>]*\\bid=["']${id}["'][\\s\\S]*?<\\/(?:script|style)>\\s*`, 'gi');
    html = html.replace(re, '');
  }
  return html;
}
function ensureOnce(html, token) {
  return html.includes(token);
}
function escScript(s) {
  return s.trim().replace(/<\/script>/gi, '<\\/script>');
}

/* ---------- injections (CSS/JS) ---------- */

/** 1) Mobile nav CSS (v4) **/
const NAV_STYLE = escScript(`
<style id="mpl-mobile-nav-style-v4">
  /* Ensure [hidden] truly hides dropdowns in any theme */
  nav .menu[hidden], nav .submenu[hidden] { display:none !important; }

  /* Small/medium behavior only */
  @media (max-width: 1024px) {
    /* Collapsible whole nav */
    #mainNav[hidden] { display: none !important; }
    /* Group baseline */
    .nav-group, .menu-group { position: relative; }
    /* When marked open, reveal child menu block / list */
    .nav-group.open > .menu,
    .menu-group.open > .submenu { display:block; }

    /* Clickable targets (chevrons/toggles) */
    .nav-group > .menu-toggle,
    .nav-group > .chevron,
    .nav-group [data-chevron],
    .menu-group > .menu-toggle,
    .menu-group > .chevron,
    .menu-group [data-chevron] { cursor:pointer; touch-action: manipulation; }

    /* A11y focus rings on triggers */
    .nav-group > a:focus,
    .nav-group > button:focus,
    .nav-group > .menu-toggle:focus,
    .nav-group > .chevron:focus,
    .menu-group > a:focus,
    .menu-group > button:focus,
    .menu-group > .menu-toggle:focus,
    .menu-group > .chevron:focus { outline:2px solid currentColor; outline-offset:2px; }
  }

  /* Hamburger is hidden on desktop */
  @media (min-width: 1025px) { #navToggle{ display:none !important; } }
</style>
`);

/** 1) Mobile nav JS (v4) **/
const NAV_PATCH = escScript(`
<script id="mpl-mobile-nav-patch-v4">
(function(){
  var MQ = window.matchMedia ? window.matchMedia("(max-width: 1024px)") : {matches:true, addEventListener:function(){}};

  function onReady(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  }
  function closestNavRoot() {
    return document.getElementById('mainNav')
        || document.querySelector('nav.main-nav')
        || document.querySelector('header nav')
        || document.querySelector('nav');
  }

  onReady(function init(){
    var nav = closestNavRoot();
    if (!nav) return;

    var toggle = document.getElementById('navToggle')
      || document.querySelector('.nav-toggle, .hamburger, [aria-controls="mainNav"]');

    function openNav(){
      if (!MQ.matches || !nav || !toggle) return;
      toggle.setAttribute('aria-expanded','true');
      nav.removeAttribute('hidden');
      var cs = window.getComputedStyle(nav);
      if (cs.display === 'none') nav.style.display = 'block';
      document.body.classList.add('nav-open');
    }
    function closeNav(){
      if (!nav || !toggle) return;
      toggle.setAttribute('aria-expanded','false');
      if (MQ.matches){ nav.setAttribute('hidden',''); nav.style.display = 'none'; }
      document.body.classList.remove('nav-open');
    }
    function isOpen(){ return toggle && toggle.getAttribute('aria-expanded') === 'true'; }

    if (toggle){
      toggle.setAttribute('aria-controls', nav.id || 'mainNav');
      if (!toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click', function(e){ if (MQ.matches){ e.preventDefault(); isOpen()?closeNav():openNav(); } }, {passive:false});
      document.addEventListener('click', function(e){
        if (!MQ.matches || !isOpen()) return;
        if (e.target.closest('#mainNav, #navToggle, .nav-toggle, .hamburger')) return;
        closeNav();
      }, {passive:true});
      document.addEventListener('keydown', function(e){ if (MQ.matches && e.key === 'Escape' && isOpen()) closeNav(); }, {passive:true});
    }

    function closeOthers(except){
      if (!MQ.matches) return;
      nav.querySelectorAll('.nav-group.open, .menu-group.open').forEach(function(g){
        if (g === except) return;
        var m = g.querySelector('.menu, .submenu, [role="menu"], :scope > ul');
        if (m) m.setAttribute('hidden','');
        g.classList.remove('open');
        var t = g.querySelector('.nav-button, .menu-toggle, .chevron, [data-chevron], :scope > a, :scope > button');
        if (t) t.setAttribute('aria-expanded','false');
      });
    }

    Array.prototype.slice.call(nav.querySelectorAll('.nav-group, .menu-group')).forEach(function(g){
      var btn = g.querySelector('.nav-button, .menu-toggle, .chevron, [data-chevron], :scope > a, :scope > button');
      var menu= g.querySelector('.menu, .submenu, [role="menu"], :scope > ul');
      if (!btn || !menu) return;

      function initForViewport(){
        if (!MQ.matches){
          // Desktop: leave site behavior unchanged; ensure menus are not forced hidden
          menu.removeAttribute('hidden');
          g.classList.remove('open');
          btn.setAttribute('aria-expanded','false');
          return;
        }
        // Mobile: start closed
        menu.setAttribute('hidden','');
        g.classList.remove('open');
        btn.setAttribute('tabindex','0');
        btn.setAttribute('aria-haspopup','menu');
        btn.setAttribute('aria-expanded','false');
      }

      function open(){
        closeOthers(g);
        menu.removeAttribute('hidden');
        g.classList.add('open');
        btn.setAttribute('aria-expanded','true');
      }
      function close(){
        menu.setAttribute('hidden','');
        g.classList.remove('open');
        btn.setAttribute('aria-expanded','false');
      }
      function toggle(e){ if (e) e.preventDefault(); (g.classList.contains('open') ? close : open)(); }

      // Mobile toggles only (desktop untouched)
      btn.addEventListener('click', function(e){ if (MQ.matches) toggle(e); }, {passive:false});
      btn.addEventListener('keydown', function(e){
        if (!MQ.matches) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); btn.focus(); }
      }, {passive:false});

      initForViewport();
      if (MQ.addEventListener) MQ.addEventListener('change', initForViewport);
      else if (MQ.addListener)  MQ.addListener(initForViewport);
    });

    // Close any open submenu on outside click (mobile)
    document.addEventListener('click', function(e){
      if (!MQ.matches) return;
      var hit = e.target.closest('.nav-group, .menu-group, #mainNav, #navToggle');
      if (!hit) closeOthers(null);
    }, {passive:true});
  });
})();
</script>
`);

/** 2) Voice Coach styles (v2) **/
const VC_STYLE = escScript(`
<style id="mpl-vc-style-v2">
  .vc-draggable { position: fixed !important; z-index: 2147483642 !important; }
  .vc-drag-handle { cursor: move; user-select:none; -webkit-user-select:none; padding:6px 10px; font-weight:600; }
  .vc-pin-toggle { position: absolute; top:8px; right:8px; }
  .vc-pinned { box-shadow: 0 0 0 2px rgba(0,0,0,.1); }
</style>
`);

/** 2) Voice Coach JS (v2) **/
const VC_PATCH = escScript(`
<script id="mpl-vc-patch-v2">
(function(){
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }
  function findPanel(){
    return document.querySelector('#voiceCoachPanel, .voice-coach, #vcPanel, #voiceCoach, #vc-focus-panel, #vc-focus');
  }
  function persist(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }
  function restore(key){ try { var v = localStorage.getItem(key); return v? JSON.parse(v) : null; } catch(e){ return null; } }

  function makeDraggable(panel){
    if (!panel || panel.__mpl_vc_draggable) return;
    panel.__mpl_vc_draggable = true;
    panel.classList.add('vc-draggable');
    panel.style.inset = 'auto'; // avoid anchoring conflicts

    // Drag handle (prepended if not present)
    var handle = panel.querySelector('.vc-drag-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'vc-drag-handle';
      handle.textContent = 'Voice Coach';
      handle.setAttribute('role','toolbar');
      panel.insertBefore(handle, panel.firstChild);
    }

    // Pin button
    var pin = panel.querySelector('.vc-pin-toggle');
    if (!pin) {
      pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'vc-pin-toggle';
      pin.textContent = 'Pin';
      pin.setAttribute('aria-pressed','false');
      panel.appendChild(pin);
    }

    var pref = restore('mpl.vc.pref') || { pinned:false, x: 20, y: 20 };
    var dragging=false, startX=0, startY=0, origX=0, origY=0;

    function applyPos(){ panel.style.left = (pref.x|0)+'px'; panel.style.top = (pref.y|0)+'px'; }
    function updatePinUI(){
      if (pref.pinned){ panel.classList.add('vc-pinned'); pin.textContent='Unpin'; pin.setAttribute('aria-pressed','true'); }
      else { panel.classList.remove('vc-pinned'); pin.textContent='Pin'; pin.setAttribute('aria-pressed','false'); }
    }

    applyPos(); updatePinUI();

    pin.addEventListener('click', function(){ pref.pinned = !pref.pinned; updatePinUI(); persist('mpl.vc.pref', pref); });

    function onDown(ev){
      if (pref.pinned) return;
      dragging = true;
      var p = ('touches' in ev && ev.touches && ev.touches.length) ? ev.touches[0] : ev;
      startX = p.clientX; startY = p.clientY;
      var rect = panel.getBoundingClientRect();
      origX = rect.left + window.scrollX; origY = rect.top + window.scrollY;
      ev.preventDefault();
    }
    function onMove(ev){
      if (!dragging || pref.pinned) return;
      var p = ('touches' in ev && ev.touches && ev.touches.length) ? ev.touches[0] : ev;
      var dx = p.clientX - startX, dy = p.clientY - startY;
      pref.x = Math.max(0, Math.min(window.innerWidth  - (panel.offsetWidth  || 300), origX + dx));
      pref.y = Math.max(0, Math.min(window.innerHeight - (panel.offsetHeight || 200), origY + dy));
      applyPos();
    }
    function onUp(){ if (!dragging) return; dragging = false; persist('mpl.vc.pref', pref); }

    handle.addEventListener('mousedown', onDown, {passive:false});
    document.addEventListener('mousemove', onMove, {passive:false});
    document.addEventListener('mouseup', onUp, {passive:true});

    handle.addEventListener('touchstart', onDown, {passive:false});
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp, {passive:true});
    document.addEventListener('touchcancel', onUp, {passive:true});
  }

  onReady(function(){
    var p = findPanel();
    if (p) makeDraggable(p);
  });
})();
</script>
`);

/** 3) GP Section styles (v2) **/
const GP_STYLE = escScript(`
<style id="mpl-gp-cards-style-v2">
  #gp-cards { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
  @media (max-width: 640px){ #gp-cards{ grid-template-columns: 1fr; } }
  .gp-card { border:1px solid var(--gp-border,#ddd); border-radius:10px; padding:12px; background:var(--gp-bg,#fff); }
  .gp-card h4 { margin:0 0 8px; font-size:1rem; }
  .gp-examples { display:flex; flex-wrap:wrap; gap:8px; }
  .gp-examples .chip { padding:4px 8px; border-radius:999px; border:1px solid #ccc; font-size:.88rem; }
  .gp-card[aria-selected="true"] { outline:3px solid #4a90e2; }
  #gp-overlay[hidden]{ display:none; }
  #gp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; justify-content:center; align-items:center; z-index:2147483641; }
  #gp-overlay .gp-modal{ width:clamp(280px, 90vw, 720px); max-height:85vh; overflow:auto; background:#fff; padding:16px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,.35); position:relative; }
  #gp-overlay .close { position:absolute; top:14px; right:16px; }
</style>
`);

/** 3) GP Section JS (v2) **/
const GP_PATCH = escScript(`
<script id="mpl-gp-patch-v2">
(function(){
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }

  // Dataset: original examples + 6 new per line
  var DATA = {
    "Short vowels": [
      ["a /a/", ["cat","map","sad","bag","flag","hand","pan","track"]],
      ["e /e/", ["bed","hem","pen","bell","nest","tent","best","neck"]],
      ["i /i/", ["sit","milk","fish","list","swim","brick","hill","chip"]],
      ["o /o/", ["hot","pond","lock","mop","fox","rock","cob","sock"]],
      ["u /u/", ["sun","drum","duck","cup","jump","brush","luck","bus"]]
    ],
    "Long vowels": [
      ["a /ā/", ["late","paper","bake","game","snake","frame","table","gate"]],
      ["e /ē/", ["tree","even","these","meter","theme","delete","piece","chief"]],
      ["i /ī/", ["time","pilot","smile","kite","drive","hike","prize","spider"]],
      ["o /ō/", ["home","open","stone","rope","nose","global","focus","hotel"]],
      ["u /yoo/", ["unit","music","unicorn","human","pupil","future","cube","uniform"]]
    ],
    "Digraphs / trigraphs": [
      ["sh", ["ship","brush","shine","wish","splash","sheep","shop","finish"]],
      ["ch", ["chat","teacher","chess","bench","kitchen","chocolate","chapter","lunch"]],
      ["th (/θ/ or /ð/)", ["thin","this","think","bath","path","father","weather","both"]],
      ["ph", ["phone","graph","photo","dolphin","alphabet","trophy","sphere","elephant"]],
      ["wh", ["when","whale","wheel","whisper","white","where","while","which"]],
      ["igh", ["high","night","sight","light","bright","flight","right","might"]],
      ["tch", ["catch","match","watch","patch","stitch","latch","witch","fetch"]],
      ["dge", ["bridge","edge","badge","hedge","judge","fudge","lodge","wedge"]]
    ],
    "Vowel teams": [
      ["ai/ay", ["rain","day","paint","mail","chain","tray","play","display"]],
      ["ee/ea", ["see","team","green","please","speed","read","beach","seat"]],
      ["oa/ow", ["boat","snow","float","soap","coach","slow","crow","window"]],
      ["oi/oy", ["coin","boy","boil","toy","point","joy","soil","enjoy"]],
      ["ou/ow", ["sound","cloud","house","loud","mouth","brown","crowd","down"]],
      ["au/aw", ["cause","saw","author","August","draw","crawl","sauce","lawn"]]
    ],
    "R‑controlled vowels": [
      ["ar", ["car","start","park","farm","dark","sharp","large","garden"]],
      ["er/ir/ur", ["her","bird","turn","fern","first","nurse","curl","girl"]],
      ["or", ["fork","north","storm","short","horse","corn","porch","torch"]]
    ],
    "Silent letters": [
      ["kn/gn", ["knee","gnome","knife","knight","knock","knead","gnat","gnash"]],
      ["wr", ["write","wrist","wrong","wrap","wreck","wriggle","wren","wrench"]],
      ["mb", ["thumb","comb","lamb","climb","numb","tomb","bomb","crumb"]],
      ["igh", ["light","night","bright","sight","tight","high","slight","delight"]],
      ["tch", ["(pattern)","—","hatch","stitch","notch","clutch","sketch","batch"]]
    ]
  };

  function findGPSection(){
    var byId = document.querySelector('#gp-section, #dyslexia-gp, [data-section="dyslexia-gp"]');
    if (byId) return byId;
    var nodes = Array.prototype.slice.call(document.querySelectorAll('section,div,main,article'));
    return nodes.find(function(n){ return /Grapheme[–-]phoneme|GP mapping|Short vowels/i.test(n.textContent||''); }) || null;
  }
  function findStartButtonNear(el){
    if (!el) return null;
    var btn = el.querySelector('button, .btn, [role="button"]');
    if (btn && /start/i.test(btn.textContent||'')) return btn;
    var candidates = Array.prototype.slice.call(el.querySelectorAll('button, .btn, [role="button"]'));
    return candidates.find(function(b){ return /start/i.test((b.textContent||'').trim()); }) || null;
  }

  function buildCards(){
    var host = document.createElement('div');
    host.id = 'gp-cards';
    Object.keys(DATA).forEach(function(group){
      var card = document.createElement('section');
      card.className = 'gp-card';
      card.setAttribute('tabindex','0');
      card.setAttribute('role','group');
      card.setAttribute('aria-label', group);

      var h = document.createElement('h4'); h.textContent = group; card.appendChild(h);

      DATA[group].forEach(function(line){
        var label = line[0], words = line[1];
        var row = document.createElement('div'); row.className = 'gp-examples';
        var tag = document.createElement('strong'); tag.textContent = label + ' — '; tag.style.marginRight = '6px';
        row.appendChild(tag);
        words.forEach(function(w){ var chip = document.createElement('span'); chip.className='chip'; chip.textContent = w; row.appendChild(chip); });
        card.appendChild(row);
      });
      host.appendChild(card);
    });
    return host;
  }

  function ensureOverlay(){
    var ov = document.getElementById('gp-overlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'gp-overlay';
    ov.setAttribute('hidden','');
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    var modal = document.createElement('div'); modal.className = 'gp-modal';
    var close = document.createElement('button'); close.className='close'; close.type='button'; close.textContent='Close';
    close.addEventListener('click', function(){ ov.setAttribute('hidden',''); });
    ov.appendChild(modal); ov.appendChild(close);
    ov.addEventListener('click', function(e){ if (e.target === ov) ov.setAttribute('hidden',''); }, {passive:true});
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !ov.hasAttribute('hidden')) ov.setAttribute('hidden',''); }, {passive:true});
    document.body.appendChild(ov);
    return ov;
  }

  function run(){
    var sec = findGPSection(); if (!sec) return;
    if (!sec.__mpl_gp_bak) sec.__mpl_gp_bak = sec.innerHTML;
    sec.innerHTML = '';
    var cards = buildCards(); sec.appendChild(cards);

    var selected = null;
    cards.addEventListener('click', function(e){
      var c = e.target.closest('.gp-card'); if (!c) return;
      Array.prototype.slice.call(cards.querySelectorAll('.gp-card')).forEach(function(x){ x.setAttribute('aria-selected','false'); });
      c.setAttribute('aria-selected','true'); selected = c;
    }, {passive:true});
    cards.addEventListener('keydown', function(e){
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('gp-card')){ e.preventDefault(); e.target.click(); }
    });

    var start = findStartButtonNear(sec);
    if (start){
      var overlay = ensureOverlay();
      start.addEventListener('click', function(){
        var card = selected || cards.querySelector('.gp-card'); if (!card) return;
        var clone = card.cloneNode(true);
        overlay.querySelector('.gp-modal').innerHTML = '';
        overlay.querySelector('.gp-modal').appendChild(clone);
        overlay.removeAttribute('hidden');
      });
    }
  }

  onReady(run);
})();
</script>
`);

/** 4) Reading Section TTS (v2) **/
const TTS_PATCH = escScript(`
<script id="mpl-tts-patch-v2">
(function(){
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }

  function sectionCandidates(){
    var all = Array.prototype.slice.call(document.querySelectorAll('section, main, article, div'));
    // Prefer candidates with "reading" in their heading or data attributes
    return all.filter(function(el){
      var t = (el.getAttribute('id')||'') + ' ' + (el.getAttribute('class')||'') + ' ' + (el.getAttribute('aria-label')||'');
      t += ' ' + (el.querySelector('h1,h2,h3,h4') ? (el.querySelector('h1,h2,h3,h4').textContent||'') : '');
      return /reading/i.test(t);
    });
  }
  function findReadingSection(){
    var byId = document.querySelector('#reading-section, [data-section="reading"], #section4, .reading-section');
    if (byId) return byId;
    var cands = sectionCandidates();
    return cands.length ? cands[0] : null;
  }
  function findStartButtonWithin(el){
    if (!el) return null;
    var buttons = Array.prototype.slice.call(el.querySelectorAll('button, .btn, [role="button"]'));
    // Prefer a green-ish "Start" by text; fall back to any Start
    var primary = buttons.find(function(b){ return /start/i.test((b.textContent||'').trim()); });
    return primary || null;
  }
  function getSelectionText(){
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).trim()) return String(sel);
    return '';
  }
  function pickDefaultText(sectionEl){
    var target = sectionEl.querySelector('[data-reading-default], .reading-text, article, p, .card, .content') || sectionEl;
    var s = (target.innerText || target.textContent || '').trim();
    // Trim very long nav text if accidentally captured
    if (s.length > 25000) s = s.slice(0, 25000);
    return s;
  }
  function pickVoice(synth){
    try {
      var list = synth.getVoices() || [];
      var preferred = [
        "Microsoft Sonia Online (Natural)",
        "Microsoft Ryan Online (Natural)",
        "Microsoft Aria Online (Natural)",
        "Google UK English Female",
        "Google US English"
      ];
      for (var i=0;i<preferred.length;i++){
        var v = list.find(function(x){ return x && x.name && x.name.indexOf(preferred[i]) !== -1; });
        if (v) return v;
      }
      var enGB = list.find(function(v){ return v && /en-GB/i.test(v.lang); });
      if (enGB) return enGB;
      var en = list.find(function(v){ return v && /en/i.test(v.lang); });
      return en || list[0] || null;
    } catch(e){ return null; }
  }

  onReady(function(){
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    var synth = window.speechSynthesis;
    var sec = findReadingSection(); if (!sec) return;
    var startBtn = findStartButtonWithin(sec); if (!startBtn) return;

    var speaking = false, currentUtterance = null;

    function speak(text){
      if (!text) return;
      try { if (synth.speaking) synth.cancel(); } catch(e){}
      var u = new SpeechSynthesisUtterance(text);
      var v = pickVoice(synth); if (v) u.voice = v;
      u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
      u.onend = function(){ speaking = false; startBtn.textContent = 'Start'; };
      u.onerror = function(){ speaking = false; startBtn.textContent = 'Start'; };
      speaking = true; startBtn.textContent = 'Stop';
      synth.speak(u); currentUtterance = u;
    }

    startBtn.addEventListener('click', function(){
      if (speaking){ try { synth.cancel(); } catch(e){} speaking = false; startBtn.textContent = 'Start'; return; }
      var chosen = getSelectionText();
      if (!chosen) chosen = pickDefaultText(sec);
      speak(chosen);
    });
  });
})();
</script>
`);

/** 5) Focus overlay de‑dupe (v4) **/
const FOCUS_DEDUPE = escScript(`
<script id="mpl-focus-dedupe-v4">
(function(){
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); }
  function hide(node){ if (!node) return; node.style.display='none'; node.setAttribute('data-removed-by-fix','true'); }
  function run(){
    var keep = document.getElementById('gp-overlay') || document.querySelector('#focusModal, .focus-screen, #vc-focus');
    var layers = Array.prototype.slice.call(document.querySelectorAll('#focusModal, .focus-screen, .focus-overlay, #vc-focus, .vc-focus, #gp-overlay'));
    if (!layers.length) return;
    if (!keep) {
      var top = null, z = -Infinity;
      layers.forEach(function(el){
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
        var zi = parseInt(cs.zIndex||'0',10); if (isNaN(zi)) zi = 0;
        if (zi >= z) { z = zi; top = el; }
      });
      keep = top;
    }
    layers.forEach(function(el){ if (el !== keep) hide(el); });
  }
  onReady(run);
})();
</script>
`);

/* ---------- main ---------- */
(function run() {
  const files = walk(ROOT).filter(f => /\.(html?|xhtml)$/i.test(f));
  let patched = 0;
  if (!files.length) {
    console.log('No HTML files found under', ROOT);
    return;
  }

  files.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    const original = html;

    // Remove older injections (v2/v3 or earlier)
    html = stripTagById(html,
      // old nav & focus ids
      'menu-chevron-fix', 'nav-chevrons-style-v2', 'nav-chevrons-patch-v2', 'focus-overlay-dedupe-v2',
      // previous mpl versions
      'mpl-mobile-nav-style-v3', 'mpl-mobile-nav-patch-v3',
      'mpl-vc-style-v1', 'mpl-vc-patch-v1',
      'mpl-gp-cards-style-v1', 'mpl-gp-patch-v1',
      'mpl-tts-patch-v1',
      'mpl-focus-dedupe-v3',
      // any accidental duplicates of v4
      'mpl-mobile-nav-style-v4', 'mpl-mobile-nav-patch-v4',
      'mpl-vc-style-v2', 'mpl-vc-patch-v2',
      'mpl-gp-cards-style-v2', 'mpl-gp-patch-v2',
      'mpl-tts-patch-v2',
      'mpl-focus-dedupe-v4'
    );

    // Inject styles first (idempotent)
    if (!ensureOnce(html, 'id="mpl-mobile-nav-style-v4"')) {
      html = insertBefore(html, '</head>', '\n' + NAV_STYLE + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-gp-cards-style-v2"')) {
      html = insertBefore(html, '</head>', '\n' + GP_STYLE + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-vc-style-v2"')) {
      html = insertBefore(html, '</head>', '\n' + VC_STYLE + '\n');
    }

    // Inject scripts before </body>
    if (!ensureOnce(html, 'id="mpl-mobile-nav-patch-v4"')) {
      html = insertBefore(html, '</body>', '\n' + NAV_PATCH + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-vc-patch-v2"')) {
      html = insertBefore(html, '</body>', '\n' + VC_PATCH + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-gp-patch-v2"')) {
      html = insertBefore(html, '</body>', '\n' + GP_PATCH + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-tts-patch-v2"')) {
      html = insertBefore(html, '</body>', '\n' + TTS_PATCH + '\n');
    }
    if (!ensureOnce(html, 'id="mpl-focus-dedupe-v4"')) {
      html = insertBefore(html, '</body>', '\n' + FOCUS_DEDUPE + '\n');
    }

    if (html !== original) {
      backupWrite(file, html);
      patched++;
      console.log('Patched:', path.relative(ROOT, file));
    }
  });

  console.log('\\nDone.');
  console.log('- Mobile nav chevrons fixed (≤1024px); desktop nav untouched.');
  console.log('- Voice Coach: Pin/Unpin + drag with persisted position.');
  console.log('- GP Section: 6 cards (3x2); +6 examples per line; focus overlay on Start.');
  console.log('- Section 4: Start reads user selection or default text (Web Speech API).');
  console.log('- Duplicate focus overlays removed.');
  console.log('- Backups written alongside files as .bak (rollback: replace from .bak or `git restore`).');
})();
