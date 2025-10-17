#!/usr/bin/env node
/**
 * mshare-nav-and-focus-fix.mjs
 *
 * One-shot, idempotent patch that:
 *  - Fixes hamburger/chevron menus so submenus open/close on tap/click (mobile) and hover/focus (desktop).
 *  - Removes the duplicate round/circle focus overlay behind the visible square focus screen.
 *
 * What it does to each HTML file:
 *  - Removes any previous <script id="menu-chevron-fix">...</script>
 *  - Injects <style id="nav-chevrons-style-v2"> (tiny CSS to ensure [hidden] works)
 *  - Injects <script id="nav-chevrons-patch-v2"> (navigation behaviour)
 *  - Injects <script id="focus-overlay-dedupe-v2"> (hides duplicate round focus visuals)
 *
 * Usage:
 *   node scripts/mshare-nav-and-focus-fix.mjs          # from project root
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || process.cwd());

/* ---------- helpers ---------- */
function walk(dir) {
    const out = [];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name.startsWith(".")) continue;
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
    const bak = file + ".bak";
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(file, "utf8"));
    fs.writeFileSync(file, content, "utf8");
}
function stripTagById(html, id) {
    const re = new RegExp(
        `<(script|style)[^>]*\\bid=["']${id}["'][\\s\\S]*?<\\/\\1>\\s*`,
        "gi"
    );
    return html.replace(re, "");
}
function ensureOnce(html, token) {
    return html.includes(token);
}

/* ---------- injections (CSS/JS) ---------- */

const NAV_STYLE = `
<style id="nav-chevrons-style-v2">
  /* Ensure [hidden] hides menus even if theme doesn't style it. */
  nav .submenu[hidden] { display: none !important; }
  /* Improve focus ring targets */
  .menu-toggle { outline-offset: 2px; }
</style>
`.trim();

const NAV_PATCH = `
<script id="nav-chevrons-patch-v2">
(function(){
  var onReady = function(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  };
  onReady(function(){
    // Mobile: toggle #mainNav via #navToggle
    var nav   = document.getElementById('mainNav') || document.querySelector('nav.main-nav');
    var toggle= document.getElementById('navToggle') || document.querySelector('.nav-toggle');
    function openNav() {
      if (!nav || !toggle) return;
      toggle.setAttribute('aria-expanded','true');
      nav.removeAttribute('hidden');
      var cs = window.getComputedStyle(nav);
      if (cs.display === 'none') nav.style.display = 'block';
      document.body.classList.add('nav-open');
    }
    function closeNav() {
      if (!nav || !toggle) return;
      toggle.setAttribute('aria-expanded','false');
      nav.setAttribute('hidden','');
      nav.style.display = 'none';
      document.body.classList.remove('nav-open');
    }
    function isOpen() { return toggle && toggle.getAttribute('aria-expanded') === 'true'; }
    if (toggle && nav) {
      toggle.setAttribute('aria-controls', nav.id || 'mainNav');
      if (!toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click', function(e){ e.preventDefault(); isOpen() ? closeNav() : openNav(); }, {passive:false});
      document.addEventListener('click', function(e){
        if (!isOpen()) return;
        if (e.target.closest('#mainNav, #navToggle, .nav-toggle')) return;
        closeNav();
      }, {passive:true});
      document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && isOpen()) closeNav(); }, {passive:true});
    }
    // Desktop/mobile: toggle submenus for each .menu-group
    var groups = Array.prototype.slice.call(document.querySelectorAll('.menu-group'));
    var finePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
    function closeOthers(except) {
      groups.forEach(function(g) {
        if (g === except) return;
        var b = g.querySelector('.menu-toggle, [data-chevron]');
        var m = g.querySelector('.submenu, [role="menu"], :scope > ul');
        if (!b || !m) return;
        b.setAttribute('aria-expanded','false');
        m.setAttribute('hidden','');
        g.classList.remove('open');
      });
    }
    groups.forEach(function(g) {
      var btn  = g.querySelector('.menu-toggle, [data-chevron]');
      var menu = g.querySelector('.submenu, [role="menu"], :scope > ul');
      if (!btn || !menu) return;
      btn.setAttribute('aria-haspopup','menu');
      if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded','false');
      if (btn.getAttribute('aria-expanded') !== 'true') menu.setAttribute('hidden','');
      function open() {
        closeOthers(g);
        btn.setAttribute('aria-expanded','true');
        menu.removeAttribute('hidden');
        g.classList.add('open');
      }
      function close() {
        btn.setAttribute('aria-expanded','false');
        menu.setAttribute('hidden','');
        g.classList.remove('open');
      }
      function toggle() { (btn.getAttribute('aria-expanded') === 'true') ? close() : open(); }
      btn.addEventListener('click', function(e){ e.preventDefault(); toggle(); }, {passive:false});
      btn.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        if (e.key === 'Escape') { close(); btn.focus(); }
      }, {passive:false});
      if (finePointer) {
        g.addEventListener('mouseenter', open,  {passive:true});
        g.addEventListener('mouseleave', close, {passive:true});
        g.addEventListener('focusin', open,    {passive:true});
        g.addEventListener('focusout', function(ev){
          if (!g.contains(ev.relatedTarget)) close();
        }, {passive:true});
      }
    });
    // Close open submenu on outside click
    document.addEventListener('click', function(e){
      var hitGroup = e.target.closest('.menu-group');
      if (!hitGroup) closeOthers(null);
    }, {passive:true});
  });
})();
</script>
`.trim().replace(/<\/script>/gi, "<\\/script>");

