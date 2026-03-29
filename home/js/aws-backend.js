// ============================================================
// aws-backend.js - Our New Home · AWS bridge for Cognito APIs
// ============================================================

window.HomeAws = (function createHomeAws() {
  const QUEUE_KEYS = Object.freeze({
    activity: 'hnz_activity_queue',
    data: 'hnz_data_sync_queue',
  });
  let flushTimer = null;

  function getScope() {
    return window.HomeAuth && typeof window.HomeAuth.getStorageScope === 'function'
      ? window.HomeAuth.getStorageScope()
      : '';
  }

  function resolveQueueKey(baseKey) {
    const scope = getScope();
    return scope ? `${baseKey}::${scope}` : baseKey;
  }

  function safeRead(baseKey, fallback) {
    try {
      const raw = localStorage.getItem(resolveQueueKey(baseKey));
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeWrite(baseKey, value) {
    try {
      localStorage.setItem(resolveQueueKey(baseKey), JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('AWS queue write failed:', err);
      return false;
    }
  }

  function readScopedPayload(scopedKey) {
    try {
      const raw = localStorage.getItem(scopedKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getAuthTokens() {
    return window.HomeAuth && typeof window.HomeAuth.getSessionTokens === 'function'
      ? window.HomeAuth.getSessionTokens()
      : { accessToken: '', idToken: '' };
  }

  function getUser() {
    return window.HomeAuth && typeof window.HomeAuth.getUser === 'function'
      ? window.HomeAuth.getUser()
      : null;
  }

  function isAuthenticated() {
    return window.HomeAuth && typeof window.HomeAuth.isAuthenticated === 'function'
      ? window.HomeAuth.isAuthenticated()
      : false;
  }

  function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const tokens = getAuthTokens();
    if (tokens.idToken) headers.Authorization = `Bearer ${tokens.idToken}`;
    if (tokens.accessToken) headers['X-Home-Access-Token'] = tokens.accessToken;
    const user = getUser();
    if (user?.sub) headers['X-Home-User-Sub'] = user.sub;
    return headers;
  }

  async function postJson(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  async function flushActivityQueue() {
    const cfg = typeof getAwsBackendConfig === 'function' ? getAwsBackendConfig() : null;
    if (!cfg?.activityApiUrl || !navigator.onLine || !isAuthenticated()) return { skipped: true };
    const queue = safeRead(QUEUE_KEYS.activity, []);
    if (!queue.length) return { skipped: true, reason: 'empty' };
    const remaining = [];
    for (const entry of queue) {
      try {
        await postJson(cfg.activityApiUrl, entry);
      } catch (err) {
        console.warn('Activity sync failed:', err);
        remaining.push(entry);
      }
    }
    safeWrite(QUEUE_KEYS.activity, remaining);
    return { flushed: queue.length - remaining.length, pending: remaining.length };
  }

  async function flushDataQueue() {
    const cfg = typeof getAwsBackendConfig === 'function' ? getAwsBackendConfig() : null;
    if (!cfg?.dataSyncUrl || !navigator.onLine || !isAuthenticated()) return { skipped: true };
    const queue = safeRead(QUEUE_KEYS.data, []);
    if (!queue.length) return { skipped: true, reason: 'empty' };
    const remaining = [];
    for (const entry of queue) {
      try {
        await postJson(cfg.dataSyncUrl, {
          ...entry,
          payload: readScopedPayload(entry.scopedKey),
        });
      } catch (err) {
        console.warn('State sync failed:', err);
        remaining.push(entry);
      }
    }
    safeWrite(QUEUE_KEYS.data, remaining);
    return { flushed: queue.length - remaining.length, pending: remaining.length };
  }

  async function flushAll() {
    return Promise.allSettled([flushActivityQueue(), flushDataQueue()]);
  }

  function scheduleFlush() {
    if (flushTimer) window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      flushAll();
    }, 350);
  }

  function queueActivity(entry) {
    const queue = safeRead(QUEUE_KEYS.activity, []);
    queue.push(entry);
    safeWrite(QUEUE_KEYS.activity, queue.slice(-100));
    scheduleFlush();
  }

  function queueDataSync(entry) {
    const queue = safeRead(QUEUE_KEYS.data, []);
    const idx = queue.findIndex(item => item.scopedKey === entry.scopedKey);
    if (idx >= 0) queue[idx] = entry;
    else queue.push(entry);
    safeWrite(QUEUE_KEYS.data, queue.slice(-50));
    scheduleFlush();
  }

  function init() {
    window.addEventListener('online', () => flushAll());
  }

  return {
    init,
    flushAll,
    queueActivity,
    queueDataSync,
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.HomeAws.init(), { once: true });
} else {
  window.HomeAws.init();
}
