// ============================================================
// utils.js — Our New Home · Utility functions
// ============================================================

function uid()    { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function jsq(s)   { return esc(JSON.stringify(String(s ?? ''))); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function trunc(s, n=40) { return s&&s.length>n ? s.slice(0,n)+'…' : (s||''); }

// ── Date / time ──────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0,10); }
function fmtDate(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
}
function fmtTs(ts) {
  if (!ts) return '–';
  const diff = Date.now() - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  if (diff < 604800000)return Math.floor(diff/86400000) + 'd ago';
  return fmtDate(new Date(ts));
}

// ── Numbers / currency ───────────────────────────────────────
function fmtEur(n, dec=2) {
  if (n==null||n==='') return '–';
  return Number(n).toLocaleString('de-DE',{minimumFractionDigits:dec,maximumFractionDigits:dec}) + '\u00a0€';
}
function fmtEurShort(n) {
  if (!n) return '–';
  return n>=1000 ? (n/1000).toFixed(1).replace('.0','')+'k€' : fmtEur(n,0);
}

// ── Sorting / grouping ───────────────────────────────────────
function sortBy(arr, key, asc=true) {
  return [...arr].sort((a,b)=>{
    const va=a[key]??'', vb=b[key]??'';
    if(typeof va==='number') return asc?va-vb:vb-va;
    return asc?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));
  });
}
function groupBy(arr, key) {
  return arr.reduce((g,it)=>{ const k=it[key]||'?'; (g[k]=g[k]||[]).push(it); return g; }, {});
}

// ── Vote score ───────────────────────────────────────────────
function voteScore(it) {
  const v={yes:2,meh:1,no:-1,'':0};
  return (v[it.voteM]||0) + (v[it.voteA]||0);
}
function itemPreferenceMode(it) {
  return it && (Object.prototype.hasOwnProperty.call(it, 'ratingM') || Object.prototype.hasOwnProperty.call(it, 'ratingA'))
    ? 'rating'
    : 'vote';
}
function comparePreferenceScore(it) {
  if (itemPreferenceMode(it) === 'rating') {
    const avg = ((Number(it.ratingM) || 0) + (Number(it.ratingA) || 0)) / 2;
    return (avg / 5) * 4;
  }
  const map = { yes:5, meh:3, no:1, '':0 };
  const avg = ((map[it.voteM] || 0) + (map[it.voteA] || 0)) / 2;
  return (avg / 5) * 4;
}
function preferenceCellLabel(it, personKey) {
  if (itemPreferenceMode(it) === 'rating') {
    const val = Number(personKey === 'M' ? it.ratingM : it.ratingA) || 0;
    return val ? `${val}/5` : '–';
  }
  const vote = personKey === 'M' ? it.voteM : it.voteA;
  return vote ? ({ yes:'👍 Yes', no:'👎 No', meh:'🤔 Maybe' }[vote] || '–') : '–';
}
function preferenceInlineLabel(it, personKey) {
  if (itemPreferenceMode(it) === 'rating') {
    const val = Number(personKey === 'M' ? it.ratingM : it.ratingA) || 0;
    return val ? `⭐ ${val}/5` : '–';
  }
  const vote = personKey === 'M' ? it.voteM : it.voteA;
  return vote ? ({ yes:'👍', no:'👎', meh:'🤔' }[vote] || '–') : '–';
}
function buildHeaderSubtitle(settings) {
  const s = settings || ldSettings();
  const parts = [(s.names?.M || 'Mari') + ' & ' + (s.names?.A || 'Alexander')];
  if (s.newAddress) parts.push(s.newAddress);
  if (s.moveDate) parts.push('Move-in: ' + fmtDate(s.moveDate));
  return parts.join(' · ');
}

// ── Progress bar ─────────────────────────────────────────────
function progressBar(pct, color='var(--pk)', h='7px') {
  const c = pct>=100?'var(--gn)':pct>=80?'#f59e0b':color;
  return `<div style="height:${h};background:#f1f5f9;border-radius:4px;overflow:hidden">
    <div style="height:100%;width:${Math.min(100,pct)}%;background:${c};border-radius:4px;transition:width .4s"></div>
  </div>`;
}

// ── Stars ────────────────────────────────────────────────────
function stars(n,max=5,f='⭐',e='') { return (f.repeat(Math.max(0,n)))+(e?e.repeat(Math.max(0,max-n)):''); }

