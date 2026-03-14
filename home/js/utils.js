// ============================================================
// utils.js — Unser neues Zuhause · Utility functions
// ============================================================

// Unique ID
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// HTML escape
function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Currency
function fmtEur(n, dec = 2) {
  if (!n && n !== 0) return '–';
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '\u00a0€';
}
function fmtEurShort(n) {
  if (!n) return '–';
  return n >= 1000 ? (n/1000).toFixed(1).replace('.0','') + 'k\u00a0€' : fmtEur(n, 0);
}

// Date/Time
function fmtDate(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }); }
  catch { return d; }
}
function fmtDateShort(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('de-DE', { day:'2-digit', month:'short' }); }
  catch { return d; }
}
function fmtTs(ts) {
  if (!ts) return '–';
  const diff = Date.now() - ts;
  if (diff < 60000)   return 'gerade eben';
  if (diff < 3600000) return Math.floor(diff/60000) + ' Min. ago';
  if (diff < 86400000)return Math.floor(diff/3600000) + ' Std. ago';
  if (diff < 604800000)return Math.floor(diff/86400000) + ' Tage ago';
  return fmtDate(new Date(ts));
}

// Debounce
function debounce(fn, ms = 220) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Deep clone
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

// Truncate
function trunc(s, n = 40) { return s && s.length > n ? s.slice(0, n) + '…' : (s || ''); }

// Sort array by key
function sortBy(arr, key, asc = true) {
  return [...arr].sort((a, b) => {
    const va = a[key] ?? '', vb = b[key] ?? '';
    if (typeof va === 'number') return asc ? va - vb : vb - va;
    return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

// Group array by key
function groupBy(arr, key) {
  return arr.reduce((g, it) => { const k = it[key] || '?'; (g[k] = g[k] || []).push(it); return g; }, {});
}

// Progress bar HTML
function progressBar(pct, color = 'var(--pk)', height = '8px') {
  const c = pct >= 100 ? 'var(--gn)' : pct >= 80 ? '#ff9800' : color;
  return `<div style="height:${height};background:#f0f0f0;border-radius:4px;overflow:hidden">
    <div style="height:100%;width:${Math.min(100,pct)}%;background:${c};border-radius:4px;transition:width .4s"></div>
  </div>`;
}

// Numbered circle
function numCircle(n, color = 'var(--pk)') {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:${color};color:#fff;font-size:.6rem;font-weight:700;margin-right:4px;flex-shrink:0">${n}</span>`;
}

// Pill badge
function pill(text, cls = 'gray', extra = '') {
  return `<span class="pill ${cls}" ${extra}>${esc(text)}</span>`;
}

// Star display
function stars(n, max = 5, filled = '⭐', empty = '☆') {
  return filled.repeat(Math.max(0,n)) + (empty ? empty.repeat(Math.max(0,max-n)) : '');
}

// Energy badge
function energyBadge(e) {
  if (!e) return '–';
  const color = ENERGY_COLORS[e] || '#888';
  return `<span style="font-weight:700;color:${color};font-size:.82rem">${esc(e)}</span>`;
}

// Vote score for buy items
function voteScore(it) {
  let s = 0;
  const v = { yes: 2, meh: 1, no: -1, '': 0 };
  s += (v[it.voteM] || 0) + (v[it.voteA] || 0);
  return s;
}

// Vote emoji display
function voteEmoji(v) {
  return v === 'yes' ? '👍' : v === 'no' ? '👎' : v === 'meh' ? '🤔' : '–';
}

// ---- TOAST SYSTEM ----
let _toastQueue = [], _toastTimer = null;
function toast(msg, type = 'info', duration = 3000) {
  const el = document.getElementById('toast-container');
  if (!el) return;
  const id = uid();
  const colors = { info:'#1565c0', green:'#2e7d32', red:'#c2185b', warn:'#e65100', pink:'#e91e63' };
  const c = colors[type] || colors.info;
  const div = document.createElement('div');
  div.className = 'toast'; div.id = 'toast-' + id;
  div.style.cssText = `background:${c};color:#fff;padding:9px 14px;border-radius:8px;font-size:.78rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.2);margin-top:6px;animation:toastIn .25s ease;cursor:pointer;min-width:180px;max-width:300px`;
  div.textContent = msg;
  div.onclick = () => div.remove();
  el.appendChild(div);
  setTimeout(() => div.classList.add('toastOut'), duration - 300);
  setTimeout(() => div.remove(), duration);
}

// ---- CELEBRATE ----
function celebrate(emoji = '🎉', count = 3) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'celebrate';
      el.textContent = emoji;
      el.style.left = (20 + Math.random() * 60) + '%';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    }, i * 150);
  }
}

// ---- CONFIRM DIALOG ----
function confirmDialog(msg, onYes, onNo = null) {
  const m = document.getElementById('confirm-modal');
  if (!m) { if (confirm(msg)) onYes(); else if (onNo) onNo(); return; }
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-yes').onclick = () => { m.classList.remove('open'); onYes(); };
  document.getElementById('confirm-no').onclick  = () => { m.classList.remove('open'); if (onNo) onNo(); };
  m.classList.add('open');
}

// ---- INLINE EDIT ----
let _inlineEditCb = null;
function inlineEdit(title, cur, cb, hint = '') {
  const m = document.getElementById('inline-edit-modal');
  if (!m) { const v = prompt(title + (hint?'\n'+hint:''), cur||''); if (v!==null) cb(v); return; }
  _inlineEditCb = cb;
  document.getElementById('inline-edit-title').textContent = title;
  document.getElementById('inline-edit-hint').textContent  = hint;
  document.getElementById('inline-edit-inp').value = cur || '';
  m.classList.add('open');
  setTimeout(() => document.getElementById('inline-edit-inp').focus(), 80);
}
function submitInlineEdit() {
  const v = document.getElementById('inline-edit-inp').value;
  document.getElementById('inline-edit-modal').classList.remove('open');
  if (_inlineEditCb) _inlineEditCb(v);
  _inlineEditCb = null;
}
function closeInlineEdit() {
  document.getElementById('inline-edit-modal').classList.remove('open');
  _inlineEditCb = null;
}

// ---- SCROLL TO TOP ----
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ---- COPY TO CLIPBOARD ----
function copyText(text, label = 'Text') {
  navigator.clipboard.writeText(text).then(() => toast(label + ' kopiert! 📋', 'green')).catch(() => {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); toast(label + ' kopiert!', 'green'); } catch {}
    document.body.removeChild(el);
  });
}

// ---- DOWNLOAD TEXT ----
function downloadText(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ---- LOCAL DATE ----
function todayISO() { return new Date().toISOString().slice(0, 10); }

// ---- SEARCH HIGHLIGHT ----
function highlight(text, query) {
  if (!query) return esc(text);
  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return esc(text).replace(re, '<mark style="background:#fff59d;border-radius:2px">$1</mark>');
}

// ---- PLATFORM CSS CLASS ----
function platformCss(k) {
  const p = SELL_PLATFORMS.find(x => x.k === k);
  return p ? p.css : 'gray';
}
