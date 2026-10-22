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


/* Temporary iPhone standalone portrait dock measurements; read-only. */
(()=>{
 const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(!isStandalone()||!window.matchMedia('(orientation: portrait) and (max-width: 600px)').matches)return;
 const panel=document.createElement('pre');
 panel.id='onto-dock-diagnostics';
 panel.style.cssText='position:fixed!important;top:calc(8px + env(safe-area-inset-top));left:6px;z-index:2147483647;background:#07121ef2;color:#c9ff9b;border:1px solid #b5fa61;border-radius:7px;padding:7px;font:10px/1.4 monospace;pointer-events:none;white-space:pre;max-width:95vw';
 document.body.append(panel);
 const probe=document.createElement('div');
 probe.style.cssText='position:fixed;bottom:env(safe-area-inset-bottom);height:0;width:0;visibility:hidden;pointer-events:none';
 document.body.append(probe);
 const fmt=(n)=>Number.isFinite(n)?Math.round(n*10)/10:'?';
 function update(){
 const vv=window.visualViewport, dock=document.querySelector('body > main > .dock-buttons'),brand=document.querySelector('.site-header .brand');
 const dr=dock?.getBoundingClientRect(),br=brand?.getBoundingClientRect(),body=document.body.getBoundingClientRect(),main=document.querySelector('main')?.getBoundingClientRect();
 const safe=window.innerHeight-probe.getBoundingClientRect().bottom;
 panel.textContent=[
 'ONTO DOCK DIAGNOSTIC',
 'inner '+innerWidth+' x '+innerHeight+' | screen '+screen.width+' x '+screen.height,
 'visual '+fmt(vv?.width)+' x '+fmt(vv?.height)+' top '+fmt(vv?.offsetTop)+' scale '+fmt(vv?.scale),
 'body bottom '+fmt(body.bottom)+' main bottom '+fmt(main?.bottom),
 'safe-bottom '+fmt(safe),
 'DISPLAY bottom '+fmt(dr?.bottom)+' gap(inner) '+fmt(innerHeight-(dr?.bottom??innerHeight)),
 'ONTO bottom '+fmt(br?.bottom)+' gap(inner) '+fmt(innerHeight-(br?.bottom??innerHeight)),
 'gap(visual) '+fmt((vv?.offsetTop??0)+(vv?.height??innerHeight)-(dr?.bottom??innerHeight))
 ].join('\n');
 }
 window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);
 window.addEventListener('orientationchange',update);update();
})();
