
# Copilot instructions — m-share (static site)

This repo is a hand-maintained static wellbeing website with breathing techniques and mental health tools. The goal of these instructions is to give an AI coding agent the minimal, practical context needed to make safe, high-value edits.

## Big picture
- Static HTML pages are the source of truth: top-level `*.html` files contain full header/footer and inline page CSS where needed. There is no build step.
- Shared CSS/JS live in `assets/`, with specialized components in `_coach/`. Interactive features use vanilla JS (e.g. `app.js`, `voice-coach-fix.js`).
- Site focuses on breathing techniques (4-7-8, box breathing), accessibility tools, and profile/contact management.

## Key files and places to check
- `index.html`, `about.html` — examples of header/footer and nav; copy their header/footer when adding pages.
- `assets/css/header-2025.css`, `assets/css/footer-2025.css`, `assets/css/nav-footer-uni.css`, `style.css` — current styling layers.
- `_coach/voice-coach.js`, `voice-coach-fix.js`, `assets/css/voice-coach-pro.css`, `voice-coach-fix.css` — voice coach overlay implementation; affects draggable TTS overlay.
- `assets/pdfs/` — canonical location for PDFs; many pages reference autism/dyslexia resources here.
- `app.js` — core navigation, profile management, QR generation, PDF creation, and statistics tracking.
- `deploy.sh`, `deploy_fix.sh`, `.github/workflows/pages.yml` — deployment automation to GitHub Pages via automated PR workflow.

## Developer workflows (explicit)
- Local preview: serve the repo root with a simple static server and open http://localhost:8000. Example used by maintainers:
	python3 -m http.server 8000
- Deploy: pushing to `main` triggers `.github/workflows/pages.yml`. Manual helpers exist: `./deploy.sh` (automation using `gh`) and `./deploy_fix.sh` (safe initialization; creates `.nojekyll`, CNAME handling).

## Project-specific conventions and gotchas
- Pages are self-contained. Do not try to centralize header/footer unless updating all pages. Prefer copying the header from `index.html` or `about.html`.
- Many pages include inline style blocks with IDs like `mpl-*` that JS and CSS expect. Do not remove or rename these IDs.
- Navigation uses specific IDs/classes: `mainNav`, `navToggle`, and `data-href` attributes — client JS depends on these exact names.
- There are many `.bak` files present; do not commit `.bak` files. Deploy scripts and `.gitignore` assume they exist for local editing.
- Profile system: `app.js` manages user profiles via localStorage (`mshare_default_profile_v2`) with URL parameter overrides for sharing.
- Statistics tracking: breathing sessions are tracked in localStorage (`mshare_wellbeing_stats_v2`) with daily streaks and technique-specific metrics.
- Fix scripts: Multiple `*.mjs` and `fix-*.js` files exist for one-shot patches — these are maintenance tools, not runtime code.

## Voice coach & breathing UI
- Voice coach is implemented as a draggable overlay. Key files:
	- `_coach/voice-coach.js` (core behavior)
	- `voice-coach-fix.js`, `voice-coach-fix.css` (fixes and integration)
	- `assets/css/voice-coach-pro.css` (styling to prefer)
- The overlay relies on classes such as `.vc-draggable`, `.vc-pinned` and an inline style block with id `mpl-vc-style-v2`. Modify cautiously and preview locally.
- Breathing pages (e.g. `4-7-8-breathing.html`, `box-breathing.html`) use URL parameters for pattern, timing, TTS, and vibration settings.
- Session tracking: breathing sessions automatically save stats to localStorage and update weekly charts via `MSStats.addSession()`.

## Safe change checklist (small PRs)
1. Edit one concern at a time: HTML content, CSS, or JS behavior.
2. Preview locally with `python3 -m http.server 8000` and check header/footer & voice coach overlay on `index.html` and a changed page.
3. Avoid committing `.bak` files. Keep PDF assets under `assets/pdfs/` and reference them with relative paths.

## Examples of common edits
- Add a page: duplicate `index.html` header/footer, update page body and local inline CSS, link PDFs from `assets/pdfs/`.
- Update voice coach behavior: change `_coach/voice-coach.js` and test `index.html` and any breathing pages (e.g. `4-7-8-breathing.html`).
- Update profiles/contact info: modify `assets/default_profile.json` or the fallback in `app.js`. Profile data flows through URL params for sharing.
- Add breathing technique: copy existing breathing page structure, update timing patterns, ensure voice coach integration works.

## What to avoid / not invent
- This is not a Node/React project — do not add build tooling unless asked. Treat the HTML files as production artifacts.
- Don’t rename IDs/classes used by JS (see nav and voice-coach notes).

---
If anything here is unclear or you want more examples (deploy PR flow, voice-coach internals, or a short PR template), tell me which section to expand.

