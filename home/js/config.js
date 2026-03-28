// ============================================================
// config.js — Our New Home · Global constants (English)
// ============================================================

const APP_VERSION = '2.1';
const APP_NAME    = 'Our New Home';
const APP_THEME_COLOR = '#9f1239';
const APP_BACKGROUND_COLOR = '#f8fafc';
const APP_RUNTIME = Object.freeze({
  authRequired: true,
  authProvider: 'cognito',
  deploymentTarget: 's3_cloudfront',
  installablePwa: true,
  storageScope: 'cognito_user_sub',
});
const AUTH_GROUPS = Object.freeze({
  admin: 'admin',
  tester: 'tester',
});
const COGNITO_CONFIG = Object.freeze({
  region: 'eu-central-1',
  userPoolId: '',
  clientId: '',
  xorKey: 'hnz-auth-2026',
  userPoolIdEnc: 'DRtXTgQbABpMXh0DaQUlHWoHGjUtRw==',
  clientIdEnc: 'WgwIRQ5ATA1MVlEGAA9aT14IGRAGRwVeBwI=',
  storageMode: 'session',
});

function xorDecodeBase64(encoded, key) {
  if (!encoded || !key) return '';
  try {
    return atob(encoded)
      .split('')
      .map((char, idx) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(idx % key.length)))
      .join('');
  } catch {
    return '';
  }
}
function getCognitoConfig() {
  const runtime = window.__HOME_AUTH_CONFIG__ || {};
  const xorKey = runtime.xorKey || COGNITO_CONFIG.xorKey || '';
  const userPoolId = runtime.userPoolId
    || xorDecodeBase64(runtime.userPoolIdEnc || COGNITO_CONFIG.userPoolIdEnc, xorKey)
    || COGNITO_CONFIG.userPoolId;
  const clientId = runtime.clientId
    || xorDecodeBase64(runtime.clientIdEnc || COGNITO_CONFIG.clientIdEnc, xorKey)
    || COGNITO_CONFIG.clientId;
  return {
    region: runtime.region || COGNITO_CONFIG.region,
    userPoolId,
    clientId,
    storageMode: runtime.storageMode || COGNITO_CONFIG.storageMode,
  };
}
function hasCognitoConfig() {
  const cfg = getCognitoConfig();
  return Boolean(cfg.region && cfg.userPoolId && cfg.clientId);
}

// Storage keys
const K = {
  plan:    'hnz_plan',
  move:    'hnz_move',
  take:    'hnz_take',
  boxes:   'hnz_boxes',
  sell:    'hnz_sell',
  buy:     'hnz_buy',
  compare: 'hnz_cmp',
  settings:'hnz_settings',
  activity:'hnz_activity',
  movecl:  'hnz_movecl',
};

// ── Rooms ───────────────────────────────────────────────────
const ROOMS = [
  { id:'r-kueche',  label:'Kitchen',          emoji:'🍳', color:'#dcfce7', colorDark:'#166534' },
  { id:'r-wohnzim', label:'Living Room',       emoji:'🛋️', color:'#ffedd5', colorDark:'#9a3412' },
  { id:'r-schlaf',  label:'Master Bedroom',    emoji:'🛏️', color:'#dbeafe', colorDark:'#1e40af' },
  { id:'r-kinder',  label:"Children's Room",   emoji:'🧒', color:'#ede9fe', colorDark:'#5b21b6' },
  { id:'r-esszim',  label:'Study / Dining',    emoji:'📚', color:'#fce7f3', colorDark:'#9d174d' },
  { id:'r-bad',     label:'Bathroom',          emoji:'🛁', color:'#ccfbf1', colorDark:'#134e4a' },
  { id:'r-wc',      label:'WC',                emoji:'🚽', color:'#e0f2fe', colorDark:'#0c4a6e' },
  { id:'r-flur',    label:'Hallway',           emoji:'🚪', color:'#fef9c3', colorDark:'#713f12' },
  { id:'r-other',   label:'Other',             emoji:'📦', color:'#f3f4f6', colorDark:'#374151' },
];
const DEFAULT_ROOM_META = { emoji:'📦', color:'#f3f4f6', colorDark:'#374151' };

