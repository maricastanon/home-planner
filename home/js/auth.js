// ============================================================
// auth.js — Our New Home · Cognito auth gate
// ============================================================

window.HomeAuth = (function createHomeAuth() {
  const AUTH_STORAGE_PREFIX = 'hnz_auth_session_v1:';
  const state = {
    currentUser: null,
    session: null,
    user: null,
    challengeUser: null,
    expiryTimer: null,
  };

  function refs() {
    return {
      status: document.getElementById('auth-status-note'),
      feedback: document.getElementById('auth-feedback'),
      loginForm: document.getElementById('auth-login-form'),
      passwordForm: document.getElementById('auth-password-form'),
      email: document.getElementById('auth-email'),
      password: document.getElementById('auth-password'),
      newPassword: document.getElementById('auth-new-password'),
      newPasswordConfirm: document.getElementById('auth-new-password-confirm'),
      logout: document.getElementById('logout-btn'),
    };
  }

  function sessionStorageAdapter() {
    return {
      setItem(key, value) { sessionStorage.setItem(AUTH_STORAGE_PREFIX + key, value); return value; },
      getItem(key) { return sessionStorage.getItem(AUTH_STORAGE_PREFIX + key); },
      removeItem(key) { sessionStorage.removeItem(AUTH_STORAGE_PREFIX + key); },
      clear() {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith(AUTH_STORAGE_PREFIX))
          .forEach(key => sessionStorage.removeItem(key));
      }
    };
  }

  function clearStoredSession() {
    sessionStorageAdapter().clear();
  }

  function setStatus(message) {
    const { status } = refs();
    if (status) status.textContent = message;
  }

  function setFeedback(message = '', tone = 'info') {
    const { feedback } = refs();
    if (!feedback) return;
    feedback.hidden = !message;
    feedback.className = `auth-feedback ${tone}`.trim();
    feedback.textContent = message;
  }

  function showForm(mode) {
    const { loginForm, passwordForm } = refs();
    if (loginForm) loginForm.hidden = mode !== 'login';
    if (passwordForm) passwordForm.hidden = mode !== 'password';
  }

  function friendlyAuthError(err) {
    const code = err?.code || err?.name || '';
    const map = {
      NotAuthorizedException: 'Wrong username/email or password.',
      UserNotFoundException: 'This Cognito user does not exist.',
      PasswordResetRequiredException: 'Password reset is required for this account.',
      UserNotConfirmedException: 'This account is not confirmed yet.',
      TooManyFailedAttemptsException: 'Too many failed attempts. Try again shortly.',
      LimitExceededException: 'Too many requests. Wait a moment and try again.',
      NetworkError: 'Network error while contacting Cognito.',
    };
    return map[code] || err?.message || 'Authentication failed.';
  }

  function clearExpiryTimer() {
    if (state.expiryTimer) window.clearTimeout(state.expiryTimer);
    state.expiryTimer = null;
  }

  function buildUserContext(cognitoUser, session) {
    const payload = session.getIdToken().decodePayload() || {};
    const groupsClaim = payload['cognito:groups'];
    const groups = Array.isArray(groupsClaim) ? groupsClaim : groupsClaim ? [groupsClaim] : [];
    return {
      sub: payload.sub || '',
      email: payload.email || cognitoUser.getUsername(),
      username: cognitoUser.getUsername(),
      groups,
    };
  }

  function scheduleExpiry(session) {
    clearExpiryTimer();
    const expiresAtMs = session.getAccessToken().getExpiration() * 1000;
    const delay = expiresAtMs - Date.now();
    if (delay <= 0) {
      logout('Session expired. Sign in again.');
      return;
    }
    state.expiryTimer = window.setTimeout(() => logout('Session expired. Sign in again.'), delay);
  }

  function getSdk() {
    return window.AmazonCognitoIdentity || null;
  }

  function getUserPool() {
    const cfg = getCognitoConfig();
    const sdk = getSdk();
    if (!sdk || !cfg.userPoolId || !cfg.clientId) return null;
    return new sdk.CognitoUserPool({
      UserPoolId: cfg.userPoolId,
      ClientId: cfg.clientId,
      Storage: sessionStorageAdapter(),
    });
  }

  function getSession(currentUser) {
    return new Promise((resolve, reject) => {
      currentUser.getSession((err, session) => {
        if (!err && session && session.isValid()) {
          resolve(session);
          return;
        }
        const existing = currentUser.getSignInUserSession ? currentUser.getSignInUserSession() : null;
        const refreshToken = existing && existing.getRefreshToken ? existing.getRefreshToken() : null;
        if (!refreshToken) {
          reject(err || new Error('No refresh token available.'));
          return;
        }
        currentUser.refreshSession(refreshToken, (refreshErr, refreshedSession) => {
          if (refreshErr || !refreshedSession || !refreshedSession.isValid()) {
            reject(refreshErr || new Error('Session refresh failed.'));
            return;
          }
          resolve(refreshedSession);
        });
      });
    });
  }

  function setAuthenticated(cognitoUser, session, flashMessage = '') {
    state.currentUser = cognitoUser;
    state.session = session;
    state.user = buildUserContext(cognitoUser, session);
    state.challengeUser = null;
    setFeedback('', 'info');
    setStatus('Secure session active.');
    scheduleExpiry(session);
    if (window.HomeAws && typeof window.HomeAws.flushAll === 'function') window.HomeAws.flushAll();
    if (window.HomeApp) window.HomeApp.boot(state.user);
    if (flashMessage && typeof toast === 'function') toast(flashMessage, 'green');
  }

  function showLogin(message = '', tone = 'info') {
    state.challengeUser = null;
    setStatus('Sign in with your Cognito invite.');
    setFeedback(message, tone);
    showForm('login');
    if (window.HomeApp) window.HomeApp.showAuthGate();
  }

  function showPasswordChallenge(email = '') {
    const { email: emailInput, newPassword, newPasswordConfirm } = refs();
    if (emailInput && email) emailInput.value = email;
    if (newPassword) newPassword.value = '';
    if (newPasswordConfirm) newPasswordConfirm.value = '';
    setStatus('Set a new password to finish first login.');
    setFeedback('', 'info');
    showForm('password');
    if (window.HomeApp) window.HomeApp.showAuthGate();
  }

  function showBlocked(message) {
    showForm('blocked');
    setStatus('Planner access is blocked.');
    setFeedback(message, 'error');
    if (window.HomeApp) window.HomeApp.showAuthGate();
  }

  function signIn(email, password) {
    const sdk = getSdk();
    const pool = getUserPool();
    if (!sdk || !pool) {
      showBlocked('Cognito is not configured yet. Add User Pool and App Client values before sign-in.');
      return;
    }
    setStatus('Signing in…');
    setFeedback('', 'info');
    const authDetails = new sdk.AuthenticationDetails({
      Username: email,
      Password: password,
    });
    const cognitoUser = new sdk.CognitoUser({
      Username: email,
      Pool: pool,
      Storage: sessionStorageAdapter(),
    });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess(session) {
        setAuthenticated(cognitoUser, session, 'Signed in ✅');
      },
      onFailure(err) {
        showLogin(friendlyAuthError(err), 'error');
      },
      newPasswordRequired() {
        state.challengeUser = cognitoUser;
        showPasswordChallenge(email);
      }
    });
  }

  function completeNewPassword(password, confirmPassword) {
    if (!state.challengeUser) {
      showLogin('The password challenge is no longer active. Sign in again.', 'warn');
      return;
    }
    if (!password || password.length < 8) {
      setFeedback('Use a password with at least 8 characters.', 'warn');
      return;
    }
    if (password !== confirmPassword) {
      setFeedback('The new passwords do not match.', 'warn');
      return;
    }
    setStatus('Saving new password…');
    setFeedback('', 'info');
    state.challengeUser.completeNewPasswordChallenge(password, {}, {
      onSuccess(session) {
        setAuthenticated(state.challengeUser, session, 'Password updated ✅');
      },
      onFailure(err) {
        setFeedback(friendlyAuthError(err), 'error');
      }
    });
  }

  function logout(message = '') {
    clearExpiryTimer();
    if (state.currentUser) state.currentUser.signOut();
    state.currentUser = null;
    state.session = null;
    state.user = null;
    state.challengeUser = null;
    clearStoredSession();
    showLogin(message, message ? 'warn' : 'info');
  }

  async function restoreSession() {
    if (!APP_RUNTIME.authRequired) {
      if (window.HomeApp) window.HomeApp.boot(null);
      return;
    }
    if (!hasCognitoConfig()) {
      showBlocked('Cognito configuration is missing. Set User Pool and App Client values before deployment.');
      return;
    }
    if (!getSdk()) {
      showBlocked('The Cognito SDK did not load. Check network access or CSP settings.');
      return;
    }
    const pool = getUserPool();
    const currentUser = pool && pool.getCurrentUser ? pool.getCurrentUser() : null;
    if (!currentUser) {
      showLogin();
      return;
    }
    setStatus('Restoring secure session…');
    try {
      const session = await getSession(currentUser);
      setAuthenticated(currentUser, session);
    } catch (err) {
      console.warn('Session restore failed:', err);
      logout('Session expired. Sign in again.');
    }
  }

  function bindEvents() {
    const { loginForm, passwordForm, logout } = refs();
    if (loginForm && !loginForm.dataset.bound) {
      loginForm.dataset.bound = '1';
      loginForm.addEventListener('submit', evt => {
        evt.preventDefault();
        signIn(refs().email?.value?.trim() || '', refs().password?.value || '');
      });
    }
    if (passwordForm && !passwordForm.dataset.bound) {
      passwordForm.dataset.bound = '1';
      passwordForm.addEventListener('submit', evt => {
        evt.preventDefault();
        completeNewPassword(refs().newPassword?.value || '', refs().newPasswordConfirm?.value || '');
      });
    }
    if (logout && !logout.dataset.bound) {
      logout.dataset.bound = '1';
      logout.addEventListener('click', () => logoutUser());
    }
  }

  function logoutUser(message = '') {
    logout(message);
  }

  function init() {
    bindEvents();
    restoreSession();
  }

  return {
    init,
    logout: logoutUser,
    isAuthenticated: () => Boolean(state.user),
    getStorageScope: () => state.user?.sub || '',
    getUser: () => state.user,
    getSessionTokens: () => ({
      accessToken: state.session?.getAccessToken?.().getJwtToken?.() || '',
      idToken: state.session?.getIdToken?.().getJwtToken?.() || '',
    }),
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.HomeAuth.init(), { once: true });
} else {
  window.HomeAuth.init();
}
