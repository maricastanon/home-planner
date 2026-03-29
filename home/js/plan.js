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
let undoStack = [];
let redoStack = [];
let hoveredRoom = null;
let roomColorIdx = 0;
let lastSavedPlanSnapshot = '';
const PLAN_SCHEMA_VERSION = PRELOADED_PLAN?._planVersion || 1;

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
  const all = [...(fl.rooms||[]),...(fl.furniture||[])];
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
  const canRotate = Boolean(getSelectedFurniture());
  rotateBtn.disabled = !canRotate;
  rotateBtn.title = canRotate ? 'Rotate selected furniture 90° (R)' : 'Select a furniture item to rotate';
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
  const item = getSelectedFurniture();
  if (!item) {
    toast(selected ? 'Only furniture can be rotated' : 'Select furniture to rotate first','warn');
    return false;
  }
  return rotateFurniture(item);
}

function onPlanDown(e, canvas) {
  canvas.focus({ preventScroll:true });
  const pos = getPos(e, canvas);
  const fl  = getFloor();
  if (planTool==='room') {
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
    if (hit) { dragging=hit; dragOff={x:pos.x-hit.x,y:pos.y-hit.y}; }
    renderPlan(); rPlanSidebar();
  } else if (planTool==='erase') {
    const hit = hitAll(pos);
    if (hit) {
      fl.rooms     = (fl.rooms||[]).filter(r=>r.id!==hit.id);
      fl.furniture = (fl.furniture||[]).filter(f=>f.id!==hit.id);
      selected=null; savePlan(); renderPlan(); rPlanSidebar();
    }
  } else if (planTool==='paint') {
    const hit = (fl.rooms||[]).slice().reverse().find(r=>pos.x>=r.x&&pos.x<=r.x+r.w&&pos.y>=r.y&&pos.y<=r.y+r.h);
    if (hit) { hit.color=document.getElementById('plan-paint-color')?.value||'#fce4ec'; savePlan(); renderPlan(); }
  }
}
function onPlanMove(e, canvas) {
  const pos = getPos(e, canvas);
  if (planTool==='room'&&drawStart) { drawCurrent={x:pos.x,y:pos.y}; renderPlan(); }
  else if (planTool==='select'&&dragging) { dragging.x=snap(pos.x-dragOff.x); dragging.y=snap(pos.y-dragOff.y); renderPlan(); }
  else {
    // hover detection for room tooltip
    const fl = getFloor();
    const hov = (fl.rooms||[]).slice().reverse().find(r=>pos.x>=r.x&&pos.x<=r.x+r.w&&pos.y>=r.y&&pos.y<=r.y+r.h);
    if ((hov?.id||null) !== hoveredRoom) { hoveredRoom = hov?.id||null; renderPlan(); }
  }
}
function onPlanUp(e, canvas) {
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
  } else if (planTool==='select'&&dragging) { savePlan(); dragging=null; }
}
function onPlanDbl(e, canvas) {
  const pos=getPos(e,canvas); const hit=hitAll(pos);
  if (hit) inlineEdit('Label', hit.label||'', v=>{ hit.label=v; savePlan(); renderPlan(); rPlanSidebar(); });
}
function onPlanRight(e, canvas) {
  const pos=getPos(e,canvas);
  const fl=getFloor();
  const hit=(fl.furniture||[]).slice().reverse().find(f=>pos.x>=f.x&&pos.x<=f.x+f.w&&pos.y>=f.y&&pos.y<=f.y+f.h);
  if (hit) {
    selected = hit.id;
    rotateFurniture(hit);
  }
}

