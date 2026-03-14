// ============================================================
// plan.js — Unser neues Zuhause · Floor Plan Canvas Tool
// ============================================================

let planState = {
  floors: [{ id: 'f1', name: 'Erdgeschoss', rooms: [], furniture: [] }],
  activeFloor: 0,
  scale: 30,        // px per meter
};
let planTool     = 'select';
let furnType     = 'sofa';
let selected     = null;    // id of selected room/furniture
let dragging     = null;    // object being dragged
let dragOff      = { x: 0, y: 0 };
let drawStart    = null;
let drawCurrent  = null;
let resizing     = null;    // { obj, handle }
let undoStack    = [];
let redoStack    = [];
const MAX_UNDO   = 30;
let roomColorIdx = 0;

const ROOM_COLORS_CYCLE = ['#fce4ec','#e3f2fd','#e8f5e9','#fff3e0','#f3e5f5','#e0f7fa','#fff9c4','#ffe0b2','#e8eaf6','#fce4ec'];

// ---- Init ----
function initPlan() {
  const saved = ldPlan();
  if (saved && saved.floors) {
    planState.floors  = saved.floors;
    planState.scale   = saved.scale || 30;
    planState.activeFloor = saved.activeFloor || 0;
  }
  const canvas = document.getElementById('canvas-plan');
  if (!canvas) return;
  setupCanvasListeners(canvas);
  resizePlanCanvas();
  window.addEventListener('resize', resizePlanCanvas);
}

function savePlanState() {
  svPlan({ floors: planState.floors, scale: planState.scale, activeFloor: planState.activeFloor });
  pushUndo();
}

function pushUndo() {
  undoStack.push(JSON.stringify(planState.floors));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  redoStack = [];
}

function undoPlan() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(planState.floors));
  planState.floors = JSON.parse(undoStack.pop());
  svPlan({ floors: planState.floors, scale: planState.scale });
  renderPlan();
  toast('Rückgängig ↺', 'info');
}

function redoPlan() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(planState.floors));
  planState.floors = JSON.parse(redoStack.pop());
  svPlan({ floors: planState.floors, scale: planState.scale });
  renderPlan();
  toast('Wiederherstellen ↻', 'info');
}

function getFloor() { return planState.floors[planState.activeFloor] || planState.floors[0]; }

// ---- Canvas setup ----
function setupCanvasListeners(canvas) {
  canvas.addEventListener('mousedown',  e => onPlanDown(e, canvas));
  canvas.addEventListener('mousemove',  e => onPlanMove(e, canvas));
  canvas.addEventListener('mouseup',    e => onPlanUp(e, canvas));
  canvas.addEventListener('dblclick',   e => onPlanDbl(e, canvas));
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onPlanDown(e, canvas); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onPlanMove(e, canvas); }, { passive: false });
  canvas.addEventListener('touchend',   e => { e.preventDefault(); onPlanUp(e, canvas); }, { passive: false });
  canvas.addEventListener('contextmenu',e => { e.preventDefault(); onPlanRight(e, canvas); });
  // Keyboard on canvas focus
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('keydown', e => {
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
    if (e.key === 'ArrowRight') nudgeSelected(5, 0);
    if (e.key === 'ArrowLeft')  nudgeSelected(-5, 0);
    if (e.key === 'ArrowUp')    nudgeSelected(0, -5);
    if (e.key === 'ArrowDown')  nudgeSelected(0, 5);
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undoPlan(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redoPlan(); }
  });
}

function getPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - r.left, y: t.clientY - r.top };
}

function snap(v) {
  const s = Math.max(5, Math.round(planState.scale / 4));
  return Math.round(v / s) * s;
}

function hitTestItems(items, pos) {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (pos.x >= it.x && pos.x <= it.x + it.w && pos.y >= it.y && pos.y <= it.y + it.h) return it;
  }
  return null;
}

