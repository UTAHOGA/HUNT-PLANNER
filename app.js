const {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_BASELINE_DEFAULT_CENTER,
  GOOGLE_BASELINE_DEFAULT_ZOOM,
  UTAH_LOCATION_BOUNDS,
  CLOUDFLARE_BASE,
  HUNT_DATA_VERSION,
  OUTFITTERS_DATA_VERSION,
  OUTFITTER_COVERAGE_VERSION,
  HUNT_BOUNDARY_SOURCES,
  OUTFITTERS_DATA_SOURCES,
  OUTFITTER_FEDERAL_COVERAGE_SOURCES,
  CONSERVATION_PERMIT_AREA_SOURCES,
  CONSERVATION_PERMIT_HUNT_TABLE_SOURCES,
  LOGO_DNR,
  LOGO_DWR_SELECTOR,
  LOGO_DNR_ROOMY,
  LOGO_CWMU,
  LOGO_DWR_WMA,
  LOGO_USFS,
  LOGO_BLM,
  LOGO_SITLA,
  LOGO_STATE_PARKS,
  LOCAL_CWMU_BOUNDARIES_PATH,
  CWMU_BOUNDARY_IDS_PATH,
  PUBLIC_OWNERSHIP_LAYER_URL,
  BLM_SURFACE_OWNERSHIP_LAYER_URL,
  BLM_ADMIN_LAYER_URL,
  BLM_ADMIN_QUERY_URL,
  CWMU_QUERY_URL,
  STATE_PARKS_QUERY_URL,
  WMA_QUERY_URL,
  WILDERNESS_QUERY_URL,
  UTAH_OUTLINE_QUERY_URL,
  USFS_QUERY_URL,
  WATERFOWL_WMA_NAMES,
  HUNT_DATA_SOURCES,
  ELK_BOUNDARY_TABLE_SOURCES,
  OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
  SPIKE_ELK_HUNT_CODES,
  HUNT_BOUNDARY_NAME_OVERRIDES,
  huntPlannerMapStyle,
  HUNT_TYPE_ORDER,
  HUNT_CLASS_ORDER,
  SEX_ORDER,
  WEAPON_ORDER,
  DNR_ORANGE,
  DNR_BROWN,
  KNOWN_OUTFITTER_COORDS
} = window.UOGA_CONFIG;

const {
  fetchJson,
  fetchGeoJson,
  fetchFirstGeoJson,
  fetchArcGisPagedGeoJson,
  loadOfficialBoundaryLookup: loadOfficialBoundaryLookupFromData,
  applyOfficialBoundaryMappings: applyOfficialBoundaryMappingsFromData,
  loadOfficialElkBoundaryFeatures: loadOfficialElkBoundaryFeaturesFromData,
  loadDerivedSpikeElkRecords: loadDerivedSpikeElkRecordsFromData,
  loadHuntDataRecords,
  loadFirstNormalizedList
} = window.UOGA_DATA;

let googleBaselineMap = null, cesiumViewer = null, huntUnitsLayer = null, cesiumHuntDataSource = null, cesiumUtahOutlineDataSource = null, googleApiReady = false, huntHoverFeature = null, selectedBoundaryFeature = null, huntData = [], huntBoundaryGeoJson = null, selectedBoundaryMatches = [], selectedHunt = null, selectionInfoWindow = null, usfsLayer = null, blmLayer = null, blmDetailLayer = null, wildernessLayer = null, utahOutlineLayer = null, sitlaLayer = null, stateLandsLayer = null, stateParksLayer = null, wmaLayer = null, cwmuLayer = null, privateLayer = null, outfitters = [], outfitterFederalCoverage = [], outfitterMarkers = [], activeLoads = 0, currentGlobeBasemap = 'esriImagery', outfitterMarkerRunId = 0, suppressLandClickUntil = 0;
let googleMapsLoadTimeoutId = null;
let conservationPermitAreas = [];
let conservationPermitHuntTable = [];
const conservationPermitAreaCodeSet = new Set();
const conservationPermitAreaSpeciesUnitNameSet = new Set();
const conservationPermitAreaSpeciesUnitCodeSet = new Set();
const conservationPermitAreaAllowedTypeMap = new Map();
const outfitterGeocodeCache = new Map();
const outfitterMarkerIndex = new Map();
const blmOwnershipPointCache = new Map();
const blmDistrictPointCache = new Map();
const outfitterFederalCoverageIndex = new Map();

const searchInput = document.getElementById('searchInput'),
  speciesFilter = document.getElementById('speciesFilter'),
  sexFilter = document.getElementById('sexFilter'),
  huntTypeFilter = document.getElementById('huntTypeFilter'),
  weaponFilter = document.getElementById('weaponFilter'),
  huntCategoryFilter = document.getElementById('huntCategoryFilter'),
  unitFilter = document.getElementById('unitFilter'),
  mapTypeSelect = document.getElementById('mapTypeSelect'),
  globeBasemapSelect = document.getElementById('globeBasemapSelect'),
  globeBasemapGrid = document.getElementById('globeBasemapGrid'),
  streetViewBtn = document.getElementById('streetViewBtn'),
  resetViewBtn = document.getElementById('resetViewBtn'),
  applyFiltersBtn = document.getElementById('applyFiltersBtn'),
  clearFiltersBtn = document.getElementById('clearFiltersBtn'),
  statusEl = document.getElementById('status'),
  toggleDwrUnits = document.getElementById('toggleDwrUnits'),
  toggleUSFS = document.getElementById('toggleUSFS'),
  toggleBLM = document.getElementById('toggleBLM'),
  toggleBLMDetail = document.getElementById('toggleBLMDetail'),
  federalLayersSummary = document.getElementById('federalLayersSummary'),
  toggleSITLA = document.getElementById('toggleSITLA'),
  toggleStateParks = document.getElementById('toggleStateParks'),
  toggleWma = document.getElementById('toggleWma'),
  toggleCwmu = document.getElementById('toggleCwmu'),
  togglePrivate = document.getElementById('togglePrivate'),
  stateLayersSummary = document.getElementById('stateLayersSummary'),
  privateLayersSummary = document.getElementById('privateLayersSummary'),
  mapChooser = document.getElementById('mapChooser'),
  mapChooserTitle = document.getElementById('mapChooserTitle'),
  mapChooserKicker = document.getElementById('mapChooserKicker'),
  mapChooserBody = document.getElementById('mapChooserBody'),
  selectedHuntFloat = document.getElementById('selectedHuntFloat');

// --- UTILITIES ---
function escapeHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safe(v) { return String(v ?? ''); }
function firstNonEmpty(...a) { for (let x of a) { let t = safe(x).trim(); if (t) return t; } return ''; }
  function titleCaseWords(v) { return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
  function normalizeVisibleVerificationLabel(v) { return safe(v).replace(/\bVetted\b/g, 'Verified'); }
function assetUrl(path) {
  try {
    return new URL(path, window.location.href).href;
  } catch {
    return path;
  }
}
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
}

function openHuntResearch(huntCode, residency = 'Resident', points = 12) {
  const code = String(huntCode || '').trim().toUpperCase();
  const normalizedResidency = String(residency || '').trim().toLowerCase().replace(/[\s_-]+/g, '') === 'nonresident'
    ? 'Nonresident'
    : 'Resident';

  localStorage.setItem('selected_hunt_code', code);
  localStorage.setItem('selected_hunt_research_residency', normalizedResidency);
  localStorage.setItem('selected_hunt_research_points', String(points));

  window.location.href = `./hunt-research.html?hunt_code=${encodeURIComponent(code)}`;
}

