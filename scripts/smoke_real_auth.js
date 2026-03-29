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
  const username = process.env.COGNITO_USERNAME;
  const password = process.env.COGNITO_PASSWORD;
  if (!username || !password) throw new Error('Set COGNITO_USERNAME and COGNITO_PASSWORD before running this script.');

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
    await page.waitForFunction(() => /Sign in with your Cognito invite|Set a new password/.test(document.getElementById('auth-status-note')?.textContent || ''), null, { timeout: 15000 });

    await page.fill('#auth-email', username);
    await page.fill('#auth-password', password);
    await page.locator('#auth-login-form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await page.waitForFunction(() => {
      const authShell = document.getElementById('auth-shell');
      const feedback = document.getElementById('auth-feedback');
      return Boolean(authShell?.hidden) || Boolean(feedback && !feedback.hidden && feedback.textContent.trim());
    }, null, { timeout: 20000 });

    const result = await page.evaluate(() => ({
      authed: document.getElementById('auth-shell')?.hidden === true && document.getElementById('app-shell')?.hidden === false,
      feedback: document.getElementById('auth-feedback')?.textContent?.trim() || '',
      status: document.getElementById('auth-status-note')?.textContent?.trim() || '',
      userPill: document.getElementById('auth-user-pill')?.textContent?.trim() || '',
      adminVisible: document.getElementById('admin-logs-btn')?.hidden === false,
      logoutVisible: document.getElementById('logout-btn')?.hidden === false
    }));

    if (!result.authed) throw new Error(`Cognito sign-in failed: ${JSON.stringify(result)}`);
    if (!result.logoutVisible) throw new Error(`Authenticated chrome did not appear: ${JSON.stringify(result)}`);
    if (pageErrors.length) throw new Error(`Page error(s): ${pageErrors.join(' | ')}`);
    const filteredConsoleErrors = consoleErrors.filter(msg =>
      !/Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID/.test(msg) &&
      !/Failed to load resource: net::ERR_NAME_NOT_RESOLVED/.test(msg)
    );
    if (filteredConsoleErrors.length) throw new Error(`Console error(s): ${filteredConsoleErrors.join(' | ')}`);

    console.log(JSON.stringify(result));
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
