// ============================================================
// preloaded.js - Seed apartment data and blueprint presets
// Based on: Dachgeschoss floor plan + room-area sheet
// ============================================================

const PRELOADED_PLAN = {
  floors: [
    {
      id: 'f-dg',
      name: 'Dachgeschoss (Apartment)',
      rooms: [
        {
          id: 'r-schlaf',
          label: 'Master Bedroom',
          emoji: '🛏️',
          area: 17.08,
          color: '#dbeafe',
          x: 0.25, y: 0.25, w: 4.59, h: 3.89,
          notes: 'Schlafzimmer — 3.83 × 4.46 m = 17.08 m²'
        },
        {
          id: 'r-bad',
          label: 'Bathroom',
          emoji: '🛁',
          area: 4.01,
          color: '#ccfbf1',
          x: 4.96, y: 0.25, w: 2.20, h: 2.37,
          notes: 'Bad — 1.80 × 2.37 m = 4.01 m² (after deductions)'
        },
        {
          id: 'r-wc',
          label: 'WC',
          emoji: '🚽',
          area: 1.87,
          color: '#e0f2fe',
          x: 7.28, y: 0.25, w: 0.93, h: 2.01,
          notes: 'WC — 0.93 × 2.01 m = 1.87 m²'
        },
        {
          id: 'r-kueche',
          label: 'Kitchen',
          emoji: '🍳',
          area: 13.11,
          color: '#dcfce7',
          x: 9.78, y: 0.25, w: 3.64, h: 3.69,
          notes: 'Küche — 3.44 × 3.92 m = 13.11 m² (after deductions)'
        },
        {
          id: 'r-flur',
          label: 'Hallway',
          emoji: '🚪',
          area: 8.84,
          color: '#fef9c3',
          x: 4.96, y: 2.74, w: 4.70, h: 1.52,
          notes: 'Flur — 1.21 × 6.52 m base = 8.84 m² (L-shape, includes staircase area)'
        },
        {
          id: 'r-kinder',
          label: "Children's Room",
          emoji: '🧒',
          area: 19.17,
          color: '#ede9fe',
          x: 0.25, y: 4.26, w: 4.37, h: 4.46,
          notes: 'Kinderzimmer — 4.65 × 4.32 m = 19.17 m² (after deductions)'
        },
        {
          id: 'r-esszim',
          label: 'Study / Dining',
          emoji: '📚',
          area: 12.71,
          color: '#fce7f3',
          x: 4.74, y: 4.26, w: 3.60, h: 4.46,
          notes: 'Arbeitszimmer / Esszimmer — 3.57 × 3.57 m = 12.71 m² (after deductions)'
        },
        {
          id: 'r-wohnzim',
          label: 'Living Room',
          emoji: '🛋️',
          area: 16.50,
          color: '#ffedd5',
          x: 8.46, y: 5.23, w: 4.96, h: 3.49,
          notes: 'Wohnzimmer — 3.55 × 4.90 m = 16.50 m² (after deductions)'
        }
      ],
      furniture: []
    },
    // ── Kellergeschoss (Basement) ─────────────────────────────
    // Full basement layout from the Kellergeschoss blueprint.
    // Only Keller 2 is yours — other rooms are shared/neighbours.
    // Measurements are approximate from the blueprint proportions;
    // flag needsMeasurements so the UI can prompt to verify.
    {
      id: 'f-keller',
      name: 'Kellergeschoss (Basement)',
      storageNote: 'Keller 2',
      needsMeasurements: true,
      rooms: [
        {
          id: 'r-keller-2',
          label: 'Keller 2 (Ours)',
          emoji: '📦',
          area: 22.08,
          color: '#dbeafe',
          x: 0.50, y: 4.08, w: 4.95, h: 4.46,
          notes: 'Keller 2 — your storage cellar. ~4.95 × 4.46 m ≈ 22 m²'
        },
        {
          id: 'r-keller-1',
          label: 'Keller 1',
          emoji: '🔒',
          area: 0,
          color: '#e2e8f0',
          x: 0.50, y: 0.50, w: 4.06, h: 3.50,
          notes: 'Keller 1 — neighbour. Needs exact measurements.'
        },
        {
          id: 'r-keller-haus',
          label: 'Hausanschluss',
          emoji: '🔧',
          area: 0,
          color: '#fef9c3',
          x: 5.57, y: 4.08, w: 2.86, h: 4.46,
          notes: 'Hausanschluss-Keller — utility connections. Needs measurements.'
        },
        {
          id: 'r-keller-heiz',
          label: 'Heizraum',
          emoji: '🔥',
          area: 0,
          color: '#fed7aa',
          x: 7.50, y: 0.50, w: 2.33, h: 3.50,
          notes: 'Heizraum — boiler room. Needs measurements.'
        },
        {
          id: 'r-keller-elektro',
          label: 'Elektro-Zähler',
          emoji: '⚡',
          area: 0,
          color: '#e0f2fe',
          x: 5.57, y: 0.50, w: 1.87, h: 2.33,
          notes: 'Elektro-Zähler — meter room. Needs measurements.'
        },
        {
          id: 'r-keller-3',
          label: 'Keller 3',
          emoji: '🔒',
          area: 0,
          color: '#e2e8f0',
          x: 8.68, y: 4.08, w: 4.85, h: 4.46,
          notes: 'Keller 3 — neighbour. Needs measurements.'
        }
      ],
      blueprint: {
        src: 'blueprints/preloaded/keller-2-floorplan.jpeg',
        widthM: 13.46,
        heightM: 8.40,
        x: 0,
        y: 0,
        opacity: 0.42,
        presetId: 'keller-2',
        presetLabel: 'Keller 2 Cellar'
      },
      furniture: []
    }
  ],
  scale: 45,
  activeFloor: 0,
  _preloaded: true,
  _planVersion: 5
};

