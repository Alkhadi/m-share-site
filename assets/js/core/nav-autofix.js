(() => {
  if (window.__NAV_AUTOFIX__) return; window.__NAV_AUTOFIX__ = true; const H = `
<header class="site-header">
  <div class="container navbar">
    <a id="brandLink" class="brand" data-href="index.html" href="index.html"><span class="logo">M</span><span class="brand-text">M Share</span></a>
    <nav class="main-nav" id="mainNav">
      <a data-href="index.html" href="index.html">Wellbeing</a>
      <div class="menu-group">
        <button class="menu-toggle" aria-expanded="false">Conditions <span class="icon">▾</span></button>
        <div class="submenu">
          <div class="menu-label">Neurodevelopmental</div>
          <a data-href="autism.html" href="autism.html">Autism</a>
          <a data-href="adhd.html" href="adhd.html">ADHD</a>
          <a data-href="dyslexia-reading-training.html" href="dyslexia-reading-training.html">Dyslexia</a>
          <div class="menu-label">Mental Health</div>
          <a data-href="anxiety.html" href="anxiety.html">Anxiety</a>
          <a data-href="depression.html" href="depression.html">Depression</a>
          <a data-href="stress.html" href="stress.html">Stress</a>
          <a data-href="sleep.html" href="sleep.html">Sleep</a>
        </div>
      </div>
      <div class="menu-group">
        <button class="menu-toggle" aria-expanded="false">Breathing &amp; Focus <span class="icon">▾</span></button>
        <div class="submenu">
          <div class="menu-label">Guides</div>
          <a data-href="breath.html" href="breath.html">Breath (how‑to)</a>
          <a data-href="focus.html" href="focus.html">Focus</a>
          <a data-href="mindfulness.html" href="mindfulness.html">Mindfulness</a>
          <div class="menu-label">Techniques</div>
          <a data-href="sos-60.html" href="sos-60.html">60‑second Reset</a>
          <a data-href="box-breathing.html" href="box-breathing.html">Box Breathing</a>
          <a data-href="4-7-8-breathing.html" href="4-7-8-breathing.html">4‑7‑8 Breathing</a>
          <a data-href="coherent-5-5.html" href="coherent-5-5.html">Coherent 5‑5</a>
        </div>
      </div>
      <div class="menu-group">
        <button class="menu-toggle" aria-expanded="false">Toolkits <span class="icon">▾</span></button>
        <div class="submenu">
          <div class="menu-label">General</div>
          <a data-href="sleep-tools.html" href="sleep-tools.html">Sleep Tools</a>
          <a data-href="breath-tools.html" href="breath-tools.html">Breath Tools</a>
          <a data-href="mood-tools.html" href="mood-tools.html">Mood Tools</a>
          <div class="menu-label">Condition‑specific</div>
          <a data-href="adhd-tools.html" href="adhd-tools.html">ADHD Tools</a>
          <a data-href="autism-tools.html" href="autism-tools.html">Autism Tools</a>
          <a data-href="depression-tools.html" href="depression-tools.html">Depression Tools</a>
          <a data-href="anxiety-tools.html" href="anxiety-tools.html">Anxiety Tools</a>
          <a data-href="stress-tools.html" href="stress-tools.html">Stress Tools</a>
        </div>
      </div>
      <div class="menu-group">
        <button class="menu-toggle" aria-expanded="false">About <span class="icon">▾</span></button>
        <div class="submenu">
          <a data-href="about.html" href="about.html">About</a>
          <a data-href="coffee.html" href="coffee.html">Support Us</a>
          <a data-href="contact.html" href="contact.html">Contact</a>
        </div>
      </div>
    </nav>
    <button type="button" id="navToggle" class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="mainNav">☰</button>
  </div>
</header>`;
  const F = `
<footer class="footer-2025" id="footer2025">
  <div class="wrap">
    <div class="grid">
      <section class="col brand">
        <div class="brandline"><span class="logo">M</span><div><b>M Share</b><div class="muted">Quiet, practical tools for mental health and wellbeing.</div></div></div>
        <div class="actions" style="margin-top:8px"><a class="btn" href="#top" id="backToTop">Back to top ↑</a></div>
      </section>
      <section class="col"><h4>Explore</h4>
        <p><a data-href="index.html" href="index.html">Wellbeing</a> • <a data-href="breath.html" href="breath.html">Breath</a> • <a data-href="focus.html" href="focus.html">Focus</a> • <a data-href="mindfulness.html" href="mindfulness.html">Mindfulness</a> • <a data-href="about.html" href="about.html">About</a></p>
      </section>
      <section class="col"><h4>Toolkits</h4>
        <p><a data-href="mood-tools.html" href="mood-tools.html">Mood</a> • <a data-href="breath-tools.html" href="breath-tools.html">Breath Tools</a> • <a data-href="sleep-tools.html" href="sleep-tools.html">Sleep</a> • <a data-href="anxiety-tools.html" href="anxiety-tools.html">Anxiety</a> • <a data-href="stress-tools.html" href="stress-tools.html">Stress</a></p>
      </section>
      <section class="col"><h4>Contact</h4>
        <p><a data-href="contact.html" href="contact.html">Contact</a> • <a href="mailto:info@mindpaylink.com">info@mindpaylink.com</a></p>
      </section>
    </div>
    <div class="bottom"><div>© <span id="yearFooter"></span> MindPayLink · Educational information only; not medical advice.</div><div class="credit">Designed by <b>Alkhadi M Koroma</b></div></div>
  </div>
</footer>`; const inject = () => {
    // If assets/header/header.js is in use, it already handles nav; avoid double-inject
    if (document.getElementById('mpl-mobile-overlay-css') || document.querySelector('header.site-header .mpl-nav-toggle')) return;
    const hasHeader = document.querySelector('header.site-header'); const hasFooter = document.querySelector('#footer2025');
    if (!hasHeader) { document.body.insertAdjacentHTML('afterbegin', H); } if (!hasFooter) { document.body.insertAdjacentHTML('beforeend', F); }
  };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inject, { once: true }); } else inject();
})();
