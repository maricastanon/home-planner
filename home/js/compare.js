// ============================================================
// compare.js — Unser neues Zuhause · Product comparison matrix
// ============================================================

function rCompare() {
  rCompareTables();
}

function rCompareTables() {
  const items = ldCmp();
  const cf    = document.getElementById('cmp-cat-filter')?.value  || '';
  const rf    = document.getElementById('cmp-room-filter')?.value || '';
  const q     = getSearch('cmp');

  let list = items.filter(it => {
    if (cf && it.cat  !== cf) return false;
    if (rf && it.room !== rf) return false;
    if (q  && !(it.name+' '+(it.note||'')).toLowerCase().includes(q)) return false;
    return true;
  });

  const el = document.getElementById('compare-out');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="ei">📊</div>Noch keine Produkte zum Vergleich</div>'; return; }

  // Group by category, then room
  const byCat = groupBy(list, 'cat');
  el.innerHTML = Object.entries(byCat).map(([cat, catItems]) =>
    renderCompareGroup(cat, catItems)
  ).join('');
}

function renderCompareGroup(cat, items) {
  const catConf   = CMP_CATS[cat] || CMP_CATS['Sonstiges'];
  const settings  = ldSettings();
  const names     = settings.names || { M:'Mari', A:'Alexander' };
  const byRoom    = groupBy(items, 'room');

  let h = `<div class="cmp-group">
    <div class="cmp-group-hdr">
      <span>${catConf.e} ${esc(cat)}</span>
      <span style="font-size:.72rem;opacity:.8">${items.length} Produkte</span>
    </div>`;

  Object.entries(byRoom).forEach(([room, roomItems]) => {
    if (Object.keys(byRoom).length > 1) {
      h += `<div style="font-size:.72rem;font-weight:700;color:#666;padding:6px 14px;background:#fafafa;border-bottom:1px solid #f0f0f0">${esc(room)}</div>`;
    }
    h += renderCompareTable(cat, catConf, roomItems, names);

    // Recommendation
    const rec = getRecommendation(roomItems, names);
    if (rec) {
      h += `<div class="cmp-recommendation">
        <span class="rec-icon">🏆</span>
        <div>
          <strong>Empfehlung: ${esc(rec.item.name)}</strong>
          <div style="font-size:.65rem;color:#666;margin-top:2px">${esc(rec.reason)}</div>
        </div>
      </div>`;
    }
  });

  h += '</div>';
  return h;
}

