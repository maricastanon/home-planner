// ============================================================
// smart.js — Smart Features: Space Analyzer, Fit Tester,
//            Budget Planner, Blueprint, Visual Comparison
// ============================================================

// ── Preloaded blueprints ────────────────────────────────────
const PRELOADED_BLUEPRINTS = [
  { id: 'bp-main',    label: 'Apartment Floor Plan (Dachgeschoss)',  src: 'blueprints/apartment-main.jpeg' },
  { id: 'bp-measure', label: 'Room Measurements (92.29 m²)',         src: 'blueprints/apartment-measurements.jpeg' },
  { id: 'bp-keller',  label: 'Basement — Keller 2 (Kellergeschoss)', src: 'blueprints/basement.jpeg' },
];

// ── Blueprint background image ─────────────────────────────
let _blueprintImg = null;
let _blueprintOpacity = 0.3;

function loadPreloadedBlueprint(bpId) {
  const bp = PRELOADED_BLUEPRINTS.find(b => b.id === bpId);
  if (!bp) return;
  _blueprintImg = new Image();
  _blueprintImg.onload = () => {
    renderPlan();
    rPlanTools();
    toast('Blueprint "' + bp.label + '" loaded', 'green');
  };
  _blueprintImg.onerror = () => toast('Could not load blueprint image', 'red');
  _blueprintImg.src = bp.src;
  // Save reference to plan state
  const p = ldPlan();
  if (p) { p.blueprintId = bpId; p.blueprintSrc = bp.src; svPlan(p); }
}

function uploadBlueprint() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    const url = await readPhotoAsDataURL(file);
    _blueprintImg = new Image();
    _blueprintImg.onload = () => {
      renderPlan();
      rPlanTools();
      toast('Custom blueprint loaded', 'green');
    };
    _blueprintImg.src = url;
    const p = ldPlan();
    if (p) { p.blueprintSrc = url; delete p.blueprintId; svPlan(p); }
  };
  inp.click();
}

function removeBlueprint() {
  _blueprintImg = null;
  const p = ldPlan();
  if (p) { delete p.blueprintSrc; delete p.blueprintId; svPlan(p); }
  renderPlan();
  rPlanTools();
  toast('Blueprint removed', 'warn');
}

function setBlueprintOpacity(val) {
  _blueprintOpacity = parseFloat(val) || 0.3;
  renderPlan();
}

function restoreBlueprintFromPlan() {
  const p = ldPlan();
  if (!p) return;
  if (p.blueprintId) {
    const bp = PRELOADED_BLUEPRINTS.find(b => b.id === p.blueprintId);
    if (bp) {
      _blueprintImg = new Image();
      _blueprintImg.onload = () => renderPlan();
      _blueprintImg.src = bp.src;
      return;
    }
  }
  if (p.blueprintSrc && !_blueprintImg) {
    _blueprintImg = new Image();
    _blueprintImg.onload = () => renderPlan();
    _blueprintImg.src = p.blueprintSrc;
  }
}

