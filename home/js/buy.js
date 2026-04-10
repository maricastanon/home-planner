// ============================================================
// buy.js — Item Wishlist · Photos, metadata, room grouping
// ============================================================

// Active chip state for add/edit modal
let _buyPros = [], _buyCons = [];
let _editBuyPros = [], _editBuyCons = [];
let _buySubtab = 'items';

// ── MAIN RENDER ──────────────────────────────────────────────
function rBuy() {
  rBuyBudget();
  syncBuySubtabs();
  if (_buySubtab === 'fit') {
    rFitTest();
  } else if (_buySubtab === 'budget') {
    rBudgetPlanner();
  } else if (_buySubtab === 'roommap') {
    if (typeof rRoomMap === 'function') rRoomMap();
  } else if (_buySubtab === '3d') {
    rRoom3D();
  } else if (_buySubtab === 'wishlist') {
    rWishlistPlanner();
  } else {
    rBuyList();
  }
  updateCompareFab();
}

// ── BUDGET BAR ──────────────────────────────────────────────
function rBuyBudget() {
  const b   = getBudgetStats();
  const items = ldBuy();
  const el  = document.getElementById('buy-budget'); if(!el) return;
  const byPrio = { must:0, want:0, nice:0 };
  const existingCount = items.filter(it => normalizeItemSource(it.source) === 'existing').length;
  items.forEach(it => {
    if(it.prio) byPrio[it.prio] = (byPrio[it.prio]||0) + getItemBudgetValue(it);
  });
  const bcolor = b.pct>=100?'var(--pk)':b.pct>=80?'#d97706':'var(--gn)';
  el.innerHTML = `<div class="budget-hero">
    <div style="display:flex;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-bottom:8px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:2rem;color:${bcolor};line-height:1">${fmtEur(b.est,0)}</div>
        <div style="font-size:.65rem;color:var(--bd3)">new purchases in budget</div>
      </div>
      <div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--gn)">${fmtEur(b.spent,0)}</div>
        <div style="font-size:.65rem;color:var(--bd3)">spent so far</div>
      </div>
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:${b.remaining<0?'var(--pk)':'var(--bd2)'}">${fmtEur(Math.abs(b.remaining),0)}</div>
        <div style="font-size:.65rem;color:var(--bd3)">${b.remaining<0?'⚠️ over budget':'remaining'}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <span style="font-size:.65rem;color:var(--bd3)">Budget:</span>
        <input type="number" id="max-budget-inp" value="${b.max}" style="width:88px;font-size:.82rem;padding:5px 8px;border:1.5px solid var(--border);border-radius:10px;font-weight:700"
          onchange="updateMaxBudget(this.value)">
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--bd3);margin-bottom:3px">
      <span>${b.pct}% of budget used</span>
      <span>${fmtEur(b.est,0)} / ${fmtEur(b.max,0)}</span>
    </div>
    <div style="height:10px;background:var(--bg2);border-radius:5px;overflow:hidden;position:relative">
      <div style="height:100%;width:${b.pct}%;background:${bcolor};border-radius:5px;transition:width .5s;${b.pct>=100?'animation:pulse-bg 1.5s infinite':''}"></div>
    </div>
    <div class="mini-stats" style="margin-top:10px">
      <div class="mini-stat"><div class="ms-num" style="color:#dc2626;font-size:1rem">${fmtEur(byPrio.must,0)}</div><div class="ms-lbl">🔴 Must-have</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:#d97706;font-size:1rem">${fmtEur(byPrio.want,0)}</div><div class="ms-lbl">🟡 Want</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:var(--gn);font-size:1rem">${fmtEur(byPrio.nice,0)}</div><div class="ms-lbl">🟢 Nice-to-have</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:var(--gn);font-size:1rem">${items.filter(i=>i.bought).length}</div><div class="ms-lbl">✅ Bought</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:var(--bd2);font-size:1rem">${existingCount}</div><div class="ms-lbl">🏚️ Existing items</div></div>
    </div>
  </div>`;
}

function updateMaxBudget(v) {
  const s=ldSettings(); s.maxBudget=parseFloat(v)||5000; svSettings(s);
  rBuyBudget(); updateStatusBar();
}

// ── LIST ─────────────────────────────────────────────────────
function rBuyList() {
  const items   = ldBuy();
  const settings= ldSettings();
  const names   = settings.names||{M:'Mari',A:'Alexander'};
  const q       = document.getElementById('buy-search')?.value.toLowerCase()||'';
  const roomF   = getPillVal('buy','room');
  const catF    = getPillVal('buy','cat');
  const prioF   = getPillVal('buy','prio');
  const statusF = getPillVal('buy','status');
  const sourceF = getPillVal('buy','source');
  const sortV   = getPillVal('buy','sort')||'vote';

  let list = items.filter(it => {
    if (q && !(it.name+' '+(it.brand||'')+' '+(it.type||'')+' '+(it.notes||'')).toLowerCase().includes(q)) return false;
    if (roomF && it.roomId !== roomF) return false;
    if (catF  && it.category !== catF) return false;
    if (prioF && it.prio !== prioF) return false;
    if (sourceF && normalizeItemSource(it.source) !== sourceF) return false;
    if (statusF==='bought'  && !it.bought)  return false;
    if (statusF==='pending' && it.bought)   return false;
    if (statusF==='agreed'  && !(it.voteM==='yes'&&it.voteA==='yes')) return false;
    if (statusF==='disputed' && !((it.voteM==='yes'&&it.voteA==='no')||(it.voteM==='no'&&it.voteA==='yes'))) return false;
    return true;
  });

  if (sortV==='vote')     list.sort((a,b)=>voteScore(b)-voteScore(a));
  if (sortV==='price-hi') list.sort((a,b)=>(b.price||0)-(a.price||0));
  if (sortV==='price-lo') list.sort((a,b)=>(a.price||0)-(b.price||0));
  if (sortV==='prio')     list.sort((a,b)=>({must:0,want:1,nice:2}[a.prio]||0)-({must:0,want:1,nice:2}[b.prio]||0));
  if (sortV==='name')     list=sortBy(list,'name');
  if (sortV==='status')   list=sortBy(list,'itemStatus');

  const el = document.getElementById('buy-list'); if(!el) return;
  if (!list.length) { el.innerHTML='<div class="empty"><div class="ei">🛒</div>No items found. Add your first item!</div>'; return; }

  // View mode
  const viewMode = getPillVal('buy','view') || 'room';

  if (viewMode==='grid') {
    el.innerHTML = `<div class="items-grid">${list.map(it=>renderItemCard(it,names)).join('')}</div>`;
    return;
  }

  // Room grouping (default)
  if (viewMode==='room') {
    const byRoom = {};
    list.forEach(it => {
      const k = it.roomId || 'other';
      if (!byRoom[k]) byRoom[k] = [];
      byRoom[k].push(it);
    });
    el.innerHTML = Object.entries(byRoom).map(([rId, roomItems]) => renderRoomGroup(rId, roomItems, names)).join('');
    // Open all by default
    document.querySelectorAll('.room-group').forEach(g => g.classList.add('open'));
    return;
  }

  // Type grouping
  if (viewMode==='type') {
    const byType = groupBy(list, 'type');
    el.innerHTML = Object.entries(byType).map(([type, typeItems]) => `
      <div class="type-group">
        <div class="type-group-header">${esc(type||'Other')} <span class="type-group-count">${typeItems.length}</span></div>
        <div class="items-grid">${typeItems.map(it=>renderItemCard(it,names)).join('')}</div>
      </div>`
    ).join('');
  }
}

function renderRoomGroup(roomId, items, names) {
  const room   = getRoomById(roomId);
  const rLabel = room.label || 'Other';
  const rColor = room.color || '#f3f4f6';
  const rDark  = room.colorDark || '#374151';
  const rEmoji = room.emoji || '📦';
  const total  = items.reduce((s,it)=>s+getItemBudgetValue(it),0);
  const spent  = items.filter(i=>i.bought).reduce((s,it)=>s+(it.actualPrice||it.price||0),0);
  const bought = items.filter(i=>i.bought).length;

  // Group by type within room
  const byType = groupBy(items,'type');

  return `<div class="room-group open" id="rg-${roomId}">
    <div class="room-group-header" onclick="this.parentElement.classList.toggle('open')">
      <div class="room-color-bar" style="background:${rDark}"></div>
      <div>
        <div class="room-group-name">${rEmoji} ${esc(rLabel)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">${items.length} item${items.length!==1?'s':''}</div>
      </div>
      <div class="room-group-meta">
        <div class="room-group-budget" style="color:${rDark}">${fmtEur(total,0)}</div>
        <div style="font-size:.6rem;color:var(--bd3)">${bought}/${items.length} bought</div>
        ${progressBar(items.length?Math.round(bought/items.length*100):0,rDark,'4px')}
      </div>
      <span style="font-size:.7rem;color:var(--bd3);margin-left:6px">▼</span>
    </div>
    <div class="room-items-wrap">
      ${Object.entries(byType).map(([type,typeItems])=>`
        <div class="type-group">
          <div class="type-group-header">
            ${esc(type||'General')}
            <span class="type-group-count">${typeItems.length}</span>
            <button class="btn sml" style="margin-left:auto" onclick="openCompareForType(${jsq(type||'')},${jsq(roomId)})">⚖️ Compare</button>
          </div>
          <div class="items-grid">${typeItems.map(it=>renderItemCard(it,names)).join('')}</div>
        </div>`
      ).join('')}
    </div>
  </div>`;
}

