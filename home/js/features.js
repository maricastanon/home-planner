// ============================================================
// features.js — Blueprint, Measurements, Space Calc, Fit Check,
// Budget Scenarios, Size Diff, Room Summary, Smart Optimizer
// ============================================================

// ═══════════════════════════════════════════════════════
// SUBTAB SYSTEM
// ═══════════════════════════════════════════════════════

const SUBTAB_STATE = {};

function setSubtab(tabId, subtab) {
  SUBTAB_STATE[tabId] = subtab;
  document.querySelectorAll(`.stp[data-parent="${tabId}"]`).forEach(p => {
    p.style.display = p.dataset.subtab === subtab ? 'block' : 'none';
  });
  document.querySelectorAll(`.stb[data-parent="${tabId}"]`).forEach(p => {
    p.classList.toggle('active', p.dataset.subtab === subtab);
  });
  const renderers = {
    'buy::scenarios': rBuyScenarios,
    'buy::roommap': rRoomMap,
    'plan::optimizer': rOptimizer,
  };
  if (renderers[tabId + '::' + subtab]) renderers[tabId + '::' + subtab]();
}

// ═══════════════════════════════════════════════════════
// 1. BLUEPRINT IMAGE UPLOAD
// ═══════════════════════════════════════════════════════

let _blueprintImg = null;
let _blueprintOpacity = 0.3;

function loadBlueprintImage() {
  const saved = ld('hnz_blueprint', null);
  if (saved && saved.dataUrl) {
    _blueprintImg = new Image();
    _blueprintImg.src = saved.dataUrl;
    _blueprintOpacity = saved.opacity ?? 0.3;
    const slider = document.getElementById('bp-opacity');
    if (slider) slider.value = _blueprintOpacity;
  }
  syncBlueprintUI();
}