// --- DATA NORMALIZATION ---
function normalizeSpeciesLabel(value) {
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

let officialBoundaryLookupPromise = null;
async function loadOfficialBoundaryLookup() {
  if (!officialBoundaryLookupPromise) {
    officialBoundaryLookupPromise = loadOfficialBoundaryLookupFromData({
      OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
      normalizeHuntCode,
      safe
    });
  }
  return officialBoundaryLookupPromise;
}

async function applyOfficialBoundaryMappings(records) {
  return applyOfficialBoundaryMappingsFromData(records, {
    OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
    normalizeHuntCode,
    getHuntCode,
    getBoundaryId,
    safe
  });
}
function getRequiredUsfsForestsForHunt(hunt) {
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
function getSelectedHuntKey() {
  return selectedHunt ? getHuntRecordKey(selectedHunt) : '';
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
function buildConservationSpeciesKey(species, value) {
  const normalizedSpecies = normalizeBoundaryKey(species);
  const normalizedValue = normalizeBoundaryKey(value);
  if (!normalizedSpecies || !normalizedValue) return '';
  return `${normalizedSpecies}|${normalizedValue}`;
}
function indexConservationPermitAreas(list) {
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
async function loadConservationPermitAreas() {
  try {
    const list = await loadFirstNormalizedList(
      CONSERVATION_PERMIT_AREA_SOURCES,
      json => Array.isArray(json) ? json : [],
      []
    );
    indexConservationPermitAreas(list);
  } catch (error) {
    console.error('Conservation permit area load failed; continuing without conservation register.', error);
    indexConservationPermitAreas([]);
  }
}
async function loadConservationPermitHuntTable() {
  try {
    conservationPermitHuntTable = await loadFirstNormalizedList(
      CONSERVATION_PERMIT_HUNT_TABLE_SOURCES,
      json => Array.isArray(json) ? json : [],
      []
    );
  } catch (error) {
    console.error('Conservation permit hunt table load failed; continuing without synthetic conservation hunts.', error);
    conservationPermitHuntTable = [];
  }
}
function isConservationPermitHunt(h) {
  return !!h?.syntheticConservationPermit;
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
function buildSyntheticConservationPermitHunts(records) {
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
function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates); }
function getBoundaryLink(h) { return firstNonEmpty(h.boundaryLink, h.boundaryURL, h.huntBoundaryLink); }
function getSpeciesHeadingLabel(species) {
  if (species === 'Rocky Mountain Bighorn Sheep') return 'R.M. Bighorn Sheep';
  if (species === 'Desert Bighorn Sheep') return 'Desert Bighorn Sheep';
  return species;
}
function getPermitTotal(hunt) {
  const values = [
    hunt.permitsTotal, hunt.permitTotal, hunt.totalPermits, hunt.quota,
    hunt.residentPermits, hunt.nonresidentPermits, hunt.resident, hunt.nonresident
  ].map(v => Number(v)).filter(v => Number.isFinite(v) && v >= 0);
  if (!values.length) return null;
  if (values.length >= 2 && values[0] !== values[1]) return values[0] + values[1];
  return values[0];
}
function getPanelHeading(hunt) {
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
function normalizeBoundaryKey(value) {
  return safe(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function hasActiveMatrixSelections() {
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
  return !!safe(unitFilter?.value).trim();
}

// --- FILTERING ENGINE ---
function getFilteredHunts(excludeKey = '') {
  const search = safe(searchInput?.value).trim().toLowerCase();
  const species = safe(speciesFilter?.value || 'All Species');
  const sex = safe(sexFilter?.value || 'All');
  const huntType = safe(huntTypeFilter?.value || 'All');
  const weapon = safe(weaponFilter?.value || 'All');
  const huntCategory = safe(huntCategoryFilter?.value || 'All');
  const unit = safe(unitFilter?.value || '');

  return huntData.filter(h => {
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
  if (!hasActiveMatrixSelections() && !selectedHunt) return [];
  return getFilteredHunts();
}
function shouldShowHuntBoundaries() {
  return hasActiveMatrixSelections() || !!selectedHunt || !!toggleDwrUnits?.checked;
}
function shouldShowAllHuntUnits() {
  return !!toggleDwrUnits?.checked && !hasActiveMatrixSelections() && !selectedHunt;
}
function normalizeListValues(values) {
  if (Array.isArray(values)) return values.map(v => safe(v).trim()).filter(Boolean);
  const one = safe(values).trim();
  return one ? [one] : [];
}
function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const lowered = safe(value).trim().toLowerCase();
  return lowered === 'true' || lowered === 'yes' || lowered === '1';
}
function choosePrimaryListValue(primaryValue, values) {
  const list = normalizeListValues(values);
  const primary = safe(primaryValue).trim();
  if (primary && primary.length > 3) return primary;
  return list[0] || primary;
}
function normalizeOutfitterRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const isNested = !!(record.contact || record.branding || record.serviceArea || record.headquarters);
  if (!isNested) {
    return {
      ...record,
      listingName: firstNonEmpty(record.listingName, record.displayName, record.businessName, record.Outfitter),
      logoUrl: firstNonEmpty(record.logoUrl, record.logo, record.logoURL),
      website: firstNonEmpty(record.website, record.url),
      phone: normalizeListValues(record.phone),
      speciesServed: normalizeListValues(record.speciesServed),
      unitsServed: normalizeListValues(record.unitsServed),
      address: firstNonEmpty(record.address, record.hometown),
      city: firstNonEmpty(record.city),
      region: firstNonEmpty(record.region, record.state)
    };
  }

  const contact = record.contact || {};
  const branding = record.branding || {};
  const headquarters = record.headquarters || {};
  const serviceArea = record.serviceArea || {};
  const services = record.services || {};

  return {
    ...record,
    listingName: firstNonEmpty(record.displayName, record.legalBusinessName, record.businessName, record.Outfitter),
    businessName: firstNonEmpty(record.displayName, record.legalBusinessName, record.businessName),
    logoUrl: firstNonEmpty(branding.logoUrl, branding.cardImageUrl, branding.heroImageUrl),
    website: firstNonEmpty(contact.website, contact.facebookUrl, contact.instagramUrl, contact.instagramHandle),
    phone: normalizeListValues(contact.phoneNumbers?.length ? contact.phoneNumbers : contact.phonePrimary),
    email: normalizeListValues(contact.emailAddresses?.length ? contact.emailAddresses : contact.emailPrimary),
    phonePrimary: choosePrimaryListValue(contact.phonePrimary, contact.phoneNumbers),
    emailPrimary: choosePrimaryListValue(contact.emailPrimary, contact.emailAddresses),
    ownerNames: normalizeListValues(contact.ownerNames?.length ? contact.ownerNames : contact.primaryName),
    address: firstNonEmpty(headquarters.mailingAddress, headquarters.publicMeetingLocation),
    hometown: firstNonEmpty(headquarters.publicMeetingLocation, headquarters.city),
    city: firstNonEmpty(headquarters.city),
    region: firstNonEmpty(headquarters.region, headquarters.state),
    state: firstNonEmpty(headquarters.state),
    latitude: Number.isFinite(Number(headquarters.latitude)) ? Number(headquarters.latitude) : null,
    longitude: Number.isFinite(Number(headquarters.longitude)) ? Number(headquarters.longitude) : null,
    speciesServed: normalizeListValues(serviceArea.speciesServed),
    unitsServed: normalizeListValues(serviceArea.unitsServed),
    usfsForests: normalizeListValues(serviceArea.usfsForests),
    usfsForestIds: normalizeListValues(serviceArea.usfsForestIds),
    usfsDistrictIds: normalizeListValues(serviceArea.usfsDistrictIds),
    blmDistricts: normalizeListValues(serviceArea.blmDistricts),
    blmDistrictIds: normalizeListValues(serviceArea.blmDistrictIds),
    zoneTags: normalizeListValues(serviceArea.zoneTags),
    countiesServed: normalizeListValues(serviceArea.countiesServed),
    wmasServed: normalizeListValues(serviceArea.wmasServed),
    stateParks: normalizeListValues(serviceArea.stateParks),
    sitla: normalizeListValues(serviceArea.sitla),
    statewide: normalizeBoolean(serviceArea.statewide),
    guidedHunts: normalizeBoolean(services.guidedHunts),
    diySupport: normalizeBoolean(services.diySupport),
    trespassAccess: normalizeBoolean(services.trespassAccess),
    lodgingIncluded: normalizeBoolean(services.lodgingIncluded),
    mealsIncluded: normalizeBoolean(services.mealsIncluded),
    packTrips: normalizeBoolean(services.packTrips),
    youthHunts: normalizeBoolean(services.youthHunts),
    archery: normalizeBoolean(services.archery),
    muzzleloader: normalizeBoolean(services.muzzleloader),
    socialUrls: [
      firstNonEmpty(contact.facebookUrl),
      firstNonEmpty(contact.instagramUrl, contact.instagramHandle),
      firstNonEmpty(contact.youtubeUrl)
    ].filter(Boolean)
  };
}
function normalizeOutfitterList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeOutfitterRecord).filter(Boolean);
}
function getOutfitterCoverageKey(species, unitCode) {
  return `${normalizeBoundaryKey(species)}|${normalizeBoundaryKey(unitCode)}`;
}
function normalizeOutfitterCoverageList(list) {
  return (Array.isArray(list) ? list : []).map(row => {
    const species = firstNonEmpty(row.Species, row.species);
    const unitCode = firstNonEmpty(row.UnitCode, row.unitCode);
    const unitName = firstNonEmpty(row.UnitName, row.unitName);
    return {
      species,
      unitCode,
      unitName,
      primaryUsfsForestName: firstNonEmpty(row.PrimaryUsfsForestName, row.primaryUsfsForestName),
      primaryBlmDistrictName: firstNonEmpty(row.PrimaryBlmDistrictName, row.primaryBlmDistrictName),
      usfsAuthoritySource: firstNonEmpty(row.UsfsAuthoritySource, row.usfsAuthoritySource),
      blmAuthoritySource: firstNonEmpty(row.BlmAuthoritySource, row.blmAuthoritySource),
      usfsPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.UsfsPermitMatchedOutfitters, row.usfsPermitMatchedOutfitters)),
      blmPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.BlmPermitMatchedOutfitters, row.blmPermitMatchedOutfitters)),
      federalPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.FederalPermitMatchedOutfitters, row.federalPermitMatchedOutfitters)),
      federalCoverageEligible: firstNonEmpty(row.FederalCoverageEligible, row.federalCoverageEligible),
      notes: firstNonEmpty(row.Notes, row.notes)
    };
  }).filter(row => row.species && row.unitCode);
}
function indexOutfitterFederalCoverage(list) {
  outfitterFederalCoverageIndex.clear();
  outfitterFederalCoverage = normalizeOutfitterCoverageList(list);
  outfitterFederalCoverage.forEach(row => {
    outfitterFederalCoverageIndex.set(getOutfitterCoverageKey(row.species, row.unitCode), row);
  });
}
function getFederalCoverageForHunt(hunt) {
  if (!hunt) return null;
  return outfitterFederalCoverageIndex.get(getOutfitterCoverageKey(getSpeciesDisplay(hunt), getUnitCode(hunt))) || null;
}
function deterministicHash(input) {
  const text = safe(input);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function getOutfitterLocalityScore(outfitter, hunt, requiredUsfsForests = []) {
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const city = normalizeBoundaryKey(outfitter.city);
  const hometown = normalizeBoundaryKey(outfitter.hometown);
  const region = normalizeBoundaryKey(outfitter.region);
  const usfsForestIds = normalizeListValues(outfitter.usfsForestIds).map(normalizeBoundaryKey);
  let score = 0;

  [city, hometown, region].filter(Boolean).forEach(place => {
    if (!place) return;
    if (unitName && (unitName.includes(place) || place.includes(unitName))) score += 8;
    if (unitCode && (unitCode.includes(place) || place.includes(unitCode))) score += 5;
  });

  if ((city === 'manti' || hometown === 'manti' || region === 'manti')
    && requiredUsfsForests.includes('manti-la-sal')) {
    score += 6;
  }
  if (requiredUsfsForests.some(required => usfsForestIds.includes(required))) {
    score += 2;
  }
  return score;
}
function orderOutfitterMatchesForDisplay(hunt, matches, requiredUsfsForests = []) {
  const huntSeed = `${normalizeBoundaryKey(getSpeciesDisplay(hunt))}|${normalizeBoundaryKey(getUnitCode(hunt))}|${normalizeBoundaryKey(getUnitName(hunt))}`;
  return [...matches].sort((a, b) => {
    const aLocal = getOutfitterLocalityScore(a, hunt, requiredUsfsForests);
    const bLocal = getOutfitterLocalityScore(b, hunt, requiredUsfsForests);
    if (bLocal !== aLocal) return bLocal - aLocal;
    const aReasons = normalizeListValues(a.matchReasons).length;
    const bReasons = normalizeListValues(b.matchReasons).length;
    if (bReasons !== aReasons) return bReasons - aReasons;
    const aRand = deterministicHash(`${huntSeed}|${safe(a.id || a.slug || a.listingName)}`);
    const bRand = deterministicHash(`${huntSeed}|${safe(b.id || b.slug || b.listingName)}`);
    return aRand - bRand;
  });
}
function noteOutfitterInteraction() {
  suppressLandClickUntil = Date.now() + 800;
}
function shouldSuppressLandClick() {
  return Date.now() < suppressLandClickUntil;
}
function slugText(value) {
  return safe(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function getOwnershipName(props) {
  return firstNonEmpty(
    props.label_state,
    props.LABEL_STATE,
    props.ut_lgd,
    props.UT_LGD,
    props.desig,
    props.DESIG,
    props.admin,
    props.ADMIN,
    props.owner,
    props.OWNER
  );
}
function getOwnershipCounty(props) {
  return firstNonEmpty(props.county, props.COUNTY, props.co_name, props.CO_NAME);
}
function getOwnershipAcres(props) {
  return firstNonEmpty(props.gis_acres, props.GIS_ACRES, props.acres, props.ACRES);
}
function getOwnershipBucket(props) {
  const haystack = slugText([
    props.owner, props.OWNER, props.admin, props.ADMIN, props.desig, props.DESIG,
    props.label_state, props.LABEL_STATE, props.ut_lgd, props.UT_LGD
  ].filter(Boolean).join(' '));

  if (haystack.includes('state park')) return 'stateParks';
  if (haystack.includes('wildlife management area') || haystack.includes('waterfowl management area') || haystack.includes(' wma')) return 'wma';
  if (haystack.includes('trust') || haystack.includes('sitla') || haystack.includes('school and institutional trust lands')) return 'sitla';
  if (haystack.includes('private')) return 'private';
  if (haystack.includes('state')) return 'stateLands';
  return '';
}
function getOwnershipSubtitle(bucket, props) {
  if (bucket === 'sitla') return 'SITLA';
  if (bucket === 'stateParks') return 'State Parks';
  if (bucket === 'private') return 'Private Land';
  if (bucket === 'wma') {
    return "UT. DWR W.M.A.'s";
  }
  return '';
}
function getOwnershipTitle(bucket, props) {
  const base = getOwnershipName(props);
  if (bucket === 'sitla') {
    return base && !/utah state trust lands/i.test(base)
      ? base
      : firstNonEmpty(getOwnershipCounty(props) && `${getOwnershipCounty(props)} County SITLA`, 'Utah State Trust Lands');
  }
  if (bucket === 'stateParks') return firstNonEmpty(base, 'Utah State Park');
  if (bucket === 'stateLands') return firstNonEmpty(base, getOwnershipCounty(props) && `${getOwnershipCounty(props)} County State Lands`, 'Utah State Lands');
  if (bucket === 'private') return firstNonEmpty(base, getOwnershipCounty(props) && `${getOwnershipCounty(props)} County Private Land`, 'Private Land');
  if (bucket === 'wma') return firstNonEmpty(base, 'Wildlife Management Area');
  return firstNonEmpty(base, 'Land Ownership');
}
function buildOwnershipDetails(bucket, props) {
  const county = getOwnershipCounty(props);
  const acres = getOwnershipAcres(props);
  const detailBits = [];
  let noticeText = '';
  if (county) detailBits.push(`${county} County`);
  if (acres) detailBits.push(`${acres} acres`);
  if (bucket === 'wma') {
    noticeText = "Utah DWR W.M.A.'s do not imply outfitter approval, endorsement, or exclusive access.";
  }
  const detailText = detailBits.join(' | ');
  let logo = '';
  if (bucket === 'sitla') logo = LOGO_SITLA;
  if (bucket === 'stateParks') logo = LOGO_STATE_PARKS;
  if (bucket === 'wma') logo = LOGO_DWR_WMA;
  return {
    logo,
    logoSize: logo ? 68 : undefined,
    title: getOwnershipTitle(bucket, props),
    subtitle: getOwnershipSubtitle(bucket, props),
    detailText,
    noticeText
  };
}
function setLayerVisibility(layer, visible) {
  if (!layer) return;
  layer.setMap(visible ? googleBaselineMap : null);
}
function shouldShowWildernessOverlay() {
  return !!(toggleUSFS?.checked || toggleBLM?.checked);
}
function shouldShowWildernessFeature(featureOrAgency) {
  const agency = typeof featureOrAgency === 'string'
    ? safe(featureOrAgency).toUpperCase()
    : safe(featureOrAgency?.getProperty?.('Agency')).toUpperCase();
  if (agency === 'FS') return !!toggleUSFS?.checked;
  if (agency === 'BLM') return !!toggleBLM?.checked;
  return false;
}
function shouldDeprioritizeFederalClicks() {
  return false;
}
function updateWildernessOverlayVisibility() {
  setLayerVisibility(wildernessLayer, shouldShowWildernessOverlay());
}
function updateStatus(message) {
  if (statusEl) statusEl.textContent = message;
}
function resetAllFilters() {
  if (searchInput) searchInput.value = '';
  if (speciesFilter) speciesFilter.value = 'All Species';
  if (sexFilter) sexFilter.value = 'All';
  if (huntTypeFilter) huntTypeFilter.value = 'All';
  if (weaponFilter) weaponFilter.value = 'All';
  if (huntCategoryFilter) huntCategoryFilter.value = 'All';
  if (unitFilter) unitFilter.value = '';
  selectedHunt = null;
  selectedBoundaryFeature = null;
  closeSelectedHuntPopup();
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  refreshSelectionMatrix();
  styleBoundaryLayer();
  renderMatchingHunts();
  renderSelectedHunt();
  updateStatus('Filters cleared. Select a species or click a hunt unit.');
}

function handleFilterChange(event) {
  selectedHunt = null;
  selectedBoundaryFeature = null;
  closeSelectedHuntPopup();
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  const changedId = safe(event?.target?.id);
  if (changedId === 'speciesFilter') {
    if (sexFilter) sexFilter.value = 'All';
    if (huntTypeFilter) huntTypeFilter.value = 'All';
    if (weaponFilter) weaponFilter.value = 'All';
    if (huntCategoryFilter) huntCategoryFilter.value = 'All';
    if (unitFilter) unitFilter.value = '';
  }
  if (['sexFilter', 'huntTypeFilter', 'weaponFilter', 'huntCategoryFilter'].includes(changedId)) {
    if (unitFilter) unitFilter.value = '';
  }
  if (toggleDwrUnits && hasActiveMatrixSelections()) {
    toggleDwrUnits.checked = true;
  }
  refreshSelectionMatrix();
  styleBoundaryLayer();
  renderMatchingHunts();
  renderSelectedHunt();
  renderOutfitters();
}

function refreshSelectionMatrix() {
  if (!speciesFilter || !sexFilter || !huntTypeFilter || !weaponFilter || !huntCategoryFilter || !unitFilter) return;

  const speciesOptions = sortWithPreferredOrder(
    Array.from(new Set(huntData.map(getSpeciesDisplay).filter(Boolean))),
    ['Deer', 'Elk', 'Pronghorn', 'Moose', 'Bison', 'Black Bear', 'Cougar', 'Turkey', 'Desert Bighorn Sheep', 'Rocky Mountain Bighorn Sheep', 'Mountain Goat']
  );
  const previousSpecies = speciesFilter.value || 'All Species';
  speciesFilter.innerHTML = `<option value="All Species">All Species</option>` + speciesOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  speciesFilter.value = speciesOptions.includes(previousSpecies) ? previousSpecies : 'All Species';

  const sexData = getFilteredHunts('sex');
  const sexOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...sexData.map(getNormalizedSex).filter(Boolean)])), ['All', ...SEX_ORDER]);
  const prevSex = sexFilter.value || 'All';
  sexFilter.innerHTML = sexOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  sexFilter.value = sexOptions.includes(prevSex) ? prevSex : 'All';

  const huntTypeData = getFilteredHunts('huntType');
  const huntTypeOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...huntTypeData.map(getHuntType).filter(Boolean)])), ['All', ...HUNT_TYPE_ORDER]);
  const prevHuntType = huntTypeFilter.value || 'All';
  huntTypeFilter.innerHTML = huntTypeOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  huntTypeFilter.value = huntTypeOptions.includes(prevHuntType) ? prevHuntType : 'All';

  const categoryData = getFilteredHunts('huntCategory');
  const categoryOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...categoryData.map(getHuntCategory).filter(Boolean)])), ['All', ...HUNT_CLASS_ORDER]);
  const prevHuntCategory = huntCategoryFilter.value || 'All';
  huntCategoryFilter.innerHTML = categoryOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  huntCategoryFilter.value = categoryOptions.includes(prevHuntCategory) ? prevHuntCategory : 'All';

  const weaponData = getFilteredHunts('weapon');
  const weaponOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...weaponData.map(getWeapon).filter(Boolean)])), ['All', ...WEAPON_ORDER]);
  const prevWeapon = weaponFilter.value || 'All';
  weaponFilter.innerHTML = weaponOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  weaponFilter.value = weaponOptions.includes(prevWeapon) ? prevWeapon : 'All';

  const hasNonUnitSelections = [
    safe(searchInput?.value).trim(),
    speciesFilter.value !== 'All Species' ? speciesFilter.value : '',
    sexFilter.value !== 'All' ? sexFilter.value : '',
    huntTypeFilter.value !== 'All' ? huntTypeFilter.value : '',
    huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : '',
    weaponFilter.value !== 'All' ? weaponFilter.value : ''
  ].filter(Boolean).length > 0;

  const unitsMap = new Map();
  const unitSource = hasNonUnitSelections ? getFilteredHunts('unit') : huntData;
  unitSource.forEach(h => {
    const unitValue = getUnitValue(h);
    if (unitValue) unitsMap.set(unitValue, getUnitName(h) || unitValue);
  });
  const unitOptions = Array.from(unitsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const prevUnit = unitFilter.value || '';
  unitFilter.innerHTML = `<option value="">All DWR Hunt Units</option>` + unitOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  unitFilter.value = unitOptions.some(([v]) => v === prevUnit) ? prevUnit : '';
}

// --- CORE APP LOGIC ---
async function loadHuntData() {
  huntData = await loadHuntDataRecords({
    HUNT_DATA_SOURCES,
    ELK_BOUNDARY_TABLE_SOURCES,
    OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
    SPIKE_ELK_HUNT_CODES,
    getHuntRecordKey,
    getHuntCode,
    getBoundaryId,
    getSpeciesDisplay,
    getNormalizedSex,
    getUnitName,
    normalizeHuntCode,
    normalizeBoundaryKey,
    firstNonEmpty,
    safe,
    updateStatus
  });
  const syntheticConservationHunts = buildSyntheticConservationPermitHunts(huntData);
  huntData = [...huntData, ...syntheticConservationHunts];
  refreshSelectionMatrix();
  updateStatus(`Loaded ${huntData.length} hunts.`);
}

async function loadOfficialElkBoundaryFeatures() {
  return loadOfficialElkBoundaryFeaturesFromData({ ELK_BOUNDARY_TABLE_SOURCES });
}

async function loadDerivedSpikeElkRecords(existingRecords) {
  return loadDerivedSpikeElkRecordsFromData(existingRecords, {
    ELK_BOUNDARY_TABLE_SOURCES,
    SPIKE_ELK_HUNT_CODES,
    normalizeHuntCode,
    getHuntCode,
    getBoundaryId,
    getSpeciesDisplay,
    getNormalizedSex,
    getUnitName,
    normalizeBoundaryKey,
    firstNonEmpty,
    safe
  });
}

