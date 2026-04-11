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
function resolveScopedKeyForScope(key, scope = '') {
  return scope ? `${key}::${scope}` : key;
}
function resolveScopedKey(key) {
  return resolveScopedKeyForScope(key, getStorageScope());
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
function getStateMetaStorageKey(scopedKey) {
  return `${scopedKey}::__meta`;
}
function readStateUpdatedAt(scopedKey) {
  try {
    const raw = localStorage.getItem(getStateMetaStorageKey(scopedKey));
    if (!raw) return 0;
    const meta = JSON.parse(raw);
    return Number(meta?.updatedAt || 0);
  } catch {
    return 0;
  }
}
function writeStateMeta(scopedKey, updatedAt = Date.now()) {
  try {
    localStorage.setItem(getStateMetaStorageKey(scopedKey), JSON.stringify({ updatedAt: Number(updatedAt) || Date.now() }));
    return true;
  } catch {
    return false;
  }
}

function ld(key, fb) {
  const scopedKey = resolveScopedKey(key);
  const migrated = migrateLegacyValue(key, scopedKey);
  if (migrated != null) return migrated;
  return readStoredValue(scopedKey, fb);
}
function svForScope(key, val, scope = getStorageScope(), options = {}) {
  const scopedKey = resolveScopedKeyForScope(key, scope);
  const updatedAt = Number(options.updatedAt) || Date.now();
  try {
    localStorage.setItem(scopedKey, JSON.stringify(val));
    writeStateMeta(scopedKey, updatedAt);
    _storageFull = false;
    if (key !== K.activity && window.HomeAws && typeof window.HomeAws.queueDataSync === 'function') {
      window.HomeAws.queueDataSync({
        kind: 'state',
        module: key,
        scopedKey,
        storageScope: scope || 'legacy',
        updatedAt,
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
function sv(key, val, options = {}) {
  return svForScope(key, val, getStorageScope(), options);
}
function captureStorageScope(scope = getStorageScope()) {
  const snapshot = {};
  Object.values(K).forEach(key => {
    const scopedKey = resolveScopedKeyForScope(key, scope);
    if (localStorage.getItem(scopedKey) == null) return;
    snapshot[key] = {
      value: readStoredValue(scopedKey, null),
      updatedAt: readStateUpdatedAt(scopedKey),
    };
  });
  return snapshot;
}
function storageScopeHasData(scope = getStorageScope()) {
  return Object.values(K).some(key => localStorage.getItem(resolveScopedKeyForScope(key, scope)) != null);
}
function seedStorageScope(scope, snapshot = {}) {
  let restored = 0;
  Object.entries(snapshot).forEach(([key, entry]) => {
    if (!entry) return;
    if (svForScope(key, entry.value, scope, { updatedAt: entry.updatedAt || Date.now() })) restored += 1;
  });
  return restored;
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

// ── Scenario planner ─────────────────────────────────────────
function ldScenario()  { return Object.assign({ compareChoices:{} }, ld(K.scenario, {})); }
function svScenario(s) { return sv(K.scenario, s); }

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
function readPhotoAsDataURL(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function compressPhoto(dataUrl, maxWidth = 800, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const PHOTO_MAX_SIZE = 2 * 1024 * 1024; // 2 MB per photo
const PHOTO_ALLOWED_TYPES = ['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'];

function validatePhotoFile(file) {
  if (!file) return 'No file selected.';
  if (!PHOTO_ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|gif|svg)$/i)) {
    return `"${file.name}" is not a supported image type. Use JPEG, PNG, WebP, or GIF.`;
  }
  if (file.size > PHOTO_MAX_SIZE) {
    return `"${file.name}" is too large (${(file.size/1024/1024).toFixed(1)} MB). Max is 2 MB.`;
  }
  return null;
}

async function attachPhotos(itemId, files, module = 'buy') {
  if (_storageFull) {
    if (typeof toast === 'function') toast('Storage full — delete photos to free up space 🗑️', 'red', 6000);
    return false;
  }
  const loaders = { buy: { ld: ldBuy, sv: svBuy, get: getBuyItem }, sell: { ld: ldSell, sv: svSell, get: getSellItem } };
  const L = loaders[module]; if (!L) return false;
  const item = L.get(itemId); if (!item) return false;
  let skipped = 0;
  for (const file of files) {
    const err = validatePhotoFile(file);
    if (err) { skipped++; if (typeof toast === 'function') toast(err, 'red', 5000); continue; }
    // AWS_HOOK: const url = await uploadPhotoToS3(file, itemId);
    const raw = await readPhotoAsDataURL(file);
    const url = await compressPhoto(raw);
    item.photos = [...(item.photos || []), url];
  }
  if (skipped && typeof toast === 'function' && skipped === files.length) return false;
  const d = L.ld(); const idx = d.findIndex(x => x.id === itemId);
  if (idx >= 0) { d[idx] = item; L.sv(d); }
  return !_storageFull;
}

// ── Stats helpers ─────────────────────────────────────────────
function getBudgetStats() {
  const s = ldSettings();
  const max = s.maxBudget || 5000;
  const items = ldBuy();
  const est   = items.reduce((t,i) => t + getItemBudgetValue(i), 0);
  const spent = items
    .filter(i => normalizeItemSource(i.source) !== 'existing' && i.bought)
    .reduce((t,i) => t + (i.actualPrice || i.price || 0), 0);
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
    map[r].est   += getItemBudgetValue(i);
    map[r].spent += normalizeItemSource(i.source) === 'existing'
      ? 0
      : (i.bought ? (i.actualPrice || i.price || 0) : 0);
    map[r].count++;
  });
  return map;
}

function getRoomDimsMeters(room) {
  const scale = ldPlan()?.scale || 45;
  if (!room) return { widthM: 0, depthM: 0, areaSqm: 0 };
  const widthM = Number(((room.w || 0) / scale).toFixed(2));
  const depthM = Number(((room.h || 0) / scale).toFixed(2));
  const areaSqm = Number((widthM * depthM).toFixed(2));
  return { widthM, depthM, areaSqm };
}

function getRoomRecord(roomId) {
  const plan = ldPlan();
  const floors = Array.isArray(plan?.floors) ? plan.floors : [];
  for (const floor of floors) {
    const room = (floor.rooms || []).find(entry => entry.id === roomId);
    if (room) return { room, floor };
  }
  return { room: null, floor: null };
}

function getBuyPlacementDimsCm(item) {
  const width = Number(item?.widthCm) || 0;
  const depth = Number(item?.depthCm) || 0;
  if (!width && !depth) return { widthCm: 0, depthCm: 0, heightCm: Number(item?.heightCm) || 0 };
  if (item?.planRotated) {
    return {
      widthCm: depth || width,
      depthCm: width || depth,
      heightCm: Number(item?.heightCm) || 0
    };
  }
  return {
    widthCm: width,
    depthCm: depth,
    heightCm: Number(item?.heightCm) || 0
  };
}

function getItemFootprintSqm(item) {
  const dims = getBuyPlacementDimsCm(item);
  if (!dims.widthCm || !dims.depthCm) return 0;
  return Number((((dims.widthCm / 100) * (dims.depthCm / 100))).toFixed(2));
}

function getPlannedItemCost(item) {
  if (normalizeMoveDecision(item?.source, item?.moveDecision) === 'skip') return 0;
  if (normalizeItemSource(item?.source) !== 'new') return 0;
  return item?.bought ? (item.actualPrice || item.price || 0) : (item.price || 0);
}

function getRoomFitReport(item, roomId = item?.roomId) {
  const { room, floor } = getRoomRecord(roomId);
  if (!room) {
    return {
      fits: false,
      hasRoom: false,
      reason: 'Assign this item to a room first.',
      room: null,
      floor: null,
      areaSqm: 0,
      freeSqm: 0,
      footprintSqm: getItemFootprintSqm(item),
      footprintPct: 0,
      widthSlackCm: 0,
      depthSlackCm: 0,
    };
  }
  const roomDims = getRoomDimsMeters(room);
  const dims = getBuyPlacementDimsCm(item);
  const footprintSqm = getItemFootprintSqm(item);
  const widthSlackCm = Math.round((roomDims.widthM * 100) - dims.widthCm);
  const depthSlackCm = Math.round((roomDims.depthM * 100) - dims.depthCm);
  const fitsBySides = (!dims.widthCm || widthSlackCm >= 0) && (!dims.depthCm || depthSlackCm >= 0);
  const freeSqm = Number(Math.max(roomDims.areaSqm - footprintSqm, 0).toFixed(2));
  const footprintPct = roomDims.areaSqm ? Math.round((footprintSqm / roomDims.areaSqm) * 100) : 0;
  return {
    fits: fitsBySides,
    hasRoom: true,
    reason: fitsBySides ? 'Fits inside the room dimensions.' : 'One side exceeds the room dimensions.',
    room,
    floor,
    areaSqm: roomDims.areaSqm,
    freeSqm,
    footprintSqm,
    footprintPct,
    widthSlackCm,
    depthSlackCm,
  };
}

function getOptionGroupKey(item) {
  return String(item?.optionGroup || '').trim();
}

function getBuyScenarioGroups(items = ldBuy()) {
  return items.reduce((groups, item) => {
    const key = getOptionGroupKey(item);
    if (!key) return groups;
    (groups[key] = groups[key] || []).push(item);
    return groups;
  }, {});
}

function chooseScenarioCandidate(groupItems, mode = 'selected') {
  if (!Array.isArray(groupItems) || !groupItems.length) return null;
  const selected = groupItems.find(item => item.scenarioPick);
  if (mode === 'selected' && selected) return selected;
  const ordered = [...groupItems].sort((a, b) => {
    if (mode === 'reuse-first') {
      const reuseA = normalizeItemSource(a.source) === 'existing' ? 1 : 0;
      const reuseB = normalizeItemSource(b.source) === 'existing' ? 1 : 0;
      if (reuseA !== reuseB) return reuseB - reuseA;
    }
    const costDiff = getPlannedItemCost(a) - getPlannedItemCost(b);
    if (mode === 'premium' && costDiff !== 0) return -costDiff;
    if (mode !== 'premium' && costDiff !== 0) return costDiff;
    const footprintDiff = getItemFootprintSqm(a) - getItemFootprintSqm(b);
    if (footprintDiff !== 0) return footprintDiff;
    return comparePreferenceScore(b) - comparePreferenceScore(a);
  });
  return ordered[0] || null;
}

function getBuyScenarioStats(items = ldBuy()) {
  const grouped = getBuyScenarioGroups(items);
  const groupedIds = new Set(Object.values(grouped).flat().map(item => item.id));
  const singles = items.filter(item => !groupedIds.has(item.id));
  const baseSinglesCost = singles.reduce((sum, item) => sum + getPlannedItemCost(item), 0);
  const selectedGroupItems = Object.values(grouped).map(group => chooseScenarioCandidate(group, 'selected')).filter(Boolean);
  const cheapestGroupItems = Object.values(grouped).map(group => chooseScenarioCandidate(group, 'cheapest')).filter(Boolean);
  const reuseFirstGroupItems = Object.values(grouped).map(group => chooseScenarioCandidate(group, 'reuse-first')).filter(Boolean);
  const premiumGroupItems = Object.values(grouped).map(group => chooseScenarioCandidate(group, 'premium')).filter(Boolean);
  const selectedTotal = baseSinglesCost + selectedGroupItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0);
  const cheapestTotal = baseSinglesCost + cheapestGroupItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0);
  const reuseFirstTotal = baseSinglesCost + reuseFirstGroupItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0);
  const premiumTotal = baseSinglesCost + premiumGroupItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0);
  const reusedItems = items.filter(item => normalizeItemSource(item.source) !== 'new');
  const reusedValue = reusedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  return {
    grouped,
    groupCount: Object.keys(grouped).length,
    selectedTotal,
    cheapestTotal,
    reuseFirstTotal,
    premiumTotal,
    selectedGroupItems,
    cheapestGroupItems,
    reuseFirstGroupItems,
    premiumGroupItems,
    reusedItems,
    reusedCount: reusedItems.length,
    reusedValue,
    baseSinglesCost,
  };
}

function getStoredRoomOccupancy(roomId) {
  const { room, floor } = getRoomRecord(roomId);
  if (!room || !floor) {
    return { areaSqm: 0, occupiedSqm: 0, freeSqm: 0, occupancyPct: 0, entries: [] };
  }
  const roomDims = getRoomDimsMeters(room);
  const entries = [];
  (floor.furniture || []).forEach(item => {
    const centerX = (item.x || 0) + ((item.w || 0) / 2);
    const centerY = (item.y || 0) + ((item.h || 0) / 2);
    const inside = centerX >= room.x && centerX <= room.x + room.w && centerY >= room.y && centerY <= room.y + room.h;
    if (!inside) return;
    const areaSqm = Number((((item.w || 0) / (ldPlan()?.scale || 45)) * ((item.h || 0) / (ldPlan()?.scale || 45))).toFixed(2));
    entries.push({ id: item.id, kind: 'furniture', label: item.label || item.type || 'Furniture', areaSqm });
  });
  ldBuy()
    .filter(item => item.placedInPlan && item.planFloor === floor.id && item.roomId === roomId)
    .forEach(item => {
      entries.push({
        id: item.id,
        kind: 'buy',
        label: item.name || 'Planned item',
        areaSqm: getItemFootprintSqm(item)
      });
    });
  const occupiedSqm = Number(entries.reduce((sum, item) => sum + (item.areaSqm || 0), 0).toFixed(2));
  const freeSqm = Number(Math.max(roomDims.areaSqm - occupiedSqm, 0).toFixed(2));
  const occupancyPct = roomDims.areaSqm ? Math.min(100, Math.round((occupiedSqm / roomDims.areaSqm) * 100)) : 0;
  return { areaSqm: roomDims.areaSqm, occupiedSqm, freeSqm, occupancyPct, entries };
}

function getRoomOptimization(roomId, items = ldBuy()) {
  const roomItems = items.filter(item => item.roomId === roomId);
  const optionGroups = {};
  roomItems
    .filter(item => getOptionGroupKey(item))
    .forEach(item => {
      const key = getOptionGroupKey(item);
      (optionGroups[key] = optionGroups[key] || []).push(item);
    });
  const requiredSingles = roomItems.filter(item => item.mustFitRoom && !getOptionGroupKey(item));
  const requiredGroups = Object.entries(optionGroups)
    .filter(([, groupItems]) => groupItems.some(item => item.mustFitRoom))
    .map(([group, groupItems]) => ({ group, items: groupItems }));

  const chosenGroups = requiredGroups.map(entry => {
    const ranked = [...entry.items].sort((a, b) => {
      const fitA = getRoomFitReport(a, roomId).fits ? 1 : 0;
      const fitB = getRoomFitReport(b, roomId).fits ? 1 : 0;
      if (fitA !== fitB) return fitB - fitA;
      const areaDiff = getItemFootprintSqm(a) - getItemFootprintSqm(b);
      if (areaDiff !== 0) return areaDiff;
      const priceDiff = getPlannedItemCost(a) - getPlannedItemCost(b);
      if (priceDiff !== 0) return priceDiff;
      return comparePreferenceScore(b) - comparePreferenceScore(a);
    });
    return {
      group: entry.group,
      chosen: ranked[0] || null,
      alternatives: ranked
    };
  });

  const chosenItems = [
    ...requiredSingles,
    ...chosenGroups.map(entry => entry.chosen).filter(Boolean)
  ];
  const totalFootprintSqm = Number(chosenItems.reduce((sum, item) => sum + getItemFootprintSqm(item), 0).toFixed(2));
  const totalCost = Number(chosenItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0).toFixed(2));
  const fitChecks = chosenItems.map(item => ({ item, fit: getRoomFitReport(item, roomId) }));
  const failingItems = fitChecks.filter(entry => !entry.fit.fits).map(entry => entry.item);
  const { room } = getRoomRecord(roomId);
  const roomAreaSqm = getRoomDimsMeters(room).areaSqm;
  const freeSqm = Number(Math.max(roomAreaSqm - totalFootprintSqm, 0).toFixed(2));
  return {
    roomId,
    room,
    requiredSingles,
    chosenGroups,
    chosenItems,
    totalFootprintSqm,
    totalCost,
    roomAreaSqm,
    freeSqm,
    fits: !failingItems.length && totalFootprintSqm <= roomAreaSqm,
    failingItems,
  };
}

