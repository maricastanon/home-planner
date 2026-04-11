const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', 'home');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const seedData = {
  hnz_settings: {
    moveDate: '',
    newAddress: 'Optimizer Street 8',
    oldAddress: '',
    maxBudget: 10000,
    names: { M: 'Mari', A: 'Alexander' }
  },
  hnz_plan: {
    floors: [{
      id: 'f-main',
      name: 'Main Floor',
      rooms: [
        { id: 'r-living', label: 'Living Room', color: '#ffedd5', x: 40, y: 40, w: 360, h: 260, area: '46.2' },
        { id: 'r-kueche', label: 'Kitchen', color: '#dcfce7', x: 430, y: 40, w: 220, h: 180, area: '19.6' }
      ],
      furniture: []
    }],
    scale: 45,
    activeFloor: 0,
    _preloaded: true,
    _planVersion: 2
  },
  hnz_buy: [
    {
      id: 'buy-sofa-old',
      name: 'Family Sofa',
      category: 'Furniture',
      type: 'Sofa',
      source: 'existing',
      moveDecision: 'take',
      roomId: 'r-living',
      roomRole: 'must',
      optionGroup: '',
      price: 900,
      voteM: 'yes',
      voteA: 'yes',
      itemStatus: 'placed',
      bought: false,
      widthCm: 220,
      depthCm: 90,
      heightCm: 85,
      photos: []
    },
    {
      id: 'buy-desk-small',
      name: 'Desk Mini',
      category: 'Furniture',
      type: 'Desk',
      source: 'new',
      moveDecision: 'buy',
      roomId: 'r-living',
      roomRole: 'candidate',
      optionGroup: 'Desk shortlist',
      price: 220,
      voteM: 'yes',
      voteA: 'meh',
      itemStatus: 'researching',
      bought: false,
      widthCm: 120,
      depthCm: 60,
      heightCm: 74,
      photos: []
    },
    {
      id: 'buy-desk-wide',
      name: 'Desk Wide',
      category: 'Furniture',
      type: 'Desk',
      source: 'new',
      moveDecision: 'consider',
      roomId: 'r-living',
      roomRole: 'candidate',
      optionGroup: 'Desk shortlist',
      price: 330,
      voteM: 'meh',
      voteA: 'yes',
      itemStatus: 'wishlist',
      bought: false,
      widthCm: 180,
      depthCm: 80,
      heightCm: 74,
      photos: []
    }
  ],
  hnz_cmp: [
    {
      id: 'cmp-fridge-compact',
      name: 'Compact Fridge',
      category: 'Fridge',
      optionGroup: 'Kitchen fridge shortlist',
      roomId: 'r-kueche',
      price: 799,
      ratingM: 5,
      ratingA: 4,
      energyRating: 'A++',
      warranty: '2 years',
      buyLink: '',
      pros: ['Slim width'],
      cons: [],
      widthCm: 55,
      depthCm: 60,
      heightCm: 185,
      notes: '',
      voteM: '',
      voteA: '',
      photos: ['https://example.com/fridge-compact.jpg'],
      created: Date.now()
    },
    {
      id: 'cmp-fridge-family',
      name: 'Family Fridge',
      category: 'Fridge',
      optionGroup: 'Kitchen fridge shortlist',
      roomId: 'r-kueche',
      price: 1199,
      ratingM: 4,
      ratingA: 5,
      energyRating: 'A+',
      warranty: '3 years',
      buyLink: '',
      pros: ['Large capacity'],
      cons: ['Deeper'],
      widthCm: 70,
      depthCm: 75,
      heightCm: 200,
      notes: '',
      voteM: '',
      voteA: '',
      photos: ['https://example.com/fridge-family.jpg'],
      created: Date.now()
    }
  ],
  hnz_scenario: {
    compareChoices: {
      'Kitchen fridge shortlist': 'cmp-fridge-compact'
    }
  },
  hnz_activity: []
};