function getStaticRoomById(id) { return ROOMS.find(r => r.id === id) || null; }
function getStaticRoomMetaByLabel(label) {
  const key = String(label || '').trim().toLowerCase();
  if (!key) return null;
  return ROOMS.find(r => r.label.toLowerCase() === key) || null;
}
function getPlanRoomCatalog() {
  const plan = typeof ldPlan === 'function' ? ldPlan() : null;
  const floors = Array.isArray(plan?.floors) ? plan.floors : [];
  const out = [];
  floors.forEach((floor, floorIdx) => {
    (floor.rooms || []).forEach((room, roomIdx) => {
      const fallback = getStaticRoomById(room.id) || getStaticRoomMetaByLabel(room.label);
      out.push({
        id: room.id,
        label: room.label || fallback?.label || `Room ${roomIdx + 1}`,
        emoji: room.emoji || fallback?.emoji || '🏠',
        color: room.color || fallback?.color || DEFAULT_ROOM_META.color,
        colorDark: fallback?.colorDark || DEFAULT_ROOM_META.colorDark,
        floorId: floor.id || `floor-${floorIdx + 1}`,
        floorName: floor.name || `Floor ${floorIdx + 1}`
      });
    });
  });
  return out;
}
function getAllRooms({ includeStatic = true } = {}) {
  const seen = new Set();
  const rooms = [];
  const pushRoom = room => {
    if (!room?.id || seen.has(room.id)) return;
    seen.add(room.id);
    rooms.push(room);
  };
  getPlanRoomCatalog().forEach(pushRoom);
  if (includeStatic || !rooms.length) ROOMS.forEach(pushRoom);
  return rooms.length ? rooms : [...ROOMS];
}
function getRoomById(id) {
  if (!id) return ROOMS[ROOMS.length - 1];
  return getAllRooms().find(r => r.id === id) || {
    id,
    label: id,
    emoji: DEFAULT_ROOM_META.emoji,
    color: DEFAULT_ROOM_META.color,
    colorDark: DEFAULT_ROOM_META.colorDark
  };
}
function buildRoomOptions(selected = '', { includeBlank = true, blankLabel = '-- select room --' } = {}) {
  const rooms = getAllRooms();
  const seen = new Set();
  let html = includeBlank ? `<option value="">${blankLabel}</option>` : '';
  rooms.forEach(room => {
    seen.add(room.id);
    html += `<option value="${esc(room.id)}">${esc(room.emoji)} ${esc(room.label)}</option>`;
  });
  if (selected && !seen.has(selected)) {
    const room = getRoomById(selected);
    html += `<option value="${esc(selected)}">${esc(room.emoji)} ${esc(room.label)}</option>`;
  }
  return html;
}
function syncRoomSelect(selectId, options = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = options.selected ?? select.value ?? '';
  select.innerHTML = buildRoomOptions(current, options);
  select.value = current && [...select.options].some(opt => opt.value === current) ? current : '';
}
function syncAllRoomSelects() {
  syncRoomSelect('b-room', { blankLabel:'-- select room --' });
  syncRoomSelect('be-room', { blankLabel:'-- none --' });
  syncRoomSelect('cmp-room', { blankLabel:'-- optional --' });
  syncRoomSelect('cmpe-room', { blankLabel:'-- optional --' });
}

// ── Item categories + types ─────────────────────────────────
const ITEM_CATEGORIES = [
  {
    k: 'Appliances', l: 'Appliances', e: '🏠',
    types: ['Fridge','Freezer','Washing Machine','Dryer','Dishwasher','Oven','Hob','Microwave','Extractor Hood','Other Appliance'],
    specsTemplate: ['Volume (L)','Energy Class','Noise (dB)','Width (cm)','Height (cm)','Depth (cm)']
  },
  {
    k: 'Furniture', l: 'Furniture', e: '🛋️',
    types: ['Sofa','Armchair','Bed','Wardrobe','Dresser','Bookshelf','Desk','Chair','Dining Table','Coffee Table','Nightstand','Shelf Unit','Other Furniture'],
    specsTemplate: ['Width (cm)','Depth (cm)','Height (cm)','Material','Assembly required']
  },
  {
    k: 'Electronics', l: 'Electronics', e: '📺',
    types: ['TV','Monitor','Speaker System','Router','Smart Hub','Computer','Other Electronics'],
    specsTemplate: ['Screen size (in)','Resolution','Connectivity','Power (W)']
  },
  {
    k: 'Lighting', l: 'Lighting', e: '💡',
    types: ['Ceiling Light','Floor Lamp','Wall Light','Desk Lamp','LED Strip','Other Lighting'],
    specsTemplate: ['Lumen','Color temp (K)','Power (W)','Smart']
  },
  {
    k: 'Kitchen', l: 'Kitchen Items', e: '🍳',
    types: ['Sink','Faucet','Counter Top','Kitchen Cabinet','Range Hood','Other Kitchen'],
    specsTemplate: ['Width (cm)','Depth (cm)','Material','Color']
  },
  {
    k: 'Bathroom', l: 'Bathroom Items', e: '🚿',
    types: ['Bathtub','Shower','Toilet','Sink','Mirror','Cabinet','Towel Rail','Other Bathroom'],
    specsTemplate: ['Width (cm)','Depth (cm)','Material']
  },
  {
    k: 'Textiles', l: 'Textiles & Soft', e: '🛏️',
    types: ['Mattress','Bedding','Curtains','Rugs','Cushions','Other Textiles'],
    specsTemplate: ['Size','Material','Color']
  },
  {
    k: 'Decor', l: 'Decor & Plants', e: '🌿',
    types: ['Plant','Picture','Mirror','Vase','Art','Clock','Other Decor'],
    specsTemplate: ['Dimensions','Material']
  },
  {
    k: 'Storage', l: 'Storage & Boxes', e: '📦',
    types: ['Box','Bin','Basket','Rack','Other Storage'],
    specsTemplate: ['Width (cm)','Height (cm)','Depth (cm)']
  },
];
function getCatByKey(k) { return ITEM_CATEGORIES.find(c => c.k === k); }

