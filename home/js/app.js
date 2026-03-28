// ============================================================
// app.js — Our New Home · Auth-gated app shell
// ============================================================

window.HomeApp = (function createHomeApp() {
  let booted = false;
  let planUiWrapped = false;

  function authShell() { return document.getElementById('auth-shell'); }
  function appShell() { return document.getElementById('app-shell'); }

  function setShellVisibility(showApp) {
    const auth = authShell();
    const app = appShell();
    if (auth) {
      auth.hidden = showApp;
      auth.setAttribute('aria-hidden', String(showApp));
    }
    if (app) {
      app.hidden = !showApp;
      app.setAttribute('aria-hidden', String(!showApp));
    }
    document.body.classList.toggle('auth-shell-open', !showApp);
    if (!showApp && typeof closeAllModals === 'function') closeAllModals();
  }

  function syncHeaderSubtitle() {
    const sub = document.getElementById('hdr-sub');
    if (sub) sub.textContent = buildHeaderSubtitle(ldSettings());
  }

  function setUserChrome(user) {
    const userPill = document.getElementById('auth-user-pill');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-logs-btn');
    const isAdmin = Boolean(user && Array.isArray(user.groups) && user.groups.includes(AUTH_GROUPS.admin));
    if (userPill) {
      userPill.hidden = !user;
      userPill.textContent = user ? `🔒 ${user.email || user.username || 'Authenticated'}` : '';
    }
    if (logoutBtn) logoutBtn.hidden = !user;
    if (adminBtn) {
      adminBtn.hidden = !isAdmin;
      adminBtn.onclick = isAdmin
        ? () => toast('Admin activity dashboard will attach after the AWS log API is wired.', 'warn', 5000)
        : null;
    }
  }

  function updatePlanRoomItems() {
    const el = document.getElementById('plan-room-items');
    if (!el) return;
    const items = ldBuy().filter(it => it.roomId);
    if (!items.length) {
      el.textContent = 'Items linked to rooms appear here with red badges on the floor plan.';
      return;
    }
    const byRoom = {};
    items.forEach(it => { (byRoom[it.roomId] = byRoom[it.roomId] || []).push(it); });
    el.innerHTML = Object.entries(byRoom).map(([roomId, roomItems]) => {
      const room = getRoomById(roomId);
      return `<div style="margin:3px 0"><strong style="font-size:.68rem">${room.emoji || '📦'} ${esc(room.label || roomId)}</strong>
        <span style="color:var(--pk);font-size:.62rem"> ${roomItems.length} item${roomItems.length > 1 ? 's' : ''}</span></div>`;
    }).join('');
  }

  function bindPlanRefreshHook() {
    if (planUiWrapped || typeof window.rPlanUI !== 'function') return;
    const origPlanUI = window.rPlanUI;
    window.rPlanUI = function wrappedPlanUI() {
      if (origPlanUI) origPlanUI();
      updatePlanRoomItems();
    };
    planUiWrapped = true;
  }

  function initHomePlannerApp() {
    if (booted) return;
    maybeInjectPreloaded();
    initPlan();
    syncHeaderSubtitle();
    if (typeof syncAllRoomSelects === 'function') syncAllRoomSelects();
    setPillVal('buy', 'view', 'room', () => {});
    setPillVal('buy', 'sort', 'vote', () => {});
    setPillVal('sell', 'sort', 'date', () => {});
    setPillVal('take', 'sort', 'room', () => {});
    const catEl = document.getElementById('b-cat');
    if (catEl) onBuyCatChange(catEl);
    bindPlanRefreshHook();
    booted = true;
  }

  function renderCurrentTab() {
    const active = typeof _activeTab === 'string' && TAB_IDS.includes(_activeTab) ? _activeTab : 'dash';
    if (typeof switchTab === 'function') {
      switchTab(active);
    } else if (typeof rDash === 'function') {
      rDash();
    }
    if (typeof updateStatusBar === 'function') updateStatusBar();
  }

  function boot(user) {
    setShellVisibility(true);
    setUserChrome(user || null);
    initHomePlannerApp();
    syncHeaderSubtitle();
    if (typeof syncAllRoomSelects === 'function') syncAllRoomSelects();
    updatePlanRoomItems();
    renderCurrentTab();
  }

  function showAuthGate() {
    setUserChrome(null);
    setShellVisibility(false);
  }

  return {
    boot,
    showAuthGate,
    syncHeaderSubtitle,
    updatePlanRoomItems,
    setUserChrome,
    isBooted: () => booted,
  };
})();

window.initHomePlannerApp = function initHomePlannerApp(user) {
  window.HomeApp.boot(user);
};
