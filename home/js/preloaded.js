// ============================================================
// preloaded.js - Seed apartment data and blueprint presets
// Based on: Dachgeschoss floor plan + room-area sheet
// ============================================================

const PRELOADED_PLAN = {
  floors: [
    {
      id: 'f-dg',
      name: 'Apartment',
      rooms: [
        {
          id: 'r-schlaf',
          label: 'Master Bedroom',
          emoji: '??',
          area: 17.08,
          color: '#dbeafe',
          x: 0.25, y: 0.25, w: 4.59, h: 3.89,
          notes: 'Schlafzimmer - 17.08 m2'
        },
        {
          id: 'r-bad',
          label: 'Bathroom',
          emoji: '??',
          area: 4.01,
          color: '#ccfbf1',
          x: 4.96, y: 0.25, w: 2.20, h: 2.37,
          notes: 'Bad - 4.01 m2'
        },
        {
          id: 'r-wc',
          label: 'WC',
          emoji: '??',
          area: 1.87,
          color: '#e0f2fe',
          x: 7.28, y: 0.25, w: 0.93, h: 2.01,
          notes: 'WC - 1.87 m2'
        },
        {
          id: 'r-kueche',
          label: 'Kitchen',
          emoji: '??',
          area: 13.11,
          color: '#dcfce7',
          x: 9.78, y: 0.25, w: 3.64, h: 3.69,
          notes: 'Kueche - 13.11 m2'
        },
        {
          id: 'r-flur',
          label: 'Hallway',
          emoji: '??',
          area: 8.84,
          color: '#fef9c3',
          x: 4.96, y: 2.74, w: 4.70, h: 1.52,
          notes: 'Flur - 8.84 m2 (includes staircase area)'
        },
        {
          id: 'r-kinder',
          label: "Children's Room",
          emoji: '??',
          area: 19.17,
          color: '#ede9fe',
          x: 0.25, y: 4.26, w: 4.37, h: 4.46,
          notes: 'Kinderzimmer - 19.17 m2'
        },
        {
          id: 'r-esszim',
          label: 'Study / Dining',
          emoji: '??',
          area: 12.71,
          color: '#fce7f3',
          x: 4.74, y: 4.26, w: 3.60, h: 4.46,
          notes: 'Arbeitszimmer / Esszimmer - 12.71 m2'
        },
        {
          id: 'r-wohnzim',
          label: 'Living Room',
          emoji: '??',
          area: 16.50,
          color: '#ffedd5',
          x: 8.46, y: 5.23, w: 4.96, h: 3.49,
          notes: 'Wohnzimmer - 16.50 m2'
        }
      ],
      furniture: []
    }
  ],
  scale: 45,
  activeFloor: 0,
  _preloaded: true,
  _planVersion: 3
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

const PRELOADED_PLAN_BOUNDS = getPreloadedPlanBoundsMeters();

const CELLAR_PRESET_FLOOR = {
  id: 'f-keller',
  name: 'Keller',
  storageNote: 'Keller 2',
  rooms: [
    {
      id: 'r-keller-2',
      label: 'Keller 2',
      emoji: '??',
      area: 22.08,
      color: '#dbeafe',
      x: 0.50, y: 4.08, w: 4.95, h: 4.46,
      notes: 'Your cellar room from the Kellergeschoss blueprint.'
    }
  ],
  blueprint: {
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-17 at 18.31.21.jpeg'),
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
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-14 at 18.02.47.jpeg'),
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
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-14 at 18.02.47 (1).jpeg'),
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
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-17 at 18.31.21.jpeg'),
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
  if (presetId === 'keller-2') return buildCellarPresetFloorPixels();
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
        }
        if (!nextFloor.storageNote && preset.storageNote) {
          nextFloor.storageNote = preset.storageNote;
        }
        return nextFloor;
      })
    : [];

  svPlan({
    ...saved,
    floors: nextFloors,
    _preloaded: true,
    _planVersion: nextVersion
  });
}
