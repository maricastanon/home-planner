// ============================================================
// sell.js — Unser neues Zuhause · Sell tracker & analytics
// ============================================================

function rSell() {
  rSellStats();
  rSellList();
}

// ---- STATS ----
function rSellStats() {
  const items = ldSell();
  const el = document.getElementById('sell-stats');
  if (!el) return;

  const sold     = items.filter(i => i.status === 'sold');
  const active   = items.filter(i => i.status === 'active');
  const reserved = items.filter(i => i.status === 'reserved');
  const donated  = items.filter(i => i.status === 'donated');
  const earned   = sold.reduce((s,i) => s + (i.soldPrice || 0), 0);
  const potential= active.reduce((s,i) => s + (i.price || 0), 0) +
                   reserved.reduce((s,i) => s + (i.price || 0), 0);
  const avgPrice = sold.length ? earned / sold.length : 0;

  let h = '';
  // Earnings hero
  h += `<div class="sell-hero">
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap">
      <div>
        <div class="sell-hero-num">${fmtEur(earned, 0)}</div>
        <div class="sell-hero-lbl">bereits verdient 🎉</div>
      </div>
      <div>
        <div class="sell-hero-num sell-potential">${fmtEur(potential, 0)}</div>
        <div class="sell-hero-lbl">noch ausstehend</div>
      </div>
      <div>
        <div class="sell-hero-num" style="font-size:1.2rem">${fmtEur(earned + potential, 0)}</div>
        <div class="sell-hero-lbl">Gesamt-Potenzial</div>
      </div>
    </div>
    ${items.length ? `<div style="margin-top:10px">
      <div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:3px">
        <span>${sold.length} / ${items.length} verkauft</span>
        <span>${Math.round(sold.length/items.length*100)}%</span>
      </div>
      ${progressBar(Math.round(sold.length/items.length*100), 'var(--gn)')}
    </div>` : ''}
  </div>`;

  // Stats row
  h += '<div class="mini-stats">';
  h += `<div class="mini-stat"><div class="ms-num">${sold.length}</div><div class="ms-lbl">Verkauft</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num" style="color:var(--or)">${reserved.length}</div><div class="ms-lbl">Reserviert</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num">${active.length}</div><div class="ms-lbl">Verfügbar</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num">${donated.length}</div><div class="ms-lbl">Verschenkt</div></div>`;
  if (avgPrice > 0) h += `<div class="mini-stat"><div class="ms-num">${fmtEur(avgPrice,0)}</div><div class="ms-lbl">Ø Preis</div></div>`;
  h += '</div>';

  // By platform
  const soldByPlat = groupBy(sold, 'platform');
  if (Object.keys(soldByPlat).length) {
    h += '<div style="margin-top:8px;font-size:.7rem;font-weight:700;color:var(--pk);margin-bottom:4px">💸 Einnahmen nach Plattform</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
    Object.entries(soldByPlat).forEach(([plat, pitems]) => {
      const total = pitems.reduce((s,i) => s + (i.soldPrice||0), 0);
      const p = SELL_PLATFORMS.find(x => x.k === plat);
      h += `<div style="background:#f5f5f5;border-radius:6px;padding:5px 8px;font-size:.7rem">
        <div>${p ? p.e + ' ' + p.l : esc(plat)}</div>
        <div style="font-weight:700;color:var(--gn)">${fmtEur(total,0)}</div>
        <div style="color:#aaa">${pitems.length} Stk.</div>
      </div>`;
    });
    h += '</div>';
  }
  el.innerHTML = h;
}

// ---- LIST ----
function rSellList() {
  const items = ldSell();
  const q   = getSearch('sell');
  const sf  = document.getElementById('sell-status-filter')?.value  || '';
  const rf  = document.getElementById('sell-room-filter')?.value    || '';
  const pf  = document.getElementById('sell-plat-filter')?.value    || '';
  const srt = document.getElementById('sell-sort')?.value || 'date';

  let list = items.filter(it => {
    if (q  && !(it.name+' '+(it.note||'')).toLowerCase().includes(q)) return false;
    if (sf && it.status !== sf) return false;
    if (rf && it.room   !== rf) return false;
    if (pf && it.platform !== pf) return false;
    return true;
  });

  if (srt === 'price-hi') list.sort((a,b) => (b.price||0) - (a.price||0));
  if (srt === 'price-lo') list.sort((a,b) => (a.price||0) - (b.price||0));
  if (srt === 'date')     list.sort((a,b) => (b.created||0) - (a.created||0));
  if (srt === 'status')   list.sort((a,b) => a.status.localeCompare(b.status));
  if (srt === 'name')     list = sortBy(list,'name');

  const el = document.getElementById('sell-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="ei">💸</div>Keine Artikel gefunden</div>'; return; }

  el.innerHTML = list.map(it => renderSellCard(it)).join('');
}

