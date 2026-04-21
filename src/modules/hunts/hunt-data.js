const {
  HUNT_BOUNDARY_NAME_OVERRIDES,
  OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
  CONSERVATION_PERMIT_AREA_SOURCES,
  CONSERVATION_PERMIT_HUNT_TABLE_SOURCES
} = window.UOGA_CONFIG;

const {
  loadOfficialBoundaryLookup: loadOfficialBoundaryLookupFromData,
  applyOfficialBoundaryMappings: applyOfficialBoundaryMappingsFromData,
  loadFirstNormalizedList
} = window.UOGA_DATA;

// --- State ---
let huntData = [];
let conservationPermitAreas = [];
let conservationPermitHuntTable = [];
const conservationPermitAreaCodeSet = new Set();
const conservationPermitAreaSpeciesUnitNameSet = new Set();
const conservationPermitAreaSpeciesUnitCodeSet = new Set();
const conservationPermitAreaAllowedTypeMap = new Map();
let officialBoundaryLookupPromise = null;

// --- State getters/setters ---
export function setHuntData(records) { huntData = Array.isArray(records) ? records : []; }
export function getAllHunts() { return huntData; }
export function getHuntByCode(code) { return huntData.find(h => getHuntCode(h) === code) || null; }
export function getHuntsByUnit(unit) { return huntData.filter(h => getUnitCode(h) === unit || getUnitName(h) === unit); }

export function getConservationPermitAreas() { return conservationPermitAreas; }
export function getConservationPermitHuntTable() { return conservationPermitHuntTable; }
export function setConservationPermitHuntTable(list) { conservationPermitHuntTable = Array.isArray(list) ? list : []; }
export function getConservationPermitAreaCodeSet() { return conservationPermitAreaCodeSet; }
export function getConservationPermitAreaSpeciesUnitNameSet() { return conservationPermitAreaSpeciesUnitNameSet; }
export function getConservationPermitAreaSpeciesUnitCodeSet() { return conservationPermitAreaSpeciesUnitCodeSet; }
export function getConservationPermitAreaAllowedTypeMap() { return conservationPermitAreaAllowedTypeMap; }

// --- UTILITIES ---
export function escapeHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
export function safe(v) { return String(v ?? ''); }
export function firstNonEmpty(...a) { for (let x of a) { let t = safe(x).trim(); if (t) return t; } return ''; }
export function titleCaseWords(v) { return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
export function normalizeVisibleVerificationLabel(v) { return safe(v).replace(/\bVetted\b/g, 'Verified'); }
export function assetUrl(path) {
  try {
    return new URL(path, window.location.href).href;
  } catch {
    return path;
  }
}
export function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

// --- DATA NORMALIZATION ---
export function normalizeSpeciesLabel(value) {
  const text = safe(value).trim().toLowerCase();
  if (!text) return '';
  if (text === 'mule deer' || text === 'deer') return 'Deer';
  if (text.includes('desert') && text.includes('bighorn')) return 'Desert Bighorn Sheep';
  if (text.includes('rocky') && text.includes('bighorn')) return 'Rocky Mountain Bighorn Sheep';
  if (text === 'bighorn sheep') {
    return 'Bighorn Sheep';
  }
  return titleCaseWords(text);
}

export function inferBighornSpecies(hunt) {
  const code = safe(getHuntCode(hunt)).toUpperCase();
  const title = safe(getHuntTitle(hunt)).toLowerCase();
  const rawSpecies = safe(firstNonEmpty(hunt.species, hunt.Species)).toLowerCase();
  const haystack = `${title} ${rawSpecies}`;
  if (code.startsWith('DS') || haystack.includes('desert bighorn')) return 'Desert Bighorn Sheep';
  if (code.startsWith('RS') || code.startsWith('RE') || haystack.includes('rocky mountain bighorn')) return 'Rocky Mountain Bighorn Sheep';
  return 'Bighorn Sheep';
}

export function getSpeciesDisplayList(h) {
  const rawSpecies = safe(firstNonEmpty(h.species, h.Species));
  const normalized = rawSpecies.split(',').map(normalizeSpeciesLabel).filter(Boolean);
  const resolved = normalized.map(species => species === 'Bighorn Sheep' ? inferBighornSpecies(h) : species);
  return Array.from(new Set(resolved));
}
export function getSpeciesDisplay(h) { return getSpeciesDisplayList(h)[0] || ''; }

export function getNormalizedSex(valueOrHunt) {
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

export function getHuntCode(h) { return firstNonEmpty(h.huntCode, h.hunt_code, h.HuntCode, h.code); }
export function getHuntTitle(h) { return firstNonEmpty(h.title, h.Title, h.huntTitle, getHuntCode(h)); }
export function getUnitCode(h) { return firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode); }
export function getUnitName(h) { return firstNonEmpty(h.unitName, h.unit_name, h.UnitName); }
export function getBoundaryNamesForHunt(h) {
  const code = safe(getUnitCode(h)).trim();
  const unitName = safe(getUnitName(h)).trim();
  const strippedUnitName = unitName.replace(/\s*\((?:conservation|private lands only|select areas only)\)\s*$/i, '').trim();
  const officialNames = Array.isArray(h?.officialBoundaryNames) ? h.officialBoundaryNames : [];
  const base = [unitName, strippedUnitName, ...officialNames];
  const overrides = Array.isArray(HUNT_BOUNDARY_NAME_OVERRIDES[code]) ? HUNT_BOUNDARY_NAME_OVERRIDES[code] : [];
  return [...new Set([...base, ...overrides].map(v => safe(v).trim()).filter(Boolean))];
}

export function buildBoundaryMatcher(hunts) {
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
    });
    const names = getBoundaryNamesForHunt(hunt).map(normalizeBoundaryKey).filter(Boolean);
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

