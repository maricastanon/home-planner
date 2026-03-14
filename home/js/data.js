// ============================================================
// data.js — Unser neues Zuhause · Data layer (localStorage)
// ============================================================

function ld(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function sv(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch (e) { console.warn('Storage error:', e); return false; }
}

// ---- SETTINGS ----
function ldSettings() { return Object.assign({}, DEFAULT_SETTINGS, ld(K.settings, {})); }
function svSettings(s) { sv(K.settings, s); }

// ---- PLAN ----
function ldPlan() {
  return ld(K.plan, { floors: [{ id: 'f1', name: 'EG', rooms: [], furniture: [] }], scale: 30 });
}
function svPlan(p) { sv(K.plan, p); }

// ---- MOVING COMPANIES ----
function ldMove() { return ld(K.move, []); }
function svMove(d) { sv(K.move, d); }
function addMove(c)  { const d=ldMove(); d.push(c); svMove(d); logActivity('move','add',c.name); }
function updMove(c)  { const d=ldMove(),i=d.findIndex(x=>x.id===c.id); if(i>=0){d[i]=c;svMove(d);} }
function delMove(id) { const d=ldMove().filter(c=>c.id!==id); svMove(d); }
function getMove(id) { return ldMove().find(c=>c.id===id); }

// ---- TAKE LIST ----
function ldTake() { return ld(K.take, []); }
function svTake(d) { sv(K.take, d); }
function addTake(it)  { const d=ldTake(); d.push(it); svTake(d); logActivity('take','add',it.name); }
function updTake(it)  { const d=ldTake(),i=d.findIndex(x=>x.id===it.id); if(i>=0){d[i]=it;svTake(d);} }
function delTake(id)  { svTake(ldTake().filter(x=>x.id!==id)); }
function getTake(id)  { return ldTake().find(x=>x.id===id); }

// ---- BOXES ----
function ldBoxes() { return ld(K.boxes, []); }
function svBoxes(d) { sv(K.boxes, d); }
function addBox(b)   { const d=ldBoxes(); d.push(b); svBoxes(d); }
function updBox(b)   { const d=ldBoxes(),i=d.findIndex(x=>x.id===b.id); if(i>=0){d[i]=b;svBoxes(d);} }
function delBox(id)  { svBoxes(ldBoxes().filter(x=>x.id!==id)); }

// ---- SELL ----
function ldSell() { return ld(K.sell, []); }
function svSell(d) { sv(K.sell, d); }
function addSell(it)  { const d=ldSell(); d.push(it); svSell(d); logActivity('sell','add',it.name); }
function updSell(it)  { const d=ldSell(),i=d.findIndex(x=>x.id===it.id); if(i>=0){d[i]=it;svSell(d);} }
function delSell(id)  { svSell(ldSell().filter(x=>x.id!==id)); }
function getSell(id)  { return ldSell().find(x=>x.id===id); }

// ---- BUY ----
function ldBuy() { return ld(K.buy, []); }
function svBuy(d) { sv(K.buy, d); }
function addBuy(it)  { const d=ldBuy(); d.push(it); svBuy(d); logActivity('buy','add',it.name); }
function updBuy(it)  { const d=ldBuy(),i=d.findIndex(x=>x.id===it.id); if(i>=0){d[i]=it;svBuy(d);} }
function delBuy(id)  { svBuy(ldBuy().filter(x=>x.id!==id)); }
function getBuy(id)  { return ldBuy().find(x=>x.id===id); }

// ---- COMPARE ----
function ldCmp() { return ld(K.compare, []); }
function svCmp(d) { sv(K.compare, d); }
function addCmp(it)  { const d=ldCmp(); d.push(it); svCmp(d); logActivity('compare','add',it.name); }
function updCmp(it)  { const d=ldCmp(),i=d.findIndex(x=>x.id===it.id); if(i>=0){d[i]=it;svCmp(d);} }
function delCmp(id)  { svCmp(ldCmp().filter(x=>x.id!==id)); }
function getCmp(id)  { return ldCmp().find(x=>x.id===id); }

// ---- ACTIVITY LOG ----
function logActivity(module, action, label) {
  const log = ld(K.activity, []);
  log.unshift({ id: uid(), module, action, label, ts: Date.now() });
  sv(K.activity, log.slice(0, 100)); // keep last 100
}
function ldActivity() { return ld(K.activity, []); }

// ---- EXPORT / IMPORT ----
function exportAll() {
  const data = {};
  Object.entries(K).forEach(([name, key]) => {
    const val = localStorage.getItem(key);
    if (val) data[name] = JSON.parse(val);
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hnz_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  toast('Backup exportiert! 💾', 'green');
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      Object.entries(K).forEach(([name, key]) => {
        if (data[name] !== undefined) sv(key, data[name]);
      });
      toast('Daten importiert! ✅', 'green');
      setTimeout(() => location.reload(), 800);
    } catch {
      toast('Fehler beim Importieren', 'red');
    }
  };
  reader.readAsText(file);
}

// ---- STATS HELPERS ----
function getBudgetStats() {
  const settings = ldSettings();
  const maxBudget = settings.maxBudget || 3000;
  const buyItems = ldBuy();
  const estimated = buyItems.reduce((s, it) => s + (it.bought ? (it.actualPrice || it.price) : (it.price || 0)), 0);
  const spent = buyItems.filter(it => it.bought).reduce((s, it) => s + (it.actualPrice || it.price || 0), 0);
  return { maxBudget, estimated, spent, remaining: maxBudget - estimated, pct: Math.min(100, Math.round(estimated / maxBudget * 100)) };
}

function getSellStats() {
  const items = ldSell();
  const sold = items.filter(it => it.status === 'sold');
  const earned = sold.reduce((s, it) => s + (it.soldPrice || 0), 0);
  const potential = items.filter(it => it.status === 'active' || it.status === 'reserved').reduce((s, it) => s + (it.price || 0), 0);
  return { total: items.length, sold: sold.length, earned, potential };
}

function getPackingStats() {
  const items = ldTake();
  const packed = items.filter(it => it.done).length;
  return { total: items.length, packed, pct: items.length ? Math.round(packed / items.length * 100) : 0 };
}

function getMoveStats() {
  const companies = ldMove();
  const booked = companies.find(c => c.status === 'gebucht');
  return { total: companies.length, booked: booked || null };
}

function getCountdown() {
  const { moveDate } = ldSettings();
  if (!moveDate) return null;
  const diff = new Date(moveDate) - new Date();
  if (diff < 0) return { days: 0, past: true };
  return { days: Math.ceil(diff / 86400000), past: false };
}