function onPlanDown(e, canvas) {
  const pos = getPos(e, canvas);
  const floor = getFloor();

  if (planTool === 'room') {
    drawStart = { x: snap(pos.x), y: snap(pos.y) };
    drawCurrent = { ...drawStart };

  } else if (planTool === 'furn') {
    const fc = FURNITURE[furnType];
    if (!fc) return;
    const fw = fc.w * planState.scale, fh = fc.h * planState.scale;
    const newF = {
      id: uid(), type: furnType,
      x: snap(pos.x - fw / 2), y: snap(pos.y - fh / 2),
      w: fw, h: fh,
      emoji: fc.emoji, label: fc.l, color: fc.color,
      rotation: 0
    };
    floor.furniture.push(newF);
    selected = newF.id;
    savePlanState(); renderPlan();
    toast(fc.l + ' platziert!', 'info', 1500);

  } else if (planTool === 'select') {
    const hitF = hitTestItems(floor.furniture, pos);
    const hitR = hitTestItems(floor.rooms, pos);
    const hit  = hitF || hitR;
    selected = hit ? hit.id : null;
    if (hit) { dragging = hit; dragOff = { x: pos.x - hit.x, y: pos.y - hit.y }; }
    renderPlan(); updateRoomSidebar();

  } else if (planTool === 'erase') {
    const all = [...floor.furniture, ...floor.rooms];
    const hit = hitTestItems(all, pos);
    if (hit) {
      floor.rooms     = floor.rooms.filter(r => r.id !== hit.id);
      floor.furniture = floor.furniture.filter(f => f.id !== hit.id);
      selected = null; savePlanState(); renderPlan(); updateRoomSidebar();
    }
  } else if (planTool === 'paint') {
    const hit = hitTestItems(floor.rooms, pos);
    if (hit) {
      hit.color = document.getElementById('plan-paint-color')?.value || '#fce4ec';
      savePlanState(); renderPlan();
    }
  }
}

function onPlanMove(e, canvas) {
  const pos = getPos(e, canvas);
  if (planTool === 'room' && drawStart) {
    drawCurrent = { x: pos.x, y: pos.y };
    renderPlan();
  } else if (planTool === 'select' && dragging) {
    dragging.x = snap(pos.x - dragOff.x);
    dragging.y = snap(pos.y - dragOff.y);
    renderPlan();
  }
}

function onPlanUp(e, canvas) {
  if (planTool === 'room' && drawStart && drawCurrent) {
    const x1 = Math.min(drawStart.x, drawCurrent.x), y1 = Math.min(drawStart.y, drawCurrent.y);
    const x2 = Math.max(drawStart.x, drawCurrent.x), y2 = Math.max(drawStart.y, drawCurrent.y);
    const w = snap(x2 - x1), h = snap(y2 - y1);
    if (w > planState.scale * 0.5 && h > planState.scale * 0.5) {
      const roomType = ROOM_TYPES[roomColorIdx % ROOM_TYPES.length];
      roomColorIdx++;
      const room = { id: uid(), x: x1, y: y1, w, h, label: 'Raum', color: roomType.color };
      getFloor().rooms.push(room);
      selected = room.id;
      savePlanState(); updateRoomSidebar();
    }
    drawStart = null; drawCurrent = null; renderPlan();
  } else if (planTool === 'select' && dragging) {
    savePlanState(); dragging = null;
  }
}

function onPlanDbl(e, canvas) {
  const pos = getPos(e, canvas);
  const floor = getFloor();
  const all = [...floor.furniture, ...floor.rooms];
  const hit = hitTestItems(all, pos);
  if (hit) {
    inlineEdit('Name / Label', hit.label || '', v => {
      hit.label = v; savePlanState(); renderPlan(); updateRoomSidebar();
    });
  }
}

function onPlanRight(e, canvas) {
  const pos = getPos(e, canvas);
  const floor = getFloor();
  const hitF = hitTestItems(floor.furniture, pos);
  if (hitF) {
    rotateFurniture(hitF.id, 90);
  }
}

