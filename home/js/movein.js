// ============================================================
// movein.js — Move-In Checklist, Address Changes, Utility Setup,
//             Furniture Catalog, Running Costs, Smart Room Audit
// ============================================================

// ── Storage ──────────────────────────────────────────────────
function ldMovein() { return Object.assign({ checklist:[], addresses:[], utilities:[] }, ld(K.movein, {})); }
function svMovein(d) { return sv(K.movein, d); }

// ── Move-In Subtab state ─────────────────────────────────────
let _moveinSubtab = 'checklist';

function switchMoveinSubtab(tab) {
  _moveinSubtab = tab;
  document.querySelectorAll('.movein-subtab').forEach(el => el.classList.toggle('active', el.dataset.subtab === tab));
  document.querySelectorAll('.movein-subtab-panel').forEach(el => el.classList.toggle('active', el.id === 'movein-sub-' + tab));
  rMovein();
}

function rMovein() {
  if (_moveinSubtab === 'checklist') rMoveinChecklist();
  else if (_moveinSubtab === 'addresses') rAddressChanges();
  else if (_moveinSubtab === 'utilities') rUtilities();
  else if (_moveinSubtab === 'catalog') rFurnitureCatalog();
  else if (_moveinSubtab === 'costs') rRunningCosts();
  else if (_moveinSubtab === 'audit') rSmartRoomAudit();
}

// ════════════════════════════════════════════════════════════
// 1. MOVE-IN CHECKLIST — First-week tasks
// ════════════════════════════════════════════════════════════
const DEFAULT_MOVEIN_TASKS = [
  { cat:'Before Move', items:[
    { label:'Forward mail at Deutsche Post', hint:'Set up Nachsendeauftrag online' },
    { label:'Copy all keys for new apartment', hint:'' },
    { label:'Take meter readings (old + new)', hint:'Gas, electricity, water' },
    { label:'Final walkthrough of old apartment', hint:'Photos for Protokoll' },
    { label:'Clean old apartment', hint:'Or book professional cleaning' },
  ]},
  { cat:'Moving Day', items:[
    { label:'Check moving truck / movers arrived', hint:'' },
    { label:'Protect floors and doorframes', hint:'Moving blankets, cardboard' },
    { label:'Label rooms in new apartment', hint:'Post-its on doors for movers' },
    { label:'Set up beds first', hint:'Priority for first night' },
    { label:'Keep essentials box accessible', hint:'Toiletries, chargers, snacks, tools' },
  ]},
  { cat:'First Week', items:[
    { label:'Register at Einwohnermeldeamt (Anmeldung)', hint:'Within 14 days!' },
    { label:'Connect internet / WiFi', hint:'Schedule technician if needed' },
    { label:'Set up electricity contract', hint:'Compare providers' },
    { label:'Set up gas / heating', hint:'Check existing contract' },
    { label:'Install smoke detectors', hint:'Required by law in Germany' },
    { label:'Check all outlets and switches', hint:'Report issues to landlord' },
    { label:'Meet neighbors', hint:'Small gift or introduce yourselves' },
    { label:'Locate fuse box and water shut-off', hint:'Important for emergencies' },
  ]},
  { cat:'First Month', items:[
    { label:'Update bank address', hint:'All banks and credit cards' },
    { label:'Update insurance addresses', hint:'Health, liability, household' },
    { label:'Update employer address', hint:'HR department' },
    { label:'Register car at new address', hint:'If applicable' },
    { label:'Change GEZ (TV license) address', hint:'rundfunkbeitrag.de' },
    { label:'Update Amazon, online shops', hint:'Delivery addresses' },
    { label:'Get spare keys made', hint:'Give one to trusted neighbor' },
    { label:'Check if old deposit was returned', hint:'Up to 6 months' },
  ]},
];