export async function loadOfficialBoundaryLookup() {
  if (!officialBoundaryLookupPromise) {
    officialBoundaryLookupPromise = loadOfficialBoundaryLookupFromData({
      OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
      normalizeHuntCode,
      safe
    });
  }
  return officialBoundaryLookupPromise;
}

export async function applyOfficialBoundaryMappings(records) {
  return applyOfficialBoundaryMappingsFromData(records, {
    OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
    normalizeHuntCode,
    getHuntCode,
    getBoundaryId,
    safe
  });
}

export function getRequiredUsfsForestsForHunt(hunt) {
  const boundaryKeys = getBoundaryNamesForHunt(hunt).map(normalizeBoundaryKey);
  const required = new Set();
  boundaryKeys.forEach(key => {
    if (!key) return;
    if (
      key.includes('manti') ||
      key.includes('san rafael') ||
      key.includes('la sal') ||
      key.includes('dolores') ||
      key.includes('ferron') ||
      key.includes('price canyon') ||
      key.includes('gordon creek') ||
      key.includes('mohrland') ||
      key.includes('horn mtn') ||
      key.includes('moab') ||
      key.includes('monticello')
    ) {
      required.add('manti-la-sal');
    }
    if (
      key.includes('fishlake') ||
      key.includes('thousand lakes') ||
      key.includes('fillmore') ||
      key.includes('monroe') ||
      key.includes('beaver') ||
      key.includes('mt dutton') ||
      key.includes('plateau')
    ) {
      required.add('fishlake');
    }
    if (key.includes('nebo')) {
      required.add('uinta-wasatch-cache');
    }
  });
  return [...required];
}