function getPreloadedPlanBoundsMeters() {
  const rooms = PRELOADED_PLAN?.floors?.[0]?.rooms || [];
  if (!rooms.length) return { minX:0, minY:0, widthM:12, heightM:8 };
  const minX = Math.min(...rooms.map(room => Number(room.x) || 0));
  const minY = Math.min(...rooms.map(room => Number(room.y) || 0));
  const maxX = Math.max(...rooms.map(room => (Number(room.x) || 0) + (Number(room.w) || 0)));
  const maxY = Math.max(...rooms.map(room => (Number(room.y) || 0) + (Number(room.h) || 0)));
  return {
    minX: Number(minX.toFixed(2)),
    minY: Number(minY.toFixed(2)),
    widthM: Number((maxX - minX).toFixed(2)),
    heightM: Number((maxY - minY).toFixed(2)),
  };
}

function buildBlueprintAssetPath(assetPath) {
  return String(assetPath || '')
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

const BLUEPRINT_ASSET_FILES = Object.freeze({
  apartmentFloorplan: 'blueprints/preloaded/apartment-floorplan.jpeg',
  apartmentMeasurements: 'blueprints/preloaded/apartment-measurements-sheet.jpeg',
  cellarFloorplan: 'blueprints/preloaded/keller-2-floorplan.jpeg',
});

function normalizeBlueprintSrc(src) {
  const value = String(src || '');
  if (!value) return '';
  const lower = value.toLowerCase();
  if (lower.includes('apartment-floorplan.jpeg') || lower.includes('whatsapp%20image%202026-03-14%20at%2018.02.47.jpeg')) {
    return buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.apartmentFloorplan);
  }
  if (lower.includes('apartment-measurements-sheet.jpeg') || lower.includes('whatsapp%20image%202026-03-14%20at%2018.02.47%20(1).jpeg')) {
    return buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.apartmentMeasurements);
  }
  if (lower.includes('keller-2-floorplan.jpeg') || lower.includes('whatsapp%20image%202026-03-17%20at%2018.31.21.jpeg')) {
    return buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.cellarFloorplan);
  }
  return value;
}

