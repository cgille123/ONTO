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
  const pasteButton = document.createElement('button');
  pasteButton.type = 'button';
  pasteButton.id = 'paste-backup';
  pasteButton.textContent = 'Paste Backup';
  restoreButton.before(pasteButton);
  function refreshRecovery() {
    try { restoreButton.hidden = !localStorage.getItem(RECOVERY_KEY); }
    catch (_) { restoreButton.hidden = true; }
  }
  refreshRecovery();
  // Export is a browser download, not a board mutation. Do not display the
  // global Undo toast or leave the storage label in a transient saving state.
  let exportLabelTimer;
  $('#export').addEventListener('click', () => {
    try {
      downloadBoard(state);
      if (storageLabel) {
        clearTimeout(exportLabelTimer);
        storageLabel.textContent = 'Backup requested · Keep the JSON file somewhere safe';
        exportLabelTimer = setTimeout(() => {
          storageLabel.textContent = 'Saved on this device · Export for a backup';
        }, 3500);
      }
    } catch (error) {
      if (storageLabel) storageLabel.textContent = 'Export failed · Please try again';
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
  const pasteDialog = document.createElement('dialog');
  pasteDialog.id = 'paste-backup-dialog';
  pasteDialog.innerHTML = '<form method="dialog" class="paste-backup-form"><h2>Paste ONTO Backup</h2><p>Paste the complete JSON backup text. Your current board will be protected by the same pre-import recovery process.</p><label for="paste-backup-text">Backup JSON</label><textarea id="paste-backup-text" rows="9" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="Paste the complete ONTO JSON backup here"></textarea><div class="edit-actions"><button type="button" id="paste-backup-cancel">Cancel</button><button type="button" id="paste-backup-apply" class="primary">Import pasted backup</button></div></form>';
  document.body.appendChild(pasteDialog);
  const pasteArea = pasteDialog.querySelector('#paste-backup-text');
  pasteButton.addEventListener('click', () => pasteDialog.showModal());
  pasteDialog.querySelector('#paste-backup-cancel').addEventListener('click', () => pasteDialog.close());
  pasteDialog.querySelector('#paste-backup-apply').addEventListener('click', async () => {
    const text = pasteArea.value.trim();
    if (!text) { alert('Paste your ONTO backup JSON first.'); return; }
    // Close before validation/confirmation so iOS never leaves a modal over the board.
    pasteDialog.close();
    await importBoardText(text);
    pasteArea.value = '';
  });
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