// ---- Tool management ----
function setPlanTool(t) {
  planTool = t;
  document.querySelectorAll('.ptool').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('tool-' + t);
  if (btn) btn.classList.add('active');
  const canvas = document.getElementById('canvas-plan');
  if (canvas) {
    const cursors = { select:'default', room:'crosshair', furn:'cell', erase:'not-allowed', paint:'cell' };
    canvas.style.cursor = cursors[t] || 'default';
  }
  document.getElementById('furn-bar').style.display = (t === 'furn') ? 'flex' : 'none';
  const tips = {
    select: 'Klicken = auswählen · Ziehen = verschieben · Doppelklick = umbenennen · Del = löschen · Pfeiltasten = fine-tune · Rechtsklick = drehen',
    room:   'Ziehen = Raum zeichnen · Doppelklick = umbenennen',
    furn:   'Klicken = Möbel platzieren · Rechtsklick auf Möbel = drehen (90°)',
    erase:  'Klicken = Raum oder Möbel löschen',
    paint:  'Klicken auf Raum = Farbe ändern',
  };
  const statusEl = document.getElementById('plan-status');
  if (statusEl) statusEl.textContent = '💡 ' + (tips[t] || '');
}

function selectFurnType(type) {
  furnType = type;
  document.querySelectorAll('.furn-btn').forEach(b => b.classList.toggle('active', b.dataset.furn === type));
}

// ---- Actions ----
function deleteSelected() {
  if (!selected) return;
  const floor = getFloor();
  floor.rooms     = floor.rooms.filter(r => r.id !== selected);
  floor.furniture = floor.furniture.filter(f => f.id !== selected);
  selected = null; savePlanState(); renderPlan(); updateRoomSidebar();
}

function nudgeSelected(dx, dy) {
  const floor = getFloor();
  const all = [...floor.rooms, ...floor.furniture];
  const it = all.find(x => x.id === selected);
  if (it) { it.x += dx; it.y += dy; savePlanState(); renderPlan(); }
}

function rotateFurniture(id, deg) {
  const floor = getFloor();
  const f = floor.furniture.find(x => x.id === id);
  if (f) {
    f.rotation = ((f.rotation || 0) + deg) % 360;
    // swap w/h for 90° increments
    if (deg % 90 === 0 && deg % 180 !== 0) { const tmp = f.w; f.w = f.h; f.h = tmp; }
    savePlanState(); renderPlan();
  }
}

function clearFloor() {
  confirmDialog('Alle Elemente auf diesem Stockwerk löschen?', () => {
    getFloor().rooms = []; getFloor().furniture = []; selected = null;
    savePlanState(); renderPlan(); updateRoomSidebar();
    toast('Stockwerk geleert', 'warn');
  });
}

function clearAllFloors() {
  confirmDialog('ALLES löschen (alle Stockwerke)?', () => {
    planState.floors.forEach(f => { f.rooms = []; f.furniture = []; });
    selected = null; savePlanState(); renderPlan(); updateRoomSidebar();
    toast('Alles gelöscht', 'warn');
  });
}

function setPlanScale() {
  planState.scale = parseInt(document.getElementById('plan-scale').value) || 30;
  savePlanState(); renderPlan();
}

// ---- Multi-floor management ----
function addFloor() {
  const name = prompt('Stockwerk-Name:', 'Obergeschoss ' + planState.floors.length);
  if (!name) return;
  planState.floors.push({ id: uid(), name, rooms: [], furniture: [] });
  savePlanState();
  renderFloorTabs();
}

function switchFloor(idx) {
  planState.activeFloor = idx;
  selected = null;
  savePlanState();
  renderFloorTabs();
  renderPlan();
  updateRoomSidebar();
}

function renderFloorTabs() {
  const el = document.getElementById('floor-tabs');
  if (!el) return;
  el.innerHTML = planState.floors.map((fl, i) =>
    `<button class="floor-tab ${i === planState.activeFloor ? 'active' : ''}" onclick="switchFloor(${i})">${esc(fl.name)}</button>`
  ).join('') + `<button class="floor-tab add-floor" onclick="addFloor()">+ Stockwerk</button>`;
}

