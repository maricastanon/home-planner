// ============================================================
// moving.js — Unser neues Zuhause · Moving companies & tasks
// ============================================================

// ---- RENDER MAIN ----
function rMove() {
  rMoveStats();
  rMoveCompanies();
  rMoveDayChecklist();
}

function rMoveStats() {
  const companies = ldMove();
  const el = document.getElementById('move-stats');
  if (!el) return;
  const byStatus = {};
  companies.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  const priced = companies.filter(c => c.price > 0).sort((a,b) => a.price - b.price);
  const booked = companies.find(c => c.status === 'gebucht');
  let h = '<div class="mini-stats">';
  h += `<div class="mini-stat"><div class="ms-num">${companies.length}</div><div class="ms-lbl">Firmen gespeichert</div></div>`;
  h += `<div class="mini-stat"><div class="ms-num">${byStatus.angebot || 0}</div><div class="ms-lbl">Angebote erhalten</div></div>`;
  h += `<div class="mini-stat" style="${booked ? 'background:var(--gnl)' : ''}">
    <div class="ms-num" style="${booked ? 'color:var(--gn)' : ''}">${booked ? '✅' : '–'}</div>
    <div class="ms-lbl">${booked ? esc(trunc(booked.name,18)) + ' gebucht!' : 'Noch keine gebucht'}</div>
  </div>`;
  if (priced.length >= 2) {
    const diff = priced[priced.length-1].price - priced[0].price;
    h += `<div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${fmtEur(diff,0)}</div><div class="ms-lbl">Preisunterschied</div></div>`;
  }
  h += '</div>';
  // Price comparison mini chart
  if (priced.length) {
    h += `<div style="margin-top:8px"><div style="font-size:.72rem;font-weight:700;color:var(--pk);margin-bottom:4px">💶 Preisvergleich</div>`;
    const max = priced[priced.length-1].price;
    priced.forEach((c, i) => {
      const pct = Math.round(c.price / max * 100);
      h += `<div style="margin:3px 0;cursor:pointer" onclick="scrollToCompany('${c.id}')">
        <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:1px">
          <span>${i===0?'🏆 ':numCircle(i+1)}${esc(trunc(c.name,22))}</span>
          <strong style="color:${i===0?'var(--gn)':'var(--bd)'}">${fmtEur(c.price,0)}</strong>
        </div>
        ${progressBar(pct, i===0?'var(--gn)':'var(--pk)', '6px')}
      </div>`;
    });
    h += '</div>';
  }
  el.innerHTML = h;
}

function rMoveCompanies() {
  const companies = ldMove();
  const q   = getSearch('move');
  const sf  = document.getElementById('move-status-filter')?.value || '';
  let items = companies.filter(c => {
    if (q && !(c.name+' '+(c.notes||'')).toLowerCase().includes(q)) return false;
    if (sf && c.status !== sf) return false;
    return true;
  });
  const el = document.getElementById('move-list');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty"><div class="ei">🚚</div>Noch keine Firmen</div>'; return;
  }
  el.innerHTML = items.map(c => renderCompanyCard(c)).join('');
}

