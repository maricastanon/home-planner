// ============================================================
// plan.js — Floor Plan · Preloaded rooms + item overlay
// ============================================================

let planState = { floors: [], scale: 45, activeFloor: 0 };
let planTool  = 'select';
let furnType  = 'sofa';
let selected  = null;
let dragging  = null;
let dragOff   = { x: 0, y: 0 };
let drawStart = null;
let drawCurrent = null;
let measureStart = null;
let measureCurrent = null;
let lastMeasurement = null;
let undoStack = [];
let redoStack = [];
let hoveredRoom = null;
let roomColorIdx = 0;
let lastSavedPlanSnapshot = '';
const PLAN_SCHEMA_VERSION = PRELOADED_PLAN?._planVersion || 1;
let planToolsTab = 'room';
const livePlanBuyDrafts = Object.create(null);
const blueprintImageCache = new Map();

const ROOM_COLORS_CYCLE = [
  '#dbeafe','#dcfce7','#fce7f3','#ffedd5','#ede9fe',
  '#ccfbf1','#fef9c3','#fee2e2','#e0f2fe','#f0fdf4'
];

// ── Init ────────────────────────────────────────────────────
function initPlan() {
  maybeInjectPreloaded();
  const saved = ldPlan();
  if (saved && saved.floors) {
    planState = { floors: saved.floors, scale: saved.scale || 45, activeFloor: saved.activeFloor || 0 };
  }
  undoStack = [];
  redoStack = [];
  lastSavedPlanSnapshot = getPlanHistorySnapshot();
  const canvas = document.getElementById('canvas-plan');
  if (canvas) { setupPlanListeners(canvas); resizePlanCanvas(); }
  syncFurnitureButtons();
  window.addEventListener('resize', resizePlanCanvas);
  // Preload blueprint images
  if (typeof BLUEPRINT_ASSET_FILES !== 'undefined') {
    Object.values(BLUEPRINT_ASSET_FILES).forEach(src => {
      const path = typeof buildBlueprintAssetPath === 'function' ? buildBlueprintAssetPath(src) : src;
      if (!blueprintImageCache.has(path)) {
        const img = new Image();
        img.onload = () => blueprintImageCache.set(path, img);
        img.src = path;
      }
    });
  }
}

