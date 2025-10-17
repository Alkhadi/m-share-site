#!/usr/bin/env node
/**
 * mshare-clean-and-fix.mjs
 *
 * Idempotent one-shot script to:
 *  - patch box-breathing.html controls + hide duplicate round visuals at runtime
 *  - inject accessible chevron/hamburger toggle into all HTML files
 *  - add small CSS prefixed fixes to voice-coach CSS files
 *  - find exact duplicate files (by SHA1) and move duplicates into .duplicates_removed_<ts> for review
 *  - write .bak backups before modifying
 *
 * Usage:
 *   node scripts/mshare-clean-and-fix.mjs [rootPath]
 *
 * Notes:
 *   - No deletions: duplicates are moved to a timestamped folder for safety.
 *   - All modifications create .bak copies.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(process.argv[2] || process.cwd());

function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        // ignore node_modules and hidden dirs by default
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(p));
        else out.push(p);
    }
    return out;
}

function sha1File(p) {
    const data = fs.readFileSync(p);
    return crypto.createHash('sha1').update(data).digest('hex');
}

function backupWrite(file, content) {
    const bak = file + '.bak';
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, fs.readFileSync(file, 'utf8'));
    fs.writeFileSync(file, content, 'utf8');
}

/* ---------- HTML / CSS / JS injections ---------- */

const TOP_CONTROLS_HTML = `
<div id="coach-controls-top" class="coach-controls-top" role="group" aria-label="Breathing controls">
  <button id="coachStartTop" class="btn btn-sm" type="button">Start</button>
  <button id="coachPauseTop" class="btn btn-sm" type="button">Pause</button>
  <button id="coachStopTop" class="btn btn-sm" type="button">Stop</button>
</div>`.trim();

const TOP_CONTROLS_CSS = `
<style id="coach-controls-css">
  .coach-controls-top{ display:inline-flex; gap:.5rem; align-items:center; }
  .coach-controls-top .btn{
    -webkit-appearance: none; appearance: none; cursor: pointer;
    padding:.45rem .85rem; border-radius:.65rem; border:1px solid rgba(255,255,255,.16);
    background: rgba(22,27,34,.85); color:#fff; font:inherit; line-height:1.2;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
  }
  .coach-controls-top .btn:focus{ outline:2px solid #6AE6B7; outline-offset:2px; }
  /* ensure visible focus panel opaque */
  .focus-panel, .focus-screen, .breathing-card, .breathing-panel {
    background-color: rgba(6,14,22,1) !important;
  }
</style>
`.trim();

const TOP_CONTROLS_LOGIC = `
<script id="coach-controls-logic">
(function(){
  var onReady = function(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); };
  onReady(function(){
    var topGroup = document.getElementById('coach-controls-top'); if(!topGroup) return;
    function findOriginal(label){
      var rx = new RegExp('^\\\\s*' + label + '\\\\s*$', 'i');
      var all = Array.prototype.slice.call(document.querySelectorAll('button, [role="button"], a'));
      for (var i=0;i<all.length;i++){
        var el = all[i];
        if (topGroup.contains(el)) continue;
        var text = (el.textContent || '').trim();
        if (rx.test(text)) return el;
      }
      return null;
    }
    var origStart = findOriginal('Start');
    var origPause = findOriginal('Pause');
    var origStop  = findOriginal('Stop');
    function proxyClick(target){
      try { if (target) { target.click(); return true; } } catch(e){}
      try { window.dispatchEvent(new CustomEvent('breathing:'+ (target===origStart?'start':target===origPause?'pause':'stop'))); } catch(e){}
      return false;
    }
    var btnStart = document.getElementById('coachStartTop');
    var btnPause = document.getElementById('coachPauseTop');
    var btnStop  = document.getElementById('coachStopTop');
    if (btnStart) btnStart.addEventListener('click', function(){ proxyClick(origStart); }, {passive:true});
    if (btnPause) btnPause.addEventListener('click', function(){ proxyClick(origPause); }, {passive:true});
    if (btnStop)  btnStop .addEventListener('click', function(){ proxyClick(origStop ); }, {passive:true});

    // Hide duplicate round visuals in the same panel if multiple canvases/SVGs exist
    var panel = topGroup.closest('section, article, .card, .panel, .breathing-card, .focus-screen, .focus-panel, .wrapper, .container') || document.body;
    function isLargeVisual(el){
      try { var r = el.getBoundingClientRect(); return (r.width >= 220 && r.height >= 220); } catch(e){ return false; }
    }
    var visuals = Array.prototype.slice.call(panel.querySelectorAll('canvas, svg'));
    visuals = visuals.filter(isLargeVisual);
    if (visuals.length > 1){
      visuals.slice(0, -1).forEach(function(el){
        el.setAttribute('data-removed-by-fix', 'true');
        el.style.display = 'none';
      });
    }
    var extraSelectors = [
      '.breathing-circle','.focus-circle','.visual-circle','#breathCanvas','#voiceCoachCircle',
      '.circle-bg','.coach-circle','.bg-breath','.legacy-breathing'
    ];
    extraSelectors.forEach(function(sel){
      var nodes = panel.querySelectorAll(sel);
      if (!nodes || !nodes.length) return;
      for (var i=0;i<nodes.length;i++){ nodes[i].style.display = 'none'; nodes[i].setAttribute('data-removed-by-fix','true'); }
    });
  });
})();
</script>
`.trim().replace(/<\/script>/gi, '<\\/script>');

