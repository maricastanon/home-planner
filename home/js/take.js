// ============================================================
// take.js — Unser neues Zuhause · Packing list & boxes
// ============================================================

function rTake() {
  rTakeStats();
  rTakeList();
  rBoxList();
}

// ---- STATS ----
function rTakeStats() {
  const items = ldTake();
  const boxes = ldBoxes();
  const el = document.getElementById('take-stats');
  if (!el) return;
  const total = items.length, packed = items.filter(i => i.done).length;
  const fragile = items.filter(i => i.fragile).length;
  const heavy   = items.filter(i => i.weight === 'schwer').length;
  const byOwner = groupBy(items, 'owner');

  let h = '<div class="mini-stats">';
  h += `<div class="mini-stat"><div class="ms-num">${packed}<span style="font-size:.6rem;color:#888">/${total}</span></div><div class="ms-lbl">Eingepackt</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num">${Math.round(packed/Math.max(total,1)*100)}%</div><div class="ms-lbl">Fortschritt</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num" style="color:var(--or)">${fragile}</div><div class="ms-lbl">🔴 Fragil</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num">${boxes.length}</div><div class="ms-lbl">📦 Kartons</div></div>`;
  h += '</div>';

  // Per-owner progress
  OWNERS.forEach(o => {
    const ownerItems = byOwner[o.k] || [];
    if (!ownerItems.length) return;
    const p = ownerItems.filter(i => i.done).length;
    const pct = Math.round(p / ownerItems.length * 100);
    h += `<div style="margin:4px 0">
      <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:2px">
        <span>${o.e} ${o.l} · ${p}/${ownerItems.length}</span>
        <span style="color:var(--pk)">${pct}%</span>
      </div>
      ${progressBar(pct, 'var(--pk)', '5px')}
    </div>`;
  });

  // Per-room progress
  const byRoom = groupBy(items, 'room');
  if (Object.keys(byRoom).length > 1) {
    h += '<div style="margin-top:8px;font-size:.7rem;font-weight:700;color:var(--pk)">Nach Raum:</div>';
    Object.entries(byRoom).forEach(([room, ritems]) => {
      const p2 = ritems.filter(i => i.done).length;
      const pct2 = Math.round(p2 / ritems.length * 100);
      h += `<div style="margin:3px 0">
        <div style="display:flex;justify-content:space-between;font-size:.65rem;margin-bottom:1px">
          <span>${esc(room)} (${ritems.length})</span><span>${pct2}%</span>
        </div>
        ${progressBar(pct2, pct2===100?'var(--gn)':'var(--pk)', '5px')}
      </div>`;
    });
  }
  el.innerHTML = h;
}