function renderItemCard(it, names) {
  const prioConf = BUY_PRIOS.find(p=>p.k===it.prio)||{color:'#f1f5f9',colorText:'#64748b',e:'',l:''};
  const room     = getRoomById(it.roomId);
  const sourceMeta = getItemSourceMeta(it.source);
  const roomRole = it.roomRole || 'candidate';
  const vs       = voteScore(it);
  const bothYes  = it.voteM==='yes'&&it.voteA==='yes';
  const bothNo   = it.voteM==='no'&&it.voteA==='no';
  const disputed = (it.voteM==='yes'&&it.voteA==='no')||(it.voteM==='no'&&it.voteA==='yes');
  const statusConf = ITEM_STATUSES.find(s=>s.k===it.itemStatus)||ITEM_STATUSES[0];
  const photo    = it.photos?.[0] || '';

  let borderColor='var(--border)';
  if(bothYes) borderColor='#86efac';
  if(disputed)borderColor='#fcd34d';
  if(it.bought)borderColor='#86efac';

  const dimTxt = dimStr(it);

  return `<div class="item-card ${it.bought?'bought':''}" id="ic-${it.id}" style="border-color:${borderColor}" onclick="openItemDetail('${it.id}')">
    <div class="item-card-photo">
      ${photo
        ? `<img src="${esc(photo)}" class="item-card-img" alt="${esc(it.name)}" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`
        : ''}
      <div class="item-card-no-img" ${photo?'style="display:none"':''}>${it.category==='Appliances'?'🏠':it.category==='Furniture'?'🛋️':'📦'}</div>
      <div class="item-card-badges">
        <span class="badge" style="background:${prioConf.color};color:${prioConf.colorText}">${prioConf.e} ${esc(prioConf.l)}</span>
        ${it.bought?'<span class="badge green">✅ Bought</span>':''}
        ${normalizeItemSource(it.source)==='existing'?`<span class="badge blue">${esc(sourceMeta.badge)}</span>`:''}
        ${roomRole==='must'?'<span class="badge purple">📍 Must place</span>':''}
        ${bothYes?'<span class="badge green">💕 Both!</span>':''}
        ${disputed?'<span class="badge orange">⚡</span>':''}
      </div>
      ${it.price && normalizeItemSource(it.source)!=='existing' ?`<div class="item-card-price">${fmtEur(it.price,0)}</div>`:''}
    </div>
    <div class="item-card-body">
      <div class="item-card-name">${esc(it.name)}</div>
      ${it.brand?`<div class="item-card-brand">${esc(it.brand)}${it.model?' · '+esc(it.model):''}</div>`:''}
      ${it.roomId?`<div class="item-card-brand">${esc(room.emoji || '📦')} ${esc(room.label || 'Other')}</div>`:''}
      ${normalizeItemSource(it.source)==='existing'?`<div class="item-card-brand">🏚️ Already owned · budget excluded</div>`:''}
      ${it.optionGroup?`<div class="item-card-brand">🧩 ${esc(it.optionGroup)}</div>`:''}
      ${dimTxt?`<div class="item-card-dims">📐 ${esc(dimTxt)}</div>`:''}
      ${it.energyRating?`<div style="margin-top:2px">${energyBadge(it.energyRating)}</div>`:''}
      <div class="item-card-votes" onclick="event.stopPropagation()">
        <div class="voter">
          <div class="voter-name">${esc(names.M||'M')}</div>
          <div class="vote-btns">
            <button class="vbtn ${it.voteM==='yes'?'active-yes':''}"  onclick="setItemVote('${it.id}','M','yes')" title="Yes">👍</button>
            <button class="vbtn ${it.voteM==='meh'?'active-meh':''}"  onclick="setItemVote('${it.id}','M','meh')" title="Maybe">🤔</button>
            <button class="vbtn ${it.voteM==='no'?'active-no':''}"   onclick="setItemVote('${it.id}','M','no')"  title="No">👎</button>
          </div>
        </div>
        <div class="voter">
          <div class="voter-name">${esc(names.A||'A')}</div>
          <div class="vote-btns">
            <button class="vbtn ${it.voteA==='yes'?'active-yes':''}"  onclick="setItemVote('${it.id}','A','yes')" title="Yes">👍</button>
            <button class="vbtn ${it.voteA==='meh'?'active-meh':''}"  onclick="setItemVote('${it.id}','A','meh')" title="Maybe">🤔</button>
            <button class="vbtn ${it.voteA==='no'?'active-no':''}"   onclick="setItemVote('${it.id}','A','no')"  title="No">👎</button>
          </div>
        </div>
        <div class="vote-score ${vs>0?'pos':vs<0?'neg':''}">${vs>0?'+':''}${vs}</div>
      </div>
      <div class="item-card-actions" onclick="event.stopPropagation()">
        ${it.buyLink?`<a href="${esc(it.buyLink)}" target="_blank" class="btn sml" onclick="event.stopPropagation()">🛒 Buy</a>`:''}
        <button class="btn sml" onclick="event.stopPropagation();placeItemInPlan('${it.id}')">🏠 Plan</button>
        ${!it.bought&&normalizeItemSource(it.source)!=='existing'?`<button class="btn sml suc" onclick="event.stopPropagation();openBuyModal('${it.id}')">✅</button>`:''}
        <button class="btn sml" onclick="event.stopPropagation();openEditItem('${it.id}')">✏️</button>
      </div>
    </div>
  </div>`;
}

// ── Item Detail Modal ─────────────────────────────────────────
function openItemDetail(id) {
  const it = getBuyItem(id); if(!it) return;
  const settings = ldSettings();
  const names    = settings.names||{M:'Mari',A:'Alexander'};
  const room     = getRoomById(it.roomId);
  const sourceMeta = getItemSourceMeta(it.source);
  const cat      = getCatByKey(it.category);
  const statusConf = ITEM_STATUSES.find(s=>s.k===it.itemStatus)||ITEM_STATUSES[0];
  const photos   = it.photos||[];

  const el = document.getElementById('item-detail-content'); if(!el) return;

  // Build status pipeline
  const pipeHTML = `<div class="status-pipeline">
    ${ITEM_STATUSES.map(s=>`
      <div class="pipe-step ${it.itemStatus===s.k?'active':''} ${ITEM_STATUSES.findIndex(x=>x.k===it.itemStatus)>ITEM_STATUSES.findIndex(x=>x.k===s.k)?'done':''}"
           onclick="setItemStatus('${it.id}','${s.k}')">${s.e} ${esc(s.l)}</div>`
    ).join('')}
  </div>`;

  el.innerHTML = `
    <!-- Photo gallery -->
    <div style="margin-bottom:12px">
      <div id="main-photo-wrap" style="border-radius:var(--r2);overflow:hidden;background:var(--bg2);aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:6px">
        ${photos.length
          ? `<img id="main-photo" src="${esc(photos[0])}" style="width:100%;height:100%;object-fit:cover">`
          : `<div style="font-size:4rem;opacity:.2">${cat?.k==='Appliances'?'🏠':'🛋️'}</div>`}
      </div>
      ${photos.length>1?`<div class="photo-gallery">${photos.map((p,i)=>`
        <img src="${esc(p)}" class="photo-thumb ${i===0?'active':''}" onclick="setMainPhoto(${jsq(p)},${i})">`
      ).join('')}</div>`:''}
      <label class="btn ghost" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;margin-top:6px">
        📷 Add photo <input type="file" accept="image/*" multiple style="display:none" onchange="uploadItemPhotos('${it.id}',this.files)">
      </label>
      ${it.photos?.length?`<button class="btn sml dan" style="margin-left:5px" onclick="clearItemPhotos('${it.id}')">🗑️ Photos</button>`:''}
    </div>

    ${pipeHTML}

    <!-- Core info -->
    <div class="info-grid" style="margin:10px 0">
      ${it.brand?`<div class="info-item"><span class="info-lbl">Brand</span><span class="info-val">${esc(it.brand)}</span></div>`:''}
      ${it.model?`<div class="info-item"><span class="info-lbl">Model</span><span class="info-val">${esc(it.model)}</span></div>`:''}
      <div class="info-item"><span class="info-lbl">Source</span><span class="info-val">${esc(sourceMeta.e)} ${esc(sourceMeta.l)}</span></div>
      ${it.price?`<div class="info-item"><span class="info-lbl">Price</span><span class="info-val" style="color:var(--pk);font-weight:700">${fmtEur(it.price)}</span></div>`:''}
      ${it.originalPrice?`<div class="info-item"><span class="info-lbl">Original</span><span class="info-val"><s>${fmtEur(it.originalPrice)}</s></span></div>`:''}
      ${room?`<div class="info-item"><span class="info-lbl">Room</span><span class="info-val">${room.emoji} ${esc(room.label)}</span></div>`:''}
      ${it.optionGroup?`<div class="info-item"><span class="info-lbl">Option group</span><span class="info-val">${esc(it.optionGroup)}</span></div>`:''}
      ${it.roomRole==='must'?`<div class="info-item"><span class="info-lbl">Room role</span><span class="info-val">📍 Must place</span></div>`:''}
      ${it.energyRating?`<div class="info-item"><span class="info-lbl">Energy</span><span class="info-val">${energyBadge(it.energyRating)}</span></div>`:''}
      ${it.color?`<div class="info-item"><span class="info-lbl">Color</span><span class="info-val">${esc(it.color)}</span></div>`:''}
      ${it.material?`<div class="info-item"><span class="info-lbl">Material</span><span class="info-val">${esc(it.material)}</span></div>`:''}
      ${it.weightKg?`<div class="info-item"><span class="info-lbl">Weight</span><span class="info-val">${it.weightKg} kg</span></div>`:''}
      ${it.warranty?`<div class="info-item"><span class="info-lbl">Warranty</span><span class="info-val">${esc(it.warranty)}</span></div>`:''}
    </div>

    <!-- Dimensions -->
    ${it.widthCm||it.depthCm||it.heightCm?`
    <div style="background:var(--bg2);border-radius:var(--r);padding:10px 12px;margin-bottom:10px">
      <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--bd3);margin-bottom:6px">📐 Dimensions</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:.82rem">
        ${it.widthCm?`<span><strong>${it.widthCm}</strong> <span style="color:var(--bd3)">cm W</span></span>`:''}
        ${it.depthCm?`<span><strong>${it.depthCm}</strong> <span style="color:var(--bd3)">cm D</span></span>`:''}
        ${it.heightCm?`<span><strong>${it.heightCm}</strong> <span style="color:var(--bd3)">cm H</span></span>`:''}
        ${it.widthCm&&it.depthCm?`<span style="color:var(--bd3)">≈ ${itemFootprint(it)} m² footprint</span>`:''}
      </div>
      ${it.widthCm&&it.depthCm&&it.heightCm?renderHeightViz(it):''}
    </div>`:''}

    ${renderRoomFitPanel(it)}

    <!-- Specs -->
    ${it.specs&&Object.keys(it.specs).length?`
    <div style="margin-bottom:10px">
      <div class="sec-hdr" onclick="togSection('detail-specs-body','detail-specs-arr')">Specs <span id="detail-specs-arr">▼</span></div>
      <div id="detail-specs-body" class="info-grid">
        ${Object.entries(it.specs).filter(([k,v])=>v).map(([k,v])=>`
          <div class="info-item"><span class="info-lbl">${esc(k)}</span><span class="info-val">${esc(v)}</span></div>`).join('')}
      </div>
    </div>`:''}

    <!-- Pros / Cons -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div>
        <div style="font-size:.65rem;font-weight:700;color:var(--gns);margin-bottom:4px">✅ Pros</div>
        <div class="pc-list">${(it.pros||[]).map(p=>`<span class="chip pro">${esc(p)}</span>`).join('')||'<span style="color:var(--bd3);font-size:.7rem">None added</span>'}</div>
      </div>
      <div>
        <div style="font-size:.65rem;font-weight:700;color:var(--pks);margin-bottom:4px">❌ Cons</div>
        <div class="pc-list">${(it.cons||[]).map(c=>`<span class="chip con">${esc(c)}</span>`).join('')||'<span style="color:var(--bd3);font-size:.7rem">None added</span>'}</div>
      </div>
    </div>

    <!-- Vote notes -->
    ${it.voteNoteM||it.voteNoteA?`
    <div style="margin-bottom:10px">
      ${it.voteNoteM?`<div class="note-box">🌸 ${esc(names.M)}: "${esc(it.voteNoteM)}"</div>`:''}
      ${it.voteNoteA?`<div class="note-box">💼 ${esc(names.A)}: "${esc(it.voteNoteA)}"</div>`:''}
    </div>`:''}

    ${it.notes?`<div class="note-box" style="margin-bottom:10px">${esc(it.notes)}</div>`:''}

    <!-- Links -->
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      ${it.buyLink?`<a href="${esc(it.buyLink)}" target="_blank" class="btn pri">🛒 Buy Now</a>`:''}
      ${it.altLink?`<a href="${esc(it.altLink)}" target="_blank" class="btn ghost">🔗 Alternative</a>`:''}
      <button class="btn" onclick="placeItemInPlan('${it.id}')">📐 Place in Floor Plan</button>
      <button class="btn" onclick="addToCompare('${it.id}')">⚖️ Add to Compare</button>
    </div>

    <!-- Actions -->
    <div class="card-actions">
      ${!it.bought && normalizeItemSource(it.source)!=='existing'
        ?`<button class="btn suc" onclick="openBuyModal('${it.id}')">✅ Mark as Bought</button>`
        : it.bought
          ?`<button class="btn ghost" onclick="unmarkBought('${it.id}')">↺ Unmark bought</button>`
          :`<button class="btn ghost" onclick="placeItemInPlan('${it.id}')">🏠 Already owned</button>`}
      <button class="btn" onclick="openEditItem('${it.id}')">✏️ Edit</button>
      <button class="btn dan" onclick="confirmDlg('Delete this item?',()=>{delBuyItem('${it.id}');closeModal('item-detail-modal');rBuy();toast('Deleted','warn')})">🗑️ Delete</button>
    </div>
  `;
  document.getElementById('item-detail-title').textContent = it.name;
  openModal('item-detail-modal');
}