function buildPlanPayload() {
  return {
    floors: planState.floors,
    scale: planState.scale,
    activeFloor: planState.activeFloor,
    _preloaded: true,
    _planVersion: PLAN_SCHEMA_VERSION
  };
}
function getPlanHistorySnapshot() {
  return JSON.stringify({
    floors: planState.floors,
    scale: planState.scale,
    activeFloor: planState.activeFloor
  });
}
function pushHistoryEntry(stack, snapshot) {
  if (!snapshot) return;
  stack.push(snapshot);
  if (stack.length > 30) stack.shift();
}
function restorePlanSnapshot(snapshot) {
  const next = JSON.parse(snapshot);
  const floors = Array.isArray(next.floors) ? next.floors : [];
  const maxFloorIdx = Math.max(0, floors.length - 1);
  planState = {
    floors,
    scale: next.scale || 45,
    activeFloor: Math.min(Math.max(next.activeFloor || 0, 0), maxFloorIdx)
  };
  selected = null;
  dragging = null;
  drawStart = null;
  drawCurrent = null;
  measureStart = null;
  measureCurrent = null;
  lastMeasurement = null;
  hoveredRoom = null;
}
function savePlan(options = {}) {
  const { recordHistory = true, clearRedo = recordHistory } = options;
  const snapshot = getPlanHistorySnapshot();
  const changed = lastSavedPlanSnapshot !== snapshot;

  if (recordHistory && changed && lastSavedPlanSnapshot) {
    pushHistoryEntry(undoStack, lastSavedPlanSnapshot);
    if (clearRedo) redoStack = [];
  }

  svPlan(buildPlanPayload());
  lastSavedPlanSnapshot = snapshot;
  if (typeof syncAllRoomSelects === 'function') syncAllRoomSelects();
  if (typeof window.updatePlanRoomItems === 'function') window.updatePlanRoomItems();

  return changed;
}
function undoPlan() {
  if (!undoStack.length) return;
  pushHistoryEntry(redoStack, getPlanHistorySnapshot());
  restorePlanSnapshot(undoStack.pop());
  savePlan({ recordHistory:false, clearRedo:false });
  renderFloorTabs(); renderPlan(); rPlanSidebar(); toast('Undone ↺','info');
}
function redoPlan() {
  if (!redoStack.length) return;
  pushHistoryEntry(undoStack, getPlanHistorySnapshot());
  restorePlanSnapshot(redoStack.pop());
  savePlan({ recordHistory:false, clearRedo:false });
  renderFloorTabs(); renderPlan(); rPlanSidebar(); toast('Redone ↻','info');
}
function getFloor() { return planState.floors[planState.activeFloor] || planState.floors[0]; }
function getFloorBlueprint(floor = getFloor()) {
  if (!floor) return null;
  if (!floor.blueprint) {
    floor.blueprint = { src:'', widthM:0, heightM:0, x:0, y:0, opacity:0.38, hidden:false, presetId:'', presetLabel:'' };
  }
  return floor.blueprint;
}
function hasFloorBlueprint(floor = getFloor()) {
  return Boolean(getFloorBlueprint(floor)?.src);
}
function getBlueprintBounds(floor = getFloor()) {
  const blueprint = getFloorBlueprint(floor);
  if (!blueprint?.src || blueprint.hidden || !blueprint.widthM || !blueprint.heightM) return null;
  return {
    x: blueprint.x || 0,
    y: blueprint.y || 0,
    w: blueprint.widthM * planState.scale,
    h: blueprint.heightM * planState.scale,
    opacity: Math.min(1, Math.max(0.05, Number(blueprint.opacity) || 0.38)),
    src: blueprint.src
  };
}
function getBlueprintImage(src) {
  if (!src) return null;
  if (blueprintImageCache.has(src)) return blueprintImageCache.get(src);
  const img = new Image();
  img.src = src;
  img.onload = () => renderPlan();
  blueprintImageCache.set(src, img);
  return img;
}
function getAvailableBlueprintPresets() {
  return typeof PRELOADED_BLUEPRINTS !== 'undefined' && Array.isArray(PRELOADED_BLUEPRINTS)
    ? PRELOADED_BLUEPRINTS
    : [];
}
function getBlueprintPreset(presetId) {
  return getAvailableBlueprintPresets().find(entry => entry.id === presetId) || null;
}
function ensureBlueprintPresetFloor(preset) {
  if (!preset?.floorId) return getFloor();
  const presetFloor = typeof window.getPreloadedFloorPreset === 'function'
    ? window.getPreloadedFloorPreset(preset.id)
    : null;
  let floorIndex = planState.floors.findIndex(entry => entry.id === preset.floorId);
  if (floorIndex < 0 && presetFloor) {
    planState.floors.push(presetFloor);
    floorIndex = planState.floors.length - 1;
  } else if (floorIndex >= 0 && presetFloor) {
    const targetFloor = planState.floors[floorIndex];
    if (!Array.isArray(targetFloor.rooms) || !targetFloor.rooms.length) {
      targetFloor.rooms = presetFloor.rooms || [];
      targetFloor.furniture = presetFloor.furniture || [];
    }
    if (presetFloor.storageNote && !targetFloor.storageNote) targetFloor.storageNote = presetFloor.storageNote;
    targetFloor.name = preset.floorName || targetFloor.name;
  }
  if (floorIndex >= 0) {
    planState.activeFloor = floorIndex;
    selected = null;
    hoveredRoom = null;
    renderFloorTabs();
  }
  return getFloor();
}
function applyBlueprintPresetConfig(config, options = {}) {
  const { notify = true } = options;
  if (!config?.src) return false;
  const blueprint = getFloorBlueprint();
  Object.assign(blueprint, {
    src: config.src,
    widthM: Number(config.widthM) || 0,
    heightM: Number(config.heightM) || 0,
    x: (Number(config.x) || 0) * planState.scale,
    y: (Number(config.y) || 0) * planState.scale,
    opacity: Math.min(1, Math.max(0.05, Number(config.opacity) || 0.38)),
    hidden: false,
    presetId: config.id || '',
    presetLabel: config.label || '',
    note: config.note || ''
  });
  savePlan();
  renderFloorTabs();
  renderPlan();
  rPlanSidebar();
  renderPlanToolsPanel();
  if (notify) toast(`${config.label || 'Blueprint preset'} loaded with seeded measurements.`, 'green', 3200);
  return true;
}
function loadPreloadedBlueprintPreset(presetId) {
  const preset = getBlueprintPreset(presetId);
  if (!preset) {
    toast('Blueprint preset not found', 'warn');
    return false;
  }
  ensureBlueprintPresetFloor(preset);
  const ok = applyBlueprintPresetConfig(preset);
  if (ok && typeof syncBlueprintModal === 'function') syncBlueprintModal();
  return ok;
}
function uploadPlanBlueprint(file) {
  importPlanBlueprint(file);
  const input = document.getElementById('plan-blueprint-input');
  if (input) input.value = '';
}
function openBlueprintModal() {
  planToolsTab = 'blueprint';
  renderPlanToolsPanel();
  if (typeof syncBlueprintModal === 'function') syncBlueprintModal();
  openModal('blueprint-modal');
}
function getLiveBuyDraft(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  return id ? livePlanBuyDrafts[id] || null : null;
}
function setLiveBuyDraft(itemOrId, patch) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  if (!id) return;
  livePlanBuyDrafts[id] = { ...(livePlanBuyDrafts[id] || {}), ...patch };
}
function clearLiveBuyDraft(itemOrId) {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
  if (id) delete livePlanBuyDrafts[id];
}
function persistLiveBuyDraft(itemId) {
  const draft = getLiveBuyDraft(itemId);
  if (!draft) return false;
  const item = getBuyItem(itemId);
  if (!item) return false;
  Object.assign(item, draft);
  clearLiveBuyDraft(itemId);
  updBuyItem(item);
  return true;
}
function getPlacedBuyItems(floor = getFloor()) {
  if (!floor) return [];
  return ldBuy().filter(it => it.placedInPlan && it.planFloor === floor.id);
}
function getPlacedBuyRect(item) {
  const draft = getLiveBuyDraft(item);
  const rotated = Boolean(draft?.planRotated ?? item.planRotated);
  const widthCm = rotated
    ? (item.depthCm || item.widthCm || 60)
    : (item.widthCm || item.depthCm || 60);
  const depthCm = rotated
    ? (item.widthCm || item.depthCm || 60)
    : (item.depthCm || item.widthCm || 60);
  return {
    x: draft?.planX ?? item.planX ?? 0,
    y: draft?.planY ?? item.planY ?? 0,
    w: (widthCm / 100) * planState.scale,
    h: (depthCm / 100) * planState.scale,
    rotated,
    widthCm,
    depthCm
  };
}
function getSelectedPlacedBuyItem() {
  return getPlacedBuyItems().find(it => it.id === selected) || null;
}
function getSelectedRoom() {
  return (getFloor()?.rooms || []).find(room => room.id === selected) || null;
}
function getSelectedPlanObject() {
  const room = getSelectedRoom();
  if (room) return { kind:'room', item:room, x:room.x, y:room.y, w:room.w, h:room.h };
  const furniture = getSelectedFurniture();
  if (furniture) return { kind:'furniture', item:furniture, x:furniture.x, y:furniture.y, w:furniture.w, h:furniture.h };
  const buyItem = getSelectedPlacedBuyItem();
  if (buyItem) return { kind:'buy', item:buyItem, ...getPlacedBuyRect(buyItem) };
  return null;
}
function buildHitEntry(kind, item, bounds = item) {
  return {
    kind,
    item,
    id: item.id,
    label: kind === 'buy' ? (item.name || item.label || item.type || 'Item') : (item.label || item.name || kind),
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h
  };
}
function getPlacedBuyHitEntries(floor = getFloor()) {
  return getPlacedBuyItems(floor).map(item => buildHitEntry('buy', item, getPlacedBuyRect(item)));
}
function setHitPosition(hit, x, y) {
  if (!hit) return;
  if (hit.kind === 'buy') {
    setLiveBuyDraft(hit.item, { planX:x, planY:y });
  } else {
    hit.item.x = x;
    hit.item.y = y;
  }
  hit.x = x;
  hit.y = y;
}
function getRoomForRect(rect, floor = getFloor()) {
  if (!rect || !floor?.rooms?.length) return null;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  return floor.rooms.find(room =>
    cx >= room.x && cx <= room.x + room.w &&
    cy >= room.y && cy <= room.y + room.h
  ) || null;
}
function getRoomOccupancy(roomId, floor = getFloor()) {
  const room = (floor?.rooms || []).find(entry => entry.id === roomId);
  if (!room) return null;
  const totalAreaM2 = (room.w / planState.scale) * (room.h / planState.scale);
  const furnitureEntries = (floor.furniture || []).map(item => ({
    kind:'furniture',
    item,
    x:item.x,
    y:item.y,
    w:item.w,
    h:item.h,
    areaM2:(item.w / planState.scale) * (item.h / planState.scale)
  }));
  const buyEntries = getPlacedBuyItems(floor).map(item => {
    const rect = getPlacedBuyRect(item);
    return {
      kind:'buy',
      item,
      ...rect,
      areaM2:(rect.w / planState.scale) * (rect.h / planState.scale)
    };
  });
  const items = [...furnitureEntries, ...buyEntries].filter(entry => getRoomForRect(entry, floor)?.id === roomId);
  const occupiedAreaM2 = items.reduce((sum, entry) => sum + entry.areaM2, 0);
  const pct = totalAreaM2 ? Math.min(100, Math.round((occupiedAreaM2 / totalAreaM2) * 100)) : 0;
  return {
    room,
    items,
    entries: items,
    totalAreaM2,
    occupiedAreaM2,
    freeAreaM2: Math.max(0, totalAreaM2 - occupiedAreaM2),
    pct,
    areaSqm: Number(totalAreaM2.toFixed(2)),
    occupiedSqm: Number(occupiedAreaM2.toFixed(2)),
    freeSqm: Number(Math.max(0, totalAreaM2 - occupiedAreaM2).toFixed(2)),
    occupancyPct: pct
  };
}
function getPlanRoomGeometry(roomId) {
  const plan = ldPlan();
  const scale = plan?.scale || 45;
  for (const floor of (plan?.floors || [])) {
    for (const room of (floor.rooms || [])) {
      if (room.id === roomId) {
        return { ...room, scale, floorId: floor.id, floorName: floor.name || 'Floor' };
      }
    }
  }
  return null;
}
function getRoomFitAnalysis(item) {
  if (!item?.roomId || !item.widthCm || !item.depthCm) return null;
  const room = getPlanRoomGeometry(item.roomId);
  if (!room) return null;
  const roomWidthM = room.w / room.scale;
  const roomDepthM = room.h / room.scale;
  const itemWidthM = item.widthCm / 100;
  const itemDepthM = item.depthCm / 100;
  const fitsNormal = itemWidthM <= roomWidthM && itemDepthM <= roomDepthM;
  const fitsRotated = itemDepthM <= roomWidthM && itemWidthM <= roomDepthM;
  const roomAreaM2 = roomWidthM * roomDepthM;
  const footprintM2 = itemWidthM * itemDepthM;
  return {
    roomId: room.id,
    roomLabel: room.label || room.id,
    roomWidthM,
    roomDepthM,
    roomAreaM2,
    itemWidthM,
    itemDepthM,
    footprintM2,
    fits: fitsNormal || fitsRotated,
    fitsRotatedOnly: !fitsNormal && fitsRotated,
    footprintPct: roomAreaM2 ? Math.round((footprintM2 / roomAreaM2) * 100) : 0,
    remainingAreaM2: Math.max(0, roomAreaM2 - footprintM2)
  };
}
function getOptimizerGroupKey(item) {
  return String(item.optionGroup || '').trim();
}
function enumerateOptimizerCombos(groups, groupKeys, index, current, combos, cap = 120) {
  if (combos.length >= cap) return;
  if (index >= groupKeys.length) {
    combos.push([...current]);
    return;
  }
  const groupItems = groups[groupKeys[index]] || [];
  groupItems.forEach(item => {
    current.push(item);
    enumerateOptimizerCombos(groups, groupKeys, index + 1, current, combos, cap);
    current.pop();
  });
}
function getRoomOptimizerData(roomId) {
  const floor = getFloor();
  const room = (floor?.rooms || []).find(entry => entry.id === roomId);
  if (!room) return null;
  const items = ldBuy().filter(item => item.roomId === roomId);
  const included = items.filter(item => (item.roomRole || 'candidate') !== 'ignore');
  const fixedItems = included.filter(item => !getOptimizerGroupKey(item));
  const groupedItems = included.filter(item => getOptimizerGroupKey(item));
  const groups = groupedItems.reduce((map, item) => {
    const key = getOptimizerGroupKey(item);
    (map[key] = map[key] || []).push(item);
    return map;
  }, {});
  const groupKeys = Object.keys(groups);
  const comboPicks = [];
  if (groupKeys.length) {
    enumerateOptimizerCombos(groups, groupKeys, 0, [], comboPicks);
  } else {
    comboPicks.push([]);
  }
  const roomAreaM2 = (room.w / planState.scale) * (room.h / planState.scale);
  const combos = comboPicks.map(picks => {
    const selectedItems = [...fixedItems, ...picks];
    const measuredItems = selectedItems.filter(item => item.widthCm && item.depthCm);
    const footprintM2 = measuredItems.reduce((sum, item) => sum + ((item.widthCm / 100) * (item.depthCm / 100)), 0);
    const fits = measuredItems.every(item => getRoomFitAnalysis(item)?.fits !== false) && footprintM2 <= roomAreaM2;
    return {
      selectedItems,
      footprintM2,
      freeAreaM2: Math.max(0, roomAreaM2 - footprintM2),
      fits,
      missingMeasurements: selectedItems.filter(item => !item.widthCm || !item.depthCm).length
    };
  }).sort((a, b) => {
    if (a.fits !== b.fits) return a.fits ? -1 : 1;
    return b.freeAreaM2 - a.freeAreaM2;
  });
  return {
    room,
    items,
    fixedItems,
    groups,
    roomAreaM2,
    combos: combos.slice(0, 3)
  };
}
function getMeasurementDetails(line = lastMeasurement) {
  if (!line) return null;
  const dx = (line.x2 || 0) - (line.x1 || 0);
  const dy = (line.y2 || 0) - (line.y1 || 0);
  const px = Math.hypot(dx, dy);
  if (!px) return null;
  const meters = px / Math.max(planState.scale || 45, 1);
  return {
    ...line,
    px,
    meters,
    labelMeters: Number(line.actualMeters) > 0 ? Number(line.actualMeters) : meters,
    angle: Math.atan2(dy, dx)
  };
}
function getFloorMeasurements() {
  const floor = getFloor();
  if (!floor) return [];
  if (!Array.isArray(floor.measurements)) floor.measurements = [];
  return floor.measurements;
}
function drawMeasurements(ctx, sc) {
  getFloorMeasurements().forEach(line => drawMeasurementLine(ctx, line, sc, '#e11d48', false));
  if (measureStart && measureCurrent) {
    drawMeasurementLine(ctx, {
      x1: measureStart.x,
      y1: measureStart.y,
      x2: measureCurrent.x,
      y2: measureCurrent.y,
      actualMeters: lastMeasurement?.actualMeters || 0
    }, sc, '#3b82f6', true);
  }
}
function drawMeasurementLine(ctx, line, sc, color, dashed) {
  const details = getMeasurementDetails(line);
  if (!details) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(details.x1, details.y1);
  ctx.lineTo(details.x2, details.y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const capSize = 7;
  const perp = details.angle + Math.PI / 2;
  [{ x: details.x1, y: details.y1 }, { x: details.x2, y: details.y2 }].forEach(point => {
    ctx.beginPath();
    ctx.moveTo(point.x - Math.cos(perp) * capSize, point.y - Math.sin(perp) * capSize);
    ctx.lineTo(point.x + Math.cos(perp) * capSize, point.y + Math.sin(perp) * capSize);
    ctx.stroke();
  });

  const midX = (details.x1 + details.x2) / 2;
  const midY = (details.y1 + details.y2) / 2;
  const labelX = midX - Math.sin(details.angle) * 12;
  const labelY = midY + Math.cos(details.angle) * 12;
  const label = `${details.labelMeters.toFixed(2)} m`;
  ctx.font = 'bold 10px DM Sans,sans-serif';
  ctx.textAlign = 'center';
  const textWidth = ctx.measureText(label).width + 8;
  ctx.fillStyle = '#fff';
  ctx.fillRect(labelX - textWidth / 2, labelY - 7, textWidth, 14);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(labelX - textWidth / 2, labelY - 7, textWidth, 14);
  ctx.fillStyle = color;
  ctx.fillText(label, labelX, labelY + 3.5);
  ctx.restore();
}
function onMeasureDown(pos) {
  measureStart = { x:snap(pos.x), y:snap(pos.y) };
  measureCurrent = { ...measureStart };
  renderPlan();
}
function onMeasureMove(pos) {
  if (!measureStart) return;
  measureCurrent = { x:pos.x, y:pos.y };
  renderPlan();
}
function onMeasureUp() {
  if (!measureStart || !measureCurrent) return;
  const line = {
    x1: measureStart.x,
    y1: measureStart.y,
    x2: snap(measureCurrent.x),
    y2: snap(measureCurrent.y),
    actualMeters: lastMeasurement?.actualMeters || 0
  };
  if (getMeasurementDetails(line)?.px >= 8) {
    lastMeasurement = { ...line };
    getFloorMeasurements().push({ ...line });
    savePlan();
  }
  measureStart = null;
  measureCurrent = null;
  planToolsTab = 'measure';
  renderPlan();
  renderPlanToolsPanel();
}
function clearMeasurements() {
  const floor = getFloor();
  if (!floor) return;
  floor.measurements = [];
  if (lastMeasurement) lastMeasurement = null;
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  toast('Measurements cleared', 'warn');
}
function clearMeasurement() {
  measureStart = null;
  measureCurrent = null;
  lastMeasurement = null;
  renderPlan();
  renderPlanToolsPanel();
}
function saveMeasurementReference() {
  if (!lastMeasurement) return;
  lastMeasurement.actualMeters = Math.max(0.1, fNum('measure-actual-m'));
  renderPlan();
  renderPlanToolsPanel();
  toast('Measurement reference saved', 'green', 1200);
}
function calibrateBlueprintFromMeasurement() {
  const measurement = getMeasurementDetails();
  const blueprint = getFloorBlueprint();
  if (!measurement?.px || !blueprint?.src) {
    toast('Draw a measurement line on top of a blueprint first', 'warn');
    return;
  }
  const actualMeters = Math.max(0.1, fNum('measure-actual-m'));
  const factor = (actualMeters * planState.scale) / measurement.px;
  blueprint.widthM = Number((Number(blueprint.widthM || 0) * factor).toFixed(2));
  blueprint.heightM = Number((Number(blueprint.heightM || 0) * factor).toFixed(2));
  lastMeasurement.actualMeters = actualMeters;
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  if (typeof syncBlueprintModal === 'function') syncBlueprintModal();
  toast('Blueprint calibrated from measurement', 'green');
}

// ── Canvas listeners ────────────────────────────────────────
function setupPlanListeners(canvas) {
  canvas.addEventListener('mousedown', e => onPlanDown(e, canvas));
  canvas.addEventListener('mousemove', e => onPlanMove(e, canvas));
  canvas.addEventListener('mouseup',   e => onPlanUp(e, canvas));
  canvas.addEventListener('dblclick',  e => onPlanDbl(e, canvas));
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); onPlanRight(e, canvas); });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPlanDown(e, canvas); }, { passive:false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onPlanMove(e, canvas); }, { passive:false });
  canvas.addEventListener('touchend',   e => { e.preventDefault(); onPlanUp(e, canvas);   }, { passive:false });
  canvas.setAttribute('tabindex','0');
  canvas.addEventListener('keydown', e => {
    if (e.key==='Delete'||e.key==='Backspace') deleteSelected();
    if (e.key==='ArrowRight') nudge(5,0); if (e.key==='ArrowLeft') nudge(-5,0);
    if (e.key==='ArrowUp')    nudge(0,-5);if (e.key==='ArrowDown')  nudge(0,5);
    if (!e.ctrlKey && !e.metaKey && (e.key==='r'||e.key==='R')) { e.preventDefault(); rotateSelectedFurniture(); }
    if ((e.ctrlKey||e.metaKey)&&e.key==='z') { e.preventDefault(); undoPlan(); }
    if ((e.ctrlKey||e.metaKey)&&e.key==='y') { e.preventDefault(); redoPlan(); }
  });
}
function getPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}
function snap(v) { const s = Math.max(5, Math.round(planState.scale/4)); return Math.round(v/s)*s; }
function hitAll(pos) {
  const fl = getFloor();
  const all = [
    ...(fl.rooms||[]).map(room => buildHitEntry('room', room)),
    ...(fl.furniture||[]).map(item => buildHitEntry('furniture', item)),
    ...getPlacedBuyHitEntries(fl),
  ];
  for (let i=all.length-1;i>=0;i--) {
    const it=all[i]; if(pos.x>=it.x&&pos.x<=it.x+it.w&&pos.y>=it.y&&pos.y<=it.y+it.h) return it;
  }
  return null;
}
function getSelectedFurniture() {
  return (getFloor().furniture||[]).find(f => f.id === selected) || null;
}
function getDefaultFurnitureType() {
  return FURNITURE[furnType] ? furnType : Object.keys(FURNITURE)[0] || '';
}
function syncFurnitureButtons() {
  const nextType = getDefaultFurnitureType();
  if (nextType !== furnType) furnType = nextType;
  document.querySelectorAll('.furn-btn').forEach(btn => {
    const type = btn.dataset.furn || '';
    const cfg = FURNITURE[type];
    const available = Boolean(cfg);
    btn.disabled = !available;
    btn.title = available
      ? `${cfg.l} · ${cfg.w.toFixed(2)}m × ${cfg.h.toFixed(2)}m`
      : `Unavailable planner type: ${type}`;
    btn.classList.toggle('active', available && type === furnType);
  });
}
function updatePlanActionState() {
  const rotateBtn = document.getElementById('plan-rotate-btn');
  if (!rotateBtn) return;
  const selectedObject = getSelectedPlanObject();
  const canRotate = Boolean(selectedObject && (selectedObject.kind === 'furniture' || selectedObject.kind === 'buy'));
  rotateBtn.disabled = !canRotate;
  rotateBtn.title = canRotate ? 'Rotate selected item 90° (R)' : 'Select a furniture item or planned purchase to rotate';
}
function rotateFurniture(item, options = {}) {
  const { notify = true } = options;
  if (!item) return false;
  const nextW = item.h;
  item.h = item.w;
  item.w = nextW;
  savePlan();
  renderPlan();
  rPlanSidebar();
  if (notify) toast('Rotated 90°','info',1000);
  return true;
}
function rotateSelectedFurniture() {
  const selectedObject = getSelectedPlanObject();
  if (!selectedObject) {
    toast('Select furniture or a planned item to rotate first','warn');
    return false;
  }
  if (selectedObject.kind === 'buy') {
    const nextRotated = !Boolean(getLiveBuyDraft(selectedObject.item)?.planRotated ?? selectedObject.item.planRotated);
    setLiveBuyDraft(selectedObject.item, { planRotated: nextRotated });
    persistLiveBuyDraft(selectedObject.item.id);
    renderPlan();
    rPlanSidebar();
    toast('Rotated 90°','info',1000);
    return true;
  }
  if (selectedObject.kind !== 'furniture') {
    toast('Only furniture and placed room items can rotate','warn');
    return false;
  }
  return rotateFurniture(selectedObject.item);
}

