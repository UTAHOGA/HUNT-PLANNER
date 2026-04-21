import {
  escapeHtml, getHuntCode, getUnitName, getHuntTitle, getSpeciesDisplay, getWeapon,
  getHuntType, getDates, firstNonEmpty, safe, getPermitTotal, getHuntRecordKey
} from '../hunts/hunt-data.js';
// Circular dep: ui-renderer.js imports from ui-state.js; imports below are only used inside function bodies
import { openHuntResearch } from '../ui/ui-renderer.js';

const { LOGO_DWR_SELECTOR } = window.UOGA_CONFIG;

// --- State ---
let selectedHunt = null;
let selectedBoundaryFeature = null;
let selectedBoundaryMatches = [];
let selectionInfoWindow = null;

// --- Getters/Setters ---
export function getSelectedHunt() { return selectedHunt; }
export function setSelectedHunt(hunt) { selectedHunt = hunt; }
export function getSelectedBoundaryFeature() { return selectedBoundaryFeature; }
export function setSelectedBoundaryFeature(feature) { selectedBoundaryFeature = feature; }
export function getSelectedBoundaryMatches() { return selectedBoundaryMatches; }
export function setSelectedBoundaryMatches(matches) { selectedBoundaryMatches = Array.isArray(matches) ? matches.slice() : []; }
export function getSelectionInfoWindow() { return selectionInfoWindow; }
export function setSelectionInfoWindow(win) { selectionInfoWindow = win; }

export function getSelectedHuntKey() {
  return selectedHunt ? getHuntRecordKey(selectedHunt) : '';
}

export function closeSelectionInfoWindow() {
  if (selectionInfoWindow) {
    selectionInfoWindow.close();
    selectionInfoWindow = null;
  }
}

export function closeSelectedHuntPopup() {
  const mapChooser = document.getElementById('mapChooser');
  const mapChooserBody = document.getElementById('mapChooserBody');
  if (!mapChooser) return;
  mapChooser.classList.remove('is-open');
  mapChooser.setAttribute('aria-hidden', 'true');
  selectedBoundaryMatches = [];
  if (mapChooserBody) {
    mapChooserBody.innerHTML = '<div class="map-chooser-empty">Click a hunt boundary to load matching hunts.</div>';
  }
}

export function closeSelectedHuntFloat(zoomToUnit = false, zoomCallback = null) {
  const selectedHuntFloat = document.getElementById('selectedHuntFloat');
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  if (!selectedHuntFloat) return;
  selectedHuntFloat.classList.remove('is-open');
  selectedHuntFloat.setAttribute('aria-hidden', 'true');
  selectedHuntFloat.innerHTML = '';
  if (zoomToUnit && selectedHunt && safe(mapTypeSelect?.value).toLowerCase() !== 'globe') {
    if (typeof zoomCallback === 'function') zoomCallback();
  }
}

export function openSelectedHuntFloat() {
  const selectedHuntFloat = document.getElementById('selectedHuntFloat');
  if (!selectedHuntFloat || !selectedHunt) {
    closeSelectedHuntFloat();
    return;
  }

  const code = escapeHtml(getHuntCode(selectedHunt) || '');
  const name = escapeHtml(firstNonEmpty(selectedHunt.hunt_name, getUnitName(selectedHunt), getHuntTitle(selectedHunt), 'Selected Hunt'));
  const species = escapeHtml(getSpeciesDisplay(selectedHunt) || 'Not loaded');
  const weapon = escapeHtml(getWeapon(selectedHunt) || 'Not loaded');
  const huntType = escapeHtml(getHuntType(selectedHunt) || 'Not loaded');
  const dates = escapeHtml(getDates(selectedHunt) || 'See official hunt details');

  selectedHuntFloat.innerHTML = `
    <section class="selected-unit-placard">
      <div class="selected-unit-placard-head">
        <div>
          <p class="selected-unit-placard-kicker">Selected Unit</p>
          <h3 class="selected-unit-placard-title">${code || 'Selected Hunt'}</h3>
        </div>
        <button type="button" class="selected-unit-placard-close" data-close-selected-hunt-float aria-label="Close selected hunt">X</button>
      </div>
      <div class="selected-unit-placard-body">
        <div class="selected-unit-placard-top">
          <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR logo" class="selected-unit-placard-logo">
          <div>
            <div class="selected-unit-placard-code">Utah DWR hunt</div>
            <div class="selected-unit-placard-name">${name}</div>
            <p class="selected-unit-placard-sub">${species} · ${weapon} · ${huntType}</p>
          </div>
        </div>
        <div class="selected-unit-placard-grid">
          <div class="selected-unit-placard-pill">
            <span class="selected-unit-placard-pill-label">Unit</span>
            <span class="selected-unit-placard-pill-value">${escapeHtml(getUnitName(selectedHunt) || getHuntTitle(selectedHunt) || 'Not loaded')}</span>
          </div>
          <div class="selected-unit-placard-pill">
            <span class="selected-unit-placard-pill-label">Dates</span>
            <span class="selected-unit-placard-pill-value">${dates}</span>
          </div>
        </div>
        <div class="selected-unit-placard-actions">
          <button type="button" class="secondary hunt-research-ring" data-inline-hunt-research>
            Hunt Research
          </button>
        </div>
        <div class="selected-unit-placard-note">Built to stay just off the left rail so the map area still breathes.</div>
      </div>
    </section>`;
  selectedHuntFloat.classList.add('is-open');
  selectedHuntFloat.setAttribute('aria-hidden', 'false');
  selectedHuntFloat.querySelector('[data-close-selected-hunt-float]')?.addEventListener('click', () => closeSelectedHuntFloat());
  selectedHuntFloat.querySelector('[data-inline-hunt-research]')?.addEventListener('click', () => {
    openHuntResearch(getHuntCode(selectedHunt));
  });
}
