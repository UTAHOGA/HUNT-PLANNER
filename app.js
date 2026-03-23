const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;

// --- CLOUDFLARE JSON SOURCES ---
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const LOCAL_HUNT_BOUNDARIES_PATH = `${CLOUDFLARE_BASE}/hunt-boundaries`;
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`];

const USFS_QUERY_URL =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" +
  encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") +
  "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";

const BLM_QUERY_URL =
  'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';

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

const HUNT_BOUNDARY_NAME_OVERRIDES = {
  DB1503: ['Manti, San Rafael'], DB1533: ['Manti, San Rafael'], DB1504: ['Nebo'], DB1534: ['Nebo'],
  DB1510: ['Monroe'], DB1540: ['Monroe'], DB1506: ['Fillmore'], DB1536: ['Fillmore'],
  EA1220: ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon'],
  EA1221: ['Fishlake/Thousand Lakes', 'Fishlake/Thousand Lakes East', 'Fishlake/Thousand Lakes West'],
  EA1258: ['La Sal Mtns', 'Dolores Triangle', 'La Sal, La Sal Mtns-North']
};

// Custom Google Maps Hunting Style (Clean, modern aesthetic)
const huntPlannerMapStyle = [
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#aadaff' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6688aa' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#dcf0da' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#8c8c8c' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#7e7e7e' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#4a4a4a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] }
];

const HUNT_TYPE_ORDER = [ 'General', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'Management', 'Dedicated Hunter', 'Cactus Buck', 'Once-in-a-Lifetime', 'Antlerless' ];
const HUNT_CATEGORY_ORDER = [ 'Mature Bull', 'General Bull', 'Spike Only', 'Youth', 'Extended Archery', 'Private Land Only', 'Antlerless', 'Pronghorn', 'Moose', 'Rocky Mountain Bighorn', 'Desert Bighorn', 'Mountain Goat', 'Bison', 'Turkey', 'Cougar', 'Conservation', 'Pursuit', 'Spot and Stalk', 'Control', 'CWMU', 'Select Areas', 'Statewide Permit' ];
const SEX_ORDER = ['Buck', 'Bull', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = [ 'Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason' ];

let googleBaselineMap = null;
let huntUnitsLayer = null;
let googleApiReady = false;
let huntHoverFeature = null;
let selectedBoundaryFeature = null;
let huntData = [];
let huntBoundaryGeoJson = null;
let selectedBoundaryMatches = [];
let selectedHunt = null;
let selectionInfoWindow = null;
let usfsLayer = null;
let blmLayer = null;
let outfitters = [];
let outfitterMarkers = [];
let overlaysLoaded = { usfs: false, blm: false };
let activeLoads = 0;
let loaderShowTimer = null;

const searchInput = document.getElementById('searchInput');
const speciesFilter = document.getElementById('speciesFilter');
const sexFilter = document.getElementById('sexFilter');
const weaponFilter = document.getElementById('weaponFilter');
const huntTypeFilter = document.getElementById('huntTypeFilter');
const huntCategoryFilter = document.getElementById('huntCategoryFilter');
const unitFilter = document.getElementById('unitFilter');

const OUTFITTER_CITY_LOOKUP = {
  blanding: [37.624, -109.478], beaver: [38.2769, -112.6411], cedarcity: [37.6775, -113.0619], 'cedar city': [37.6775, -113.0619], delta: [39.3527, -112.5772], duchesne: [40.1633, -110.401], ephraim: [39.3597, -111.5863], escalante: [37.7703, -111.6027], ferron: [39.093, -111.1299], fillmore: [38.9688, -112.3233], gunnison: [39.1555, -111.8199], heber: [40.507, -111.4138], 'heber city': [40.507, -111.4138], kanab: [37.0475, -112.5263], kamas: [40.643, -111.2807], loa: [38.4022, -111.6358], manti: [39.2683, -111.6369], moab: [38.5733, -109.5498], monroe: [38.6291, -112.1202], monticello: [37.8711, -109.3429], nephi: [39.7103, -111.8358], panguitch: [37.8228, -112.4358], price: [39.5994, -110.8107], richfield: [38.7725, -112.0849], roosevelt: [40.2994, -109.9888], salina: [38.9583, -111.8597], 'spanish fork': [40.1149, -111.6549], springville: [40.1652, -111.6108], vernal: [40.4555, -109.5287], 'st george': [37.0965, -113.5684], 'st. george': [37.0965, -113.5684]
};

function setLoaderText(text) {
  const label = document.getElementById('loadingText');
  if (label) label.textContent = text;
}
function showLoader(text = 'Working...') {
  setLoaderText(text);
  if (loaderShowTimer) { clearTimeout(loaderShowTimer); loaderShowTimer = null; }
  activeLoads += 1;
  loaderShowTimer = window.setTimeout(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('hidden');
    loaderShowTimer = null;
  }, 140);
}
function hideLoader() {
  if (loaderShowTimer) { clearTimeout(loaderShowTimer); loaderShowTimer = null; }
  activeLoads = Math.max(0, activeLoads - 1);
  if (activeLoads === 0) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('hidden');
  }
}
async function withLoader(text, work) { showLoader(text); try { return await work(); } finally { hideLoader(); } }
function updateStatus(message) {
  const el = document.getElementById('status');
  if (el) el.textContent = message;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay && !overlay.classList.contains('hidden')) setLoaderText(message);
}
function hideLoadingOverlay() { activeLoads = 0; const overlay = document.getElementById('loadingOverlay'); if (overlay) overlay.classList.add('hidden'); }

function setMapChooserOpen(isOpen) {
  const chooser = document.getElementById('mapChooser');
  if (!chooser) return;
  chooser.classList.toggle('is-open', isOpen);
  chooser.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function safe(value) { return String(value ?? ''); }
function firstNonEmpty(...args) { for (let i = 0; i < args.length; i += 1) { const text = safe(args[i]).trim(); if (text) return text; } return ''; }
function titleCaseWords(value) { return safe(value).split(/\s+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); }
function slugify(value) { return safe(value).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function listify(value) { if (Array.isArray(value)) return value.map(v => safe(v).trim()).filter(Boolean); return safe(value).split(/[;,|]/).map(v => safe(v).trim()).filter(Boolean); }
function normalizeUrl(url) { const raw = safe(url).trim(); if (!raw) return ''; if (/^https?:\/\//i.test(raw)) return raw; return `https://${raw}`; }
function splitPhoneList(value) { if (Array.isArray(value)) return value.map(v => safe(v).trim()).filter(Boolean); const raw = safe(value).trim(); if (!raw) return []; const matches = raw.match(/(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g); if (matches && matches.length) return matches.map(v => safe(v).trim()).filter(Boolean); return [raw]; }
function formatPhone(value) { const digits = safe(value).replace(/\D/g, ''); if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`; return safe(value); }
function formatPhoneList(value) { return splitPhoneList(value).map(formatPhone).filter(Boolean).join(', '); }

function getOutfitterCityCenter(outfitter) {
  const rawCity = safe(outfitter && outfitter.city).trim().toLowerCase();
  if (!rawCity) return null;
  return OUTFITTER_CITY_LOOKUP[rawCity] || OUTFITTER_CITY_LOOKUP[rawCity.replace(/\./g, '')] || OUTFITTER_CITY_LOOKUP[rawCity.replace(/\s+/g, '')] || null;
}

function getHuntCode(h) { return firstNonEmpty(h.huntCode, h.hunt_code, h.HuntCode, h.code, h.Code); }
function getHuntTitle(h) { return firstNonEmpty(h.title, h.Title, h.huntTitle, h.hunt_title, getHuntCode(h)); }
function getUnitCode(h) { return firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode, h.UNIT_CODE, h.unit, h.Unit); }
function getUnitName(h) { return firstNonEmpty(h.unitName, h.unit_name, h.UnitName, h.UNIT_NAME, getUnitCode(h)); }
function getUnitValue(h) { return firstNonEmpty(getUnitCode(h), getUnitName(h)); }
function getSpeciesRaw(h) { return firstNonEmpty(h.species, h.Species, h.SPECIES); }
function getSpeciesList(h) { return getSpeciesRaw(h).split(',').map(v => v.trim()).filter(Boolean); }
function getWeapon(h) { return firstNonEmpty(h.weapon, h.Weapon, h.WEAPON); }
function getHuntType(h) { return firstNonEmpty(h.huntType, h.HuntType, h.hunt_type, h.type, h.Type); }

function getHuntCategory(h) {
  let c = firstNonEmpty(h.huntCategory, h.HuntCategory, h.hunt_category);
  if (c) return c;
  const sp = getSpeciesList(h).map(s => s.toLowerCase());
  const ti = getHuntTitle(h).toLowerCase();
  const ty = getHuntType(h).toLowerCase();
  if (ti.includes('antlerless')) return 'Antlerless';
  if (ti.includes('private-lands') || ti.includes('private lands')) return 'Private Land Only';
  if (ti.includes('extended archery')) return 'Extended Archery';
  if (ti.includes('spike')) return 'Spike Only';
  if (ty.includes('youth') || ti.includes('youth')) return 'Youth';
  if (ty.includes('mature bull')) return 'Mature Bull';
  if (sp.includes('elk') && ty.includes('general')) return 'General Bull';
  return ty || '';
}

function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates, h.Dates); }

function normalizeSpeciesLabel(value) {
  const text = safe(value).trim();
  if (!text) return '';
  if (text.toLowerCase() === 'mule deer') return 'Deer';
  return text;
}

function getSpeciesDisplayList(h) { return Array.from(new Set(getSpeciesList(h).map(normalizeSpeciesLabel).filter(Boolean))); }
function getSpeciesDisplay(h) { return getSpeciesDisplayList(h)[0] || normalizeSpeciesLabel(getSpeciesRaw(h)); }

function getNormalizedSex(valueOrHunt) {
  const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex, valueOrHunt.SEX);
  const hunt = typeof valueOrHunt === 'object' ? valueOrHunt : null;
  const title = hunt ? getHuntTitle(hunt).toLowerCase() : '';
  const species = hunt ? getSpeciesDisplay(hunt).toLowerCase() : '';

  if (title.includes("hunter's choice") || title.includes('hunters choice')) return "Hunter's Choice";
  if (raw === 'Either' || title.includes('either sex')) return 'Either Sex';
  if (safe(raw).trim().toLowerCase() === 'buck/bull') {
    if (species.includes('deer') || species.includes('pronghorn')) return 'Buck';
    if (species.includes('elk') || species.includes('moose')) return 'Bull';
    return 'Either Sex';
  }
  if (raw === 'Doe' || raw === 'Cow' || raw === 'Ewe') return 'Antlerless';
  return raw;
}

function getDwrHuntInfoUrl(hunt) {
  const huntCode = safe(getHuntCode(hunt)).trim();
  return huntCode ? `https://dwrapps.utah.gov/huntboundary/PrintABoundary?HN=${encodeURIComponent(huntCode)}` : 'https://dwrapps.utah.gov/huntboundary/hbstart';
}

function getSelectedMapType() {
  const select = document.getElementById('mapTypeSelect');
  return select && select.value ? select.value : 'terrain';
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

function matchesFilter(selected, value) {
  const s = safe(selected).trim().toLowerCase();
  const v = safe(value).trim().toLowerCase();
  if (!s || s === 'all' || s === 'all species') return true;
  if (!v) return false;
  if (s === v) return true;
  return v.includes(s) || s.includes(v);
}

function hasActiveFilters() {
  return Boolean(
    safe(searchInput?.value).trim() ||
    safe(speciesFilter?.value) !== 'All Species' ||
    safe(sexFilter?.value) !== 'All' ||
    safe(weaponFilter?.value) !== 'All' ||
    safe(huntTypeFilter?.value) !== 'All' ||
    safe(huntCategoryFilter?.value) !== 'All' ||
    safe(unitFilter?.value).trim()
  );
}

function getFilteredHunts(excludeKey = '') {
  const search = safe(searchInput?.value).trim().toLowerCase();
  const species = safe(speciesFilter?.value || 'All Species');
  const sex = safe(sexFilter?.value || 'All');
  const weapon = safe(weaponFilter?.value || 'All');
  const huntType = safe(huntTypeFilter?.value || 'All');
  const huntCategory = safe(huntCategoryFilter?.value || 'All');
  const unit = safe(unitFilter?.value || '');

  return huntData.filter(h => {
    const title = getHuntTitle(h).toLowerCase();
    const code = getHuntCode(h).toLowerCase();
    const unitName = getUnitName(h).toLowerCase();
    const unitCode = getUnitCode(h).toLowerCase();

    const searchOk = !search || title.includes(search) || code.includes(search) || unitName.includes(search) || unitCode.includes(search);
    const speciesOk = excludeKey === 'species' || species === 'All Species' || getSpeciesDisplayList(h).map(x => x.toLowerCase()).includes(species.toLowerCase());
    const sexOk = excludeKey === 'sex' || matchesFilter(sex, getNormalizedSex(h));
    const weaponOk = excludeKey === 'weapon' || matchesFilter(weapon, getWeapon(h));
    const huntTypeOk = excludeKey === 'huntType' || matchesFilter(huntType, getHuntType(h));
    const huntCategoryOk = excludeKey === 'huntCategory' || matchesFilter(huntCategory, getHuntCategory(h));
    const unitOk = excludeKey === 'unit' || !unit || getUnitValue(h) === unit || getUnitName(h) === unit || getUnitCode(h) === unit;

    return searchOk && speciesOk && sexOk && weaponOk && huntTypeOk && huntCategoryOk && unitOk;
  });
}

function refreshSelectionMatrix() {
  if (!speciesFilter) return;

  // 1. Species
  const prevSpecies = speciesFilter.value || 'All Species';
  const speciesSet = new Set(['All Species']);
  getFilteredHunts('species').forEach(h => getSpeciesDisplayList(h).forEach(s => speciesSet.add(s)));
  const speciesOptions = Array.from(speciesSet).sort((a, b) => (a === 'All Species' ? -1 : b === 'All Species' ? 1 : a.localeCompare(b)));
  speciesFilter.innerHTML = speciesOptions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (!speciesOptions.includes(prevSpecies) && prevSpecies !== 'All Species') speciesFilter.value = 'All Species';
  else speciesFilter.value = prevSpecies;

  // 2. Sex 
  const prevSex = sexFilter.value || 'All';
  const sexSet = new Set(['All']);
  getFilteredHunts('sex').forEach(h => {
    const s = getNormalizedSex(h);
    if (s) sexSet.add(s);
  });
  const sexOptions = sortWithPreferredOrder(Array.from(sexSet), ['All', ...SEX_ORDER]);
  sexFilter.innerHTML = sexOptions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (!sexOptions.includes(prevSex) && prevSex !== 'All') sexFilter.value = 'All';
  else sexFilter.value = prevSex;

  // 3. Weapon
  const prevWeapon = weaponFilter.value || 'All';
  const weaponSet = new Set(['All']);
  getFilteredHunts('weapon').forEach(h => {
    const w = getWeapon(h);
    if (w) weaponSet.add(w);
  });
  const weaponOptions = sortWithPreferredOrder(Array.from(weaponSet), ['All', ...WEAPON_ORDER]);
  weaponFilter.innerHTML = weaponOptions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (!weaponOptions.includes(prevWeapon) && prevWeapon !== 'All') weaponFilter.value = 'All';
  else weaponFilter.value = prevWeapon;

  // 4. Hunt Type
  const prevType = huntTypeFilter.value || 'All';
  const typeSet = new Set(['All']);
  getFilteredHunts('huntType').forEach(h => {
    const t = getHuntType(h);
    if (t) typeSet.add(t);
  });
  const typeOptions = sortWithPreferredOrder(Array.from(typeSet), ['All', ...HUNT_TYPE_ORDER]);
  huntTypeFilter.innerHTML = typeOptions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v === 'General' ? 'General Season' : v)}</option>`).join('');
  if (!typeOptions.includes(prevType) && prevType !== 'All') huntTypeFilter.value = 'All';
  else huntTypeFilter.value = prevType;

  // 5. Hunt Category
  const prevCat = huntCategoryFilter.value || 'All';
  const catSet = new Set(['All']);
  getFilteredHunts('huntCategory').forEach(h => {
    const c = getHuntCategory(h);
    if (c) catSet.add(c);
  });
  const catOptions = sortWithPreferredOrder(Array.from(catSet), ['All', ...HUNT_CATEGORY_ORDER]);
  huntCategoryFilter.innerHTML = catOptions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if (!catOptions.includes(prevCat) && prevCat !== 'All') huntCategoryFilter.value = 'All';
  else huntCategoryFilter.value = prevCat;

  // 6. Unit
  const prevUnit = unitFilter.value || '';
  const unitsMap = new Map();
  getFilteredHunts('unit').forEach(h => {
    const val = getUnitValue(h);
    if (val && !unitsMap.has(val)) unitsMap.set(val, getUnitName(h) || val);
  });
  const unitOptions = Array.from(unitsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  unitFilter.innerHTML = `<option value="">All Units</option>` + unitOptions.map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join('');
  if (!unitOptions.some(([v]) => v === prevUnit) && prevUnit !== '') unitFilter.value = '';
  else unitFilter.value = prevUnit;
}

async function fetchJsonWithCandidates(candidates) {
  let lastStatus = 'not-started';
  for (const url of candidates) {
    const response = await fetch(url, { cache: 'no-store' });
    lastStatus = response.status;
    if (!response.ok) continue;
    return response.json();
  }
  throw new Error(`Failed to load hunt dataset: ${lastStatus}`);
}

async function loadHuntData() {
  return withLoader('Loading hunt datasets...', async () => {
    const merged = [];
    for (const source of HUNT_DATA_SOURCES) {
      try {
        const payload = await fetchJsonWithCandidates(source.candidates);
        const records = Array.isArray(payload) ? payload : Array.isArray(payload.records) ? payload.records : Array.isArray(payload.data) ? payload.data : [];
        if (!records.length) {
          if (source.required) throw new Error(`No records found in ${source.label}.`);
          continue;
        }
        merged.push(...records);
      } catch (error) {
        if (source.required) throw error;
        console.warn(`Optional dataset ${source.label} failed to load.`, error);
      }
    }
    const seenKeys = new Set();
    huntData = merged.filter(record => {
      const key = [ safe(getHuntCode(record)).trim(), safe(getUnitCode(record)).trim(), safe(getWeapon(record)).trim(), safe(getDates(record)).trim() ].join('||') || JSON.stringify(record);
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
  });
}

async function loadOutfittersData() {
  return withLoader('Loading outfitter dataset...', async () => {
    for (const url of OUTFITTERS_DATA_SOURCES) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) continue;
        const data = await response.json();
        if (!Array.isArray(data)) continue;

        outfitters = data.map(o => ({
          listingName: safe(o.listingName || o.name).trim(),
          website: normalizeUrl(o.website),
          city: safe(o.city).trim(),
          address: safe(o.address).trim(),
          lat: o.lat ? parseFloat(o.lat) : null,
          lng: o.lng ? parseFloat(o.lng) : null,
          logoUrl: safe(o.logoUrl).trim(),
          phone: Array.isArray(o.phone) ? o.phone.join(', ') : safe(o.phone).trim(),
          certLevel: safe(o.certLevel).trim(),
          verificationStatus: safe(o.verificationStatus).trim(),
          speciesServed: Array.isArray(o.speciesServed) ? o.speciesServed.join(', ') : safe(o.speciesServed || o.species),
          unitsServed: Array.isArray(o.unitsServed) ? o.unitsServed.join(', ') : safe(o.unitsServed)
        })).filter(o => o.listingName);
        return;
      } catch (error) {
        console.warn('Outfitter dataset failed to load:', url, error);
      }
    }
  });
}

async function loadBoundaryData() {
  return withLoader('Loading hunt boundaries...', async () => {
    const response = await fetch(LOCAL_HUNT_BOUNDARIES_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load hunt boundaries: ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload && payload.features) || !payload.features.length) throw new Error('No hunt boundary features found.');
    huntBoundaryGeoJson = payload;
  });
}

async function ensureOverlayLayer(kind) {
  if (!googleBaselineMap || !window.google || !google.maps) return;

  if (kind === 'usfs') {
    if (!usfsLayer) usfsLayer = new google.maps.Data({ map: null });
    if (overlaysLoaded.usfs) return;
    return withLoader('Loading USFS overlay...', async () => {
      const response = await fetch(USFS_QUERY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`USFS overlay failed: ${response.status}`);
      const geojson = await response.json();
      clearDataLayer(usfsLayer);
      usfsLayer.addGeoJson(geojson);
      usfsLayer.setStyle({ strokeColor: '#476f2d', strokeOpacity: 0.96, strokeWeight: 2.2, fillColor: '#6f9e52', fillOpacity: 0.03, clickable: false, zIndex: 1 });
      overlaysLoaded.usfs = true;
    });
  }

  if (kind === 'blm') {
    if (!blmLayer) blmLayer = new google.maps.Data({ map: null });
    if (overlaysLoaded.blm) return;
    return withLoader('Loading BLM overlay...', async () => {
      const response = await fetch(BLM_QUERY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`BLM overlay failed: ${response.status}`);
      const geojson = await response.json();
      clearDataLayer(blmLayer);
      blmLayer.addGeoJson(geojson);
      blmLayer.setStyle({ strokeColor: '#b9722f', strokeOpacity: 0.94, strokeWeight: 2.1, fillColor: '#d5aa78', fillOpacity: 0.02, clickable: false, zIndex: 1 });
      overlaysLoaded.blm = true;
    });
  }
}

function setOverlayVisibility(kind, visible) {
  if (kind === 'usfs' && usfsLayer) usfsLayer.setMap(visible ? googleBaselineMap : null);
  if (kind === 'blm' && blmLayer) blmLayer.setMap(visible ? googleBaselineMap : null);
}

function clearOutfitterMarkers() {
  outfitterMarkers.forEach(marker => marker.map = null);
  outfitterMarkers = [];
}

function getSelectedOutfittersForHunt(hunt) {
  if (!hunt || !outfitters.length) return [];
  const codeSlug = slugify(getUnitCode(hunt));
  const nameSlug = slugify(getUnitName(hunt));
  const valueSlug = slugify(getUnitValue(hunt));
  const huntSpecies = [slugify(getSpeciesRaw(hunt)), slugify(getSpeciesDisplay(hunt))].filter(Boolean);

  return outfitters
    .filter(o => {
      const served = listify(o.unitsServed).map(slugify).filter(Boolean);
      return served.includes(codeSlug) || served.includes(nameSlug) || served.includes(valueSlug);
    })
    .filter(o => {
      const servedSpecies = listify(o.speciesServed).map(slugify).filter(Boolean);
      if (!servedSpecies.length || !huntSpecies.length) return true;
      return servedSpecies.some(species => huntSpecies.includes(species));
    });
}

function renderOutfitterResults() {
  const container = document.getElementById('outfitterResults');
  if (!container) return;
  clearOutfitterMarkers();

  if (!selectedHunt) {
    container.innerHTML = '<div class="empty-note">Select a hunt to load matching vetted outfitters.</div>';
    return;
  }

  const matches = getSelectedOutfittersForHunt(selectedHunt);
  if (!matches.length) {
    container.innerHTML = '<div class="empty-note">No outfitters matched that hunt selection.</div>';
    return;
  }

  const outfittersEnabled = !(document.getElementById('toggleOutfitters') && !document.getElementById('toggleOutfitters').checked);
  const center = googleBaselineMap ? googleBaselineMap.getCenter() : null;
  const baseLat = center && typeof center.lat === 'function' ? center.lat() : GOOGLE_BASELINE_DEFAULT_CENTER.lat;
  const baseLng = center && typeof center.lng === 'function' ? center.lng() : GOOGLE_BASELINE_DEFAULT_CENTER.lng;
  const cityOffsets = new Map();
container.innerHTML = matches.map(o => {
    const logoUrl = escapeHtml(o.logoUrl || 'https://www.uoga.org/assets/default-logo.png');
    return `
    <div class="outfitter-card">
      <div class="outfitter-card-header">
        <img src="${logoUrl}" alt="${escapeHtml(o.listingName)} Logo" class="outfitter-card-logo" onerror="this.style.display='none'">
        <div class="outfitter-card-title-wrap">
          <div class="hunt-card-title">${escapeHtml(o.listingName)}</div>
          <div class="hunt-card-meta">${escapeHtml(o.city || 'Utah')}</div>
        </div>
      </div>
      <div class="hunt-card-meta"><strong>Species:</strong> ${escapeHtml(o.speciesServed || 'N/A')}</div>
      <div class="hunt-card-meta"><strong>Phone:</strong> ${escapeHtml(formatPhoneList(o.phone) || 'N/A')}</div>
      ${o.website ? `<div class="hunt-card-meta" style="margin-top:4px;"><a href="${escapeHtml(o.website)}" target="_blank" rel="noopener noreferrer" class="outfitter-link">Visit Website ➔</a></div>` : ''}
    </div>
  `}).join('');  

  if (!outfittersEnabled || !googleBaselineMap || !google.maps.marker) return;

  matches.forEach((o, i) => {
    let lat, lng;
    if (o.lat && o.lng) {
      lat = o.lat;
      lng = o.lng;
    } else {
      const cityCenter = getOutfitterCityCenter(o);
      const cityKey = safe(o.city).trim().toLowerCase() || `fallback-${i}`;
      const cityIndex = cityOffsets.get(cityKey) || 0;
      cityOffsets.set(cityKey, cityIndex + 1);
      lat = (cityCenter && cityCenter[0] ? cityCenter[0] : baseLat) + cityIndex * 0.02;
      lng = (cityCenter && cityCenter[1] ? cityCenter[1] : baseLng) + cityIndex * 0.02;
    }

    const pinElement = document.createElement('div');
    const logoUrl = escapeHtml(o.logoUrl || 'https://www.uoga.org/assets/default-logo.png');
    pinElement.innerHTML = `
      <div class="outfitter-logo-pin-shell">
        <div class="outfitter-logo-pin-base"></div>
        <div class="outfitter-logo-pin-center">
          <img src="${logoUrl}" alt="${escapeHtml(o.listingName)}" onerror="this.style.display='none'">
        </div>
      </div>
    `;

    const marker = new google.maps.marker.AdvancedMarkerElement({ 
      position: { lat, lng }, 
      map: googleBaselineMap, 
      title: o.listingName,
      content: pinElement 
    });

    const info = new google.maps.InfoWindow({ 
      content: `<div style="min-width:210px;font-family:Segoe UI,Arial,sans-serif;color:#333;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <img src="${logoUrl}" style="width:32px; height:32px; object-fit:contain; border-radius:4px; border:1px solid #ccc;" onerror="this.style.display='none'">
          <strong style="font-size:15px;">${escapeHtml(o.listingName)}</strong>
        </div>
        ${o.address ? escapeHtml(o.address) + '<br>' : ''}
        ${escapeHtml(o.city || 'Utah')}<br>
        ${escapeHtml(formatPhoneList(o.phone) || '')}
        ${o.website ? `<br><a href="${escapeHtml(o.website)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:bold; text-decoration:none; display:inline-block; margin-top:6px;">Visit Website ➔</a>` : ''}
      </div>` 
    });

    pinElement.addEventListener('click', () => info.open({ anchor: marker, map: googleBaselineMap }));
    outfitterMarkers.push(marker);
  });
}

function applyMapType(type) {
  if (!googleBaselineMap) return;
  googleBaselineMap.setMapTypeId(type);
  updateStatus(`Showing native Google ${type} basemap with hunt boundaries.`);
}

function clearDataLayer(mapDataLayer) {
  if (!mapDataLayer) return;
  mapDataLayer.forEach(feature => mapDataLayer.remove(feature));
}

function getBoundaryFeatureId(feature) {
  if (!feature || typeof feature.getProperty !== 'function') return '';
  return safe(firstNonEmpty(feature.getProperty('BoundaryID'), feature.getProperty('BOUNDARYID'), feature.getProperty('boundaryId'))).trim();
}

function getBoundaryFeatureName(feature) {
  if (!feature || typeof feature.getProperty !== 'function') return '';
  return safe(firstNonEmpty(feature.getProperty('Boundary_Name'), feature.getProperty('BOUNDARY_NAME'), feature.getProperty('boundaryName'))).trim();
}

function getBoundaryNameCandidates(hunt) {
  const names = new Set();
  const unitName = safe(getUnitName(hunt)).trim();
  const unitCode = safe(getUnitCode(hunt)).trim();

  function add(value) {
    const base = safe(value).trim();
    if (!base) return;
    names.add(base); names.add(titleCaseWords(base)); names.add(base.toUpperCase());
  }

  if (unitName) { add(unitName); add(unitName.replace(/\s*\/\s*/g, '/')); add(unitName.replace(/\s*\/\s*/g, ', ')); add(unitName.replace(/\s*\/\s*/g, ' ')); }
  if (unitCode) {
    const codeName = titleCaseWords(unitCode.replace(/-/g, ' '));
    if (codeName) { add(codeName); add(codeName.replace(/\s+East$/i, ', East')); add(codeName.replace(/\s+West$/i, ', West')); add(codeName.replace(/\s+North$/i, ', North')); add(codeName.replace(/\s+South$/i, ', South')); }
  }

  return new Set(Array.from(names).filter(Boolean));
}

function buildBoundaryMatchSets(hunt) {
  const names = new Set();
  const ids = new Set();
  const huntCode = safe(getHuntCode(hunt)).trim();
  const overrideNames = HUNT_BOUNDARY_NAME_OVERRIDES[huntCode] || [];

  overrideNames.forEach(name => names.add(name.trim().toLowerCase()));
  getBoundaryNameCandidates(hunt).forEach(name => names.add(safe(name).trim().toLowerCase()));

  const features = Array.isArray(huntBoundaryGeoJson && huntBoundaryGeoJson.features) ? huntBoundaryGeoJson.features : [];
  features.forEach(feature => {
    const props = feature.properties || {};
    const featureId = safe(firstNonEmpty(props.BoundaryID, props.BOUNDARYID, props.boundaryId)).trim();
    const featureName = safe(firstNonEmpty(props.Boundary_Name, props.BOUNDARY_NAME, props.boundaryName)).trim().toLowerCase();

    if (overrideNames.some(name => safe(name).trim().toLowerCase() === featureName) && featureId) ids.add(featureId);
  });

  return { names, ids };
}

function getSelectedBoundaryMatchSets() {
  const ids = new Set();
  const names = new Set();

  if (selectedHunt) {
    const matchSets = buildBoundaryMatchSets(selectedHunt);
    matchSets.ids.forEach(id => ids.add(id));
    matchSets.names.forEach(name => names.add(name));
  }
  if (selectedBoundaryFeature) {
    const featureId = getBoundaryFeatureId(selectedBoundaryFeature);
    const featureName = getBoundaryFeatureName(selectedBoundaryFeature).toLowerCase();
    if (featureId) ids.add(featureId);
    if (featureName) names.add(featureName);
  }
  return { ids, names };
}

function getFilteredBoundaryMatchSets() {
  const ids = new Set();
  const names = new Set();
  if (!hasActiveFilters()) return { ids, names };

  const currentFilteredHunts = getFilteredHunts();
  currentFilteredHunts.forEach(hunt => {
    const matchSets = buildBoundaryMatchSets(hunt);
    matchSets.ids.forEach(id => ids.add(id));
    matchSets.names.forEach(name => names.add(name));
  });

  return { ids, names };
}

function styleBoundaryLayer() {
  if (!huntUnitsLayer) return;

  const matchSets = getSelectedBoundaryMatchSets();
  const filterSets = getFilteredBoundaryMatchSets();
  const isFiltering = hasActiveFilters();

  huntUnitsLayer.setStyle(feature => {
    const featureId = getBoundaryFeatureId(feature);
    const featureName = getBoundaryFeatureName(feature).toLowerCase();

    if (isFiltering) {
      const matchesFilter = (featureId && filterSets.ids.has(featureId)) || (featureName && filterSets.names.has(featureName));
      if (!matchesFilter) return { visible: false }; 
    }

    const isSelected = (featureId && matchSets.ids.has(featureId)) || (featureName && matchSets.names.has(featureName));
    const isHovered = feature === huntHoverFeature;

    return {
      visible: true,
      strokeColor: isSelected ? '#6d3bbd' : '#3653b3',
      strokeOpacity: isSelected ? 1.0 : 0.6,
      strokeWeight: isSelected ? 3.4 : isHovered ? 3.0 : 1.5,
      fillColor: isSelected ? '#b89af4' : '#d6def7',
      fillOpacity: isSelected ? 0.16 : isHovered ? 0.11 : 0.05,
      clickable: true,
      zIndex: isSelected ? 5 : isHovered ? 4 : 2
    };
  });
}

function getFeatureGeometryBounds(feature) {
  const geometry = typeof feature.getGeometry === 'function' ? feature.getGeometry() : null;
  if (!geometry || !window.google || !google.maps) return null;

  const bounds = new google.maps.LatLngBounds();
  let found = false;
  geometry.forEachLatLng(latLng => {
    bounds.extend(latLng);
    found = true;
  });

  return found ? bounds : null;
}

function renderMapChooser(boundaryName, hunts) {
  const kicker = document.getElementById('mapChooserKicker');
  const title = document.getElementById('mapChooserTitle');
  const body = document.getElementById('mapChooserBody');

  if (!body || !title || !kicker) return;

  kicker.textContent = boundaryName || 'Selected Unit';
  title.textContent = 'Matching Hunts';

  if (!hunts.length) {
    body.innerHTML = '<div class="map-chooser-empty">No matching hunts were found for that boundary.</div>';
    setMapChooserOpen(true);
    return;
  }

  body.innerHTML = hunts.map(hunt => {
    const code = getHuntCode(hunt);
    return `
      <div class="map-chooser-card" data-chooser-hunt-code="${escapeHtml(code)}">
        <div class="hunt-card-title">${escapeHtml(getHuntTitle(hunt) || code || 'Untitled Hunt')}</div>
        <div class="map-chooser-meta">${escapeHtml(getUnitName(hunt) || getUnitValue(hunt) || 'Unknown Unit')}</div>
        <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(hunt) || 'Unknown Species')} - ${escapeHtml(getWeapon(hunt) || 'Unknown Weapon')}</div>
        <div class="map-chooser-meta">${escapeHtml(getDates(hunt) || 'Dates unavailable')}</div>
      </div>
    `;
  }).join('');

  body.querySelectorAll('[data-chooser-hunt-code]').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.getAttribute('data-chooser-hunt-code');
      const hunt = hunts.find(item => getHuntCode(item) === code);
      if (hunt) {
        selectHunt(hunt);
        setMapChooserOpen(false);
      }
    });
  });

  setMapChooserOpen(true);
}

function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;

  let listToRender = selectedBoundaryMatches;
  if (!selectedBoundaryFeature && hasActiveFilters()) {
    listToRender = getFilteredHunts();
  }

  if (!listToRender.length) {
    container.innerHTML = '<div class="empty-note">No hunts matched your current selection or filters.</div>';
    return;
  }

  container.innerHTML = listToRender.map(hunt => {
    const code = getHuntCode(hunt);
    const selectedClass = selectedHunt && getHuntCode(selectedHunt) === code ? ' is-selected' : '';
    return `
      <div class="hunt-card${selectedClass}" data-hunt-code="${escapeHtml(code)}">
        <div class="hunt-card-title">${escapeHtml(getHuntTitle(hunt) || code || 'Untitled Hunt')}</div>
        <div class="hunt-card-meta">${escapeHtml(getUnitName(hunt) || getUnitValue(hunt) || 'Unknown Unit')}</div>
        <div class="hunt-card-meta">${escapeHtml(getSpeciesDisplay(hunt) || 'Unknown Species')} - ${escapeHtml(getWeapon(hunt) || 'Unknown Weapon')}</div>
        <div class="hunt-card-meta">${escapeHtml(getDates(hunt) || 'Dates unavailable')}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-hunt-code]').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.getAttribute('data-hunt-code');
      const hunt = listToRender.find(item => getHuntCode(item) === code);
      if (hunt) selectHunt(hunt);
    });
  });
}

