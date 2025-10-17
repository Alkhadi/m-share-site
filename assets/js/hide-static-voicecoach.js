(() => {
  // CSS rule: hide old panel variants UNLESS they become draggable (.voice-coach-draggable)
  const css = `
    #vc-panel,
    .old-voice-coach,
    .vc-bar,
    #voice-coach:not(.voice-coach-draggable),
    .voice-coach:not(.voice-coach-draggable),
    [data-voice-coach].static { display:none !important; visibility:hidden !important; }
  `;
  if (!document.querySelector('style[data-voicecoach-css="hide-static"]')) {
    const s = document.createElement('style'); s.setAttribute('data-voicecoach-css','hide-static'); s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  // MutationObserver: if any static panel gets injected later, hide it immediately
  const hide = (root=document) => {
    root.querySelectorAll('#vc-panel, .old-voice-coach, .vc-bar, #voice-coach, .voice-coach, [data-voice-coach].static')
      .forEach(el => {
        if (!el.classList.contains('voice-coach-draggable')) {
          el.style.display = 'none'; el.style.visibility = 'hidden';
        }
      });
  };
  hide();
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType === 1) { hide(n); }
      });
    }
  });
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();