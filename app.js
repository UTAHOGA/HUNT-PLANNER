const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;

// --- CLOUDFLARE JSON SOURCES ---
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const LOCAL_HUNT_BOUNDARIES_PATH = `${CLOUDFLARE_BASE}/hunt_boundaries.geojson`;
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`];

const USFS_QUERY_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" + encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") + "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";
const BLM_QUERY_URL = 'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';

const HUNT_DATA_SOURCES = [
  { label: 'Buck Deer', required: true, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BuckDeer_Pages_43_53.json`] },
  { label: 'Pronghorn', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Pronghorn.json`] },
  { label: 'Moose', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Moose.json`] },
  { label: 'Mountain Goat', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_MountainGoat.json`] },
  { label: 'Turkey', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Turkey.json`] },
  { label: 'Cougar', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_Cougar.json`] },
  { label: 'Bull Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_BullElk.json`] },
  { label: 'General Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_GeneralElk.json`] },
  { label: 'Spike Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_SpikeElk.json`] },
  { label: 'Special Elk', required: false, candidates: [`${CLOUDFLARE_BASE}/Utah_Hunt_Planner_Master_SpecialElk.json`] }
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

const HUNT_TYPE_ORDER = [ 'General', 'Youth', 'Limited Entry', 'Premium Limited Entry', 'Management', 'Dedicated Hunter', 'Cactus Buck', 'Once-in-a-Lifetime', 'Antlerless' ];
const SEX_ORDER = ['Buck', 'Bull', 'Antlerless', 'Either Sex', "Hunter's Choice"];
const WEAPON_ORDER = [ 'Any Legal Weapon', 'Archery', 'Extended Archery', 'Restricted Archery', 'Muzzleloader', 'Restricted Muzzleloader', 'Restricted Rifle', 'HAMSS', 'Multiseason', 'Restricted Multiseason' ];

let googleBaselineMap = null, huntUnitsLayer = null, googleApiReady = false, huntHoverFeature = null, selectedBoundaryFeature = null, huntData = [], huntBoundaryGeoJson = null, selectedBoundaryMatches = [], selectedHunt = null, selectionInfoWindow = null, usfsLayer = null, blmLayer = null, outfitters = [], outfitterMarkers = [], activeLoads = 0;

const searchInput = document.getElementById('searchInput'), speciesFilter = document.getElementById('speciesFilter'), sexFilter = document.getElementById('sexFilter'), weaponFilter = document.getElementById('weaponFilter'), huntTypeFilter = document.getElementById('huntTypeFilter'), unitFilter = document.getElementById('unitFilter');

// --- UTILITIES ---
function escapeHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safe(v) { return String(v ?? ''); }
function firstNonEmpty(...a) { for (let x of a) { let t = safe(x).trim(); if (t) return t; } return ''; }
function titleCaseWords(v) { return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }

// --- DATA NORMALIZATION ---
function normalizeSpeciesLabel(value) {
  const text = safe(value).trim().toLowerCase();
  if (!text) return '';
  if (text === 'mule deer' || text === 'deer') return 'Mule Deer';
  return titleCaseWords(text);
}

function getSpeciesDisplayList(h) { 
  return Array.from(new Set(safe(firstNonEmpty(h.species, h.Species)).split(',').map(normalizeSpeciesLabel).filter(Boolean))); 
}
function getSpeciesDisplay(h) { return getSpeciesDisplayList(h)[0] || ''; }

function getNormalizedSex(valueOrHunt) {
  const raw = typeof valueOrHunt === 'string' ? safe(valueOrHunt).trim() : firstNonEmpty(valueOrHunt.sex, valueOrHunt.Sex);
  const val = raw.toLowerCase();
  if (val.includes('choice')) return "Hunter's Choice";
  if (val.includes('either')) return 'Either Sex';
  if (val === 'doe' || val === 'cow' || val === 'ewe' || val.includes('antlerless')) return 'Antlerless';
  if (val.includes('buck')) return 'Buck';
  if (val.includes('bull')) return 'Bull';
  return titleCaseWords(raw) || 'All';
}

function getHuntCode(h) { return firstNonEmpty(h.huntCode, h.hunt_code, h.HuntCode, h.code); }
function getHuntTitle(h) { return firstNonEmpty(h.title, h.Title, h.huntTitle, getHuntCode(h)); }
function getUnitCode(h) { return firstNonEmpty(h.unitCode, h.unit_code, h.UnitCode); }
function getUnitName(h) { return firstNonEmpty(h.unitName, h.unit_name, h.UnitName); }
function getUnitValue(h) { return firstNonEmpty(getUnitCode(h), getUnitName(h)); }
function getWeapon(h) { return firstNonEmpty(h.weapon, h.Weapon); }
function getHuntType(h) { return firstNonEmpty(h.huntType, h.HuntType, h.type); }
function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates); }