function onPlanDown(e, canvas) {
  canvas.focus({ preventScroll:true });
  const pos = getPos(e, canvas);
  const fl  = getFloor();
  if (planTool==='measure') {
    if (typeof onMeasureDown === 'function') onMeasureDown(pos);
    return;
  } else if (planTool==='room') {
    drawStart   = { x:snap(pos.x), y:snap(pos.y) };
    drawCurrent = { ...drawStart };
  } else if (planTool==='furn') {
    const fc = FURNITURE[furnType]; if (!fc) return;
    const fw = fc.w*planState.scale, fh = fc.h*planState.scale;
    const nf = { id:uid(), type:furnType, x:snap(pos.x-fw/2), y:snap(pos.y-fh/2), w:fw, h:fh, emoji:fc.emoji, label:fc.l, color:fc.color };
    fl.furniture.push(nf); selected=nf.id; savePlan(); renderPlan();
    toast(fc.l+' placed 🛋️','info',1500);
  } else if (planTool==='select') {
    const hit = hitAll(pos);
    selected = hit ? hit.id : null;
    if (hit) {
      dragging = hit;
      dragOff = { x:pos.x-hit.x, y:pos.y-hit.y };
    }
    renderPlan(); rPlanSidebar(); renderPlanToolsPanel();
  } else if (planTool==='erase') {
    const hit = hitAll(pos);
    if (hit) {
      if (hit.kind === 'buy') {
        const item = getBuyItem(hit.id);
        if (item) {
          Object.assign(item, { placedInPlan:false, planX:0, planY:0, planFloor:'', planRotated:false });
          updBuyItem(item);
        }
      } else {
        fl.rooms     = (fl.rooms||[]).filter(r=>r.id!==hit.id);
        fl.furniture = (fl.furniture||[]).filter(f=>f.id!==hit.id);
        savePlan();
      }
      selected=null; renderPlan(); rPlanSidebar(); renderPlanToolsPanel();
    }
  } else if (planTool==='paint') {
    const hit = (fl.rooms||[]).slice().reverse().find(r=>pos.x>=r.x&&pos.x<=r.x+r.w&&pos.y>=r.y&&pos.y<=r.y+r.h);
    if (hit) { hit.color=document.getElementById('plan-paint-color')?.value||'#fce4ec'; savePlan(); renderPlan(); }
  }
}
function onPlanMove(e, canvas) {
  const pos = getPos(e, canvas);
  if (planTool==='measure') { if (typeof onMeasureMove==='function') onMeasureMove(pos); return; }
  if (planTool==='room'&&drawStart) { drawCurrent={x:pos.x,y:pos.y}; renderPlan(); }
  else if (planTool==='select'&&dragging) {
    setHitPosition(dragging, snap(pos.x-dragOff.x), snap(pos.y-dragOff.y));
    renderPlan();
  }
  else {
    // hover detection for room tooltip
    const fl = getFloor();
    const hov = (fl.rooms||[]).slice().reverse().find(r=>pos.x>=r.x&&pos.x<=r.x+r.w&&pos.y>=r.y&&pos.y<=r.y+r.h);
    if ((hov?.id||null) !== hoveredRoom) { hoveredRoom = hov?.id||null; renderPlan(); }
  }
}
function onPlanUp(e, canvas) {
  if (planTool==='measure') { if (typeof onMeasureUp==='function') onMeasureUp(); return; }
  if (planTool==='room'&&drawStart&&drawCurrent) {
    const x1=Math.min(drawStart.x,drawCurrent.x), y1=Math.min(drawStart.y,drawCurrent.y);
    const x2=Math.max(drawStart.x,drawCurrent.x), y2=Math.max(drawStart.y,drawCurrent.y);
    const w=snap(x2-x1), h=snap(y2-y1);
    if (w>planState.scale*.4&&h>planState.scale*.4) {
      const color = ROOM_COLORS_CYCLE[roomColorIdx%ROOM_COLORS_CYCLE.length]; roomColorIdx++;
      const room = { id:uid(), label:'Room', color, x:x1, y:y1, w, h, area:((w/planState.scale)*(h/planState.scale)).toFixed(1) };
      getFloor().rooms.push(room); selected=room.id; savePlan(); rPlanSidebar();
    }
    drawStart=null; drawCurrent=null; renderPlan();
  } else if (planTool==='select'&&dragging) {
    if (dragging.kind === 'buy') persistLiveBuyDraft(dragging.id);
    else savePlan();
    dragging=null;
    rPlanSidebar();
    renderPlanToolsPanel();
  }
}
function onPlanDbl(e, canvas) {
  const pos=getPos(e,canvas); const hit=hitAll(pos);
  if (!hit) return;
  if (hit.kind === 'buy') {
    openItemDetail(hit.id);
    return;
  }
  inlineEdit('Label', hit.label||'', v=>{
    hit.item.label = v;
    savePlan();
    renderPlan();
    rPlanSidebar();
    renderPlanToolsPanel();
  });
}
function onPlanRight(e, canvas) {
  const pos=getPos(e,canvas);
  const hit = hitAll(pos);
  if (hit) {
    selected = hit.id;
    rotateSelectedFurniture();
  }
}