function renderCompanyCard(c) {
  const sm = COMPANY_STATUS.find(s => s.k === c.status) || { l: c.status, c: 'gray', e: '' };
  const log  = (c.contactLog || []).slice(-3).reverse();
  const docs = c.docs || [];
  const pendDocs = docs.filter(d => !d.done).length;
  return `<div class="card ${c.status==='gebucht'?'booked':''}" id="comp-${c.id}">
    <div class="card-h" onclick="togCard('comp-${c.id}')">
      <div style="flex:1">
        <div class="card-title">🚚 ${esc(c.name)}
          ${pendDocs ? `<span class="pill orange" style="font-size:.5rem">📄 ${pendDocs} offen</span>` : ''}
        </div>
        <div class="card-sub">${c.moveDate ? '📅 ' + fmtDate(c.moveDate) : ''} ${c.price ? '· 💶 ' + fmtEur(c.price,0) : ''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
        <span class="pill ${sm.c}">${sm.e} ${esc(sm.l)}</span>
        ${c.rating ? `<span style="font-size:.75rem">${stars(c.rating,5,'⭐','')}</span>` : ''}
      </div>
      <span class="chev">▼</span>
    </div>
    <div class="card-body">
      <!-- Contact Info -->
      <div class="sec-hdr" onclick="togSection('cd-contact-${c.id}','cd-carr-${c.id}')">
        📞 Kontakt <span id="cd-carr-${c.id}">▼</span>
      </div>
      <div id="cd-contact-${c.id}" class="sec-body">
        <div class="info-grid">
          ${c.phone  ? `<div class="info-item"><span class="info-lbl">Telefon</span><span class="info-val"><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></span></div>` : ''}
          ${c.email  ? `<div class="info-item"><span class="info-lbl">E-Mail</span><span class="info-val"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span></div>` : ''}
          ${c.web    ? `<div class="info-item"><span class="info-lbl">Website</span><span class="info-val"><a href="${esc(c.web)}" target="_blank">🔗 öffnen</a></span></div>` : ''}
          ${c.contact? `<div class="info-item"><span class="info-lbl">Ansprechpartner</span><span class="info-val">${esc(c.contact)}</span></div>` : ''}
          ${c.price  ? `<div class="info-item"><span class="info-lbl">Angebotspreis</span><span class="info-val" style="color:var(--pk);font-weight:700">${fmtEur(c.price)}</span></div>` : ''}
          ${c.validUntil ? `<div class="info-item"><span class="info-lbl">Gültig bis</span><span class="info-val">${fmtDate(c.validUntil)}</span></div>` : ''}
          ${c.moveDate   ? `<div class="info-item"><span class="info-lbl">Umzugsdatum</span><span class="info-val">${fmtDate(c.moveDate)}</span></div>` : ''}
        </div>
      </div>

      <!-- Rating & Review -->
      <div class="sec-hdr" onclick="togSection('cd-rating-${c.id}','cd-rarr-${c.id}')">
        ⭐ Bewertung & Notizen <span id="cd-rarr-${c.id}">▼</span>
      </div>
      <div id="cd-rating-${c.id}" class="sec-body">
        <div style="margin-bottom:6px">
          <div style="font-size:.62rem;color:#888;margin-bottom:3px">Sterne:</div>
          <div class="star-row">
            ${[1,2,3,4,5].map(i =>
              `<span class="star-clickable ${i<=(c.rating||0)?'lit':''}" onclick="rateCompany('${c.id}',${i})">⭐</span>`
            ).join('')}
          </div>
        </div>
        ${c.review ? `<div style="font-size:.75rem;color:#555;padding:6px;background:#fafafa;border-radius:5px;margin-bottom:6px">${esc(c.review)}</div>` : ''}
        <button class="btn sml" onclick="editCompanyReview('${c.id}')">✏️ Notiz bearbeiten</button>
      </div>

      <!-- Pros/Cons -->
      <div class="sec-hdr" onclick="togSection('cd-pc-${c.id}','cd-pcarr-${c.id}')">
        ✅ Pros / ❌ Cons <span id="cd-pcarr-${c.id}">▼</span>
      </div>
      <div id="cd-pc-${c.id}" class="sec-body">
        <div class="pc-list">${renderChips(c.pros,'pro',`v => removeCompanyPro('${c.id}',v)`)}</div>
        <div style="display:flex;gap:4px;margin:3px 0 6px">
          <input id="pro-inp-${c.id}" placeholder="+ Pro hinzufügen" class="chip-inp">
          <button class="btn sml suc" onclick="addCompanyPro('${c.id}')">+</button>
        </div>
        <div class="pc-list">${renderChips(c.cons,'con',`v => removeCompanyCon('${c.id}',v)`)}</div>
        <div style="display:flex;gap:4px;margin:3px 0">
          <input id="con-inp-${c.id}" placeholder="+ Con hinzufügen" class="chip-inp">
          <button class="btn sml dan" onclick="addCompanyCon('${c.id}')">+</button>
        </div>
      </div>

      <!-- Contact Log -->
      <div class="sec-hdr" onclick="togSection('cd-log-${c.id}','cd-logarr-${c.id}')">
        📋 Kontaktprotokoll (${(c.contactLog||[]).length}) <span id="cd-logarr-${c.id}">▶</span>
      </div>
      <div id="cd-log-${c.id}" class="sec-body" style="display:none">
        ${(c.contactLog||[]).slice().reverse().map(entry =>
          `<div class="log-entry">
            <span class="log-icon">${entry.type==='call'?'📞':entry.type==='email'?'✉️':'📝'}</span>
            <div class="log-body">
              <span class="log-date">${fmtDate(entry.date)}</span>
              <span class="log-text">${esc(entry.text)}</span>
            </div>
            <button class="btn sml ico" onclick="deleteLogEntry('${c.id}','${entry.id}')">✕</button>
          </div>`
        ).join('') || '<div style="color:#ccc;font-size:.72rem">Noch keine Einträge</div>'}
        <div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">
          <select id="log-type-${c.id}" style="font-size:.7rem;padding:2px 4px;border:1px solid #ddd;border-radius:4px">
            <option value="call">📞 Anruf</option>
            <option value="email">✉️ Email</option>
            <option value="note">📝 Notiz</option>
          </select>
          <input id="log-inp-${c.id}" placeholder="Inhalt..." class="chip-inp" style="flex:1">
          <input type="date" id="log-date-${c.id}" value="${todayISO()}" style="font-size:.7rem;padding:2px 4px;border:1px solid #ddd;border-radius:4px">
          <button class="btn sml pri" onclick="addLogEntry('${c.id}')">+ Eintrag</button>
        </div>
      </div>

      <!-- Documents -->
      <div class="sec-hdr" onclick="togSection('cd-docs-${c.id}','cd-docarr-${c.id}')">
        📄 Dokumente (${docs.length}) <span id="cd-docarr-${c.id}">▶</span>
      </div>
      <div id="cd-docs-${c.id}" class="sec-body" style="display:none">
        ${docs.map(d =>
          `<div class="doc-item ${d.done?'sent':''}">
            <input type="checkbox" ${d.done?'checked':''} onchange="toggleCompanyDoc('${c.id}','${d.id}',this.checked)" style="accent-color:var(--gn)">
            <span style="flex:1;font-size:.75rem">${esc(d.name)}</span>
            <button class="btn sml ico" onclick="deleteCompanyDoc('${c.id}','${d.id}')">✕</button>
          </div>`
        ).join('') || '<div style="color:#ccc;font-size:.72rem">Keine Dokumente</div>'}
        <div style="display:flex;gap:4px;margin-top:6px">
          <input id="doc-inp-${c.id}" placeholder="Dokument hinzufügen..." class="chip-inp" style="flex:1">
          <button class="btn sml pri" onclick="addCompanyDoc('${c.id}')">+ Dokument</button>
        </div>
      </div>

      <!-- Actions -->
      <div class="card-actions">
        <select class="btn sml" onchange="changeCompanyStatus('${c.id}',this.value)">
          ${COMPANY_STATUS.map(s => `<option value="${s.k}" ${c.status===s.k?'selected':''}>${s.e} ${s.l}</option>`).join('')}
        </select>
        <button class="btn sml" onclick="editCompany('${c.id}')">✏️ Bearbeiten</button>
        <button class="btn sml dan" onclick="deleteCompanyConfirm('${c.id}')">🗑️ Löschen</button>
      </div>
    </div>
  </div>`;
}

