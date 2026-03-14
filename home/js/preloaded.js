// ============================================================
// preloaded.js — Actual floor plan from Wohnung Clformann
// Based on: Dachgeschoss blueprint + Wohnflächenberechnung
// Total usable area: 92.29 m²
// ============================================================

const PRELOADED_PLAN = {
  floors: [{
    id: 'f-dg',
    name: 'Dachgeschoss (Upper Floor)',
    rooms: [
      // ── Upper section ────────────────────────────────────────
      {
        id: 'r-schlaf',
        label: 'Master Bedroom',
        emoji: '🛏️',
        area: 17.08,
        color: '#dbeafe',
        x: 0.25, y: 0.25, w: 4.47, h: 3.65,
        notes: 'Eltern – 17.08 m²'
      },
      {
        id: 'r-bad',
        label: 'Bathroom',
        emoji: '🛁',
        area: 4.01,
        color: '#ccfbf1',
        x: 4.84, y: 0.25, w: 1.68, h: 2.46,
        notes: 'Bad – 4.01 m²'
      },
      {
        id: 'r-wc',
        label: 'WC',
        emoji: '🚽',
        area: 1.87,
        color: '#e0f2fe',
        x: 4.84, y: 2.83, w: 0.93, h: 1.31,
        notes: 'WC – 1.87 m²'
      },
      {
        id: 'r-kueche',
        label: 'Kitchen',
        emoji: '🍳',
        area: 13.11,
        color: '#dcfce7',
        x: 7.69, y: 0.25, w: 3.64, h: 3.57,
        notes: 'Küche – 13.11 m²'
      },
      {
        id: 'r-flur',
        label: 'Hallway',
        emoji: '🚪',
        area: 8.84,
        color: '#fef9c3',
        x: 4.84, y: 2.83, w: 2.97, h: 1.31,
        notes: 'Flur – 8.84 m² (includes staircase area)'
      },
      // ── Lower section ────────────────────────────────────────
      {
        id: 'r-kinder',
        label: "Children's Room",
        emoji: '🧒',
        area: 18.17,
        color: '#ede9fe',
        x: 0.25, y: 4.26, w: 4.25, h: 4.20,
        notes: 'Kinderzimmer – 18.17 m²'
      },
      {
        id: 'r-esszim',
        label: 'Study / Dining',
        emoji: '📚',
        area: 12.71,
        color: '#fce7f3',
        x: 4.62, y: 4.26, w: 3.48, h: 4.20,
        notes: 'Arbeitszimmer/Esszimmer – 12.71 m²'
      },
      {
        id: 'r-wohnzim',
        label: 'Living Room',
        emoji: '🛋️',
        area: 16.50,
        color: '#ffedd5',
        x: 8.22, y: 4.26, w: 4.84, h: 3.49,
        notes: 'Wohnzimmer – 16.50 m²'
      }
    ],
    furniture: []
  }],
  scale: 45,
  activeFloor: 0,
  _preloaded: true
};

// Room color mapping (for cross-module use)
const ROOM_COLOR_MAP = {};
PRELOADED_PLAN.floors[0].rooms.forEach(r => { ROOM_COLOR_MAP[r.id] = r.color; });

// Inject preloaded plan on first use (convert meter coords to pixels)
function maybeInjectPreloaded() {
  const saved = ld(K.plan, null);
  // Fresh install or broken old data (rooms stored in meters, all coords < 10)
  const needsInject = !saved || !saved._preloaded;
  const needsFix = saved && saved._preloaded && saved.floors?.[0]?.rooms?.[0]?.w < 10;
  if (needsInject || needsFix) {
    const plan = JSON.parse(JSON.stringify(PRELOADED_PLAN));
    const sc = plan.scale || 45;
    plan.floors.forEach(fl => {
      (fl.rooms || []).forEach(r => {
        r.x = Math.round(r.x * sc);
        r.y = Math.round(r.y * sc);
        r.w = Math.round(r.w * sc);
        r.h = Math.round(r.h * sc);
      });
    });
    svPlan(plan);
  }
}
