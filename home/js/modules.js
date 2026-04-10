// ============================================================
// moving.js — Moving companies + move-day checklist
// ============================================================

function rMove() { rMoveFilters(); rMoveStats(); rMoveList(); rMoveChecklist(); }

function rMoveStats() {
  const companies=ldMove(), el=document.getElementById('move-stats'); if(!el) return;
  const booked=companies.find(c=>c.status==='booked');
  const priced=companies.filter(c=>c.price>0).sort((a,b)=>a.price-b.price);
  let h='<div class="mini-stats">';
  h+=`<div class="mini-stat"><div class="ms-num">${companies.length}</div><div class="ms-lbl">Companies</div></div>`;
  h+=`<div class="mini-stat"><div class="ms-num">${companies.filter(c=>c.status==='quote').length}</div><div class="ms-lbl">Quotes received</div></div>`;
  h+=`<div class="mini-stat" style="${booked?'background:var(--gnl)':''}"><div class="ms-num" style="${booked?'color:var(--gn)':''}">${booked?'✅':'–'}</div><div class="ms-lbl">${booked?esc(trunc(booked.name,16)):' Not booked yet'}</div></div>`;
  if(priced.length>=2) h+=`<div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${fmtEur(priced[priced.length-1].price-priced[0].price,0)}</div><div class="ms-lbl">Price spread</div></div>`;
  h+='</div>';
  if(priced.length) {
    h+=`<div style="margin-top:8px"><div style="font-size:.7rem;font-weight:700;color:var(--pk);margin-bottom:5px">💶 Price comparison</div>`;
    const max=priced[priced.length-1].price;
    priced.forEach((c,i)=>{
      const pct=Math.round(c.price/max*100);
      h+=`<div style="margin:4px 0;cursor:pointer" onclick="document.getElementById('comp-${c.id}')?.scrollIntoView({behavior:'smooth',block:'center'})">
        <div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:2px">
          <span>${i===0?'🏆 ':numCircle(i+1)}${esc(trunc(c.name,22))}</span>
          <strong style="color:${i===0?'var(--gn)':'var(--pk)'}">${fmtEur(c.price,0)}</strong>
        </div>
        ${progressBar(pct,i===0?'var(--gn)':'var(--pk)','5px')}
      </div>`;
    });
    h+='</div>';
  }
  el.innerHTML=h;
}

