// ============================================================
// auth.js — Our New Home · Cognito auth (direct API, no SDK)
// ============================================================

window.HomeAuth = (function() {
  const AUTH_PREFIX = 'hnz_auth_v2:';
  let _accessToken = null, _idToken = null, _refreshToken = null;
  let _username = null, _user = null, _tokenExpiry = 0, _challengeSession = null;

  function _cfg() { return getCognitoConfig(); }
  function _endpoint() { return `https://cognito-idp.${_cfg().region}.amazonaws.com/`; }

  async function _call(action, payload) {
    const res = await fetch(_endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || data.Message || 'Unknown error');
      err.code = (data.__type || '').split('#').pop();
      throw err;
    }
    return data;
  }

  function _storeTokens(result, username) {
    _accessToken = result.AccessToken;
    _idToken = result.IdToken;
    if (result.RefreshToken) _refreshToken = result.RefreshToken;
    _username = username;
    _tokenExpiry = Date.now() + (result.ExpiresIn * 1000);
    // Decode ID token for user context
    try {
      const payload = JSON.parse(atob(_idToken.split('.')[1]));
      const groups = payload['cognito:groups'] || [];
      _user = { sub: payload.sub || '', email: payload.email || username, username, groups: Array.isArray(groups) ? groups : [groups] };
    } catch { _user = { sub: '', email: username, username, groups: [] }; }
    // Persist
    const s = (_cfg().storageMode === 'session') ? sessionStorage : localStorage;
    s.setItem(AUTH_PREFIX + 'user', username);
    s.setItem(AUTH_PREFIX + 'access', _accessToken);
    s.setItem(AUTH_PREFIX + 'id', _idToken);
    if (result.RefreshToken) s.setItem(AUTH_PREFIX + 'refresh', result.RefreshToken);
    s.setItem(AUTH_PREFIX + 'expiry', String(_tokenExpiry));
  }

  function _clearTokens() {
    _accessToken = _idToken = _refreshToken = _username = _user = null;
    _tokenExpiry = 0; _challengeSession = null;
    [sessionStorage, localStorage].forEach(s => {
      [AUTH_PREFIX+'user', AUTH_PREFIX+'access', AUTH_PREFIX+'id', AUTH_PREFIX+'refresh', AUTH_PREFIX+'expiry']
        .forEach(k => s.removeItem(k));
    });
  }

  function _restoreTokens() {
    const s = (_cfg().storageMode === 'session') ? sessionStorage : localStorage;
    const user = s.getItem(AUTH_PREFIX + 'user');
    const access = s.getItem(AUTH_PREFIX + 'access');
    const refresh = s.getItem(AUTH_PREFIX + 'refresh');
    const expiry = parseInt(s.getItem(AUTH_PREFIX + 'expiry') || '0');
    if (user && access && refresh) {
      _username = user; _accessToken = access; _refreshToken = refresh;
      _idToken = s.getItem(AUTH_PREFIX + 'id'); _tokenExpiry = expiry;
      try {
        const payload = JSON.parse(atob(_idToken.split('.')[1]));
        const groups = payload['cognito:groups'] || [];
        _user = { sub: payload.sub || '', email: payload.email || user, username: user, groups: Array.isArray(groups) ? groups : [groups] };
      } catch { _user = { sub: '', email: user, username: user, groups: [] }; }
      return true;
    }
    return false;
  }

  async function _refresh() {
    if (!_refreshToken) return false;
    try {
      const res = await _call('InitiateAuth', { AuthFlow: 'REFRESH_TOKEN_AUTH', ClientId: _cfg().clientId, AuthParameters: { REFRESH_TOKEN: _refreshToken } });
      if (res.AuthenticationResult) {
        _accessToken = res.AuthenticationResult.AccessToken;
        _idToken = res.AuthenticationResult.IdToken;
        _tokenExpiry = Date.now() + (res.AuthenticationResult.ExpiresIn * 1000);
        const s = (_cfg().storageMode === 'session') ? sessionStorage : localStorage;
        s.setItem(AUTH_PREFIX + 'access', _accessToken);
        s.setItem(AUTH_PREFIX + 'id', _idToken);
        s.setItem(AUTH_PREFIX + 'expiry', String(_tokenExpiry));
        return true;
      }
    } catch { /* refresh failed */ }
    return false;
  }

  function _friendlyError(err) {
    const map = {
      NotAuthorizedException: 'Wrong username or password.',
      UserNotFoundException: 'User not found.',
      PasswordResetRequiredException: 'Password reset required.',
      UserNotConfirmedException: 'Account not confirmed.',
      InvalidPasswordException: 'Password does not meet requirements.',
    };
    return map[err.code] || err.message || 'Authentication failed.';
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    async login(username, password) {
      const cfg = _cfg();
      const res = await _call('InitiateAuth', {
        AuthFlow: 'USER_PASSWORD_AUTH', ClientId: cfg.clientId,
        AuthParameters: { USERNAME: username, PASSWORD: password }
      });
      if (res.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        _challengeSession = res.Session;
        return { challenge: 'NEW_PASSWORD_REQUIRED', username };
      }
      _storeTokens(res.AuthenticationResult, username);
      return { success: true };
    },

    async respondNewPassword(username, newPassword) {
      if (!_challengeSession) throw new Error('No challenge active');
      const res = await _call('RespondToAuthChallenge', {
        ChallengeName: 'NEW_PASSWORD_REQUIRED', ClientId: _cfg().clientId,
        Session: _challengeSession,
        ChallengeResponses: { USERNAME: username, NEW_PASSWORD: newPassword }
      });
      _challengeSession = null;
      if (res.AuthenticationResult) { _storeTokens(res.AuthenticationResult, username); return { success: true }; }
      throw new Error('Challenge failed');
    },

    async getAccessToken() {
      if (!_accessToken) return null;
      if (Date.now() > _tokenExpiry - 300000) { if (!await _refresh()) return null; }
      return _accessToken;
    },

    logout(msg) {
      if (_accessToken) _call('GlobalSignOut', { AccessToken: _accessToken }).catch(() => {});
      _clearTokens();
      // Show login
      document.getElementById('loginBg')?.classList.remove('hidden');
      const appShell = document.getElementById('app-shell');
      if (appShell) { appShell.hidden = true; appShell.setAttribute('aria-hidden', 'true'); }
      document.body.classList.add('auth-shell-open');
      const note = document.getElementById('auth-status-note');
      if (note) note.textContent = msg || 'Signed out.';
    },

    isAuthenticated: () => Boolean(_user),
    getStorageScope: () => _user?.sub || '',
    getUser: () => _user,
    getSessionTokens: () => ({ accessToken: _accessToken || '', idToken: _idToken || '' }),
    friendlyError: _friendlyError,

    async init() {
      if (!APP_RUNTIME.authRequired) { if (window.HomeApp) window.HomeApp.boot(null); return; }
      if (!hasCognitoConfig()) {
        document.getElementById('auth-status-note').textContent = 'Cognito not configured.';
        return;
      }
      // Try restore session
      if (_restoreTokens()) {
        const token = await this.getAccessToken();
        if (token) {
          // Success — boot app
          this._bootApp();
          return;
        }
      }
      // Show login form
      document.getElementById('auth-status-note').textContent = 'Sign in with your credentials.';
    },

    _bootApp() {
      document.getElementById('loginBg')?.classList.add('hidden');
      document.getElementById('newPwdBg')?.classList.add('hidden');
      const appShell = document.getElementById('app-shell');
      if (appShell) { appShell.hidden = false; appShell.removeAttribute('aria-hidden'); }
      document.body.classList.remove('auth-shell-open');
      if (window.HomeAws && typeof window.HomeAws.loadFromCloud === 'function') window.HomeAws.loadFromCloud();
      if (window.HomeApp) window.HomeApp.boot(_user);
      if (window.HomeAws && typeof window.HomeAws.flushAll === 'function') window.HomeAws.flushAll();
    }
  };
})();

