# Copilot instructions for m-share-site

This repo is a static, vanilla HTML/CSS/JS website (no bundler, no npm). Pages are hand-authored HTML, with shared behavior provided by small JS files. Keep new code framework-free and load it with plain <script> tags.

## Big picture
- Core UX is a set of wellbeing technique pages (breathing, sleep, anxiety, etc.) with a shared navigation, footer, and a “Voice Coach”/sharing toolkit.
- State lives in localStorage only. There’s no backend; data flows are: DOM → helpers in `window.__MSHARE__` → localStorage → DOM render.
- Many pages are duplicated as `*.bak` snapshots; do not edit `*.bak`.

## Key files and APIs
- `index.html` shows the canonical patterns: unified nav/footer, share sheet, progress chart, and action buttons.
- `app.js` defines most client logic and the public namespace `window.__MSHARE__` (alias “MS”). Key exports:
  - Profile and share: `MS.qp` (query string reflecting profile), `MS.openShareSheet()`, `MS.quickDownloadPdf()`, `MS.genVCardAndDownload()`.
  - Stats: `MS.Stats.addSession({techId, seconds, breaths})`, `MS.Stats.summary()` and `MS.drawWeeklyChart()` (draws to element id "weeklyChart").
  - Utilities: `MS.toast(msg)`, `MS.bankDetailsString()`, `MS.openAppOrStore(url, bank)`.
  - Admin: `MS.requireAdmin()` prompts for a passcode (SHA-256 checked inline in `app.js`).
- PDF locker: `MS.DeviceLocker.{addBlob,remove,export,import,mount}` stores PDFs locally (20 MB quota, `mshare_pdf_locker_v2`).
- `apply-mshare-fixes.mjs` or `mshare-voicecoach-one-shot.mjs` are one‑shot patchers that inject the universal Voice Coach assets and related fixes across HTML files. Only run intentionally from the repo root.
- `deploy.sh` pushes a branch and opens a PR to publish via GitHub Pages (CNAME set to `www.mindpaylink.com`). Requires `gh` for the fast path.

## Project conventions that matter
- Query param propagation: links use `data-href` and are upgraded on load so the current query string persists across pages. When adding links, prefer `data-href="page.html"` (no `href`)—`app.js` sets `href` with the existing `?…`.
- Shared selectors/IDs expected by code:
  - Buttons with ids: downloadPdf, saveVcf, shareOpen, shareClose, shareBackdrop, copyShare, shareNative, savePng, sharePng, openPdfPage are wired in `index.html` and/or `app.js`.
  - Progress targets: mTotal, mStreak, mSessions, mBreaths, canvas weeklyChart, and todayLine are used by `MS.Stats`/`MS.drawWeeklyChart`.
  - Nav expects the structure: `.menu-group > .menu-toggle + .submenu` (desktop adds toggles automatically). Keep this structure for new groups.
- LocalStorage keys:
  - Profile: `mshare_default_profile_v2` (JSON). Query overrides short-codes: n,name; ph,phone; em,email; s,site; a,addr; av,avatar; bg,background; wb,wellbeing; ac,acc; sc,sort; ib,iban; r,ref; x,ig,yt,ln.
  - Stats: `mshare_wellbeing_stats_v2` with summary fields and simple achievements booleans: m10, m50, s5, b200.
  - PDF locker: `mshare_pdf_locker_v2` stores base64 PDFs with a 20 MB quota.

## Integration points
- Web Share API and Clipboard are used for sharing; gracefully degrades to copy-to-clipboard.
- PDF generation uses Canvas → JPEG → minimal PDF writer (no external library). QR codes load from https://api.qrserver.com.
- The site includes additional nav/footer/theme scripts under `assets/` that auto-enhance markup; keep ids like `footer2025`, `mpl-theme-slot`, and class `footer-2025` when changing layout.

## Guardrails and conventions
- Do not introduce bundlers/modules. Load scripts directly with `<script>` tags.
- Preserve IDs/classes referenced by `app.js` and `assets/js/*`. Avoid breaking `.menu-group > .menu-toggle + .submenu` structure.
- Prefer `data-href` links (no `href`) so query params propagate across pages.
- Avoid editing `*.bak` files (snapshots). Keep edits idempotent—patchers may run multiple times.

