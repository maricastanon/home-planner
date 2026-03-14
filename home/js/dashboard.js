// ============================================================
// dashboard.js — Unser neues Zuhause · Dashboard / Overview
// ============================================================

function rDash() {
  const el = document.getElementById('p-dash');
  if (!el) return;
  const settings = ldSettings();
  const cd       = getCountdown();
  const budget   = getBudgetStats();
  const sellSt   = getSellStats();
  const packSt   = getPackingStats();
  const moveSt   = getMoveStats();
  const activity = ldActivity().slice(0, 12);
  const names    = settings.names || { M:'Mari', A:'Alexander' };

  let h = '';

  // ---- Countdown hero ----
  if (cd && !cd.past) {
    const urgency = cd.days <= 7 ? 'var(--pk)' : cd.days <= 30 ? '#e65100' : 'var(--gn)';
    h += `<div class="dash-hero" style="border-left-color:${urgency}">
      <div class="dash-hero-num" style="color:${urgency}">${cd.days}</div>
      <div class="dash-hero-label">Tage bis zum Einzug 🏠</div>
      <div class="dash-hero-sub">${settings.moveDate ? fmtDate(settings.moveDate) : ''} ${settings.apartmentAddress ? '· ' + esc(settings.apartmentAddress) : ''}</div>
    </div>`;
  } else if (cd && cd.past) {
    h += `<div class="dash-hero" style="border-left-color:var(--gn);background:var(--gnl)">
      <div class="dash-hero-num" style="color:var(--gn)">🏠</div>
      <div class="dash-hero-label">Ihr seid eingezogen! Herzlichen Glückwunsch! 💕</div>
    </div>`;
  } else {
    h += `<div class="dash-hero" style="cursor:pointer" onclick="openSettings()">
      <div class="dash-hero-num" style="color:#ccc">📅</div>
      <div class="dash-hero-label" style="color:#888">Umzugsdatum festlegen</div>
      <div class="dash-hero-sub" style="color:#bbb">In Einstellungen eingeben →</div>
    </div>`;
  }

  // ---- Stats grid ----
  h += '<div class="dash-stats">';

  // Packing progress
  h += `<div class="stat-card" onclick="switchTab('take')">
    <div class="stat-icon">📦</div>
    <div class="stat-body">
      <div class="stat-num">${packSt.packed}<span class="stat-denom">/${packSt.total}</span></div>
      <div class="stat-label">Gegenstände eingepackt</div>
      ${progressBar(packSt.pct, 'var(--pk)', '6px')}
      <div class="stat-pct">${packSt.pct}%</div>
    </div>
  </div>`;

  // Budget
  const budgetColor = budget.pct >= 100 ? 'var(--pk)' : budget.pct >= 80 ? '#ff9800' : 'var(--gn)';
  h += `<div class="stat-card" onclick="switchTab('buy')">
    <div class="stat-icon">${budget.pct >= 100 ? '⚠️' : '💰'}</div>
    <div class="stat-body">
      <div class="stat-num" style="color:${budgetColor}">${fmtEurShort(budget.estimated)}</div>
      <div class="stat-label">von ${fmtEurShort(budget.maxBudget)} Budget</div>
      ${progressBar(budget.pct, budgetColor, '6px')}
      <div class="stat-pct" style="color:${budgetColor}">${budget.pct}% ${budget.pct >= 100 ? '⚠️ Überschritten!' : ''}</div>
    </div>
  </div>`;

  // Sell earnings
  h += `<div class="stat-card" onclick="switchTab('sell')">
    <div class="stat-icon">💸</div>
    <div class="stat-body">
      <div class="stat-num" style="color:var(--gn)">${fmtEurShort(sellSt.earned)}</div>
      <div class="stat-label">Einnahmen (${sellSt.sold}/${sellSt.total} Artikel)</div>
      ${progressBar(sellSt.total ? Math.round(sellSt.sold/sellSt.total*100) : 0, 'var(--gn)', '6px')}
      <div class="stat-pct" style="color:#888">+ ${fmtEurShort(sellSt.potential)} Potenzial</div>
    </div>
  </div>`;

  // Moving company
  h += `<div class="stat-card" onclick="switchTab('move')">
    <div class="stat-icon">🚚</div>
    <div class="stat-body">
      ${moveSt.booked
        ? `<div class="stat-num" style="color:var(--gn);font-size:1rem">${esc(trunc(moveSt.booked.name, 20))}</div>
           <div class="stat-label">Umzugsunternehmen gebucht ✅</div>
           <div class="stat-pct">${moveSt.booked.price ? fmtEur(moveSt.booked.price, 0) : ''} ${moveSt.booked.moveDate ? '· ' + fmtDate(moveSt.booked.moveDate) : ''}</div>`
        : `<div class="stat-num" style="color:#ccc;font-size:1.2rem">${moveSt.total}</div>
           <div class="stat-label">Firmen gespeichert</div>
           <div class="stat-pct" style="color:${moveSt.total ? '#e65100' : '#ccc'}">${moveSt.total ? 'Noch keine gebucht' : 'Jetzt anfangen →'}</div>`
      }
    </div>
  </div>`;

  h += '</div>'; // end dash-stats

  // ---- Two column: quick actions + activity ----
  h += '<div class="dash-cols">';

  // Quick actions
  h += `<div class="dash-box">
    <div class="dash-box-hdr">⚡ Schnellaktionen</div>
    <div class="quick-actions">
      <button class="qa-btn" onclick="switchTab('take');setTimeout(()=>openModal('take-add-modal'),200)">📦 Gegenstand hinzufügen</button>
      <button class="qa-btn" onclick="switchTab('sell');setTimeout(()=>openModal('sell-add-modal'),200)">💸 Verkauf einstellen</button>
      <button class="qa-btn" onclick="switchTab('buy');setTimeout(()=>openModal('buy-add-modal'),200)">🛒 Kaufwunsch hinzufügen</button>
      <button class="qa-btn" onclick="switchTab('move');setTimeout(()=>openModal('move-add-modal'),200)">🚚 Firma hinzufügen</button>
      <button class="qa-btn" onclick="switchTab('cmp');setTimeout(()=>openModal('cmp-add-modal'),200)">📊 Produkt vergleichen</button>
      <button class="qa-btn" onclick="switchTab('plan')">🏠 Grundriss bearbeiten</button>
      <button class="qa-btn" onclick="openSettings()">⚙️ Einstellungen</button>
      <button class="qa-btn" onclick="exportAll()">💾 Backup exportieren</button>
    </div>
  </div>`;

  // Activity feed
  h += `<div class="dash-box">
    <div class="dash-box-hdr">🕐 Letzte Aktivitäten</div>
    <div class="activity-feed">`;
  if (!activity.length) {
    h += '<div class="empty" style="padding:16px"><div class="ei">📋</div>Noch keine Aktivitäten</div>';
  } else {
    const moduleIcons = { move:'🚚', take:'📦', sell:'💸', buy:'🛒', compare:'📊', plan:'🏠' };
    const actionLabels = { add:'hinzugefügt', update:'aktualisiert', delete:'gelöscht' };
    h += activity.map(a =>
      `<div class="activity-item">
        <span class="activity-icon">${moduleIcons[a.module] || '📋'}</span>
        <div class="activity-body">
          <span class="activity-name">${esc(trunc(a.label,28))}</span>
          <span class="activity-action">${actionLabels[a.action] || a.action}</span>
        </div>
        <span class="activity-time">${fmtTs(a.ts)}</span>
      </div>`
    ).join('');
  }
  h += '</div></div>';
  h += '</div>'; // end dash-cols

  // ---- Budget breakdown by category ----
  const buyItems = ldBuy();
  if (buyItems.length) {
    const byCat = groupBy(buyItems.filter(it => !it.bought), 'cat');
    const byRoom = groupBy(buyItems, 'room');
    h += '<div class="dash-cols">';

    // By Category
    h += `<div class="dash-box">
      <div class="dash-box-hdr">💰 Budget nach Kategorie (noch offen)</div>`;
    const catTotals = Object.entries(byCat).map(([cat, items]) => ({
      cat, total: items.reduce((s,i) => s + (i.price||0), 0), count: items.length
    })).sort((a,b) => b.total - a.total);
    const maxCat = catTotals[0]?.total || 1;
    h += catTotals.slice(0, 8).map(({ cat, total, count }) => {
      const catConf = BUY_CATS.find(c => c.k === cat);
      return `<div style="margin:5px 0">
        <div style="display:flex;justify-content:space-between;font-size:.73rem;margin-bottom:2px">
          <span>${catConf ? catConf.e + ' ' : ''}${esc(cat)} <span style="color:#999">(${count})</span></span>
          <strong>${fmtEur(total, 0)}</strong>
        </div>
        ${progressBar(Math.round(total/maxCat*100), 'var(--pk)', '5px')}
      </div>`;
    }).join('');
    h += '</div>';

    // By Room
    h += `<div class="dash-box">
      <div class="dash-box-hdr">🏠 Budget nach Raum (gesamt)</div>`;
    const roomTotals = Object.entries(byRoom).map(([room, items]) => ({
      room, total: items.reduce((s,i) => s + (i.bought ? (i.actualPrice||i.price||0) : (i.price||0)), 0), count: items.length
    })).sort((a,b) => b.total - a.total);
    const maxRoom = roomTotals[0]?.total || 1;
    h += roomTotals.slice(0, 8).map(({ room, total, count }) =>
      `<div style="margin:5px 0">
        <div style="display:flex;justify-content:space-between;font-size:.73rem;margin-bottom:2px">
          <span>${esc(room)} <span style="color:#999">(${count})</span></span>
          <strong>${fmtEur(total, 0)}</strong>
        </div>
        ${progressBar(Math.round(total/maxRoom*100), '#7b1fa2', '5px')}
      </div>`
    ).join('');
    h += '</div>';
    h += '</div>'; // end dash-cols
  }

  // ---- Sell by Platform ----
  const sellItems = ldSell().filter(it => it.status === 'sold');
  if (sellItems.length) {
    const byPlat = groupBy(sellItems, 'platform');
    h += `<div class="dash-box" style="margin-top:8px">
      <div class="dash-box-hdr">💸 Einnahmen nach Plattform</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:6px 0">`;
    h += Object.entries(byPlat).map(([plat, items]) => {
      const total = items.reduce((s,i) => s + (i.soldPrice||0), 0);
      const p = SELL_PLATFORMS.find(x => x.k === plat) || { e:'📦', l: plat };
      return `<div style="background:#f9f9f9;border-radius:8px;padding:8px 12px;min-width:120px">
        <div style="font-size:.65rem;color:#888">${p.e} ${esc(p.l)}</div>
        <div style="font-weight:700;font-size:.95rem;color:var(--gn)">${fmtEur(total,0)}</div>
        <div style="font-size:.6rem;color:#aaa">${items.length} Artikel</div>
      </div>`;
    }).join('');
    h += '</div></div>';
  }

  // ---- Keyboard shortcuts hint ----
  h += `<div style="text-align:center;font-size:.6rem;color:#ccc;margin-top:16px;padding-bottom:8px">
    Tastenkürzel: 1-7 = Tabs · Esc = Modal schließen
  </div>`;

  el.innerHTML = h;
}
