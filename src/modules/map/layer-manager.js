import { escapeHtml, safe, firstNonEmpty, normalizeBoundaryKey, assetUrl } from '../hunts/hunt-data.js';
// Circular dep: outfitter-ui.js imports from map-manager which imports from here; safe since only in function bodies
import { shouldSuppressLandClick, resolveOutfitterPriorityClick } from '../outfitters/outfitter-ui.js';
import {
  closeSelectionInfoWindow, closeSelectedHuntFloat, closeSelectedHuntPopup, setSelectionInfoWindow
} from '../ui/ui-state.js';
import { getCwmuGeoJson, getOwnershipBucketGeoJson } from '../api/boundary-loader.js';

const {
  LOGO_SITLA, LOGO_STATE_PARKS, LOGO_DWR_WMA, LOGO_USFS, LOGO_BLM, LOGO_CWMU,
  USFS_QUERY_URL, BLM_ADMIN_QUERY_URL, BLM_ADMIN_LAYER_URL, BLM_SURFACE_OWNERSHIP_LAYER_URL,
  STATE_PARKS_QUERY_URL, WMA_QUERY_URL, WILDERNESS_QUERY_URL, UTAH_OUTLINE_QUERY_URL,
  DNR_ORANGE
} = window.UOGA_CONFIG;

const { fetchGeoJson, fetchArcGisPagedGeoJson, fetchJson } = window.UOGA_DATA;

// --- State ---
let googleBaselineMap = null;
let usfsLayer = null, blmLayer = null, blmDetailLayer = null, wildernessLayer = null;
let utahOutlineLayer = null, sitlaLayer = null, stateLandsLayer = null;
let stateParksLayer = null, wmaLayer = null, cwmuLayer = null, privateLayer = null;
const blmOwnershipPointCache = new Map();
const blmDistrictPointCache = new Map();

// --- Map getter/setter ---
export function getMap() { return googleBaselineMap; }
export function setMap(map) { googleBaselineMap = map; }

// --- Layer visibility ---
export function setLayerVisibility(layer, visible) {
  if (!layer) return;
  layer.setMap(visible ? googleBaselineMap : null);
}
export function shouldShowWildernessOverlay() {
  return !!(document.getElementById('toggleUSFS')?.checked || document.getElementById('toggleBLM')?.checked);
}
export function shouldShowWildernessFeature(featureOrAgency) {
  const agency = typeof featureOrAgency === 'string'
    ? safe(featureOrAgency).toUpperCase()
    : safe(featureOrAgency?.getProperty?.('Agency')).toUpperCase();
  if (agency === 'FS') return !!document.getElementById('toggleUSFS')?.checked;
  if (agency === 'BLM') return !!document.getElementById('toggleBLM')?.checked;
  return false;
}
export function shouldDeprioritizeFederalClicks() {
  return false;
}
export function updateWildernessOverlayVisibility() {
  setLayerVisibility(wildernessLayer, shouldShowWildernessOverlay());
}

// --- Summary updates ---
export function updateStateLayersSummary() {
  const stateLayersSummary = document.getElementById('stateLayersSummary');
  if (!stateLayersSummary) return;
  const count = [
    document.getElementById('toggleSITLA'),
    document.getElementById('toggleStateParks'),
    document.getElementById('toggleWma')
  ].filter(el => !!el?.checked).length;
  stateLayersSummary.innerHTML = count ? `State <span class="toggle-menu-count">(${count})</span>` : 'State';
}
export function updateFederalLayersSummary() {
  const federalLayersSummary = document.getElementById('federalLayersSummary');
  if (!federalLayersSummary) return;
  const count = [
    document.getElementById('toggleUSFS'),
    document.getElementById('toggleBLM'),
    document.getElementById('toggleBLMDetail')
  ].filter(el => !!el?.checked).length;
  federalLayersSummary.innerHTML = count ? `Federal <span class="toggle-menu-count">(${count})</span>` : 'Federal';
}
export function updatePrivateLayersSummary() {
  const privateLayersSummary = document.getElementById('privateLayersSummary');
  if (!privateLayersSummary) return;
  const count = [
    document.getElementById('togglePrivate'),
    document.getElementById('toggleCwmu')
  ].filter(el => !!el?.checked).length;
  privateLayersSummary.innerHTML = count ? `Private <span class="toggle-menu-count">(${count})</span>` : 'Private';
}