## Whole‑Site Value Booster macro (for AI agents)
You are a compact product team (UX writer, front-end engineer, accessibility specialist, performance/SEO engineer). Audit and improve the entire website. Return precise, minimal, production‑ready code patches plus upgraded copy—no generic advice.
Inputs
- Brand & context: “M Share” — quiet, practical mental‑health tools for UK audiences (educational info only; not medical advice).
- Target outcomes: calmer UX, faster loads, clearer navigation, stronger SEO/EEAT, excellent accessibility (incl. dyslexia‑friendly), zero broken links, measurable value for visitors.
- Site root: vanilla HTML/CSS/JS, no frameworks; keep folder structure; assets under `assets/`.
Hard constraints
1) No breaking changes; keep existing IDs/classes; minimal diffs. 2) Accessibility first (WCAG 2.2 AA). 3) Performance: no heavy libs; defer/async; lazy‑load; dedupe; preconnect when useful. 4) UK tone & compliance. 5) Edits must be idempotent.
Scope
A) Navigation & footer — unify mobile/desktop; one open submenu; ESC/outside‑click close; remove duplicate nav scripts; ensure a single global footer element (id: `footer2025`). The Explore section mirrors top-level nav.
B) Voice Coach — draggable panel with “Move” handle; bounded; persist position (localStorage); “Reset position”; system‑voice fallback; respects `prefers-reduced-motion`; keyboard move (arrows; Shift=10x).
C) Buttons/IDs — remove duplicate IDs; convert repeated actions to classes (e.g., `.downloadPdfBtn`) and use event delegation; ensure VCF/PDF/Share work anywhere.
D) Layout/readability — global spacing var `--s`; ensure edges have padding; one `<h1>`; landmarks `<main>`/`role="navigation">`; aria‑expanded; visible focus.
E) Content (EEAT) — tighten hero and cards in UK tone; compact trust blurb; one‑line “How to use this page”; clear CTAs.
F) SEO — intent‑driven titles/descriptions; JSON‑LD (WebSite, BreadcrumbList, Article/FAQPage where apt); canonical + OG/Twitter; complete alts.
G) Performance — dedupe imports; convert sync scripts to `defer` where safe; lazy‑load below‑fold media; `fetchpriority="high"` for hero when present; preconnect to fonts/origin.
H) Reliability/QA — defensive `window.__MSHARE__` checks; fallbacks for share/SOS; console clean (no errors).

## Voice Coach and technique pages
- If you add or adjust technique pages (e.g., Box/4‑7‑8/Coherent), sessions should call `MS.Stats.addSession({techId:'tech-key', seconds, breaths})` when a run completes.
- The patcher (`apply-mshare-fixes.mjs`) can inject a universal Voice Coach UI (`_coach/voice-coach.js/.css`) that:
  - Adds Start/Pause/Stop “vc-bars” to sections and a focus overlay with breathing cues.
  - Avoids duplicating legacy coach boxes; it removes elements with classes like `.voice-coach`.
  - Only run the patcher if you intend to update all pages; review diffs before committing.

## Typical workflows
- Local preview: open `index.html` in a browser (no build). If you use VS Code Live Server, just serve the folder root.
- Patcher run (optional): `node apply-mshare-fixes.mjs` from repo root. Commit the resulting changes after review.
- Deploy: run `./deploy.sh` (zsh). It creates a PR and configures GitHub Pages; with `gh`, it can auto-merge.

## Examples to follow
- Adding a new nav item: create `<div class="menu-group"><button class="menu-toggle">Label ▾</button><div class="submenu"><a data-href="page.html">Page</a></div></div>`; `app.js` will append the current query to links.
- Trigger share/download from any page: add a button with `id="downloadPdf"` or call `window.__MSHARE__.quickDownloadPdf()` directly.
- Recording a session: `window.__MSHARE__.Stats.addSession({ techId: 'box', seconds: 300, breaths: 60 })` then optionally `window.__MSHARE__.drawWeeklyChart()`.

Notes
- Keep HTML semantic; avoid renaming IDs/classes listed above unless you update the wiring. Don’t edit `*.bak` files. Avoid introducing module loaders or bundlers—scripts are loaded directly.