function renderCompareTable(cat, catConf, items, names) {
  if (items.length < 2) return renderSingleItem(items[0], catConf, names);

  const feats = catConf.feats || [];
  const minPrice = Math.min(...items.map(i => i.price).filter(p => p > 0));
  const maxAvgRating = Math.max(...items.map(i => calcAvgRating(i)));
  const maxScore = Math.max(...items.map(i => calcScore(i)));

  let h = `<div class="cmp-scroll">
    <table class="cmp-table">
      <thead>
        <tr>
          <th style="min-width:120px">Merkmal</th>
          ${items.map((it, i) => {
            const score = calcScore(it);
            const isBest = score === maxScore && maxScore > 0;
            return `<th style="${isBest?'background:var(--gnl);color:var(--gn)':''};min-width:140px">
              <div>${esc(it.name)}</div>
              ${isBest ? '<div style="font-size:.55rem">🏆 Bester Score</div>' : ''}
            </th>`;
          }).join('')}
        </tr>
      </thead>
      <tbody>
        <!-- Price row -->
        <tr>
          <td class="feat-cell">💶 Preis</td>
          ${items.map(it => {
            const isCheap = it.price > 0 && it.price === minPrice;
            return `<td class="${isCheap?'best':''}">
              <strong style="color:${isCheap?'var(--gn)':'var(--pk)'}">${it.price ? fmtEur(it.price) : '–'}</strong>
              ${isCheap ? ' <span style="font-size:.55rem;color:var(--gn)">💰 Günstigster</span>' : ''}
            </td>`;
          }).join('')}
        </tr>
        <!-- Energy row -->
        <tr>
          <td class="feat-cell">⚡ Energie</td>
          ${items.map(it => `<td>${it.energy ? energyBadge(it.energy) : '–'}</td>`).join('')}
        </tr>
        <!-- Warranty -->
        <tr>
          <td class="feat-cell">🛡️ Garantie</td>
          ${items.map(it => `<td>${esc(it.warranty || '–')}</td>`).join('')}
        </tr>
        <!-- Ratings -->
        <tr>
          <td class="feat-cell">🌸 ${esc(names.M)}</td>
          ${items.map(it => `<td>${it.ratingM ? stars(it.ratingM,5,'⭐','') : '–'}</td>`).join('')}
        </tr>
        <tr>
          <td class="feat-cell">💼 ${esc(names.A)}</td>
          ${items.map(it => `<td>${it.ratingA ? stars(it.ratingA,5,'⭐','') : '–'}</td>`).join('')}
        </tr>
        <tr>
          <td class="feat-cell">🎯 Ø Bewertung</td>
          ${items.map(it => {
            const avg = calcAvgRating(it);
            const isTop = avg === maxAvgRating && avg > 0;
            return `<td class="${isTop?'best':''}"><strong style="color:${isTop?'var(--gn)':'inherit'}">${avg > 0 ? avg.toFixed(1) + ' / 5' : '–'}</strong></td>`;
          }).join('')}
        </tr>
        <!-- Custom features -->
        ${feats.map(feat =>
          `<tr>
            <td class="feat-cell">${esc(feat)}</td>
            ${items.map(it => {
              const val = (it.feats || {})[feat] || '';
              return `<td style="cursor:pointer" onclick="editFeat('${it.id}','${esc(feat)}')">${val ? esc(val) : '<span style="color:#ccc">–</span>'}</td>`;
            }).join('')}
          </tr>`
        ).join('')}
        <!-- Score row -->
        <tr style="background:var(--pkl)">
          <td class="feat-cell" style="font-weight:700">📊 Gesamt-Score</td>
          ${items.map(it => {
            const score = calcScore(it);
            const isTop = score === maxScore && maxScore > 0;
            return `<td class="${isTop?'best':''}" style="font-weight:700;color:${isTop?'var(--gn)':'var(--pk)'}">
              ${score.toFixed(1)} / 10
              ${isTop ? '<br><span style="font-size:.55rem">🏆 Empfohlen</span>' : ''}
            </td>`;
          }).join('')}
        </tr>
        <!-- Pros -->
        <tr>
          <td class="feat-cell">✅ Pros</td>
          ${items.map(it =>
            `<td><div class="pc-list">${(it.pros||[]).map(p => `<span class="pc-tag pro" style="font-size:.6rem">${esc(p)}</span>`).join('') || '–'}</div></td>`
          ).join('')}
        </tr>
        <!-- Cons -->
        <tr>
          <td class="feat-cell">❌ Cons</td>
          ${items.map(it =>
            `<td><div class="pc-list">${(it.cons||[]).map(c => `<span class="pc-tag con" style="font-size:.6rem">${esc(c)}</span>`).join('') || '–'}</div></td>`
          ).join('')}
        </tr>
        <!-- Notes -->
        <tr>
          <td class="feat-cell">📝 Notizen</td>
          ${items.map(it =>
            `<td style="font-size:.68rem;max-width:180px">${it.note ? esc(trunc(it.note,80)) : '–'}</td>`
          ).join('')}
        </tr>
        <!-- Links + Actions -->
        <tr>
          <td class="feat-cell">🔗 Aktionen</td>
          ${items.map(it =>
            `<td>
              ${it.link ? `<a href="${esc(it.link)}" target="_blank" class="btn sml" style="display:inline-block;margin-bottom:3px">🔗 Link</a><br>` : ''}
              <button class="btn sml" onclick="editCmpItem('${it.id}')">✏️</button>
              <button class="btn sml dan" onclick="deleteCmpConfirm('${it.id}')">🗑️</button>
            </td>`
          ).join('')}
        </tr>
      </tbody>
    </table>
  </div>`;
  return h;
}