// ── Move checklist (already in modules.js, kept there) ──────

// ── Timeline ────────────────────────────────────────────────
function ldTimeline()        { return ld(K.timeline, null); }
function svTimeline(d)       { return sv(K.timeline, d); }
function addTimelineItem(i)  { const d=ldTimeline()||[]; d.push(i); if(svTimeline(d)) logActivity('timeline','add',activityLabel(i,'timeline task')); }
function updTimelineItem(i)  { const d=ldTimeline()||[]; const idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if(svTimeline(d)) logActivity('timeline','update',activityLabel(i,'timeline task'));} }
function delTimelineItem(id) { const d=ldTimeline()||[]; const item=d.find(x=>x.id===id); if(svTimeline(d.filter(x=>x.id!==id))&&item) logActivity('timeline','delete',activityLabel(item,'timeline task')); }
function getTimelineItem(id) { return (ldTimeline()||[]).find(x=>x.id===id); }

// ── Walkthrough ─────────────────────────────────────────────
function ldWalk()  { return ld(K.walkthrough, null); }
function svWalk(d) { return sv(K.walkthrough, d); }

// ── Utilities ───────────────────────────────────────────────
function ldUtil()        { return ld(K.utilities, []); }
function svUtil(d)       { return sv(K.utilities, d); }
function addUtilItem(i)  { const d=ldUtil(); d.push(i); if(svUtil(d)) logActivity('utilities','add',activityLabel(i,'utility')); }
function updUtilItem(i)  { const d=ldUtil(); const idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if(svUtil(d)) logActivity('utilities','update',activityLabel(i,'utility'));} }
function delUtilItem(id) { const item=getUtilItem(id); if(svUtil(ldUtil().filter(x=>x.id!==id))&&item) logActivity('utilities','delete',activityLabel(item,'utility')); }
function getUtilItem(id) { return ldUtil().find(x=>x.id===id); }

// ── Keys ────────────────────────────────────────────────────
function ldKeys()        { return ld(K.keys, []); }
function svKeys(d)       { return sv(K.keys, d); }
function addKeyItem(i)   { const d=ldKeys(); d.push(i); if(svKeys(d)) logActivity('keys','add',activityLabel(i,'key')); }
function updKeyItem(i)   { const d=ldKeys(); const idx=d.findIndex(x=>x.id===i.id); if(idx>=0){d[idx]=i;if(svKeys(d)) logActivity('keys','update',activityLabel(i,'key'));} }
function delKeyItem(id)  { const item=getKeyItem(id); if(svKeys(ldKeys().filter(x=>x.id!==id))&&item) logActivity('keys','delete',activityLabel(item,'key')); }
function getKeyItem(id)  { return ldKeys().find(x=>x.id===id); }

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
