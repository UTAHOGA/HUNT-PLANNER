import {
  ensureCesiumViewer, updateCesiumBoundaryStyles, getViewer, getCurrentGlobeBasemap,
  fallbackToGlobeMode, syncGlobeBasemapButtons, applyGlobeBasemap, setCurrentGlobeBasemap
} from './globe-manager.js';
import { getGlobeBasemapLabel } from './imagery-providers.js';
import {
  getMap, setMap,
  ensureUsfsLayer, ensureBlmLayer, ensureBlmDetailLayer, ensureWildernessLayer,
  ensureSitlaLayer, ensureStateParksLayer, ensureWmaLayer, ensureCwmuLayer, ensurePrivateLayer,
  ensureUtahOutlineLayer, setLayerVisibility, updateStateLayersSummary, updateFederalLayersSummary,
  updatePrivateLayersSummary, fitDataFeatureBounds, applyBlmDetailLayerStyle,
  featureProps, buildLandInfoCard, openLandInfoWindow, updateWildernessOverlayVisibility,
  shouldShowWildernessOverlay,
  getUsfsLayer, getBlmLayer, getBlmDetailLayer, getSitlaLayer, getStateParksLayer, getWmaLayer,
  getCwmuLayer, getPrivateLayer
} from './layer-manager.js';
import {
  safe, firstNonEmpty, normalizeBoundaryKey, buildBoundaryMatcher, getBoundaryId,
  getUnitCode, getUnitName, titleCaseWords, getAllHunts
} from '../hunts/hunt-data.js';
import { getDisplayHunts, hasActiveMatrixSelections, shouldShowHuntBoundaries, shouldShowAllHuntUnits } from '../hunts/hunt-filter.js';
import {
  getSelectedHunt, setSelectedBoundaryFeature, setSelectedBoundaryMatches,
  closeSelectionInfoWindow, closeSelectedHuntFloat, closeSelectedHuntPopup
} from '../ui/ui-state.js';
// Circular dep: ui-renderer.js imports from this file; safe since only in function bodies
import { updateStatus, showHuntMatchesChooser } from '../ui/ui-renderer.js';
// Circular dep: outfitter-ui.js imports from this file; safe since only in function bodies
import { updateOutfitterMarkers } from '../outfitters/outfitter-ui.js';
import { getMatchingOutfittersForHunt } from '../outfitters/outfitter-match.js';
// Circular dep: event-handlers.js imports from this file; safe since only in function bodies
import { bindControls } from '../ui/event-handlers.js';
import { getHuntBoundaryGeoJson } from '../api/boundary-loader.js';

const {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_BASELINE_DEFAULT_CENTER,
  GOOGLE_BASELINE_DEFAULT_ZOOM,
  huntPlannerMapStyle
} = window.UOGA_CONFIG;

// --- State ---
let huntUnitsLayer = null;
let googleApiReady = false;

export function getHuntUnitsLayer() { return huntUnitsLayer; }
export function isGoogleApiReady() { return googleApiReady; }