// --- Land info card ---
export function buildLandInfoCard({ logo, title, subtitle, detailText = '', noticeText = '', detailsLinkText = '', detailsLink = '', logoSize = 46, cardMinWidth = 270, cardMaxWidth = 320 }) {
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

export function openLandInfoWindow(card, position) {
  closeSelectedHuntFloat();
  closeSelectedHuntPopup();
  closeSelectionInfoWindow();
  const win = new google.maps.InfoWindow({
    content: card,
    position,
    pixelOffset: new google.maps.Size(0, -12),
    maxWidth: 340
  });
  setSelectionInfoWindow(win);
  win.open(googleBaselineMap);
}

// --- Feature helpers ---
export function featureProps(feature) {
  const names = ['label_state','LABEL_STATE','ut_lgd','UT_LGD','desig','DESIG','admin','ADMIN','owner','OWNER','county','COUNTY','gis_acres','GIS_ACRES','acres','ACRES'];
  const props = {};
  names.forEach(name => { props[name] = feature.getProperty(name); });
  return props;
}

function slugText(value) {
  return safe(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function getOwnershipName(props) {
  return firstNonEmpty(props.label_state, props.LABEL_STATE, props.ut_lgd, props.UT_LGD, props.desig, props.DESIG, props.admin, props.ADMIN, props.owner, props.OWNER);
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
function getOwnershipSubtitle(bucket) {
  if (bucket === 'sitla') return 'SITLA';
  if (bucket === 'stateParks') return 'State Parks';
  if (bucket === 'private') return 'Private Land';
  if (bucket === 'wma') return "UT. DWR W.M.A.'s";
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
  let logo = '';
  if (bucket === 'sitla') logo = LOGO_SITLA;
  if (bucket === 'stateParks') logo = LOGO_STATE_PARKS;
  if (bucket === 'wma') logo = LOGO_DWR_WMA;
  return {
    logo,
    logoSize: logo ? 68 : undefined,
    title: getOwnershipTitle(bucket, props),
    subtitle: getOwnershipSubtitle(bucket),
    detailText: detailBits.join(' | '),
    noticeText
  };
}

// --- BLM helpers ---
export function getLatLngCacheKey(latLng, precision = 4) {
  if (!latLng) return '';
  return `${Number(latLng.lat()).toFixed(precision)},${Number(latLng.lng()).toFixed(precision)}`;
}
export function formatBlmDistrictTitle(attrs) {
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
export async function queryBlmOwnershipAtLatLng(latLng) {
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
export async function queryBlmDistrictAtLatLng(latLng) {
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

// --- Layer factory ---
export function createOwnershipLayer(bucket, style, clickBuilder) {
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

export function fitDataFeatureBounds(feature, maxZoom = 12) {
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

// --- Ensure layer functions ---
export async function ensureSitlaLayer() {
  if (sitlaLayer || !googleBaselineMap) return sitlaLayer;
  const toggleSITLA = document.getElementById('toggleSITLA');
  sitlaLayer = createOwnershipLayer(
    'sitla',
    { strokeColor: '#2a78d2', strokeWeight: 2, fillColor: '#6fb3ff', fillOpacity: 0.08, zIndex: 34 },
    feature => buildLandInfoCard(buildOwnershipDetails('sitla', featureProps(feature)))
  );
  setLayerVisibility(sitlaLayer, !!toggleSITLA?.checked);
  return sitlaLayer;
}

export async function ensureStateLandsLayer() {
  if (stateLandsLayer || !googleBaselineMap) return stateLandsLayer;
  stateLandsLayer = createOwnershipLayer(
    'stateLands',
    { strokeColor: '#2f8f9a', strokeWeight: 2, fillColor: '#6ac7d2', fillOpacity: 0.08, zIndex: 33 },
    feature => buildLandInfoCard(buildOwnershipDetails('stateLands', featureProps(feature)))
  );
  setLayerVisibility(stateLandsLayer, false);
  return stateLandsLayer;
}

export async function ensureStateParksLayer() {
  if (stateParksLayer || !googleBaselineMap) return stateParksLayer;
  const toggleStateParks = document.getElementById('toggleStateParks');
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

export async function ensureWmaLayer() {
  if (wmaLayer || !googleBaselineMap) return wmaLayer;
  const toggleWma = document.getElementById('toggleWma');
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

export async function ensureCwmuLayer() {
  if (cwmuLayer || !googleBaselineMap) return cwmuLayer;
  const toggleCwmu = document.getElementById('toggleCwmu');
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

export async function ensurePrivateLayer() {
  if (privateLayer || !googleBaselineMap) return privateLayer;
  const togglePrivate = document.getElementById('togglePrivate');
  privateLayer = createOwnershipLayer(
    'private',
    { strokeColor: '#8f4a3a', strokeWeight: 1.5, fillColor: '#c99284', fillOpacity: 0.05, zIndex: 32 },
    feature => buildLandInfoCard(buildOwnershipDetails('private', featureProps(feature)))
  );
  setLayerVisibility(privateLayer, !!togglePrivate?.checked);
  return privateLayer;
}

export async function ensureUsfsLayer() {
  if (usfsLayer || !googleBaselineMap) return usfsLayer;
  const toggleUSFS = document.getElementById('toggleUSFS');
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

export async function ensureBlmLayer() {
  if (blmLayer || !googleBaselineMap) return blmLayer;
  const toggleBLM = document.getElementById('toggleBLM');
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

export async function ensureBlmDetailLayer() {
  if (blmDetailLayer || !googleBaselineMap) return blmDetailLayer;
  const toggleBLM = document.getElementById('toggleBLM');
  const toggleBLMDetail = document.getElementById('toggleBLMDetail');
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

export function applyBlmDetailLayerStyle() {
  if (!blmDetailLayer) return;
  const toggleBLMDetail = document.getElementById('toggleBLMDetail');
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

export async function ensureWildernessLayer() {
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

export async function ensureUtahOutlineLayer() {
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

export function getBlmDetailLayer() { return blmDetailLayer; }
export function getBlmLayer() { return blmLayer; }
export function getUsfsLayer() { return usfsLayer; }
export function getSitlaLayer() { return sitlaLayer; }
export function getStateParksLayer() { return stateParksLayer; }
export function getWmaLayer() { return wmaLayer; }
export function getCwmuLayer() { return cwmuLayer; }
export function getPrivateLayer() { return privateLayer; }
export function getWildernessLayer() { return wildernessLayer; }