export function getUnitValue(h) { return firstNonEmpty(getUnitCode(h), getUnitName(h)); }
export function getBoundaryId(h) { return firstNonEmpty(h.boundaryId, h.boundaryID, h.BoundaryID); }
export function normalizeHuntCode(value) { return safe(value).trim().toUpperCase(); }
export function getHuntRecordKey(h) {
  return [
    normalizeHuntCode(getHuntCode(h)),
    safe(getBoundaryId(h)).trim(),
    safe(getWeapon(h)).trim().toLowerCase(),
    normalizeBoundaryKey(getUnitName(h) || getUnitCode(h))
  ].join('|');
}
export function normalizeWeaponLabel(raw) {
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
export function getWeapon(h) { return normalizeWeaponLabel(firstNonEmpty(h.weapon, h.Weapon)); }
export function weaponMatchesFilter(hunt, selectedWeapon) {
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
export function normalizeHuntTypeLabel(raw) {
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
export function buildConservationSpeciesKey(species, value) {
  const normalizedSpecies = normalizeBoundaryKey(species);
  const normalizedValue = normalizeBoundaryKey(value);
  if (!normalizedSpecies || !normalizedValue) return '';
  return `${normalizedSpecies}|${normalizedValue}`;
}
export function indexConservationPermitAreas(list) {
  conservationPermitAreas = Array.isArray(list) ? list : [];
  conservationPermitAreaCodeSet.clear();
  conservationPermitAreaSpeciesUnitNameSet.clear();
  conservationPermitAreaSpeciesUnitCodeSet.clear();
  conservationPermitAreaAllowedTypeMap.clear();

  conservationPermitAreas.forEach(entry => {
    const species = safe(entry?.species).trim();
    const allowedRawTypes = new Set((Array.isArray(entry?.allowedRawHuntTypes) ? entry.allowedRawHuntTypes : []).map(v => safe(v).trim().toLowerCase()).filter(Boolean));
    (Array.isArray(entry?.huntCodes) ? entry.huntCodes : []).forEach(code => {
      const normalizedCode = normalizeHuntCode(code);
      if (!normalizedCode) return;
      conservationPermitAreaCodeSet.add(normalizedCode);
      if (allowedRawTypes.size) conservationPermitAreaAllowedTypeMap.set(`code|${normalizedCode}`, allowedRawTypes);
    });
    (Array.isArray(entry?.unitNames) ? entry.unitNames : []).forEach(name => {
      const key = buildConservationSpeciesKey(species, name);
      if (!key) return;
      conservationPermitAreaSpeciesUnitNameSet.add(key);
      if (allowedRawTypes.size) conservationPermitAreaAllowedTypeMap.set(`name|${key}`, allowedRawTypes);
    });
    (Array.isArray(entry?.unitCodes) ? entry.unitCodes : []).forEach(code => {
      const key = buildConservationSpeciesKey(species, code);
      if (!key) return;
      conservationPermitAreaSpeciesUnitCodeSet.add(key);
      if (allowedRawTypes.size) conservationPermitAreaAllowedTypeMap.set(`codekey|${key}`, allowedRawTypes);
    });
  });
}
export function isConservationPermitHunt(h) {
  return !!h?.syntheticConservationPermit;
}
export function getHuntType(h) {
  if (h?.syntheticConservationPermit) return 'Conservation';
  const raw = firstNonEmpty(h.huntType, h.HuntType, h.type);
  return normalizeHuntTypeLabel(raw);
}
export function normalizeHuntCategoryLabel(raw) {
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
export function getHuntCategory(h) {
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
export function buildSyntheticConservationPermitHunts(records) {
  void records;
  if (!Array.isArray(conservationPermitHuntTable) || !conservationPermitHuntTable.length) return [];

  return conservationPermitHuntTable.map((row, index) => {
    const boundaryIds = [...new Set((Array.isArray(row?.boundaryIds) ? row.boundaryIds : []).map(id => safe(id).trim()).filter(Boolean))];
    const boundaryNames = [...new Set((Array.isArray(row?.unitNames) ? row.unitNames : [row?.area]).map(v => safe(v).trim()).filter(Boolean))];
    const species = firstNonEmpty(row?.species);
    const area = firstNonEmpty(row?.area, boundaryNames[0], row?.matchedRegisterLabel);
    const unitCode = firstNonEmpty(row?.unitCode, normalizeBoundaryKey(area), `conservation-permit-${index + 1}`);
    const huntCode = firstNonEmpty(row?.huntCode, `CP-${normalizeBoundaryKey(species)}-${normalizeBoundaryKey(area)}`).toUpperCase();

    return {
      syntheticConservationPermit: true,
      huntCode,
      species,
      sex: firstNonEmpty(row?.sex),
      huntType: 'Conservation',
      huntCategory: firstNonEmpty(row?.huntClass, 'Conservation'),
      weapon: firstNonEmpty(row?.weapon, row?.condition),
      unitCode,
      unitName: area,
      boundaryId: boundaryIds.length === 1 ? boundaryIds[0] : '',
      boundaryIds,
      officialBoundaryIds: boundaryIds,
      officialBoundaryNames: boundaryNames,
      boundaryNames,
      seasonLabel: 'Conservation Permit Area',
      dates: 'See official conservation permit details',
      title: firstNonEmpty(row?.matchedRegisterLabel, area, `${species} Conservation Permit`),
      source: 'UOGA conservation permit hunt table',
      sourceHuntCodes: Array.isArray(row?.sourceHuntCodes) ? row.sourceHuntCodes.slice() : [],
      permitCount: row?.permitCount,
      organizations: Array.isArray(row?.organizations) ? row.organizations.slice() : [],
      averageValue: row?.averageValue
    };
  }).filter(row => Array.isArray(row.boundaryIds) && row.boundaryIds.length);
}
export function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates); }
export function getBoundaryLink(h) { return firstNonEmpty(h.boundaryLink, h.boundaryURL, h.huntBoundaryLink); }
export function getSpeciesHeadingLabel(species) {
  if (species === 'Rocky Mountain Bighorn Sheep') return 'R.M. Bighorn Sheep';
  if (species === 'Desert Bighorn Sheep') return 'Desert Bighorn Sheep';
  return species;
}
export function getPermitTotal(hunt) {
  const values = [
    hunt.permitsTotal, hunt.permitTotal, hunt.totalPermits, hunt.quota,
    hunt.residentPermits, hunt.nonresidentPermits, hunt.resident, hunt.nonresident
  ].map(v => Number(v)).filter(v => Number.isFinite(v) && v >= 0);
  if (!values.length) return null;
  if (values.length >= 2 && values[0] !== values[1]) return values[0] + values[1];
  return values[0];
}
export function getPanelHeading(hunt) {
  const species = getSpeciesDisplay(hunt) || 'Hunt';
  const speciesHeading = getSpeciesHeadingLabel(species);
  const sex = getNormalizedSex(hunt) || '';
  const huntType = getHuntType(hunt) || '';
  const huntClass = getHuntCategory(hunt) || '';
  const combined = `${huntType} ${huntClass}`.toLowerCase();
  const permitTotal = getPermitTotal(hunt);

  const prefixParts = [];
  const isOil = combined.includes('once-in-a-lifetime');
  const isPremium = combined.includes('premium');
  if (isOil) prefixParts.push('O.I.L.');
  else if (isPremium || combined.includes('limited')) prefixParts.push('L.E.');
  else if (combined.includes('general')) prefixParts.push('G.S.');

  let classLabel = '';
  if (combined.includes('mature bull')) classLabel = 'Mature Bull';
  else if (combined.includes('mature buck')) classLabel = 'Mature Buck';
  else if (combined.includes('general bull')) classLabel = 'General Bull';
  else if (combined.includes('general buck')) classLabel = 'General Buck';
  else if (combined.includes('spike')) classLabel = 'Spike Only';
  else if (combined.includes('antlerless')) classLabel = 'Antlerless';
  else if (sex === 'Bull' && prefixParts.includes('L.E.')) classLabel = 'Mature Bull';
  else if (sex === 'Buck' && prefixParts.includes('L.E.')) classLabel = 'Mature Buck';
  else if (sex === 'Bull' && prefixParts.includes('G.S.')) classLabel = 'General Bull';
  else if (sex === 'Buck' && prefixParts.includes('G.S.')) classLabel = 'General Buck';
  else if (sex && sex !== 'All') classLabel = sex;

  const parts = [];
  if (prefixParts.length) parts.push(prefixParts.join(' '));
  const isTrophyOilSpecies = isOil && ['Rocky Mountain Bighorn Sheep', 'Desert Bighorn Sheep', 'Moose', 'Mountain Goat', 'Bison'].includes(species);
  const isPremiumDeerTrophy = isPremium && species === 'Deer';
  const isLowPermitElkTrophy = species === 'Elk' && prefixParts.includes('L.E.') && permitTotal !== null && permitTotal < 20;
  const isTrophy = isTrophyOilSpecies || isPremiumDeerTrophy || isLowPermitElkTrophy;

  if (isTrophy) {
    parts.push('Trophy');
    if (species === 'Elk' || species === 'Deer') {
      if (classLabel && !/^antlerless$/i.test(classLabel)) parts.push(classLabel);
      parts.push(speciesHeading);
    } else {
      parts.push(speciesHeading);
    }
  } else {
    if (classLabel) parts.push(classLabel);
    parts.push(speciesHeading);
  }
  return parts.join(' ');
}
export function normalizeBoundaryKey(value) {
  return safe(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
