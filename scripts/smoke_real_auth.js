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
  const newPassword = process.env.COGNITO_NEW_PASSWORD || process.env.COGNITO_PASSWORD_NEW || '';
  if (!username || !password) throw new Error('Set COGNITO_USERNAME and COGNITO_PASSWORD before running this script.');

  const server = createServer();
  await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const cognitoResponses = [];

  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', async response => {
    if (!/cognito-idp\./i.test(response.url())) return;
    let body = '';
    try {
      body = await response.text();
    } catch {}
    cognitoResponses.push({
      url: response.url(),
      status: response.status(),
      errorType: response.headers()['x-amzn-errortype'] || '',
      errorMessage: response.headers()['x-amzn-errormessage'] || '',
      body,
    });
  });

  try {
    await page.goto('http://127.0.0.1:4175/index.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => /Sign in with your credentials|Cognito not configured/.test(document.getElementById('auth-status-note')?.textContent || ''), null, { timeout: 15000 });

    await page.fill('#auth-email', username);
    await page.fill('#auth-password', password);
    await page.click('#auth-sign-in-btn');

    await page.waitForFunction(() => {
      const loginBg = document.getElementById('loginBg');
      const newPwdBg = document.getElementById('newPwdBg');
      const feedback = document.getElementById('auth-feedback');
      return Boolean(loginBg?.classList.contains('hidden'))
        || Boolean(newPwdBg && !newPwdBg.classList.contains('hidden'))
        || Boolean(feedback && !feedback.hidden && feedback.textContent.trim());
    }, null, { timeout: 20000 });

    const needsPasswordReset = await page.evaluate(() => {
      const newPwdBg = document.getElementById('newPwdBg');
      return Boolean(newPwdBg && !newPwdBg.classList.contains('hidden'));
    });
    if (needsPasswordReset) {
      if (!newPassword) {
        throw new Error('Cognito requested a new password. Set COGNITO_NEW_PASSWORD (or COGNITO_PASSWORD_NEW) to complete the first-login flow.');
      }
      await page.fill('#auth-new-password', newPassword);
      await page.fill('#auth-new-password-confirm', newPassword);
      await page.click('#newPwdBg .login-btn');
      await page.waitForFunction(() => {
        const loginBg = document.getElementById('loginBg');
        const appShell = document.getElementById('app-shell');
        const feedback = document.getElementById('newpwd-feedback');
        return Boolean(loginBg?.classList.contains('hidden') && appShell && !appShell.hidden)
          || Boolean(feedback && !feedback.hidden && feedback.textContent.trim());
      }, null, { timeout: 20000 });
    }

    const result = await page.evaluate(() => ({
      authed: document.getElementById('loginBg')?.classList.contains('hidden') === true && document.getElementById('app-shell')?.hidden === false,
      passwordResetVisible: document.getElementById('newPwdBg') ? !document.getElementById('newPwdBg').classList.contains('hidden') : false,
      feedback: document.getElementById('auth-feedback')?.textContent?.trim() || '',
      newPasswordFeedback: document.getElementById('newpwd-feedback')?.textContent?.trim() || '',
      status: document.getElementById('auth-status-note')?.textContent?.trim() || '',
      userPill: document.getElementById('auth-user-pill')?.textContent?.trim() || '',
      logsVisible: document.getElementById('admin-logs-btn')?.hidden === false,
      logoutVisible: document.getElementById('logout-btn')?.hidden === false
    }));

    if (!result.authed) throw new Error(`Cognito sign-in failed: ${JSON.stringify({ result, cognitoResponses })}`);
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