function renderSelectedHunt() {
  const panel = document.getElementById('selectedHuntPanel');
  if (!panel) return;

  if (!selectedHunt) {
    panel.innerHTML = '<div class="empty-note">No hunt selected yet.</div>';
    return;
  }

  panel.innerHTML = `
    <div class="detail-grid">
      <div><strong>Hunt Number</strong>${escapeHtml(getHuntCode(selectedHunt) || 'N/A')}</div>
      <div><strong>Unit</strong>${escapeHtml(getUnitName(selectedHunt) || getUnitValue(selectedHunt) || 'N/A')}</div>
      <div><strong>Species</strong>${escapeHtml(getSpeciesDisplay(selectedHunt) || 'N/A')}</div>
      <div><strong>Sex</strong>${escapeHtml(getNormalizedSex(selectedHunt) || 'N/A')}</div>
      <div><strong>Weapon</strong>${escapeHtml(getWeapon(selectedHunt) || 'N/A')}</div>
      <div><strong>Hunt Type</strong>${escapeHtml(getHuntType(selectedHunt) || 'N/A')}</div>
      <div><strong>Season Dates</strong>${escapeHtml(getDates(selectedHunt) || 'N/A')}</div>
      <div><strong>Official Details</strong><a href="${escapeHtml(getDwrHuntInfoUrl(selectedHunt))}" target="_blank" rel="noopener noreferrer">Open DWR Page</a></div>
    </div>
  `;
}

