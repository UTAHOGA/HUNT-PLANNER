const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const HUNT_DATA_VERSION = '20260324-master-1733';
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMjBiODg4NS1mMDNkLTRjNTYtOGQxZi1jMmY4ZjdhMTIxMGIiLCJpZCI6NDA3MDE1LCJpYXQiOjE3NzQwODk2NzF9.2nojSCO46EKYlLpsj3YQ5fGDj_z92PjmL-w1mdhfHfI';

const HUNT_DATA_SOURCES = [
  {
    label: 'Utah Hunt Planner Master',
    required: true,
    candidates: [
      `${CLOUDFLARE_BASE}/utah-hunt-planner-master-all.json?v=${HUNT_DATA_VERSION}`,
      `./data/utah-hunt-planner-master-all.json?v=${HUNT_DATA_VERSION}`
    ]
  }
];

const HUNT_BOUNDARY_SOURCES = [
  'https://json.uoga.workers.dev/hunt-boundaries',
  './data/hunt_boundaries.geojson'
];
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`, './data/outfitters.json'];
const USFS_QUERY_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" + encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") + "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";
const BLM_QUERY_URL = 'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const LAND_OWNERSHIP_BASE_URL = 'https://gis.trustlands.utah.gov/mapping/rest/services/Land_Ownership/FeatureServer/0/query';
const LAND_OWNERSHIP_OUT_FIELDS = 'owner,agency,admin,desig,state_lgd,ut_lgd,natl_lgd,label_federal,label_state,county,gis_acres';
const SITLA_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("admin='SITLA'")}&outFields=${encodeURIComponent(LAND_OWNERSHIP_OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=geojson`;
const STATE_LANDS_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("owner='State' AND admin IN ('OS','FFSL')")}&outFields=${encodeURIComponent(LAND_OWNERSHIP_OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=geojson`;
const STATE_PARKS_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("admin='USP'")}&outFields=${encodeURIComponent(LAND_OWNERSHIP_OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=geojson`;
const WMA_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("admin='UDWR' AND desig='Wildlife Reserve/Management Area'")}&outFields=${encodeURIComponent(LAND_OWNERSHIP_OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=geojson`;
const PRIVATE_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("owner='Private'")}&outFields=${encodeURIComponent(LAND_OWNERSHIP_OUT_FIELDS)}&returnGeometry=true&outSR=4326&f=geojson`;
const ARCGIS_PAGE_SIZE = 2000;
const OFFICIAL_WATERFOWL_WMA_NAMES = [
  'Bicknell Bottoms WMA',
  'Browns Park WMA',
  'Clear Lake WMA',
  'Desert Lake WMA',
  'Farmington Bay WMA',
  'Harold Crane WMA',
  'Howard Slough WMA',
  'Locomotive Springs WMA',
  'Ogden Bay WMA',
  'Public Shooting Grounds WMA',
  'Salt Creek WMA',
  'Timpie Springs WMA',
  'Topaz WMA',
  'Willard Spur WMA'
];

const HUNT_BOUNDARY_NAME_OVERRIDES = {
  DB1503: ['Manti, San Rafael'],
  DB1533: ['Manti, San Rafael'],
  DB1504: ['Nebo'],
  DB1534: ['Nebo'],
  DB1510: ['Monroe'],
  DB1540: ['Monroe'],
  DB1506: ['Fillmore'],
  DB1536: ['Fillmore'],
  EA1220: ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon'],
  EA1221: ['Fishlake/Thousand Lakes', 'Fishlake/Thousand Lakes East', 'Fishlake/Thousand Lakes West'],
  EA1258: ['La Sal Mtns', 'Dolores Triangle', 'La Sal, La Sal Mtns-North']
};

const HUNT_TYPE_ORDER = ['General', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'CWMU', 'Private Lands Only', 'Management', 'Dedicated Hunter', 'Conservation', 'Tribal', 'Cactus Buck', 'Once-in-a-Lifetime', 'Antlerless'];
const HUNT_CATEGORY_ORDER = ['Mature Bull', 'General Bull', 'Spike Only', 'Youth', 'Extended Archery', 'Private Land Only', 'Antlerless'];
const SEX_ORDER = ['Buck', 'Bull', 'Ram', 'Ewe', 'Bearded', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = ['Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason', 'Pursuit', 'Spot and Stalk', 'Control'];

const huntPlannerMapStyle = [
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#aadaff' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] }
];

let googleBaselineMap = null;
let huntUnitsLayer = null;
let googleApiReady = false;
let huntBoundaryGeoJson = null;
let huntData = [];
let outfitters = [];
let selectedHunt = null;
let selectedBoundaryMatches = [];
let isDataReady = false;
let isMapReady = false;
let boundaryInfoWindow = null;
let boundaryHoverInfoWindow = null;
let overlayInfoWindow = null;
let utahOutlinePolygon = null;
let usfsLayer = null;
let blmLayer = null;
let sitlaLayer = null;
let stateLandsLayer = null;
let stateParksLayer = null;
let wildlifeWmaLayer = null;
let waterfowlWmaLayer = null;
let privateLayer = null;
let cesiumViewer = null;
let cesiumReady = false;
let activeMapMode = 'terrain';
let globeSelectionEntity = null;

const searchInput = document.getElementById('searchInput');
const speciesFilter = document.getElementById('speciesFilter');
const sexFilter = document.getElementById('sexFilter');
const weaponFilter = document.getElementById('weaponFilter');
const huntTypeFilter = document.getElementById('huntTypeFilter');
const huntCategoryFilter = document.getElementById('huntCategoryFilter');
const unitFilter = document.getElementById('unitFilter');
const mapTypeSelect = document.getElementById('mapTypeSelect');
const resetViewBtn = document.getElementById('resetViewBtn');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const closeMapChooserBtn = document.getElementById('closeMapChooserBtn');
const matchingHuntsEl = document.getElementById('matchingHunts');
const selectedHuntPanel = document.getElementById('selectedHuntPanel');
const outfitterResultsEl = document.getElementById('outfitterResults');
const toggleUSFS = document.getElementById('toggleUSFS');
const toggleBLM = document.getElementById('toggleBLM');
const toggleSITLA = document.getElementById('toggleSITLA');
const toggleStateLands = document.getElementById('toggleStateLands');
const toggleStateParks = document.getElementById('toggleStateParks');
const toggleWma = document.getElementById('toggleWma');
const togglePrivate = document.getElementById('togglePrivate');
const toggleDwrUnits = document.getElementById('toggleDwrUnits');
const toggleOutfitters = document.getElementById('toggleOutfitters');
const mapWrapEl = document.querySelector('.map-wrap');
const globeMapEl = document.getElementById('globeMap');
const OFFICIAL_DWR_WMA_PAGE_URL = 'https://wildlife.utah.gov/discover/lands/wmas.html';
const OFFICIAL_DWR_WATERFOWL_MAPS_URL = 'https://wildlife.utah.gov/hunting/maps.html';
const OFFICIAL_DWR_WATERFOWL_CONDITIONS_URL = 'https://wildlife.utah.gov/waterfowl-opener-conditions';
const OFFICIAL_DWR_WMA_LOGO_URL = './assets/logos/dwr-wma.jpg';
const OFFICIAL_DNR_DWR_LOGO_URL = './assets/logos/dnr-logo-small.bmp';
const OFFICIAL_USFS_PAGE_URL = 'https://www.fs.usda.gov/';
const OFFICIAL_USFS_LOGO_URL = './assets/logos/usfs.png';
const OFFICIAL_BLM_PAGE_URL = 'https://www.blm.gov/office/utah-state-office';
const OFFICIAL_BLM_LOGO_URL = './assets/logos/blm.png';
const OFFICIAL_SITLA_PAGE_URL = 'https://trustlands.utah.gov/';
const OFFICIAL_SITLA_LOGO_URL = './assets/logos/sitla.png';
const OFFICIAL_STATE_PARKS_PAGE_URL = 'https://stateparks.utah.gov/';
const OFFICIAL_STATE_PARKS_LOGO_URL = './assets/logos/state-parks.png';
const stateLayersSummaryEl = document.getElementById('stateLayersSummary');

function safe(value) {
  return String(value ?? '');
}

function escapeHtml(value) {
  return safe(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstNonEmpty() {
  for (let i = 0; i < arguments.length; i += 1) {
    const text = safe(arguments[i]).trim();
    if (text) return text;
  }
  return '';
}

function titleCaseWords(value) {
  return safe(value)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function slugify(value) {
  return safe(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function listify(value) {
  if (Array.isArray(value)) return value.map(v => safe(v).trim()).filter(Boolean);
  return safe(value).split(/[;,|]/).map(v => safe(v).trim()).filter(Boolean);
}

function sortWithPreferredOrder(values, preferredOrder) {
  const rank = new Map(preferredOrder.map((value, index) => [value, index]));
  return values.sort((a, b) => {
    const aRank = rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER;
    const bRank = rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function updateStatus(message) {
  const statusEl = document.getElementById('status');
  const loadingText = document.getElementById('loadingText');
  if (statusEl) statusEl.textContent = message;
  if (loadingText) loadingText.textContent = message;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function getOfficialDwrHuntUrl(hunt) {
  const huntCode = safe(getHuntCode(hunt)).trim();
  if (!huntCode) return 'https://dwrapps.utah.gov/huntboundary/hbstart';
  return `https://dwrapps.utah.gov/huntboundary/PrintABoundary?HN=${encodeURIComponent(huntCode)}`;
}

function maybeFinishLoading() {
  if (isDataReady && isMapReady) {
    updateStatus('Google hunt planner is ready. Use filters or click a hunt boundary.');
    hideLoadingOverlay();
  }
}

function setMapChooserOpen(isOpen) {
  const chooser = document.getElementById('mapChooser');
  if (!chooser) return;
  chooser.classList.toggle('is-open', isOpen);
  chooser.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function updateStateLayersSummary() {
  if (!stateLayersSummaryEl) return;
  const toggles = [toggleStateLands, toggleStateParks, toggleWma];
  const activeCount = toggles.filter(toggle => toggle && toggle.checked).length;
  stateLayersSummaryEl.textContent = activeCount ? `State Lands (${activeCount})` : 'State Lands';
}

function getHuntCode(hunt) {
  return firstNonEmpty(hunt.huntCode, hunt.hunt_code, hunt.HuntCode, hunt.code, hunt.Code);
}

function getHuntTitle(hunt) {
  return firstNonEmpty(hunt.title, hunt.Title, hunt.huntTitle, hunt.hunt_title, getHuntCode(hunt));
}

function getUnitCode(hunt) {
  return firstNonEmpty(hunt.unitCode, hunt.unit_code, hunt.UnitCode, hunt.UNIT_CODE, hunt.unit, hunt.Unit);
}

function getUnitName(hunt) {
  return firstNonEmpty(hunt.unitName, hunt.unit_name, hunt.UnitName, hunt.UNIT_NAME, getUnitCode(hunt));
}

function getUnitValue(hunt) {
  return firstNonEmpty(getUnitCode(hunt), getUnitName(hunt));
}

function normalizeWeaponLabel(rawValue, hunt) {
  const raw = safe(rawValue).trim();
  const lower = raw.toLowerCase();
  if (!raw) return '';
  if (lower.startsWith('any legal weapon')) return 'Any Legal Weapon';
  if (lower === 'dedicated hunter') return 'Multiseason';
  if (lower.includes('hamss')) return 'HAMSS';
  if (lower === 'archery') return 'Archery';
  if (lower === 'extended archery') return 'Extended Archery';
  if (lower === 'restricted archery') return 'Restricted Archery';
  if (lower === 'muzzleloader') return 'Muzzleloader';
  if (lower === 'restricted muzzleloader') return 'Restricted Muzzleloader';
  if (lower === 'restricted rifle') return 'Restricted Rifle';
  if (lower === 'multiseason') return 'Multiseason';
  if (lower === 'restricted multiseason') return 'Restricted Multiseason';
  if (lower === 'pursuit') return 'Pursuit';
  if (lower === 'spot and stalk') return 'Spot and Stalk';
  if (lower === 'control') return 'Control';
  return raw;
}

function getWeaponFilterValues(hunt) {
  const raw = safe(firstNonEmpty(hunt.weapon, hunt.Weapon, hunt.WEAPON)).trim();
  const lower = raw.toLowerCase();
  const normalized = normalizeWeaponLabel(raw, hunt);

  if (!raw && !normalized) return [];
  if (lower === 'archery, muzzleloader, shotgun') {
    return ['Archery', 'Muzzleloader', 'HAMSS'];
  }

  return normalized ? [normalized] : [];
}

function getWeapon(hunt) {
  return normalizeWeaponLabel(firstNonEmpty(hunt.weapon, hunt.Weapon, hunt.WEAPON), hunt);
}

function getDates(hunt) {
  return firstNonEmpty(hunt.seasonLabel, hunt.seasonDates, hunt.dates, hunt.Dates);
}

function normalizeHuntTypeLabel(rawValue, hunt) {
  const raw = safe(rawValue).trim();
  const lower = raw.toLowerCase();
  if (!raw) return '';
  if (lower === 'management buck deer') return 'Management';
  if (lower === 'antlerless elk control') return 'Antlerless';
  if (lower === 'private land only') return 'Private Lands Only';
  if (lower === 'cwmu') return 'CWMU';
  if (lower === 'limited entry') return 'Limited Entry';
  if (lower === 'premium limited entry') return 'Premium Limited Entry';
  if (lower === 'general season' || lower === 'general') return 'General';
  if (lower === 'once-in-a-lifetime') return 'Once-in-a-Lifetime';
  if (lower === 'cactus buck') return 'Cactus Buck';
  if (lower === 'dedicated hunter') return 'Dedicated Hunter';
  if (lower === 'conservation') return 'Conservation';
  if (lower === 'tribal') return 'Tribal';
  if (lower === 'management') return 'Management';
  if (lower === 'youth') return 'Youth';
  if (lower === 'antlerless') return 'Antlerless';
  return raw;
}

function getHuntType(hunt) {
  return normalizeHuntTypeLabel(firstNonEmpty(hunt.huntType, hunt.HuntType, hunt.hunt_type, hunt.type, hunt.Type), hunt);
}

function getHuntCategory(hunt) {
  const raw = safe(firstNonEmpty(hunt.huntCategory, hunt.HuntCategory, hunt.hunt_category)).trim();
  const lower = raw.toLowerCase();
  const huntType = getHuntType(hunt);
  const sex = getNormalizedSex(hunt);
  const title = getHuntTitle(hunt).toLowerCase();

  if (lower === 'mature bull' || lower === 'general bull' || lower === 'spike only' || lower === 'youth' || lower === 'extended archery' || lower === 'private land only' || lower === 'antlerless') {
    return titleCaseWords(raw);
  }
  if (lower === 'cwmu' || huntType === 'CWMU' || huntType === 'Private Lands Only' || lower.includes('private land')) {
    return 'Private Land Only';
  }
  if (lower.includes('extended archery') || title.includes('extended archery')) {
    return 'Extended Archery';
  }
  if (lower.includes('spike') || title.includes('spike')) {
    return 'Spike Only';
  }
  if (lower.includes('general bull')) {
    return 'General Bull';
  }
  if (lower.includes('mature bull')) {
    return 'Mature Bull';
  }
  if (huntType === 'Youth' || lower === 'youth') {
    return 'Youth';
  }
  if (sex === 'Antlerless' || lower.includes('antlerless') || lower === 'ewe' || lower === 'doe') {
    return 'Antlerless';
  }
  if (getSpeciesDisplay(hunt) === 'Elk' && sex === 'Bull' && huntType === 'Limited Entry') {
    return 'Mature Bull';
  }
  if (getSpeciesDisplay(hunt) === 'Elk' && sex === 'Bull' && huntType === 'General') {
    return 'General Bull';
  }
  return '';
}

function getSpeciesRaw(hunt) {
  return firstNonEmpty(hunt.species, hunt.Species, hunt.SPECIES);
}

function getSpeciesList(hunt) {
  return getSpeciesRaw(hunt).split(',').map(v => v.trim()).filter(Boolean);
}

function normalizeSpeciesLabel(value) {
  const text = safe(value).trim().toLowerCase();
  if (!text) return '';
  if (text === 'mule deer' || text === 'deer') return 'Deer';
  return titleCaseWords(text);
}

function getSpeciesDisplayLabel(hunt, rawSpeciesValue) {
  const normalized = normalizeSpeciesLabel(rawSpeciesValue);
  const huntCategory = safe(firstNonEmpty(hunt && hunt.huntCategory, hunt && hunt.HuntCategory, hunt && hunt.hunt_category)).trim().toLowerCase();
  const title = safe(getHuntTitle(hunt)).trim().toLowerCase();

  if (normalized === 'Bighorn Sheep') {
    if (huntCategory.includes('rocky mountain bighorn') || title.includes('rocky mountain bighorn')) {
      return 'Rocky Mountain Bighorn Sheep';
    }
    if (huntCategory.includes('desert bighorn') || title.includes('desert bighorn')) {
      return 'Desert Bighorn Sheep';
    }
  }

  return normalized;
}

function getSpeciesDisplayList(hunt) {
  return Array.from(new Set(getSpeciesList(hunt).map(value => getSpeciesDisplayLabel(hunt, value)).filter(Boolean)));
}

function getSpeciesDisplay(hunt) {
  return getSpeciesDisplayList(hunt)[0] || normalizeSpeciesLabel(getSpeciesRaw(hunt));
}

function getNormalizedSex(valueOrHunt) {
  const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex, valueOrHunt.SEX);
  const hunt = typeof valueOrHunt === 'object' ? valueOrHunt : null;
  const lower = raw.toLowerCase();
  const species = hunt ? getSpeciesDisplay(hunt).toLowerCase() : '';
  if (lower.includes('choice')) return "Hunter's Choice";
  if (lower === 'either' || lower.includes('either sex')) return 'Either Sex';
  if (species.includes('bighorn sheep')) {
    if (lower === 'ram' || lower === 'male only') return 'Ram';
    if (lower === 'ewe' || lower.includes('antlerless')) return 'Ewe';
  }
  if (species.includes('turkey')) {
    if (lower.includes('bearded')) return 'Bearded';
    if (lower === 'either' || lower.includes('either sex')) return 'Either Sex';
  }
  if (lower === 'doe' || lower === 'cow' || lower === 'ewe' || lower.includes('antlerless')) return 'Antlerless';
  if (lower.includes('buck')) return 'Buck';
  if (lower.includes('bull')) return 'Bull';
  if (lower === 'ram') return 'Ram';
  if (lower === 'male only') {
    if (species.includes('elk') || species.includes('moose') || species.includes('bison')) return 'Bull';
    if (species.includes('goat')) return 'Ram';
    return 'Male Only';
  }
  if (lower === 'buck/bull' && hunt) {
    if (species.includes('elk') || species.includes('moose')) return 'Bull';
    return 'Buck';
  }
  return titleCaseWords(raw);
}

function getSexOptionsForSpecies(speciesValue, weaponValue = '') {
  const species = safe(speciesValue).trim().toLowerCase();
  const weapon = safe(weaponValue).trim().toLowerCase();
  if (species === 'deer') {
    return ['All', 'Buck', 'Antlerless', 'Either Sex'];
  }
  if (species === 'elk') {
    if (weapon === 'archery' || weapon === 'extended archery') {
      return ['All', 'Bull', 'Antlerless', 'Either Sex'];
    }
    return ['All', 'Bull', 'Antlerless', 'Either Sex'];
  }
  if (species === 'pronghorn') {
    return ['All', 'Buck', 'Antlerless', 'Either Sex'];
  }
  if (species === 'moose') {
    return ['All', 'Bull', 'Antlerless', 'Either Sex'];
  }
  if (species === 'desert bighorn sheep') {
    return ['All', 'Ram'];
  }
  if (species === 'rocky mountain bighorn sheep') {
    return ['All', 'Ram', 'Ewe'];
  }
  if (species === 'mountain goat') {
    return ['All', 'Ram', 'Antlerless'];
  }
  if (species === 'turkey') {
    return ['All', 'Bearded', 'Either Sex'];
  }
  return null;
}

function getFilteredSexValues() {
  return Array.from(new Set(getFilteredHunts('sex').map(hunt => getNormalizedSex(hunt)).filter(Boolean)));
}

async function fetchJsonWithCandidates(candidates) {
  let lastStatus = 'not-started';
  for (const url of candidates) {
    const response = await fetch(url, { cache: 'no-store' });
    lastStatus = response.status;
    if (!response.ok) continue;
    return response.json();
  }
  throw new Error(`Load failed: ${lastStatus}`);
}

async function fetchAllArcGisGeoJson(url) {
  const allFeatures = [];
  let offset = 0;

  while (true) {
    const pagedUrl = new URL(url);
    pagedUrl.searchParams.set('resultOffset', String(offset));
    pagedUrl.searchParams.set('resultRecordCount', String(ARCGIS_PAGE_SIZE));

    const response = await fetch(pagedUrl.toString(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`ArcGIS overlay query failed: ${response.status}`);
    }

    const payload = await response.json();
    const features = Array.isArray(payload && payload.features) ? payload.features : [];
    allFeatures.push(...features);

    if (features.length < ARCGIS_PAGE_SIZE) break;
    offset += features.length;
  }

  return {
    type: 'FeatureCollection',
    features: allFeatures
  };
}

function normalizePlaceText(value) {
  return safe(value)
    .trim()
    .toLowerCase()
    .replace(/\bwildlife management area\b/g, 'wma')
    .replace(/\bwaterfowl management area\b/g, 'wma')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isOfficialWaterfowlWmaFeature(feature) {
  const properties = feature && feature.properties ? feature.properties : {};
  const candidates = [
    safe(properties.label_state),
    safe(properties.NAME),
    safe(properties.name),
    safe(properties.county)
  ]
    .map(normalizePlaceText)
    .filter(Boolean);

  return candidates.some(candidate =>
    OFFICIAL_WATERFOWL_WMA_NAMES.some(name => candidate === normalizePlaceText(name))
  );
}

function getOverlayFeatureProperties(feature) {
  return feature && feature.properties ? feature.properties : {};
}

function resolveOverlayKind(kind, feature) {
  const properties = getOverlayFeatureProperties(feature);
  const hasForestName = !!safe(properties.FORESTNAME).trim();
  const hasBlmAdmin = !!safe(firstNonEmpty(
    properties.ADMU_NAME,
    properties.ADMU_DISPLAY_NAME,
    properties.ADMIN_ST_NAME,
    properties.OFFICE_NAME,
    properties.DISTRICT_NAME,
    properties.PARENT_NAME
  )).trim();
  const admin = safe(properties.admin).trim().toUpperCase();
  const designation = safe(firstNonEmpty(properties.desig, properties.state_lgd, properties.ut_lgd)).trim().toLowerCase();
  const owner = safe(properties.owner).trim().toLowerCase();

  if (hasForestName) return 'usfs';
  if (hasBlmAdmin) return 'blm';
  if (admin === 'USP') return 'stateParks';
  if (admin === 'SITLA') return 'sitla';
  if (admin === 'UDWR' && designation.includes('wildlife reserve/management area')) return kind === 'waterfowlWma' ? 'waterfowlWma' : 'wildlifeWma';
  if (owner === 'private') return 'private';
  if (owner === 'state' && (admin === 'OS' || admin === 'FFSL')) return 'stateLands';
  return kind;
}

function isOverlayToggleEnabled(kind) {
  const toggleMap = {
    usfs: toggleUSFS,
    blm: toggleBLM,
    sitla: toggleSITLA,
    stateLands: toggleStateLands,
    stateParks: toggleStateParks,
    wildlifeWma: toggleWma,
    waterfowlWma: toggleWma,
    private: togglePrivate
  };
  const toggle = toggleMap[kind];
  return !!(toggle && toggle.checked);
}

function latLngToPoint(latLng) {
  return { lat: Number(latLng.lat()), lng: Number(latLng.lng()) };
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersects = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < ((xj - xi) * (point.lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(point, rings) {
  if (!rings.length) return false;
  if (!pointInRing(point, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false;
  }
  return true;
}

function geometryContainsLatLng(geometry, latLng) {
  if (!geometry || !latLng) return false;
  const point = latLngToPoint(latLng);
  const type = geometry.getType();

  if (type === 'Polygon') {
    const rings = geometry.getArray().map(ring => ring.getArray().map(latLngToPoint));
    return pointInPolygonRings(point, rings);
  }

  if (type === 'MultiPolygon') {
    return geometry.getArray().some(polygon => geometryContainsLatLng(polygon, latLng));
  }

  if (type === 'GeometryCollection') {
    return geometry.getArray().some(part => geometryContainsLatLng(part, latLng));
  }

  return false;
}

function layerContainsLatLng(layer, latLng) {
  if (!layer || !latLng) return false;
  let found = false;
  layer.forEach(feature => {
    if (found) return;
    const geometry = feature.getGeometry();
    if (geometryContainsLatLng(geometry, latLng)) {
      found = true;
    }
  });
  return found;
}

function formatAcres(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 0 })} acres`;
}

function getOverlayFeatureLabel(kind, feature) {
  const properties = getOverlayFeatureProperties(feature);
  if (kind === 'usfs') {
    return firstNonEmpty(
      properties.FORESTNAME,
      properties.label_federal,
      properties.NAME,
      'US Forest Service'
    );
  }

  if (kind === 'blm') {
    return firstNonEmpty(
      properties.ADMU_NAME,
      properties.ADMU_DISPLAY_NAME,
      properties.ADMIN_ST_NAME,
      properties.OFFICE_NAME,
      properties.DISTRICT_NAME,
      properties.PARENT_NAME,
      properties.NAME,
      'BLM Utah Administrative Unit'
    );
  }

  if (kind === 'sitla') {
    const base = firstNonEmpty(properties.label_state, properties.desig, properties.state_lgd, 'Utah State Trust Lands');
    if (/^utah state trust lands$/i.test(base) && safe(properties.county).trim()) {
      return `${titleCaseWords(safe(properties.county).trim().toLowerCase())} County SITLA`;
    }
    return base;
  }

  if (kind === 'wildlifeWma' || kind === 'waterfowlWma') {
    const base = firstNonEmpty(properties.label_state, properties.ut_lgd, properties.desig, properties.state_lgd, 'WMA');
    return base
      .replace(/\bState Wildlife Area\b/gi, 'WMA')
      .replace(/\bWildlife Management Area\b/gi, 'WMA')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  if (kind === 'stateLands' || kind === 'stateParks' || kind === 'private') {
    return firstNonEmpty(
      properties.label_state,
      properties.ut_lgd,
      properties.desig,
      properties.state_lgd,
      properties.county ? `${properties.county} County` : '',
      kind === 'private' ? 'Private Land' : 'Selected Area'
    );
  }

  return firstNonEmpty(
    properties.label_state,
    properties.label_federal,
    properties.NAME,
    properties.name,
    properties.county,
    'Selected Area'
  );
}

function getOverlayFeatureSubtitle(kind, feature) {
  const properties = getOverlayFeatureProperties(feature);

  if (kind === 'usfs') {
    return firstNonEmpty(properties.label_federal, 'US Forest Service');
  }

  if (kind === 'blm') {
    return firstNonEmpty(
      properties.ADMU_DISPLAY_NAME,
      properties.ADMIN_ST_NAME,
      properties.DISTRICT_NAME,
      properties.OFFICE_NAME,
      'BLM Utah Administrative Unit'
    );
  }

  if (kind === 'sitla') {
    return firstNonEmpty(properties.desig, properties.state_lgd, 'State Trust Lands');
  }

  if (kind === 'stateLands') {
    return firstNonEmpty(properties.desig, properties.state_lgd, 'State Land');
  }

  if (kind === 'stateParks') {
    return firstNonEmpty(properties.desig, properties.state_lgd, 'State Park');
  }

  if (kind === 'wildlifeWma' || kind === 'waterfowlWma') {
    return 'WMA';
  }

  if (kind === 'private') {
    return firstNonEmpty(properties.desig, properties.state_lgd, 'Private Land');
  }

  return '';
}

function getOverlayFeatureOwnerLine(kind, feature) {
  const properties = getOverlayFeatureProperties(feature);

  if (kind === 'usfs') return 'Land Owner: US Forest Service';
  if (kind === 'blm') return 'Land Owner: Bureau of Land Management';
  if (kind === 'sitla') return 'Land Owner: Utah Trust Lands Administration';
  if (kind === 'stateParks') return 'Land Owner: Utah State Parks';
  if (kind === 'wildlifeWma' || kind === 'waterfowlWma') return 'Land Owner: Utah Division of Wildlife Resources';
  if (kind === 'stateLands') {
    const adminName = firstNonEmpty(properties.admin, properties.agency, properties.owner, 'State');
    return `Land Owner: ${adminName}`;
  }
  if (kind === 'private') return 'Land Owner: Private';

  return '';
}

function getOverlayFeatureDetailLines(kind, feature) {
  const properties = getOverlayFeatureProperties(feature);
  const lines = [];
  const ownerLine = getOverlayFeatureOwnerLine(kind, feature);
  if (ownerLine) lines.push(ownerLine);

  const designation = firstNonEmpty(properties.desig, properties.state_lgd, properties.ut_lgd, properties.natl_lgd);
  if (designation && !/^(private|state trust lands)$/i.test(designation)) {
    lines.push(`Type: ${designation}`);
  }

  const county = safe(properties.county).trim();
  if (county) {
    lines.push(`County: ${county}`);
  }

  const acres = formatAcres(properties.gis_acres);
  if (acres) {
    lines.push(`Area: ${acres}`);
  }

  if (kind === 'private' && !safe(properties.label_state).trim()) {
    lines.push('Statewide layer only; individual owner names are not exposed here.');
  }

  return lines;
}

function buildOverlayInfoContent(kind, feature) {
  const label = getOverlayFeatureLabel(kind, feature);
  const safeLabel = escapeHtml(label);
  const subtitle = safe(getOverlayFeatureSubtitle(kind, feature)).trim();
  const subtitleHtml = subtitle
    ? `<div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#6a5848;margin-bottom:4px;">${escapeHtml(subtitle)}</div>`
    : '';
  const wrapStyle = 'font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:280px;';
  const renderLogoHtml = (src, alt) => `
    <div style="margin-bottom:10px;text-align:center;">
      <img
        src="${src}"
        alt="${alt}"
        style="display:block;margin:0 auto;max-width:88px;height:auto;"
      >
    </div>
  `;
  const detailLines = getOverlayFeatureDetailLines(kind, feature)
    .map(line => `<div>${escapeHtml(line)}</div>`)
    .join('');

  if (kind === 'usfs') {
    return `
      <div style="${wrapStyle}">
        ${renderLogoHtml(OFFICIAL_USFS_LOGO_URL, 'US Forest Service')}
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_USFS_PAGE_URL}" target="_blank" rel="noopener noreferrer">US Forest Service</a>
        </div>
      </div>
    `;
  }

  if (kind === 'blm') {
    return `
      <div style="${wrapStyle}">
        ${renderLogoHtml(OFFICIAL_BLM_LOGO_URL, 'Bureau of Land Management')}
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_BLM_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah BLM</a>
        </div>
      </div>
    `;
  }

  if (kind === 'sitla') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${renderLogoHtml(OFFICIAL_SITLA_LOGO_URL, 'Utah SITLA')}
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_SITLA_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah Trust Lands</a>
        </div>
      </div>
    `;
  }

  if (kind === 'stateLands') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_SITLA_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah Trust Lands</a>
          <a href="${OFFICIAL_STATE_PARKS_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah State Parks</a>
        </div>
      </div>
    `;
  }

  if (kind === 'stateParks') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${renderLogoHtml(OFFICIAL_STATE_PARKS_LOGO_URL, 'Utah State Parks')}
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_STATE_PARKS_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah State Parks</a>
        </div>
      </div>
    `;
  }

  if (kind === 'waterfowlWma' || kind === 'wildlifeWma') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${renderLogoHtml(OFFICIAL_DWR_WMA_LOGO_URL, 'Utah DWR WMA')}
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_DWR_WMA_PAGE_URL}" target="_blank" rel="noopener noreferrer">DWR WMA Information</a>
          <a href="${OFFICIAL_DWR_WATERFOWL_MAPS_URL}" target="_blank" rel="noopener noreferrer">DWR Hunting Maps</a>
        </div>
      </div>
    `;
  }

  if (kind === 'private') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${subtitleHtml}<strong>${safeLabel}</strong><br>
        ${detailLines}
      </div>
    `;
  }

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:240px;">
      <strong>${safeLabel}</strong>
    </div>
  `;
}

function bindOverlayLayerInteraction(kind, layer) {
  if (!layer) {
    return;
  }

  layer.addListener('click', event => {
    if (!isOverlayToggleEnabled(kind)) return;
    if (kind === 'blm' && toggleUSFS && toggleUSFS.checked && layerContainsLatLng(usfsLayer, event.latLng)) {
      return;
    }
    if (!overlayInfoWindow) {
      overlayInfoWindow = new google.maps.InfoWindow();
    }

    const featureData = {
      properties: {
        label_state: event.feature ? event.feature.getProperty('label_state') : '',
        label_federal: event.feature ? event.feature.getProperty('label_federal') : '',
        NAME: event.feature ? event.feature.getProperty('NAME') : '',
        name: event.feature ? event.feature.getProperty('name') : '',
        county: event.feature ? event.feature.getProperty('county') : '',
        owner: event.feature ? event.feature.getProperty('owner') : '',
        agency: event.feature ? event.feature.getProperty('agency') : '',
        admin: event.feature ? event.feature.getProperty('admin') : '',
        desig: event.feature ? event.feature.getProperty('desig') : '',
        state_lgd: event.feature ? event.feature.getProperty('state_lgd') : '',
        ut_lgd: event.feature ? event.feature.getProperty('ut_lgd') : '',
        natl_lgd: event.feature ? event.feature.getProperty('natl_lgd') : '',
        gis_acres: event.feature ? event.feature.getProperty('gis_acres') : '',
        FORESTNAME: event.feature ? event.feature.getProperty('FORESTNAME') : '',
        ADMU_NAME: event.feature ? event.feature.getProperty('ADMU_NAME') : '',
        ADMU_DISPLAY_NAME: event.feature ? event.feature.getProperty('ADMU_DISPLAY_NAME') : '',
        ADMIN_ST_NAME: event.feature ? event.feature.getProperty('ADMIN_ST_NAME') : '',
        OFFICE_NAME: event.feature ? event.feature.getProperty('OFFICE_NAME') : '',
        DISTRICT_NAME: event.feature ? event.feature.getProperty('DISTRICT_NAME') : '',
        PARENT_NAME: event.feature ? event.feature.getProperty('PARENT_NAME') : ''
      }
    };

    const resolvedKind = resolveOverlayKind(kind, featureData);
    if (!isOverlayToggleEnabled(resolvedKind)) return;
    overlayInfoWindow.setContent(buildOverlayInfoContent(resolvedKind, featureData));
    overlayInfoWindow.setPosition(event.latLng);
    overlayInfoWindow.open({ map: googleBaselineMap });
  });
}

async function loadHuntData() {
  updateStatus('Loading hunt datasets...');
  const merged = [];
  for (const source of HUNT_DATA_SOURCES) {
    try {
      const payload = await fetchJsonWithCandidates(source.candidates);
      const records = Array.isArray(payload) ? payload : Array.isArray(payload.records) ? payload.records : Array.isArray(payload.data) ? payload.data : [];
      if (!records.length && source.required) throw new Error(`No records in ${source.label}`);
      merged.push(...records);
    } catch (error) {
      if (source.required) throw error;
    }
  }

  const seen = new Set();
  huntData = merged.filter(record => {
    const key = [
      safe(getHuntCode(record)).trim(),
      safe(getUnitCode(record)).trim(),
      safe(getWeapon(record)).trim(),
      safe(getDates(record)).trim()
    ].join('||');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadBoundaryData() {
  updateStatus('Loading hunt boundaries...');
  const payload = await fetchJsonWithCandidates(HUNT_BOUNDARY_SOURCES);
  if (!Array.isArray(payload && payload.features) || !payload.features.length) {
    throw new Error('No hunt boundary features found.');
  }
  huntBoundaryGeoJson = payload;
}

async function loadOutfittersData() {
  updateStatus('Loading outfitters...');
  try {
    const payload = await fetchJsonWithCandidates(OUTFITTERS_DATA_SOURCES);
    outfitters = Array.isArray(payload) ? payload : [];
  } catch (error) {
    outfitters = [];
  }
}

async function ensureOverlayLayer(kind) {
  if (!googleBaselineMap || !window.google || !google.maps) return null;

  if (kind === 'usfs' && usfsLayer) return usfsLayer;
  if (kind === 'blm' && blmLayer) return blmLayer;
  if (kind === 'sitla' && sitlaLayer) return sitlaLayer;
  if (kind === 'stateLands' && stateLandsLayer) return stateLandsLayer;
  if (kind === 'stateParks' && stateParksLayer) return stateParksLayer;
  if (kind === 'wildlifeWma' && wildlifeWmaLayer) return wildlifeWmaLayer;
  if (kind === 'waterfowlWma' && waterfowlWmaLayer) return waterfowlWmaLayer;
  if (kind === 'private' && privateLayer) return privateLayer;

  const overlayConfigs = {
    usfs: {
      url: USFS_QUERY_URL,
      style: {
        strokeColor: '#476f2d',
        strokeOpacity: 0.95,
        strokeWeight: 2.4,
        fillColor: '#476f2d',
        fillOpacity: 0.04
      }
    },
    blm: {
      url: BLM_QUERY_URL,
      style: {
        strokeColor: '#b9722f',
        strokeOpacity: 0.9,
        strokeWeight: 2.2,
        fillOpacity: 0
      }
    },
    sitla: {
      url: SITLA_QUERY_URL,
      style: {
        strokeColor: '#2e86de',
        strokeOpacity: 0.92,
        strokeWeight: 1.8,
        fillColor: '#2e86de',
        fillOpacity: 0.05
      }
    },
    stateLands: {
      url: STATE_LANDS_QUERY_URL,
      style: {
        strokeColor: '#1f9d8b',
        strokeOpacity: 0.9,
        strokeWeight: 1.8,
        fillColor: '#1f9d8b',
        fillOpacity: 0.04
      }
    },
    stateParks: {
      url: STATE_PARKS_QUERY_URL,
      style: {
        strokeColor: '#4bbf73',
        strokeOpacity: 0.92,
        strokeWeight: 1.9,
        fillColor: '#4bbf73',
        fillOpacity: 0.05
      }
    },
    wildlifeWma: {
      url: WMA_QUERY_URL,
      style: {
        strokeColor: '#2f6fce',
        strokeOpacity: 0.98,
        strokeWeight: 2.4,
        fillColor: '#2f6fce',
        fillOpacity: 0.08
      }
    },
    waterfowlWma: {
      url: WMA_QUERY_URL,
      style: {
        strokeColor: '#1e56a8',
        strokeOpacity: 0.98,
        strokeWeight: 2.4,
        fillColor: '#1e56a8',
        fillOpacity: 0.08
      }
    },
    private: {
      url: PRIVATE_QUERY_URL,
      style: {
        strokeColor: '#7a7a7a',
        strokeOpacity: 0.55,
        strokeWeight: 1.2,
        fillColor: '#bfbfbf',
        fillOpacity: 0.02
      }
    }
  };

  const config = overlayConfigs[kind];
  if (!config) return null;
  const url = config.url;
  const geojson = await fetchAllArcGisGeoJson(url);
  let features = Array.isArray(geojson.features) ? geojson.features : [];

  if (kind === 'waterfowlWma') {
    features = features.filter(isOfficialWaterfowlWmaFeature);
  } else if (kind === 'wildlifeWma') {
    features = features.filter(feature => !isOfficialWaterfowlWmaFeature(feature));
  }

  const layer = new google.maps.Data();
  layer.addGeoJson({
    type: 'FeatureCollection',
    features
  });
  layer.setStyle(config.style);
  bindOverlayLayerInteraction(kind, layer);

  if (kind === 'usfs') {
    usfsLayer = layer;
    return usfsLayer;
  }
  if (kind === 'blm') {
    blmLayer = layer;
    return blmLayer;
  }
  if (kind === 'sitla') {
    sitlaLayer = layer;
    return sitlaLayer;
  }
  if (kind === 'stateLands') {
    stateLandsLayer = layer;
    return stateLandsLayer;
  }
  if (kind === 'stateParks') {
    stateParksLayer = layer;
    return stateParksLayer;
  }
  if (kind === 'wildlifeWma') {
    wildlifeWmaLayer = layer;
    return wildlifeWmaLayer;
  }
  if (kind === 'waterfowlWma') {
    waterfowlWmaLayer = layer;
    return waterfowlWmaLayer;
  }

  privateLayer = layer;
  return privateLayer;
}

function setOverlayVisibility(kind, isVisible) {
  const layerMap = {
    usfs: usfsLayer,
    blm: blmLayer,
    sitla: sitlaLayer,
    stateLands: stateLandsLayer,
    stateParks: stateParksLayer,
    wildlifeWma: wildlifeWmaLayer,
    waterfowlWma: waterfowlWmaLayer,
    private: privateLayer
  };
  const layer = layerMap[kind];
  if (!layer || !googleBaselineMap) return;
  layer.setMap(isVisible ? googleBaselineMap : null);
}

async function syncOverlayToggles() {
  try {
    if (toggleBLM && toggleBLM.checked) {
      await ensureOverlayLayer('blm');
      setOverlayVisibility('blm', true);
    } else {
      setOverlayVisibility('blm', false);
    }

    if (toggleUSFS && toggleUSFS.checked) {
      await ensureOverlayLayer('usfs');
      setOverlayVisibility('usfs', true);
    } else {
      setOverlayVisibility('usfs', false);
    }

    if (toggleSITLA && toggleSITLA.checked) {
      await ensureOverlayLayer('sitla');
      setOverlayVisibility('sitla', true);
    } else {
      setOverlayVisibility('sitla', false);
    }

    if (toggleStateLands && toggleStateLands.checked) {
      await ensureOverlayLayer('stateLands');
      setOverlayVisibility('stateLands', true);
    } else {
      setOverlayVisibility('stateLands', false);
    }

    if (toggleStateParks && toggleStateParks.checked) {
      await ensureOverlayLayer('stateParks');
      setOverlayVisibility('stateParks', true);
    } else {
      setOverlayVisibility('stateParks', false);
    }

    if (toggleWma && toggleWma.checked) {
      await ensureOverlayLayer('wildlifeWma');
      setOverlayVisibility('wildlifeWma', true);
    } else {
      setOverlayVisibility('wildlifeWma', false);
    }

    if (toggleWma && toggleWma.checked) {
      await ensureOverlayLayer('waterfowlWma');
      setOverlayVisibility('waterfowlWma', true);
    } else {
      setOverlayVisibility('waterfowlWma', false);
    }

    if (togglePrivate && togglePrivate.checked) {
      await ensureOverlayLayer('private');
      setOverlayVisibility('private', true);
    } else {
      setOverlayVisibility('private', false);
    }
  } catch (error) {
    console.warn('Overlay sync failed:', error);
    updateStatus(`Overlay load issue: ${error.message}`);
  }
}

function getFilteredHunts(excludeKey = '') {
  const search = safe(searchInput && searchInput.value).trim().toLowerCase();
  const species = safe(speciesFilter && speciesFilter.value || 'All Species');
  const sex = safe(sexFilter && sexFilter.value || 'All');
  const weapon = safe(weaponFilter && weaponFilter.value || 'All');
  const huntType = safe(huntTypeFilter && huntTypeFilter.value || 'All');
  const huntCategory = safe(huntCategoryFilter && huntCategoryFilter.value || 'All');
  const unit = safe(unitFilter && unitFilter.value || '');

  return huntData.filter(hunt => {
    const title = getHuntTitle(hunt).toLowerCase();
    const code = getHuntCode(hunt).toLowerCase();
    const unitName = getUnitName(hunt).toLowerCase();
    const unitCode = getUnitCode(hunt).toLowerCase();

    const searchOk = !search || title.includes(search) || code.includes(search) || unitName.includes(search) || unitCode.includes(search);
    const speciesOk = excludeKey === 'species' || species === 'All Species' || getSpeciesDisplayList(hunt).includes(species);
    const sexOk = excludeKey === 'sex' || sex === 'All' || getNormalizedSex(hunt) === sex;
    const weaponOk = excludeKey === 'weapon' || weapon === 'All' || getWeaponFilterValues(hunt).includes(weapon);
    const huntTypeOk = excludeKey === 'huntType' || huntType === 'All' || getHuntType(hunt) === huntType;
    const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || getHuntCategory(hunt) === huntCategory;
    const unitOk = excludeKey === 'unit' || !unit || getUnitValue(hunt) === unit || getUnitName(hunt) === unit || getUnitCode(hunt) === unit;

    return searchOk && speciesOk && sexOk && weaponOk && huntTypeOk && huntCategoryOk && unitOk;
  });
}

function hasActiveMatrixFiltersBeforeUnits() {
  const search = safe(searchInput && searchInput.value).trim();
  const species = safe(speciesFilter && speciesFilter.value || 'All Species');
  const sex = safe(sexFilter && sexFilter.value || 'All');
  const huntType = safe(huntTypeFilter && huntTypeFilter.value || 'All');
  const weapon = safe(weaponFilter && weaponFilter.value || 'All');
  const huntCategory = safe(huntCategoryFilter && huntCategoryFilter.value || 'All');

  return !!search || species !== 'All Species' || sex !== 'All' || huntType !== 'All' || weapon !== 'All' || huntCategory !== 'All';
}

function populateSpecies() {
  const previous = speciesFilter.value || 'All Species';
  const set = new Set(['All Species']);
  getFilteredHunts('species').forEach(hunt => {
    getSpeciesDisplayList(hunt).forEach(species => set.add(species));
  });
  const options = Array.from(set).sort((a, b) => {
    if (a === 'All Species') return -1;
    if (b === 'All Species') return 1;
    return a.localeCompare(b);
  });
  speciesFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  speciesFilter.value = options.includes(previous) ? previous : 'All Species';
}

function populateSexes() {
  const previous = sexFilter.value || 'All';
  const selectedSpecies = safe(speciesFilter.value || 'All Species');
  const selectedWeapon = safe(weaponFilter.value || 'All');
  const filteredValues = getFilteredSexValues();
  sortWithPreferredOrder(filteredValues, SEX_ORDER);

  let options = getSexOptionsForSpecies(selectedSpecies, selectedWeapon);
  if (options) {
    options = ['All', ...options.filter(value => value !== 'All' && filteredValues.includes(value))];
    if (selectedSpecies === 'Elk' && (selectedWeapon === 'Archery' || selectedWeapon === 'Extended Archery') && !options.includes('Either Sex')) {
      options.push('Either Sex');
    }
  } else {
    options = ['All', ...filteredValues];
  }

  sexFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  sexFilter.value = options.includes(previous) ? previous : 'All';
}

function populateWeapons() {
  const previous = weaponFilter.value || 'All';
  const values = Array.from(new Set(getFilteredHunts('weapon').flatMap(hunt => getWeaponFilterValues(hunt)).filter(Boolean)));
  sortWithPreferredOrder(values, WEAPON_ORDER);
  const options = ['All', ...values];
  weaponFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  weaponFilter.value = options.includes(previous) ? previous : 'All';
}

function populateHuntTypes() {
  const previous = huntTypeFilter.value || 'All';
  const values = Array.from(new Set(getFilteredHunts('huntType').map(hunt => getHuntType(hunt)).filter(Boolean)));
  sortWithPreferredOrder(values, HUNT_TYPE_ORDER);
  const options = ['All', ...values];
  huntTypeFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value === 'General' ? 'General Season' : value)}</option>`).join('');
  huntTypeFilter.value = options.includes(previous) ? previous : 'All';
}

function populateHuntCategories() {
  const previous = huntCategoryFilter.value || 'All';
  const values = Array.from(new Set(getFilteredHunts('huntCategory').map(hunt => getHuntCategory(hunt)).filter(Boolean)));
  sortWithPreferredOrder(values, HUNT_CATEGORY_ORDER);
  const options = ['All', ...values];
  huntCategoryFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  huntCategoryFilter.value = options.includes(previous) ? previous : 'All';
}

function populateUnits() {
  const previous = unitFilter.value || '';
  if (!selectedHunt && !hasActiveMatrixFiltersBeforeUnits()) {
    unitFilter.innerHTML = '<option value="">Select filters to narrow DWR Hunt Units</option>';
    unitFilter.value = '';
    return;
  }
  const units = new Map();
  getFilteredHunts('unit').forEach(hunt => {
    const value = getUnitValue(hunt);
    const label = getUnitName(hunt) || value;
    if (value && !units.has(value)) units.set(value, label);
  });
  const options = Array.from(units.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  unitFilter.innerHTML = '<option value="">All DWR Hunt Units</option>' + options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
  unitFilter.value = options.some(([value]) => value === previous) ? previous : '';
}

function refreshSelectionMatrix() {
  populateSpecies();
  populateSexes();
  populateHuntTypes();
  populateWeapons();
  populateHuntCategories();
  populateUnits();
}

function getBoundaryNameCandidates(hunt) {
  const names = new Set();
  const unitName = safe(getUnitName(hunt)).trim();
  const unitCode = safe(getUnitCode(hunt)).trim();

  function addNameVariants(value) {
    const base = safe(value).trim();
    if (!base) return;
    names.add(base);
    names.add(titleCaseWords(base));
    names.add(base.toUpperCase());
  }

  if (unitName) {
    addNameVariants(unitName);
    addNameVariants(unitName.replace(/\s*\/\s*/g, '/'));
    addNameVariants(unitName.replace(/\s*\/\s*/g, ', '));
    addNameVariants(unitName.replace(/\s*\/\s*/g, ' '));
  }

  if (unitCode) {
    addNameVariants(titleCaseWords(unitCode.replace(/-/g, ' ')));
  }

  return new Set(Array.from(names).filter(Boolean));
}

function buildBoundaryMatchSet(hunt) {
  const names = new Set();
  const huntCode = safe(getHuntCode(hunt)).trim();
  const overrideNames = HUNT_BOUNDARY_NAME_OVERRIDES[huntCode] || [];
  overrideNames.forEach(name => names.add(name.trim().toLowerCase()));
  getBoundaryNameCandidates(hunt).forEach(name => names.add(name.trim().toLowerCase()));
  return names;
}

function getFeatureBoundaryName(feature) {
  return safe(feature.getProperty('Boundary_Name') || feature.getProperty('BOUNDARY_NAME')).trim();
}

function buildHuntUnitHoverContent(feature) {
  const boundaryName = getFeatureBoundaryName(feature) || 'DWR Hunt Unit';
  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.2;white-space:nowrap;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#6c43c8;">DWR Hunt Unit</div>
      <div style="font-size:12px;font-weight:700;">${escapeHtml(boundaryName)}</div>
    </div>
  `;
}

function buildDwrHuntUnitPopupContent(boundaryName, matches) {
  const singleMatch = Array.isArray(matches) && matches.length === 1 ? matches[0] : null;
  const renderDwrHuntCard = hunt => `
    <div style="
      position:relative;
      width:100%;
      max-width:300px;
      min-height:350px;
      margin:0 auto;
      border-radius:12px;
      overflow:hidden;
      background:#fff url('${OFFICIAL_DNR_DWR_LOGO_URL}') center/cover no-repeat;
      box-shadow:0 10px 24px rgba(43,28,18,0.18);
      border:1px solid rgba(191,107,52,0.28);
    ">
      <div style="
        position:absolute;
        left:18px;
        right:18px;
        top:118px;
        padding:12px 14px;
        background:rgba(255,255,255,0.88);
        border:1px solid rgba(191,107,52,0.22);
        border-radius:12px;
        backdrop-filter:blur(2px);
      ">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#b45e2c;">DWR Hunt Unit</div>
        <div style="font-size:15px;font-weight:900;line-height:1.15;color:#2b1c12;margin-top:2px;">${escapeHtml(boundaryName)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-top:10px;font-size:12px;color:#2b1c12;">
          <div><strong>Hunt #</strong><br>${escapeHtml(getHuntCode(hunt))}</div>
          <div><strong>Species</strong><br>${escapeHtml(getSpeciesDisplay(hunt))}</div>
          <div><strong>Sex</strong><br>${escapeHtml(getNormalizedSex(hunt))}</div>
          <div><strong>Type</strong><br>${escapeHtml(getHuntType(hunt))}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#2b1c12;"><strong>Weapon</strong><br>${escapeHtml(getWeapon(hunt))}</div>
        <div style="margin-top:8px;font-size:12px;color:#2b1c12;"><strong>Dates</strong><br>${escapeHtml(getDates(hunt))}</div>
        <div style="margin-top:12px;">
          <button type="button" onclick="window.selectHuntByCode && window.selectHuntByCode('${escapeHtml(getHuntCode(hunt))}')" style="width:100%;border:none;border-radius:999px;padding:8px 12px;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#bf6b34,#9e5323);color:#fff6ed;">Select Hunt</button>
        </div>
      </div>
    </div>
  `;

  if (singleMatch) {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.3;max-width:320px;">
        ${renderDwrHuntCard(singleMatch)}
      </div>
    `;
  }

  const rows = matches.slice(0, 12).map(hunt => `
    <tr>
      <td style="padding:8px 6px;border-top:1px solid #d8c8b8;font-size:11px;font-weight:800;vertical-align:top;">${escapeHtml(getHuntCode(hunt))}</td>
      <td style="padding:8px 6px;border-top:1px solid #d8c8b8;font-size:11px;vertical-align:top;">${escapeHtml(getHuntTitle(hunt))}</td>
      <td style="padding:8px 6px;border-top:1px solid #d8c8b8;font-size:11px;vertical-align:top;">${escapeHtml(getWeapon(hunt))}</td>
      <td style="padding:8px 6px;border-top:1px solid #d8c8b8;font-size:11px;vertical-align:top;">${escapeHtml(getDates(hunt))}</td>
      <td style="padding:8px 6px;border-top:1px solid #d8c8b8;vertical-align:top;">
        <button type="button" onclick="window.selectHuntByCode && window.selectHuntByCode('${escapeHtml(getHuntCode(hunt))}')" style="border:none;border-radius:999px;padding:6px 10px;font-weight:700;cursor:pointer;background:linear-gradient(180deg,#bf6b34,#9e5323);color:#fff6ed;">Select</button>
      </td>
    </tr>
  `).join('');

  const moreNote = matches.length > 12
    ? `<div style="font-size:11px;color:#6b5646;margin-top:8px;">Showing 12 of ${matches.length} matching hunts.</div>`
    : '';

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.25;max-width:320px;">
      <div style="margin-bottom:10px;text-align:center;">
        <img src="${OFFICIAL_DNR_DWR_LOGO_URL}" alt="Utah DWR" style="display:block;margin:0 auto;max-width:82px;height:auto;">
      </div>
      <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#6c43c8;">DWR Hunt Unit</div>
      <div style="font-size:16px;font-weight:800;margin-top:2px;">${escapeHtml(boundaryName)}</div>
      <div style="font-size:12px;margin-top:4px;">${matches.length} matching hunts</div>
      <div style="margin-top:8px;overflow:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b5646;padding:0 6px 6px;">Ref</th>
              <th style="text-align:left;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b5646;padding:0 6px 6px;">Hunt</th>
              <th style="text-align:left;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b5646;padding:0 6px 6px;">Weapon</th>
              <th style="text-align:left;font-size:10px;letter-spacing:0.04em;text-transform:uppercase;color:#6b5646;padding:0 6px 6px;">Dates</th>
              <th style="padding:0 6px 6px;"></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${moreNote}
    </div>
  `;
}

function findMatchingHuntsForFeature(feature) {
  const boundaryName = getFeatureBoundaryName(feature).toLowerCase();
  return getFilteredHunts().filter(hunt => buildBoundaryMatchSet(hunt).has(boundaryName));
}

function getFilteredBoundaryNames() {
  const names = new Set();
  getFilteredHunts().forEach(hunt => {
    buildBoundaryMatchSet(hunt).forEach(name => names.add(name));
  });
  return names;
}

function renderMatchingHunts() {
  if (!matchingHuntsEl) return;
  const hunts = getFilteredHunts();
  if (!hunts.length) {
    matchingHuntsEl.innerHTML = '<div class="empty-note">No hunts match the current filters.</div>';
    return;
  }
  matchingHuntsEl.innerHTML = hunts.slice(0, 150).map(hunt => `
    <div class="hunt-card${selectedHunt && getHuntCode(selectedHunt) === getHuntCode(hunt) ? ' is-selected' : ''}" data-hunt-code="${escapeHtml(getHuntCode(hunt))}">
      <div class="hunt-card-title">${escapeHtml(getHuntTitle(hunt))}</div>
      <div class="hunt-card-meta">${escapeHtml(getUnitName(hunt))} | ${escapeHtml(getWeapon(hunt))}</div>
      <div class="hunt-card-meta">${escapeHtml(getDates(hunt))}</div>
    </div>
  `).join('');
}

function getSelectedOutfitters() {
  if (!selectedHunt) return [];
  const unitSlugs = [getUnitCode(selectedHunt), getUnitName(selectedHunt), getUnitValue(selectedHunt)].map(slugify).filter(Boolean);
  const speciesSlug = slugify(getSpeciesDisplay(selectedHunt));
  return outfitters.filter(outfitter => {
    const servedUnits = listify(outfitter.unitsServed).map(slugify);
    const servedSpecies = listify(outfitter.speciesServed || outfitter.species).map(slugify);
    const unitMatch = unitSlugs.some(unit => servedUnits.includes(unit));
    const speciesMatch = !servedSpecies.length || !speciesSlug || servedSpecies.includes(speciesSlug);
    return unitMatch && speciesMatch;
  });
}

function renderOutfitters() {
  if (!outfitterResultsEl) return;
  if (toggleOutfitters && !toggleOutfitters.checked) {
    outfitterResultsEl.innerHTML = '<div class="empty-note">Outfitters are hidden right now. Turn Outfitters back on to see vetted matches.</div>';
    return;
  }
  if (!selectedHunt) {
    outfitterResultsEl.innerHTML = '<div class="empty-note">Select a hunt to load matching vetted outfitters.</div>';
    return;
  }
  const matches = getSelectedOutfitters();
  if (!matches.length) {
    outfitterResultsEl.innerHTML = '<div class="empty-note">No outfitters matched this hunt yet.</div>';
    return;
  }
  outfitterResultsEl.innerHTML = matches.map(outfitter => `
    <div class="outfitter-card">
      <div class="hunt-card-title">${escapeHtml(outfitter.listingName || outfitter.name)}</div>
      <div class="hunt-card-meta">${escapeHtml(outfitter.city || '')}${outfitter.website ? ' | ' : ''}${outfitter.website ? `<a class="outfitter-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(outfitter.website)}">Website</a>` : ''}</div>
      <div class="hunt-card-meta">${escapeHtml(listify(outfitter.unitsServed).join(', '))}</div>
    </div>
  `).join('');
}

function renderSelectedHunt() {
  if (!selectedHuntPanel) return;
  if (!selectedHunt) {
    selectedHuntPanel.innerHTML = '<div class="empty-note">No hunt selected yet.</div>';
    return;
  }
  const officialDwrUrl = getOfficialDwrHuntUrl(selectedHunt);
  selectedHuntPanel.innerHTML = `
    <div style="
      position:relative;
      width:100%;
      min-height:360px;
      border-radius:14px;
      overflow:hidden;
      background:#fff url('${OFFICIAL_DNR_DWR_LOGO_URL}') center/cover no-repeat;
      box-shadow:0 10px 24px rgba(43,28,18,0.16);
      border:1px solid rgba(191,107,52,0.28);
    ">
      <div style="
        position:absolute;
        left:18px;
        right:18px;
        top:122px;
        padding:12px 14px;
        background:rgba(255,255,255,0.9);
        border:1px solid rgba(191,107,52,0.22);
        border-radius:12px;
        backdrop-filter:blur(2px);
      ">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:#b45e2c;">Selected Hunt</div>
        <div style="font-size:15px;font-weight:900;line-height:1.15;color:#2b1c12;margin-top:2px;">${escapeHtml(getUnitName(selectedHunt))}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-top:10px;font-size:12px;color:#2b1c12;">
          <div><strong>Hunt #</strong><br>${escapeHtml(getHuntCode(selectedHunt))}</div>
          <div><strong>Species</strong><br>${escapeHtml(getSpeciesDisplay(selectedHunt))}</div>
          <div><strong>Sex</strong><br>${escapeHtml(getNormalizedSex(selectedHunt))}</div>
          <div><strong>Type</strong><br>${escapeHtml(getHuntType(selectedHunt))}</div>
        </div>
        <div style="margin-top:8px;font-size:12px;color:#2b1c12;"><strong>Weapon</strong><br>${escapeHtml(getWeapon(selectedHunt))}</div>
        <div style="margin-top:8px;font-size:12px;color:#2b1c12;"><strong>Dates</strong><br>${escapeHtml(getDates(selectedHunt))}</div>
      </div>
    </div>
    <div style="margin-top:14px;">
      <a href="${escapeHtml(officialDwrUrl)}" target="_blank" rel="noopener noreferrer">Official Utah DWR Hunt Details</a>
    </div>
  `;
}

function renderMapChooser(matches, boundaryName) {
  const titleEl = document.getElementById('mapChooserTitle');
  const kickerEl = document.getElementById('mapChooserKicker');
  const bodyEl = document.getElementById('mapChooserBody');
  if (!titleEl || !kickerEl || !bodyEl) return;

  kickerEl.textContent = boundaryName || 'Selected Unit';
  titleEl.textContent = 'Matching Hunts';

  if (!matches.length) {
    bodyEl.innerHTML = '<div class="map-chooser-empty">No matching hunts found for this boundary.</div>';
    setMapChooserOpen(true);
    return;
  }

  bodyEl.innerHTML = matches.map(hunt => `
    <div class="map-chooser-card" data-hunt-code="${escapeHtml(getHuntCode(hunt))}">
      <div class="hunt-card-title">${escapeHtml(getHuntTitle(hunt))}</div>
      <div class="map-chooser-meta">${escapeHtml(getUnitName(hunt))}</div>
      <div class="map-chooser-meta">${escapeHtml(getWeapon(hunt))} | ${escapeHtml(getDates(hunt))}</div>
    </div>
  `).join('');

  setMapChooserOpen(true);
}

function styleBoundaryLayer() {
  if (!huntUnitsLayer) return;
  if (toggleDwrUnits && !toggleDwrUnits.checked) {
    huntUnitsLayer.setStyle(() => ({ visible: false }));
    return;
  }
  const hasNarrowing = hasActiveMatrixFiltersBeforeUnits() || !!selectedHunt;
  if (!hasNarrowing) {
    huntUnitsLayer.setStyle(() => ({ visible: false }));
    return;
  }
  const filteredNames = getFilteredBoundaryNames();
  const selectedNames = selectedHunt ? buildBoundaryMatchSet(selectedHunt) : new Set();
  huntUnitsLayer.setStyle(feature => {
    const boundaryName = getFeatureBoundaryName(feature).toLowerCase();
    const shouldShow = filteredNames.size ? filteredNames.has(boundaryName) : false;
    const isSelected = selectedNames.has(boundaryName);
    return {
      visible: shouldShow,
      strokeColor: isSelected ? '#8d244e' : '#6c43c8',
      strokeWeight: isSelected ? 3.2 : 1.8,
      fillColor: isSelected ? '#c1497b' : '#8d74d8',
      fillOpacity: isSelected ? 0.18 : 0.07
    };
  });
}

function getSelectedHuntCenter() {
  if (!selectedHunt || !window.google || !google.maps) {
    return GOOGLE_BASELINE_DEFAULT_CENTER;
  }

  const selectedNames = buildBoundaryMatchSet(selectedHunt);
  const bounds = new google.maps.LatLngBounds();
  let found = false;

  if (huntUnitsLayer) {
    huntUnitsLayer.forEach(feature => {
      const boundaryName = getFeatureBoundaryName(feature).toLowerCase();
      if (!selectedNames.has(boundaryName)) return;
      const geometry = feature.getGeometry();
      if (!geometry) return;
      geometry.forEachLatLng(latLng => {
        bounds.extend(latLng);
        found = true;
      });
    });
  }

  if (found) {
    const center = bounds.getCenter();
    return { lat: center.lat(), lng: center.lng() };
  }

  return GOOGLE_BASELINE_DEFAULT_CENTER;
}

function updateMapModeUi() {
  if (!mapWrapEl) return;
  mapWrapEl.classList.toggle('is-globe-mode', activeMapMode === 'globe');
}

function syncGoogleMapForMode() {
  if (!googleBaselineMap || activeMapMode === 'globe') return;
  googleBaselineMap.setMapTypeId(activeMapMode);
}

function syncCesiumToSelection() {
  if (!cesiumViewer || !window.Cesium) return;
  const C = window.Cesium;
  const center = getSelectedHuntCenter();

  if (globeSelectionEntity) {
    cesiumViewer.entities.remove(globeSelectionEntity);
    globeSelectionEntity = null;
  }

  globeSelectionEntity = cesiumViewer.entities.add({
    position: C.Cartesian3.fromDegrees(center.lng, center.lat, 0),
    point: {
      pixelSize: 12,
      color: C.Color.fromCssColorString('#bf6b34'),
      outlineColor: C.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: selectedHunt ? (getUnitName(selectedHunt) || getHuntCode(selectedHunt) || 'Selected Hunt') : 'Utah',
      font: '700 14px Georgia',
      fillColor: C.Color.WHITE,
      outlineColor: C.Color.fromCssColorString('#2b1c12'),
      outlineWidth: 3,
      style: C.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new C.Cartesian2(0, 18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    }
  });

  cesiumViewer.camera.flyTo({
    destination: C.Cartesian3.fromDegrees(center.lng, center.lat, selectedHunt ? 220000 : 1800000),
    orientation: {
      heading: 0,
      pitch: C.Math.toRadians(selectedHunt ? -45 : -65),
      roll: 0
    },
    duration: 1.4
  });
}

function ensureCesiumViewer() {
  if (cesiumReady || !globeMapEl || !window.Cesium) return;
  const C = window.Cesium;
  const terrainProvider = CESIUM_ION_TOKEN && typeof C.createWorldTerrain === 'function'
    ? C.createWorldTerrain()
    : new C.EllipsoidTerrainProvider();

  if (CESIUM_ION_TOKEN) {
    C.Ion.defaultAccessToken = CESIUM_ION_TOKEN;
  }

  cesiumViewer = new C.Viewer('globeMap', {
    animation: false,
    timeline: false,
    geocoder: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    homeButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrainProvider,
    baseLayer: false
  });

  cesiumViewer.imageryLayers.addImageryProvider(
    new C.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri'
    })
  );

  cesiumViewer.imageryLayers.addImageryProvider(
    new C.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}',
      credit: 'Esri'
    })
  );

  cesiumViewer.scene.globe.enableLighting = true;
  cesiumViewer.scene.verticalExaggeration = 2.0;
  cesiumViewer.scene.verticalExaggerationRelativeHeight = 0.0;
  cesiumReady = true;
  syncCesiumToSelection();
}

function setActiveMapMode(mode) {
  activeMapMode = mode === 'globe' ? 'globe' : (mode || 'terrain');
  updateMapModeUi();

  if (activeMapMode === 'globe') {
    ensureCesiumViewer();
    syncCesiumToSelection();
    updateStatus(selectedHunt ? 'Globe view centered on the selected hunt with 2x terrain relief.' : 'Globe view enabled with 2x terrain relief.');
    return;
  }

  syncGoogleMapForMode();
  updateStatus(`Map switched to ${activeMapMode}.`);
}

function zoomToSelectedBoundary() {
  if (!huntUnitsLayer || !selectedHunt || !googleBaselineMap) return;
  const selectedNames = buildBoundaryMatchSet(selectedHunt);
  const bounds = new google.maps.LatLngBounds();
  let found = false;

  huntUnitsLayer.forEach(feature => {
    const boundaryName = getFeatureBoundaryName(feature).toLowerCase();
    if (!selectedNames.has(boundaryName)) return;
    feature.getGeometry().forEachLatLng(latLng => {
      bounds.extend(latLng);
      found = true;
    });
  });

  if (found) googleBaselineMap.fitBounds(bounds);
}

function selectHuntByCode(code) {
  const hunt = huntData.find(item => getHuntCode(item) === code);
  if (!hunt) return;
  selectedHunt = hunt;
  renderMatchingHunts();
  renderSelectedHunt();
  renderOutfitters();
  styleBoundaryLayer();
  zoomToSelectedBoundary();
  if (activeMapMode === 'globe') {
    syncCesiumToSelection();
  }
  setMapChooserOpen(false);
  updateStatus(`Selected ${getHuntTitle(hunt)}.`);
}

window.selectHuntByCode = selectHuntByCode;

function bindBoundaryLayerInteraction() {
  if (!huntUnitsLayer) return;
  huntUnitsLayer.addListener('mouseover', event => {
    if (toggleDwrUnits && !toggleDwrUnits.checked) return;
    googleBaselineMap.setOptions({ draggableCursor: 'pointer' });
    if (!boundaryHoverInfoWindow) {
      boundaryHoverInfoWindow = new google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(0, -12)
      });
    }
    boundaryHoverInfoWindow.setContent(buildHuntUnitHoverContent(event.feature));
    boundaryHoverInfoWindow.setPosition(event.latLng);
    boundaryHoverInfoWindow.open({ map: googleBaselineMap });
  });
  huntUnitsLayer.addListener('mouseout', () => {
    googleBaselineMap.setOptions({ draggableCursor: '' });
    if (boundaryHoverInfoWindow) {
      boundaryHoverInfoWindow.close();
    }
  });
  huntUnitsLayer.addListener('click', event => {
    if (toggleDwrUnits && !toggleDwrUnits.checked) return;
    const matches = findMatchingHuntsForFeature(event.feature);
    selectedBoundaryMatches = matches;
    const boundaryName = getFeatureBoundaryName(event.feature);

    if (!boundaryInfoWindow) boundaryInfoWindow = new google.maps.InfoWindow();
    boundaryInfoWindow.setContent(buildDwrHuntUnitPopupContent(boundaryName, matches));
    boundaryInfoWindow.setPosition(event.latLng);
    boundaryInfoWindow.open({ map: googleBaselineMap });
  });
}

function buildBoundaryLayer() {
  if (!googleBaselineMap || !huntBoundaryGeoJson) return;
  if (huntUnitsLayer) {
    huntUnitsLayer.setMap(null);
  }
  huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
  huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
  bindBoundaryLayerInteraction();
  styleBoundaryLayer();
}

function renderUtahOutline() {
  if (!googleBaselineMap) return;

  const utahPath = [
    { lat: 37.0, lng: -114.05 },
    { lat: 42.0, lng: -114.05 },
    { lat: 42.0, lng: -111.05 },
    { lat: 41.0, lng: -111.05 },
    { lat: 41.0, lng: -109.04 },
    { lat: 37.0, lng: -109.04 },
    { lat: 37.0, lng: -114.05 }
  ];

  if (utahOutlinePolygon) {
    utahOutlinePolygon.setMap(null);
  }

  utahOutlinePolygon = new google.maps.Polyline({
    path: utahPath,
    map: googleBaselineMap,
    strokeColor: '#b9722f',
    strokeOpacity: 0.95,
    strokeWeight: 4.5,
    clickable: false,
    zIndex: 2
  });
}

function bindControls() {
  [searchInput, speciesFilter, sexFilter, weaponFilter, huntTypeFilter, huntCategoryFilter, unitFilter].forEach(el => {
    if (!el) return;
    el.addEventListener('change', () => {
      refreshSelectionMatrix();
      renderMatchingHunts();
      styleBoundaryLayer();
    });
    el.addEventListener('input', () => {
      refreshSelectionMatrix();
      renderMatchingHunts();
      styleBoundaryLayer();
    });
  });

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      refreshSelectionMatrix();
      renderMatchingHunts();
      styleBoundaryLayer();
      updateStatus('Filters applied.');
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      searchInput.value = '';
      speciesFilter.value = 'All Species';
      sexFilter.value = 'All';
      weaponFilter.value = 'All';
      huntTypeFilter.value = 'All';
      huntCategoryFilter.value = 'All';
      unitFilter.value = '';
      selectedHunt = null;
      refreshSelectionMatrix();
      renderMatchingHunts();
      renderSelectedHunt();
      renderOutfitters();
      styleBoundaryLayer();
      setMapChooserOpen(false);
      if (googleBaselineMap) {
        googleBaselineMap.setCenter(GOOGLE_BASELINE_DEFAULT_CENTER);
        googleBaselineMap.setZoom(GOOGLE_BASELINE_DEFAULT_ZOOM);
      }
      if (cesiumReady) {
        syncCesiumToSelection();
      }
      updateStatus('Planner reset.');
    });
  }

  if (mapTypeSelect) {
    mapTypeSelect.addEventListener('change', () => {
      setActiveMapMode(mapTypeSelect.value || 'terrain');
    });
  }

  if (toggleUSFS) {
    toggleUSFS.addEventListener('change', () => {
      void syncOverlayToggles();
    });
  }

  if (toggleBLM) {
    toggleBLM.addEventListener('change', () => {
      void syncOverlayToggles();
    });
  }

  if (toggleSITLA) {
    toggleSITLA.addEventListener('change', () => {
      void syncOverlayToggles();
    });
  }

  if (toggleStateLands) {
    toggleStateLands.addEventListener('change', () => {
      updateStateLayersSummary();
      void syncOverlayToggles();
    });
  }

  if (toggleStateParks) {
    toggleStateParks.addEventListener('change', () => {
      updateStateLayersSummary();
      void syncOverlayToggles();
    });
  }

  if (toggleWma) {
    toggleWma.addEventListener('change', () => {
      updateStateLayersSummary();
      void syncOverlayToggles();
    });
  }

  if (togglePrivate) {
    togglePrivate.addEventListener('change', () => {
      void syncOverlayToggles();
    });
  }

  if (toggleDwrUnits) {
    toggleDwrUnits.addEventListener('change', () => {
      styleBoundaryLayer();
    });
  }

  if (toggleOutfitters) {
    toggleOutfitters.addEventListener('change', () => {
      renderOutfitters();
    });
  }

  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      if (googleBaselineMap) {
        googleBaselineMap.setCenter(GOOGLE_BASELINE_DEFAULT_CENTER);
        googleBaselineMap.setZoom(GOOGLE_BASELINE_DEFAULT_ZOOM);
      }
      if (cesiumReady) {
        syncCesiumToSelection();
      }
      setMapChooserOpen(false);
      updateStatus('Reset to Utah.');
    });
  }

  if (closeMapChooserBtn) {
    closeMapChooserBtn.addEventListener('click', () => setMapChooserOpen(false));
  }

  if (matchingHuntsEl) {
    matchingHuntsEl.addEventListener('click', event => {
      const card = event.target.closest('[data-hunt-code]');
      if (!card) return;
      selectHuntByCode(card.getAttribute('data-hunt-code'));
    });
  }

  const chooserBody = document.getElementById('mapChooserBody');
  if (chooserBody) {
    chooserBody.addEventListener('click', event => {
      const card = event.target.closest('[data-hunt-code]');
      if (!card) return;
      selectHuntByCode(card.getAttribute('data-hunt-code'));
    });
  }
}

function initGoogleBaseline() {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.google || !google.maps) {
    updateStatus('Google Maps did not finish loading.');
    hideLoadingOverlay();
    return;
  }

  googleBaselineMap = new google.maps.Map(mapEl, {
    center: GOOGLE_BASELINE_DEFAULT_CENTER,
    zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    styles: huntPlannerMapStyle,
    mapTypeId: mapTypeSelect && mapTypeSelect.value && mapTypeSelect.value !== 'globe' ? mapTypeSelect.value : 'terrain',
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true
  });

  googleApiReady = true;
  isMapReady = true;
  bindControls();
  updateStateLayersSummary();
  renderUtahOutline();
  buildBoundaryLayer();
  void syncOverlayToggles();
  setActiveMapMode(mapTypeSelect && mapTypeSelect.value ? mapTypeSelect.value : 'terrain');
  maybeFinishLoading();
}

window.initGoogleBaseline = initGoogleBaseline;

async function bootstrap() {
  try {
    updateStatus('Starting hunt planner...');
    await loadHuntData();

    refreshSelectionMatrix();
    renderMatchingHunts();
    renderSelectedHunt();
    renderOutfitters();

    isDataReady = true;
    maybeFinishLoading();

    updateStatus('Loading Google map...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&callback=initGoogleBaseline`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      updateStatus('Google Maps failed to load. Check API key and domain restrictions.');
      hideLoadingOverlay();
    };
    document.head.appendChild(script);

    try {
      await loadBoundaryData();
      if (googleApiReady) buildBoundaryLayer();
      updateStatus('Hunt boundaries loaded.');
    } catch (error) {
      console.warn('Boundary load failed:', error);
      updateStatus('Hunt data loaded, but boundaries are still unavailable.');
    }

    try {
      await loadOutfittersData();
      renderOutfitters();
    } catch (error) {
      console.warn('Outfitter load failed:', error);
    }
  } catch (error) {
    console.error(error);
    updateStatus(`Prototype load failed: ${error.message}`);
    hideLoadingOverlay();
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
