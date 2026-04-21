import {
  getDisplayHunts, hasActiveMatrixSelections, refreshSelectionMatrix
} from '../hunts/hunt-filter.js';
import { getSelectedHunt, setSelectedHunt, setSelectedBoundaryFeature, closeSelectionInfoWindow, closeSelectedHuntFloat, closeSelectedHuntPopup } from '../ui/ui-state.js';
import { safe, firstNonEmpty, getHuntCode, getHuntRecordKey, getAllHunts } from '../hunts/hunt-data.js';
// Circular dep: map-manager.js, ui-renderer.js, outfitter-ui.js all import from here indirectly;
// safe since imports are only used inside function bodies
import { styleBoundaryLayer, zoomToSelectedBoundary, zoomToDisplayHuntsBounds, applyMapMode, openStreetViewAtFocus, resetMapView } from '../map/map-manager.js';
import { applyGlobeBasemap, setCurrentGlobeBasemap, getCurrentGlobeBasemap } from '../map/globe-manager.js';
import { getGlobeBasemapLabel } from '../map/imagery-providers.js';
import {
  updateStatus, renderMatchingHunts, renderSelectedHunt, openHuntResearch,
  showHuntMatchesChooser, getSelectedUnitGroups, openSelectedUnitsChooser, closeInlineHuntDetails
} from '../ui/ui-renderer.js';
import { renderOutfitters } from '../outfitters/outfitter-ui.js';
import {
  setLayerVisibility, updateStateLayersSummary, updateFederalLayersSummary, updatePrivateLayersSummary,
  ensureUsfsLayer, ensureBlmLayer, ensureBlmDetailLayer, ensureWildernessLayer, ensureSitlaLayer,
  ensureStateParksLayer, ensureWmaLayer, ensureCwmuLayer, ensurePrivateLayer, applyBlmDetailLayerStyle,
  updateWildernessOverlayVisibility, shouldShowWildernessOverlay,
  getUsfsLayer, getBlmLayer, getBlmDetailLayer, getSitlaLayer, getStateParksLayer, getWmaLayer,
  getCwmuLayer, getPrivateLayer
} from '../map/layer-manager.js';

export function resetAllFilters() {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const unitFilter = document.getElementById('unitFilter');
  if (searchInput) searchInput.value = '';
  if (speciesFilter) speciesFilter.value = 'All Species';
  if (sexFilter) sexFilter.value = 'All';
  if (huntTypeFilter) huntTypeFilter.value = 'All';
  if (weaponFilter) weaponFilter.value = 'All';
  if (huntCategoryFilter) huntCategoryFilter.value = 'All';
  if (unitFilter) unitFilter.value = '';
  setSelectedHunt(null);
  setSelectedBoundaryFeature(null);
  closeSelectedHuntPopup();
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  refreshSelectionMatrix();
  styleBoundaryLayer();
  renderMatchingHunts();
  renderSelectedHunt();
  updateStatus('Filters cleared. Select a species or click a hunt unit.');
}

export function handleFilterChange(event) {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const unitFilter = document.getElementById('unitFilter');
  const toggleDwrUnits = document.getElementById('toggleDwrUnits');
  setSelectedHunt(null);
  setSelectedBoundaryFeature(null);
  closeSelectedHuntPopup();
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  const changedId = safe(event?.target?.id);
  if (changedId === 'speciesFilter') {
    if (sexFilter) sexFilter.value = 'All';
    if (huntTypeFilter) huntTypeFilter.value = 'All';
    if (weaponFilter) weaponFilter.value = 'All';
    if (huntCategoryFilter) huntCategoryFilter.value = 'All';
    if (unitFilter) unitFilter.value = '';
  }
  if (['sexFilter', 'huntTypeFilter', 'weaponFilter', 'huntCategoryFilter'].includes(changedId)) {
    if (unitFilter) unitFilter.value = '';
  }
  if (toggleDwrUnits && hasActiveMatrixSelections()) {
    toggleDwrUnits.checked = true;
  }
  refreshSelectionMatrix();
  styleBoundaryLayer();
  renderMatchingHunts();
  renderSelectedHunt();
  renderOutfitters();
}

export function bootstrapPendingHuntSelection() {
  const params = new URLSearchParams(window.location.search || '');
  const pendingCode = safe(params.get('hunt_code')).trim().toUpperCase();
  if (!pendingCode) return;
  const match = getAllHunts().find(hunt => safe(getHuntCode(hunt)).trim().toUpperCase() === pendingCode);
  if (!match) return;
  setSelectedHunt(match);
  renderSelectedHunt();
  renderOutfitters();
  renderMatchingHunts();
  styleBoundaryLayer();
  zoomToSelectedBoundary();
}

