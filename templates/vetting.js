/**
 * UOGA Vetting Page Template
 * Full markup for the Outfitter Verification (#/vetting) route.
 * Includes page-specific CSS as an inline <style> block.
 */
window.UOGA_TEMPLATES = window.UOGA_TEMPLATES || {};

window.UOGA_TEMPLATES.vetting = function vetting() {
  return `
    <style id="vetting-page-styles">
      /* Variables that the vetting page uses but are not in the shared style.css */
      .vetting-page {
        --line-soft: rgba(244, 239, 228, 0.12);
        --panel-strong: rgba(28, 24, 20, 0.96);
      }

      .vetting-page {
        min-height: 100vh;
      }

      .vetting-page .shell {
        width: min(1200px, calc(100vw - 28px));
        margin: 0 auto;
        padding: 20px 0 40px;
      }

      .vetting-page .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .vetting-page .brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .vetting-page .brand img {
        height: 72px;
        width: auto;
        background: #fff;
        border-radius: 6px;
        padding: 2px;
      }

      .vetting-page .brand-copy h1 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 32px;
        line-height: .98;
        text-transform: uppercase;
      }

      .vetting-page .brand-copy p {
        margin: 6px 0 0;
        color: var(--accent);
        font-size: 22px;
        font-family: var(--font-display);
        line-height: 1.08;
        text-transform: none;
      }

      .vetting-page .nav {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .vetting-page .nav a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--panel2);
        color: var(--text);
        text-decoration: none;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
        font-size: 12px;
      }

      .vetting-page .nav a.active,
      .vetting-page .nav a:hover {
        border-color: var(--accent);
        background: rgba(255, 102, 0, 0.16);
      }

      .vetting-page .nav-icon-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        text-decoration: none;
        cursor: pointer;
      }

      .vetting-page .nav-icon-link img {
        display: block;
        width: auto;
        height: 54px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.22);
        transition: transform 0.14s ease, box-shadow 0.14s ease;
      }

      .vetting-page .nav-icon-link:hover img,
      .vetting-page .nav-icon-link:focus-visible img {
        transform: translateY(-1px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
      }

      .vetting-page .hero {
        margin-top: 18px;
        padding: 30px 28px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background:
          linear-gradient(135deg, rgba(255, 102, 0, 0.14), rgba(255, 102, 0, 0) 44%),
          var(--panel-strong);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .vetting-page .hero h2 {
        margin: 0;
        max-width: 980px;
        font-family: var(--font-display);
        font-size: clamp(30px, 4.5vw, 52px);
        line-height: 1.06;
        color: var(--accent);
        text-align: center;
        margin-left: auto;
        margin-right: auto;
        text-transform: none;
      }

      .vetting-page .hero-sub {
        margin: 14px auto 0;
        max-width: 760px;
        text-align: center;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.5;
      }

      .vetting-page .hero-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 22px;
        justify-content: center;
      }

      .vetting-page .hero-actions a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--text);
        text-decoration: none;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
        font-size: 12px;
        background: var(--panel2);
      }

      .vetting-page .hero-actions a.primary {
        border-color: transparent;
        color: #fff6ed;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
      }

      .vetting-page .hero-actions a:hover { border-color: var(--accent); }

      .vetting-page .status-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
        justify-content: center;
      }

      .vetting-page .status-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 102, 0, 0.28);
        background: rgba(255, 102, 0, 0.12);
        color: var(--text);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .05em;
        text-transform: uppercase;
      }

      .vetting-page .layout {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 18px;
        margin-top: 18px;
      }

      .vetting-page .card {
        padding: 22px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }

      .vetting-page .card h4 {
        margin: 0 0 8px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .vetting-page .card h3 {
        margin: 0 0 14px;
        font-family: var(--font-display);
        font-size: 28px;
        line-height: 1.05;
      }

      .vetting-page .card p,
      .vetting-page .card li {
        color: var(--muted);
        line-height: 1.6;
        font-size: 15px;
      }

      .vetting-page .card ul { margin: 0; padding-left: 18px; }

      .vetting-page .span-4 { grid-column: span 4; }
      .vetting-page .span-5 { grid-column: span 5; }
      .vetting-page .span-6 { grid-column: span 6; }
      .vetting-page .span-7 { grid-column: span 7; }
      .vetting-page .span-8 { grid-column: span 8; }
      .vetting-page .span-12 { grid-column: span 12; }

      .vetting-page .definition-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .vetting-page .definition {
        padding: 18px;
        border: 1px solid var(--line-soft);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.03);
      }

      .vetting-page .definition strong {
        display: block;
        margin-bottom: 10px;
        color: var(--text);
        font-size: 18px;
        letter-spacing: .02em;
      }

      .vetting-page .callout {
        padding: 18px 20px;
        border-radius: 18px;
        border: 1px solid rgba(255, 102, 0, 0.32);
        background: rgba(255, 102, 0, 0.12);
      }

      .vetting-page .callout p,
      .vetting-page .callout li {
        margin: 0;
        color: var(--text);
        line-height: 1.6;
      }

      .vetting-page .callout ul { margin: 0; padding-left: 18px; }

      .vetting-page .footer-note {
        margin-top: 18px;
        padding: 20px 22px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel);
        box-shadow: var(--shadow);
      }

      .vetting-page .footer-note h3 {
        margin: 0 0 10px;
        font-family: var(--font-display);
        font-size: 24px;
        line-height: 1.05;
      }

      .vetting-page .footer-note ul { margin: 0; padding-left: 18px; }
      .vetting-page .footer-note li { color: var(--muted); line-height: 1.6; }

      @media (max-width: 980px) {
        .vetting-page .definition-grid { grid-template-columns: 1fr; }
        .vetting-page .span-4, .vetting-page .span-5, .vetting-page .span-6,
        .vetting-page .span-7, .vetting-page .span-8 { grid-column: span 12; }
      }

      @media (max-width: 760px) {
        .vetting-page .shell { width: min(100vw - 20px, 1200px); padding-top: 14px; }
        .vetting-page .topbar, .vetting-page .hero,
        .vetting-page .card, .vetting-page .footer-note { padding: 18px; }
        .vetting-page .brand { align-items: flex-start; }
        .vetting-page .brand img { height: 58px; }
        .vetting-page .brand-copy h1 { font-size: 26px; }
        .vetting-page .brand-copy p { font-size: 18px; }
        .vetting-page .hero-actions { flex-direction: column; }
        .vetting-page .hero-actions a { width: 100%; }
      }
    </style>

    <div class="vetting-page">
      <div class="shell">
        <header class="topbar">
          <div class="brand">
            <img src="https://static.wixstatic.com/media/43f827_24f00cd070494533955d4910eef3a2fb~mv2.jpg/v1/fill/w_207,h_105,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/Group%20945%20(1).jpg" alt="U.O.G.A. logo">
            <div class="brand-copy">
              <h1>U.O.G.A. Outfitter Verification</h1>
              <p>Professional standards. Clear public trust.</p>
            </div>
          </div>

          <nav class="nav">
            <a href="#/" data-spa-link="/">Hunt Planner</a>
            <a href="#/research" data-spa-link="/research">Hunt Research</a>
            <a href="#/vetting" class="active" data-spa-link="/vetting" aria-current="page">Outfitter Verification</a>
            <a
              href="#dwr-registration-floor"
              class="nav-icon-link"
              title="Jump to Utah DWR registration note"
              aria-label="Jump to Utah DWR registration note"
            >
              <img src="./assets/logos/DWR-CWMU-LOGO.png" alt="Utah DWR" />
            </a>
          </nav>
        </header>

        <section class="hero">
          <h2>Reviewed outfitters. Clearer trust signal.</h2>
          <p class="hero-sub">Verified identity. Reviewed operations. Public standing.</p>

          <div class="status-chips">
            <span class="status-chip">Verified</span>
            <span class="status-chip">Verified</span>
            <span class="status-chip">C.P.O.</span>
          </div>

          <div class="hero-actions">
            <a class="primary" href="#/" data-spa-link="/">Return to Hunt Planner</a>
            <a href="#/research" data-spa-link="/research">Open Hunt Research</a>
          </div>
        </section>

        <section class="layout">
          <article class="card span-12">
            <h4>At a Glance</h4>
            <h3>What it means</h3>
            <ul>
              <li>Only reviewed outfitters are publicly listed</li>
              <li>Designation is meant to create a trust signal</li>
              <li>Not every outfitter qualifies for public listing</li>
              <li>Higher designation requires stronger standing</li>
            </ul>
          </article>

          <article class="card span-12">
            <h4>Designation Levels</h4>
            <h3>Public designation levels</h3>
            <div class="definition-grid">
              <div class="definition">
                <strong>Verified</strong>
                <ul>
                  <li>Baseline public review designation</li>
                  <li>Identity and business profile reviewed</li>
                  <li>Source data compared</li>
                  <li>Suitable for public listing</li>
                </ul>
              </div>
              <div class="definition">
                <strong>Certified Professional Outfitter (C.P.O.)</strong>
                <ul>
                  <li>Higher internal designation</li>
                  <li>All Verified standards already satisfied</li>
                  <li>Stronger overall readiness and standing</li>
                  <li>Reserved for higher-confidence operators</li>
                </ul>
              </div>
              <div class="definition">
                <strong>Unpublished / Hold</strong>
                <ul>
                  <li>Incomplete record</li>
                  <li>Unresolved conflict</li>
                  <li>Not review ready</li>
                  <li>Not publicly designated</li>
                </ul>
              </div>
            </div>
          </article>

          <article class="card span-5">
            <h4>Purpose</h4>
            <h3>Why It Exists</h3>
            <ul>
              <li>Filters weak or unreliable listings</li>
              <li>Creates professional distinction for outfitters</li>
              <li>Gives hunters a stronger trust signal</li>
              <li>Raises the standard above a raw list of names</li>
            </ul>
          </article>

          <article class="card span-7">
            <h4>Verified Means</h4>
            <h3>Baseline trust for listing</h3>
            <ul>
              <li>Business identity is sufficiently confirmed</li>
              <li>Contact information is usable</li>
              <li>Operating relevance is clear enough to publish</li>
              <li>Available source data is reasonably consistent</li>
              <li>No major unresolved conflict remains</li>
            </ul>
          </article>

          <article class="card span-6">
            <h4>Verified Standard</h4>
            <h3>Verified standard</h3>
            <ul>
              <li>Identity and business information reviewed</li>
              <li>Contact information current enough to list</li>
              <li>Registration or licensure identified where applicable</li>
              <li>Services and authority claims are clear</li>
              <li>No major inconsistency blocks publication</li>
            </ul>
          </article>

          <article class="card span-6">
            <h4>C.P.O. Standard</h4>
            <h3>Higher professional standing</h3>
            <ul>
              <li>All Verified requirements already met</li>
              <li>Stronger business completeness and reliability</li>
              <li>Stronger responsiveness and readiness</li>
              <li>Cleaner regulatory and operating standing where applicable</li>
              <li>No material concern that undercuts higher designation</li>
            </ul>
          </article>

          <article class="card span-7">
            <h4>How Review Works</h4>
            <h3>How review works</h3>
            <ul>
              <li>Outfitter submits business and operating information</li>
              <li>U.O.G.A. compares it against available sources</li>
              <li>Record is reviewed for clarity, consistency, and standing</li>
              <li>Result: Verified, C.P.O., or not published</li>
            </ul>
          </article>

          <article class="card span-5">
            <h4>What Gets Reviewed</h4>
            <h3>Sources used</h3>
            <ul>
              <li>Submitted outfitter information</li>
              <li>Public business presence and contact data</li>
              <li>Website and social-business identity</li>
              <li>Government-source information where available</li>
              <li>Federal and state permit-reference information where available</li>
            </ul>
          </article>

          <article class="card span-12" id="dwr-registration-floor">
            <h4>Regulatory Floor</h4>
            <h3>Utah DWR registration matters</h3>
            <div class="callout">
              <ul>
                <li>Where Utah DWR registration is required, that status matters in review</li>
                <li>U.O.G.A. does not replace DWR authority</li>
                <li>Public designation should reflect whether that baseline is addressed</li>
              </ul>
            </div>
          </article>

          <article class="card span-12">
            <h4>Important Limitation</h4>
            <h3>What designation does not mean</h3>
            <ul>
              <li>Not a license</li>
              <li>Not a permit grant</li>
              <li>Not a land-access guarantee</li>
              <li>Not an agency authorization</li>
              <li>Not a legal determination</li>
            </ul>
          </article>
        </section>

        <section class="footer-note">
          <h3>Ongoing review still applies</h3>
          <ul>
            <li>Designation may require updated information</li>
            <li>U.O.G.A. may re-review records over time</li>
            <li>Designation may be removed if information becomes incomplete, inconsistent, outdated, or unreliable</li>
          </ul>
        </section>
      </div>
    </div>
  `;
};
