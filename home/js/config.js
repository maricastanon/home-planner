// ============================================================
// config.js — Unser neues Zuhause · Global constants & config
// ============================================================

// Storage keys
const K = {
  plan:    'hnz_plan',
  floors:  'hnz_floors',
  move:    'hnz_move',
  take:    'hnz_take',
  boxes:   'hnz_boxes',
  sell:    'hnz_sell',
  buy:     'hnz_buy',
  compare: 'hnz_cmp',
  settings:'hnz_settings',
  activity:'hnz_activity',
  undoStack:'hnz_undo',
};

// App meta
const APP_NAME = 'Unser neues Zuhause';
const APP_VERSION = '2.0';

// Color palette (same family as apartment search)
const COLORS = {
  pk:  '#e91e63', pks: '#c2185b', pk2: '#f48fb1', pkl: '#fce4ec',
  gn:  '#2e7d32', gns: '#1b5e20', gnl: '#e8f5e9',
  bl:  '#1565c0', bll: '#e3f2fd',
  or:  '#e65100', orl: '#fff3e0',
  pur: '#7b1fa2', purl:'#f3e5f5',
  bd:  '#2c3e50', bg:  '#fafafa',
};

// Room types
const ROOM_TYPES = [
  { k:'wohnzimmer', l:'Wohnzimmer',   i:'🛋️', color:'#fce4ec' },
  { k:'schlafzimmer',l:'Schlafzimmer',i:'🛏️', color:'#e3f2fd' },
  { k:'kueche',    l:'Küche',         i:'🍳', color:'#e8f5e9' },
  { k:'bad',       l:'Bad',           i:'🚿', color:'#e0f7fa' },
  { k:'buero',     l:'Büro / Arbeitszimmer', i:'🖥️', color:'#fff9c4' },
  { k:'eingang',   l:'Eingang / Flur',i:'🚪', color:'#ffe0b2' },
  { k:'abstellraum',l:'Abstellraum',  i:'📦', color:'#f5f5f5' },
  { k:'keller',    l:'Keller',        i:'🏚️', color:'#eceff1' },
  { k:'balkon',    l:'Balkon / Terrasse',i:'🌿',color:'#dcedc8' },
  { k:'custom',    l:'Sonstig',       i:'▭',  color:'#f3e5f5' },
];

