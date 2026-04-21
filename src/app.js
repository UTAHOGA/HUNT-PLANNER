import {
  loadConservationPermitAreas,
  loadConservationPermitHuntTable,
  loadHunts,
  loadOutfitters,
  loadOutfitterFederalCoverage
} from './modules/api/data-loader.js';
import {
  setHuntData,
  indexConservationPermitAreas,
  buildSyntheticConservationPermitHunts,
  setConservationPermitHuntTable,
  applyOfficialBoundaryMappings
} from './modules/hunts/hunt-data.js';
import {
  setOutfitters,
  setOutfitterFederalCoverage,
  indexOutfitterFederalCoverage
} from './modules/outfitters/outfitter-data.js';
import { refreshSelectionMatrix } from './modules/hunts/hunt-filter.js';
import { renderMatchingHunts, updateStatus } from './modules/ui/ui-renderer.js';
import { bootstrapPendingHuntSelection } from './modules/ui/event-handlers.js';
import { initGoogleBaseline } from './modules/map/map-manager.js';
import { fallbackToGlobeMode } from './modules/map/globe-manager.js';
import { getHuntBoundaryGeoJson } from './modules/api/boundary-loader.js';
import { ensureCesiumHuntBoundaries, ensureCesiumUtahOutline, getViewer } from './modules/map/globe-manager.js';
import { buildBoundaryLayer } from './modules/map/map-manager.js';
import { isGoogleApiReady } from './modules/map/map-manager.js';

const { GOOGLE_MAPS_API_KEY } = window.UOGA_CONFIG;

let googleMapsLoadTimeoutId = null;

// Expose Google Maps callback globally
window.initGoogleBaseline = initGoogleBaseline;

document.addEventListener('DOMContentLoaded', async () => {
  // Load Google Maps API dynamically
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&callback=initGoogleBaseline`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    console.error('Google Maps API failed to load.');
    fallbackToGlobeMode('Google map failed to load. Switched to globe view.');
  };
  document.head.appendChild(script);

  googleMapsLoadTimeoutId = setTimeout(() => {
    if (!isGoogleApiReady()) {
      console.error('Google Maps API load timed out.');
      fallbackToGlobeMode('Google map timed out. Switched to globe view.');
    }
  }, 7000);

  // Load conservation permit data first (needed for synthetic hunt creation)
  const [conservationAreas, conservationHuntTable] = await Promise.all([
    loadConservationPermitAreas(),
    loadConservationPermitHuntTable()
  ]);
  indexConservationPermitAreas(conservationAreas);
  setConservationPermitHuntTable(conservationHuntTable);

  // Load main hunt data
  updateStatus('Loading hunt data...');
  const rawHunts = await loadHunts(updateStatus);
  const syntheticConservationHunts = buildSyntheticConservationPermitHunts(rawHunts);
  setHuntData([...rawHunts, ...syntheticConservationHunts]);

  // Load outfitter data in parallel
  const [outfitterList, outfitterFedCoverage] = await Promise.all([
    loadOutfitters(),
    loadOutfitterFederalCoverage()
  ]);
  setOutfitters(outfitterList);
  setOutfitterFederalCoverage(outfitterFedCoverage);
  indexOutfitterFederalCoverage(outfitterFedCoverage);

  // Load boundary GeoJSON and build layer when map is ready
  try {
    await getHuntBoundaryGeoJson();
    const cesiumViewer = getViewer();
    if (cesiumViewer) {
      ensureCesiumHuntBoundaries().catch(err => console.error('Cesium hunt boundaries failed', err));
      ensureCesiumUtahOutline().catch(err => console.error('Cesium Utah outline failed', err));
    }
  } catch (e) {
    console.error('GeoJSON load failed', e);
  }

  refreshSelectionMatrix();
  renderMatchingHunts();
  bootstrapPendingHuntSelection();
});
