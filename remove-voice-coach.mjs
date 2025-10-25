// remove-voice-coach.mjs
// One-shot: remove the "voice coach" panel site-wide, but keep the Voice Assistant panel.
// - Strips voice-coach includes from all HTML
// - Stubs voice-coach-fix.js (backs up original)
// - Injects a CSS+JS killswitch to remove any dynamic coach UI

import { promises as fs } from "fs";
import path from "path";
import url from "url";

const ROOT = process.cwd();
const IGNORE = new Set(["node_modules", ".git", "server", "public", "cloudflare"]);
const HTML_EXT = new Set([".html", ".htm"]);
const JS_NAMES_TO_STUB = [
  "voice-coach-fix.js",
  "voicecoach-fix.js",
  "voice-coach.js",
  "voicecoach.js",
];

const KILL_STYLE_ID = "mshare-voicecoach-hide";
const KILL_SCRIPT_ID = "mshare-voicecoach-kill";

const KILL_STYLE = `
/* injected by remove-voice-coach.mjs */
#voice-coach, #mshare-voicecoach, .voice-coach, .voicecoach,
[id*="voice-coach"], [class*="voice-coach"], [id*="voicecoach"], [class*="voicecoach"],
[data-voicecoach], [data-voice-coach], [data-widget="voice-coach"], [data-role="voice-coach"],
[aria-label="Voice Coach"], section[aria-label="Voice Coach"], div[aria-label="Voice Coach"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

const KILL_SCRIPT = `
/* injected by remove-voice-coach.mjs */
(function () {
  try {
    // Signal to any scripts: do not render coach.
    window.__MShareDisableVoiceCoach = true;

    // Remove existing and future coach UIs.
    const SELECTORS = [
      '#voice-coach', '#mshare-voicecoach', '.voice-coach', '.voicecoach',
      '[id*="voice-coach"]', '[class*="voice-coach"]', '[id*="voicecoach"]', '[class*="voicecoach"]',
      '[data-voicecoach]', '[data-voice-coach]', '[data-widget="voice-coach"]', '[data-role="voice-coach"]',
      '[aria-label="Voice Coach"]', 'section[aria-label="Voice Coach"]', 'div[aria-label="Voice Coach"]'
    ].join(',');

    const nuke = () => document.querySelectorAll(SELECTORS).forEach(el => el.remove());
    nuke();

    const mo = new MutationObserver(() => nuke());
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // Provide harmless globals in case anything references them.
    const MS = (window.__MSHARE__ = window.__MSHARE__ || {});
    MS.VoiceCoach = MS.VoiceCoach || {
      init(){}, show(){}, hide(){}, start(){}, pause(){}, resume(){}, stop(){},
    };
  } catch (e) { /* no-op */ }
})();
`;

// Regex to remove external voice-coach assets (keeps "voicebot" intact).
const SCRIPT_TAG_REMOVE = [
  /<script\b[^>]*\bsrc=["'][^"'<>]*voice[-_]?coach[^"'<>]*\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
  /<script\b[^>]*\bsrc=["'][^"'<>]*voicecoach[^"'<>]*\.js[^"'<>]*["'][^>]*>\s*<\/script>/gi,
];
const LINK_TAG_REMOVE = [
  /<link\b[^>]*\bhref=["'][^"'<>]*voice[-_]?coach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
  /<link\b[^>]*\bhref=["'][^"'<>]*voicecoach[^"'<>]*\.css[^"'<>]*["'][^>]*>/gi,
];

// Strip inline initializers that reference a coach namespace.
const INLINE_INIT_STRIP =
  /<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(?:VoiceCoach|voice[\s_-]?coach|MS\.VoiceCoach|mshare[-_]?voicecoach|window\.VoiceCoach)[\s\S]*?<\/script>/gi;

function insertBeforeClose(html, id, tagName, block) {
  if (html.includes(`id="${id}"`)) return html;
  const re = new RegExp(`</${tagName}\\s*>`, "i");
  return re.test(html) ? html.replace(re, `${block}\n</${tagName}>`) : `${html}\n${block}\n`;
}

function transformHtml(html) {
  let changed = false;
  let out = html;

  for (const re of SCRIPT_TAG_REMOVE) {
    const prev = out; out = out.replace(re, "<!-- voice-coach script removed -->");
    if (out !== prev) changed = true;
  }
  for (const re of LINK_TAG_REMOVE) {
    const prev = out; out = out.replace(re, "<!-- voice-coach css removed -->");
    if (out !== prev) changed = true;
  }

  // Neutralize any inline coach init blocks.
  if (INLINE_INIT_STRIP.test(out)) {
    out = out.replace(INLINE_INIT_STRIP, "<!-- voice-coach inline init removed -->");
    changed = true;
  }

  // Add CSS and JS killswitch.
  const styleBlock = `<style id="${KILL_STYLE_ID}">${KILL_STYLE}</style>`;
  const scriptBlock = `<script id="${KILL_SCRIPT_ID}">${KILL_SCRIPT}</script>`;
  const prev1 = out; out = insertBeforeClose(out, KILL_STYLE_ID, "head", styleBlock);
  if (out !== prev1) changed = true;
  const prev2 = out; out = insertBeforeClose(out, KILL_SCRIPT_ID, "body", scriptBlock);
  if (out !== prev2) changed = true;

  return { out, changed };
}

async function walkHtml(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkHtml(full)));
    else if (e.isFile() && HTML_EXT.has(path.extname(e.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function backup(p) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const bak = `${p}.bak.${ts}`;
  await fs.copyFile(p, bak);
  return bak;
}

async function stubCoachJs() {
  // Try common locations
  const candidates = new Set();
  for (const base of ["", "js", "assets", "assets/js"]) {
    for (const fn of JS_NAMES_TO_STUB) {
      candidates.add(path.join(ROOT, base, fn));
    }
  }

  const stub = `/* voice coach disabled by remove-voice-coach.mjs */
(function(){
  try {
    window.__MShareDisableVoiceCoach = true;
    const MS = (window.__MSHARE__ = window.__MSHARE__ || {});
    MS.VoiceCoach = MS.VoiceCoach || { init(){}, show(){}, hide(){}, start(){}, pause(){}, resume(){}, stop(){} };
    console.info("Voice coach stub active.");
  } catch(e){}
})();`;

  let touched = 0;
  for (const file of candidates) {
    try {
      const txt = await fs.readFile(file, "utf8").catch(() => null);
      if (!txt) continue;
      await backup(file);
      await fs.writeFile(file, stub, "utf8");
      console.log(`✔ Stubbed JS: ${path.relative(ROOT, file)}`);
      touched++;
    } catch {}
  }
  return touched;
}

async function run() {
  // 1) Patch all HTML
  const htmlFiles = await walkHtml(ROOT);
  let changedCount = 0;
  for (const f of htmlFiles) {
    const src = await fs.readFile(f, "utf8");
    const { out, changed } = transformHtml(src);
    if (changed) {
      await backup(f);
      await fs.writeFile(f, out, "utf8");
      console.log(`✔ Patched HTML: ${path.relative(ROOT, f)}`);
      changedCount++;
    }
  }

  // 2) Stub the coach script if present
  const stubbed = await stubCoachJs();

  // 3) Summary
  if (changedCount === 0 && stubbed === 0) {
    console.log("No changes needed (coach includes not found or already disabled).");
  } else {
    console.log(`\nDone. Patched ${changedCount} HTML file(s), stubbed ${stubbed} JS file(s).`);
    console.log("Voice coach panel is now removed site-wide; Voice Assistant remains.");
  }
}

run().catch(err => { console.error(err); process.exit(1); });