function zoomToSelectedBoundary() {
  if (!huntUnitsLayer || !googleBaselineMap) return;

  const bounds = new google.maps.LatLngBounds();
  let found = false;
  const matchSets = getSelectedBoundaryMatchSets();

  huntUnitsLayer.forEach(feature => {
    const featureId = getBoundaryFeatureId(feature);
    const featureName = getBoundaryFeatureName(feature).toLowerCase();
    const isMatch = (featureId && matchSets.ids.has(featureId)) || (featureName && matchSets.names.has(featureName));

    if (!isMatch) return;
    const featureBounds = getFeatureGeometryBounds(feature);
    if (!featureBounds) return;
    bounds.union(featureBounds);
    found = true;
  });

  if (found) googleBaselineMap.fitBounds(bounds, 60);
}

function selectHunt(hunt) {
  withLoader(`Loading ${getHuntTitle(hunt) || getHuntCode(hunt)}...`, async () => {
    selectedHunt = hunt;
    styleBoundaryLayer();
    renderMatchingHunts();
    renderSelectedHunt();
    renderOutfitterResults();
    updateStatus(`Selected ${getHuntTitle(hunt) || getHuntCode(hunt)}.`);
    zoomToSelectedBoundary();
  }).catch(error => {
    console.error(error);
    updateStatus(`Selection failed: ${error.message}`);
  });
}

