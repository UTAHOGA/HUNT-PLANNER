/**
 * UOGA Hunt Research Page Template
 * Full markup for the Hunt Research (#/research) route.
 * Includes page-specific CSS as an inline <style> block.
 */
window.UOGA_TEMPLATES = window.UOGA_TEMPLATES || {};

window.UOGA_TEMPLATES.huntResearch = function huntResearch() {
  return `
    <style id="research-page-styles">
      :root {
        --research-bg: #0f0b09;
        --research-panel: rgba(28, 21, 17, 0.92);
        --research-panel-strong: rgba(35, 25, 19, 0.97);
        --research-line: rgba(170, 124, 84, 0.52);
        --research-line-soft: rgba(255, 255, 255, 0.08);
        --research-text: #f7efe7;
        --research-muted: #d2b9a4;
        --research-accent: #e07429;
        --research-accent-dark: #a94d1a;
        --research-good: #7fd68e;
        --research-warn: #f1c56a;
        --research-bad: #f29c82;
        --research-info: #8ec6ff;
        --research-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
        --research-radius: 22px;
        --research-pill: 999px;
      }

      .research-page {
        min-height: 100vh;
        color: var(--research-text);
        background:
            linear-gradient(180deg, rgba(10, 8, 7, 0.78), rgba(10, 8, 7, 0.86)),
            url('./assets/logos/backgrounds/topo-black-with-hills.jpg') center top / 100% auto repeat-y,
            #110d0b;
      }

      .topbar,
      .research-shell {
        position: relative;
        z-index: 1;
      }

      .research-shell {
        width: min(1700px, calc(100vw - 28px));
        max-width: none;
        margin: 0 auto;
        padding: 18px 24px 38px;
        display: grid;
        gap: 18px;
      }

      .research-card,
      .result-card,
      .side-card {
        border: 1px solid var(--research-line);
        border-radius: var(--research-radius);
        background: linear-gradient(180deg, rgba(31, 24, 19, 0.95), rgba(18, 14, 11, 0.97));
        box-shadow: var(--research-shadow);
        overflow: hidden;
        backdrop-filter: blur(10px);
      }

      .card-head {
        padding: 16px 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: linear-gradient(180deg, rgba(224, 116, 41, 0.96), rgba(169, 77, 26, 0.98));
        color: #fff8f1;
      }

      .card-head p {
        margin: 0 0 5px;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: rgba(255, 248, 241, 0.88);
      }

      .card-head h2,
      .card-head h3,
      .report-title h2,
      .report-title h3 {
        margin: 0;
        font-family: var(--font-display);
        line-height: 0.96;
      }

      .card-body {
        padding: 18px;
      }

      .hero-grid,
      .layout-grid,
      .report-grid,
      .table-grid,
      .summary-grid,
      .chip-grid,
      .control-grid,
      .helper-grid,
      .quick-grid,
      .basket-list {
        display: grid;
        gap: 14px;
      }

      .hero-grid {
        grid-template-columns: 1.15fr 0.85fr;
        align-items: start;
      }

      .hero-copy {
        display: grid;
        gap: 10px;
        align-content: center;
        justify-items: center;
        text-align: center;
      }

      .hero-copy h2 {
        margin: 0;
        color: #fff8f1;
        font-family: var(--font-display);
        font-size: clamp(21px, 2vw, 24px);
        line-height: 1.08;
        max-width: none;
        white-space: nowrap;
      }

      .hero-copy p,
      .helper-card p,
      .report-copy,
      .empty-note,
      .backpack-card p,
      .note-box p,
      .proof-note {
        margin: 0;
        color: var(--research-muted);
        line-height: 1.64;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        min-height: 44px;
        padding: 12px 24px;
        border-radius: var(--research-pill);
        border: 1px solid rgba(224, 116, 41, 0.4);
        background: rgba(224, 116, 41, 0.1);
        color: #fff8f1;
        font-family: var(--font-display);
        font-size: 16px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: 0.04em;
        text-transform: none;
        text-align: center;
        justify-self: center;
      }

      .hero-actions,
      .control-actions,
      .report-actions,
      .backpack-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .hero-card .card-body {
        padding-top: 16px;
        padding-bottom: 12px;
      }

      .research-btn,
      .research-link,
      .mini-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 11px 15px;
        border-radius: 14px;
        border: 1px solid rgba(170, 124, 84, 0.84);
        background: rgba(255, 255, 255, 0.05);
        color: #fff8f1;
        text-decoration: none;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      }

      .research-btn:hover,
      .research-link:hover,
      .mini-btn:hover {
        transform: translateY(-1px);
        background: rgba(224, 116, 41, 0.14);
        border-color: rgba(224, 116, 41, 0.92);
        box-shadow: 0 0 0 2px rgba(224, 116, 41, 0.16);
      }

      .research-btn.primary {
        border-color: #d1ab83;
        background: linear-gradient(180deg, rgba(224, 116, 41, 0.98), rgba(183, 89, 32, 0.98));
        color: #2f1d12;
        box-shadow: 0 10px 24px rgba(82, 44, 20, 0.28);
      }

      .research-btn.primary:hover {
        border-color: rgba(224, 116, 41, 0.98);
        background: linear-gradient(180deg, rgba(233, 126, 52, 0.98), rgba(194, 95, 35, 0.98));
        color: #2f1d12;
        box-shadow: 0 0 0 2px rgba(224, 116, 41, 0.18), 0 12px 28px rgba(82, 44, 20, 0.30);
        transform: translateY(-2px);
      }

      .helper-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .helper-card,
      .chip,
      .summary-card,
      .quick-card,
      .note-box,
      .empty-note,
      .backpack-card,
      .report-table-card,
      .report-info-card {
        border: 1px solid var(--research-line-soft);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.04);
        padding: 15px;
      }

      .chip,
      .summary-card,
      .quick-card,
      .note-box {
        text-align: center;
      }

      .note-box {
        display: grid;
        align-content: center;
        justify-items: center;
        min-height: 88px;
      }

      .helper-card .label,
      .chip .label,
      .summary-card .label,
      .quick-card .label,
      .backpack-card .label,
      .note-box .label {
        display: block;
        margin-bottom: 6px;
        color: #ddb089;
        font-size: 16px;
        font-weight: 900;
        line-height: 1.15;
        text-align: center;
      }

      .signal-list {
        margin: 0;
        padding-left: 18px;
        color: var(--research-muted);
        line-height: 1.55;
        display: grid;
        gap: 6px;
      }

      .signal-list li::marker { color: #ddb089; }
      .signal-list strong { color: #fff8f1; }
      .signal-list strong.signal-word-green { color: #7fd68e !important; }
      .signal-list strong.signal-word-yellow { color: #f1c56a !important; }
      .signal-list strong.signal-word-red { color: #ff6767 !important; }

      .chip.signal-chip,
      .summary-card.signal-card {
        display: grid;
        gap: 12px;
        align-items: start;
      }

      .signal-inline {
        display: grid;
        grid-template-columns: minmax(120px, 160px) minmax(0, 1fr);
        gap: 14px;
        align-items: center;
      }

      .signal-inline-main {
        display: grid;
        gap: 8px;
        align-content: center;
        justify-items: center;
        text-align: center;
      }

      .signal-inline .signal-list {
        padding-left: 16px;
        gap: 4px;
        font-size: 13px;
        line-height: 1.45;
      }

      .summary-card.signal-card { grid-column: span 2; }

      .layout-grid {
        grid-template-columns: minmax(0, 1.18fr) minmax(320px, 0.82fr);
        align-items: start;
      }

      .main-stack,
      .side-stack {
        display: grid;
        gap: 18px;
      }

      .control-grid {
        grid-template-columns: 1.2fr 0.9fr 0.8fr auto;
        align-items: end;
      }

      .control-field {
        display: grid;
        gap: 8px;
      }

      .control-field label {
        color: #ebd4c3;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .control-field input,
      .control-field select {
        width: 100%;
        min-width: 0;
        padding: 13px 14px;
        border-radius: 14px;
        border: 1px solid rgba(170, 124, 84, 0.78);
        background: rgba(255, 255, 255, 0.05);
        color: #fff8f1;
        font: inherit;
      }

      .control-field select option {
        color: #2b1c12;
        background: #fff3e7;
      }

      .status-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 14px;
      }

      .status-box {
        border-radius: 16px;
        border: 1px solid var(--research-line-soft);
        background: rgba(255, 255, 255, 0.04);
        padding: 14px;
        color: var(--research-muted);
        line-height: 1.6;
      }

      .result-card .card-body {
        display: grid;
        gap: 16px;
      }

      .report-title {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 14px;
        flex-wrap: wrap;
      }

      .report-title p {
        margin: 0 0 5px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #ddb190;
      }

      .report-title h2 {
        color: #fff8f1;
        font-size: clamp(24px, 2.5vw, 34px);
      }

      .report-title .report-copy {
        max-width: 66ch;
        font-size: 15px;
        color: #f0d9c4;
      }

      .chip-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .chip .value {
        font-family: var(--font-display);
        font-size: 28px;
        line-height: 0.94;
      }

      .chip .subvalue {
        margin-top: 6px;
        color: var(--research-muted);
        font-size: 12px;
        line-height: 1.5;
      }

      .outlook-light-strip {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        min-height: 38px;
      }

      .outlook-light {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.12);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.28);
        opacity: 0.32;
      }

      .outlook-light.is-active { opacity: 1; transform: scale(1.06); }
      .outlook-light.red.is-active { background: #e15759; box-shadow: 0 0 0 4px rgba(225,87,89,0.16), 0 0 18px rgba(225,87,89,0.42); }
      .outlook-light.yellow.is-active { background: #f4c542; box-shadow: 0 0 0 4px rgba(244,197,66,0.16), 0 0 18px rgba(244,197,66,0.42); }
      .outlook-light.green.is-active { background: #52b36a; box-shadow: 0 0 0 4px rgba(82,179,106,0.16), 0 0 18px rgba(82,179,106,0.42); }

      .likelihood-guaranteed { color: var(--research-good); }
      .likelihood-live { color: var(--research-warn); }
      .likelihood-longshot { color: var(--research-bad); }
      .likelihood-unknown { color: var(--research-info); }

      .summary-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .summary-card .value {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.45;
      }

      .report-grid {
        grid-template-columns: 1.06fr 0.94fr;
        align-items: start;
      }

      .report-table-head,
      .report-info-head {
        padding: 12px 14px;
        border-bottom: 1px solid var(--research-line-soft);
        background: rgba(255, 255, 255, 0.03);
      }

      .report-table-head h3,
      .report-info-head h3 {
        margin: 0;
        color: #fff8f1;
        font-family: var(--font-display);
        font-size: 24px;
        line-height: 0.98;
      }

      .report-table-head p,
      .report-info-head p {
        margin: 4px 0 0;
        color: var(--research-muted);
        font-size: 12px;
        line-height: 1.5;
      }

      .report-table-wrap { overflow: auto; }

      table.report-table {
        width: 100%;
        border-collapse: collapse;
        min-width: 720px;
      }

      .report-table thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        padding: 11px 10px;
        text-align: left;
        background: rgba(29, 23, 19, 0.98);
        color: #ead7c8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .report-table tbody td {
        padding: 11px 10px;
        border-top: 1px solid rgba(170, 124, 84, 0.24);
        color: #f6ede6;
        font-size: 13px;
        line-height: 1.45;
        vertical-align: top;
      }

      .report-table tbody tr:nth-child(odd) { background: rgba(255, 255, 255, 0.015); }

      .report-table tbody tr.is-guaranteed-row {
        background: linear-gradient(90deg, rgba(224, 116, 41, 0.18) 0, rgba(224, 116, 41, 0.08) 28px, rgba(255, 248, 241, 0.96) 28px, rgba(255, 248, 241, 0.96) 100%);
        color: #2f1d12;
        box-shadow: inset 0 0 0 1px rgba(224, 116, 41, 0.38);
      }

      .report-table tbody tr.is-user-row {
        background: linear-gradient(90deg, rgba(255, 214, 64, 0.16) 0, rgba(255, 214, 64, 0.08) 28px, rgba(255, 252, 233, 0.94) 28px, rgba(255, 252, 233, 0.94) 100%);
        color: #2f2414;
        box-shadow: inset 0 0 0 1px rgba(255, 214, 64, 0.26);
      }

      .report-table tbody tr.is-user-row.is-guaranteed-row {
        background: linear-gradient(90deg, rgba(255, 214, 64, 0.22) 0, rgba(255, 214, 64, 0.10) 18px, rgba(224, 116, 41, 0.16) 18px, rgba(255, 248, 241, 0.98) 38px, rgba(255, 248, 241, 0.98) 100%);
        color: #2f1d12;
        box-shadow: inset 0 0 0 1px rgba(224, 116, 41, 0.40);
      }

      .report-table tbody tr.is-guaranteed-row td,
      .report-table tbody tr.is-user-row td,
      .report-table tbody tr.is-user-row.is-guaranteed-row td {
        color: inherit;
        font-weight: 600;
      }

      .report-table tbody tr.is-guaranteed-row td:first-child,
      .report-table tbody tr.is-user-row td:first-child,
      .report-table tbody tr.is-user-row.is-guaranteed-row td:first-child {
        color: #23150d;
        font-weight: 700;
      }

      .marker-stack { display: flex; gap: 6px; flex-wrap: wrap; }

      .marker-pill {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(170, 124, 84, 0.58);
        background: rgba(255, 255, 255, 0.06);
        color: #fff8f1;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .marker-pill.guaranteed {
        border-color: rgba(224, 116, 41, 0.96);
        background: rgba(255, 246, 240, 0.98);
        color: #e07429;
        box-shadow: 0 0 0 1px rgba(224, 116, 41, 0.22);
      }

      .marker-pill.user {
        border-color: rgba(255, 214, 64, 0.95);
        background: rgba(47, 29, 18, 0.94);
        color: #ffd640;
        box-shadow: 0 0 0 1px rgba(255, 214, 64, 0.18);
      }

      .marker-pill.cutoff {
        border-color: rgba(246, 210, 120, 0.7);
        background: rgba(246, 210, 120, 0.14);
        color: #ffe9b6;
      }

      .marker-pill.sources {
        border-color: rgba(224, 116, 41, 0.92);
        background: transparent;
        color: #e07429;
        cursor: pointer;
      }

      .marker-pill.sources:hover { background: rgba(224, 116, 41, 0.12); }

      .source-modal[hidden] { display: none; }

      .source-modal {
        position: fixed;
        inset: 0;
        z-index: 60;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(12, 8, 6, 0.76);
      }

      .source-modal-card {
        width: min(700px, 100%);
        padding: 24px;
        border-radius: 22px;
        border: 1px solid rgba(170, 124, 84, 0.42);
        background: linear-gradient(180deg, rgba(39, 27, 21, 0.98), rgba(21, 15, 12, 0.98));
        box-shadow: 0 28px 70px rgba(0, 0, 0, 0.45);
      }

      .source-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 18px;
      }

      .source-modal-head h3 { margin: 0; color: #fff3e7; font-size: 1.3rem; }
      .source-modal-head p { margin: 6px 0 0; color: rgba(255, 243, 231, 0.72); }

      .source-close {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        border: 1px solid rgba(170, 124, 84, 0.42);
        background: rgba(255,255,255,0.06);
        color: #fff8f1;
        cursor: pointer;
      }

      .source-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }

      .source-box {
        padding: 14px;
        border-radius: 16px;
        border: 1px solid rgba(170, 124, 84, 0.28);
        background: rgba(255,255,255,0.04);
      }

      .source-box .label { display: block; margin-bottom: 6px; }
      .source-box .value { color: #fff3e7; font-weight: 700; }

      .backpack-card h4 { margin: 0 0 6px; font-size: 16px; line-height: 1.32; }
      .backpack-card p + p { margin-top: 6px; }

      .proof-note { font-size: 14px; }

      [hidden] { display: none !important; }

      @media print {
        .topbar, .hero-card, .controls-card, .side-stack, .report-actions { display: none !important; }
        .research-page { background: #fff; color: #111; }
        .research-shell { max-width: none; padding: 0; }
        .result-card, .report-table-card, .report-info-card, .summary-card, .chip, .quick-card, .note-box {
          box-shadow: none; border-color: #999; background: #fff;
        }
        .report-table thead th, .report-table tbody td, .card-head, .report-table-head, .report-info-head {
          color: #111; background: #fff;
        }
      }

      @media (max-width: 1220px) {
        .hero-grid, .layout-grid, .report-grid, .table-grid, .chip-grid, .summary-grid,
        .helper-grid, .quick-grid, .proof-grid, .control-grid, .status-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .research-shell { padding: 14px 14px 28px; }
        .hero-copy h2 { max-width: none; font-size: clamp(14px, 4.5vw, 16px); white-space: normal; }
        .chip .value, .quick-card .value.big { font-size: 24px; }
        .hero-actions, .report-actions, .backpack-actions { flex-direction: column; }
        .research-btn, .research-link { width: 100%; }
      }
    </style>

    ${window.UOGA_TEMPLATES.topbar('research')}

    <main class="research-shell">
      <section class="research-card hero-card">
        <div class="card-body">
          <div class="hero-grid">
            <div class="hero-copy">
              <span class="eyebrow">U.O.G.A. Hunt Prediction Engine</span>
              <h2>Enter hunt code, residency, and points.</h2>
              <p>See the line, your odds, and whether the hunt is realistically in reach.</p>
              <div class="hero-actions">
                <button class="research-btn primary" type="button" data-action="focus-hunt-code">Run Hunt Research</button>
                <button class="research-btn" type="button" data-action="scroll-backpack">Open Hunt Backpack</button>
              </div>
            </div>
            <div class="note-box">
              <span class="label">What this page shows</span>
              <p>Where your point level sits against the draw guaranteed line, what your modeled draw odds look like, and how point creep directly affects you.</p>
            </div>
          </div>
        </div>
      </section>

      <div class="layout-grid">
        <div class="main-stack">
          <section class="research-card controls-card">
            <div class="card-head">
              <p>Hunter Inputs</p>
              <h2>Choose a hunt</h2>
            </div>
            <div class="card-body">
              <div class="control-grid">
                <div class="control-field">
                  <label for="huntCodeInput">Hunt Code</label>
                  <input id="huntCodeInput" type="text" placeholder="DB1019" />
                </div>
                <div class="control-field">
                  <label for="residencySelect">Residency</label>
                  <select id="residencySelect">
                    <option value="Resident">Resident</option>
                    <option value="Nonresident">Nonresident</option>
                  </select>
                </div>
                <div class="control-field">
                  <label for="pointsInput">Current Points</label>
                  <input id="pointsInput" type="number" min="0" max="32" step="1" value="12" />
                </div>
                <div class="control-actions">
                  <button id="runResearchButton" class="research-btn primary" type="button">Run Report</button>
                  <button id="clearFiltersButton" class="research-btn" type="button">Clear</button>
                  <button id="addToBasketButton" class="research-btn" type="button">Save Hunt</button>
                </div>
              </div>
              <div class="status-grid">
                <div id="filterReadout" class="status-box">Loading hunt research data.</div>
                <div id="plannerReadout" class="status-box">Selected hunts from Hunt Planner appear in your Hunt Backpack.</div>
              </div>
            </div>
          </section>

          <section class="result-card">
            <div class="card-head">
              <p>Your Hunt Read</p>
              <h2>Can You Draw This Hunt?</h2>
            </div>
            <div class="card-body">
              <div id="detailEmpty" class="empty-note">
                <strong style="display:block;margin-bottom:8px;color:#fff8f1;font-size:16px;">No hunt selected yet</strong>
                Load a hunt from Hunt Backpack or enter a hunt code.
              </div>

              <div id="detailContent" hidden>
                <div class="report-title">
                  <div>
                    <p>Hunt point summary</p>
                    <h2 id="detailTitle">Choose a hunt</h2>
                    <div id="detailSubtitle" class="report-copy"></div>
                  </div>
                  <div class="report-actions">
                    <a id="openPlannerLink" class="research-link" href="#/" data-spa-link="/">Open Planner</a>
                    <a id="openDwrLink" class="research-link" href="#" target="_blank" rel="noopener noreferrer">Open DWR Hunt</a>
                  </div>
                </div>

                <div class="chip-grid">
                  <div class="chip">
                    <span class="label">Selected Hunt Code</span>
                    <div id="selectedHuntCodeRead" class="value">Not loaded</div>
                  </div>
                  <div class="chip">
                    <span class="label">Harvest Success</span>
                    <div id="selectedHarvestSuccess" class="value">Not loaded</div>
                  </div>
                  <div class="chip">
                    <span class="label">Res Permits</span>
                    <div id="selectedResidentPermits" class="value">Not loaded</div>
                  </div>
                  <div class="chip">
                    <span class="label">Non-Res Permits</span>
                    <div id="selectedNonresidentPermits" class="value">Not loaded</div>
                  </div>
                </div>

                <div class="summary-grid">
                  <div class="summary-card">
                    <span class="label">Guaranteed To Draw Line</span>
                    <span id="summaryGuaranteed" class="value">Not available</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Your Points</span>
                    <span id="summaryPoints" class="value">Not available</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Point Status</span>
                    <span id="summaryStatus" class="value">Not available</span>
                  </div>
                  <div class="summary-card">
                    <span class="label">Estimated Draw Odds</span>
                    <span id="summaryOdds" class="value">Not available</span>
                  </div>
                  <div class="summary-card signal-card">
                    <span class="label">Draw Prediction</span>
                    <div class="signal-inline">
                      <div class="signal-inline-main">
                        <div id="selectedOutlook" class="outlook-light-strip" aria-label="Draw outlook light">
                          <span class="outlook-light red"></span>
                          <span class="outlook-light yellow"></span>
                          <span class="outlook-light green"></span>
                        </div>
                      </div>
                      <ul class="signal-list">
                        <li><strong class="signal-word-green">Green:</strong> Guaranteed draw.</li>
                        <li><strong class="signal-word-yellow">Yellow:</strong> Live on the split draw line.</li>
                        <li><strong class="signal-word-red">Red:</strong> Random pool draw only.</li>
                      </ul>
                    </div>
                  </div>
                  <div class="summary-card signal-card">
                    <span class="label">Point Creep Trend</span>
                    <div class="signal-inline">
                      <div class="signal-inline-main">
                        <div id="summaryTrend" class="outlook-light-strip" aria-label="Trend light">
                          <span class="outlook-light red"></span>
                          <span class="outlook-light yellow"></span>
                          <span class="outlook-light green"></span>
                        </div>
                        <span id="summaryTrendText" class="subvalue">Not available</span>
                      </div>
                      <ul class="signal-list">
                        <li><strong class="signal-word-green">Green:</strong> You are catching up.</li>
                        <li><strong class="signal-word-yellow">Yellow:</strong> The line is holding pace.</li>
                        <li><strong class="signal-word-red">Red:</strong> Point creep is outrunning you.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <section class="report-info-card">
                  <div class="report-info-head">
                    <h3>Recommendation</h3>
                  </div>
                  <div style="padding:14px;">
                    <p id="summaryRecommendation" class="proof-note">Recommendation not available.</p>
                  </div>
                </section>

                <section class="report-table-card">
                  <div class="report-table-head">
                    <h3>Point ladder</h3>
                    <p>Yellow = you. Orange = guaranteed.</p>
                  </div>
                  <div id="ladderTableEmpty" class="empty-note" style="margin:14px;">No ladder rows for this hunt and residency yet.</div>
                  <div id="ladderTableWrap" class="report-table-wrap" hidden>
                    <table class="report-table">
                      <thead>
                        <tr id="ladderHeaderRow">
                          <th>Point</th>
                          <th>2025 Actual Odds</th>
                          <th id="ladderPrimaryHeader">2026 Max Pool</th>
                          <th id="ladderSecondaryHeader">2026 Random Draw</th>
                          <th>Markers</th>
                        </tr>
                      </thead>
                      <tbody id="ladderTableBody"></tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>

    <div id="sourceModal" class="source-modal" hidden>
      <div class="source-modal-card" role="dialog" aria-modal="true" aria-labelledby="sourceModalTitle">
        <div class="source-modal-head">
          <div>
            <h3 id="sourceModalTitle">DWR Source Snapshot</h3>
            <p id="sourceModalSubtitle">Source details for this hunt row.</p>
          </div>
          <button id="sourceModalClose" class="source-close" type="button" aria-label="Close sources">X</button>
        </div>
        <div id="sourceModalGrid" class="source-grid"></div>
      </div>
    </div>
  `;
};