// ── Space Analyzer: room occupancy dashboard ────────────────
function rSpaceAnalyzer() {
  const el = document.getElementById('space-analyzer'); if (!el) return;
  const plan = ldPlan();
  if (!plan?.floors?.length) {
    el.innerHTML = '<div style="color:var(--bd3);font-size:.68rem;padding:6px;text-align:center">Draw rooms first</div>';
    return;
  }

  const allRooms = [];
  plan.floors.forEach(floor => {
    (floor.rooms || []).forEach(room => {
      const occ = getRoomOccupancy(room.id);
      allRooms.push({ room, floor, occ });
    });
  });

  if (!allRooms.length) {
    el.innerHTML = '<div style="color:var(--bd3);font-size:.68rem;padding:6px;text-align:center">No rooms</div>';
    return;
  }

  // Total summary
  const totalArea = allRooms.reduce((s, r) => s + r.occ.areaSqm, 0);
  const totalUsed = allRooms.reduce((s, r) => s + r.occ.occupiedSqm, 0);
  const totalFree = Math.max(0, totalArea - totalUsed);
  const totalPct = totalArea ? Math.round(totalUsed / totalArea * 100) : 0;

  let h = `<div class="space-summary">
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:5px">
      <div><div style="font-size:.95rem;font-weight:700;color:var(--gn)">${totalFree.toFixed(1)} m²</div><div style="font-size:.52rem;color:var(--bd3)">free</div></div>
      <div><div style="font-size:.95rem;font-weight:700;color:var(--pk)">${totalUsed.toFixed(1)} m²</div><div style="font-size:.52rem;color:var(--bd3)">used</div></div>
      <div><div style="font-size:.95rem;font-weight:700">${totalArea.toFixed(1)} m²</div><div style="font-size:.52rem;color:var(--bd3)">total</div></div>
    </div>
    ${progressBar(totalPct, totalPct > 70 ? 'var(--pk)' : 'var(--gn)', '7px')}
    <div style="font-size:.52rem;color:var(--bd3);margin-top:2px;text-align:right">${totalPct}% occupied</div>
  </div>`;

  allRooms.forEach(({ room, occ }) => {
    const color = occ.occupancyPct > 80 ? 'var(--pk)' : occ.occupancyPct > 50 ? '#d97706' : 'var(--gn)';
    h += `<div class="space-room-card" onclick="selectRoom('${room.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <span style="font-weight:600;font-size:.68rem">${esc(room.label || 'Room')}</span>
        <span style="font-size:.58rem;color:${color};font-weight:700">${occ.freeSqm} m² free</span>
      </div>
      ${progressBar(occ.occupancyPct, color, '5px')}
      <div style="display:flex;justify-content:space-between;font-size:.5rem;color:var(--bd3);margin-top:1px">
        <span>${occ.areaSqm} m²</span>
        <span>${occ.occupiedSqm} m² used</span>
      </div>
    </div>`;
  });

  el.innerHTML = h;
}