function uploadBlueprint(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _blueprintImg = new Image();
    _blueprintImg.onload = () => {
      sv('hnz_blueprint', { dataUrl: e.target.result, opacity: _blueprintOpacity });
      syncBlueprintUI();
      renderPlan();
      toast('Blueprint uploaded! Adjust opacity with the slider', 'green');
    };
    _blueprintImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setBlueprintOpacity(val) {
  _blueprintOpacity = parseFloat(val) || 0.3;
  const saved = ld('hnz_blueprint', null);
  if (saved) { saved.opacity = _blueprintOpacity; sv('hnz_blueprint', saved); }
  renderPlan();
}

function removeBlueprint() {
  _blueprintImg = null;
  localStorage.removeItem(resolveScopedKey('hnz_blueprint'));
  syncBlueprintUI();
  renderPlan();
  toast('Blueprint removed', 'warn');
}

function syncBlueprintUI() {
  const has = Boolean(_blueprintImg);
  const rmBtn = document.getElementById('bp-remove-btn');
  const slider = document.getElementById('bp-opacity');
  const label = document.getElementById('bp-label');
  if (rmBtn) rmBtn.style.display = has ? 'inline-block' : 'none';
  if (slider) slider.style.display = has ? 'inline-block' : 'none';
  if (label) label.textContent = has ? 'Blueprint loaded' : '';
}

function drawBlueprintLayer(ctx, W, H) {
  if (!_blueprintImg || !_blueprintImg.complete || !_blueprintImg.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = _blueprintOpacity;
  const iw = _blueprintImg.naturalWidth, ih = _blueprintImg.naturalHeight;
  const sc = Math.min(W / iw, H / ih);
  const dw = iw * sc, dh = ih * sc;
  ctx.drawImage(_blueprintImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════
// 2. MEASUREMENT ANNOTATIONS
// ═══════════════════════════════════════════════════════

let measureStart = null;
let measureCurrent = null;

function getFloorMeasurements() {
  const fl = getFloor();
  if (!fl.measurements) fl.measurements = [];
  return fl.measurements;
}

function onMeasureDown(pos) {
  measureStart = { x: snap(pos.x), y: snap(pos.y) };
  measureCurrent = { ...measureStart };
}
function onMeasureMove(pos) {
  if (measureStart) { measureCurrent = { x: pos.x, y: pos.y }; renderPlan(); }
}
function onMeasureUp() {
  if (measureStart && measureCurrent) {
    const dx = measureCurrent.x - measureStart.x, dy = measureCurrent.y - measureStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      getFloorMeasurements().push({
        id: uid(), x1: measureStart.x, y1: measureStart.y,
        x2: snap(measureCurrent.x), y2: snap(measureCurrent.y)
      });
      savePlan();
    }
  }
  measureStart = null; measureCurrent = null; renderPlan();
}

function drawMeasurements(ctx, sc) {
  getFloorMeasurements().forEach(m => _drawMLine(ctx, m.x1, m.y1, m.x2, m.y2, sc, '#e11d48', false));
  if (measureStart && measureCurrent)
    _drawMLine(ctx, measureStart.x, measureStart.y, measureCurrent.x, measureCurrent.y, sc, '#3b82f6', true);
}

function _drawMLine(ctx, x1, y1, x2, y2, sc, color, dashed) {
  const dx = x2 - x1, dy = y2 - y1;
  const distM = (Math.sqrt(dx * dx + dy * dy) / sc).toFixed(2);
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([6, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  // End caps
  const angle = Math.atan2(dy, dx), perp = angle + Math.PI / 2, cap = 7;
  [{x:x1,y:y1},{x:x2,y:y2}].forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(perp)*cap, p.y - Math.sin(perp)*cap);
    ctx.lineTo(p.x + Math.cos(perp)*cap, p.y + Math.sin(perp)*cap);
    ctx.stroke();
  });
  // Label
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const lx = mx - Math.sin(angle)*12, ly = my + Math.cos(angle)*12;
  ctx.font = 'bold 10px DM Sans,sans-serif'; ctx.textAlign = 'center';
  const text = distM + ' m';
  const tw = ctx.measureText(text).width + 8;
  ctx.fillStyle = '#fff'; ctx.fillRect(lx-tw/2, ly-7, tw, 14);
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(lx-tw/2, ly-7, tw, 14);
  ctx.fillStyle = color; ctx.fillText(text, lx, ly+3.5);
  ctx.restore();
}

function clearMeasurements() {
  getFloor().measurements = [];
  savePlan(); renderPlan(); toast('Measurements cleared', 'warn');
}

function deleteMeasurementAt(pos) {
  const ms = getFloorMeasurements();
  for (let i = ms.length - 1; i >= 0; i--) {
    if (_ptLineDist(pos.x, pos.y, ms[i].x1, ms[i].y1, ms[i].x2, ms[i].y2) < 12) {
      ms.splice(i, 1); savePlan(); renderPlan(); return true;
    }
  }
  return false;
}

function _ptLineDist(px, py, x1, y1, x2, y2) {
  const A=px-x1, B=py-y1, C=x2-x1, D=y2-y1;
  const dot=A*C+B*D, len2=C*C+D*D;
  let t = len2 ? Math.max(0, Math.min(1, dot/len2)) : -1;
  return Math.sqrt((px-(x1+t*C))**2 + (py-(y1+t*D))**2);
}

// ═══════════════════════════════════════════════════════
// 3. ROOM SPACE UTILIZATION
// ═══════════════════════════════════════════════════════

function calcRoomSpace(room) {
  const sc = planState.scale;
  const fl = getFloor();
  const roomArea = (room.w / sc) * (room.h / sc);
  let usedPx = 0;
  (fl.furniture || []).forEach(f => {
    const ox = Math.max(0, Math.min(f.x+f.w, room.x+room.w) - Math.max(f.x, room.x));
    const oy = Math.max(0, Math.min(f.y+f.h, room.y+room.h) - Math.max(f.y, room.y));
    usedPx += ox * oy;
  });
  let linkedM2 = 0;
  ldBuy().filter(it => it.roomId === room.id && it.widthCm && it.depthCm).forEach(it => {
    linkedM2 += (it.widthCm/100)*(it.depthCm/100);
  });
  const furnM2 = usedPx / (sc*sc);
  const usedM2 = Math.max(furnM2, linkedM2);
  return {
    total: roomArea, used: usedM2, free: Math.max(0, roomArea - usedM2),
    pct: roomArea > 0 ? Math.min(100, Math.round(usedM2/roomArea*100)) : 0
  };
}

function renderSpaceBar(room) {
  const s = calcRoomSpace(room);
  const col = s.pct > 85 ? '#d97706' : s.pct > 95 ? 'var(--pk)' : 'var(--gn)';
  return `<div class="space-bar">
    <div class="space-bar-row">
      <span class="space-lbl">🌿 ${s.free.toFixed(1)} m² free</span>
      <span class="space-pct">${s.pct}%</span>
    </div>
    ${progressBar(s.pct, col, '4px')}
  </div>`;
}

// ═══════════════════════════════════════════════════════
// 4. FIT-CHECK TOOL
// ═══════════════════════════════════════════════════════

function openFitCheck(itemId) {
  const it = getBuyItem(itemId) || getCmpItem(itemId);
  if (!it) return;
  if (!it.widthCm || !it.depthCm) { toast('Add width & depth dimensions to check fit', 'warn'); return; }
  const sc = planState.scale;
  const plan = ldPlan();
  const itemWm = it.widthCm/100, itemDm = it.depthCm/100;
  const itemArea = itemWm * itemDm;

  let h = `<div class="fc-item-info">
    <div style="font-weight:700">${esc(it.name)}</div>
    <div style="font-size:.72rem;color:var(--bd3)">📐 ${it.widthCm}W × ${it.depthCm}D${it.heightCm?' × '+it.heightCm+'H':''} cm · ${itemArea.toFixed(2)} m²</div>
  </div><div class="fc-rooms">`;

  (plan?.floors || []).forEach(fl => {
    (fl.rooms || []).forEach(room => {
      const rW = room.w > 20 ? room.w/sc : room.w;
      const rD = room.h > 20 ? room.h/sc : room.h;
      const rArea = rW * rD;
      const fits = (itemWm <= rW && itemDm <= rD) || (itemDm <= rW && itemWm <= rD);

      // Current usage
      let usedM2 = 0;
      ldBuy().filter(i => i.roomId === room.id && i.widthCm && i.depthCm && i.id !== it.id)
        .forEach(i => { usedM2 += (i.widthCm/100)*(i.depthCm/100); });
      const freeAfter = rArea - usedM2 - itemArea;
      const pctAfter = Math.min(100, Math.round((usedM2 + itemArea)/rArea*100));

      // Mini viz
      const vScale = Math.min(140/rW, 90/rD, 40);
      const vRW = Math.round(rW*vScale), vRD = Math.round(rD*vScale);
      const vIW = Math.round(itemWm*vScale), vID = Math.round(itemDm*vScale);
      const meta = getStaticRoomById(room.id);
      const emoji = room.emoji || meta?.emoji || '🏠';
      const label = room.label || meta?.label || 'Room';
      const color = room.color || meta?.color || '#f3f4f6';

      h += `<div class="fc-card ${fits?'fits':'nofit'}">
        <div class="fc-hdr"><span>${emoji} ${esc(label)}</span><span class="badge ${fits?'green':'pink'}">${fits?'✅ Fits':'❌ Too large'}</span></div>
        <div class="fc-body">
          <div class="fc-viz" style="width:${Math.max(vRW,vIW)+6}px;height:${Math.max(vRD,vID)+6}px">
            <div class="fc-viz-room" style="width:${vRW}px;height:${vRD}px;background:${color}">
              <div class="fc-viz-item ${fits?'':'overflow'}" style="width:${Math.min(vIW,vRW+16)}px;height:${Math.min(vID,vRD+16)}px"></div>
            </div>
          </div>
          <div class="fc-stats">
            <div>Room: <strong>${rArea.toFixed(1)} m²</strong> (${rW.toFixed(1)}×${rD.toFixed(1)}m)</div>
            <div>Used: <strong>${usedM2.toFixed(1)} m²</strong></div>
            <div>Item: <strong>${itemArea.toFixed(2)} m²</strong></div>
            <div style="color:${freeAfter>=0?'var(--gn)':'var(--pk)'};font-weight:700">
              ${freeAfter>=0?'Free after: '+freeAfter.toFixed(1)+' m²':'Over by '+Math.abs(freeAfter).toFixed(1)+' m²'}
            </div>
            ${progressBar(pctAfter, pctAfter>85?'var(--pk)':'var(--gn)', '5px')}
          </div>
        </div>
        ${fits?`<button class="btn sml pri" style="margin-top:6px" onclick="quickPlaceItem('${it.id}','${room.id}');closeModal('fit-check-modal')">📐 Place here</button>`:''}
      </div>`;
    });
  });

  h += '</div>';
  const el = document.getElementById('fit-check-content'); if (el) el.innerHTML = h;
  document.getElementById('fit-check-title').textContent = '📐 Fit Check: ' + it.name;
  openModal('fit-check-modal');
}

function quickPlaceItem(itemId, roomId) {
  const it = getBuyItem(itemId);
  if (it) { it.roomId = roomId; updBuyItem(it); placeItemInPlan(itemId); }
}

// ═══════════════════════════════════════════════════════
// 5. BUDGET SCENARIO PLANNER
// ═══════════════════════════════════════════════════════

window._scenarioSelections = {};

function rBuyScenarios() {
  const el = document.getElementById('buy-scenarios-content'); if (!el) return;
  const items = ldBuy();
  const max = ldSettings().maxBudget || 5000;

  // Group by type+room
  const groups = {};
  items.forEach(it => {
    const key = (it.type||it.category||'Other') + '::' + (it.roomId||'none');
    if (!groups[key]) groups[key] = { type:it.type||it.category||'Other', roomId:it.roomId, items:[] };
    groups[key].items.push(it);
  });
  const multi = Object.entries(groups).filter(([,g]) => g.items.length >= 2).map(([k,g]) => ({...g, key:k}));
  const singles = Object.values(groups).filter(g => g.items.length === 1).flatMap(g => g.items);

  // Determine selected per group
  multi.forEach(g => {
    if (window._scenarioSelections[g.key] && g.items.find(i => i.id === window._scenarioSelections[g.key])) {
      g.selectedId = window._scenarioSelections[g.key];
    } else {
      g.items.sort((a,b) => {
        if (a.bought !== b.bought) return a.bought ? -1 : 1;
        if ((a.itemStatus==='decided') !== (b.itemStatus==='decided')) return a.itemStatus==='decided' ? -1 : 1;
        return voteScore(b) - voteScore(a);
      });
      g.selectedId = g.items[0].id;
      window._scenarioSelections[g.key] = g.selectedId;
    }
  });

  const singleTotal = singles.reduce((s,it) => s+(it.bought?(it.actualPrice||it.price||0):(it.price||0)), 0);
  let scenarioTotal = singleTotal;
  multi.forEach(g => {
    const sel = g.items.find(i => i.id === g.selectedId);
    if (sel) scenarioTotal += sel.bought ? (sel.actualPrice||sel.price||0) : (sel.price||0);
  });

  const rem = max - scenarioTotal;
  const pct = Math.min(100, Math.round(scenarioTotal/max*100));
  const bc = pct>=100?'var(--pk)':pct>=80?'#d97706':'var(--gn)';

  let h = `<div class="scn-hero">
    <div class="scn-hero-row">
      <div><div class="scn-big" style="color:${bc}">${fmtEur(scenarioTotal,0)}</div><div class="scn-lbl">scenario total</div></div>
      <div><div class="scn-med" style="color:${rem<0?'var(--pk)':'var(--gn)'}">${fmtEur(Math.abs(rem),0)}</div><div class="scn-lbl">${rem<0?'over budget':'remaining'}</div></div>
      <div><div class="scn-med">${multi.length}</div><div class="scn-lbl">choice groups</div></div>
    </div>
    ${progressBar(pct,bc,'8px')}
    <div style="font-size:.6rem;color:var(--bd3);margin-top:3px;text-align:right">${pct}% of ${fmtEur(max,0)}</div>
  </div>`;

  if (!multi.length) {
    h += `<div class="empty" style="margin-top:12px"><div class="ei">💡</div>
      Add multiple items of the same type to the same room to create scenarios.<br>
      <span style="font-size:.65rem;color:var(--bd3)">e.g. 3 different fridges for the Kitchen</span></div>`;
  }

  multi.forEach(g => {
    const room = getRoomById(g.roomId);
    const sel = g.items.find(i => i.id === g.selectedId);
    const prices = g.items.filter(i => i.price>0).map(i => i.price);
    const minP = prices.length ? Math.min(...prices) : 0;
    const maxP = prices.length ? Math.max(...prices) : 0;

    h += `<div class="scn-group">
      <div class="scn-group-hdr">
        <span>${room.emoji} ${esc(g.type)} — ${esc(room.label)}</span>
        <span style="font-size:.62rem;color:var(--bd3)">${g.items.length} options${maxP-minP>0?' · save up to '+fmtEur(maxP-minP,0):''}</span>
      </div>
      <div class="scn-options">`;

    g.items.forEach(it => {
      const isSel = it.id === g.selectedId;
      const photo = it.photos?.[0] || '';
      const delta = sel ? (it.price||0) - (sel.price||0) : 0;
      const cheap = it.price>0 && it.price===minP;
      h += `<div class="scn-opt ${isSel?'selected':''}" onclick="selectScenarioItem('${it.id}','${g.key}')">
        <div class="scn-radio">${isSel?'◉':'○'}</div>
        ${photo?`<img src="${esc(photo)}" class="scn-img">`:`<div class="scn-img scn-noimg">📦</div>`}
        <div class="scn-info">
          <div class="scn-name">${esc(it.name)} ${it.bought?'<span class="badge green" style="font-size:.5rem">Bought</span>':''}</div>
          ${it.brand?`<div style="font-size:.58rem;color:var(--bd3)">${esc(it.brand)}</div>`:''}
          ${dimStr(it)?`<div style="font-size:.55rem;color:var(--bd3)">📐 ${esc(dimStr(it))}</div>`:''}
        </div>
        <div class="scn-price">
          <div style="font-weight:700;color:${cheap?'var(--gn)':'var(--pk)'}">${it.price?fmtEur(it.price,0):'–'}</div>
          ${!isSel&&delta?`<div style="font-size:.58rem;color:${delta>0?'var(--pk)':'var(--gn)'}">${delta>0?'+':''}${fmtEur(delta,0)}</div>`:''}
          ${cheap?'<div style="font-size:.52rem;color:var(--gn)">💰 Cheapest</div>':''}
        </div>
      </div>`;
    });
    h += '</div></div>';
  });

  if (singles.length) {
    h += `<div style="margin-top:12px;padding:10px;background:var(--bg2);border-radius:var(--r);font-size:.68rem;color:var(--bd3)">
      Fixed items (no alternatives): ${singles.length} items · ${fmtEur(singleTotal,0)}</div>`;
  }
  el.innerHTML = h;
}

function selectScenarioItem(itemId, groupKey) {
  window._scenarioSelections[groupKey] = itemId;
  rBuyScenarios();
}

// ═══════════════════════════════════════════════════════
// 6. SIZE-DIFFERENCE CALCULATOR
// ═══════════════════════════════════════════════════════

function renderSizeDiff(items) {
  const wd = items.filter(i => i.widthCm && i.depthCm);
  if (wd.length < 2) return '';
  const ref = wd[0];
  const maxW = Math.max(...wd.map(i=>i.widthCm));
  const maxD = Math.max(...wd.map(i=>i.depthCm));
  const vs = Math.min(110/maxW, 70/maxD, 0.55);

  let h = `<div class="sdiff"><div class="sdiff-title">📏 Size Comparison</div><div class="sdiff-grid">`;
  wd.forEach((it,i) => {
    const isRef = i===0;
    const dw = it.widthCm-ref.widthCm, dd = it.depthCm-ref.depthCm;
    const dh = it.heightCm&&ref.heightCm ? it.heightCm-ref.heightCm : null;
    const vW = Math.round(it.widthCm*vs), vD = Math.round(it.depthCm*vs);
    const rW = Math.round(ref.widthCm*vs), rD = Math.round(ref.depthCm*vs);

    h += `<div class="sdiff-card ${isRef?'ref':''}">
      <div style="font-weight:700;font-size:.7rem;margin-bottom:4px">${esc(it.name)}${isRef?' (ref)':''}</div>
      <div class="sdiff-viz" style="width:${Math.max(vW,rW)+6}px;height:${Math.max(vD,rD)+6}px">
        ${!isRef?`<div class="sdiff-ref" style="width:${rW}px;height:${rD}px"></div>`:''}
        <div class="sdiff-item ${(dw>0||dd>0)?'larger':(dw<0||dd<0)?'smaller':''}" style="width:${vW}px;height:${vD}px"></div>
      </div>
      <div style="font-size:.58rem;color:var(--bd3);margin-top:3px">${it.widthCm}W × ${it.depthCm}D${it.heightCm?' × '+it.heightCm+'H':''} cm</div>
      ${!isRef?`<div class="sdiff-deltas">
        ${dw?`<span class="${dw>0?'plus':'minus'}">${dw>0?'+':''}${dw}cm W</span>`:''}
        ${dd?`<span class="${dd>0?'plus':'minus'}">${dd>0?'+':''}${dd}cm D</span>`:''}
        ${dh?`<span class="${dh>0?'plus':'minus'}">${dh>0?'+':''}${dh}cm H</span>`:''}
      </div>`:''}
    </div>`;
  });
  h += '</div></div>';
  return h;
}

// ═══════════════════════════════════════════════════════
// 7. ROOM SHOPPING SUMMARY
// ═══════════════════════════════════════════════════════

function rRoomMap() {
  const el = document.getElementById('buy-roommap-content'); if (!el) return;
  const items = ldBuy(), rooms = getAllRooms();
  let tEst=0, tSpent=0, tBought=0, tItems=0;
  let h = '';

  rooms.forEach(room => {
    const ri = items.filter(it => it.roomId === room.id);
    if (!ri.length) return;
    tItems += ri.length;
    const est = ri.reduce((s,it) => s+(it.bought?(it.actualPrice||it.price||0):(it.price||0)), 0);
    const spent = ri.filter(i=>i.bought).reduce((s,it) => s+(it.actualPrice||it.price||0), 0);
    const bought = ri.filter(i=>i.bought).length;
    tEst += est; tSpent += spent; tBought += bought;
    const byType = groupBy(ri, 'type');
    const pct = ri.length ? Math.round(bought/ri.length*100) : 0;

    h += `<div class="rm-card open">
      <div class="rm-hdr" style="border-left:4px solid ${room.colorDark||room.color}" onclick="this.parentElement.classList.toggle('open')">
        <div><div class="rm-name">${room.emoji} ${esc(room.label)}</div>
        <div style="font-size:.58rem;color:var(--bd3)">${ri.length} items · ${bought} bought</div></div>
        <div style="text-align:right"><div style="font-weight:700;color:var(--pk);font-size:.88rem">${fmtEur(est,0)}</div>
        <div style="font-size:.55rem;color:var(--gn)">${fmtEur(spent,0)} spent</div></div>
        <span style="font-size:.65rem;color:var(--bd3);margin-left:4px">▼</span>
      </div>
      ${progressBar(pct, room.colorDark||'var(--pk)', '4px')}
      <div class="rm-items">`;

    Object.entries(byType).forEach(([type, ti]) => {
      h += `<div class="rm-type">${esc(type||'General')}</div>`;
      ti.forEach(it => {
        const ph = it.photos?.[0];
        h += `<div class="rm-item ${it.bought?'bought':''}" onclick="openItemDetail('${it.id}')">
          ${ph?`<img src="${esc(ph)}" class="rm-item-img">`:`<div class="rm-item-img rm-noimg">${it.category==='Appliances'?'🏠':'🛋️'}</div>`}
          <div class="rm-item-info"><div class="rm-item-name">${esc(it.name)}${it.bought?' ✅':''}</div>
          ${it.brand?`<div style="font-size:.55rem;color:var(--bd3)">${esc(it.brand)}</div>`:''}
          ${dimStr(it)?`<div style="font-size:.52rem;color:var(--bd3)">📐 ${esc(dimStr(it))}</div>`:''}</div>
          <div style="font-weight:700;font-size:.72rem;color:var(--pk)">${it.price?fmtEur(it.price,0):''}</div>
        </div>`;
      });
    });
    h += '</div></div>';
  });

  // Unassigned
  const ua = items.filter(it => !it.roomId);
  if (ua.length) {
    h += `<div class="rm-card open"><div class="rm-hdr" style="border-left:4px solid #94a3b8">
      <div><div class="rm-name">📦 Unassigned</div><div style="font-size:.58rem;color:var(--bd3)">${ua.length} items</div></div></div>
      <div class="rm-items">${ua.map(it => `<div class="rm-item" onclick="openItemDetail('${it.id}')">
        <div class="rm-item-img rm-noimg">📦</div>
        <div class="rm-item-info"><div class="rm-item-name">${esc(it.name)}</div></div>
        <div style="font-weight:700;font-size:.72rem;color:var(--pk)">${it.price?fmtEur(it.price,0):''}</div>
      </div>`).join('')}</div></div>`;
  }

  const summary = `<div class="rm-summary">
    <div class="rm-s"><div class="rm-s-num" style="color:var(--pk)">${fmtEur(tEst,0)}</div><div class="rm-s-lbl">estimated</div></div>
    <div class="rm-s"><div class="rm-s-num" style="color:var(--gn)">${fmtEur(tSpent,0)}</div><div class="rm-s-lbl">spent</div></div>
    <div class="rm-s"><div class="rm-s-num">${tBought}/${tItems}</div><div class="rm-s-lbl">bought</div></div>
    <div class="rm-s"><div class="rm-s-num">${rooms.filter(r=>items.some(it=>it.roomId===r.id)).length}</div><div class="rm-s-lbl">rooms</div></div>
  </div>`;

  el.innerHTML = summary + (h || '<div class="empty"><div class="ei">🏠</div>Assign items to rooms to see your room plan</div>');
}

// ═══════════════════════════════════════════════════════
// 8. SMART ROOM OPTIMIZER
// ═══════════════════════════════════════════════════════

window._optMustHaves = new Set();

function rOptimizer() {
  const el = document.getElementById('optimizer-content'); if (!el) return;
  const rooms = getAllRooms();
  const hasItems = ldBuy().some(it => it.widthCm && it.depthCm);

  if (!hasItems) {
    el.innerHTML = '<div class="empty"><div class="ei">🧠</div>Add items with dimensions (width & depth) to use the optimizer</div>';
    return;
  }

  el.innerHTML = `<div style="font-size:.7rem;color:var(--bd3);margin-bottom:8px">
    Select a room, mark must-have items, then optimize to find the setup with the most free space.
  </div>
  <div style="margin-bottom:10px">
    <label style="font-size:.68rem;font-weight:700;color:var(--pk)">Room:</label>
    <select id="opt-room" onchange="runOptimizer()" style="font-size:.78rem;padding:6px 10px;border:1.5px solid var(--border);border-radius:10px;margin-left:6px">
      <option value="">-- choose room --</option>
      ${rooms.map(r=>`<option value="${r.id}">${r.emoji} ${esc(r.label)}</option>`).join('')}
    </select>
  </div>
  <div id="opt-results"></div>`;
}

function runOptimizer() {
  const roomId = document.getElementById('opt-room')?.value;
  const el = document.getElementById('opt-results');
  if (!el || !roomId) { if(el) el.innerHTML=''; return; }

  const sc = planState.scale;
  const plan = ldPlan();
  let rW=0, rD=0;
  (plan?.floors||[]).forEach(fl => (fl.rooms||[]).forEach(r => {
    if (r.id===roomId) { const px=r.w>20; rW=px?r.w/sc:r.w; rD=px?r.h/sc:r.h; }
  }));
  const rArea = rW*rD;
  if (rArea<=0) { el.innerHTML='<div style="color:var(--bd3);font-size:.7rem">Room not found in floor plan.</div>'; return; }

  const room = getRoomById(roomId);
  const allItems = ldBuy().filter(it => it.widthCm && it.depthCm && (it.roomId===roomId || !it.roomId));
  if (!allItems.length) { el.innerHTML='<div style="color:var(--bd3);font-size:.7rem">No items with dimensions for this room.</div>'; return; }

  const must = window._optMustHaves || new Set();

  let h = `<div class="opt-info">${room.emoji} <strong>${esc(room.label)}</strong> · ${rW.toFixed(1)}×${rD.toFixed(1)}m = ${rArea.toFixed(1)} m²</div>
  <div class="opt-list-hdr"><span>Check must-haves, then:</span>
    <button class="btn sml pri" onclick="computeOptimal()">🧠 Optimize</button>
  </div>
  <div class="opt-list">`;

  allItems.forEach(it => {
    const fp = ((it.widthCm/100)*(it.depthCm/100)).toFixed(2);
    const im = must.has(it.id);
    h += `<div class="opt-row ${im?'must':''}">
      <input type="checkbox" ${im?'checked':''} onchange="togOptMust('${it.id}',this.checked)" style="accent-color:var(--pk)">
      <div class="opt-row-info"><div style="font-weight:600;font-size:.7rem">${esc(it.name)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">${it.widthCm}×${it.depthCm}cm = ${fp} m²${it.price?' · '+fmtEur(it.price,0):''}</div></div>
      <span class="badge ${im?'pink':'gray'}" style="font-size:.48rem">${im?'🔒 Must':'Optional'}</span>
    </div>`;
  });
  h += '</div><div id="opt-result"></div>';
  el.innerHTML = h;
}

function togOptMust(id, on) {
  if (!window._optMustHaves) window._optMustHaves = new Set();
  on ? window._optMustHaves.add(id) : window._optMustHaves.delete(id);
  runOptimizer();
}

function computeOptimal() {
  const roomId = document.getElementById('opt-room')?.value;
  if (!roomId) return;
  const sc = planState.scale;
  const plan = ldPlan();
  let rW=0, rD=0;
  (plan?.floors||[]).forEach(fl => (fl.rooms||[]).forEach(r => {
    if (r.id===roomId) { const px=r.w>20; rW=px?r.w/sc:r.w; rD=px?r.h/sc:r.h; }
  }));
  const rArea = rW*rD;
  const allItems = ldBuy().filter(it => it.widthCm && it.depthCm && (it.roomId===roomId || !it.roomId));
  const must = window._optMustHaves || new Set();
  const mustItems = allItems.filter(it => must.has(it.id));
  const optItems = allItems.filter(it => !must.has(it.id));
  const mustArea = mustItems.reduce((s,it) => s+(it.widthCm/100)*(it.depthCm/100), 0);
  const avail = rArea - mustArea;

  if (avail < 0) {
    document.getElementById('opt-result').innerHTML = `<div class="opt-warn">⚠️ Must-haves (${mustArea.toFixed(1)} m²) exceed room area (${rArea.toFixed(1)} m²)!</div>`;
    return;
  }

  // Three strategies
  const withArea = optItems.map(it => ({...it, areaM2:(it.widthCm/100)*(it.depthCm/100)}));
  const strategies = [
    { name:'Max Free Space', emoji:'🌿', items: packGreedy([...withArea].sort((a,b)=>a.areaM2-b.areaM2), avail), desc:'Smallest items first — maximizes remaining space' },
    { name:'Highest Value', emoji:'💎', items: packGreedy([...withArea].sort((a,b)=>(b.price||0)-(a.price||0)), avail), desc:'Most expensive items first' },
    { name:'Best Density', emoji:'⚖️', items: packGreedy([...withArea].sort((a,b)=>((b.price||0)/b.areaM2)-((a.price||0)/a.areaM2)), avail), desc:'Best value per m²' },
  ];

  let rh = `<div class="opt-res-hdr">🧠 Results · Room: ${rArea.toFixed(1)} m² · Must-haves: ${mustArea.toFixed(1)} m² · Available: ${avail.toFixed(1)} m²</div>`;

  strategies.forEach(s => {
    const usedArea = mustArea + s.items.reduce((t,i)=>t+i.areaM2, 0);
    const freeArea = rArea - usedArea;
    const freePct = Math.round(freeArea/rArea*100);
    const totalPrice = [...mustItems,...s.items].reduce((t,i)=>t+(i.price||0), 0);
    const totalCount = mustItems.length + s.items.length;
    const excluded = optItems.filter(oi => !s.items.find(si=>si.id===oi.id));

    rh += `<div class="opt-combo">
      <div class="opt-combo-top"><span>${s.emoji} <strong>${s.name}</strong></span><span class="badge green" style="font-size:.58rem">${freePct}% free</span></div>
      <div style="font-size:.58rem;color:var(--bd3);margin-bottom:5px">${s.desc}</div>
      <div class="opt-combo-nums">
        <span>📦 ${totalCount} items</span><span>📐 ${usedArea.toFixed(1)} m²</span>
        <span style="color:var(--gn);font-weight:700">🌿 ${freeArea.toFixed(1)} m²</span><span>💰 ${fmtEur(totalPrice,0)}</span>
      </div>
      ${progressBar(Math.round(usedArea/rArea*100), usedArea/rArea>.85?'#d97706':'var(--gn)', '6px')}
      <div class="opt-tags">
        ${mustItems.map(it=>`<span class="opt-tag must">🔒 ${esc(trunc(it.name,16))}</span>`).join('')}
        ${s.items.map(it=>`<span class="opt-tag">${esc(trunc(it.name,16))}</span>`).join('')}
      </div>
      ${excluded.length?`<div style="font-size:.55rem;color:var(--bd3);margin-top:3px">Won't fit: ${excluded.map(i=>esc(trunc(i.name,14))).join(', ')}</div>`:''}
      <button class="btn sml pri" style="margin-top:6px" onclick="applyOptCombo([${[...mustItems,...s.items].map(i=>"'"+i.id+"'").join(',')}],'${roomId}')">✅ Apply</button>
    </div>`;
  });

  document.getElementById('opt-result').innerHTML = rh;
}

function packGreedy(sorted, capacity) {
  const result = []; let used = 0;
  sorted.forEach(it => { if (used + it.areaM2 <= capacity) { result.push(it); used += it.areaM2; } });
  return result;
}

function applyOptCombo(ids, roomId) {
  ids.forEach(id => { const it=getBuyItem(id); if(it){it.roomId=roomId;updBuyItem(it);} });
  toast('Setup applied! Items assigned to room', 'green');
  runOptimizer();
}

// ═══════════════════════════════════════════════════════
// 9. PRELOADED BLUEPRINTS (from blueprint_images)
// ═══════════════════════════════════════════════════════

const PRELOADED_BLUEPRINTS = [
  {
    id: 'bp-apartment-dg',
    name: 'Apartment (Dachgeschoss)',
    file: 'blueprints/apartment-dg.jpg',
    widthM: 13.67,
    heightM: 9.0,
    notes: 'Main apartment floor plan — 92.29 m² usable area'
  },
  {
    id: 'bp-basement-kg',
    name: 'Basement (Kellergeschoss)',
    file: 'blueprints/basement-kg.jpg',
    widthM: 13.56,
    heightM: 8.40,
    notes: 'Keller 2 is ours. Includes Heizraum and Hausanschluss.'
  },
  {
    id: 'bp-measurements',
    name: 'Area Calculations (Wohnfläche)',
    file: 'blueprints/measurements.jpg',
    widthM: 10,
    heightM: 14,
    notes: 'Official Wohnflächenberechnung — reference only'
  }
];

function loadPreloadedBlueprint(bpId) {
  const bp = PRELOADED_BLUEPRINTS.find(b => b.id === bpId);
  if (!bp) return;
  // Fetch the image file and import it via the existing plan.js importBlueprint path
  fetch(bp.file)
    .then(r => r.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result;
        const img = new Image();
        img.onload = () => {
          const floor = getFloor();
          const blueprint = getFloorBlueprint(floor);
          Object.assign(blueprint, {
            src,
            widthM: bp.widthM,
            heightM: bp.heightM,
            x: 10,
            y: 10,
            opacity: 0.35
          });
          savePlan();
          renderPlan();
          if (typeof renderPlanToolsPanel === 'function') renderPlanToolsPanel();
          toast(`Loaded: ${bp.name}`, 'green');
        };
        img.src = src;
      };
      reader.readAsDataURL(blob);
    })
    .catch(() => toast('Could not load blueprint file', 'red'));
}

function renderPreloadedBlueprintPicker() {
  return `<div style="margin-top:8px">
    <div style="font-size:.65rem;font-weight:700;color:var(--pk);margin-bottom:5px">📋 Preloaded Blueprints</div>
    ${PRELOADED_BLUEPRINTS.map(bp => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bg2)">
      <div style="flex:1">
        <div style="font-size:.7rem;font-weight:600">${esc(bp.name)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">${esc(bp.notes)}</div>
      </div>
      <button class="btn sml pri" onclick="loadPreloadedBlueprint('${bp.id}')">Load</button>
    </div>`).join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

function initFeatures() {
  loadBlueprintImage();
}
if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', initFeatures);
else setTimeout(initFeatures, 0);