export function bindControls() {
  const searchInput = document.getElementById('searchInput');
  const speciesFilter = document.getElementById('speciesFilter');
  const sexFilter = document.getElementById('sexFilter');
  const huntTypeFilter = document.getElementById('huntTypeFilter');
  const weaponFilter = document.getElementById('weaponFilter');
  const huntCategoryFilter = document.getElementById('huntCategoryFilter');
  const unitFilter = document.getElementById('unitFilter');
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  const globeBasemapSelect = document.getElementById('globeBasemapSelect');
  const globeBasemapGrid = document.getElementById('globeBasemapGrid');
  const streetViewBtn = document.getElementById('streetViewBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const toggleDwrUnits = document.getElementById('toggleDwrUnits');
  const toggleUSFS = document.getElementById('toggleUSFS');
  const toggleBLM = document.getElementById('toggleBLM');
  const toggleBLMDetail = document.getElementById('toggleBLMDetail');
  const toggleSITLA = document.getElementById('toggleSITLA');
  const toggleStateParks = document.getElementById('toggleStateParks');
  const toggleWma = document.getElementById('toggleWma');
  const toggleCwmu = document.getElementById('toggleCwmu');
  const togglePrivate = document.getElementById('togglePrivate');

  [searchInput, speciesFilter, sexFilter, huntTypeFilter, weaponFilter, huntCategoryFilter, unitFilter].forEach(el => {
    el?.addEventListener('change', handleFilterChange);
    el?.addEventListener('input', handleFilterChange);
  });

  applyFiltersBtn?.addEventListener('click', () => {
    closeSelectedHuntPopup();
    closeSelectedHuntFloat();
    closeSelectionInfoWindow();
    setSelectedHunt(null);
    setSelectedBoundaryFeature(null);
    if (toggleDwrUnits && hasActiveMatrixSelections()) {
      toggleDwrUnits.checked = true;
    }
    refreshSelectionMatrix();
    styleBoundaryLayer();
    renderMatchingHunts();
    renderSelectedHunt();
    renderOutfitters();
    const results = getDisplayHunts();
    const count = results.length;
    const selectedUnitValue = safe(unitFilter?.value).trim();
    const selectedUnitGroups = getSelectedUnitGroups();
    const matchingHunts = document.getElementById('matchingHunts');
    if (matchingHunts) matchingHunts.scrollTop = 0;
    if (!count) {
      updateStatus('No matching hunts found for the current filters.');
    } else if (selectedUnitGroups.length > 1 && !selectedUnitValue) {
      zoomToDisplayHuntsBounds();
      openSelectedUnitsChooser();
      updateStatus(`${count} matching hunts across ${selectedUnitGroups.length} selected units.`);
    } else {
      if (selectedUnitValue && selectedUnitGroups.length === 1) {
        zoomToDisplayHuntsBounds();
      } else if (!selectedUnitValue) {
        zoomToDisplayHuntsBounds();
      }
      const chooserTitle = selectedUnitValue
        ? firstNonEmpty(selectedUnitGroups[0]?.unitName, selectedUnitValue)
        : firstNonEmpty(selectedUnitGroups[0]?.unitName, 'Matching Hunts');
      showHuntMatchesChooser(chooserTitle, results, 'Matching Hunts');
      updateStatus(`${count} matching hunt${count === 1 ? '' : 's'} applied.`);
    }
  });

  clearFiltersBtn?.addEventListener('click', resetAllFilters);

  document.getElementById('matchingHunts')?.addEventListener('click', event => {
    const researchBtn = event.target.closest('[data-hunt-research-code]');
    if (researchBtn) {
      event.stopPropagation();
      event.preventDefault();
      const code = researchBtn.getAttribute('data-hunt-research-code');
      if (code) openHuntResearch(code);
      return;
    }
    const card = event.target.closest('[data-hunt-key]');
    if (!card) return;
    window.selectHuntByKey(card.getAttribute('data-hunt-key'));
  });

  document.getElementById('matchingHunts')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('[data-hunt-research-code]')) return;
    const card = event.target.closest('[data-hunt-key]');
    if (!card) return;
    event.preventDefault();
    window.selectHuntByKey(card.getAttribute('data-hunt-key'));
  });

  document.getElementById('closeMapChooserBtn')?.addEventListener('click', closeSelectedHuntPopup);
  document.getElementById('closeHuntDetailsBtn')?.addEventListener('click', closeInlineHuntDetails);

  mapTypeSelect?.addEventListener('change', applyMapMode);

  globeBasemapSelect?.addEventListener('change', () => {
    const key = safe(globeBasemapSelect.value || 'osm');
    setCurrentGlobeBasemap(key);
    applyGlobeBasemap(key);
    updateStatus(`${getGlobeBasemapLabel(key)} globe basemap active.`);
  });

  globeBasemapGrid?.addEventListener('click', event => {
    const btn = event.target.closest('[data-globe-basemap]');
    if (!btn) return;
    const key = safe(btn.getAttribute('data-globe-basemap') || getCurrentGlobeBasemap());
    setCurrentGlobeBasemap(key);
    if (globeBasemapSelect) globeBasemapSelect.value = key;
    if (safe(mapTypeSelect?.value).toLowerCase() !== 'globe' && mapTypeSelect) {
      mapTypeSelect.value = 'globe';
      applyMapMode();
    }
    applyGlobeBasemap(key);
    updateStatus(`${getGlobeBasemapLabel(key)} globe basemap active.`);
  });

  streetViewBtn?.addEventListener('click', openStreetViewAtFocus);
  resetViewBtn?.addEventListener('click', resetMapView);

  toggleDwrUnits?.addEventListener('change', () => {
    if (!toggleDwrUnits.checked) {
      closeSelectionInfoWindow();
      closeSelectedHuntPopup();
      closeSelectedHuntFloat();
    }
    styleBoundaryLayer();
  });

  toggleUSFS?.addEventListener('change', async () => {
    if (toggleUSFS.checked) await ensureUsfsLayer().catch(err => console.error('USFS layer failed', err));
    setLayerVisibility(getUsfsLayer(), !!toggleUSFS.checked);
    if (shouldShowWildernessOverlay()) await ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
    updateWildernessOverlayVisibility();
    updateFederalLayersSummary();
  });

  toggleBLM?.addEventListener('change', async () => {
    if (toggleBLM.checked) await ensureBlmLayer().catch(err => console.error('BLM layer failed', err));
    setLayerVisibility(getBlmLayer(), !!toggleBLM.checked);
    if (toggleBLM.checked || toggleBLMDetail?.checked) await ensureBlmDetailLayer().catch(err => console.error('BLM detail layer failed', err));
    setLayerVisibility(getBlmDetailLayer(), !!(toggleBLM.checked || toggleBLMDetail?.checked));
    applyBlmDetailLayerStyle();
    if (shouldShowWildernessOverlay()) await ensureWildernessLayer().catch(err => console.error('Wilderness layer failed', err));
    updateWildernessOverlayVisibility();
    updateFederalLayersSummary();
  });

  toggleBLMDetail?.addEventListener('change', async () => {
    if (toggleBLMDetail.checked) await ensureBlmDetailLayer().catch(err => console.error('BLM detail layer failed', err));
    setLayerVisibility(getBlmDetailLayer(), !!(toggleBLM?.checked || toggleBLMDetail.checked));
    applyBlmDetailLayerStyle();
    updateFederalLayersSummary();
  });

  toggleSITLA?.addEventListener('change', async () => {
    if (toggleSITLA.checked) await ensureSitlaLayer().catch(err => console.error('SITLA layer failed', err));
    setLayerVisibility(getSitlaLayer(), !!toggleSITLA.checked);
    updateStateLayersSummary();
  });

  toggleStateParks?.addEventListener('change', async () => {
    if (toggleStateParks.checked) await ensureStateParksLayer().catch(err => console.error('State parks layer failed', err));
    setLayerVisibility(getStateParksLayer(), !!toggleStateParks.checked);
    updateStateLayersSummary();
  });

  toggleWma?.addEventListener('change', async () => {
    if (toggleWma.checked) await ensureWmaLayer().catch(err => console.error('WMA layer failed', err));
    setLayerVisibility(getWmaLayer(), !!toggleWma.checked);
    updateStateLayersSummary();
  });

  toggleCwmu?.addEventListener('change', async () => {
    if (toggleCwmu.checked) await ensureCwmuLayer().catch(err => console.error('CWMU layer failed', err));
    setLayerVisibility(getCwmuLayer(), !!toggleCwmu.checked);
    updatePrivateLayersSummary();
  });

  togglePrivate?.addEventListener('change', async () => {
    if (togglePrivate.checked) await ensurePrivateLayer().catch(err => console.error('Private layer failed', err));
    setLayerVisibility(getPrivateLayer(), !!togglePrivate.checked);
    updatePrivateLayersSummary();
  });
}
