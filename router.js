/**
 * UOGA SPA Router
 * Lightweight hash-based client-side router.
 * Routes: #/ (Hunt Planner), #/research (Hunt Research), #/vetting (Outfitter Verification)
 */
window.UOGA_ROUTER = (() => {
  const routes = new Map();
  let currentPath = null;

  function getRouteInfo() {
    const raw = window.location.hash.slice(1) || '/';
    const qIdx = raw.indexOf('?');
    const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
    const search = qIdx === -1 ? '' : raw.slice(qIdx + 1);
    const params = new URLSearchParams(search);
    return { path, params };
  }

  function register(path, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`UOGA_ROUTER.register: handler for "${path}" must be a function`);
    }
    routes.set(path, handler);
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function dispatch() {
    const { path, params } = getRouteInfo();
    if (path === currentPath) return;
    currentPath = path;
    // Only invoke handlers that were explicitly registered via register().
    // This prevents unvalidated dynamic dispatch if the routes map is ever
    // extended with non-function values.
    let handler = routes.get(path);
    if (typeof handler !== 'function') {
      handler = routes.get('*');
    }
    if (typeof handler !== 'function') {
      handler = routes.get('/');
    }
    if (typeof handler === 'function') {
      handler(params);
    }
  }

  function start() {
    window.addEventListener('hashchange', () => {
      currentPath = null;
      dispatch();
    });
    dispatch();
  }

  return { register, navigate, start, getRouteInfo };
})();
