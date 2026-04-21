import { createGlobeImageryProvider, getGlobeBasemapLabel } from './imagery-providers.js';
import {
  firstNonEmpty, normalizeBoundaryKey, getBoundaryId, getUnitCode, getUnitName,
  safe, buildBoundaryMatcher, getAllHunts
} from '../hunts/hunt-data.js';
import { getDisplayHunts, hasActiveMatrixSelections, shouldShowHuntBoundaries, shouldShowAllHuntUnits } from '../hunts/hunt-filter.js';
import { getHuntBoundaryGeoJson } from '../api/boundary-loader.js';
// Circular dep: ui-renderer.js imports from map-manager which imports from here; safe since only in function bodies
import { updateStatus } from '../ui/ui-renderer.js';
import { getSelectedHunt } from '../ui/ui-state.js';

const { UTAH_OUTLINE_QUERY_URL } = window.UOGA_CONFIG;
const { fetchGeoJson } = window.UOGA_DATA;

// --- State ---
let cesiumViewer = null;
let cesiumHuntDataSource = null;
let cesiumUtahOutlineDataSource = null;
let currentGlobeBasemap = 'esriImagery';

export function getViewer() { return cesiumViewer; }
export function getCurrentGlobeBasemap() { return currentGlobeBasemap; }
export function setCurrentGlobeBasemap(key) { currentGlobeBasemap = key; }

export function syncGlobeBasemapButtons() {
  const globeBasemapGrid = document.getElementById('globeBasemapGrid');
  if (!globeBasemapGrid) return;
  globeBasemapGrid.querySelectorAll('[data-globe-basemap]').forEach(btn => {
    const isActive = btn.getAttribute('data-globe-basemap') === currentGlobeBasemap;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

export function applyGlobeBasemap(key = currentGlobeBasemap) {
  const globeBasemapSelect = document.getElementById('globeBasemapSelect');
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

export async function ensureCesiumHuntBoundaries() {
  const huntBoundaryGeoJson = await getHuntBoundaryGeoJson();
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
        entity.polygon.outline = false;
        entity.polygon.material = Cesium.Color.fromCssColorString('#3653b3').withAlpha(0.18);
      }
      if (entity.polyline) {
        entity.polyline.show = false;
      }
      entity.show = false;
    });
  }
  updateCesiumBoundaryStyles();
  return cesiumHuntDataSource;
}

export async function ensureCesiumUtahOutline() {
  if (!cesiumViewer || typeof Cesium === 'undefined') return null;
  if (cesiumUtahOutlineDataSource) return cesiumUtahOutlineDataSource;
  const geojson = await fetchGeoJson(UTAH_OUTLINE_QUERY_URL);
  cesiumUtahOutlineDataSource = await Cesium.GeoJsonDataSource.load(geojson, {
    clampToGround: true,
    stroke: Cesium.Color.fromCssColorString('#c84f00'),
    strokeWidth: 8,
    fill: Cesium.Color.fromCssColorString('#c84f00').withAlpha(0.0)
  });
  cesiumViewer.dataSources.add(cesiumUtahOutlineDataSource);
  if (cesiumUtahOutlineDataSource?.entities?.values) {
    cesiumUtahOutlineDataSource.entities.values.forEach(entity => {
      entity.show = true;
      if (entity.polygon) {
        entity.polygon.fill = false;
        entity.polygon.outline = true;
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#c84f00');
        entity.polygon.outlineWidth = 8;
      }
      if (entity.polyline) {
        entity.polyline.show = true;
        entity.polyline.width = 8;
        entity.polyline.material = new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#c84f00'),
          outlineColor: Cesium.Color.fromCssColorString('#6e2a00'),
          outlineWidth: 2
        });
        entity.polyline.clampToGround = true;
      }
    });
  }
  cesiumViewer?.scene?.requestRender?.();
  return cesiumUtahOutlineDataSource;
}

export function getCesiumEntityOutlinePositions(entity) {
  if (!entity?.polygon?.hierarchy || typeof Cesium === 'undefined') return null;
  try {
    const hierarchyValue = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now());
    const positions = hierarchyValue?.positions;
    if (!Array.isArray(positions) || positions.length < 2) return null;
    const closed = positions.slice();
    const first = closed[0];
    const last = closed[closed.length - 1];
    if (!Cesium.Cartesian3.equals(first, last)) closed.push(first);
    return closed;
  } catch (error) {
    console.error('Cesium outline extraction failed', error);
    return null;
  }
}

