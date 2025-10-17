/* Mobile navigation fix — self‑contained runtime
   * This module uses conservative selectors to find the site header,
   * hamburger toggle and primary nav.  It intercepts click events on
   * the hamburger toggle using capture to prevent legacy handlers from
   * opening overlays.  It toggles the nav via the native 'hidden'
   * property and manages submenus using an inserted wrapper element.
   */
(function() {
  // Only run in browsers with necessary APIs
  if (!document.querySelector || !window.matchMedia) return;
  const header = document.querySelector('header.site-header') || document.querySelector('header');
  if (!header) return;
  const nav = header.querySelector('#mainNav') || header.querySelector('nav.main-nav') || header.querySelector('nav');
  let toggle = header.querySelector('#navToggle') || header.querySelector('.nav-toggle') || header.querySelector('.hamburger');
  if (!nav || !toggle) return;
  const mql = window.matchMedia('(max-width:1024px)');

  /** Toggle the main navigation on mobile. */
  function openNav() {
    if (!mql.matches) return;
    nav.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onEsc, true);
  }
  function closeNav() {
    nav.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onEsc, true);
  }
  function toggleNav(event) {
    if (!mql.matches) return;
    event.preventDefault();
    // Stop any other click handlers (e.g. legacy nav code)
    event.stopImmediatePropagation();
    if (nav.hidden) openNav(); else closeNav();
  }
  function onEsc(event) {
    if (event.key === 'Escape') {
      closeNav();
    }
  }

  /**
   * Initialise submenus for mobile.  For each li.menu-group (or
   * equivalent structure), we wrap its submenu in a container for smooth
   * animation and insert a chevron button to toggle it.  Parent
   * controls get appropriate aria attributes.
   */
  function initSubmenus() {
    const groups = Array.from(nav.querySelectorAll('.menu-group'));
    groups.forEach((group, idx) => {
      // The trigger is either a button.menu-toggle or the first link/button
      let trigger = group.querySelector(':scope > .menu-toggle') || group.querySelector(':scope > a, :scope > button');
      let submenu = group.querySelector(':scope > .submenu, :scope > ul');
      if (!trigger || !submenu) return;
      // On mobile start with submenu hidden
      if (mql.matches) {
        submenu.hidden = true;
      }
      // Wrap submenu in a div to animate height
      let wrap = group.querySelector(':scope > .mnav-subwrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'mnav-subwrap';
        group.insertBefore(wrap, submenu);
        wrap.appendChild(submenu);
      }
      // Assign stable ID to submenu for aria-controls
      if (!submenu.id) {
        submenu.id = 'sub-' + idx + '-' + Math.random().toString(36).slice(2);
      }
      trigger.setAttribute('aria-controls', submenu.id);
      trigger.setAttribute('aria-expanded', 'false');
      // Create or find existing chevron button
      let chev = group.querySelector(':scope > .mnav-chevron');
      if (!chev) {
        chev = document.createElement('button');
        chev.type = 'button';
        chev.className = 'mnav-chevron';
        chev.setAttribute('aria-label', 'Toggle submenu');
        // Default to collapsed
        chev.setAttribute('aria-expanded', 'false');
        chev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        // Insert after the trigger
        if (trigger.nextSibling) {
          trigger.parentNode.insertBefore(chev, trigger.nextSibling);
        } else {
          trigger.parentNode.appendChild(chev);
        }
      }
      // Helper to open and close submenu
      const openSub = () => {
        submenu.hidden = false;
        wrap.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        chev.setAttribute('aria-expanded', 'true');
      };
      const closeSub = () => {
        submenu.hidden = true;
        wrap.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        chev.setAttribute('aria-expanded', 'false');
      };
      const toggleSub = (e) => {
        if (!mql.matches) return;
        e.preventDefault();
        // Do not allow legacy handlers to run
        e.stopImmediatePropagation();
        if (submenu.hidden) openSub(); else closeSub();
      };
      // Bind events to both the trigger and chevron
      const keyHandler = (e) => {
        if (!mql.matches) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleSub(e);
        }
      };
      // Use capture to pre-empt older handlers
      // Replace trigger with a clone to remove existing listeners if not already processed
      if (!trigger.__cloned) {
        const cloned = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(cloned, trigger);
        trigger = cloned;
        trigger.__cloned = true;
      }
      trigger.addEventListener('click', toggleSub, true);
      trigger.addEventListener('keydown', keyHandler, true);
      chev.addEventListener('click', toggleSub, true);
      chev.addEventListener('keydown', keyHandler, true);
    });
  }

  /** Initialise the mobile nav once. */
  function setup() {
    if (mql.matches) {
      // Start with nav closed
      nav.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      // Bind toggle listener once with capture so it fires before legacy handlers
      if (!toggle.__mnavBound) {
        // Replace the existing toggle with a clone to remove legacy event listeners
        const clone = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(clone, toggle);
        // Update reference to the new element
        toggle = clone;
        // Attach our handlers on the fresh element
        toggle.addEventListener('click', toggleNav, true);
        toggle.addEventListener('keydown', (e) => {
          if (!mql.matches) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleNav(e);
          }
        }, true);
        toggle.__mnavBound = true;
      }
      initSubmenus();
    } else {
      // Ensure nav and submenus are visible on desktop
      nav.hidden = false;
      toggle.setAttribute('aria-expanded', 'false');
      Array.from(nav.querySelectorAll('.submenu')).forEach(sub => { sub.hidden = false; });
      Array.from(nav.querySelectorAll('.mnav-subwrap')).forEach(wrap => { wrap.classList.remove('is-open'); });
    }
  }
  // Run setup now and whenever the viewport crosses the breakpoint
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setup(), { once: true });
  } else {
    setup();
  }
  mql.addEventListener('change', () => setup());
})();
