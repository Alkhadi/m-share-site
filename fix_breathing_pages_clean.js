const fs = require('fs');
const path = require('path');
const referencePath = path.join(__dirname, 'c822a680-eb51-4fb7-87ce-8516602c61e3.html');
const referenceHtml = fs.readFileSync(referencePath, 'utf8');
function extractSection(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start === -1) return '';
  const end = html.indexOf(endMarker, start);
  if (end === -1) return '';
  return html.substring(start, end + endMarker.length);
}
const HEADER = extractSection(referenceHtml, '<header', '</header>');
const FOOTER = extractSection(referenceHtml, '<footer', '</footer>');
const scriptTags = referenceHtml.match(/<script src="[^\"]+\.js"><\/script>/g) || [];
const SCRIPT_BLOCK = scriptTags.join('\n');
const CSS_FILES = [
  'style.css',
  'assets/css/ux-fixes.css',
  'assets/css/footer-2025.css',
  'assets/css/header-2025.css',
  'assets/css/nav-footer-uni.css',
  'assets/css/responsive-fixes.css'
];
const targets = [
  'box-breathing.html',
  '4-7-8-breathing.html',
  'coherent-5-5.html',
  'sos-60.html'
];
function dedupe(str, token) {
  const parts = str.split(token);
  if (parts.length <= 2) return str;
  return parts.shift() + token + parts.pop();
}
targets.forEach(filename => {
  const filePath = path.join(__dirname, 'extracted', filename);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  CSS_FILES.forEach(css => {
    if (!html.includes(css)) {
      const linkTag = `<link rel="stylesheet" href="${css}" />`;
      const styleIdx = html.indexOf('style.css');
      if (styleIdx !== -1) {
        const endTag = html.indexOf('>', html.lastIndexOf('<link', styleIdx)) + 1;
        html = html.slice(0, endTag) + '\n' + linkTag + html.slice(endTag);
      } else {
        html = html.replace('</head>', `${linkTag}\n</head>`);
      }
    }
  });
  html = html.replace(/<header[\s\S]*?<\/header>/, HEADER);
  html = html.replace(/<footer[\s\S]*?<\/footer>/, FOOTER);
  html = html.replace(/<script src="[^\"]*(nav|sound|voice|header|footer|site-core|a11y-fix|start-fix|ux-fixes|paylinks)[^\"]*\.js"><\/script>\n?/g, '');
  html = dedupe(html, '<script src="coach.js"></script>');
  html = dedupe(html, '<script src="app.js"></script>');
  html = html.replace(/<\/body>/, `${SCRIPT_BLOCK}\n</body>`);
  html = dedupe(html, '<script src="coach.js"></script>');
  html = dedupe(html, '<script src="app.js"></script>');
  fs.writeFileSync(filePath, html);
});