export function getCesiumEntityMatches(entity) {
  const selectedHunt = getSelectedHunt();
  const properties = entity?.properties;
  const boundaryId = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
  const boundaryName = normalizeBoundaryKey(
    properties?.Boundary_Name?.getValue?.()
    ?? properties?.BOUNDARY_NAME?.getValue?.()
    ?? properties?.BoundaryName?.getValue?.()
  );
  const displaySource = getDisplayHunts();
  const source = (hasActiveMatrixSelections() || selectedHunt) ? displaySource : getAllHunts();
  return source.filter(h => {
    const hBoundaryId = safe(getBoundaryId(h));
    const hUnitCode = normalizeBoundaryKey(getUnitCode(h));
    const hUnitName = normalizeBoundaryKey(getUnitName(h));
    return hBoundaryId === boundaryId || hUnitCode === boundaryName || hUnitName === boundaryName;
  });
}

export function focusCesiumBoundaryEntity(entity) {
  if (!cesiumViewer || !entity || typeof Cesium === 'undefined') return;
  cesiumViewer.flyTo(entity, {
    offset: new Cesium.HeadingPitchRange(0, -0.8, 180000)
  }).catch?.(() => {});
}

export function updateCesiumBoundaryStyles() {
  if (!cesiumHuntDataSource?.entities?.values || typeof Cesium === 'undefined') return;
  const selectedHunt = getSelectedHunt();
  const showBoundaries = shouldShowHuntBoundaries();
  const showAllUnits = shouldShowAllHuntUnits();
  const filtered = getDisplayHunts();
  const matcher = buildBoundaryMatcher(filtered);
  const selectedMatcher = selectedHunt ? buildBoundaryMatcher([selectedHunt]) : null;
  cesiumHuntDataSource.entities.values.forEach(entity => {
    const properties = entity.properties;
    const id = safe(properties?.BoundaryID?.getValue?.() ?? properties?.BOUNDARYID?.getValue?.());
    const name = normalizeBoundaryKey(
      properties?.Boundary_Name?.getValue?.()
      ?? properties?.BOUNDARY_NAME?.getValue?.()
      ?? properties?.BoundaryName?.getValue?.()
    );
    const isMatch = showAllUnits || matcher.matches(id, name);
    const isSelected = !!selectedMatcher && selectedMatcher.matches(id, name);
    const visible = showBoundaries && isMatch;
    entity.show = visible;
    // Selected boundary fill is transparent (alpha 0.0) so the map shows through; outline is drawn via polyline instead
    const fillColor = Cesium.Color.fromCssColorString(isSelected ? '#ff8a3d' : '#3653b3').withAlpha(isSelected ? 0.0 : 0.32);
    if (entity.polygon) {
      entity.polygon.material = fillColor;
      entity.polygon.outline = false;
    }
    const outlinePositions = isSelected ? getCesiumEntityOutlinePositions(entity) : null;
    if (outlinePositions?.length >= 2) {
      entity.polyline = new Cesium.PolylineGraphics({
        positions: outlinePositions,
        width: 9,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString('#c84f00'),
          outlineColor: Cesium.Color.fromCssColorString('#6e2a00'),
          outlineWidth: 2
        }),
        clampToGround: true
      });
    } else if (entity.polyline) {
      entity.polyline = isSelected
        ? entity.polyline
        : undefined;
    }
    if (entity.polyline) {
      entity.polyline.show = visible && isSelected;
    }
  });
  cesiumViewer?.scene?.requestRender?.();
}

export function ensureCesiumViewer() {
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

  getHuntBoundaryGeoJson().then(geoJson => {
    if (geoJson) {
      ensureCesiumHuntBoundaries().catch(err => console.error('Cesium hunt boundaries failed', err));
    }
  }).catch(() => {});

  ensureCesiumUtahOutline().catch(err => console.error('Cesium Utah outline failed', err));

  const handler = new Cesium.ScreenSpaceEventHandler(cesiumViewer.scene.canvas);
  handler.setInputAction((movement) => {
    const picked = cesiumViewer.scene.pick(movement.position);
    const entity = picked?.id;
    if (!entity?.properties) return;
    const matches = getCesiumEntityMatches(entity);
    focusCesiumBoundaryEntity(entity);
    const boundaryName = firstNonEmpty(
      entity.properties?.Boundary_Name?.getValue?.(),
      entity.properties?.BOUNDARY_NAME?.getValue?.(),
      'Selected Unit'
    );
    if (matches.length) {
      updateStatus(`${matches.length} matching hunt${matches.length === 1 ? '' : 's'} in ${boundaryName}. Use Apply Filters or Matching Hunts to choose one.`);
    } else {
      updateStatus(`Zoomed to ${boundaryName}.`);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export function fallbackToGlobeMode(reason = 'Google map unavailable.') {
  const mapWrap = document.querySelector('.map-wrap');
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  if (!mapWrap) return;
  if (mapTypeSelect) {
    mapTypeSelect.value = 'globe';
  }
  ensureCesiumViewer();
  mapWrap.classList.add('is-globe-mode');
  setTimeout(() => {
    if (cesiumViewer) {
      cesiumViewer.resize();
      cesiumViewer.scene.requestRender();
    }
  }, 0);
  updateStatus(reason);
}
