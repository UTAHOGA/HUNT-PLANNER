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

  const REFERENCE_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_REFERENCE_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_REFERENCE_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_REFERENCE_SOURCES
    : ['./processed_data/hunt_unit_reference_linked.csv'];

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
    referenceRows: [],
    engineByKey: new Map(),
    engineGroups: new Map(),
    ladderGroups: new Map(),
    masterByResidency: new Map(),
    masterByCode: new Map(),
    referenceByKey: new Map(),
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

    verdictBadge: document.getElementById('verdictBadge'),
    verdictMessage: document.getElementById('verdictMessage'),

    selectedOutlook: document.getElementById('selectedOutlook'),
    selectedHuntCodeRead: document.getElementById('selectedHuntCodeRead'),
    selectedHarvestSuccess: document.getElementById('selectedHarvestSuccess'),
    selectedResidentPermits: document.getElementById('selectedResidentPermits'),
    selectedNonresidentPermits: document.getElementById('selectedNonresidentPermits'),

    detailTitle: document.getElementById('detailTitle'),
    detailSubtitle: document.getElementById('detailSubtitle'),
    detailEmpty: document.getElementById('detailEmpty'),
    detailContent: document.getElementById('detailContent'),
    openPlannerLink: document.getElementById('openPlannerLink'),
    openDwrLink: document.getElementById('openDwrLink'),

    summaryGuaranteedTop: document.getElementById('summaryGuaranteedTop'),
    summaryPointsTop: document.getElementById('summaryPointsTop'),
    summaryOddsTop: document.getElementById('summaryOddsTop'),

    summaryGuaranteed: document.getElementById('summaryGuaranteed'),
    summaryPoints: document.getElementById('summaryPoints'),
    summaryStatus: document.getElementById('summaryStatus'),
    summaryOdds: document.getElementById('summaryOdds'),
    summaryTrend: document.getElementById('summaryTrend'),
    summaryTrendText: document.getElementById('summaryTrendText'),
    summaryRecommendation: document.getElementById('summaryRecommendation'),

    ladderTableEmpty: document.getElementById('ladderTableEmpty'),
    ladderTableWrap: document.getElementById('ladderTableWrap'),
    ladderTableBody: document.getElementById('ladderTableBody'),
    ladderPrimaryHeader: document.getElementById('ladderPrimaryHeader'),
    ladderSecondaryHeader: document.getElementById('ladderSecondaryHeader'),

    sourceModal: document.getElementById('sourceModal'),
    sourceModalTitle: document.getElementById('sourceModalTitle'),
    sourceModalSubtitle: document.getElementById('sourceModalSubtitle'),
    sourceModalGrid: document.getElementById('sourceModalGrid'),
    sourceModalClose: document.getElementById('sourceModalClose'),

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

  function isRandomOnlyBonusCase(meta, row) {
    if (isPreferenceAntlerless(meta)) return false;
    const maxPointPermits = num(row?.max_point_permits_2026);
    const randomPermits = num(row?.random_permits_2026);
    return maxPointPermits !== null && maxPointPermits <= 0 && randomPermits !== null && randomPermits > 0;
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

  function indexData(engineRows, ladderRows, masterRows, referenceRows) {
    state.engineRows = engineRows;
    state.ladderRows = ladderRows;
    state.masterRows = masterRows;
    state.referenceRows = referenceRows;
    state.engineByKey = new Map();
    state.engineGroups = new Map();
    state.ladderGroups = new Map();
    state.masterByResidency = new Map();
    state.masterByCode = new Map();
    state.referenceByKey = new Map();

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

    referenceRows.forEach((row) => {
      const residency = normalizeResidencyLabel(row.residency);
      const group = groupKey(row.hunt_code, residency);
      state.referenceByKey.set(group, { ...row, residency });
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

  function getReferenceRow(huntCode, residency) {
    return state.referenceByKey.get(groupKey(huntCode, residency)) || null;
  }

  function getEngineRows(huntCode, residency) {
    return state.engineGroups.get(groupKey(huntCode, residency)) || [];
  }

  function getModeledCoverageStatus(meta, hasEngineGroup) {
    if (hasEngineGroup) return '';
    if (!meta) return 'Hunt not found in the current production backbone.';
    return 'This hunt exists in the canonical hunt backbone, but it does not currently have modeled draw-pressure coverage.';
  }

  function getDisplayedOdds(row) {
    if (!row) return { value: 'Not available', source: 'unavailable' };
    if (row.status === 'MAX POOL') return { value: '100%', source: 'guaranteed' };

    const projectedOdds = formatProbability(row.odds_2026_projected);
    if (projectedOdds !== 'Not available') {
      return { value: projectedOdds, source: 'projected_total' };
    }

    const randomOdds = formatProbability(row.random_draw_odds_2026);
    if (randomOdds !== 'Not available') {
      return { value: randomOdds, source: 'random_pool' };
    }

    return { value: 'Not available', source: 'unavailable' };
  }

  function isPreferenceAntlerless(meta) {
    const huntType = String(meta?.hunt_type || '').trim().toLowerCase();
    const species = String(meta?.species || '').trim().toLowerCase();
    if (!huntType.includes('antlerless')) return false;
    return species.includes('deer') || species.includes('elk') || species.includes('pronghorn');
  }

  function getRecommendation(meta, row) {
    if (!row) return 'Modeled recommendation not available for this hunt and residency yet.';

    if (isRandomOnlyBonusCase(meta, row)) {
      return 'This hunt has no meaningful max-pool path at this residency. Your outcome depends on weighted random draw only.';
    }

    if (isPreferenceAntlerless(meta)) {
      if (row.status === 'MAX POOL') {
        return 'This hunt is currently inside the preference-point line at your selected point level.';
      }
      if (row.draw_outlook === 'POINT CREEP DEFEAT') {
        return 'The preference line is moving away faster than your point gain. This is not a realistic catch-up hunt.';
      }
      if (row.draw_outlook === 'MAY DRAW IN 5-10 YEARS') {
        return 'You are still behind the preference line, but the hunt remains potentially catchable if pressure stabilizes.';
      }
      return 'You are below the current preference line and need the line to soften or more permits to appear.';
    }

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

  function getPrimaryOddsLabel(meta, row, displayedOdds) {
    if (isPreferenceAntlerless(meta)) {
      return `2026 Preference Draw: ${formatProbability(row?.odds_2026_projected)}`;
    }
    if (isRandomOnlyBonusCase(meta, row)) {
      return `2026 Random Draw: ${displayedOdds.value}`;
    }
    return displayedOdds.source === 'guaranteed'
      ? '2026 Max Pool: 100%'
      : `2026 Random Draw: ${displayedOdds.value}`;
  }

  function getOutlookSignal(meta, row) {
    const maxPointPermits = num(row?.max_point_permits_2026);
    if (maxPointPermits !== null && maxPointPermits <= 0) return 'red';
    if (row?.status === 'MAX POOL') return 'green';

    const maxPoolChance = num(row?.max_pool_projection_2026);
    if (maxPoolChance !== null && maxPoolChance > 0) return 'yellow';

    const nonresidentPermits = num(meta?.public_nonresident_permits);
    const residentPermits = num(meta?.public_resident_permits);

    if ((nonresidentPermits !== null || residentPermits !== null) && maxPointPermits === 0) return 'red';
    if (row?.draw_outlook === 'MAY DRAW IN 5-10 YEARS' || num(row?.gap) === 1) return 'yellow';
    if (row?.draw_outlook === 'GREEN LIGHT') return 'green';

    return 'red';
  }

  function renderOutlookLight(signal) {
    if (!els.selectedOutlook) return;
    const active = signal || 'red';
    els.selectedOutlook.innerHTML = `
      <span class="outlook-light red${active === 'red' ? ' is-active' : ''}"></span>
      <span class="outlook-light yellow${active === 'yellow' ? ' is-active' : ''}"></span>
      <span class="outlook-light green${active === 'green' ? ' is-active' : ''}"></span>
    `;
    els.selectedOutlook.setAttribute('aria-label', `${active} outlook`);
  }

  function getTrendSignal(row) {
    const trend = String(row?.trend || '').trim().toUpperCase();
    if (trend === 'GREEN') return 'green';
    if (trend === 'YELLOW') return 'yellow';
    return 'red';
  }

  function renderTrendLight(signal) {
    if (!els.summaryTrend) return;
    const active = signal || 'red';
    els.summaryTrend.innerHTML = `
      <span class="outlook-light red${active === 'red' ? ' is-active' : ''}"></span>
      <span class="outlook-light yellow${active === 'yellow' ? ' is-active' : ''}"></span>
      <span class="outlook-light green${active === 'green' ? ' is-active' : ''}"></span>
    `;
    els.summaryTrend.setAttribute('aria-label', `${active} trend`);
  }

  function setLadderHeaders(meta) {
    if (!els.ladderPrimaryHeader || !els.ladderSecondaryHeader) return;
    if (isPreferenceAntlerless(meta)) {
      els.ladderPrimaryHeader.textContent = '2026 Preference Draw';
      els.ladderSecondaryHeader.hidden = true;
    } else {
      els.ladderPrimaryHeader.textContent = '2026 Max Pool';
      els.ladderSecondaryHeader.textContent = '2026 Random Draw';
      els.ladderSecondaryHeader.hidden = false;
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

  function getHarvestSuccessDisplay(meta, referenceRow) {
    if (referenceRow?.harvest_success_percent_2025 !== undefined && referenceRow?.harvest_success_percent_2025 !== null && String(referenceRow.harvest_success_percent_2025).trim() !== '') {
      return `${referenceRow.harvest_success_percent_2025}%`;
    }
    if (meta?.success_percent !== undefined && meta?.success_percent !== null && String(meta.success_percent).trim() !== '') {
      return `${meta.success_percent}%`;
    }
    return 'Not loaded';
  }

  function getVerdictState(meta, row, filters, coverageMessage) {
    if (!row) {
      return {
        badge: 'Not available',
        message: coverageMessage || 'No modeled row available for this hunt and residency yet.',
        className: 'is-red',
      };
    }

    if (isRandomOnlyBonusCase(meta, row)) {
      return {
        badge: 'Random Chance Only',
        message: 'This hunt does not currently offer a meaningful guaranteed path at this residency. Your outcome depends on the random draw only.',
        className: 'is-red',
      };
    }

    if (row.status === 'MAX POOL' || row.draw_outlook === 'GREEN LIGHT') {
      return {
        badge: 'Guaranteed',
        message: `At ${formatInteger(filters.points)} points, you are currently inside the guaranteed line for this hunt.`,
        className: 'is-green',
      };
    }

    if (row.draw_outlook === 'MAY DRAW IN 5-10 YEARS' || num(row.gap) === 1) {
      return {
        badge: 'On the Line',
        message: 'You are near the edge of the guaranteed path. This hunt is still in reach, but pressure and point creep matter.',
        className: 'is-yellow',
      };
    }

    if (row.draw_outlook === 'POINT CREEP DEFEAT') {
      return {
        badge: 'Not Catchable Right Now',
        message: 'Point creep is outrunning your yearly gain. This is not a realistic catch-up hunt under the current trend.',
        className: 'is-red',
      };
    }

    return {
      badge: 'Random Chance Only',
      message: 'You are outside the guaranteed line and relying on the remaining random pool.',
      className: 'is-red',
    };
  }

  function renderVerdict(meta, row, filters, coverageMessage) {
    if (!els.verdictBadge || !els.verdictMessage) return;

    const verdict = getVerdictState(meta, row, filters, coverageMessage);
    els.verdictBadge.className = `verdict-badge ${verdict.className}`;
    els.verdictBadge.textContent = verdict.badge;
    els.verdictMessage.textContent = verdict.message;
  }

  function renderTopSummary(meta, row, filters, displayedOdds) {
    if (els.summaryGuaranteedTop) {
      els.summaryGuaranteedTop.textContent = row
        ? (isRandomOnlyBonusCase(meta, row) ? 'Not applicable' : `${formatInteger(row.guaranteed_at_2026)} pts`)
        : 'Not loaded';
    }

    if (els.summaryPointsTop) {
      els.summaryPointsTop.textContent = `${formatInteger(filters.points)} pts`;
    }

    if (els.summaryOddsTop) {
      els.summaryOddsTop.textContent = row ? displayedOdds.value : 'Not loaded';
    }

    if (els.selectedHuntCodeRead) {
      els.selectedHuntCodeRead.textContent = meta?.hunt_code || filters.huntCode || 'Not loaded';
    }
  }

  function renderSummary(meta, row, filters, coverageMessage, referenceRow) {
    const displayedOdds = getDisplayedOdds(row);

    renderVerdict(meta, row, filters, coverageMessage);
    renderTopSummary(meta, row, filters, displayedOdds);

    if (!row) {
      renderOutlookLight('red');
      if (els.summaryGuaranteed) els.summaryGuaranteed.textContent = 'Not available';
      if (els.summaryPoints) els.summaryPoints.textContent = `${formatInteger(filters.points)} pts`;
      if (els.summaryStatus) els.summaryStatus.textContent = coverageMessage || 'No modeled row available.';
      if (els.summaryOdds) els.summaryOdds.textContent = 'Not available';
      renderTrendLight('red');
      if (els.summaryTrendText) els.summaryTrendText.textContent = 'Not available';
      if (els.summaryRecommendation) els.summaryRecommendation.textContent = coverageMessage || 'Recommendation not available.';

      if (els.selectedResidentPermits) {
        els.selectedResidentPermits.textContent = meta?.public_resident_permits || 'Not loaded';
      }
      if (els.selectedNonresidentPermits) {
        els.selectedNonresidentPermits.textContent = meta?.public_nonresident_permits || 'Not loaded';
      }
      if (els.selectedHarvestSuccess) {
        els.selectedHarvestSuccess.textContent = getHarvestSuccessDisplay(meta, referenceRow);
      }
      return;
    }

    renderOutlookLight(getOutlookSignal(meta, row));

    if (els.summaryGuaranteed) {
      els.summaryGuaranteed.textContent = isRandomOnlyBonusCase(meta, row)
        ? 'Not applicable'
        : `${formatInteger(row.guaranteed_at_2026)} pts`;
    }

    if (els.summaryPoints) {
      els.summaryPoints.textContent = `${formatInteger(filters.points)} pts`;
    }

    if (els.summaryStatus) {
      els.summaryStatus.textContent = isRandomOnlyBonusCase(meta, row)
        ? 'Random draw only'
        : formatGapStatus(row.gap);
    }

    if (els.summaryOdds) {
      els.summaryOdds.textContent = getPrimaryOddsLabel(meta, row, displayedOdds);
    }

    renderTrendLight(getTrendSignal(row));

    if (els.summaryTrendText) {
      els.summaryTrendText.textContent = isRandomOnlyBonusCase(meta, row)
        ? 'Not applicable'
        : (row.trend || 'Not available');
    }

    if (els.summaryRecommendation) {
      els.summaryRecommendation.textContent = getRecommendation(meta, row);
    }

    if (els.selectedResidentPermits) {
      els.selectedResidentPermits.textContent = meta?.public_resident_permits || 'Not loaded';
    }

    if (els.selectedNonresidentPermits) {
      els.selectedNonresidentPermits.textContent = meta?.public_nonresident_permits || 'Not loaded';
    }

    if (els.selectedHarvestSuccess) {
      els.selectedHarvestSuccess.textContent = getHarvestSuccessDisplay(meta, referenceRow);
    }
  }

  function hasMeaningfulValue(value) {
    const text = String(value ?? '').trim();
    return !!text && text.toUpperCase() !== 'N/A' && text.toUpperCase() !== 'NOT AVAILABLE';
  }

  function hasSourceData(meta, row, referenceRow) {
    if (referenceRow) return true;
    if (!meta || !row) return false;
    return [
      row.odds_2025_actual,
      meta.success_percent,
      meta.success_hunters,
      meta.success_harvest,
      meta.public_permits_2025,
      meta.public_permits_2026,
    ].some(hasMeaningfulValue);
  }

  function buildSourceBoxes(meta, row, referenceRow) {
    const boxes = [
      ['2025 Draw Odds', row?.odds_2025_actual || 'Not available'],
      ['2025 Harvest Success', hasMeaningfulValue(referenceRow?.harvest_success_percent_2025)
        ? `${referenceRow.harvest_success_percent_2025}%`
        : (hasMeaningfulValue(meta?.success_percent) ? `${meta.success_percent}%` : 'Not available')],
      ['Harvest / Hunters', hasMeaningfulValue(referenceRow?.harvest_2025) || hasMeaningfulValue(referenceRow?.harvest_hunters_2025)
        ? `${referenceRow?.harvest_2025 || '0'} / ${referenceRow?.harvest_hunters_2025 || '0'}`
        : (hasMeaningfulValue(meta?.success_harvest) || hasMeaningfulValue(meta?.success_hunters)
          ? `${meta?.success_harvest || '0'} / ${meta?.success_hunters || '0'}`
          : 'Not available')],
      ['2025 Public Permits', referenceRow?.permits_2025_total || meta?.public_permits_2025 || 'Not available'],
      ['2026 Public Permits', referenceRow?.permits_2026_total || meta?.public_permits_2026 || 'Not available'],
      ['Odds Source', referenceRow?.has_bg_odds_page === 'TRUE'
        ? `Big Game Odds p. ${referenceRow.bg_odds_printed_page || referenceRow.bg_odds_pdf_page_index || ''}`.trim()
        : (referenceRow?.has_antlerless_odds_page === 'TRUE'
          ? `Antlerless Odds row ${referenceRow.antlerless_odds_row_start || ''}`.trim()
          : 'Not available')],
      ['RAC Source', hasMeaningfulValue(referenceRow?.rac_page)
        ? `${referenceRow?.source_pdf || 'RAC packet'} p. ${referenceRow.rac_page}`
        : 'Not available'],
    ];

    return boxes.map(([label, value]) => `
      <section class="source-box">
        <span class="label">${escapeHtml(label)}</span>
        <strong class="value">${escapeHtml(value)}</strong>
      </section>
    `).join('');
  }

  function openSourceModal(meta, row, referenceRow, residency) {
    if (!els.sourceModal || !els.sourceModalGrid || !els.sourceModalTitle || !els.sourceModalSubtitle) return;
    const pointLabel = formatInteger(row?.points);
    els.sourceModalTitle.textContent = 'DWR Source Snapshot';
    els.sourceModalSubtitle.textContent = `${meta?.hunt_code || ''} · ${meta?.hunt_name || ''} · ${residency || ''} · ${pointLabel} points`;
    els.sourceModalGrid.innerHTML = buildSourceBoxes(meta, row, referenceRow);
    els.sourceModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeSourceModal() {
    if (!els.sourceModal) return;
    els.sourceModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function markerHtml(markers) {
    if (!markers.length) return '';
    return `<div class="marker-stack">${markers.map((marker) => {
      if (marker.kind === 'sources') {
        return `<button type="button" class="marker-pill sources" data-source-pill="true" data-point="${escapeHtml(marker.point)}">${escapeHtml(marker.label)}</button>`;
      }
      return `<span class="marker-pill ${marker.kind}">${escapeHtml(marker.label)}</span>`;
    }).join('')}</div>`;
  }

  function renderLadder(meta, huntCode, residency, points) {
    if (!els.ladderTableWrap || !els.ladderTableEmpty || !els.ladderTableBody) return;
    setLadderHeaders(meta);

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
      const referenceRow = getReferenceRow(huntCode, residency);

      if (row.points === points) {
        markers.push({ kind: 'user', label: 'You' });
        classes.push('is-user-row');
      }

      if (row.guaranteed_marker === 'TRUE') {
        markers.push({ kind: 'guaranteed', label: 'Guaranteed' });
        classes.push('is-guaranteed-row');
      }

      if (hasSourceData(meta, row, referenceRow)) {
        markers.push({ kind: 'sources', label: 'Sources', point: row.points });
      }

      const primaryValue = isPreferenceAntlerless(meta)
        ? formatProbability(row.odds_2026_projected)
        : formatProbability(row.max_pool_projection_2026);

      const secondaryCell = isPreferenceAntlerless(meta)
        ? ''
        : `<td>${formatProbability(row.random_draw_projection_2026)}</td>`;

      return `
        <tr class="${classes.join(' ')}">
          <td>${formatInteger(row.points)}</td>
          <td>${escapeHtml(row.odds_2025_actual || 'Not available')}</td>
          <td>${primaryValue}</td>
          ${secondaryCell}
          <td>${markerHtml(markers)}</td>
        </tr>`;
    }).join('');

    els.ladderTableEmpty.hidden = true;
    els.ladderTableWrap.hidden = false;
  }

  function renderEmpty(filters, coverageMessage) {
    if (els.detailEmpty) els.detailEmpty.hidden = false;
    if (els.detailContent) els.detailContent.hidden = true;
    renderSummary(null, null, filters, coverageMessage, null);
    if (els.ladderTableWrap) els.ladderTableWrap.hidden = true;
    if (els.ladderTableEmpty) els.ladderTableEmpty.hidden = false;
    if (els.ladderTableBody) els.ladderTableBody.innerHTML = '';
  }

  function renderDetail(filters) {
    const meta = findMeta(filters.huntCode, filters.residency);
    const engineRows = getEngineRows(filters.huntCode, filters.residency);
    const engineRow = getEngineRow(filters.huntCode, filters.residency, filters.points);
    const referenceRow = getReferenceRow(filters.huntCode, filters.residency);
    const coverageMessage = getModeledCoverageStatus(meta, engineRows.length > 0);

    if (!filters.huntCode || (!meta && !engineRows.length)) {
      renderEmpty(filters, coverageMessage || 'Type a hunt code or load one from Hunt Backpack.');
      return;
    }

    if (els.detailEmpty) els.detailEmpty.hidden = true;
    if (els.detailContent) els.detailContent.hidden = false;

    if (els.detailTitle) {
      els.detailTitle.textContent = meta ? `${meta.hunt_code} · ${meta.hunt_name}` : filters.huntCode;
    }

    if (els.detailSubtitle) {
      els.detailSubtitle.textContent = meta
        ? `${meta.species || 'Unknown'} · ${meta.weapon || 'Unknown weapon'} · ${filters.residency}`
        : `${filters.residency} · ${formatInteger(filters.points)} points`;
    }

    if (els.openPlannerLink) {
      els.openPlannerLink.href = `./index.html?hunt_code=${encodeURIComponent(filters.huntCode)}`;
    }

    if (els.openDwrLink) {
      els.openDwrLink.href = '#';
      if (referenceRow?.has_any_odds_source === 'TRUE') {
        els.openDwrLink.removeAttribute('aria-disabled');
      } else {
        els.openDwrLink.setAttribute('aria-disabled', 'true');
      }
    }

    renderSummary(meta, engineRow, filters, coverageMessage, referenceRow);
    renderLadder(meta, filters.huntCode, filters.residency, filters.points);

    state.selectedMeta = meta;
    state.selectedFilters = filters;

    if (meta) {
      upsertBasketItem(meta, filters, engineRow);
    }
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
    const [engine, ladder, master, reference] = await Promise.all([
      loadFirstAvailable(ENGINE_SOURCES),
      loadFirstAvailable(LADDER_SOURCES),
      loadFirstAvailable(MASTER_SOURCES),
      loadFirstAvailable(REFERENCE_SOURCES),
    ]);

    indexData(
      parseCsv(engine.text),
      parseCsv(ladder.text),
      parseCsv(master.text),
      parseCsv(reference.text)
    );

    return {
      engine: engine.source,
      ladder: ladder.source,
      master: master.source,
      reference: reference.source,
    };
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

    els.ladderTableBody?.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-source-pill="true"]');
      if (!trigger || !state.selectedMeta || !state.selectedFilters) return;

      const point = Number.parseInt(trigger.getAttribute('data-point') || '', 10);
      const row = getLadderRows(state.selectedFilters.huntCode, state.selectedFilters.residency)
        .find((candidate) => candidate.points === point);

      if (!row) return;

      const referenceRow = getReferenceRow(state.selectedFilters.huntCode, state.selectedFilters.residency);
      openSourceModal(state.selectedMeta, row, referenceRow, state.selectedFilters.residency);
    });

    els.sourceModalClose?.addEventListener('click', closeSourceModal);

    els.sourceModal?.addEventListener('click', (event) => {
      if (event.target === els.sourceModal) {
        closeSourceModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSourceModal();
      }
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