function findMatchingHuntsForFeature(feature) {
  const featureId = getBoundaryFeatureId(feature);
  const featureName = getBoundaryFeatureName(feature).toLowerCase();

  const candidates = getFilteredHunts();

  return candidates
    .filter(hunt => {
      const matchSets = buildBoundaryMatchSets(hunt);
      return matchSets.names.has(featureName) || (featureId && matchSets.ids.has(featureId));
    })
    .sort((a, b) => safe(getHuntCode(a)).localeCompare(safe(getHuntCode(b))));
}

function bindBoundaryLayerInteraction() {
  if (!huntUnitsLayer || huntUnitsLayer.__interactionBound) return;
  huntUnitsLayer.__interactionBound = true;

  huntUnitsLayer.addListener('mouseover', event => {
    huntHoverFeature = event.feature;
    styleBoundaryLayer();
    const label = getBoundaryFeatureName(event.feature) || 'hunt unit';
    updateStatus(`Hovering ${label}. Click to load matching hunts.`);
  });

  huntUnitsLayer.addListener('mouseout', () => {
    huntHoverFeature = null;
    styleBoundaryLayer();
    updateStatus(selectedHunt ? `Selected ${getHuntTitle(selectedHunt) || getHuntCode(selectedHunt)}.` : 'Showing native Google terrain with Utah hunt boundaries. Use filters to narrow them down.');
  });

  huntUnitsLayer.addListener('click', event => {
    withLoader('Finding matching hunts...', async () => {
      selectedBoundaryFeature = event.feature;
      selectedBoundaryMatches = findMatchingHuntsForFeature(event.feature);
      selectedHunt = null;

      styleBoundaryLayer();
      renderMatchingHunts();
      renderSelectedHunt();
      renderOutfitterResults();

      const boundaryName = getBoundaryFeatureName(event.feature) || 'Selected hunt unit';
      renderMapChooser(boundaryName, selectedBoundaryMatches);

      const count = selectedBoundaryMatches.length;
      const infoHtml = `<div style="min-width:220px;font-family:Segoe UI,Arial,sans-serif;color:#333;"><strong>${escapeHtml(boundaryName)}</strong><br><span style="color:#6b5646;">${count} matching hunt${count === 1 ? '' : 's'} loaded.</span></div>`;

      if (!selectionInfoWindow) selectionInfoWindow = new google.maps.InfoWindow();
      selectionInfoWindow.setContent(infoHtml);
      if (event.latLng) selectionInfoWindow.setPosition(event.latLng);
      selectionInfoWindow.open({ map: googleBaselineMap });

      updateStatus(`${boundaryName} selected. ${count} matching hunt${count === 1 ? '' : 's'} loaded.`);
    }).catch(error => {
      console.error(error);
      updateStatus(`Boundary selection failed: ${error.message}`);
    });
  });
}

