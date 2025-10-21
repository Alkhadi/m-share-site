(() => {
  // Guard against multiple initialisations
  if (window.__VOICE_COACH__) return;
  window.__VOICE_COACH__ = true;
  const S = 'vc_on', G = 'vc_gender', V = 'vc_voice', R = 'vc_rate';
  // Load persisted preferences
  let on = (localStorage.getItem(S) || 'on') !== 'off';
  let gender = localStorage.getItem(G) || 'any';
  let pick = localStorage.getItem(V) || '';
  let rate = parseFloat(localStorage.getItem(R) || '1') || 1;
  // Create floating UI
  const ui = document.createElement('div');
  ui.className = 'voice-coach';
  ui.innerHTML = '<h4>Voice Coach</h4>' +
    '<div class="row"><label style="display:flex;gap:6px;align-items:center"><input id="vcOn" type="checkbox"> On</label></div>' +
    '<div class="row"><select id="vcGender"><option value="any">Any</option><option value="female">Female</option><option value="male">Male</option></select></div>' +
    '<div class="row"><select id="vcVoice"></select></div>' +
    '<div class="row"><label>Speed</label><input id="vcRate" type="range" min="0.7" max="1.3" step="0.05"></div>';
  document.body.appendChild(ui);
  const onEl = ui.querySelector('#vcOn');
  const gEl = ui.querySelector('#vcGender');
  const vEl = ui.querySelector('#vcVoice');
  const rEl = ui.querySelector('#vcRate');
  onEl.checked = on;
  gEl.value = gender;
  rEl.value = String(rate);
  // Populate available voices based on gender preference
  function listVoices() {
    if (typeof speechSynthesis === 'undefined') return;
    const all = speechSynthesis.getVoices();
    const uk = all.filter(v => /en-GB/i.test(v.lang || v.name));
    const females = uk.filter(v => /(Female|Femail|Siri|Martha|Kate|Alice|Fiona|Victoria)/i.test(v.name)).slice(0, 5);
    const males = uk.filter(v => /(Male|Daniel|Tom|Oliver|Alex|Arthur|George|James|Brian)/i.test(v.name)).slice(0, 5);
    let pool = [];
    if (gender === 'female') pool = females.length ? females : uk;
    else if (gender === 'male') pool = males.length ? males : uk;
    else pool = uk.length ? uk : all;
    vEl.innerHTML = '';
    pool.forEach(v => {
      const o = document.createElement('option');
      o.value = v.name;
      o.textContent = `${v.name} (${v.lang})`;
      vEl.appendChild(o);
    });
    if (pick) {
      const f = Array.from(vEl.options).find(o => o.value === pick);
      if (f) vEl.value = pick;
      else pick = vEl.value;
    } else {
      pick = vEl.value;
    }
  }
  // Initialize voices list when available
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = listVoices;
    listVoices();
  }
  // Save preferences when toggles change
  onEl.addEventListener('change', () => {
    on = onEl.checked;
    try {
      localStorage.setItem(S, on ? 'on' : 'off');
    } catch { }
    if (!on && typeof speechSynthesis !== 'undefined') {
      try { speechSynthesis.cancel(); } catch { }
    }
  });
  gEl.addEventListener('change', () => {
    gender = gEl.value;
    try { localStorage.setItem(G, gender); } catch { }
    listVoices();
  });
  vEl.addEventListener('change', () => {
    pick = vEl.value;
    try { localStorage.setItem(V, pick); } catch { }
  });
  rEl.addEventListener('input', () => {
    rate = parseFloat(rEl.value || '1') || 1;
    try { localStorage.setItem(R, String(rate)); } catch { }
  });
})();