// ---- RENDER ----
function renderPlan() {
  const canvas = document.getElementById('canvas-plan');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);

  // Grid
  if (document.getElementById('plan-grid')?.checked !== false) {
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += planState.scale) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += planState.scale) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  // Scale indicator (bottom left)
  const sc = planState.scale;
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(8, H - 10); ctx.lineTo(8 + sc, H - 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, H - 14); ctx.lineTo(8, H - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8 + sc, H - 14); ctx.lineTo(8 + sc, H - 6); ctx.stroke();
  ctx.fillStyle = '#888'; ctx.font = '10px Calibri'; ctx.textAlign = 'center';
  ctx.fillText('1 m', 8 + sc / 2, H - 14);

  const floor = getFloor();

  // Rooms
  floor.rooms.forEach(r => {
    ctx.fillStyle = r.color || '#fce4ec';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    // Border
    ctx.strokeStyle = r.id === selected ? '#e91e63' : '#9e9e9e';
    ctx.lineWidth = r.id === selected ? 2.5 : 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    // Label
    const fontSize = Math.min(16, Math.max(9, Math.min(r.w, r.h) * 0.18));
    ctx.fillStyle = '#333'; ctx.font = `bold ${fontSize}px Calibri`; ctx.textAlign = 'center';
    ctx.fillText(r.label || 'Raum', r.x + r.w / 2, r.y + r.h / 2 + fontSize * 0.35);
    // Dimensions (m)
    const wm = (r.w / sc).toFixed(1) + 'm';
    const hm = (r.h / sc).toFixed(1) + 'm';
    ctx.fillStyle = '#777'; ctx.font = '9px Calibri'; ctx.textAlign = 'center';
    ctx.fillText(wm, r.x + r.w / 2, r.y + r.h - 3);
    ctx.save();
    ctx.translate(r.x + 9, r.y + r.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(hm, 0, 0);
    ctx.restore();
    // Area
    const area = ((r.w / sc) * (r.h / sc)).toFixed(1);
    if (r.w > 60 && r.h > 60) {
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '8px Calibri'; ctx.textAlign = 'center';
      ctx.fillText(area + ' m²', r.x + r.w / 2, r.y + r.h / 2 + fontSize * 0.35 + fontSize + 3);
    }
    // Selection handles
    if (r.id === selected) {
      [[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].forEach(([hx,hy]) => {
        ctx.fillStyle = '#e91e63'; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI*2); ctx.fill();
      });
    }
  });

  // Drawing preview
  if (drawStart && drawCurrent) {
    const x1 = Math.min(drawStart.x, drawCurrent.x), y1 = Math.min(drawStart.y, drawCurrent.y);
    const x2 = Math.max(drawStart.x, drawCurrent.x), y2 = Math.max(drawStart.y, drawCurrent.y);
    ctx.fillStyle = 'rgba(233,30,99,.1)'; ctx.fillRect(x1, y1, x2-x1, y2-y1);
    ctx.strokeStyle = '#e91e63'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.strokeRect(x1, y1, x2-x1, y2-y1); ctx.setLineDash([]);
    const dw = ((x2-x1)/sc).toFixed(1), dh = ((y2-y1)/sc).toFixed(1);
    ctx.fillStyle = '#e91e63'; ctx.font = 'bold 11px Calibri'; ctx.textAlign = 'center';
    ctx.fillText(dw + ' × ' + dh + ' m', x1 + (x2-x1)/2, y1 - 6);
  }

  // Furniture
  floor.furniture.forEach(f => {
    ctx.save();
    if (f.rotation) {
      ctx.translate(f.x + f.w/2, f.y + f.h/2);
      ctx.rotate(f.rotation * Math.PI / 180);
      ctx.translate(-f.w/2, -f.h/2);
    } else {
      ctx.translate(f.x, f.y);
    }
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,.1)'; ctx.shadowBlur = 4;
    ctx.fillStyle = f.color || 'rgba(255,255,255,.92)';
    ctx.fillRect(0, 0, f.w, f.h);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = (f.id === selected) ? '#e91e63' : '#bdbdbd';
    ctx.lineWidth = f.id === selected ? 2 : 1;
    ctx.strokeRect(0, 0, f.w, f.h);
    // Emoji
    const efs = Math.min(f.w, f.h) * 0.6;
    ctx.font = Math.max(10, efs) + 'px serif';
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.75)';
    ctx.fillText(f.emoji || '📦', f.w/2, f.h/2 + efs * 0.35);
    // Label
    if (f.w > 40) {
      const lfs = Math.min(9, f.w / 8);
      ctx.fillStyle = '#666'; ctx.font = lfs + 'px Calibri'; ctx.textAlign = 'center';
      ctx.fillText(trunc(f.label, 16), f.w/2, f.h - 2);
    }
    ctx.restore();
    // Selection overlay
    if (f.id === selected) {
      ctx.strokeStyle = '#e91e63'; ctx.lineWidth = 2.5;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
    }
  });
}