// Pre-defined pros/cons suggestions per category
const PROS_SUGGESTIONS = {
  Appliances:  ['Energy efficient','Very quiet','Large capacity','Easy to clean','Smart/WiFi','Excellent warranty','Fast','Durable','Good reviews','Compact'],
  Furniture:   ['High quality','Easy assembly','Space saving','Timeless design','Durable material','Comfortable','Versatile','Sustainable','Good storage'],
  Electronics: ['Sharp display','Good sound','Fast','Reliable brand','Good connectivity','Smart features','Low power'],
  Lighting:    ['Bright','Warm tone','Dimmable','Smart','Energy efficient','Long lifetime'],
  default:     ['Great value','Well reviewed','Premium quality','Durable','Easy to use','Fast delivery','In stock'],
};
const CONS_SUGGESTIONS = {
  Appliances:  ['Expensive','Noisy','Large footprint','Short warranty','Complex controls','High energy use','Slow'],
  Furniture:   ['Complex assembly','Heavy','Expensive','Not durable','Limited color options','Uncomfortable','Too large'],
  Electronics: ['Expensive','Connectivity issues','Fragile','Complex setup','Poor support'],
  default:     ['Pricey','Long delivery','Complex','Not in stock','Mixed reviews','Heavy'],
};

// ── Item statuses ────────────────────────────────────────────
const ITEM_STATUSES = [
  { k:'wishlist',    l:'Wishlist',    e:'💭', c:'gray'   },
  { k:'researching', l:'Researching', e:'🔍', c:'blue'   },
  { k:'decided',     l:'Decided',     e:'✅', c:'green'  },
  { k:'ordered',     l:'Ordered',     e:'📦', c:'orange' },
  { k:'delivered',   l:'Delivered',   e:'🚚', c:'teal'   },
  { k:'placed',      l:'Placed',      e:'🏠', c:'pink'   },
];

// ── Buy priorities ───────────────────────────────────────────
const BUY_PRIOS = [
  { k:'must', l:'Must-have', e:'🔴', color:'#fee2e2', colorText:'#991b1b' },
  { k:'want', l:'Want',      e:'🟡', color:'#fef9c3', colorText:'#713f12' },
  { k:'nice', l:'Nice-to-have', e:'🟢', color:'#dcfce7', colorText:'#14532d' },
];

// ── Sell platforms ───────────────────────────────────────────
const SELL_PLATFORMS = [
  { k:'ebay',  l:'eBay Kleinanzeigen', e:'🟠', color:'#fed7aa', textColor:'#7c2d12' },
  { k:'fb',    l:'Facebook Marketplace', e:'🔵', color:'#dbeafe', textColor:'#1e3a8a' },
  { k:'local', l:'Local / Neighbour', e:'🏘️', color:'#ede9fe', textColor:'#4c1d95' },
  { k:'flohm', l:'Flea Market',       e:'🎪', color:'#fce7f3', textColor:'#831843' },
  { k:'give',  l:'Give Away',          e:'🎁', color:'#dcfce7', textColor:'#14532d' },
];

// ── Conditions ───────────────────────────────────────────────
const CONDITIONS = [
  { k:'new',      l:'Brand New',    e:'✨', color:'#dcfce7' },
  { k:'like-new', l:'Like New',     e:'💫', color:'#dbeafe' },
  { k:'good',     l:'Good',         e:'👍', color:'#fef9c3' },
  { k:'used',     l:'Used',         e:'🔧', color:'#fed7aa' },
  { k:'broken',   l:'Parts Only',   e:'⚠️', color:'#fee2e2' },
];

// ── Energy classes ───────────────────────────────────────────
const ENERGY_COLORS = {
  'A+++':'#166534','A++':'#15803d','A+':'#16a34a','A':'#4ade80',
  'B':'#ca8a04','C':'#d97706','D':'#ea580c','E':'#dc2626','F':'#991b1b',
};

