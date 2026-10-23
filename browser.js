// Browser/PWA adapter; replaces the macOS WKWebView-only native bridge.
(() => {
  const $ = s => document.querySelector(s);
  // UI-only state: intentionally not persisted; always starts collapsed.
  const settings = $('#onto-settings');
  const openSettings = $('#onto-settings-open');
  const closeSettings = $('#onto-settings-close');
  openSettings?.addEventListener('click', () => { if (!settings.open) settings.showModal(); });
  closeSettings?.addEventListener('click', () => settings.close());
  settings?.addEventListener('click', e => { if (e.target === settings) settings.close(); });
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
  const LAST_EXPORT_KEY = 'onto-last-export-offered-v1';
  const backupStatus = document.querySelector('#backup-status');
  function refreshBackupStatus() {
    if (!backupStatus) return;
    try {
      const stamp = Number(localStorage.getItem(LAST_EXPORT_KEY));
      backupStatus.textContent = stamp && Number.isFinite(stamp)
        ? 'Last backup offered: ' + new Date(stamp).toLocaleString() + ' · Verify it was saved outside ONTO'
        : 'No recorded export on this device · Export a backup';
    } catch (_) { backupStatus.textContent = 'Backup status unavailable · Export regularly'; }
  }
  refreshBackupStatus();
  // Storage persistence is best-effort. It never replaces a separate export.
  const protectButton = document.querySelector('#protect-storage');
  const protectStatus = document.querySelector('#storage-protection-status');
  async function refreshStorageProtection() {
    if (!protectStatus) return;
    try {
      if (!navigator.storage || typeof navigator.storage.persisted !== 'function') {
        protectStatus.textContent = 'Persistent storage unavailable in this browser · Export regularly';
        return;
      }
      const granted = await navigator.storage.persisted();
      let usage = '';
      if (typeof navigator.storage.estimate === 'function') {
        const estimate = await navigator.storage.estimate();
        if (Number.isFinite(estimate.usage)) usage = ' · Browser storage: ' + (estimate.usage / 1048576).toFixed(1) + ' MB';
      }
      protectStatus.textContent = (granted ? 'Persistent storage enabled' : 'Standard browser storage (may be cleared)') + usage;
    } catch (_) { protectStatus.textContent = 'Storage status unavailable · Export regularly'; }
  }
  protectButton?.addEventListener('click', async () => {
    if (!navigator.storage || typeof navigator.storage.persist !== 'function') {
      message('This browser cannot request persistent storage. Export regularly for safety.');
      return;
    }
    protectButton.disabled = true;
    try {
      const granted = await navigator.storage.persist();
      message(granted ? 'Persistent browser storage enabled. Continue exporting off-device backups.' : 'Browser did not grant persistent storage. Your board is unchanged; export regularly.');
    } catch (_) { message('Storage protection request unavailable. Your board is unchanged.'); }
    finally { protectButton.disabled = false; await refreshStorageProtection(); }
  });
  refreshStorageProtection();
  document.querySelector('.board-extras')?.addEventListener('toggle', () => { refreshStorageProtection(); });

  document.querySelector('.board-extras')?.addEventListener('toggle', refreshBackupStatus);
  document.querySelector('#check-board')?.addEventListener('click', () => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) throw Error('No saved board found.');
      const checked = validate(JSON.parse(stored));
      const snapshots = readAutoSnapshots();
      const good = snapshots.filter(x => { try { validate(x.board); return true; } catch (_) { return false; } }).length;
      message('Board check OK: ' + checked.items.length + ' tiles, ' + good + '/' + snapshots.length + ' valid local snapshots. Export for off-device safety.');
    } catch (error) { message('Board check: ' + error.message); }
  });
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
  restoreButton.textContent = 'Undo Import';
  restoreButton.hidden = true;
  $('#recovery-tools').appendChild(restoreButton);
  function refreshRecovery() {
    try { restoreButton.hidden = !localStorage.getItem(RECOVERY_KEY); }
    catch (_) { restoreButton.hidden = true; }
  }
  refreshRecovery();
  const autoRestoreButton=document.createElement('button');
  autoRestoreButton.type='button';
  autoRestoreButton.id='restore-auto-backup';
  autoRestoreButton.textContent='Restore earlier board';
  $('#recovery-tools').appendChild(autoRestoreButton);
  function readAutoSnapshots(){
    const raw=localStorage.getItem('onto-auto-snapshots-v1');
    const entries=raw?JSON.parse(raw):[];
    if(!Array.isArray(entries))throw Error('Invalid recovery history.');
    return entries.filter(entry=>Number.isFinite(entry.at)&&entry.board).slice(0,3);
  }
  function refreshAutoRestore(){
    // Always show recovery control so its existence and availability are clear.
    try{
      const count=readAutoSnapshots().length;
      autoRestoreButton.textContent=count ? 'Restore earlier board ('+count+')' : 'Restore earlier board (none yet)';
      autoRestoreButton.disabled=count===0;
      autoRestoreButton.title=count ? 'Choose a saved board version' : 'Edit a tile to create the first recovery snapshot';
    }catch(_){
      autoRestoreButton.textContent='Restore earlier board (unavailable)';
      autoRestoreButton.disabled=true;
    }
  }
  refreshAutoRestore();
  document.querySelector('.board-extras')?.addEventListener('toggle',refreshAutoRestore);
  window.addEventListener('onto:snapshot-saved',refreshAutoRestore);
  // A checkpoint is a manually chosen recovery point, separate from rolling snapshots.
  const MANUAL_KEY='onto-manual-checkpoint-v1';
  const checkpointButton=document.createElement('button');
  checkpointButton.type='button';checkpointButton.id='save-checkpoint';
  checkpointButton.textContent='Save checkpoint';
  $('#recovery-tools').appendChild(checkpointButton);
  const recoveryDialog=document.createElement('dialog');
  recoveryDialog.id='recovery-manager';
  recoveryDialog.innerHTML='<div class="recovery-manager-inner"><div class="dialog-top"><h2>Board recovery</h2><button type="button" id="close-recovery-manager" aria-label="Close">×</button></div><p>Choose a saved version. Automatic snapshots are kept on this device; export a backup for protection outside ONTO.</p><div id="recovery-versions"></div><button type="button" id="recovery-done">Done</button></div>';
  document.body.appendChild(recoveryDialog);
  const versions=$('#recovery-versions');
  const closeRecovery=()=>recoveryDialog.close();
  $('#close-recovery-manager').addEventListener('click',closeRecovery);
  $('#recovery-done').addEventListener('click',closeRecovery);
  recoveryDialog.addEventListener('click',e=>{if(e.target===recoveryDialog)closeRecovery();});
  function recoveryVersions(){
    const out=[];
    const raw=localStorage.getItem(MANUAL_KEY);
    if(raw){try{const entry=JSON.parse(raw);out.push({name:'Manual checkpoint',at:entry.at,board:validate(entry.board)});}catch(_){out.push({name:'Manual checkpoint',error:true});}}
    readAutoSnapshots().forEach((entry,index)=>{
      try{out.push({name:'Automatic snapshot '+(index+1),at:entry.at,board:validate(entry.board)});}
      catch(_){out.push({name:'Automatic snapshot '+(index+1),error:true});}
    });
    return out;
  }
  function showRecoveryVersions(){
    versions.replaceChildren();
    const entries=recoveryVersions();
    if(!entries.length){const empty=document.createElement('p');empty.textContent='No recovery versions yet. Use Save checkpoint to create one.';versions.appendChild(empty);}
    for(const entry of entries){
      const row=document.createElement('div');row.className='recovery-version';
      const info=document.createElement('div');
      const name=document.createElement('strong');name.textContent=entry.name;
      const detail=document.createElement('small');detail.textContent=entry.error?'Damaged or unavailable':new Date(entry.at).toLocaleString()+' · '+entry.board.items.length+' tiles';
      info.append(name,detail);row.appendChild(info);
      if(!entry.error){
        const restore=document.createElement('button');restore.type='button';restore.textContent='Restore';
        restore.addEventListener('click',()=>{
          if(!confirm('Restore '+entry.name+'? Your current board will be saved as Undo Import first.'))return;
          try{
            const before=clone(state);
            localStorage.setItem(RECOVERY_KEY,JSON.stringify(before));
            localStorage.setItem(KEY,JSON.stringify(entry.board));
            state=clone(entry.board);returnToNow();categoryFilter='';statusFilter='';whenFilter='';
            render();refreshRecovery();refreshAutoRestore();closeRecovery();
            message('Board restored. Use Undo Import to return to your previous board.',before);
          }catch(error){message('Could not restore: '+error.message);}
        });
        const exportCopy=document.createElement('button');exportCopy.type='button';exportCopy.textContent='Export';
        exportCopy.addEventListener('click',async()=>{
          try{await shareBoardFile(entry.board,'ONTO-recovery');message('Recovery backup offered. Save the JSON outside ONTO.');}
          catch(error){if(error.name!=='AbortError')message('Recovery export failed: '+error.message);}
        });
        const actions=document.createElement('div');actions.className='recovery-actions';actions.append(restore,exportCopy);row.appendChild(actions);
      }
      versions.appendChild(row);
    }
  }
  autoRestoreButton.addEventListener('click',()=>{try{showRecoveryVersions();recoveryDialog.showModal();}catch(error){message('Recovery history unavailable: '+error.message);}});
  checkpointButton.addEventListener('click',()=>{
    try{
      const board=validate(clone(state));
      const existing=localStorage.getItem(MANUAL_KEY);
      if(existing&&!confirm('Replace your previous manual checkpoint with the current board?'))return;
      localStorage.setItem(MANUAL_KEY,JSON.stringify({at:Date.now(),board}));
      message('Checkpoint saved on this device. Export for an independent backup.');
    }catch(error){message('Could not save checkpoint: '+error.message);}
  });
  // On iOS, use the native Share sheet for a JSON file instead of opening
  // Safari's download preview, which can strand the subsequent file picker.
  // Desktop/unsupported browsers retain the existing download behavior.
  async function shareBoardFile(board,prefix='ONTO-backup') {
    const filename=prefix+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
    const backup=new File([JSON.stringify(board,null,2)],filename,{type:'application/json'});
    const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(isiOS&&typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[backup]})){
      await navigator.share({files:[backup]});
    }else{downloadBoard(board,prefix);}
  }
  let exportLabelTimer;
  $('#export').addEventListener('click', async () => {
    try {
      try { await shareBoardFile(state); }
      catch(error){if(error.name==='AbortError')return;throw error;}
      // This records that a backup was offered/shared, not that it was saved to Files.
      try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch (_) {}
      refreshBackupStatus();
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
      const incomingCount = incoming.items.length;
      const currentCount = state.items.length;
      const preview = 'Import preview\n\nBackup: ' + incomingCount + ' tiles\nCurrent board: ' + currentCount + ' tiles\n\nImport replaces the current board. ONTO will keep an Undo Import copy when possible. Export first for an off-device backup.\n\nContinue?';
      if (!confirm(preview)) return;
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
