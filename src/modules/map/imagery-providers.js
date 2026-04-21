export const GLOBE_BASEMAP_LABELS = {
  osm: 'OpenStreetMap',
  osmHot: 'OSM Humanitarian',
  openTopo: 'OpenTopoMap',
  cartoLight: 'Carto Light',
  cartoDark: 'Carto Dark',
  esriImagery: 'Esri World Imagery',
  esriTopo: 'Esri World Topo',
  esriStreet: 'Esri World Street',
  esriNatGeo: 'Esri NatGeo',
  usgsImagery: 'USGS Imagery',
  usgsTopo: 'USGS Topo'
};

export function createGlobeImageryProvider(key) {
  if (typeof Cesium === 'undefined') return null;
  const providers = {
    osm: () => new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
    osmHot: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c']
    }),
    openTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
      credit: 'OpenTopoMap'
    }),
    cartoLight: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd']
    }),
    cartoDark: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd']
    }),
    esriImagery: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    }),
    esriTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    esriStreet: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    esriNatGeo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}'
    }),
    usgsImagery: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'
    }),
    usgsTopo: () => new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
    })
  };
  return providers[key]?.() || providers.osm();
}

export function getGlobeBasemapLabel(key) {
  return GLOBE_BASEMAP_LABELS[key] || key;
}
