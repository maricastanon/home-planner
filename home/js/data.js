// ============================================================
// data.js — Our New Home · Data layer
// AWS_READY: All methods have DynamoDB/S3 equivalents commented
// ============================================================

// ── Local storage primitives ─────────────────────────────────
let _storageFull = false;

function ld(key, fb) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; }
  catch { return fb; }
}
function sv(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    _storageFull = false;
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
function svSettings(s) { sv(K.settings, s); }

// ── Floor plan ───────────────────────────────────────────────
function ldPlan() { return ld(K.plan, null); }
function svPlan(p) { sv(K.plan, p); }

// ── Moving companies ─────────────────────────────────────────
function ldMove()        { return ld(K.move, []); }
function svMove(d)       { sv(K.move, d); }
function addMoveItem(c)  { const d=ldMove(); d.push(c); svMove(d); logActivity('move','add',c.name); }
function updMoveItem(c)  { const d=ldMove(),i=d.findIndex(x=>x.id===c.id); if(i>=0){d[i]=c;svMove(d);} }
function delMoveItem(id) { svMove(ldMove().filter(c=>c.id!==id)); }
function getMoveItem(id) { return ldMove().find(c=>c.id===id); }

// ── Take / packing list ──────────────────────────────────────
function ldTake()       { return ld(K.take, []); }
function svTake(d)      { sv(K.take, d); }
function addTakeItem(i) { const d=ldTake(); d.push(i); svTake(d); logActivity('take','add',i.name); }
function updTakeItem(i) { const d=ldTake(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;svTake(d);} }
function delTakeItem(id){ svTake(ldTake().filter(x=>x.id!==id)); }
function getTakeItem(id){ return ldTake().find(x=>x.id===id); }
function ldBoxes()      { return ld(K.boxes, []); }
function svBoxes(d)     { sv(K.boxes, d); }

// ── Sell items ───────────────────────────────────────────────
function ldSell()       { return ld(K.sell, []); }
function svSell(d)      { sv(K.sell, d); }
function addSellItem(i) { const d=ldSell(); d.push(i); svSell(d); logActivity('sell','add',i.name); }
function updSellItem(i) { const d=ldSell(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;svSell(d);} }
function delSellItem(id){ svSell(ldSell().filter(x=>x.id!==id)); }
function getSellItem(id){ return ldSell().find(x=>x.id===id); }

// ── Buy / wish items ─────────────────────────────────────────
function ldBuy()       { return ld(K.buy, []); }
function svBuy(d)      { sv(K.buy, d); }
function addBuyItem(i) { const d=ldBuy(); d.push(i); svBuy(d); logActivity('buy','add',i.name); }
function updBuyItem(i) { const d=ldBuy(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;svBuy(d);} }
function delBuyItem(id){ svBuy(ldBuy().filter(x=>x.id!==id)); }
function getBuyItem(id){ return ldBuy().find(x=>x.id===id); }

// ── Compare ──────────────────────────────────────────────────
function ldCmp()       { return ld(K.compare, []); }
function svCmp(d)      { sv(K.compare, d); }
function addCmpItem(i) { const d=ldCmp(); d.push(i); svCmp(d); logActivity('compare','add',i.name); }
function updCmpItem(i) { const d=ldCmp(),idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;svCmp(d);} }
function delCmpItem(id){ svCmp(ldCmp().filter(x=>x.id!==id)); }
function getCmpItem(id){ return ldCmp().find(x=>x.id===id); }

// ── Activity log ─────────────────────────────────────────────
function logActivity(module, action, label) {
  const log = ld(K.activity, []);
  log.unshift({ id: uid(), module, action, label, ts: Date.now() });
  sv(K.activity, log.slice(0, 150));
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
  const data = {};
  Object.entries(K).forEach(([name, key]) => {
    const v = localStorage.getItem(key);
    if (v) data[name] = JSON.parse(v);
  });
  downloadText(JSON.stringify(data, null, 2), 'our_home_backup_' + todayISO() + '.json', 'application/json');
  toast('Backup exported 💾', 'green');
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      Object.entries(K).forEach(([name, key]) => { if (data[name]) sv(key, data[name]); });
      toast('Data imported ✅', 'green');
      setTimeout(() => location.reload(), 800);
    } catch { toast('Import error', 'red'); }
  };
  reader.readAsText(file);
}