const MENU_CHEVRON_FIX = `
<script id="menu-chevron-fix">
(function(){
  var onReady = function(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn, {once:true}); };
  onReady(function(){
    function toggleFrom(trigger, prevent){
      var btn = trigger.closest('[data-chevron], .chevron, .menu-chevron, .accordion-toggle, .has-children > button, .has-children > a, .hamburger, [aria-haspopup="menu"]');
      if(!btn) return false;
      var submenu = null;
      var ctrl = btn.getAttribute('aria-controls');
      if (ctrl) submenu = document.getElementById(ctrl);
      if (!submenu) {
        var li = btn.closest('li, .has-children, nav, .menu, .accordion');
        if (li) submenu = li.querySelector(':scope > ul, :scope > .submenu, :scope > [role="menu"]');
      }
      if (!submenu) return false;
      if (prevent) prevent.preventDefault();
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (!open) { submenu.removeAttribute('hidden'); submenu.style.display = submenu.style.display || 'block'; }
      else { submenu.setAttribute('hidden', ''); submenu.style.display = 'none'; }
      var host = btn.closest('.has-children, li, .accordion-item');
      if (host) host.classList.toggle('open', !open);
      return true;
    }
    document.addEventListener('click', function(e){ if (toggleFrom(e.target, e)) return; }, {passive:false});
    document.addEventListener('keydown', function(e){
      if ((e.key === 'Enter' || e.key === ' ') && toggleFrom(e.target, e)) { e.preventDefault(); }
    }, {passive:false});
  });
})();
</script>
`.trim().replace(/<\/script>/gi, '<\\/script>');

function insertBefore(html, marker, injection) {
    const idx = html.toLowerCase().lastIndexOf(marker.toLowerCase());
    if (idx === -1) return html;
    return html.slice(0, idx) + injection + html.slice(idx);
}

function ensureOnce(html, token) { return html.includes(token); }

/* ---------- run ---------- */