// ── Tools ────────────────────────────────────────────────────
function setPlanTool(t) {
  planTool = t;
  document.querySelectorAll('.ptool').forEach(b=>b.classList.remove('active'));
  document.getElementById('tool-'+t)?.classList.add('active');
  const canvas=document.getElementById('canvas-plan');
  if (canvas) {
    const curs={select:'default',room:'crosshair',furn:'cell',erase:'not-allowed',paint:'cell'};
    canvas.style.cursor=curs[t]||'default';
  }
  document.getElementById('furn-bar').style.display = t==='furn' ? 'flex' : 'none';
  const tips={
    select: 'Click to select · Drag to move · Dbl-click to rename · Del to delete · Rotate button or R key rotates furniture',
    room:   'Drag to draw a room · Dbl-click to rename',
    furn:   'Click to place furniture · Select placed furniture, then rotate with button or R',
    erase:  'Click to delete room or furniture',
    paint:  'Click a room to change its colour',
  };
  document.getElementById('plan-status').textContent = '💡 ' + (tips[t]||'');
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
  fl.rooms     = (fl.rooms||[]).filter(r=>r.id!==selected);
  fl.furniture = (fl.furniture||[]).filter(f=>f.id!==selected);
  selected=null; savePlan(); renderPlan(); rPlanSidebar();
}
function nudge(dx,dy) {
  const fl=getFloor(); const all=[...(fl.rooms||[]),...(fl.furniture||[])];
  const it=all.find(x=>x.id===selected);
  if(it){it.x+=dx;it.y+=dy;savePlan();renderPlan();}
}
function setPlanScale() {
  planState.scale=parseInt(document.getElementById('plan-scale').value)||45;
  savePlan(); renderPlan();
}
function clearFloor() {
  confirmDlg('Delete all elements on this floor?', ()=>{
    getFloor().rooms=[]; getFloor().furniture=[]; selected=null;
    savePlan(); renderPlan(); rPlanSidebar(); toast('Floor cleared','warn');
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
    ctx.fillStyle = r.color||'#fce4ec';
    ctx.fillRect(r.x,r.y,r.w,r.h);
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
      ctx.fillStyle='rgba(15,23,42,.3)'; ctx.font='7px sans-serif'; ctx.textAlign='center';
      ctx.fillText(area+' m²', r.x+r.w/2, r.y+r.h/2+fs*.35+fs+3);
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
    const wPx=(it.widthCm||50)/100*sc, dPx=(it.depthCm||50)/100*sc;
    const x=it.planX||0, y=it.planY||0;
    const room = getRoomById(it.roomId);
    const col  = room ? room.color : '#fce4ec';
    ctx.save();
    ctx.globalAlpha=.7;
    ctx.fillStyle=col; ctx.fillRect(x,y,wPx,dPx);
    ctx.strokeStyle='#e11d48'; ctx.lineWidth=1.5; ctx.strokeRect(x,y,wPx,dPx);
    ctx.globalAlpha=1;
    ctx.fillStyle='#1e293b'; ctx.font='8px sans-serif'; ctx.textAlign='center';
    ctx.fillText(trunc(it.name,10), x+wPx/2, y+dPx/2+4);
    ctx.restore();
  });

  updatePlanActionState();
}

// ── Sidebar ──────────────────────────────────────────────────
function rPlanSidebar() {
  const el=document.getElementById('room-sidebar'); if(!el) return;
  const fl=getFloor();
  const sc=planState.scale;
  if(!fl.rooms?.length) { el.innerHTML='<div style="color:var(--bd3);font-size:.7rem;text-align:center;padding:10px">No rooms yet — draw some!</div>'; return; }
  el.innerHTML = fl.rooms.map(r=>{
    const area=((r.w/sc)*(r.h/sc)).toFixed(1);
    const wm=(r.w/sc).toFixed(1), hm=(r.h/sc).toFixed(1);
    const items=ldBuy().filter(it=>it.roomId===r.id);
    return `<div class="room-item ${r.id===selected?'active':''}" onclick="selectRoom('${r.id}')">
      <span class="room-swatch" style="background:${r.color||'#fce4ec'}"></span>
      <div class="room-info">
        <div class="room-name">${esc(r.label||'Room')}</div>
        <div class="room-dim">${wm}×${hm}m · ${area}m²</div>
      </div>
      ${items.length?`<span class="room-item-count" onclick="event.stopPropagation();showRoomItemsPanel('${r.id}')" title="View items for this room">${items.length}</span>`:''}
      <button class="btn sml icon" onclick="event.stopPropagation();renameRoom('${r.id}')">✏️</button>
    </div>`;
  }).join('');
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
}
function selectRoom(id) { selected=id; renderPlan(); rPlanSidebar(); }
function renameRoom(id) {
  const r=(getFloor().rooms||[]).find(x=>x.id===id); if(!r) return;
  inlineEdit('Room name',r.label,v=>{r.label=v;savePlan();renderPlan();rPlanSidebar();});
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
function placeItemInPlan(itemId) {
  const it=getBuyItem(itemId); if(!it) return;
  if(!it.roomId) { toast('Link item to a room first','warn'); return; }
  // Find room, place item near center
  const fl=getFloor();
  const room=(fl.rooms||[]).find(r=>r.id===it.roomId);
  if (!room) { toast('Room not found on this floor — switch floors or link to another room','warn'); return; }
  const wPx=(it.widthCm||60)/100*planState.scale;
  const dPx=(it.depthCm||60)/100*planState.scale;
  it.placedInPlan=true;
  it.planX = room.x + (room.w-wPx)/2;
  it.planY = room.y + (room.h-dPx)/2;
  it.planFloor=fl.id;
  updBuyItem(it);
  switchTab('plan');
  toast(it.name+' placed in floor plan 🏠','green');
  renderPlan();
}