// ── Space Optimizer: checkbox must-haves, find best combo ────
function rSpaceOptimizer() {
  const el = document.getElementById('space-optimizer'); if (!el) return;
  const items = ldBuy().filter(it => it.roomId && (it.widthCm || it.depthCm));

  if (!items.length) {
    el.innerHTML = '<div style="color:var(--bd3);font-size:.68rem;padding:6px;text-align:center">Add items with dimensions + room to optimize</div>';
    return;
  }

  const byRoom = {};
  items.forEach(it => { (byRoom[it.roomId] = byRoom[it.roomId] || []).push(it); });

  let h = '<div style="font-size:.6rem;color:var(--bd3);margin-bottom:6px">Check items that <strong>must</strong> be in each room. The optimizer picks the smallest-footprint alternative from each option group.</div>';

  Object.entries(byRoom).forEach(([roomId, roomItems]) => {
    const roomMeta = getRoomById(roomId);
    const opt = getRoomOptimization(roomId);

    h += `<div class="opt-room-section">
      <div class="opt-room-hdr" style="background:${roomMeta.color}">
        <span>${roomMeta.emoji} ${esc(roomMeta.label)}</span>
        <span style="font-size:.58rem">${opt.roomAreaSqm} m²</span>
      </div>`;

    roomItems.forEach(it => {
      const fp = getItemFootprintSqm(it);
      const fit = getRoomFitReport(it, roomId);
      h += `<div class="opt-item-row">
        <input type="checkbox" ${it.mustFitRoom ? 'checked' : ''} onchange="toggleMustFit('${it.id}',this.checked)" style="accent-color:var(--pk)">
        <div style="flex:1;min-width:0">
          <div style="font-size:.68rem;font-weight:500">${esc(trunc(it.name, 20))}</div>
          <div style="font-size:.52rem;color:var(--bd3)">${it.widthCm||'?'}×${it.depthCm||'?'} cm · ${fp} m²${it.optionGroup ? ' · group: ' + esc(trunc(it.optionGroup, 12)) : ''}</div>
        </div>
        <span class="opt-fit-badge ${fit.fits ? 'fits' : 'no-fit'}">${fit.fits ? 'Fits' : 'Too big'}</span>
      </div>`;
    });

    if (opt.chosenItems.length) {
      const freeColor = opt.freeSqm > 0 ? 'var(--gn)' : 'var(--pk)';
      h += `<div class="opt-result">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.6rem;font-weight:600">Result</span>
          <span style="font-size:.65rem;font-weight:700;color:${freeColor}">${opt.freeSqm} m² free</span>
        </div>
        ${progressBar(Math.round((opt.totalFootprintSqm / (opt.roomAreaSqm || 1)) * 100), freeColor, '4px')}
        <div style="font-size:.52rem;color:var(--bd3);margin-top:2px">${opt.chosenItems.length} items · ${opt.totalFootprintSqm} m² · ${fmtEur(opt.totalCost, 0)}</div>
        ${opt.failingItems.length ? `<div style="font-size:.55rem;color:var(--pk);margin-top:2px">${opt.failingItems.map(i => esc(i.name)).join(', ')} won't fit</div>` : ''}
        ${opt.chosenGroups.map(g => `<div style="font-size:.52rem;color:var(--bd2);margin-top:2px">"${esc(g.group)}": ${esc(g.chosen?.name || '–')}</div>`).join('')}
      </div>`;
    }
    h += '</div>';
  });

  el.innerHTML = h;
}

function toggleMustFit(itemId, checked) {
  const it = getBuyItem(itemId); if (!it) return;
  it.mustFitRoom = checked;
  updBuyItem(it);
  rSpaceOptimizer();
  toast(checked ? 'Must-fit on' : 'Must-fit off', 'info', 1200);
}

// ── Fit Tester panel (Buy subtab) ────────────────────────────
function rFitTest() {
  const el = document.getElementById('fit-test-content'); if (!el) return;
  const roomFilter = getPillVal('fit', 'room') || '';
  const items = ldBuy().filter(it => it.roomId && (it.widthCm || it.depthCm));
  const filtered = roomFilter ? items.filter(it => it.roomId === roomFilter) : items;

  const roomsWithItems = [...new Set(items.map(it => it.roomId))];
  const roomOpts = roomsWithItems.map(rId => {
    const rm = getRoomById(rId);
    return { k: rId, l: rm.label, e: rm.emoji };
  });

  let h = buildPillFilters('fit', 'room', roomOpts, rFitTest);

  if (!filtered.length) {
    h += '<div style="color:var(--bd3);font-size:.72rem;padding:20px;text-align:center">No items with dimensions assigned to rooms yet.</div>';
    el.innerHTML = h; return;
  }

  const byRoom = groupBy(filtered, 'roomId');

  Object.entries(byRoom).forEach(([roomId, roomItems]) => {
    const roomMeta = getRoomById(roomId);
    const { room } = getRoomRecord(roomId);
    const roomDims = room ? getRoomDimsMeters(room) : null;
    const occ = getRoomOccupancy(roomId);

    h += `<div class="fit-room-card">
      <div class="fit-room-hdr">
        <div>
          <span style="font-weight:700">${roomMeta.emoji} ${esc(roomMeta.label)}</span>
          ${roomDims ? `<span style="font-size:.62rem;color:var(--bd3);margin-left:6px">${roomDims.widthM}×${roomDims.depthM}m · ${roomDims.areaSqm} m²</span>` : ''}
        </div>
        <div style="font-size:.72rem;font-weight:700;color:${occ.occupancyPct > 80 ? 'var(--pk)' : 'var(--gn)'}">${occ.freeSqm} m² free</div>
      </div>`;

    // SVG room diagram
    if (roomDims && roomDims.widthM > 0 && roomDims.depthM > 0) {
      const svgW = 280, svgH = Math.min(180, Math.round(svgW * (roomDims.depthM / roomDims.widthM)));
      const scale = svgW / roomDims.widthM;
      h += `<div style="text-align:center;margin:8px 0"><svg width="${svgW}" height="${svgH}" style="border:2px solid var(--border);border-radius:8px;background:#fafafa">`;
      h += `<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="${roomMeta.color}" opacity="0.3"/>`;
      h += `<text x="${svgW/2}" y="12" text-anchor="middle" font-size="9" fill="#64748b">${roomDims.widthM}m × ${roomDims.depthM}m</text>`;

      let xOff = 4, yOff = 18;
      roomItems.forEach(it => {
        const wCm = it.widthCm || 50, dCm = it.depthCm || 50;
        const wPx = Math.max(12, (wCm / 100) * scale), dPx = Math.max(12, (dCm / 100) * scale);
        const fit = getRoomFitReport(it, roomId);
        const fill = fit.fits ? '#bbf7d0' : '#fecaca';
        const stroke = fit.fits ? '#16a34a' : '#dc2626';
        if (xOff + wPx > svgW - 4) { xOff = 4; yOff += dPx + 4; }
        h += `<rect x="${xOff}" y="${yOff}" width="${wPx}" height="${dPx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="3"/>`;
        const labelSize = Math.min(9, wPx / esc(trunc(it.name, 8)).length * 1.5);
        if (labelSize >= 5) h += `<text x="${xOff + wPx / 2}" y="${yOff + dPx / 2 + 3}" text-anchor="middle" font-size="${labelSize}" fill="#1e293b">${esc(trunc(it.name, 8))}</text>`;
        xOff += wPx + 4;
      });
      h += '</svg></div>';
    }

    // Item fit details
    roomItems.forEach(it => {
      const fit = getRoomFitReport(it, roomId);
      const fp = getItemFootprintSqm(it);
      const photo = it.photos?.[0];
      h += `<div class="fit-item-row">
        ${photo ? `<img src="${esc(photo)}" class="fit-item-thumb">` : `<div class="fit-item-thumb-placeholder">${esc((getCatByKey(it.cat)?.e) || '📦')}</div>`}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.75rem">${esc(it.name)}</div>
          <div style="font-size:.6rem;color:var(--bd3)">${it.widthCm || '?'}×${it.depthCm || '?'}×${it.heightCm || '?'} cm · ${fp} m²</div>
          <div style="font-size:.6rem;color:var(--bd3)">${fmtEur(it.price)}${it.brand ? ' · ' + esc(it.brand) : ''}</div>
        </div>
        <div style="text-align:right">
          <div class="fit-badge ${fit.fits ? 'fits' : 'no-fit'}">${fit.fits ? 'Fits' : 'Won\'t fit'}</div>
          <div style="font-size:.55rem;color:var(--bd3);margin-top:2px">${fit.footprintPct}% of room</div>
          <div style="font-size:.5rem;color:${(fit.widthSlackCm||0) >= 0 ? 'var(--gn)' : 'var(--pk)'}">slack: ${fit.widthSlackCm||0}W / ${fit.depthSlackCm||0}D cm</div>
        </div>
      </div>`;
    });
    h += '</div>';
  });

  el.innerHTML = h;
}

