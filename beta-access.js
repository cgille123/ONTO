/* ONTO's signed beta grants deter casual sharing; they are not a hardware lock. */
(() => {
  'use strict';

  const INSTALLATION_KEY = 'onto-beta-installation-v1';
  const TOKEN_KEY = 'onto-beta-token-v1';
  const ID_PATTERN = /^[0-9a-f]{32}$/;
  const KEY_ID_PATTERN = /^[0-9a-f]{16}$/;
  const suppliedConfig = window.ONTO_BETA_PUBLIC_KEY;
  const config = suppliedConfig && typeof suppliedConfig === 'object'
    ? Object.freeze({...suppliedConfig}) : null;
  let installationId = '';
  let verifiedToken = '';
  let phase = 'loading';
  let statusMessage = 'Checking beta access…';
  let publicKey = null;
  let revision = 0;

  const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const requestCode = () => installationId
    ? 'ONTO-' + installationId.toUpperCase().match(/.{8}/g).join('-') : '';
  function currentStatus() {
    return Object.freeze({
      state: phase,
      requestCode: requestCode(),
      message: statusMessage,
      canActivate: !!publicKey && !!installationId && phase !== 'loading' && phase !== 'unavailable'
    });
  }
  function notify() {
    window.dispatchEvent(new Event('onto:beta-access-changed'));
  }
  function setStatus(next, message) {
    phase = next;
    statusMessage = message;
    notify();
  }
  function error(message) {
    return new Error(message);
  }
  function exactFields(value, names) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
  }
  function bytesFromBase64(text) {
    const binary = atob(text);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
  function base64url(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodePart(text, maximumBytes) {
    if (!/^[A-Za-z0-9_-]+$/.test(text)) throw error('That activation key is not valid. Paste the complete key.');
    let bytes;
    try {
      bytes = bytesFromBase64(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4));
    } catch (_) {
      throw error('That activation key is not valid. Paste the complete key.');
    }
    if (bytes.length > maximumBytes || base64url(bytes) !== text) {
      throw error('That activation key is not valid. Paste the complete key.');
    }
    return bytes;
  }
  function decodeJSON(text, maximumBytes) {
    try {
      return JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(decodePart(text, maximumBytes)));
    } catch (_) {
      throw error('That activation key is not valid. Paste the complete key.');
    }
  }
  function loadInstallation() {
    let saved;
    try {
      saved = localStorage.getItem(INSTALLATION_KEY);
      if (!ID_PATTERN.test(saved || '')) {
        if (!window.crypto?.getRandomValues) throw error('Secure random codes are unavailable in this browser.');
        saved = hex(window.crypto.getRandomValues(new Uint8Array(16)));
        localStorage.setItem(INSTALLATION_KEY, saved);
        if (localStorage.getItem(INSTALLATION_KEY) !== saved) throw error('Storage did not retain the request code.');
      }
    } catch (_) {
      throw error('Beta activation needs saved site data. Allow storage for ONTO, then reopen it.');
    }
    installationId = saved;
    return saved;
  }
  async function preparePublicKey() {
    if (!config) throw error('Beta activation is not available in this copy. Ask the beta owner for the current published version.');
    if (!window.crypto?.subtle) throw error('Open ONTO using its published HTTPS address to activate beta access.');
    if (!exactFields(config, ['version', 'algorithm', 'keyId', 'spki']) ||
        config.version !== 1 || config.algorithm !== 'ES256' || !KEY_ID_PATTERN.test(config.keyId) ||
        typeof config.spki !== 'string' || config.spki.length > 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(config.spki)) {
      throw error('Beta activation is not available in this copy. Ask the beta owner for the current published version.');
    }
    try {
      const spki = bytesFromBase64(config.spki);
      const fingerprint = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', spki))).slice(0, 16);
      if (fingerprint !== config.keyId) throw error('Public key fingerprint mismatch.');
      return await crypto.subtle.importKey('spki', spki, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
    } catch (_) {
      throw error('Beta activation is not available in this copy. Ask the beta owner for the current published version.');
    }
  }
  function normalizeToken(value) {
    if (typeof value !== 'string' || value.length > 2000) throw error('Paste a complete beta activation key.');
    const token = value.replace(/\s+/g, '');
    if (!token) throw error('Paste the beta activation key you received.');
    return token;
  }
  async function verifyToken(value, expectedId) {
    const token = normalizeToken(value);
    const parts = token.split('.');
    if (parts.length !== 3) throw error('That activation key is not valid. Paste the complete key.');
    const header = decodeJSON(parts[0], 256);
    const payload = decodeJSON(parts[1], 512);
    const signature = decodePart(parts[2], 64);
    if (!exactFields(header, ['alg', 'typ', 'kid']) || header.alg !== 'ES256' ||
        header.typ !== 'JWT' || header.kid !== config.keyId || signature.length !== 64 ||
        !exactFields(payload, ['v', 'iss', 'aud', 'sub', 'access']) || payload.v !== 1 ||
        payload.iss !== 'ONTO' || payload.aud !== 'ONTO-BETA' || payload.access !== 'beta' ||
        typeof payload.sub !== 'string' || !ID_PATTERN.test(payload.sub)) {
      throw error('This is not a beta key for this ONTO release. Ask the beta owner for a matching key.');
    }
    let valid = false;
    try {
      valid = await crypto.subtle.verify({name: 'ECDSA', hash: 'SHA-256'}, publicKey,
        signature, new TextEncoder().encode(parts[0] + '.' + parts[1]));
    } catch (_) { /* A malformed signature is rejected like an incorrect one. */ }
    if (!valid) throw error('That activation key could not be verified. Check that you pasted the complete key.');
    if (payload.sub !== expectedId) {
      throw error('This key belongs to another installation. Send this installation’s request code to the beta owner.');
    }
    return token;
  }
  let keyPreparation;
  async function refreshAccess() {
    const operation = ++revision;
    verifiedToken = '';
    setStatus('loading', 'Checking beta access…');
    let storedToken;
    try {
      loadInstallation();
      storedToken = localStorage.getItem(TOKEN_KEY);
      if (!keyPreparation) keyPreparation = preparePublicKey();
      publicKey = await keyPreparation;
    } catch (failure) {
      if (operation === revision) setStatus('unavailable', failure.message || 'Beta activation is unavailable. You can still use Free.');
      return currentStatus();
    }
    if (operation !== revision) return currentStatus();
    if (!storedToken) {
      setStatus('free', 'Free access · Six unfinished tasks. A beta key unlocks unlimited tiles on this installation.');
      return currentStatus();
    }
    try {
      const token = await verifyToken(storedToken, installationId);
      if (operation !== revision) return currentStatus();
      verifiedToken = token;
      setStatus('active', 'Beta activated · Unlimited tiles on this installation.');
    } catch (failure) {
      if (operation === revision) setStatus('free', failure.message + ' Your existing board is preserved.');
    }
    return currentStatus();
  }
  const ready = refreshAccess();
  async function activate(value) {
    await ready;
    if (phase === 'loading') throw error('Beta access is still being checked. Try again in a moment.');
    if (!currentStatus().canActivate) throw error(statusMessage);
    const operation = ++revision;
    const expectedId = installationId;
    // Verify before touching the saved key: a bad replacement cannot remove a
    // previously valid grant or modify any of the user's tasks.
    const token = await verifyToken(value, expectedId);
    if (operation !== revision) throw error('Beta access changed during activation. Try again.');
    try {
      if (localStorage.getItem(INSTALLATION_KEY) !== expectedId) {
        void refreshAccess();
        throw error('This installation’s request code changed. Reopen Beta access and use its current code.');
      }
      localStorage.setItem(TOKEN_KEY, token);
      if (localStorage.getItem(TOKEN_KEY) !== token) throw error('Activation was not saved.');
    } catch (failure) {
      if (operation !== revision) throw failure;
      throw error('Could not save the beta key. Allow storage for ONTO, then try again.');
    }
    verifiedToken = token;
    setStatus('active', 'Beta activated · Unlimited tiles on this installation.');
    return currentStatus();
  }
  const api = Object.freeze({
    ready,
    getStatus: currentStatus,
    isActive: () => phase === 'active' && !!verifiedToken,
    activate
  });
  Object.defineProperty(window, 'ontoBeta', {value: api, writable: false, configurable: false});
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === INSTALLATION_KEY || event.key === TOKEN_KEY) void refreshAccess();
  });
})();
