// ============================================================
// ui.js — Our New Home · UI state & interactions
// ============================================================

const TAB_IDS = ['dash','plan','move','take','sell','buy','cmp'];
let _activeTab = 'dash';

function switchTab(t) {
  if (!TAB_IDS.includes(t)) return;
  _activeTab = t;
  document.querySelectorAll('.tp').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('p-'+t);
  const tab   = document.querySelector('.tb[data-tab="'+t+'"]');
  if (panel) panel.classList.add('active');
  if (tab) { tab.classList.add('active'); tab.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}); }
  const renderers = { dash:rDash, plan:rPlanUI, move:rMove, take:rTake, sell:rSell, buy:rBuy, cmp:rCompare };
  if (renderers[t]) renderers[t]();
  scrollTop();
}

function openModal(id)    { const m=document.getElementById(id); if(m){m.classList.add('open');document.body.style.overflow='hidden';} }
function closeModal(id)   { const m=document.getElementById(id); if(m){m.classList.remove('open');document.body.style.overflow='';} }
function closeAllModals() { document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); document.body.style.overflow=''; }
document.addEventListener('click', e => { if(e.target.classList.contains('modal')) closeAllModals(); });

function togSection(bodyId, arrowId) {
  const b=document.getElementById(bodyId), a=document.getElementById(arrowId);
  if(!b) return;
  const open = b.style.display!=='none';
  b.style.display = open ? 'none' : 'block';
  if(a) a.textContent = open ? '▶' : '▼';
}
function togCard(id) { document.getElementById(id)?.classList.toggle('xp'); }

// ── Status bar ────────────────────────────────────────────────
function updateStatusBar() {
  const budget = getBudgetStats(), sell = getSellStats(), pack = getPackingStats(), cd = getCountdown();
  const el = document.getElementById('status-bar'); if(!el) return;
  const cdText = cd ? (cd.past ? '🏠 Moved in!' : `📅 ${cd.days}d to go`) : '';
  el.innerHTML = [
    `<span onclick="switchTab('buy')">${budget.pct>=100?'⚠️':'💰'} Budget ${budget.pct}%</span>`,
    `<span onclick="switchTab('sell')">💸 ${fmtEurShort(sell.earned)}</span>`,
    `<span onclick="switchTab('take')">📦 ${pack.pct}% packed</span>`,
    cdText ? `<span onclick="openSettings()">${cdText}</span>` : ''
  ].filter(Boolean).join('');
}

// ── Settings ──────────────────────────────────────────────────
function openSettings() {
  const s=ldSettings();
  fSet('set-movedate',s.moveDate||''); fSet('set-newaddr',s.newAddress||'');
  fSet('set-oldaddr',s.oldAddress||''); fSet('set-budget',s.maxBudget||5000);
  fSet('set-name-m',s.names?.M||'Mari'); fSet('set-name-a',s.names?.A||'Alexander');
  openModal('settings-modal');
}
function saveSettings() {
  const s = {
    moveDate:fVal('set-movedate'), newAddress:fVal('set-newaddr'),
    oldAddress:fVal('set-oldaddr'), maxBudget:fNum('set-budget')||5000,
    names:{ M:fVal('set-name-m')||'Mari', A:fVal('set-name-a')||'Alexander' }
  };
  svSettings(s); closeModal('settings-modal');
  toast('Settings saved ✅','green');
  const sub=document.getElementById('hdr-sub');
  if(sub&&s.newAddress) sub.textContent=(s.names.M)+' & '+(s.names.A)+' · '+s.newAddress;
  if(_activeTab==='dash') rDash();
  updateStatusBar();
}

// ── Confirm sold ──────────────────────────────────────────────
let _pendingSellId = null, _pendingBuyId = null;