function rMoveList() {
  const companies=ldMove();
  const q=(document.getElementById('move-search')?.value||'').toLowerCase();
  const sf=getPillVal('move','status');
  let list=companies.filter(c=>{
    if(q&&!(c.name+' '+(c.notes||'')).toLowerCase().includes(q)) return false;
    if(sf&&c.status!==sf) return false;
    return true;
  });
  const el=document.getElementById('move-list'); if(!el) return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">🚚</div>No companies yet</div>';return;}
  el.innerHTML=list.map(c=>{
    const sm=COMPANY_STATUS.find(s=>s.k===c.status)||{l:c.status,c:'gray',e:''};
    const pendDocs=(c.docs||[]).filter(d=>!d.done).length;
    return `<div class="card ${c.status==='booked'?'booked':''}" id="comp-${c.id}">
      <div class="card-h" onclick="togCard('comp-${c.id}')">
        <div style="flex:1">
          <div class="card-title">🚚 ${esc(c.name)} ${pendDocs?`<span class="badge orange">📄 ${pendDocs}</span>`:''}</div>
          <div class="card-sub">${c.moveDate?'📅 '+fmtDate(c.moveDate):''} ${c.price?'· 💶 '+fmtEur(c.price,0):''}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <span class="badge ${sm.c}">${sm.e} ${esc(sm.l)}</span>
          ${c.rating?`<span style="font-size:.75rem">${stars(c.rating,5,'⭐','')}</span>`:''}
        </div>
        <span class="chev">▼</span>
      </div>
      <div class="card-body">
        <div class="info-grid">
          ${c.phone?`<div class="info-item"><span class="info-lbl">Phone</span><span class="info-val"><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></span></div>`:''}
          ${c.email?`<div class="info-item"><span class="info-lbl">Email</span><span class="info-val"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span></div>`:''}
          ${c.web?`<div class="info-item"><span class="info-lbl">Website</span><span class="info-val"><a href="${esc(c.web)}" target="_blank">🔗 Open</a></span></div>`:''}
          ${c.price?`<div class="info-item"><span class="info-lbl">Quote</span><span class="info-val" style="color:var(--pk);font-weight:700">${fmtEur(c.price)}</span></div>`:''}
          ${c.moveDate?`<div class="info-item"><span class="info-lbl">Date</span><span class="info-val">${fmtDate(c.moveDate)}</span></div>`:''}
        </div>
        <!-- Stars -->
        <div style="display:flex;gap:3px;margin:6px 0">
          ${[1,2,3,4,5].map(i=>`<span style="font-size:1rem;cursor:pointer;opacity:${i<=(c.rating||0)?1:.25}" onclick="rateCompany('${c.id}',${i})">⭐</span>`).join('')}
        </div>
        <!-- Pros/Cons -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div>
            <div style="font-size:.62rem;font-weight:700;color:var(--gns);margin-bottom:3px">✅ Pros</div>
            <div class="chip-active">${(c.pros||[]).map(p=>`<span class="chip pro">${esc(p)} <span class="chip-rm" onclick="removeMoverChip('${c.id}','pro',${jsq(p)})">✕</span></span>`).join('')}</div>
            <div style="display:flex;gap:4px;margin-top:3px">
              <input id="pro-inp-${c.id}" placeholder="+ Pro" class="chip-inp-field">
              <button class="btn sml suc" onclick="addMoverChip('${c.id}','pro')">+</button>
            </div>
          </div>
          <div>
            <div style="font-size:.62rem;font-weight:700;color:var(--pks);margin-bottom:3px">❌ Cons</div>
            <div class="chip-active">${(c.cons||[]).map(p=>`<span class="chip con">${esc(p)} <span class="chip-rm" onclick="removeMoverChip('${c.id}','con',${jsq(p)})">✕</span></span>`).join('')}</div>
            <div style="display:flex;gap:4px;margin-top:3px">
              <input id="con-inp-${c.id}" placeholder="+ Con" class="chip-inp-field">
              <button class="btn sml dan" onclick="addMoverChip('${c.id}','con')">+</button>
            </div>
          </div>
        </div>
        ${c.notes?`<div class="note-box">${esc(c.notes)}</div>`:''}
        <!-- Documents -->
        <div class="sec-hdr" onclick="togSection('cdocs-${c.id}','cdocarr-${c.id}')">📄 Documents (${(c.docs||[]).length}) <span id="cdocarr-${c.id}">▶</span></div>
        <div id="cdocs-${c.id}" style="display:none">
          ${(c.docs||[]).map(d=>`<div class="doc-item ${d.done?'sent':''}">
            <input type="checkbox" ${d.done?'checked':''} onchange="toggleMoverDoc('${c.id}','${d.id}',this.checked)" style="accent-color:var(--gn)">
            <span style="flex:1;font-size:.75rem">${esc(d.name)}</span>
            <button class="btn sml icon" onclick="deleteMoverDoc('${c.id}','${d.id}')">✕</button>
          </div>`).join('')||'<div style="color:var(--bd3);font-size:.7rem">No documents</div>'}
          <div style="display:flex;gap:5px;margin-top:6px">
            <input id="doc-inp-${c.id}" placeholder="Document name..." class="chip-inp-field" style="flex:1">
            <button class="btn sml pri" onclick="addMoverDoc('${c.id}')">+ Add</button>
          </div>
        </div>
        <!-- Actions -->
        <div class="card-actions">
          <select class="btn sml" onchange="changeCompanyStatus('${c.id}',this.value)">
            ${COMPANY_STATUS.map(s=>`<option value="${s.k}" ${c.status===s.k?'selected':''}>${s.e} ${s.l}</option>`).join('')}
          </select>
          <button class="btn sml" onclick="editCompany('${c.id}')">✏️ Edit</button>
          <button class="btn sml dan" onclick="confirmDlg('Delete this company?',()=>{delMoveItem('${c.id}');rMove();toast('Deleted','warn')})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function addMoveCompany() {
  const name=fVal('c-name'); if(!name){toast('Please enter a name','red');return;}
  const c={id:uid(),name,phone:fVal('c-phone'),email:fVal('c-email'),web:fVal('c-web'),
    price:fNum('c-price'),moveDate:fVal('c-movedate'),status:fVal('c-status')||'enquiry',
    notes:fVal('c-notes'),rating:0,pros:[],cons:[],docs:[],created:Date.now()};
  addMoveItem(c); closeModal('move-add-modal');
  fClear('c-name','c-phone','c-email','c-web','c-price','c-movedate','c-notes');
  rMove(); toast(name+' added 🚚','green');
}
function editCompany(id) {
  const c=getMoveItem(id); if(!c) return;
  fSet('ce-id',id);fSet('ce-name',c.name);fSet('ce-phone',c.phone||'');fSet('ce-email',c.email||'');
  fSet('ce-web',c.web||'');fSet('ce-price',c.price||'');fSet('ce-movedate',c.moveDate||'');
  fSet('ce-status',c.status||'enquiry');fSet('ce-notes',c.notes||'');
  openModal('move-edit-modal');
}
function saveMoveEdit() {
  const id=fVal('ce-id'); const c=getMoveItem(id); if(!c) return;
  c.name=fVal('ce-name')||c.name;c.phone=fVal('ce-phone');c.email=fVal('ce-email');
  c.web=fVal('ce-web');c.price=fNum('ce-price');c.moveDate=fVal('ce-movedate');
  c.status=fVal('ce-status');c.notes=fVal('ce-notes');
  updMoveItem(c); closeModal('move-edit-modal'); rMove(); toast('Saved ✅','green');
}
function rateCompany(id,r) { const c=getMoveItem(id);if(!c)return;c.rating=r;updMoveItem(c);rMove(); }
function changeCompanyStatus(id,st) {
  const c=getMoveItem(id);if(!c)return;
  if(st==='booked'){ldMove().filter(x=>x.id!==id&&x.status==='booked').forEach(x=>{x.status='quote';updMoveItem(x);});celebrate('🎉');toast(c.name+' booked!','green');}
  c.status=st;updMoveItem(c);rMove();updateStatusBar();
}
function addMoverChip(id,type) {
  const val=document.getElementById(type==='pro'?'pro-inp-'+id:'con-inp-'+id)?.value.trim();
  if(!val)return; const c=getMoveItem(id);if(!c)return;
  c[type+'s']=[...(c[type+'s']||[]),val];
  document.getElementById((type==='pro'?'pro-inp-':'con-inp-')+id).value='';
  updMoveItem(c);rMove();
}
function removeMoverChip(id,type,val) {
  const c=getMoveItem(id);if(!c)return;c[type+'s']=(c[type+'s']||[]).filter(v=>v!==val);updMoveItem(c);rMove();
}
function addMoverDoc(id) {
  const val=document.getElementById('doc-inp-'+id)?.value.trim();if(!val)return;
  const c=getMoveItem(id);if(!c)return;c.docs=[...(c.docs||[]),{id:uid(),name:val,done:false}];
  document.getElementById('doc-inp-'+id).value='';updMoveItem(c);rMove();
}
function toggleMoverDoc(cid,did,checked) {
  const c=getMoveItem(cid);if(!c)return;const d=(c.docs||[]).find(x=>x.id===did);
  if(d){d.done=checked;updMoveItem(c);rMove();}
}
function deleteMoverDoc(cid,did) {
  const c=getMoveItem(cid);if(!c)return;c.docs=(c.docs||[]).filter(x=>x.id!==did);updMoveItem(c);rMove();
}

// Move-day checklist
const DEF_CHECKLIST=[
  {id:'mc1',cat:'Before',text:'Get moving boxes',done:false},
  {id:'mc2',cat:'Before',text:'Request no-parking zone permit',done:false},
  {id:'mc3',cat:'Before',text:'Set up mail forwarding',done:false},
  {id:'mc4',cat:'Before',text:'Register electricity / gas at new address',done:false},
  {id:'mc5',cat:'Before',text:'Transfer internet / phone',done:false},
  {id:'mc6',cat:'Before',text:'Update address at bank',done:false},
  {id:'mc7',cat:'Before',text:'Update health insurance address',done:false},
  {id:'mc8',cat:'Before',text:'Register new address (Einwohnermeldeamt)',done:false},
  {id:'mc9',cat:'Moving Day',text:'Read meters at old flat',done:false},
  {id:'mc10',cat:'Moving Day',text:'Read meters at new flat',done:false},
  {id:'mc11',cat:'Moving Day',text:'Handover protocol at old flat',done:false},
  {id:'mc12',cat:'Moving Day',text:'Handover protocol at new flat',done:false},
  {id:'mc13',cat:'Moving Day',text:'Hand over old flat keys',done:false},
  {id:'mc14',cat:'After',text:'Unpack all boxes',done:false},
  {id:'mc15',cat:'After',text:'Assemble all furniture',done:false},
];
function ldMoveCL() { return ld(K.movecl,null)||DEF_CHECKLIST; }
function svMoveCL(d) { sv(K.movecl,d); }
function rMoveChecklist() {
  const list=ldMoveCL(); const el=document.getElementById('move-checklist');if(!el)return;
  const done=list.filter(x=>x.done).length;
  let h=`<div style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;font-size:.75rem;font-weight:700;margin-bottom:3px">
      <span>Progress: ${done}/${list.length}</span><span style="color:var(--pk)">${Math.round(done/list.length*100)}%</span>
    </div>${progressBar(Math.round(done/list.length*100))}</div>`;
  const groups={};list.forEach(it=>{(groups[it.cat]=groups[it.cat]||[]).push(it);});
  h+=Object.entries(groups).map(([cat,items])=>`
    <div style="margin-bottom:10px">
      <div style="font-size:.7rem;font-weight:700;color:var(--pk);padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:4px">${esc(cat)}</div>
      ${items.map(it=>`<div class="check-item ${it.done?'done':''}">
        <input type="checkbox" ${it.done?'checked':''} onchange="toggleMoveCL('${it.id}',this.checked)">
        <label class="check-label" onclick="toggleMoveCL('${it.id}',${!it.done})">${esc(it.text)}</label>
        <button class="btn sml icon" onclick="deleteMoveCL('${it.id}')">✕</button>
      </div>`).join('')}
    </div>`).join('');
  h+=`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
    <select id="mc-cat" style="font-size:.72rem;padding:5px 8px;border:1.5px solid var(--border);border-radius:10px">
      <option>Before</option><option>Moving Day</option><option>After</option>
    </select>
    <input id="mc-text" placeholder="New task..." style="flex:1;font-size:.75rem;padding:5px 10px;border:1.5px solid var(--border);border-radius:10px;min-width:120px">
    <button class="btn pri sml" onclick="addMoveCL()">+ Add</button>
  </div>`;
  el.innerHTML=h;
}
function toggleMoveCL(id,done) { const l=ldMoveCL();const it=l.find(x=>x.id===id);if(it){it.done=done;svMoveCL(l);rMoveChecklist();} }
function deleteMoveCL(id) { svMoveCL(ldMoveCL().filter(x=>x.id!==id));rMoveChecklist(); }
function addMoveCL() { const text=fVal('mc-text');if(!text)return;const l=ldMoveCL();l.push({id:uid(),cat:document.getElementById('mc-cat')?.value||'Before',text,done:false});svMoveCL(l);fClear('mc-text');rMoveChecklist(); }


// ============================================================
// take.js — Packing list + boxes
// ============================================================

function rTake() { rTakeFilters(); rTakeStats(); rTakeList(); rBoxList(); }

function rTakeStats() {
  const items=ldTake(), el=document.getElementById('take-stats'); if(!el) return;
  const total=items.length, packed=items.filter(i=>i.done).length;
  const fragile=items.filter(i=>i.fragile).length;
  const byOwner={};items.forEach(it=>{ byOwner[it.owner]=(byOwner[it.owner]||[]).concat(it); });
  let h='<div class="mini-stats">';
  h+=`<div class="mini-stat"><div class="ms-num">${packed}<span style="font-size:.7rem;color:var(--bd3)">/${total}</span></div><div class="ms-lbl">Packed</div></div>`;
  h+=`<div class="mini-stat"><div class="ms-num">${Math.round(packed/Math.max(total,1)*100)}%</div><div class="ms-lbl">Progress</div></div>`;
  h+=`<div class="mini-stat"><div class="ms-num" style="color:#d97706">${fragile}</div><div class="ms-lbl">🔴 Fragile</div></div>`;
  h+=`<div class="mini-stat"><div class="ms-num">${ldBoxes().length}</div><div class="ms-lbl">📦 Boxes</div></div>`;
  h+='</div>';
  OWNERS.forEach(o=>{
    const oi=byOwner[o.k]||[];if(!oi.length)return;
    const p=oi.filter(i=>i.done).length;const pct=Math.round(p/oi.length*100);
    h+=`<div style="margin:4px 0"><div style="display:flex;justify-content:space-between;font-size:.68rem;margin-bottom:2px"><span>${o.e} ${o.l} · ${p}/${oi.length}</span><span>${pct}%</span></div>${progressBar(pct)}</div>`;
  });
  el.innerHTML=h;
}

function rTakeList() {
  const items=ldTake();
  const q=(document.getElementById('take-search')?.value||'').toLowerCase();
  const rf=getPillVal('take','room'),of=getPillVal('take','owner'),sf=getPillVal('take','status');
  const srt=getPillVal('take','sort')||'room';
  let list=items.filter(it=>{
    if(q&&!(it.name+' '+(it.note||'')).toLowerCase().includes(q))return false;
    if(rf&&it.room!==rf)return false;
    if(of&&it.owner!==of)return false;
    if(sf==='packed'&&!it.done)return false;
    if(sf==='unpacked'&&it.done)return false;
    return true;
  });
  if(srt==='name') list=sortBy(list,'name');
  else if(srt==='prio') list.sort((a,b)=>({'high':0,'medium':1,'low':2}[a.prio]??1)-({'high':0,'medium':1,'low':2}[b.prio]??1));
  else if(srt==='owner') list=sortBy(list,'owner');
  else list=sortBy(list,'room');
  const el=document.getElementById('take-list');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">📦</div>Nothing here yet</div>';return;}
  const groups={};list.forEach(it=>{ (groups[it.room]=groups[it.room]||[]).push(it); });
  const prioColor={'high':'#fee2e2','medium':'#fef9c3','low':'#dcfce7'};
  const ownerIcon={Mari:'🌸',Alexander:'💼',Both:'💕'};
  el.innerHTML=Object.entries(groups).map(([room,ritems])=>{
    const done=ritems.filter(i=>i.done).length, all=ritems.length;
    return `<div class="card" style="margin-bottom:8px">
      <div class="card-h" onclick="togCard('tg-${slugify(room)}')">
        <div style="flex:1"><div class="card-title">${esc(room)}</div>
        <div class="card-sub">${done}/${all} packed</div></div>
        ${progressBar(Math.round(done/all*100),'var(--pk)','5px')}
        <button class="btn sml suc" onclick="event.stopPropagation();markRoomPacked(${jsq(room)})" title="Pack all">📦 All</button>
        <span class="chev">▼</span>
      </div>
      <div id="tg-${slugify(room)}" class="card-body" style="display:block;padding:4px 12px">
        ${ritems.map(it=>{
          const box=it.boxId?ldBoxes().find(b=>b.id===it.boxId):null;
          return `<div class="check-item ${it.done?'done':''}" style="border-left:3px solid ${prioColor[it.prio]||'var(--border)'};padding-left:6px">
            <input type="checkbox" ${it.done?'checked':''} onchange="toggleTakeItem('${it.id}',this.checked)">
            <div style="flex:1"><span class="check-label" onclick="toggleTakeItem('${it.id}',${!it.done})">${esc(it.name)}</span>
            <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:1px">
              ${it.fragile?'<span class="badge pink" style="font-size:.5rem">⚠️ Fragile</span>':''}
              ${it.owner?`<span style="font-size:.65rem">${ownerIcon[it.owner]||''}</span>`:''}
              ${box?`<span class="badge blue" style="font-size:.5rem">📦 ${esc(box.name)}</span>`:''}
              ${it.note?`<span style="font-size:.6rem;color:var(--bd3)">${esc(trunc(it.note,25))}</span>`:''}
            </div></div>
            <button class="btn sml icon" onclick="editTakeItem('${it.id}')">✏️</button>
            <button class="btn sml icon" onclick="confirmDlg('Delete?',()=>{delTakeItem('${it.id}');rTake();})">✕</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

function addTakeItemFromForm() {
  const name=fVal('t-name');if(!name){toast('Please enter a name','red');return;}
  const it={id:uid(),name,room:fVal('t-room')||'Other',owner:fVal('t-owner')||'Both',
    prio:fVal('t-prio')||'medium',fragile:fChk('t-fragile'),note:fVal('t-note'),boxId:'',done:false,created:Date.now()};
  addTakeItem(it);closeModal('take-add-modal');fClear('t-name','t-note');rTake();toast(name+' added 📦','green');
}
function toggleTakeItem(id,done) { const it=getTakeItem(id);if(!it)return;it.done=done;updTakeItem(it);rTake();if(done)toast('Packed ✓','green',1500);updateStatusBar(); }
function markRoomPacked(room) { ldTake().filter(it=>it.room===room).forEach(it=>{it.done=true;updTakeItem(it);});rTake();toast(room+' – all packed! ✅','green'); }
function editTakeItem(id) {
  const it=getTakeItem(id);if(!it)return;
  fSet('te-id',id);fSet('te-name',it.name);fSet('te-room',it.room);fSet('te-owner',it.owner);
  fSet('te-prio',it.prio);fSetChk('te-fragile',it.fragile);fSet('te-note',it.note||'');
  openModal('take-edit-modal');
}
function saveTakeEdit() {
  const id=fVal('te-id');const it=getTakeItem(id);if(!it)return;
  it.name=fVal('te-name')||it.name;it.room=fVal('te-room');it.owner=fVal('te-owner');
  it.prio=fVal('te-prio');it.fragile=fChk('te-fragile');it.note=fVal('te-note');
  updTakeItem(it);closeModal('take-edit-modal');rTake();toast('Saved ✅','green');
}
function rBoxList() {
  const boxes=ldBoxes(),items=ldTake(),el=document.getElementById('box-list');if(!el)return;
  if(!boxes.length){el.innerHTML='<div style="color:var(--bd3);font-size:.7rem;text-align:center;padding:10px">No boxes yet</div>';return;}
  el.innerHTML=boxes.map(b=>{
    const bi=items.filter(i=>i.boxId===b.id), packed=bi.filter(i=>i.done).length;
    return `<div style="background:var(--bg);border-radius:var(--r);border:1px solid var(--border);padding:8px;margin:4px 0">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:1.2rem">📦</span>
        <div style="flex:1"><div style="font-weight:700;font-size:.82rem">${esc(b.name)}</div>
          <div style="font-size:.62rem;color:var(--bd3)">${esc(b.room||'')} · ${bi.length} items</div>
          ${bi.length?progressBar(Math.round(packed/bi.length*100),'var(--gn)','4px'):''}
        </div>
        <button class="btn sml" onclick="copyText(${jsq(`BOX: ${b.name}\n${bi.map(i=>i.name).join(', ')}`)},'Box label')">🏷️</button>
        <button class="btn sml dan" onclick="deleteBox('${b.id}')">✕</button>
      </div>
    </div>`;
  }).join('');
}
function addBoxFromForm() {
  const name=fVal('box-name');if(!name){toast('Please enter a box name','red');return;}
  const b={id:uid(),name,room:fVal('box-room'),created:Date.now()};
  const d=ldBoxes();d.push(b);svBoxes(d);fClear('box-name');closeModal('box-add-modal');rTake();toast('Box "'+name+'" created 📦','green');
}
function deleteBox(id) { ldTake().filter(i=>i.boxId===id).forEach(i=>{i.boxId='';updTakeItem(i);});svBoxes(ldBoxes().filter(x=>x.id!==id));rTake(); }


// ============================================================
// sell.js — Sell tracker
// ============================================================

function rSell() { rSellFilters(); rSellStats(); rSellList(); }

function rSellStats() {
  const items=ldSell(), el=document.getElementById('sell-stats');if(!el)return;
  const st=getSellStats();
  el.innerHTML=`<div class="sell-hero">
    <div style="display:flex;align-items:flex-end;gap:20px;flex-wrap:wrap">
      <div><div class="sell-hero-num">${fmtEur(st.earned,0)}</div><div style="font-size:.65rem;opacity:.85">earned so far 🎉</div></div>
      <div><div style="font-size:1.2rem;font-weight:700;color:#86efac">${fmtEur(st.potential,0)}</div><div style="font-size:.65rem;opacity:.75">still available</div></div>
    </div>
    ${st.total?`<div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:.65rem;opacity:.75;margin-bottom:3px"><span>${st.sold}/${st.total} sold</span><span>${Math.round(st.sold/st.total*100)}%</span></div>
      ${progressBar(Math.round(st.sold/st.total*100),'#86efac')}
    </div>`:''}
    <div class="mini-stats" style="margin-top:8px">
      <div class="mini-stat"><div class="ms-num" style="color:var(--gn)">${st.sold}</div><div class="ms-lbl">Sold</div></div>
      <div class="mini-stat"><div class="ms-num" style="color:#d97706">${items.filter(i=>i.status==='reserved').length}</div><div class="ms-lbl">Reserved</div></div>
      <div class="mini-stat"><div class="ms-num">${st.active}</div><div class="ms-lbl">Available</div></div>
    </div>
  </div>`;
}

function rSellList() {
  const items=ldSell();
  const q=(document.getElementById('sell-search')?.value||'').toLowerCase();
  const pf=getPillVal('sell','plat'),sf=getPillVal('sell','status');
  const srt=getPillVal('sell','sort')||'date';
  let list=items.filter(it=>{
    if(q&&!(it.name+' '+(it.note||'')).toLowerCase().includes(q))return false;
    if(pf&&it.platform!==pf)return false;
    if(sf&&it.status!==sf)return false;
    return true;
  });
  if(srt==='price-hi')list.sort((a,b)=>(b.price||0)-(a.price||0));
  else if(srt==='price-lo')list.sort((a,b)=>(a.price||0)-(b.price||0));
  else if(srt==='status')list=sortBy(list,'status');
  else list.sort((a,b)=>(b.created||0)-(a.created||0));
  const el=document.getElementById('sell-list');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">💸</div>No items yet</div>';return;}
  const cnd=(k)=>CONDITIONS.find(c=>c.k===k)||{l:k,e:'🔧'};
  const plt=(k)=>SELL_PLATFORMS.find(p=>p.k===k)||{l:k,e:'📦',color:'#f1f5f9',textColor:'#64748b'};
  el.innerHTML=list.map(it=>{
    const p=plt(it.platform);const isSold=it.status==='sold'||it.status==='donated';
    const photo=it.photos?.[0]||'';
    return `<div class="card ${isSold?'sold':''}" id="sell-${it.id}">
      <div class="card-h" onclick="togCard('sell-${it.id}')">
        ${photo?`<img src="${esc(photo)}" style="width:50px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0">`:''}
        <div style="flex:1;min-width:0">
          <div class="card-title">${esc(it.name)}
            <span class="badge" style="background:${p.color};color:${p.textColor}">${p.e} ${esc(p.l)}</span>
          </div>
          <div class="card-sub">${esc(it.room||'')} · ${cnd(it.cond).e} ${esc(cnd(it.cond).l)}</div>
        </div>
        <div style="text-align:right">
          ${isSold?`<div style="font-weight:700;color:var(--gn)">${fmtEur(it.soldPrice)}</div><div style="font-size:.6rem;color:var(--bd3)">${fmtDate(it.soldDate)}</div>`
                  :`<div style="font-weight:700;color:var(--pk)">${fmtEur(it.price)}</div>`}
        </div>
        <span class="chev">▼</span>
      </div>
      <div class="card-body">
        ${it.note?`<div class="note-box">${esc(it.note)}</div>`:''}
        ${it.listingLink?`<a href="${esc(it.listingLink)}" target="_blank" class="btn sml" style="margin-bottom:8px;display:inline-flex;gap:4px">🔗 View listing</a>`:''}
        ${it.buyers?.length?`<div style="font-size:.7rem;color:var(--bd3);margin-bottom:6px">${it.buyers.length} interested buyer${it.buyers.length>1?'s':''}</div>`:''}
        <div class="card-actions">
          ${!isSold?`<button class="btn suc sml" onclick="openSellModal('${it.id}')">✅ Sold!</button>
            <button class="btn sml" onclick="reserveSell('${it.id}')">🔒 Reserve</button>`:
            `<button class="btn sml ghost" onclick="undoSell('${it.id}')">↺ Undo</button>`}
          <button class="btn sml" onclick="editSellItem('${it.id}')">✏️</button>
          ${it.listingLink?`<a href="${esc(it.listingLink)}" target="_blank" class="btn sml" onclick="event.stopPropagation()">📋 Listing</a>`:''}
          <button class="btn sml dan" onclick="confirmDlg('Delete?',()=>{delSellItem('${it.id}');rSell();toast('Deleted','warn')})">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

let _sellPros=[], _sellCons=[], _sellDraftPhotos=[];
function rSellDraftPhotos() {
  const el=document.getElementById('sell-add-photo-meta'); if(!el) return;
  el.textContent = _sellDraftPhotos.length
    ? `${_sellDraftPhotos.length} photo${_sellDraftPhotos.length>1?'s':''} ready to attach when you list this item`
    : 'No photos selected yet';
}
function resetSellAddDraft() {
  _sellPros=[]; _sellCons=[]; _sellDraftPhotos=[];
  fClear('s-name','s-price','s-note','s-listing-link');
  fSet('s-cond','good'); fSet('s-plat','ebay'); fSet('s-room','Other');
  const input=document.getElementById('sell-photo-input'); if(input) input.value='';
  rSellAddChips(); rSellDraftPhotos();
}
function openSellAddModal() {
  resetSellAddDraft();
  openModal('sell-add-modal');
}
function cancelSellAddModal() {
  resetSellAddDraft();
  closeModal('sell-add-modal');
}
function addSellItemFromForm() {
  const name=fVal('s-name');if(!name){toast('Please enter a name','red');return;}
  const price=fNum('s-price');
  const it={id:uid(),name,cond:fVal('s-cond')||'good',price,platform:fVal('s-plat')||'ebay',
    room:fVal('s-room')||'Other',note:fVal('s-note'),listingLink:fVal('s-listing-link'),
    pros:[..._sellPros],cons:[..._sellCons],
    status:'active',soldPrice:0,soldDate:'',buyer:'',buyers:[],photos:[..._sellDraftPhotos],
    priceLog:price?[{price,date:todayISO()}]:[],created:Date.now()};
  const ok = addSellItem(it);
  if(!ok) return;
  closeModal('sell-add-modal');
  resetSellAddDraft();
  rSell();toast(name+' listed 💸','green');updateStatusBar();
}
function editSellItem(id) {
  const it=getSellItem(id);if(!it)return;
  fSet('se-id',id);fSet('se-name',it.name);fSet('se-cond',it.cond);fSet('se-price',it.price);
  fSet('se-plat',it.platform);fSet('se-room',it.room||'');fSet('se-note',it.note||'');fSet('se-listing-link',it.listingLink||'');
  openModal('sell-edit-modal');
}
function saveSellEdit() {
  const id=fVal('se-id');const it=getSellItem(id);if(!it)return;
  const np=fNum('se-price');
  if(np!==it.price) it.priceLog=[...(it.priceLog||[]),{price:np,date:todayISO()}];
  it.name=fVal('se-name')||it.name;it.cond=fVal('se-cond');it.price=np;
  it.platform=fVal('se-plat');it.room=fVal('se-room');it.note=fVal('se-note');it.listingLink=fVal('se-listing-link');
  updSellItem(it);closeModal('sell-edit-modal');rSell();toast('Saved ✅','green');
}
function reserveSell(id) { const it=getSellItem(id);if(!it)return;it.status=it.status==='reserved'?'active':'reserved';updSellItem(it);rSell();toast(it.status==='reserved'?'Reserved 🔒':'Back to available','info'); }
function undoSell(id) { const it=getSellItem(id);if(!it)return;it.status='active';it.soldPrice=0;it.soldDate='';updSellItem(it);rSell();updateStatusBar(); }
function addSellPro(v){if(!v?.trim())return;_sellPros.push(v.trim());rSellAddChips();}
function addSellCon(v){if(!v?.trim())return;_sellCons.push(v.trim());rSellAddChips();}
function rmSellPro(v){_sellPros=_sellPros.filter(x=>x!==v);rSellAddChips();}
function rmSellCon(v){_sellCons=_sellCons.filter(x=>x!==v);rSellAddChips();}
function rSellAddChips(){
  const pe=document.getElementById('sell-add-pros');if(pe)pe.innerHTML=_sellPros.map(p=>`<span class="chip pro">${esc(p)}<span class="chip-rm" onclick="rmSellPro(${jsq(p)})">✕</span></span>`).join('');
  const ce=document.getElementById('sell-add-cons');if(ce)ce.innerHTML=_sellCons.map(c=>`<span class="chip con">${esc(c)}<span class="chip-rm" onclick="rmSellCon(${jsq(c)})">✕</span></span>`).join('');
  rSellDraftPhotos();
}
async function uploadSellPhotos(id,files,input) {
  if(!files||!files.length)return;
  const selectedFiles = Array.from(files);
  if(!id) {
    const urls = await Promise.all(selectedFiles.map(readPhotoAsDataURL));
    _sellDraftPhotos = [..._sellDraftPhotos, ...urls];
    if(input) input.value='';
    rSellDraftPhotos();
    toast(`${selectedFiles.length} photo${selectedFiles.length>1?'s':''} ready for this listing 📷`,'green');
    return;
  }
  const ok = await attachPhotos(id,selectedFiles,'sell');
  if(input) input.value='';
  if(!ok)return;
  rSell();toast(`${selectedFiles.length} photo${selectedFiles.length>1?'s':''} added 📷`,'green');
}


// ============================================================
// compare.js — Product comparison (standalone tab)
// ============================================================

function getFilteredCmpItems() {
  const items=ldCmp();
  const cf=getPillVal('cmp','cat'),rf=getPillVal('cmp','room');
  return items.filter(it=>(!cf||it.category===cf)&&(!rf||it.roomId===rf));
}
function getCmpScenarioKey(it) {
  return String(it.optionGroup || '').trim() || `${it.category || 'Option'}::${it.roomId || 'general'}`;
}
function getCmpScenarioLabel(it) {
  if (it.optionGroup) return it.optionGroup;
  const room = it.roomId ? getRoomById(it.roomId) : null;
  return `${it.category || 'Option'}${room?.label ? ' · ' + room.label : ''}`;
}
function getCmpScenarioSelections() {
  return ldScenario().compareChoices || {};
}
function isCmpScenarioSelected(it) {
  return getCmpScenarioSelections()[getCmpScenarioKey(it)] === it.id;
}
function setCmpScenarioSelection(groupKey, itemId) {
  const data = ldScenario();
  data.compareChoices = { ...(data.compareChoices || {}), [groupKey]: itemId };
  svScenario(data);
  rCompare();
  if (document.getElementById('compare-modal')?.classList.contains('open')) rCompareModal();
}
function rCmpScenario() {
  const panel=document.getElementById('cmp-scenario-panel'); if(!panel) return;
  const items = getFilteredCmpItems();
  if(!items.length) { panel.innerHTML=''; return; }
  const groups = items.reduce((map, item) => {
    const key = getCmpScenarioKey(item);
    if (!map[key]) map[key] = { label:getCmpScenarioLabel(item), items:[] };
    map[key].items.push(item);
    return map;
  }, {});
  const selections = getCmpScenarioSelections();
  const selectedItems = Object.entries(groups).map(([key, group]) =>
    group.items.find(item => item.id === selections[key]) || group.items[0]
  );
  const comparePicksTotal = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const shoppingBaseline = getBudgetStats();
  panel.innerHTML = `<div class="cmp-group" style="margin-top:0">
    <div class="cmp-group-hdr">
      <span>🧮 Scenario Budget Lab</span>
      <span style="font-size:.72rem;font-weight:500;opacity:.85">Pick one option per group and compare the total with your shopping budget</span>
    </div>
    <div style="padding:12px 16px;display:grid;gap:10px">
      <div class="mini-stats" style="margin:0">
        <div class="mini-stat"><div class="ms-num" style="color:var(--pk)">${fmtEur(comparePicksTotal,0)}</div><div class="ms-lbl">Scenario picks</div></div>
        <div class="mini-stat"><div class="ms-num">${fmtEur(shoppingBaseline.est,0)}</div><div class="ms-lbl">Current buy plan</div></div>
        <div class="mini-stat"><div class="ms-num" style="color:${shoppingBaseline.est + comparePicksTotal > shoppingBaseline.max ? 'var(--pk)' : 'var(--gn)'}">${fmtEur(shoppingBaseline.est + comparePicksTotal,0)}</div><div class="ms-lbl">Combined total</div></div>
      </div>
      ${Object.entries(groups).map(([key, group]) => `
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,260px);gap:8px;align-items:center;border-bottom:1px solid var(--bg2);padding-bottom:8px">
          <div>
            <div style="font-size:.74rem;font-weight:700;color:var(--bd)">${esc(group.label)}</div>
            <div style="font-size:.62rem;color:var(--bd3)">${group.items.length} option${group.items.length>1?'s':''}</div>
          </div>
          ${group.items.length > 1
            ? `<select class="btn sml" onchange="setCmpScenarioSelection(${jsq(key)},this.value)">
                ${group.items.map(item => `<option value="${esc(item.id)}" ${selectedItems.find(sel => sel.id === item.id) ? 'selected' : ''}>${esc(item.name)} · ${item.price ? fmtEur(item.price,0) : '–'}</option>`).join('')}
              </select>`
            : `<div style="font-size:.68rem;color:var(--bd2);justify-self:end">${esc(group.items[0].name)}${group.items[0].price ? ' · ' + fmtEur(group.items[0].price,0) : ''}</div>`
          }
        </div>
      `).join('')}
    </div>
  </div>`;
}

function rCompare() { rCmpFilters(); rCmpScenario(); rCmpList(); }

function rCmpList() {
  let list=getFilteredCmpItems();
  const el=document.getElementById('compare-out');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><div class="ei">⚖️</div>No products to compare yet.<br><button class="btn pri" style="margin-top:10px" onclick="openModal(\'cmp-add-modal\')">+ Add first product</button></div>';return;}
  const groups={};list.forEach(it=>{(groups[it.category]=groups[it.category]||[]).push(it);});
  el.innerHTML=Object.entries(groups).map(([cat,catItems])=>renderCmpGroup(cat,catItems)).join('');
}

function renderCmpGroup(cat,items) {
  items.forEach(it=>{ it._score=calcCmpScore(it); });
  const maxS=Math.max(...items.map(i=>i._score));
  const minP=Math.min(...items.filter(i=>i.price>0).map(i=>i.price)||[Infinity]);
  const settings=ldSettings();const names=settings.names||{M:'Mari',A:'Alexander'};
  return `<div class="cmp-group">
    <div class="cmp-group-hdr">
      <span>${esc(cat)} <span style="font-size:.7rem;opacity:.75">${items.length} options</span></span>
      <button class="btn sml" style="background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.3)" onclick="openCmpModal(${jsq(cat)})">🔍 Card View</button>
    </div>
    <div class="cmp-scroll">
      <table class="cmp-table">
        <thead><tr>
          <th class="feat-cell" style="min-width:110px">Feature</th>
          ${items.map(it=>`<th style="${it._score===maxS&&maxS>0?'background:var(--gnl);color:var(--gns)':''};min-width:150px">
            ${it.photos?.[0]?`<img src="${esc(it.photos[0])}" style="width:60px;height:45px;object-fit:cover;border-radius:6px;display:block;margin:0 auto 4px">`:''}
            ${esc(it.name)} ${it._score===maxS&&maxS>0?'🏆':''}
          </th>`).join('')}
        </tr></thead>
        <tbody>
          <tr><td class="feat-cell">Price</td>${items.map(it=>`<td class="${it.price>0&&it.price===minP?'best':''}"><strong style="color:${it.price===minP&&it.price>0?'var(--gn)':'var(--pk)'}">${it.price?fmtEur(it.price):'–'}</strong></td>`).join('')}</tr>
          <tr><td class="feat-cell">Scenario</td>${items.map(it=>`<td>${isCmpScenarioSelected(it)?'<span class="badge green">✅ Picked</span>':'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Room</td>${items.map(it=>`<td>${it.roomId ? esc(getRoomById(it.roomId).label || '–') : '–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">W×D×H (cm)</td>${items.map(it=>`<td style="font-family:monospace">${dimStr(it)||'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Room fit</td>${items.map(it=>`<td>${renderCmpFitText(it)}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Energy</td>${items.map(it=>`<td>${it.energyRating?energyBadge(it.energyRating):'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Option group</td>${items.map(it=>`<td>${esc(it.optionGroup||'–')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">Warranty</td>${items.map(it=>`<td>${esc(it.warranty||'–')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">${esc(names.M)}</td>${items.map(it=>`<td>${preferenceCellLabel(it,'M')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">${esc(names.A)}</td>${items.map(it=>`<td>${preferenceCellLabel(it,'A')}</td>`).join('')}</tr>
          <tr><td class="feat-cell">✅ Pros</td>${items.map(it=>`<td>${(it.pros||[]).map(p=>`<span class="chip pro" style="font-size:.58rem;margin:1px">${esc(p)}</span>`).join('')||'–'}</td>`).join('')}</tr>
          <tr><td class="feat-cell">❌ Cons</td>${items.map(it=>`<td>${(it.cons||[]).map(c=>`<span class="chip con" style="font-size:.58rem;margin:1px">${esc(c)}</span>`).join('')||'–'}</td>`).join('')}</tr>
          <tr style="background:var(--pkl)"><td class="feat-cell" style="font-weight:700">Score</td>${items.map(it=>`<td class="${it._score===maxS&&maxS>0?'best':''}" style="font-weight:700">${it._score.toFixed(1)}/10</td>`).join('')}</tr>
          <tr><td class="feat-cell">Actions</td>${items.map(it=>`<td>
            ${it.buyLink?`<a href="${esc(it.buyLink)}" target="_blank" class="btn sml pri" style="margin-bottom:3px;display:inline-block">🛒 Buy</a><br>`:''}
            <button class="btn sml" onclick="setCmpScenarioSelection(${jsq(getCmpScenarioKey(it))},'${it.id}')">✅ Pick</button>
            <button class="btn sml" onclick="editCmpItem('${it.id}')">✏️</button>
            <button class="btn sml dan" onclick="confirmDlg('Delete?',()=>{delCmpItem('${it.id}');rCompare();toast('Deleted','warn')})">🗑️</button>
          </td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
    ${getRecommendationHTML(items)}
  </div>`;
}

function calcCmpScore(it) {
  let s=0;
  const avgR=((it.ratingM||0)+(it.ratingA||0))/2;
  s+=(avgR/5)*4;
  if(it.energyRating){const e={'A+++':10,'A++':9,'A+':8,'A':7,'B':5,'C':3,'D':1,'E':0};s+=(e[it.energyRating]||0)/10*2;}
  if (getRoomFitAnalysis(it)?.fits) s += 1;
  s+=Math.max(0,Math.min(2,((it.pros||[]).length-(it.cons||[]).length)*0.5));
  return Math.max(0,Math.min(10,s));
}
function renderCmpFitText(it) {
  const fit = typeof getRoomFitAnalysis === 'function' ? getRoomFitAnalysis(it) : null;
  if (!fit) return '–';
  if (!fit.fits) return '❌ Too large';
  if (fit.fitsRotatedOnly) return `↻ Fits rotated · ${fit.footprintPct}%`;
  return `✅ Fits · ${fit.footprintPct}%`;
}

function getRecommendationHTML(items) {
  const priced=items.filter(i=>i.price>0);
  if(priced.length) {
    const minP=Math.min(...priced.map(i=>i.price));
    items.forEach(it=>{ it._finalScore=it._score+(it.price>0?minP/it.price*2:0); });
  } else items.forEach(it=>{ it._finalScore=it._score; });
  const best=items.slice().sort((a,b)=>b._finalScore-a._finalScore)[0];
  if(!best||best._finalScore===0)return'';
  const reasons=[];
  if((best.ratingM||0)+(best.ratingA||0)>=8)reasons.push('highest ratings');
  if(best.energyRating&&['A+++','A++','A+'].includes(best.energyRating))reasons.push(`${best.energyRating} energy`);
  if((best.pros||[]).length>(best.cons||[]).length)reasons.push(`${(best.pros||[]).length} pros`);
  if(best.price===Math.min(...items.filter(i=>i.price>0).map(i=>i.price)))reasons.push('best price');
  return `<div class="cmp-recommendation">
    <span style="font-size:1.5rem">🏆</span>
    <div><strong>Recommendation: ${esc(best.name)}</strong>
    <div style="font-size:.65rem;color:var(--bd3);margin-top:2px">${reasons.length?'Why: '+reasons.join(' · '):'Best overall score'}</div></div>
    ${best.buyLink?`<a href="${esc(best.buyLink)}" target="_blank" class="btn sml pri" style="margin-left:auto">🛒 Buy</a>`:''}
  </div>`;
}

let _cmpPros=[], _cmpCons=[];
function addCmpItemFromForm() {
  const name=fVal('cmp-name');if(!name){toast('Please enter a name','red');return;}
  const prosRaw=fVal('cmp-pros'),consRaw=fVal('cmp-cons');
  const imageUrl=fVal('cmp-image-url');
  const it={id:uid(),name,category:fVal('cmp-cat')||'Other',roomId:fVal('cmp-room')||'',
    optionGroup:fVal('cmp-group'),
    price:fNum('cmp-price'),energyRating:fVal('cmp-energy'),warranty:fVal('cmp-warranty'),
    buyLink:fVal('cmp-buylink'),ratingM:parseInt(fVal('cmp-rating-m'))||0,ratingA:parseInt(fVal('cmp-rating-a'))||0,
    pros:prosRaw?prosRaw.split(',').map(s=>s.trim()).filter(Boolean):[..._cmpPros],
    cons:consRaw?consRaw.split(',').map(s=>s.trim()).filter(Boolean):[..._cmpCons],
    widthCm:fNum('cmp-width'),depthCm:fNum('cmp-depth'),heightCm:fNum('cmp-height'),
    notes:fVal('cmp-notes'),voteM:'',voteA:'',photos:imageUrl?[imageUrl]:[],created:Date.now()};
  addCmpItem(it);closeModal('cmp-add-modal');
  fClear('cmp-name','cmp-group','cmp-price','cmp-warranty','cmp-image-url','cmp-buylink','cmp-pros','cmp-cons','cmp-notes','cmp-width','cmp-depth','cmp-height');
  _cmpPros=[];_cmpCons=[];rCompare();toast(name+' added ⚖️','green');
}
function editCmpItem(id) {
  const it=getCmpItem(id);if(!it)return;
  syncRoomSelect('cmpe-room', { blankLabel:'-- optional --', selected:it.roomId||'' });
  fSet('cmpe-id',id);fSet('cmpe-name',it.name);fSet('cmpe-cat',it.category);fSet('cmpe-group',it.optionGroup||'');fSet('cmpe-room',it.roomId||'');
  fSet('cmpe-price',it.price);fSet('cmpe-energy',it.energyRating||'');fSet('cmpe-warranty',it.warranty||'');
  fSet('cmpe-image-url',it.photos?.[0]||'');fSet('cmpe-buylink',it.buyLink||'');fSet('cmpe-rating-m',it.ratingM||'');fSet('cmpe-rating-a',it.ratingA||'');
  fSet('cmpe-pros',(it.pros||[]).join(', '));fSet('cmpe-cons',(it.cons||[]).join(', '));fSet('cmpe-notes',it.notes||'');
  fSet('cmpe-width',it.widthCm||'');fSet('cmpe-depth',it.depthCm||'');fSet('cmpe-height',it.heightCm||'');
  openModal('cmp-edit-modal');
}
function saveCmpEdit() {
  const id=fVal('cmpe-id');const it=getCmpItem(id);if(!it)return;
  it.name=fVal('cmpe-name')||it.name;it.category=fVal('cmpe-cat');it.optionGroup=fVal('cmpe-group');it.roomId=fVal('cmpe-room');
  it.price=fNum('cmpe-price');it.energyRating=fVal('cmpe-energy');it.warranty=fVal('cmpe-warranty');
  it.photos=fVal('cmpe-image-url')?[fVal('cmpe-image-url')]:[];it.buyLink=fVal('cmpe-buylink');it.ratingM=parseInt(fVal('cmpe-rating-m'))||0;it.ratingA=parseInt(fVal('cmpe-rating-a'))||0;
  const p=fVal('cmpe-pros'),c=fVal('cmpe-cons');
  it.pros=p?p.split(',').map(s=>s.trim()).filter(Boolean):it.pros;
  it.cons=c?c.split(',').map(s=>s.trim()).filter(Boolean):it.cons;
  it.notes=fVal('cmpe-notes');
  it.widthCm=fNum('cmpe-width');it.depthCm=fNum('cmpe-depth');it.heightCm=fNum('cmpe-height');
  updCmpItem(it);closeModal('cmp-edit-modal');rCompare();toast('Saved ✅','green');
}
function openCmpModal(cat) {
  const items=ldCmp().filter(it=>it.category===cat);
  if(!items.length)return;
  setCompareContext(items.map(i=>i.id), 'cmp');
  rCompareModal();openModal('compare-modal');
}
