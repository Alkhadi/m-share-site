#!/usr/bin/env node
/**
 * fix-breathing-and-menu.mjs
 *
 * What this does (only):
 *  - On box-breathing.html:
 *      • Replace the "Back to hub/section" button/link with Start/Pause/Stop in the same place.
 *      • Add a runtime patch that:
 *          (a) proxies those top controls to your existing Start/Pause/Stop,
 *          (b) force-hides any extra/older round focus canvas/SVG behind the visible focus screen
 *              (covers Safari + Chrome, including late-inserted elements).
 *  - On all HTML files:
 *      • Inject an accessible chevron/hamburger toggle so submenus open/close on click + keyboard.
 *
 * The script is idempotent and writes .bak backups next to modified files.
 * It does not change anything you didn’t ask for.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.argv[2] || process.cwd());

/* ----------------- helpers ----------------- */

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function backupWrite(file, content) {
  const bak = file + '.bak';
  if (!fs.existsSync(bak)) {
    try { fs.writeFileSync(bak, fs.readFileSync(file, 'utf8')); } catch { }
  }
  fs.writeFileSync(file, content);
}

function insertBeforeOrAppend(html, marker, injection) {
  const idx = html.toLowerCase().lastIndexOf(marker.toLowerCase());
  if (idx === -1) return html + '\n' + injection + '\n';
  return html.slice(0, idx) + injection + html.slice(idx);
}

function ensureOnce(html, token) {
  return html.includes(token);
}

/* ----------------- patches ----------------- */

// 1) Top controls replacing “Back to hub/section”
const TOP_CONTROLS_HTML = `
<div id="coach-controls-top" class="coach-controls-top" role="group" aria-label="Breathing controls">
  <button id="coachStartTop" class="btn btn-sm" type="button">Start</button>
  <button id="coachPauseTop" class="btn btn-sm" type="button">Pause</button>
  <button id="coachStopTop" class="btn btn-sm" type="button">Stop</button>
</div>`.trim();

const TOP_CONTROLS_CSS = `
<style id="coach-controls-css">
  /* Keep new controls compact and consistent with typical UI */
  .coach-controls-top{ display:inline-flex; gap:.5rem; align-items:center; vertical-align:middle; }
  .coach-controls-top .btn{
    -webkit-appearance:none; appearance:none; cursor:pointer;
    padding:.44rem .85rem; border-radius:.65rem; border:1px solid rgba(255,255,255,.16);
    background: rgba(22,27,34,.92); color:#fff; font:inherit; line-height:1.2;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
  }
  .coach-controls-top .btn:focus{ outline:2px solid #6AE6B7; outline-offset:2px; }

  /* Ensure the visible focus panel is fully opaque; stops any ghost canvas/SVG bleeding through */
  .focus-panel, .focus-screen, .breathing-card, .breathing-panel, .focus-container {
    background-color: rgba(6,14,22,1) !important;
  }
</style>
`.trim();

