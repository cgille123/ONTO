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
  // One export/import handler, with a validated recovery snapshot before replacement.
  const RECOVERY_KEY = 'onto-recovery-before-import-v1';
  const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
  function downloadBoard(board, prefix = 'ONTO-backup') {
    const blob = new Blob([JSON.stringify(board, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = prefix + '-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const restoreButton = document.createElement('button');
  restoreButton.type = 'button';
  restoreButton.id = 'restore-before-import';
  restoreButton.textContent = 'Restore pre-import backup';
  restoreButton.hidden = true;
  $('#import').after(restoreButton);
  function refreshRecovery() {
    try { restoreButton.hidden = !localStorage.getItem(RECOVERY_KEY); }
    catch (_) { restoreButton.hidden = true; }
  }
  refreshRecovery();
  // On iOS, use the native Share sheet for a JSON file instead of opening
  // Safari's download preview, which can strand the subsequent file picker.
  // Desktop/unsupported browsers retain the existing download behavior.
  let exportLabelTimer;
  $('#export').addEventListener('click', async () => {
    try {
      const filename = 'ONTO-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
      const backup = new File([JSON.stringify(state, null, 2)], filename, {type:'application/json'});
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isiOS && typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' && navigator.canShare({files:[backup]})) {
        try {
          await navigator.share({files:[backup]});
        } catch (error) {
          // A dismissed Share sheet is not a request to download instead.
          if (error.name === 'AbortError') return;
          throw error;
        }
      } else {
        downloadBoard(state);
      }
      if (storageLabel) {
        clearTimeout(exportLabelTimer);
        storageLabel.textContent = 'Backup sent · Keep the JSON file somewhere safe';
        exportLabelTimer = setTimeout(() => {
          storageLabel.textContent = 'Saved on this device · Export for a backup';
        }, 3500);
      }
    } catch (error) {
      if (storageLabel) storageLabel.textContent = 'Export failed · ' + (error.message || 'Please try again');
    }
  });
  // Keep one native input. iOS can lose a file picker when its element is
  // replaced during a visibility transition, so never replace it on resume.
  const fileInput = $('#file');
  fileInput.addEventListener('change', event => {
    const file = event.currentTarget.files?.[0];
    if (file) importBoardFile(file);
    // Permit selecting the same file again without replacing the element.
    event.currentTarget.value = '';
  });
  async function importBoardFile(file) {
    if (file.size > MAX_IMPORT_BYTES) { message('Could not import: File exceeds 10 MB.'); return; }
    await importBoardText(await file.text());
  }
  async function importBoardText(text) {
    try {
      if (new Blob([text]).size > MAX_IMPORT_BYTES) throw Error('Backup exceeds 10 MB.');
      const incoming = validate(JSON.parse(text));
      if (state.items.length && !confirm('Import replaces this device’s current board. Save an exported backup first. Continue?')) return;
      const before = clone(state);
      if (before.items.length) {
        try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(before)); }
        catch (_) { throw Error('Cannot save a recovery copy (storage may be full). Export your board before importing.'); }
      }
      try { localStorage.setItem(KEY, JSON.stringify(incoming)); }
      catch (_) { throw Error('Import could not be saved. Existing board was preserved.'); }
      state = incoming;
      returnToNow();
      categoryFilter = ''; statusFilter = ''; whenFilter = '';
      render(); refreshRecovery();
      message('Board imported. Pre-import recovery copy retained.', before);
    } catch (error) { message('Could not import: ' + error.message); }
  }
  restoreButton.addEventListener('click', () => {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) { refreshRecovery(); return; }
      const recovery = validate(JSON.parse(raw));
      if (!confirm('Restore the board from before the last import? This replaces your current board. Export it first if needed.')) return;
      const current = clone(state);
      // Swap the recovery and current board so the operation can be reversed.
      localStorage.setItem(KEY, JSON.stringify(recovery));
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(current));
      state = recovery;
      returnToNow(); categoryFilter = ''; statusFilter = ''; whenFilter = '';
      render(); refreshRecovery();
      message('Pre-import board restored.', current);
    } catch (error) { message('Could not restore: ' + error.message); }
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
})();
