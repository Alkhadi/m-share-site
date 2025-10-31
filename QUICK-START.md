# Quick Start Guide

## 🚀 Using the Footer Update Script

### Step 1: Preview First (Recommended)
```bash
node fix-readability-apply-from-index.mjs --dry-run
```

This shows you what will be changed without actually modifying any files.

### Step 2: Apply Changes
```bash
node fix-readability-apply-from-index.mjs
```

This will:
- ✅ Replace all headers/footers with the one from index.html
- ✅ Add typography and readability CSS
- ✅ Create timestamped backups of modified files

### Step 3: Test Your Site
Open a few pages in your browser and verify:
- [ ] Footer appears with Explorer section
- [ ] Theme controls work (try changing colors)
- [ ] Navigation menus expand/collapse correctly
- [ ] All pages look consistent

## 📋 What You Get

### Explorer Footer Section
Your footer will now have a navigation section that shows all your site pages organized just like the main menu:

```
Explore
  ▼ Wellbeing
  ▼ Conditions
    • Autism, ADHD, Dyslexia
    • Anxiety, Depression, Stress, Sleep
  ▼ Breathing & Focus
    • Breath guides, Focus, Mindfulness
    • Techniques (60-second Reset, Box Breathing, etc.)
  ▼ Toolkits
    • Sleep, Breath, Mood tools
    • ADHD, Autism, Depression, Anxiety, Stress tools
  ▼ About
    • About, Support Us, Contact
```

### Theme Controls
Users can customize the site appearance:
- **Auto mode**: Automatically switches between day/night themes
- **Color picker**: Choose any background color
- **Brightness**: Fine-tune the brightness level
- **Reset**: Go back to defaults

## 🎨 Color Scheme

The script applies a professional, accessible color palette:

| Element | Color |
|---------|-------|
| Primary | `#0f172a` (slate-900) |
| Accent  | `#14b8a6` (teal-500) |
| Success | `#16a34a` (green-600) |
| Danger  | `#dc2626` (red-600) |
| Warning | `#f59e0b` (amber-500) |
| Info    | `#2563eb` (blue-600) |

## 📁 Files Created

After running the script:

1. **CSS Files** (created automatically):
   - `assets/css/chatgpt5-typography.css` - Professional fonts
   - `assets/css/readability-professional.css` - Contrast & spacing

2. **Backups** (one per modified file):
   - `about.html.oneshot.bak.2025-10-17T09-22-45-678Z`
   - `contact.html.oneshot.bak.2025-10-17T09-22-45-679Z`
   - etc.

## 🔄 Reverting Changes

If you need to undo changes:

```bash
# Revert a single file
cp about.html.oneshot.bak.2025-10-17T09-22-45-678Z about.html

# Find your most recent backup timestamp
ls *.oneshot.bak.* | head -1

# Revert all files (replace timestamp with yours)
for file in *.oneshot.bak.2025-10-17T09-22-45-*; do
  original="${file%.oneshot.bak.*}"
  cp "$file" "$original"
done
```

## ⚠️ Important Notes

- ✅ **Safe to run multiple times** - The script is idempotent
- ✅ **Backups created automatically** - Each run makes new timestamped backups
- ⚠️ **LOCAL USE ONLY** - Do NOT run this on a production server
- ⚠️ **Review changes** - Always check the dry-run output first
- ⚠️ **Test locally** - Verify everything works before deploying

## 📖 Need More Info?

- See `README-fix-readability.md` for complete documentation
- See `FOOTER-STRUCTURE.md` for footer architecture details
- Check the script code: `fix-readability-apply-from-index.mjs`

## 🆘 Troubleshooting

### "ERROR: index.html not found"
- Make sure you're in the site's root directory
- Verify index.html exists

### "ERROR: <footer> not found in index.html"
- Check that index.html has a `<footer>` element
- The footer must be properly closed with `</footer>`

### Changes not visible in browser
- Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for any errors
- Verify CSS files were created in `assets/css/`

### Theme controls not working
- Check browser console for JavaScript errors
- Ensure footer JavaScript is loading
- Try clearing localStorage and refreshing

## 💡 Tips

1. **Always dry-run first**: See what will change before applying
2. **Keep backups**: The script creates them automatically, but you can make extra copies
3. **Test incrementally**: Try on one page first, then expand
4. **Clear cache**: Browser caching can hide changes
5. **Check console**: Developer tools can reveal issues

## 🎯 Quick Checklist

Before running:
- [ ] I'm in the site's root directory
- [ ] index.html exists and has proper footer
- [ ] I've run --dry-run to preview changes

After running:
- [ ] CSS files created in assets/css/
- [ ] Backup files created (.oneshot.bak.*)
- [ ] Tested footer appears correctly
- [ ] Theme controls work
- [ ] Explorer navigation works
- [ ] Checked multiple pages

Ready to deploy:
- [ ] All local tests passed
- [ ] Visual appearance is correct
- [ ] No console errors
- [ ] Responsive design works (mobile/desktop)

---

**Remember**: This script is designed for LOCAL use. Review all changes before deploying to production!
