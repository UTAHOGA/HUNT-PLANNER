window.UOGA_MAP = (() => {
  function getMap() { return window.UOGA_STATE?.googleBaselineMap || null; }
  function getCesium() { return window.UOGA_STATE?.cesiumViewer || null; }
  function getHuntUnitsLayer() { return window.UOGA_STATE?.huntUnitsLayer || null; }

  function isGlobeMode() {
    const select = document.getElementById('mapTypeSelect');
    return select && select.value === 'globe';
  }

  function getCurrentGlobeBasemap() {
    return window.UOGA_STATE?.currentGlobeBasemap || 'esriImagery';
  }

  function getLayerByName(name) {
    if (!window.UOGA_STATE) return null;
    const layerMap = {
      usfs: 'usfsLayer',
      blm: 'blmLayer',
      blmDetail: 'blmDetailLayer',
      wilderness: 'wildernessLayer',
      utahOutline: 'utahOutlineLayer',
      sitla: 'sitlaLayer',
      stateLands: 'stateLandsLayer',
      stateParks: 'stateParksLayer',
      wma: 'wmaLayer',
      cwmu: 'cwmuLayer',
      private: 'privateLayer'
    };
    const key = layerMap[name];
    return key ? window.UOGA_STATE[key] : null;
  }

  function isGoogleApiReady() {
    return !!window.UOGA_STATE?.googleApiReady;
  }

  return { getMap, getCesium, getHuntUnitsLayer, isGlobeMode, getCurrentGlobeBasemap, getLayerByName, isGoogleApiReady };
})();
