// ============================================================
// ui.js — Our New Home · UI state & interactions
// ============================================================

const TAB_IDS = ['dash','plan','move','take','sell','buy','cmp','movein'];
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
  const renderers = { dash:rDash, plan:rPlanUI, move:rMove, take:rTake, sell:rSell, buy:rBuy, cmp:rCompare, movein:rMovein };
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
function togCard(id) {
  const el = document.getElementById(id); if (!el) return;
  if (el.classList.contains('card')) {
    el.classList.toggle('xp');
    return;
  }
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  const chev = el.closest('.card')?.querySelector('.chev') || el.parentElement?.querySelector('.chev');
  if (chev) chev.textContent = open ? '▶' : '▼';
  const card = el.closest('.card');
  if (card) card.classList.toggle('xp', !open);
}

// ── Status bar ────────────────────────────────────────────────
function updateStatusBar() {
  const budget = getBudgetStats(), sell = getSellStats(), pack = getPackingStats(), cd = getCountdown();
  const el = document.getElementById('status-bar'); if(!el) return;
  const cdText = cd ? (cd.past ? '🏠 Moved in!' : `📅 ${cd.days}d to go`) : '';
  const mi = typeof getMoveinStats === 'function' ? getMoveinStats() : null;
  const miPct = mi && mi.checkTotal ? Math.round(mi.checkDone / mi.checkTotal * 100) : 0;
  el.innerHTML = [
    `<span onclick="switchTab('buy')">${budget.pct>=100?'⚠️':'💰'} Budget ${budget.pct}%</span>`,
    `<span onclick="switchTab('sell')">💸 ${fmtEurShort(sell.earned)}</span>`,
    `<span onclick="switchTab('take')">📦 ${pack.pct}% packed</span>`,
    mi && mi.checkTotal ? `<span onclick="switchTab('movein')">🏡 ${miPct}% moved in</span>` : '',
    cdText ? `<span onclick="openSettings()">${cdText}</span>` : ''
  ].filter(Boolean).join('');
}

// ── Settings ──────────────────────────────────────────────────
function openSettings() {
  const s=ldSettings();
  fSet('set-movedate',s.moveDate||''); fSet('set-newaddr',s.newAddress||'');
  fSet('set-oldaddr',s.oldAddress||''); fSet('set-budget',s.maxBudget||5000);
  fSet('set-name-m',s.names?.M||'Mari'); fSet('set-name-a',s.names?.A||'Alex');
  fSet('set-currency',s.currency||'€');
  fSet('set-workspace',s.householdId||window.HomeAuth?.getWorkspaceOverride?.()||'');
  openModal('settings-modal');
}
async function saveSettings() {
  const desiredHouseholdId = normalizeHouseholdId(fVal('set-workspace'));
  const nextSettings = {
    moveDate:fVal('set-movedate'), newAddress:fVal('set-newaddr'),
    oldAddress:fVal('set-oldaddr'), maxBudget:fNum('set-budget')||5000,
    names:{ M:fVal('set-name-m')||'Mari', A:fVal('set-name-a')||'Alex' },
    currency:fVal('set-currency')||'€',
    householdId:desiredHouseholdId,
  };
  const currentScope = typeof getStorageScope === 'function' ? getStorageScope() : '';
  const defaultScope = window.HomeAuth?.getDefaultStorageScope?.() || '';
  const targetScope = householdScopeFromId(desiredHouseholdId) || defaultScope;

  if (window.HomeAuth?.setWorkspaceOverride && targetScope !== currentScope) {
    const snapshot = typeof captureStorageScope === 'function' ? captureStorageScope(currentScope) : {};
    window.HomeAuth.setWorkspaceOverride(desiredHouseholdId);
    if (window.HomeAws?.loadFromCloud) {
      try { await window.HomeAws.loadFromCloud(); } catch { /* ignore workspace load failures in UI */ }
    }
    const targetHasData = typeof storageScopeHasData === 'function' ? storageScopeHasData(targetScope) : false;
    if (!targetHasData && typeof seedStorageScope === 'function') seedStorageScope(targetScope, snapshot);
    if (targetHasData) {
      const workspaceSettings = ldSettings();
      workspaceSettings.householdId = desiredHouseholdId;
      svSettings(workspaceSettings);
    } else {
      svSettings(nextSettings);
    }
    closeModal('settings-modal');
    toast(
      desiredHouseholdId
        ? (targetHasData ? `Joined shared workspace ${desiredHouseholdId} 🏡` : `Created shared workspace ${desiredHouseholdId} 🏡`)
        : (targetHasData ? 'Switched back to your personal workspace 🏠' : 'Created a personal workspace snapshot 🏠'),
      'green',
      2600
    );
    setTimeout(() => location.reload(), 500);
    return;
  }

  svSettings(nextSettings); closeModal('settings-modal');
  toast('Settings saved ✅','green');
  const sub=document.getElementById('hdr-sub');
  if(sub) sub.textContent = buildHeaderSubtitle(nextSettings);
  if (typeof syncAllRoomSelects === 'function') syncAllRoomSelects();
  if (typeof syncAllOwnerSelects === 'function') syncAllOwnerSelects();
  if (window.HomeApp?.setUserChrome) window.HomeApp.setUserChrome(window.HomeAuth?.getUser?.() || null);
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
  markItemPurchased(it, {
    actualPrice:fNum('buy-modal-price')||it.price,
    boughtDate:fVal('buy-modal-date'),
    boughtStore:fVal('buy-modal-store'),
    boughtTs:Date.now(),
  });
  updBuyItem(it); closeModal('buy-confirm-modal'); _pendingBuyId=null;
  celebrate('🎉'); toast(it.name+' bought! 🛒','green');
  rBuy(); updateStatusBar();
  if(document.getElementById('item-detail-modal')?.classList.contains('open')) openItemDetail(it.id);
}