function scrollToCompany(id) {
  const el = document.getElementById('comp-' + id);
  if (el) { el.classList.add('xp'); el.scrollIntoView({ behavior:'smooth', block:'center' }); }
}

// ---- CRUD ----
function addMoveCompany() {
  const name = fVal('c-name');
  if (!name) { toast('Bitte Firmennamen eingeben', 'red'); return; }
  const c = {
    id: uid(), name,
    phone:      fVal('c-phone'),
    email:      fVal('c-email'),
    web:        fVal('c-web'),
    contact:    fVal('c-contact'),
    price:      fNum('c-price'),
    validUntil: fVal('c-valid'),
    moveDate:   fVal('c-movedate'),
    status:     fVal('c-status') || 'anfragen',
    notes:      fVal('c-notes'),
    review:     '',
    rating:     0,
    pros:       [], cons:       [],
    contactLog: [], docs:       [],
    created:    Date.now()
  };
  addMove(c);
  closeModal('move-add-modal');
  fClear('c-name','c-phone','c-email','c-web','c-contact','c-price','c-valid','c-movedate','c-notes');
  rMove();
  toast(name + ' hinzugefügt! 🚚', 'green');
}

function editCompany(id) {
  const c = getMove(id);
  if (!c) return;
  fSet('ce-name', c.name); fSet('ce-phone', c.phone); fSet('ce-email', c.email);
  fSet('ce-web', c.web); fSet('ce-contact', c.contact); fSet('ce-price', c.price||'');
  fSet('ce-valid', c.validUntil); fSet('ce-movedate', c.moveDate); fSet('ce-notes', c.notes);
  fSet('ce-status', c.status);
  document.getElementById('ce-id').value = id;
  openModal('move-edit-modal');
}