// ── Login form handler ───────────────────────────────────────
let _loginChallengeUser = null;

async function doLogin() {
  const errEl = document.getElementById('auth-feedback');
  const user = document.getElementById('auth-email')?.value.trim();
  const pwd = document.getElementById('auth-password')?.value;
  if (!user) { errEl.textContent = 'Enter a username'; errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 600); return; }
  if (!pwd) { errEl.textContent = 'Enter a password'; errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 600); return; }
  errEl.textContent = '';
  const btn = document.getElementById('auth-sign-in-btn');
  if (btn) { btn.textContent = 'Signing in...'; btn.disabled = true; }
  try {
    const result = await window.HomeAuth.login(user, pwd);
    if (result.challenge === 'NEW_PASSWORD_REQUIRED') {
      _loginChallengeUser = user;
      document.getElementById('loginBg')?.classList.add('hidden');
      document.getElementById('newPwdBg')?.classList.remove('hidden');
      return;
    }
    // Show loading overlay briefly
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
    setTimeout(() => {
      window.HomeAuth._bootApp();
      if (overlay) { overlay.classList.add('lo-fadeout'); setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('lo-fadeout'); }, 700); }
      if (typeof toast === 'function') toast('Welcome back! 🏠', 'green');
    }, 1200);
  } catch (e) {
    errEl.textContent = window.HomeAuth.friendlyError(e);
    errEl.classList.add('shake'); setTimeout(() => errEl.classList.remove('shake'), 600);
  } finally {
    if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
  }
}

async function doNewPassword() {
  const errEl = document.getElementById('newpwd-feedback');
  const pwd = document.getElementById('auth-new-password')?.value;
  const pwd2 = document.getElementById('auth-new-password-confirm')?.value;
  if (!pwd || pwd.length < 8) { errEl.textContent = 'Min 8 characters'; return; }
  if (pwd !== pwd2) { errEl.textContent = 'Passwords do not match'; return; }
  try {
    await window.HomeAuth.respondNewPassword(_loginChallengeUser, pwd);
    window.HomeAuth._bootApp();
    if (typeof toast === 'function') toast('Password set! Welcome 🏠', 'green');
  } catch (e) {
    errEl.textContent = window.HomeAuth.friendlyError(e);
  }
}

function doLogout() { window.HomeAuth.logout('Signed out successfully.'); }

// ── Loading overlay particles ────────────────────────────────
(function() {
  const stars = document.getElementById('loStars');
  const parts = document.getElementById('loParticles');
  if (stars) {
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div'); s.className = 'lo-star';
      const sz = Math.random() * 2 + .8;
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*4}s`;
      stars.appendChild(s);
    }
  }
  if (parts) {
    const cs = ['#e11d48','#fb7185','#4ade80','#86efac','#f43f5e','#34d399'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div'); p.className = 'lo-p';
      const sz = Math.random() * 5 + 2;
      p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;background:${cs[Math.floor(Math.random()*cs.length)]};animation-duration:${Math.random()*5+5}s;animation-delay:${Math.random()*6}s`;
      parts.appendChild(p);
    }
  }
})();

// ── Init ─────────────────────────────────��───────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.HomeAuth.init(), { once: true });
} else {
  window.HomeAuth.init();
}