async function buildBoundaryLayer() {
  return withLoader('Building hunt boundary layer...', async () => {
    if (!window.google || !google.maps || !huntBoundaryGeoJson) return;
    if (!huntUnitsLayer) huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
    clearDataLayer(huntUnitsLayer);
    huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
    bindBoundaryLayerInteraction();
    styleBoundaryLayer();
  });
}

function handleFilterChange() {
  selectedBoundaryFeature = null;
  selectedBoundaryMatches = [];
  selectedHunt = null;
  if (selectionInfoWindow) selectionInfoWindow.close();

  refreshSelectionMatrix();
  styleBoundaryLayer(); 
  renderMatchingHunts();
  renderSelectedHunt();
  renderOutfitterResults();
}

function bindControls() {
  const typeSelect = document.getElementById('mapTypeSelect');
  if (typeSelect) {
    typeSelect.value = getSelectedMapType();
    typeSelect.addEventListener('change', () => applyMapType(typeSelect.value));
  }

  const resetBtn = document.getElementById('resetViewBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      googleBaselineMap.setCenter(GOOGLE_BASELINE_DEFAULT_CENTER);
      googleBaselineMap.setZoom(GOOGLE_BASELINE_DEFAULT_ZOOM);
      setMapChooserOpen(false);
      updateStatus('Reset to Utah on native Google terrain.');
    });
  }

  const closeMapChooserBtn = document.getElementById('closeMapChooserBtn');
  if (closeMapChooserBtn) closeMapChooserBtn.addEventListener('click', () => setMapChooserOpen(false));

  const toggleUSFS = document.getElementById('toggleUSFS');
  if (toggleUSFS) {
    toggleUSFS.addEventListener('change', async () => {
      try {
        if (toggleUSFS.checked) { await ensureOverlayLayer('usfs'); setOverlayVisibility('usfs', true); }
        else { setOverlayVisibility('usfs', false); }
      } catch (error) { updateStatus(error.message || 'USFS overlay failed.'); }
    });
  }

  const toggleBLM = document.getElementById('toggleBLM');
  if (toggleBLM) {
    toggleBLM.addEventListener('change', async () => {
      try {
        if (toggleBLM.checked) { await ensureOverlayLayer('blm'); setOverlayVisibility('blm', true); }
        else { setOverlayVisibility('blm', false); }
      } catch (error) { updateStatus(error.message || 'BLM overlay failed.'); }
    });
  }

  const toggleOutfitters = document.getElementById('toggleOutfitters');
  if (toggleOutfitters) toggleOutfitters.addEventListener('change', renderOutfitterResults);

  [searchInput, speciesFilter, sexFilter, weaponFilter, huntTypeFilter, huntCategoryFilter].forEach(el => {
    if (!el) return;
    el.addEventListener('input', handleFilterChange);
    el.addEventListener('change', handleFilterChange);
  });

  if (unitFilter) {
    unitFilter.addEventListener('change', handleFilterChange);
  }

  const applyBtn = document.getElementById('applyFiltersBtn');
  if (applyBtn) applyBtn.addEventListener('click', handleFilterChange);

  const clearBtn = document.getElementById('clearFiltersBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (speciesFilter) speciesFilter.value = 'All Species';
      if (sexFilter) sexFilter.value = 'All';
      if (weaponFilter) weaponFilter.value = 'All';
      if (huntTypeFilter) huntTypeFilter.value = 'All';
      if (huntCategoryFilter) huntCategoryFilter.value = 'All';
      if (unitFilter) unitFilter.value = '';
      handleFilterChange();
    });
  }
}