// ── Energy badge ─────────────────────────────────────────────
function energyBadge(e) {
  if (!e) return '–';
  const c = ENERGY_COLORS[e] || '#6b7280';
  return `<span style="font-weight:700;color:${c};font-size:.82rem;background:${c}22;padding:1px 6px;border-radius:4px">${esc(e)}</span>`;
}

// ── Num circle ───────────────────────────────────────────────
function numCircle(n, color='var(--pk)') {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${color};color:#fff;font-size:.58rem;font-weight:700;flex-shrink:0">${n}</span>`;
}

// ─────────────────────────────────────────────────────────────
// PILL FILTER SYSTEM
// ─────────────────────────────────────────────────────────────
// State: module → filterKey → activeValue
const PILL_STATE = {};

function initPillFilter(module, key, defaultVal = '') {
  if (!PILL_STATE[module]) PILL_STATE[module] = {};
  if (PILL_STATE[module][key] === undefined) PILL_STATE[module][key] = defaultVal;
}
function getPillVal(module, key) { return PILL_STATE[module]?.[key] ?? ''; }
function setPillVal(module, key, val, renderFn) {
  if (!PILL_STATE[module]) PILL_STATE[module] = {};
  PILL_STATE[module][key] = val;
  if (renderFn) renderFn();
}

/**
 * Build a pill-filter row
 * @param {string} module  - module name for state
 * @param {string} key     - filter key
 * @param {Array}  options - [{k, l, e?, count?}]
 * @param {Function} renderFn - called when a pill is clicked
 * @param {boolean} multi  - allow multiple active (future)
 */
