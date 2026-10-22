// Browser/PWA adapter; replaces the macOS WKWebView-only native bridge.
(() => {
  const $ = s => document.querySelector(s);
  // UI-only state: intentionally not persisted; always starts collapsed.
  const dock = $('#bottom-dock');
  const dockToggle = $('#dock-toggle');
  dockToggle.addEventListener('click', () => {
    const expanded = dock.classList.toggle('dock-collapsed') === false;
    dockToggle.setAttribute('aria-expanded', String(expanded));
    dockToggle.setAttribute('aria-label', expanded ? 'Collapse view controls' : 'Expand view controls');
  });
  const momentumSwitch=$('#onto-momentum-switch');const momentumSlot=$('#momentum-slot');const toggleMomentum=()=>{momentumSlot.hidden=!momentumSlot.hidden;momentumSwitch.setAttribute('aria-expanded',String(!momentumSlot.hidden));requestAnimationFrame(()=>{document.documentElement.style.setProperty('--momentum-offset',momentumSlot.hidden?'0px':(momentumSlot.getBoundingClientRect().height+28)+'px');});};momentumSwitch.addEventListener('click',toggleMomentum);
  const storageLabel = $('#storage');
  if (storageLabel) storageLabel.textContent = 'Saved on this device · Export for a backup';
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ONTO-board-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  $('#import').addEventListener('click', () => $('#file').click());
  $('#file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const incoming = validate(JSON.parse(await file.text()));
      if (state.items.length && !confirm('Replace this device’s ONTO board with the imported board? Export first if you want to keep both.')) return;
      const before = clone(state);
      state = incoming; returnToNow();
      categoryFilter = ''; statusFilter = ''; whenFilter = '';
      persist(); render(); message('Board imported.', before);
    } catch (error) { message('Could not import: ' + error.message); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
})();



/* Standalone portrait iPhone: the CSS viewport can end above the actual
   screen. The measured 874px screen / 812px viewport difference is 62px.
   Extend only the bottom dock anchors into that unoccupied screen area.
   Browser tabs and landscape keep their existing, working layout. */
(()=>{
 const standalone=()=>navigator.standalone===true || matchMedia('(display-mode: standalone)').matches;
 function updateStandaloneDock(){
   const portrait=matchMedia('(orientation: portrait) and (max-width: 600px) and (pointer: coarse)').matches;
   const difference=standalone() && portrait ? Math.max(0,Math.min(120,screen.height-window.innerHeight)) : 0;
   document.documentElement.classList.toggle('onto-standalone',standalone());
   document.documentElement.style.setProperty('--onto-standalone-bottom-extension',difference+'px');
 }
 addEventListener('resize',updateStandaloneDock);
 addEventListener('orientationchange',updateStandaloneDock);
 addEventListener('pageshow',updateStandaloneDock);
 updateStandaloneDock();
})();
