// ============================================================
// preloaded.js — Actual floor plan from Wohnung Clformann
// Based on: Dachgeschoss blueprint + Wohnflächenberechnung
// Total usable area: 92.29 m²
// ============================================================

const PRELOADED_PLAN = {
  floors: [{
    id: 'f-dg',
    name: 'Apartment',
    rooms: [
      // ── Upper section ────────────────────────────────────────
      {
        id: 'r-schlaf',
        label: 'Master Bedroom',
        emoji: '🛏️',
        area: 17.08,
        color: '#dbeafe',
        x: 0.25, y: 0.25, w: 4.59, h: 3.89,
        notes: 'Schlafzimmer – 17.08 m²'
      },
      {
        id: 'r-bad',
        label: 'Bathroom',
        emoji: '🛁',
        area: 4.01,
        color: '#ccfbf1',
        x: 4.96, y: 0.25, w: 2.20, h: 2.37,
        notes: 'Bad – 4.01 m²'
      },
      {
        id: 'r-wc',
        label: 'WC',
        emoji: '🚽',
        area: 1.87,
        color: '#e0f2fe',
        x: 7.28, y: 0.25, w: 0.93, h: 2.01,
        notes: 'WC – 1.87 m²'
      },
      {
        id: 'r-kueche',
        label: 'Kitchen',
        emoji: '🍳',
        area: 13.11,
        color: '#dcfce7',
        x: 9.78, y: 0.25, w: 3.64, h: 3.69,
        notes: 'Küche – 13.11 m²'
      },
      {
        id: 'r-flur',
        label: 'Hallway',
        emoji: '🚪',
        area: 8.84,
        color: '#fef9c3',
        x: 4.96, y: 2.74, w: 4.70, h: 1.52,
        notes: 'Flur – 8.84 m² (includes staircase area)'
      },
      // ── Lower section ────────────────────────────────────────
      {
        id: 'r-kinder',
        label: "Children's Room",
        emoji: '🧒',
        area: 19.17,
        color: '#ede9fe',
        x: 0.25, y: 4.26, w: 4.37, h: 4.46,
        notes: 'Kinderzimmer – 19.17 m²'
      },
      {
        id: 'r-esszim',
        label: 'Study / Dining',
        emoji: '📚',
        area: 12.71,
        color: '#fce7f3',
        x: 4.74, y: 4.26, w: 3.60, h: 4.46,
        notes: 'Arbeitszimmer/Esszimmer – 12.71 m²'
      },
      {
        id: 'r-wohnzim',
        label: 'Living Room',
        emoji: '🛋️',
        area: 16.50,
        color: '#ffedd5',
        x: 8.46, y: 5.23, w: 4.96, h: 3.49,
        notes: 'Wohnzimmer – 16.50 m²'
      }
    ],
    furniture: []
  }],
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
function buildBlueprintAssetPath(fileName) {
  return '../blueprint_images/' + String(fileName || '')
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}
const PRELOADED_PLAN_BOUNDS = getPreloadedPlanBoundsMeters();

// Room color mapping (for cross-module use)
const ROOM_COLOR_MAP = {};
PRELOADED_PLAN.floors[0].rooms.forEach(r => { ROOM_COLOR_MAP[r.id] = r.color; });

function buildPreloadedPlanPixels() {
  const plan = JSON.parse(JSON.stringify(PRELOADED_PLAN));
  const sc = plan.scale || 45;
  plan.floors.forEach(fl => {
    (fl.rooms || []).forEach(r => {
      r.x = Math.round(r.x * sc);
      r.y = Math.round(r.y * sc);
      r.w = Math.round(r.w * sc);
      r.h = Math.round(r.h * sc);
    });
    if (fl.blueprint) {
      fl.blueprint.x = Math.round((Number(fl.blueprint.x) || 0) * sc);
      fl.blueprint.y = Math.round((Number(fl.blueprint.y) || 0) * sc);
    }
  });
  return plan;
}

const CELLAR_PRESET_FLOOR = {
  id: 'f-keller',
  name: 'Keller',
  rooms: [
    {
      id: 'r-keller-2',
      label: 'Keller 2',
      emoji: '📦',
      area: 22.08,
      color: '#dbeafe',
      x: 0.5, y: 4.08, w: 4.95, h: 4.46,
      notes: 'Your cellar room from the Kellergeschoss blueprint.'
    }
  ],
  furniture: []
};

function buildCellarPresetFloorPixels(scale = PRELOADED_PLAN.scale || 45) {
  const floor = JSON.parse(JSON.stringify(CELLAR_PRESET_FLOOR));
  (floor.rooms || []).forEach(room => {
    room.x = Math.round(room.x * scale);
    room.y = Math.round(room.y * scale);
    room.w = Math.round(room.w * scale);
    room.h = Math.round(room.h * scale);
  });
  return floor;
}

const PRELOADED_BLUEPRINTS = [
  {
    id: 'apt-dachgeschoss',
    label: 'Apartment Floor Plan',
    floorId: 'f-dg',
    floorName: 'Apartment',
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-14 at 18.02.47.jpeg'),
    widthM: 13.67,
    heightM: 8.97,
    x: 0,
    y: 0,
    opacity: 0.42,
    note: 'Measured Dachgeschoss blueprint aligned to the apartment room plan and room-area sheet.'
  },
  {
    id: 'apt-dachgeschoss-alt',
    label: 'Apartment Floor Plan · Alt Scan',
    floorId: 'f-dg',
    floorName: 'Apartment',
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-14 at 18.02.47 (1).jpeg'),
    widthM: 13.67,
    heightM: 8.97,
    x: 0,
    y: 0,
    opacity: 0.42,
    note: 'Alternative apartment blueprint scan from the same plan set.'
  },
  {
    id: 'keller-2',
    label: 'Keller 2 Cellar',
    floorId: 'f-keller',
    floorName: 'Keller',
    src: buildBlueprintAssetPath('WhatsApp Image 2026-03-17 at 18.31.21.jpeg'),
    widthM: 13.46,
    heightM: 8.79,
    x: 0,
    y: 0,
    opacity: 0.42,
    note: 'Kellergeschoss blueprint preset focused on your cellar room, Keller 2.'
  }
];

if (PRELOADED_PLAN?.floors?.[0] && PRELOADED_BLUEPRINTS.length) {
  const defaultBlueprintPreset = PRELOADED_BLUEPRINTS[0];
  PRELOADED_PLAN.floors[0].blueprint = {
    src: defaultBlueprintPreset.src,
    widthM: defaultBlueprintPreset.widthM,
    heightM: defaultBlueprintPreset.heightM,
    x: defaultBlueprintPreset.x,
    y: defaultBlueprintPreset.y,
    opacity: defaultBlueprintPreset.opacity,
    presetId: defaultBlueprintPreset.id,
    presetLabel: defaultBlueprintPreset.label
  };
  PRELOADED_PLAN.floors[0].storageNote = 'Keller 2';
}

window.PRELOADED_BLUEPRINTS = PRELOADED_BLUEPRINTS;
window.getPreloadedFloorPreset = function getPreloadedFloorPreset(presetId) {
  if (presetId === 'apt-dachgeschoss') return buildPreloadedPlanPixels().floors[0];
  if (presetId === 'keller-2') return buildCellarPresetFloorPixels();
  return null;
};

function hasSavedPlanContent(plan) {
  return !!(plan && Array.isArray(plan.floors) && plan.floors.length);
}

// Inject preloaded plan on first use (convert meter coords to pixels)
// Legacy saved plans are upgraded in place so existing user edits are never overwritten.
function maybeInjectPreloaded() {
  const saved = ldPlan();
  if (!hasSavedPlanContent(saved)) {
    svPlan(buildPreloadedPlanPixels());
    return;
  }

  const nextVersion = PRELOADED_PLAN._planVersion || 1;
  const shouldBackfillMeta = !saved._preloaded || (saved._planVersion || 0) < nextVersion;
  if (shouldBackfillMeta) {
    const nextPlan = {
      ...saved,
      floors: Array.isArray(saved.floors)
        ? saved.floors.map((floor, idx) => {
            if (idx !== 0) return floor;
            const nextFloor = { ...floor };
            const hasBlueprint = Boolean(nextFloor.blueprint?.src);
            const defaultPreset = PRELOADED_BLUEPRINTS[0];
            const sc = saved.scale || PRELOADED_PLAN.scale || 45;
            if (!hasBlueprint && defaultPreset) {
              nextFloor.blueprint = {
                src: defaultPreset.src,
                widthM: defaultPreset.widthM,
                heightM: defaultPreset.heightM,
                x: Math.round((Number(defaultPreset.x) || 0) * sc),
                y: Math.round((Number(defaultPreset.y) || 0) * sc),
                opacity: defaultPreset.opacity,
                presetId: defaultPreset.id,
                presetLabel: defaultPreset.label
              };
            }
            if (!nextFloor.storageNote) nextFloor.storageNote = 'Keller 2';
            return nextFloor;
          })
        : saved.floors,
      _preloaded: true,
      _planVersion: nextVersion
    };
    svPlan(nextPlan);
  }
}