// ── Keyboard shortcuts ────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  const map={'1':'dash','2':'plan','3':'move','4':'take','5':'sell','6':'buy','7':'cmp','8':'movein'};
  if (map[e.key]) { e.preventDefault(); switchTab(map[e.key]); }
  if (e.key==='Escape') closeAllModals();
  if ((e.ctrlKey||e.metaKey)&&e.key==='k') { e.preventDefault(); document.getElementById('buy-search')?.focus(); }
});
window.addEventListener('scroll', ()=>{ const b=document.getElementById('scroll-top-btn'); if(b) b.style.display=window.scrollY>300?'flex':'none'; });

// ── Pill filter builders ──────────────────────────────────────
function rBuyFilters() {
  const items=ldBuy();
  const roomCounts={}, catCounts={}, sourceCounts={};
  items.forEach(it=>{
    roomCounts[it.roomId]=(roomCounts[it.roomId]||0)+1;
    catCounts[it.category]=(catCounts[it.category]||0)+1;
    const sourceKey = normalizeItemSource(it.source);
    sourceCounts[sourceKey]=(sourceCounts[sourceKey]||0)+1;
  });
  const roomOpts=getAllRooms().filter(r=>roomCounts[r.id]).map(r=>({k:r.id,l:r.label,e:r.emoji,count:roomCounts[r.id]}));
  const catOpts=ITEM_CATEGORIES.filter(c=>catCounts[c.k]).map(c=>({k:c.k,l:c.l,e:c.e,count:catCounts[c.k]}));
  const prioOpts=BUY_PRIOS.map(p=>({k:p.k,l:p.l,e:p.e}));
  const statusOpts=[{k:'pending',l:'To buy',e:'🛒'},{k:'bought',l:'Bought',e:'✅'},{k:'agreed',l:'Both 💕',e:''},{k:'disputed',l:'Disputed',e:'⚡'}];
  const sourceOpts=ITEM_SOURCES.filter(s=>sourceCounts[s.k]).map(s=>({k:s.k,l:s.l,e:s.e,count:sourceCounts[s.k]}));
  const sortOpts=[{k:'vote',l:'Votes',e:'🗳️'},{k:'prio',l:'Priority',e:'🔴'},{k:'price-lo',l:'Price ↑',e:'💰'},{k:'price-hi',l:'Price ↓',e:'💸'},{k:'name',l:'A–Z',e:'🔤'}];
  const viewOpts=[{k:'room',l:'By Room',e:'🏠'},{k:'type',l:'By Type',e:'📋'},{k:'grid',l:'Grid',e:'⊞'}];
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('buy',key,opts,fn,cfg); };
  el('buy-filter-room',  roomOpts,  'room',  rBuy, {showCounts:true, allowAll:'All Rooms'});
  el('buy-filter-cat',   catOpts,   'cat',   rBuy, {showCounts:true, allowAll:'All Categories'});
  el('buy-filter-prio',  prioOpts,  'prio',  rBuy);
  el('buy-filter-status',statusOpts,'status',rBuy);
  el('buy-filter-source',sourceOpts,'source',rBuy);
  const storeCounts={};
  items.forEach(it=>{ if(it.store) storeCounts[it.store]=(storeCounts[it.store]||0)+1; });
  const storeOpts=Object.entries(storeCounts).sort((a,b)=>b[1]-a[1]).map(([k,c])=>({k,l:k,e:'🏪',count:c}));
  if(storeOpts.length) el('buy-filter-store',storeOpts,'store',rBuy,{showCounts:true,allowAll:'All Stores'});
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
  items.forEach(it=>{
    const roomKey = normalizeRoomSelection(it.room);
    roomCounts[roomKey]=(roomCounts[roomKey]||0)+1;
  });
  const roomOpts=Object.entries(roomCounts).map(([roomId,count])=>{
    const room = getRoomDisplay(roomId);
    return { k:room.id, l:room.label, e:room.emoji, count };
  });
  const ownerOpts=getOwnerOptions().map(owner=>({k:owner.k,l:owner.l,e:owner.e}));
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
  const roomOpts=getAllRooms().filter(r=>roomCounts[r.id]).map(r=>({k:r.id,l:r.label,e:r.emoji}));
  const el=(id,opts,key,fn,cfg={})=>{ const e=document.getElementById(id); if(e) e.innerHTML=buildPillFilters('cmp',key,opts,fn,cfg); };
  el('cmp-filter-cat', catOpts, 'cat', rCompare, {showCounts:true});
  el('cmp-filter-room',roomOpts,'room',rCompare);
}

