const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;

// --- CLOUDFLARE JSON SOURCES ---
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const HUNT_DATA_VERSION = '20260324-master-1733';
const LOCAL_HUNT_BOUNDARIES_PATH = `${CLOUDFLARE_BASE}/hunt_boundaries.geojson`;
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`];
const LOGO_DNR = './assets/logos/dnr-logo-small.png';
const LOGO_DWR_WMA = './assets/logos/dwr-wma.jpg';
const LOGO_USFS = './assets/logos/usfs.png';
const LOGO_BLM = './assets/logos/blm.png';
const LOGO_SITLA = './assets/logos/sitla.png';
const LOGO_STATE_PARKS = './assets/logos/state-parks.png';
const LAND_OWNERSHIP_QUERY_URL = 'https://gis.trustlands.utah.gov/mapping/rest/services/Land_Ownership/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';

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

const HUNT_TYPE_ORDER = [ 'General', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'Management', 'Dedicated Hunter', 'CWMU', 'Private Land Only', 'Conservation', 'Once-in-a-Lifetime', 'Antlerless' ];
const HUNT_CLASS_ORDER = [ 'General Season', 'Limited Entry', 'Premium Limited Entry', 'Youth', 'Management', 'Antlerless', 'CWMU', 'Private Land Only', 'Conservation', 'Statewide Permit', 'Extended Archery' ];
const SEX_ORDER = ['Buck', 'Bull', 'Ram', 'Ewe', 'Bearded', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = [ 'Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason' ];

let googleBaselineMap = null, cesiumViewer = null, huntUnitsLayer = null, googleApiReady = false, huntHoverFeature = null, selectedBoundaryFeature = null, huntData = [], huntBoundaryGeoJson = null, selectedBoundaryMatches = [], selectedHunt = null, selectionInfoWindow = null, usfsLayer = null, blmLayer = null, sitlaLayer = null, stateLandsLayer = null, stateParksLayer = null, wmaLayer = null, privateLayer = null, outfitters = [], outfitterMarkers = [], activeLoads = 0;

const searchInput = document.getElementById('searchInput'),
  speciesFilter = document.getElementById('speciesFilter'),
  sexFilter = document.getElementById('sexFilter'),
  huntTypeFilter = document.getElementById('huntTypeFilter'),
  weaponFilter = document.getElementById('weaponFilter'),
  huntCategoryFilter = document.getElementById('huntCategoryFilter'),
  unitFilter = document.getElementById('unitFilter'),
  mapTypeSelect = document.getElementById('mapTypeSelect'),
  resetViewBtn = document.getElementById('resetViewBtn'),
  applyFiltersBtn = document.getElementById('applyFiltersBtn'),
  clearFiltersBtn = document.getElementById('clearFiltersBtn'),
  statusEl = document.getElementById('status'),
  toggleDwrUnits = document.getElementById('toggleDwrUnits'),
  toggleUSFS = document.getElementById('toggleUSFS'),
  toggleBLM = document.getElementById('toggleBLM'),
  toggleSITLA = document.getElementById('toggleSITLA'),
  toggleStateLands = document.getElementById('toggleStateLands'),
  toggleStateParks = document.getElementById('toggleStateParks'),
  toggleWma = document.getElementById('toggleWma'),
  togglePrivate = document.getElementById('togglePrivate'),
  stateLayersSummary = document.getElementById('stateLayersSummary'),
  toggleOutfitters = document.getElementById('toggleOutfitters'),
  mapChooser = document.getElementById('mapChooser'),
  mapChooserTitle = document.getElementById('mapChooserTitle'),
  mapChooserKicker = document.getElementById('mapChooserKicker'),
  mapChooserBody = document.getElementById('mapChooserBody');

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

function getSpeciesDisplayList(h) { 
  return Array.from(new Set(safe(firstNonEmpty(h.species, h.Species)).split(',').map(normalizeSpeciesLabel).filter(Boolean))); 
}
function getSpeciesDisplay(h) { return getSpeciesDisplayList(h)[0] || ''; }

function getNormalizedSex(valueOrHunt) {
  const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex);
  const hunt = typeof valueOrHunt === 'string' ? null : valueOrHunt;
  const val = raw.toLowerCase();
  if (val.includes('choice')) return "Hunter's Choice";
  if (val.includes('either')) return 'Either Sex';
  if (val === 'ewe') return 'Ewe';
  if (val === 'doe' || val === 'cow' || val.includes('antlerless')) return 'Antlerless';
  if (val.includes('bearded')) return 'Bearded';
  if (val.includes('ram')) return 'Ram';
  if (val.includes('buck')) return 'Buck';
  if (val.includes('bull')) return 'Bull';
  if (val.includes('male only') && hunt) {
    const species = getSpeciesDisplay(hunt);
    if (species === 'Rocky Mountain Bighorn Sheep') return 'Ram';
    if (species === 'Desert Bighorn Sheep') return 'Ram';
  }
  return titleCaseWords(raw) || 'All';
}

function getHuntCode(h) { return firstNonEmpty(h.huntCode, h.hunt_code, h.HuntCode, h.code); }
function getHuntTitle(h) { return firstNonEmpty(h.title, h.Title, h.huntTitle, getHuntCode(h)); }
function getUnitCode(h) { return firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode); }
function getUnitName(h) { return firstNonEmpty(h.unitName, h.unit_name, h.UnitName); }
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
  if (lower.includes('general')) return 'General';
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
  if (lower.includes('antlerless')) return 'Antlerless';
  if (lower.includes('general')) return 'General Season';
  return value;
}
function getHuntCategory(h) { return normalizeHuntCategoryLabel(firstNonEmpty(h.huntCategory, h.HuntCategory, h.category)); }
function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates); }
function getBoundaryLink(h) { return firstNonEmpty(h.boundaryLink, h.boundaryURL, h.huntBoundaryLink); }
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
    weaponFilter?.value && weaponFilter.value !== 'All' ? weaponFilter.value : '',
    huntCategoryFilter?.value && huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : '',
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
function normalizeListValues(values) {
  if (Array.isArray(values)) return values.map(v => safe(v).trim()).filter(Boolean);
  const one = safe(values).trim();
  return one ? [one] : [];
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
  if (bucket === 'stateLands') return 'State Lands';
  if (bucket === 'private') return 'Private Land';
  if (bucket === 'wma') {
    const name = slugText(getOwnershipName(props));
    return WATERFOWL_WMA_NAMES.has(name) ? 'WMA' : 'WMA';
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
  if (county) detailBits.push(`${county} County`);
  if (acres) detailBits.push(`${acres} acres`);
  const detailText = detailBits.join(' | ');
  let logo = '';
  if (bucket === 'sitla') logo = LOGO_SITLA;
  if (bucket === 'stateParks') logo = LOGO_STATE_PARKS;
  if (bucket === 'wma') logo = LOGO_DWR_WMA;
  return {
    logo,
    title: getOwnershipTitle(bucket, props),
    subtitle: getOwnershipSubtitle(bucket, props),
    detailText
  };
}
function setLayerVisibility(layer, visible) {
  if (!layer) return;
  layer.setMap(visible ? googleBaselineMap : null);
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
  closeSelectionInfoWindow();
  if (event && event.target && event.target.id === 'speciesFilter') {
    if (sexFilter) sexFilter.value = 'All';
    if (huntTypeFilter) huntTypeFilter.value = 'All';
    if (weaponFilter) weaponFilter.value = 'All';
    if (huntCategoryFilter) huntCategoryFilter.value = 'All';
    if (unitFilter) unitFilter.value = '';
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

  const weaponData = getFilteredHunts('weapon');
  const weaponOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...weaponData.map(getWeapon).filter(Boolean)])), ['All', ...WEAPON_ORDER]);
  const prevWeapon = weaponFilter.value || 'All';
  weaponFilter.innerHTML = weaponOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  weaponFilter.value = weaponOptions.includes(prevWeapon) ? prevWeapon : 'All';

  const categoryData = getFilteredHunts('huntCategory');
  const categoryOptions = sortWithPreferredOrder(Array.from(new Set(['All', ...categoryData.map(getHuntCategory).filter(Boolean)])), ['All', ...HUNT_CLASS_ORDER]);
  const prevHuntCategory = huntCategoryFilter.value || 'All';
  huntCategoryFilter.innerHTML = categoryOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  huntCategoryFilter.value = categoryOptions.includes(prevHuntCategory) ? prevHuntCategory : 'All';

  const hasNonUnitSelections = [
    safe(searchInput?.value).trim(),
    speciesFilter.value !== 'All Species' ? speciesFilter.value : '',
    sexFilter.value !== 'All' ? sexFilter.value : '',
    huntTypeFilter.value !== 'All' ? huntTypeFilter.value : '',
    weaponFilter.value !== 'All' ? weaponFilter.value : '',
    huntCategoryFilter.value !== 'All' ? huntCategoryFilter.value : ''
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

function buildLandInfoCard({ logo, title, subtitle, detailText = '', detailsLinkText = '', detailsLink = '' }) {
  const resolvedLogo = logo ? assetUrl(logo) : '';
  return `
    <div style="display:grid;gap:8px;min-width:270px;max-width:320px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${resolvedLogo ? `<img src="${resolvedLogo}" alt="${escapeHtml(subtitle)} logo" style="width:46px;height:46px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;border:1px solid #d6c1ae;">` : ''}
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#bf6b34;">${escapeHtml(subtitle)}</div>
          <div style="font-size:15px;font-weight:900;color:#2b1c12;">${escapeHtml(title)}</div>
        </div>
      </div>
      ${detailText ? `<div style="font-size:12px;line-height:1.35;color:#6b5646;">${escapeHtml(detailText)}</div>` : ''}
      ${detailsLink ? `<a href="${escapeHtml(detailsLink)}" target="_blank" rel="noopener noreferrer" style="color:#2f7fd1;font-weight:800;text-decoration:none;">${escapeHtml(detailsLinkText || 'Open details')}</a>` : ''}
    </div>`;
}
function buildDnrPlate(hunt, compact = false) {
  const plateUrl = assetUrl(LOGO_DNR);
  const code = escapeHtml(getHuntCode(hunt) || '');
  const unit = escapeHtml(getUnitName(hunt) || getHuntTitle(hunt));
  const species = escapeHtml(getSpeciesDisplay(hunt) || 'N/A');
  const sex = escapeHtml(getNormalizedSex(hunt) || 'N/A');
  const huntType = escapeHtml(getHuntType(hunt) || 'N/A');
  const weapon = escapeHtml(getWeapon(hunt) || 'N/A');
  const dates = escapeHtml(getDates(hunt) || 'See official hunt details');
  const boundaryLink = getBoundaryLink(hunt);
  const wrapperWidth = compact ? 'min-width:390px;max-width:470px;' : 'width:100%;max-width:100%;';
  const titleSize = compact ? '17px' : '19px';
  const metaSize = compact ? '11.5px' : '12.5px';
  const infoTop = compact ? '14px' : '16px';
  const infoLeft = compact ? '31.5%' : '31%';

  return `
    <div style="position:relative;${wrapperWidth}border:1px solid #d38449;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(58,37,18,0.18);aspect-ratio:1331 / 521;min-height:${compact ? '150px' : '168px'};background-image:url('${plateUrl}');background-size:cover;background-position:center;background-repeat:no-repeat;">
      <img src="${plateUrl}" alt="Utah DNR hunt information plate" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.001;pointer-events:none;" />
      <div style="position:absolute;top:${infoTop};left:${infoLeft};right:14px;bottom:14px;display:grid;align-content:start;gap:${compact ? '6px' : '8px'};color:#2b1c12;">
        <div style="display:grid;gap:2px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#bf6b34;">Selected Hunt</div>
          <div style="font-size:${titleSize};font-weight:900;line-height:1.05;">${code}</div>
          <div style="font-size:${compact ? '14px' : '15px'};font-weight:800;line-height:1.12;">${unit}</div>
        </div>
        <div style="display:grid;gap:${compact ? '3px' : '5px'};font-size:${metaSize};line-height:1.25;">
          <div><strong>Species:</strong> ${species}</div>
          <div><strong>Sex:</strong> ${sex}</div>
          <div><strong>Hunt Type:</strong> ${huntType}</div>
          <div><strong>Weapon:</strong> ${weapon}</div>
          <div><strong>Dates:</strong> ${dates}</div>
        </div>
        ${boundaryLink ? `<a href="${escapeHtml(boundaryLink)}" target="_blank" rel="noopener noreferrer" style="margin-top:2px;color:#2f7fd1;font-size:${metaSize};font-weight:800;text-decoration:none;">Official Utah DWR Hunt Details</a>` : ''}
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
  if (!p) return;
  if (!selectedHunt) {
    p.innerHTML = '<div class="empty-note">Select a hunt result or hunt unit to see details.</div>';
    return;
  }
  p.innerHTML = `
    <div style="display:grid;gap:12px;">
      ${buildDnrPlate(selectedHunt, false)}
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

function getMatchingOutfittersForHunt(hunt) {
  if (!hunt || !outfitters.length) return [];
  const species = normalizeBoundaryKey(getSpeciesDisplay(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const evaluated = outfitters.map(o => {
    const speciesServed = normalizeListValues(o.speciesServed).map(normalizeBoundaryKey);
    const unitsServed = normalizeListValues(o.unitsServed).map(normalizeBoundaryKey);
    const speciesMatch = !speciesServed.length || speciesServed.includes(species);
    const unitMatch = !unitsServed.length
      || unitsServed.includes(unitCode)
      || unitsServed.includes(unitName)
      || unitsServed.some(u => unitName.includes(u) || u.includes(unitName) || unitCode.includes(u));
    return { outfitter: o, speciesMatch, unitMatch };
  });

  const strongMatches = evaluated.filter(row => row.speciesMatch && row.unitMatch).map(row => row.outfitter);
  if (strongMatches.length) return strongMatches.slice(0, 12);

  const speciesOnlyMatches = evaluated.filter(row => row.speciesMatch).map(row => row.outfitter);
  return speciesOnlyMatches.slice(0, 12);
}

function renderOutfitters() {
  const container = document.getElementById('outfitterResults');
  if (!container) return;
  if (!selectedHunt) {
    container.innerHTML = '<div class="empty-note">Select a hunt to load matching vetted outfitters.</div>';
    return;
  }
  const matches = getMatchingOutfittersForHunt(selectedHunt);
  if (!matches.length) {
    container.innerHTML = '<div class="empty-note">No vetted outfitters matched this hunt yet.</div>';
    return;
  }
  container.innerHTML = matches.map(o => {
    const website = safe(o.website).trim();
    const phone = normalizeListValues(o.phone)[0] || '';
    const logo = safe(o.logoUrl).trim();
    return `
      <div class="outfitter-card">
        <div class="outfitter-card-header">
          ${logo ? `<img class="outfitter-card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(o.listingName || 'Outfitter logo')}">` : ''}
          <div class="outfitter-card-title-wrap">
            <div class="hunt-card-title">${escapeHtml(o.listingName || 'Outfitter')}</div>
            <div class="hunt-card-meta">${escapeHtml(firstNonEmpty(o.verificationStatus, o.certLevel, o.listingType))}</div>
          </div>
        </div>
        ${website ? `<a class="outfitter-link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Visit website</a>` : ''}
        ${phone ? `<div class="hunt-card-meta">${escapeHtml(phone)}</div>` : ''}
      </div>`;
  }).join('');
}

function updateStateLayersSummary() {
  if (!stateLayersSummary) return;
  const count = [toggleStateLands, toggleStateParks, toggleWma].filter(el => !!el?.checked).length;
  stateLayersSummary.textContent = count ? `State Lands (${count})` : 'State Lands';
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

  closeSelectedHuntPopup();
  closeSelectionInfoWindow();
  selectionInfoWindow = new google.maps.InfoWindow({
    content: buildPopupCardForHunt(selectedHunt),
    position: popupPosition,
    pixelOffset: new google.maps.Size(-120, -8)
  });
  selectionInfoWindow.open(googleBaselineMap);
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
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#bf6b34;">DWR Hunt Unit</div>
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
  closeSelectionInfoWindow();
  selectionInfoWindow = new google.maps.InfoWindow({
    content: buildPopupCardForHunt(matches[0]),
    position: latLng,
    pixelOffset: new google.maps.Size(-120, -8)
  });
  selectionInfoWindow.open(googleBaselineMap);
}

async function loadOutfitters() {
  for (const candidate of OUTFITTERS_DATA_SOURCES) {
    try {
      const resp = await fetch(candidate, { cache: 'no-store' });
      if (!resp.ok) continue;
      const json = await resp.json();
      if (Array.isArray(json) && json.length) {
        outfitters = json;
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
let ownershipGeoJsonPromise = null;
function getOwnershipGeoJson() {
  if (!ownershipGeoJsonPromise) {
    ownershipGeoJsonPromise = fetchGeoJson(LAND_OWNERSHIP_QUERY_URL);
  }
  return ownershipGeoJsonPromise;
}
function createOwnershipLayer(filterFn, style, clickBuilder) {
  const layer = new google.maps.Data();
  getOwnershipGeoJson().then(geojson => {
    const features = Array.isArray(geojson?.features) ? geojson.features.filter(f => filterFn(f.properties || {})) : [];
    layer.addGeoJson({ type: 'FeatureCollection', features });
  }).catch(err => console.error('Ownership layer failed', err));
  layer.setStyle(style);
  layer.addListener('click', event => {
    closeSelectionInfoWindow();
    const card = clickBuilder(event.feature);
    selectionInfoWindow = new google.maps.InfoWindow({
      content: card,
      position: event.latLng,
      pixelOffset: new google.maps.Size(-110, -8)
    });
    selectionInfoWindow.open(googleBaselineMap);
  });
  return layer;
}
async function ensureSitlaLayer() {
  if (sitlaLayer || !googleBaselineMap) return sitlaLayer;
  sitlaLayer = createOwnershipLayer(
    props => getOwnershipBucket(props) === 'sitla',
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
    props => getOwnershipBucket(props) === 'stateLands',
    { strokeColor: '#2f8f9a', strokeWeight: 2, fillColor: '#6ac7d2', fillOpacity: 0.08, zIndex: 17 },
    feature => buildLandInfoCard(buildOwnershipDetails('stateLands', featureProps(feature)))
  );
  setLayerVisibility(stateLandsLayer, !!toggleStateLands?.checked);
  return stateLandsLayer;
}
async function ensureStateParksLayer() {
  if (stateParksLayer || !googleBaselineMap) return stateParksLayer;
  stateParksLayer = createOwnershipLayer(
    props => getOwnershipBucket(props) === 'stateParks',
    { strokeColor: '#4d8b3b', strokeWeight: 2, fillColor: '#94c96f', fillOpacity: 0.08, zIndex: 19 },
    feature => buildLandInfoCard(buildOwnershipDetails('stateParks', featureProps(feature)))
  );
  setLayerVisibility(stateParksLayer, !!toggleStateParks?.checked);
  return stateParksLayer;
}
async function ensureWmaLayer() {
  if (wmaLayer || !googleBaselineMap) return wmaLayer;
  wmaLayer = createOwnershipLayer(
    props => getOwnershipBucket(props) === 'wma',
    { strokeColor: '#2f62c8', strokeWeight: 2, fillColor: '#7fa9ff', fillOpacity: 0.08, zIndex: 20 },
    feature => buildLandInfoCard(buildOwnershipDetails('wma', featureProps(feature)))
  );
  setLayerVisibility(wmaLayer, !!toggleWma?.checked);
  return wmaLayer;
}
async function ensurePrivateLayer() {
  if (privateLayer || !googleBaselineMap) return privateLayer;
  privateLayer = createOwnershipLayer(
    props => getOwnershipBucket(props) === 'private',
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
    closeSelectionInfoWindow();
    selectionInfoWindow = new google.maps.InfoWindow({
      content: buildLandInfoCard({
        logo: LOGO_USFS,
        title: firstNonEmpty(event.feature.getProperty('FORESTNAME'), 'National Forest'),
        subtitle: 'US Forest Service'
      }),
      position: event.latLng,
      pixelOffset: new google.maps.Size(-110, -8)
    });
    selectionInfoWindow.open(googleBaselineMap);
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
    closeSelectionInfoWindow();
    selectionInfoWindow = new google.maps.InfoWindow({
      content: buildLandInfoCard({
        logo: LOGO_BLM,
        title: firstNonEmpty(
          event.feature.getProperty('ADMU_NAME'),
          event.feature.getProperty('DISTRICT_NAME'),
          event.feature.getProperty('FIELD_OFFICE'),
          'BLM Land'
        ),
        subtitle: 'Bureau of Land Management'
      }),
      position: event.latLng,
      pixelOffset: new google.maps.Size(-110, -8)
    });
    selectionInfoWindow.open(googleBaselineMap);
  });
  setLayerVisibility(blmLayer, !!toggleBLM?.checked);
  return blmLayer;
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
  cesiumViewer.imageryLayers.removeAll();
  cesiumViewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
    url: 'https://tile.openstreetmap.org/'
  }));
  cesiumViewer.scene.globe.enableLighting = false;
  cesiumViewer.scene.globe.showGroundAtmosphere = false;
  cesiumViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#d7e7f5');
  if (cesiumViewer.scene.skyBox) cesiumViewer.scene.skyBox.show = false;
  if (cesiumViewer.scene.skyAtmosphere) cesiumViewer.scene.skyAtmosphere.show = false;
  if (cesiumViewer.scene.sun) cesiumViewer.scene.sun.show = false;
  if (cesiumViewer.scene.moon) cesiumViewer.scene.moon.show = false;
  cesiumViewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#d7e7f5');
  cesiumViewer.scene.requestRenderMode = false;
  container.style.background = '#d7e7f5';
}

function applyMapMode() {
  const value = safe(mapTypeSelect?.value || 'terrain').toLowerCase();
  const mapWrap = document.querySelector('.map-wrap');
  if (!googleBaselineMap || !mapWrap) return;

  if (value === 'globe') {
    updateStatus('Globe mode active.');
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
    return;
  }

  mapWrap.classList.remove('is-globe-mode');
  googleBaselineMap.setMapTypeId(value);
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

// --- MAP ENGINE ---
function initGoogleBaseline() {
  googleBaselineMap = new google.maps.Map(document.getElementById('map'), {
    center: GOOGLE_BASELINE_DEFAULT_CENTER, zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    styles: huntPlannerMapStyle, mapTypeId: 'terrain'
  });
  googleApiReady = true;
  if (huntBoundaryGeoJson) buildBoundaryLayer();
  if (toggleBLM?.checked) ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
  if (toggleUSFS?.checked) ensureUsfsLayer().catch(err => console.error('USFS layer failed', err));
  if (toggleSITLA?.checked) ensureSitlaLayer().catch(err => console.error('SITLA layer failed', err));
  if (toggleStateLands?.checked) ensureStateLandsLayer().catch(err => console.error('State lands layer failed', err));
  if (toggleStateParks?.checked) ensureStateParksLayer().catch(err => console.error('State parks layer failed', err));
  if (toggleWma?.checked) ensureWmaLayer().catch(err => console.error('WMA layer failed', err));
  if (togglePrivate?.checked) ensurePrivateLayer().catch(err => console.error('Private layer failed', err));
  updateStateLayersSummary();
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
    const showBoundaries = !!toggleDwrUnits?.checked && (hasActiveMatrixSelections() || !!selectedHunt);
    const filtered = getDisplayHunts();
    const boundaryIds = new Set(filtered.map(h => safe(getBoundaryId(h))).filter(Boolean));
    const unitCodes = new Set(filtered.map(h => normalizeBoundaryKey(getUnitCode(h))).filter(Boolean));
    const unitNames = new Set(filtered.map(h => normalizeBoundaryKey(getUnitName(h))).filter(Boolean));
    huntUnitsLayer.setStyle(f => {
        const id = safe(f.getProperty('BoundaryID'));
        const name = normalizeBoundaryKey(f.getProperty('Boundary_Name'));
        const isMatch = boundaryIds.has(id) || unitCodes.has(name) || unitNames.has(name);
        const isSelected = selectedHunt && (id === safe(getBoundaryId(selectedHunt)) || name === normalizeBoundaryKey(getUnitCode(selectedHunt)) || name === normalizeBoundaryKey(getUnitName(selectedHunt)));
        return {
          visible: showBoundaries && isMatch,
          strokeColor: isSelected ? '#8b1e3f' : '#3653b3',
          strokeWeight: isSelected ? 3 : 1.5,
          fillOpacity: showBoundaries && isMatch ? (isSelected ? 0.16 : 0.08) : 0
        };
    });
}

function bindControls() {
  [searchInput, speciesFilter, sexFilter, huntTypeFilter, weaponFilter, huntCategoryFilter, unitFilter].forEach(el => {
    el?.addEventListener('change', handleFilterChange);
    el?.addEventListener('input', handleFilterChange);
  });
  applyFiltersBtn?.addEventListener('click', () => {
    closeSelectedHuntPopup();
    closeSelectionInfoWindow();
    selectedHunt = null;
    selectedBoundaryFeature = null;
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
  mapTypeSelect?.addEventListener('change', applyMapMode);
  resetViewBtn?.addEventListener('click', resetMapView);
  toggleDwrUnits?.addEventListener('change', () => {
    if (!toggleDwrUnits.checked) {
      closeSelectionInfoWindow();
      closeSelectedHuntPopup();
    }
    styleBoundaryLayer();
  });
  toggleUSFS?.addEventListener('change', async () => {
    if (toggleUSFS.checked) await ensureUsfsLayer().catch(err => console.error('USFS layer failed', err));
    setLayerVisibility(usfsLayer, !!toggleUSFS.checked);
  });
  toggleBLM?.addEventListener('change', async () => {
    if (toggleBLM.checked) await ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
    setLayerVisibility(blmLayer, !!toggleBLM.checked);
    if (toggleUSFS?.checked) {
      setLayerVisibility(usfsLayer, false);
      setLayerVisibility(usfsLayer, true);
    }
  });
  toggleSITLA?.addEventListener('change', async () => {
    if (toggleSITLA.checked) await ensureSitlaLayer().catch(err => console.error('SITLA layer failed', err));
    setLayerVisibility(sitlaLayer, !!toggleSITLA.checked);
  });
  toggleStateLands?.addEventListener('change', async () => {
    if (toggleStateLands.checked) await ensureStateLandsLayer().catch(err => console.error('State lands layer failed', err));
    setLayerVisibility(stateLandsLayer, !!toggleStateLands.checked);
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
  togglePrivate?.addEventListener('change', async () => {
    if (togglePrivate.checked) await ensurePrivateLayer().catch(err => console.error('Private layer failed', err));
    setLayerVisibility(privateLayer, !!togglePrivate.checked);
  });
  toggleOutfitters?.addEventListener('change', () => {
    const section = document.getElementById('outfitterResults')?.closest('.panel');
    if (section) section.style.display = toggleOutfitters.checked ? '' : 'none';
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

// --- UPDATED LOADER LOGIC ---
function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  const video = document.getElementById('loaderVideo');
  
  if (!overlay) return;

  // Listen for the elk to finish its bugle (end of video)
  if (video) {
    video.addEventListener('ended', () => {
      overlay.style.transition = 'opacity 1s ease';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.classList.add('hidden');
      }, 1000);
    }, { once: true });
    
    // Safety fallback: Hide after 8 seconds if video fails to signal 'ended'
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 8000);
  } else {
    overlay.classList.add('hidden');
  }
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
      const resp = await fetch(LOCAL_HUNT_BOUNDARIES_PATH);
      huntBoundaryGeoJson = await resp.json();
      if (googleApiReady) buildBoundaryLayer();
  } catch(e) { console.error("GeoJSON load failed", e); }

  refreshSelectionMatrix();
  renderMatchingHunts();
  
  // Trigger cinematic fade-out linked to RUNNING_ELK.MP4
  hideLoadingOverlay();
});

function sortWithPreferredOrder(arr, pref) {
    const map = new Map(pref.map((v, i) => [v, i]));
    return arr.sort((a, b) => (map.has(a) ? map.get(a) : 99) - (map.has(b) ? map.get(b) : 99));
}