// ── Budget Planner with scenarios (Buy subtab) ───────────────
function rBudgetPlanner() {
  const el = document.getElementById('budget-planner-content'); if (!el) return;
  const stats = getBuyScenarioStats();
  const budgetMax = ldSettings().maxBudget || 5000;

  let h = `<div class="scenario-hero">
    <div style="font-size:.72rem;font-weight:700;color:var(--pk);margin-bottom:10px">Budget Scenarios</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
      <div class="scenario-card selected-scenario" onclick="applyScenario('selected')">
        <div style="font-size:.55rem;color:var(--bd3)">Current picks</div>
        <div style="font-size:1.2rem;font-weight:700;color:${stats.selectedTotal > budgetMax ? 'var(--pk)' : 'var(--gn)'}">${fmtEur(stats.selectedTotal, 0)}</div>
        <div style="font-size:.52rem;color:var(--bd3)">${stats.selectedTotal > budgetMax ? 'Over ' + fmtEur(stats.selectedTotal - budgetMax, 0) : fmtEur(budgetMax - stats.selectedTotal, 0) + ' left'}</div>
      </div>
      <div class="scenario-card cheapest-scenario" onclick="applyScenario('cheapest')">
        <div style="font-size:.55rem;color:var(--bd3)">Cheapest combo</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--gn)">${fmtEur(stats.cheapestTotal, 0)}</div>
        <div style="font-size:.52rem;color:var(--bd3)">Save ${fmtEur(Math.max(0, stats.selectedTotal - stats.cheapestTotal), 0)}</div>
      </div>
      <div class="scenario-card premium-scenario" onclick="applyScenario('premium')">
        <div style="font-size:.55rem;color:var(--bd3)">Premium combo</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--pk)">${fmtEur(stats.premiumTotal, 0)}</div>
        <div style="font-size:.52rem;color:var(--bd3)">+${fmtEur(Math.max(0, stats.premiumTotal - stats.selectedTotal), 0)}</div>
      </div>
    </div>
    <div style="font-size:.58rem;color:var(--bd3);margin-bottom:3px">Budget: ${fmtEur(budgetMax, 0)} · ${stats.groupCount} groups · ${stats.reusedCount} reused (saving ${fmtEur(stats.reusedValue, 0)})</div>
    ${progressBar(Math.round(stats.selectedTotal / budgetMax * 100), stats.selectedTotal > budgetMax ? 'var(--pk)' : 'var(--gn)', '8px')}
  </div>`;

  // Option groups
  if (stats.groupCount) {
    h += '<div style="font-size:.72rem;font-weight:700;color:var(--bd);margin:12px 0 8px">Option Groups — pick one per group</div>';
    Object.entries(stats.grouped).forEach(([groupName, groupItems]) => {
      h += `<div class="option-group-card">
        <div style="font-weight:700;font-size:.75rem;margin-bottom:6px">${esc(groupName)} <span style="font-size:.58rem;color:var(--bd3)">${groupItems.length} options</span></div>
        <div class="option-cards-row">`;
      groupItems.sort((a, b) => (a.price || 0) - (b.price || 0)).forEach(it => {
        const photo = it.photos?.[0];
        const fp = getItemFootprintSqm(it);
        const fit = it.roomId ? getRoomFitReport(it) : null;
        h += `<div class="option-card ${it.scenarioPick ? 'picked' : ''}" onclick="pickScenarioItem('${it.id}','${esc(groupName)}')">
          ${it.scenarioPick ? '<div class="picked-badge">Selected</div>' : ''}
          ${photo ? `<img src="${esc(photo)}" class="option-card-img">` : `<div class="option-card-img-placeholder">${esc((getCatByKey(it.cat)?.e) || '📦')}</div>`}
          <div class="option-card-name">${esc(trunc(it.name, 20))}</div>
          <div class="option-card-price">${fmtEur(it.price)}</div>
          ${it.brand ? `<div class="option-card-meta">${esc(it.brand)}</div>` : ''}
          <div class="option-card-meta">${it.widthCm ? it.widthCm + '×' + (it.depthCm || '?') + '×' + (it.heightCm || '?') + ' cm' : 'No dims'}</div>
          ${fp ? `<div class="option-card-meta">${fp} m²</div>` : ''}
          ${it.energyClass ? `<div style="margin-top:2px">${energyBadge(it.energyClass)}</div>` : ''}
          ${fit ? `<div class="option-card-fit ${fit.fits ? 'fits' : 'no-fit'}">${fit.fits ? 'Fits' : 'Too big'}</div>` : ''}
          <div style="margin-top:3px">
            ${(it.pros || []).slice(0, 3).map(p => `<span class="mini-chip pro">${esc(p)}</span>`).join('')}
            ${(it.cons || []).slice(0, 2).map(c => `<span class="mini-chip con">${esc(c)}</span>`).join('')}
          </div>
        </div>`;
      });
      h += '</div></div>';
    });
  } else {
    h += '<div style="color:var(--bd3);font-size:.72rem;padding:16px;text-align:center;background:var(--bg);border-radius:var(--r);margin-top:10px">No option groups yet. Set the "Option group" field on Buy items to group alternatives (e.g. "Kitchen fridge shortlist").</div>';
  }

  // Budget by room
  const budgetByRoom = getBudgetByRoom();
  if (Object.keys(budgetByRoom).length) {
    h += '<div style="font-size:.72rem;font-weight:700;color:var(--bd);margin:12px 0 8px">Budget by Room</div>';
    Object.entries(budgetByRoom).sort((a, b) => b[1].est - a[1].est).forEach(([roomId, data]) => {
      const rm = getRoomById(roomId);
      h += `<div style="margin:4px 0">
        <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:2px">
          <span>${rm.emoji} ${esc(rm.label)} (${data.count})</span>
          <strong>${fmtEur(data.est, 0)}</strong>
        </div>
        ${progressBar(budgetMax ? Math.round(data.est / budgetMax * 100) : 0, 'var(--pk)', '4px')}
      </div>`;
    });
  }

  el.innerHTML = h;
}