function rMoveinChecklist() {
  const el = document.getElementById('movein-checklist-content'); if (!el) return;
  const data = ldMovein();
  if (!data.checklist.length) {
    data.checklist = DEFAULT_MOVEIN_TASKS.map(cat => ({
      cat: cat.cat,
      items: cat.items.map(item => ({
        id: uid(), label: item.label, hint: item.hint, done: false, notes: ''
      }))
    }));
    svMovein(data);
  }

  const total = data.checklist.reduce((s, c) => s + c.items.length, 0);
  const done = data.checklist.reduce((s, c) => s + c.items.filter(i => i.done).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;

  let h = `<div class="movein-hero">
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:10px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--pk);line-height:1">${pct}%</div>
        <div style="font-size:.62rem;color:var(--bd3)">move-in progress</div>
      </div>
      <div style="flex:1;min-width:120px">
        ${progressBar(pct, pct >= 80 ? 'var(--gn)' : 'var(--pk)', '10px')}
        <div style="font-size:.58rem;color:var(--bd3);margin-top:3px">${done}/${total} tasks done</div>
      </div>
    </div>
  </div>`;

  data.checklist.forEach((cat, ci) => {
    const catDone = cat.items.filter(i => i.done).length;
    const catPct = cat.items.length ? Math.round(catDone / cat.items.length * 100) : 0;
    h += `<div class="movein-cat">
      <div class="movein-cat-hdr" onclick="togCard('mc-${ci}')">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.82rem">${esc(cat.cat)}</div>
          <div style="font-size:.55rem;color:var(--bd3)">${catDone}/${cat.items.length} done</div>
        </div>
        ${progressBar(catPct, catPct >= 100 ? 'var(--gn)' : 'var(--pk)', '5px')}
        <span class="chev">▼</span>
      </div>
      <div class="card-body" id="mc-${ci}" style="display:block">`;
    cat.items.forEach(item => {
      h += `<div class="movein-item ${item.done ? 'done' : ''}">
        <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleMoveinTask('${item.id}',this.checked)" style="accent-color:var(--pk);width:18px;height:18px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-size:.75rem;font-weight:500${item.done ? ';text-decoration:line-through;color:var(--bd3)' : ''}">${esc(item.label)}</div>
          ${item.hint ? `<div style="font-size:.55rem;color:var(--bd3)">${esc(item.hint)}</div>` : ''}
        </div>
        <button class="btn sml" onclick="removeMoveinTask('${item.id}')" style="font-size:.5rem;padding:2px 5px;color:var(--pk)">✕</button>
      </div>`;
    });
    h += `<div style="padding:4px 0">
        <button class="btn sml" onclick="addMoveinTask(${ci})" style="font-size:.58rem">+ Add task</button>
      </div>
    </div></div>`;
  });

  h += `<button class="btn" onclick="addMoveinCategory()" style="margin-top:8px">+ Add Category</button>`;
  el.innerHTML = h;
}

function toggleMoveinTask(id, checked) {
  const data = ldMovein();
  data.checklist.forEach(cat => cat.items.forEach(item => {
    if (item.id === id) item.done = checked;
  }));
  svMovein(data);
  rMoveinChecklist();
  if (checked) toast('Done!', 'green', 1200);
}

function addMoveinTask(catIdx) {
  const label = prompt('New task:');
  if (!label?.trim()) return;
  const data = ldMovein();
  if (data.checklist[catIdx]) {
    data.checklist[catIdx].items.push({ id: uid(), label: label.trim(), hint: '', done: false, notes: '' });
    svMovein(data);
    rMoveinChecklist();
    toast('Task added', 'green');
  }
}

function removeMoveinTask(id) {
  const data = ldMovein();
  data.checklist.forEach(cat => { cat.items = cat.items.filter(i => i.id !== id); });
  svMovein(data);
  rMoveinChecklist();
}

function addMoveinCategory() {
  const name = prompt('Category name (e.g. "Before Move", "Week 2"):');
  if (!name?.trim()) return;
  const data = ldMovein();
  data.checklist.push({ cat: name.trim(), items: [] });
  svMovein(data);
  rMoveinChecklist();
  toast('Category added', 'green');
}

// ════════════════════════════════════════════════════════════
// 2. ADDRESS CHANGE TRACKER
// ════════════════════════════════════════════════════════════
const DEFAULT_ADDRESSES = [
  { cat:'Government', items:['Einwohnermeldeamt (Anmeldung)','GEZ / Rundfunkbeitrag','Tax Office (Finanzamt)','Vehicle Registration'] },
  { cat:'Financial', items:['Bank accounts','Credit cards','PayPal','Insurance (health)','Insurance (liability)','Insurance (household)'] },
  { cat:'Work & Education', items:['Employer / HR','University','Professional memberships'] },
  { cat:'Services', items:['Internet provider','Mobile phone','Electricity','Gas / Heating','Water','Streaming (Netflix, Spotify...)','Amazon','Other online shops'] },
  { cat:'Personal', items:['Doctor / Dentist','Gym membership','Magazine subscriptions','Friends & family','Clubs / associations'] },
];

function rAddressChanges() {
  const el = document.getElementById('movein-addresses-content'); if (!el) return;
  const data = ldMovein();
  if (!data.addresses.length) {
    data.addresses = DEFAULT_ADDRESSES.map(cat => ({
      cat: cat.cat,
      items: cat.items.map(label => ({ id: uid(), label, done: false, notes: '' }))
    }));
    svMovein(data);
  }

  const total = data.addresses.reduce((s, c) => s + c.items.length, 0);
  const done = data.addresses.reduce((s, c) => s + c.items.filter(i => i.done).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;

  let h = `<div class="movein-hero">
    <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:10px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--pk);line-height:1">${done}/${total}</div>
        <div style="font-size:.62rem;color:var(--bd3)">addresses updated</div>
      </div>
      <div style="flex:1;min-width:120px">
        ${progressBar(pct, pct >= 80 ? 'var(--gn)' : 'var(--pk)', '10px')}
      </div>
    </div>
    <div style="font-size:.62rem;color:var(--bd3)">Track everyone who needs to know your new address.</div>
  </div>`;

  data.addresses.forEach((cat, ci) => {
    const catDone = cat.items.filter(i => i.done).length;
    h += `<div class="movein-cat">
      <div class="movein-cat-hdr" onclick="togCard('addr-${ci}')">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.82rem">${esc(cat.cat)}</div>
          <div style="font-size:.55rem;color:var(--bd3)">${catDone}/${cat.items.length}</div>
        </div>
        ${progressBar(cat.items.length ? Math.round(catDone / cat.items.length * 100) : 0, catDone === cat.items.length ? 'var(--gn)' : '#d97706', '5px')}
        <span class="chev">▼</span>
      </div>
      <div class="card-body" id="addr-${ci}" style="display:block">`;
    cat.items.forEach(item => {
      h += `<div class="movein-item ${item.done ? 'done' : ''}">
        <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleAddressItem('${item.id}',this.checked)" style="accent-color:var(--gn);width:18px;height:18px;flex-shrink:0">
        <div style="flex:1;min-width:0">
          <div style="font-size:.75rem;font-weight:500${item.done ? ';text-decoration:line-through;color:var(--bd3)' : ''}">${esc(item.label)}</div>
          ${item.notes ? `<div style="font-size:.52rem;color:var(--bd3)">${esc(item.notes)}</div>` : ''}
        </div>
        <button class="btn sml" onclick="noteAddressItem('${item.id}')" style="font-size:.5rem;padding:2px 5px">📝</button>
        <button class="btn sml" onclick="removeAddressItem('${item.id}')" style="font-size:.5rem;padding:2px 5px;color:var(--pk)">✕</button>
      </div>`;
    });
    h += `<button class="btn sml" onclick="addAddressItem(${ci})" style="font-size:.58rem;margin:4px 0">+ Add</button>
    </div></div>`;
  });

  el.innerHTML = h;
}

function toggleAddressItem(id, checked) {
  const data = ldMovein();
  data.addresses.forEach(cat => cat.items.forEach(item => { if (item.id === id) item.done = checked; }));
  svMovein(data);
  rAddressChanges();
  if (checked) toast('Updated!', 'green', 1200);
}

function noteAddressItem(id) {
  const data = ldMovein();
  let found;
  data.addresses.forEach(cat => cat.items.forEach(item => { if (item.id === id) found = item; }));
  if (!found) return;
  const note = prompt('Notes:', found.notes || '');
  if (note === null) return;
  found.notes = note;
  svMovein(data);
  rAddressChanges();
}

function addAddressItem(catIdx) {
  const label = prompt('Organization name:');
  if (!label?.trim()) return;
  const data = ldMovein();
  if (data.addresses[catIdx]) {
    data.addresses[catIdx].items.push({ id: uid(), label: label.trim(), done: false, notes: '' });
    svMovein(data);
    rAddressChanges();
  }
}

function removeAddressItem(id) {
  const data = ldMovein();
  data.addresses.forEach(cat => { cat.items = cat.items.filter(i => i.id !== id); });
  svMovein(data);
  rAddressChanges();
}

// ════════════════════════════════════════════════════════════
// 3. UTILITY SETUP TRACKER
// ════════════════════════════════════════════════════════════
const DEFAULT_UTILITIES = [
  { id:'u1', name:'Electricity', emoji:'⚡', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'' },
  { id:'u2', name:'Gas / Heating', emoji:'🔥', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'' },
  { id:'u3', name:'Water', emoji:'💧', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'' },
  { id:'u4', name:'Internet', emoji:'📶', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'' },
  { id:'u5', name:'TV / Streaming', emoji:'📺', provider:'', contract:'', monthlyCost:0, status:'active', account:'', notes:'' },
  { id:'u6', name:'Phone / Mobile', emoji:'📱', provider:'', contract:'', monthlyCost:0, status:'active', account:'', notes:'' },
  { id:'u7', name:'GEZ (TV License)', emoji:'📻', provider:'ARD/ZDF/Deutschlandradio', contract:'', monthlyCost:18.36, status:'active', account:'', notes:'18.36 EUR/month per household' },
  { id:'u8', name:'Household Insurance', emoji:'🏠', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'Hausratversicherung' },
  { id:'u9', name:'Liability Insurance', emoji:'🛡️', provider:'', contract:'', monthlyCost:0, status:'active', account:'', notes:'Haftpflichtversicherung' },
];

const UTILITY_STATUSES = [
  { k:'pending', l:'Not set up', e:'⏳', color:'#fef9c3', fg:'#713f12' },
  { k:'comparing', l:'Comparing', e:'🔍', color:'#dbeafe', fg:'#1d4ed8' },
  { k:'ordered', l:'Ordered', e:'📋', color:'#ede9fe', fg:'#5b21b6' },
  { k:'active', l:'Active', e:'✅', color:'#dcfce7', fg:'#166534' },
  { k:'cancelled', l:'Cancelled', e:'❌', color:'#fee2e2', fg:'#991b1b' },
];

function rUtilities() {
  const el = document.getElementById('movein-utilities-content'); if (!el) return;
  const data = ldMovein();
  if (!data.utilities.length) {
    data.utilities = DEFAULT_UTILITIES.map(u => ({ ...u, id: uid() }));
    svMovein(data);
  }

  const active = data.utilities.filter(u => u.status === 'active').length;
  const totalMonthly = data.utilities.filter(u => u.status === 'active' || u.status === 'ordered').reduce((s, u) => s + (u.monthlyCost || 0), 0);
  const totalYearly = totalMonthly * 12;

  let h = `<div class="movein-hero">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.6rem;color:var(--pk);line-height:1">${fmtEur(totalMonthly, 0)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">monthly utilities</div>
      </div>
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--bd2)">${fmtEur(totalYearly, 0)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">per year</div>
      </div>
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--gn)">${active}/${data.utilities.length}</div>
        <div style="font-size:.62rem;color:var(--bd3)">active</div>
      </div>
    </div>
  </div>`;

  data.utilities.forEach(util => {
    const statusMeta = UTILITY_STATUSES.find(s => s.k === util.status) || UTILITY_STATUSES[0];
    h += `<div class="utility-card">
      <div class="utility-card-header">
        <span style="font-size:1.3rem">${esc(util.emoji)}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.82rem">${esc(util.name)}</div>
          ${util.provider ? `<div style="font-size:.58rem;color:var(--bd3)">${esc(util.provider)}</div>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;font-size:.82rem;color:var(--pk)">${util.monthlyCost ? fmtEur(util.monthlyCost, 0) + '/mo' : '–'}</div>
          <select class="utility-status-select" style="font-size:.52rem;padding:2px 4px;border:1px solid var(--border);border-radius:6px;background:${statusMeta.color};color:${statusMeta.fg}" onchange="setUtilityStatus('${util.id}',this.value)">
            ${UTILITY_STATUSES.map(s => `<option value="${s.k}" ${util.status === s.k ? 'selected' : ''}>${s.e} ${s.l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="utility-card-body">
        <div class="form-grid" style="gap:6px">
          <div class="fg"><label style="font-size:.55rem">Provider</label><input value="${esc(util.provider)}" placeholder="Provider name" style="font-size:.72rem;padding:4px 8px" onchange="updateUtilityField('${util.id}','provider',this.value)"></div>
          <div class="fg"><label style="font-size:.55rem">Monthly cost (${_currency()})</label><input type="number" value="${util.monthlyCost || ''}" step="0.01" style="font-size:.72rem;padding:4px 8px" onchange="updateUtilityField('${util.id}','monthlyCost',parseFloat(this.value)||0)"></div>
          <div class="fg"><label style="font-size:.55rem">Contract / Plan</label><input value="${esc(util.contract)}" placeholder="e.g. 24 months" style="font-size:.72rem;padding:4px 8px" onchange="updateUtilityField('${util.id}','contract',this.value)"></div>
          <div class="fg"><label style="font-size:.55rem">Account #</label><input value="${esc(util.account)}" placeholder="Customer number" style="font-size:.72rem;padding:4px 8px" onchange="updateUtilityField('${util.id}','account',this.value)"></div>
        </div>
        ${util.notes ? `<div style="font-size:.58rem;color:var(--bd3);margin-top:4px">${esc(util.notes)}</div>` : ''}
      </div>
    </div>`;
  });

  h += `<button class="btn" onclick="addUtility()" style="margin-top:8px">+ Add Utility / Service</button>`;
  el.innerHTML = h;
}

function setUtilityStatus(id, status) {
  const data = ldMovein();
  const util = data.utilities.find(u => u.id === id);
  if (util) { util.status = status; svMovein(data); rUtilities(); }
}

function updateUtilityField(id, field, value) {
  const data = ldMovein();
  const util = data.utilities.find(u => u.id === id);
  if (util) { util[field] = value; svMovein(data); }
}

function addUtility() {
  const name = prompt('Service name:');
  if (!name?.trim()) return;
  const data = ldMovein();
  data.utilities.push({ id: uid(), name: name.trim(), emoji:'📋', provider:'', contract:'', monthlyCost:0, status:'pending', account:'', notes:'' });
  svMovein(data);
  rUtilities();
  toast('Service added', 'green');
}

// ════════════════════════════════════════════════════════════
// 4. FURNITURE QUICK-ADD CATALOG
// ════════════════════════════════════════════════════════════
const FURNITURE_CATALOG = [
  { cat:'Beds & Bedroom', items:[
    { name:'Double Bed (140×200)', category:'Furniture', type:'Bed', widthCm:147, depthCm:207, heightCm:45, priceRange:'200–800' },
    { name:'Double Bed (160×200)', category:'Furniture', type:'Bed', widthCm:167, depthCm:207, heightCm:45, priceRange:'250–1200' },
    { name:'Double Bed (180×200)', category:'Furniture', type:'Bed', widthCm:187, depthCm:207, heightCm:45, priceRange:'300–1500' },
    { name:'Single Bed (90×200)', category:'Furniture', type:'Bed', widthCm:97, depthCm:207, heightCm:40, priceRange:'100–400' },
    { name:'Wardrobe (2-door)', category:'Furniture', type:'Wardrobe', widthCm:100, depthCm:58, heightCm:200, priceRange:'150–600' },
    { name:'Wardrobe (3-door)', category:'Furniture', type:'Wardrobe', widthCm:150, depthCm:58, heightCm:200, priceRange:'250–900' },
    { name:'PAX Wardrobe (IKEA)', category:'Furniture', type:'Wardrobe', widthCm:200, depthCm:58, heightCm:236, priceRange:'400–1200', store:'IKEA' },
    { name:'Dresser / Chest of Drawers', category:'Furniture', type:'Dresser', widthCm:80, depthCm:48, heightCm:95, priceRange:'80–300' },
    { name:'Nightstand', category:'Furniture', type:'Nightstand', widthCm:45, depthCm:38, heightCm:55, priceRange:'30–150' },
    { name:'Mattress (140×200)', category:'Textiles', type:'Mattress', widthCm:140, depthCm:200, heightCm:20, priceRange:'200–800' },
    { name:'Mattress (160×200)', category:'Textiles', type:'Mattress', widthCm:160, depthCm:200, heightCm:22, priceRange:'250–1000' },
    { name:'Mattress (180×200)', category:'Textiles', type:'Mattress', widthCm:180, depthCm:200, heightCm:22, priceRange:'300–1200' },
  ]},
  { cat:'Living Room', items:[
    { name:'2-Seater Sofa', category:'Furniture', type:'Sofa', widthCm:180, depthCm:88, heightCm:82, priceRange:'300–1500' },
    { name:'3-Seater Sofa', category:'Furniture', type:'Sofa', widthCm:230, depthCm:90, heightCm:85, priceRange:'400–2000' },
    { name:'L-Shape Corner Sofa', category:'Furniture', type:'Sofa', widthCm:280, depthCm:200, heightCm:85, priceRange:'600–3000' },
    { name:'Armchair', category:'Furniture', type:'Armchair', widthCm:80, depthCm:85, heightCm:90, priceRange:'150–800' },
    { name:'Coffee Table', category:'Furniture', type:'Coffee Table', widthCm:110, depthCm:60, heightCm:45, priceRange:'50–400' },
    { name:'TV Stand / Media Unit', category:'Furniture', type:'Shelf Unit', widthCm:160, depthCm:40, heightCm:50, priceRange:'80–500' },
    { name:'Bookshelf (5 shelves)', category:'Furniture', type:'Bookshelf', widthCm:80, depthCm:28, heightCm:180, priceRange:'50–300' },
    { name:'KALLAX Shelf (4×4)', category:'Furniture', type:'Shelf Unit', widthCm:147, depthCm:39, heightCm:147, priceRange:'99–149', store:'IKEA' },
    { name:'Floor Lamp', category:'Lighting', type:'Floor Lamp', widthCm:30, depthCm:30, heightCm:170, priceRange:'30–200' },
    { name:'Rug (160×230)', category:'Textiles', type:'Rugs', widthCm:160, depthCm:230, heightCm:2, priceRange:'50–400' },
  ]},
  { cat:'Kitchen', items:[
    { name:'Fridge (standard)', category:'Appliances', type:'Fridge', widthCm:60, depthCm:65, heightCm:143, priceRange:'300–800', energyRating:'C' },
    { name:'Fridge-Freezer (tall)', category:'Appliances', type:'Fridge', widthCm:60, depthCm:67, heightCm:185, priceRange:'400–1200', energyRating:'C' },
    { name:'Washing Machine', category:'Appliances', type:'Washing Machine', widthCm:60, depthCm:60, heightCm:85, priceRange:'300–800', energyRating:'A' },
    { name:'Dryer', category:'Appliances', type:'Dryer', widthCm:60, depthCm:64, heightCm:85, priceRange:'400–900', energyRating:'A++' },
    { name:'Dishwasher (60cm)', category:'Appliances', type:'Dishwasher', widthCm:60, depthCm:60, heightCm:82, priceRange:'300–700', energyRating:'C' },
    { name:'Oven (built-in)', category:'Appliances', type:'Oven', widthCm:60, depthCm:55, heightCm:60, priceRange:'250–800', energyRating:'A' },
    { name:'Microwave', category:'Appliances', type:'Microwave', widthCm:48, depthCm:36, heightCm:28, priceRange:'50–250' },
    { name:'Dining Table (4-person)', category:'Furniture', type:'Dining Table', widthCm:120, depthCm:75, heightCm:75, priceRange:'100–600' },
    { name:'Dining Table (6-person)', category:'Furniture', type:'Dining Table', widthCm:180, depthCm:90, heightCm:75, priceRange:'200–1000' },
    { name:'Dining Chairs (set of 4)', category:'Furniture', type:'Chair', widthCm:44, depthCm:52, heightCm:85, priceRange:'100–500' },
  ]},
  { cat:'Study / Office', items:[
    { name:'Desk (120cm)', category:'Furniture', type:'Desk', widthCm:120, depthCm:60, heightCm:75, priceRange:'80–400' },
    { name:'Desk (160cm)', category:'Furniture', type:'Desk', widthCm:160, depthCm:80, heightCm:75, priceRange:'150–800' },
    { name:'Standing Desk (electric)', category:'Furniture', type:'Desk', widthCm:160, depthCm:80, heightCm:125, priceRange:'300–900' },
    { name:'Office Chair', category:'Furniture', type:'Chair', widthCm:65, depthCm:65, heightCm:120, priceRange:'100–600' },
    { name:'Monitor (27")', category:'Electronics', type:'Monitor', widthCm:61, depthCm:22, heightCm:46, priceRange:'200–500' },
  ]},
  { cat:'Bathroom', items:[
    { name:'Washing Machine', category:'Appliances', type:'Washing Machine', widthCm:60, depthCm:60, heightCm:85, priceRange:'300–800', energyRating:'A' },
    { name:'Bathroom Cabinet (mirror)', category:'Bathroom', type:'Cabinet', widthCm:80, depthCm:16, heightCm:70, priceRange:'50–300' },
    { name:'Shower Curtain Rod', category:'Bathroom', type:'Other Bathroom', widthCm:90, depthCm:1, heightCm:200, priceRange:'10–30' },
  ]},
  { cat:'Children\'s Room', items:[
    { name:'Children\'s Bed (70×140)', category:'Furniture', type:'Bed', widthCm:77, depthCm:147, heightCm:50, priceRange:'100–400' },
    { name:'Children\'s Wardrobe', category:'Furniture', type:'Wardrobe', widthCm:80, depthCm:52, heightCm:140, priceRange:'100–400' },
    { name:'Changing Table', category:'Furniture', type:'Dresser', widthCm:80, depthCm:55, heightCm:100, priceRange:'80–300' },
    { name:'Toy Storage / Shelf', category:'Storage', type:'Rack', widthCm:80, depthCm:30, heightCm:100, priceRange:'30–150' },
  ]},
];

let _catalogFilter = '';

function rFurnitureCatalog() {
  const el = document.getElementById('movein-catalog-content'); if (!el) return;
  let h = `<div class="movein-hero">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-size:1.6rem">📦</div>
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--pk)">Furniture Catalog</div>
        <div style="font-size:.62rem;color:var(--bd3)">Quick-add common items with pre-filled dimensions</div>
      </div>
    </div>
    <div class="search-bar" style="margin-bottom:6px">
      <span class="si">🔍</span>
      <input id="catalog-search" placeholder="Search catalog..." value="${esc(_catalogFilter)}" oninput="_catalogFilter=this.value;rFurnitureCatalog()">
    </div>
  </div>`;

  const q = _catalogFilter.toLowerCase();

  FURNITURE_CATALOG.forEach(cat => {
    const filtered = q ? cat.items.filter(it => (it.name + ' ' + it.type + ' ' + (it.store || '')).toLowerCase().includes(q)) : cat.items;
    if (!filtered.length) return;

    h += `<div class="catalog-cat">
      <div class="catalog-cat-hdr">${esc(cat.cat)} <span style="font-size:.6rem;color:var(--bd3)">${filtered.length}</span></div>
      <div class="catalog-grid">`;

    filtered.forEach(it => {
      const catConf = getCatByKey(it.category);
      h += `<div class="catalog-card" onclick="quickAddFromCatalog(${jsq(JSON.stringify(it))})">
        <div class="catalog-card-icon">${catConf?.e || '📦'}</div>
        <div class="catalog-card-name">${esc(it.name)}</div>
        <div class="catalog-card-dims">${it.widthCm}×${it.depthCm}×${it.heightCm} cm</div>
        <div class="catalog-card-price">${esc(it.priceRange || '–')} ${_currency()}</div>
        ${it.energyRating ? `<div style="margin-top:2px">${energyBadge(it.energyRating)}</div>` : ''}
        ${it.store ? `<div class="catalog-card-store">${getStoreMeta(it.store).e} ${esc(it.store)}</div>` : ''}
        <div class="catalog-add-badge">+ Quick Add</div>
      </div>`;
    });
    h += '</div></div>';
  });

  el.innerHTML = h;
}

function quickAddFromCatalog(jsonStr) {
  const template = JSON.parse(jsonStr);
  // Pre-fill the buy add form
  fSet('b-name', template.name || '');
  fSet('b-cat', template.category || 'Furniture');
  if (typeof onBuyCatChange === 'function') onBuyCatChange(document.getElementById('b-cat'));
  fSet('b-type', template.type || '');
  fSet('b-width', template.widthCm || '');
  fSet('b-depth', template.depthCm || '');
  fSet('b-height', template.heightCm || '');
  fSet('b-energy', template.energyRating || '');
  if (template.store) fSet('b-store', template.store);
  // Parse price range and use lower bound
  if (template.priceRange) {
    const match = template.priceRange.match(/(\d+)/);
    if (match) fSet('b-price', '');
  }
  // Switch to buy tab and open add modal
  if (typeof switchTab === 'function') switchTab('buy');
  if (typeof switchBuySubtab === 'function') switchBuySubtab('items');
  openModal('buy-add-modal');
  toast('Template loaded — customize and save!', 'info');
}

// ════════════════════════════════════════════════════════════
// 5. RUNNING COSTS CALCULATOR
// ════════════════════════════════════════════════════════════
const ENERGY_COSTS_KWH = {
  // Average annual kWh by appliance type and energy class
  'Fridge':       { 'A+++':90,'A++':110,'A+':130,'A':150,'B':200,'C':250,'D':320,'default':200 },
  'Freezer':      { 'A+++':100,'A++':130,'A+':160,'A':180,'B':240,'C':300,'default':220 },
  'Fridge':       { 'A+++':90,'A++':110,'A+':130,'A':150,'B':200,'C':250,'D':320,'default':200 },
  'Washing Machine':{ 'A+++':120,'A++':140,'A+':165,'A':190,'B':230,'C':280,'default':180 },
  'Dryer':        { 'A+++':160,'A++':200,'A+':250,'A':320,'B':400,'C':500,'default':350 },
  'Dishwasher':   { 'A+++':180,'A++':210,'A+':240,'A':270,'B':320,'C':380,'default':260 },
  'Oven':         { 'A+++':60,'A++':70,'A+':80,'A':100,'B':130,'default':100 },
  'TV':           { 'default':120 },
  'Monitor':      { 'default':50 },
};
const ELECTRICITY_PRICE_KWH = 0.32; // EUR per kWh (German average 2026)

function rRunningCosts() {
  const el = document.getElementById('movein-costs-content'); if (!el) return;
  const items = ldBuy();
  const applianceItems = items.filter(it => it.category === 'Appliances' || it.category === 'Electronics');

  if (!applianceItems.length) {
    el.innerHTML = '<div class="empty"><div class="ei">⚡</div>Add appliances to your Buy list to see estimated running costs.</div>';
    return;
  }

  let totalKwh = 0;
  const breakdown = [];

  applianceItems.forEach(it => {
    const energyMap = ENERGY_COSTS_KWH[it.type] || {};
    const annualKwh = energyMap[it.energyRating] || energyMap['default'] || 150;
    const annualCost = annualKwh * ELECTRICITY_PRICE_KWH;
    totalKwh += annualKwh;
    breakdown.push({ item: it, annualKwh, annualCost });
  });

  breakdown.sort((a, b) => b.annualCost - a.annualCost);
  const totalAnnualCost = totalKwh * ELECTRICITY_PRICE_KWH;
  const totalMonthlyCost = totalAnnualCost / 12;

  let h = `<div class="movein-hero">
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.6rem;color:var(--pk);line-height:1">${fmtEur(totalAnnualCost, 0)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">estimated annual energy cost</div>
      </div>
      <div>
        <div style="font-size:1rem;font-weight:700;color:var(--bd2)">${fmtEur(totalMonthlyCost, 0)}</div>
        <div style="font-size:.62rem;color:var(--bd3)">per month</div>
      </div>
      <div>
        <div style="font-size:1rem;font-weight:700">${Math.round(totalKwh)} kWh</div>
        <div style="font-size:.62rem;color:var(--bd3)">per year</div>
      </div>
    </div>
    <div style="font-size:.58rem;color:var(--bd3)">Based on ${fmtEur(ELECTRICITY_PRICE_KWH, 2)}/kWh average. Actual costs depend on usage patterns and provider.</div>
  </div>`;

  h += '<div style="margin-top:10px">';
  const maxKwh = Math.max(...breakdown.map(b => b.annualKwh), 1);
  breakdown.forEach(b => {
    const pct = Math.round(b.annualKwh / maxKwh * 100);
    const photo = b.item.photos?.[0];
    h += `<div class="running-cost-row" onclick="openItemDetail('${b.item.id}')">
      ${photo ? `<img src="${esc(photo)}" class="running-cost-thumb">` : `<div class="running-cost-thumb-placeholder">🏠</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:.75rem">${esc(b.item.name)}</div>
        <div style="font-size:.55rem;color:var(--bd3)">${esc(b.item.type || '')}${b.item.energyRating ? ' · Energy: ' + b.item.energyRating : ''}</div>
        <div style="height:6px;background:var(--bg2);border-radius:3px;overflow:hidden;margin-top:3px">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--gn),#d97706,var(--pk));border-radius:3px"></div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-weight:700;font-size:.78rem;color:var(--pk)">${fmtEur(b.annualCost, 0)}/yr</div>
        <div style="font-size:.52rem;color:var(--bd3)">${b.annualKwh} kWh</div>
      </div>
    </div>`;
  });
  h += '</div>';

  // Add utilities monthly cost if available
  const data = ldMovein();
  if (data.utilities?.length) {
    const utilMonthly = data.utilities.filter(u => u.status === 'active' || u.status === 'ordered').reduce((s, u) => s + (u.monthlyCost || 0), 0);
    if (utilMonthly > 0) {
      h += `<div class="note-box" style="margin-top:12px">
        <div style="font-weight:700;font-size:.72rem;margin-bottom:4px">Total Monthly Fixed Costs</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <div><span style="font-size:.62rem;color:var(--bd3)">Utilities:</span> <strong>${fmtEur(utilMonthly, 0)}</strong></div>
          <div><span style="font-size:.62rem;color:var(--bd3)">Energy:</span> <strong>${fmtEur(totalMonthlyCost, 0)}</strong></div>
          <div><span style="font-size:.62rem;color:var(--bd3)">Combined:</span> <strong style="color:var(--pk)">${fmtEur(utilMonthly + totalMonthlyCost, 0)}/mo</strong></div>
        </div>
      </div>`;
    }
  }

  el.innerHTML = h;
}

// ════════════════════════════════════════════════════════════
// 6. SMART ROOM AUDIT — Auto-detect missing essentials
// ════════════════════════════════════════════════════════════
const ROOM_ESSENTIALS = {
  'r-kueche': [
    { label:'Fridge / Freezer', types:['Fridge','Freezer'], priority:'must' },
    { label:'Oven / Hob', types:['Oven','Hob'], priority:'must' },
    { label:'Dishwasher', types:['Dishwasher'], priority:'want' },
    { label:'Extractor Hood', types:['Extractor Hood','Range Hood'], priority:'want' },
    { label:'Microwave', types:['Microwave'], priority:'nice' },
    { label:'Dining Table', types:['Dining Table'], priority:'want' },
    { label:'Dining Chairs', types:['Chair'], priority:'want' },
    { label:'Kitchen Lighting', types:['Ceiling Light'], priority:'must' },
    { label:'Trash Bin', types:['Bin','Basket'], priority:'must' },
  ],
  'r-wohnzim': [
    { label:'Sofa', types:['Sofa','Armchair'], priority:'must' },
    { label:'Coffee Table', types:['Coffee Table'], priority:'want' },
    { label:'TV', types:['TV'], priority:'want' },
    { label:'TV Stand', types:['Shelf Unit','Other Furniture'], priority:'nice' },
    { label:'Bookshelf / Storage', types:['Bookshelf','Shelf Unit'], priority:'nice' },
    { label:'Floor or Ceiling Light', types:['Floor Lamp','Ceiling Light'], priority:'must' },
    { label:'Rug', types:['Rugs'], priority:'nice' },
    { label:'Curtains', types:['Curtains'], priority:'want' },
  ],
  'r-schlaf': [
    { label:'Bed', types:['Bed'], priority:'must' },
    { label:'Mattress', types:['Mattress'], priority:'must' },
    { label:'Wardrobe', types:['Wardrobe'], priority:'must' },
    { label:'Nightstand(s)', types:['Nightstand'], priority:'want' },
    { label:'Dresser', types:['Dresser'], priority:'nice' },
    { label:'Bedding set', types:['Bedding'], priority:'must' },
    { label:'Curtains / Blinds', types:['Curtains'], priority:'must' },
    { label:'Bedside Lamp', types:['Desk Lamp','Wall Light'], priority:'want' },
  ],
  'r-kinder': [
    { label:'Bed', types:['Bed'], priority:'must' },
    { label:'Wardrobe / Storage', types:['Wardrobe','Shelf Unit'], priority:'must' },
    { label:'Desk', types:['Desk'], priority:'want' },
    { label:'Toy Storage', types:['Rack','Bin','Basket','Box'], priority:'want' },
    { label:'Lighting', types:['Ceiling Light','Desk Lamp'], priority:'must' },
    { label:'Rug', types:['Rugs'], priority:'nice' },
    { label:'Curtains', types:['Curtains'], priority:'must' },
  ],
  'r-esszim': [
    { label:'Desk', types:['Desk'], priority:'must' },
    { label:'Desk Chair', types:['Chair'], priority:'must' },
    { label:'Bookshelf / Storage', types:['Bookshelf','Shelf Unit'], priority:'want' },
    { label:'Desk Lamp', types:['Desk Lamp'], priority:'want' },
    { label:'Monitor / Screen', types:['Monitor','TV'], priority:'nice' },
  ],
  'r-bad': [
    { label:'Shower / Bathtub', types:['Shower','Bathtub'], priority:'must' },
    { label:'Mirror / Cabinet', types:['Mirror','Cabinet'], priority:'must' },
    { label:'Towel Rail', types:['Towel Rail'], priority:'want' },
    { label:'Bathroom Lighting', types:['Ceiling Light','Wall Light'], priority:'must' },
    { label:'Bath Mat', types:['Rugs'], priority:'want' },
  ],
  'r-flur': [
    { label:'Shoe Rack', types:['Rack','Other Furniture'], priority:'want' },
    { label:'Coat Hooks / Hanger', types:['Other Furniture','Rack'], priority:'want' },
    { label:'Mirror', types:['Mirror'], priority:'nice' },
    { label:'Hallway Light', types:['Ceiling Light'], priority:'must' },
  ],
};

function rSmartRoomAudit() {
  const el = document.getElementById('movein-audit-content'); if (!el) return;
  const items = ldBuy();
  const rooms = getAllRooms().filter(r => ROOM_ESSENTIALS[r.id]);

  if (!rooms.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🔍</div>No room data available for auditing.</div>';
    return;
  }

  let totalMissing = 0, totalCovered = 0;

  let h = `<div class="movein-hero">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <div style="font-size:1.6rem">🔍</div>
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--pk)">Smart Room Audit</div>
        <div style="font-size:.62rem;color:var(--bd3)">Auto-detect what each room is still missing</div>
      </div>
    </div>
  </div>`;

  rooms.forEach(room => {
    const essentials = ROOM_ESSENTIALS[room.id] || [];
    if (!essentials.length) return;
    const roomItems = items.filter(it => it.roomId === room.id);
    const results = essentials.map(need => {
      const found = roomItems.filter(it => need.types.some(t => (it.type || '').toLowerCase().includes(t.toLowerCase()) || (it.name || '').toLowerCase().includes(t.toLowerCase())));
      const covered = found.length > 0;
      if (covered) totalCovered++; else totalMissing++;
      return { ...need, found, covered };
    });
    const roomPct = essentials.length ? Math.round(results.filter(r => r.covered).length / essentials.length * 100) : 0;
    const prioColors = { must:'#dc2626', want:'#d97706', nice:'var(--gn)' };

    h += `<div class="audit-room-card">
      <div class="audit-room-hdr" style="background:${room.color}" onclick="togCard('audit-${room.id}')">
        <div style="flex:1">
          <div style="font-weight:700;font-size:.82rem">${room.emoji} ${esc(room.label)}</div>
          <div style="font-size:.55rem;color:var(--bd3)">${results.filter(r => r.covered).length}/${essentials.length} essentials covered</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:1.1rem;font-weight:700;color:${roomPct >= 80 ? 'var(--gn)' : roomPct >= 50 ? '#d97706' : 'var(--pk)'}">${roomPct}%</div>
        </div>
        <span class="chev">▼</span>
      </div>
      <div class="card-body" id="audit-${room.id}" style="display:block">`;

    results.forEach(r => {
      h += `<div class="audit-item ${r.covered ? 'covered' : 'missing'}">
        <span style="font-size:.9rem">${r.covered ? '✅' : '❌'}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:.72rem;font-weight:500">${esc(r.label)}</div>
          ${r.covered
            ? `<div style="font-size:.55rem;color:var(--gn)">${r.found.map(f => esc(trunc(f.name, 20))).join(', ')}</div>`
            : `<div style="font-size:.55rem;color:${prioColors[r.priority] || 'var(--bd3)'}">${r.priority === 'must' ? 'Must-have' : r.priority === 'want' ? 'Recommended' : 'Nice to have'} — not found</div>`
          }
        </div>
        ${!r.covered ? `<button class="btn sml pri" onclick="auditQuickAdd('${room.id}',${jsq(r.label)},${jsq(r.types[0]||'')})" style="font-size:.55rem">+ Add</button>` : ''}
      </div>`;
    });

    h += '</div></div>';
  });

  // Summary at top
  const summaryHtml = `<div class="mini-stats" style="margin-bottom:10px">
    <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${totalCovered}</div><div class="ms-lbl">Covered</div></div>
    <div class="mini-stat"><div class="ms-num" style="color:var(--pk)">${totalMissing}</div><div class="ms-lbl">Missing</div></div>
    <div class="mini-stat"><div class="ms-num">${totalCovered + totalMissing}</div><div class="ms-lbl">Total essentials</div></div>
    <div class="mini-stat"><div class="ms-num">${Math.round(totalCovered / (totalCovered + totalMissing || 1) * 100)}%</div><div class="ms-lbl">Coverage</div></div>
  </div>`;

  const heroEndIdx = h.indexOf('</div>') + 6;
  el.innerHTML = h.slice(0, heroEndIdx) + summaryHtml + h.slice(heroEndIdx);
}

function auditQuickAdd(roomId, label, type) {
  fSet('b-name', label);
  fSet('b-type', type);
  syncRoomSelect('b-room', { selected: roomId });
  if (typeof switchTab === 'function') switchTab('buy');
  if (typeof switchBuySubtab === 'function') switchBuySubtab('items');
  openModal('buy-add-modal');
  toast('Fill in details and save', 'info');
}

// ════════════════════════════════════════════════════════════
// 7. PRINT SHOPPING LIST
// ════════════════════════════════════════════════════════════
function printShoppingList() {
  const items = ldBuy().filter(it => !it.bought && normalizeItemSource(it.source) !== 'existing');
  const byStore = {};
  items.forEach(it => {
    const key = it.store?.trim() || 'No Store';
    (byStore[key] = byStore[key] || []).push(it);
  });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Shopping List — Our New Home</title>
    <style>
      body{font-family:'DM Sans',sans-serif;padding:20px;max-width:800px;margin:0 auto;color:#1e293b}
      h1{color:#e91e63;font-size:1.4rem;margin-bottom:4px}
      .date{color:#94a3b8;font-size:.8rem;margin-bottom:20px}
      .store{margin-bottom:20px;page-break-inside:avoid}
      .store-name{font-weight:700;font-size:1rem;border-bottom:2px solid #e91e63;padding-bottom:4px;margin-bottom:8px}
      .item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f1f5f9;align-items:center}
      .checkbox{width:14px;height:14px;border:2px solid #cbd5e1;border-radius:3px;flex-shrink:0}
      .item-name{flex:1;font-size:.85rem}
      .item-price{font-weight:700;font-size:.85rem;color:#e91e63}
      .item-dims{font-size:.7rem;color:#94a3b8}
      .total{font-weight:700;font-size:1.1rem;color:#e91e63;text-align:right;margin-top:4px}
      .grand-total{font-size:1.3rem;font-weight:700;color:#e91e63;border-top:3px solid #e91e63;padding-top:10px;margin-top:20px;text-align:right}
      @media print{body{padding:10px}button{display:none!important}}
    </style>
  </head><body>
    <h1>Shopping List</h1>
    <div class="date">${fmtDate(todayISO())} · ${items.length} items</div>`;

  let grandTotal = 0;
  Object.entries(byStore).sort((a, b) => b[1].length - a[1].length).forEach(([store, storeItems]) => {
    const storeTotal = storeItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
    grandTotal += storeTotal;
    html += `<div class="store">
      <div class="store-name">${esc(store)}</div>`;
    storeItems.forEach(it => {
      const room = getRoomById(it.roomId);
      html += `<div class="item">
        <div class="checkbox"></div>
        <div class="item-name">${esc(it.name)}${it.quantity > 1 ? ' ×' + it.quantity : ''} <span style="color:#94a3b8">· ${room.emoji} ${esc(room.label)}</span></div>
        ${dimStr(it) ? `<div class="item-dims">${esc(dimStr(it))}</div>` : ''}
        <div class="item-price">${it.price ? fmtEur(it.price * (it.quantity || 1), 0) : '–'}</div>
      </div>`;
    });
    html += `<div class="total">${fmtEur(storeTotal, 0)}</div></div>`;
  });

  html += `<div class="grand-total">Total: ${fmtEur(grandTotal, 0)}</div>
    <button onclick="window.print()" style="margin-top:20px;padding:10px 20px;background:#e91e63;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem">Print</button>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Move-In stats for dashboard ──────────────────────────────
function getMoveinStats() {
  const data = ldMovein();
  const checkTotal = data.checklist.reduce((s, c) => s + c.items.length, 0);
  const checkDone = data.checklist.reduce((s, c) => s + c.items.filter(i => i.done).length, 0);
  const addrTotal = data.addresses.reduce((s, c) => s + c.items.length, 0);
  const addrDone = data.addresses.reduce((s, c) => s + c.items.filter(i => i.done).length, 0);
  const utilActive = data.utilities.filter(u => u.status === 'active').length;
  const utilTotal = data.utilities.length;
  const utilMonthly = data.utilities.filter(u => u.status === 'active' || u.status === 'ordered').reduce((s, u) => s + (u.monthlyCost || 0), 0);
  return { checkTotal, checkDone, addrTotal, addrDone, utilActive, utilTotal, utilMonthly };
}