function saveCompanyEdit() {
  const id = document.getElementById('ce-id').value;
  const c = getMove(id);
  if (!c) return;
  c.name = fVal('ce-name') || c.name;
  c.phone = fVal('ce-phone'); c.email = fVal('ce-email');
  c.web = fVal('ce-web'); c.contact = fVal('ce-contact');
  c.price = fNum('ce-price'); c.validUntil = fVal('ce-valid');
  c.moveDate = fVal('ce-movedate'); c.notes = fVal('ce-notes');
  c.status = fVal('ce-status');
  updMove(c);
  closeModal('move-edit-modal');
  rMove(); toast('Firma aktualisiert ✅', 'green');
}

function deleteCompanyConfirm(id) {
  const c = getMove(id);
  confirmDialog(`"${c?.name}" löschen?`, () => { delMove(id); rMove(); toast('Firma gelöscht', 'warn'); });
}

function rateCompany(id, r) {
  const c = getMove(id); if (!c) return;
  c.rating = r; updMove(c); rMove();
}

function editCompanyReview(id) {
  const c = getMove(id); if (!c) return;
  inlineEdit('Notiz / Bewertungstext', c.review, v => { c.review = v; updMove(c); rMove(); });
}

function changeCompanyStatus(id, st) {
  const c = getMove(id); if (!c) return;
  if (st === 'gebucht') {
    const others = ldMove().filter(x => x.id !== id && x.status === 'gebucht');
    others.forEach(x => { x.status = 'angebot'; updMove(x); });
    celebrate('🎉'); toast(c.name + ' gebucht! 🎉', 'green');
  }
  c.status = st; updMove(c); rMove(); updateStatusBar();
}

function addCompanyPro(id) {
  const val = document.getElementById('pro-inp-'+id)?.value.trim();
  if (!val) return;
  const c = getMove(id); if (!c) return;
  c.pros = [...(c.pros||[]), val];
  document.getElementById('pro-inp-'+id).value = '';
  updMove(c); rMove();
}
function removeCompanyPro(id, val) {
  const c = getMove(id); if (!c) return;
  c.pros = (c.pros||[]).filter(v => v !== val); updMove(c); rMove();
}
function addCompanyCon(id) {
  const val = document.getElementById('con-inp-'+id)?.value.trim();
  if (!val) return;
  const c = getMove(id); if (!c) return;
  c.cons = [...(c.cons||[]), val];
  document.getElementById('con-inp-'+id).value = '';
  updMove(c); rMove();
}
function removeCompanyCon(id, val) {
  const c = getMove(id); if (!c) return;
  c.cons = (c.cons||[]).filter(v => v !== val); updMove(c); rMove();
}

function addLogEntry(id) {
  const c = getMove(id); if (!c) return;
  const text = document.getElementById('log-inp-'+id)?.value.trim();
  if (!text) return;
  const type = document.getElementById('log-type-'+id)?.value || 'note';
  const date = document.getElementById('log-date-'+id)?.value || todayISO();
  c.contactLog = [...(c.contactLog||[]), { id: uid(), type, text, date, ts: Date.now() }];
  document.getElementById('log-inp-'+id).value = '';
  updMove(c); rMove();
}

function deleteLogEntry(cid, eid) {
  const c = getMove(cid); if (!c) return;
  c.contactLog = (c.contactLog||[]).filter(e => e.id !== eid); updMove(c); rMove();
}

function addCompanyDoc(id) {
  const val = document.getElementById('doc-inp-'+id)?.value.trim();
  if (!val) return;
  const c = getMove(id); if (!c) return;
  c.docs = [...(c.docs||[]), { id: uid(), name: val, done: false }];
  document.getElementById('doc-inp-'+id).value = '';
  updMove(c); rMove();
}

function toggleCompanyDoc(cid, did, checked) {
  const c = getMove(cid); if (!c) return;
  const d = (c.docs||[]).find(x => x.id === did);
  if (d) { d.done = checked; updMove(c); rMove(); }
}

function deleteCompanyDoc(cid, did) {
  const c = getMove(cid); if (!c) return;
  c.docs = (c.docs||[]).filter(x => x.id !== did); updMove(c); rMove();
}