// Furniture / objects for floor plan
const FURNITURE = {
  // Bedroom
  'bed-double':  { emoji:'🛏️', l:'Doppelbett',     w:4.0, h:3.2, cat:'Schlafzimmer', color:'#bbdefb' },
  'bed-single':  { emoji:'🛏️', l:'Einzelbett',     w:2.5, h:4.0, cat:'Schlafzimmer', color:'#bbdefb' },
  'wardrobe':    { emoji:'🚪', l:'Kleiderschrank',  w:3.5, h:0.8, cat:'Schlafzimmer', color:'#d7ccc8' },
  'dresser':     { emoji:'🪞', l:'Kommode',         w:2.0, h:0.8, cat:'Schlafzimmer', color:'#d7ccc8' },
  'nightstand':  { emoji:'🕯️', l:'Nachttisch',      w:0.8, h:0.8, cat:'Schlafzimmer', color:'#d7ccc8' },
  // Living
  'sofa':        { emoji:'🛋️', l:'Sofa',            w:5.0, h:2.2, cat:'Wohnzimmer',  color:'#f8bbd0' },
  'sofa-l':      { emoji:'🛋️', l:'Sofa L-Form',     w:5.5, h:3.5, cat:'Wohnzimmer',  color:'#f8bbd0' },
  'armchair':    { emoji:'🛋️', l:'Sessel',          w:2.0, h:2.0, cat:'Wohnzimmer',  color:'#f8bbd0' },
  'table-coffee':{ emoji:'☕', l:'Couchtisch',       w:2.5, h:1.5, cat:'Wohnzimmer',  color:'#d7ccc8' },
  'table-dining':{ emoji:'🪑', l:'Esstisch',        w:3.5, h:2.0, cat:'Wohnzimmer',  color:'#d7ccc8' },
  'tv':          { emoji:'📺', l:'TV',               w:2.5, h:0.3, cat:'Wohnzimmer',  color:'#b0bec5' },
  'tv-stand':    { emoji:'📺', l:'TV-Schrank',       w:2.5, h:0.6, cat:'Wohnzimmer',  color:'#d7ccc8' },
  'bookshelf':   { emoji:'📚', l:'Bücherregal',      w:2.5, h:0.5, cat:'Wohnzimmer',  color:'#d7ccc8' },
  'piano':       { emoji:'🎹', l:'Klavier / Piano',  w:3.5, h:1.5, cat:'Wohnzimmer',  color:'#263238' },
  // Kitchen
  'fridge':      { emoji:'🧊', l:'Kühlschrank',      w:1.0, h:0.8, cat:'Küche',        color:'#e0f2f1' },
  'fridge-combo':{ emoji:'🧊', l:'Kühl-Gefrier',    w:1.0, h:0.8, cat:'Küche',        color:'#e0f2f1' },
  'washer':      { emoji:'🫧', l:'Waschmaschine',    w:1.0, h:0.8, cat:'Bad/Küche',   color:'#e1f5fe' },
  'dryer':       { emoji:'💨', l:'Trockner',         w:1.0, h:0.8, cat:'Bad/Küche',   color:'#e1f5fe' },
  'dishwasher':  { emoji:'🍽️', l:'Spülmaschine',    w:1.0, h:0.8, cat:'Küche',        color:'#e0f2f1' },
  'oven':        { emoji:'🔥', l:'Herd / Ofen',      w:2.0, h:0.8, cat:'Küche',        color:'#e0e0e0' },
  'counter':     { emoji:'🔲', l:'Arbeitsplatte',    w:3.0, h:0.8, cat:'Küche',        color:'#f5f5f5' },
  // Bathroom
  'bath':        { emoji:'🛁', l:'Badewanne',        w:3.5, h:1.5, cat:'Bad',          color:'#e1f5fe' },
  'shower':      { emoji:'🚿', l:'Dusche',           w:1.5, h:1.5, cat:'Bad',          color:'#e1f5fe' },
  'toilet':      { emoji:'🚽', l:'Toilette',         w:0.9, h:1.4, cat:'Bad',          color:'#e1f5fe' },
  'sink-bath':   { emoji:'🪥', l:'Waschbecken',      w:1.0, h:0.7, cat:'Bad',          color:'#e1f5fe' },
  'sink-kitchen':{ emoji:'🚿', l:'Küchenspüle',      w:1.2, h:0.7, cat:'Küche',        color:'#b2dfdb' },
  // Office
  'desk':        { emoji:'🖥️', l:'Schreibtisch',     w:3.5, h:1.5, cat:'Büro',         color:'#fff9c4' },
  'desk-corner': { emoji:'🖥️', l:'Eckschreibtisch',  w:4.0, h:4.0, cat:'Büro',         color:'#fff9c4' },
  'chair-office':{ emoji:'🪑', l:'Bürostuhl',        w:1.0, h:1.0, cat:'Büro',         color:'#e8f5e9' },
  'chair-dining':{ emoji:'🪑', l:'Essstuhl',         w:0.8, h:0.8, cat:'Wohnzimmer',   color:'#d7ccc8' },
  // Other
  'plant-large': { emoji:'🌿', l:'Große Pflanze',    w:0.8, h:0.8, cat:'Deko',         color:'#c8e6c9' },
  'lamp-floor':  { emoji:'💡', l:'Stehlampe',        w:0.5, h:0.5, cat:'Deko',         color:'#fff9c4' },
  'door':        { emoji:'🚪', l:'Tür',              w:0.2, h:1.5, cat:'Struktur',     color:'#a1887f' },
  'window':      { emoji:'🪟', l:'Fenster',          w:1.5, h:0.2, cat:'Struktur',     color:'#b3e5fc' },
};

// Furniture categories for grouping in toolbar
const FURN_CATS = ['Schlafzimmer','Wohnzimmer','Küche','Bad','Büro','Struktur','Deko'];

// Move company statuses
const COMPANY_STATUS = [
  { k:'anfragen',  l:'Anfragen',          e:'📤', c:'gray'   },
  { k:'angebot',   l:'Angebot erhalten',  e:'📋', c:'blue'   },
  { k:'termin',    l:'Besichtigung',       e:'👁️', c:'orange' },
  { k:'gebucht',   l:'Gebucht ✓',         e:'✅', c:'green'  },
  { k:'abgesagt',  l:'Abgesagt',          e:'❌', c:'pink'   },
];

// Item conditions
const CONDITIONS = [
  { k:'neu',      l:'Neu (unbenutzt)', e:'✨' },
  { k:'sehr-gut', l:'Sehr gut',        e:'👍' },
  { k:'gut',      l:'Gut',             e:'👌' },
  { k:'gebraucht',l:'Gebraucht',       e:'🔧' },
  { k:'defekt',   l:'Defekt / Bastler',e:'⚠️' },
];

// Sell platforms
const SELL_PLATFORMS = [
  { k:'ebay',  l:'eBay Kleinanzeigen', e:'🟠', css:'ebay'  },
  { k:'fb',    l:'Facebook Marketplace',e:'🔵',css:'fb'   },
  { k:'local', l:'Lokal / Nachbar',   e:'🏘️', css:'local' },
  { k:'flohm', l:'Flohmarkt',         e:'🎪', css:'gray'  },
  { k:'give',  l:'Verschenken',       e:'🎁', css:'green' },
];

