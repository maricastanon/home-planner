// ============================================================
// pwa.js — Our New Home · Installability and service worker
// ============================================================

(function initPwa() {
  let deferredPrompt = null;

  function installButtons() {
    return ['install-app-btn', 'auth-install-btn']
      .map(id => document.getElementById(id))
      .filter(Boolean);
  }

  function setInstallVisibility(visible) {
    installButtons().forEach(button => { button.hidden = !visible; });
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    if (!choice || choice.outcome !== 'accepted') return;
    deferredPrompt = null;
    setInstallVisibility(false);
  }

  function bindInstallButtons() {
    installButtons().forEach(button => {
      if (button.dataset.bound) return;
      button.dataset.bound = '1';
      button.addEventListener('click', promptInstall);
    });
  }

  function registerServiceWorker() {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && !isLocalhost) return;
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }

  function init() {
    bindInstallButtons();
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) setInstallVisibility(false);
    window.addEventListener('beforeinstallprompt', evt => {
      evt.preventDefault();
      deferredPrompt = evt;
      setInstallVisibility(true);
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      setInstallVisibility(false);
      if (typeof toast === 'function') toast('App installed ✅', 'green');
    });
    window.addEventListener('load', registerServiceWorker, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
