# Footer Replacement and Readability Enhancement Script

## Overview

This script (`fix-readability-apply-from-index.mjs`) is a one-shot, idempotent site patcher that:

1. **Replaces header and footer** on all HTML pages with the exact versions from `index.html`
2. **Applies ChatGPT 5 Pro typography** site-wide
3. **Adds professional readability CSS** for proper contrast and visibility
4. **Creates timestamped backups** of all modified files

## Features

### Header & Footer Replacement
- Extracts the canonical `<header>` and `<footer>` from `index.html`
- Replaces these blocks in all HTML pages across the site
- Preserves working hamburger menu, submenus, and all existing scripts
- Footer includes:
  - **Explorer section** with all navigation pages and submenus
  - **Theme controls** to change background color
  - Professional layout with proper branding and links

### Typography Enhancement
- Adds `gpt5-typography` class to all HTML tags
- Links `assets/css/chatgpt5-typography.css` (creates if missing)
- Uses modern system font stack with optimized rendering

### Readability & Contrast
Creates `assets/css/readability-professional.css` with:
- **Professional color palette** aligned with site theme (#0f172a)
- **Smart text colors**:
  - WHITE text on dark/colored surfaces
  - BLACK text on pure white (100%) backgrounds
  - Proper color inheritance for headings and body text
- **Button styling**: White text with professional hover/active/visited states
- **Link states**: Proper contrast with focus-visible outlines
- **Form readability**: Visible inputs on dark backgrounds
- **Card visibility**: Professional borders on all cards
- **Spacing**: 2% bottom margin on sections/cards to prevent touching

## Usage

### Preview Changes (Dry Run)
```bash
node fix-readability-apply-from-index.mjs --dry-run
```

This shows what would be modified without making any changes.

### Apply Changes
```bash
node fix-readability-apply-from-index.mjs
```

This will:
- Create backups: `filename.html.oneshot.bak.YYYY-MM-DDTHH-MM-SSZ`
- Modify all HTML files
- Create/update CSS files

## What Gets Modified

### HTML Files
- All `.html` files in the project (recursively)
- Skips: `.git`, `node_modules`, `dist`, `build`, etc.

### CSS Files Created/Updated
- `assets/css/readability-professional.css` (always updated)
- `assets/css/chatgpt5-typography.css` (created if missing)

## Backup Files

Each modified HTML file gets a timestamped backup:
```
about.html.oneshot.bak.2025-10-17T07-03-08-757Z
```

Backup files are excluded from git via `.gitignore`.

## Safety Features

1. **Idempotent**: Can run multiple times safely
2. **Automatic backups**: Every change creates a backup
3. **No JS modification**: JavaScript remains untouched
4. **Dry-run mode**: Preview before applying

## Requirements

- Node.js (ES modules support)
- Run from project root directory

## Color Palette

The readability CSS uses a calm, professional palette:

```css
--primary: #0f172a;        /* slate-900 */
--accent: #14b8a6;         /* teal-500 */
--success: #16a34a;        /* green-600 */
--danger: #dc2626;         /* red-600 */
--warning: #f59e0b;        /* amber-500 */
--info: #2563eb;           /* blue-600 */

--ink: #ffffff;            /* default text on dark */
--ink-black: #111111;      /* text on white surfaces */
```

## Troubleshooting

### Script Not Finding index.html
Ensure you're running from the project root where `index.html` exists.

### No Header/Footer in index.html
The script will abort if `<header>` or `<footer>` tags are missing from `index.html`.

### Changes Not Visible
1. Clear browser cache
2. Hard refresh (Ctrl+F5 / Cmd+Shift+R)
3. Check that CSS files were created in `assets/css/`

## Examples

### First Time Setup
```bash
cd /path/to/m-share-site
node fix-readability-apply-from-index.mjs
```

### Update After Editing index.html
```bash
# After modifying header/footer in index.html
node fix-readability-apply-from-index.mjs
```

All pages will now have the updated header/footer.

## Notes

- The script modifies HTML structure but preserves all functionality
- Existing styles are enhanced, not replaced
- The footer's Explorer section is dynamically built from navigation structure
- Theme controls allow users to customize background colors
- All accessibility features (ARIA labels, focus states) are maintained