function renderHeightViz(it) {
  const maxH = 250; // px for max scale
  const normalH = Math.min(maxH, (it.heightCm/300)*maxH);
  const normalW = Math.min(120, (it.widthCm/200)*120);
  return `<div style="margin-top:8px;display:flex;align-items:flex-end;gap:8px">
    <div style="font-size:.6rem;color:var(--bd3)">Height view:</div>
    <div style="display:flex;align-items:flex-end;gap:4px">
      <div style="width:${normalW}px;height:${normalH}px;background:linear-gradient(135deg,var(--pk2),var(--pk));border-radius:4px 4px 0 0;opacity:.6;position:relative">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:.65rem;font-weight:700;color:#fff">${it.heightCm}cm</div>
      </div>
      <div style="font-size:.6rem;color:var(--bd3)">
        <div>↕ ${it.heightCm}cm</div>
        <div>↔ ${it.widthCm}cm</div>
      </div>
    </div>
  </div>`;
}

function renderRoomFitPanel(it) {
  if (typeof getRoomFitAnalysis !== 'function') return '';
  const fit = getRoomFitAnalysis(it);
  if (!fit) return '';
  const tone = fit.fits ? 'var(--gn)' : '#dc2626';
  const title = fit.fits
    ? (fit.fitsRotatedOnly ? 'Fits if rotated' : 'Fits in assigned room')
    : 'Needs a different size or room';
  return `<div style="background:${fit.fits?'var(--gnl)':'#fef2f2'};border:1px solid ${fit.fits?'#86efac':'#fecaca'};border-radius:12px;padding:10px 12px;margin-bottom:10px">
    <div style="font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${tone};margin-bottom:4px">Room fit</div>
    <div style="font-size:.82rem;font-weight:700;color:${tone};margin-bottom:3px">${title}</div>
    <div style="font-size:.7rem;color:var(--bd2)">
      Uses <strong>${fit.footprintPct}%</strong> of ${esc(fit.roomLabel)} · leaves <strong>${fit.remainingAreaM2.toFixed(2)} m²</strong> free
    </div>
    <div style="font-size:.64rem;color:var(--bd3);margin-top:4px">
      Room: ${fit.roomWidthM.toFixed(2)} × ${fit.roomDepthM.toFixed(2)} m · Item: ${fit.itemWidthM.toFixed(2)} × ${fit.itemDepthM.toFixed(2)} m
    </div>
  </div>`;
}

function setMainPhoto(src, idx) {
  const img = document.getElementById('main-photo');
  if(img) img.src=src;
  document.querySelectorAll('.photo-thumb').forEach((t,i)=>t.classList.toggle('active',i===idx));
}

async function uploadItemPhotos(id, files) {
  if(!files||!files.length) return;
  toast('Uploading photos...','info');
  const ok = await attachPhotos(id, Array.from(files), 'buy');
  if (!ok) return;
  rBuy(); toast(`${files.length} photo${files.length>1?'s':''} added 📷`,'green');
  openItemDetail(id); // refresh modal
}

function clearItemPhotos(id) {
  const it=getBuyItem(id); if(!it) return;
  it.photos=[]; updBuyItem(it); rBuy(); openItemDetail(id);
  toast('Photos removed','warn');
}

function setItemStatus(id, status) {
  const it=getBuyItem(id); if(!it) return;
  it.itemStatus=status; updBuyItem(it); openItemDetail(id); rBuy();
}

// ── CRUD ─────────────────────────────────────────────────────
function addBuyItemFromForm() {
  const name=fVal('b-name'); if(!name){toast('Please enter a name','red');return;}
  const cat = fVal('b-cat');
  const specs = {};
  const catConf = getCatByKey(cat);
  (catConf?.specsTemplate||[]).forEach(k=>{ const v=fVal('bspec-'+slugify(k)); if(v) specs[k]=v; });
  const it = {
    id: uid(), name,
    brand:    fVal('b-brand'),
    model:    fVal('b-model'),
    category: cat||'Furniture',
    type:     fVal('b-type'),
    roomId:   fVal('b-room'),
    prio:     fVal('b-prio')||'want',
    price:    fNum('b-price'),
    originalPrice: fNum('b-orig-price'),
    currency: '€',
    source:   normalizeItemSource(fVal('b-source')),
    buyLink:  fVal('b-buylink'),
    altLink:  fVal('b-altlink'),
    optionGroup: fVal('b-option-group'),
    roomRole: fVal('b-room-role') || 'candidate',
    widthCm:  fNum('b-width'),
    depthCm:  fNum('b-depth'),
    heightCm: fNum('b-height'),
    weightKg: fNum('b-weight'),
    color:    fVal('b-color'),
    material: fVal('b-material'),
    energyRating: fVal('b-energy'),
    warranty: fVal('b-warranty'),
    specs,
    pros:     [..._buyPros],
    cons:     [..._buyCons],
    voteM:'', voteA:'', voteNoteM:'', voteNoteA:'',
    itemStatus: fVal('b-status')||'wishlist',
    bought:false, actualPrice:0, boughtDate:'', boughtStore:'',
    photos: [], placedInPlan:false, planX:0, planY:0, planFloor:'',
    notes: fVal('b-notes'),
    created: Date.now(),
  };
  addBuyItem(it);
  closeModal('buy-add-modal');
  _buyPros=[]; _buyCons=[];
  rBuy(); toast(name+' added 🛒','green');
  updateStatusBar();
}

function openEditItem(id) {
  const it=getBuyItem(id); if(!it) return;
  syncRoomSelect('be-room', { blankLabel:'-- none --', selected:it.roomId||'' });
  fSet('be-id',id); fSet('be-name',it.name); fSet('be-brand',it.brand||'');
  fSet('be-model',it.model||''); fSet('be-cat',it.category||'Furniture');
  fSet('be-type',it.type||''); fSet('be-room',it.roomId||'');
  fSet('be-source',normalizeItemSource(it.source));
  fSet('be-prio',it.prio||'want'); fSet('be-price',it.price||'');
  fSet('be-orig-price',it.originalPrice||''); fSet('be-buylink',it.buyLink||'');
  fSet('be-altlink',it.altLink||''); fSet('be-width',it.widthCm||'');
  fSet('be-option-group',it.optionGroup||''); fSet('be-room-role',it.roomRole||'candidate');
  fSet('be-depth',it.depthCm||''); fSet('be-height',it.heightCm||'');
  fSet('be-weight',it.weightKg||''); fSet('be-color',it.color||'');
  fSet('be-material',it.material||''); fSet('be-energy',it.energyRating||'');
  fSet('be-warranty',it.warranty||''); fSet('be-notes',it.notes||'');
  fSet('be-status',it.itemStatus||'wishlist');
  _editBuyPros=[...(it.pros||[])]; _editBuyCons=[...(it.cons||[])];
  rEditBuyChips();
  openModal('buy-edit-modal');
}

function rEditBuyChips() {
  const pe=document.getElementById('edit-buy-pros'); if(pe) pe.innerHTML=_editBuyPros.map(p=>`<span class="chip pro">${esc(p)} <span class="chip-rm" onclick="removeEditPro(${jsq(p)})">✕</span></span>`).join('');
  const ce=document.getElementById('edit-buy-cons'); if(ce) ce.innerHTML=_editBuyCons.map(c=>`<span class="chip con">${esc(c)} <span class="chip-rm" onclick="removeEditCon(${jsq(c)})">✕</span></span>`).join('');
}
function addEditPro(v){ if(!v?.trim()) return; _editBuyPros.push(v.trim()); rEditBuyChips(); }
function removeEditPro(v){ _editBuyPros=_editBuyPros.filter(x=>x!==v); rEditBuyChips(); }
function addEditCon(v){ if(!v?.trim()) return; _editBuyCons.push(v.trim()); rEditBuyChips(); }
function removeEditCon(v){ _editBuyCons=_editBuyCons.filter(x=>x!==v); rEditBuyChips(); }

function saveBuyEdit() {
  const id=fVal('be-id'); const it=getBuyItem(id); if(!it) return;
  it.name=fVal('be-name')||it.name; it.brand=fVal('be-brand'); it.model=fVal('be-model');
  it.category=fVal('be-cat'); it.type=fVal('be-type'); it.roomId=fVal('be-room');
  it.source=normalizeItemSource(fVal('be-source'));
  it.prio=fVal('be-prio'); it.price=fNum('be-price'); it.originalPrice=fNum('be-orig-price');
  it.buyLink=fVal('be-buylink'); it.altLink=fVal('be-altlink');
  it.optionGroup=fVal('be-option-group'); it.roomRole=fVal('be-room-role')||'candidate';
  it.widthCm=fNum('be-width'); it.depthCm=fNum('be-depth'); it.heightCm=fNum('be-height');
  it.weightKg=fNum('be-weight'); it.color=fVal('be-color'); it.material=fVal('be-material');
  it.energyRating=fVal('be-energy'); it.warranty=fVal('be-warranty');
  it.notes=fVal('be-notes'); it.itemStatus=fVal('be-status');
  it.pros=[..._editBuyPros]; it.cons=[..._editBuyCons];
  updBuyItem(it); closeModal('buy-edit-modal'); rBuy(); toast('Saved ✅','green');
  updateStatusBar();
}

function setItemVote(id,who,vote) {
  const it=getBuyItem(id); if(!it) return;
  const key='vote'+who; it[key]=it[key]===vote?'':vote;
  updBuyItem(it); rBuy(); updateStatusBar();
}

function unmarkBought(id) {
  const it=getBuyItem(id); if(!it) return;
  it.bought=false; it.actualPrice=0; it.boughtDate=''; it.boughtStore='';
  it.itemStatus = it.prevItemStatus || 'decided'; it.prevItemStatus = '';
  updBuyItem(it); rBuy(); updateStatusBar();
  if(document.getElementById('item-detail-modal')?.classList.contains('open')) openItemDetail(id);
}