function buildMatchingHuntCard(h, selectedKey) {
  const selected = selectedKey && selectedKey === getHuntRecordKey(h);
  const huntKey = escapeHtml(getHuntRecordKey(h));
  const name = escapeHtml(firstNonEmpty(h.hunt_name, getHuntTitle(h), getUnitName(h), ''));
  const code = escapeHtml(getHuntCode(h) || '');
  const codeAttr = escapeHtml(getHuntCode(h) || '');
  return `
    <div class="hunt-card${selected ? ' is-selected' : ''}" data-hunt-key="${huntKey}" role="button" tabindex="0">
      <div class="hunt-card-head">
        <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR" class="hunt-card-logo">
        <div>
          <div class="hunt-card-code">${code}</div>
          <div class="hunt-card-title">${name}</div>
        </div>
      </div>
      <div class="hunt-card-actions">
        <button type="button" class="secondary hunt-research-ring" data-hunt-research-code="${codeAttr}">
          Hunt Research
        </button>
      </div>
    </div>`;
}

function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;
  const list = getDisplayHunts();
  const selectedKey = getSelectedHuntKey();
  updateStatus(
    !hasActiveMatrixSelections() && !selectedHunt
      ? 'Select filters or click a hunt unit to begin.'
      : `${list.length} matching hunt${list.length === 1 ? '' : 's'}`
  );
  container.innerHTML = list.length
    ? list.map(h => buildMatchingHuntCard(h, selectedKey)).join('')
    : '<div class="empty-note">Use the matrix or click a hunt unit to load matching hunts.</div>';
}

function closeSelectionInfoWindow() {
  if (selectionInfoWindow) {
    selectionInfoWindow.close();
    selectionInfoWindow = null;
  }
}

function closeSelectedHuntFloat(zoomToUnit = false) {
  if (!selectedHuntFloat) return;
  selectedHuntFloat.classList.remove('is-open');
  selectedHuntFloat.setAttribute('aria-hidden', 'true');
  selectedHuntFloat.innerHTML = '';
  if (zoomToUnit && selectedHunt && safe(mapTypeSelect?.value).toLowerCase() !== 'globe') {
    zoomToSelectedBoundary();
  }
}
function getSelectedUnitGroups() {
  const groups = new Map();
  getDisplayHunts().forEach(hunt => {
    const key = firstNonEmpty(getBoundaryId(hunt), getUnitValue(hunt), getUnitName(hunt), getHuntCode(hunt));
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        unitValue: getUnitValue(hunt),
        unitName: getUnitName(hunt) || getHuntTitle(hunt),
        hunts: []
      });
    }
    groups.get(key).hunts.push(hunt);
  });
  return Array.from(groups.values()).sort((a, b) => safe(a.unitName).localeCompare(safe(b.unitName)));
}
function openSelectedUnitsChooser() {
  if (!mapChooser || !mapChooserBody || !mapChooserTitle || !mapChooserKicker) return;
  const groups = getSelectedUnitGroups();
  if (groups.length <= 1) {
    closeSelectedHuntPopup();
    return;
  }
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  selectedBoundaryMatches = [];
  mapChooserKicker.textContent = 'Selected Units';
  mapChooserTitle.textContent = `${groups.length} Units Selected`;
  mapChooserBody.innerHTML = groups.map(group => `
    <div class="map-chooser-card" data-selected-unit="${escapeHtml(group.unitValue || group.key)}" role="button" tabindex="0">
      <div class="hunt-card-title">${escapeHtml(group.unitName)}</div>
      <div class="map-chooser-meta">${group.hunts.length} matching hunt${group.hunts.length === 1 ? '' : 's'}</div>
      <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(group.hunts[0]))} | ${escapeHtml(getHuntType(group.hunts[0]))}</div>
    </div>
  `).join('');
  mapChooser.classList.add('is-open');
  mapChooser.setAttribute('aria-hidden', 'false');
  mapChooserBody.querySelectorAll('[data-selected-unit]').forEach(card => {
    const select = () => {
      const unitValue = safe(card.getAttribute('data-selected-unit'));
      if (unitFilter) unitFilter.value = unitValue;
      refreshSelectionMatrix();
      styleBoundaryLayer();
      renderMatchingHunts();
      renderSelectedHunt();
      renderOutfitters();
      const hunts = getDisplayHunts().filter(h => getUnitValue(h) === unitValue);
      const unitTitle = firstNonEmpty(hunts[0] && getUnitName(hunts[0]), unitValue);
      showHuntMatchesChooser(unitTitle, hunts, 'Available Hunts');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
}

function openSelectedHuntFloat() {
  if (!selectedHuntFloat || !selectedHunt) {
    closeSelectedHuntFloat();
    return;
  }

  const code = escapeHtml(getHuntCode(selectedHunt) || '');
  const name = escapeHtml(firstNonEmpty(selectedHunt.hunt_name, getUnitName(selectedHunt), getHuntTitle(selectedHunt), 'Selected Hunt'));
  const species = escapeHtml(getSpeciesDisplay(selectedHunt) || 'Not loaded');
  const weapon = escapeHtml(getWeapon(selectedHunt) || 'Not loaded');
  const huntType = escapeHtml(getHuntType(selectedHunt) || 'Not loaded');
  const dates = escapeHtml(getDates(selectedHunt) || 'See official hunt details');

  selectedHuntFloat.innerHTML = `
    <section class="selected-unit-placard">
      <div class="selected-unit-placard-head">
        <div>
          <p class="selected-unit-placard-kicker">Selected Unit</p>
          <h3 class="selected-unit-placard-title">${code || 'Selected Hunt'}</h3>
        </div>
        <button type="button" class="selected-unit-placard-close" data-close-selected-hunt-float aria-label="Close selected hunt">X</button>
      </div>
      <div class="selected-unit-placard-body">
        <div class="selected-unit-placard-top">
          <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR logo" class="selected-unit-placard-logo">
          <div>
            <div class="selected-unit-placard-code">Utah DWR hunt</div>
            <div class="selected-unit-placard-name">${name}</div>
            <p class="selected-unit-placard-sub">${species} · ${weapon} · ${huntType}</p>
          </div>
        </div>
        <div class="selected-unit-placard-grid">
          <div class="selected-unit-placard-pill">
            <span class="selected-unit-placard-pill-label">Unit</span>
            <span class="selected-unit-placard-pill-value">${escapeHtml(getUnitName(selectedHunt) || getHuntTitle(selectedHunt) || 'Not loaded')}</span>
          </div>
          <div class="selected-unit-placard-pill">
            <span class="selected-unit-placard-pill-label">Dates</span>
            <span class="selected-unit-placard-pill-value">${dates}</span>
          </div>
        </div>
        <div class="selected-unit-placard-actions">
          <button type="button" class="secondary hunt-research-ring" data-inline-hunt-research>
            Hunt Research
          </button>
        </div>
        <div class="selected-unit-placard-note">Built to stay just off the left rail so the map area still breathes.</div>
      </div>
    </section>`;
  selectedHuntFloat.classList.add('is-open');
  selectedHuntFloat.setAttribute('aria-hidden', 'false');
  selectedHuntFloat.querySelector('[data-close-selected-hunt-float]')?.addEventListener('click', () => closeSelectedHuntFloat());
  selectedHuntFloat.querySelector('[data-inline-hunt-research]')?.addEventListener('click', () => {
    openHuntResearch(getHuntCode(selectedHunt));
  });
}

function buildLandInfoCard({ logo, title, subtitle, detailText = '', noticeText = '', detailsLinkText = '', detailsLink = '', logoSize = 46, cardMinWidth = 270, cardMaxWidth = 320 }) {
  const resolvedLogo = logo ? assetUrl(logo) : '';
  return `
    <div style="display:grid;gap:8px;min-width:${Number(cardMinWidth) || 270}px;max-width:${Number(cardMaxWidth) || 320}px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${resolvedLogo ? `<img src="${resolvedLogo}" alt="${escapeHtml(subtitle)} logo" style="width:${Number(logoSize) || 46}px;height:${Number(logoSize) || 46}px;object-fit:contain;display:block;flex:0 0 auto;">` : ''}
        <div>
          <div style="font-size:15px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:${DNR_ORANGE};line-height:1.05;">${escapeHtml(subtitle)}</div>
          <div style="font-size:15px;font-weight:900;color:#2b1c12;">${escapeHtml(title)}</div>
        </div>
      </div>
      ${detailText ? `<div style="font-size:12px;line-height:1.35;color:#6b5646;">${escapeHtml(detailText)}</div>` : ''}
      ${noticeText ? `<div style="font-size:12px;line-height:1.4;color:#7b3f1d;font-weight:700;background:#fff4ea;border:1px solid #edc39f;border-radius:10px;padding:8px 10px;">${escapeHtml(noticeText)}</div>` : ''}
      ${detailsLink ? `<a href="${escapeHtml(detailsLink)}" target="_blank" rel="noopener noreferrer" style="color:#2f7fd1;font-weight:800;text-decoration:none;">${escapeHtml(detailsLinkText || 'Open details')}</a>` : ''}
    </div>`;
}

function openLandInfoWindow(card, position) {
  closeSelectedHuntFloat();
  closeSelectedHuntPopup();
  closeSelectionInfoWindow();
  selectionInfoWindow = new google.maps.InfoWindow({
    content: card,
    position,
    pixelOffset: new google.maps.Size(0, -12),
    maxWidth: 340
  });
  selectionInfoWindow.open(googleBaselineMap);
}
function openInlineHuntDetails(hunt) {
  const section = document.getElementById('huntDetailsSection');
  const frame = document.getElementById('huntDetailsFrame');
  const title = document.getElementById('huntDetailsTitle');
  const meta = document.getElementById('huntDetailsMeta');
  const fallback = document.getElementById('huntDetailsFallbackLink');
  const link = getBoundaryLink(hunt);
  if (!section || !frame || !link || !hunt) return;
  if (title) title.textContent = `${getHuntCode(hunt)} | ${getUnitName(hunt) || getHuntTitle(hunt)}`;
  if (meta) meta.textContent = `${getSpeciesDisplay(hunt)} | ${getNormalizedSex(hunt)} | ${getHuntType(hunt)} | ${getWeapon(hunt)}`;
  if (fallback) fallback.href = link;
  frame.src = link;
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateStatus('Official Utah DWR hunt details loaded below the map.');
}
function closeInlineHuntDetails() {
  const section = document.getElementById('huntDetailsSection');
  const frame = document.getElementById('huntDetailsFrame');
  if (!section || !frame) return;
  section.hidden = true;
  frame.src = 'about:blank';
}

function createGlobeImageryProvider(key) {
  if (typeof Cesium === 'undefined') return null;
  const providers = {
    osm: () => new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
    osmHot: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c']
    }),
    openTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
      credit: 'OpenTopoMap'
    }),
    cartoLight: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd']
    }),
    cartoDark: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd']
    }),
    esriImagery: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    }),
    esriTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    esriStreet: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    esriNatGeo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    usgsImagery: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
    }),
    usgsTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
    })
  };
  return providers[key]?.() || providers.osm();
}

function getGlobeBasemapLabel(key) {
  const labels = {
    osm: 'OpenStreetMap',
    osmHot: 'OSM Humanitarian',
    openTopo: 'OpenTopoMap',
    cartoLight: 'Carto Light',
    cartoDark: 'Carto Dark',
    esriImagery: 'Esri World Imagery',
    esriTopo: 'Esri World Topo',
    esriStreet: 'Esri World Street',
    esriNatGeo: 'Esri NatGeo',
    usgsImagery: 'USGS Imagery',
    usgsTopo: 'USGS Topo'
  };
  return labels[key] || key;
}

function syncGlobeBasemapButtons() {
  if (!globeBasemapGrid) return;
  globeBasemapGrid.querySelectorAll('[data-globe-basemap]').forEach(btn => {
    const isActive = btn.getAttribute('data-globe-basemap') === currentGlobeBasemap;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function applyGlobeBasemap(key = currentGlobeBasemap) {
  if (!cesiumViewer || typeof Cesium === 'undefined') return;
  const imageryProvider = createGlobeImageryProvider(key);
  if (!imageryProvider) return;
  currentGlobeBasemap = key;
  cesiumViewer.imageryLayers.removeAll();
  cesiumViewer.imageryLayers.addImageryProvider(imageryProvider);
  cesiumViewer.scene.requestRender();
  if (globeBasemapSelect) {
    globeBasemapSelect.value = currentGlobeBasemap;
  }
  syncGlobeBasemapButtons();
  const container = document.getElementById('globeMap');
  if (container) {
    container.style.background = currentGlobeBasemap === 'cartoDark' ? '#10141d' : '#d7e7f5';
  }
}

async function ensureCesiumHuntBoundaries() {
  if (!cesiumViewer || typeof Cesium === 'undefined' || !huntBoundaryGeoJson) return;
  if (cesiumHuntDataSource) return cesiumHuntDataSource;
  cesiumHuntDataSource = await Cesium.GeoJsonDataSource.load(huntBoundaryGeoJson, {
    clampToGround: true
  });
  cesiumViewer.dataSources.add(cesiumHuntDataSource);
  if (cesiumHuntDataSource?.entities?.values) {
    cesiumHuntDataSource.entities.values.forEach(entity => {
      if (entity.polygon) {
        entity.polygon.fill = true;
        entity.polygon.outline = false;
        entity.polygon.material = Cesium.Color.fromCssColorString('#3653b3').withAlpha(0.18);
      }
      if (entity.polyline) {
        entity.polyline.show = false;
      }
      entity.show = false;
    });
  }
  updateCesiumBoundaryStyles();
  return cesiumHuntDataSource;
}

async function ensureCesiumUtahOutline() {
  if (!cesiumViewer || typeof Cesium === 'undefined') return null;
  if (cesiumUtahOutlineDataSource) return cesiumUtahOutlineDataSource;
  const geojson = await fetchGeoJson(UTAH_OUTLINE_QUERY_URL);
  cesiumUtahOutlineDataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    clampToGround: true,
    stroke: Cesium.Color.fromCssColorString('#c84f00'),
    strokeWidth: 8,
    fill: Cesium.Color.fromCssColorString('#c84f00').withAlpha(0.0)
  });
  cesiumViewer.dataSources.add(cesiumUtahOutlineDataSource);
  if (cesiumUtahOutlineDataSource?.entities?.values) {
    cesiumUtahOutlineDataSource.entities.values.forEach(entity => {
      entity.show = true;
      if (entity.polygon) {
        entity.polygon.fill = false;
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#c84f00');
        entity.polygon.outlineWidth = 8;
      }
      if (entity.polyline) {
        entity.polyline.show = true;
        entity.polyline.width = 8;
        entity.polyline.material = new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#c84f00'),
          outlineColor: Cesium.Color.fromCssColorString('#6e2a00'),
          outlineWidth: 2
        });
        entity.polyline.clampToGround = true;
      }
    });
  }
  cesiumViewer?.scene?.requestRender?.();
  return cesiumUtahOutlineDataSource;
}

function getCesiumEntityOutlinePositions(entity) {
  if (!entity?.polygon?.hierarchy || typeof Cesium === 'undefined') return null;
  try {
    const hierarchyValue = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
    const positions = hierarchyValue?.positions;
    if (!Array.isArray(positions) || positions.length < 2) return null;
    const closed = positions.slice();
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (!Cesium.Cartesian3.equals(first, last)) closed.push(first);
    return closed;
  } catch (error) {
    console.error('Cesium outline extraction failed', error);
    return null;
  }
}

function getCesiumEntityMatches(entity) {
  const properties = entity?.properties;
  const boundaryId = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
  const boundaryName = normalizeBoundaryKey(
    properties?.Boundary_Name?.getValue?.()
    ?? properties?.BOUNDARY_NAME?.getValue?.()
    ?? properties?.BoundaryName?.getValue?.()
  );
  const displaySource = getDisplayHunts();
  const source = (hasActiveMatrixSelections() || selectedHunt) ? displaySource : huntData;
  return source.filter(h => {
    const hBoundaryId = safe(getBoundaryId(h));
    const hUnitCode = normalizeBoundaryKey(getUnitCode(h));
    const hUnitName = normalizeBoundaryKey(getUnitName(h));
    return hBoundaryId === boundaryId || hUnitCode === boundaryName || hUnitName === boundaryName;
  });
}

