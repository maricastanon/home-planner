// ============================================================
// ui.js — Unser neues Zuhause · UI state & interactions
// ============================================================

// Expand/collapse state
const EX = {};
function isExpanded(id) { return EX[id] === true; }

function togCard(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.classList.toggle('xp');
  EX[id] = open;
}

function expandAll(containerSel) {
  document.querySelectorAll(containerSel + ' .card').forEach(c => { c.classList.add('xp'); EX[c.id] = true; });
}
function collapseAll(containerSel) {
  document.querySelectorAll(containerSel + ' .card').forEach(c => { c.classList.remove('xp'); EX[c.id] = false; });
}

// ---- TAB SWITCHING ----
const TAB_IDS = ['dash','plan','move','take','sell','buy','cmp'];
let _activeTab = 'dash';
let _prevTab   = null;

function switchTab(t) {
  if (!TAB_IDS.includes(t)) return;
  _prevTab = _activeTab; _activeTab = t;
  document.querySelectorAll('.tp').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('p-' + t);
  const tab   = document.querySelector('.tb[data-tab="' + t + '"]');
  if (panel) panel.classList.add('active');
  if (tab)   tab.classList.add('active');
  // Scroll tab into view on mobile
  if (tab) tab.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
  // Render the panel
  const renderers = {
    dash: rDash, plan: rPlanUI, move: rMove,
    take: rTake,  sell: rSell,  buy: rBuy, cmp: rCompare
  };
  if (renderers[t]) renderers[t]();
  scrollTop();
}

// ---- MODALS ----
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) closeAllModals();
});

// ---- FORM HELPERS ----
function fVal(id)     { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function fNum(id)     { return parseFloat(fVal(id)) || 0; }
function fCheck(id)   { const el = document.getElementById(id); return el ? el.checked : false; }
function fSet(id, v)  { const el = document.getElementById(id); if (el) el.value = v; }
function fClear(...ids) { ids.forEach(id => fSet(id, '')); }
function fSelectAdd(selectId, opts) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = opts.map(o => `<option value="${esc(o.k)}">${esc(o.e ? o.e + ' ' : '')}${esc(o.l)}</option>`).join('');
}

// ---- SEARCH BAR STATE ----
const _searchState = {};
function getSearch(key) { return (_searchState[key] || '').toLowerCase(); }
function setSearch(key, val) { _searchState[key] = val; }

// ---- SECTION TOGGLE ----
function togSection(bodyId, arrowId) {
  const b = document.getElementById(bodyId);
  const a = document.getElementById(arrowId);
  if (!b) return;
  const open = b.style.display !== 'none';
  b.style.display = open ? 'none' : 'block';
  if (a) a.textContent = open ? '▶' : '▼';
}

// ---- STATUS BAR ----
function updateStatusBar() {
  const stats  = getBudgetStats();
  const sell   = getSellStats();
  const pack   = getPackingStats();
  const cd     = getCountdown();
  const el     = document.getElementById('status-bar');
  if (!el) return;
  const cdText = cd ? (cd.past ? 'Eingezogen! 🏠' : `${cd.days}d bis Einzug`) : '';
  el.innerHTML = `
    <span title="Budget">${stats.pct >= 100 ? '⚠️' : '💰'} ${stats.pct}%</span>
    <span title="Verdient">💸 ${fmtEurShort(sell.earned)}</span>
    <span title="Eingepackt">📦 ${pack.pct}%</span>
    ${cdText ? `<span title="Einzug">📅 ${cdText}</span>` : ''}
  `;
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  const shortcuts = { '1':'dash','2':'plan','3':'move','4':'take','5':'sell','6':'buy','7':'cmp' };
  if (shortcuts[e.key]) { e.preventDefault(); switchTab(shortcuts[e.key]); }
  if (e.key === 'Escape') closeAllModals();
});

// ---- SCROLL TO TOP BUTTON ----
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top-btn');
  if (btn) btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
});

