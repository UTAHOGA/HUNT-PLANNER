// Stub implementations - not yet in app.js
export function getTheme() { return localStorage.getItem('uoga_theme') || 'light'; }
export function setTheme(v) { localStorage.setItem('uoga_theme', v); }
export function getMapType() { return localStorage.getItem('uoga_map_type') || 'google'; }
export function setMapType(v) { localStorage.setItem('uoga_map_type', v); }
export function getSidebarState() { return localStorage.getItem('uoga_sidebar') || 'open'; }
export function setSidebarState(v) { localStorage.setItem('uoga_sidebar', v); }
export function getLayerVisibility(key) { return localStorage.getItem(`uoga_layer_${key}`); }
export function setLayerVisibility(key, v) { localStorage.setItem(`uoga_layer_${key}`, v); }
