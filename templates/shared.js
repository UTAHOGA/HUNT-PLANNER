/**
 * UOGA Shared Templates
 * Shared UI components used across all SPA pages.
 */
window.UOGA_TEMPLATES = window.UOGA_TEMPLATES || {};

/**
 * Renders the site topbar.
 * @param {string} activePage - One of 'planner', 'research', 'vetting'
 * @param {Object} [options] - Optional extra controls HTML
 * @param {string} [options.extraControls] - HTML string for page-specific controls
 */
window.UOGA_TEMPLATES.topbar = function topbar(activePage, options = {}) {
  const { extraControls = '' } = options;

  return `
    <header class="topbar">
<nav class="utility-nav" aria-label="Site sections">
        <a class="utility-link${activePage === 'planner' ? ' active' : ''}"
           href="#/"
           data-spa-link="/"
           ${activePage === 'planner' ? 'aria-current="page"' : ''}>Hunt Planner</a>
        <a class="utility-link${activePage === 'research' ? ' active' : ''}"
           href="#/research"
           data-spa-link="/research"
           ${activePage === 'research' ? 'aria-current="page"' : ''}>Hunt Research</a>
        <a class="utility-link${activePage === 'vetting' ? ' active' : ''}"
           href="#/vetting"
           data-spa-link="/vetting"
           ${activePage === 'vetting' ? 'aria-current="page"' : ''}>Outfitter Verification</a>
      </nav>
      <div class="controls">
        ${extraControls}
      </div>
    </header>
  `;
};