function openSellModal(id) {
  _pendingSellId=id; const it=getSellItem(id); if(!it) return;
  fSet('sell-modal-price',it.price||''); fSet('sell-modal-date',todayISO());
  fSet('sell-modal-buyer',''); fSet('sell-modal-note','');
  openModal('sell-confirm-modal');
}
function confirmSold() {
  if(!_pendingSellId) return;
  const it=getSellItem(_pendingSellId); if(!it) return;
  it.status='sold'; it.soldPrice=fNum('sell-modal-price')||it.price;
  it.soldDate=fVal('sell-modal-date'); it.buyer=fVal('sell-modal-buyer');
  it.soldNote=fVal('sell-modal-note'); it.soldTs=Date.now();
  updSellItem(it); closeModal('sell-confirm-modal'); _pendingSellId=null;
  celebrate('💰',3); toast('Sold! '+fmtEur(it.soldPrice),'green');
  rSell(); updateStatusBar();
}

// ── Confirm bought ────────────────────────────────────────────
function openBuyModal(id) {
  _pendingBuyId=id; const it=getBuyItem(id); if(!it) return;
  fSet('buy-modal-price',it.price||''); fSet('buy-modal-date',todayISO()); fSet('buy-modal-store','');
  openModal('buy-confirm-modal');
}
function confirmBought() {
  if(!_pendingBuyId) return;
  const it=getBuyItem(_pendingBuyId); if(!it) return;
  it.bought=true; it.actualPrice=fNum('buy-modal-price')||it.price;
  it.boughtDate=fVal('buy-modal-date'); it.boughtStore=fVal('buy-modal-store');
  it.boughtTs=Date.now(); it.prevItemStatus=it.itemStatus; it.itemStatus='placed';
  updBuyItem(it); closeModal('buy-confirm-modal'); _pendingBuyId=null;
  celebrate('🎉'); toast(it.name+' bought! 🛒','green');
  rBuy(); updateStatusBar();
  if(document.getElementById('item-detail-modal')?.classList.contains('open')) openItemDetail(it.id);
}

// ── Keyboard shortcuts ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  const map={'1':'dash','2':'plan','3':'move','4':'take','5':'sell','6':'buy','7':'cmp'};
  if (map[e.key]) { e.preventDefault(); switchTab(map[e.key]); }
  if (e.key==='Escape') closeAllModals();
  if ((e.ctrlKey||e.metaKey)&&e.key==='k') { e.preventDefault(); document.getElementById('buy-search')?.focus(); }
});
window.addEventListener('scroll', ()=>{ const b=document.getElementById('scroll-top-btn'); if(b) b.style.display=window.scrollY>300?'flex':'none'; });

// ── Pill filter builders ──────────────────────────────────────
function rBuyFilters() {
  const items=ldBuy();
  const roomCounts={}, catCounts={};
  items.forEach(it=>{ roomCounts[it.roomId]=(roomCounts[it.roomId]||0)+1; catCounts[it.category]=(catCounts[it.category]||0)+1; });
  const roomOpts=ROOMS.filter(r=>roomCounts[r.id]).map(r=>({k:r.id,l:r.label,e:r.emoji,count:roomCounts[r.id]}));
  const catOpts=ITEM_CATEGORIES.filter(c=>catCounts[c.k]).map(c=>({k:c.k,l:c.l,e:c.e,count:catCounts[c.k]}));
  const prioOpts=BUY_PRIOS.map(p=>({k:p.k,l:p.l,e:p.e}));
  const statusOpts=[{k:'pending',l:'To buy',e:'🛒'},{k:'bought',l:'Bought',e:'✅'},{k:'agreed',l:'Both 💕',e:''},{k:'disputed',l:'Disputed',e:'⚡'}];
  const sortOpts=[{k:'vote',l:'Votes',e:'🗳️'},{k:'prio',l:'Priority',e:'🔴'},{k:'price-lo',l:'Price ↑',e:'💰'},{k:'price-hi',l:'Price ↓',e:'💸'},{k:'name',l:'A–Z',e:'🔤'}];
  const viewOpts=[{k:'room',l:'By Room',e:'🏠'},{k:'type',l:'By Type',e:'📋'},{k:'grid',l:'Grid',e:'⊞'}];
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('buy',key,opts,fn,cfg); };
  el('buy-filter-room',  roomOpts,  'room',  rBuy, {showCounts:true, allowAll:'All Rooms'});
  el('buy-filter-cat',   catOpts,   'cat',   rBuy, {showCounts:true, allowAll:'All Categories'});
  el('buy-filter-prio',  prioOpts,  'prio',  rBuy);
  el('buy-filter-status',statusOpts,'status',rBuy);
  el('buy-sort-pills',   sortOpts,  'sort',  rBuy, {allowAll:false});
  el('buy-view-pills',   viewOpts,  'view',  rBuy, {allowAll:false});
}

