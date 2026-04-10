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

      return {
        budgetEst: budget.est,
        optimizerText,
        blueprintReady,
        scenarioBefore,
        scenarioAfter,
        fitCompact: renderCmpFitText(getCmpItem('cmp-fridge-compact')),
        fitFamily: renderCmpFitText(getCmpItem('cmp-fridge-family'))
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
    if (!/Fits/.test(state.fitCompact) || !/Fits/.test(state.fitFamily)) {
      throw new Error(`Room-fit comparison text was not generated: ${JSON.stringify(state)}`);
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
