const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;

// --- CLOUDFLARE JSON SOURCES ---
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const HUNT_DATA_VERSION = '20260324-master-1733';
const OUTFITTERS_DATA_VERSION = '20260326-outfitters-geo-1';
const HUNT_BOUNDARY_SOURCES = [
  `./data/hunt_boundaries.geojson?v=${HUNT_DATA_VERSION}`,
  `${CLOUDFLARE_BASE}/hunt_boundaries.geojson?v=${HUNT_DATA_VERSION}`
];
const OUTFITTERS_DATA_SOURCES = [
  `./data/outfitters-public.json?v=${OUTFITTERS_DATA_VERSION}`,
  `./data/outfitters.json?v=${OUTFITTERS_DATA_VERSION}`,
  `${CLOUDFLARE_BASE}/outfitters-public.json?v=${OUTFITTERS_DATA_VERSION}`,
  `${CLOUDFLARE_BASE}/outfitters.json?v=${OUTFITTERS_DATA_VERSION}`
];
const LOGO_DNR = 'https://static.wixstatic.com/media/43f827_34cd9f26f53f4b9ebcb200f6d878bea2~mv2.jpg';
const LOGO_DNR_ROOMY = 'https://static.wixstatic.com/media/43f827_28020dbfc9b9434c91dc6d92d9a07cd4~mv2.png';
const LOGO_CWMU = './assets/logos/DWR-CWMU-LOGO.png';
const LOGO_DWR_WMA = './assets/logos/DWR-WMA.LOGO.png';
const LOGO_USFS = './assets/logos/usfs.png';
const LOGO_BLM = './assets/logos/blm.png';
const LOGO_SITLA = './assets/logos/sitla.png';
const LOGO_STATE_PARKS = './assets/logos/state-parks.png';
const LOCAL_CWMU_BOUNDARIES_PATH = './data/cwmu-boundaries.geojson';
const CWMU_BOUNDARY_IDS_PATH = './data/dwr-GetCWMUBoundaries.json';
const PUBLIC_OWNERSHIP_LAYER_URL = 'https://services.arcgis.com/ZzrwjTRez6FJiOq4/ArcGIS/rest/services/SITLA_Ownership/FeatureServer/0';
const CWMU_QUERY_URL = 'https://dwrmapserv.utah.gov/dwrarcgis/rest/services/hunt/CWMU_Tradelands_ver3/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const STATE_PARKS_QUERY_URL = 'https://services.arcgis.com/ZzrwjTRez6FJiOq4/ArcGIS/rest/services/Utah_State_Park_Management_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const WMA_QUERY_URL = 'https://services.arcgis.com/ZzrwjTRez6FJiOq4/arcgis/rest/services/WMA/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const WILDERNESS_QUERY_URL = "https://services1.arcgis.com/ERdCHt0sNM6dENSD/ArcGIS/rest/services/Wilderness_Areas_in_the_United_States/FeatureServer/0/query?where=" + encodeURIComponent("STATE = 'UT' AND Agency IN ('BLM','FS')") + "&outFields=NAME,Agency,URL,Acreage&returnGeometry=true&outSR=4326&f=geojson";

const USFS_QUERY_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" + encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") + "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";
const BLM_QUERY_URL = 'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const WATERFOWL_WMA_NAMES = new Set([
  'bicknell bottoms', 'browns park', 'clear lake', 'desert lake', 'farmington bay',
  'harold crane', 'howard slough', 'locomotive springs', 'ogden bay',
  'public shooting grounds', 'salt creek', 'timpie springs', 'topaz', 'willard spur'
]);

const HUNT_DATA_SOURCES = [
  {
    label: 'Combined master',
    required: true,
    candidates: [
      `${CLOUDFLARE_BASE}/utah-hunt-planner-master-all.json?v=${HUNT_DATA_VERSION}`,
      `./data/utah-hunt-planner-master-all.json?v=${HUNT_DATA_VERSION}`
    ]
  }
];

const HUNT_BOUNDARY_NAME_OVERRIDES = {
  DB1503: ['Manti, San Rafael'], DB1533: ['Manti, San Rafael'], DB1504: ['Nebo'], DB1534: ['Nebo'],
  DB1510: ['Monroe'], DB1540: ['Monroe'], DB1506: ['Fillmore'], DB1536: ['Fillmore'],
  EA1220: ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon'],
  EA1221: ['Fishlake/Thousand Lakes', 'Fishlake/Thousand Lakes East', 'Fishlake/Thousand Lakes West'],
  EA1258: ['La Sal Mtns', 'Dolores Triangle', 'La Sal, La Sal Mtns-North']
};

const huntPlannerMapStyle = [
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#aadaff' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] }
];