// --- FILTERING ENGINE ---
function getFilteredHunts(excludeKey = '') {
  const search = safe(searchInput?.value).trim().toLowerCase();
  const species = safe(speciesFilter?.value || 'All Species');
  const sex = safe(sexFilter?.value || 'All');
  const weapon = safe(weaponFilter?.value || 'All');
  const unit = safe(unitFilter?.value || '');

  return huntData.filter(h => {
    const sDisplay = getSpeciesDisplay(h);
    const hSex = getNormalizedSex(h);
    const hWeapon = getWeapon(h);
    const hUnit = getUnitValue(h);

    const searchOk = !search || getHuntTitle(h).toLowerCase().includes(search) || getHuntCode(h).toLowerCase().includes(search);
    const speciesOk = excludeKey === 'species' || species === 'All Species' || sDisplay === species;
    const sexOk = excludeKey === 'sex' || sex === 'All' || hSex === sex;
    const weaponOk = excludeKey === 'weapon' || weapon === 'All' || hWeapon === weapon;
    const unitOk = excludeKey === 'unit' || !unit || hUnit === unit;

    return searchOk && speciesOk && sexOk && weaponOk && unitOk;
  });
}

function handleFilterChange(event) {
  if (event && event.target && event.target.id === 'speciesFilter') {
    if (sexFilter) sexFilter.value = 'All';
    if (weaponFilter) weaponFilter.value = 'All';
    if (unitFilter) unitFilter.value = '';
  }
  refreshSelectionMatrix();
  styleBoundaryLayer();
  renderMatchingHunts();
}

function refreshSelectionMatrix() {
  const selectedSpecies = speciesFilter?.value || 'All Species';
  
  // Create current species dataset
  const speciesData = huntData.filter(h => selectedSpecies === 'All Species' || getSpeciesDisplay(h) === selectedSpecies);

  // Update Sex Dropdown based on Species
  const sexSet = new Set(['All']);
  speciesData.forEach(h => sexSet.add(getNormalizedSex(h)));
  const sexOptions = sortWithPreferredOrder(Array.from(sexSet), ['All', ...SEX_ORDER]);
  const prevSex = sexFilter.value;
  sexFilter.innerHTML = sexOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  sexFilter.value = sexOptions.includes(prevSex) ? prevSex : 'All';

  // Update Weapon Dropdown
  const weaponSet = new Set(['All']);
  speciesData.forEach(h => weaponSet.add(getWeapon(h)));
  const weaponOptions = sortWithPreferredOrder(Array.from(weaponSet), ['All', ...WEAPON_ORDER]);
  const prevWeapon = weaponFilter.value;
  weaponFilter.innerHTML = weaponOptions.map(v => `<option value="${v}">${v}</option>`).join('');
  weaponFilter.value = weaponOptions.includes(prevWeapon) ? prevWeapon : 'All';
  
  // Update Units
  const unitsMap = new Map();
  speciesData.forEach(h => unitsMap.set(getUnitValue(h), getUnitName(h)));
  const unitOptions = Array.from(unitsMap.entries()).sort((a,b) => a[1].localeCompare(b[1]));
  unitFilter.innerHTML = `<option value="">All Units</option>` + unitOptions.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
}

