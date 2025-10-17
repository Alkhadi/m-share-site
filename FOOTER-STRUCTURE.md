# M Share Footer Structure

## Current Footer Features (in index.html)

The footer in `index.html` already includes all requested features that will be propagated to all pages via the script:

### 1. Explorer Section (Right Column)
- **Dynamic menu building** from header navigation
- **Chevron dropdowns** for each navigation section:
  - Wellbeing
  - Conditions (Neurodevelopmental & Mental Health)
  - Breathing & Focus (Guides & Techniques)
  - Toolkits (General & Condition-specific)
  - About
- **Keyboard accessible** (Enter, Space, Escape keys)
- **All submenus included** from the main navigation

### 2. Theme Controls (Center Column)
- **Auto mode**: Day/night switching based on time (7 AM - 7 PM)
- **Manual color picker**: Choose any background color
- **Brightness slider**: Adjust from 0.85 to 1.25
- **Reset button**: Return to defaults
- **LocalStorage persistence**: Settings saved across sessions

### 3. Brand Section (Left Column)
- M Share logo and tagline
- Support Us links (Coffee page and Stripe payment)

### 4. Footer Scripts
Two inline scripts handle functionality:

#### Theme Script (`mpl-theme-auto-js-v3`)
- Auto day/night theme switching
- Color palette derivation with proper contrast
- Brightness control
- LocalStorage state management

#### Explorer Menu Script (`mpl-footer-menu-js-v3`)
- Extracts navigation from header
- Builds collapsible sections with chevrons
- Handles toggle states
- Keyboard navigation support

## Footer Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                        FOOTER                               │
├──────────────┬──────────────────┬──────────────────────────┤
│  Brand Col   │  Theme Controls  │    Explorer Section      │
│              │                  │                          │
│ [M] M Share  │   🎨 Theme       │    ▼ Wellbeing          │
│ Description  │   □ Auto         │    ▼ Conditions         │
│              │   Color: [■]     │    ▼ Breathing & Focus  │
│ Support Us   │   Bright: [━━━]  │    ▼ Toolkits           │
│ ☕ Support Us │   [Reset]        │    ▼ About              │
└──────────────┴──────────────────┴──────────────────────────┘
│  © 2025 MindPayLink · Educational info...                  │
│  Designed by Alkhadi M Koroma                              │
└─────────────────────────────────────────────────────────────┘
```

## What the Script Does

The `fix-readability-apply-from-index.mjs` script:

1. **Extracts** the complete footer from `index.html`
2. **Replaces** the footer on every HTML page with this canonical version
3. **Ensures** all pages have the Explorer section with navigation
4. **Ensures** all pages have the Theme controls for color changes
5. **Adds** typography and readability CSS for consistent styling
6. **Creates** backups of all modified files

## CSS Files Created

### 1. `assets/css/chatgpt5-typography.css`
- Professional system fonts
- Optimized text rendering
- Monospace for code blocks

### 2. `assets/css/readability-professional.css`
- Contrast-aware text colors
- White text on dark surfaces
- Black text on light surfaces
- Professional button states
- Accessible link styling
- Form readability on dark backgrounds
- 2% spacing between sections/cards
- Footer-specific styling

## Reference

The footer design is inspired by [mindpaylink.com](https://mindpaylink.com) with:
- ✅ Explorer section with all navigation pages
- ✅ Theme controls for background customization
- ✅ Professional, accessible design
- ✅ Responsive layout (stacks on mobile)

## Usage

```bash
# Preview changes (recommended first)
node fix-readability-apply-from-index.mjs --dry-run

# Apply changes to all HTML files
node fix-readability-apply-from-index.mjs
```

See `README-fix-readability.md` for complete documentation.