// ---- SELL CONFIRMATION MODAL ----
let _pendingSellId = null;
function openSellModal(id) {
  _pendingSellId = id;
  const it = getSell(id);
  if (!it) return;
  fSet('sell-modal-price', it.price || '');
  fSet('sell-modal-date', todayISO());
  fSet('sell-modal-buyer', '');
  fSet('sell-modal-note', '');
  openModal('sell-modal');
}
function confirmSold() {
  if (!_pendingSellId) return;
  const it = getSell(_pendingSellId);
  if (!it) return;
  it.status     = 'sold';
  it.soldPrice  = fNum('sell-modal-price') || it.price;
  it.soldDate   = fVal('sell-modal-date');
  it.buyer      = fVal('sell-modal-buyer');
  it.soldNote   = fVal('sell-modal-note');
  it.soldTs     = Date.now();
  updSell(it);
  closeModal('sell-modal');
  _pendingSellId = null;
  celebrate('💰', 3);
  toast('Verkauft! ' + fmtEur(it.soldPrice) + ' 🎉', 'green');
  rSell();
  updateStatusBar();
}

// ---- BUY MARK BOUGHT MODAL ----
let _pendingBuyId = null;
function openBuyModal(id) {
  _pendingBuyId = id;
  const it = getBuy(id);
  if (!it) return;
  fSet('buy-modal-price', it.price || '');
  fSet('buy-modal-date', todayISO());
  fSet('buy-modal-store', '');
  openModal('buy-modal');
}
function confirmBought() {
  if (!_pendingBuyId) return;
  const it = getBuy(_pendingBuyId);
  if (!it) return;
  it.bought      = true;
  it.actualPrice = fNum('buy-modal-price') || it.price;
  it.boughtDate  = fVal('buy-modal-date');
  it.boughtStore = fVal('buy-modal-store');
  it.boughtTs    = Date.now();
  updBuy(it);
  closeModal('buy-modal');
  _pendingBuyId = null;
  celebrate('🎉');
  toast(it.name + ' gekauft! 🛒', 'green');
  rBuy();
  updateStatusBar();
}

// ---- SETTINGS MODAL ----
function openSettings() {
  const s = ldSettings();
  fSet('set-movedate', s.moveDate || '');
  fSet('set-address', s.apartmentAddress || '');
  fSet('set-from', s.fromAddress || '');
  fSet('set-budget', s.maxBudget || 3000);
  fSet('set-name-m', s.names?.M || 'Mari');
  fSet('set-name-a', s.names?.A || 'Alexander');
  openModal('settings-modal');
}
function saveSettings() {
  const s = {
    moveDate: fVal('set-movedate'),
    apartmentAddress: fVal('set-address'),
    fromAddress: fVal('set-from'),
    maxBudget: fNum('set-budget') || 3000,
    names: { M: fVal('set-name-m') || 'Mari', A: fVal('set-name-a') || 'Alexander' }
  };
  svSettings(s);
  closeModal('settings-modal');
  toast('Einstellungen gespeichert ✅', 'green');
  if (_activeTab === 'dash') rDash();
  updateStatusBar();
}

// ---- PRO/CON CHIPS INPUT ----
function addChip(listId, type, inputId) {
  const inp = document.getElementById(inputId);
  if (!inp) return null;
  const val = inp.value.trim();
  if (!val) return null;
  inp.value = '';
  return val;
}
function renderChips(vals, type, onRemove) {
  return (vals || []).map(v =>
    `<span class="pc-tag ${type}">${esc(v)} <span class="rm" onclick="${onRemove}('${esc(v)}')">✕</span></span>`
  ).join('');
}

// ---- PRICING HISTORY HELPERS ----
function renderPriceHistory(priceLog) {
  if (!priceLog || !priceLog.length) return '';
  return `<div class="price-log">
    ${priceLog.map(p => `<span style="font-size:.62rem;color:#888">${fmtDate(p.date)}: ${fmtEur(p.price)}</span>`).join(' → ')}
  </div>`;
}

// ---- INIT ----
function initUI() {
  updateStatusBar();
  // default tab
  switchTab('dash');
}