function rSellFilters() {
  const items=ldSell();
  const platCounts={}; items.forEach(it=>{ platCounts[it.platform]=(platCounts[it.platform]||0)+1; });
  const platOpts=SELL_PLATFORMS.filter(p=>platCounts[p.k]).map(p=>({k:p.k,l:p.l,e:p.e}));
  const statusOpts=[{k:'active',l:'Available',e:'🟢'},{k:'reserved',l:'Reserved',e:'🔒'},{k:'sold',l:'Sold',e:'✅'},{k:'donated',l:'Donated',e:'🎁'}];
  const sortOpts=[{k:'date',l:'Newest',e:'🕐'},{k:'price-hi',l:'Price ↓',e:'💸'},{k:'price-lo',l:'Price ↑',e:'💰'},{k:'status',l:'Status',e:'📋'}];
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('sell',key,opts,fn,cfg); };
  el('sell-filter-plat',  platOpts,  'plat',  rSell);
  el('sell-filter-status',statusOpts,'status',rSell);
  el('sell-sort-pills',   sortOpts,  'sort',  rSell, {allowAll:false});
}

function rTakeFilters() {
  const items=ldTake();
  const roomCounts={};
  items.forEach(it=>{ roomCounts[it.room]=(roomCounts[it.room]||0)+1; });
  const roomOpts=Object.entries(roomCounts).map(([r,c])=>({k:r,l:r,count:c}));
  const ownerOpts=OWNERS.map(o=>({k:o.k,l:o.l,e:o.e}));
  const statusOpts=[{k:'packed',l:'Packed ✓',e:'✅'},{k:'unpacked',l:'Still needed',e:'📦'}];
  const sortOpts=[{k:'room',l:'Room',e:'🏠'},{k:'name',l:'A–Z',e:'🔤'},{k:'prio',l:'Priority',e:'🔴'},{k:'owner',l:'Owner',e:'👤'}];
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('take',key,opts,fn,cfg); };
  el('take-filter-room',  roomOpts,  'room',  rTake, {showCounts:true});
  el('take-filter-owner', ownerOpts, 'owner', rTake);
  el('take-filter-status',statusOpts,'status',rTake);
  el('take-sort-pills',   sortOpts,  'sort',  rTake, {allowAll:false});
}

function rMoveFilters() {
  const statusOpts=COMPANY_STATUS.map(s=>({k:s.k,l:s.l,e:s.e}));
  const el=document.getElementById('move-filter-status');
  if(el) el.innerHTML=buildPillFilters('move','status',statusOpts,rMove);
}

function rCmpFilters() {
  const items=ldCmp();
  const catCounts={}, roomCounts={};
  items.forEach(it=>{ catCounts[it.category]=(catCounts[it.category]||0)+1; roomCounts[it.roomId]=(roomCounts[it.roomId]||0)+1; });
  const catOpts=Object.entries(catCounts).map(([k,c])=>({k,l:k,count:c}));
  const roomOpts=ROOMS.filter(r=>roomCounts[r.id]).map(r=>({k:r.id,l:r.label,e:r.emoji}));
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('cmp',key,opts,fn,cfg); };
  el('cmp-filter-cat', catOpts, 'cat', rCompare, {showCounts:true});
  el('cmp-filter-room',roomOpts,'room',rCompare);
}