function pickScenarioItem(itemId, groupName) {
  const items = ldBuy();
  items.forEach(it => {
    if (getOptionGroupKey(it) === groupName) {
      it.scenarioPick = it.id === itemId ? !it.scenarioPick : false;
      updBuyItem(it);
    }
  });
  rBudgetPlanner();
  if (typeof rVisualCompare === 'function') rVisualCompare();
  toast('Selection updated', 'info', 1200);
}

function applyScenario(mode) {
  const stats = getBuyScenarioStats();
  let targetItems;
  if (mode === 'cheapest') targetItems = stats.cheapestGroupItems;
  else if (mode === 'premium') targetItems = stats.premiumGroupItems;
  else targetItems = stats.selectedGroupItems;

  const targetIds = new Set(targetItems.map(it => it.id));
  ldBuy().forEach(it => {
    if (!getOptionGroupKey(it)) return;
    it.scenarioPick = targetIds.has(it.id);
    updBuyItem(it);
  });
  rBudgetPlanner();
  toast('Applied ' + mode + ' scenario', 'green', 2000);
}

// ── Enhanced Visual Comparison (Compare subtab) ──────────────
function rVisualCompare() {
  const el = document.getElementById('visual-compare-content'); if (!el) return;
  const cmpItems = ldCmp();
  const buyGroups = getBuyScenarioGroups();

  // Group compare items by category
  const grouped = groupBy(cmpItems, 'cat');
  let h = '';

  Object.entries(grouped).forEach(([cat, catItems]) => {
    if (catItems.length < 2) return;
    h += renderComparisonGroup(cat, catItems, 'cmp');
  });

  // Buy option groups
  Object.entries(buyGroups).forEach(([groupName, groupItems]) => {
    if (groupItems.length < 2) return;
    h += renderComparisonGroup(groupName, groupItems, 'buy');
  });

  if (!h) {
    h = '<div style="text-align:center;padding:24px;color:var(--bd3);font-size:.75rem">Add at least 2 products in the same category (Compare tab) or create option groups in the Buy tab to see visual comparisons with photos, size bars, and room impact.</div>';
  }

  el.innerHTML = h;
}

