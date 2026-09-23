/* Optional adapter for the existing /live/ page. DO NOT run alongside its current socket
   until its old WebSocket is replaced. Cached live telemetry is always labeled OLD. */
(function (global) {
  'use strict';
  function connect({ url, onSnapshot, onStatus }) {
    if (!url || typeof onSnapshot !== 'function') throw new Error('URL and onSnapshot required');
    const cacheKey = 'hlrn-last-live-snapshot-v1';
    let ws, timer, attempts = 0, stopped = false, lastSeen = 0;
    function status(state, message) { if (typeof onStatus === 'function') onStatus({ state, message, lastSeen }); }
    function restore() {
      try {
        const old = JSON.parse(localStorage.getItem(cacheKey));
        if (old && old.data && old.savedAt) {
          lastSeen = old.savedAt;
          onSnapshot(old.data, { cached: true, savedAt: lastSeen });
          status('cached', 'Last saved timing · not live');
        }
      } catch (_) {}
    }
    function open() {
      if (stopped) return;
      status('connecting', 'Connecting to iRacing feed');
      ws = new WebSocket(url);
      ws.onopen = () => { attempts = 0; status('connected', 'Connected · waiting for telemetry'); };
      ws.onmessage = e => {
        let msg;
        try { msg = JSON.parse(e.data); } catch (_) { return; }
        const state = msg && msg.data && typeof msg.data === 'object' ? msg.data : msg;
        if (!state || typeof state !== 'object' || !('lap' in state || 'drivers' in state || 'track' in state)) return;
        lastSeen = Date.now();
        try { localStorage.setItem(cacheKey, JSON.stringify({ savedAt: lastSeen, data: state })); } catch (_) {}
        onSnapshot(state, { cached: false, savedAt: lastSeen });
        status('live', 'Live telemetry');
      };
      ws.onerror = () => { /* onclose performs reconnection */ };
      ws.onclose = () => {
        if (stopped) return;
        status(lastSeen ? 'cached' : 'offline', lastSeen ? 'Feed disconnected · showing last saved timing' : 'Feed disconnected');
        const delay = Math.min(30000, 1500 * Math.pow(2, attempts++));
        timer = setTimeout(open, delay);
      };
    }
    restore(); open();
    return { stop() { stopped = true; clearTimeout(timer); if (ws) ws.close(); } };
  }
  global.HLRNLiveResilience = Object.freeze({ connect });
})(window);
