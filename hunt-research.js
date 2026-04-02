(function () {
  const BUNDLE_SOURCES = (window.UOGA_CONFIG && Array.isArray(window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES) && window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES.length)
    ? window.UOGA_CONFIG.HUNT_RESEARCH_DATA_SOURCES
    : ['./processed_data/hunt_research_2026.json'];
  const SELECTED_HUNT_KEY = 'selected_hunt_code';
  const BASKET_KEY = 'uoga_hunt_basket_v1';
  const LEGACY_BASKET_KEY = 'hunt_research_recent_hunts';

  const state = {
    loaded: false,
    hunts: [],
    huntMap: new Map(),
    filteredHunts: [],
    selectedHuntCode: '',
  };

  const els = {
    huntCodeInput: document.getElementById('huntCodeInput'),
    speciesSelect: document.getElementById('speciesSelect'),
    weaponSelect: document.getElementById('weaponSelect'),
    residencySelect: document.getElementById('residencySelect'),
    pointsInput: document.getElementById('pointsInput'),
    goalTypeSelect: document.getElementById('goalTypeSelect'),
    searchInput: document.getElementById('searchInput'),
    wantsOutfitterToggle: document.getElementById('wantsOutfitterToggle'),
    filterReadout: document.getElementById('filterReadout'),
    plannerReadout: document.getElementById('plannerReadout'),
    runResearchButton: document.getElementById('runResearchButton'),
    clearFiltersButton: document.getElementById('clearFiltersButton'),
    addToBasketButton: document.getElementById('addToBasketButton'),
    matrixBody: document.getElementById('matrixBody'),
    visibleCount: document.getElementById('visibleCount'),
    selectedOutlook: document.getElementById('selectedOutlook'),
    selectedDrawFamily: document.getElementById('selectedDrawFamily'),
    selectedPermitRead: document.getElementById('selectedPermitRead'),
    selectedCutoffRead: document.getElementById('selectedCutoffRead'),
    basketCount: document.getElementById('basketCount'),
    matrixCount: document.getElementById('matrixCount'),
    detailTitle: document.getElementById('detailTitle'),
    detailEmpty: document.getElementById('detailEmpty'),
    detailContent: document.getElementById('detailContent'),
    detailSpeciesWeapon: document.getElementById('detailSpeciesWeapon'),
    detailAccessType: document.getElementById('detailAccessType'),
    detailHarvest: document.getElementById('detailHarvest'),
    detailPressure: document.getElementById('detailPressure'),
    detailOutfitters: document.getElementById('detailOutfitters'),
    detailPermitSource: document.getElementById('detailPermitSource'),
    detailSelectedResult: document.getElementById('detailSelectedResult'),
    detailGuaranteedLane: document.getElementById('detailGuaranteedLane'),
    detailRandomLane: document.getElementById('detailRandomLane'),
    detailCutoff: document.getElementById('detailCutoff'),
    detailMethod: document.getElementById('detailMethod'),
    detailGoalFit: document.getElementById('detailGoalFit'),
    detailHeadline: document.getElementById('detailHeadline'),
    detailExplanation: document.getElementById('detailExplanation'),
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

  function getResidencyKey() {
    return els.residencySelect.value === 'Nonresident' ? 'nonresident' : 'resident';
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
      console.warn('Could not read hunt basket.', error);
    }
    return [];
  }

  function saveBasket(items) {
    const trimmed = items.slice(0, 20);
    localStorage.setItem(BASKET_KEY, JSON.stringify(trimmed));
    localStorage.removeItem(LEGACY_BASKET_KEY);
  }

  function getRawRows(hunt, residencyKey) {
    if (String(hunt.draw_family || '').toLowerCase() === 'bonus_draw') {
      return Array.isArray(hunt.bonus_draw?.[residencyKey]) ? hunt.bonus_draw[residencyKey] : [];
    }
    if (String(hunt.draw_family || '').toLowerCase() === 'preference_draw') {
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
        headline: num(projected.projected_total_probability_pct) >= 99.95 ? 'Projected guaranteed' : 'Projected 2026 result',
        cutoff: projected.projected_cutoff_point,
      };
    }

    const rawRow = getRawRowAtPoints(hunt, residencyKey, points);
    if (rawRow) {
      return {
        text: rawRow.success_ratio_text || '2025 row',
        headline: '2025 row read',
        cutoff: residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal,
      };
    }

    return {
      text: hunt.draw_family === 'none' ? 'No draw' : 'No row at points',
      headline: hunt.draw_family === 'none' ? 'Access / pressure read' : 'Point row not present',
      cutoff: residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal,
    };
  }

  function getGoalFit(hunt, goalType) {
    const success = num(hunt.percent_success);
    const satisfaction = num(hunt.satisfaction);
    const pressure = num(hunt.harvest_pressure_score);

    switch (goalType) {
      case 'MAX_TROPHY':
        return satisfaction !== null && satisfaction >= 4
          ? 'Stronger trophy-quality signal from satisfaction and limited-entry structure.'
          : 'Draw access matters more than trophy signal on this row.';
      case 'HIGH_QUALITY':
        return satisfaction !== null
          ? `Quality read leans on satisfaction (${formatDecimal(satisfaction, 1)}) and controlled access.`
          : 'Quality signal is limited, so use draw method plus hunt context.';
      case 'MEAT':
        return success !== null
          ? `Meat read leans on harvest success (${formatPercent(success)}) and practical access.`
          : 'Meat read is limited because harvest performance is missing.';
      case 'OPPORTUNITY':
      default:
        return pressure !== null
          ? `Opportunity read leans on draw access first, then pressure (${formatDecimal(pressure, 2)} hunters per permit).`
          : 'Opportunity read leans on draw access and permit availability.';
    }
  }

  function sortScore(hunt, residencyKey, points, goalType) {
    const projected = getProjectedRowAtPoints(hunt, residencyKey, points);
    const probability = num(projected?.projected_total_probability_pct) ?? -1;
    const guaranteed = num(projected?.projected_guaranteed_probability_pct) ?? -1;
    const permits = getRecommendedPermits(hunt, residencyKey) ?? num(hunt.permits_total) ?? -1;
    const success = num(hunt.percent_success) ?? -1;
    const satisfaction = num(hunt.satisfaction) ?? -1;
    const pressure = num(hunt.harvest_pressure_score) ?? Number.MAX_SAFE_INTEGER;
    const outfitterCount = num(hunt.verified_outfitter_count) ?? 0;

    switch (goalType) {
      case 'MAX_TROPHY':
        return [satisfaction, guaranteed, probability, -pressure, permits, outfitterCount];
      case 'HIGH_QUALITY':
        return [satisfaction, probability, guaranteed, -pressure, success, permits];
      case 'MEAT':
        return [success, probability, -pressure, permits, satisfaction, outfitterCount];
      case 'OPPORTUNITY':
      default:
        return [probability, guaranteed, permits, success, -pressure, outfitterCount];
    }
  }

  function compareScoreArrays(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      const left = a[i] ?? -Infinity;
      const right = b[i] ?? -Infinity;
      if (left > right) return -1;
      if (left < right) return 1;
    }
    return 0;
  }

  function buildFilters() {
    return {
      huntCode: normalizeKey(els.huntCodeInput.value),
      species: els.speciesSelect.value || '',
      weapon: els.weaponSelect.value || '',
      residencyKey: getResidencyKey(),
      residencyLabel: els.residencySelect.value,
      points: getCurrentPoints(),
      goalType: els.goalTypeSelect.value || 'OPPORTUNITY',
      search: normalizeKey(els.searchInput.value),
      wantsOutfitter: els.wantsOutfitterToggle.checked,
    };
  }

  function filterHunts(filters) {
    const visible = state.hunts.filter((hunt) => {
      if (filters.huntCode && normalizeKey(hunt.hunt_code) !== filters.huntCode) return false;
      if (filters.species && hunt.species !== filters.species) return false;
      if (filters.weapon && hunt.weapon !== filters.weapon) return false;
      if (filters.wantsOutfitter && (num(hunt.verified_outfitter_count) ?? 0) <= 0) return false;

      if (filters.search) {
        const haystack = [
          hunt.hunt_code,
          hunt.hunt_name,
          hunt.species,
          hunt.weapon,
          hunt.hunt_type,
          hunt.dwr_unit_name,
        ].join(' ').toUpperCase();
        if (!haystack.includes(filters.search)) return false;
      }

      return true;
    });

    visible.sort((left, right) => {
      const result = compareScoreArrays(
        sortScore(left, filters.residencyKey, filters.points, filters.goalType),
        sortScore(right, filters.residencyKey, filters.points, filters.goalType)
      );
      if (result !== 0) return result;
      return String(left.hunt_code).localeCompare(String(right.hunt_code));
    });

    return visible;
  }

  function populateSelect(select, values, placeholder) {
    const current = select.value;
    const options = ['<option value="">' + placeholder + '</option>'].concat(
      values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    );
    select.innerHTML = options.join('');
    if (values.includes(current)) {
      select.value = current;
    }
  }

  function populateStaticFilters() {
    const species = Array.from(new Set(state.hunts.map((hunt) => hunt.species).filter(Boolean))).sort();
    const weapons = Array.from(new Set(state.hunts.map((hunt) => hunt.weapon).filter(Boolean))).sort();
    populateSelect(els.speciesSelect, species, 'All species');
    populateSelect(els.weaponSelect, weapons, 'All weapons');
  }

  function renderFilterReadout(filters) {
    const filterBits = [];
    if (filters.species) filterBits.push(filters.species);
    if (filters.weapon) filterBits.push(filters.weapon);
    if (filters.wantsOutfitter) filterBits.push('verified outfitter only');
    if (filters.search) filterBits.push(`search: ${filters.search}`);
    if (!filterBits.length) filterBits.push('all species and weapons');

    els.filterReadout.textContent =
      `${state.filteredHunts.length} hunts visible for ${filters.residencyLabel.toLowerCase()} applicants at ${filters.points} point${filters.points === 1 ? '' : 's'} · ${filterBits.join(' · ')}.`;
    els.plannerReadout.textContent = state.selectedHuntCode
      ? `Planner handoff active for ${state.selectedHuntCode}. The matrix is ready to compare that hunt against nearby options.`
      : 'Hunt Planner handoff is active. If you selected a hunt on the planner page, this screen will pick it up automatically.';
  }

  function renderMatrix(filters) {
    els.visibleCount.textContent = String(state.filteredHunts.length);
    els.matrixCount.textContent = String(state.filteredHunts.length);

    if (!state.filteredHunts.length) {
      els.matrixBody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <strong>No hunts matched these filters</strong>
              <p>Widen the filters or clear the outfitter/search restrictions to bring hunts back into view.</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    els.matrixBody.innerHTML = state.filteredHunts.map((hunt) => {
      const outlook = getMatrixOutlook(hunt, filters.residencyKey, filters.points);
      const permits = getRecommendedPermits(hunt, filters.residencyKey) ?? num(hunt.permits_total);
      const cutoff = outlook.cutoff ?? (filters.residencyKey === 'resident' ? num(hunt.resident_point_signal) : num(hunt.nonresident_point_signal));
      const selected = normalizeKey(hunt.hunt_code) === normalizeKey(state.selectedHuntCode) ? 'is-selected' : '';
      const outfitterText = (num(hunt.verified_outfitter_count) ?? 0) > 0
        ? `${formatInteger(hunt.verified_outfitter_count)} verified`
        : 'None shown';

      return `
        <tr class="${selected}" data-hunt-code="${escapeHtml(hunt.hunt_code)}">
          <td>
            <div class="matrix-hunt-title">${escapeHtml(hunt.hunt_name || hunt.hunt_code)}</div>
            <div class="matrix-subline">${escapeHtml(hunt.hunt_code)} · ${escapeHtml(hunt.dwr_unit_name || hunt.species || '')}</div>
            <div class="tag-row">
              <span class="tag">${escapeHtml(drawFamilyLabel(hunt.draw_family))}</span>
              <span class="tag">${escapeHtml(hunt.weapon || 'Unknown weapon')}</span>
            </div>
          </td>
          <td>${escapeHtml(filters.residencyLabel)}</td>
          <td>${permits === null ? 'Not available' : formatInteger(permits)}</td>
          <td>${escapeHtml(outlook.text)}</td>
          <td>${cutoff === null ? 'No signal' : `${escapeHtml(String(cutoff))} pts`}</td>
          <td>${escapeHtml(hunt.access_type || 'Unknown')}</td>
          <td>${escapeHtml(outfitterText)}</td>
        </tr>`;
    }).join('');

    els.matrixBody.querySelectorAll('tr[data-hunt-code]').forEach((rowEl) => {
      rowEl.addEventListener('click', () => {
        const huntCode = normalizeKey(rowEl.getAttribute('data-hunt-code'));
        selectHunt(huntCode, true);
      });
    });
  }

  function renderRawTable(hunt, residencyKey) {
    const rows = getRawRows(hunt, residencyKey)
      .slice()
      .sort((a, b) => (num(b.point_level) ?? -1) - (num(a.point_level) ?? -1));

    if (!rows.length) {
      els.rawTableWrap.hidden = true;
      els.rawTableEmpty.hidden = false;
      els.rawTableBody.innerHTML = '';
      return;
    }

    const isBonus = String(hunt.draw_family || '').toLowerCase() === 'bonus_draw';
    els.rawColA.textContent = isBonus ? 'Bonus' : 'Permits';
    els.rawColB.textContent = isBonus ? 'Random' : 'Source';
    els.rawColC.textContent = isBonus ? 'Total' : 'Type';

    els.rawTableBody.innerHTML = rows.map((row) => {
      if (isBonus) {
        return `
          <tr>
            <td>${formatInteger(row.point_level)}</td>
            <td>${formatInteger(row.applicants)}</td>
            <td>${formatInteger(row.bonus_permits)}</td>
            <td>${formatInteger(row.random_permits)}</td>
            <td>${formatInteger(row.total_permits)}</td>
            <td>${escapeHtml(row.success_ratio_text || 'N/A')}</td>
          </tr>`;
      }

      return `
        <tr>
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

  function renderProjectedTable(hunt, residencyKey) {
    const rows = getProjectedRows(hunt, residencyKey)
      .slice()
      .sort((a, b) => (num(b.apply_with_points) ?? -1) - (num(a.apply_with_points) ?? -1));

    if (!rows.length) {
      els.projectedTableWrap.hidden = true;
      els.projectedTableEmpty.hidden = false;
      els.projectedTableBody.innerHTML = '';
      return;
    }

    els.projectedTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${formatInteger(row.apply_with_points)}</td>
        <td>${formatInteger(row.projected_carryover_pool_at_point)}</td>
        <td>${formatProbability(row.projected_guaranteed_probability_pct)}</td>
        <td>${formatProbability(row.projected_random_probability_pct)}</td>
        <td>${formatProbability(row.projected_total_probability_pct)}</td>
        <td>${row.projected_cutoff_point === null ? 'None' : `${formatInteger(row.projected_cutoff_point)} pts`}</td>
      </tr>`).join('');

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
        guaranteedLane: `${formatProbability(guaranteed)} · ${formatInteger(projected.projected_guaranteed_draws_at_point)} guaranteed draws at point`,
        randomLane: `${formatProbability(random)} · ${formatInteger(projected.projected_random_pool_permits)} random permits`,
        cutoff: `${cutoff === null ? 'No cutoff' : `${formatInteger(cutoff)} pts`} · pressure ${formatDecimal(projected.projected_cutoff_pressure_ratio, 2)}`,
        method: `2026 simulated projection · ${projected.random_method || 'engine'} · ${formatInteger(projected.simulation_iterations)} iterations`,
        headline,
        explanation: `${residencyLabel} projection uses last year's actual draw ladder, removes prior winners, rolls the carry-forward pool up one point, keeps the 0-point baseline flat, and applies current permits before Utah-style random simulation.`,
      };
    }

    if (rawRow) {
      return {
        selectedResult: rawRow.success_ratio_text || '2025 row',
        guaranteedLane: String(hunt.draw_family || '').toLowerCase() === 'preference_draw'
          ? `Preference row · ${formatInteger(rawRow.permits_awarded)} permits at this tier`
          : `2025 bonus row · ${formatInteger(rawRow.bonus_permits)} bonus permits`,
        randomLane: String(hunt.draw_family || '').toLowerCase() === 'bonus_draw'
          ? `2025 random row · ${formatInteger(rawRow.random_permits)} random permits`
          : 'Preference draw does not use a bonus/random split',
        cutoff: `Signal ${formatInteger(residencyKey === 'resident' ? hunt.resident_point_signal : hunt.nonresident_point_signal)} pts`,
        method: '2025 source ladder only',
        headline: 'Exact source row available',
        explanation: `${residencyLabel} row ${formatInteger(points)} exists in the accepted 2025 draw ladder. This page is showing the source row directly because no 2026 simulation row is attached for this hunt family.`,
      };
    }

    return {
      selectedResult: 'No point-row result',
      guaranteedLane: 'No supported draw row at selected points',
      randomLane: String(hunt.draw_family || '').toLowerCase() === 'none' ? 'No-draw hunt' : 'No row loaded',
      cutoff: 'No cutoff read',
      method: String(hunt.draw_family || '').toLowerCase() === 'none' ? 'Access / pressure read' : 'Awaiting engine support',
      headline: String(hunt.draw_family || '').toLowerCase() === 'none' ? 'This hunt is not draw-based' : 'Selected points have no loaded row',
      explanation: String(hunt.draw_family || '').toLowerCase() === 'none'
        ? 'This hunt is interpreted as access, timing, and pressure rather than a point-based draw ladder.'
        : 'The selected point row is not present in the current dataset for this hunt and residency.',
    };
  }

  function renderSelectedStats(hunt, filters) {
    if (!hunt) {
      els.selectedOutlook.textContent = 'Waiting';
      els.selectedOutlook.className = 'value likelihood-unknown';
      els.selectedDrawFamily.textContent = 'Not loaded';
      els.selectedPermitRead.textContent = 'Not loaded';
      els.selectedCutoffRead.textContent = 'Not loaded';
      return;
    }

    const decision = buildDecisionRead(hunt, filters.residencyKey, filters.points);
    const projected = getProjectedRowAtPoints(hunt, filters.residencyKey, filters.points);
    const permits = getRecommendedPermits(hunt, filters.residencyKey) ?? num(hunt.permits_total);

    els.selectedOutlook.textContent = decision.selectedResult;
    els.selectedOutlook.className = `value ${getLikelihoodClass(projected?.projected_total_probability_pct)}`;
    els.selectedDrawFamily.textContent = drawFamilyLabel(hunt.draw_family);
    els.selectedPermitRead.textContent = permits === null ? 'Not available' : formatInteger(permits);
    els.selectedCutoffRead.textContent = projected?.projected_cutoff_point !== undefined && projected?.projected_cutoff_point !== null
      ? `${formatInteger(projected.projected_cutoff_point)} pts`
      : (filters.residencyKey === 'resident' ? formatInteger(hunt.resident_point_signal) : formatInteger(hunt.nonresident_point_signal));
  }

  function renderSelectedDetail(hunt, filters) {
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
      return;
    }

    const decision = buildDecisionRead(hunt, filters.residencyKey, filters.points);
    const permitRecord = hunt.recommended_permits;
    const permits = getRecommendedPermits(hunt, filters.residencyKey) ?? num(hunt.permits_total);
    const priorPermits = getPriorPermits(hunt, filters.residencyKey);
    const pressure = num(hunt.harvest_pressure_score);
    const efficiency = num(hunt.harvest_efficiency_score);

    els.detailEmpty.hidden = true;
    els.detailContent.hidden = false;
    els.detailTitle.textContent = `${hunt.hunt_code} · ${hunt.hunt_name}`;
    els.detailSpeciesWeapon.textContent = `${hunt.species || 'Unknown'} · ${hunt.weapon || 'Unknown weapon'} · ${filters.residencyLabel}`;
    els.detailAccessType.textContent = hunt.access_type || 'Unknown';
    els.detailHarvest.textContent = `${formatPercent(hunt.percent_success)} · ${formatInteger(hunt.harvest)} harvested`;
    els.detailPressure.textContent = `${pressure === null ? 'Not available' : `${formatDecimal(pressure, 2)} hunters per permit`} · ${efficiency === null ? 'efficiency n/a' : `${formatDecimal(efficiency, 2)} harvest efficiency`}`;
    els.detailOutfitters.textContent = `${formatInteger(hunt.verified_outfitter_count)} verified · ${formatInteger(hunt.cpo_outfitter_count)} C.P.O.`;
    els.detailPermitSource.textContent = permitRecord
      ? `${permitRecord.source_authority_level || permitRecord.source_type || 'permit source'} · ${permits === null ? 'permits n/a' : formatInteger(permits)} current${priorPermits === null ? '' : ` (${formatInteger(priorPermits)} prior)`}`
      : 'No current permit authority attached';
    els.detailSelectedResult.textContent = decision.selectedResult;
    els.detailGuaranteedLane.textContent = decision.guaranteedLane;
    els.detailRandomLane.textContent = decision.randomLane;
    els.detailCutoff.textContent = decision.cutoff;
    els.detailMethod.textContent = decision.method;
    els.detailGoalFit.textContent = getGoalFit(hunt, filters.goalType);
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
    renderRawTable(hunt, filters.residencyKey);
    renderProjectedTable(hunt, filters.residencyKey);
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
      wants_outfitter: filters.wantsOutfitter,
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
        <div class="basket-empty">
          <strong>No hunts saved yet</strong>
          <p>Add a selected hunt to keep it moving between Hunt Planner, Hunt Research, and Outfitter Verification.</p>
        </div>`;
      return;
    }

    els.basketList.innerHTML = items.map((item) => `
      <div class="basket-item">
        <span class="label">${escapeHtml(item.hunt_code)}</span>
        <h4>${escapeHtml(item.hunt_name || item.hunt_code)}</h4>
        <p>${escapeHtml(item.species || '')}${item.weapon ? ' · ' + escapeHtml(item.weapon) : ''} · ${escapeHtml(item.residency || 'Resident')} · ${formatInteger(item.selected_points)} points</p>
        <p>${item.projected_total_probability_pct === null ? 'No projected result stored' : `Stored outlook: ${formatProbability(item.projected_total_probability_pct)}`}</p>
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
    state.filteredHunts = filterHunts(filters);

    if (!state.selectedHuntCode && filters.huntCode) {
      state.selectedHuntCode = filters.huntCode;
    }

    let selected = state.selectedHuntCode ? state.huntMap.get(state.selectedHuntCode) : null;
    if (!selected && filters.huntCode) {
      selected = state.huntMap.get(filters.huntCode) || null;
      state.selectedHuntCode = filters.huntCode;
    }
    if (!selected && state.filteredHunts.length) {
      selected = state.filteredHunts[0];
      state.selectedHuntCode = normalizeKey(selected.hunt_code);
    }

    renderFilterReadout(filters);
    renderMatrix(filters);
    renderSelectedDetail(selected, filters);
  }

  function clearFilters() {
    els.huntCodeInput.value = '';
    els.speciesSelect.value = '';
    els.weaponSelect.value = '';
    els.residencySelect.value = 'Resident';
    els.pointsInput.value = '12';
    els.goalTypeSelect.value = 'OPPORTUNITY';
    els.searchInput.value = '';
    els.wantsOutfitterToggle.checked = false;
    state.selectedHuntCode = normalizeKey(localStorage.getItem(SELECTED_HUNT_KEY));
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
    populateStaticFilters();
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
    const bootstrapHunt = queryHunt || storedHunt;

    if (bootstrapHunt) {
      els.huntCodeInput.value = bootstrapHunt;
      state.selectedHuntCode = bootstrapHunt;
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

    [
      els.speciesSelect,
      els.weaponSelect,
      els.residencySelect,
      els.goalTypeSelect,
      els.wantsOutfitterToggle,
    ].forEach((el) => {
      el.addEventListener('change', runResearch);
    });

    [els.huntCodeInput, els.pointsInput, els.searchInput].forEach((el) => {
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
