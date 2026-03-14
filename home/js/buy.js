// ============================================================
// buy.js — Unser neues Zuhause · Buy wishlist + voting + budget
// ============================================================

function rBuy() {
  rBuyBudget();
  rBuyList();
}

// ---- BUDGET ----
function rBuyBudget() {
  const budget = getBudgetStats();
  const items  = ldBuy();
  const el     = document.getElementById('buy-budget');
  if (!el) return;
  const { maxBudget, estimated, spent, remaining, pct } = budget;
  const isOver = pct >= 100;
  const isWarn = pct >= 80 && !isOver;
  const bcolor = isOver ? 'var(--pk)' : isWarn ? '#ff9800' : 'var(--gn)';

  // Must-have subtotal
  const mustTotal = items.filter(i => i.prio === 'must').reduce((s,i) => s+(i.price||0), 0);
  const wantTotal = items.filter(i => i.prio === 'want').reduce((s,i) => s+(i.price||0), 0);
  const niceTotal = items.filter(i => i.prio === 'nice').reduce((s,i) => s+(i.price||0), 0);
  const boughtCt  = items.filter(i => i.bought).length;

  let h = `<div class="budget-hero" style="border-left-color:${bcolor}">
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap">
      <div>
        <div style="font-size:1.6rem;font-weight:700;color:${bcolor}">${fmtEur(estimated,0)}</div>
        <div style="font-size:.7rem;color:#888">Geschätzt gesamt</div>
      </div>
      <div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--gn)">${fmtEur(spent,0)}</div>
        <div style="font-size:.7rem;color:#888">Bereits ausgegeben</div>
      </div>
      <div>
        <div style="font-size:1rem;font-weight:700;color:${remaining<0?'var(--pk)':'var(--gn)'}">${fmtEur(Math.abs(remaining),0)}</div>
        <div style="font-size:.7rem;color:#888">${remaining < 0 ? 'ÜBERSCHRITTEN ⚠️' : 'noch verfügbar'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-left:auto">
        <label style="font-size:.65rem;color:#888">Max Budget:</label>
        <input type="number" id="max-budget-inp" value="${maxBudget}" style="width:90px;font-size:.8rem;padding:4px 6px;border:1px solid #ddd;border-radius:4px;font-weight:700"
          onchange="updateMaxBudget(this.value)">
      </div>
    </div>
    <div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:3px">
        <span>${pct}% des Budgets</span>
        <span style="color:${bcolor}">${fmtEur(estimated,0)} / ${fmtEur(maxBudget,0)}</span>
      </div>
      <div style="height:12px;background:#f0f0f0;border-radius:6px;overflow:hidden;position:relative">
        <div style="height:100%;width:${pct}%;background:${bcolor};border-radius:6px;transition:width .5s;${isOver?'animation:pulse-bg 1.5s infinite':''}"></div>
        <!-- Spent overlay -->
        <div style="position:absolute;top:0;left:0;height:100%;width:${Math.min(100,Math.round(spent/maxBudget*100))}%;background:rgba(46,125,50,.5);border-radius:6px;pointer-events:none"></div>
      </div>
    </div>
    ${isOver ? '<div style="color:var(--pk);font-weight:700;font-size:.72rem;margin-top:4px;animation:pulse-bg 1.5s infinite">⚠️ Budget überschritten! Bitte Prioritäten überprüfen.</div>' : ''}
    <div class="mini-stats" style="margin-top:10px">
      <div class="mini-stat"><div class="ms-num" style="color:var(--pk)">🔴 ${fmtEur(mustTotal,0)}</div><div class="ms-lbl">Must-have</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:#ff9800">🟡 ${fmtEur(wantTotal,0)}</div><div class="ms-lbl">Want</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">🟢 ${fmtEur(niceTotal,0)}</div><div class="ms-lbl">Nice to have</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${boughtCt}</div><div class="ms-lbl">✅ Gekauft</div></div>
    </div>
  </div>`;
  el.innerHTML = h;
}

function updateMaxBudget(v) {
  const s = ldSettings();
  s.maxBudget = parseFloat(v) || 3000;
  svSettings(s);
  rBuyBudget();
  updateStatusBar();
}