// ── Tools ────────────────────────────────────────────────────
function setPlanTool(t) {
  planTool = t;
  document.querySelectorAll('.ptool').forEach(b=>b.classList.remove('active'));
  document.getElementById('tool-'+t)?.classList.add('active');
  const canvas=document.getElementById('canvas-plan');
  if (canvas) {
    const curs={select:'default',room:'crosshair',furn:'cell',erase:'not-allowed',paint:'cell',measure:'crosshair'};
    canvas.style.cursor=curs[t]||'default';
  }
  document.getElementById('furn-bar').style.display = t==='furn' ? 'flex' : 'none';
  const tips={
    select: 'Click to select · Drag to move · Dbl-click rooms/furniture to rename · Dbl-click planned items to inspect · Del removes from plan · Rotate with button or R',
    room:   'Drag to draw a room · Dbl-click to rename',
    furn:   'Click to place furniture · Select placed furniture or planned items, then rotate with button or R',
    erase:  'Click to delete room, furniture, or remove a planned item from the floor plan',
    paint:  'Click a room to change its colour',
    measure:'Drag to draw a measurement line · Lines persist on the plan · Use Clear to remove all',
  };
  if (t === 'measure') planToolsTab = 'measure';
  document.getElementById('plan-status').textContent = '💡 ' + (tips[t]||'');
  renderPlanToolsPanel();
}
function selectFurnType(type) {
  if (!FURNITURE[type]) {
    toast('This furniture type is not available in the planner yet','warn');
    syncFurnitureButtons();
    return false;
  }
  furnType = type;
  syncFurnitureButtons();
  return true;
}
function deleteSelected() {
  if (!selected) return;
  const fl=getFloor();
  const plannedItem = getBuyItem(selected);
  if (plannedItem?.placedInPlan && plannedItem.planFloor === fl.id) {
    Object.assign(plannedItem, { placedInPlan:false, planX:0, planY:0, planFloor:'', planRotated:false });
    updBuyItem(plannedItem);
  } else {
    fl.rooms     = (fl.rooms||[]).filter(r=>r.id!==selected);
    fl.furniture = (fl.furniture||[]).filter(f=>f.id!==selected);
    savePlan();
  }
  selected=null;
  renderPlan();
  rPlanSidebar();
  renderPlanToolsPanel();
}
function nudge(dx,dy) {
  const selectedObject = getSelectedPlanObject();
  if (!selectedObject) return;
  if (selectedObject.kind === 'buy') {
    const rect = getPlacedBuyRect(selectedObject.item);
    setLiveBuyDraft(selectedObject.item, { planX:rect.x + dx, planY:rect.y + dy });
    persistLiveBuyDraft(selectedObject.item.id);
  } else {
    selectedObject.item.x += dx;
    selectedObject.item.y += dy;
    savePlan();
  }
  renderPlan();
  rPlanSidebar();
  renderPlanToolsPanel();
}
function setPlanScale() {
  planState.scale=parseInt(document.getElementById('plan-scale').value)||45;
  savePlan(); renderPlan();
}
function clearFloor() {
  confirmDlg('Delete all elements on this floor?', ()=>{
    const floor = getFloor();
    getPlacedBuyItems(floor).forEach(item => {
      Object.assign(item, { placedInPlan:false, planX:0, planY:0, planFloor:'', planRotated:false });
      updBuyItem(item);
    });
    floor.rooms=[]; floor.furniture=[]; selected=null;
    savePlan(); renderPlan(); rPlanSidebar(); renderPlanToolsPanel(); toast('Floor cleared','warn');
  });
}
function downloadPlan() {
  const canvas=document.getElementById('canvas-plan'); if(!canvas) return;
  const a=document.createElement('a');
  a.download='floor_plan_'+todayISO()+'.png'; a.href=canvas.toDataURL('image/png'); a.click();
  toast('Plan saved 📸','green');
}

// ── Multi-floor ──────────────────────────────────────────────
function addFloor() {
  const name=prompt('Floor name:','Second Floor');
  if(!name) return;
  planState.floors.push({id:uid(),name,rooms:[],furniture:[]});
  savePlan(); renderFloorTabs();
}
function switchFloor(idx) {
  planState.activeFloor=idx; selected=null;
  savePlan({ recordHistory:false }); renderFloorTabs(); renderPlan(); rPlanSidebar();
}
function renderFloorTabs() {
  const el=document.getElementById('floor-tabs'); if(!el) return;
  el.innerHTML = planState.floors.map((fl,i)=>
    `<button class="floor-tab ${i===planState.activeFloor?'active':''}" onclick="switchFloor(${i})">${esc(fl.name)}</button>`
  ).join('') + `<button class="floor-tab add-btn" onclick="addFloor()">+ Floor</button>`;
}

