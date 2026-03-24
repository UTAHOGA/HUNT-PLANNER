const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMjBiODg4NS1mMDNkLTRjNTYtOGQxZi1jMmY4ZjdhMTIxMGIiLCJpZCI6NDA3MDE1LCJpYXQiOjE3NzQwODk2NzF9.2nojSCO46EKYlLpsj3YQ5fGDj_z92PjmL-w1mdhfHfI';

const HUNT_DATA_SOURCES = [
  { label: 'Buck Deer', required: true, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BuckDeer_Pages_43_53.json`] },
  { label: 'Pronghorn', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Pronghorn.json`] },
  { label: 'Moose', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Moose.json`] },
  { label: 'Bighorn Sheep', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BighornSheep.json`] },
  { label: 'Mountain Goat', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_MountainGoat.json`] },
  { label: 'Bison', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Bison.json`] },
  { label: 'Black Bear', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BlackBear.json`] },
  { label: 'Turkey', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Turkey.json`] },
  { label: 'Cougar', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Cougar.json`] },
  { label: 'Bull Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BullElk.json`] },
  { label: 'General Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_GeneralElk.json`] },
  { label: 'Spike Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_SpikeElk.json`] },
  { label: 'Antlerless Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_AntlerlessElk.json`] },
  { label: 'Special Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_SpecialElk.json`] }
];

const HUNT_BOUNDARY_SOURCES = [
  'https://json.uoga.workers.dev/hunt-boundaries',
  './data/hunt_boundaries.geojson'
];
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`, './data/outfitters.json'];
const USFS_QUERY_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" + encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") + "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";
const BLM_QUERY_URL = 'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';
const LAND_OWNERSHIP_BASE_URL = 'https://gis.trustlands.utah.gov/mapping/rest/services/Land_Ownership_WM/MapServer/0/query';
const SITLA_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("state_lgd='State Trust Lands'")}&outFields=state_lgd,label_state,county&returnGeometry=true&outSR=4326&f=geojson`;
const STATE_LANDS_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("state_lgd IN ('Other State','State Sovereign Land')")}&outFields=state_lgd,label_state,county&returnGeometry=true&outSR=4326&f=geojson`;
const STATE_PARKS_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("state_lgd='State Parks and Recreation'")}&outFields=state_lgd,label_state,county&returnGeometry=true&outSR=4326&f=geojson`;
const WMA_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("state_lgd='State Wildlife Reserve/Management Area'")}&outFields=state_lgd,label_state,county&returnGeometry=true&outSR=4326&f=geojson`;
const PRIVATE_QUERY_URL = `${LAND_OWNERSHIP_BASE_URL}?where=${encodeURIComponent("state_lgd='Private'")}&outFields=state_lgd,label_state,county&returnGeometry=true&outSR=4326&f=geojson`;
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

const HUNT_TYPE_ORDER = ['General', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'Management', 'Dedicated Hunter', 'Cactus Buck', 'Once-in-a-Lifetime', 'Antlerless'];
const HUNT_CATEGORY_ORDER = ['Mature Bull', 'General Bull', 'Spike Only', 'Youth', 'Extended Archery', 'Private Land Only', 'Antlerless', 'Pronghorn', 'Moose', 'Rocky Mountain Bighorn', 'Desert Bighorn', 'Mountain Goat', 'Bison', 'Turkey', 'Cougar'];
const SEX_ORDER = ['Buck', 'Bull', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = ['Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason'];

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
const toggleWildlifeWma = document.getElementById('toggleWildlifeWma');
const toggleWaterfowlWma = document.getElementById('toggleWaterfowlWma');
const togglePrivate = document.getElementById('togglePrivate');
const toggleDwrUnits = document.getElementById('toggleDwrUnits');
const toggleOutfitters = document.getElementById('toggleOutfitters');
const mapWrapEl = document.querySelector('.map-wrap');
const globeMapEl = document.getElementById('globeMap');
const OFFICIAL_DWR_WMA_PAGE_URL = 'https://wildlife.utah.gov/discover/lands/wmas.html';
const OFFICIAL_DWR_WATERFOWL_MAPS_URL = 'https://wildlife.utah.gov/hunting/maps.html';
const OFFICIAL_DWR_WATERFOWL_CONDITIONS_URL = 'https://wildlife.utah.gov/waterfowl-opener-conditions';
const OFFICIAL_DWR_WMA_LOGO_URL = 'https://static.wixstatic.com/media/43f827_42c37bffbd804a1ca0bae3654d4ad46c~mv2.jpg';
const OFFICIAL_SITLA_PAGE_URL = 'https://trustlands.utah.gov/';
const OFFICIAL_STATE_PARKS_PAGE_URL = 'https://stateparks.utah.gov/';
const OFFICIAL_STATE_PARKS_LOGO_URL = 'https://static.wixstatic.com/media/43f827_a14118657cd642c5a5f1aa4febc6f82c~mv2.png';
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
  const toggles = [toggleStateLands, toggleStateParks, toggleWildlifeWma, toggleWaterfowlWma];
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

function getWeapon(hunt) {
  return firstNonEmpty(hunt.weapon, hunt.Weapon, hunt.WEAPON);
}

function getDates(hunt) {
  return firstNonEmpty(hunt.seasonLabel, hunt.seasonDates, hunt.dates, hunt.Dates);
}

function getHuntType(hunt) {
  return firstNonEmpty(hunt.huntType, hunt.HuntType, hunt.hunt_type, hunt.type, hunt.Type);
}

function getHuntCategory(hunt) {
  return firstNonEmpty(hunt.huntCategory, hunt.HuntCategory, hunt.hunt_category, getHuntType(hunt));
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
  if (text === 'mule deer' || text === 'deer') return 'Mule Deer';
  return titleCaseWords(text);
}

function getSpeciesDisplayList(hunt) {
  return Array.from(new Set(getSpeciesList(hunt).map(normalizeSpeciesLabel).filter(Boolean)));
}

function getSpeciesDisplay(hunt) {
  return getSpeciesDisplayList(hunt)[0] || normalizeSpeciesLabel(getSpeciesRaw(hunt));
}

function getNormalizedSex(valueOrHunt) {
  const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex, valueOrHunt.SEX);
  const hunt = typeof valueOrHunt === 'object' ? valueOrHunt : null;
  const lower = raw.toLowerCase();
  if (lower.includes('choice')) return "Hunter's Choice";
  if (lower.includes('either')) return 'Either Sex';
  if (lower === 'doe' || lower === 'cow' || lower === 'ewe' || lower.includes('antlerless')) return 'Antlerless';
  if (lower.includes('buck')) return 'Buck';
  if (lower.includes('bull')) return 'Bull';
  if (lower === 'buck/bull' && hunt) {
    const species = getSpeciesDisplay(hunt).toLowerCase();
    if (species.includes('elk') || species.includes('moose')) return 'Bull';
    return 'Buck';
  }
  return titleCaseWords(raw);
}

function getSexOptionsForSpecies(speciesValue) {
  const species = safe(speciesValue).trim().toLowerCase();
  if (species === 'mule deer' || species === 'deer') {
    return ['All', 'Buck', 'Antlerless', 'Either Sex'];
  }
  if (species === 'elk') {
    return ['All', 'Bull', 'Antlerless', 'Either Sex'];
  }
  if (species === 'pronghorn') {
    return ['All', 'Buck', 'Antlerless', 'Either Sex'];
  }
  if (species === 'moose') {
    return ['All', 'Bull', 'Antlerless', 'Either Sex'];
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

function getOverlayFeatureLabel(feature) {
  const properties = feature && feature.properties ? feature.properties : {};
  return firstNonEmpty(
    properties.label_state,
    properties.NAME,
    properties.name,
    properties.county,
    'Selected Area'
  );
}

function buildOverlayInfoContent(kind, feature) {
  const label = getOverlayFeatureLabel(feature);
  const safeLabel = escapeHtml(label);
  const wmaLogoHtml = `
    <div style="margin-bottom:10px;text-align:center;">
      <img
        src="${OFFICIAL_DWR_WMA_LOGO_URL}"
        alt="Utah DWR WMA"
        style="display:block;margin:0 auto;max-width:88px;height:auto;"
      >
    </div>
  `;

  const stateParksLogoHtml = `
    <div style="margin-bottom:10px;text-align:center;">
      <img
        src="${OFFICIAL_STATE_PARKS_LOGO_URL}"
        alt="Utah State Parks"
        style="display:block;margin:0 auto;max-width:88px;height:auto;"
      >
    </div>
  `;

  if (kind === 'sitla') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        <strong>${safeLabel}</strong><br>
        Official Utah Trust Lands reference.
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_SITLA_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah Trust Lands</a>
        </div>
      </div>
    `;
  }

  if (kind === 'stateParks') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${stateParksLogoHtml}
        <strong>${safeLabel}</strong><br>
        Official Utah State Parks reference.
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_STATE_PARKS_PAGE_URL}" target="_blank" rel="noopener noreferrer">Utah State Parks</a>
        </div>
      </div>
    `;
  }

  if (kind === 'waterfowlWma') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${wmaLogoHtml}
        <strong>${safeLabel}</strong><br>
        Official Utah DWR waterfowl management area reference.
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_DWR_WATERFOWL_CONDITIONS_URL}" target="_blank" rel="noopener noreferrer">Waterfowl Conditions & Maps</a>
          <a href="${OFFICIAL_DWR_WATERFOWL_MAPS_URL}" target="_blank" rel="noopener noreferrer">DWR Hunting Maps</a>
        </div>
      </div>
    `;
  }

  if (kind === 'wildlifeWma') {
    return `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#2b1c12;line-height:1.4;max-width:260px;">
        ${wmaLogoHtml}
        <strong>${safeLabel}</strong><br>
        Official Utah DWR wildlife management area reference.
        <div style="margin-top:10px;display:grid;gap:6px;">
          <a href="${OFFICIAL_DWR_WMA_PAGE_URL}" target="_blank" rel="noopener noreferrer">DWR WMA Information</a>
          <a href="${OFFICIAL_DWR_WATERFOWL_MAPS_URL}" target="_blank" rel="noopener noreferrer">DWR Hunting Maps</a>
        </div>
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
  if (!layer || kind === 'usfs' || kind === 'blm' || kind === 'stateLands' || kind === 'private') {
    return;
  }

  layer.addListener('click', event => {
    if (!overlayInfoWindow) {
      overlayInfoWindow = new google.maps.InfoWindow();
    }

    const featureData = {
      properties: {
        label_state: event.feature ? event.feature.getProperty('label_state') : '',
        NAME: event.feature ? event.feature.getProperty('NAME') : '',
        name: event.feature ? event.feature.getProperty('name') : '',
        county: event.feature ? event.feature.getProperty('county') : ''
      }
    };

    overlayInfoWindow.setContent(buildOverlayInfoContent(kind, featureData));
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
        fillOpacity: 0
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
        strokeColor: '#2f8f6b',
        strokeOpacity: 0.94,
        strokeWeight: 2.1,
        fillColor: '#2f8f6b',
        fillOpacity: 0.06
      }
    },
    waterfowlWma: {
      url: WMA_QUERY_URL,
      style: {
        strokeColor: '#2d6f9f',
        strokeOpacity: 0.94,
        strokeWeight: 2.1,
        fillColor: '#2d6f9f',
        fillOpacity: 0.06
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
    if (toggleUSFS && toggleUSFS.checked) {
      await ensureOverlayLayer('usfs');
      setOverlayVisibility('usfs', true);
    } else {
      setOverlayVisibility('usfs', false);
    }

    if (toggleBLM && toggleBLM.checked) {
      await ensureOverlayLayer('blm');
      setOverlayVisibility('blm', true);
    } else {
      setOverlayVisibility('blm', false);
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

    if (toggleWildlifeWma && toggleWildlifeWma.checked) {
      await ensureOverlayLayer('wildlifeWma');
      setOverlayVisibility('wildlifeWma', true);
    } else {
      setOverlayVisibility('wildlifeWma', false);
    }

    if (toggleWaterfowlWma && toggleWaterfowlWma.checked) {
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
    const weaponOk = excludeKey === 'weapon' || weapon === 'All' || getWeapon(hunt) === weapon;
    const huntTypeOk = excludeKey === 'huntType' || huntType === 'All' || getHuntType(hunt) === huntType;
    const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || getHuntCategory(hunt) === huntCategory;
    const unitOk = excludeKey === 'unit' || !unit || getUnitValue(hunt) === unit || getUnitName(hunt) === unit || getUnitCode(hunt) === unit;

    return searchOk && speciesOk && sexOk && weaponOk && huntTypeOk && huntCategoryOk && unitOk;
  });
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
  const filteredValues = getFilteredSexValues();
  sortWithPreferredOrder(filteredValues, SEX_ORDER);

  let options = getSexOptionsForSpecies(selectedSpecies);
  if (options) {
    options = ['All', ...options.filter(value => value !== 'All' && filteredValues.includes(value))];
  } else {
    options = ['All', ...filteredValues];
  }

  sexFilter.innerHTML = options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  sexFilter.value = options.includes(previous) ? previous : 'All';
}

function populateWeapons() {
  const previous = weaponFilter.value || 'All';
  const values = Array.from(new Set(getFilteredHunts('weapon').map(hunt => getWeapon(hunt)).filter(Boolean)));
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
  populateWeapons();
  populateHuntTypes();
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
    <div class="detail-grid">
      <div><strong>Hunt #</strong>${escapeHtml(getHuntCode(selectedHunt))}</div>
      <div><strong>Unit</strong>${escapeHtml(getUnitName(selectedHunt))}</div>
      <div><strong>Species</strong>${escapeHtml(getSpeciesDisplay(selectedHunt))}</div>
      <div><strong>Sex</strong>${escapeHtml(getNormalizedSex(selectedHunt))}</div>
      <div><strong>Weapon</strong>${escapeHtml(getWeapon(selectedHunt))}</div>
      <div><strong>Dates</strong>${escapeHtml(getDates(selectedHunt))}</div>
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
  const filteredNames = getFilteredBoundaryNames();
  const selectedNames = selectedHunt ? buildBoundaryMatchSet(selectedHunt) : new Set();
  huntUnitsLayer.setStyle(feature => {
    const boundaryName = getFeatureBoundaryName(feature).toLowerCase();
    const shouldShow = filteredNames.size ? filteredNames.has(boundaryName) : false;
    const isSelected = selectedNames.has(boundaryName);
    return {
      visible: shouldShow,
      strokeColor: isSelected ? '#d07b44' : '#3653b3',
      strokeWeight: isSelected ? 3 : 1.4,
      fillColor: isSelected ? '#d07b44' : '#8fa7e8',
      fillOpacity: isSelected ? 0.22 : 0.08
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
  huntUnitsLayer.addListener('mouseover', () => {
    googleBaselineMap.setOptions({ draggableCursor: 'pointer' });
  });
  huntUnitsLayer.addListener('mouseout', () => {
    googleBaselineMap.setOptions({ draggableCursor: '' });
  });
  huntUnitsLayer.addListener('click', event => {
    const matches = findMatchingHuntsForFeature(event.feature);
    selectedBoundaryMatches = matches;
    const boundaryName = getFeatureBoundaryName(event.feature);
    renderMapChooser(matches, boundaryName);

    if (!boundaryInfoWindow) boundaryInfoWindow = new google.maps.InfoWindow();
    boundaryInfoWindow.setContent(`<div style="font-family:Segoe UI,Arial,sans-serif;"><strong>${escapeHtml(boundaryName)}</strong><br>${matches.length} matching hunt${matches.length === 1 ? '' : 's'}</div>`);
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

  if (toggleWildlifeWma) {
    toggleWildlifeWma.addEventListener('change', () => {
      updateStateLayersSummary();
      void syncOverlayToggles();
    });
  }

  if (toggleWaterfowlWma) {
    toggleWaterfowlWma.addEventListener('change', () => {
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