(function main() {
    try {
        const allFiles = walk(ROOT);
        const htmlFiles = allFiles.filter(f => /\.(html?|xhtml)$/i.test(f));
        const cssFiles = allFiles.filter(f => /\.css$/i.test(f));
        const scriptFiles = allFiles.filter(f => /\.(mjs|js)$/i.test(f));

        console.log('Found', allFiles.length, 'files; HTML:', htmlFiles.length, 'CSS:', cssFiles.length, 'JS:', scriptFiles.length);

        // 1) Patch box-breathing.html specifically
        const breathingFiles = htmlFiles.filter(f => /box-breathing\.html?$/i.test(f));
        let patchedCount = 0;
        breathingFiles.forEach(file => {
            let html = fs.readFileSync(file, 'utf8');
            const original = html;
            const backBtnReButton = /<button[^>]*>\s*Back\s*to\s*hub\/section\s*<\/button>/i;
            const backBtnReLink = /<a[^>]*>\s*Back\s*to\s*hub\/section\s*<\/a>/i;
            if (backBtnReButton.test(html) || backBtnReLink.test(html)) {
                html = html.replace(backBtnReButton, TOP_CONTROLS_HTML);
                html = html.replace(backBtnReLink, TOP_CONTROLS_HTML);
            }
            if (!ensureOnce(html, 'id="coach-controls-css"')) {
                html = insertBefore(html, '</head>', '\n' + TOP_CONTROLS_CSS + '\n');
            }
            if (!ensureOnce(html, 'id="coach-controls-logic"')) {
                html = insertBefore(html, '</body>', '\n' + TOP_CONTROLS_LOGIC + '\n');
            }
            if (html !== original) {
                backupWrite(file, html);
                patchedCount++;
                console.log('Patched:', path.relative(ROOT, file));
            }
        });

        // 2) Inject the hamburger/chevron fix into all HTML files
        let menuFixCount = 0;
        htmlFiles.forEach(file => {
            let html = fs.readFileSync(file, 'utf8');
            const original = html;
            if (!ensureOnce(html, 'id="menu-chevron-fix"')) {
                html = insertBefore(html, '</body>', '\n' + MENU_CHEVRON_FIX + '\n');
            }
            if (html !== original) {
                backupWrite(file, html);
                menuFixCount++;
                console.log('Added chevron fix to:', path.relative(ROOT, file));
            }
        });

        // 3) CSS fixes: ensure -webkit-backdrop-filter and -webkit-appearance ordering in voice-coach CSS files
        const cssTargets = cssFiles.filter(p => /voice-coach|voice-coach-fix|voice-coach-pro/i.test(p));
        let cssPatched = 0;
        cssTargets.forEach(file => {
            let css = fs.readFileSync(file, 'utf8');
            const original = css;
            // Add -webkit-backdrop-filter where backdrop-filter exists
            css = css.replace(/backdrop-filter\s*:\s*([^;]+);/gi, function (m, v) {
                // If -webkit- version missing, add it above
                if (!/(-webkit-backdrop-filter)/i.test(css)) {
                    return `-webkit-backdrop-filter: ${v};\n  backdrop-filter: ${v};`;
                }
                return m;
            });
            // Ensure -webkit-appearance appears before appearance
            css = css.replace(/appearance\s*:\s*([^;]+);/gi, function (m, v) {
                if (!/(-webkit-appearance\s*:)/i.test(css)) {
                    return `-webkit-appearance: none;\n  appearance: ${v};`;
                }
                // If both exist but order reversed, try to reorder
                const wa = css.match(/-webkit-appearance\s*:\s*[^;]+;/i);
                const a = css.match(/appearance\s*:\s*[^;]+;/i);
                if (wa && a) {
                    // no-op (leave as is) - avoid complex reordering globally.
                }
                return m;
            });
            if (css !== original) {
                backupWrite(file, css);
                cssPatched++;
                console.log('Patched CSS:', path.relative(ROOT, file));
            }
        });

        // 4) Duplicate file detection by exact content (SHA1). Move duplicates to .duplicates_removed_<ts>
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dupDir = path.join(ROOT, `.duplicates_removed_${ts}`);
        fs.mkdirSync(dupDir, { recursive: true });
        const hashMap = new Map();
        let dupCount = 0;
        allFiles.forEach(f => {
            // skip our created duplicates folder if re-run
            if (f.startsWith(dupDir)) return;
            const h = sha1File(f);
            if (!hashMap.has(h)) hashMap.set(h, f);
            else {
                // found duplicate content: move this file into dupDir preserving folder + filename
                const rel = path.relative(ROOT, f).replace(/[\/\\]/g, '_');
                const dest = path.join(dupDir, rel);
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.renameSync(f, dest);
                dupCount++;
                console.log('Moved duplicate to', path.relative(ROOT, dest));
            }
        });

        console.log('\\nSummary:');
        console.log('- Patched box-breathing controls on', patchedCount, 'file(s).');
        console.log('- Injected chevron fix into', menuFixCount, 'HTML file(s).');
        console.log('- Patched CSS files:', cssPatched);
        console.log('- Moved', dupCount, 'exact duplicate file(s) into', path.relative(ROOT, dupDir));
        console.log('\\nAll modified files have .bak backups next to them. Please review the duplicates folder before removing anything permanently.');

    } catch (err) {
        console.error('Error:', err && err.stack ? err.stack : err);
        process.exit(2);
    }
})();
