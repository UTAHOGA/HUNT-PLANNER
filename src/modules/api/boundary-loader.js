const {
  HUNT_BOUNDARY_SOURCES,
  PUBLIC_OWNERSHIP_LAYER_URL,
  CWMU_QUERY_URL,
  LOCAL_CWMU_BOUNDARIES_PATH,
  CWMU_BOUNDARY_IDS_PATH
} = window.UOGA_CONFIG;

const { fetchGeoJson, fetchFirstGeoJson, fetchArcGisPagedGeoJson, fetchJson } = window.UOGA_DATA;

// --- State ---
let huntBoundaryGeoJson = null;
let huntBoundaryGeoJsonPromise = null;
let cwmuGeoJsonPromise = null;

const OWNERSHIP_BUCKET_QUERIES = {
  sitla: "state_lgd = 'State Trust Lands'",
  private: "state_lgd = 'Private'",
  stateLands: "state_lgd IN ('Other State','State Sovereign Land')"
};
const ownershipBucketGeoJsonPromises = new Map();

export function getHuntBoundaryGeoJsonSync() { return huntBoundaryGeoJson; }
export function setHuntBoundaryGeoJsonCache(geojson) { huntBoundaryGeoJson = geojson; }

export function getHuntBoundaryGeoJson() {
  if (huntBoundaryGeoJson) return Promise.resolve(huntBoundaryGeoJson);
  if (!huntBoundaryGeoJsonPromise) {
    huntBoundaryGeoJsonPromise = fetchFirstGeoJson(HUNT_BOUNDARY_SOURCES).then(geojson => {
      huntBoundaryGeoJson = geojson;
      return geojson;
    });
  }
  return huntBoundaryGeoJsonPromise;
}

export async function getCwmuGeoJson() {
  if (!cwmuGeoJsonPromise) {
    cwmuGeoJsonPromise = fetchGeoJson(CWMU_QUERY_URL).catch(async error => {
      console.error('Live CWMU service failed, falling back to local CWMU GeoJSON', error);
      try {
        return await fetchGeoJson(LOCAL_CWMU_BOUNDARIES_PATH);
      } catch (localError) {
        console.error('Local CWMU GeoJSON failed, falling back to cached IDs', localError);
      }
      const [boundaryIds, boundaryGeoJson] = await Promise.all([
        fetchJson(CWMU_BOUNDARY_IDS_PATH).then(ids => Array.isArray(ids) ? ids.map(id => String(id)) : []),
        getHuntBoundaryGeoJson()
      ]);
      const allowedIds = new Set(boundaryIds);
      const features = Array.isArray(boundaryGeoJson?.features)
        ? boundaryGeoJson.features.filter(feature => allowedIds.has(String(feature?.properties?.BoundaryID ?? '')))
        : [];
      return { type: 'FeatureCollection', features };
    }).catch(async error => {
      cwmuGeoJsonPromise = null;
      throw error;
    });
  }
  return cwmuGeoJsonPromise;
}

export function getOwnershipBucketGeoJson(bucket) {
  if (!ownershipBucketGeoJsonPromises.has(bucket)) {
    const where = OWNERSHIP_BUCKET_QUERIES[bucket] || '1=0';
    ownershipBucketGeoJsonPromises.set(bucket, fetchArcGisPagedGeoJson(PUBLIC_OWNERSHIP_LAYER_URL, where));
  }
  return ownershipBucketGeoJsonPromises.get(bucket);
}
