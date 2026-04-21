window.UOGA_HUNTS = (() => {
  const {
    HUNT_BOUNDARY_NAME_OVERRIDES,
    HUNT_TYPE_ORDER,
    HUNT_CLASS_ORDER,
    SEX_ORDER,
    WEAPON_ORDER,
    SPIKE_ELK_HUNT_CODES
  } = window.UOGA_CONFIG;

  // --- UTILITIES ---
  function safe(v) { return String(v ?? ''); }
  function firstNonEmpty(...a) { for (const x of a) { const t = safe(x).trim(); if (t) return t; } return ''; }
  function titleCaseWords(v) {
    return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  // --- NORMALIZATION ---
  function normalizeSpeciesLabel(value) {
    const text = safe(value).trim().toLowerCase();
    if (!text) return '';
    if (text === 'mule deer' || text === 'deer') return 'Deer';
    if (text.includes('desert') && text.includes('bighorn')) return 'Desert Bighorn Sheep';
    if (text.includes('rocky') && text.includes('bighorn')) return 'Rocky Mountain Bighorn Sheep';
    if (text === 'bighorn sheep') return 'Bighorn Sheep';
    return titleCaseWords(text);
  }

  function inferBighornSpecies(hunt) {
    const code = safe(getHuntCode(hunt)).toUpperCase();
    const title = safe(getHuntTitle(hunt)).toLowerCase();
    const rawSpecies = safe(firstNonEmpty(hunt.species, hunt.Species)).toLowerCase();
    const haystack = `${title} ${rawSpecies}`;
    if (code.startsWith('DS') || haystack.includes('desert bighorn')) return 'Desert Bighorn Sheep';
    if (code.startsWith('RS') || code.startsWith('RE') || haystack.includes('rocky mountain bighorn')) return 'Rocky Mountain Bighorn Sheep';
    return 'Bighorn Sheep';
  }

  function getSpeciesDisplayList(h) {
    const rawSpecies = safe(firstNonEmpty(h.species, h.Species));
    const normalized = rawSpecies.split(',').map(normalizeSpeciesLabel).filter(Boolean);
    const resolved = normalized.map(species => species === 'Bighorn Sheep' ? inferBighornSpecies(h) : species);
    return Array.from(new Set(resolved));
  }

  function getSpeciesDisplay(h) { return getSpeciesDisplayList(h)[0] || ''; }

  function getNormalizedSex(valueOrHunt) {
    const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex);
    const hunt = typeof valueOrHunt === 'string' ? null : valueOrHunt;
    const val = raw.toLowerCase();
    const species = hunt ? getSpeciesDisplay(hunt) : '';
    if (val.includes('choice')) return "Hunter's Choice";
    if (val.includes('either')) return 'Either Sex';
    if (val === 'ewe') return 'Ewe';
    if ((val === 'doe' || val === 'cow' || val.includes('antlerless')) && species === 'Rocky Mountain Bighorn Sheep') return 'Ewe';
    if ((val === 'doe' || val === 'cow' || val.includes('antlerless')) && species === 'Desert Bighorn Sheep') return 'Ram';
    if (val === 'doe' || val === 'cow' || val.includes('antlerless')) return 'Antlerless';
    if (val.includes('bearded')) return 'Bearded';
    if (val.includes('ram')) return 'Ram';
    if (val.includes('buck')) return 'Buck';
    if (val.includes('bull')) return 'Bull';
    if (val.includes('male only') && hunt) {
      if (species === 'Rocky Mountain Bighorn Sheep') return 'Ram';
      if (species === 'Desert Bighorn Sheep') return 'Ram';
    }
    return titleCaseWords(raw) || 'All';
  }

  function getHuntCode(h) { return firstNonEmpty(h.huntCode, h.hunt_code, h.HuntCode, h.code); }
  function getHuntTitle(h) { return firstNonEmpty(h.title, h.Title, h.huntTitle, getHuntCode(h)); }
  function getUnitCode(h) { return firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode); }
  function getUnitName(h) { return firstNonEmpty(h.unitName, h.unit_name, h.UnitName); }

  function getBoundaryNamesForHunt(h) {
    const code = safe(getUnitCode(h)).trim();
    const unitName = safe(getUnitName(h)).trim();
    const strippedUnitName = unitName.replace(/\s*\((?:conservation|private lands only|select areas only)\)\s*$/i, '').trim();
    const officialNames = Array.isArray(h?.officialBoundaryNames) ? h.officialBoundaryNames : [];
    const base = [unitName, strippedUnitName, ...officialNames];
    const overrides = Array.isArray(HUNT_BOUNDARY_NAME_OVERRIDES[code]) ? HUNT_BOUNDARY_NAME_OVERRIDES[code] : [];
    return [...new Set([...base, ...overrides].map(v => safe(v).trim()).filter(Boolean))];
  }

  function getUnitValue(h) { return firstNonEmpty(getUnitCode(h), getUnitName(h)); }
  function getBoundaryId(h) { return firstNonEmpty(h.boundaryId, h.boundaryID, h.BoundaryID); }
  function normalizeHuntCode(value) { return safe(value).trim().toUpperCase(); }

  function getHuntRecordKey(h) {
    return [
      normalizeHuntCode(getHuntCode(h)),
      safe(getBoundaryId(h)).trim(),
      safe(getWeapon(h)).trim().toLowerCase(),
      normalizeBoundaryKey(getUnitName(h) || getUnitCode(h))
    ].join('|');
  }

  function normalizeWeaponLabel(raw) {
    const value = safe(raw).trim();
    const lower = value.toLowerCase();
    if (!value) return '';
    if (lower.includes('any legal weapon')) return 'Any Legal Weapon';
    if (lower.includes('extended archery')) return 'Extended Archery';
    if (lower.includes('restricted archery')) return 'Restricted Archery';
    if (lower.includes('restricted muzzleloader')) return 'Restricted Muzzleloader';
    if (lower.includes('restricted multiseason')) return 'Restricted Multiseason';
    if (lower.includes('restricted rifle')) return 'Restricted Rifle';
    if (lower.includes('muzzleloader')) return 'Muzzleloader';
    if (lower.includes('archery')) return 'Archery';
    if (lower.includes('dedicated hunter')) return 'Multiseason';
    if (lower.includes('hamss') || lower.includes('shotgun') || lower.includes('straight-walled')) return 'HAMSS';
    if (lower.includes('multiseason')) return 'Multiseason';
    return value;
  }

  function getWeapon(h) { return normalizeWeaponLabel(firstNonEmpty(h.weapon, h.Weapon)); }

  function normalizeHuntTypeLabel(raw) {
    const value = safe(raw).trim();
    const lower = value.toLowerCase();
    if (!value) return '';
    if (lower.includes('private land only')) return 'Private Land Only';
    if (lower.includes('premium')) return 'Premium Limited Entry';
    if (lower.includes('limited')) return 'Limited Entry';
    if (lower.includes('once-in-a-lifetime')) return 'Once-in-a-Lifetime';
    if (lower.includes('dedicated hunter')) return 'Dedicated Hunter';
    if (lower.includes('management')) return 'Management';
    if (lower.includes('youth')) return 'Youth';
    if (lower.includes('conservation')) return 'Conservation';
    if (lower.includes('cwmu')) return 'CWMU';
    if (lower.includes('antlerless')) return 'Antlerless';
    if (lower.includes('general')) return 'General Season';
    return value;
  }

  function getHuntType(h) {
    if (h?.syntheticConservationPermit) return 'Conservation';
    const raw = firstNonEmpty(h.huntType, h.HuntType, h.type);
    return normalizeHuntTypeLabel(raw);
  }

  function normalizeHuntCategoryLabel(raw) {
    const value = safe(raw).trim();
    const lower = value.toLowerCase();
    if (!value) return '';
    if (lower.includes('statewide permit')) return 'Statewide Permit';
    if (lower.includes('private land only')) return 'Private Land Only';
    if (lower.includes('extended archery')) return 'Extended Archery';
    if (lower.includes('premium')) return 'Premium Limited Entry';
    if (lower.includes('limited')) return 'Limited Entry';
    if (lower.includes('cwmu')) return 'CWMU';
    if (lower.includes('youth')) return 'Youth';
    if (lower.includes('conservation')) return 'Conservation';
    if (lower.includes('management')) return 'Management';
    if (lower.includes('spike')) return 'Spike Only';
    if (lower.includes('general bull') || lower.includes('bull elk') || lower.includes('any bull')) return 'General Bull';
    if (lower.includes('antlerless')) return 'Antlerless';
    if (lower.includes('general')) return 'General Season';
    return value;
  }

  function getHuntCategory(h) {
    if (h?.syntheticConservationPermit) {
      return firstNonEmpty(h.huntCategory, h.HuntCategory, h.category, 'Conservation');
    }
    const raw = firstNonEmpty(h.huntCategory, h.HuntCategory, h.category);
    const normalized = normalizeHuntCategoryLabel(raw);
    const huntType = getHuntType(h);
    const species = getSpeciesDisplay(h);
    const sex = getNormalizedSex(h);
    const haystack = `${safe(raw)} ${getHuntTitle(h)} ${getUnitName(h)}`.toLowerCase();

    if (species === 'Elk' && sex === 'Bull') {
      if (huntType === 'Limited Entry') {
        if (
          haystack.includes('bull elk') ||
          haystack.includes('mature bull') ||
          haystack.includes('any bull') ||
          normalized === 'General Bull' ||
          normalized === 'General Season'
        ) {
          return 'Mature Bull';
        }
      }
      if (huntType === 'General Season') {
        if (haystack.includes('spike')) return 'Spike Only';
        if (
          haystack.includes('bull elk') ||
          haystack.includes('any bull') ||
          haystack.includes('hunters choice') ||
          normalized === 'General Bull'
        ) {
          return 'General Bull';
        }
      }
    }

    return normalized;
  }

  function normalizeBoundaryKey(value) {
    return safe(value)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildBoundaryMatcher(hunts) {
    const boundaryIds = new Set();
    const exactNames = new Set();
    const prefixNames = new Set();
    hunts.forEach(hunt => {
      const boundaryId = safe(getBoundaryId(hunt)).trim();
      if (boundaryId) boundaryIds.add(boundaryId);
      const officialBoundaryIds = Array.isArray(hunt?.officialBoundaryIds) ? hunt.officialBoundaryIds : [];
      officialBoundaryIds.forEach(id => {
        const normalizedId = safe(id).trim();
        if (normalizedId) boundaryIds.add(normalizedId);
      });      const names = getBoundaryNamesForHunt(hunt).map(normalizeBoundaryKey).filter(Boolean);
      names.forEach(name => exactNames.add(name));
      if (!boundaryId) names.forEach(name => prefixNames.add(name));
    });
    return {
      matches(featureBoundaryId, featureName) {
        if (boundaryIds.has(featureBoundaryId)) return true;
        if (exactNames.has(featureName)) return true;
        for (const prefix of prefixNames) {
          if (featureName.startsWith(`${prefix}-`) || prefix.startsWith(`${featureName}-`)) return true;
        }
        return false;
      }
    };
  }

  // --- STATE ACCESSORS (reads from window.UOGA_STATE) ---
  function getHuntData() { return window.UOGA_STATE?.huntData || []; }
  function setHuntData(data) { if (window.UOGA_STATE) window.UOGA_STATE.huntData = data; }
  function getSelectedHunt() { return window.UOGA_STATE?.selectedHunt || null; }
  function setSelectedHunt(hunt) { if (window.UOGA_STATE) window.UOGA_STATE.selectedHunt = hunt; }

  // --- FILTER HELPERS ---
  function weaponMatchesFilter(hunt, selectedWeapon) {
    if (!selectedWeapon || selectedWeapon === 'All') return true;
    const huntWeapon = getWeapon(hunt);
    if (huntWeapon === selectedWeapon) return true;
    if (
      hunt?.syntheticConservationPermit &&
      selectedWeapon === 'Any Legal Weapon' &&
      (huntWeapon === 'Multiseason' || huntWeapon === 'Restricted Multiseason' || huntWeapon === "Hunter's Choice")
    ) {
      return true;
    }
    return false;
  }

  function hasActiveMatrixSelections() {
    const searchInput = document.getElementById('searchInput');
    const speciesFilter = document.getElementById('speciesFilter');
    const sexFilter = document.getElementById('sexFilter');
    const huntTypeFilter = document.getElementById('huntTypeFilter');
    const huntCategoryFilter = document.getElementById('huntCategoryFilter');
    const weaponFilter = document.getElementById('weaponFilter');
    const unitFilter = document.getElementById('unitFilter');
    return [
      safe(searchInput?.value).trim(),
      speciesFilter?.value && speciesFilter.value !== 'All Species' ? speciesFilter.value : '',
      sexFilter?.value && sexFilter.value !== 'All' ? sexFilter.value : '',
      huntTypeFilter?.value && huntTypeFilter.value !== 'All' ? huntTypeFilter.value : '',
      huntCategoryFilter?.value && huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : '',
      weaponFilter?.value && weaponFilter.value !== 'All' ? weaponFilter.value : '',
      unitFilter?.value || ''
    ].filter(Boolean).length > 0;
  }

  function hasReadyUnitSelection() {
    return !!safe(document.getElementById('unitFilter')?.value).trim();
  }

  function getFilteredHunts(excludeKey = '') {
    const searchInput = document.getElementById('searchInput');
    const speciesFilter = document.getElementById('speciesFilter');
    const sexFilter = document.getElementById('sexFilter');
    const huntTypeFilter = document.getElementById('huntTypeFilter');
    const weaponFilter = document.getElementById('weaponFilter');
    const huntCategoryFilter = document.getElementById('huntCategoryFilter');
    const unitFilter = document.getElementById('unitFilter');

    const search = safe(searchInput?.value).trim().toLowerCase();
    const species = safe(speciesFilter?.value || 'All Species');
    const sex = safe(sexFilter?.value || 'All');
    const huntType = safe(huntTypeFilter?.value || 'All');
    const weapon = safe(weaponFilter?.value || 'All');
    const huntCategory = safe(huntCategoryFilter?.value || 'All');
    const unit = safe(unitFilter?.value || '');

    return getHuntData().filter(h => {
      const sDisplay = getSpeciesDisplay(h);
      const hSex = getNormalizedSex(h);
      const hHuntType = getHuntType(h);
      const hWeapon = getWeapon(h);
      const hHuntCategory = getHuntCategory(h);
      const hUnit = getUnitValue(h);

      const searchOk = !search
        || getHuntTitle(h).toLowerCase().includes(search)
        || getHuntCode(h).toLowerCase().includes(search)
        || getUnitName(h).toLowerCase().includes(search);
      const speciesOk = excludeKey === 'species' || species === 'All Species' || sDisplay === species;
      const sexOk = excludeKey === 'sex' || sex === 'All' || hSex === sex;
      const huntTypeOk = excludeKey === 'huntType' || huntType === 'All' || hHuntType === huntType;
      const weaponOk = excludeKey === 'weapon' || weaponMatchesFilter(h, weapon);
      const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || hHuntCategory === huntCategory;
      const unitOk = excludeKey === 'unit' || !unit || hUnit === unit;
      const conservationDisplayOk = huntType !== 'Conservation' || !!h?.syntheticConservationPermit;

      return searchOk && speciesOk && sexOk && huntTypeOk && weaponOk && huntCategoryOk && unitOk && conservationDisplayOk;
    });
  }

  function getDisplayHunts() {
    if (!hasActiveMatrixSelections() && !getSelectedHunt()) return [];
    return getFilteredHunts();
  }

  return {
    // Utility
    safe,
    firstNonEmpty,
    titleCaseWords,
    normalizeBoundaryKey,
    // Normalization
    normalizeSpeciesLabel,
    inferBighornSpecies,
    getSpeciesDisplayList,
    getSpeciesDisplay,
    getNormalizedSex,
    getHuntCode,
    getHuntTitle,
    getUnitCode,
    getUnitName,
    getBoundaryNamesForHunt,
    getUnitValue,
    getBoundaryId,
    normalizeHuntCode,
    getHuntRecordKey,
    normalizeWeaponLabel,
    getWeapon,
    weaponMatchesFilter,
    normalizeHuntTypeLabel,
    getHuntType,
    normalizeHuntCategoryLabel,
    getHuntCategory,
    // Boundary
    buildBoundaryMatcher,
    // Filter
    hasActiveMatrixSelections,
    hasReadyUnitSelection,
    getFilteredHunts,
    getDisplayHunts,
    // State
    getHuntData,
    setHuntData,
    getSelectedHunt,
    setSelectedHunt
  };
})();