function renderComparisonGroup(title, items, source) {
  const maxW = Math.max(...items.map(it => it.widthCm || 0), 1);
  const maxD = Math.max(...items.map(it => it.depthCm || 0), 1);
  const maxH = Math.max(...items.map(it => it.heightCm || 0), 1);
  const maxPrice = Math.max(...items.map(it => it.price || 0), 1);
  const sorted = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
  const cheapest = sorted[0];

  let h = `<div class="visual-cmp-group">
    <div style="font-weight:700;font-size:.82rem;color:var(--pk);margin-bottom:8px">${esc(title)} <span style="font-size:.6rem;color:var(--bd3)">${items.length} options</span></div>
    <div class="visual-cmp-scroll">`;

  sorted.forEach((it, idx) => {
    const photo = it.photos?.[0];
    const fp = getItemFootprintSqm(it);
    const isCheapest = it.id === cheapest.id && items.length > 1;
    const fit = it.roomId ? getRoomFitReport(it) : null;
    const wPct = it.widthCm ? Math.round(it.widthCm / maxW * 100) : 0;
    const dPct = it.depthCm ? Math.round(it.depthCm / maxD * 100) : 0;
    const hPct = it.heightCm ? Math.round(it.heightCm / maxH * 100) : 0;
    const pricePct = it.price ? Math.round(it.price / maxPrice * 100) : 0;
    const priceDiff = (it.price || 0) - (cheapest.price || 0);

    h += `<div class="visual-cmp-card ${isCheapest ? 'best-value' : ''}">
      ${isCheapest ? '<div class="best-value-badge">Best Value</div>' : ''}
      <div class="visual-cmp-rank">#${idx + 1}</div>
      ${photo ? `<img src="${esc(photo)}" class="visual-cmp-img">` : `<div class="visual-cmp-img-placeholder">${esc((getCatByKey(it.cat)?.e) || '📦')}</div>`}
      <div class="visual-cmp-name">${esc(trunc(it.name, 24))}</div>
      ${it.brand ? `<div class="visual-cmp-brand">${esc(it.brand)}</div>` : ''}
      <div class="visual-cmp-price">${fmtEur(it.price)}</div>
      ${priceDiff > 0 ? `<div style="font-size:.55rem;color:var(--pk)">+${fmtEur(priceDiff, 0)} vs cheapest</div>` : ''}
      ${it.energyClass ? `<div style="margin:3px 0">${energyBadge(it.energyClass)}</div>` : ''}
      <div class="size-bars">
        <div class="size-bar-row"><span class="size-bar-label">W</span><div class="size-bar-track"><div class="size-bar-fill" style="width:${wPct}%;background:#60a5fa"></div></div><span class="size-bar-val">${it.widthCm || '?'}</span></div>
        <div class="size-bar-row"><span class="size-bar-label">D</span><div class="size-bar-track"><div class="size-bar-fill" style="width:${dPct}%;background:#34d399"></div></div><span class="size-bar-val">${it.depthCm || '?'}</span></div>
        <div class="size-bar-row"><span class="size-bar-label">H</span><div class="size-bar-track"><div class="size-bar-fill" style="width:${hPct}%;background:#fbbf24"></div></div><span class="size-bar-val">${it.heightCm || '?'}</span></div>
      </div>
      ${fp ? `<div style="font-size:.58rem;color:var(--bd3);margin:3px 0">Footprint: ${fp} m²</div>` : ''}
      ${fit ? `<div class="visual-cmp-fit ${fit.fits ? 'fits' : 'no-fit'}">${fit.fits ? 'Fits' : 'Won\'t fit'} · ${fit.footprintPct}% of room</div>` : ''}
      <div class="visual-cmp-price-bar"><div class="price-bar-fill" style="width:${pricePct}%"></div></div>
      <div class="visual-cmp-chips">
        ${(it.pros || []).slice(0, 3).map(p => `<span class="mini-chip pro">${esc(trunc(p, 15))}</span>`).join('')}
        ${(it.cons || []).slice(0, 2).map(c => `<span class="mini-chip con">${esc(trunc(c, 15))}</span>`).join('')}
      </div>
      ${source === 'buy' ? `<button class="btn sml pri" style="margin-top:5px;width:100%" onclick="pickScenarioItem('${it.id}','${esc(getOptionGroupKey(it))}')">${it.scenarioPick ? 'Selected' : 'Pick this'}</button>` : ''}
    </div>`;
  });

  h += '</div>';

  // Size difference summary
  if (sorted.length >= 2) {
    const first = sorted[0], last = sorted[sorted.length - 1];
    const wDiff = Math.abs((last.widthCm || 0) - (first.widthCm || 0));
    const dDiff = Math.abs((last.depthCm || 0) - (first.depthCm || 0));
    const hDiff = Math.abs((last.heightCm || 0) - (first.heightCm || 0));
    const pDiff = Math.abs((last.price || 0) - (first.price || 0));
    h += `<div class="size-diff-summary">
      <span style="font-weight:600">Size spread:</span> W: ${wDiff}cm · D: ${dDiff}cm · H: ${hDiff}cm · Price: ${fmtEur(pDiff, 0)}
    </div>`;
  }

  h += '</div>';
  return h;
}

