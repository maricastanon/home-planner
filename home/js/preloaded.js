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
  _planVersion: 2
};

// Room color mapping (for cross-module use)
const ROOM_COLOR_MAP = {};
PRELOADED_PLAN.floors[0].rooms.forEach(r => { ROOM_COLOR_MAP[r.id] = r.color; });

// Inject preloaded plan on first use (convert meter coords to pixels)
function maybeInjectPreloaded() {
  const saved = ld(K.plan, null);
  const needsInject = !saved || !saved._preloaded;
  const needsUpdate = saved && saved._preloaded && (!saved._planVersion || saved._planVersion < 2);
  if (needsInject || needsUpdate) {
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
