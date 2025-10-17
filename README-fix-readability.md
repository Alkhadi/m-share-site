# Fix Readability Script Documentation

## Overview

The `fix-readability-apply-from-index.mjs` script is a one-shot site patcher that updates all HTML pages in your M Share site to ensure consistency and readability across the entire site.

## What It Does

This script performs the following operations **safely and idempotently**:

### 1. Header & Footer Synchronization
- Extracts the `<header>` and `<footer>` from `index.html`
- Replaces all headers and footers on every HTML page with these canonical versions
- Preserves all existing JavaScript functionality (hamburger menu, submenus, etc.)

### 2. Typography Enhancement
- Adds `gpt5-typography` class to all `<html>` elements
- Creates/links `assets/css/chatgpt5-typography.css` (ChatGPT 5 Pro typography)
- Uses professional system fonts with optimized rendering

### 3. Readability & Contrast
Creates `assets/css/readability-professional.css` with:
- **Smart text colors**: WHITE on dark/colored surfaces, BLACK on light/white surfaces
- **Inherited colors**: H1–H6, paragraphs, and lists inherit their container's color
- **Button styling**: WHITE text with proper hover/active/visited/focus states
- **Link states**: Professional hover, active, visited, and focus-visible styling
- **Form readability**: Proper contrast for inputs, textareas, and placeholders on dark backgrounds
- **Spacing**: 2% bottom margin on sections, cards, and grid items to prevent touching
- **Footer**: Professional styling with the Explorer section and Theme controls

### 4. Explorer Footer Section
The footer includes:
- **Navigation sections** with chevron dropdown menus showing all site pages
- **Theme controls** allowing users to change background colors
- **Brand information** and support links
- **Auto/manual theme switching** (day/night mode)

### 5. Safety Features
- Creates timestamped backups before modifying any file: `*.oneshot.bak.YYYY-MM-DDTHH-MM-SSZ`
- Idempotent: Can be run multiple times safely without duplicating changes
- Dry-run mode available for preview

## Usage

### Preview Changes (Recommended First)
```bash
node fix-readability-apply-from-index.mjs --dry-run
```

This shows what would be modified without making any changes.

### Apply Changes
```bash
node fix-readability-apply-from-index.mjs
```

This will:
1. Create backups of all HTML files being modified
2. Apply all changes to your site
3. Create the CSS files if they don't exist
4. Show a summary of modified files

## Requirements

- Node.js (v14 or higher)
- All files must be in the current working directory
- `index.html` must exist with proper `<header>` and `<footer>` sections

## Output Files

The script creates/updates these files:

1. **assets/css/chatgpt5-typography.css** - Professional typography (only if missing)
2. **assets/css/readability-professional.css** - Readability and contrast styles (always updated)
3. **Backup files** - `*.oneshot.bak.[timestamp]` for each modified HTML file

## Footer Features

The updated footer includes:

### Explorer Section
- Dynamically built from your header navigation
- Chevron dropdowns for each menu section
- All navigation pages and submenus included
- Keyboard accessible (Enter, Space, Escape)

### Theme Controls
Located in the center column:
- **Auto mode**: Switches between day/night themes based on time (7 AM - 7 PM)
- **Manual color picker**: Choose any background color
- **Brightness slider**: Adjust brightness (0.85 - 1.25)
- **Reset button**: Return to default settings
- Settings persist in localStorage

### Brand Section
- M Share logo and description
- Support links (Coffee/Stripe)

## Color Scheme

The readability stylesheet uses a calm, professional palette:

```css
--primary: #0f172a (slate-900)
--accent: #14b8a6 (teal-500)
--success: #16a34a (green-600)
--danger: #dc2626 (red-600)
--warning: #f59e0b (amber-500)
--info: #2563eb (blue-600)
```

## Troubleshooting

### Script fails to find index.html
- Ensure you run the script from your site's root directory
- Verify `index.html` exists and contains `<header>` and `<footer>` elements

### Changes not visible
- Clear browser cache
- Check browser console for CSS loading errors
- Verify the CSS files were created in `assets/css/`

### Footer not displaying correctly
- Check that footer JavaScript loads properly
- Verify navigation structure in header matches expected format
- Ensure no conflicting CSS rules

## Important Notes

⚠️ **This script is for LOCAL USE ONLY**
- Do NOT run this script on your production server
- Do NOT commit the changes automatically to GitHub
- Review all changes locally first
- Test thoroughly before deploying

✅ **Safe to run multiple times**
- The script is idempotent
- Re-running won't create duplicates
- Each run creates new timestamped backups

## Example Output

```
One-shot: Replace header/footer from index.html + readability/typography
Patched: about.html backup-> about.html.oneshot.bak.2025-10-17T09-19-23-456Z
Patched: contact.html backup-> contact.html.oneshot.bak.2025-10-17T09-19-23-457Z
...

Summary:
  HTML files modified: 33
  Done.
```

## Reverting Changes

To revert a specific file:
```bash
cp about.html.oneshot.bak.2025-10-17T09-19-23-456Z about.html
```

To revert all files (find the most recent backup timestamp):
```bash
# Find a recent timestamp
ls *.oneshot.bak.* | head -1

# Restore all files from that backup set
for file in *.oneshot.bak.2025-10-17T09-19-23-*; do
  original="${file%.oneshot.bak.*}"
  cp "$file" "$original"
done
```

## Reference Site

The footer design is inspired by https://mindpaylink.com's footer structure with:
- Explorer section with all navigation pages
- Theme controls for background customization
- Professional, accessible design
- Responsive layout

## Support

For issues or questions about the script, please contact the repository maintainer or file an issue on GitHub.
