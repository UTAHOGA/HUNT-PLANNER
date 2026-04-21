window.UOGA_API = (() => {
  const {
    fetchJson,
    fetchGeoJson,
    fetchFirstGeoJson,
    fetchArcGisPagedGeoJson,
    loadFirstNormalizedList
  } = window.UOGA_DATA;

  async function loadFirstJson(sources, fallback = null) {
    for (const url of sources) {
      try {
        return await fetchJson(url);
      } catch (e) {
        console.warn('Failed to fetch', url, e);
      }
    }
    return fallback;
  }

  return { fetchJson, fetchGeoJson, fetchFirstGeoJson, fetchArcGisPagedGeoJson, loadFirstNormalizedList, loadFirstJson };
})();