function focusCesiumBoundaryEntity(entity) {
  if (!cesiumViewer || !entity || typeof Cesium === 'undefined') return;
  cesiumViewer.flyTo(entity, {
    offset: new Cesium.HeadingPitchRange(0, -0.8, 180000)
  }).catch?.(() => {});
}

function updateCesiumBoundaryStyles() {
  if (!cesiumHuntDataSource?.entities?.values || typeof Cesium === 'undefined') return;
  const showBoundaries = shouldShowHuntBoundaries();
  const showAllUnits = shouldShowAllHuntUnits();
  const filtered = getDisplayHunts();
  const matcher = buildBoundaryMatcher(filtered);
  const selectedMatcher = selectedHunt ? buildBoundaryMatcher([selectedHunt]) : null;
  cesiumHuntDataSource.entities.values.forEach(entity => {
    const properties = entity.properties;
    const id = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
    const name = normalizeBoundaryKey(
      properties?.Boundary_Name?.getValue?.()
      ?? properties?.BOUNDARY_NAME?.getValue?.()
      ?? properties?.BoundaryName?.getValue?.()
    );
    const isMatch = showAllUnits || matcher.matches(id, name);
    const isSelected = !!selectedMatcher && selectedMatcher.matches(id, name);
    const visible = showBoundaries && isMatch;
    entity.show = visible;
    const fillColor = Cesium.Color.fromCssColorString(isSelected ? '#ff8a3d' : '#3653b3').withAlpha(isSelected ? 0.0 : 0.32);
    if (entity.polygon) {
      entity.polygon.material = fillColor;
      entity.polygon.outline = false;
    }
    const outlinePositions = isSelected ? getCesiumEntityOutlinePositions(entity) : null;
    if (outlinePositions?.length >= 2) {
      entity.polyline = new Cesium.PolylineGraphics({
        positions: outlinePositions,
        width: 9,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#c84f00'),
          outlineColor: Cesium.Color.fromCssColorString('#6e2a00'),
          outlineWidth: 2
        }),
        clampToGround: true
      });
    } else if (entity.polyline) {
      entity.polyline = isSelected
        ? entity.polyline
        : undefined;
    }
    if (entity.polyline) {
      entity.polyline.show = visible && isSelected;
    }
  });
  cesiumViewer?.scene?.requestRender?.();
}
function buildDnrPlate(hunt, compact = false, roomy = false) {
  const plateUrl = assetUrl(roomy ? LOGO_DNR_ROOMY : LOGO_DNR);
  const code = escapeHtml(getHuntCode(hunt) || '');
  const unit = escapeHtml(getUnitName(hunt) || getHuntTitle(hunt));
  const species = escapeHtml(getSpeciesDisplay(hunt) || 'N/A');
  const sex = escapeHtml(getNormalizedSex(hunt) || 'N/A');
  const huntType = escapeHtml(getHuntType(hunt) || 'N/A');
  const weapon = escapeHtml(getWeapon(hunt) || 'N/A');
  const dates = escapeHtml(getDates(hunt) || 'See official hunt details');
  const heading = escapeHtml(getPanelHeading(hunt));
  const boundaryLink = getBoundaryLink(hunt);
  const panelWidth = roomy ? 760 : (compact ? 480 : 560);
  const panelHeight = roomy ? 420 : (compact ? 184 : 214);
  const wrapperWidth = compact ? `width:${panelWidth}px;max-width:${panelWidth}px;` : `width:${panelWidth}px;max-width:100%;`;
  const titleSize = roomy ? '24px' : (compact ? '21px' : '23px');
  const metaSize = roomy ? '15px' : (compact ? '14px' : '15px');
  const infoTop = roomy ? '108px' : (compact ? '15px' : '17px');
  const infoLeft = roomy ? '37%' : (compact ? '38%' : '37%');
  const infoRight = roomy ? '30px' : '18px';
  const infoBottom = roomy ? '28px' : '16px';
  const infoGap = roomy ? '10px' : (compact ? '7px' : '9px');
  const detailGap = roomy ? '6px' : (compact ? '4px' : '6px');
  const unitSize = roomy ? '18px' : (compact ? '18px' : '19px');
  const linkSize = roomy ? '16px' : metaSize;

  if (roomy) {
    return `
      <div style="position:relative;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;border:1px solid ${DNR_ORANGE};border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(58,37,18,0.18);">
        <img src="${plateUrl}" alt="Utah DNR hunt information plate" style="display:block;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;object-fit:contain;border:0;">
        <div style="position:absolute;left:52px;top:322px;width:220px;display:grid;gap:1px;color:#2b1c12;">
          <div style="font-size:42px;font-weight:900;line-height:0.98;color:${DNR_BROWN};">${code}</div>
        </div>
        <div style="position:absolute;top:140px;left:37%;right:34px;bottom:28px;display:grid;align-content:start;gap:10px;color:#2b1c12;">
          <div style="display:grid;gap:4px;justify-items:center;text-align:center;">
            <div style="font-size:28px;font-weight:900;letter-spacing:.01em;text-transform:uppercase;color:${DNR_ORANGE};line-height:1.02;">${heading}</div>
            <div style="font-size:32px;font-weight:900;line-height:1.02;">${unit}</div>
          </div>
          <div style="display:grid;gap:6px;font-size:18px;line-height:1.28;">
            <div><strong>Species:</strong> ${species}</div>
            <div><strong>Sex:</strong> ${sex}</div>
            <div><strong>Hunt Type:</strong> ${huntType}</div>
            <div><strong>Weapon:</strong> ${weapon}</div>
            <div><strong>Dates:</strong> ${dates}</div>
          </div>
          ${boundaryLink ? `<button type="button" data-inline-hunt-details style="margin-top:4px;padding:0;border:0;background:transparent;color:#2f7fd1;font-size:18px;font-weight:800;text-decoration:none;text-align:left;cursor:pointer;">Official Utah DWR Hunt Details</button>` : ''}
        </div>
      </div>`;
  }

  return `
    <div style="position:relative;${wrapperWidth}height:${panelHeight}px;border:1px solid ${DNR_ORANGE};border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(58,37,18,0.18);">
      <img src="${plateUrl}" alt="Utah DNR hunt information plate" style="display:block;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;object-fit:fill;border:0;">
      <div style="position:absolute;top:${infoTop};left:${infoLeft};right:${infoRight};bottom:${infoBottom};display:grid;align-content:start;gap:${infoGap};color:#2b1c12;">
        <div style="display:grid;gap:3px;">
          <div style="font-size:${roomy ? '12px' : '13px'};font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">${heading}</div>
          <div style="font-size:${titleSize};font-weight:900;line-height:1.05;">${code}</div>
          <div style="font-size:${unitSize};font-weight:800;line-height:1.12;">${unit}</div>
        </div>
        <div style="display:grid;gap:${detailGap};font-size:${metaSize};line-height:1.28;">
          <div><strong>Species:</strong> ${species}</div>
          <div><strong>Sex:</strong> ${sex}</div>
          <div><strong>Hunt Type:</strong> ${huntType}</div>
          <div><strong>Weapon:</strong> ${weapon}</div>
          <div><strong>Dates:</strong> ${dates}</div>
        </div>
        ${boundaryLink ? `<button type="button" data-inline-hunt-details style="margin-top:2px;padding:0;border:0;background:transparent;color:#2f7fd1;font-size:${linkSize};font-weight:800;text-decoration:none;text-align:left;cursor:pointer;">Official Utah DWR Hunt Details</button>` : ''}
      </div>
    </div>`;
}

window.selectHuntByKey = (key) => {
  const h = huntData.find(x => getHuntRecordKey(x) === key);
  if (h) { 
    selectedHunt = h; 
    renderSelectedHunt(); 
    renderOutfitters();
    closeSelectedHuntPopup();
    renderMatchingHunts();
    styleBoundaryLayer(); 
    zoomToSelectedBoundary(); 
  }
};
window.selectHuntByCode = (code) => {
  const want = safe(code).trim().toUpperCase();
  if (!want) return;
  const h = huntData.find(x => safe(getHuntCode(x)).trim().toUpperCase() === want);
  if (h) window.selectHuntByKey(getHuntRecordKey(h));
};

