window.UOGA_ROUTER = (() => {
  const routes = new Map();
  const callbacks = [];

  // Route-to-URL map for external pages (used when SPA cannot render inline)
  const externalRoutes = new Map([
    ['research', './hunt-research.html'],
    ['vetting', './vetting.html']
  ]);

  function navigate(path) {
    const segment = path.replace(/^[#/]+/, '');
    if (externalRoutes.has(segment)) {
      window.location.href = externalRoutes.get(segment);
      return;
    }
    const normalizedHash = segment ? segment : '';
    window.location.hash = normalizedHash;
    handleRouteChange();
  }

  function getCurrentRoute() {
    const hash = window.location.hash.replace(/^#\/?/, '');
    return hash || '/';
  }

  function on(path, handler) {
    routes.set(path, handler);
  }

  function onRoute(callback) {
    callbacks.push(callback);
  }

  function updateNavActiveState(route) {
    document.querySelectorAll('[data-route]').forEach(link => {
      const linkRoute = (link.getAttribute('data-route') || '').replace(/^\//, '') || '/';
      const currentSegment = (route || '/').replace(/^\//, '') || '/';
      const isActive = linkRoute === currentSegment;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function handleRouteChange() {
    const route = getCurrentRoute();
    updateNavActiveState(route);
    callbacks.forEach(cb => cb(route));
    const handler = routes.get(route) ?? routes.get('*');
    if (typeof handler === 'function') handler(route);
  }

  window.addEventListener('hashchange', handleRouteChange);

  // Intercept clicks on [data-route] links.
  // Only use hash routing when staying on the same HTML document; otherwise follow the href directly.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-route]');
    if (!link) return;
    const route = link.getAttribute('data-route');
    if (route === null) return;
    const href = link.getAttribute('href') || '';
    // If href points to a different HTML file, let the browser navigate naturally
    if (href && !href.startsWith('#') && href.includes('.html')) {
      return;
    }
    event.preventDefault();
    navigate(route);
  });

  // Initialize active state on load
  document.addEventListener('DOMContentLoaded', () => {
    handleRouteChange();
  });

  return { navigate, getCurrentRoute, on, onRoute, handleRouteChange, updateNavActiveState };
})();