// ── Add Pros/Cons in add modal ────────────────────────────────
function addBuyPro(v){ if(!v?.trim())return; _buyPros.push(v.trim()); rAddBuyChips(); }
function addBuyCon(v){ if(!v?.trim())return; _buyCons.push(v.trim()); rAddBuyChips(); }
function rmBuyPro(v) { _buyPros=_buyPros.filter(x=>x!==v); rAddBuyChips(); }
function rmBuyCon(v) { _buyCons=_buyCons.filter(x=>x!==v); rAddBuyChips(); }
function rAddBuyChips(){
  const pe=document.getElementById('add-buy-pros'); if(pe) pe.innerHTML=_buyPros.map(p=>`<span class="chip pro">${esc(p)} <span class="chip-rm" onclick="rmBuyPro(${jsq(p)})">✕</span></span>`).join('');
  const ce=document.getElementById('add-buy-cons'); if(ce) ce.innerHTML=_buyCons.map(c=>`<span class="chip con">${esc(c)} <span class="chip-rm" onclick="rmBuyCon(${jsq(c)})">✕</span></span>`).join('');
}

// ── Dynamic spec fields ───────────────────────────────────────
function onBuyCatChange(sel) {
  const cat=sel.value; const catConf=getCatByKey(cat); if(!catConf) return;
  // Update type dropdown
  const typeEl=document.getElementById('b-type');
  if(typeEl) typeEl.innerHTML=catConf.types.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');
  // Update spec fields
  const specsEl=document.getElementById('b-specs-grid');
  if(specsEl) specsEl.innerHTML=catConf.specsTemplate.map(f=>`
    <div class="fg"><label>${esc(f)}</label><input id="bspec-${slugify(f)}" placeholder="${esc(f)}"></div>`
  ).join('');
  // Update suggestions
  const proSugg = PROS_SUGGESTIONS[cat]||PROS_SUGGESTIONS.default;
  const conSugg = CONS_SUGGESTIONS[cat]||CONS_SUGGESTIONS.default;
  const proEl=document.getElementById('buy-pro-sugg');
  const conEl=document.getElementById('buy-con-sugg');
  if(proEl) proEl.innerHTML=proSugg.map(s=>`<span class="chip-s" onclick="addBuyPro(${jsq(s)})">${esc(s)}</span>`).join('');
  if(conEl) conEl.innerHTML=conSugg.map(s=>`<span class="chip-s" onclick="addBuyCon(${jsq(s)})">${esc(s)}</span>`).join('');
}

// ── Compare ───────────────────────────────────────────────────
let _compareIds = new Set();
let _compareSource = 'buy';
function updateCompareFab() {
  const btn = document.getElementById('compare-fab');
  if (!btn) return;
  const visible = _compareSource === 'buy' && _compareIds.size;
  btn.style.display = visible ? 'flex' : 'none';
  if (visible) btn.textContent = '⚖️ Compare (' + _compareIds.size + ')';
}
function resolveCompareItem(id) {
  return _compareSource === 'cmp' ? getCmpItem(id) : getBuyItem(id);
}
function setCompareContext(ids, source = 'buy') {
  _compareSource = source;
  _compareIds = new Set(ids);
  updateCompareFab();
}
function addToCompare(id) {
  if (_compareSource !== 'buy') {
    _compareIds.clear();
    _compareSource = 'buy';
  }
  if(_compareIds.size>=5) { toast('Max 5 items in comparison','warn'); return; }
  _compareIds.add(id);
  toast('Added to comparison ⚖️','info');
  updateCompareFab();
}
function clearCompare() { _compareIds.clear(); _compareSource = 'buy'; updateCompareFab(); }
function openCompareForType(type, roomId) {
  const items = ldBuy().filter(it=>it.type===type&&it.roomId===roomId);
  if(items.length<2) { toast('Need at least 2 items to compare','warn'); return; }
  setCompareContext(items.map(i=>i.id), 'buy');
  openCompareModal();
}
function openCompareModal() {
  if(!_compareIds.size) { toast('No items selected for comparison','warn'); return; }
  rCompareModal(); openModal('compare-modal');
}

