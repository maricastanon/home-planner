// ============================================================
// data.js — Our New Home · Data layer
// AWS_READY: All methods have DynamoDB/S3 equivalents commented
// ============================================================

// ── Local storage primitives ─────────────────────────────────
let _storageFull = false;

function getStorageScope() {
  return typeof window !== 'undefined' && window.HomeAuth && typeof window.HomeAuth.getStorageScope === 'function'
    ? window.HomeAuth.getStorageScope()
    : '';
}
function resolveScopedKey(key) {
  const scope = getStorageScope();
  return scope ? `${key}::${scope}` : key;
}
function readStoredValue(key, fb) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fb;
  } catch {
    return fb;
  }
}
function migrateLegacyValue(key, scopedKey) {
  if (scopedKey === key || localStorage.getItem(scopedKey) != null) return null;
  const raw = localStorage.getItem(key);
  if (raw == null) return null;
  try {
    localStorage.setItem(scopedKey, raw);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ld(key, fb) {
  const scopedKey = resolveScopedKey(key);
  const migrated = migrateLegacyValue(key, scopedKey);
  if (migrated != null) return migrated;
  return readStoredValue(scopedKey, fb);
}
function sv(key, val) {
  const scopedKey = resolveScopedKey(key);
  try {
    localStorage.setItem(scopedKey, JSON.stringify(val));
    _storageFull = false;
    if (key !== K.activity && window.HomeAws && typeof window.HomeAws.queueDataSync === 'function') {
      window.HomeAws.queueDataSync({
        kind: 'state',
        module: key,
        scopedKey,
        storageScope: getStorageScope() || 'legacy',
        updatedAt: Date.now(),
      });
    }
    return true;
  } catch(e) {
    const isQuota = e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22;
    if (isQuota) {
      _storageFull = true;
      if (typeof toast === 'function') toast('Storage full! Delete some photos to free up space 🗑️', 'red', 8000);
    }
    console.warn('Storage write failed:', e);
    return false;
  }
}

// ── Settings ─────────────────────────────────────────────────
function ldSettings()  { return Object.assign({}, DEFAULT_SETTINGS, ld(K.settings, {})); }
function svSettings(s) { return sv(K.settings, s); }

// ── Floor plan ───────────────────────────────────────────────
function ldPlan() { return ld(K.plan, null); }
function svPlan(p) { return sv(K.plan, p); }

function activityLabel(entity, fallback = 'item') {
  return entity?.name || entity?.title || entity?.label || fallback;
}

// ── Moving companies ─────────────────────────────────────────
function ldMove()        { return ld(K.move, []); }
function svMove(d)       { return sv(K.move, d); }
function addMoveItem(c)  { const d=ldMove(); d.push(c); if (svMove(d)) logActivity('move','add',activityLabel(c,'moving company')); }
function updMoveItem(c)  { const d=ldMove(),i=d.findIndex(x=>x.id===c.id); if(i>=0){d[i]=c;if (svMove(d)) logActivity('move','update',activityLabel(c,'moving company'));} }
function delMoveItem(id) { const item=getMoveItem(id); if (svMove(ldMove().filter(c=>c.id!==id)) && item) logActivity('move','delete',activityLabel(item,'moving company')); }
function getMoveItem(id) { return ldMove().find(c=>c.id===id); }

// ── Take / packing list ──────────────────────────────────────
function ldTake()       { return ld(K.take, []); }
function svTake(d)      { return sv(K.take, d); }
function addTakeItem(i) { const d=ldTake(); d.push(i); if (svTake(d)) logActivity('take','add',activityLabel(i,'packing item')); }
function updTakeItem(i) { const d=ldTake(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if (svTake(d)) logActivity('take','update',activityLabel(i,'packing item'));} }
function delTakeItem(id){ const item=getTakeItem(id); if (svTake(ldTake().filter(x=>x.id!==id)) && item) logActivity('take','delete',activityLabel(item,'packing item')); }
function getTakeItem(id){ return ldTake().find(x=>x.id===id); }
function ldBoxes()      { return ld(K.boxes, []); }
function svBoxes(d)     { return sv(K.boxes, d); }

// ── Sell items ───────────────────────────────────────────────
function ldSell()       { return ld(K.sell, []); }
function svSell(d)      { return sv(K.sell, d); }
function addSellItem(i) {
  const d=ldSell();
  d.push(i);
  const ok = svSell(d);
  if (ok) logActivity('sell','add',activityLabel(i,'sell item'));
  return ok;
}
function updSellItem(i) { const d=ldSell(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if (svSell(d)) logActivity('sell','update',activityLabel(i,'sell item'));} }
function delSellItem(id){ const item=getSellItem(id); if (svSell(ldSell().filter(x=>x.id!==id)) && item) logActivity('sell','delete',activityLabel(item,'sell item')); }
function getSellItem(id){ return ldSell().find(x=>x.id===id); }

// ── Buy / wish items ─────────────────────────────────────────
function ldBuy()       { return ld(K.buy, []); }
function svBuy(d)      { return sv(K.buy, d); }
function addBuyItem(i) { const d=ldBuy(); d.push(i); if (svBuy(d)) logActivity('buy','add',activityLabel(i,'buy item')); }
function updBuyItem(i) { const d=ldBuy(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if (svBuy(d)) logActivity('buy','update',activityLabel(i,'buy item'));} }
function delBuyItem(id){ const item=getBuyItem(id); if (svBuy(ldBuy().filter(x=>x.id!==id)) && item) logActivity('buy','delete',activityLabel(item,'buy item')); }
function getBuyItem(id){ return ldBuy().find(x=>x.id===id); }

// ── Compare ──────────────────────────────────────────────────
function ldCmp()       { return ld(K.compare, []); }
function svCmp(d)      { return sv(K.compare, d); }
function addCmpItem(i) { const d=ldCmp(); d.push(i); if (svCmp(d)) logActivity('compare','add',activityLabel(i,'comparison item')); }
function updCmpItem(i) { const d=ldCmp(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if (svCmp(d)) logActivity('compare','update',activityLabel(i,'comparison item'));} }
function delCmpItem(id){ const item=getCmpItem(id); if (svCmp(ldCmp().filter(x=>x.id!==id)) && item) logActivity('compare','delete',activityLabel(item,'comparison item')); }
function getCmpItem(id){ return ldCmp().find(x=>x.id===id); }

// ── Activity log ─────────────────────────────────────────────
function logActivity(module, action, label) {
  const log = ld(K.activity, []);
  const entry = { id: uid(), module, action, label, ts: Date.now() };
  log.unshift(entry);
  sv(K.activity, log.slice(0, 150));
  if (window.HomeAws && typeof window.HomeAws.queueActivity === 'function') {
    window.HomeAws.queueActivity({
      ...entry,
      storageScope: getStorageScope() || 'legacy',
      app: APP_NAME,
      version: APP_VERSION,
    });
  }
}
function ldActivity() { return ld(K.activity, []); }

// ── Photo handling ───────────────────────────────────────────
// AWS_HOOK: Replace these with Amplify Storage calls
// import { uploadData, getUrl } from 'aws-amplify/storage';
//
// async function uploadPhotoToS3(file, itemId) {
//   const key = `items/${itemId}/${Date.now()}_${file.name}`;
//   await uploadData({ key, data: file });
//   const { url } = await getUrl({ key });
//   return url.toString();
// }

function readPhotoAsDataURL(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function attachPhotos(itemId, files, module = 'buy') {
  if (_storageFull) {
    if (typeof toast === 'function') toast('Storage full — delete photos to free up space 🗑️', 'red', 6000);
    return false;
  }
  const loaders = { buy: { ld: ldBuy, sv: svBuy, get: getBuyItem }, sell: { ld: ldSell, sv: svSell, get: getSellItem } };
  const L = loaders[module]; if (!L) return false;
  const item = L.get(itemId); if (!item) return false;
  for (const file of files) {
    // AWS_HOOK: const url = await uploadPhotoToS3(file, itemId);
    const url = await readPhotoAsDataURL(file);
    item.photos = [...(item.photos || []), url];
  }
  const d = L.ld(); const idx = d.findIndex(x => x.id === itemId);
  if (idx >= 0) { d[idx] = item; L.sv(d); }
  return !_storageFull;
}

// ── Stats helpers ─────────────────────────────────────────────
function getBudgetStats() {
  const s = ldSettings();
  const max = s.maxBudget || 5000;
  const items = ldBuy();
  const est   = items.reduce((t,i) => t + (i.bought ? (i.actualPrice||i.price||0) : (i.price||0)), 0);
  const spent = items.filter(i=>i.bought).reduce((t,i) => t + (i.actualPrice||i.price||0), 0);
  return { max, est, spent, remaining: max - est, pct: Math.min(100, Math.round(est/max*100)) };
}

function getSellStats() {
  const items = ldSell();
  const sold  = items.filter(i => i.status === 'sold');
  return {
    total:     items.length,
    sold:      sold.length,
    active:    items.filter(i => i.status === 'active').length,
    earned:    sold.reduce((t,i) => t+(i.soldPrice||0), 0),
    potential: items.filter(i => i.status==='active'||i.status==='reserved').reduce((t,i) => t+(i.price||0), 0),
  };
}

function getPackingStats() {
  const items = ldTake();
  const packed = items.filter(i => i.done).length;
  return { total: items.length, packed, pct: items.length ? Math.round(packed/items.length*100) : 0 };
}

function getCountdown() {
  const { moveDate } = ldSettings();
  if (!moveDate) return null;
  const diff = new Date(moveDate) - Date.now();
  return { days: Math.ceil(diff/86400000), past: diff < 0 };
}

function getBudgetByRoom() {
  const items = ldBuy();
  const map = {};
  items.forEach(i => {
    const r = i.roomId || 'other';
    if (!map[r]) map[r] = { est: 0, spent: 0, count: 0 };
    map[r].est   += i.price || 0;
    map[r].spent += i.bought ? (i.actualPrice || i.price || 0) : 0;
    map[r].count++;
  });
  return map;
}

// ── Export / import ──────────────────────────────────────────
function exportAll() {
  const data = {
    _meta: {
      version: APP_VERSION,
      exportedAt: Date.now(),
      storageScope: getStorageScope() || 'legacy',
    }
  };
  Object.entries(K).forEach(([name, key]) => {
    const v = ld(key, null);
    if (v != null) data[name] = v;
  });
  downloadText(JSON.stringify(data, null, 2), 'our_home_backup_' + todayISO() + '.json', 'application/json');
  toast('Backup exported 💾', 'green');
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      Object.entries(K).forEach(([name, key]) => {
        if (Object.prototype.hasOwnProperty.call(data, name)) sv(key, data[name]);
      });
      toast('Data imported ✅', 'green');
      setTimeout(() => location.reload(), 800);
    } catch { toast('Import error', 'red'); }
  };
  reader.readAsText(file);
}