function renderSelectedHunt() {
  const panel = document.getElementById('selectedHuntPanel');
  const hunt = selectedHunt;

  if (!panel) return;

  if (!hunt) {
    panel.innerHTML = '<div class="empty-note">Select a hunt to see draw odds, trends, and outfitter matches.</div>';
    closeSelectedHuntFloat();
    return;
  }

  const name = escapeHtml(firstNonEmpty(hunt.hunt_name, getUnitName(hunt), getHuntTitle(hunt), 'Unknown Hunt'));
  const code = escapeHtml(getHuntCode(hunt) || '');
  const species = escapeHtml(getSpeciesDisplay(hunt) || '');
  const weapon = escapeHtml(getWeapon(hunt) || '');
  const huntType = escapeHtml(getHuntType(hunt) || '');

  window.UOGA_UI?.recordRecentHunt?.({
    hunt_code: getHuntCode(hunt),
    hunt_name: firstNonEmpty(hunt.hunt_name, getUnitName(hunt), getHuntTitle(hunt), 'Unknown Hunt'),
    unit: getUnitName(hunt),
    species: getSpeciesDisplay(hunt),
    weapon: getWeapon(hunt),
    updated_at: Date.now()
  });

  panel.innerHTML = `
    <div class="selected-hunt-card">
      <div style="display:grid; gap:10px;">
        <div><strong>${name}</strong></div>
        <div><strong>Hunt Code:</strong> ${code}</div>
        <div><strong>Species:</strong> ${species}</div>
        <div><strong>Weapon:</strong> ${weapon}</div>
        <div><strong>Hunt Type:</strong> ${huntType}</div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button
            type="button"
            class="secondary hunt-research-ring"
            id="selectedHuntResearchBtn">
            Open Hunt Research
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('selectedHuntResearchBtn')?.addEventListener('click', () => {
    openHuntResearch(getHuntCode(hunt));
  });

  openSelectedHuntFloat();
}

function getMatchingOutfittersForHunt(hunt) {
  if (!hunt || !outfitters.length) return [];
  const publishedCoverage = getFederalCoverageForHunt(hunt);
  const species = normalizeBoundaryKey(getSpeciesDisplay(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const requiredUsfsForests = getRequiredUsfsForestsForHunt(hunt);
  const evaluated = outfitters.map(o => {
    const speciesServed = normalizeListValues(o.speciesServed).map(normalizeBoundaryKey);
    const unitsServed = normalizeListValues(o.unitsServed).map(normalizeBoundaryKey);
    const usfsForests = normalizeListValues(o.usfsForests).map(normalizeBoundaryKey);
    const usfsForestIds = normalizeListValues(o.usfsForestIds).map(normalizeBoundaryKey);
    const speciesMatch = !speciesServed.length || speciesServed.includes(species);
    const unitMatch = !unitsServed.length
      || unitsServed.includes(unitCode)
      || unitsServed.includes(unitName)
      || unitsServed.some(u => unitName.includes(u) || u.includes(unitName) || unitCode.includes(u));
    const forestMatch = !requiredUsfsForests.length
      || requiredUsfsForests.some(required => usfsForestIds.includes(required) || usfsForests.includes(required));
    const confidence = [
      speciesMatch ? 1 : 0,
      unitMatch ? 1 : 0,
      forestMatch ? 2 : 0,
      usfsForestIds.length ? 1 : 0
    ].reduce((sum, value) => sum + value, 0);
    const matchReasons = [];
    if (forestMatch && requiredUsfsForests.length) {
      const forestLabel = requiredUsfsForests[0]
        .split('-')
        .map(part => titleCaseWords(part))
        .join('-');
      matchReasons.push(`${forestLabel} Permit Match`);
    }
    if (unitMatch && unitsServed.length) matchReasons.push('Unit Match');
    if (speciesMatch && speciesServed.length) matchReasons.push('Species Match');
    if (o.guidedHunts) matchReasons.push('Guided Hunts');
    return { outfitter: o, speciesMatch, unitMatch, forestMatch, confidence, matchReasons };
  });

  const strongMatches = evaluated
    .filter(row => row.speciesMatch && row.unitMatch && row.forestMatch)
    .sort((a, b) => b.confidence - a.confidence || a.outfitter.listingName.localeCompare(b.outfitter.listingName))
    .map(row => ({ ...row.outfitter, matchReasons: row.matchReasons }));

  const speciesOnlyMatches = evaluated
    .filter(row => row.speciesMatch && row.forestMatch)
    .sort((a, b) => b.confidence - a.confidence || a.outfitter.listingName.localeCompare(b.outfitter.listingName))
    .map(row => ({ ...row.outfitter, matchReasons: row.matchReasons }));

  const fallbackMatches = strongMatches.length ? strongMatches : speciesOnlyMatches;
  if (publishedCoverage && publishedCoverage.federalCoverageEligible !== 'No') {
    const publishedNames = normalizeListValues(
      publishedCoverage.federalPermitMatchedOutfitters?.length
        ? publishedCoverage.federalPermitMatchedOutfitters
        : publishedCoverage.usfsPermitMatchedOutfitters
    );
    if (publishedNames.length) {
      const lookup = new Map(outfitters.map(o => [safe(o.listingName).trim().toLowerCase(), o]));
      const publishedMatches = publishedNames
        .map(name => lookup.get(safe(name).trim().toLowerCase()))
        .filter(Boolean)
        .map(o => {
          const matchReasons = [];
          if (publishedCoverage.primaryUsfsForestName) {
            matchReasons.push(`${publishedCoverage.primaryUsfsForestName} Permit Match`);
          }
          if (publishedCoverage.primaryBlmDistrictName) {
            matchReasons.push(`${publishedCoverage.primaryBlmDistrictName} Permit Match`);
          }
          return { ...o, matchReasons: [...new Set(matchReasons)] };
        });
      const merged = [];
      const mergedIndex = new Map();
      const upsert = (candidate) => {
        const key = safe(firstNonEmpty(candidate.id, candidate.slug, candidate.listingName)).trim().toLowerCase();
        if (!key) return;
        const existing = mergedIndex.get(key);
        if (!existing) {
          const normalized = {
            ...candidate,
            matchReasons: [...new Set(normalizeListValues(candidate.matchReasons))]
          };
          mergedIndex.set(key, normalized);
          merged.push(normalized);
          return;
        }
        existing.matchReasons = [...new Set([
          ...normalizeListValues(existing.matchReasons),
          ...normalizeListValues(candidate.matchReasons)
        ])];
      };
      publishedMatches.forEach(upsert);
      fallbackMatches.forEach(upsert);
      if (merged.length) return orderOutfitterMatchesForDisplay(hunt, merged, requiredUsfsForests);
    }
  }
  return orderOutfitterMatchesForDisplay(hunt, fallbackMatches, requiredUsfsForests);
}

function renderOutfitters() {
  const container = document.getElementById('outfitterResults');
  if (!container) return;
  if (!selectedHunt) {
    container.innerHTML = '<div class="empty-note">Select a hunt to load matching verified outfitters.</div>';
    clearOutfitterMarkers();
    return;
  }
  const matches = getMatchingOutfittersForHunt(selectedHunt);
  if (!matches.length) {
    container.innerHTML = '<div class="empty-note">No verified outfitters matched this hunt yet.</div>';
    clearOutfitterMarkers();
    return;
  }
  container.innerHTML = matches.map(o => {
    const website = safe(o.website).trim();
    const phone = getOutfitterPrimaryPhone(o);
    const email = getOutfitterPrimaryEmail(o);
    const logo = safe(o.logoUrl).trim();
    const location = getOutfitterLocationText(o);
    const tags = [...normalizeListValues(o.matchReasons), ...getOutfitterSummaryTags(o)].slice(0, 4);
    return `
      <div class="outfitter-card" data-outfitter-id="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}" role="button" tabindex="0" title="Zoom to ${escapeHtml(o.listingName || 'outfitter')}">
        <div class="outfitter-card-header">
          ${logo ? `<img class="outfitter-card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(o.listingName || 'Outfitter logo')}">` : ''}
          <div class="outfitter-card-title-wrap">
            <div class="hunt-card-title">${escapeHtml(o.listingName || 'Outfitter')}</div>
            <div class="outfitter-card-subline">${escapeHtml(normalizeVisibleVerificationLabel(firstNonEmpty(o.verificationStatus, o.certLevel, o.listingType, 'Outfitter')))}</div>
          </div>
        </div>
        ${location ? `<div class="outfitter-card-subline">${escapeHtml(location)}</div>` : ''}
        ${tags.length ? `<div class="outfitter-card-meta-row">${tags.map(tag => `<span class="outfitter-card-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <div class="outfitter-card-actions">
          <button type="button" class="outfitter-action-btn primary" data-outfitter-focus="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}">Map Link</button>
          ${website ? `<a class="outfitter-action-btn" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
        </div>
        ${phone ? `<div class="hunt-card-meta">${escapeHtml(phone)}</div>` : ''}
        ${email ? `<div class="hunt-card-meta">${escapeHtml(email)}</div>` : ''}
      </div>`;
  }).join('');
  container.querySelectorAll('[data-outfitter-focus]').forEach(button => {
    const outfitterId = button.getAttribute('data-outfitter-focus');
    const outfitter = matches.find(item => firstNonEmpty(item.id, item.slug, item.listingName) === outfitterId);
    if (!outfitter) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      focusOutfitter(outfitter);
    });
  });
  container.querySelectorAll('[data-outfitter-id]').forEach(card => {
    const outfitterId = card.getAttribute('data-outfitter-id');
    const outfitter = matches.find(item => firstNonEmpty(item.id, item.slug, item.listingName) === outfitterId);
    if (!outfitter) return;
    const open = () => focusOutfitter(outfitter);
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
  updateOutfitterMarkers(matches);
}

function getOutfitterLocationText(outfitter) {
  const address = safe(outfitter.address).trim();
  const hometown = safe(outfitter.hometown).trim();
  const city = safe(outfitter.city).trim();
  const region = safe(outfitter.region).trim();
  const state = safe(outfitter.state).trim() || 'Utah';
  if (address) return address;
  if (hometown && city && hometown.toLowerCase() !== city.toLowerCase()) return `${hometown} | ${city}, ${state}`;
  if (hometown) return hometown;
  if (city) return `${city}, ${state}`;
  if (region) return region;
  return '';
}
function getOutfitterPrimaryPhone(outfitter) {
  return choosePrimaryListValue(outfitter.phonePrimary, outfitter.phone);
}
function getOutfitterPrimaryEmail(outfitter) {
  return choosePrimaryListValue(outfitter.emailPrimary, outfitter.email);
}
function getOutfitterSummaryTags(outfitter) {
  const tags = [];
  const listingType = normalizeVisibleVerificationLabel(firstNonEmpty(outfitter.verificationStatus, outfitter.certLevel, outfitter.listingType));
  if (listingType) tags.push(listingType);
  if (outfitter.guidedHunts) tags.push('Guided Hunts');
  if (outfitter.packTrips) tags.push('Pack Trips');
  if (outfitter.lodgingIncluded) tags.push('Lodging');
  if (outfitter.archery) tags.push('Archery');
  if (outfitter.muzzleloader) tags.push('Muzzleloader');
  return Array.from(new Set(tags));
}
function getKnownOutfitterCoords(outfitter) {
  const keys = [
    firstNonEmpty(outfitter?.id),
    firstNonEmpty(outfitter?.slug),
    safe(firstNonEmpty(outfitter?.listingName, outfitter?.displayName, outfitter?.businessName)).toLowerCase().trim()
  ].filter(Boolean);
  for (const key of keys) {
    const coords = KNOWN_OUTFITTER_COORDS.get(key);
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) return coords;
  }
  return null;
}
function isWithinUtahBounds(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= UTAH_LOCATION_BOUNDS.minLat
    && lat <= UTAH_LOCATION_BOUNDS.maxLat
    && lng >= UTAH_LOCATION_BOUNDS.minLng
    && lng <= UTAH_LOCATION_BOUNDS.maxLng;
}
function getLatLngLiteral(value) {
  if (!value) return null;
  if (typeof value.lat === 'function' && typeof value.lng === 'function') {
    return { lat: value.lat(), lng: value.lng() };
  }
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
}
function isUtahGeocodeResult(result) {
  const location = getLatLngLiteral(result?.geometry?.location);
  if (!location || !isWithinUtahBounds(location.lat, location.lng)) return false;
  const components = Array.isArray(result?.address_components) ? result.address_components : [];
  const stateComponent = components.find(component => Array.isArray(component.types) && component.types.includes('administrative_area_level_1'));
  if (!stateComponent) return true;
  const shortName = safe(stateComponent.short_name).toUpperCase();
  const longName = safe(stateComponent.long_name).toUpperCase();
  return shortName === 'UT' || longName === 'UTAH';
}
function formatUtahAddressPart(value) {
  return safe(value)
    .replace(/\bNorth\b/ig, 'N')
    .replace(/\bSouth\b/ig, 'S')
    .replace(/\bEast\b/ig, 'E')
    .replace(/\bWest\b/ig, 'W')
    .replace(/\bUtah\b/ig, 'UT')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
    .trim();
}
function cleanUtahAddress(rawAddress, city, state) {
  const raw = safe(rawAddress).trim();
  if (!raw) return '';
  const parts = raw.split(',').map(part => formatUtahAddressPart(part)).filter(Boolean);
  const cityText = formatUtahAddressPart(city);
  const stateText = formatUtahAddressPart(state) || 'UT';
  const zip = firstNonEmpty(raw.match(/\b\d{5}(?:-\d{4})?\b/)?.[0], '');
  const street = parts.find(part => /\d/.test(part) && /\b(?:N|S|E|W|HWY|HIGHWAY|RD|ROAD|ST|STREET|AVE|AVENUE|DR|DRIVE|LN|LANE|BLVD|WAY|CT|COURT|CIR|CIRCLE)\b/i.test(part))
    || parts.find(part => /\d/.test(part) && !/\b(?:UT|USA|UNITED STATES)\b/i.test(part))
    || '';
  const cityCandidate = cityText
    || parts.find(part => /^[A-Za-z .'-]+$/.test(part) && !/\b(?:UT|USA|UNITED STATES)\b/i.test(part) && !/\d/.test(part))
    || '';
  const normalizedState = stateText.toUpperCase() === 'UTAH' ? 'UT' : stateText.toUpperCase();
  const combined = [street, cityCandidate, normalizedState, zip].filter(Boolean).join(', ');
  return combined.length >= 8 ? combined : '';
}
function getOutfitterGeocodeQueries(outfitter) {
  const address = safe(outfitter.address).trim();
  const hometown = safe(outfitter.hometown).trim();
  const city = safe(outfitter.city).trim();
  const region = safe(outfitter.region).trim();
  const state = safe(outfitter.state).trim() || 'Utah';
  const cleanedAddress = cleanUtahAddress(address, city || hometown, state);
  const queries = [];
  const pushQuery = value => {
    const text = safe(value).trim();
    if (!text) return;
    if (/^utah$/i.test(text)) return;
    if (!queries.includes(text)) queries.push(text);
  };

  pushQuery(cleanedAddress);
  pushQuery(address);
  if (address && !/utah/i.test(address)) pushQuery(`${address}, ${state}`);
  if (cleanedAddress && !/\bUT\b/i.test(cleanedAddress) && !/utah/i.test(cleanedAddress)) pushQuery(`${cleanedAddress}, UT`);
  if (hometown && city && hometown.toLowerCase() !== city.toLowerCase()) pushQuery(`${hometown}, ${city}, ${state}`);
  pushQuery(hometown && !/utah/i.test(hometown) ? `${hometown}, ${state}` : hometown);
  pushQuery(city ? `${city}, ${state}` : '');
  pushQuery(region && !/utah/i.test(region) ? `${region}, ${state}` : region);
  return queries;
}

function buildOutfitterPopupCard(outfitter) {
  const logo = safe(outfitter.logoUrl).trim();
  const name = safe(outfitter.listingName).trim() || 'Outfitter';
  const website = safe(outfitter.website).trim();
  const phone = getOutfitterPrimaryPhone(outfitter);
  const email = getOutfitterPrimaryEmail(outfitter);
  const location = getOutfitterLocationText(outfitter);
  const tags = [...normalizeListValues(outfitter.matchReasons), ...getOutfitterSummaryTags(outfitter)].slice(0, 5);
  return `
    <div style="display:grid;gap:10px;min-width:280px;max-width:340px;">
      <div style="display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:12px;">
        ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)} logo" style="width:58px;height:58px;object-fit:cover;object-position:center;border-radius:12px;background:#fff;padding:3px;border:1px solid #d6c1ae;box-shadow:0 6px 14px rgba(0,0,0,.14);">` : ''}
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">Verified Outfitter</div>
          <div style="font-size:17px;font-weight:900;color:#2b1c12;line-height:1.15;">${escapeHtml(name)}</div>
        </div>
      </div>
      ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${tags.map(tag => `<span style="display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:rgba(214,106,31,.11);border:1px solid rgba(214,106,31,.2);font-size:12px;font-weight:800;color:#3b2417;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${location ? `<div style="font-size:13px;color:#6b5646;line-height:1.35;">${escapeHtml(location)}</div>` : ''}
      ${phone ? `<div style="font-size:13px;color:#6b5646;">${escapeHtml(phone)}</div>` : ''}
      ${email ? `<div style="font-size:13px;color:#6b5646;">${escapeHtml(email)}</div>` : ''}
      ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" style="color:#2f7fd1;font-weight:800;text-decoration:none;">Visit website</a>` : ''}
    </div>`;
}
function openOutfitterInfoWindow(outfitter, position) {
  noteOutfitterInteraction();
  closeSelectionInfoWindow();
  selectionInfoWindow = new google.maps.InfoWindow({
    content: buildOutfitterPopupCard(outfitter),
    position,
    pixelOffset: new google.maps.Size(0, -36)
  });
  selectionInfoWindow.open(googleBaselineMap);
}
function toLatLngLiteral(value) {
  if (!value) return null;
  if (typeof value.lat === 'function' && typeof value.lng === 'function') {
    return { lat: value.lat(), lng: value.lng() };
  }
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
}
function getDistanceMeters(a, b) {
  const p1 = toLatLngLiteral(a);
  const p2 = toLatLngLiteral(b);
  if (!p1 || !p2) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => deg * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}
function findNearbyOutfitterMarker(position, maxDistanceMeters = 120) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  outfitterMarkerIndex.forEach(({ position: markerPosition, outfitter }) => {
    const distance = getDistanceMeters(position, markerPosition);
    if (distance < nearestDistance && distance <= maxDistanceMeters) {
      nearest = { outfitter, position: markerPosition, distance };
      nearestDistance = distance;
    }
  });
  return nearest;
}
function resolveOutfitterPriorityClick(position) {
  const nearby = findNearbyOutfitterMarker(position);
  if (!nearby) return false;
  focusOutfitter(nearby.outfitter);
  return true;
}

function clearOutfitterMarkers() {
  outfitterMarkerRunId += 1;
  outfitterMarkers.forEach(marker => marker?.setMap?.(null));
  outfitterMarkers = [];
  outfitterMarkerIndex.clear();
}

function createOutfitterLogoMarker(position, outfitter) {
  const marker = new google.maps.OverlayView();
  marker.position = position;
  marker.outfitter = outfitter;
  marker.div = null;
  marker.onAdd = function() {
    const div = document.createElement('div');
    div.className = 'outfitter-logo-pin-shell';
    const initials = (safe(outfitter.listingName).trim().match(/[A-Z0-9]/ig) || ['O']).slice(0, 2).join('').toUpperCase();
    const logoMarkup = safe(outfitter.logoUrl).trim()
      ? `<img src="${escapeHtml(outfitter.logoUrl)}" alt="${escapeHtml(outfitter.listingName || 'Outfitter')}">`
      : `<span class="outfitter-logo-pin-fallback">${escapeHtml(initials)}</span>`;
    div.innerHTML = `
      <div class="outfitter-logo-pin-base"></div>
      <div class="outfitter-logo-pin-center">
        ${logoMarkup}
      </div>`;
    div.title = safe(outfitter.listingName).trim() || 'Outfitter';
    div.style.pointerEvents = 'auto';
    if (google.maps.OverlayView?.preventMapHitsAndGesturesFrom) {
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(div);
    }
    const openOutfitterInfo = (event) => {
      if (event) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
      openOutfitterInfoWindow(outfitter, position);
    };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(type => {
      div.addEventListener(type, event => {
        event.preventDefault?.();
        event.stopPropagation?.();
        noteOutfitterInteraction();
      }, { passive: false });
    });
    div.addEventListener('click', openOutfitterInfo, { passive: false });
    this.div = div;
    this.getPanes().overlayMouseTarget.appendChild(div);
  };
  marker.draw = function() {
    if (!this.div) return;
    const projection = this.getProjection();
    if (!projection) return;
    const point = projection.fromLatLngToDivPixel(position);
    if (!point) return;
    this.div.style.position = 'absolute';
    this.div.style.left = `${point.x - 27}px`;
    this.div.style.top = `${point.y - 82}px`;
  };
  marker.onRemove = function() {
    if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
    this.div = null;
  };
  return marker;
}

function geocodeOutfitter(outfitter) {
  const key = `${safe(outfitter.listingName)}|${getOutfitterLocationText(outfitter)}`;
  if (outfitterGeocodeCache.has(key)) {
    return Promise.resolve(outfitterGeocodeCache.get(key));
  }
  const knownCoords = getKnownOutfitterCoords(outfitter);
  if (knownCoords) {
    const knownLocation = new google.maps.LatLng(knownCoords.lat, knownCoords.lng);
    outfitterGeocodeCache.set(key, knownLocation);
    return Promise.resolve(knownLocation);
  }
  if (Number.isFinite(outfitter?.latitude) && Number.isFinite(outfitter?.longitude)) {
    if (isWithinUtahBounds(outfitter.latitude, outfitter.longitude)) {
      const directLocation = new google.maps.LatLng(outfitter.latitude, outfitter.longitude);
      outfitterGeocodeCache.set(key, directLocation);
      return Promise.resolve(directLocation);
    }
  }
  if (!google.maps?.Geocoder) return Promise.resolve(null);
  const queries = getOutfitterGeocodeQueries(outfitter);
  if (!queries.length) return Promise.resolve(null);
  const geocoder = new google.maps.Geocoder();
  return new Promise(async resolve => {
    for (const query of queries) {
      const loc = await new Promise(done => {
        geocoder.geocode({
          address: query,
          componentRestrictions: { country: 'US' }
        }, (results, status) => {
          const result = status === 'OK' && Array.isArray(results)
            ? results.find(entry => isUtahGeocodeResult(entry))
            : null;
          const location = result?.geometry?.location || null;
          done(location);
        });
      });
      if (loc) {
        outfitterGeocodeCache.set(key, loc);
        resolve(loc);
        return;
      }
    }
    outfitterGeocodeCache.set(key, null);
    resolve(null);
  });
}
async function focusOutfitter(outfitter) {
  if (!googleBaselineMap || !outfitter) return;
  const markerKey = firstNonEmpty(outfitter.id, outfitter.slug, outfitter.listingName);
  const indexed = outfitterMarkerIndex.get(markerKey);
  let location = indexed?.position || null;
  if (!location) {
    location = await geocodeOutfitter(outfitter);
  }
  if (!location) {
    updateStatus(`Couldn't place ${firstNonEmpty(outfitter.listingName, 'that outfitter')} on the map yet.`);
    return;
  }
  noteOutfitterInteraction();
  if (safe(mapTypeSelect?.value).toLowerCase() === 'globe') {
    mapTypeSelect.value = 'terrain';
    applyMapMode();
  }
  googleBaselineMap.panTo(location);
  if ((googleBaselineMap.getZoom?.() || 0) < 14) {
    googleBaselineMap.setZoom(14);
  }
  openOutfitterInfoWindow(outfitter, location);
  updateStatus(`${firstNonEmpty(outfitter.listingName, 'Outfitter')} focused on the map.`);
}

async function updateOutfitterMarkers(matches) {
  clearOutfitterMarkers();
  const runId = outfitterMarkerRunId;
  if (!googleBaselineMap || safe(mapTypeSelect?.value).toLowerCase() === 'globe') return;
  const unique = [];
  const seen = new Set();
  for (const outfitter of matches) {
    const name = safe(outfitter.listingName).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(outfitter);
  }
  for (const outfitter of unique) {
    try {
      const location = await geocodeOutfitter(outfitter);
      if (runId !== outfitterMarkerRunId) return;
      if (!location) continue;
      const marker = createOutfitterLogoMarker(location, outfitter);
      marker.setMap(googleBaselineMap);
      outfitterMarkers.push(marker);
      outfitterMarkerIndex.set(firstNonEmpty(outfitter.id, outfitter.slug, outfitter.listingName), { marker, position: location });
    } catch (error) {
      console.error('Outfitter marker failed', outfitter?.listingName, error);
    }
  }
}

function updateStateLayersSummary() {
  if (!stateLayersSummary) return;
  const count = [toggleSITLA, toggleStateParks, toggleWma].filter(el => !!el?.checked).length;
  stateLayersSummary.innerHTML = count ? `State <span class="toggle-menu-count">(${count})</span>` : 'State';
}
function updateFederalLayersSummary() {
  if (!federalLayersSummary) return;
  const count = [toggleUSFS, toggleBLM, toggleBLMDetail].filter(el => !!el?.checked).length;
  federalLayersSummary.innerHTML = count ? `Federal <span class="toggle-menu-count">(${count})</span>` : 'Federal';
}
function updatePrivateLayersSummary() {
  if (!privateLayersSummary) return;
  const count = [togglePrivate, toggleCwmu].filter(el => !!el?.checked).length;
  privateLayersSummary.innerHTML = count ? `Private <span class="toggle-menu-count">(${count})</span>` : 'Private';
}

function openSelectedHuntPopup() {
  closeSelectedHuntPopup();
}

function closeSelectedHuntPopup() {
  if (!mapChooser) return;
  mapChooser.classList.remove('is-open');
  mapChooser.setAttribute('aria-hidden', 'true');
  selectedBoundaryMatches = [];
  if (mapChooserBody) {
    mapChooserBody.innerHTML = '<div class="map-chooser-empty">Click a hunt boundary to load matching hunts.</div>';
  }
}

function getFeatureMatches(feature) {
  const boundaryId = safe(feature?.getProperty('BoundaryID'));
  const boundaryName = normalizeBoundaryKey(feature?.getProperty('Boundary_Name'));
  const displaySource = getDisplayHunts();
  const source = (hasActiveMatrixSelections() || selectedHunt) ? displaySource : huntData;
  return source.filter(h => {
    const hBoundaryId = safe(getBoundaryId(h));
    const hUnitCode = normalizeBoundaryKey(getUnitCode(h));
    const hUnitName = normalizeBoundaryKey(getUnitName(h));
    return hBoundaryId === boundaryId || hUnitCode === boundaryName || hUnitName === boundaryName;
  });
}

function buildPopupCardForHunt(hunt) {
  return buildDnrPlate(hunt, true);
}

function buildPopupListForMatches(matches) {
  return `
    <div style="display:grid;gap:10px;min-width:320px;max-width:380px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;border:1px solid #d6c1ae;">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">DWR Hunt Unit</div>
          <div style="font-size:15px;font-weight:900;color:#2b1c12;">Multiple Available Hunts</div>
        </div>
      </div>
      ${matches.slice(0, 8).map(h => `
        <button type="button" data-popup-hunt-key="${escapeHtml(getHuntRecordKey(h))}" style="text-align:left;border:1px solid #d6c1ae;border-radius:10px;background:#fffdf8;padding:10px;cursor:pointer;color:#2b1c12;">
          <div style="font-weight:900;">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
          <div style="font-size:12px;color:#6b5646;">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getWeapon(h))}</div>
        </button>
      `).join('')}
    </div>`;
}

