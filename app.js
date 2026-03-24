const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;

// --- CLOUDFLARE JSON SOURCES ---
const CLOUDFLARE_BASE = 'https://json.uoga.workers.dev';
const HUNT_DATA_VERSION = '20260324-master-1733';
const LOCAL_HUNT_BOUNDARIES_PATH = `${CLOUDFLARE_BASE}/hunt_boundaries.geojson`;
const OUTFITTERS_DATA_SOURCES = [`${CLOUDFLARE_BASE}/outfitters.json`];
const LOGO_DNR = './assets/logos/dnr-logo-small.bmp';
const LOGO_DWR_WMA = './assets/logos/dwr-wma.jpg';
const LOGO_USFS = './assets/logos/usfs.png';
const LOGO_BLM = './assets/logos/blm.png';
const LOGO_SITLA = './assets/logos/sitla.png';
const LOGO_STATE_PARKS = './assets/logos/state-parks.png';

const USFS_QUERY_URL = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_ForestSystemBoundaries_01/MapServer/0/query?where=" + encodeURIComponent("FORESTNAME IN ('Ashley National Forest','Dixie National Forest','Fishlake National Forest','Manti-La Sal National Forest','Uinta-Wasatch-Cache National Forest')") + "&outFields=FORESTNAME&returnGeometry=true&outSR=4326&f=geojson";
const BLM_QUERY_URL = 'https://gis.blm.gov/utarcgis/rest/services/AdminBoundaries/BLM_UT_ADMU/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson';

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

let googleBaselineMap = null, huntUnitsLayer = null, googleApiReady = false, huntHoverFeature = null, selectedBoundaryFeature = null, huntData = [], huntBoundaryGeoJson = null, selectedBoundaryMatches = [], selectedHunt = null, selectionInfoWindow = null, usfsLayer = null, blmLayer = null, outfitters = [], outfitterMarkers = [], activeLoads = 0;

const searchInput = document.getElementById('searchInput'),
  speciesFilter = document.getElementById('speciesFilter'),
  sexFilter = document.getElementById('sexFilter'),
  huntTypeFilter = document.getElementById('huntTypeFilter'),
  weaponFilter = document.getElementById('weaponFilter'),
  huntCategoryFilter = document.getElementById('huntCategoryFilter'),
  unitFilter = document.getElementById('unitFilter');

// --- UTILITIES ---
function escapeHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safe(v) { return String(v ?? ''); }
function firstNonEmpty(...a) { for (let x of a) { let t = safe(x).trim(); if (t) return t; } return ''; }
function titleCaseWords(v) { return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); }

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

    const searchOk = !search || getHuntTitle(h).toLowerCase().includes(search) || getHuntCode(h).toLowerCase().includes(search);
    const speciesOk = excludeKey === 'species' || species === 'All Species' || sDisplay === species;
    const sexOk = excludeKey === 'sex' || sex === 'All' || hSex === sex;
    const huntTypeOk = excludeKey === 'huntType' || huntType === 'All' || hHuntType === huntType;
    const weaponOk = excludeKey === 'weapon' || weapon === 'All' || hWeapon === weapon;
    const huntCategoryOk = excludeKey === 'huntCategory' || huntCategory === 'All' || hHuntCategory === huntCategory;
    const unitOk = excludeKey === 'unit' || !unit || hUnit === unit;

    return searchOk && speciesOk && sexOk && huntTypeOk && weaponOk && huntCategoryOk && unitOk;
  });
}

function handleFilterChange(event) {
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
  const boundaryLink = getBoundaryLink(selectedHunt);
  p.innerHTML = `
    <div style="display:grid;gap:12px;">
      <div style="position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--panel);">
        <img src="${LOGO_DNR}" alt="Utah DNR logo" style="display:block;width:100%;height:auto;">
        <div style="position:absolute;right:10px;top:10px;bottom:10px;width:52%;display:grid;align-content:start;gap:6px;padding:8px 10px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);">Selected Hunt</div>
          <div style="font-size:17px;font-weight:900;line-height:1.05;color:var(--text);">${escapeHtml(getHuntCode(selectedHunt))}</div>
          <div style="font-size:14px;font-weight:800;line-height:1.15;color:var(--text);">${escapeHtml(getUnitName(selectedHunt) || getHuntTitle(selectedHunt))}</div>
          <div style="font-size:12px;line-height:1.25;color:var(--muted);">${escapeHtml(getSpeciesDisplay(selectedHunt))} | ${escapeHtml(getNormalizedSex(selectedHunt))}</div>
          <div style="font-size:12px;line-height:1.25;color:var(--muted);">${escapeHtml(getHuntType(selectedHunt))} | ${escapeHtml(getWeapon(selectedHunt))}</div>
        </div>
      </div>
      <div class="detail-grid">
        <div><strong>Species</strong>${escapeHtml(getSpeciesDisplay(selectedHunt))}</div>
        <div><strong>Sex</strong>${escapeHtml(getNormalizedSex(selectedHunt))}</div>
        <div><strong>Hunt Type</strong>${escapeHtml(getHuntType(selectedHunt))}</div>
        <div><strong>Weapon</strong>${escapeHtml(getWeapon(selectedHunt))}</div>
        <div><strong>Hunt Class</strong>${escapeHtml(getHuntCategory(selectedHunt))}</div>
        <div><strong>DWR Hunt Unit</strong>${escapeHtml(getUnitName(selectedHunt))}</div>
        <div style="grid-column:1 / -1;"><strong>Dates</strong>${escapeHtml(getDates(selectedHunt) || 'See official hunt details')}</div>
        ${boundaryLink ? `<div style="grid-column:1 / -1;"><strong>Official Utah DWR Hunt Details</strong><a href="${escapeHtml(boundaryLink)}" target="_blank" rel="noopener noreferrer">Open official details</a></div>` : ''}
      </div>
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
  [searchInput, speciesFilter, sexFilter, huntTypeFilter, weaponFilter, huntCategoryFilter, unitFilter].forEach(el => {
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