// ── Plan Tools Panel rendering ───────────────────────────────
function rPlanTools() {
  const el = document.getElementById('plan-tools-content'); if (!el) return;
  const hasBp = !!_blueprintImg;

  let h = '<div style="margin-bottom:6px"><div style="font-size:.62rem;font-weight:600;margin-bottom:4px">Preloaded Blueprints</div>';
  PRELOADED_BLUEPRINTS.forEach(bp => {
    const isActive = _blueprintImg && ldPlan()?.blueprintId === bp.id;
    h += `<button class="btn sml ${isActive ? 'pri' : ''}" onclick="loadPreloadedBlueprint('${bp.id}')" style="width:100%;margin-bottom:3px;font-size:.6rem;text-align:left">${isActive ? '✓ ' : ''}${esc(bp.label)}</button>`;
  });
  h += '</div>';

  h += `<div style="margin-bottom:6px">
    <button class="btn sml" onclick="uploadBlueprint()" style="width:100%;margin-bottom:3px;font-size:.6rem">📁 Upload custom blueprint</button>
    ${hasBp ? `<button class="btn sml dan" onclick="removeBlueprint()" style="width:100%;margin-bottom:4px;font-size:.6rem">🗑️ Remove blueprint</button>
      <label style="font-size:.55rem;color:var(--bd3);display:flex;align-items:center;gap:4px">
        Opacity: <input type="range" min="0.1" max="0.8" step="0.05" value="${_blueprintOpacity}" oninput="setBlueprintOpacity(this.value)" style="flex:1">
      </label>` : ''}
  </div>`;

  el.innerHTML = h;
}

