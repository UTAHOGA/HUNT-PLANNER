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
      <div class="brand">
        <div class="brand-logo-lockup">
          <a href="https://www.uoga.org" target="_blank" title="Go to U.O.G.A. Home">
            <img src="https://static.wixstatic.com/media/43f827_24f00cd070494533955d4910eef3a2fb~mv2.jpg/v1/fill/w_207,h_105,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Group%20945%20(1).jpg" alt="U.O.G.A. Logo">
          </a>
          <div>
            <h1>U.O.G.A. Hunt Planner</h1>
            <p>Verified Outfitters</p>
          </div>
        </div>
      </div>
      <div class="controls">
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
        ${extraControls}
      </div>
    </header>
  `;
};
