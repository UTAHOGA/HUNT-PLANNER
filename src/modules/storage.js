window.UOGA_STORAGE = (() => {
  const THEME_KEY = 'uoga_theme';
  const MAP_TYPE_KEY = 'uoga_map_type';
  const GLOBE_BASEMAP_KEY = 'uoga_globe_basemap';

  function getStoredTheme() { return localStorage.getItem(THEME_KEY) || 'theme-dark'; }
  function setStoredTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
  function getStoredMapType() { return localStorage.getItem(MAP_TYPE_KEY) || 'terrain'; }
  function setStoredMapType(type) { localStorage.setItem(MAP_TYPE_KEY, type); }
  function getStoredGlobeBasemap() { return localStorage.getItem(GLOBE_BASEMAP_KEY) || 'esriImagery'; }
  function setStoredGlobeBasemap(v) { localStorage.setItem(GLOBE_BASEMAP_KEY, v); }

  return { getStoredTheme, setStoredTheme, getStoredMapType, setStoredMapType, getStoredGlobeBasemap, setStoredGlobeBasemap };
})();