function renderSingleItem(it, catConf, names) {
  if (!it) return '';
  return `<div style="padding:10px 14px;font-size:.78rem;color:#888">
    ℹ️ <strong>${esc(it.name)}</strong> — Füge ein weiteres Produkt hinzu, um einen Vergleich zu sehen.
    <button class="btn sml" style="margin-left:8px" onclick="editCmpItem('${it.id}')">✏️ Bearbeiten</button>
    <button class="btn sml dan" onclick="deleteCmpConfirm('${it.id}')">🗑️</button>
  </div>`;
}

// ---- SCORING ----
function calcAvgRating(it) {
  const r = [(it.ratingM||0), (it.ratingA||0)].filter(x => x > 0);
  return r.length ? r.reduce((a,b) => a+b, 0) / r.length : 0;
}

function calcScore(it) {
  // Weighted: 40% ratings, 20% energy, 20% pros/cons, 20% price-relative
  let score = 0;
  // Ratings (0-5 each, avg)
  const avgR = calcAvgRating(it);
  score += (avgR / 5) * 4;  // up to 4 points
  // Energy efficiency
  const energyScore = { 'A+++':10,'A++':9,'A+':8,'A':7,'B':5,'C':3,'D':1,'E':0 };
  if (it.energy) score += (energyScore[it.energy] || 0) / 10 * 2;  // up to 2 points
  // Pros/cons
  const pcScore = (it.pros||[]).length - (it.cons||[]).length;
  score += Math.max(0, Math.min(2, pcScore * 0.5));  // up to 2 points
  // Price (lower = better, relative scoring within group)
  // -- done externally in recommendation
  return Math.max(0, Math.min(10, score));
}

function getRecommendation(items, names) {
  if (items.length < 2) return null;
  const priced = items.filter(i => i.price > 0);
  if (priced.length) {
    const minP = Math.min(...priced.map(i => i.price));
    items.forEach(it => { it._scoreWithPrice = calcScore(it) + (it.price > 0 ? (minP / it.price) * 2 : 0); });
  } else {
    items.forEach(it => { it._scoreWithPrice = calcScore(it); });
  }
  const best = items.slice().sort((a,b) => b._scoreWithPrice - a._scoreWithPrice)[0];
  if (!best || best._scoreWithPrice === 0) return null;

  const reasons = [];
  const avgR = calcAvgRating(best);
  if (avgR >= 4) reasons.push(`${avgR.toFixed(1)}/5 Sterne`);
  if (best.energy && ['A+++','A++','A+'].includes(best.energy)) reasons.push(`${best.energy} Energieeffizienz`);
  if ((best.pros||[]).length > (best.cons||[]).length) reasons.push(`${(best.pros||[]).length} Pros, ${(best.cons||[]).length} Cons`);
  if (priced.length && best.price === Math.min(...priced.map(i => i.price))) reasons.push('günstigstes Angebot');
  const reason = reasons.length ? 'Wegen: ' + reasons.join(' · ') : 'Bester Gesamtscore';
  return { item: best, reason };
}

// ---- FEAT INLINE EDIT ----
function editFeat(id, feat) {
  const it = getCmp(id); if (!it) return;
  const cur = (it.feats||{})[feat] || '';
  inlineEdit(`${feat} für "${it.name}"`, cur, v => {
    it.feats = it.feats || {};
    it.feats[feat] = v;
    updCmp(it); rCompare();
  });
}

