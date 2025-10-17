# Quick Start Guide

## Run the Script Now!

### Step 1: Navigate to Your Project
```bash
cd /path/to/m-share-site
```

### Step 2: Preview Changes (Safe)
```bash
node fix-readability-apply-from-index.mjs --dry-run
```

This will show you what would be changed without modifying any files.

### Step 3: Apply Changes
```bash
node fix-readability-apply-from-index.mjs
```

That's it! All 33 HTML pages are now updated with:
- ✅ Professional footer with Explorer section and theme controls
- ✅ ChatGPT 5 Pro typography
- ✅ Professional readability CSS
- ✅ All text visible and readable

## What Gets Changed

### HTML Files
**Before:**
```html
<html lang="en">
```

**After:**
```html
<html lang="en" class="gpt5-typography">
```

### CSS Links Added
```html
<link rel="stylesheet" href="assets/css/chatgpt5-typography.css">
<link rel="stylesheet" href="assets/css/readability-professional.css">
```

### Header & Footer
Replaced with the exact versions from `index.html`, which includes:
- Professional navigation with working hamburger menu
- Footer with Explorer section (all pages and submenus)
- Theme controls (color picker, brightness, auto mode)

## Visual Results

### Text Visibility
- **Dark backgrounds**: White text (#ffffff)
- **White backgrounds**: Black text (#111111)
- **All buttons**: White text with professional hover states
- **All cards**: Visible 2px borders

### Spacing
- 2% bottom margin on all sections/cards
- Cards never touch each other
- Professional spacing throughout

### Colors
- Primary: #0f172a (slate-900)
- Accent: #14b8a6 (teal-500)
- Success: #16a34a (green-600)
- Danger: #dc2626 (red-600)

## Safety Features

1. **Automatic Backups**: Every file gets a timestamped backup
   ```
   about.html.oneshot.bak.2025-10-17T07-03-08-757Z
   ```

2. **Idempotent**: Safe to run multiple times

3. **Dry-run Mode**: Test before applying

4. **No JS Changes**: All functionality preserved

## Need Help?

See full documentation:
- `README-FOOTER-SCRIPT.md` - Complete usage guide
- `IMPLEMENTATION-SUMMARY.md` - What was implemented

## Example Output

```bash
$ node fix-readability-apply-from-index.mjs

One-shot: Replace header/footer from index.html + readability/typography 
Patched: about.html backup-> about.html.oneshot.bak.2025-10-17T07-03-08-757Z
Patched: index.html backup-> index.html.oneshot.bak.2025-10-17T07-03-08-773Z
...

Summary:
  HTML files modified: 33
  Done.
```

## Verify Changes

Check any page in your browser:
1. Open any `.html` file
2. Look for the new footer with Explorer section
3. Try the theme controls
4. Verify all text is visible

## Update in Future

When you edit `index.html` header or footer:
```bash
node fix-readability-apply-from-index.mjs
```

All pages will automatically get the updated version!