function createServer() {
  return http.createServer((req, res) => {
    const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relPath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

async function run() {
  const server = createServer();
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    await page.goto('http://127.0.0.1:4175/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(data => {
      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }, seedData);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.HomeApp.boot({
        email: 'planner@example.com',
        username: 'planner@example.com',
        groups: ['tester']
      });
    });

    const state = await page.evaluate(() => {
      const budget = getBudgetStats();
      switchTab('plan');
      selectRoom('r-living');
      switchPlanToolsTab('optimizer');
      const optimizerText = document.getElementById('plan-tools-content')?.textContent || '';

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#ffffff"/><path d="M10 10 H390 V190 H10 Z" stroke="#111827" stroke-width="6" fill="none"/></svg>`;
      const blueprint = getFloorBlueprint();
      Object.assign(blueprint, {
        src: `data:image/svg+xml;base64,${btoa(svg)}`,
        widthM: 12,
        heightM: 6,
        x: 10,
        y: 20,
        opacity: 0.4
      });
      savePlan();
      renderPlan();
      renderPlanToolsPanel();
      const blueprintReady = Boolean(hasFloorBlueprint() && getBlueprintBounds());

      switchTab('cmp');
      const scenarioBefore = document.getElementById('cmp-scenario-panel')?.textContent || '';
      setCmpScenarioSelection('Kitchen fridge shortlist', 'cmp-fridge-family');
      const scenarioAfter = document.getElementById('cmp-scenario-panel')?.textContent || '';

      switchTab('buy');
      switchBuySubtab('roommap');
      const roomMapText = document.getElementById('room-map-content')?.textContent || '';
      switchBuySubtab('3d');
      const room3dText = document.getElementById('room-3d-content')?.textContent || '';
      const room3dHasSvg = Boolean(document.querySelector('#room-3d-content svg'));
      switchBuySubtab('wishlist');
      const wishlistText = document.getElementById('wishlist-planner-content')?.textContent || '';
      setWishlistMustPlace('buy-desk-small', true);
      const deskAfterPin = getBuyItem('buy-desk-small');
      switchBuySubtab('decision');
      const decisionLabText = document.getElementById('decision-lab-content')?.textContent || '';
      autoPlaceWholeHomeInPlan('reuse-first');
      const sofaPlaced = getBuyItem('buy-sofa-old');
      const deskPlaced = getBuyItem('buy-desk-small');
      const wideDeskPlaced = getBuyItem('buy-desk-wide');

      switchTab('plan');
      const kellerLoaded = loadPreloadedBlueprintPreset('keller-2');
      const kellerFloor = getFloor();
      const kellerBlueprint = getFloorBlueprint();
      const kellerRooms = Array.isArray(kellerFloor?.rooms) ? kellerFloor.rooms : [];
      onMeasureDown({ x: 40, y: 40 });
      onMeasureMove({ x: 220, y: 40 });
      onMeasureUp();
      const storedMeasurements = Array.isArray(kellerFloor?.measurements) ? kellerFloor.measurements.length : 0;

      return {
        budgetEst: budget.est,
        optimizerText,
        blueprintReady,
        scenarioBefore,
        scenarioAfter,
        roomMapText,
        room3dText,
        room3dHasSvg,
        wishlistText,
        decisionLabText,
        deskPinnedMust: deskAfterPin?.roomRole || '',
        deskPinnedFlag: Boolean(deskAfterPin?.mustFitRoom),
        sofaPlacedInPlan: Boolean(sofaPlaced?.placedInPlan),
        deskPlacedInPlan: Boolean(deskPlaced?.placedInPlan),
        deskPlacedFloor: deskPlaced?.planFloor || '',
        wideDeskPlacedInPlan: Boolean(wideDeskPlaced?.placedInPlan),
        fitCompact: renderCmpFitText(getCmpItem('cmp-fridge-compact')),
        fitFamily: renderCmpFitText(getCmpItem('cmp-fridge-family')),
        kellerLoaded,
        kellerFloorId: kellerFloor?.id || '',
        kellerFloorName: kellerFloor?.name || '',
        kellerStorageNote: kellerFloor?.storageNote || '',
        kellerBlueprintPreset: kellerBlueprint?.presetId || '',
        kellerBlueprintSize: `${Number(kellerBlueprint?.widthM || 0).toFixed(2)}x${Number(kellerBlueprint?.heightM || 0).toFixed(2)}`,
        kellerRoomLabels: kellerRooms.map(room => room.label).join(', '),
        kellerRoomAreas: kellerRooms.map(room => room.area).join(', '),
        measurementCount: storedMeasurements
      };
    });

    if (state.budgetEst !== 550) {
      throw new Error(`Existing items were still counted in the purchase budget: ${JSON.stringify(state)}`);
    }
    if (!/Best free-space setup/.test(state.optimizerText) || !/Desk Mini/.test(state.optimizerText)) {
      throw new Error(`Room optimizer did not rank the smaller grouped option first: ${JSON.stringify(state)}`);
    }
    if (!state.blueprintReady) {
      throw new Error(`Blueprint helpers did not register an imported overlay: ${JSON.stringify(state)}`);
    }
    if (state.scenarioBefore === state.scenarioAfter || !/Family Fridge/.test(state.scenarioAfter)) {
      throw new Error(`Scenario picker did not update the compare budget lab: ${JSON.stringify(state)}`);
    }
    if (!/Living Room/.test(state.roomMapText) || !/Family Sofa/.test(state.roomMapText)) {
      throw new Error(`Room Map subtab did not render room-grouped buy items: ${JSON.stringify(state)}`);
    }
    if (!state.room3dHasSvg || !/Pseudo-3D Room Preview/.test(state.room3dText) || !/Best free-space setup/.test(state.room3dText)) {
      throw new Error(`3D preview subtab did not render the isometric room layout view: ${JSON.stringify(state)}`);
    }
    if (!/Setup Wishlist Intelligence/.test(state.wishlistText) || !/Living room setup/.test(state.wishlistText) || !/Main seating/.test(state.wishlistText)) {
      throw new Error(`Wishlist planner subtab did not render room readiness intelligence: ${JSON.stringify(state)}`);
    }
    if (!/Apartment Decision Lab/.test(state.decisionLabText) || !/Reuse-first/.test(state.decisionLabText) || !/Auto-place all reuse-first choices/.test(state.decisionLabText)) {
      throw new Error(`Decision lab subtab did not render apartment setup planning controls: ${JSON.stringify(state)}`);
    }
    if (state.deskPinnedMust !== 'must' || !state.deskPinnedFlag) {
      throw new Error(`Wishlist must-have pinning did not sync item state: ${JSON.stringify(state)}`);
    }
    if (!state.sofaPlacedInPlan || !state.deskPlacedInPlan || state.wideDeskPlacedInPlan || state.deskPlacedFloor !== 'f-main') {
      throw new Error(`Reuse-first auto-placement did not map the chosen room setup onto the plan: ${JSON.stringify(state)}`);
    }
    if (!/Fits/.test(state.fitCompact) || !/Fits/.test(state.fitFamily)) {
      throw new Error(`Room-fit comparison text was not generated: ${JSON.stringify(state)}`);
    }
    if (!state.kellerLoaded || state.kellerFloorId !== 'f-keller' || state.kellerBlueprintPreset !== 'keller-2') {
      throw new Error(`Keller 2 preset did not activate the cellar floor blueprint: ${JSON.stringify(state)}`);
    }
    if (!/Keller/i.test(state.kellerFloorName) || !/Keller 2/i.test(state.kellerStorageNote) || !/Keller 2/i.test(state.kellerRoomLabels)) {
      throw new Error(`Keller 2 floor metadata was not seeded correctly: ${JSON.stringify(state)}`);
    }
    if (!/22\.08/.test(state.kellerRoomAreas) || state.kellerBlueprintSize !== '13.46x8.40') {
      throw new Error(`Keller 2 measurements were not loaded from the preset: ${JSON.stringify(state)}`);
    }
    if (state.measurementCount < 1) {
      throw new Error(`Measurement annotations were not persisted on the loaded floor: ${JSON.stringify(state)}`);
    }

    if (pageErrors.length) throw new Error(`Page error(s): ${pageErrors.join(' | ')}`);
    if (consoleErrors.length) throw new Error(`Console error(s): ${consoleErrors.join(' | ')}`);

    console.log('smoke_room_planner_upgrades:pass');
  } finally {
    await browser.close();
    await context.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
}

run().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
