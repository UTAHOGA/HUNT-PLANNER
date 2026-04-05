(function () {
  const ENGINE_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_ENGINE_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_ENGINE_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_ENGINE_SOURCES
    : ['./processed_data/draw_reality_engine.csv'];
  const LADDER_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_LADDER_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_LADDER_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_LADDER_SOURCES
    : ['./processed_data/point_ladder_view.csv'];
  const MASTER_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_MASTER_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_MASTER_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_MASTER_SOURCES
    : ['./processed_data/hunt_master_enriched.csv'];
  const SELECTED_HUNT_KEY = 'selected_hunt_code';
  const SELECTED_RESIDENCY_KEY = 'selected_hunt_research_residency';
  const SELECTED_POINTS_KEY = 'selected_hunt_research_points';
  const BASKET_KEY = 'uoga_hunt_basket_v1';
  const LEGACY_BASKET_KEY = 'hunt_research_recent_hunts';
  // Public draw permits already account for Expo permits. Conservation permits are not part of draw odds.

  const state = {
    loaded: false,
    selectedHuntCode: '',
    selectedFilters: null,
    selectedMeta: null,
    engineRows: [],
    ladderRows: [],
    masterRows: [],
    engineByKey: new Map(),
    engineGroups: new Map(),
    ladderGroups: new Map(),
    masterByResidency: new Map(),
    masterByCode: new Map(),
  };

  const els = {
    huntCodeInput: document.getElementById('huntCodeInput'),
    residencySelect: document.getElementById('residencySelect'),
    pointsInput: document.getElementById('pointsInput'),
    filterReadout: document.getElementById('filterReadout'),
    plannerReadout: document.getElementById('plannerReadout'),
    runResearchButton: document.getElementById('runResearchButton'),
    clearFiltersButton: document.getElementById('clearFiltersButton'),
    addToBasketButton: document.getElementById('addToBasketButton'),
    selectedOutlook: document.getElementById('selectedOutlook'),
    selectedHuntCodeRead: document.getElementById('selectedHuntCodeRead'),
    detailTitle: document.getElementById('detailTitle'),
    detailSubtitle: document.getElementById('detailSubtitle'),
    detailEmpty: document.getElementById('detailEmpty'),
    detailContent: document.getElementById('detailContent'),
    openPlannerLink: document.getElementById('openPlannerLink'),
    openDwrLink: document.getElementById('openDwrLink'),
    summaryGuaranteed: document.getElementById('summaryGuaranteed'),
    summaryPoints: document.getElementById('summaryPoints'),
    summaryStatus: document.getElementById('summaryStatus'),
    summaryOdds: document.getElementById('summaryOdds'),
    summaryTrend: document.getElementById('summaryTrend'),
    summaryRecommendation: document.getElementById('summaryRecommendation'),
    ladderTableEmpty: document.getElementById('ladderTableEmpty'),
    ladderTableWrap: document.getElementById('ladderTableWrap'),
    ladderTableBody: document.getElementById('ladderTableBody'),
    basketCount: document.getElementById('basketCount'),
    basketList: document.getElementById('basketList'),
    clearBasketButton: document.getElementById('clearBasketButton'),
  };

  function normalizeKey(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normalizeResidencyLabel(value) {
    return String(value || '').trim().toLowerCase() === 'nonresident' ? 'Nonresident' : 'Resident';
  }

  function groupKey(huntCode, residency) {
    return `${normalizeKey(huntCode)}__${normalizeResidencyLabel(residency)}`;
  }

  function rowKey(huntCode, residency, points) {
    return `${groupKey(huntCode, residency)}__${String(points ?? '')}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function num(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatInteger(value) {
    const parsed = num(value);
    return parsed === null ? 'Not available' : parsed.toLocaleString();
  }

  function formatProbability(value) {
    const parsed = num(value);
    if (parsed === null) return 'Not available';
    if (parsed >= 99.95) return '100%';
    if (parsed >= 10) return `${parsed.toFixed(1)}%`;
    if (parsed >= 1) return `${parsed.toFixed(2)}%`;
    return `${parsed.toFixed(3)}%`;
  }

  function formatGapStatus(gap) {
    const parsed = num(gap);
    if (parsed === null) return 'Not available';
    if (parsed > 0) return `${parsed} pts short of guaranteed`;
    if (parsed === 0) return 'At guaranteed';
    return `${Math.abs(parsed)} pts above guaranteed`;
  }

  function getCurrentPoints() {
    const value = num(els.pointsInput.value);
    return value === null ? 0 : Math.max(0, Math.min(32, value));
  }

  function getResidencyKey() {
    return normalizeResidencyLabel(els.residencySelect.value);
  }

  function getBasket() {
    try {
      const current = localStorage.getItem(BASKET_KEY);
      if (current) {
        const parsed = JSON.parse(current);
        return Array.isArray(parsed) ? parsed : [];
      }
      const legacy = localStorage.getItem(LEGACY_BASKET_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('Could not read hunt pack.', error);
    }
    return [];
  }

  function saveBasket(items) {
    const trimmed = items.slice(0, 20);
    localStorage.setItem(BASKET_KEY, JSON.stringify(trimmed));
    localStorage.removeItem(LEGACY_BASKET_KEY);
    window.UOGA_UI?.notifyBackpackChanged?.();
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(value);
        value = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else {
        value += char;
      }
    }
    if (value.length || row.length) {
      row.push(value);
      rows.push(row);
    }
    if (!rows.length) return [];
    const headers = rows.shift().map((header, index) => {
      const cleaned = String(header || '').trim();
      return index === 0 ? cleaned.replace(/^\uFEFF/, '') : cleaned;
    });
    return rows
      .filter((record) => record.some((cell) => String(cell || '').trim() !== ''))
      .map((record) => {
        const mapped = {};
        headers.forEach((header, index) => {
          mapped[header] = record[index] ?? '';
        });
        return mapped;
      });
  }

  async function tryLoadText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed for ${url}`);
    }
    return response.text();
  }

  async function loadFirstAvailable(sources) {
    let lastError = null;
    for (const source of sources) {
      try {
        return {
          source,
          text: await tryLoadText(source),
        };
      } catch (error) {
        lastError = error;
        console.warn(`Failed source: ${source}`, error);
      }
    }
    throw lastError || new Error('No data source could be loaded.');
  }

  function indexData(engineRows, ladderRows, masterRows) {
    state.engineRows = engineRows;
    state.ladderRows = ladderRows;
    state.masterRows = masterRows;
    state.engineByKey = new Map();
    state.engineGroups = new Map();
    state.ladderGroups = new Map();
    state.masterByResidency = new Map();
    state.masterByCode = new Map();

    engineRows.forEach((row) => {
      const residency = normalizeResidencyLabel(row.residency);
      const points = num(row.points);
      const key = rowKey(row.hunt_code, residency, points);
      const group = groupKey(row.hunt_code, residency);
      const normalized = { ...row, residency, points };
      state.engineByKey.set(key, normalized);
      if (!state.engineGroups.has(group)) state.engineGroups.set(group, []);
      state.engineGroups.get(group).push(normalized);
    });

    ladderRows.forEach((row) => {
      const residency = normalizeResidencyLabel(row.residency);
      const group = groupKey(row.hunt_code, residency);
      const normalized = { ...row, residency, points: num(row.points) };
      if (!state.ladderGroups.has(group)) state.ladderGroups.set(group, []);
      state.ladderGroups.get(group).push(normalized);
    });

    masterRows.forEach((row) => {
      const residency = normalizeResidencyLabel(row.residency);
      const group = groupKey(row.hunt_code, residency);
      const normalized = { ...row, residency };
      if (!state.masterByResidency.has(group)) {
        state.masterByResidency.set(group, normalized);
      }
      if (!state.masterByCode.has(normalizeKey(row.hunt_code))) {
        state.masterByCode.set(normalizeKey(row.hunt_code), normalized);
      }
    });

    state.engineGroups.forEach((rows) => rows.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)));
    state.ladderGroups.forEach((rows) => rows.sort((a, b) => (b.points ?? 0) - (a.points ?? 0)));
    state.loaded = true;
  }

  function buildFilters() {
    return {
      huntCode: normalizeKey(els.huntCodeInput.value),
      residency: getResidencyKey(),
      points: getCurrentPoints(),
    };
  }

  function findMeta(huntCode, residency) {
    return state.masterByResidency.get(groupKey(huntCode, residency))
      || state.masterByCode.get(normalizeKey(huntCode))
      || null;
  }

  function getEngineRow(huntCode, residency, points) {
    return state.engineByKey.get(rowKey(huntCode, residency, points)) || null;
  }

  function getLadderRows(huntCode, residency) {
    return state.ladderGroups.get(groupKey(huntCode, residency)) || [];
  }

  function getModeledCoverageStatus(meta, hasEngineGroup) {
    if (hasEngineGroup) return '';
    if (!meta) return 'Hunt not found in the current production backbone.';
    return 'This hunt exists in the canonical hunt backbone, but it does not currently have modeled draw-pressure coverage.';
  }

  function getDisplayedOdds(row) {
    if (!row) return 'Not available';
    if (row.status === 'MAX POOL') return '100%';
    return formatProbability(row.random_draw_odds_2026);
  }

  function getRecommendation(row) {
    if (!row) return 'Modeled recommendation not available for this hunt and residency yet.';
    switch (row.draw_outlook) {
      case 'GREEN LIGHT':
        return 'This hunt is currently inside the max-point pool at your selected point level.';
      case 'POINT CREEP DEFEAT':
        return 'The guaranteed line is moving away faster than your point gain. This is not a realistic catch-up hunt.';
      case 'MAY DRAW IN 5-10 YEARS':
        return 'You are still behind the line, but the hunt remains potentially catchable if trend pressure stabilizes.';
      default:
        return 'You are outside the guaranteed line and relying on the remaining random pool.';
    }
  }

  function renderFilterReadout(filters) {
    els.filterReadout.textContent = filters.huntCode
      ? `${filters.huntCode} · ${filters.residency} · ${filters.points} point${filters.points === 1 ? '' : 's'}.`
      : `${filters.residency} · ${filters.points} point${filters.points === 1 ? '' : 's'}.`;
    els.plannerReadout.textContent = state.selectedHuntCode
      ? `Planner handoff: ${state.selectedHuntCode}.`
      : 'Planner handoff ready.';
  }

  function renderSummary(meta, row, filters, coverageMessage) {
    if (!row) {
      els.selectedOutlook.textContent = coverageMessage ? 'Coverage gap' : 'Not loaded';
      els.summaryGuaranteed.textContent = 'Guaranteed At: Not available';
      els.summaryPoints.textContent = `Your Points: ${formatInteger(filters.points)} pts`;
      els.summaryStatus.textContent = `Status: ${coverageMessage || 'No modeled row available.'}`;
      els.summaryOdds.textContent = 'Estimated Draw Odds: Not available';
      els.summaryTrend.textContent = 'Trend: Not available';
      els.summaryRecommendation.textContent = coverageMessage || 'Recommendation not available.';
      return;
    }

    els.selectedOutlook.textContent = row.draw_outlook || 'Not available';
    els.summaryGuaranteed.textContent = `Guaranteed At: ${formatInteger(row.guaranteed_at_2026)} pts`;
    els.summaryPoints.textContent = `Your Points: ${formatInteger(filters.points)} pts`;
    els.summaryStatus.textContent = `Status: ${formatGapStatus(row.gap)}`;
    els.summaryOdds.textContent = `Estimated Draw Odds: ${getDisplayedOdds(row)} from remaining pool`;
    els.summaryTrend.textContent = `Trend: ${row.trend || 'Not available'}`;
    els.summaryRecommendation.textContent = getRecommendation(row);

    if (els.selectedHuntCodeRead) {
      els.selectedHuntCodeRead.textContent = meta?.hunt_code || filters.huntCode || 'Not loaded';
    }
  }

  function markerHtml(markers) {
    if (!markers.length) return '<span class="marker-pill">Reference</span>';
    return `<div class="marker-stack">${markers.map((marker) => `<span class="marker-pill ${marker.kind}">${escapeHtml(marker.label)}</span>`).join('')}</div>`;
  }

  function renderLadder(huntCode, residency, points) {
    if (!els.ladderTableWrap || !els.ladderTableEmpty || !els.ladderTableBody) return;
    const rows = getLadderRows(huntCode, residency);
    if (!rows.length) {
      els.ladderTableWrap.hidden = true;
      els.ladderTableEmpty.hidden = false;
      els.ladderTableBody.innerHTML = '';
      return;
    }

    els.ladderTableBody.innerHTML = rows.map((row) => {
      const markers = [];
      const classes = [];
      if (row.points === points) {
        markers.push({ kind: 'user', label: 'You' });
        classes.push('is-user-row');
      }
      if (row.guaranteed_marker === 'TRUE') {
        markers.push({ kind: 'guaranteed', label: 'Guaranteed' });
        classes.push('is-guaranteed-row');
      }
      return `
        <tr class="${classes.join(' ')}">
          <td>${formatInteger(row.points)}</td>
          <td>${escapeHtml(row.odds_2025_actual || 'Not available')}</td>
          <td>${formatProbability(row.odds_2026_projected)}</td>
          <td>${markerHtml(markers)}</td>
        </tr>`;
    }).join('');

    els.ladderTableEmpty.hidden = true;
    els.ladderTableWrap.hidden = false;
  }

  function renderEmpty(filters, coverageMessage) {
    els.detailEmpty.hidden = false;
    els.detailContent.hidden = true;
    renderSummary(null, null, filters, coverageMessage);
    if (els.ladderTableWrap) els.ladderTableWrap.hidden = true;
    if (els.ladderTableEmpty) els.ladderTableEmpty.hidden = false;
    if (els.ladderTableBody) els.ladderTableBody.innerHTML = '';
  }

  function renderDetail(filters) {
    const meta = findMeta(filters.huntCode, filters.residency);
    const engineRows = state.engineGroups.get(groupKey(filters.huntCode, filters.residency)) || [];
    const engineRow = getEngineRow(filters.huntCode, filters.residency, filters.points);
    const coverageMessage = getModeledCoverageStatus(meta, engineRows.length > 0);

    if (!filters.huntCode || (!meta && !engineRows.length)) {
      renderEmpty(filters, coverageMessage || 'Type a hunt code or load one from Hunt Pack.');
      return;
    }

    els.detailEmpty.hidden = true;
    els.detailContent.hidden = false;
    els.detailTitle.textContent = meta ? `${meta.hunt_code} · ${meta.hunt_name}` : filters.huntCode;
    els.detailSubtitle.textContent = meta
      ? `${meta.species || 'Unknown'} · ${meta.weapon || 'Unknown weapon'} · ${filters.residency}`
      : `${filters.residency} · ${formatInteger(filters.points)} points`;
    if (els.openPlannerLink) {
      els.openPlannerLink.href = `./index.html?hunt_code=${encodeURIComponent(filters.huntCode)}`;
    }
    if (els.openDwrLink) {
      els.openDwrLink.href = '#';
      els.openDwrLink.setAttribute('aria-disabled', 'true');
    }

    renderSummary(meta, engineRow, filters, coverageMessage);
    renderLadder(filters.huntCode, filters.residency, filters.points);

    state.selectedMeta = meta;
    state.selectedFilters = filters;
  }

  function upsertBasketItem(meta, filters, engineRow) {
    if (!meta) return;
    const items = getBasket().filter((item) => normalizeKey(item.hunt_code) !== normalizeKey(meta.hunt_code));
    items.unshift({
      hunt_code: meta.hunt_code,
      hunt_name: meta.hunt_name,
      species: meta.species,
      weapon: meta.weapon,
      residency: filters.residency,
      selected_points: filters.points,
      draw_outlook: engineRow?.draw_outlook || '',
      updated_at: Date.now(),
    });
    saveBasket(items);
    renderBasket();
  }

  function removeBasketItem(huntCode) {
    saveBasket(getBasket().filter((item) => normalizeKey(item.hunt_code) !== normalizeKey(huntCode)));
    renderBasket();
  }

  function renderBasket() {
    const items = getBasket();
    if (els.basketCount) {
      els.basketCount.textContent = String(items.length);
    }
    if (!els.basketList) return;

    if (!items.length) {
      els.basketList.innerHTML = `
        <div class="backpack-card">
          <strong style="display:block;margin-bottom:8px;color:#fff8f1;">No hunts saved yet</strong>
          <p>Add a selected hunt to keep it moving between Hunt Planner and Hunt Research.</p>
        </div>`;
      return;
    }

    els.basketList.innerHTML = items.map((item) => `
      <div class="backpack-card">
        <span class="label">${escapeHtml(item.hunt_code)}</span>
        <h4>${escapeHtml(item.hunt_name || item.hunt_code)}</h4>
        <p>${escapeHtml(item.species || '')}${item.weapon ? ` · ${escapeHtml(item.weapon)}` : ''} · ${escapeHtml(item.residency || 'Resident')} · ${formatInteger(item.selected_points)} points</p>
        <p>${escapeHtml(item.draw_outlook || 'Saved for later review.')}</p>
        <div class="backpack-actions">
          <button class="mini-btn" type="button" data-basket-load="${escapeHtml(item.hunt_code)}">Load</button>
          <button class="mini-btn" type="button" data-basket-remove="${escapeHtml(item.hunt_code)}">Remove</button>
        </div>
      </div>`).join('');

    els.basketList.querySelectorAll('[data-basket-load]').forEach((button) => {
      button.addEventListener('click', () => {
        const huntCode = normalizeKey(button.getAttribute('data-basket-load'));
        const item = items.find((entry) => normalizeKey(entry.hunt_code) === huntCode);
        if (!item) return;
        els.huntCodeInput.value = item.hunt_code || '';
        els.residencySelect.value = item.residency || 'Resident';
        els.pointsInput.value = String(item.selected_points ?? 0);
        runResearch();
      });
    });

    els.basketList.querySelectorAll('[data-basket-remove]').forEach((button) => {
      button.addEventListener('click', () => removeBasketItem(button.getAttribute('data-basket-remove')));
    });
  }

  async function loadData() {
    const [engine, ladder, master] = await Promise.all([
      loadFirstAvailable(ENGINE_SOURCES),
      loadFirstAvailable(LADDER_SOURCES),
      loadFirstAvailable(MASTER_SOURCES),
    ]);
    indexData(parseCsv(engine.text), parseCsv(ladder.text), parseCsv(master.text));
    return { engine: engine.source, ladder: ladder.source, master: master.source };
  }

  function bootstrapSelection() {
    const params = new URLSearchParams(window.location.search);
    const queryHunt = normalizeKey(params.get('hunt_code'));
    const storedHunt = normalizeKey(localStorage.getItem(SELECTED_HUNT_KEY));
    const storedResidency = normalizeResidencyLabel(localStorage.getItem(SELECTED_RESIDENCY_KEY));
    const storedPoints = localStorage.getItem(SELECTED_POINTS_KEY);
    const bootstrapHunt = queryHunt || storedHunt;

    if (bootstrapHunt) {
      els.huntCodeInput.value = bootstrapHunt;
      state.selectedHuntCode = bootstrapHunt;
    }
    els.residencySelect.value = storedResidency;
    if (storedPoints !== null && storedPoints !== '') {
      els.pointsInput.value = storedPoints;
    }
    if (queryHunt) {
      localStorage.setItem(SELECTED_HUNT_KEY, queryHunt);
    }
  }

  function runResearch() {
    const filters = buildFilters();
    state.selectedHuntCode = filters.huntCode;
    localStorage.setItem(SELECTED_RESIDENCY_KEY, filters.residency);
    localStorage.setItem(SELECTED_POINTS_KEY, String(filters.points));
    if (filters.huntCode) {
      localStorage.setItem(SELECTED_HUNT_KEY, filters.huntCode);
    } else {
      localStorage.removeItem(SELECTED_HUNT_KEY);
    }
    renderFilterReadout(filters);
    renderDetail(filters);
  }

  function clearFilters() {
    els.huntCodeInput.value = '';
    els.residencySelect.value = 'Resident';
    els.pointsInput.value = '12';
    state.selectedHuntCode = '';
    localStorage.removeItem(SELECTED_HUNT_KEY);
    localStorage.setItem(SELECTED_RESIDENCY_KEY, 'Resident');
    localStorage.setItem(SELECTED_POINTS_KEY, '12');
    runResearch();
  }

  function bindEvents() {
    els.runResearchButton?.addEventListener('click', runResearch);
    els.clearFiltersButton?.addEventListener('click', clearFilters);
    els.addToBasketButton?.addEventListener('click', () => {
      const filters = buildFilters();
      const meta = findMeta(filters.huntCode, filters.residency);
      const engineRow = getEngineRow(filters.huntCode, filters.residency, filters.points);
      upsertBasketItem(meta, filters, engineRow);
    });
    els.clearBasketButton?.addEventListener('click', () => {
      saveBasket([]);
      renderBasket();
    });

    [els.residencySelect].forEach((el) => {
      el?.addEventListener('change', runResearch);
    });

    [els.huntCodeInput, els.pointsInput].forEach((el) => {
      el?.addEventListener('input', runResearch);
    });
  }

  async function init() {
    try {
      renderBasket();
      bootstrapSelection();
      bindEvents();
      await loadData();
      els.filterReadout.textContent = 'Production engine data loaded.';
      runResearch();
    } catch (error) {
      console.error(error);
      els.filterReadout.textContent = error.message || 'Hunt Research data failed to load.';
      els.plannerReadout.textContent = 'Page loaded. Production data did not.';
    }
  }

  init();
})();