function showHuntMatchesChooser(title, matches, kicker = 'Available Hunts') {
  if (!mapChooser || !mapChooserBody || !mapChooserTitle || !mapChooserKicker) return;
  closeSelectedHuntFloat();
  selectedBoundaryMatches = matches.slice();
  mapChooserKicker.textContent = kicker;
  mapChooserTitle.textContent = firstNonEmpty(title, 'Available Hunts');
  mapChooserBody.innerHTML = matches.length ? matches.slice(0, 12).map(h => `
    <div class="map-chooser-card" data-popup-hunt-key="${escapeHtml(getHuntRecordKey(h))}" role="button" tabindex="0">
      <div class="hunt-card-title">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getHuntType(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getWeapon(h))} | ${escapeHtml(getDates(h) || 'See official hunt details')}</div>
    </div>
  `).join('') : '<div class="map-chooser-empty">No matching hunts found for this boundary.</div>';
  mapChooser.classList.add('is-open');
  mapChooser.setAttribute('aria-hidden', 'false');
  mapChooserBody.querySelectorAll('[data-popup-hunt-key]').forEach(card => {
    const select = () => {
      closeSelectedHuntPopup();
      window.selectHuntByKey(card.getAttribute('data-popup-hunt-key'));
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', evt => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        select();
      }
    });
  });
}
function openMapChooser(feature, matches) {
  const boundaryName = firstNonEmpty(feature?.getProperty?.('Boundary_Name'), 'Selected Unit');
  showHuntMatchesChooser(boundaryName, matches, hasActiveMatrixSelections() || selectedHunt ? 'Available Hunts' : 'Selected Unit');
}

function openBoundaryPopup(feature, latLng) {
  if (!googleBaselineMap || !feature || !latLng) return;
  const matches = getFeatureMatches(feature);
  selectedBoundaryFeature = feature;
  selectedBoundaryMatches = matches.slice();
  closeSelectionInfoWindow();
  closeSelectedHuntPopup();
  fitDataFeatureBounds(feature, 11);
  const boundaryName = firstNonEmpty(feature?.getProperty?.('Boundary_Name'), 'Selected Unit');
  if (matches.length) {
    updateStatus(`${matches.length} matching hunt${matches.length === 1 ? '' : 's'} in ${boundaryName}. Use Apply Filters or Available Hunts to choose one.`);
  } else {
    updateStatus(`Zoomed to ${boundaryName}.`);
  }
}

async function loadOutfitters() {
  outfitters = await loadFirstNormalizedList(OUTFITTERS_DATA_SOURCES, normalizeOutfitterList, []);
}
async function loadOutfitterFederalCoverage() {
  const normalized = await loadFirstNormalizedList(OUTFITTER_FEDERAL_COVERAGE_SOURCES, normalizeOutfitterCoverageList, []);
  indexOutfitterFederalCoverage(normalized);
}
function getLatLngCacheKey(latLng, precision = 4) {
  if (!latLng) return '';
  return `${Number(latLng.lat()).toFixed(precision)},${Number(latLng.lng()).toFixed(precision)}`;
}
function formatBlmDistrictTitle(attrs) {
  const name = firstNonEmpty(attrs?.ADMU_NAME, attrs?.DISTRICT_NAME);
  const parentName = firstNonEmpty(attrs?.PARENT_NAME, attrs?.Parent_Name);
  const orgType = firstNonEmpty(attrs?.BLM_ORG_TYPE);
  if (!name) return 'BLM Administrative Unit';
  if (/field/i.test(orgType) && parentName) {
    if (/district/i.test(parentName)) return parentName;
    return `${parentName} District`;
  }
  if (/district/i.test(name) || /field/i.test(name)) return name;
  if (/district/i.test(orgType)) return `${name} District`;
  if (/field/i.test(orgType)) return `${name} Field Office`;
  return name;
}
async function queryBlmOwnershipAtLatLng(latLng) {
  if (!latLng) return null;
  const cacheKey = getLatLngCacheKey(latLng);
  if (blmOwnershipPointCache.has(cacheKey)) return blmOwnershipPointCache.get(cacheKey);
  const queryUrl = `${BLM_SURFACE_OWNERSHIP_LAYER_URL}/query?where=${encodeURIComponent("UT_LGD IN ('Bureau of Land Management (BLM)','BLM Wilderness Area')")}&geometry=${encodeURIComponent(`${latLng.lng()},${latLng.lat()}`)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=UT_LGD,COUNTY,CO_NAME,GIS_ACRES,ACRES,OWNER&returnGeometry=false&f=json`;
  const promise = fetchJson(queryUrl)
    .then(json => Array.isArray(json?.features) ? json.features[0]?.attributes || null : null)
    .catch(error => {
      console.error('BLM ownership point query failed', error);
      return null;
    });
  blmOwnershipPointCache.set(cacheKey, promise);
  return promise;
}
async function queryBlmDistrictAtLatLng(latLng) {
  if (!latLng) return null;
  const cacheKey = getLatLngCacheKey(latLng);
  if (blmDistrictPointCache.has(cacheKey)) return blmDistrictPointCache.get(cacheKey);
  const queryUrl = `${BLM_ADMIN_LAYER_URL}/query?where=${encodeURIComponent("BLM_ORG_TYPE IN ('District','Field')")}&geometry=${encodeURIComponent(`${latLng.lng()},${latLng.lat()}`)}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=ADMU_NAME,PARENT_NAME,BLM_ORG_TYPE&returnGeometry=false&orderByFields=BLM_ORG_TYPE%20ASC&f=json`;
  const promise = fetchJson(queryUrl)
    .then(json => Array.isArray(json?.features) ? json.features[0]?.attributes || null : null)
    .catch(error => {
      console.error('BLM district point query failed', error);
      return null;
    });
  blmDistrictPointCache.set(cacheKey, promise);
  return promise;
}
const OWNERSHIP_BUCKET_QUERIES = {
  sitla: "state_lgd = 'State Trust Lands'",
  private: "state_lgd = 'Private'",
  stateLands: "state_lgd IN ('Other State','State Sovereign Land')"
};
const ownershipBucketGeoJsonPromises = new Map();
function getOwnershipBucketGeoJson(bucket) {
  if (!ownershipBucketGeoJsonPromises.has(bucket)) {
    const where = OWNERSHIP_BUCKET_QUERIES[bucket] || '1=0';
    ownershipBucketGeoJsonPromises.set(bucket, fetchArcGisPagedGeoJson(PUBLIC_OWNERSHIP_LAYER_URL, where));
  }
  return ownershipBucketGeoJsonPromises.get(bucket);
}
let cwmuGeoJsonPromise = null;
async function getCwmuGeoJson() {
  if (!cwmuGeoJsonPromise) {
    cwmuGeoJsonPromise = fetchGeoJson(CWMU_QUERY_URL).catch(async error => {
      console.error('Live CWMU service failed, falling back to local CWMU GeoJSON', error);
      try {
        return await fetchGeoJson(LOCAL_CWMU_BOUNDARIES_PATH);
      } catch (localError) {
        console.error('Local CWMU GeoJSON failed, falling back to cached IDs', localError);
      }
      const [boundaryIds, boundaryGeoJson] = await Promise.all([
        fetchJson(CWMU_BOUNDARY_IDS_PATH).then(ids => Array.isArray(ids) ? ids.map(id => String(id)) : []),
        getHuntBoundaryGeoJson()
      ]);
      const allowedIds = new Set(boundaryIds);
      const features = Array.isArray(boundaryGeoJson?.features)
        ? boundaryGeoJson.features.filter(feature => allowedIds.has(String(feature?.properties?.BoundaryID ?? '')))
        : [];
      return { type: 'FeatureCollection', features };
    }).catch(async error => {
      cwmuGeoJsonPromise = null;
      throw error;
    });
  }
  return cwmuGeoJsonPromise;
}
let huntBoundaryGeoJsonPromise = null;
function getHuntBoundaryGeoJson() {
  if (huntBoundaryGeoJson) return Promise.resolve(huntBoundaryGeoJson);
  if (!huntBoundaryGeoJsonPromise) {
    huntBoundaryGeoJsonPromise = fetchFirstGeoJson(HUNT_BOUNDARY_SOURCES).then(geojson => {
      huntBoundaryGeoJson = geojson;
      return geojson;
    });
  }
  return huntBoundaryGeoJsonPromise;
}
function createOwnershipLayer(bucket, style, clickBuilder) {
  const layer = new google.maps.Data();
  getOwnershipBucketGeoJson(bucket).then(geojson => {
    layer.addGeoJson(geojson);
  }).catch(err => console.error('Ownership layer failed', err));
  layer.setStyle(style);
  layer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    const card = clickBuilder(event.feature);
    openLandInfoWindow(card, event.latLng);
  });
  return layer;
}
function fitDataFeatureBounds(feature, maxZoom = 12) {
  if (!googleBaselineMap || !feature?.getGeometry) return false;
  const geometry = feature.getGeometry();
  if (!geometry?.forEachLatLng) return false;
  const bounds = new google.maps.LatLngBounds();
  let found = false;
  geometry.forEachLatLng(latLng => {
    bounds.extend(latLng);
    found = true;
  });
  if (!found) return false;
  googleBaselineMap.fitBounds(bounds);
  google.maps.event.addListenerOnce(googleBaselineMap, 'bounds_changed', () => {
    if ((googleBaselineMap.getZoom() || 0) > maxZoom) googleBaselineMap.setZoom(maxZoom);
  });
  return true;
}
async function ensureSitlaLayer() {
  if (sitlaLayer || !googleBaselineMap) return sitlaLayer;
  sitlaLayer = createOwnershipLayer(
    'sitla',
    { strokeColor: '#2a78d2', strokeWeight: 2, fillColor: '#6fb3ff', fillOpacity: 0.08, zIndex: 34 },
    feature => buildLandInfoCard(buildOwnershipDetails('sitla', featureProps(feature)))
  );
  setLayerVisibility(sitlaLayer, !!toggleSITLA?.checked);
  return sitlaLayer;
}
function featureProps(feature) {
  const names = ['label_state','LABEL_STATE','ut_lgd','UT_LGD','desig','DESIG','admin','ADMIN','owner','OWNER','county','COUNTY','gis_acres','GIS_ACRES','acres','ACRES'];
  const props = {};
  names.forEach(name => { props[name] = feature.getProperty(name); });
  return props;
}
async function ensureStateLandsLayer() {
  if (stateLandsLayer || !googleBaselineMap) return stateLandsLayer;
  stateLandsLayer = createOwnershipLayer(
    'stateLands',
    { strokeColor: '#2f8f9a', strokeWeight: 2, fillColor: '#6ac7d2', fillOpacity: 0.08, zIndex: 33 },
    feature => buildLandInfoCard(buildOwnershipDetails('stateLands', featureProps(feature)))
  );
  setLayerVisibility(stateLandsLayer, false);
  return stateLandsLayer;
}
async function ensureStateParksLayer() {
  if (stateParksLayer || !googleBaselineMap) return stateParksLayer;
  const geojson = await fetchGeoJson(STATE_PARKS_QUERY_URL);
  stateParksLayer = new google.maps.Data();
  stateParksLayer.addGeoJson(geojson);
  stateParksLayer.setStyle({
    strokeColor: '#0d6f78',
    strokeWeight: 2.5,
    fillColor: '#5ec7d1',
    fillOpacity: 0.1,
    zIndex: 35
  });
  stateParksLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    const title = firstNonEmpty(
      event.feature.getProperty('name'),
      event.feature.getProperty('Name'),
      event.feature.getProperty('NAME'),
      event.feature.getProperty('UNIT_NAME'),
      event.feature.getProperty('UnitName'),
      event.feature.getProperty('ParkName'),
      'Utah State Park'
    );
    const detailsLink = firstNonEmpty(
      event.feature.getProperty('weblink1'),
      event.feature.getProperty('Weblink1'),
      event.feature.getProperty('WEBLINK1')
    );
    const detailText = [
      firstNonEmpty(event.feature.getProperty('City'), event.feature.getProperty('CITY')),
      firstNonEmpty(event.feature.getProperty('County'), event.feature.getProperty('COUNTY'))
    ].filter(Boolean).join(' | ');
    openLandInfoWindow(buildLandInfoCard({
      logo: LOGO_STATE_PARKS,
      title,
      subtitle: 'Utah State Parks',
      detailText,
      logoSize: 68,
      cardMinWidth: 180,
      cardMaxWidth: 220,
      detailsLinkText: detailsLink ? 'Park Details' : '',
      detailsLink
    }), event.latLng);
  });
  setLayerVisibility(stateParksLayer, !!toggleStateParks?.checked);
  return stateParksLayer;
}
async function ensureWmaLayer() {
  if (wmaLayer || !googleBaselineMap) return wmaLayer;
  const geojson = await fetchGeoJson(WMA_QUERY_URL);
  wmaLayer = new google.maps.Data();
  wmaLayer.addGeoJson(geojson);
  wmaLayer.setStyle({
    strokeColor: '#b38a00',
    strokeWeight: 2.5,
    fillColor: '#ffd84d',
    fillOpacity: 0.12,
    zIndex: 36
  });
  wmaLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    fitDataFeatureBounds(event.feature, 12);
    const title = firstNonEmpty(
      event.feature.getProperty('Name'),
      event.feature.getProperty('NAME'),
      'Wildlife Management Area'
    );
    openLandInfoWindow(buildLandInfoCard({
      logo: LOGO_DWR_WMA,
      title,
      subtitle: "UT. DWR W.M.A.'s",
      logoSize: 68,
      noticeText: "Utah DWR W.M.A.'s do not imply outfitter approval, endorsement, or exclusive access."
    }), event.latLng);
  });
  setLayerVisibility(wmaLayer, !!toggleWma?.checked);
  return wmaLayer;
}
async function ensureCwmuLayer() {
  if (cwmuLayer || !googleBaselineMap) return cwmuLayer;
  const geojson = await getCwmuGeoJson();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  cwmuLayer = new google.maps.Data();
  cwmuLayer.addGeoJson({ type: 'FeatureCollection', features });
  cwmuLayer.setStyle({
    strokeColor: '#b11f1f',
    strokeWeight: 2,
    fillColor: '#ff6b6b',
    fillOpacity: 0.1,
    zIndex: 37
  });
  cwmuLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    fitDataFeatureBounds(event.feature, 12);
    openLandInfoWindow(buildLandInfoCard({
      logo: LOGO_CWMU,
      title: firstNonEmpty(
        event.feature.getProperty('Boundary_Name'),
        event.feature.getProperty('NAME'),
        event.feature.getProperty('Name'),
        'CWMU Area'
      ),
      subtitle: 'Cooperative Wildlife Management Unit',
      logoSize: 68,
      noticeText: 'No access without the appropriate CWMU permit.'
    }), event.latLng);
  });
  setLayerVisibility(cwmuLayer, !!toggleCwmu?.checked);
  return cwmuLayer;
}
async function ensurePrivateLayer() {
  if (privateLayer || !googleBaselineMap) return privateLayer;
  privateLayer = createOwnershipLayer(
    'private',
    { strokeColor: '#8f4a3a', strokeWeight: 1.5, fillColor: '#c99284', fillOpacity: 0.05, zIndex: 32 },
    feature => buildLandInfoCard(buildOwnershipDetails('private', featureProps(feature)))
  );
  setLayerVisibility(privateLayer, !!togglePrivate?.checked);
  return privateLayer;
}

