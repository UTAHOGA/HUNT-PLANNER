/**
 * UOGA SPA Bootstrap (app-spa.js)
 * Initialises the client-side router, registers routes, and orchestrates
 * page transitions between Hunt Planner, Hunt Research, and Vetting pages.
 *
 * Script load order in index.html:
 *   config.js → ui.js → data.js →
 *   templates/shared.js → templates/hunt-planner.js →
 *   templates/hunt-research.js → templates/vetting.js →
 *   router.js → event-handlers.js →
 *   app-spa.js  ← this file (registers DOMContentLoaded before app.js / hunt-research.js)
 *   app.js → hunt-research.js
 */
(function () {
  const APP_ROOT_ID = 'app';
  let huntPlannerInitialised = false;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getAppRoot() {
    return document.getElementById(APP_ROOT_ID);
  }

  /**
   * Render an HTML string into the #app container.
   * Removes stale page-specific <style> tags injected by previous templates.
   */
  function renderPage(html) {
    const root = getAppRoot();
    if (!root) return;
    if (window.UOGA_EVENTS) window.UOGA_EVENTS.cleanPageStyles();
    root.innerHTML = html;
  }

  // ─── Route handlers ─────────────────────────────────────────────────────────

  function loadHuntPlanner(params) {
    renderPage(window.UOGA_TEMPLATES.huntPlanner());
    window.UOGA_EVENTS && window.UOGA_EVENTS.bindPageEvents('planner');

    // Pass any hunt_code query param (e.g. from backpack links) to planner.
    const huntCode = params && params.get('hunt_code');
    if (huntCode) {
      localStorage.setItem('selected_hunt_code', huntCode.toUpperCase());
    }

    if (huntPlannerInitialised) {
      // Re-entry: data already loaded, just rewire DOM and restore map.
      if (typeof window.reinitHuntPlanner === 'function') {
        window.reinitHuntPlanner();
      }
      return;
    }
    huntPlannerInitialised = true;

    // First visit: full initialisation via the exposed helper.
    if (typeof window.initHuntPlanner === 'function') {
      window.initHuntPlanner();
    }
  }

  function loadHuntResearch(params) {
    renderPage(window.UOGA_TEMPLATES.huntResearch());
    window.UOGA_EVENTS && window.UOGA_EVENTS.bindPageEvents('research');

    // Pass hunt_code from router params or query string to localStorage so
    // hunt-research.js bootstrapSelection() can pick it up.
    const huntCode = params && params.get('hunt_code');
    if (huntCode) {
      localStorage.setItem('selected_hunt_code', huntCode.toUpperCase());
    }

    if (window.UOGA_RESEARCH && typeof window.UOGA_RESEARCH.init === 'function') {
      window.UOGA_RESEARCH.init();
    }
  }

  function loadVetting() {
    renderPage(window.UOGA_TEMPLATES.vetting());
    window.UOGA_EVENTS && window.UOGA_EVENTS.bindPageEvents('vetting');
    // Vetting page is purely static — no additional JS init needed.
  }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function onSpaReady() {
    const root = getAppRoot();
    if (!root) return; // Not in SPA mode (e.g. direct legacy HTML file load).

    if (!window.UOGA_ROUTER) {
      console.error('UOGA_ROUTER not found. Ensure router.js is loaded before app-spa.js.');
      return;
    }
    if (!window.UOGA_TEMPLATES) {
      console.error('UOGA_TEMPLATES not found. Ensure template files are loaded before app-spa.js.');
      return;
    }

    window.UOGA_ROUTER.register('/', loadHuntPlanner);
    window.UOGA_ROUTER.register('/research', loadHuntResearch);
    window.UOGA_ROUTER.register('/vetting', loadVetting);

    // Default / catch-all falls back to the Hunt Planner.
    window.UOGA_ROUTER.register('*', loadHuntPlanner);

    window.UOGA_ROUTER.start();
  });
})();