function initGoogleBaseline() {
  const mapEl = document.getElementById('map');
  if (!mapEl || !window.google || !google.maps) {
    updateStatus('Google Maps did not finish loading.');
    return;
  }

  googleApiReady = true;
  googleBaselineMap = new google.maps.Map(mapEl, {
    center: GOOGLE_BASELINE_DEFAULT_CENTER,
    zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    mapTypeId: getSelectedMapType(),
    mapId: 'DEMO_MAP_ID', // Keeps our custom Logo Pins working!
    styles: huntPlannerMapStyle, // Hides map clutter
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: true,
    mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR, position: google.maps.ControlPosition.TOP_RIGHT, mapTypeIds: ['roadmap', 'terrain', 'hybrid', 'satellite'] },
    gestureHandling: 'greedy',
    clickableIcons: false,
    tilt: 0
  });

  bindControls();

  googleBaselineMap.addListener('maptypeid_changed', () => {
    const typeSelect = document.getElementById('mapTypeSelect');
    const mapType = googleBaselineMap && googleBaselineMap.getMapTypeId ? googleBaselineMap.getMapTypeId() : 'terrain';
    if (typeSelect && mapType && typeSelect.value !== mapType) typeSelect.value = mapType;
  });

  const toggleUSFS = document.getElementById('toggleUSFS');
  const toggleBLM = document.getElementById('toggleBLM');

  if (toggleUSFS && toggleUSFS.checked) ensureOverlayLayer('usfs').then(() => setOverlayVisibility('usfs', true)).catch(error => console.warn(error));
  if (toggleBLM && toggleBLM.checked) ensureOverlayLayer('blm').then(() => setOverlayVisibility('blm', true)).catch(error => console.warn(error));

  if (huntBoundaryGeoJson) {
    buildBoundaryLayer().then(() => {
      updateStatus('Showing native Google terrain with Utah hunt boundaries. Use filters to narrow them down.');
    }).catch(error => updateStatus(`Boundary layer build failed: ${error.message}`));
  } else {
    updateStatus('Google map loaded. Boundary data is still loading...');
  }
}