function rCompareModal() {
  const items = [..._compareIds].map(id=>resolveCompareItem(id)).filter(Boolean);
  if(!items.length) return;
  const el=document.getElementById('compare-modal-content'); if(!el) return;
  const settings=ldSettings(); const names=settings.names||{M:'Mari',A:'Alexander'};

  // Score each item
  items.forEach(it=>{
    let s=0;
    s+=comparePreferenceScore(it);
    if(it.energyRating){ const eScore={'A+++':10,'A++':9,'A+':8,'A':7,'B':5,'C':3,'D':1,'E':0}; s+=(eScore[it.energyRating]||0)/10*2; }
    s+=Math.max(0,Math.min(2,(it.pros||[]).length-(it.cons||[]).length)*.5);
    it._score=Math.max(0,Math.min(10,s));
  });
  const maxScore=Math.max(...items.map(i=>i._score));
  const minPrice=Math.min(...items.filter(i=>i.price>0).map(i=>i.price));

  // Cards
  el.innerHTML = `
    <div class="compare-modal-grid">
      ${items.map(it=>{
        const isWinner=it._score===maxScore&&maxScore>0;
        const isCheap=it.price>0&&it.price===minPrice;
        const photo=it.photos?.[0]||'';
        const room=getRoomById(it.roomId);
        const fit=typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(it) : null;
        const picked=typeof isCmpScenarioSelected === 'function' ? isCmpScenarioSelected(it) : false;
        return `<div class="cmp-card ${isWinner?'winner':''}">
          ${photo?`<img src="${esc(photo)}" class="cmp-card-img">`:`<div class="cmp-card-img" style="display:flex;align-items:center;justify-content:center;font-size:3rem;background:var(--bg2)">📦</div>`}
          <div class="cmp-card-body">
            <div class="cmp-card-name">${esc(it.name)} ${isWinner?'🏆':''}</div>
            ${it.brand?`<div style="font-size:.65rem;color:var(--bd3)">${esc(it.brand)}</div>`:''}
            ${it.roomId?`<div style="font-size:.62rem;color:var(--bd3);margin-top:2px">${esc(room.emoji || '📦')} ${esc(room.label || 'Other')}</div>`:''}
            ${picked?`<div style="margin-top:4px"><span class="badge green">✅ Scenario pick</span></div>`:''}
            <div style="display:flex;justify-content:space-between;margin:5px 0;font-size:.8rem">
              <strong style="color:${isCheap?'var(--gn)':'var(--pk)'}">${it.price?fmtEur(it.price):'–'}</strong>
              ${isCheap?'<span class="badge green">💰 Cheapest</span>':''}
            </div>
            <div style="font-size:.65rem;color:var(--bd3);margin-bottom:4px">Score: ${it._score.toFixed(1)}/10</div>
            <div class="cmp-score-bar"><div class="cmp-score-fill" style="width:${it._score*10}%"></div></div>
            ${dimStr(it)?`<div style="font-size:.62rem;color:var(--bd3);margin-top:4px">📐 ${esc(dimStr(it))}</div>`:''}
            ${fit?`<div style="font-size:.62rem;color:${fit.fits?'var(--gns)':'var(--pk)'};margin-top:4px">${fit.fits ? `✅ ${fit.footprintPct}% of room` : '❌ Too large for room'}</div>`:''}
            ${it.energyRating?`<div style="margin-top:3px">${energyBadge(it.energyRating)}</div>`:''}
            <div style="margin-top:5px">
              <div style="font-size:.6rem;font-weight:700;color:var(--gns);margin-bottom:2px">✅ Pros</div>
              <div>${(it.pros||[]).map(p=>`<span class="chip pro" style="font-size:.58rem">${esc(p)}</span>`).join('')||'–'}</div>
            </div>
            <div style="margin-top:5px">
              <div style="font-size:.6rem;font-weight:700;color:var(--pks);margin-bottom:2px">❌ Cons</div>
              <div>${(it.cons||[]).map(c=>`<span class="chip con" style="font-size:.58rem">${esc(c)}</span>`).join('')||'–'}</div>
            </div>
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
              <div class="voter" style="flex-direction:row;gap:3px;align-items:center">
                <span style="font-size:.6rem;color:var(--bd3)">${esc(names.M)}:</span>
                <span>${preferenceInlineLabel(it,'M')}</span>
                <span style="font-size:.6rem;color:var(--bd3);margin-left:4px">${esc(names.A)}:</span>
                <span>${preferenceInlineLabel(it,'A')}</span>
              </div>
            </div>
            ${typeof setCmpScenarioSelection === 'function' ? `<button class="btn sml" style="margin-top:8px" onclick="setCmpScenarioSelection(${jsq((typeof getCmpScenarioKey === 'function' ? getCmpScenarioKey(it) : it.category || 'Option'))},'${it.id}')">✅ Use in scenario</button>` : ''}
            ${it.buyLink?`<a href="${esc(it.buyLink)}" target="_blank" class="btn pri full" style="margin-top:8px;font-size:.65rem">🛒 Buy Now</a>`:''}
            <!-- Floor plan footprint -->
            ${it.widthCm&&it.depthCm?renderFootprintViz(it):''}
          </div>
        </div>`;
      }).join('')}
    </div>
    <!-- Full comparison table -->
    <div class="cmp-scroll" style="margin-top:12px">
      <table class="cmp-table">
        <thead><tr><th class="feat-cell">Feature</th>${items.map(it=>`<th>${esc(it.name)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><td class="feat-cell">Price</td>${items.map(it=>`<td class="${it.price===minPrice&&it.price>0?'best':''}">${it.price?fmtEur(it.price):'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">W × D × H</td>${items.map(it=>`<td>${dimStr(it)||'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Room fit</td>${items.map(it=>`<td>${typeof renderCmpFitText === 'function' ? renderCmpFitText(it) : '–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Energy</td>${items.map(it=>`<td>${it.energyRating?energyBadge(it.energyRating):'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Warranty</td>${items.map(it=>`<td>${esc(it.warranty||'–')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Color</td>${items.map(it=>`<td>${esc(it.color||'–')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">${names.M}</td>${items.map(it=>`<td>${preferenceCellLabel(it,'M')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">${names.A}</td>${items.map(it=>`<td>${preferenceCellLabel(it,'A')}</td>`).join('')}</tr>
          <tr style="background:var(--pkl)"><td class="feat-cell" style="font-weight:700">Score</td>${items.map(it=>`<td class="${it._score===maxScore?'best':''}" style="font-weight:700">${it._score.toFixed(1)}/10</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderFootprintViz(it) {
  const maxW=100, maxD=60;
  const scale=Math.min(maxW/it.widthCm, maxD/it.depthCm, 0.5);
  const wPx=Math.round(it.widthCm*scale), dPx=Math.round(it.depthCm*scale);
  return `<div class="footprint-canvas-wrap">
    <div class="footprint-label">Floor Footprint</div>
    <div style="position:relative;width:${maxW}px;height:${maxD}px;background:#fff;border:1px solid var(--border);border-radius:4px;overflow:hidden">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${wPx}px;height:${dPx}px;background:var(--pk);opacity:.4;border:1.5px solid var(--pk);border-radius:2px"></div>
      <div style="position:absolute;bottom:2px;right:3px;font-size:.5rem;color:var(--bd3)">${it.widthCm}×${it.depthCm}cm</div>
    </div>
  </div>`;
}

function syncBuySubtabs() {
  document.querySelectorAll('.buy-subtab').forEach(el => {
    el.classList.toggle('active', el.dataset.subtab === _buySubtab);
  });
  document.querySelectorAll('.buy-subtab-panel').forEach(el => {
    el.classList.toggle('active', el.id === 'buy-sub-' + _buySubtab);
  });
}

function switchBuySubtab(tab) {
  _buySubtab = tab || 'items';
  rBuy();
}

function getBuyItemFootprintSqm(it) {
  if (typeof getItemFootprintSqm === 'function') return getItemFootprintSqm(it);
  return Number(itemFootprint(it) || 0);
}

function openRoomInPlanOptimizer(roomId) {
  if (!roomId) return;
  if (typeof switchTab === 'function') switchTab('plan');
  if (typeof switchPlanToolsTab === 'function') switchPlanToolsTab('optimizer');
  if (typeof selectRoom === 'function') selectRoom(roomId);
}

function renderFitPreview(room, items) {
  if (!room || !items.length) return '';
  const scale = Math.max(room.w || 1, room.h || 1);
  const svgW = 280;
  const svgH = Math.max(120, Math.round(((room.h || 1) / scale) * 220));
  let xOff = 8;
  let yOff = 8;
  const blocks = items.map(it => {
    const rectW = Math.max(18, Math.round(((it.widthCm || it.depthCm || 60) / 100) / Math.max((room.w || 1) / (ldPlan()?.scale || 45), 1) * (svgW - 28)));
    const rectH = Math.max(14, Math.round(((it.depthCm || it.widthCm || 60) / 100) / Math.max((room.h || 1) / (ldPlan()?.scale || 45), 1) * (svgH - 28)));
    if (xOff + rectW > svgW - 8) {
      xOff = 8;
      yOff += rectH + 8;
    }
    const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(it) : null;
    const color = fit?.fits ? '#bbf7d0' : '#fecaca';
    const stroke = fit?.fits ? '#15803d' : '#dc2626';
    const block = `<rect x="${xOff}" y="${yOff}" width="${rectW}" height="${rectH}" rx="6" fill="${color}" stroke="${stroke}" stroke-width="1.5"></rect>
      <text x="${xOff + (rectW / 2)}" y="${yOff + (rectH / 2) + 3}" text-anchor="middle" font-size="9" fill="#1e293b">${esc(trunc(it.name, 10))}</text>`;
    xOff += rectW + 8;
    return block;
  }).join('');
  return `<div style="text-align:center;margin:8px 0 4px">
    <svg width="${svgW}" height="${svgH}" style="border:2px solid var(--border);border-radius:12px;background:#fafafa">
      <rect x="1" y="1" width="${svgW - 2}" height="${svgH - 2}" rx="12" fill="rgba(244,114,182,.05)" stroke="rgba(15,23,42,.08)"></rect>
      ${blocks}
    </svg>
    <div style="font-size:.58rem;color:var(--bd3);margin-top:4px">Footprint preview for quick fit checks before placing items on the floor plan.</div>
  </div>`;
}

function rFitTest() {
  initPillFilter('fit', 'room', '');
  const el = document.getElementById('fit-test-content');
  if (!el) return;
  const items = ldBuy().filter(it => it.roomId && (it.widthCm || it.depthCm));
  const roomFilter = getPillVal('fit', 'room') || '';
  const filtered = roomFilter ? items.filter(it => it.roomId === roomFilter) : items;
  const roomOpts = [...new Set(items.map(it => it.roomId))]
    .map(roomId => {
      const room = getRoomById(roomId);
      return roomId ? { k: roomId, l: room.label || roomId, e: room.emoji } : null;
    })
    .filter(Boolean);
  let html = buildPillFilters('fit', 'room', roomOpts, rFitTest);
  if (!filtered.length) {
    el.innerHTML = html + '<div style="color:var(--bd3);font-size:.72rem;padding:20px;text-align:center">Add room assignments and dimensions to your buy items to use Fit Test.</div>';
    return;
  }
  const byRoom = filtered.reduce((map, it) => {
    (map[it.roomId] = map[it.roomId] || []).push(it);
    return map;
  }, {});
  html += Object.entries(byRoom).map(([roomId, roomItems]) => {
    const roomMeta = getRoomById(roomId);
    const roomRecord = typeof getRoomRecord === 'function' ? getRoomRecord(roomId) : { room: null };
    const room = roomRecord?.room || null;
    const scale = ldPlan()?.scale || 45;
    const occupancy = typeof getRoomOccupancy === 'function' ? getRoomOccupancy(roomId) : null;
    const bestCombo = typeof getRoomOptimizerData === 'function' ? getRoomOptimizerData(roomId)?.combos?.[0] : null;
    return `<div class="fit-room-card">
      <div class="fit-room-hdr">
        <div>
          <span style="font-weight:700">${esc(roomMeta.emoji || '📦')} ${esc(roomMeta.label || roomId)}</span>
          ${room ? `<span style="font-size:.65rem;color:var(--bd3);margin-left:6px">${((room.w || 0) / scale).toFixed(2)}×${((room.h || 0) / scale).toFixed(2)}m</span>` : ''}
        </div>
        <div style="font-size:.72rem;font-weight:700;color:${(occupancy?.pct || 0) > 80 ? 'var(--pk)' : 'var(--gn)'}">${occupancy?.freeAreaM2?.toFixed(2) || '0.00'} m² free</div>
      </div>
      ${renderFitPreview(room, roomItems)}
      ${bestCombo ? `<div class="note-box" style="margin:0 12px 8px">Best option-group setup leaves <strong>${bestCombo.freeAreaM2.toFixed(2)} m²</strong> free.</div>` : ''}
      <div style="display:flex;justify-content:flex-end;padding:0 12px 8px">
        <button class="btn sml" onclick="openRoomInPlanOptimizer('${roomId}')">🧠 Open room optimizer</button>
      </div>
      ${roomItems.map(it => {
        const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(it) : null;
        const source = getItemSourceMeta(it.source);
        const photo = it.photos?.[0];
        return `<div class="fit-item-row">
          ${photo ? `<img src="${esc(photo)}" class="fit-item-thumb">` : `<div class="fit-item-thumb-placeholder">${esc(source.e || '📦')}</div>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.75rem">${esc(it.name)}</div>
            <div style="font-size:.62rem;color:var(--bd3)">${dimStr(it) || 'Dimensions pending'} · ${getBuyItemFootprintSqm(it).toFixed(2)} m² footprint</div>
            <div style="font-size:.62rem;color:var(--bd3)">${source.badge || source.l}${it.price && normalizeItemSource(it.source) === 'new' ? ' · ' + fmtEur(it.price, 0) : ''}</div>
          </div>
          <div style="text-align:right">
            <div class="fit-badge ${fit?.fits ? 'fits' : 'no-fit'}">${fit?.fits ? 'Fits' : 'Check size'}</div>
            <div style="font-size:.58rem;color:var(--bd3);margin-top:2px">${fit ? `${fit.footprintPct}% of room` : 'Add room + size'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
  el.innerHTML = html;
}

function pickScenarioItem(itemId, groupName) {
  ldBuy().forEach(it => {
    if (String(it.optionGroup || '').trim() !== groupName) return;
    it.scenarioPick = it.id === itemId;
    updBuyItem(it);
  });
  rBuyBudget();
  rBudgetPlanner();
  if (document.getElementById('compare-modal')?.classList.contains('open')) rCompareModal();
}

function applyScenario(mode) {
  const stats = getBuyScenarioStats();
  const picks = mode === 'premium'
    ? stats.premiumGroupItems
    : mode === 'cheapest'
      ? stats.cheapestGroupItems
      : stats.selectedGroupItems;
  const targetIds = new Set((picks || []).map(it => it.id));
  ldBuy().forEach(it => {
    if (!String(it.optionGroup || '').trim()) return;
    it.scenarioPick = targetIds.has(it.id);
    updBuyItem(it);
  });
  rBuyBudget();
  rBudgetPlanner();
  if (document.getElementById('compare-modal')?.classList.contains('open')) rCompareModal();
  toast(`${mode === 'premium' ? 'Premium' : mode === 'cheapest' ? 'Cheapest' : 'Current'} scenario applied`, 'green');
}

function rBudgetPlanner() {
  const el = document.getElementById('budget-planner-content');
  if (!el) return;
  const stats = getBuyScenarioStats();
  const budgetMax = ldSettings().maxBudget || 5000;
  const groupedEntries = Object.entries(stats.grouped || {});
  const budgetPct = budgetMax ? Math.round((stats.selectedTotal / budgetMax) * 100) : 0;
  let html = `<div class="scenario-hero">
    <div style="font-size:.72rem;font-weight:700;color:var(--pk);margin-bottom:10px">Budget Scenarios</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
      <div class="scenario-card selected-scenario" onclick="applyScenario('selected')">
        <div style="font-size:.58rem;color:var(--bd3)">Current picks</div>
        <div style="font-size:1.3rem;font-weight:700;color:${stats.selectedTotal > budgetMax ? 'var(--pk)' : 'var(--gn)'}">${fmtEur(stats.selectedTotal, 0)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">${stats.selectedTotal > budgetMax ? 'Over budget' : 'Within budget'}</div>
      </div>
      <div class="scenario-card cheapest-scenario" onclick="applyScenario('cheapest')">
        <div style="font-size:.58rem;color:var(--bd3)">Cheapest combo</div>
        <div style="font-size:1.3rem;font-weight:700;color:var(--gn)">${fmtEur(stats.cheapestTotal, 0)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">Save ${fmtEur(Math.max(0, stats.selectedTotal - stats.cheapestTotal), 0)}</div>
      </div>
      <div class="scenario-card premium-scenario" onclick="applyScenario('premium')">
        <div style="font-size:.58rem;color:var(--bd3)">Premium combo</div>
        <div style="font-size:1.3rem;font-weight:700;color:var(--pk)">${fmtEur(stats.premiumTotal, 0)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">+${fmtEur(Math.max(0, stats.premiumTotal - stats.selectedTotal), 0)} vs current</div>
      </div>
    </div>
    <div style="font-size:.62rem;color:var(--bd3);margin-bottom:4px">Budget ${fmtEur(budgetMax, 0)} · ${stats.groupCount} option group${stats.groupCount !== 1 ? 's' : ''} · ${stats.reusedCount} reused item${stats.reusedCount !== 1 ? 's' : ''}</div>
    ${progressBar(Math.min(100, budgetPct), stats.selectedTotal > budgetMax ? 'var(--pk)' : 'var(--gn)', '8px')}
  </div>`;

  if (!groupedEntries.length) {
    html += '<div class="note-box">Add an <strong>option group</strong> like "Fridge shortlist" or "Living room sofa" to compare alternatives side by side and generate scenario totals automatically.</div>';
  } else {
    html += '<div style="font-size:.72rem;font-weight:700;color:var(--bd);margin:14px 0 8px">Option Groups</div>';
    html += groupedEntries.map(([groupName, groupItems]) => `
      <div class="option-group-card">
        <div style="font-weight:700;font-size:.75rem;margin-bottom:6px">${esc(groupName)} <span style="font-size:.6rem;color:var(--bd3)">${groupItems.length} options</span></div>
        <div class="option-cards-row">
          ${[...groupItems].sort((a, b) => (a.price || 0) - (b.price || 0)).map(it => {
            const photo = it.photos?.[0];
            const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(it) : null;
            const picked = Boolean(it.scenarioPick);
            return `<div class="option-card ${picked ? 'picked' : ''}">
              ${picked ? '<div class="picked-badge">Selected</div>' : ''}
              ${photo ? `<img src="${esc(photo)}" class="option-card-img">` : `<div class="option-card-img-placeholder">${esc((getRoomById(it.roomId)?.emoji) || '📦')}</div>`}
              <div class="option-card-name">${esc(trunc(it.name, 24))}</div>
              <div class="option-card-price">${normalizeItemSource(it.source) === 'existing' ? 'Already owned' : fmtEur(it.price || 0, 0)}</div>
              <div class="option-card-meta">${esc(it.brand || 'No brand set')}</div>
              <div class="option-card-meta">${dimStr(it) || 'No dimensions yet'}</div>
              <div class="option-card-meta">${getBuyItemFootprintSqm(it).toFixed(2)} m² footprint${it.roomRole === 'must' ? ' · must place' : ''}</div>
              ${fit ? `<div class="option-card-fit ${fit.fits ? 'fits' : 'no-fit'}">${fit.fits ? 'Fits in room' : 'Needs review'}</div>` : ''}
              <div style="margin-top:4px">${(it.pros || []).slice(0, 2).map(p => `<span class="mini-chip pro">${esc(p)}</span>`).join('')}${(it.cons || []).slice(0, 2).map(c => `<span class="mini-chip con">${esc(c)}</span>`).join('')}</div>
              <button class="btn sml pri" style="margin-top:8px;width:100%" onclick="pickScenarioItem('${it.id}',${jsq(groupName)})">${picked ? 'Selected' : 'Pick this'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    `).join('');
  }

  const roomBudget = typeof getBudgetByRoom === 'function' ? Object.entries(getBudgetByRoom()) : [];
  if (roomBudget.length) {
    html += '<div style="font-size:.72rem;font-weight:700;color:var(--bd);margin:14px 0 8px">Budget by Room</div>';
    html += roomBudget
      .sort((a, b) => (b[1].est || 0) - (a[1].est || 0))
      .map(([roomId, data]) => {
        const room = getRoomById(roomId);
        const optimizer = typeof getRoomOptimizerData === 'function' ? getRoomOptimizerData(roomId)?.combos?.[0] : null;
        return `<div class="note-box" style="display:grid;gap:4px">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
            <strong>${esc(room.emoji || '📦')} ${esc(room.label || roomId)}</strong>
            <span>${fmtEur(data.est || 0, 0)}</span>
          </div>
          <div style="font-size:.62rem;color:var(--bd3)">${data.count} planned item${data.count !== 1 ? 's' : ''}${optimizer ? ` · best setup leaves ${optimizer.freeAreaM2.toFixed(2)} m² free` : ''}</div>
          <div><button class="btn sml" onclick="openRoomInPlanOptimizer('${roomId}')">🧠 Check room setup</button></div>
        </div>`;
      }).join('');
  }

  el.innerHTML = html;
}

const BUY_ROOM_WISHLIST_PROFILES = {
  default: {
    title: 'Move-in essentials',
    needs: [
      { key: 'surface', label: 'Surface', hint: 'table, desk, or cabinet top', keywords: ['desk', 'table', 'console', 'dresser', 'cabinet', 'shelf'] },
      { key: 'storage', label: 'Storage', hint: 'shelves, wardrobe, drawers, or closet support', keywords: ['wardrobe', 'shelf', 'storage', 'drawer', 'cabinet', 'closet', 'rack', 'shelving'] },
      { key: 'lighting', label: 'Lighting', hint: 'floor lamp, desk lamp, or ceiling support', categories: ['lighting'], keywords: ['lamp', 'light', 'pendant', 'ceiling light'] }
    ]
  },
  living: {
    title: 'Living room setup',
    needs: [
      { key: 'seating', label: 'Main seating', hint: 'sofa, armchair, or sectional', keywords: ['sofa', 'couch', 'sectional', 'loveseat', 'armchair', 'chair'] },
      { key: 'table', label: 'Coffee / side table', hint: 'coffee table or side table', keywords: ['coffee table', 'side table', 'table'] },
      { key: 'media', label: 'Media / display zone', hint: 'tv unit, console, or projector furniture', keywords: ['tv', 'media', 'console', 'projector'] },
      { key: 'storage', label: 'Living storage', hint: 'shelves, sideboard, or bookcase', keywords: ['bookcase', 'shelf', 'sideboard', 'storage', 'cabinet'] },
      { key: 'lighting', label: 'Ambient lighting', hint: 'floor lamp, wall lamp, or smart light', categories: ['lighting'], keywords: ['lamp', 'light'] }
    ]
  },
  kitchen: {
    title: 'Kitchen setup',
    needs: [
      { key: 'cold', label: 'Cold storage', hint: 'fridge or freezer', keywords: ['fridge', 'freezer', 'refrigerator'] },
      { key: 'cook', label: 'Cooking', hint: 'oven, stove, or cooktop', keywords: ['oven', 'stove', 'cooktop', 'range'] },
      { key: 'prep', label: 'Prep surface', hint: 'island, trolley, or extra table', keywords: ['island', 'prep', 'table', 'trolley', 'cart'] },
      { key: 'dining', label: 'Dining spot', hint: 'table, bar table, or breakfast nook', keywords: ['dining', 'bar table', 'table', 'stool', 'bench'] },
      { key: 'storage', label: 'Pantry storage', hint: 'pantry rack or kitchen cabinet', keywords: ['pantry', 'cabinet', 'shelf', 'rack', 'drawer'] }
    ]
  },
  bedroom: {
    title: 'Bedroom setup',
    needs: [
      { key: 'sleep', label: 'Sleep zone', hint: 'bed, mattress, or daybed', keywords: ['bed', 'mattress', 'daybed'] },
      { key: 'wardrobe', label: 'Clothing storage', hint: 'wardrobe, dresser, or chest', keywords: ['wardrobe', 'dresser', 'closet', 'chest', 'drawer'] },
      { key: 'side', label: 'Bedside support', hint: 'nightstand or side table', keywords: ['nightstand', 'bedside', 'side table'] },
      { key: 'lighting', label: 'Reading light', hint: 'bedside lamp or floor lamp', categories: ['lighting'], keywords: ['lamp', 'light'] }
    ]
  },
  office: {
    title: 'Work room setup',
    needs: [
      { key: 'desk', label: 'Desk', hint: 'desk or worktable', keywords: ['desk', 'worktable', 'table'] },
      { key: 'chair', label: 'Chair', hint: 'office chair or task chair', keywords: ['chair', 'task chair', 'office chair'] },
      { key: 'storage', label: 'Document storage', hint: 'shelf, filing cabinet, or drawer', keywords: ['filing', 'cabinet', 'drawer', 'shelf', 'storage'] },
      { key: 'lighting', label: 'Task light', hint: 'desk lamp or focused lighting', categories: ['lighting'], keywords: ['lamp', 'light'] }
    ]
  },
  bathroom: {
    title: 'Bathroom setup',
    needs: [
      { key: 'wash', label: 'Wash / laundry', hint: 'washing machine or laundry tower', keywords: ['washing machine', 'washer', 'dryer', 'laundry'] },
      { key: 'storage', label: 'Bathroom storage', hint: 'tall cabinet, shelf, or vanity storage', keywords: ['cabinet', 'shelf', 'storage', 'vanity'] },
      { key: 'mirror', label: 'Mirror / vanity', hint: 'mirror cabinet or vanity', keywords: ['mirror', 'vanity'] }
    ]
  },
  hallway: {
    title: 'Entry setup',
    needs: [
      { key: 'shoes', label: 'Shoe storage', hint: 'shoe cabinet, rack, or bench', keywords: ['shoe', 'rack', 'cabinet', 'bench'] },
      { key: 'coats', label: 'Coat zone', hint: 'coat rack or wardrobe', keywords: ['coat', 'rack', 'wardrobe', 'hanger'] },
      { key: 'drop', label: 'Drop zone', hint: 'console or side table for keys and bags', keywords: ['console', 'table', 'side table', 'bench'] }
    ]
  },
  balcony: {
    title: 'Balcony setup',
    needs: [
      { key: 'seating', label: 'Outdoor seating', hint: 'chairs, bench, or sofa', keywords: ['chair', 'bench', 'sofa', 'lounger'] },
      { key: 'table', label: 'Outdoor table', hint: 'table or side table', keywords: ['table'] },
      { key: 'storage', label: 'Outdoor storage', hint: 'storage box or weather-safe cabinet', keywords: ['storage', 'box', 'cabinet'] },
      { key: 'lighting', label: 'Outdoor lighting', hint: 'lanterns or warm lighting', categories: ['lighting'], keywords: ['lamp', 'light', 'lantern'] }
    ]
  },
  cellar: {
    title: 'Cellar / Keller setup',
    needs: [
      { key: 'shelves', label: 'Bulk shelving', hint: 'shelving, rack, or storage cabinet', keywords: ['shelf', 'shelving', 'rack', 'cabinet', 'storage'] },
      { key: 'boxes', label: 'Bins / boxes', hint: 'stackable storage or labeled bins', keywords: ['box', 'bin', 'crate', 'storage'] },
      { key: 'cold', label: 'Overflow cold storage', hint: 'freezer or fridge if needed', keywords: ['freezer', 'fridge'] }
    ]
  }
};

function getRoomWishlistProfile(room) {
  const label = String(room?.label || '').toLowerCase();
  if (/living|wohn/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.living;
  if (/kitchen|k[üu]che/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.kitchen;
  if (/bed|sleep|schlaf/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.bedroom;
  if (/office|work|study|büro|buero/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.office;
  if (/bath|bad|wc/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.bathroom;
  if (/hall|entry|flur|corridor/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.hallway;
  if (/balcony|terrace|patio|balkon/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.balcony;
  if (/cellar|keller|storage/.test(label)) return BUY_ROOM_WISHLIST_PROFILES.cellar;
  return BUY_ROOM_WISHLIST_PROFILES.default;
}

function getRoomScenarioSelection(roomId, mode = 'selected') {
  const items = ldBuy().filter(item => item.roomId === roomId && (item.roomRole || 'candidate') !== 'ignore');
  const groups = {};
  const singles = [];
  items.forEach(item => {
    const key = String(item.optionGroup || '').trim();
    if (!key) singles.push(item);
    else (groups[key] = groups[key] || []).push(item);
  });
  const picks = Object.values(groups)
    .map(groupItems => typeof chooseScenarioCandidate === 'function' ? chooseScenarioCandidate(groupItems, mode) : groupItems[0])
    .filter(Boolean);
  return [...singles, ...picks];
}

function getWishlistItemScore(item, roomId) {
  const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(item) : null;
  const pref = typeof comparePreferenceScore === 'function' ? comparePreferenceScore(item) : 0;
  let score = pref * 5;
  if (item.roomId === roomId) score += 4;
  if (normalizeItemSource(item.source) === 'existing') score += 8;
  if (item.bought) score += 4;
  if (item.scenarioPick) score += 3;
  if (item.roomRole === 'must' || item.mustFitRoom) score += 3;
  if (fit?.fits) score += 3;
  score -= getBuyItemFootprintSqm(item) * 2;
  score -= getPlannedItemCost(item) / 400;
  return score;
}

function itemMatchesWishlistNeed(item, need) {
  if (!item || !need) return false;
  const haystack = `${item.name || ''} ${item.brand || ''} ${item.model || ''} ${item.type || ''} ${item.category || ''} ${item.optionGroup || ''}`.toLowerCase();
  const type = String(item.type || '').toLowerCase();
  const category = String(item.category || '').toLowerCase();
  const keywords = Array.isArray(need.keywords) ? need.keywords : [];
  const categories = Array.isArray(need.categories) ? need.categories : [];
  return keywords.some(keyword => haystack.includes(String(keyword).toLowerCase()))
    || categories.some(entry => category.includes(String(entry).toLowerCase()) || type.includes(String(entry).toLowerCase()));
}

function getRoomWishlistState(roomId) {
  const room = getRoomById(roomId);
  const profile = getRoomWishlistProfile(room);
  const items = ldBuy().filter(item => item.roomId === roomId);
  const activeItems = items.filter(item => (item.roomRole || 'candidate') !== 'ignore');
  const selectedItems = getRoomScenarioSelection(roomId, 'selected');
  const cheapestItems = getRoomScenarioSelection(roomId, 'cheapest');
  const premiumItems = getRoomScenarioSelection(roomId, 'premium');
  const bestCombo = typeof getRoomOptimizerData === 'function' ? getRoomOptimizerData(roomId)?.combos?.[0] || null : null;
  const coverage = profile.needs.map(need => {
    const matches = activeItems
      .filter(item => itemMatchesWishlistNeed(item, need))
      .sort((a, b) => getWishlistItemScore(b, roomId) - getWishlistItemScore(a, roomId));
    return {
      ...need,
      matches,
      chosen: matches[0] || null
    };
  });
  const matchedCount = coverage.filter(entry => entry.chosen).length;
  const readinessPct = coverage.length ? Math.round((matchedCount / coverage.length) * 100) : 100;
  const missingNeeds = coverage.filter(entry => !entry.chosen);
  const mustItems = activeItems.filter(item => item.roomRole === 'must' || item.mustFitRoom);
  const currentCost = Number(selectedItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0).toFixed(2));
  const cheapestCost = Number(cheapestItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0).toFixed(2));
  const premiumCost = Number(premiumItems.reduce((sum, item) => sum + getPlannedItemCost(item), 0).toFixed(2));
  const roomFit = typeof getRoomOccupancy === 'function' ? getRoomOccupancy(roomId) : null;
  return {
    room,
    profile,
    items,
    activeItems,
    selectedItems,
    cheapestItems,
    premiumItems,
    currentCost,
    cheapestCost,
    premiumCost,
    bestCombo,
    coverage,
    matchedCount,
    missingNeeds,
    readinessPct,
    mustItems,
    roomFit
  };
}

function setWishlistMustPlace(itemId, checked) {
  const item = getBuyItem(itemId);
  if (!item) return;
  item.roomRole = checked ? 'must' : (item.roomRole === 'ignore' ? 'candidate' : 'candidate');
  item.mustFitRoom = checked;
  updBuyItem(item);
  if (typeof renderPlanToolsPanel === 'function') renderPlanToolsPanel();
  if (typeof rSpaceOptimizer === 'function') rSpaceOptimizer();
  rBuyBudget();
  rBuy();
  toast(checked ? 'Pinned as room must-have' : 'Removed from room must-haves', checked ? 'green' : 'info', 1400);
}

function autoPinWishlistRoom(roomId) {
  const state = getRoomWishlistState(roomId);
  let changed = 0;
  state.coverage.forEach(entry => {
    if (!entry.chosen) return;
    const item = getBuyItem(entry.chosen.id);
    if (!item) return;
    if (item.roomRole !== 'must' || !item.mustFitRoom) {
      item.roomRole = 'must';
      item.mustFitRoom = true;
      if (item.optionGroup) {
        ldBuy().forEach(candidate => {
          if (candidate.roomId !== roomId) return;
          if (String(candidate.optionGroup || '').trim() !== String(item.optionGroup || '').trim()) return;
          candidate.scenarioPick = candidate.id === item.id;
          updBuyItem(candidate);
        });
      }
      updBuyItem(item);
      changed += 1;
    }
  });
  if (typeof renderPlanToolsPanel === 'function') renderPlanToolsPanel();
  rBuyBudget();
  rBuy();
  toast(changed ? `Pinned ${changed} room essentials` : 'No extra essentials to pin', changed ? 'green' : 'info', 1400);
}

function renderRoomPreviewPack(room, items) {
  const dims = typeof getRoomDimsMeters === 'function' ? getRoomDimsMeters(room) : {
    widthM: Math.max((room?.w || 0) / (ldPlan()?.scale || 45), 1),
    depthM: Math.max((room?.h || 0) / (ldPlan()?.scale || 45), 1),
    areaSqm: 0
  };
  const packed = [];
  let cursorX = 0.35;
  let cursorY = 0.35;
  let rowDepth = 0;
  items
    .filter(item => item.widthCm && item.depthCm)
    .sort((a, b) => getBuyItemFootprintSqm(b) - getBuyItemFootprintSqm(a))
    .forEach(item => {
      const widthM = Number(((item.widthCm || 0) / 100).toFixed(2));
      const depthM = Number(((item.depthCm || 0) / 100).toFixed(2));
      const heightM = Number((((item.heightCm || 80) / 100) || 0.8).toFixed(2));
      if (cursorX + widthM > dims.widthM - 0.15) {
        cursorX = 0.35;
        cursorY += rowDepth + 0.28;
        rowDepth = 0;
      }
      packed.push({
        item,
        x: cursorX,
        y: cursorY,
        widthM: widthM || 0.8,
        depthM: depthM || 0.6,
        heightM: heightM || 0.8
      });
      cursorX += widthM + 0.22;
      rowDepth = Math.max(rowDepth, depthM);
    });
  return { dims, packed };
}

function renderRoom3DVariant(room, title, items, accent, metaText, noteText) {
  const measuredItems = items.filter(item => item.widthCm && item.depthCm);
  const { dims, packed } = renderRoomPreviewPack(room, measuredItems);
  const isoScale = Math.max(28, Math.min(50, 300 / Math.max(dims.widthM + dims.depthM, 1)));
  const originX = 180;
  const originY = 210;
  const project = (x, y, z = 0) => ({
    x: originX + ((x - y) * isoScale * 0.86),
    y: originY + ((x + y) * isoScale * 0.42) - (z * isoScale * 0.75)
  });
  const roomTop = [
    project(0, 0, 0),
    project(dims.widthM, 0, 0),
    project(dims.widthM, dims.depthM, 0),
    project(0, dims.depthM, 0)
  ];
  const floorPath = roomTop.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') + ' Z';
  const wallHeight = Math.max(1.8, Math.min(2.6, Math.max(...packed.map(entry => entry.heightM), 2.2)));
  const leftWallPath = [
    project(0, dims.depthM, 0),
    project(0, dims.depthM, wallHeight),
    project(0, 0, wallHeight),
    project(0, 0, 0)
  ].map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') + ' Z';
  const rightWallPath = [
    project(dims.widthM, 0, 0),
    project(dims.widthM, 0, wallHeight),
    project(dims.widthM, dims.depthM, wallHeight),
    project(dims.widthM, dims.depthM, 0)
  ].map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') + ' Z';
  const blocks = packed.map((entry, index) => {
    const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(entry.item) : null;
    const base = fit?.fits === false ? '#ef4444' : accent;
    const topColor = fit?.fits === false ? '#fecaca' : `${base}55`;
    const leftColor = fit?.fits === false ? '#fca5a5' : `${base}66`;
    const rightColor = fit?.fits === false ? '#fb7185' : `${base}88`;
    const a = project(entry.x, entry.y, 0);
    const b = project(entry.x + entry.widthM, entry.y, 0);
    const c = project(entry.x + entry.widthM, entry.y + entry.depthM, 0);
    const d = project(entry.x, entry.y + entry.depthM, 0);
    const aTop = project(entry.x, entry.y, entry.heightM);
    const bTop = project(entry.x + entry.widthM, entry.y, entry.heightM);
    const cTop = project(entry.x + entry.widthM, entry.y + entry.depthM, entry.heightM);
    const dTop = project(entry.x, entry.y + entry.depthM, entry.heightM);
    const topPath = `M ${aTop.x.toFixed(1)} ${aTop.y.toFixed(1)} L ${bTop.x.toFixed(1)} ${bTop.y.toFixed(1)} L ${cTop.x.toFixed(1)} ${cTop.y.toFixed(1)} L ${dTop.x.toFixed(1)} ${dTop.y.toFixed(1)} Z`;
    const leftPath = `M ${d.x.toFixed(1)} ${d.y.toFixed(1)} L ${dTop.x.toFixed(1)} ${dTop.y.toFixed(1)} L ${aTop.x.toFixed(1)} ${aTop.y.toFixed(1)} L ${a.x.toFixed(1)} ${a.y.toFixed(1)} Z`;
    const rightPath = `M ${b.x.toFixed(1)} ${b.y.toFixed(1)} L ${bTop.x.toFixed(1)} ${bTop.y.toFixed(1)} L ${cTop.x.toFixed(1)} ${cTop.y.toFixed(1)} L ${c.x.toFixed(1)} ${c.y.toFixed(1)} Z`;
    const labelPoint = project(entry.x + (entry.widthM / 2), entry.y + (entry.depthM / 2), entry.heightM + 0.05);
    return `
      <path d="${leftPath}" fill="${leftColor}" stroke="${base}" stroke-width="1"></path>
      <path d="${rightPath}" fill="${rightColor}" stroke="${base}" stroke-width="1"></path>
      <path d="${topPath}" fill="${topColor}" stroke="${base}" stroke-width="1.2"></path>
      <text x="${labelPoint.x.toFixed(1)}" y="${labelPoint.y.toFixed(1)}" text-anchor="middle" font-size="10" fill="#0f172a">${esc(trunc(entry.item.name, index === 0 ? 14 : 12))}</text>
    `;
  }).join('');
  return `<div class="note-box" style="display:grid;gap:10px;padding:14px;border-color:${accent}33;background:linear-gradient(135deg,#ffffff 0%,${accent}12 100%)">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <div style="font-size:.8rem;font-weight:700;color:var(--bd)">${esc(title)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">${esc(metaText)}</div>
      </div>
      ${noteText ? `<div style="font-size:.6rem;color:var(--bd2);background:#fff;border:1px solid var(--border);border-radius:999px;padding:4px 8px">${esc(noteText)}</div>` : ''}
    </div>
    <svg viewBox="0 0 360 260" style="width:100%;height:auto;border-radius:14px;background:radial-gradient(circle at top,#ffffff 0%,#f8fafc 68%,#eef2ff 100%);border:1px solid var(--border)">
      <defs>
        <linearGradient id="room-floor-${esc(title).replace(/[^a-z0-9]/gi,'').toLowerCase()}" x1="0" x2="1">
          <stop offset="0%" stop-color="#ffffff"></stop>
          <stop offset="100%" stop-color="${accent}26"></stop>
        </linearGradient>
      </defs>
      <path d="${leftWallPath}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2"></path>
      <path d="${rightWallPath}" fill="#eef2ff" stroke="#cbd5e1" stroke-width="1.2"></path>
      <path d="${floorPath}" fill="url(#room-floor-${esc(title).replace(/[^a-z0-9]/gi,'').toLowerCase()})" stroke="#94a3b8" stroke-width="1.4"></path>
      ${blocks || `<text x="180" y="145" text-anchor="middle" font-size="12" fill="#64748b">Add measured items in this room to generate a pseudo-3D layout.</text>`}
      <text x="48" y="32" font-size="11" fill="#475569">${dims.widthM.toFixed(2)} m wide</text>
      <text x="244" y="56" font-size="11" fill="#475569">${dims.depthM.toFixed(2)} m deep</text>
    </svg>
  </div>`;
}

function renderRoomReadinessCard(state) {
  const roomDims = typeof getRoomDimsMeters === 'function' ? getRoomDimsMeters(state.room) : null;
  const bestComboFree = state.bestCombo ? state.bestCombo.freeAreaM2.toFixed(2) : null;
  return `<div class="note-box" style="display:grid;gap:10px;padding:14px">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <div style="font-size:.82rem;font-weight:700;color:var(--bd)">${esc(state.room.emoji || '📦')} ${esc(state.room.label || state.room.id)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">${esc(state.profile.title)}${roomDims ? ` · ${roomDims.widthM.toFixed(2)}×${roomDims.depthM.toFixed(2)} m` : ''}</div>
      </div>
      <div style="min-width:140px">
        <div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--bd3);margin-bottom:3px">
          <span>${state.matchedCount}/${state.coverage.length} essentials</span>
          <span>${state.readinessPct}% ready</span>
        </div>
        ${progressBar(state.readinessPct, state.readinessPct >= 75 ? 'var(--gn)' : state.readinessPct >= 40 ? '#f59e0b' : 'var(--pk)', '8px')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px">
      <div style="background:var(--bg2);border-radius:12px;padding:10px">
        <div style="font-size:.58rem;color:var(--bd3)">Current room budget</div>
        <div style="font-size:1rem;font-weight:700;color:var(--pk)">${fmtEur(state.currentCost, 0)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">Cheapest ${fmtEur(state.cheapestCost, 0)} · Premium ${fmtEur(state.premiumCost, 0)}</div>
      </div>
      <div style="background:var(--bg2);border-radius:12px;padding:10px">
        <div style="font-size:.58rem;color:var(--bd3)">Pinned room must-haves</div>
        <div style="font-size:1rem;font-weight:700;color:var(--bd)">${state.mustItems.length}</div>
        <div style="font-size:.55rem;color:var(--bd3)">${bestComboFree ? `${bestComboFree} m² free in best combo` : 'No optimizer combo yet'}</div>
      </div>
      <div style="background:var(--bg2);border-radius:12px;padding:10px">
        <div style="font-size:.58rem;color:var(--bd3)">Floor occupancy</div>
        <div style="font-size:1rem;font-weight:700;color:${(state.roomFit?.occupancyPct || 0) > 80 ? 'var(--pk)' : 'var(--gn)'}">${state.roomFit?.freeSqm?.toFixed(2) || '0.00'} m² free</div>
        <div style="font-size:.55rem;color:var(--bd3)">${state.roomFit?.entries?.length || 0} placed / planned elements</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${state.missingNeeds.length
        ? state.missingNeeds.map(entry => `<span class="mini-chip con">Missing: ${esc(entry.label)}</span>`).join('')
        : '<span class="mini-chip pro">All core essentials mapped</span>'}
    </div>
    <div style="display:grid;gap:8px">
      ${state.coverage.map(entry => {
        const suggested = entry.chosen;
        return `<div style="display:grid;gap:6px;border:1px solid var(--border);border-radius:12px;padding:10px;background:#fff">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap">
            <div>
              <div style="font-size:.72rem;font-weight:700;color:var(--bd)">${esc(entry.label)}</div>
              <div style="font-size:.58rem;color:var(--bd3)">${esc(entry.hint || '')}</div>
            </div>
            ${suggested
              ? `<label style="font-size:.62rem;color:var(--bd2);display:flex;gap:6px;align-items:center">
                  <input type="checkbox" ${(suggested.roomRole === 'must' || suggested.mustFitRoom) ? 'checked' : ''} onchange="setWishlistMustPlace('${suggested.id}',this.checked)">
                  Pin as must
                </label>`
              : '<span style="font-size:.58rem;color:var(--pk)">No candidate yet</span>'}
          </div>
          ${suggested
            ? `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;background:var(--bg2);border-radius:10px;padding:8px 10px">
                <div>
                  <div style="font-size:.72rem;font-weight:600">${esc(suggested.name)}</div>
                  <div style="font-size:.58rem;color:var(--bd3)">${dimStr(suggested) || 'No dimensions'} · ${getBuyItemFootprintSqm(suggested).toFixed(2)} m² footprint${suggested.optionGroup ? ` · ${esc(suggested.optionGroup)}` : ''}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:.72rem;font-weight:700;color:${normalizeItemSource(suggested.source) === 'existing' ? 'var(--gn)' : 'var(--pk)'}">${normalizeItemSource(suggested.source) === 'existing' ? 'Owned' : fmtEur(suggested.price || 0, 0)}</div>
                  <div style="font-size:.55rem;color:var(--bd3)">${typeof getRoomFitAnalysis === 'function' && getRoomFitAnalysis(suggested)?.fits === false ? 'Needs fit review' : 'Fits current room plan'}</div>
                </div>
              </div>`
            : ''}
          ${entry.matches.length > 1
            ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
                ${entry.matches.slice(0, 3).map(match => `<span class="chip" style="cursor:pointer" onclick="openItemDetail('${match.id}')">${esc(trunc(match.name, 20))}</span>`).join('')}
              </div>`
            : ''}
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn sml pri" onclick="autoPinWishlistRoom('${state.room.id}')">✨ Auto-pin suggested essentials</button>
      <button class="btn sml" onclick="openRoomInPlanOptimizer('${state.room.id}')">🧠 Open free-space optimizer</button>
    </div>
  </div>`;
}

function rRoom3D() {
  initPillFilter('room3d', 'room', '');
  const el = document.getElementById('room-3d-content');
  if (!el) return;
  const rooms = getAllRooms().filter(room => ldBuy().some(item => item.roomId === room.id));
  if (!rooms.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🧊</div>Add room-assigned furniture with dimensions to generate a pseudo-3D preview.</div>';
    return;
  }
  const roomOptions = rooms.map(room => ({ k: room.id, l: room.label || room.id, e: room.emoji || '📦' }));
  const activeRoomId = getPillVal('room3d', 'room') || rooms[0].id;
  const room = getRoomById(activeRoomId);
  const selectedItems = getRoomScenarioSelection(activeRoomId, 'selected');
  const optimizerData = typeof getRoomOptimizerData === 'function' ? getRoomOptimizerData(activeRoomId) : null;
  const bestCombo = optimizerData?.combos?.[0] || null;
  const currentFootprint = Number(selectedItems.reduce((sum, item) => sum + getBuyItemFootprintSqm(item), 0).toFixed(2));
  const currentFree = optimizerData ? Math.max(0, optimizerData.roomAreaM2 - currentFootprint).toFixed(2) : '0.00';
  let html = buildPillFilters('room3d', 'room', roomOptions, rRoom3D);
  html += `<div class="note-box" style="margin-bottom:10px;background:linear-gradient(135deg,#fff7ed 0%,#ffffff 42%,#eff6ff 100%)">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <div style="font-size:.82rem;font-weight:700;color:var(--bd)">🧊 Pseudo-3D Room Preview</div>
        <div style="font-size:.62rem;color:var(--bd3)">A quick isometric layout based on your measurements, shortlist picks, and best free-space combo. This complements the exact 2D blueprint planner; it does not replace true 3D modeling.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="mini-stat"><div class="ms-num">${selectedItems.length}</div><div class="ms-lbl">Current picks</div></div>
        <div class="mini-stat"><div class="ms-num">${currentFootprint.toFixed(2)}</div><div class="ms-lbl">m² used now</div></div>
        <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${currentFree}</div><div class="ms-lbl">m² free now</div></div>
      </div>
    </div>
  </div>`;
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
    ${renderRoom3DVariant(
      room,
      'Current shortlist',
      selectedItems,
      '#f97316',
      `${selectedItems.length} selected items · ${currentFootprint.toFixed(2)} m² footprint`,
      'Editable via your shortlist and scenario picks'
    )}
    ${renderRoom3DVariant(
      room,
      'Best free-space setup',
      bestCombo?.selectedItems || selectedItems,
      '#0f766e',
      bestCombo
        ? `${bestCombo.selectedItems.length} items · ${bestCombo.footprintM2.toFixed(2)} m² footprint · ${bestCombo.freeAreaM2.toFixed(2)} m² free`
        : 'No optimizer combo yet; showing current shortlist instead',
      bestCombo
        ? (bestCombo.fits ? 'Best fitting combination' : 'Best combo still needs fit review')
        : 'Same data as current shortlist'
    )}
  </div>`;
  html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
    <button class="btn sml" onclick="openRoomInPlanOptimizer('${activeRoomId}')">🧠 Open optimizer for ${esc(room.label || activeRoomId)}</button>
    <button class="btn sml" onclick="switchBuySubtab('wishlist')">✨ Open setup wishlist</button>
  </div>`;
  el.innerHTML = html;
}

function rWishlistPlanner() {
  const el = document.getElementById('wishlist-planner-content');
  if (!el) return;
  const states = getAllRooms()
    .filter(room => ldBuy().some(item => item.roomId === room.id))
    .map(room => getRoomWishlistState(room.id))
    .sort((a, b) => a.readinessPct - b.readinessPct);
  if (!states.length) {
    el.innerHTML = '<div class="empty"><div class="ei">✨</div>Assign wishlist items to rooms to unlock room readiness, must-have pinning, and free-space suggestions.</div>';
    return;
  }
  const scenarioStats = typeof getBuyScenarioStats === 'function' ? getBuyScenarioStats() : null;
  const totalMissing = states.reduce((sum, state) => sum + state.missingNeeds.length, 0);
  const totalMust = states.reduce((sum, state) => sum + state.mustItems.length, 0);
  const readyRooms = states.filter(state => state.readinessPct >= 75).length;
  let html = `<div class="note-box" style="margin-bottom:10px;background:linear-gradient(135deg,#fdf2f8 0%,#ffffff 38%,#ecfeff 100%)">
    <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <div style="font-size:.84rem;font-weight:700;color:var(--bd)">✨ Setup Wishlist Intelligence</div>
        <div style="font-size:.62rem;color:var(--bd3)">This view audits each room against move-in essentials, lets you pin must-have items, and reuses the planner optimizer to surface the combination that keeps the most free space.</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <div class="mini-stat"><div class="ms-num">${readyRooms}/${states.length}</div><div class="ms-lbl">Rooms mostly ready</div></div>
        <div class="mini-stat"><div class="ms-num" style="color:var(--pk)">${totalMissing}</div><div class="ms-lbl">Missing essentials</div></div>
        <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${totalMust}</div><div class="ms-lbl">Pinned must-haves</div></div>
        ${scenarioStats ? `<div class="mini-stat"><div class="ms-num">${fmtEur(scenarioStats.selectedTotal,0)}</div><div class="ms-lbl">Current total</div></div>` : ''}
      </div>
    </div>
    ${scenarioStats ? `<div style="margin-top:10px;font-size:.62rem;color:var(--bd3)">Scenario spread: cheapest ${fmtEur(scenarioStats.cheapestTotal,0)} · current ${fmtEur(scenarioStats.selectedTotal,0)} · premium ${fmtEur(scenarioStats.premiumTotal,0)}</div>` : ''}
  </div>`;
  html += states.map(state => renderRoomReadinessCard(state)).join('');
  el.innerHTML = html;
}