const FOCUS_DEDUPE = `
<script id="focus-overlay-dedupe-v2">
(function(){
  var onReady = function(fn){
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, {once:true});
  };
  onReady(function(){
    var keep = document.querySelector('#focusModal, .focus-screen, .focus-panel, .breathing-panel');
    var extraSel = [
      '#vc-focus', '.vc-focus', '.breathing-circle', '.focus-circle',
      '#breathCanvas', '#voiceCoachCircle', '.circle-bg', '.legacy-breathing', '.coach-circle'
    ].join(',');
    function hide(node){ if (!node) return; node.style.display='none'; node.setAttribute('data-removed-by-fix','true'); }
    if (keep) {
      // hide large canvases/SVG not inside keep
      Array.prototype.slice.call(document.querySelectorAll('canvas,svg')).forEach(function(n){
        if (keep.contains(n)) return;
        var r; try{ r = n.getBoundingClientRect(); } catch(e){}
        if (r && r.width >= 180 && r.height >= 180) hide(n);
      });
      Array.prototype.slice.call(document.querySelectorAll(extraSel)).forEach(function(n){
        if (!keep.contains(n)) hide(n);
      });
    } else {
      // fallback: pick top-most by z-index
      var layers = Array.prototype.slice.call(document.querySelectorAll('#vc-focus, .vc-focus, .focus-panel, .breathing-panel, #focusModal, .focus-screen, canvas, svg'));
      if (!layers.length) return;
      var top = null, topZ = -Infinity;
      layers.forEach(function(el){
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
        var z  = parseInt(cs.zIndex || '0', 10);
        if (isNaN(z)) z = 0;
        if (z >= topZ) { top = el; topZ = z; }
      });
      layers.forEach(function(el){ if (el !== top) hide(el); });
    }
  });
})();
</script>
`.trim().replace(/<\/script>/gi, "<\\/script>");

/* ---------- main ---------- */
(function run() {
    const files = walk(ROOT).filter(f => /\.(html?|xhtml)$/i.test(f));
    let patched = 0;
    files.forEach(file => {
        let html = fs.readFileSync(file, "utf8");
        const original = html;
        html = stripTagById(html, "menu-chevron-fix");       // remove old fix
        if (!ensureOnce(html, 'id="nav-chevrons-style-v2"')) {
            html = insertBefore(html, "</head>", "\n" + NAV_STYLE + "\n");
        }
        if (!ensureOnce(html, 'id="nav-chevrons-patch-v2"')) {
            html = insertBefore(html, "</body>", "\n" + NAV_PATCH + "\n");
        }
        if (!ensureOnce(html, 'id="focus-overlay-dedupe-v2"')) {
            html = insertBefore(html, "</body>", "\n" + FOCUS_DEDUPE + "\n");
        }
        if (html !== original) {
            backupWrite(file, html);
            patched++;
            console.log("Patched:", path.relative(ROOT, file));
        }
    });
    console.log("\\nDone.");
    console.log("- Navigation and focus overlay fixes applied to", patched, "page(s).");
})();