const PRELOADED_PLAN_BOUNDS = getPreloadedPlanBoundsMeters();

const CELLAR_PRESET_FLOOR = {
  id: 'f-keller',
  name: 'Keller',
  storageNote: 'Keller 2',
  needsMeasurements: true,
  rooms: [
    {
      // Keller 2 — your cellar room. Measurements from blueprint:
      // width: 4.95 m, depth: roughly 4.46 m (estimated from plan proportions)
      id: 'r-keller-2',
      label: 'Keller 2',
      emoji: '📦',
      area: 22.08,
      color: '#dbeafe',
      x: 0.50, y: 4.08, w: 4.95, h: 4.46,
      notes: 'Keller 2 — your storage cellar. ~22 m²'
    },
    {
      // Keller 1 — neighbouring cellar. Approximate from blueprint.
      id: 'r-keller-1',
      label: 'Keller 1',
      emoji: '🔒',
      area: 0,
      color: '#e2e8f0',
      x: 0.50, y: 0.50, w: 4.06, h: 3.50,
      notes: 'Keller 1 — neighbour cellar (not yours). Needs measurements.'
    },
    {
      // Hausanschluss-Keller — utility room between Keller 2 and 3
      id: 'r-keller-haus',
      label: 'Hausanschluss',
      emoji: '🔧',
      area: 0,
      color: '#fef9c3',
      x: 5.57, y: 4.08, w: 2.86, h: 4.46,
      notes: 'Hausanschluss-Keller — utility connections. Needs measurements.'
    },
    {
      // Heizraum — heating / boiler room, top right of basement
      id: 'r-keller-heiz',
      label: 'Heizraum',
      emoji: '🔥',
      area: 0,
      color: '#fed7aa',
      x: 7.50, y: 0.50, w: 2.33, h: 3.50,
      notes: 'Heizraum — heating / boiler room. Needs measurements.'
    },
    {
      // Elektro-Zähler — meter room, top centre
      id: 'r-keller-elektro',
      label: 'Elektro-Zähler',
      emoji: '⚡',
      area: 0,
      color: '#e0f2fe',
      x: 5.57, y: 0.50, w: 1.87, h: 2.33,
      notes: 'Elektro-Zähler — electric meter room. Needs measurements.'
    },
    {
      // Keller 3 — third cellar room, bottom right
      id: 'r-keller-3',
      label: 'Keller 3',
      emoji: '🔒',
      area: 0,
      color: '#e2e8f0',
      x: 8.68, y: 4.08, w: 4.85, h: 4.46,
      notes: 'Keller 3 — neighbour cellar (not yours). Needs measurements.'
    }
  ],
  blueprint: {
    src: buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.cellarFloorplan),
    widthM: 13.46,
    heightM: 8.40,
    x: 0,
    y: 0,
    opacity: 0.42,
    presetId: 'keller-2',
    presetLabel: 'Keller 2 Cellar'
  },
  furniture: []
};