async function ensureUsfsLayer() {
  if (usfsLayer || !googleBaselineMap) return usfsLayer;
  const geojson = await fetchGeoJson(USFS_QUERY_URL);
  usfsLayer = new google.maps.Data();
  usfsLayer.addGeoJson(geojson);
  usfsLayer.setStyle({
    strokeColor: '#2f6b3b',
    strokeWeight: 2,
    fillColor: '#7ea96b',
    fillOpacity: 0.08,
    zIndex: 14
  });
  usfsLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    if (shouldDeprioritizeFederalClicks()) return;
    openLandInfoWindow(buildLandInfoCard({
      logo: LOGO_USFS,
      title: firstNonEmpty(event.feature.getProperty('FORESTNAME'), 'National Forest'),
      subtitle: 'US Forest Service',
      logoSize: 68
    }), event.latLng);
  });
  setLayerVisibility(usfsLayer, !!toggleUSFS?.checked);
  return usfsLayer;
}

async function ensureBlmLayer() {
  if (blmLayer || !googleBaselineMap) return blmLayer;
  const geojson = await fetchGeoJson(BLM_ADMIN_QUERY_URL);
  blmLayer = new google.maps.Data();
  blmLayer.addGeoJson(geojson);
  blmLayer.setStyle({
    strokeColor: '#b9722f',
    strokeWeight: 2,
    fillColor: '#d8af7b',
    fillOpacity: 0.04,
    clickable: false,
    zIndex: 12
  });
  setLayerVisibility(blmLayer, !!toggleBLM?.checked);
  return blmLayer;
}

async function ensureBlmDetailLayer() {
  if (blmDetailLayer || !googleBaselineMap) return blmDetailLayer;
  const geojson = await fetchArcGisPagedGeoJson(
    BLM_SURFACE_OWNERSHIP_LAYER_URL,
    "UT_LGD IN ('Bureau of Land Management (BLM)','BLM Wilderness Area')"
  );
  blmDetailLayer = new google.maps.Data();
  blmDetailLayer.addGeoJson(geojson);
  applyBlmDetailLayerStyle();
  blmDetailLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    if (shouldDeprioritizeFederalClicks()) return;
    queryBlmDistrictAtLatLng(event.latLng).then(districtHit => {
      const county = firstNonEmpty(
        event.feature.getProperty('COUNTY'),
        event.feature.getProperty('county'),
        event.feature.getProperty('CO_NAME'),
        event.feature.getProperty('co_name')
      );
      const surfaceLabel = firstNonEmpty(
        event.feature.getProperty('UT_LGD'),
        event.feature.getProperty('ut_lgd'),
        event.feature.getProperty('OWNER'),
        event.feature.getProperty('owner'),
        'Bureau of Land Management (BLM)'
      );
      const detailText = [
        county ? `${county} County` : '',
        surfaceLabel
      ].filter(Boolean).join(' | ');
      openLandInfoWindow(buildLandInfoCard({
        logo: LOGO_BLM,
        title: firstNonEmpty(
          formatBlmDistrictTitle(districtHit),
          'BLM District'
        ),
        subtitle: 'Bureau of Land Management',
        detailText,
        logoSize: 68
      }), event.latLng);
    });
  });
  setLayerVisibility(blmDetailLayer, !!(toggleBLM?.checked || toggleBLMDetail?.checked));
  return blmDetailLayer;
}
function applyBlmDetailLayerStyle() {
  if (!blmDetailLayer) return;
  blmDetailLayer.setStyle(() => {
    const showVisibleDetail = !!toggleBLMDetail?.checked;
    return {
      strokeColor: '#b9722f',
      strokeWeight: showVisibleDetail ? 1.25 : 0.1,
      strokeOpacity: showVisibleDetail ? 0.55 : 0,
      fillColor: '#d8af7b',
      fillOpacity: showVisibleDetail ? 0.03 : 0,
      clickable: true,
      zIndex: 11
    };
  });
}
async function ensureWildernessLayer() {
  if (wildernessLayer || !googleBaselineMap) return wildernessLayer;
  const geojson = await fetchGeoJson(WILDERNESS_QUERY_URL);
  wildernessLayer = new google.maps.Data();
  wildernessLayer.addGeoJson(geojson);
  wildernessLayer.setStyle(feature => {
    const agency = safe(feature.getProperty('Agency')).toUpperCase();
    const isUsfs = agency === 'FS';
    const isVisible = shouldShowWildernessFeature(agency);
    return {
      visible: isVisible,
      clickable: isVisible,
      strokeColor: isUsfs ? '#1f5130' : '#8a611d',
      strokeWeight: 2,
      strokeOpacity: isVisible ? 0.9 : 0,
      fillColor: isUsfs ? '#7f9f74' : '#c8a76f',
      fillOpacity: isVisible ? 0.12 : 0,
      zIndex: 31
    };
  });
  wildernessLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (!shouldShowWildernessFeature(event.feature)) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    fitDataFeatureBounds(event.feature, 11);
    const agency = safe(event.feature.getProperty('Agency')).toUpperCase();
    const subtitle = agency === 'FS' ? 'USFS Wilderness' : 'BLM Wilderness';
    const detailBits = [];
    const acreage = event.feature.getProperty('Acreage');
    if (acreage) detailBits.push(`${Number(acreage).toLocaleString()} acres`);
    openLandInfoWindow(buildLandInfoCard({
      logo: agency === 'FS' ? LOGO_USFS : LOGO_BLM,
      title: firstNonEmpty(event.feature.getProperty('NAME'), 'Wilderness Area'),
      subtitle,
      detailText: detailBits.join(' | '),
      detailsLinkText: event.feature.getProperty('URL') ? 'Area Details' : '',
      detailsLink: firstNonEmpty(event.feature.getProperty('URL')),
      logoSize: 68
    }), event.latLng);
  });
  updateWildernessOverlayVisibility();
  return wildernessLayer;
}
async function ensureUtahOutlineLayer() {
  if (utahOutlineLayer || !googleBaselineMap) return utahOutlineLayer;
  const geojson = await fetchGeoJson(UTAH_OUTLINE_QUERY_URL);
  utahOutlineLayer = new google.maps.Data();
  utahOutlineLayer.addGeoJson(geojson);
  utahOutlineLayer.setStyle({
    strokeColor: '#c84f00',
    strokeWeight: 3,
    strokeOpacity: 0.95,
    fillOpacity: 0,
    clickable: false,
    zIndex: 9
  });
  utahOutlineLayer.setMap(googleBaselineMap);
  return utahOutlineLayer;
}

function ensureCesiumViewer() {
  if (cesiumViewer || typeof Cesium === 'undefined') return;
  const container = document.getElementById('globeMap');
  if (!container) return;
  cesiumViewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    selectionIndicator: false,
    infoBox: false
  });
  applyGlobeBasemap(currentGlobeBasemap);
  cesiumViewer.scene.globe.enableLighting = false;
  cesiumViewer.scene.globe.showGroundAtmosphere = false;
  cesiumViewer.scene.globe.depthTestAgainstTerrain = false;
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#d7e7f5');
  if (cesiumViewer.scene.skyBox) cesiumViewer.scene.skyBox.show = false;
  if (cesiumViewer.scene.skyAtmosphere) cesiumViewer.scene.skyAtmosphere.show = false;
  if (cesiumViewer.scene.sun) cesiumViewer.scene.sun.show = false;
  if (cesiumViewer.scene.moon) cesiumViewer.scene.moon.show = false;
  cesiumViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#d7e7f5');
  cesiumViewer.scene.requestRenderMode = false;
  cesiumViewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
  container.style.background = '#d7e7f5';
  if (huntBoundaryGeoJson) {
    ensureCesiumHuntBoundaries().catch(err => console.error('Cesium hunt boundaries failed', err));
  }
  ensureCesiumUtahOutline().catch(err => console.error('Cesium Utah outline failed', err));
  const handler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
  handler.setInputAction((movement) => {
    const picked = cesiumViewer.scene.pick(movement.position);
    const entity = picked?.id;
    if (!entity?.properties) return;
    const matches = getCesiumEntityMatches(entity);
    focusCesiumBoundaryEntity(entity);
    const boundaryName = firstNonEmpty(
      entity.properties?.Boundary_Name?.getValue?.(),
      entity.properties?.BOUNDARY_NAME?.getValue?.(),
      'Selected Unit'
    );
    if (matches.length) {
      updateStatus(`${matches.length} matching hunt${matches.length === 1 ? '' : 's'} in ${boundaryName}. Use Apply Filters or Available Hunts to choose one.`);
    } else {
      updateStatus(`Zoomed to ${boundaryName}.`);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function fallbackToGlobeMode(reason = 'Google map unavailable.') {
  const mapWrap = document.querySelector('.map-wrap');
  if (!mapWrap) return;
  if (mapTypeSelect) {
    mapTypeSelect.value = 'globe';
  }
  ensureCesiumViewer();
  mapWrap.classList.add('is-globe-mode');
  setTimeout(() => {
    if (cesiumViewer) {
      cesiumViewer.resize();
      cesiumViewer.scene.requestRender();
    }
  }, 0);
  updateStatus(reason);
}

function applyMapMode() {
  const value = safe(mapTypeSelect?.value || 'terrain').toLowerCase();
  const mapWrap = document.querySelector('.map-wrap');
  if (!mapWrap) return;

  if (value === 'globe') {
    googleBaselineMap?.getStreetView?.()?.setVisible(false);
    clearOutfitterMarkers();
    updateStatus(`${getGlobeBasemapLabel(currentGlobeBasemap)} globe active.`);
    ensureCesiumViewer();
    mapWrap.classList.add('is-globe-mode');
    setTimeout(() => {
      if (cesiumViewer) {
        cesiumViewer.resize();
        cesiumViewer.scene.requestRender();
      }
    }, 0);
    if (selectedHunt && cesiumViewer) {
      const boundaryId = firstNonEmpty(selectedHunt.boundaryId, selectedHunt.boundaryID, getUnitCode(selectedHunt));
      if (boundaryId && huntUnitsLayer) {
        const bounds = new google.maps.LatLngBounds();
        let found = false;
        huntUnitsLayer.forEach(f => {
          if (safe(f.getProperty('BoundaryID')) === safe(boundaryId)) {
            f.getGeometry().forEachLatLng(ll => { bounds.extend(ll); found = true; });
          }
        });
        if (found) {
          const center = bounds.getCenter();
          cesiumViewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(center.lng(), center.lat(), 250000)
          });
        }
      }
    }
    updateCesiumBoundaryStyles();
    return;
  }

  if (!googleBaselineMap) {
    fallbackToGlobeMode('Google map is unavailable. Switched to globe view.');
    return;
  }

  mapWrap.classList.remove('is-globe-mode');
  googleBaselineMap.setMapTypeId(value);
  googleBaselineMap.getStreetView()?.setVisible(false);
  styleBoundaryLayer();
  if (selectedHunt) {
    updateOutfitterMarkers(getMatchingOutfittersForHunt(selectedHunt));
  }
  updateStatus(`${titleCaseWords(value)} map active.`);
}

function resetMapView() {
  if (mapTypeSelect && safe(mapTypeSelect.value).toLowerCase() === 'globe' && cesiumViewer) {
    cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(GOOGLE_BASELINE_DEFAULT_CENTER.lng, GOOGLE_BASELINE_DEFAULT_CENTER.lat, 850000)
    });
    return;
  }
  if (googleBaselineMap) {
    googleBaselineMap.setCenter(GOOGLE_BASELINE_DEFAULT_CENTER);
    googleBaselineMap.setZoom(GOOGLE_BASELINE_DEFAULT_ZOOM);
  }
}

function getSelectedHuntCenter() {
  if (!selectedHunt || !huntUnitsLayer) return null;
  const matcher = buildBoundaryMatcher([selectedHunt]);
  let center = null;
  huntUnitsLayer.forEach(f => {
    const id = safe(f.getProperty('BoundaryID'));
    const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (matcher.matches(id, name)) {
      const bounds = new google.maps.LatLngBounds();
      f.getGeometry().forEachLatLng(ll => bounds.extend(ll));
      center = bounds.getCenter();
    }
  });
  return center;
}