// ---- LIST ----
function rBuyList() {
  const items = ldBuy();
  const settings = ldSettings();
  const names = settings.names || { M:'Mari', A:'Alexander' };
  const q   = getSearch('buy');
  const cf  = document.getElementById('buy-cat-filter')?.value  || '';
  const rf  = document.getElementById('buy-room-filter')?.value || '';
  const pf  = document.getElementById('buy-prio-filter')?.value || '';
  const sf  = document.getElementById('buy-status-filter')?.value || '';
  const srt = document.getElementById('buy-sort')?.value || 'vote';

  let list = items.filter(it => {
    if (q  && !(it.name+' '+(it.note||'')+' '+(it.link||'')).toLowerCase().includes(q)) return false;
    if (cf && it.cat  !== cf) return false;
    if (rf && it.room !== rf) return false;
    if (pf && it.prio !== pf) return false;
    if (sf === 'bought'   && !it.bought)  return false;
    if (sf === 'pending'  && it.bought)   return false;
    if (sf === 'agreed' && !(it.voteM === 'yes' && it.voteA === 'yes')) return false;
    if (sf === 'disputed' && !((it.voteM==='yes'&&it.voteA==='no')||(it.voteM==='no'&&it.voteA==='yes'))) return false;
    return true;
  });

  if (srt === 'vote')     list.sort((a,b) => voteScore(b) - voteScore(a));
  if (srt === 'price-hi') list.sort((a,b) => (b.price||0) - (a.price||0));
  if (srt === 'price-lo') list.sort((a,b) => (a.price||0) - (b.price||0));
  if (srt === 'prio')     list.sort((a,b) => ({must:0,want:1,nice:2}[a.prio]||0) - ({must:0,want:1,nice:2}[b.prio]||0));
  if (srt === 'name')     list = sortBy(list,'name');

  const el = document.getElementById('buy-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="ei">🛒</div>Keine Kaufwünsche gefunden</div>'; return; }

  const budget = getBudgetStats();
  el.innerHTML = list.map(it => renderBuyCard(it, names, budget)).join('');
}