const PRELOADED_BLUEPRINTS = [
  {
    id: 'apt-dachgeschoss',
    label: 'Apartment Floor Plan',
    floorId: 'f-dg',
    floorName: 'Apartment',
    defaultForFloor: true,
    src: buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.apartmentFloorplan),
    widthM: PRELOADED_PLAN_BOUNDS.widthM,
    heightM: PRELOADED_PLAN_BOUNDS.heightM,
    x: PRELOADED_PLAN_BOUNDS.minX,
    y: PRELOADED_PLAN_BOUNDS.minY,
    opacity: 0.42,
    note: 'Measured Dachgeschoss blueprint aligned to the seeded apartment rooms and room-area sheet.',
    storageNote: 'Keller 2'
  },
  {
    id: 'apt-dachgeschoss-alt',
    label: 'Apartment Room Sheet',
    floorId: 'f-dg',
    floorName: 'Apartment',
    defaultForFloor: false,
    src: buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.apartmentMeasurements),
    widthM: PRELOADED_PLAN_BOUNDS.widthM,
    heightM: PRELOADED_PLAN_BOUNDS.heightM,
    x: PRELOADED_PLAN_BOUNDS.minX,
    y: PRELOADED_PLAN_BOUNDS.minY,
    opacity: 0.32,
    note: 'Wohnflaechenberechnung sheet kept as a visual room-measurement reference.',
    storageNote: 'Keller 2'
  },
  {
    id: 'keller-2',
    label: 'Keller 2 Cellar',
    floorId: 'f-keller',
    floorName: 'Keller',
    defaultForFloor: true,
    src: buildBlueprintAssetPath(BLUEPRINT_ASSET_FILES.cellarFloorplan),
    widthM: 13.46,
    heightM: 8.40,
    x: 0,
    y: 0,
    opacity: 0.42,
    note: 'Kellergeschoss blueprint preset focused on your cellar room, Keller 2.',
    storageNote: 'Keller 2'
  }
];

const DEFAULT_APARTMENT_BLUEPRINT = PRELOADED_BLUEPRINTS.find(entry => entry.id === 'apt-dachgeschoss');
if (PRELOADED_PLAN?.floors?.[0] && DEFAULT_APARTMENT_BLUEPRINT) {
  PRELOADED_PLAN.floors[0].blueprint = {
    src: DEFAULT_APARTMENT_BLUEPRINT.src,
    widthM: DEFAULT_APARTMENT_BLUEPRINT.widthM,
    heightM: DEFAULT_APARTMENT_BLUEPRINT.heightM,
    x: DEFAULT_APARTMENT_BLUEPRINT.x,
    y: DEFAULT_APARTMENT_BLUEPRINT.y,
    opacity: DEFAULT_APARTMENT_BLUEPRINT.opacity,
    presetId: DEFAULT_APARTMENT_BLUEPRINT.id,
    presetLabel: DEFAULT_APARTMENT_BLUEPRINT.label
  };
  PRELOADED_PLAN.floors[0].storageNote = DEFAULT_APARTMENT_BLUEPRINT.storageNote;
}

const ROOM_COLOR_MAP = {};
PRELOADED_PLAN.floors.forEach(floor => {
  (floor.rooms || []).forEach(room => {
    ROOM_COLOR_MAP[room.id] = room.color;
  });
});

function buildPlanPixels(plan) {
  const next = JSON.parse(JSON.stringify(plan));
  const scale = next.scale || PRELOADED_PLAN.scale || 45;
  next.floors.forEach(floor => {
    (floor.rooms || []).forEach(room => {
      room.x = Math.round(room.x * scale);
      room.y = Math.round(room.y * scale);
      room.w = Math.round(room.w * scale);
      room.h = Math.round(room.h * scale);
    });
    if (floor.blueprint) {
      floor.blueprint.x = Math.round((Number(floor.blueprint.x) || 0) * scale);
      floor.blueprint.y = Math.round((Number(floor.blueprint.y) || 0) * scale);
    }
  });
  return next;
}

function buildPreloadedPlanPixels() {
  return buildPlanPixels(PRELOADED_PLAN);
}

function buildCellarPresetFloorPixels(scale = PRELOADED_PLAN.scale || 45) {
  const plan = buildPlanPixels({ floors:[CELLAR_PRESET_FLOOR], scale, activeFloor:0 });
  return plan.floors[0];
}