const HUNT_TYPE_ORDER = [ 'General Season', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'Management', 'Dedicated Hunter', 'CWMU', 'Private Land Only', 'Conservation', 'Once-in-a-Lifetime', 'Antlerless' ];
const HUNT_CLASS_ORDER = [ 'General Season', 'General Bull', 'Spike Only', 'Mature Bull', 'Limited Entry', 'Premium Limited Entry', 'Youth', 'Management', 'Antlerless', 'CWMU', 'Private Land Only', 'Conservation', 'Statewide Permit', 'Extended Archery' ];
const SEX_ORDER = ['Buck', 'Bull', 'Ram', 'Ewe', 'Bearded', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = [ 'Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason' ];
const DNR_ORANGE = '#ff6600';
const DNR_BROWN = '#4f2b14';
const KNOWN_OUTFITTER_COORDS = new Map([
  ['outfitter-wild-eyez-outfitters', { lat: 39.2574155, lng: -111.631482 }],
  ['wild eyez outfitters', { lat: 39.2574155, lng: -111.631482 }]
]);

let googleBaselineMap = null, cesiumViewer = null, huntUnitsLayer = null, cesiumHuntDataSource = null, googleApiReady = false, huntHoverFeature = null, selectedBoundaryFeature = null, huntData = [], huntBoundaryGeoJson = null, selectedBoundaryMatches = [], selectedHunt = null, selectionInfoWindow = null, usfsLayer = null, blmLayer = null, wildernessLayer = null, sitlaLayer = null, stateLandsLayer = null, stateParksLayer = null, wmaLayer = null, cwmuLayer = null, privateLayer = null, outfitters = [], outfitterMarkers = [], activeLoads = 0, currentGlobeBasemap = 'esriImagery', outfitterMarkerRunId = 0, suppressLandClickUntil = 0;
const outfitterGeocodeCache = new Map();
const outfitterMarkerIndex = new Map();

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
  const base = [getUnitName(h)];
  const overrides = Array.isArray(HUNT_BOUNDARY_NAME_OVERRIDES[code]) ? HUNT_BOUNDARY_NAME_OVERRIDES[code] : [];
  return [...new Set([...base, ...overrides].map(v => safe(v).trim()).filter(Boolean))];
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
function getHuntType(h) { return normalizeHuntTypeLabel(firstNonEmpty(h.huntType, h.HuntType, h.type)); }
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
    const weaponOk = excludeKey === 'weapon' || weapon === 'All' || hWeapon === weapon;
    const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || hHuntCategory === huntCategory;
    const unitOk = excludeKey === 'unit' || !unit || hUnit === unit;

    return searchOk && speciesOk && sexOk && huntTypeOk && weaponOk && huntCategoryOk && unitOk;
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
    blmDistricts: normalizeListValues(serviceArea.blmDistricts),
    countiesServed: normalizeListValues(serviceArea.countiesServed),
    wmasServed: normalizeListValues(serviceArea.wmasServed),
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
  if (event && event.target && event.target.id === 'speciesFilter') {
    if (sexFilter) sexFilter.value = 'All';
    if (huntTypeFilter) huntTypeFilter.value = 'All';
    if (weaponFilter) weaponFilter.value = 'All';
    if (huntCategoryFilter) huntCategoryFilter.value = 'All';
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
  getFilteredHunts('unit').forEach(h => {
    const unitValue = getUnitValue(h);
    if (unitValue) unitsMap.set(unitValue, getUnitName(h) || unitValue);
  });
  const unitOptions = Array.from(unitsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const prevUnit = unitFilter.value || '';
  const hasUnitSelection = !!prevUnit;
  if (!hasNonUnitSelections && !hasUnitSelection) {
    unitFilter.innerHTML = `<option value="">Select filters first</option>`;
    unitFilter.value = '';
  } else {
    unitFilter.innerHTML = `<option value="">All DWR Hunt Units</option>` + unitOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    unitFilter.value = unitOptions.some(([v]) => v === prevUnit) ? prevUnit : '';
  }
}

// --- CORE APP LOGIC ---
async function loadHuntData() {
  let merged = [];
  updateStatus('Loading hunt data...');
  for (let s of HUNT_DATA_SOURCES) {
    for (const candidate of s.candidates) {
      try {
        const resp = await fetch(candidate, { cache: 'no-store' });
        if (!resp.ok) continue;
        const json = await resp.json();
        const records = Array.isArray(json.records) ? json.records : (Array.isArray(json) ? json : []);
        if (records.length > 0) {
          merged.push(...records);
          console.log(`Successfully loaded ${records.length} hunts for ${s.label} from ${candidate}`);
          break;
        }
      } catch (e) {
        console.error(`Failed to load ${s.label} from ${candidate}.`, e);
      }
    }
  }
  huntData = merged;
  refreshSelectionMatrix();
  updateStatus(`Loaded ${huntData.length} hunts.`);
}

function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;
  const list = getDisplayHunts();
  updateStatus(
    !hasActiveMatrixSelections() && !selectedHunt
      ? 'Select filters or click a hunt unit to begin.'
      : `${list.length} matching hunt${list.length === 1 ? '' : 's'}`
  );
  container.innerHTML = list.length ? list.map(h => `
    <div class="hunt-card ${selectedHunt && getHuntCode(selectedHunt) === getHuntCode(h) ? 'is-selected' : ''}" data-hunt-code="${escapeHtml(getHuntCode(h))}" role="button" tabindex="0">
      <div class="hunt-card-title">${getHuntTitle(h)}</div>
      <div class="hunt-card-meta">${getUnitName(h)} | ${getWeapon(h)}</div>
      <div class="hunt-card-meta">${getDates(h)}</div>
    </div>`).join('') : '<div class="empty-note">Use the matrix or click a hunt unit to load matching hunts.</div>';
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
      closeSelectedHuntPopup();
      if (hunts.length) {
        window.selectHuntByCode(getHuntCode(hunts[0]));
      }
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
  const compactFloat = isMobileViewport();
  selectedHuntFloat.innerHTML = `
    <div style="position:relative;width:100%;max-width:100%;">
      <button type="button" data-close-selected-hunt-float aria-label="Close selected hunt" style="position:absolute;top:18px;right:20px;z-index:2;border:0;background:transparent;color:#5b3a24;padding:0;cursor:pointer;font-weight:900;font-size:24px;line-height:1;">X</button>
      ${buildDnrPlate(selectedHunt, compactFloat, !compactFloat)}
    </div>`;
  selectedHuntFloat.classList.add('is-open');
  selectedHuntFloat.setAttribute('aria-hidden', 'false');
  selectedHuntFloat.scrollTop = 0;
  selectedHuntFloat.querySelector('[data-close-selected-hunt-float]')?.addEventListener('click', () => {
    closeSelectedHuntFloat(true);
  });
  selectedHuntFloat.querySelector('[data-inline-hunt-details]')?.addEventListener('click', event => {
    event.preventDefault();
    openInlineHuntDetails(selectedHunt);
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
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#3653b3');
        entity.polygon.material = Cesium.Color.fromCssColorString('#3653b3').withAlpha(0.08);
        entity.polygon.outlineWidth = 2;
      }
      if (entity.polyline) {
        entity.polyline.width = 2;
        entity.polyline.material = Cesium.Color.fromCssColorString('#3653b3');
      }
      entity.show = false;
    });
  }
  updateCesiumBoundaryStyles();
  return cesiumHuntDataSource;
}

