(function () {
  const BUNDLE_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES
    : ['./processed_data/hunt_research_2026.json'];
  const SELECTED_HUNT_KEY = 'selected_hunt_code';
  const SELECTED_RESIDENCY_KEY = 'selected_hunt_research_residency';
  const SELECTED_POINTS_KEY = 'selected_hunt_research_points';
  const BASKET_KEY = 'uoga_hunt_basket_v1';
  const LEGACY_BASKET_KEY = 'hunt_research_recent_hunts';

  const state = {
    loaded: false,
    hunts: [],
    huntMap: new Map(),
    filteredHunts: [],
    selectedHuntCode: '',
    selectedHunt: null,
    selectedFilters: null,
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
    printReportButton: document.getElementById('printReportButton'),
    downloadReportButton: document.getElementById('downloadReportButton'),
    selectedOutlook: document.getElementById('selectedOutlook'),
    selectedDrawFamily: document.getElementById('selectedDrawFamily'),
    selectedPermitRead: document.getElementById('selectedPermitRead'),
    selectedCutoffRead: document.getElementById('selectedCutoffRead'),
    selectedHuntCodeRead: document.getElementById('selectedHuntCodeRead'),
    basketCount: document.getElementById('basketCount'),
    detailTitle: document.getElementById('detailTitle'),
    detailSubtitle: document.getElementById('detailSubtitle'),
    detailEmpty: document.getElementById('detailEmpty'),
    detailContent: document.getElementById('detailContent'),
    detailSpeciesWeapon: document.getElementById('detailSpeciesWeapon'),
    detailAccessType: document.getElementById('detailAccessType'),
    detailHarvest: document.getElementById('detailHarvest'),
    detailPressure: document.getElementById('detailPressure'),
    detailOutfitters: document.getElementById('detailOutfitters'),
    detailPermitSource: document.getElementById('detailPermitSource'),
    detailSelectedResult: document.getElementById('detailSelectedResult'),
    detailGuaranteedLaneLabel: document.getElementById('detailGuaranteedLaneLabel'),
    detailGuaranteedLane: document.getElementById('detailGuaranteedLane'),
    detailGuaranteedLaneShort: document.getElementById('detailGuaranteedLaneShort'),
    detailRandomLaneLabel: document.getElementById('detailRandomLaneLabel'),
    detailRandomLane: document.getElementById('detailRandomLane'),
    detailRandomLaneShort: document.getElementById('detailRandomLaneShort'),
    detailCutoffLabel: document.getElementById('detailCutoffLabel'),
    detailCutoff: document.getElementById('detailCutoff'),
    detailCutoffShort: document.getElementById('detailCutoffShort'),
    detailMethod: document.getElementById('detailMethod'),
    detailGoalFit: document.getElementById('detailGoalFit'),
    detailHeadline: document.getElementById('detailHeadline'),
    detailExplanation: document.getElementById('detailExplanation'),
    reportSummaryTableBody: document.getElementById('reportSummaryTableBody'),
    openPlannerLink: document.getElementById('openPlannerLink'),
    openDwrLink: document.getElementById('openDwrLink'),
    detailBasketButton: document.getElementById('detailBasketButton'),
    basketList: document.getElementById('basketList'),
    clearBasketButton: document.getElementById('clearBasketButton'),
    rawTableEmpty: document.getElementById('rawTableEmpty'),
    rawTableWrap: document.getElementById('rawTableWrap'),
    rawTableBody: document.getElementById('rawTableBody'),
    rawColA: document.getElementById('rawColA'),
    rawColB: document.getElementById('rawColB'),
    rawColC: document.getElementById('rawColC'),
    projectedTableEmpty: document.getElementById('projectedTableEmpty'),
    projectedTableWrap: document.getElementById('projectedTableWrap'),
    projectedTableBody: document.getElementById('projectedTableBody'),
  };

  function normalizeKey(value) {
    return String(value || '').trim().toUpperCase();
  }

  function normalizeResidencyLabel(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
    return normalized === 'nonresident' ? 'Nonresident' : 'Resident';
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

  function formatDecimal(value, digits) {
    const parsed = num(value);
    return parsed === null ? 'Not available' : parsed.toFixed(digits);
  }

  function formatPercent(value, digits = 1) {
    const parsed = num(value);
    if (parsed === null) return 'Not available';
    const useDigits = Number.isInteger(parsed) ? 0 : digits;
    return `${parsed.toFixed(useDigits)}%`;
  }

  function formatProbability(value) {
    const parsed = num(value);
    if (parsed === null) return 'Not available';
    if (parsed >= 99.95) return '100%';
    if (parsed >= 10) return `${parsed.toFixed(1)}%`;
    if (parsed >= 1) return `${parsed.toFixed(2)}%`;
    return `${parsed.toFixed(3)}%`;
  }

  function shortText(value, max = 80) {
    const text = String(value || '').trim();
    if (!text) return 'Not available';
    return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
  }

  function drawFamilyLabel(value) {
    switch (String(value || '').toLowerCase()) {
      case 'bonus_draw':
        return 'Bonus Draw';
      case 'preference_draw':
        return 'Preference Draw';
      default:
        return 'General / No Draw';
    }
  }

  function inferDrawFamily(hunt) {
    const stored = String(hunt.draw_family || '').toLowerCase();
    if (stored === 'bonus_draw' || stored === 'preference_draw') {
      return stored;
    }

    const huntType = String(hunt.hunt_type || '').toLowerCase();
    const huntName = String(hunt.hunt_name || '').toLowerCase();
    const code = String(hunt.hunt_code || '').toUpperCase();
    const prefix = code.slice(0, 2);

    const bonusPrefixes = new Set(['DB', 'EB', 'BI', 'DS', 'GO', 'MB', 'RS', 'MA', 'RE']);
    const preferencePrefixes = new Set(['DA', 'EA', 'PD']);

    if (preferencePrefixes.has(prefix)) return 'preference_draw';
    if (bonusPrefixes.has(prefix)) return 'bonus_draw';
    if (huntType.includes('limited entry') || huntType.includes('once-in-a-lifetime') || huntType.includes('o.i.l')) return 'bonus_draw';
    if (huntName.includes('limited entry') || huntName.includes('once-in-a-lifetime') || huntName.includes('o.i.l')) return 'bonus_draw';
    if (huntType.includes('antlerless') || huntName.includes('antlerless') || huntName.includes('doe') || huntName.includes('cow moose') || huntName.includes('ewe')) return 'preference_draw';

    return 'none';
  }

  function getDrawFamily(hunt) {
    return inferDrawFamily(hunt);
  }

  function getDrawFamilyLabel(hunt) {
    return drawFamilyLabel(getDrawFamily(hunt));
  }

  function getResidencyKey() {
    return normalizeResidencyLabel(els.residencySelect.value) === 'Nonresident' ? 'nonresident' : 'resident';
  }

  function getCurrentPoints() {
    const value = num(els.pointsInput.value);
    return value === null ? 0 : Math.max(0, Math.min(32, value));
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

  function getRawRows(hunt, residencyKey) {
    if (getDrawFamily(hunt) === 'bonus_draw') {
      return Array.isArray(hunt.bonus_draw?.[residencyKey]) ? hunt.bonus_draw[residencyKey] : [];
    }
    if (getDrawFamily(hunt) === 'preference_draw') {
      if (Array.isArray(hunt.antlerless_draw?.[residencyKey])) return hunt.antlerless_draw[residencyKey];
      if (Array.isArray(hunt.antlerless_draw_summary?.[residencyKey])) return hunt.antlerless_draw_summary[residencyKey];
    }
    return [];
  }

  function getProjectedRows(hunt, residencyKey) {
    if (Array.isArray(hunt.projected_bonus_draw?.[residencyKey])) return hunt.projected_bonus_draw[residencyKey];
    if (Array.isArray(hunt.projected_bonus_draw_summary?.[residencyKey])) return hunt.projected_bonus_draw_summary[residencyKey];
    return [];
  }

  function getRecommendedPermits(hunt, residencyKey) {
    const record = hunt.recommended_permits || null;
    if (!record) return null;
    return residencyKey === 'resident' ? num(record.resident_permits) : num(record.nonresident_permits);
  }

  function getPriorPermits(hunt, residencyKey) {
    const record = hunt.recommended_permits || null;
    if (!record) return null;
    return residencyKey === 'resident' ? num(record.resident_permits_prior) : num(record.nonresident_permits_prior);
  }

  function getRawRowAtPoints(hunt, residencyKey, points) {
    return getRawRows(hunt, residencyKey).find((row) => num(row.point_level) === points) || null;
  }

  function getProjectedRowAtPoints(hunt, residencyKey, points) {
    return getProjectedRows(hunt, residencyKey).find((row) => num(row.apply_with_points) === points) || null;
  }

  function getLikelihoodClass(probability) {
    const parsed = num(probability);
    if (parsed === null) return 'likelihood-unknown';
    if (parsed >= 99.95) return 'likelihood-guaranteed';
    if (parsed >= 25) return 'likelihood-live';
    return 'likelihood-longshot';
  }

  function getMatrixOutlook(hunt, residencyKey, points) {
    const projected = getProjectedRowAtPoints(hunt, residencyKey, points);
    if (projected) {
      return {
        text: formatProbability(projected.projected_total_probability_pct),
        headline: num(projected.projected_total_probability_pct) >= 99.95 ? 'Projected guaranteed' : 'Projected draw result',
        cutoff: projected.projected_cutoff_point,
      };
    }

    const rawRow = getRawRowAtPoints(hunt, residencyKey, points);
    if (rawRow) {
      return {
        text: rawRow.success_ratio_text || '2025 row',
        headline: '2025 actual row',
        cutoff: residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal,
      };
    }

      return {
        text: getDrawFamily(hunt) === 'none' ? 'No draw' : 'No row at points',
        headline: getDrawFamily(hunt) === 'none' ? 'Access / pressure read' : 'Point row not present',
        cutoff: residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal,
      };
    }

  function getResearchRead(hunt) {
    const success = num(hunt.percent_success);
    const satisfaction = num(hunt.satisfaction);
    const pressure = num(hunt.harvest_pressure_score);
    const family = getDrawFamily(hunt);

    if (family === 'bonus_draw') {
      return 'This hunt is driven by Utah bonus-point logic, so the research read starts with the projected cutoff, guaranteed lane, and simulated random lane.';
    }
    if (family === 'preference_draw') {
      return 'This hunt is driven by preference points, so the research read starts with the cutoff tier and whether your points sit above, on, or below that line.';
    }
    if (success !== null || pressure !== null || satisfaction !== null) {
      return `This hunt reads more like access and field performance than a formal draw table${success !== null ? `, with ${formatPercent(success)} harvest success` : ''}${pressure !== null ? ` and ${formatDecimal(pressure, 2)} hunters per permit` : ''}.`;
    }
    return 'This hunt currently reads as a context hunt rather than a point-table hunt, so use access, season structure, and hunt details first.';
  }

  function buildFilters() {
    return {
      huntCode: normalizeKey(els.huntCodeInput.value),
      residencyKey: getResidencyKey(),
      residencyLabel: normalizeResidencyLabel(els.residencySelect.value),
      points: getCurrentPoints(),
    };
  }

  function filterHunts(filters) {
    if (filters.huntCode) {
      const exact = state.huntMap.get(filters.huntCode);
      return exact ? [exact] : [];
    }

    const backpackCodes = getBasket()
      .map((item) => normalizeKey(item.hunt_code))
      .filter(Boolean);

    if (!backpackCodes.length) {
      return [];
    }

    return backpackCodes
      .map((code) => state.huntMap.get(code))
      .filter(Boolean);
  }

  function renderFilterReadout(filters) {
    const backpackCount = getBasket().length;
    els.filterReadout.textContent = filters.huntCode
      ? `Researching ${filters.huntCode} for ${filters.residencyLabel.toLowerCase()} applicants at ${filters.points} point${filters.points === 1 ? '' : 's'}.`
      : backpackCount
        ? `Hunt Pack ready with ${backpackCount} saved hunt${backpackCount === 1 ? '' : 's'} · choose one or type a hunt code to override it.`
        : `Waiting for a planner handoff or packed hunt · residency is set to ${filters.residencyLabel.toLowerCase()} at ${filters.points} point${filters.points === 1 ? '' : 's'}.`;
    els.plannerReadout.textContent = state.selectedHuntCode
      ? `Planner handoff active for ${state.selectedHuntCode}. The Hunt Pack is carrying that selection across pages.`
      : 'Hunt Planner handoff is active. If you selected a hunt on the planner page, this screen will pick it up automatically.';
  }

  function rowClassNames(isUserRow, isCutoffRow) {
    const classes = [];
    if (isUserRow) classes.push('is-user-row');
    if (isCutoffRow) classes.push('is-cutoff-row');
    return classes.join(' ');
  }

  function renderRawTable(hunt, residencyKey, points) {
    const rows = getRawRows(hunt, residencyKey)
      .slice()
      .sort((a, b) => (num(b.point_level) ?? -1) - (num(a.point_level) ?? -1));

    if (!rows.length) {
      els.rawTableWrap.hidden = true;
      els.rawTableEmpty.hidden = false;
      els.rawTableBody.innerHTML = '';
      return;
    }

    const isBonus = getDrawFamily(hunt) === 'bonus_draw';
    const cutoffSignal = residencyKey === 'resident' ? num(hunt.resident_point_signal) : num(hunt.nonresident_point_signal);
    els.rawColA.textContent = isBonus ? 'Bonus' : 'Permits';
    els.rawColB.textContent = isBonus ? 'Random' : 'Source';
    els.rawColC.textContent = isBonus ? 'Total' : 'Type';

    els.rawTableBody.innerHTML = rows.map((row) => {
      const rowPoint = num(row.point_level);
      const className = rowClassNames(rowPoint === points, cutoffSignal !== null && rowPoint === cutoffSignal);
      if (isBonus) {
        return `
          <tr class="${className}">
            <td>${formatInteger(row.point_level)}</td>
            <td>${formatInteger(row.applicants)}</td>
            <td>${formatInteger(row.bonus_permits)}</td>
            <td>${formatInteger(row.random_permits)}</td>
            <td>${formatInteger(row.total_permits)}</td>
            <td>${escapeHtml(row.success_ratio_text || 'N/A')}</td>
          </tr>`;
      }

      return `
        <tr class="${className}">
          <td>${formatInteger(row.point_level)}</td>
          <td>${formatInteger(row.applicants)}</td>
          <td>${formatInteger(row.permits_awarded)}</td>
          <td>Preference</td>
          <td>Row</td>
          <td>${escapeHtml(row.success_ratio_text || 'N/A')}</td>
        </tr>`;
    }).join('');

    els.rawTableEmpty.hidden = true;
    els.rawTableWrap.hidden = false;
  }

  function renderProjectedTable(hunt, residencyKey, points) {
    const rows = getProjectedRows(hunt, residencyKey)
      .slice()
      .sort((a, b) => (num(b.apply_with_points) ?? -1) - (num(a.apply_with_points) ?? -1));

    if (!rows.length) {
      els.projectedTableWrap.hidden = true;
      els.projectedTableEmpty.hidden = false;
      els.projectedTableBody.innerHTML = '';
      return;
    }

    els.projectedTableBody.innerHTML = rows.map((row) => {
      const rowPoint = num(row.apply_with_points);
      const cutoff = num(row.projected_cutoff_point);
      const className = rowClassNames(rowPoint === points, cutoff !== null && rowPoint === cutoff);
      return `
      <tr class="${className}">
        <td>${formatInteger(row.apply_with_points)}</td>
        <td>${formatInteger(row.projected_carryover_pool_at_point)}</td>
        <td>${formatProbability(row.projected_guaranteed_probability_pct)}</td>
        <td>${formatProbability(row.projected_random_probability_pct)}</td>
        <td>${formatProbability(row.projected_total_probability_pct)}</td>
        <td>${cutoff === null ? 'None' : `${formatInteger(cutoff)} pts`}</td>
      </tr>`;
    }).join('');

    els.projectedTableEmpty.hidden = true;
    els.projectedTableWrap.hidden = false;
  }

  function buildDecisionRead(hunt, residencyKey, points) {
    const projected = getProjectedRowAtPoints(hunt, residencyKey, points);
    const rawRow = getRawRowAtPoints(hunt, residencyKey, points);
    const residencyLabel = residencyKey === 'resident' ? 'Resident' : 'Nonresident';

    if (projected) {
      const total = num(projected.projected_total_probability_pct);
      const guaranteed = num(projected.projected_guaranteed_probability_pct);
      const random = num(projected.projected_random_probability_pct);
      const cutoff = num(projected.projected_cutoff_point);
      const guaranteedFlag = Boolean(projected.is_guaranteed_draw);
      const cutoffTier = Boolean(projected.is_cutoff_tier);

      let headline = 'Projected live draw chance';
      if (guaranteedFlag || (total !== null && total >= 99.95)) {
        headline = 'Projected guaranteed draw';
      } else if (cutoffTier) {
        headline = 'Projected cutoff-tier fight';
      } else if ((total ?? 0) < 1) {
        headline = 'Projected long-shot draw';
      }

      return {
        selectedResult: formatProbability(total),
        guaranteedLane: guaranteedFlag || (total !== null && total >= 99.95)
          ? `${formatInteger(points)} points sits inside the initial max-point draw.`
          : `${formatProbability(guaranteed)} chance in the initial max-point draw · ${formatInteger(projected.projected_guaranteed_draws_at_point)} guaranteed permits at this point level`,
        randomLane: `${formatProbability(random)} chance in the random draw after the initial max-point draw · ${formatInteger(projected.projected_random_pool_permits)} random permits`,
        cutoff: `${cutoff === null ? 'No point line loaded' : `${formatInteger(cutoff)} points is the minimum bonus point line for a fully guaranteed initial draw`} · pressure ${formatDecimal(projected.projected_cutoff_pressure_ratio, 2)}`,
        method: `2026 simulated projection · ${projected.random_method || 'engine'} · ${formatInteger(projected.simulation_iterations)} iterations`,
        headline,
        explanation: `${residencyLabel} projection starts with last year's actual results for this same hunt, removes the hunters who already drew, rolls the remaining applicants forward one point, keeps the 0-point baseline flat, and then applies this year's permit numbers before Utah-style random simulation. That gives you a truer read on the hunters most likely to be competing directly with you for this permit.`,
      };
    }

    if (rawRow) {
      return {
        selectedResult: rawRow.success_ratio_text || '2025 row',
        guaranteedLane: getDrawFamily(hunt) === 'preference_draw'
          ? `Preference row · ${formatInteger(rawRow.permits_awarded)} permits at this tier`
          : `2025 initial max-point draw row · ${formatInteger(rawRow.bonus_permits)} guaranteed permits`,
        randomLane: getDrawFamily(hunt) === 'bonus_draw'
          ? `2025 random draw row · ${formatInteger(rawRow.random_permits)} random permits`
          : 'Preference draw does not use a bonus/random split',
        cutoff: `Point line ${formatInteger(residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal)} points`,
        method: '2025 source draw table only',
        headline: 'Exact source row available',
        explanation: `${residencyLabel} row ${formatInteger(points)} exists in the accepted 2025 draw table. This page is showing the source row directly because no 2026 simulation row is attached for this hunt family.`,
      };
    }

    return {
      selectedResult: 'No supported point result',
      guaranteedLane: 'No supported draw row at selected points',
      randomLane: getDrawFamily(hunt) === 'none' ? 'No-draw hunt' : 'No row loaded',
      cutoff: 'No cutoff read',
      method: getDrawFamily(hunt) === 'none' ? 'Access / pressure read' : 'Awaiting engine support',
      headline: getDrawFamily(hunt) === 'none' ? 'This hunt is not draw-based' : 'Draw family identified, engine row not loaded yet',
      explanation: getDrawFamily(hunt) === 'none'
        ? 'This hunt is interpreted as access, timing, and pressure rather than a point-based draw table.'
        : 'This hunt is mapped to a draw family from the hunt metadata, but the point-by-point engine rows are not attached yet for this hunt and residency.',
    };
  }

  function renderSummaryTable(hunt, filters, decision) {
    if (!els.reportSummaryTableBody) return;

    const rows = [
      ['Hunt code', hunt.hunt_code],
      ['Hunt name', hunt.hunt_name],
      ['Species', hunt.species],
      ['Unit / DWR label', hunt.dwr_unit_name || hunt.hunt_name],
      ['Weapon', hunt.weapon],
      ['Residency', filters.residencyLabel],
      ['Current points', formatInteger(filters.points)],
      ['Draw family', getDrawFamilyLabel(hunt)],
      ['Selected result', decision.selectedResult],
      ['Guaranteed lane', decision.guaranteedLane],
      ['Random lane', decision.randomLane],
      ['Point line / pressure', decision.cutoff],
      ['Current permit read', els.selectedPermitRead?.textContent || 'Not loaded'],
      ['Permit source', els.detailPermitSource?.textContent || 'Not loaded'],
      ['Harvest / success', els.detailHarvest?.textContent || 'Not loaded'],
      ['Pressure / efficiency', els.detailPressure?.textContent || 'Not loaded']
    ];

    els.reportSummaryTableBody.innerHTML = rows.map(([label, value]) => `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(value || 'Not available')}</td>
      </tr>`).join('');
  }

  function buildDownloadReportText(hunt, filters) {
    const decision = buildDecisionRead(hunt, filters.residencyKey, filters.points);
    const rawRows = getRawRows(hunt, filters.residencyKey);
    const projectedRows = getProjectedRows(hunt, filters.residencyKey);
    const lines = [
      'U.O.G.A. BASIC HUNT RESEARCH REPORT',
      '',
      `Hunt: ${hunt.hunt_code} - ${hunt.hunt_name}`,
      `Unit: ${hunt.dwr_unit_name || hunt.hunt_name}`,
      `Species: ${hunt.species || 'Unknown'}`,
      `Weapon: ${hunt.weapon || 'Unknown'}`,
      `Residency: ${filters.residencyLabel}`,
      `Current Points: ${formatInteger(filters.points)}`,
      `Draw Family: ${getDrawFamilyLabel(hunt)}`,
      `Selected Result: ${decision.selectedResult}`,
      `Guaranteed Lane: ${decision.guaranteedLane}`,
      `Random Lane: ${decision.randomLane}`,
      `Point Line / Pressure: ${decision.cutoff}`,
      `Method: ${decision.method}`,
      `Current Permit Read: ${els.selectedPermitRead?.textContent || 'Not loaded'}`,
      `Permit Source: ${els.detailPermitSource?.textContent || 'Not loaded'}`,
      `Harvest / Success: ${els.detailHarvest?.textContent || 'Not loaded'}`,
      `Pressure / Efficiency: ${els.detailPressure?.textContent || 'Not loaded'}`,
      '',
      'REPORT READ',
      decision.explanation,
      '',
      `2025 source rows attached: ${rawRows.length}`,
      `2026 projected rows attached: ${projectedRows.length}`,
      '',
      'Official DWR Hunt Link:',
      hunt.dwr_boundary_link || 'Not attached'
    ];
    return lines.join('\r\n');
  }

  function downloadCurrentReport() {
    if (!state.selectedHunt || !state.selectedFilters) return;
    const text = buildDownloadReportText(state.selectedHunt, state.selectedFilters);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.selectedHunt.hunt_code || 'hunt-report'}-uoga-basic-report.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function renderSelectedStats(hunt, filters) {
    if (!hunt) {
      els.selectedOutlook.textContent = 'Waiting';
      els.selectedOutlook.className = 'value likelihood-unknown';
      els.selectedDrawFamily.textContent = 'Not loaded';
      els.selectedPermitRead.textContent = 'Not loaded';
      els.selectedCutoffRead.textContent = 'Not loaded';
      if (els.selectedHuntCodeRead) els.selectedHuntCodeRead.textContent = 'Not loaded';
      return;
    }

    const decision = buildDecisionRead(hunt, filters.residencyKey, filters.points);
    const projected = getProjectedRowAtPoints(hunt, filters.residencyKey, filters.points);
    const permits = getRecommendedPermits(hunt, filters.residencyKey) ?? num(hunt.permits_total);

    els.selectedOutlook.textContent = decision.selectedResult;
    els.selectedOutlook.className = `value ${getLikelihoodClass(projected?.projected_total_probability_pct)}`;
    els.selectedDrawFamily.textContent = getDrawFamilyLabel(hunt);
    els.selectedPermitRead.textContent = permits === null ? 'Not available' : formatInteger(permits);
    els.selectedCutoffRead.textContent = projected?.projected_cutoff_point !== undefined && projected?.projected_cutoff_point !== null
      ? `${formatInteger(projected.projected_cutoff_point)} pts`
      : (filters.residencyKey === 'resident' ? formatInteger(hunt.resident_point_signal) : formatInteger(hunt.nonresident_point_signal));
    if (els.selectedHuntCodeRead) {
      els.selectedHuntCodeRead.textContent = hunt.hunt_code || 'Not loaded';
    }
  }

  function renderSelectedDetail(hunt, filters) {
    state.selectedHunt = hunt;
    state.selectedFilters = filters;

    if (!hunt) {
      els.detailEmpty.hidden = false;
      els.detailContent.hidden = true;
      renderSelectedStats(null, filters);
      els.rawTableWrap.hidden = true;
      els.rawTableEmpty.hidden = false;
      els.rawTableBody.innerHTML = '';
      els.projectedTableWrap.hidden = true;
      els.projectedTableEmpty.hidden = false;
      els.projectedTableBody.innerHTML = '';
      if (els.reportSummaryTableBody) els.reportSummaryTableBody.innerHTML = '';
      return;
    }

    const decision = buildDecisionRead(hunt, filters.residencyKey, filters.points);
    const permitRecord = hunt.recommended_permits;
    const permits = getRecommendedPermits(hunt, filters.residencyKey) ?? num(hunt.permits_total);
    const priorPermits = getPriorPermits(hunt, filters.residencyKey);
    const pressure = num(hunt.harvest_pressure_score);
    const efficiency = num(hunt.harvest_efficiency_score);

    window.UOGA_UI?.recordRecentHunt?.({
      hunt_code: hunt.hunt_code,
      hunt_name: hunt.hunt_name,
      unit: hunt.dwr_unit_name || hunt.hunt_name,
      species: hunt.species,
      weapon: hunt.weapon,
      residency: filters.residencyLabel,
      selected_points: filters.points,
      projected_total_probability_pct: getProjectedRowAtPoints(hunt, filters.residencyKey, filters.points)?.projected_total_probability_pct ?? null,
      updated_at: Date.now()
    });

    els.detailEmpty.hidden = true;
    els.detailContent.hidden = false;
    els.detailTitle.textContent = `${hunt.hunt_code} · ${hunt.hunt_name}`;
    if (els.detailSubtitle) {
      els.detailSubtitle.textContent = `${hunt.dwr_unit_name || hunt.hunt_name} · ${filters.residencyLabel} · ${formatInteger(filters.points)} point${filters.points === 1 ? '' : 's'}`;
    }
    els.detailSpeciesWeapon.textContent = `${hunt.species || 'Unknown'} · ${hunt.weapon || 'Unknown weapon'} · ${filters.residencyLabel}`;
    els.detailAccessType.textContent = hunt.access_type || 'Unknown';
    els.detailHarvest.textContent = `${formatPercent(hunt.percent_success)} success · ${formatInteger(hunt.harvest)} harvested`;
    els.detailPressure.textContent = `${pressure === null ? 'Not available' : `${formatDecimal(pressure, 2)} hunters per permit`} · ${efficiency === null ? 'efficiency n/a' : `${formatDecimal(efficiency, 2)} harvest efficiency`}`;
    els.detailOutfitters.textContent = `${formatInteger(hunt.verified_outfitter_count)} verified · ${formatInteger(hunt.cpo_outfitter_count)} C.P.O.`;
    els.detailPermitSource.textContent = permitRecord
      ? `${permitRecord.source_authority_level || permitRecord.source_type || 'permit source'} · ${permits === null ? 'permits n/a' : formatInteger(permits)} current${priorPermits === null ? '' : ` (${formatInteger(priorPermits)} prior)`}`
      : 'No current permit authority attached';
    els.detailSelectedResult.textContent = decision.selectedResult;
    els.detailGuaranteedLaneLabel.textContent = getDrawFamily(hunt) === 'bonus_draw'
      ? 'Minimum Bonus Points For 100% Initial Draw'
      : 'Guaranteed Draw Read';
    els.detailGuaranteedLane.textContent = decision.guaranteedLane;
    if (els.detailGuaranteedLaneShort) {
      els.detailGuaranteedLaneShort.textContent = shortText(decision.guaranteedLane, 64);
    }
    els.detailRandomLaneLabel.textContent = getDrawFamily(hunt) === 'bonus_draw'
      ? 'Random Draw Chance After Max-Point Draw'
      : 'Random Draw Read';
    els.detailRandomLane.textContent = decision.randomLane;
    if (els.detailRandomLaneShort) {
      els.detailRandomLaneShort.textContent = shortText(decision.randomLane, 64);
    }
    els.detailCutoffLabel.textContent = getDrawFamily(hunt) === 'bonus_draw'
      ? 'Guaranteed Bonus Point Line / Pressure'
      : 'Point Line / Pressure';
    els.detailCutoff.textContent = decision.cutoff;
    if (els.detailCutoffShort) {
      els.detailCutoffShort.textContent = shortText(decision.cutoff, 64);
    }
    els.detailMethod.textContent = decision.method;
    els.detailGoalFit.textContent = getResearchRead(hunt);
    els.detailHeadline.textContent = decision.headline;
    els.detailExplanation.textContent = decision.explanation;
    els.openPlannerLink.href = `./index.html?hunt_code=${encodeURIComponent(hunt.hunt_code || '')}`;
    els.openDwrLink.href = hunt.dwr_boundary_link || '#';
    if (hunt.dwr_boundary_link) {
      els.openDwrLink.removeAttribute('aria-disabled');
    } else {
      els.openDwrLink.setAttribute('aria-disabled', 'true');
    }

    renderSelectedStats(hunt, filters);
    renderSummaryTable(hunt, filters, decision);
    renderRawTable(hunt, filters.residencyKey, filters.points);
    renderProjectedTable(hunt, filters.residencyKey, filters.points);
  }

  function upsertBasketItem(hunt, filters) {
    if (!hunt) return;
    const items = getBasket().filter((item) => normalizeKey(item.hunt_code) !== normalizeKey(hunt.hunt_code));
    items.unshift({
      hunt_code: hunt.hunt_code,
      hunt_name: hunt.hunt_name,
      unit: hunt.dwr_unit_name || hunt.hunt_name,
      species: hunt.species,
      weapon: hunt.weapon,
      residency: filters.residencyLabel,
      selected_points: filters.points,
      projected_total_probability_pct: getProjectedRowAtPoints(hunt, filters.residencyKey, filters.points)?.projected_total_probability_pct ?? null,
      trend_flag: '',
      draw_feasibility_label: '',
      updated_at: Date.now(),
    });
    saveBasket(items);
    renderBasket();
  }

  function removeBasketItem(huntCode) {
    const items = getBasket().filter((item) => normalizeKey(item.hunt_code) !== normalizeKey(huntCode));
    saveBasket(items);
    renderBasket();
  }

  function renderBasket() {
    const items = getBasket();
    els.basketCount.textContent = String(items.length);

    if (!items.length) {
      els.basketList.innerHTML = `
        <div class="basket-card">
          <strong style="display:block;margin-bottom:8px;color:#fff8f1;">No hunts saved yet</strong>
          <p>Add a selected hunt to keep it moving between Hunt Planner, Hunt Research, and Outfitter Verification.</p>
        </div>`;
      return;
    }

    els.basketList.innerHTML = items.map((item) => `
      <div class="basket-card">
        <span class="label">${escapeHtml(item.hunt_code)}</span>
        <h4>${escapeHtml(item.hunt_name || item.hunt_code)}</h4>
        <p>${escapeHtml(item.species || '')}${item.weapon ? ' · ' + escapeHtml(item.weapon) : ''} · ${escapeHtml(item.residency || 'Resident')} · ${formatInteger(item.selected_points)} points</p>
        <p>${item.projected_total_probability_pct === null ? 'No projected result stored.' : `Stored outlook: ${formatProbability(item.projected_total_probability_pct)}`}</p>
        <div class="basket-actions">
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
        selectHunt(huntCode, true);
      });
    });

    els.basketList.querySelectorAll('[data-basket-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        removeBasketItem(button.getAttribute('data-basket-remove'));
      });
    });
  }

  function selectHunt(huntCode, syncInput) {
    const key = normalizeKey(huntCode);
    state.selectedHuntCode = key;
    if (syncInput && key) {
      els.huntCodeInput.value = key;
    }
    if (key) {
      localStorage.setItem(SELECTED_HUNT_KEY, key);
    }
    runResearch();
  }

  async function runResearch() {
    const filters = buildFilters();
    localStorage.setItem(SELECTED_RESIDENCY_KEY, normalizeResidencyLabel(filters.residencyLabel));
    localStorage.setItem(SELECTED_POINTS_KEY, String(filters.points));
    if (filters.huntCode) {
      localStorage.setItem(SELECTED_HUNT_KEY, filters.huntCode);
    } else {
      localStorage.removeItem(SELECTED_HUNT_KEY);
    }
    state.filteredHunts = filterHunts(filters);

    if (!state.selectedHuntCode && filters.huntCode) {
      state.selectedHuntCode = filters.huntCode;
    }

    let selected = state.selectedHuntCode ? state.huntMap.get(state.selectedHuntCode) : null;
    if (!selected && filters.huntCode) {
      selected = state.huntMap.get(filters.huntCode) || null;
      state.selectedHuntCode = filters.huntCode;
    }
    if (!filters.huntCode && !selected) {
      state.selectedHuntCode = '';
    }

    renderFilterReadout(filters);
    renderSelectedDetail(selected, filters);
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

  async function tryLoadJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed for ${url}`);
    }
    return response.json();
  }

  function normalizeLoadedRows(rows) {
    state.hunts = rows;
    state.huntMap = new Map(rows.map((hunt) => [normalizeKey(hunt.hunt_code), hunt]));
    state.loaded = true;
  }

  async function loadBundle() {
    let lastError = null;
    for (const source of BUNDLE_SOURCES) {
      try {
        const rows = await tryLoadJson(source);
        if (!Array.isArray(rows)) {
          throw new Error(`Invalid bundle shape from ${source}`);
        }
        normalizeLoadedRows(rows);
        return source;
      } catch (error) {
        lastError = error;
        console.warn(`Failed Hunt Research source: ${source}`, error);
      }
    }
    throw lastError || new Error('No Hunt Research data source could be loaded.');
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

  function bindEvents() {
    els.runResearchButton.addEventListener('click', runResearch);
    els.clearFiltersButton.addEventListener('click', clearFilters);
    els.addToBasketButton.addEventListener('click', () => {
      const hunt = state.huntMap.get(normalizeKey(els.huntCodeInput.value || state.selectedHuntCode));
      if (hunt) {
        upsertBasketItem(hunt, buildFilters());
      }
    });
    els.detailBasketButton.addEventListener('click', () => {
      const hunt = state.huntMap.get(normalizeKey(state.selectedHuntCode));
      if (hunt) {
        upsertBasketItem(hunt, buildFilters());
      }
    });
    els.clearBasketButton.addEventListener('click', () => {
      saveBasket([]);
      renderBasket();
    });
    if (els.printReportButton) {
      els.printReportButton.addEventListener('click', () => window.print());
    }
    if (els.downloadReportButton) {
      els.downloadReportButton.addEventListener('click', downloadCurrentReport);
    }

    [
      els.residencySelect,
    ].forEach((el) => {
      el.addEventListener('change', runResearch);
    });

    [els.huntCodeInput, els.pointsInput].forEach((el) => {
      el.addEventListener('input', () => {
        if (el === els.huntCodeInput) {
          state.selectedHuntCode = normalizeKey(els.huntCodeInput.value);
        }
        runResearch();
      });
    });
  }

  async function init() {
    try {
      renderBasket();
      bootstrapSelection();
      bindEvents();
      const loadedSource = await loadBundle();
      els.filterReadout.textContent = `Research bundle loaded from ${loadedSource}`;
      runResearch();
    } catch (error) {
      console.error(error);
      els.filterReadout.textContent = error.message || 'Failed to load the Hunt Research engine.';
      els.plannerReadout.textContent = 'The page shell loaded, but the research bundle did not.';
    }
  }

  init();
})();
