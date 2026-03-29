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
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
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
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

async function run() {
  const server = createServer();
  await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
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
    await page.goto('http://127.0.0.1:4174/index.html', { waitUntil: 'networkidle' });

    const lockedState = await page.evaluate(() => ({
      authShellVisible: !document.getElementById('auth-shell').hidden,
      appShellHidden: document.getElementById('app-shell').hidden,
      bodyLocked: document.body.classList.contains('auth-shell-open'),
      statusText: document.getElementById('auth-status-note').textContent.trim(),
      feedbackText: document.getElementById('auth-feedback').textContent.trim(),
      installButtonHidden: document.getElementById('auth-install-btn').hidden,
      manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute('href') || ''
    }));
    if (!lockedState.authShellVisible || !lockedState.appShellHidden || !lockedState.bodyLocked) {
      throw new Error(`Auth shell did not gate the app: ${JSON.stringify(lockedState)}`);
    }
    if (!/Sign in with your Cognito invite/.test(lockedState.statusText) || lockedState.feedbackText) {
      throw new Error(`Auth gate did not land in the expected sign-in state: ${JSON.stringify(lockedState)}`);
    }
    if (lockedState.manifestHref !== 'manifest.webmanifest') {
      throw new Error(`Manifest link is missing or incorrect: ${lockedState.manifestHref}`);
    }

    await page.waitForTimeout(500);
    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false, registered: false };
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        supported: true,
        registered: Boolean(registration),
        scope: registration?.scope || ''
      };
    });
    if (!swState.supported || !swState.registered || !/127\.0\.0\.1:4174/.test(swState.scope)) {
      throw new Error(`Service worker did not register correctly: ${JSON.stringify(swState)}`);
    }

    await page.evaluate(() => {
      window.HomeApp.boot({
        email: 'admin@example.com',
        username: 'admin@example.com',
        groups: ['admin']
      });
    });
    const bootState = await page.evaluate(() => ({
      authShellHidden: document.getElementById('auth-shell').hidden,
      appShellVisible: !document.getElementById('app-shell').hidden,
      userPill: document.getElementById('auth-user-pill').textContent.trim(),
      logoutHidden: document.getElementById('logout-btn').hidden,
      adminHidden: document.getElementById('admin-logs-btn').hidden,
      installHidden: document.getElementById('install-app-btn').hidden
    }));
    if (!bootState.authShellHidden || !bootState.appShellVisible) {
      throw new Error(`Authenticated handoff did not swap shells: ${JSON.stringify(bootState)}`);
    }
    if (!/admin@example\.com/.test(bootState.userPill) || bootState.logoutHidden || bootState.adminHidden) {
      throw new Error(`Authenticated chrome did not render expected admin controls: ${JSON.stringify(bootState)}`);
    }

    if (pageErrors.length) throw new Error(`Page error(s): ${pageErrors.join(' | ')}`);
    const filteredConsoleErrors = consoleErrors.filter(msg =>
      !/Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID/.test(msg) &&
      !/Failed to load resource: net::ERR_NAME_NOT_RESOLVED/.test(msg)
    );
    if (filteredConsoleErrors.length) throw new Error(`Console error(s): ${filteredConsoleErrors.join(' | ')}`);

    console.log('smoke_auth_pwa:pass');
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
