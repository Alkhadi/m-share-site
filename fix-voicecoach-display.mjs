#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const JS_DIR = path.join(ROOT, 'assets', 'js');
const DRAG_JS = path.join(JS_DIR, 'voice-coach-draggable.js');
const HIDE_JS = path.join(JS_DIR, 'hide-static-voicecoach.js');

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function walk(dir, acc=[]) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}

/* ---------- 1) Draggable Voice Coach (idempotent) ---------- */
function writeDraggable() {
  ensureDir(JS_DIR);
  const js = `(() => {
  const SELECTORS = ['#voiceCoach', '.voice-coach', '[data-voice-coach]', '.coach-panel'];
  function clamp(v, min, max) { v = Number(v); if (Number.isNaN(v)) v = min; return Math.max(min, Math.min(v, max)); }
  function injectCSS(){
    if (document.querySelector('style[data-voicecoach-css="draggable"]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-voicecoach-css','draggable');
    style.textContent = \`
      .voice-coach-draggable{ position:fixed !important; z-index:2147483000 !important; touch-action:none; }
      .voice-coach-draggable .vc-drag-handle{
        position:absolute; top:6px; left:6px;
        font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        padding:4px 8px; border-radius:999px; border:1px solid rgba(0,0,0,.15);
        background:rgba(255,255,255,.85); backdrop-filter:saturate(1.2) blur(4px);
        box-shadow:0 1px 3px rgba(0,0,0,.2); cursor:move; user-select:none;
      }
      .voice-coach-draggable .vc-drag-handle:active{ transform:scale(.98); }
    \`;
    (document.head || document.documentElement).appendChild(style);
  }
  function makeDraggable(panel) {
    if (!panel || panel.__vcDraggable) return;
    panel.__vcDraggable = true;
    const s = panel.style, cs = getComputedStyle(panel);
    if (cs.position !== 'fixed') s.position = 'fixed';
    if (!s.zIndex) s.zIndex = '2147483000';
    const r = panel.getBoundingClientRect();
    panel.classList.add('voice-coach-draggable');
    if (!s.left) s.left = clamp(r.left, 8, (innerWidth - r.width - 8)) + 'px';
    if (!s.top)  s.top  = clamp(r.top,  8, (innerHeight - r.height - 8)) + 'px';
    let handle = panel.querySelector(':scope > .vc-drag-handle');
    if (!handle) { handle = document.createElement('div'); handle.className='vc-drag-handle'; handle.textContent='Move'; panel.appendChild(handle); }
    let drag = { active:false, sx:0, sy:0, sl:0, st:0 };
    const key = 'mpl.voicecoach.pos';
    const start = (e) => {
      drag.active = true;
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      drag.sx = p.clientX; drag.sy = p.clientY;
      drag.sl = parseFloat(s.left) || r.left;
      drag.st = parseFloat(s.top ) || r.top;
      document.addEventListener('mousemove', move, { passive:false });
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive:false });
      document.addEventListener('touchend', end);
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    };
    const move = (e) => {
      if (!drag.active) return;
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      const nx = drag.sl + (p.clientX - drag.sx);
      const ny = drag.st + (p.clientY - drag.sy);
      const maxX = innerWidth  - panel.offsetWidth  - 8;
      const maxY = innerHeight - panel.offsetHeight - 8;
      s.left = clamp(nx, 8, Math.max(8, maxX)) + 'px';
      s.top  = clamp(ny, 8, Math.max(8, maxY)) + 'px';
      if (e.cancelable) e.preventDefault();
    };
    const end = () => {
      if (!drag.active) return;
      drag.active = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      try { localStorage.setItem(key, JSON.stringify({ left: s.left, top: s.top })); } catch {}
    };
    handle.addEventListener('mousedown', start);
    handle.addEventListener('touchstart', start, { passive:false });
    try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && saved.left && saved.top) { s.left = saved.left; s.top = saved.top; } } catch {}
    addEventListener('resize', () => {
      const maxX = innerWidth  - panel.offsetWidth  - 8;
      const maxY = innerHeight - panel.offsetHeight - 8;
      const l = parseFloat(s.left) || 8;
      const t = parseFloat(s.top ) || 8;
      s.left = clamp(l, 8, Math.max(8, maxX)) + 'px';
      s.top  = clamp(t, 8, Math.max(8, maxY)) + 'px';
    }, { passive:true });
  }
  function findPanel(){ for (const sel of SELECTORS){ const el = document.querySelector(sel); if (el) return el; } return null; }
  function init(){
    injectCSS();
    const p = findPanel();
    if (p) { makeDraggable(p); return; }
    const obs = new MutationObserver(() => { const q = findPanel(); if (q){ makeDraggable(q); obs.disconnect(); } });
    obs.observe(document.body, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();`;
  fs.writeFileSync(DRAG_JS, js, 'utf8');
}

/* ---------- 2) Hide legacy/static Voice Coach panel (without removal) ---------- */
function writeHider() {
  ensureDir(JS_DIR);
  const js = `(() => {
  // CSS rule: hide old panel variants UNLESS they become draggable (.voice-coach-draggable)
  const css = \`
    #vc-panel,
    .old-voice-coach,
    .vc-bar,
    #voice-coach:not(.voice-coach-draggable),
    .voice-coach:not(.voice-coach-draggable),
    [data-voice-coach].static { display:none !important; visibility:hidden !important; }
  \`;
  if (!document.querySelector('style[data-voicecoach-css="hide-static"]')) {
    const s = document.createElement('style'); s.setAttribute('data-voicecoach-css','hide-static'); s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  // MutationObserver: if any static panel gets injected later, hide it immediately
  const hide = (root=document) => {
    root.querySelectorAll('#vc-panel, .old-voice-coach, .vc-bar, #voice-coach, .voice-coach, [data-voice-coach].static')
      .forEach(el => {
        if (!el.classList.contains('voice-coach-draggable')) {
          el.style.display = 'none'; el.style.visibility = 'hidden';
        }
      });
  };
  hide();
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType === 1) { hide(n); }
      });
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();`;
  fs.writeFileSync(HIDE_JS, js, 'utf8');
}

/* ---------- 3) Patch HTML: include both scripts (idempotent) ---------- */
function patchHTML(filePath){
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;

  const tagDrag = `<script defer src="assets/js/voice-coach-draggable.js"></script>`;
  const tagHide = `<script defer src="assets/js/hide-static-voicecoach.js"></script>`;

  if (!/voice-coach-draggable\.js/i.test(html)) {
    if (/<\/body>\s*<\/html>/i.test(html)) html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tagDrag}\n</body>\n</html>`);
    else html += `\n${tagDrag}\n`;
  }
  if (!/hide-static-voicecoach\.js/i.test(html)) {
    if (/<\/body>\s*<\/html>/i.test(html)) html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tagHide}\n</body>\n</html>`);
    else html += `\n${tagHide}\n`;
  }

  if (html !== orig) fs.writeFileSync(filePath, html, 'utf8');
}

/* ---------- Main ---------- */
(function main(){
  writeDraggable();
  writeHider();
  const pages = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
  pages.forEach(patchHTML);
  console.log('✔ Wrote:', path.relative(ROOT, DRAG_JS));
  console.log('✔ Wrote:', path.relative(ROOT, HIDE_JS));
  console.log('✔ Patched HTML pages:', pages.length);
  console.log('ℹ︎ Static Voice Coach is now hidden; draggable panel will display (when present).');
})();