// ── Move company statuses ─────────────────────────────────────
const COMPANY_STATUS = [
  { k:'enquiry',  l:'Enquired',        e:'📤', c:'gray'   },
  { k:'quote',    l:'Quote received',  e:'📋', c:'blue'   },
  { k:'visit',    l:'Site visit',      e:'👁️', c:'orange' },
  { k:'booked',   l:'Booked ✓',        e:'✅', c:'green'  },
  { k:'cancelled',l:'Cancelled',       e:'❌', c:'pink'   },
];

// ── Owners ───────────────────────────────────────────────────
const OWNERS = [
  { k:'Mari',      l:'Mari',      e:'🌸' },
  { k:'Alexander', l:'Alexander', e:'💼' },
  { k:'Both',      l:'Both',      e:'💕' },
];

// ── Default settings ─────────────────────────────────────────
const DEFAULT_SETTINGS = {
  moveDate: '',
  newAddress: '',
  oldAddress: '',
  maxBudget: 5000,
  names: { M: 'Mari', A: 'Alexander' },
  currency: '€',
  useSqm: true,
};

// ── Furniture sizes for floor plan ───────────────────────────
const FURNITURE = {
  'bed-double':  { emoji:'🛏️', l:'Double Bed',       w:2.0, h:2.15, cat:'Master Bedroom', color:'#bfdbfe' },
  'bed-single':  { emoji:'🛏️', l:'Single Bed',       w:1.0, h:2.0,  cat:'Master Bedroom', color:'#bfdbfe' },
  'sofa':        { emoji:'🛋️', l:'Sofa',              w:2.5, h:1.0,  cat:'Living Room',    color:'#fecaca' },
  'sofa-l':      { emoji:'🛋️', l:'L-Shape Sofa',     w:3.0, h:2.0,  cat:'Living Room',    color:'#fecaca' },
  'wardrobe':    { emoji:'🚪', l:'Wardrobe',           w:2.0, h:0.65, cat:'Bedroom',        color:'#d1d5db' },
  'desk':        { emoji:'🖥️', l:'Desk',               w:1.6, h:0.8,  cat:'Study',          color:'#fef08a' },
  'dining-table':{ emoji:'🪑', l:'Dining Table',      w:1.8, h:0.9,  cat:'Kitchen',        color:'#fed7aa' },
  'coffee-table':{ emoji:'☕', l:'Coffee Table',      w:1.2, h:0.6,  cat:'Living Room',    color:'#d1d5db' },
  'fridge':      { emoji:'🧊', l:'Fridge',             w:0.7, h:0.8,  cat:'Kitchen',        color:'#e0f2fe' },
  'washer':      { emoji:'🫧', l:'Washing Machine',   w:0.6, h:0.6,  cat:'Bathroom',       color:'#e0f2fe' },
  'dryer':       { emoji:'💨', l:'Dryer',              w:0.6, h:0.6,  cat:'Bathroom',       color:'#e0f2fe' },
  'dishwasher':  { emoji:'🍽️', l:'Dishwasher',        w:0.6, h:0.6,  cat:'Kitchen',        color:'#dcfce7' },
  'oven':        { emoji:'🔥', l:'Oven / Hob',        w:0.6, h:0.6,  cat:'Kitchen',        color:'#fef9c3' },
  'bath':        { emoji:'🛁', l:'Bathtub',            w:1.7, h:0.75, cat:'Bathroom',       color:'#e0f2fe' },
  'shower':      { emoji:'🚿', l:'Shower',             w:0.9, h:0.9,  cat:'Bathroom',       color:'#e0f2fe' },
  'toilet':      { emoji:'🚽', l:'Toilet',             w:0.45,h:0.7,  cat:'Bathroom',       color:'#e0f2fe' },
  'sink-bath':   { emoji:'🪥', l:'Washbasin',         w:0.6, h:0.45, cat:'Bathroom',       color:'#e0f2fe' },
  'piano':       { emoji:'🎹', l:'Piano',              w:1.55,h:0.65, cat:'Living Room',    color:'#1e293b' },
  'tv':          { emoji:'📺', l:'TV',                 w:1.4, h:0.1,  cat:'Living Room',    color:'#334155' },
  'bookshelf':   { emoji:'📚', l:'Bookshelf',          w:0.8, h:0.3,  cat:'Study',          color:'#d97706' },
  'plant':       { emoji:'🌿', l:'Plant',              w:0.5, h:0.5,  cat:'Any',            color:'#bbf7d0' },
  'door':        { emoji:'🚪', l:'Door swing',         w:0.1, h:0.9,  cat:'Structure',      color:'#9ca3af' },
  'window':      { emoji:'🪟', l:'Window',             w:1.2, h:0.1,  cat:'Structure',      color:'#bae6fd' },
};