// --- CORE APP LOGIC ---
async function loadHuntData() {
  let merged = [];
  for (let s of HUNT_DATA_SOURCES) {
    try {
      const resp = await fetch(s.candidates[0], { cache: 'no-store' });
      if (!resp.ok) continue;
      
      const json = await resp.json();
      const records = Array.isArray(json.records) ? json.records : (Array.isArray(json) ? json : []);
      
      if (records.length > 0) {
        merged.push(...records);
        console.log(`Successfully loaded ${records.length} hunts for ${s.label}`);
      }
    } catch (e) { 
      console.error(`Failed to load ${s.label}.`, e); 
    }
  }
  huntData = merged;
  refreshSelectionMatrix();
}

function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;
  const list = getFilteredHunts();
  container.innerHTML = list.length ? list.map(h => `
    <div class="hunt-card" onclick="selectHuntByCode('${getHuntCode(h)}')">
      <div class="hunt-card-title">${getHuntTitle(h)}</div>
      <div class="hunt-card-meta">${getUnitName(h)} | ${getWeapon(h)}</div>
      <div class="hunt-card-meta">${getDates(h)}</div>
    </div>`).join('') : '<div class="empty-note">No matches found.</div>';
}

window.selectHuntByCode = (code) => {
  const h = huntData.find(x => getHuntCode(x) === code);
  if (h) { 
    selectedHunt = h; 
    renderSelectedHunt(); 
    styleBoundaryLayer(); 
    zoomToSelectedBoundary(); 
  }
};

function renderSelectedHunt() {
  const p = document.getElementById('selectedHuntPanel');
  if (!p || !selectedHunt) return;
  p.innerHTML = `<div class="detail-grid">
    <div><strong>Hunt #</strong>${getHuntCode(selectedHunt)}</div>
    <div><strong>Unit</strong>${getUnitName(selectedHunt)}</div>
    <div><strong>Weapon</strong>${getWeapon(selectedHunt)}</div>
    <div><strong>Dates</strong>${getDates(selectedHunt)}</div>
  </div>`;
}

// --- MAP ENGINE ---
function initGoogleBaseline() {
  googleBaselineMap = new google.maps.Map(document.getElementById('map'), {
    center: GOOGLE_BASELINE_DEFAULT_CENTER, zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    styles: huntPlannerMapStyle, mapTypeId: 'terrain'
  });
  googleApiReady = true;
  if (huntBoundaryGeoJson) buildBoundaryLayer();
  bindControls();
}

function buildBoundaryLayer() {
  huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
  if (huntBoundaryGeoJson) {
      huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
      huntUnitsLayer.setStyle({ strokeColor: '#3653b3', strokeWeight: 1, fillOpacity: 0.05 });
      styleBoundaryLayer();
  }
}

function styleBoundaryLayer() {
    if (!huntUnitsLayer) return;
    const codes = new Set(getFilteredHunts().map(h => getUnitCode(h)));
    huntUnitsLayer.setStyle(f => {
        const id = safe(f.getProperty('BoundaryID'));
        const name = safe(f.getProperty('Boundary_Name')).toLowerCase();
        const isMatch = codes.has(id) || codes.has(name);
        return { visible: isMatch, strokeColor: '#3653b3', fillOpacity: 0.1 };
    });
}

function bindControls() {
  [searchInput, speciesFilter, sexFilter, weaponFilter].forEach(el => {
    el?.addEventListener('change', handleFilterChange);
    el?.addEventListener('input', handleFilterChange);
  });
}

function zoomToSelectedBoundary() {
  if (!huntUnitsLayer || !selectedHunt) return;
  const bounds = new google.maps.LatLngBounds();
  let found = false;
  const unitCode = getUnitCode(selectedHunt);
  
  huntUnitsLayer.forEach(f => {
    if (safe(f.getProperty('BoundaryID')) === unitCode) {
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