// ---- CRUD ----
function addCmpItem() {
  const name = fVal('cmp-name');
  if (!name) { toast('Bitte Namen eingeben', 'red'); return; }
  const cat = fVal('cmp-cat') || 'Sonstiges';
  const catConf = CMP_CATS[cat] || CMP_CATS['Sonstiges'];
  // Build feats from inputs
  const feats = {};
  (catConf.feats||[]).forEach(f => {
    const val = fVal('feat-' + slugify(f));
    if (val) feats[f] = val;
  });
  const prosRaw = fVal('cmp-pros');
  const consRaw = fVal('cmp-cons');
  const it = {
    id:       uid(), name, cat,
    room:     fVal('cmp-room')    || 'Wohnzimmer',
    price:    fNum('cmp-price'),
    energy:   fVal('cmp-energy'),
    warranty: fVal('cmp-warranty'),
    link:     fVal('cmp-link'),
    ratingM:  parseInt(fVal('cmp-rating-m')) || 0,
    ratingA:  parseInt(fVal('cmp-rating-a')) || 0,
    pros:     prosRaw ? prosRaw.split(',').map(s=>s.trim()).filter(Boolean) : [],
    cons:     consRaw ? consRaw.split(',').map(s=>s.trim()).filter(Boolean) : [],
    note:     fVal('cmp-note'),
    feats,
    created:  Date.now()
  };
  addCmp(it);
  closeModal('cmp-add-modal');
  fClear('cmp-name','cmp-price','cmp-warranty','cmp-link','cmp-pros','cmp-cons','cmp-note');
  document.getElementById('cmp-energy').value = '';
  document.getElementById('cmp-rating-m').value = '';
  document.getElementById('cmp-rating-a').value = '';
  rCompare(); toast(name + ' hinzugefügt 📊', 'green');
}

function editCmpItem(id) {
  const it = getCmp(id); if (!it) return;
  fSet('cmpe-id', id); fSet('cmpe-name', it.name); fSet('cmpe-cat', it.cat);
  fSet('cmpe-room', it.room); fSet('cmpe-price', it.price);
  fSet('cmpe-energy', it.energy); fSet('cmpe-warranty', it.warranty);
  fSet('cmpe-link', it.link);
  fSet('cmpe-rating-m', it.ratingM||''); fSet('cmpe-rating-a', it.ratingA||'');
  fSet('cmpe-pros', (it.pros||[]).join(', ')); fSet('cmpe-cons', (it.cons||[]).join(', '));
  fSet('cmpe-note', it.note);
  openModal('cmp-edit-modal');
}

function saveCmpEdit() {
  const id = fVal('cmpe-id');
  const it = getCmp(id); if (!it) return;
  const prosRaw = fVal('cmpe-pros'), consRaw = fVal('cmpe-cons');
  it.name     = fVal('cmpe-name') || it.name;
  it.cat      = fVal('cmpe-cat'); it.room    = fVal('cmpe-room');
  it.price    = fNum('cmpe-price'); it.energy  = fVal('cmpe-energy');
  it.warranty = fVal('cmpe-warranty'); it.link    = fVal('cmpe-link');
  it.ratingM  = parseInt(fVal('cmpe-rating-m'))||0;
  it.ratingA  = parseInt(fVal('cmpe-rating-a'))||0;
  it.pros     = prosRaw ? prosRaw.split(',').map(s=>s.trim()).filter(Boolean) : it.pros;
  it.cons     = consRaw ? consRaw.split(',').map(s=>s.trim()).filter(Boolean) : it.cons;
  it.note     = fVal('cmpe-note');
  updCmp(it);
  closeModal('cmp-edit-modal');
  rCompare(); toast('Gespeichert ✅', 'green');
}

function deleteCmpConfirm(id) {
  const it = getCmp(id);
  confirmDialog(`"${it?.name}" löschen?`, () => { delCmp(id); rCompare(); toast('Gelöscht', 'warn'); });
}

// ---- DYNAMIC FEAT INPUTS in add modal ----
function onCmpCatChange() {
  const cat = document.getElementById('cmp-cat')?.value || 'Sonstiges';
  const catConf = CMP_CATS[cat] || CMP_CATS['Sonstiges'];
  const el = document.getElementById('cmp-feats-grid');
  if (!el) return;
  el.innerHTML = (catConf.feats||[]).map(f =>
    `<div class="fg"><label>${esc(f)}</label>
      <input id="feat-${slugify(f)}" placeholder="${esc(f)}...">
    </div>`
  ).join('');
}