let _activityLogEntries = [];

async function openActivityLogs() {
  openModal('activity-logs-modal');
  const status = document.getElementById('activity-log-status');
  if (status) status.textContent = 'Loading activity…';
  await refreshActivityLogs();
}

async function refreshActivityLogs() {
  const cloudEntries = window.HomeAws && typeof window.HomeAws.fetchActivityLog === 'function'
    ? await window.HomeAws.fetchActivityLog(150)
    : null;
  const localEntries = (ldActivity() || []).map(entry => ({ ...entry, _source:'local' }));
  const merged = new Map();
  localEntries.forEach(entry => {
    const key = entry.id || `${entry.ts}-${entry.module}-${entry.action}-${entry.label}`;
    merged.set(key, entry);
  });
  (cloudEntries || []).forEach(entry => {
    const key = entry.id || entry.activityId || `${entry.ts || entry.activityTs}-${entry.module}-${entry.action}-${entry.label}`;
    merged.set(key, {
      id: entry.id || entry.activityId || key,
      module: entry.module || '',
      action: entry.action || '',
      label: entry.label || '',
      ts: Number(entry.ts || entry.activityTs || 0),
      _source:'cloud'
    });
  });
  _activityLogEntries = [...merged.values()].sort((a,b)=>(b.ts||0)-(a.ts||0));
  const status = document.getElementById('activity-log-status');
  if (status) {
    status.textContent = cloudEntries
      ? `Showing ${_activityLogEntries.length} merged entries from cloud + local cache`
      : `Showing ${_activityLogEntries.length} local entries`;
  }
  populateActivityModuleFilter();
  renderActivityLogs();
}

function populateActivityModuleFilter() {
  const select = document.getElementById('activity-log-module-filter');
  if (!select) return;
  const current = select.value || '';
  const counts = {};
  _activityLogEntries.forEach(entry => {
    const key = entry.module || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  });
  const options = Object.entries(counts)
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([module,count]) => `<option value="${esc(module)}">${esc(module)} (${count})</option>`);
  select.innerHTML = ['<option value="">All modules</option>', ...options].join('');
  if (current && counts[current]) select.value = current;
}

function renderActivityLogs() {
  const filter = document.getElementById('activity-log-module-filter')?.value || '';
  const el = document.getElementById('activity-log-list');
  if (!el) return;
  const entries = filter ? _activityLogEntries.filter(entry => entry.module === filter) : _activityLogEntries;
  const icons={move:'🚚',take:'📦',sell:'💸',buy:'🛒',compare:'⚖️',cmp:'⚖️',plan:'📐',settings:'⚙️',boxes:'📦',movecl:'✅',timeline:'📅',utilities:'🔌',keys:'🔑',walkthrough:'🚶'};
  const actions={add:'added',update:'updated',delete:'deleted'};
  if (!entries.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><div class="ei">🧾</div>No activity found for this filter.</div>';
    return;
  }
  el.innerHTML = entries.map(entry => `
    <div class="activity-item" style="padding:10px 0;border-bottom:1px solid var(--bg2);align-items:flex-start">
      <span style="font-size:1rem">${icons[entry.module] || '📋'}</span>
      <div style="flex:1">
        <div style="font-size:.74rem"><strong>${esc(trunc(entry.label, 42))}</strong> <span style="color:var(--bd3)">${actions[entry.action] || esc(entry.action || 'logged')}</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:.58rem;color:var(--bd3);margin-top:2px">
          <span>${esc(entry.module || 'unknown')}</span>
          <span>${fmtTs(entry.ts || 0)}</span>
          <span>${entry._source === 'cloud' ? '☁️ cloud' : '💾 local'}</span>
        </div>
      </div>
    </div>`).join('');
}

function copyActivityLogsJson() {
  if (!_activityLogEntries.length) {
    toast('No activity to copy yet','warn');
    return;
  }
  copyText(JSON.stringify(_activityLogEntries, null, 2), 'Activity log JSON');
}
