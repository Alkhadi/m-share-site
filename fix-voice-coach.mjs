import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const ASSET_DIR = path.join(ROOT, 'assets', 'js');
const OUT_FILE = path.join(ASSET_DIR, 'voice-coach-draggable.js');

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }
function walk(dir, acc=[]) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}

function writeDraggableJS() {
  ensureDir(ASSET_DIR);
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

    const style = panel.style;
    const cs = getComputedStyle(panel);
    if (cs.position !== 'fixed') style.position = 'fixed';
    if (!style.zIndex) style.zIndex = '2147483000';

    const rect = panel.getBoundingClientRect();
    panel.classList.add('voice-coach-draggable');
    if (!style.left) style.left = clamp(rect.left, 8, (window.innerWidth - rect.width - 8)) + 'px';
    if (!style.top)  style.top  = clamp(rect.top,  8, (window.innerHeight - rect.height - 8)) + 'px';

    let handle = panel.querySelector(':scope > .vc-drag-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'vc-drag-handle';
      handle.textContent = 'Move';
      panel.appendChild(handle);
    }

    let drag = { active:false, sx:0, sy:0, sl:0, st:0 };
    const key = 'mpl.voicecoach.pos';

    const start = (e) => {
      drag.active = true;
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      drag.sx = p.clientX; drag.sy = p.clientY;
      drag.sl = parseFloat(style.left) || rect.left;
      drag.st = parseFloat(style.top ) || rect.top;
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
      const maxX = window.innerWidth - panel.offsetWidth - 8;
      const maxY = window.innerHeight - panel.offsetHeight - 8;
      style.left = clamp(nx, 8, Math.max(8, maxX)) + 'px';
      style.top  = clamp(ny, 8, Math.max(8, maxY)) + 'px';
      if (e.cancelable) e.preventDefault();
    };

    const end = () => {
      if (!drag.active) return;
      drag.active = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', end);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      try { localStorage.setItem(key, JSON.stringify({ left: style.left, top: style.top })); } catch {}
    };

    handle.addEventListener('mousedown', start);
    handle.addEventListener('touchstart', start, { passive:false });

    // Restore saved position (if any)
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && typeof saved.left === 'string' && typeof saved.top === 'string') {
        style.left = saved.left; style.top = saved.top;
      }
    } catch {}

   
    window.addEventListener('resize', () => {
      const maxX = window.innerWidth - panel.offsetWidth - 8;
      const maxY = window.innerHeight - panel.offsetHeight - 8;
      const l = parseFloat(style.left) || 8;
      const t = parseFloat(style.top ) || 8;
      style.left = clamp(l, 8, Math.max(8, maxX)) + 'px';
      style.top  = clamp(t, 8, Math.max(8, maxY)) + 'px';
    }, { passive:true });
  }

  function findPanel() {
    for (const sel of SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function init() {
    injectCSS();
    const panel = findPanel();
    if (panel) { makeDraggable(panel); return; }
    const obs = new MutationObserver(() => {
      const p = findPanel();
      if (p) { makeDraggable(p); obs.disconnect(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();`;
  fs.writeFileSync(OUT_FILE, js, 'utf8');
}

function patchHtml(filePath){
  let html = fs.readFileSync(filePath, 'utf8');
  const orig = html;

  
  const tag = '<script defer src="assets/js/voice-coach-draggable.js"></script>';
  if (!/voice-coach-draggable\.js/i.test(html)) {
    if (/<\/body>\s*<\/html>/i.test(html)) {
      html = html.replace(/<\/body>\s*<\/html>\s*$/i, `${tag}\n</body>\n</html>`);
    } else {
      html += `\n${tag}\n`;
    }
  }

  if (html !== orig) fs.writeFileSync(filePath, html, 'utf8');
}

(function main(){
  writeDraggableJS();
  const pages = walk(ROOT).filter(p => p.toLowerCase().endsWith('.html'));
  pages.forEach(patchHtml);

  console.log('✔ Wrote:', path.relative(ROOT, OUT_FILE));
  console.log('✔ Patched HTML pages:', pages.length);
  console.log('ℹ︎ The panel must match one of: #voiceCoach, .voice-coach, [data-voice-coach], .coach-panel');
})();