export function applyMapMode() {
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  const value = safe(mapTypeSelect?.value || 'terrain').toLowerCase();
  const mapWrap = document.querySelector('.map-wrap');
  const googleBaselineMap = getMap();
  const selectedHunt = getSelectedHunt();
  if (!mapWrap) return;
  if (value === 'globe') {
    googleBaselineMap?.getStreetView?.()?.setVisible(false);
    updateStatus(`${getGlobeBasemapLabel(getCurrentGlobeBasemap())} globe active.`);
    ensureCesiumViewer();
    mapWrap.classList.add('is-globe-mode');
    const cesiumViewer = getViewer();
    setTimeout(() => {
      if (cesiumViewer) {
        cesiumViewer.resize();
        cesiumViewer.scene.requestRender();
      }
    }, 0);
    if (selectedHunt && cesiumViewer && huntUnitsLayer) {
      const boundaryId = firstNonEmpty(selectedHunt.boundaryId, selectedHunt.boundaryID, getUnitCode(selectedHunt));
      if (boundaryId) {
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

export function resetMapView() {
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  const cesiumViewer = getViewer();
  if (mapTypeSelect && safe(mapTypeSelect.value).toLowerCase() === 'globe' && cesiumViewer) {
    cesiumViewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(GOOGLE_BASELINE_DEFAULT_CENTER.lng, GOOGLE_BASELINE_DEFAULT_CENTER.lat, 850000)
    });
    return;
  }
  const googleBaselineMap = getMap();
  if (googleBaselineMap) {
    googleBaselineMap.setCenter(GOOGLE_BASELINE_DEFAULT_CENTER);
    googleBaselineMap.setZoom(GOOGLE_BASELINE_DEFAULT_ZOOM);
  }
}

export function getFeatureMatches(feature) {
  const boundaryId = safe(feature?.getProperty('BoundaryID'));
  const boundaryName = normalizeBoundaryKey(feature?.getProperty('Boundary_Name'));
  const selectedHunt = getSelectedHunt();
  const displaySource = getDisplayHunts();
  const source = (hasActiveMatrixSelections() || selectedHunt) ? displaySource : getAllHunts();
  return source.filter(h => {
    const hBoundaryId = safe(getBoundaryId(h));
    const hUnitCode = normalizeBoundaryKey(getUnitCode(h));
    const hUnitName = normalizeBoundaryKey(getUnitName(h));
    return hBoundaryId === boundaryId || hUnitCode === boundaryName || hUnitName === boundaryName;
  });
}

export function openBoundaryPopup(feature, latLng) {
  const googleBaselineMap = getMap();
  if (!googleBaselineMap || !feature || !latLng) return;
  const matches = getFeatureMatches(feature);
  setSelectedBoundaryFeature(feature);
  setSelectedBoundaryMatches(matches.slice());
  closeSelectionInfoWindow();
  closeSelectedHuntPopup();
  fitDataFeatureBounds(feature, 11);
  const boundaryName = firstNonEmpty(feature?.getProperty?.('Boundary_Name'), 'Selected Unit');
  if (matches.length) {
    updateStatus(`${matches.length} matching hunt${matches.length === 1 ? '' : 's'} in ${boundaryName}. Use Apply Filters or Matching Hunts to choose one.`);
  } else {
    updateStatus(`Zoomed to ${boundaryName}.`);
  }
}

export function buildBoundaryLayer() {
  const googleBaselineMap = getMap();
  getHuntBoundaryGeoJson().then(huntBoundaryGeoJson => {
    if (!huntBoundaryGeoJson || !googleBaselineMap) return;
    huntUnitsLayer = new google.maps.Data({ map: googleBaselineMap });
    huntUnitsLayer.addGeoJson(huntBoundaryGeoJson);
    huntUnitsLayer.setStyle({ strokeColor: '#3653b3', strokeWeight: 1, fillOpacity: 0.05 });
    huntUnitsLayer.addListener('click', event => {
      openBoundaryPopup(event.feature, event.latLng);
    });
    styleBoundaryLayer();
  }).catch(err => console.error('Hunt boundary GeoJSON failed', err));
}

export function styleBoundaryLayer() {
  if (!huntUnitsLayer) return;
  const selectedHunt = getSelectedHunt();
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

export function zoomToSelectedBoundary() {
  const googleBaselineMap = getMap();
  const selectedHunt = getSelectedHunt();
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

export function zoomToDisplayHuntsBounds() {
  const googleBaselineMap = getMap();
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

export function getSelectedHuntCenter() {
  const selectedHunt = getSelectedHunt();
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

export function openStreetViewAtFocus() {
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  const googleBaselineMap = getMap();
  if (!googleBaselineMap || typeof google === 'undefined' || !google.maps?.StreetViewService) return;
  if (safe(mapTypeSelect?.value).toLowerCase() === 'globe') {
    if (mapTypeSelect) mapTypeSelect.value = 'terrain';
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

export function initGoogleBaseline() {
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  if (mapTypeSelect && safe(mapTypeSelect.value).toLowerCase() === 'globe') {
    mapTypeSelect.value = 'terrain';
  }
  const newMap = new google.maps.Map(document.getElementById('map'), {
    center: GOOGLE_BASELINE_DEFAULT_CENTER,
    zoom: GOOGLE_BASELINE_DEFAULT_ZOOM,
    styles: huntPlannerMapStyle,
    mapTypeId: 'terrain',
    streetViewControl: true,
    fullscreenControl: true,
    mapTypeControl: false
  });
  setMap(newMap);
  googleApiReady = true;
  buildBoundaryLayer();
  ensureUtahOutlineLayer().catch(err => console.error('Utah outline failed', err));
  const toggleBLM = document.getElementById('toggleBLM');
  const toggleBLMDetail = document.getElementById('toggleBLMDetail');
  const toggleUSFS = document.getElementById('toggleUSFS');
  const toggleSITLA = document.getElementById('toggleSITLA');
  const toggleStateParks = document.getElementById('toggleStateParks');
  const toggleWma = document.getElementById('toggleWma');
  const togglePrivate = document.getElementById('togglePrivate');
  const toggleCwmu = document.getElementById('toggleCwmu');
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

// Expose initGoogleBaseline as global for the Google Maps callback
if (typeof window !== 'undefined') {
  window.initGoogleBaseline = initGoogleBaseline;
}