// ── Buy subtab navigation ────────────────────────────────────
let _buySubtab = 'items';

function switchBuySubtab(tab) {
  _buySubtab = tab;
  document.querySelectorAll('.buy-subtab').forEach(el => el.classList.toggle('active', el.dataset.subtab === tab));
  document.querySelectorAll('.buy-subtab-panel').forEach(el => el.classList.toggle('active', el.id === 'buy-sub-' + tab));
  if (tab === 'fit') rFitTest();
  else if (tab === 'budget') rBudgetPlanner();
}

// ── Compare subtab navigation ────────────────────────────────
let _cmpSubtab = 'table';

function switchCmpSubtab(tab) {
  _cmpSubtab = tab;
  document.querySelectorAll('.cmp-subtab').forEach(el => el.classList.toggle('active', el.dataset.subtab === tab));
  document.querySelectorAll('.cmp-subtab-panel').forEach(el => el.classList.toggle('active', el.id === 'cmp-sub-' + tab));
  if (tab === 'visual') rVisualCompare();
}

// ── Hook into plan rendering for blueprint background ────────
function initSmartPlanHook() {
  if (typeof window.renderPlan !== 'function') return;
  const origRender = window.renderPlan;
  window.renderPlan = function () {
    origRender();
    // Draw blueprint BEHIND everything
    if (_blueprintImg) {
      const canvas = document.getElementById('canvas-plan');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.globalAlpha = _blueprintOpacity;
      ctx.drawImage(_blueprintImg, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };
}

// ── Hook into rPlanUI to also render smart panels ────────────
function initSmartPlanUIHook() {
  if (typeof window.rPlanUI !== 'function') return;
  const origPlanUI = window.rPlanUI;
  window.rPlanUI = function () {
    origPlanUI();
    rPlanTools();
    rSpaceAnalyzer();
    rSpaceOptimizer();
  };
}

// ── Init ─────────────────────────────────────────────────────
function initSmart() {
  initPillFilter('fit', 'room', '');
  restoreBlueprintFromPlan();
  initSmartPlanHook();
  initSmartPlanUIHook();
}

// Defer init until after all scripts load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initSmart, 50));
} else {
  setTimeout(initSmart, 50);
}