// Sell statuses
const SELL_STATUS = [
  { k:'active',   l:'Verfügbar',  e:'🟢', c:'green' },
  { k:'reserved', l:'Reserviert', e:'🟡', c:'orange'},
  { k:'sold',     l:'Verkauft',   e:'✅', c:'sold'  },
  { k:'donated',  l:'Verschenkt', e:'🎁', c:'blue'  },
  { k:'discarded',l:'Entsorgt',   e:'🗑️', c:'gray'  },
];

// Buy categories
const BUY_CATS = [
  { k:'Möbel',       l:'Möbel',            e:'🛋️' },
  { k:'Elektronik',  l:'Elektronik',        e:'🔌' },
  { k:'Haushaltsgeräte', l:'Haushaltsgeräte',e:'🏠'},
  { k:'Küche',       l:'Küche',             e:'🍳' },
  { k:'Bad',         l:'Bad',               e:'🚿' },
  { k:'Schlafzimmer',l:'Schlafzimmer',      e:'🛏️' },
  { k:'Deko',        l:'Deko & Pflanzen',   e:'🌸' },
  { k:'Büro',        l:'Büro & Tech',       e:'🖥️' },
  { k:'Sonstiges',   l:'Sonstiges',         e:'📋' },
];

// Buy priorities
const BUY_PRIOS = [
  { k:'must', l:'Must-have', e:'🔴', w:3 },
  { k:'want', l:'Want',      e:'🟡', w:2 },
  { k:'nice', l:'Nice to have', e:'🟢', w:1 },
];

// Compare categories with their key features
const CMP_CATS = {
  'Kühlschrank':    { e:'🧊', feats:['Kapazität (L)','Energieklasse','Gefrierteil','Breite (cm)','Höhe (cm)','Lautstärke (dB)'] },
  'Waschmaschine':  { e:'🫧', feats:['Fassungsvermögen (kg)','Schleudergang (U/min)','Energieklasse','Wasserverbrauch (L)','Lautstärke (dB)'] },
  'Trockner':       { e:'💨', feats:['Fassungsvermögen (kg)','Energieklasse','Art','Lautstärke (dB)'] },
  'Herd/Backofen':  { e:'🔥', feats:['Art','Backofenvolumen (L)','Anzahl Platten','Reinigung'] },
  'Spülmaschine':   { e:'🍽️', feats:['Maßgedecke','Energieklasse','Wasserverbrauch (L)','Lautstärke (dB)','Breite (cm)'] },
  'TV':             { e:'📺', feats:['Größe (Zoll)','Auflösung','Smart TV','HDR','Bildwiederholrate (Hz)'] },
  'Sofa':           { e:'🛋️', feats:['Breite (cm)','Tiefe (cm)','Schlafsofafunktion','Material','Farbe'] },
  'Bett':           { e:'🛏️', feats:['Größe (cm)','Bettkasten','Material','Lattenrost inkl.'] },
  'Schreibtisch':   { e:'🖥️', feats:['Breite (cm)','Tiefe (cm)','Höhenverstellbar','Kabelmanagement'] },
  'Sonstiges':      { e:'📋', feats:['Maße','Material','Besonderheit'] },
};

// Energy efficiency colors
const ENERGY_COLORS = {
  'A+++':'#1b5e20','A++':'#2e7d32','A+':'#43a047','A':'#66bb6a',
  'B':'#ffb300','C':'#fb8c00','D':'#ef6c00','E':'#e53935','F':'#b71c1c','G':'#880e4f',
};

// Owner options
const OWNERS = [
  { k:'Mari', l:'Mari',      e:'🌸' },
  { k:'Alex', l:'Alexander', e:'💼' },
  { k:'Beide',l:'Beide',     e:'💕' },
];

// Weight classes
const WEIGHT_CLASSES = [
  { k:'leicht', l:'Leicht (< 10 kg)',  e:'🪶' },
  { k:'mittel', l:'Mittel (10-30 kg)', e:'💪' },
  { k:'schwer', l:'Schwer (> 30 kg)',  e:'🏋️' },
];

// Rooms for take/sell/buy filters
const ROOMS_LIST = ['Wohnzimmer','Schlafzimmer','Küche','Bad','Büro','Keller/Lager','Flur','Sonstiges'];

// Default settings
const DEFAULT_SETTINGS = {
  moveDate: '',
  apartmentAddress: '',
  fromAddress: '',
  maxBudget: 3000,
  names: { M: 'Mari', A: 'Alexander' },
};