// ---- TAKE LIST ----
function rTakeList() {
  const items = ldTake();
  const boxes = ldBoxes();
  const q    = getSearch('take');
  const cf   = document.getElementById('take-room-filter')?.value   || '';
  const of   = document.getElementById('take-owner-filter')?.value  || '';
  const pf   = document.getElementById('take-prio-filter')?.value   || '';
  const sf   = document.getElementById('take-status-filter')?.value || '';
  const srt  = document.getElementById('take-sort')?.value || 'cat';

  let list = items.filter(it => {
    if (q  && !(it.name+' '+(it.note||'')).toLowerCase().includes(q)) return false;
    if (cf && it.room !== cf)   return false;
    if (of && it.owner !== of)  return false;
    if (pf && it.prio !== pf)   return false;
    if (sf === 'packed'   && !it.done)  return false;
    if (sf === 'unpacked' && it.done)   return false;
    return true;
  });

  // Sort
  if (srt === 'name')  list = sortBy(list,'name');
  if (srt === 'prio')  list = list.sort((a,b) => {'hoch':0,'mittel':1,'niedrig':2}[a.prio] - {'hoch':0,'mittel':1,'niedrig':2}[b.prio]);
  if (srt === 'owner') list = sortBy(list,'owner');
  if (srt === 'cat')   list = sortBy(list,'room');
  if (srt === 'done')  list = list.sort((a,b) => (a.done?1:0) - (b.done?1:0));

  const el = document.getElementById('take-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty"><div class="ei">📦</div>Keine Gegenstände gefunden</div>'; return; }

  // Group by room
  const groups = groupBy(list, 'room');
  const prioColor = { hoch:'#ffcdd2', mittel:'#fff9c4', niedrig:'#e8f5e9' };
  const ownerIcon = { Mari:'🌸', Alexander:'💼', Beide:'💕' };
  const weightIcon = { leicht:'🪶', mittel:'💪', schwer:'🏋️' };

  el.innerHTML = Object.entries(groups).map(([room, ritems]) => {
    const total  = ritems.length, packed = ritems.filter(i => i.done).length;
    const allPacked = packed === total;
    return `<div class="card ${allPacked?'booked':''}" style="margin-bottom:8px;overflow:visible">
      <div class="card-h room-group-h" onclick="togCard('tg-${slugify(room)}')">
        <div style="flex:1">
          <div class="card-title">${esc(room)}</div>
          <div class="card-sub">${packed}/${total} eingepackt</div>
        </div>
        ${progressBar(Math.round(packed/total*100), allPacked?'var(--gn)':'var(--pk)', '5px')}
        <div style="display:flex;gap:4px;margin-top:4px;align-items:center">
          ${allPacked ? '<span class="pill green">✓ Fertig!</span>' : ''}
          <button class="btn sml suc" onclick="event.stopPropagation();markRoomPacked('${esc(room)}')" title="Alle einpacken">📦 Alle</button>
          <span class="chev">▼</span>
        </div>
      </div>
      <div id="tg-${slugify(room)}" class="card-body" style="display:block;padding:4px 12px">
        ${ritems.map(it => {
          const box = it.boxId ? boxes.find(b => b.id === it.boxId) : null;
          return `<div class="check-item ${it.done?'done':''}" style="border-left:3px solid ${prioColor[it.prio]||'#eee'};padding-left:6px">
            <input type="checkbox" ${it.done?'checked':''} onchange="toggleTakeItem('${it.id}',this.checked)" style="accent-color:var(--pk)">
            <div class="check-label-wrap" style="flex:1">
              <span class="check-label" onclick="toggleTakeItem('${it.id}',${!it.done})">${esc(it.name)}</span>
              <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:1px">
                ${it.fragile   ? '<span class="pill pink" style="font-size:.5rem">⚠️ Fragil</span>' : ''}
                ${it.weight && it.weight !== 'leicht' ? `<span class="pill gray" style="font-size:.5rem">${weightIcon[it.weight]} ${it.weight}</span>` : ''}
                ${it.owner     ? `<span style="font-size:.65rem">${ownerIcon[it.owner]||''}</span>` : ''}
                ${box          ? `<span class="pill blue" style="font-size:.5rem">📦 ${esc(box.name)}</span>` : ''}
                ${it.note      ? `<span style="font-size:.6rem;color:#bbb">${esc(trunc(it.note,30))}</span>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:3px">
              <button class="btn sml ico" onclick="editTakeItem('${it.id}')" title="Bearbeiten">✏️</button>
              <button class="btn sml ico" onclick="assignBox('${it.id}')" title="Karton zuweisen">📦</button>
              <button class="btn sml ico" onclick="deleteTakeConfirm('${it.id}')" title="Löschen">✕</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ---- ITEM CRUD ----
function addTakeItem() {
  const name = fVal('t-name');
  if (!name) { toast('Bitte Name eingeben', 'red'); return; }
  const it = {
    id:      uid(), name,
    room:    fVal('t-room')   || 'Sonstiges',
    owner:   fVal('t-owner')  || 'Beide',
    prio:    fVal('t-prio')   || 'mittel',
    weight:  fVal('t-weight') || 'leicht',
    fragile: fCheck('t-fragile'),
    note:    fVal('t-note'),
    boxId:   '',
    done:    false,
    created: Date.now()
  };
  addTake(it);
  closeModal('take-add-modal');
  fClear('t-name','t-note');
  rTake();
  toast(name + ' hinzugefügt 📦', 'green');
}

function toggleTakeItem(id, done) {
  const it = getTake(id); if (!it) return;
  it.done = done; updTake(it); rTake();
  if (done) toast(it.name + ' eingepackt ✓', 'green', 1500);
  updateStatusBar();
}

function editTakeItem(id) {
  const it = getTake(id); if (!it) return;
  fSet('te-id', id); fSet('te-name', it.name); fSet('te-room', it.room);
  fSet('te-owner', it.owner); fSet('te-prio', it.prio); fSet('te-weight', it.weight);
  document.getElementById('te-fragile').checked = it.fragile || false;
  fSet('te-note', it.note);
  openModal('take-edit-modal');
}

function saveTakeEdit() {
  const id = fVal('te-id');
  const it = getTake(id); if (!it) return;
  it.name   = fVal('te-name') || it.name;
  it.room   = fVal('te-room');
  it.owner  = fVal('te-owner');
  it.prio   = fVal('te-prio');
  it.weight = fVal('te-weight');
  it.fragile= fCheck('te-fragile');
  it.note   = fVal('te-note');
  updTake(it);
  closeModal('take-edit-modal');
  rTake(); toast('Gespeichert ✅', 'green');
}

function deleteTakeConfirm(id) {
  const it = getTake(id);
  confirmDialog(`"${it?.name}" löschen?`, () => { delTake(id); rTake(); toast('Gelöscht', 'warn'); });
}

function markRoomPacked(room) {
  const items = ldTake().filter(it => it.room === room);
  items.forEach(it => { it.done = true; updTake(it); });
  rTake(); toast(room + ' – alles eingepackt! ✅', 'green');
}

// ---- BOX ASSIGNMENT ----
function assignBox(itemId) {
  const boxes = ldBoxes();
  const it = getTake(itemId); if (!it) return;
  if (!boxes.length) { toast('Zuerst einen Karton erstellen!', 'warn'); return; }
  inlineEdit(
    'Karton auswählen (Name oder ID)',
    it.boxId || '',
    v => {
      const box = boxes.find(b => b.id === v || b.name.toLowerCase().includes(v.toLowerCase()));
      if (box) { it.boxId = box.id; updTake(it); rTake(); toast(it.name + ' → ' + box.name, 'green',1500); }
      else { toast('Karton nicht gefunden', 'red'); }
    },
    'Kartons: ' + boxes.map(b => b.name).join(', ')
  );
}

// ---- BOX MANAGEMENT ----
function rBoxList() {
  const boxes = ldBoxes();
  const items = ldTake();
  const el = document.getElementById('box-list');
  if (!el) return;
  if (!boxes.length) { el.innerHTML = '<div style="color:#ccc;font-size:.72rem;text-align:center;padding:10px">Noch keine Kartons</div>'; return; }
  el.innerHTML = boxes.map(b => {
    const boxItems = items.filter(i => i.boxId === b.id);
    const packed   = boxItems.filter(i => i.done).length;
    return `<div class="box-card ${packed === boxItems.length && boxItems.length > 0 ? 'done':''}">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:1.2rem">📦</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.82rem">${esc(b.name)}</div>
          <div style="font-size:.62rem;color:#888">${esc(b.room||'')} · ${boxItems.length} Gegenstände · ${b.weight||''}</div>
          ${boxItems.length ? progressBar(Math.round(packed/boxItems.length*100), 'var(--gn)', '4px') : ''}
        </div>
        <button class="btn sml" onclick="printBoxLabel('${b.id}')">🏷️</button>
        <button class="btn sml dan" onclick="deleteBox('${b.id}')">✕</button>
      </div>
      ${boxItems.length ? `<div style="margin-top:5px;font-size:.65rem;color:#888">${boxItems.map(i=>`${i.done?'✓':'○'} ${esc(i.name)}`).join(' · ')}</div>` : ''}
    </div>`;
  }).join('');
}

function addBox() {
  const name = fVal('box-name');
  if (!name) { toast('Bitte Karton-Name eingeben', 'red'); return; }
  const b = { id: uid(), name, room: fVal('box-room'), weight: fVal('box-weight'), created: Date.now() };
  addBox(b);
  fClear('box-name');
  rTake(); toast('Karton "' + name + '" erstellt 📦', 'green');
}

function deleteBox(id) {
  // unassign items
  const items = ldTake().filter(i => i.boxId === id);
  items.forEach(i => { i.boxId = ''; updTake(i); });
  delBox(id); rTake();
}

function printBoxLabel(id) {
  const b = ldBoxes().find(x => x.id === id); if (!b) return;
  const items = ldTake().filter(i => i.boxId === id);
  const content = `KARTON: ${b.name}\nRaum: ${b.room || '–'}\nGewicht: ${b.weight || '–'}\n\nInhalt:\n${items.map(i => '  - ' + i.name + (i.fragile?' [FRAGIL]':'')).join('\n')}`;
  copyText(content, 'Kartonetikett');
}

// ---- HELPERS ----
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]/g,'_'); }