function renderBuyCard(it, names, budget) {
  const prioConf = BUY_PRIOS.find(p => p.k === it.prio) || { e:'🟡', l:'Want' };
  const catConf  = BUY_CATS.find(c => c.k === it.cat)   || { e:'📋' };
  const vs = voteScore(it);
  const bothYes  = it.voteM === 'yes' && it.voteA === 'yes';
  const bothNo   = it.voteM === 'no'  && it.voteA === 'no';
  const disputed = (it.voteM === 'yes' && it.voteA === 'no') || (it.voteM === 'no' && it.voteA === 'yes');
  const effectivePrice = it.bought ? (it.actualPrice || it.price || 0) : (it.price || 0);

  let borderColor = '#e0e0e0';
  if (bothYes) borderColor = 'var(--gn)';
  if (bothNo)  borderColor = '#bdbdbd';
  if (disputed)borderColor = '#ff9800';
  if (it.bought)borderColor= 'var(--gn)';
  if (!it.bought && budget.estimated > budget.maxBudget) borderColor = '#ff9800';

  return `<div class="card ${it.bought?'booked':bothNo?'':''}" id="buy-${it.id}" style="border-left-color:${borderColor}">
    <div class="card-h" onclick="togCard('buy-${it.id}')">
      <div style="flex:1;min-width:0">
        <div class="card-title">${esc(it.name)}
          <span class="pill gray" style="font-size:.5rem">${prioConf.e} ${esc(prioConf.l)}</span>
          ${it.bought ? '<span class="pill green" style="font-size:.5rem">✅ Gekauft</span>' : ''}
          ${bothYes   ? '<span class="pill green" style="font-size:.5rem">💕 Beide wollen\'s!</span>' : ''}
          ${disputed  ? '<span class="pill orange" style="font-size:.5rem">⚡ Diskussion nötig</span>' : ''}
        </div>
        <div class="card-sub">${catConf.e} ${esc(it.cat)} · ${esc(it.room)}</div>
      </div>
      <div style="text-align:right;margin-right:6px">
        <div style="font-weight:700;color:${it.bought?'var(--gn)':'var(--pk)';font-size:.9rem}">${fmtEur(effectivePrice)}</div>
        <div style="font-size:.6rem;color:#888">${it.bought ? 'gezahlt' : 'geschätzt'}</div>
      </div>
      <!-- VOTE AREA (inline, no card toggle) -->
      <div class="vote-area" onclick="event.stopPropagation()">
        <div class="voter">
          <div class="voter-name">${esc(names.M || 'Mari')}</div>
          <div class="vote-btns">
            <button class="vbtn ${it.voteM==='yes'?'active-yes':''}"  onclick="setVote('${it.id}','M','yes')">👍</button>
            <button class="vbtn ${it.voteM==='meh'?'active-meh':''}"  onclick="setVote('${it.id}','M','meh')">🤔</button>
            <button class="vbtn ${it.voteM==='no'?'active-no':''}"   onclick="setVote('${it.id}','M','no')">👎</button>
          </div>
        </div>
        <div class="voter">
          <div class="voter-name">${esc(names.A || 'Alexander')}</div>
          <div class="vote-btns">
            <button class="vbtn ${it.voteA==='yes'?'active-yes':''}"  onclick="setVote('${it.id}','A','yes')">👍</button>
            <button class="vbtn ${it.voteA==='meh'?'active-meh':''}"  onclick="setVote('${it.id}','A','meh')">🤔</button>
            <button class="vbtn ${it.voteA==='no'?'active-no':''}"   onclick="setVote('${it.id}','A','no')">👎</button>
          </div>
        </div>
        <div class="vote-score ${vs > 0 ? 'pos' : vs < 0 ? 'neg' : ''}">${vs > 0 ? '+' : ''}${vs}</div>
      </div>
      <span class="chev">▼</span>
    </div>
    <div class="card-body">
      ${it.note ? `<div class="note-box">${esc(it.note)}</div>` : ''}
      ${it.link ? `<div style="margin-bottom:6px"><a href="${esc(it.link)}" target="_blank" class="pill blue" style="padding:3px 10px;font-size:.7rem;cursor:pointer">🔗 Produkt ansehen</a></div>` : ''}
      ${it.voteNoteM ? `<div style="font-size:.72rem;background:var(--pkl);padding:4px 8px;border-radius:5px;margin-bottom:3px">🌸 ${esc(names.M)}: "${esc(it.voteNoteM)}"</div>` : ''}
      ${it.voteNoteA ? `<div style="font-size:.72rem;background:var(--bll);padding:4px 8px;border-radius:5px;margin-bottom:3px">💼 ${esc(names.A)}: "${esc(it.voteNoteA)}"</div>` : ''}
      <div class="card-actions">
        ${!it.bought
          ? `<button class="btn suc sml" onclick="openBuyModal('${it.id}')">✅ Gekauft!</button>
             <button class="btn sml" onclick="addVoteNote('${it.id}')">💬 Kommentar</button>`
          : `<button class="btn sml" onclick="unmarkBought('${it.id}')">↺ Rückgängig</button>`}
        <button class="btn sml" onclick="editBuyItem('${it.id}')">✏️</button>
        <button class="btn sml dan" onclick="deleteBuyConfirm('${it.id}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

// ---- CRUD ----
function addBuyItem() {
  const name = fVal('b-name');
  if (!name) { toast('Bitte Namen eingeben', 'red'); return; }
  const it = {
    id:      uid(), name,
    cat:     fVal('b-cat')  || 'Möbel',
    room:    fVal('b-room') || 'Wohnzimmer',
    prio:    fVal('b-prio') || 'want',
    price:   fNum('b-price'),
    link:    fVal('b-link'),
    note:    fVal('b-note'),
    voteM:'', voteA:'', voteNoteM:'', voteNoteA:'',
    bought: false, actualPrice: 0, boughtDate:'', boughtStore:'',
    created: Date.now()
  };
  addBuy(it);
  closeModal('buy-add-modal');
  fClear('b-name','b-price','b-link','b-note');
  rBuy(); toast(name + ' hinzugefügt 🛒', 'green');
  updateStatusBar();
}

function editBuyItem(id) {
  const it = getBuy(id); if (!it) return;
  fSet('be-id', id); fSet('be-name', it.name); fSet('be-cat', it.cat);
  fSet('be-room', it.room); fSet('be-prio', it.prio);
  fSet('be-price', it.price); fSet('be-link', it.link); fSet('be-note', it.note);
  openModal('buy-edit-modal');
}

function saveBuyEdit() {
  const id = fVal('be-id');
  const it = getBuy(id); if (!it) return;
  it.name  = fVal('be-name') || it.name;
  it.cat   = fVal('be-cat'); it.room = fVal('be-room');
  it.prio  = fVal('be-prio'); it.price = fNum('be-price');
  it.link  = fVal('be-link'); it.note  = fVal('be-note');
  updBuy(it);
  closeModal('buy-edit-modal');
  rBuy(); toast('Gespeichert ✅', 'green');
  updateStatusBar();
}

function deleteBuyConfirm(id) {
  const it = getBuy(id);
  confirmDialog(`"${it?.name}" löschen?`, () => { delBuy(id); rBuy(); updateStatusBar(); toast('Gelöscht', 'warn'); });
}

function setVote(id, who, vote) {
  const it = getBuy(id); if (!it) return;
  const key = 'vote' + who;
  it[key] = it[key] === vote ? '' : vote;  // toggle off if same
  updBuy(it); rBuy(); updateStatusBar();
}

function addVoteNote(id) {
  const it = getBuy(id); if (!it) return;
  const settings = ldSettings();
  const names = settings.names || { M:'Mari', A:'Alexander' };
  inlineEdit(
    `Kommentar hinzufügen (${names.M} oder ${names.A})`,
    '', v => {
      if (!v) return;
      // Ask who (simple: if voteM is set, add to that person's note)
      it.voteNoteM = v; // simplified: assign to Mari
      updBuy(it); rBuy();
    },
    'Dein Kommentar zu diesem Artikel'
  );
}

function unmarkBought(id) {
  const it = getBuy(id); if (!it) return;
  it.bought = false; it.actualPrice = 0; it.boughtDate = ''; it.boughtStore = '';
  updBuy(it); rBuy(); updateStatusBar();
  toast('Als ungekauft markiert', 'info');
}