// ---- Room sidebar ----
function updateRoomSidebar() {
  const el = document.getElementById('room-sidebar');
  if (!el) return;
  const floor = getFloor();
  if (!floor.rooms.length) { el.innerHTML = '<div style="color:#bbb;font-size:.72rem;text-align:center;padding:10px">Noch keine Räume</div>'; return; }
  const sc = planState.scale;
  el.innerHTML = floor.rooms.map(r => {
    const area = ((r.w/sc) * (r.h/sc)).toFixed(1);
    const fw   = (r.w/sc).toFixed(1), fh = (r.h/sc).toFixed(1);
    return `<div class="room-item ${r.id === selected ? 'active' : ''}" onclick="selectRoom('${r.id}')">
      <span class="room-swatch" style="background:${r.color||'#fce4ec'}"></span>
      <div class="room-info">
        <div class="room-name">${esc(r.label||'Raum')}</div>
        <div class="room-dim">${fw} × ${fh} m · ${area} m²</div>
      </div>
      <button class="btn sml ico" title="Umbenennen" onclick="event.stopPropagation();renameRoom('${r.id}')">✏️</button>
      <button class="btn sml ico" title="Löschen" onclick="event.stopPropagation();deleteRoom('${r.id}')">🗑️</button>
    </div>`;
  }).join('');
  // Furniture count
  if (floor.furniture.length) {
    el.innerHTML += `<div style="font-size:.65rem;color:#aaa;padding:6px 4px;border-top:1px solid #eee;margin-top:6px">${floor.furniture.length} Möbel platziert</div>`;
  }
}

function selectRoom(id) {
  selected = id;
  renderPlan(); updateRoomSidebar();
}
function renameRoom(id) {
  const r = getFloor().rooms.find(x => x.id === id);
  if (!r) return;
  inlineEdit('Raum benennen', r.label, v => { r.label = v; savePlanState(); renderPlan(); updateRoomSidebar(); });
}
function deleteRoom(id) {
  getFloor().rooms = getFloor().rooms.filter(r => r.id !== id);
  if (selected === id) selected = null;
  savePlanState(); renderPlan(); updateRoomSidebar();
}

// ---- Export ----
function downloadPlan() {
  const canvas = document.getElementById('canvas-plan');
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = 'grundriss_' + todayISO() + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('Grundriss gespeichert 📸', 'green');
}

// ---- Resize canvas ----
function resizePlanCanvas() {
  const canvas = document.getElementById('canvas-plan');
  const wrap   = document.getElementById('plan-canvas-wrap');
  if (!canvas || !wrap) return;
  const W = Math.min(900, wrap.offsetWidth || 600);
  canvas.width  = W;
  canvas.height = Math.round(W * 0.6);
  renderPlan();
}

// ---- rPlanUI: render the plan tab UI ----
function rPlanUI() {
  renderFloorTabs();
  renderPlan();
  updateRoomSidebar();
}