window.PRELOADED_BLUEPRINTS = PRELOADED_BLUEPRINTS;
window.getPreloadedFloorPreset = function getPreloadedFloorPreset(presetId) {
  if (presetId === 'apt-dachgeschoss' || presetId === 'apt-dachgeschoss-alt') {
    const floor = buildPreloadedPlanPixels().floors.find(entry => entry.id === 'f-dg');
    return floor ? JSON.parse(JSON.stringify(floor)) : null;
  }
  if (presetId === 'keller-2') {
    // Return full keller floor from the main preloaded plan (includes all rooms)
    const floor = buildPreloadedPlanPixels().floors.find(entry => entry.id === 'f-keller');
    return floor ? JSON.parse(JSON.stringify(floor)) : buildCellarPresetFloorPixels();
  }
  return null;
};

function hasSavedPlanContent(plan) {
  return !!(plan && Array.isArray(plan.floors) && plan.floors.length);
}

function maybeInjectPreloaded() {
  const saved = ldPlan();
  if (!hasSavedPlanContent(saved)) {
    svPlan(buildPreloadedPlanPixels());
    return;
  }

  const nextVersion = PRELOADED_PLAN._planVersion || 1;
  const shouldBackfillMeta = !saved._preloaded || (saved._planVersion || 0) < nextVersion;
  if (!shouldBackfillMeta) return;

  const scale = saved.scale || PRELOADED_PLAN.scale || 45;
  const presetByFloorId = {};
  PRELOADED_BLUEPRINTS.forEach(preset => {
    if (!preset.floorId || preset.defaultForFloor === false || presetByFloorId[preset.floorId]) return;
    presetByFloorId[preset.floorId] = preset;
  });
  const nextFloors = Array.isArray(saved.floors)
    ? saved.floors.map(floor => {
        const preset = presetByFloorId[floor.id];
        if (!preset) return floor;
        const nextFloor = { ...floor };
        const hasBlueprint = Boolean(nextFloor.blueprint?.src);
        if (!hasBlueprint) {
          nextFloor.blueprint = {
            src: preset.src,
            widthM: preset.widthM,
            heightM: preset.heightM,
            x: Math.round((Number(preset.x) || 0) * scale),
            y: Math.round((Number(preset.y) || 0) * scale),
            opacity: preset.opacity,
            presetId: preset.id,
            presetLabel: preset.label
          };
        } else if (nextFloor.blueprint?.src) {
          nextFloor.blueprint = {
            ...nextFloor.blueprint,
            src: normalizeBlueprintSrc(nextFloor.blueprint.src),
          };
          if (!nextFloor.blueprint.presetId && preset.id) nextFloor.blueprint.presetId = preset.id;
          if (!nextFloor.blueprint.presetLabel && preset.label) nextFloor.blueprint.presetLabel = preset.label;
        }
        if (!nextFloor.storageNote && preset.storageNote) {
          nextFloor.storageNote = preset.storageNote;
        }
        return nextFloor;
      })
    : [];

  // Inject keller floor if missing (added in v5)
  const hasKeller = nextFloors.some(f => f.id === 'f-keller');
  if (!hasKeller) {
    const kellerFloor = buildPreloadedPlanPixels().floors.find(f => f.id === 'f-keller');
    if (kellerFloor) nextFloors.push(kellerFloor);
  }

  // Update emojis on DG rooms if they still have the old ?? placeholder
  const dgFloor = nextFloors.find(f => f.id === 'f-dg');
  if (dgFloor) {
    const emojiMap = {
      'r-schlaf':'🛏️','r-bad':'🛁','r-wc':'🚽','r-kueche':'🍳',
      'r-flur':'🚪','r-kinder':'🧒','r-esszim':'📚','r-wohnzim':'🛋️'
    };
    (dgFloor.rooms || []).forEach(r => {
      if (r.emoji === '??' && emojiMap[r.id]) r.emoji = emojiMap[r.id];
    });
  }

  svPlan({
    ...saved,
    floors: nextFloors,
    _preloaded: true,
    _planVersion: nextVersion
  });
}
