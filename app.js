const GOOGLE_MAPS_API_KEY = 'AIzaSyBlxyY6T31oqQ7sBvGGm-Q23QU5zInRo0I';
const GOOGLE_BASELINE_DEFAULT_CENTER = { lat: 39.2672138, lng: -111.6346885 };
const GOOGLE_BASELINE_DEFAULT_ZOOM = 7;
const LOCAL_HUNT_BOUNDARIES_PATH = 'https://json.uoga.workers.dev/hunt-boundaries';
const HUNT_DATA_SOURCES = [
  { label: 'Buck Deer', required: true, candidates: ['./data/Utah_Hunt_Planner_Master_BuckDeer_Pages_43_53.json', './data/Utah_Hunt_Planner_Master_BuckDeer_Pages_43_53.json.json'] },
  { label: 'Pronghorn', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_Pronghorn.json', './data/Utah_Hunt_Planner_Master_Pronghorn.json.json'] },
  { label: 'Moose', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_Moose.json', './data/Utah_Hunt_Planner_Master_Moose.json.json'] },
  { label: 'Bighorn Sheep', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_BighornSheep.json', './data/Utah_Hunt_Planner_Master_BighornSheep.json.json'] },
  { label: 'Mountain Goat', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_MountainGoat.json', './data/Utah_Hunt_Planner_Master_MountainGoat.json.json'] },
  { label: 'Bison', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_Bison.json', './data/Utah_Hunt_Planner_Master_Bison.json.json'] },
  { label: 'Black Bear', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_BlackBear.json', './data/Utah_Hunt_Planner_Master_BlackBear.json.json'] },
  { label: 'Turkey', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_Turkey.json', './data/Utah_Hunt_Planner_Master_Turkey.json.json'] },
  { label: 'Cougar', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_Cougar.json', './data/Utah_Hunt_Planner_Master_Cougar.json.json'] },
  { label: 'Bull Elk', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_BullElk.json', './data/Utah_Hunt_Planner_Master_BullElk.json.json', './data/Utah_Hunt_Planner_Master_Elk.json', './data/Utah_Hunt_Planner_Master_Elk.json.json'] },
  { label: 'General Elk', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_GeneralElk.json', './data/Utah_Hunt_Planner_Master_GeneralElk.json.json'] },
  { label: 'Spike Elk', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_SpikeElk.json', './data/Utah_Hunt_Planner_Master_SpikeElk.json.json'] },
  { label: 'Antlerless Elk', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_AntlerlessElk.json', './data/Utah_Hunt_Planner_Master_AntlerlessElk.json.json'] },
  { label: 'Special Elk', required: false, candidates: ['./data/Utah_Hunt_Planner_Master_SpecialElk.json', './data/Utah_Hunt_Planner_Master_SpecialElk.json.json'] }
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

let googleBaselineMap = null;
let huntUnitsLayer = null;
let googleApiReady = false;
let huntHoverFeature = null;
let selectedBoundaryFeature = null;
let selectedBoundaryFeatureIds = new Set();
let huntData = [];
let huntBoundaryGeoJson = null;
let selectedBoundaryMatches = [];
let selectedHunt = null;
let selectionInfoWindow = null;

function updateStatus(message) {
  const el = document.getElementById('status');
  if (el) el.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safe(value) {
  return String(value ?? '');
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = safe(value).trim();
    if (text) return text;
  }
  return '';
}

function slugify(value) {
  return safe(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCaseWords(value) {
  return safe(value)
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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
function getDates(h) { return firstNonEmpty(h.seasonLabel, h.seasonDates, h.dates, h.Dates); }

function getSpeciesDisplay(h) {
  const first = getSpeciesList(h)[0] || getSpeciesRaw(h);
  return first.toLowerCase() === 'mule deer' ? 'Deer' : first;
}

function getNormalizedSex(h) {
  const raw = firstNonEmpty(h.sex, h.Sex, h.SEX);
  if (safe(raw).trim().toLowerCase() !== 'buck/bull') return raw;
  const speciesList = getSpeciesList(h).map(v => v.toLowerCase());
  if (speciesList.includes('elk')) return 'Bull';
  if (speciesList.includes('mule deer') || speciesList.includes('deer')) return 'Buck';
  return 'Buck/Bull';
}

function getDwrHuntInfoUrl(hunt = null) {
  const huntCode = safe(getHuntCode(hunt)).trim();
  if (huntCode) return `https://dwrapps.utah.gov/huntboundary/PrintABoundary?HN=${encodeURIComponent(huntCode)}`;
  return 'https://dwrapps.utah.gov/huntboundary/hbstart';
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
  const merged = [];
  for (const source of HUNT_DATA_SOURCES) {
    try {
      const payload = await fetchJsonWithCandidates(source.candidates);
      const records = Array.isArray(payload) ? payload : Array.isArray(payload.records) ? payload.records : Array.isArray(payload.data) ? payload.data : [];
      if (!records.length) {
        if (source.required) {
          throw new Error(`No records found in ${source.label}.`);
        }
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
    const key = [safe(getHuntCode(record)).trim(), safe(getUnitCode(record)).trim(), safe(getWeapon(record)).trim(), safe(getDates(record)).trim()].join('||') || JSON.stringify(record);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

async function loadBoundaryData() {
  const response = await fetch(LOCAL_HUNT_BOUNDARIES_PATH, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load hunt boundaries: ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload?.features) || !payload.features.length) {
    throw new Error('No hunt boundary features found.');
  }
  huntBoundaryGeoJson = payload;
}

function getSelectedMapType() {
  const select = document.getElementById('mapTypeSelect');
  return select && select.value ? select.value : 'terrain';
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
    const codeName = titleCaseWords(unitCode.replace(/-/g, ' '));
    if (codeName) {
      addNameVariants(codeName);
      addNameVariants(codeName.replace(/\s+East$/i, ', East'));
      addNameVariants(codeName.replace(/\s+West$/i, ', West'));
      addNameVariants(codeName.replace(/\s+North$/i, ', North'));
      addNameVariants(codeName.replace(/\s+South$/i, ', South'));
    }
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

  const features = Array.isArray(huntBoundaryGeoJson?.features) ? huntBoundaryGeoJson.features : [];
  features.forEach(feature => {
    const featureId = safe(firstNonEmpty(feature?.properties?.BoundaryID, feature?.properties?.BOUNDARYID, feature?.properties?.boundaryId)).trim();
    const featureName = safe(firstNonEmpty(feature?.properties?.Boundary_Name, feature?.properties?.BOUNDARY_NAME, feature?.properties?.boundaryName)).trim().toLowerCase();
    if (overrideNames.some(name => safe(name).trim().toLowerCase() === featureName) && featureId) {
      ids.add(featureId);
    }
  });

  return { names, ids };
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

function syncSelectedBoundaryIds() {
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

  selectedBoundaryFeatureIds = ids;
  return { ids, names };
}

function styleBoundaryLayer() {
  if (!huntUnitsLayer) return;
  const matchSets = syncSelectedBoundaryIds();
  huntUnitsLayer.setStyle(feature => {
    const featureId = getBoundaryFeatureId(feature);
    const featureName = getBoundaryFeatureName(feature).toLowerCase();
    const isSelected = (featureId && matchSets.ids.has(featureId)) || (featureName && matchSets.names.has(featureName));
    const isHovered = feature === huntHoverFeature;
    return {
      strokeColor: isSelected ? '#6d3bbd' : '#3653b3',
      strokeOpacity: 0.98,
      strokeWeight: isSelected ? 3.4 : isHovered ? 3.0 : 2.0,
      fillColor: isSelected ? '#b89af4' : '#d6def7',
      fillOpacity: isSelected ? 0.16 : isHovered ? 0.11 : 0.05,
      clickable: true,
      zIndex: isSelected ? 5 : isHovered ? 4 : 2
    };
  });
}

function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;

  if (!selectedBoundaryMatches.length) {
    container.innerHTML = '<div class="empty-note">Click a hunt unit on the map to load matching hunts for that boundary.</div>';
    return;
  }

  container.innerHTML = selectedBoundaryMatches.map(hunt => {
    const code = getHuntCode(hunt);
    const selectedClass = selectedHunt && getHuntCode(selectedHunt) === code ? ' is-selected' : '';
    return `
      <div class="hunt-card${selectedClass}" data-hunt-code="${escapeHtml(code)}">
        <div class="hunt-card-title">${escapeHtml(getHuntTitle(hunt) || code || 'Untitled Hunt')}</div>
        <div class="hunt-card-meta">${escapeHtml(getUnitName(hunt) || getUnitValue(hunt) || 'Unknown Unit')}</div>
        <div class="hunt-card-meta">${escapeHtml(getSpeciesDisplay(hunt) || 'Unknown Species')} • ${escapeHtml(getWeapon(hunt) || 'Unknown Weapon')}</div>
        <div class="hunt-card-meta">${escapeHtml(getDates(hunt) || 'Dates unavailable')}</div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-hunt-code]').forEach(card => {
    card.addEventListener('click', () => {
      const code = card.getAttribute('data-hunt-code');
      const hunt = selectedBoundaryMatches.find(item => getHuntCode(item) === code);
      if (hunt) selectHunt(hunt);
    });
  });
}

function renderSelectedHunt() {
  const panel = document.getElementById('selectedHuntPanel');
  if (!panel) return;

  if (!selectedHunt) {
    panel.innerHTML = '<div class="empty-note">No hunt selected yet. Choose one from the matching-hunts list after clicking a unit boundary.</div>';
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

function selectHunt(hunt) {
  selectedHunt = hunt;
  styleBoundaryLayer();
  renderMatchingHunts();
  renderSelectedHunt();
  updateStatus(`Selected ${getHuntTitle(hunt) || getHuntCode(hunt)}.`);
  zoomToSelectedBoundary();
}

function zoomToSelectedBoundary() {
  if (!huntUnitsLayer || !googleBaselineMap) return;
  const bounds = new google.maps.LatLngBounds();
  let found = false;
  const matchSets = syncSelectedBoundaryIds();

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

  if (found) {
    googleBaselineMap.fitBounds(bounds, 60);
  }
}

function findMatchingHuntsForFeature(feature) {
  const featureId = getBoundaryFeatureId(feature);
  const featureName = getBoundaryFeatureName(feature).toLowerCase();
  return huntData.filter(hunt => {
    const matchSets = buildBoundaryMatchSets(hunt);
    return matchSets.names.has(featureName) || (featureId && matchSets.ids.has(featureId));
  }).sort((a, b) => safe(getHuntCode(a)).localeCompare(safe(getHuntCode(b))));
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
    updateStatus(selectedHunt ? `Selected ${getHuntTitle(selectedHunt) || getHuntCode(selectedHunt)}.` : 'Showing native Google terrain with Utah hunt boundaries. Click a unit to load matching hunts.');
  });

  huntUnitsLayer.addListener('click', event => {
    selectedBoundaryFeature = event.feature;
    selectedBoundaryMatches = findMatchingHuntsForFeature(event.feature);
    selectedHunt = null;
    styleBoundaryLayer();
    renderMatchingHunts();
    renderSelectedHunt();

    const boundaryName = getBoundaryFeatureName(event.feature) || 'Selected hunt unit';
    const count = selectedBoundaryMatches.length;
    const infoHtml = `<div style="min-width:220px;font-family:Segoe UI,Arial,sans-serif;"><strong>${escapeHtml(boundaryName)}</strong><br><span style="color:#6b5646;">${count} matching hunt${count === 1 ? '' : 's'} loaded in the left panel.</span></div>`;
    if (!selectionInfoWindow) {
      selectionInfoWindow = new google.maps.InfoWindow();
    }
    selectionInfoWindow.setContent(infoHtml);
    if (event.latLng) selectionInfoWindow.setPosition(event.latLng);
    selectionInfoWindow.open({ map: googleBaselineMap });

    updateStatus(`${boundaryName} selected. ${count} matching hunt${count === 1 ? '' : 's'} loaded.`);
  });
}

async function buildBoundaryLayer() {
  if (!window.google || !google.maps || !huntBoundaryGeoJson) return;
  if (!huntUnitsLayer) {
    huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
  }
  clearDataLayer(huntUnitsLayer);
  huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
  bindBoundaryLayerInteraction();
  styleBoundaryLayer();
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
      updateStatus('Reset to Utah on native Google terrain.');
    });
  }
}

async function initializePrototypeData() {
  updateStatus('Loading hunt datasets…');
  await loadHuntData();
  updateStatus('Loading hunt boundaries…');
  await loadBoundaryData();
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
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: false,
    gestureHandling: 'greedy',
    clickableIcons: false,
    tilt: 0
  });

  bindControls();
  buildBoundaryLayer().then(() => {
    updateStatus('Showing native Google terrain with Utah hunt boundaries. Click a unit to load matching hunts.');
  }).catch(error => {
    console.error('Boundary layer build failed:', error);
    updateStatus(`Boundary layer build failed: ${error.message}`);
  });
}

function loadGoogleMapsApi() {
  updateStatus('Loading native Google basemap…');

  if (window.google && window.google.maps) {
    initGoogleBaseline();
    return;
  }

  window.initGoogleBaseline = initGoogleBaseline;

  const timeoutId = window.setTimeout(() => {
    if (!googleApiReady) {
      updateStatus('Google Maps did not load. Most likely the API key is restricted for this domain or billing is not enabled.');
    }
  }, 8000);

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initGoogleBaseline`;
  script.async = true;
  script.defer = true;
  script.onload = () => window.clearTimeout(timeoutId);
  script.onerror = () => {
    window.clearTimeout(timeoutId);
    updateStatus('Google Maps script failed to load. Check the API key, domain restrictions, and network access.');
  };
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializePrototypeData();
    loadGoogleMapsApi();
  } catch (error) {
    console.error('Prototype initialization failed:', error);
    updateStatus(`Prototype load failed: ${error.message}`);
  }
});
