/* HLRN data layer v1. No dependencies. Safe to add alongside existing site-shell.js.
   All pages consume the same /data/hlrn.json. Nothing displays invented standings. */
(function (global) {
  'use strict';
  const script = document.currentScript;
  const DATA_URL = new URL('../data/hlrn.json', script ? script.src : location.href).href;
  const CACHE_NAME = 'hlrn-data-v1';
  const subscribers = new Set();
  let snapshot = null;
  let status = { state: 'loading', message: 'Loading HLRN data', updatedAt: null };
  let pending = null;

  function validate(payload) {
    if (!payload || payload.schemaVersion !== 1 || !payload.leagues || typeof payload.leagues !== 'object') {
      throw new Error('Invalid HLRN data schema');
    }
    if (!payload.generatedAt || !Number.isFinite(Date.parse(payload.generatedAt))) {
      throw new Error('No published HLRN snapshot yet');
    }
    for (const key of ['sunday', 'monday']) {
      const league = payload.leagues[key];
      if (!league || !['drivers', 'teams', 'results'].every(k => Array.isArray(league[k])) || !league.drivers.length) {
        throw new Error('Incomplete data for ' + key);
      }
    }
    return payload;
  }
  function notify() {
    const detail = { snapshot, status: { ...status } };
    for (const fn of subscribers) { try { fn(detail); } catch (err) { console.error(err); } }
    global.dispatchEvent(new CustomEvent('hlrn:data', { detail }));
    for (const el of document.querySelectorAll('[data-hlrn-data-status]')) {
      el.classList.add('hlrn-data-status');
      el.dataset.status = status.state;
      el.textContent = status.message;
      el.title = status.updatedAt ? 'Snapshot: ' + status.updatedAt : status.message;
    }
  }
  function setStatus(state, message) {
    status = { state, message, updatedAt: snapshot && snapshot.generatedAt || null };
    notify();
  }
  async function saveResponse(response) {
    if (!('caches' in global)) return;
    try { const cache = await caches.open(CACHE_NAME); await cache.put(DATA_URL, response); } catch (_) { /* storage disabled or full */ }
  }
  async function loadCache() {
    if (!('caches' in global)) return null;
    const cached = await caches.match(DATA_URL);
    if (!cached) return null;
    return validate(await cached.json());
  }
  async function load() {
    if (pending) return pending;
    pending = (async function () {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        let response;
        try { response = await fetch(DATA_URL, { cache: 'no-store', signal: controller.signal }); }
        finally { clearTimeout(timeout); }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = validate(await response.clone().json());
        snapshot = data;
        await saveResponse(response.clone());
        setStatus('current', 'Data loaded · ' + new Date(data.generatedAt).toLocaleString());
        return snapshot;
      } catch (err) {
        if (snapshot) {
          setStatus('cached', 'Using last available data · connection interrupted');
          return snapshot;
        }
        try {
          const cached = await loadCache();
          if (cached) {
            snapshot = cached;
            setStatus('cached', 'Using saved data · connection interrupted');
            return snapshot;
          }
        } catch (_) { /* do not display corrupt cache */ }
        setStatus('unavailable', 'Data temporarily unavailable');
        throw err;
      }
    })().finally(() => { pending = null; });
    return pending;
  }
  function subscribe(fn) {
    if (typeof fn !== 'function') throw new TypeError('A callback is required');
    subscribers.add(fn);
    fn({ snapshot, status: { ...status } });
    return () => subscribers.delete(fn);
  }
  function league(key) { return snapshot && snapshot.leagues[key] || null; }
  function findDriver(id, key) {
    const needle = String(id || '').trim();
    if (!needle) return null;
    const leagues = key ? [key] : ['sunday', 'monday'];
    for (const lk of leagues) {
      const row = (league(lk)?.drivers || []).find(d =>
        [d.driverId, d.iracingId, d.discordId, d.id].some(v => v != null && String(v) === needle));
      if (row) return row;
    }
    return null;
  }
  global.HLRNData = Object.freeze({ load, refresh: load, subscribe, league, findDriver, get: () => snapshot, getStatus: () => ({ ...status }), url: DATA_URL });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notify, { once: true });
  else notify();
  // Refresh only while a page is visible. Existing page code remains untouched until migrated.
  setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 5 * 60 * 1000);
})(window);