// ---- MOVE DAY CHECKLIST ----
const DEFAULT_MOVE_CHECKLIST = [
  { id:'mc1',  cat:'Vor dem Umzug', text:'Umzugskartons besorgt',           done:false },
  { id:'mc2',  cat:'Vor dem Umzug', text:'Halteverbotszone beantragt',       done:false },
  { id:'mc3',  cat:'Vor dem Umzug', text:'Nachsendeauftrag gestellt',         done:false },
  { id:'mc4',  cat:'Vor dem Umzug', text:'Strom / Gas angemeldet',            done:false },
  { id:'mc5',  cat:'Vor dem Umzug', text:'Internet / Telefon umgemeldet',     done:false },
  { id:'mc6',  cat:'Vor dem Umzug', text:'GEZ-Adresse aktualisiert',          done:false },
  { id:'mc7',  cat:'Vor dem Umzug', text:'Banken informiert',                 done:false },
  { id:'mc8',  cat:'Vor dem Umzug', text:'Krankenkasse informiert',           done:false },
  { id:'mc9',  cat:'Vor dem Umzug', text:'Einwohnermeldeamt – Ummeldung',     done:false },
  { id:'mc10', cat:'Am Umzugstag',  text:'Zählerstände abgelesen (alt)',      done:false },
  { id:'mc11', cat:'Am Umzugstag',  text:'Zählerstände abgelesen (neu)',      done:false },
  { id:'mc12', cat:'Am Umzugstag',  text:'Wohnungsübergabe Protokoll (alt)',  done:false },
  { id:'mc13', cat:'Am Umzugstag',  text:'Wohnungsübergabe Protokoll (neu)',  done:false },
  { id:'mc14', cat:'Am Umzugstag',  text:'Schlüssel übergeben (alte Wohnung)',done:false },
  { id:'mc15', cat:'Nach dem Umzug','text':'Alle Kartons ausgepackt',         done:false },
  { id:'mc16', cat:'Nach dem Umzug','text':'Möbel aufgebaut',                 done:false },
];

function ldMoveChecklist() {
  const saved = ld('hnz_movecl', null);
  return saved || DEFAULT_MOVE_CHECKLIST;
}
function svMoveChecklist(d) { sv('hnz_movecl', d); }

function rMoveDayChecklist() {
  const list = ldMoveChecklist();
  const el = document.getElementById('move-checklist');
  if (!el) return;
  const groups = groupBy(list, 'cat');
  const total  = list.length, done = list.filter(x => x.done).length;
  let h = `<div style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:700;margin-bottom:3px">
      <span>Erledigte Aufgaben: ${done} / ${total}</span>
      <span style="color:var(--pk)">${Math.round(done/total*100)}%</span>
    </div>
    ${progressBar(Math.round(done/total*100))}
  </div>`;
  h += Object.entries(groups).map(([cat, items]) =>
    `<div style="margin-bottom:10px">
      <div style="font-size:.72rem;font-weight:700;color:var(--pk);padding:4px 0;border-bottom:1px solid #f0f0f0;margin-bottom:4px">${esc(cat)}</div>
      ${items.map(it =>
        `<div class="check-item ${it.done?'done':''}">
          <input type="checkbox" ${it.done?'checked':''} onchange="toggleMoveTask('${it.id}',this.checked)">
          <label class="check-label" onclick="toggleMoveTask('${it.id}',${!it.done})">${esc(it.text)}</label>
          <button class="btn sml ico" onclick="deleteMoveTask('${it.id}')">✕</button>
        </div>`
      ).join('')}
    </div>`
  ).join('');
  // Add custom task
  h += `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
    <select id="mc-cat" style="font-size:.72rem;padding:4px;border:1px solid #ddd;border-radius:4px">
      <option>Vor dem Umzug</option><option>Am Umzugstag</option><option>Nach dem Umzug</option>
    </select>
    <input id="mc-text" placeholder="Neue Aufgabe..." style="flex:1;font-size:.78rem;padding:4px 8px;border:1px solid #ddd;border-radius:4px;min-width:140px">
    <button class="btn pri sml" onclick="addMoveTask()">+ Aufgabe</button>
  </div>`;
  el.innerHTML = h;
}

function toggleMoveTask(id, done) {
  const list = ldMoveChecklist();
  const it   = list.find(x => x.id === id);
  if (it) { it.done = done; svMoveChecklist(list); rMoveDayChecklist(); }
}

function deleteMoveTask(id) {
  svMoveChecklist(ldMoveChecklist().filter(x => x.id !== id));
  rMoveDayChecklist();
}

function addMoveTask() {
  const text = fVal('mc-text');
  if (!text) return;
  const cat  = document.getElementById('mc-cat')?.value || 'Vor dem Umzug';
  const list = ldMoveChecklist();
  list.push({ id: uid(), cat, text, done: false });
  svMoveChecklist(list);
  fClear('mc-text');
  rMoveDayChecklist();
}