const TOP_CONTROLS_LOGIC = `
<script id="coach-controls-logic">
(function(){
  var onReady = function(fn){
    if(document.readyState!=='loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  };

  onReady(function(){
    var topGroup = document.getElementById('coach-controls-top');
    if(!topGroup) return;

    /* ---- proxy Start/Pause/Stop to existing behavior ---- */
    function findOriginal(label){
      var rx = new RegExp('^\\\\s*'+label+'\\\\s*$', 'i');
      var nodes = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"], a'));
      for(var i=0;i<nodes.length;i++){
        var el = nodes[i];
        if(topGroup.contains(el)) continue; // skip our own
        var t = (el.textContent||'').trim();
        if(rx.test(t)) return el;
      }
      return null;
    }

    var origStart = findOriginal('Start');
    var origPause = findOriginal('Pause');
    var origStop  = findOriginal('Stop');

    function callIfFn(name){
      try{
        var fn = (window[name] || window[name?.toString?.()]);
        if(typeof fn === 'function'){ fn(); return true; }
      }catch(e){}
      return false;
    }

    function proxyClick(which){
      var target = which==='start'?origStart:which==='pause'?origPause:origStop;
      try{ if(target){ target.click(); return true; } }catch(e){}
      // graceful fallback: custom events and common global functions
      try{ window.dispatchEvent(new CustomEvent('breathing:'+which)); }catch(e){}
      if(which==='start') return callIfFn('startBreathing') || callIfFn('start');
      if(which==='pause') return callIfFn('pauseBreathing') || callIfFn('pause');
      if(which==='stop')  return callIfFn('stopBreathing')  || callIfFn('stop');
      return false;
    }

    var btnStart = document.getElementById('coachStartTop');
    var btnPause = document.getElementById('coachPauseTop');
    var btnStop  = document.getElementById('coachStopTop');

    if(btnStart) btnStart.addEventListener('click', function(){ proxyClick('start'); }, {passive:true});
    if(btnPause) btnPause.addEventListener('click', function(){ proxyClick('pause'); }, {passive:true});
    if(btnStop)  btnStop .addEventListener('click', function(){ proxyClick('stop');  }, {passive:true});

    /* ---- remove/hide extra “round” breathing visuals behind the visible focus screen ----
       Strategy:
       - Consider large canvas/SVG-like visuals, including late-inserted ones.
       - Keep the one with the largest visible area in the viewport; hide the rest.
       - Also hide common legacy classes/ids if found in the same panel.
    */
    function rectArea(r){ return Math.max(0, r.width) * Math.max(0, r.height); }
    function visibleArea(el){
      var r = el.getBoundingClientRect();
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      var h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      return w*h;
    }
    function isCandidate(el){
      if(!el) return false;
      if(!(el instanceof Element)) return false;
      var tag = (el.tagName||'').toLowerCase();
      if(tag==='canvas' || tag==='svg') return rectArea(el.getBoundingClientRect()) >= 220*220;
      // allow common legacy wrappers
      if(el.matches && el.matches('.breathing-circle, .focus-circle, .visual-circle, .circle-bg, .coach-circle, .bg-breath, .legacy-breathing, #breathCanvas, #voiceCoachCircle')) {
        return true;
      }
      return false;
    }

    function getPanel(){
      return topGroup.closest('section, article, .card, .panel, .breathing-card, .focus-screen, .focus-panel, .focus-container, .wrapper, .container') || document.body;
    }

    function prune(panel){
      var nodes = Array.prototype.slice.call(
        panel.querySelectorAll('canvas, svg, .breathing-circle, .focus-circle, .visual-circle, .circle-bg, .coach-circle, .bg-breath, .legacy-breathing, #breathCanvas, #voiceCoachCircle')
      ).filter(isCandidate);

      if(nodes.length<=1) return;

      // Keep the one with largest visible area; hide others.
      var keep = nodes[0], maxA = visibleArea(nodes[0]);
      for(var i=1;i<nodes.length;i++){
        var a = visibleArea(nodes[i]);
        if(a > maxA){ keep = nodes[i]; maxA = a; }
      }
      nodes.forEach(function(el){
        if(el===keep) return;
        el.style.display = 'none';
        el.setAttribute('aria-hidden','true');
        el.setAttribute('data-removed-by-fix','true');
      });
    }

    var panel = getPanel();
    prune(panel);

    // If something inserts another canvas later, hide it as well.
    var mo = new MutationObserver(function(list){
      var needs = false;
      for(var i=0;i<list.length;i++){
        var rec = list[i];
        if(rec.addedNodes && rec.addedNodes.length){
          for(var j=0;j<rec.addedNodes.length;j++){
            if(isCandidate(rec.addedNodes[j])) { needs = true; break; }
          }
        }
        if(needs) break;
      }
      if(needs) prune(panel);
    });
    mo.observe(panel, {childList:true, subtree:true});
  });
})();
</script>
`.trim().replace(/<\/script>/gi, '<\\/script>');