// ── RENDER ───────────────────────────────────────────────────
function renderPlan() {
  const canvas=document.getElementById('canvas-plan'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width, H=canvas.height;
  const sc=planState.scale;
  ctx.clearRect(0,0,W,H);

  // Background
  ctx.fillStyle='#fafafa'; ctx.fillRect(0,0,W,H);

  const blueprint = getBlueprintBounds();
  if (blueprint) {
    const img = getBlueprintImage(blueprint.src);
    if (img?.complete) {
      ctx.save();
      ctx.globalAlpha = blueprint.opacity;
      ctx.drawImage(img, blueprint.x, blueprint.y, blueprint.w, blueprint.h);
      ctx.restore();
    }
  }

  // Grid
  if (document.getElementById('plan-grid')?.checked!==false) {
    ctx.strokeStyle='#e8ecf0'; ctx.lineWidth=.5;
    for(let x=0;x<W;x+=sc){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=sc){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }

  // Scale bar
  ctx.strokeStyle='#94a3b8'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(8,H-10); ctx.lineTo(8+sc,H-10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8,H-14); ctx.lineTo(8,H-6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8+sc,H-14); ctx.lineTo(8+sc,H-6); ctx.stroke();
  ctx.fillStyle='#64748b'; ctx.font='9px DM Sans,sans-serif'; ctx.textAlign='center';
  ctx.fillText('1 m', 8+sc/2, H-16);

  const fl=getFloor();

  // Rooms
  (fl.rooms||[]).forEach(r=>{
    const isHov  = r.id===hoveredRoom;
    const isSel  = r.id===selected;
    // Check if this room has linked buy items
    const items  = ldBuy().filter(it=>it.roomId===r.id);
    const occ = getRoomOccupancy(r.id, fl);
    const occPct = occ?.pct || 0;
    ctx.fillStyle = r.color||'#fce4ec';
    ctx.fillRect(r.x,r.y,r.w,r.h);
    // Occupancy overlay: green (low) → yellow (medium) → red (high)
    if (occPct > 0) {
      const occAlpha = Math.min(0.18, occPct * 0.002);
      ctx.fillStyle = occPct > 80 ? `rgba(220,38,38,${occAlpha})` : occPct > 50 ? `rgba(217,119,6,${occAlpha})` : `rgba(22,163,74,${occAlpha})`;
      ctx.fillRect(r.x,r.y,r.w,r.h);
    }
    // Border
    ctx.strokeStyle = isSel?'#e11d48':isHov?'#f43f5e':'#94a3b8';
    ctx.lineWidth = isSel?2.5:isHov?2:1.5;
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    // Label
    const fs=Math.min(15,Math.max(9,Math.min(r.w,r.h)*.16));
    ctx.fillStyle='#1e293b'; ctx.font=`600 ${fs}px 'DM Sans',sans-serif`; ctx.textAlign='center';
    ctx.fillText(r.label||'Room', r.x+r.w/2, r.y+r.h/2+fs*.35);
    // Dimensions
    const wm=(r.w/sc).toFixed(1)+'m', hm=(r.h/sc).toFixed(1)+'m';
    const area=((r.w/sc)*(r.h/sc)).toFixed(1);
    ctx.fillStyle='#64748b'; ctx.font='8px sans-serif'; ctx.textAlign='center';
    ctx.fillText(wm, r.x+r.w/2, r.y+r.h-3);
    ctx.save(); ctx.translate(r.x+8,r.y+r.h/2); ctx.rotate(-Math.PI/2);
    ctx.fillText(hm,0,0); ctx.restore();
    if(r.w>60&&r.h>60){
      const occColor = occPct > 80 ? '#dc2626' : occPct > 50 ? '#d97706' : 'rgba(15,23,42,.3)';
      ctx.fillStyle=occColor; ctx.font='7px sans-serif'; ctx.textAlign='center';
      ctx.fillText(area+' m²' + (occPct ? ' · ' + occPct + '% used' : ''), r.x+r.w/2, r.y+r.h/2+fs*.35+fs+3);
    }
    // Item count badge
    if (items.length) {
      const bx=r.x+r.w-8, by=r.y+6, br=9;
      ctx.fillStyle='#e11d48'; ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font=`bold 8px sans-serif`; ctx.textAlign='center';
      ctx.fillText(items.length,bx,by+3);
    }
    // Selection handles
    if (isSel) {
      [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].forEach(([hx,hy])=>{
        ctx.fillStyle='#e11d48'; ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill();
      });
    }
  });

  // Drawing preview
  if (drawStart&&drawCurrent) {
    const x1=Math.min(drawStart.x,drawCurrent.x), y1=Math.min(drawStart.y,drawCurrent.y);
    const x2=Math.max(drawStart.x,drawCurrent.x), y2=Math.max(drawStart.y,drawCurrent.y);
    ctx.fillStyle='rgba(225,29,72,.1)'; ctx.fillRect(x1,y1,x2-x1,y2-y1);
    ctx.strokeStyle='#e11d48'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.strokeRect(x1,y1,x2-x1,y2-y1); ctx.setLineDash([]);
    const dw=((x2-x1)/sc).toFixed(1), dh=((y2-y1)/sc).toFixed(1);
    ctx.fillStyle='#e11d48'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(dw+' × '+dh+' m', x1+(x2-x1)/2, y1-6);
  }
  const activeMeasurement = measureStart && measureCurrent
    ? { x1:measureStart.x, y1:measureStart.y, x2:measureCurrent.x, y2:measureCurrent.y, actualMeters:lastMeasurement?.actualMeters || 0 }
    : lastMeasurement;
  const measurement = getMeasurementDetails(activeMeasurement);
  if (measurement) {
    const midX = (measurement.x1 + measurement.x2) / 2;
    const midY = (measurement.y1 + measurement.y2) / 2;
    const label = `${measurement.labelMeters.toFixed(2)} m`;
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(measurement.x1, measurement.y1);
    ctx.lineTo(measurement.x2, measurement.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); ctx.arc(measurement.x1, measurement.y1, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(measurement.x2, measurement.y2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.translate(midX, midY);
    ctx.rotate(measurement.angle);
    ctx.font = '700 10px DM Sans,sans-serif';
    const metrics = ctx.measureText(label);
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.fillRect((-metrics.width / 2) - 8, -18, metrics.width + 16, 16);
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -6);
    ctx.restore();
  }

  // Furniture + buy items placed in plan
  const buyPlaced = ldBuy().filter(it=>it.placedInPlan&&it.planFloor===getFloor().id);

  (fl.furniture||[]).forEach(f=>{
    ctx.save();
    ctx.translate(f.x,f.y);
    ctx.shadowColor='rgba(0,0,0,.1)'; ctx.shadowBlur=4;
    ctx.fillStyle=f.color||'rgba(255,255,255,.92)'; ctx.fillRect(0,0,f.w,f.h);
    ctx.shadowBlur=0;
    ctx.strokeStyle=f.id===selected?'#e11d48':'#cbd5e1';
    ctx.lineWidth=f.id===selected?2.5:1;
    ctx.strokeRect(0,0,f.w,f.h);
    const efs=Math.min(f.w,f.h)*.6;
    ctx.font=Math.max(10,efs)+'px serif'; ctx.textAlign='center'; ctx.fillStyle='rgba(0,0,0,.7)';
    ctx.fillText(f.emoji||'📦', f.w/2, f.h/2+efs*.35);
    if(f.w>40){ctx.fillStyle='#475569';ctx.font=(Math.min(9,f.w/8))+'px sans-serif';ctx.textAlign='center';ctx.fillText(trunc(f.label,14),f.w/2,f.h-2);}
    ctx.restore();
  });

  // Buy items placed in plan (shown as colored overlays)
  buyPlaced.forEach(it=>{
    const rect = getPlacedBuyRect(it);
    const x=rect.x, y=rect.y, wPx=rect.w, dPx=rect.h;
    const room = getRoomById(it.roomId);
    const fit  = getRoomFitAnalysis(it);
    const col  = normalizeItemSource(it.source)==='existing'
      ? '#cbd5e1'
      : (room ? room.color : '#fce4ec');
    const border = fit?.fits ? '#15803d' : '#e11d48';
    ctx.save();
    ctx.globalAlpha=.72;
    ctx.fillStyle=col; ctx.fillRect(x,y,wPx,dPx);
    ctx.strokeStyle=it.id===selected ? '#0f172a' : border;
    ctx.lineWidth=it.id===selected ? 2.5 : 1.5;
    ctx.strokeRect(x,y,wPx,dPx);
    ctx.globalAlpha=1;
    ctx.fillStyle='#1e293b'; ctx.font='8px sans-serif'; ctx.textAlign='center';
    ctx.fillText(trunc(it.name,10), x+wPx/2, y+dPx/2+4);
    if (it.id===selected) {
      ctx.strokeStyle='#0f172a';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x-2,y-2,wPx+4,dPx+4);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });

  // Measurement annotations (smart.js)
  if (typeof drawMeasurements === 'function') drawMeasurements(ctx, sc);

  updatePlanActionState();
  if (typeof renderPlanInsightCards === 'function') renderPlanInsightCards();
}

// ── Sidebar ──────────────────────────────────────────────────
function rPlanSidebar() {
  const el=document.getElementById('room-sidebar'); if(!el) return;
  const fl=getFloor();
  const sc=planState.scale;
  if(!fl.rooms?.length) {
    el.innerHTML='<div style="color:var(--bd3);font-size:.7rem;text-align:center;padding:10px">No rooms yet — draw some!</div>';
    renderPlanToolsPanel();
    return;
  }
  // Show banner if floor needs measurements
  let sidebarHTML = '';
  if (fl.needsMeasurements) {
    const unmeasured = fl.rooms.filter(r => !r.area || r.area === 0).length;
    sidebarHTML += `<div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1.5px solid #fde68a;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:.65rem;color:#92400e">
      <div style="font-weight:700;margin-bottom:2px">📏 Measurements needed</div>
      <div>${unmeasured} room${unmeasured !== 1 ? 's' : ''} still need${unmeasured === 1 ? 's' : ''} exact measurements.</div>
      <button class="btn sml" style="margin-top:4px;font-size:.6rem" onclick="startMeasurementFlow()">📏 Start Guided Measurement</button>
    </div>`;
  }
  sidebarHTML += fl.rooms.map(r=>{
    const area=((r.w/sc)*(r.h/sc)).toFixed(1);
    const wm=(r.w/sc).toFixed(1), hm=(r.h/sc).toFixed(1);
    const items=ldBuy().filter(it=>it.roomId===r.id);
    const occupancy = getRoomOccupancy(r.id, fl);
    const needsMeas = !r.area || r.area === 0;
    return `<div class="room-item ${r.id===selected?'active':''}" onclick="selectRoom('${r.id}')">
      <span class="room-swatch" style="background:${r.color||'#fce4ec'}"></span>
      <div class="room-info">
        <div class="room-name">${esc(r.emoji || '')} ${esc(r.label||'Room')}${needsMeas ? ' <span style="color:#d97706;font-size:.55rem">📏</span>' : ''}</div>
        <div class="room-dim">${wm}×${hm}m · ${needsMeas ? '<span style="color:#d97706">needs measuring</span>' : area+'m² · '+( occupancy?.pct || 0)+'% used'}</div>
      </div>
      ${items.length?`<span class="room-item-count" onclick="event.stopPropagation();showRoomItemsPanel('${r.id}')" title="View items for this room">${items.length}</span>`:''}
      ${needsMeas?`<button class="btn sml icon" onclick="event.stopPropagation();openMeasureRoom('${r.id}')" title="Measure">📏</button>`:''}
      <button class="btn sml icon" onclick="event.stopPropagation();renameRoom('${r.id}')">✏️</button>
    </div>`;
  }).join('');
  el.innerHTML = sidebarHTML;
  if (fl.furniture?.length) {
    el.innerHTML += `<div style="font-size:.6rem;color:var(--bd3);padding:6px 4px;border-top:1px solid var(--border);margin-top:4px">${fl.furniture.length} furniture item${fl.furniture.length!==1?'s':''} placed</div>`;
  }
  const selFurniture = getSelectedFurniture();
  if (selFurniture) {
    const wm=(selFurniture.w/sc).toFixed(1);
    const hm=(selFurniture.h/sc).toFixed(1);
    el.innerHTML += `<div class="plan-selection-card">
      <div class="plan-selection-kicker">Selected furniture</div>
      <div class="plan-selection-name">${esc(selFurniture.emoji||'🛋️')} ${esc(selFurniture.label||selFurniture.type||'Furniture')}</div>
      <div class="plan-selection-meta">${wm}×${hm}m on this floor</div>
      <button class="btn sml pri" onclick="rotateSelectedFurniture()">⟳ Rotate 90°</button>
    </div>`;
  }
  renderPlanToolsPanel();
  if (typeof renderPlanInsightCards === 'function') renderPlanInsightCards();
}
function selectRoom(id) { selected=id; renderPlan(); rPlanSidebar(); }
function renameRoom(id) {
  const r=(getFloor().rooms||[]).find(x=>x.id===id); if(!r) return;
  inlineEdit('Room name',r.label,v=>{r.label=v;savePlan();renderPlan();rPlanSidebar();});
}

function switchPlanToolsTab(tab) {
  planToolsTab = tab;
  renderPlanToolsPanel();
}
function importPlanBlueprint(file, options = {}) {
  const { onComplete = null } = options;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const src = String(reader.result || '');
    const img = new Image();
    img.onload = () => {
      const floor = getFloor();
      const blueprint = getFloorBlueprint(floor);
      const defaultWidthM = 12;
      const defaultHeightM = Number((defaultWidthM * (img.naturalHeight / Math.max(img.naturalWidth, 1))).toFixed(2));
      Object.assign(blueprint, {
        src,
        widthM: defaultWidthM,
        heightM: Math.max(2, defaultHeightM),
        x: 20,
        y: 20,
        opacity: 0.38,
        hidden: false,
        presetId: '',
        presetLabel: ''
      });
      savePlan();
      renderPlan();
      renderPlanToolsPanel();
      if (typeof syncBlueprintModal === 'function') syncBlueprintModal();
      if (typeof onComplete === 'function') onComplete();
      toast('Blueprint imported. Tune width, height, and offset to trace the plan.','green',4000);
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}
function updateBlueprintFromPanel() {
  const blueprint = getFloorBlueprint();
  if (!blueprint) return;
  blueprint.widthM = Math.max(0, fNum('bp-width-m'));
  blueprint.heightM = Math.max(0, fNum('bp-height-m'));
  blueprint.x = fNum('bp-x-m') * planState.scale;
  blueprint.y = fNum('bp-y-m') * planState.scale;
  blueprint.opacity = Math.min(1, Math.max(0.05, Number(fVal('bp-opacity')) || 0.38));
  blueprint.hidden = false;
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  if (typeof syncBlueprintModal === 'function') syncBlueprintModal();
}
function removePlanBlueprint() {
  const blueprint = getFloorBlueprint();
  if (!blueprint?.src) return;
  Object.assign(blueprint, { src:'', widthM:0, heightM:0, x:0, y:0, opacity:0.38, hidden:false, presetId:'', presetLabel:'', note:'' });
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  if (typeof syncBlueprintModal === 'function') syncBlueprintModal();
  toast('Blueprint removed','warn');
}
function getCurrentFloorBoundsMeters() {
  const rooms = getFloor()?.rooms || [];
  if (!rooms.length) return null;
  const minX = Math.min(...rooms.map(room => room.x || 0));
  const minY = Math.min(...rooms.map(room => room.y || 0));
  const maxX = Math.max(...rooms.map(room => (room.x || 0) + (room.w || 0)));
  const maxY = Math.max(...rooms.map(room => (room.y || 0) + (room.h || 0)));
  return {
    x: Number((minX / planState.scale).toFixed(2)),
    y: Number((minY / planState.scale).toFixed(2)),
    widthM: Number(((maxX - minX) / planState.scale).toFixed(2)),
    heightM: Number(((maxY - minY) / planState.scale).toFixed(2)),
  };
}
function renderPlanInsightCards() {
  const blueprintEl = document.getElementById('plan-blueprint-summary');
  const capacityEl = document.getElementById('plan-room-capacity');
  if (blueprintEl) {
    const blueprint = getFloorBlueprint();
    const preset = getBlueprintPreset(blueprint?.presetId || '');
    if (blueprint?.src) {
      blueprintEl.innerHTML = `
        <div style="font-weight:700;color:var(--bd);margin-bottom:4px">${esc(blueprint.presetLabel || preset?.label || 'Custom blueprint')}</div>
        <div>${Number(blueprint.widthM || 0).toFixed(2)}m × ${Number(blueprint.heightM || 0).toFixed(2)}m · opacity ${Math.round((Number(blueprint.opacity) || 0.38) * 100)}%</div>
        <div style="margin-top:4px">${esc(blueprint.hidden ? 'Hidden on canvas until you show it again.' : (preset?.note || blueprint.note || 'Tracing overlay ready on this floor.'))}</div>
      `;
    } else {
      blueprintEl.textContent = 'Load an apartment or Keller 2 preset from blueprint_images, or upload your own JPG/PNG overlay.';
    }
  }
  if (capacityEl) {
    const room = getSelectedRoom();
    if (!room) {
      capacityEl.textContent = 'Select a room to see used area, free space, and the best space-saving setup.';
      return;
    }
    const occupancy = getRoomOccupancy(room.id);
    const bestCombo = getRoomOptimizerData(room.id)?.combos?.[0] || null;
    capacityEl.innerHTML = `
      <div style="font-weight:700;color:var(--bd);margin-bottom:4px">${esc(room.label || 'Room')}</div>
      <div>${occupancy?.freeAreaM2?.toFixed(2) || '0.00'} m² free · ${occupancy?.occupiedAreaM2?.toFixed(2) || '0.00'} m² used</div>
      <div style="margin-top:4px">${bestCombo ? `Best option-group setup leaves ${bestCombo.freeAreaM2.toFixed(2)} m² free.` : 'Assign option groups to compare setup alternatives.'}</div>
    `;
  }
}
function syncBlueprintModal() {
  const modal = document.getElementById('blueprint-modal');
  if (!modal) return;
  const presetSelect = document.getElementById('bp-modal-preset');
  const status = document.getElementById('bp-modal-status');
  const visible = document.getElementById('bp-modal-visible');
  const presets = getAvailableBlueprintPresets();
  const blueprint = getFloorBlueprint();
  const preset = getBlueprintPreset(blueprint?.presetId || '');
  if (presetSelect) {
    presetSelect.innerHTML = `<option value="">Manual / current overlay</option>${presets.map(entry => `<option value="${entry.id}">${esc(entry.label)}</option>`).join('')}`;
    presetSelect.value = blueprint?.presetId || '';
  }
  fSet('bp-modal-width-m', blueprint?.widthM || '');
  fSet('bp-modal-height-m', blueprint?.heightM || '');
  fSet('bp-modal-offset-x', ((blueprint?.x || 0) / planState.scale).toFixed(2));
  fSet('bp-modal-offset-y', ((blueprint?.y || 0) / planState.scale).toFixed(2));
  fSet('bp-modal-opacity', blueprint?.opacity || 0.38);
  if (visible) visible.checked = Boolean(blueprint?.src) && !blueprint?.hidden;
  if (status) {
    if (blueprint?.src) {
      status.textContent = `${blueprint.presetLabel || 'Blueprint overlay'} active at ${Number(blueprint.widthM || 0).toFixed(2)} × ${Number(blueprint.heightM || 0).toFixed(2)} m.${blueprint.hidden ? ' It is currently hidden on the canvas.' : ''} ${preset?.note || blueprint.note || ''}`.trim();
    } else {
      status.textContent = 'Upload a PNG or JPG blueprint, or load a preset that matches the apartment measurements.';
    }
  }
}
function handleBlueprintUpload(files) {
  const file = files && files[0];
  if (!file) return;
  importPlanBlueprint(file, { onComplete: () => syncBlueprintModal() });
}
function applySelectedBlueprintPreset() {
  const presetId = fVal('bp-modal-preset');
  if (!presetId) {
    toast('Select a blueprint preset first', 'warn');
    return;
  }
  loadPreloadedBlueprintPreset(presetId);
}
function fitBlueprintToFloor() {
  const blueprint = getFloorBlueprint();
  if (!blueprint?.src) {
    const presetId = fVal('bp-modal-preset');
    if (presetId) {
      if (!loadPreloadedBlueprintPreset(presetId)) return;
    } else {
      toast('Load or upload a blueprint first', 'warn');
      return;
    }
  }
  const bounds = getCurrentFloorBoundsMeters()
    || (typeof PRELOADED_PLAN_BOUNDS !== 'undefined' ? {
      x: PRELOADED_PLAN_BOUNDS.minX,
      y: PRELOADED_PLAN_BOUNDS.minY,
      widthM: PRELOADED_PLAN_BOUNDS.widthM,
      heightM: PRELOADED_PLAN_BOUNDS.heightM,
    } : null);
  if (!bounds) {
    toast('No room measurements available yet to fit the blueprint', 'warn');
    return;
  }
  blueprint.widthM = bounds.widthM;
  blueprint.heightM = bounds.heightM;
  blueprint.x = Math.round(bounds.x * planState.scale);
  blueprint.y = Math.round(bounds.y * planState.scale);
  blueprint.hidden = false;
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  syncBlueprintModal();
  toast('Blueprint fitted to current floor bounds', 'green');
}
function clearBlueprint() {
  removePlanBlueprint();
}
function saveBlueprintSettings() {
  const blueprint = getFloorBlueprint();
  if (!blueprint?.src && !fVal('bp-modal-preset')) {
    toast('Load or upload a blueprint first', 'warn');
    return;
  }
  if (!blueprint?.src && fVal('bp-modal-preset')) {
    if (!loadPreloadedBlueprintPreset(fVal('bp-modal-preset'))) return;
  }
  blueprint.widthM = Math.max(0, fNum('bp-modal-width-m'));
  blueprint.heightM = Math.max(0, fNum('bp-modal-height-m'));
  blueprint.x = fNum('bp-modal-offset-x') * planState.scale;
  blueprint.y = fNum('bp-modal-offset-y') * planState.scale;
  blueprint.opacity = Math.min(1, Math.max(0.05, Number(fVal('bp-modal-opacity')) || 0.38));
  blueprint.hidden = !document.getElementById('bp-modal-visible')?.checked;
  savePlan();
  renderPlan();
  renderPlanToolsPanel();
  syncBlueprintModal();
  toast('Blueprint settings saved', 'green');
}
function saveRoomMeasurements(roomId) {
  const room = (getFloor().rooms || []).find(entry => entry.id === roomId);
  if (!room) return;
  const label = fVal('room-label-edit') || room.label || 'Room';
  const widthM = Math.max(0.5, fNum('room-width-edit'));
  const depthM = Math.max(0.5, fNum('room-depth-edit'));
  room.label = label;
  room.w = Math.round(widthM * planState.scale);
  room.h = Math.round(depthM * planState.scale);
  room.area = (widthM * depthM).toFixed(1);
  savePlan();
  renderPlan();
  rPlanSidebar();
  toast('Room measurements updated','green');
}
function toggleRoomOptimizerUse(itemId, checked) {
  const item = getBuyItem(itemId);
  if (!item) return;
  item.roomRole = checked ? (item.roomRole === 'must' ? 'must' : 'candidate') : 'ignore';
  updBuyItem(item);
  renderPlanToolsPanel();
  rBuy();
}
function toggleRoomOptimizerMust(itemId, checked) {
  const item = getBuyItem(itemId);
  if (!item) return;
  item.roomRole = checked ? 'must' : 'candidate';
  updBuyItem(item);
  renderPlanToolsPanel();
  rBuy();
}
function renderBlueprintTab() {
  const blueprint = getFloorBlueprint();
  const xM = ((blueprint?.x || 0) / planState.scale).toFixed(2);
  const yM = ((blueprint?.y || 0) / planState.scale).toFixed(2);
  const presets = getAvailableBlueprintPresets();
  const activePreset = getBlueprintPreset(blueprint?.presetId || '');
  const planBounds = typeof PRELOADED_PLAN_BOUNDS !== 'undefined'
    ? PRELOADED_PLAN_BOUNDS
    : null;
  return `<div style="display:grid;gap:8px">
    <div style="font-size:.68rem;color:var(--bd3)">Use a preloaded apartment blueprint or upload your own JPG/PNG, then fine-tune the real-world size and offset.</div>
    ${planBounds ? `<div style="background:var(--bg2);border-radius:12px;padding:10px 12px;font-size:.66rem;color:var(--bd2)">
      <strong style="color:var(--pk)">Apartment measurements loaded:</strong> ${planBounds.widthM.toFixed(2)} × ${planBounds.heightM.toFixed(2)} m shell · cellar preset: <strong>Keller 2</strong>
    </div>` : ''}
    ${presets.length ? `<div style="display:grid;gap:6px">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--bd3)">Preloaded blueprint presets</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${presets.map(preset => `<button class="btn sml ${blueprint?.presetId===preset.id ? 'pri' : ''}" onclick="loadPreloadedBlueprintPreset('${preset.id}')">${esc(preset.label)}</button>`).join('')}
      </div>
      <div style="font-size:.62rem;color:var(--bd3)">Apartment presets reuse the seeded room measurements, and the Keller 2 preset adds your cellar room as its own floor.</div>
    </div>` : ''}
    <input id="plan-blueprint-input" type="file" accept="image/*" style="display:none" onchange="uploadPlanBlueprint(this.files?.[0])">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn sml pri" onclick="document.getElementById('plan-blueprint-input')?.click()">🖼️ Upload blueprint</button>
      ${hasFloorBlueprint() ? `<button class="btn sml dan" onclick="removePlanBlueprint()">🗑️ Remove</button>` : ''}
    </div>
    ${hasFloorBlueprint() ? `
      <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:4px">
        <div class="fg"><label>Width (m)</label><input id="bp-width-m" type="number" step="0.1" value="${blueprint.widthM || ''}" onchange="updateBlueprintFromPanel()"></div>
        <div class="fg"><label>Height (m)</label><input id="bp-height-m" type="number" step="0.1" value="${blueprint.heightM || ''}" onchange="updateBlueprintFromPanel()"></div>
        <div class="fg"><label>Offset X (m)</label><input id="bp-x-m" type="number" step="0.1" value="${xM}" onchange="updateBlueprintFromPanel()"></div>
        <div class="fg"><label>Offset Y (m)</label><input id="bp-y-m" type="number" step="0.1" value="${yM}" onchange="updateBlueprintFromPanel()"></div>
        <div class="fg" style="grid-column:1 / -1"><label>Opacity</label><input id="bp-opacity" type="range" min="0.05" max="1" step="0.05" value="${blueprint.opacity || 0.38}" oninput="updateBlueprintFromPanel()"></div>
      </div>
      ${blueprint?.presetLabel ? `<div style="font-size:.62rem;color:var(--bd3)">Active preset: <strong>${esc(blueprint.presetLabel)}</strong></div>` : ''}
      ${activePreset?.note ? `<div style="font-size:.62rem;color:var(--bd3)">${esc(activePreset.note)}</div>` : ''}
      <div style="font-size:.64rem;color:var(--bd3)">Tip: if the overlay looks stretched, fix width and height before drawing the rooms.</div>
    ` : `<div style="font-size:.64rem;color:var(--bd3)">The image stays local in browser storage, so it travels with your plan backup.</div>`}
  </div>`;
}
function renderMeasureTab() {
  const measurement = getMeasurementDetails();
  return `<div style="display:grid;gap:8px">
    <div style="font-size:.68rem;color:var(--bd3)">Use the measure tool on the canvas to check distances on the traced apartment or calibrate a blueprint against a known real-world length.</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn sml ${planTool==='measure' ? 'pri' : ''}" onclick="setPlanTool('measure')">📏 Start measuring</button>
      ${measurement ? `<button class="btn sml dan" onclick="clearMeasurement()">🗑️ Clear line</button>` : ''}
    </div>
    ${measurement ? `
      <div style="background:var(--bg2);border-radius:12px;padding:10px 12px">
        <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--bd3);margin-bottom:4px">Last measurement</div>
        <div style="font-size:.92rem;font-weight:700;color:var(--pk)">${measurement.labelMeters.toFixed(2)} m</div>
        <div style="font-size:.64rem;color:var(--bd3);margin-top:2px">${measurement.px.toFixed(0)} px on canvas · current planner scale reads ${measurement.meters.toFixed(2)} m</div>
      </div>
      <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        <div class="fg"><label>Actual real-world length (m)</label><input id="measure-actual-m" type="number" step="0.01" value="${measurement.labelMeters.toFixed(2)}"></div>
        <div class="fg" style="align-self:end;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn sml" onclick="saveMeasurementReference()">💾 Save reference</button>
          <button class="btn sml pri" onclick="calibrateBlueprintFromMeasurement()" ${hasFloorBlueprint() ? '' : 'disabled'}>🧭 Calibrate blueprint</button>
        </div>
      </div>
      ${hasFloorBlueprint() ? `<div style="font-size:.62rem;color:var(--bd3)">Calibration rescales the active blueprint so this line matches the real-world length you enter.</div>` : `<div style="font-size:.62rem;color:var(--bd3)">Load a blueprint preset or upload an image to use this line for calibration.</div>`}
    ` : `<div style="font-size:.68rem;color:var(--bd3)">No measurement line yet. Drag on the canvas with the measure tool to create one.</div>`}
  </div>`;
}
function renderRoomToolsTab() {
  const room = getSelectedRoom();
  if (!room) {
    return `<div style="font-size:.68rem;color:var(--bd3)">Select a room on the left to edit exact measurements, then use the optimizer to test item combinations.</div>`;
  }
  const occupancy = getRoomOccupancy(room.id);
  return `<div style="display:grid;gap:8px">
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
      <div class="fg" style="grid-column:1 / -1"><label>Room name</label><input id="room-label-edit" value="${esc(room.label || '')}"></div>
      <div class="fg"><label>Width (m)</label><input id="room-width-edit" type="number" step="0.1" value="${(room.w / planState.scale).toFixed(2)}"></div>
      <div class="fg"><label>Depth (m)</label><input id="room-depth-edit" type="number" step="0.1" value="${(room.h / planState.scale).toFixed(2)}"></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn sml pri" onclick="saveRoomMeasurements('${room.id}')">💾 Save measurements</button>
      <button class="btn sml" onclick="switchPlanToolsTab('optimizer')">🧠 Open optimizer</button>
    </div>
    <div style="background:var(--bg2);border-radius:12px;padding:10px 12px">
      <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--bd3);margin-bottom:4px">Capacity</div>
      <div style="font-size:.86rem;font-weight:700;color:var(--pk)">${occupancy?.freeAreaM2.toFixed(2) || '0.00'} m² free</div>
      <div style="font-size:.68rem;color:var(--bd2);margin-top:2px">${occupancy?.occupiedAreaM2.toFixed(2) || '0.00'} m² occupied of ${occupancy?.totalAreaM2.toFixed(2) || '0.00'} m²</div>
      ${progressBar(occupancy?.pct || 0, occupancy?.pct > 80 ? '#dc2626' : 'var(--gn)', '6px')}
    </div>
  </div>`;
}
function renderOptimizerTab() {
  const room = getSelectedRoom();
  if (!room) {
    return `<div style="font-size:.68rem;color:var(--bd3)">Select a room first. Then tick which items are candidates or must-haves and the optimizer will rank the best space-saving setups.</div>`;
  }
  const data = getRoomOptimizerData(room.id);
  const items = data?.items || [];
  return `<div style="display:grid;gap:8px">
    <div style="font-size:.68rem;color:var(--bd3)">Use the same <strong>option group</strong> on alternatives like fridges or sofas. The optimizer tries all group combinations and keeps the setups with the most free space.</div>
    ${items.length ? items.map(item => {
      const fit = getRoomFitAnalysis(item);
      const role = item.roomRole || 'candidate';
      return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--bg2)">
        <div>
          <div style="font-size:.74rem;font-weight:700;color:var(--bd)">${esc(item.name)}</div>
          <div style="font-size:.62rem;color:var(--bd3)">${item.optionGroup ? `🧩 ${esc(item.optionGroup)} · ` : ''}${dimStr(item) || 'Add measurements'}${fit ? ` · ${fit.footprintPct}% room` : ''}</div>
        </div>
        <label style="font-size:.62rem;color:var(--bd2);display:flex;gap:4px;align-items:center"><input type="checkbox" ${role !== 'ignore' ? 'checked' : ''} onchange="toggleRoomOptimizerUse('${item.id}',this.checked)">Use</label>
        <label style="font-size:.62rem;color:var(--bd2);display:flex;gap:4px;align-items:center"><input type="checkbox" ${role === 'must' ? 'checked' : ''} ${role === 'ignore' ? 'disabled' : ''} onchange="toggleRoomOptimizerMust('${item.id}',this.checked)">Must</label>
      </div>`;
    }).join('') : `<div style="font-size:.68rem;color:var(--bd3)">No items assigned to this room yet.</div>`}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn sml" onclick="autoPlaceRoomScenarioInPlan('${room.id}','selected')">📍 Auto-place current picks</button>
      <button class="btn sml pri" onclick="autoPlaceRoomScenarioInPlan('${room.id}','best-space')">✨ Auto-place best free-space setup</button>
      <button class="btn sml" onclick="autoPlaceRoomScenarioInPlan('${room.id}','reuse-first')">📦 Auto-place reuse-first</button>
    </div>
    <div style="display:grid;gap:8px">
      ${(data?.combos || []).map((combo, idx) => `<div style="border:1px solid ${idx===0 ? '#86efac' : 'var(--border)'};background:${idx===0 ? 'var(--gnl)' : 'var(--white)'};border-radius:12px;padding:10px 12px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap">
          <div style="font-size:.76rem;font-weight:700;color:${combo.fits ? 'var(--gns)' : 'var(--pk)'}">${idx===0 ? 'Best free-space setup' : `Alternative ${idx + 1}`}</div>
          <div style="font-size:.68rem;color:var(--bd2)">${combo.fits ? '✅ Fits footprint budget' : '⚠️ Check fit manually'}</div>
        </div>
        <div style="margin-top:4px;font-size:.9rem;font-weight:700;color:var(--pk)">${combo.freeAreaM2.toFixed(2)} m² free</div>
        <div style="font-size:.66rem;color:var(--bd3);margin-top:2px">${combo.footprintM2.toFixed(2)} m² used of ${data.roomAreaM2.toFixed(2)} m²</div>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${combo.selectedItems.map(item => `<span class="chip" style="background:${item.roomRole==='must' ? 'var(--purl)' : 'var(--bg2)'};color:${item.roomRole==='must' ? '#4c1d95' : 'var(--bd2)'}">${esc(item.name)}</span>`).join('') || '<span style="font-size:.64rem;color:var(--bd3)">No candidates selected</span>'}</div>
        ${combo.missingMeasurements ? `<div style="font-size:.62rem;color:#92400e;margin-top:6px">${combo.missingMeasurements} item(s) missing measurements, so this ranking is approximate.</div>` : ''}
      </div>`).join('') || `<div style="font-size:.68rem;color:var(--bd3)">Add items with the same option group to see ranked combinations.</div>`}
    </div>
  </div>`;
}
function renderPlanToolsPanel() {
  const el = document.getElementById('plan-tools-content');
  if (!el) return;
  const tabs = [
    { id:'room', label:'📏 Room' },
    { id:'measure', label:'📐 Measure' },
    { id:'blueprint', label:'🖼️ Blueprint' },
    { id:'optimizer', label:'🧠 Optimizer' },
  ];
  const body = planToolsTab === 'blueprint'
    ? renderBlueprintTab()
    : planToolsTab === 'measure'
      ? renderMeasureTab()
    : planToolsTab === 'optimizer'
      ? renderOptimizerTab()
      : renderRoomToolsTab();
  el.innerHTML = `<div style="display:grid;gap:8px">
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${tabs.map(tab => `<button class="btn sml ${planToolsTab===tab.id ? 'pri' : ''}" onclick="switchPlanToolsTab('${tab.id}')">${tab.label}</button>`).join('')}
    </div>
    ${body}
  </div>`;
}

// ── Plan Item panel: show items for a clicked room ───────────
function showRoomItemsPanel(roomId) {
  const items = ldBuy().filter(it=>it.roomId===roomId);
  const room  = (getFloor().rooms||[]).find(r=>r.id===roomId);
  if (!room||!items.length) return;
  const total = items.reduce((s,it)=>s+(it.price||0),0);
  inlineEdit(
    `${room.label||'Room'} — ${items.length} items (${fmtEur(total,0)})`,
    items.map(it=>it.name).join(', '),
    ()=>switchTab('buy'),
    'Click OK to go to Buy tab'
  );
}

// ── Canvas resize ────────────────────────────────────────────
function resizePlanCanvas() {
  const canvas=document.getElementById('canvas-plan');
  const wrap  =document.getElementById('plan-canvas-wrap');
  if(!canvas||!wrap) return;
  const W=Math.min(900, wrap.offsetWidth||600);
  canvas.width=W; canvas.height=Math.round(W*0.58);
  renderPlan();
}

// ── rPlanUI: called when switching to plan tab ───────────────
function rPlanUI() { syncFurnitureButtons(); renderFloorTabs(); renderPlan(); rPlanSidebar(); }

// ── Place a buy item in floor plan ───────────────────────────
function getPlanPlacementZone(item) {
  return String(item?.placementZone || '').trim();
}

function clampPlacementCm(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAnchoredPlacementForZone(zone, slotIndex, roomWidthCm, roomDepthCm, widthCm, depthCm, paddingCm, gapCm) {
  const minX = paddingCm;
  const maxX = Math.max(paddingCm, roomWidthCm - paddingCm - widthCm);
  const minY = paddingCm;
  const maxY = Math.max(paddingCm, roomDepthCm - paddingCm - depthCm);
  const step = Math.max(10, gapCm);
  const offset = slotIndex * step;
  if (zone === 'top-left') {
    return { xCm: clampPlacementCm(minX + offset, minX, maxX), yCm: clampPlacementCm(minY + offset, minY, maxY) };
  }
  if (zone === 'top-right') {
    return { xCm: clampPlacementCm(maxX - offset, minX, maxX), yCm: clampPlacementCm(minY + offset, minY, maxY) };
  }
  if (zone === 'bottom-left') {
    return { xCm: clampPlacementCm(minX + offset, minX, maxX), yCm: clampPlacementCm(maxY - offset, minY, maxY) };
  }
  if (zone === 'bottom-right') {
    return { xCm: clampPlacementCm(maxX - offset, minX, maxX), yCm: clampPlacementCm(maxY - offset, minY, maxY) };
  }
  if (zone === 'top-wall') {
    return { xCm: clampPlacementCm(minX + offset, minX, maxX), yCm: minY };
  }
  if (zone === 'bottom-wall') {
    return { xCm: clampPlacementCm(minX + offset, minX, maxX), yCm: maxY };
  }
  if (zone === 'left-wall') {
    return { xCm: minX, yCm: clampPlacementCm(minY + offset, minY, maxY) };
  }
  if (zone === 'right-wall') {
    return { xCm: maxX, yCm: clampPlacementCm(minY + offset, minY, maxY) };
  }
  if (zone === 'center') {
    const swing = Math.ceil(slotIndex / 2) * step;
    const xShift = slotIndex === 0 ? 0 : (slotIndex % 2 ? swing : -swing);
    const yShift = slotIndex === 0 ? 0 : (slotIndex % 2 ? -Math.max(8, Math.round(step / 2)) : Math.max(8, Math.round(step / 2)));
    return {
      xCm: clampPlacementCm(((roomWidthCm - widthCm) / 2) + xShift, minX, maxX),
      yCm: clampPlacementCm(((roomDepthCm - depthCm) / 2) + yShift, minY, maxY)
    };
  }
  return null;
}

function getAutoLayoutPlacementsForRoom(room, items) {
  const roomWidthCm = Math.max(80, Math.round((room.w / planState.scale) * 100));
  const roomDepthCm = Math.max(80, Math.round((room.h / planState.scale) * 100));
  const paddingCm = 18;
  const gapCm = 14;
  let cursorX = paddingCm;
  let cursorY = paddingCm;
  let rowDepth = 0;
  const zoneCounts = {};
  return [...items]
    .filter(item => item.widthCm || item.depthCm)
    .sort((a, b) => {
      const zoneA = getPlanPlacementZone(a) ? 1 : 0;
      const zoneB = getPlanPlacementZone(b) ? 1 : 0;
      if (zoneA !== zoneB) return zoneB - zoneA;
      return getItemFootprintSqm(b) - getItemFootprintSqm(a);
    })
    .map(item => {
      let widthCm = Number(item.widthCm) || Number(item.depthCm) || 60;
      let depthCm = Number(item.depthCm) || Number(item.widthCm) || 60;
      let rotated = false;
      const zone = getPlanPlacementZone(item);
      const usableWidth = roomWidthCm - (paddingCm * 2);
      const usableDepth = roomDepthCm - (paddingCm * 2);
      const canNormal = widthCm <= usableWidth && depthCm <= usableDepth;
      const canRotated = depthCm <= usableWidth && widthCm <= usableDepth;
      if (!canNormal && canRotated) {
        [widthCm, depthCm] = [depthCm, widthCm];
        rotated = true;
      }
      if (zone) {
        const slotIndex = zoneCounts[zone] || 0;
        zoneCounts[zone] = slotIndex + 1;
        const anchored = getAnchoredPlacementForZone(zone, slotIndex, roomWidthCm, roomDepthCm, widthCm, depthCm, paddingCm, gapCm);
        if (anchored) {
          return { item, xCm: anchored.xCm, yCm: anchored.yCm, widthCm, depthCm, rotated };
        }
      }
      if (cursorX + widthCm > roomWidthCm - paddingCm && cursorX > paddingCm) {
        cursorX = paddingCm;
        cursorY += rowDepth + gapCm;
        rowDepth = 0;
      }
      if (cursorY + depthCm > roomDepthCm - paddingCm && !rotated && canRotated) {
        [widthCm, depthCm] = [depthCm, widthCm];
        rotated = true;
      }
      const maxX = Math.max(paddingCm, roomWidthCm - paddingCm - widthCm);
      const maxY = Math.max(paddingCm, roomDepthCm - paddingCm - depthCm);
      const xCm = Math.min(cursorX, maxX);
      const yCm = Math.min(cursorY, maxY);
      cursorX = xCm + widthCm + gapCm;
      rowDepth = Math.max(rowDepth, depthCm);
      return { item, xCm, yCm, widthCm, depthCm, rotated };
    });
}

function getPlanScenarioItemsForRoom(roomId, mode = 'selected') {
  if (mode === 'best-space') {
    return getRoomOptimizerData(roomId)?.combos?.[0]?.selectedItems || [];
  }
  return typeof getRoomScenarioSelection === 'function'
    ? getRoomScenarioSelection(roomId, mode)
    : ldBuy().filter(item => item.roomId === roomId);
}

function autoPlaceRoomScenarioInPlan(roomId, mode = 'selected', options = {}) {
  const { silent = false, skipRefresh = false } = options;
  const roomRecord = getRoomRecord(roomId);
  const room = roomRecord?.room;
  const floor = roomRecord?.floor;
  if (!room || !floor) {
    if (!silent) toast('Room not found on the floor plan', 'warn');
    return false;
  }
  const placements = getAutoLayoutPlacementsForRoom(room, getPlanScenarioItemsForRoom(roomId, mode)
    .filter(item => normalizeMoveDecision(item.source, item.moveDecision) !== 'skip'));
  if (!placements.length) {
    if (!silent) toast('No measured items available for auto-placement in this room', 'warn');
    return false;
  }
  const floorIndex = planState.floors.findIndex(entry => entry.id === floor.id);
  if (floorIndex >= 0) planState.activeFloor = floorIndex;
  const keepIds = new Set(placements.map(entry => entry.item.id));
  ldBuy()
    .filter(item => item.roomId === roomId && item.planFloor === floor.id && !keepIds.has(item.id))
    .forEach(item => {
      item.placedInPlan = false;
      item.planFloor = '';
      updBuyItem(item);
    });
  placements.forEach(entry => {
    const item = entry.item;
    item.placedInPlan = true;
    item.planFloor = floor.id;
    item.planRotated = entry.rotated;
    item.planX = room.x + ((entry.xCm / 100) * planState.scale);
    item.planY = room.y + ((entry.yCm / 100) * planState.scale);
    updBuyItem(item);
  });
  if (!skipRefresh) {
    savePlan();
    if (typeof switchTab === 'function') switchTab('plan');
    renderPlan();
    rPlanSidebar();
    if (!silent) toast(`Auto-placed ${placements.length} item${placements.length !== 1 ? 's' : ''} in ${room.label || 'room'}`, 'green');
  }
  return true;
}

function autoPlaceWholeHomeInPlan(mode = 'selected') {
  const roomIds = [...new Set(ldBuy().map(item => item.roomId).filter(Boolean))];
  let placedRooms = 0;
  roomIds.forEach(roomId => {
    if (autoPlaceRoomScenarioInPlan(roomId, mode, { silent: true, skipRefresh: true })) placedRooms += 1;
  });
  savePlan();
  if (typeof switchTab === 'function') switchTab('plan');
  renderPlan();
  rPlanSidebar();
  toast(
    placedRooms
      ? `Auto-placed ${placedRooms} room setup${placedRooms !== 1 ? 's' : ''} using ${mode === 'best-space' ? 'best free-space' : mode} mode`
      : 'No measured room setups were available for auto-placement',
    placedRooms ? 'green' : 'warn',
    3200
  );
}

function placeItemInPlan(itemId) {
  const it=getBuyItem(itemId); if(!it) return;
  if(!it.roomId) { toast('Link item to a room first','warn'); return; }
  // Find room, place item near center
  const fl=getFloor();
  const room=(fl.rooms||[]).find(r=>r.id===it.roomId);
  if (!room) { toast('Room not found on this floor — switch floors or link to another room','warn'); return; }
  const wPx=(it.widthCm||60)/100*planState.scale;
  const dPx=(it.depthCm||60)/100*planState.scale;
  const preferredZone = getPlanPlacementZone(it);
  const preferredPlacement = preferredZone ? getAutoLayoutPlacementsForRoom(room, [it])[0] : null;
  it.placedInPlan=true;
  it.planX = preferredPlacement
    ? room.x + ((preferredPlacement.xCm / 100) * planState.scale)
    : room.x + (room.w-wPx)/2;
  it.planY = preferredPlacement
    ? room.y + ((preferredPlacement.yCm / 100) * planState.scale)
    : room.y + (room.h-dPx)/2;
  it.planFloor=fl.id;
  it.planRotated=Boolean(preferredPlacement?.rotated);
  updBuyItem(it);
  switchTab('plan');
  toast(it.name+' placed in floor plan 🏠','green');
  renderPlan();
  rPlanSidebar();
}

// ── Measurement flow ────────────────────────────────────────
let _measFlowQueue = [];
let _measFlowIdx = 0;

function openMeasureRoom(roomId) {
  const fl = getFloor();
  const r = (fl.rooms || []).find(x => x.id === roomId);
  if (!r) return;
  const sc = planState.scale;
  const nameEl = document.getElementById('measure-room-name');
  if (nameEl) nameEl.textContent = (r.emoji || '') + ' ' + (r.label || 'Room');
  fSet('meas-width', (r.w / sc).toFixed(2));
  fSet('meas-depth', (r.h / sc).toFixed(2));
  fSet('meas-room-id', roomId);
  const preview = document.getElementById('meas-area-preview');
  if (preview) preview.textContent = '';
  const progEl = document.getElementById('meas-flow-progress');
  if (progEl) progEl.textContent = _measFlowQueue.length > 0
    ? `Room ${_measFlowIdx + 1} of ${_measFlowQueue.length}`
    : '';
  const nextBtn = document.getElementById('meas-next-btn');
  if (nextBtn) nextBtn.style.display = (_measFlowQueue.length > 0 && _measFlowIdx < _measFlowQueue.length - 1) ? '' : 'none';
  openModal('measure-room-modal');
}

function updateMeasPreview() {
  const w = fNum('meas-width'), d = fNum('meas-depth');
  const el = document.getElementById('meas-area-preview');
  if (el && w > 0 && d > 0) el.textContent = '= ' + (w * d).toFixed(1) + ' m²';
}

function saveMeasureRoom() {
  const roomId = fVal('meas-room-id');
  const fl = getFloor();
  const r = (fl.rooms || []).find(x => x.id === roomId);
  if (!r) return;
  const wM = fNum('meas-width'), dM = fNum('meas-depth');
  if (wM <= 0 || dM <= 0) { toast('Enter valid measurements', 'red'); return; }
  const sc = planState.scale;
  r.w = Math.round(wM * sc);
  r.h = Math.round(dM * sc);
  r.area = Number((wM * dM).toFixed(2));
  // Check if all rooms on this floor are now measured
  const unmeasured = fl.rooms.filter(rm => !rm.area || rm.area === 0).length;
  if (unmeasured === 0) fl.needsMeasurements = false;
  savePlan(); renderPlan(); rPlanSidebar();
  toast((r.label || 'Room') + ' measured ✅', 'green');
  // Flow mode: advance to next
  if (_measFlowQueue.length > 0 && _measFlowIdx < _measFlowQueue.length - 1) {
    _measFlowIdx++;
    openMeasureRoom(_measFlowQueue[_measFlowIdx]);
  } else {
    closeModal('measure-room-modal');
    _measFlowQueue = [];
    _measFlowIdx = 0;
  }
}

function startMeasurementFlow() {
  const fl = getFloor();
  _measFlowQueue = (fl.rooms || []).filter(r => !r.area || r.area === 0).map(r => r.id);
  _measFlowIdx = 0;
  if (!_measFlowQueue.length) { toast('All rooms are measured!', 'green'); return; }
  openMeasureRoom(_measFlowQueue[0]);
}
