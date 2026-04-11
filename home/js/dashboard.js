// ============================================================
// dashboard.js — Our New Home · Dashboard overview
// ============================================================

function rDash() {
  const el=document.getElementById('p-dash'); if(!el) return;
  const s=ldSettings(), cd=getCountdown(), budget=getBudgetStats();
  const sell=getSellStats(), pack=getPackingStats(), move=getMoveStats();
  const names=s.names||{M:'Mari',A:'Alexander'};
  const activity=ldActivity().slice(0,10);
  let h='';

  // ── Countdown hero ──────────────────────────────────────────
  if (cd&&!cd.past) {
    const urg=cd.days<=7?'#dc2626':cd.days<=30?'#d97706':'var(--gn)';
    h+=`<div class="dash-hero" style="background:linear-gradient(135deg,${urg},${urg}cc)">
      <div class="dash-hero-num">${cd.days}</div>
      <div class="dash-hero-lbl">days until move-in 🏠</div>
      <div class="dash-hero-sub">${s.moveDate?fmtDate(s.moveDate):''} ${s.newAddress?'· '+esc(s.newAddress):''}</div>
    </div>`;
  } else if (cd&&cd.past) {
    h+=`<div class="dash-hero" style="background:linear-gradient(135deg,var(--gn),var(--gns))">
      <div class="dash-hero-num">🏠</div>
      <div class="dash-hero-lbl">You've moved in! Congratulations ${esc(names.M)} & ${esc(names.A)}! 💕</div>
    </div>`;
  } else {
    h+=`<div class="dash-hero" style="background:linear-gradient(135deg,#64748b,#475569);cursor:pointer" onclick="openSettings()">
      <div class="dash-hero-num" style="font-size:2rem">📅</div>
      <div class="dash-hero-lbl">Set your move-in date →</div>
      <div class="dash-hero-sub">Click to open Settings</div>
    </div>`;
  }

  // ── Stat cards ──────────────────────────────────────────────
  h+='<div class="dash-grid">';
  // Packing
  h+=`<div class="stat-card" onclick="switchTab('take')">
    <div class="stat-icon">📦</div>
    <div>
      <div class="stat-num">${pack.packed}<span style="font-size:.8rem;color:var(--bd3)">/${pack.total}</span></div>
      <div class="stat-lbl">Items packed</div>
      ${progressBar(pack.pct,'var(--pk)','5px')}
      <div class="stat-sub">${pack.pct}% done</div>
    </div>
  </div>`;
  // Budget
  const bc=budget.pct>=100?'#dc2626':budget.pct>=80?'#d97706':'var(--gn)';
  h+=`<div class="stat-card" onclick="switchTab('buy')">
    <div class="stat-icon">${budget.pct>=100?'⚠️':'💰'}</div>
    <div>
      <div class="stat-num" style="color:${bc}">${fmtEurShort(budget.est)}</div>
      <div class="stat-lbl">of ${fmtEurShort(budget.max)} budget</div>
      ${progressBar(budget.pct,bc,'5px')}
      <div class="stat-sub">${budget.pct}% used${budget.pct>=100?' ⚠️':''}</div>
    </div>
  </div>`;
  // Sell earnings
  h+=`<div class="stat-card" onclick="switchTab('sell')">
    <div class="stat-icon">💸</div>
    <div>
      <div class="stat-num" style="color:var(--gn)">${fmtEurShort(sell.earned)}</div>
      <div class="stat-lbl">earned (${sell.sold}/${sell.total} sold)</div>
      ${progressBar(sell.total?Math.round(sell.sold/sell.total*100):0,'var(--gn)','5px')}
      <div class="stat-sub">+ ${fmtEurShort(sell.potential)} potential</div>
    </div>
  </div>`;
  // Movers
  h+=`<div class="stat-card" onclick="switchTab('move')">
    <div class="stat-icon">🚚</div>
    <div>
      ${move.booked
        ?`<div class="stat-num" style="color:var(--gn);font-size:1rem">${esc(trunc(move.booked.name,18))}</div>
           <div class="stat-lbl">Mover booked ✅</div>
           <div class="stat-sub">${move.booked.price?fmtEur(move.booked.price,0):''}</div>`
        :`<div class="stat-num" style="color:var(--bd3)">${move.total}</div>
           <div class="stat-lbl">Moving companies</div>
           <div class="stat-sub" style="color:${move.total?'#d97706':'var(--bd3)'}">${move.total?'None booked yet':'Add companies'}</div>`}
    </div>
  </div>`;
  h+='</div>'; // end dash-grid

  // ── Two column: quick actions + activity ────────────────────
  h+='<div class="dash-cols">';
  h+=`<div class="dash-box">
    <div class="dash-box-hdr">⚡ Quick Actions</div>
    <div class="quick-grid">
      <button class="qa-btn" onclick="switchTab('buy');setTimeout(()=>openModal('buy-add-modal'),150)">🛒 Add item to buy</button>
      <button class="qa-btn" onclick="switchTab('sell');setTimeout(()=>openSellAddModal(),150)">💸 List item to sell</button>
      <button class="qa-btn" onclick="switchTab('take');setTimeout(()=>openModal('take-add-modal'),150)">📦 Add packing item</button>
      <button class="qa-btn" onclick="switchTab('move');setTimeout(()=>openModal('move-add-modal'),150)">🚚 Add moving company</button>
      <button class="qa-btn" onclick="switchTab('cmp');setTimeout(()=>openModal('cmp-add-modal'),150)">⚖️ Compare products</button>
      <button class="qa-btn" onclick="switchTab('plan')">📐 Open floor plan</button>
      <button class="qa-btn" onclick="openSettings()">⚙️ Settings</button>
      <button class="qa-btn" onclick="exportAll()">💾 Backup data</button>
    </div>
  </div>`;
  h+=`<div class="dash-box">
    <div class="dash-box-hdr">🕐 Recent Activity</div>
    <div style="max-height:200px;overflow-y:auto">
      ${activity.length?activity.map(a=>{
        const icons={move:'🚚',take:'📦',sell:'💸',buy:'🛒',compare:'⚖️',plan:'📐'};
        const actions={add:'added',update:'updated',delete:'deleted'};
        return `<div class="activity-item">
          <span style="font-size:1rem">${icons[a.module]||'📋'}</span>
          <div style="flex:1"><span style="font-weight:600">${esc(trunc(a.label,26))}</span> <span style="color:var(--bd3)">${actions[a.action]||a.action}</span></div>
          <span class="activity-time">${fmtTs(a.ts)}</span>
        </div>`;
      }).join(''):'<div class="empty" style="padding:16px"><div class="ei" style="font-size:2rem">📋</div>No activity yet</div>'}
    </div>
  </div>`;
  h+='</div>'; // end dash-cols

  // ── Budget by room ──────────────────────────────────────────
  const byRoom=getBudgetByRoom();
  if (Object.keys(byRoom).length) {
    h+='<div class="dash-cols" style="margin-top:0">';
    // by room
    h+=`<div class="dash-box">
      <div class="dash-box-hdr">🏠 Budget by Room</div>`;
    const roomTotals=Object.entries(byRoom).sort((a,b)=>b[1].est-a[1].est);
    const maxR=roomTotals[0]?.[1].est||1;
    roomTotals.slice(0,6).forEach(([rId,stats])=>{
      const room=getRoomById(rId);
      const lbl=room.label||rId;
      h+=`<div style="margin:4px 0">
        <div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:2px">
          <span>${room?.emoji?room.emoji+' ':''} ${esc(lbl)} <span style="color:var(--bd3)">(${stats.count})</span></span>
          <strong>${fmtEur(stats.est,0)}</strong>
        </div>
        ${progressBar(Math.round(stats.est/maxR*100),room?.colorDark||'var(--pk)','5px')}
      </div>`;
    });
    h+='</div>';
    // Activity breakdown
    h+=`<div class="dash-box">
      <div class="dash-box-hdr">📊 Spend Breakdown</div>
      <div class="mini-stats" style="margin-top:0">
        <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${fmtEurShort(budget.spent)}</div><div class="ms-lbl">Spent</div></div>
        <div class="mini-stat"><div class="ms-num">${fmtEurShort(budget.est-budget.spent)}</div><div class="ms-lbl">Committed</div></div>
        <div class="mini-stat"><div class="ms-num" style="color:${budget.remaining<0?'var(--pk)':'var(--gn)'}">${fmtEurShort(Math.abs(budget.remaining))}</div><div class="ms-lbl">${budget.remaining<0?'Over':'Remaining'}</div></div>
      </div>
      <div style="margin-top:8px;font-size:.7rem;font-weight:700;color:var(--bd3);margin-bottom:4px">Items by status</div>
      ${[...ITEM_STATUSES].map(s=>{
        const cnt=ldBuy().filter(it=>it.itemStatus===s.k).length;
        return cnt?`<div style="display:flex;justify-content:space-between;font-size:.72rem;padding:3px 0;border-bottom:1px solid var(--bg2)"><span>${s.e} ${esc(s.l)}</span><strong>${cnt}</strong></div>`:'';
      }).join('')}
    </div>`;
    h+='</div>';
  }

  // ── Room readiness ──────────────────────────────────────────
  const buyItems = ldBuy();
  const roomsWithItems = getAllRooms().filter(r => buyItems.some(it => it.roomId === r.id));
  if (roomsWithItems.length) {
    h += `<div class="dash-box" style="margin-top:0">
      <div class="dash-box-hdr">✨ Room Readiness</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">`;
    roomsWithItems.forEach(room => {
      const ri = buyItems.filter(it => it.roomId === room.id);
      const bought = ri.filter(it => it.bought).length;
      const mustHave = ri.filter(it => it.prio === 'must').length;
      const mustBought = ri.filter(it => it.prio === 'must' && it.bought).length;
      const pct = ri.length ? Math.round(bought / ri.length * 100) : 0;
      const ready = pct >= 75;
      h += `<div style="background:${ready ? 'var(--gnl)' : 'var(--bg)'};border-radius:12px;padding:10px;cursor:pointer;border:1px solid ${ready ? '#86efac' : 'var(--border)'};transition:all .15s" onclick="switchTab('buy');setTimeout(()=>switchBuySubtab('roommap'),150)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:700;font-size:.75rem">${room.emoji} ${esc(room.label)}</span>
          <span style="font-size:.72rem;font-weight:700;color:${ready ? 'var(--gn)' : 'var(--pk)'}">${pct}%</span>
        </div>
        ${progressBar(pct, ready ? 'var(--gn)' : room.colorDark || 'var(--pk)', '4px')}
        <div style="font-size:.55rem;color:var(--bd3);margin-top:3px">${bought}/${ri.length} bought${mustHave ? ` · ${mustBought}/${mustHave} must-haves` : ''}</div>
      </div>`;
    });
    h += '</div></div>';
  }

  // ── Upcoming deliveries ────────────────────────────────────
  const orderedItems = buyItems.filter(it => it.itemStatus === 'ordered' && !it.bought && it.deliveryDate);
  if (orderedItems.length) {
    const sorted = orderedItems.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate)).slice(0, 4);
    const today = new Date(); today.setHours(0,0,0,0);
    h += `<div class="dash-box" style="margin-top:0">
      <div class="dash-box-hdr">🚚 Upcoming Deliveries</div>`;
    sorted.forEach(it => {
      const dd = new Date(it.deliveryDate);
      const daysLeft = Math.ceil((dd - today) / 86400000);
      const urgColor = daysLeft < 0 ? '#dc2626' : daysLeft <= 3 ? '#d97706' : 'var(--gn)';
      h += `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bg2);cursor:pointer" onclick="switchTab('buy');setTimeout(()=>switchBuySubtab('delivery'),150)">
        <div style="min-width:48px;text-align:center;font-weight:700;font-size:.75rem;color:${urgColor}">${daysLeft < 0 ? 'Late!' : daysLeft === 0 ? 'Today!' : daysLeft + 'd'}</div>
        <div style="flex:1;min-width:0;font-size:.72rem">${esc(trunc(it.name, 28))}</div>
        <div style="font-size:.6rem;color:var(--bd3)">${fmtDate(it.deliveryDate)}</div>
      </div>`;
    });
    h += '</div>';
  }

  // ── Shopping summary ───────────────────────────────────────
  const toBuyCount = buyItems.filter(it => !it.bought && normalizeItemSource(it.source) !== 'existing').length;
  const storeCount = new Set(buyItems.filter(it => it.store).map(it => it.store)).size;
  if (toBuyCount) {
    h += `<div class="dash-box" style="margin-top:0">
      <div class="dash-box-hdr">🏪 Shopping Overview</div>
      <div class="mini-stats" style="margin-top:0">
        <div class="mini-stat"><div class="ms-num">${toBuyCount}</div><div class="ms-lbl">Items to buy</div></div>
        <div class="mini-stat"><div class="ms-num">${storeCount}</div><div class="ms-lbl">Stores</div></div>
        <div class="mini-stat"><div class="ms-num">${buyItems.filter(it => it.bought).length}</div><div class="ms-lbl">Already bought</div></div>
        <div class="mini-stat"><div class="ms-num">${buyItems.filter(it => it.priceSources?.length > 1).length}</div><div class="ms-lbl">Price compared</div></div>
      </div>
      <button class="qa-btn" style="width:100%;margin-top:6px" onclick="switchTab('buy');setTimeout(()=>switchBuySubtab('shopping'),150)">🏪 Open Shopping Hub</button>
    </div>`;
  }

  h+=`<div style="text-align:center;font-size:.6rem;color:var(--bd3);margin-top:16px;padding-bottom:4px">
    Keyboard: 1–7 = tabs · Esc = close modal · Ctrl+K = search
  </div>`;
  el.innerHTML=h;
}

function getMoveStats() {
  const c=ldMove(); const booked=c.find(x=>x.status==='booked');
  return { total:c.length, booked:booked||null };
}