// 2) Accessible chevron/hamburger toggle (Safari + Chrome)
const MENU_CHEVRON_FIX = `
<script id="menu-chevron-fix">
(function(){
  var onReady = function(fn){
    if(document.readyState!=='loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  };

  function findSubmenu(btn){
    if(!btn || !btn.closest) return null;
    var ctrl = btn.getAttribute && btn.getAttribute('aria-controls');
    if(ctrl){
      var el = document.getElementById(ctrl);
      if(el) return el;
    }
    var li = btn.closest('li, .has-children, .accordion-item, nav, .menu, .accordion');
    if(li){
      // direct child UL/.submenu/[role="menu"]
      var q = li.querySelector(':scope > ul, :scope > .submenu, :scope > [role="menu"]');
      if(q) return q;
    }
    return null;
  }

  function setOpen(btn, submenu, open){
    if(!btn || !submenu) return;
    btn.setAttribute('aria-expanded', String(open));
    submenu.setAttribute('aria-hidden', String(!open));
    if(open){
      submenu.removeAttribute('hidden');
      if(getComputedStyle(submenu).display==='none'){ submenu.style.display = 'block'; }
    }else{
      submenu.setAttribute('hidden','');
      submenu.style.display = 'none';
    }
    var host = btn.closest('.has-children, li, .accordion-item');
    if(host) host.classList.toggle('open', open);
  }

  function shouldIntercept(btn){
    if(!btn) return false;
    if(btn.classList && (btn.classList.contains('hamburger') || btn.classList.contains('menu-chevron') || btn.classList.contains('chevron'))) return true;
    if(btn.hasAttribute && (btn.hasAttribute('data-chevron') || btn.getAttribute('role') === 'button')) return true;
    // If it's a link used only as a toggle (href="#"), intercept
    if(btn.tagName === 'A' && btn.getAttribute('href') && btn.getAttribute('href').trim() === '#') return true;
    // For button elements, default to intercept
    if(btn.tagName === 'BUTTON') return true;
    return false;
  }

  onReady(function(){
    // Initialize ARIA to reflect current state
    var toggles = Array.prototype.slice.call(document.querySelectorAll(
      '.hamburger, .menu-chevron, .chevron, [data-chevron], [aria-haspopup="menu"], .has-children > a, .has-children > button, .accordion-toggle'
    ));
    toggles.forEach(function(btn){
      var submenu = findSubmenu(btn);
      if(!submenu) return;
      var cs = getComputedStyle(submenu);
      var hiddenNow = submenu.hasAttribute('hidden') || submenu.getAttribute('aria-hidden') === 'true' || cs.display === 'none' || cs.visibility === 'hidden';
      setOpen(btn, submenu, !hiddenNow);
    });

    function handleTrigger(target, e){
      var btn = target && (target.closest
        ? target.closest('.hamburger, .menu-chevron, .chevron, [data-chevron], [aria-haspopup="menu"], .has-children > a, .has-children > button, .accordion-toggle')
        : null);
      if(!btn) return false;

      var submenu = findSubmenu(btn);
      if(!submenu) return false;

      var intercept = shouldIntercept(btn);
      if(intercept && e) e.preventDefault();

      var open = btn.getAttribute('aria-expanded') === 'true';
      setOpen(btn, submenu, !open);
      return true;
    }

    document.addEventListener('click', function(e){
      if(handleTrigger(e.target, e)) return;
    }, {passive:false});

    document.addEventListener('touchstart', function(e){
      // Some mobile Safari builds send only touchstart for quick taps
      handleTrigger(e.target, e);
    }, {passive:false});

    document.addEventListener('keydown', function(e){
      var k = e.key;
      if(k==='Enter' || k===' '){
        if(handleTrigger(e.target, e)){ e.preventDefault(); }
      }
    }, {passive:false});
  });
})();
</script>
`.trim().replace(/<\/script>/gi, '<\\/script>');

/* ----------------- main ----------------- */

(function main() {
  const allFiles = walk(ROOT).filter(f => /\.(html?|xhtml)$/i.test(f));
  if (!allFiles.length) {
    console.log('No HTML files found under', ROOT);
    return;
  }

  let breathingPatched = 0;
  let menuPatched = 0;

  /* 1) Patch box-breathing.html specifically */
  const breathingFiles = allFiles.filter(f => /box-breathing\.html?$/i.test(f));
  breathingFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    const original = html;

    // Replace "Back to hub/section" button or link (robust to nested spans/whitespace)
    const backBtnRe = new RegExp(
      // opening tag
      '<(button|a)([^>]*)>' +
      // any content until our phrase
      '[\\\\s\\\\S]*?' +
      // the phrase with flexible spacing around the slash
      'Back\\\\s*to\\\\s*hub\\\\s*\\\\/\\\\s*section' +
      // and then any trailing content until the close tag
      '[\\\\s\\\\S]*?' +
      '<\\\\/\\\\1>',
      'i'
    );

    if (backBtnRe.test(html)) {
      html = html.replace(backBtnRe, TOP_CONTROLS_HTML);
    } // else: no literal match; do not alter any other content.

    // Inject minimal CSS once
    if (!ensureOnce(html, 'id="coach-controls-css"')) {
      html = insertBeforeOrAppend(html, '</head>', '\n' + TOP_CONTROLS_CSS + '\n');
    }

    // Inject runtime logic once
    if (!ensureOnce(html, 'id="coach-controls-logic"')) {
      html = insertBeforeOrAppend(html, '</body>', '\n' + TOP_CONTROLS_LOGIC + '\n');
    }

    if (html !== original) {
      backupWrite(file, html);
      breathingPatched++;
      console.log('Patched: ' + path.relative(ROOT, file));
    }
  });

  /* 2) Inject chevron/hamburger fix into all HTML files (once per file) */
  allFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    const original = html;

    if (!ensureOnce(html, 'id="menu-chevron-fix"')) {
      html = insertBeforeOrAppend(html, '</body>', '\n' + MENU_CHEVRON_FIX + '\n');
    }

    if (html !== original) {
      backupWrite(file, html);
      menuPatched++;
      console.log('Added chevron fix to: ' + path.relative(ROOT, file));
    }
  });

  console.log('\\nDone.');
  console.log('- Replaced Back→Start/Pause/Stop & removed duplicate focus UI on:', breathingPatched, 'file(s).');
  console.log('- Injected chevron/hamburger fix on:', menuPatched, 'file(s).');
})();