function openStreetViewAtFocus() {
  if (!googleBaselineMap || typeof google === 'undefined' || !google.maps?.StreetViewService) return;
  if (safe(mapTypeSelect?.value).toLowerCase() === 'globe') {
    mapTypeSelect.value = 'terrain';
    applyMapMode();
  }
  const pano = googleBaselineMap.getStreetView();
  const target = getSelectedHuntCenter() || googleBaselineMap.getCenter();
  if (!target) {
    updateStatus('No Street View location available yet.');
    return;
  }

  const streetViewService = new google.maps.StreetViewService();
  const radii = [5000, 15000, 50000];
  const tryRadius = (index) => {
    if (index >= radii.length) {
      updateStatus('No Street View imagery found near this hunt.');
      return;
    }
    streetViewService.getPanorama({
      location: target,
      radius: radii[index],
      preference: google.maps.StreetViewPreference.NEAREST,
      source: google.maps.StreetViewSource.OUTDOOR
    }, (data, status) => {
      if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
        googleBaselineMap.setCenter(data.location.latLng);
        pano.setPosition(data.location.latLng);
        pano.setPov({ heading: 0, pitch: 0 });
        pano.setVisible(true);
        updateStatus('Street View active.');
        return;
      }
      tryRadius(index + 1);
    });
  };

  tryRadius(0);
}

// --- MAP ENGINE ---
function initGoogleBaseline() {
  if (googleMapsLoadTimeoutId) {
    clearTimeout(googleMapsLoadTimeoutId);
    googleMapsLoadTimeoutId = null;
  }
  if (mapTypeSelect && safe(mapTypeSelect.value).toLowerCase() === 'globe') {
    mapTypeSelect.value = 'terrain';
  }
  googleBaselineMap = new google.maps.Map(document.getElementById('map'), {
    center: GOOGLE_BASELINE_DEFAULT_CENTER, zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    styles: huntPlannerMapStyle,
    mapTypeId: 'terrain',
    streetViewControl: true,
    fullscreenControl: true,
    mapTypeControl: false
  });
  googleApiReady = true;
  if (huntBoundaryGeoJson) buildBoundaryLayer();
  ensureUtahOutlineLayer().catch(err => console.error('Utah outline failed', err));
  if (toggleBLM?.checked) ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
  if (toggleBLM?.checked || toggleBLMDetail?.checked) ensureBlmDetailLayer().catch(err => console.error('BLM detail layer failed', err));
  if (toggleUSFS?.checked) ensureUsfsLayer().catch(err => console.error('USFS layer failed', err));
  if (shouldShowWildernessOverlay()) ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
  if (toggleSITLA?.checked) ensureSitlaLayer().catch(err => console.error('SITLA layer failed', err));
  if (toggleStateParks?.checked) ensureStateParksLayer().catch(err => console.error('State parks layer failed', err));
  if (toggleWma?.checked) ensureWmaLayer().catch(err => console.error('WMA layer failed', err));
  if (togglePrivate?.checked) ensurePrivateLayer().catch(err => console.error('Private layer failed', err));
  if (toggleCwmu?.checked) ensureCwmuLayer().catch(err => console.error('CWMU layer failed', err));
  updateStateLayersSummary();
  updateFederalLayersSummary();
  updatePrivateLayersSummary();
  applyMapMode();
  updateStatus('Map ready. Select filters or click a hunt unit.');
  bindControls();
}

if (typeof window !== 'undefined') {
  window.initGoogleBaseline = initGoogleBaseline;
}

function buildBoundaryLayer() {
  huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
  if (huntBoundaryGeoJson) {
      huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
      huntUnitsLayer.setStyle({ strokeColor: '#3653b3', strokeWeight: 1, fillOpacity: 0.05 });
      huntUnitsLayer.addListener('click', event => {
        openBoundaryPopup(event.feature, event.latLng);
      });
      styleBoundaryLayer();
  }
}

function styleBoundaryLayer() {
    if (!huntUnitsLayer) return;
    const showBoundaries = shouldShowHuntBoundaries();
    const showAllUnits = shouldShowAllHuntUnits();
    const filtered = getDisplayHunts();
    const matcher = buildBoundaryMatcher(filtered);
    const selectedMatcher = selectedHunt ? buildBoundaryMatcher([selectedHunt]) : null;
    huntUnitsLayer.setStyle(f => {
        const id = safe(f.getProperty('BoundaryID'));
        const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
        const isMatch = showAllUnits || matcher.matches(id, name);
        const isSelected = !!selectedMatcher && selectedMatcher.matches(id, name);
        return {
          visible: showBoundaries && isMatch,
          strokeColor: isSelected ? '#c84f00' : '#3653b3',
          strokeWeight: isSelected ? 4 : 1.5,
          fillColor: isSelected ? '#ff8a3d' : '#3653b3',
          fillOpacity: showBoundaries && isMatch ? (isSelected ? 0.22 : 0.08) : 0
        };
    });
    updateCesiumBoundaryStyles();
}

function bindControls() {
  [searchInput, speciesFilter, sexFilter, huntTypeFilter, weaponFilter, huntCategoryFilter, unitFilter].forEach(el => {
    el?.addEventListener('change', handleFilterChange);
    el?.addEventListener('input', handleFilterChange);
  });
  applyFiltersBtn?.addEventListener('click', () => {
    closeSelectedHuntPopup();
    closeSelectedHuntFloat();
    closeSelectionInfoWindow();
    selectedHunt = null;
    selectedBoundaryFeature = null;
    if (toggleDwrUnits && hasActiveMatrixSelections()) {
      toggleDwrUnits.checked = true;
    }
    refreshSelectionMatrix();
    styleBoundaryLayer();
    renderMatchingHunts();
    renderSelectedHunt();
    renderOutfitters();
    const results = getDisplayHunts();
    const count = results.length;
    const selectedUnitValue = safe(unitFilter?.value).trim();
    const selectedUnitGroups = getSelectedUnitGroups();
    if (typeof window !== 'undefined' && document.getElementById('matchingHunts')) {
      document.getElementById('matchingHunts').scrollTop = 0;
    }
    if (!count) {
      updateStatus('No matching hunts found for the current filters.');
    } else if (selectedUnitGroups.length > 1 && !selectedUnitValue) {
      zoomToDisplayHuntsBounds();
      openSelectedUnitsChooser();
      updateStatus(`${count} matching hunts across ${selectedUnitGroups.length} selected units.`);
    } else {
      if (selectedUnitValue && selectedUnitGroups.length === 1) {
        zoomToDisplayHuntsBounds();
      } else if (!selectedUnitValue) {
        zoomToDisplayHuntsBounds();
      }
      const chooserTitle = selectedUnitValue
        ? firstNonEmpty(selectedUnitGroups[0]?.unitName, selectedUnitValue)
        : firstNonEmpty(selectedUnitGroups[0]?.unitName, 'Available Hunts');
      showHuntMatchesChooser(chooserTitle, results, 'Available Hunts');
      updateStatus(`${count} matching hunt${count === 1 ? '' : 's'} applied.`);
    }
  });
  clearFiltersBtn?.addEventListener('click', resetAllFilters);
  document.getElementById('matchingHunts')?.addEventListener('click', event => {
    const researchBtn = event.target.closest('[data-hunt-research-code]');
    if (researchBtn) {
      event.stopPropagation();
      event.preventDefault();
      const code = researchBtn.getAttribute('data-hunt-research-code');
      if (code) openHuntResearch(code);
      return;
    }
    const card = event.target.closest('[data-hunt-key]');
    if (!card) return;
    window.selectHuntByKey(card.getAttribute('data-hunt-key'));
  });
  document.getElementById('matchingHunts')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('[data-hunt-research-code]')) return;
    const card = event.target.closest('[data-hunt-key]');
    if (!card) return;
    event.preventDefault();
    window.selectHuntByKey(card.getAttribute('data-hunt-key'));
  });
  document.getElementById('closeMapChooserBtn')?.addEventListener('click', closeSelectedHuntPopup);
  document.getElementById('closeHuntDetailsBtn')?.addEventListener('click', closeInlineHuntDetails);
  mapTypeSelect?.addEventListener('change', applyMapMode);
  globeBasemapSelect?.addEventListener('change', () => {
    currentGlobeBasemap = safe(globeBasemapSelect.value || 'osm');
    applyGlobeBasemap(currentGlobeBasemap);
    updateStatus(`${getGlobeBasemapLabel(currentGlobeBasemap)} globe basemap active.`);
  });
  globeBasemapGrid?.addEventListener('click', event => {
    const btn = event.target.closest('[data-globe-basemap]');
    if (!btn) return;
    currentGlobeBasemap = safe(btn.getAttribute('data-globe-basemap') || currentGlobeBasemap);
    if (globeBasemapSelect) {
      globeBasemapSelect.value = currentGlobeBasemap;
    }
    if (safe(mapTypeSelect?.value).toLowerCase() !== 'globe' && mapTypeSelect) {
      mapTypeSelect.value = 'globe';
      applyMapMode();
    }
    applyGlobeBasemap(currentGlobeBasemap);
    updateStatus(`${getGlobeBasemapLabel(currentGlobeBasemap)} globe basemap active.`);
  });
  streetViewBtn?.addEventListener('click', openStreetViewAtFocus);
  resetViewBtn?.addEventListener('click', resetMapView);
  toggleDwrUnits?.addEventListener('change', () => {
    if (!toggleDwrUnits.checked) {
      closeSelectionInfoWindow();
      closeSelectedHuntPopup();
      closeSelectedHuntFloat();
    }
    styleBoundaryLayer();
  });
  toggleUSFS?.addEventListener('change', async () => {
    if (toggleUSFS.checked) await ensureUsfsLayer().catch(err => console.error('USFS layer failed', err));
    setLayerVisibility(usfsLayer, !!toggleUSFS.checked);
    if (shouldShowWildernessOverlay()) await ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
    updateWildernessOverlayVisibility();
    updateFederalLayersSummary();
  });
  toggleBLM?.addEventListener('change', async () => {
    if (toggleBLM.checked) await ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
    setLayerVisibility(blmLayer, !!toggleBLM.checked);
    if (toggleBLM.checked || toggleBLMDetail?.checked) await ensureBlmDetailLayer().catch(err => console.error('BLM detail layer failed', err));
    setLayerVisibility(blmDetailLayer, !!(toggleBLM.checked || toggleBLMDetail?.checked));
    applyBlmDetailLayerStyle();
    if (shouldShowWildernessOverlay()) await ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
    updateWildernessOverlayVisibility();
    if (toggleUSFS?.checked) {
      setLayerVisibility(usfsLayer, false);
      setLayerVisibility(usfsLayer, true);
    }
    updateFederalLayersSummary();
  });
  toggleBLMDetail?.addEventListener('change', async () => {
    if (toggleBLMDetail.checked) await ensureBlmDetailLayer().catch(err => console.error('BLM detail layer failed', err));
    setLayerVisibility(blmDetailLayer, !!(toggleBLM?.checked || toggleBLMDetail.checked));
    applyBlmDetailLayerStyle();
    updateFederalLayersSummary();
  });
  toggleSITLA?.addEventListener('change', async () => {
    if (toggleSITLA.checked) await ensureSitlaLayer().catch(err => console.error('SITLA layer failed', err));
    setLayerVisibility(sitlaLayer, !!toggleSITLA.checked);
    updateStateLayersSummary();
  });
  toggleStateParks?.addEventListener('change', async () => {
    if (toggleStateParks.checked) await ensureStateParksLayer().catch(err => console.error('State parks layer failed', err));
    setLayerVisibility(stateParksLayer, !!toggleStateParks.checked);
    updateStateLayersSummary();
  });
  toggleWma?.addEventListener('change', async () => {
    if (toggleWma.checked) await ensureWmaLayer().catch(err => console.error('WMA layer failed', err));
    setLayerVisibility(wmaLayer, !!toggleWma.checked);
    updateStateLayersSummary();
  });
  toggleCwmu?.addEventListener('change', async () => {
    if (toggleCwmu.checked) await ensureCwmuLayer().catch(err => console.error('CWMU layer failed', err));
    setLayerVisibility(cwmuLayer, !!toggleCwmu.checked);
    updatePrivateLayersSummary();
  });
  togglePrivate?.addEventListener('change', async () => {
    if (togglePrivate.checked) await ensurePrivateLayer().catch(err => console.error('Private layer failed', err));
    setLayerVisibility(privateLayer, !!togglePrivate.checked);
    updatePrivateLayersSummary();
  });
}

function zoomToSelectedBoundary() {
  if (!huntUnitsLayer || !selectedHunt) return;
  const bounds = new google.maps.LatLngBounds();
  let found = false;
  const matcher = buildBoundaryMatcher([selectedHunt]);
  
  huntUnitsLayer.forEach(f => {
    const featureBoundaryId = safe(f.getProperty('BoundaryID'));
    const featureName = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (matcher.matches(featureBoundaryId, featureName)) {
      f.getGeometry().forEachLatLng(ll => { bounds.extend(ll); found = true; });
    }
  });
  if (found) {
    googleBaselineMap.fitBounds(bounds);
    google.maps.event.addListenerOnce(googleBaselineMap, 'bounds_changed', () => {
      const maxZoom = 9;
      if ((googleBaselineMap.getZoom?.() || 0) > maxZoom) {
        googleBaselineMap.setZoom(maxZoom);
      }
    });
  }
}

function zoomToDisplayHuntsBounds() {
  if (!huntUnitsLayer || !googleBaselineMap) return false;
  const filtered = getDisplayHunts();
  if (!filtered.length) return false;
  const matcher = buildBoundaryMatcher(filtered);
  const bounds = new google.maps.LatLngBounds();
  let found = false;
  huntUnitsLayer.forEach(f => {
    const id = safe(f.getProperty('BoundaryID'));
    const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (matcher.matches(id, name)) {
      f.getGeometry().forEachLatLng(ll => {
        bounds.extend(ll);
        found = true;
      });
    }
  });
  if (found) {
    googleBaselineMap.fitBounds(bounds);
    return true;
  }
  return false;
}

function bootstrapPendingHuntSelection() {
  const params = new URLSearchParams(window.location.search || '');
  const pendingCode = safe(params.get('hunt_code')).trim().toUpperCase();
  if (!pendingCode) return;
  const match = huntData.find((hunt) => safe(getHuntCode(hunt)).trim().toUpperCase() === pendingCode);
  if (!match) return;
  selectedHunt = match;
  renderSelectedHunt();
  renderOutfitters();
  renderMatchingHunts();
  styleBoundaryLayer();
  if (huntUnitsLayer && googleBaselineMap) {
    zoomToSelectedBoundary();
  }
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load Map
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&callback=initGoogleBaseline`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.error('Google Maps API failed to load.');
    fallbackToGlobeMode('Google map failed to load. Switched to globe view.');
  };
  document.head.appendChild(script);
  googleMapsLoadTimeoutId = setTimeout(() => {
    if (!googleApiReady) {
      console.error('Google Maps API load timed out.');
      fallbackToGlobeMode('Google map timed out. Switched to globe view.');
    }
  }, 7000);
  
  // Load Data
  await loadConservationPermitAreas();
  await loadConservationPermitHuntTable();
  await loadHuntData();
  await loadOutfitters();
  await loadOutfitterFederalCoverage();
  try {
      huntBoundaryGeoJson = await fetchFirstGeoJson(HUNT_BOUNDARY_SOURCES);
      if (googleApiReady) buildBoundaryLayer();
      if (cesiumViewer) {
        ensureCesiumHuntBoundaries().catch(err => console.error('Cesium hunt boundaries failed', err));
        ensureCesiumUtahOutline().catch(err => console.error('Cesium Utah outline failed', err));
      }
  } catch(e) { console.error("GeoJSON load failed", e); }

  refreshSelectionMatrix();
  renderMatchingHunts();
  bootstrapPendingHuntSelection();
  applyMapMode();
});

function sortWithPreferredOrder(arr, pref) {
    const map = new Map(pref.map((v, i) => [v, i]));
    return arr.sort((a, b) => (map.has(a) ? map.get(a) : 99) - (map.has(b) ? map.get(b) : 99));
}