function getCesiumEntityMatches(entity) {
  const properties = entity?.properties;
  const boundaryId = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
  const boundaryName = normalizeBoundaryKey(
    properties?.Boundary_Name?.getValue?.()
    ?? properties?.BOUNDARY_NAME?.getValue?.()
    ?? properties?.BoundaryName?.getValue?.()
  );
  return huntData.filter(h => {
    const hBoundaryId = safe(getBoundaryId(h));
    const hUnitCode = normalizeBoundaryKey(getUnitCode(h));
    const hUnitName = normalizeBoundaryKey(getUnitName(h));
    return hBoundaryId === boundaryId || hUnitCode === boundaryName || hUnitName === boundaryName;
  });
}

function updateCesiumBoundaryStyles() {
  if (!cesiumHuntDataSource?.entities?.values || typeof Cesium === 'undefined') return;
  const showBoundaries = shouldShowHuntBoundaries();
  const showAllUnits = shouldShowAllHuntUnits();
  const filtered = getDisplayHunts();
  const boundaryIds = new Set(filtered.map(h => safe(getBoundaryId(h))).filter(Boolean));
  const unitCodes = new Set(filtered.map(h => normalizeBoundaryKey(getUnitCode(h))).filter(Boolean));
  const unitNames = new Set(filtered.map(h => normalizeBoundaryKey(getUnitName(h))).filter(Boolean));
  cesiumHuntDataSource.entities.values.forEach(entity => {
    const properties = entity.properties;
    const id = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
    const name = normalizeBoundaryKey(
      properties?.Boundary_Name?.getValue?.()
      ?? properties?.BOUNDARY_NAME?.getValue?.()
      ?? properties?.BoundaryName?.getValue?.()
    );
    const isMatch = showAllUnits || boundaryIds.has(id) || unitCodes.has(name) || unitNames.has(name);
    const isSelected = !!selectedHunt && (
      id === safe(getBoundaryId(selectedHunt))
      || name === normalizeBoundaryKey(getUnitCode(selectedHunt))
      || name === normalizeBoundaryKey(getUnitName(selectedHunt))
    );
    const visible = showBoundaries && isMatch;
    entity.show = visible;
    const strokeColor = Cesium.Color.fromCssColorString(isSelected ? '#c84f00' : '#3653b3');
    const fillColor = Cesium.Color.fromCssColorString(isSelected ? '#ff8a3d' : '#3653b3').withAlpha(isSelected ? 0.24 : 0.08);
    if (entity.polygon) {
      entity.polygon.outlineColor = strokeColor;
      entity.polygon.material = fillColor;
      entity.polygon.outlineWidth = isSelected ? 3 : 2;
    }
    if (entity.polyline) {
      entity.polyline.material = strokeColor;
      entity.polyline.width = isSelected ? 3 : 2;
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

window.selectHuntByCode = (code) => {
  const h = huntData.find(x => getHuntCode(x) === code);
  if (h) { 
    selectedHunt = h; 
    renderSelectedHunt(); 
    renderOutfitters();
    openSelectedHuntPopup();
    renderMatchingHunts();
    styleBoundaryLayer(); 
    zoomToSelectedBoundary(); 
  }
};

function renderSelectedHunt() {
  const p = document.getElementById('selectedHuntPanel');
  if (!selectedHunt) {
    if (p) {
      p.innerHTML = '<div class="empty-note">Select a hunt result or hunt unit to see details.</div>';
    }
    closeSelectedHuntFloat();
    return;
  }
  if (p) {
    p.innerHTML = `
      <div style="display:grid;gap:12px;">
        <div style="display:grid;gap:8px;padding:12px;border:1px solid #d6c1ae;border-radius:12px;background:var(--panel);">
          <div style="font-size:18px;font-weight:900;letter-spacing:.03em;text-transform:none;color:${DNR_ORANGE};line-height:1.06;">${escapeHtml(getPanelHeading(selectedHunt))}</div>
          <div style="font-size:28px;font-weight:900;line-height:0.95;color:${DNR_BROWN};">${escapeHtml(getHuntCode(selectedHunt))}</div>
          <div style="font-size:18px;font-weight:800;line-height:1.1;color:var(--text);">${escapeHtml(getUnitName(selectedHunt) || getHuntTitle(selectedHunt))}</div>
        </div>
        <div class="detail-grid">
          <div><strong>Species</strong>${escapeHtml(getSpeciesDisplay(selectedHunt))}</div>
          <div><strong>Sex</strong>${escapeHtml(getNormalizedSex(selectedHunt))}</div>
          <div><strong>Hunt Type</strong>${escapeHtml(getHuntType(selectedHunt))}</div>
          <div><strong>Weapon</strong>${escapeHtml(getWeapon(selectedHunt))}</div>
          <div><strong>Hunt Class</strong>${escapeHtml(getHuntCategory(selectedHunt))}</div>
          <div><strong>DWR Hunt Unit</strong>${escapeHtml(getUnitName(selectedHunt))}</div>
          <div style="grid-column:1 / -1;"><strong>Dates</strong>${escapeHtml(getDates(selectedHunt) || 'See official hunt details')}</div>
        </div>
      </div>`;
  }
  openSelectedHuntFloat();
}

function getMatchingOutfittersForHunt(hunt) {
  if (!hunt || !outfitters.length) return [];
  const species = normalizeBoundaryKey(getSpeciesDisplay(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const requiredUsfsForests = getRequiredUsfsForestsForHunt(hunt);
  const evaluated = outfitters.map(o => {
    const speciesServed = normalizeListValues(o.speciesServed).map(normalizeBoundaryKey);
    const unitsServed = normalizeListValues(o.unitsServed).map(normalizeBoundaryKey);
    const usfsForests = normalizeListValues(o.usfsForests).map(normalizeBoundaryKey);
    const speciesMatch = !speciesServed.length || speciesServed.includes(species);
    const unitMatch = !unitsServed.length
      || unitsServed.includes(unitCode)
      || unitsServed.includes(unitName)
      || unitsServed.some(u => unitName.includes(u) || u.includes(unitName) || unitCode.includes(u));
    const forestMatch = !requiredUsfsForests.length
      || (usfsForests.length && requiredUsfsForests.some(required => usfsForests.includes(required)));
    return { outfitter: o, speciesMatch, unitMatch, forestMatch };
  });

  const strongMatches = evaluated.filter(row => row.speciesMatch && row.unitMatch && row.forestMatch).map(row => row.outfitter);
  if (strongMatches.length) return strongMatches.slice(0, 12);

  const speciesOnlyMatches = evaluated.filter(row => row.speciesMatch && row.forestMatch).map(row => row.outfitter);
  return speciesOnlyMatches.slice(0, 12);
}

function renderOutfitters() {
  const container = document.getElementById('outfitterResults');
  if (!container) return;
  if (!selectedHunt) {
    container.innerHTML = '<div class="empty-note">Select a hunt to load matching vetted outfitters.</div>';
    clearOutfitterMarkers();
    return;
  }
  const matches = getMatchingOutfittersForHunt(selectedHunt);
  if (!matches.length) {
    container.innerHTML = '<div class="empty-note">No vetted outfitters matched this hunt yet.</div>';
    clearOutfitterMarkers();
    return;
  }
  container.innerHTML = matches.map(o => {
    const website = safe(o.website).trim();
    const phone = getOutfitterPrimaryPhone(o);
    const logo = safe(o.logoUrl).trim();
    const location = getOutfitterLocationText(o);
    const tags = getOutfitterSummaryTags(o).slice(0, 3);
    return `
      <div class="outfitter-card" data-outfitter-id="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}" role="button" tabindex="0" title="Zoom to ${escapeHtml(o.listingName || 'outfitter')}">
        <div class="outfitter-card-header">
          ${logo ? `<img class="outfitter-card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(o.listingName || 'Outfitter logo')}">` : ''}
          <div class="outfitter-card-title-wrap">
            <div class="hunt-card-title">${escapeHtml(o.listingName || 'Outfitter')}</div>
            <div class="outfitter-card-subline">${escapeHtml(firstNonEmpty(o.verificationStatus, o.certLevel, o.listingType, 'Outfitter'))}</div>
          </div>
        </div>
        ${location ? `<div class="outfitter-card-subline">${escapeHtml(location)}</div>` : ''}
        ${tags.length ? `<div class="outfitter-card-meta-row">${tags.map(tag => `<span class="outfitter-card-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <div class="outfitter-card-actions">
          <button type="button" class="outfitter-action-btn primary" data-outfitter-focus="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}">Map Link</button>
          ${website ? `<a class="outfitter-action-btn" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
        </div>
        ${phone ? `<div class="hunt-card-meta">${escapeHtml(phone)}</div>` : ''}
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
  return normalizeListValues(outfitter.phone)[0] || '';
}
function getOutfitterSummaryTags(outfitter) {
  const tags = [];
  const listingType = firstNonEmpty(outfitter.verificationStatus, outfitter.certLevel, outfitter.listingType);
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
  const location = getOutfitterLocationText(outfitter);
  const tags = getOutfitterSummaryTags(outfitter).slice(0, 4);
  return `
    <div style="display:grid;gap:10px;min-width:280px;max-width:340px;">
      <div style="display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:12px;">
        ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)} logo" style="width:58px;height:58px;object-fit:cover;object-position:center;border-radius:12px;background:#fff;padding:3px;border:1px solid #d6c1ae;box-shadow:0 6px 14px rgba(0,0,0,.14);">` : ''}
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">Vetted Outfitter</div>
          <div style="font-size:17px;font-weight:900;color:#2b1c12;line-height:1.15;">${escapeHtml(name)}</div>
        </div>
      </div>
      ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${tags.map(tag => `<span style="display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:rgba(214,106,31,.11);border:1px solid rgba(214,106,31,.2);font-size:12px;font-weight:800;color:#3b2417;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${location ? `<div style="font-size:13px;color:#6b5646;line-height:1.35;">${escapeHtml(location)}</div>` : ''}
      ${phone ? `<div style="font-size:13px;color:#6b5646;">${escapeHtml(phone)}</div>` : ''}
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
    const directLocation = new google.maps.LatLng(outfitter.latitude, outfitter.longitude);
    outfitterGeocodeCache.set(key, directLocation);
    return Promise.resolve(directLocation);
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
          const result = status === 'OK' && results?.[0]?.geometry?.location ? results[0].geometry.location : null;
          done(result);
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
  for (const outfitter of matches.slice(0, 8)) {
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
  const count = [toggleUSFS, toggleBLM].filter(el => !!el?.checked).length;
  federalLayersSummary.innerHTML = count ? `Federal <span class="toggle-menu-count">(${count})</span>` : 'Federal';
}
function updatePrivateLayersSummary() {
  if (!privateLayersSummary) return;
  const count = [togglePrivate, toggleCwmu].filter(el => !!el?.checked).length;
  privateLayersSummary.innerHTML = count ? `Private <span class="toggle-menu-count">(${count})</span>` : 'Private';
}

function openSelectedHuntPopup() {
  if (!googleBaselineMap || !huntUnitsLayer || !selectedHunt) {
    closeSelectedHuntPopup();
    return;
  }
  const boundaryId = safe(getBoundaryId(selectedHunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(selectedHunt));
  const unitName = normalizeBoundaryKey(getUnitName(selectedHunt));
  let popupPosition = null;
  let found = false;

  huntUnitsLayer.forEach(f => {
    const featureBoundaryId = safe(f.getProperty('BoundaryID'));
    const featureName = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (featureBoundaryId === boundaryId || featureName === unitCode || featureName === unitName) {
      const bounds = new google.maps.LatLngBounds();
      f.getGeometry().forEachLatLng(ll => bounds.extend(ll));
      popupPosition = bounds.getCenter();
      selectedBoundaryFeature = f;
      found = true;
    }
  });

  if (!found || !popupPosition) {
    closeSelectedHuntPopup();
    return;
  }

  closeSelectionInfoWindow();
  closeSelectedHuntPopup();
  openSelectedHuntFloat();
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
  return huntData.filter(h => {
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
        <img src="${LOGO_DNR}" alt="Utah DNR logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;border:1px solid #d6c1ae;">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">DWR Hunt Unit</div>
          <div style="font-size:15px;font-weight:900;color:#2b1c12;">Multiple Matching Hunts</div>
        </div>
      </div>
      ${matches.slice(0, 8).map(h => `
        <button type="button" data-popup-hunt-code="${escapeHtml(getHuntCode(h))}" style="text-align:left;border:1px solid #d6c1ae;border-radius:10px;background:#fffdf8;padding:10px;cursor:pointer;color:#2b1c12;">
          <div style="font-weight:900;">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
          <div style="font-size:12px;color:#6b5646;">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getWeapon(h))}</div>
        </button>
      `).join('')}
    </div>`;
}

function openMapChooser(feature, matches) {
  if (!mapChooser || !mapChooserBody || !mapChooserTitle || !mapChooserKicker) return;
  closeSelectedHuntFloat();
  selectedBoundaryMatches = matches.slice();
  const boundaryName = firstNonEmpty(feature?.getProperty('Boundary_Name'), 'Selected Unit');
  mapChooserKicker.textContent = 'Selected Unit';
  mapChooserTitle.textContent = boundaryName;
  mapChooserBody.innerHTML = matches.length ? matches.slice(0, 12).map(h => `
    <div class="map-chooser-card" data-popup-hunt-code="${escapeHtml(getHuntCode(h))}" role="button" tabindex="0">
      <div class="hunt-card-title">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getHuntType(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getWeapon(h))} | ${escapeHtml(getDates(h) || 'See official hunt details')}</div>
    </div>
  `).join('') : '<div class="map-chooser-empty">No matching hunts found for this boundary.</div>';
  mapChooser.classList.add('is-open');
  mapChooser.setAttribute('aria-hidden', 'false');
  mapChooserBody.querySelectorAll('[data-popup-hunt-code]').forEach(card => {
    const select = () => {
      closeSelectedHuntPopup();
      window.selectHuntByCode(card.getAttribute('data-popup-hunt-code'));
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

function openBoundaryPopup(feature, latLng) {
  if (!googleBaselineMap || !feature || !latLng) return;
  const matches = getFeatureMatches(feature);
  selectedBoundaryFeature = feature;
  selectedBoundaryMatches = matches.slice();
  if (matches.length > 1) {
    closeSelectionInfoWindow();
    openMapChooser(feature, matches);
    return;
  }
  closeSelectedHuntPopup();
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  selectedHunt = matches[0] || null;
  renderSelectedHunt();
  renderOutfitters();
  renderMatchingHunts();
  styleBoundaryLayer();
}

async function loadOutfitters() {
  for (const candidate of OUTFITTERS_DATA_SOURCES) {
    try {
      const resp = await fetch(candidate, { cache: 'no-store' });
      if (!resp.ok) continue;
      const json = await resp.json();
      const normalized = normalizeOutfitterList(json);
      if (normalized.length) {
        outfitters = normalized;
        return;
      }
    } catch (error) {
      console.error('Failed to load outfitters from', candidate, error);
    }
  }
  outfitters = [];
}

async function fetchGeoJson(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
async function fetchFirstGeoJson(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      return await fetchGeoJson(url);
    } catch (error) {
      lastError = error;
      console.error('Failed to load GeoJSON from', url, error);
    }
  }
  throw lastError || new Error('No GeoJSON source succeeded');
}
async function fetchJson(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
async function fetchArcGisPagedGeoJson(layerUrl, where, pageSize = 2000) {
  const allFeatures = [];
  let offset = 0;
  while (true) {
    const url = `${layerUrl}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=${pageSize}&resultOffset=${offset}`;
    const geojson = await fetchGeoJson(url);
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    allFeatures.push(...features);
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return {
    type: 'FeatureCollection',
    features: allFeatures
  };
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
    { strokeColor: '#2a78d2', strokeWeight: 2, fillColor: '#6fb3ff', fillOpacity: 0.08, zIndex: 18 },
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
    { strokeColor: '#2f8f9a', strokeWeight: 2, fillColor: '#6ac7d2', fillOpacity: 0.08, zIndex: 17 },
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
    zIndex: 19
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
    strokeColor: '#7a2cb8',
    strokeWeight: 2.5,
    fillColor: '#be8cff',
    fillOpacity: 0.1,
    zIndex: 20
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
    strokeColor: '#7c2fa1',
    strokeWeight: 2,
    fillColor: '#b47ad2',
    fillOpacity: 0.08,
    zIndex: 18
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
    { strokeColor: '#8f4a3a', strokeWeight: 1.5, fillColor: '#c99284', fillOpacity: 0.05, zIndex: 16 },
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
    zIndex: 30
  });
  usfsLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
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
  const geojson = await fetchGeoJson(BLM_QUERY_URL);
  blmLayer = new google.maps.Data();
  blmLayer.addGeoJson(geojson);
  blmLayer.setStyle({
    strokeColor: '#b9722f',
    strokeWeight: 2,
    fillColor: '#d8af7b',
    fillOpacity: 0.04,
    zIndex: 12
  });
  blmLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
    if (resolveOutfitterPriorityClick(event.latLng)) return;
    openLandInfoWindow(buildLandInfoCard({
      logo: LOGO_BLM,
      title: firstNonEmpty(
        event.feature.getProperty('ADMU_NAME'),
        event.feature.getProperty('DISTRICT_NAME'),
        event.feature.getProperty('FIELD_OFFICE'),
        'BLM Land'
      ),
      subtitle: 'Bureau of Land Management',
      logoSize: 68
    }), event.latLng);
  });
  setLayerVisibility(blmLayer, !!toggleBLM?.checked);
  return blmLayer;
}
async function ensureWildernessLayer() {
  if (wildernessLayer || !googleBaselineMap) return wildernessLayer;
  const geojson = await fetchGeoJson(WILDERNESS_QUERY_URL);
  wildernessLayer = new google.maps.Data();
  wildernessLayer.addGeoJson(geojson);
  wildernessLayer.setStyle(feature => {
    const agency = safe(feature.getProperty('Agency')).toUpperCase();
    const isUsfs = agency === 'FS';
    return {
      strokeColor: isUsfs ? '#1f5130' : '#8a611d',
      strokeWeight: 2,
      strokeOpacity: 0.9,
      fillColor: isUsfs ? '#7f9f74' : '#c8a76f',
      fillOpacity: 0.12,
      zIndex: 31
    };
  });
  wildernessLayer.addListener('click', event => {
    if (shouldSuppressLandClick()) return;
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
  const handler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
  handler.setInputAction((movement) => {
    const picked = cesiumViewer.scene.pick(movement.position);
    const entity = picked?.id;
    if (!entity?.properties) return;
    const matches = getCesiumEntityMatches(entity);
    if (!matches.length) return;
    if (matches.length === 1) {
      window.selectHuntByCode(getHuntCode(matches[0]));
      return;
    }
    selectedBoundaryMatches = matches.slice();
    if (mapChooser && mapChooserBody && mapChooserTitle && mapChooserKicker) {
      mapChooserKicker.textContent = 'Selected Unit';
      mapChooserTitle.textContent = firstNonEmpty(
        entity.properties?.Boundary_Name?.getValue?.(),
        entity.properties?.BOUNDARY_NAME?.getValue?.(),
        'Selected Unit'
      );
      mapChooserBody.innerHTML = matches.slice(0, 12).map(h => `
        <div class="map-chooser-card" data-popup-hunt-code="${escapeHtml(getHuntCode(h))}" role="button" tabindex="0">
          <div class="hunt-card-title">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
          <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getHuntType(h))}</div>
          <div class="map-chooser-meta">${escapeHtml(getWeapon(h))} | ${escapeHtml(getDates(h) || 'See official hunt details')}</div>
        </div>
      `).join('');
      mapChooser.classList.add('is-open');
      mapChooser.setAttribute('aria-hidden', 'false');
      mapChooserBody.querySelectorAll('[data-popup-hunt-code]').forEach(card => {
        const select = () => {
          closeSelectedHuntPopup();
          window.selectHuntByCode(card.getAttribute('data-popup-hunt-code'));
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
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function applyMapMode() {
  const value = safe(mapTypeSelect?.value || 'terrain').toLowerCase();
  const mapWrap = document.querySelector('.map-wrap');
  if (!googleBaselineMap || !mapWrap) return;

  if (value === 'globe') {
    googleBaselineMap.getStreetView()?.setVisible(false);
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
  const boundaryId = safe(getBoundaryId(selectedHunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(selectedHunt));
  const unitName = normalizeBoundaryKey(getUnitName(selectedHunt));
  let center = null;
  huntUnitsLayer.forEach(f => {
    const id = safe(f.getProperty('BoundaryID'));
    const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (id === boundaryId || name === unitCode || name === unitName) {
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
  if (toggleBLM?.checked) ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
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
  updateStatus('Map ready. Select filters or click a hunt unit.');
  bindControls();
}

function buildBoundaryLayer() {
  huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
  if (huntBoundaryGeoJson) {
      huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
      huntUnitsLayer.setStyle({ strokeColor: '#3653b3', strokeWeight: 1, fillOpacity: 0.05 });
      huntUnitsLayer.addListener('click', event => {
        const matches = getFeatureMatches(event.feature);
        if (!matches.length) return;
        if (matches.length === 1) {
          window.selectHuntByCode(getHuntCode(matches[0]));
        } else {
          openBoundaryPopup(event.feature, event.latLng);
        }
      });
      styleBoundaryLayer();
  }
}

function styleBoundaryLayer() {
    if (!huntUnitsLayer) return;
    const showBoundaries = shouldShowHuntBoundaries();
    const showAllUnits = shouldShowAllHuntUnits();
    const filtered = getDisplayHunts();
    const boundaryIds = new Set(filtered.map(h => safe(getBoundaryId(h))).filter(Boolean));
    const unitCodes = new Set(filtered.map(h => normalizeBoundaryKey(getUnitCode(h))).filter(Boolean));
    const unitNames = new Set(filtered.map(h => normalizeBoundaryKey(getUnitName(h))).filter(Boolean));
    huntUnitsLayer.setStyle(f => {
        const id = safe(f.getProperty('BoundaryID'));
        const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
        const isMatch = showAllUnits || boundaryIds.has(id) || unitCodes.has(name) || unitNames.has(name);
        const isSelected = selectedHunt && (id === safe(getBoundaryId(selectedHunt)) || name === normalizeBoundaryKey(getUnitCode(selectedHunt)) || name === normalizeBoundaryKey(getUnitName(selectedHunt)));
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
    if (typeof window !== 'undefined' && document.getElementById('matchingHunts')) {
      document.getElementById('matchingHunts').scrollTop = 0;
    }
    if (count === 1) {
      window.selectHuntByCode(getHuntCode(results[0]));
      updateStatus('1 matching hunt applied and selected.');
    } else if (getSelectedUnitGroups().length > 1 && !safe(unitFilter?.value).trim()) {
      openSelectedUnitsChooser();
      updateStatus(`${count} matching hunts across ${getSelectedUnitGroups().length} selected units.`);
    } else {
      updateStatus(`${count} matching hunt${count === 1 ? '' : 's'} applied.`);
    }
  });
  clearFiltersBtn?.addEventListener('click', resetAllFilters);
  document.getElementById('matchingHunts')?.addEventListener('click', event => {
    const card = event.target.closest('[data-hunt-code]');
    if (!card) return;
    window.selectHuntByCode(card.getAttribute('data-hunt-code'));
  });
  document.getElementById('matchingHunts')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-hunt-code]');
    if (!card) return;
    event.preventDefault();
    window.selectHuntByCode(card.getAttribute('data-hunt-code'));
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
  window.addEventListener('resize', () => {
    if (selectedHunt && selectedHuntFloat?.classList.contains('is-open')) {
      openSelectedHuntFloat();
    }
  });
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
    if (shouldShowWildernessOverlay()) await ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
    updateWildernessOverlayVisibility();
    if (toggleUSFS?.checked) {
      setLayerVisibility(usfsLayer, false);
      setLayerVisibility(usfsLayer, true);
    }
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
  const boundaryId = safe(getBoundaryId(selectedHunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(selectedHunt));
  const unitName = normalizeBoundaryKey(getUnitName(selectedHunt));
  
  huntUnitsLayer.forEach(f => {
    const featureBoundaryId = safe(f.getProperty('BoundaryID'));
    const featureName = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
    if (featureBoundaryId === boundaryId || featureName === unitCode || featureName === unitName) {
      f.getGeometry().forEachLatLng(ll => { bounds.extend(ll); found = true; });
    }
  });
  if (found) googleBaselineMap.fitBounds(bounds);
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', async () => {
  // Load Map
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&callback=initGoogleBaseline`;
  document.head.appendChild(script);
  
  // Load Data
  await loadHuntData();
  await loadOutfitters();
  try {
      huntBoundaryGeoJson = await fetchFirstGeoJson(HUNT_BOUNDARY_SOURCES);
      if (googleApiReady) buildBoundaryLayer();
  } catch(e) { console.error("GeoJSON load failed", e); }

  refreshSelectionMatrix();
  renderMatchingHunts();
});

function sortWithPreferredOrder(arr, pref) {
    const map = new Map(pref.map((v, i) => [v, i]));
    return arr.sort((a, b) => (map.has(a) ? map.get(a) : 99) - (map.has(b) ? map.get(b) : 99));
}