function buildPillFilters(module, key, options, renderFn, { showCounts=false, allowAll=true }={}) {
  const cur = getPillVal(module, key);
  let h = `<div class="pill-row" data-module="${module}" data-key="${key}">`;
  if (allowAll) {
    h += `<span class="pf ${cur===''?'on':''}" onclick="setPillVal('${module}','${key}','',${renderFn.name})">${allowAll===true?'All':'All '+allowAll}</span>`;
  }
  options.forEach(o => {
    const active = cur === o.k;
    const cntBadge = o.count != null && showCounts ? `<span class="pf-count">${o.count}</span>` : '';
    h += `<span class="pf ${active?'on':''}" onclick="setPillVal('${module}','${key}',${jsq(o.k)},${renderFn.name})">${o.e?o.e+' ':''}${esc(o.l)}${cntBadge}</span>`;
  });
  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────
// CHIP INPUT (pros/cons like apartment_search)
// ─────────────────────────────────────────────────────────────
/**
 * Render a chip-input section (suggestions + custom input + active chips)
 */
function buildChipInput(opts) {
  const { id, type, chips = [], suggestions = [], placeholder = 'Add...', onAdd, onRemove, colorClass } = opts;
  const cc = colorClass || (type==='pro'?'pro':'con');
  let h = `<div class="chip-section ${cc}">`;
  // Active chips
  h += `<div class="chip-active" id="chips-${id}">`;
  h += chips.map(c => `<span class="chip ${cc}">${esc(c)} <span class="chip-rm" onclick="${onRemove}(${jsq(c)})">✕</span></span>`).join('');
  h += '</div>';
  // Suggestions
  if (suggestions.length) {
    h += `<div class="chip-sugg">`;
    suggestions.filter(s => !chips.includes(s)).slice(0, 8).forEach(s => {
      h += `<span class="chip-s" onclick="${onAdd}(${jsq(s)})">${esc(s)}</span>`;
    });
    h += '</div>';
  }
  // Custom input
  h += `<div class="chip-input-row">
    <input id="chip-inp-${id}" placeholder="${esc(placeholder)}" class="chip-inp-field"
      onkeydown="if(event.key==='Enter'){${onAdd}(document.getElementById('chip-inp-${id}').value);document.getElementById('chip-inp-${id}').value=''}">
    <button class="btn sml" onclick="${onAdd}(document.getElementById('chip-inp-${id}').value);document.getElementById('chip-inp-${id}').value=''">+</button>
  </div>`;
  h += '</div>';
  return h;
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type='info', duration=3000) {
  const el = document.getElementById('toast-container'); if (!el) return;
  const colors = {info:'#1d4ed8',green:'#15803d',red:'#dc2626',warn:'#d97706',pink:'#be185d'};
  const div = document.createElement('div');
  div.className = 'toast';
  div.style.cssText = `background:${colors[type]||colors.info};color:#fff;padding:10px 16px;border-radius:10px;font-size:.78rem;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);margin-top:6px;cursor:pointer;animation:toastIn .25s ease`;
  div.textContent = msg;
  div.onclick = () => div.remove();
  el.appendChild(div);
  setTimeout(()=>div.style.opacity='0', duration-300);
  setTimeout(()=>div.remove(), duration);
}

// ── Celebrate ────────────────────────────────────────────────
function celebrate(emoji='🎉', n=4) {
  for (let i=0;i<n;i++) setTimeout(()=>{
    const el=document.createElement('div');
    el.className='celebrate'; el.textContent=emoji;
    el.style.left=(15+Math.random()*70)+'%';
    document.body.appendChild(el); setTimeout(()=>el.remove(),900);
  }, i*130);
}

// ── Confirm ──────────────────────────────────────────────────
function confirmDlg(msg, onYes, onNo=null) {
  const m = document.getElementById('confirm-modal');
  if (!m) { if(confirm(msg))onYes(); else if(onNo)onNo(); return; }
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-yes').onclick = ()=>{ m.classList.remove('open'); onYes(); };
  document.getElementById('confirm-no').onclick  = ()=>{ m.classList.remove('open'); if(onNo)onNo(); };
  m.classList.add('open');
}

// ── Inline edit ──────────────────────────────────────────────
let _ieCb = null;
function inlineEdit(title, cur, cb, hint='') {
  const m = document.getElementById('inline-edit-modal');
  if (!m) { const v=prompt(title+(hint?'\n'+hint:''),cur||''); if(v!==null)cb(v); return; }
  _ieCb = cb;
  document.getElementById('ie-title').textContent = title;
  document.getElementById('ie-hint').textContent  = hint;
  document.getElementById('ie-inp').value = cur||'';
  m.classList.add('open'); setTimeout(()=>document.getElementById('ie-inp').focus(),80);
}
function ieSubmit() { const v=document.getElementById('ie-inp').value; document.getElementById('inline-edit-modal').classList.remove('open'); if(_ieCb)_ieCb(v); _ieCb=null; }
function ieClose()  { document.getElementById('inline-edit-modal').classList.remove('open'); _ieCb=null; }

// ── Form helpers ─────────────────────────────────────────────
function fVal(id)   { const el=document.getElementById(id); return el ? el.value.trim() : ''; }
function fNum(id)   { return parseFloat(fVal(id))||0; }
function fChk(id)   { const el=document.getElementById(id); return el?el.checked:false; }
function fSet(id,v) { const el=document.getElementById(id); if(el)el.value=v; }
function fSetChk(id,v){ const el=document.getElementById(id); if(el)el.checked=!!v; }
function fClear(...ids){ ids.forEach(id=>fSet(id,'')); }
function fSetSel(id,v){ const el=document.getElementById(id); if(el){ [...el.options].forEach(o=>o.selected=(o.value===String(v))); } }

// ── Download ─────────────────────────────────────────────────
function downloadText(content, filename, type='text/plain') {
  const blob = new Blob([content],{type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download=filename; a.click();
}

// ── Scroll ───────────────────────────────────────────────────
function scrollTop() { window.scrollTo({top:0,behavior:'smooth'}); }

// ── Copy ─────────────────────────────────────────────────────
function copyText(text, label='Text') {
  navigator.clipboard.writeText(text)
    .then(()=>toast(label+' copied 📋','green'))
    .catch(()=>{ const el=document.createElement('textarea'); el.value=text; document.body.appendChild(el); el.select(); try{document.execCommand('copy');toast('Copied','green')}catch{}document.body.removeChild(el); });
}

// ── Dimension string ─────────────────────────────────────────
function dimStr(it, unit='cm') {
  const parts = [];
  if (it.widthCm)  parts.push(it.widthCm+'W');
  if (it.depthCm)  parts.push(it.depthCm+'D');
  if (it.heightCm) parts.push(it.heightCm+'H');
  return parts.length ? parts.join(' × ')+' '+unit : null;
}

// ── Item footprint area (m²) ─────────────────────────────────
function itemFootprint(it) {
  if (!it.widthCm || !it.depthCm) return null;
  return ((it.widthCm/100) * (it.depthCm/100)).toFixed(2);
}

// ── Slug ─────────────────────────────────────────────────────
function slugify(s) { return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'_'); }