function loadGoogleMapsApi() {
  updateStatus('Loading native Google basemap...');
  if (window.google && window.google.maps) { initGoogleBaseline(); return; }
  window.initGoogleBaseline = initGoogleBaseline;

  const timeoutId = window.setTimeout(() => {
    if (!googleApiReady) updateStatus('Google Maps did not load. Most likely the API key is restricted for this domain or billing is not enabled.');
  }, 8000);

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker&callback=initGoogleBaseline`;
  script.async = true;
  script.defer = true;
  script.onload = () => window.clearTimeout(timeoutId);
  script.onerror = () => { window.clearTimeout(timeoutId); updateStatus('Google Maps script failed to load. Check the API key, domain restrictions, and network access.'); };
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
  loadGoogleMapsApi();
  (async () => {
    try {
      await loadHuntData();
      await loadOutfittersData();
      await loadBoundaryData();
      refreshSelectionMatrix();
      if (googleApiReady && googleBaselineMap) {
        await buildBoundaryLayer();
        updateStatus('Showing native Google terrain with Utah hunt boundaries. Use filters to narrow them down.');
      } else {
        updateStatus('Map is loading. Boundary layer will attach when Google finishes loading.');
      }
    } catch (error) {
      console.error('Prototype initialization failed:', error);
      updateStatus(`Prototype load failed: ${error.message}`);
    } finally {
      hideLoadingOverlay();
    }
  })();
});