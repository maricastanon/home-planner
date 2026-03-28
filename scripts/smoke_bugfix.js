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
    newAddress: 'Test Address 7',
    oldAddress: '',
    maxBudget: 8000,
    names: { M: 'Mari', A: 'Alexander' }
  },
  hnz_plan: {
    floors: [{
      id: 'f-ground',
      name: 'Ground Floor',
      rooms: [
        { id: 'r-custom-office', label: 'Guest Office', color: '#e0f2fe', x: 40, y: 40, w: 240, h: 180, area: '10.7' },
        { id: 'r-kueche', label: 'Kitchen', color: '#dcfce7', x: 320, y: 40, w: 220, h: 180, area: '8.8' }
      ],
      furniture: []
    }],
    scale: 45,
    activeFloor: 0,
    _preloaded: true,
    _planVersion: 1
  },
  hnz_buy: [
    {
      id: 'buy-desk-1',
      name: 'Desk Alpha',
      category: 'Furniture',
      type: 'Desk',
      roomId: 'r-custom-office',
      price: 250,
      voteM: 'yes',
      voteA: 'meh',
      itemStatus: 'researching',
      bought: false,
      widthCm: 140,
      depthCm: 70,
      heightCm: 75,
      pros: ['Fits the wall'],
      cons: ['Assembly required'],
      photos: []
    },
    {
      id: 'buy-desk-2',
      name: 'Desk Beta',
      category: 'Furniture',
      type: 'Desk',
      roomId: 'r-custom-office',
      price: 310,
      voteM: 'no',
      voteA: 'yes',
      itemStatus: 'wishlist',
      bought: false,
      widthCm: 160,
      depthCm: 80,
      heightCm: 75,
      pros: ['Solid wood'],
      cons: ['Higher price'],
      photos: []
    }
  ],
  hnz_cmp: [
    {
      id: 'cmp-desk-1',
      name: 'Desk Compare A',
      category: 'Office',
      roomId: 'r-custom-office',
      price: 199,
      ratingM: 5,
      ratingA: 4,
      energyRating: '',
      warranty: '2 years',
      buyLink: '',
      pros: ['Compact'],
      cons: [],
      widthCm: 120,
      depthCm: 60,
      heightCm: 75,
      notes: '',
      voteM: '',
      voteA: '',
      photos: []
    },
    {
      id: 'cmp-desk-2',
      name: 'Desk Compare B',
      category: 'Office',
      roomId: 'r-custom-office',
      price: 239,
      ratingM: 4,
      ratingA: 5,
      energyRating: '',
      warranty: '3 years',
      buyLink: '',
      pros: ['Cable tray'],
      cons: ['Long delivery'],
      widthCm: 130,
      depthCm: 65,
      heightCm: 75,
      notes: '',
      voteM: '',
      voteA: '',
      photos: []
    }
  ],
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
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
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
    await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
    await page.evaluate(data => {
      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }, seedData);
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      if (!window.HomeApp || typeof window.HomeApp.boot !== 'function') {
        throw new Error('HomeApp boot hook is not available.');
      }
      window.HomeApp.boot({
        email: 'tester@example.com',
        username: 'tester@example.com',
        groups: ['tester']
      });
    });
    if (pageErrors.length) throw new Error(`Page error(s) after boot: ${pageErrors.join(' | ')}`);

    const editFieldsPresent = await page.evaluate(() =>
      Boolean(document.getElementById('be-orig-price') && document.getElementById('be-weight'))
    );
    if (!editFieldsPresent) throw new Error('Buy edit modal fields are still missing.');

    const roomBindingState = await page.evaluate(() => {
      const ids = ['b-room', 'be-room', 'cmp-room', 'cmpe-room'];
      const states = ids.map(id => ({
        id,
        options: [...document.getElementById(id).options].map(opt => ({ value: opt.value, text: opt.textContent.trim() }))
      }));
      const hasCustomEverywhere = states.every(state =>
        state.options.some(opt => opt.value === 'r-custom-office' && /Guest Office/.test(opt.text))
      );
      return {
        hasCustomEverywhere,
        states,
        planPanel: document.getElementById('plan-room-items').textContent,
        storedPlan: localStorage.getItem('hnz_plan'),
        storedBuy: localStorage.getItem('hnz_buy'),
        booted: Boolean(window.__homePlannerBooted),
        header: document.getElementById('hdr-sub').textContent,
        statusBar: document.getElementById('status-bar').textContent,
        roomCatalog: typeof getAllRooms === 'function' ? getAllRooms() : []
      };
    });
    if (!roomBindingState.hasCustomEverywhere) {
      throw new Error(`Custom plan room did not propagate to all room selectors: ${JSON.stringify(roomBindingState)}`);
    }
    if (!/Guest Office/.test(roomBindingState.planPanel)) throw new Error('Plan room items panel did not resolve the custom room label.');

    const compareText = await page.evaluate(() => {
      openCmpModal('Office');
      return document.getElementById('compare-modal-content').textContent;
    });
    if (!/5\/5/.test(compareText) || /👍 Yes|👎 No|🤔 Maybe/.test(compareText)) {
      throw new Error('Standalone compare modal is still rendering buy-vote output instead of ratings.');
    }

    const buyCompareText = await page.evaluate(() => {
      clearCompare();
      openCompareForType('Desk', 'r-custom-office');
      return document.getElementById('compare-modal-content').textContent;
    });
    if (/NaN/.test(buyCompareText) || !/👍 Yes|🤔 Maybe|👎 No/.test(buyCompareText)) {
      throw new Error('Buy compare modal scoring/output is still broken for vote-based items.');
    }

    const headerText = await page.evaluate(() => {
      openSettings();
      document.getElementById('set-newaddr').value = '';
      document.getElementById('set-movedate').value = '2026-04-11';
      saveSettings();
      return document.getElementById('hdr-sub').textContent;
    });
    if (!/Move-in:/.test(headerText)) throw new Error('Settings save still fails to refresh the move-in subtitle.');

    const activityLog = await page.evaluate(() => {
      const item = getBuyItem('buy-desk-1');
      item.name = 'Desk Alpha Updated';
      updBuyItem(item);
      delCmpItem('cmp-desk-2');
      return JSON.parse(localStorage.getItem('hnz_activity') || '[]').slice(0, 5);
    });
    const hasBuyUpdate = activityLog.some(entry => entry.module === 'buy' && entry.action === 'update' && /Desk Alpha Updated/.test(entry.label));
    const hasCompareDelete = activityLog.some(entry => entry.module === 'compare' && entry.action === 'delete' && /Desk Compare B/.test(entry.label));
    if (!hasBuyUpdate || !hasCompareDelete) throw new Error('Activity log still misses update/delete mutations.');

    if (pageErrors.length) throw new Error(`Page error(s): ${pageErrors.join(' | ')}`);
    const filteredConsoleErrors = consoleErrors.filter(msg => !/Failed to load resource: the server responded with a status of 404/.test(msg));
    if (filteredConsoleErrors.length) throw new Error(`Console error(s): ${filteredConsoleErrors.join(' | ')}`);

    console.log('smoke_bugfix:pass');
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