function renderSellCard(it) {
  const st  = SELL_STATUS.find(s => s.k === it.status)  || { l: it.status, c:'gray', e:'📦' };
  const cnd = CONDITIONS.find(c => c.k === it.cond)     || { l: it.cond,   e:'🔧' };
  const plt = SELL_PLATFORMS.find(p => p.k === it.platform) || { l: it.platform, e:'📦', css:'gray' };
  const priceLog = it.priceLog || [];
  const isSold = it.status === 'sold' || it.status === 'donated';
  return `<div class="card ${isSold?'sold':it.status==='reserved'?'booked':''}" id="sell-${it.id}">
    <div class="card-h" onclick="togCard('sell-${it.id}')">
      <div style="flex:1">
        <div class="card-title">
          ${esc(it.name)}
          <span class="pill ${st.c}" style="font-size:.5rem">${st.e} ${esc(st.l)}</span>
          <span class="pill ${plt.css} platform" style="font-size:.5rem">${plt.e} ${esc(plt.l)}</span>
        </div>
        <div class="card-sub">${esc(it.room || '')} · ${cnd.e} ${esc(cnd.l)}</div>
      </div>
      <div style="text-align:right">
        ${isSold
          ? `<div style="font-weight:700;color:var(--gn)">${fmtEur(it.soldPrice)}</div>
             <div style="font-size:.6rem;color:#888">${fmtDate(it.soldDate)}</div>`
          : `<div style="font-weight:700;color:var(--pk)">${fmtEur(it.price)}</div>`
        }
      </div>
      <span class="chev">▼</span>
    </div>
    <div class="card-body">
      ${it.note ? `<div class="note-box">${esc(it.note)}</div>` : ''}
      ${renderPriceHistory(priceLog)}
      ${isSold ? `
        <div class="info-grid">
          <div class="info-item"><span class="info-lbl">Verkaufspreis</span><span class="info-val" style="color:var(--gn);font-weight:700">${fmtEur(it.soldPrice)}</span></div>
          <div class="info-item"><span class="info-lbl">Datum</span><span class="info-val">${fmtDate(it.soldDate)}</span></div>
          ${it.buyer ? `<div class="info-item"><span class="info-lbl">Käufer</span><span class="info-val">${esc(it.buyer)}</span></div>` : ''}
          ${it.soldNote ? `<div class="info-item"><span class="info-lbl">Notiz</span><span class="info-val">${esc(it.soldNote)}</span></div>` : ''}
        </div>` : ''}
      <!-- Interested buyers -->
      <div class="sec-hdr" onclick="togSection('sell-buyers-${it.id}','sell-barr-${it.id}')">
        👤 Interessenten (${(it.buyers||[]).length}) <span id="sell-barr-${it.id}">▶</span>
      </div>
      <div id="sell-buyers-${it.id}" class="sec-body" style="display:none">
        ${(it.buyers||[]).map(b =>
          `<div style="font-size:.72rem;padding:3px 0;border-bottom:1px solid #f5f5f5;display:flex;gap:6px;align-items:center">
            <span style="flex:1">${esc(b.name)} ${b.offer ? '· ' + fmtEur(b.offer) : ''} ${b.date ? '· ' + fmtDate(b.date) : ''}</span>
            <button class="btn sml dan" onclick="removeBuyer('${it.id}','${b.id}')">✕</button>
          </div>`
        ).join('') || '<div style="color:#ccc;font-size:.7rem">Keine Interessenten</div>'}
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <input id="buyer-name-${it.id}" placeholder="Name" class="chip-inp" style="flex:2;min-width:100px">
          <input id="buyer-offer-${it.id}" type="number" placeholder="Gebot €" class="chip-inp" style="width:80px">
          <button class="btn sml pri" onclick="addBuyer('${it.id}')">+ Interessent</button>
        </div>
      </div>
      <!-- Actions -->
      <div class="card-actions" style="margin-top:8px">
        ${!isSold ? `
          <button class="btn suc sml" onclick="openSellModal('${it.id}')">✅ Verkauft!</button>
          <button class="btn sml" onclick="reserveItem('${it.id}')">🔒 Reservieren</button>
          <button class="btn sml" onclick="lowerPrice('${it.id}')">📉 Preis senken</button>
          <button class="btn sml" onclick="generateListingText('${it.id}')">📝 Anzeigentext</button>
        ` : `<button class="btn sml" onclick="undoSell('${it.id}')">↺ Rückgängig</button>`}
        <button class="btn sml" onclick="editSellItem('${it.id}')">✏️</button>
        <button class="btn sml dan" onclick="deleteSellConfirm('${it.id}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

// ---- CRUD ----
function addSellItem() {
  const name = fVal('s-name');
  if (!name) { toast('Bitte Namen eingeben', 'red'); return; }
  const price = fNum('s-price');
  const it = {
    id: uid(), name,
    cond:     fVal('s-cond')  || 'gut',
    price,
    platform: fVal('s-plat')  || 'ebay',
    room:     fVal('s-room')  || 'Sonstiges',
    note:     fVal('s-note'),
    status:   'active',
    priceLog: price ? [{ price, date: todayISO(), id: uid() }] : [],
    buyers:   [],
    soldPrice:0, soldDate:'', buyer:'', soldNote:'',
    created:  Date.now()
  };
  addSell(it);
  closeModal('sell-add-modal');
  fClear('s-name','s-price','s-note');
  rSell(); toast(name + ' eingestellt 💸', 'green');
  updateStatusBar();
}

function editSellItem(id) {
  const it = getSell(id); if (!it) return;
  fSet('se-id', id); fSet('se-name', it.name); fSet('se-cond', it.cond);
  fSet('se-price', it.price); fSet('se-plat', it.platform);
  fSet('se-room', it.room); fSet('se-note', it.note);
  openModal('sell-edit-modal');
}

function saveSellEdit() {
  const id = fVal('se-id');
  const it = getSell(id); if (!it) return;
  const newPrice = fNum('se-price');
  if (newPrice !== it.price) {
    it.priceLog = [...(it.priceLog||[]), { price: newPrice, date: todayISO(), id: uid() }];
  }
  it.name     = fVal('se-name') || it.name;
  it.cond     = fVal('se-cond');
  it.price    = newPrice;
  it.platform = fVal('se-plat');
  it.room     = fVal('se-room');
  it.note     = fVal('se-note');
  updSell(it);
  closeModal('sell-edit-modal');
  rSell(); toast('Gespeichert ✅', 'green');
}

function deleteSellConfirm(id) {
  const it = getSell(id);
  confirmDialog(`"${it?.name}" löschen?`, () => { delSell(id); rSell(); updateStatusBar(); toast('Gelöscht', 'warn'); });
}

function reserveItem(id) {
  const it = getSell(id); if (!it) return;
  it.status = it.status === 'reserved' ? 'active' : 'reserved';
  updSell(it); rSell();
  toast(it.name + (it.status==='reserved' ? ' reserviert 🔒' : ' wieder verfügbar'), 'info');
}

function lowerPrice(id) {
  const it = getSell(id); if (!it) return;
  inlineEdit('Neuer Preis (€)', String(it.price), v => {
    const np = parseFloat(v);
    if (!np || np <= 0) { toast('Ungültiger Preis', 'red'); return; }
    it.priceLog = [...(it.priceLog||[]), { price: np, date: todayISO(), id: uid() }];
    it.price = np;
    updSell(it); rSell();
    toast('Preis gesenkt auf ' + fmtEur(np), 'info');
  });
}

function undoSell(id) {
  const it = getSell(id); if (!it) return;
  it.status = 'active'; it.soldPrice = 0; it.soldDate = ''; it.buyer = ''; it.soldNote = '';
  updSell(it); rSell(); updateStatusBar();
  toast('Als verfügbar markiert', 'info');
}

function addBuyer(id) {
  const name  = document.getElementById('buyer-name-'+id)?.value.trim();
  if (!name) return;
  const offer = parseFloat(document.getElementById('buyer-offer-'+id)?.value) || 0;
  const it = getSell(id); if (!it) return;
  it.buyers = [...(it.buyers||[]), { id: uid(), name, offer, date: todayISO() }];
  updSell(it); rSell();
}

function removeBuyer(sid, bid) {
  const it = getSell(sid); if (!it) return;
  it.buyers = (it.buyers||[]).filter(b => b.id !== bid);
  updSell(it); rSell();
}

function generateListingText(id) {
  const it = getSell(id); if (!it) return;
  const cnd = CONDITIONS.find(c => c.k === it.cond);
  const text = `${it.name}\n\nZustand: ${cnd ? cnd.l : it.cond}\nPreis: ${fmtEur(it.price)}\nAbholung: ${it.room || ''}\n\n${it.note || ''}\n\nBei Interesse gerne melden!`;
  copyText(text, 'Anzeigentext');
}
