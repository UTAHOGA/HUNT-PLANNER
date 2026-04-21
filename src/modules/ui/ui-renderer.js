import {
  escapeHtml, safe, firstNonEmpty, assetUrl, getNormalizedSex,
  getHuntCode, getUnitCode, getUnitName, getHuntTitle, getBoundaryId,
  getSpeciesDisplay, getWeapon, getHuntType, getDates, getPanelHeading,
  getHuntRecordKey, getHuntCategory, buildBoundaryMatcher, getAllHunts
} from '../hunts/hunt-data.js';
// Circular dep: ui-state.js imports openHuntResearch from this file; safe since only used in function bodies
import {
  getSelectedHunt, getSelectedHuntKey, closeSelectionInfoWindow, setSelectedHunt,
  closeSelectedHuntPopup, closeSelectedHuntFloat, openSelectedHuntFloat, setSelectedBoundaryMatches
} from '../ui/ui-state.js';
import { getDisplayHunts, hasActiveMatrixSelections, getFilteredHunts, refreshSelectionMatrix } from '../hunts/hunt-filter.js';
// Circular dep: map-manager.js imports from this file; safe since only used in function bodies
import { styleBoundaryLayer, zoomToSelectedBoundary, zoomToDisplayHuntsBounds } from '../map/map-manager.js';
// Circular dep: outfitter-ui.js imports from this file; safe since only used in function bodies
import { renderOutfitters } from '../outfitters/outfitter-ui.js';

const { LOGO_DWR_SELECTOR, LOGO_DNR, LOGO_DNR_ROOMY, DNR_ORANGE, DNR_BROWN } = window.UOGA_CONFIG;

export function openHuntResearch(huntCode, residency = 'Resident', points = 12) {
  const code = String(huntCode || '').trim().toUpperCase();
  const normalizedResidency = String(residency || '').trim().toLowerCase().replace(/[\s_-]+/g, '') === 'nonresident'
    ? 'Nonresident'
    : 'Resident';

  localStorage.setItem('selected_hunt_code', code);
  localStorage.setItem('selected_hunt_research_residency', normalizedResidency);
  localStorage.setItem('selected_hunt_research_points', String(points));

  window.location.href = `./hunt-research.html?hunt_code=${encodeURIComponent(code)}`;
}

export function updateStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = message;
}

export function buildMatchingHuntCard(h, selectedKey) {
  const selected = selectedKey && selectedKey === getHuntRecordKey(h);
  const huntKey = escapeHtml(getHuntRecordKey(h));
  const name = escapeHtml(firstNonEmpty(h.hunt_name, getHuntTitle(h), getUnitName(h), ''));
  const code = escapeHtml(getHuntCode(h) || '');
  const codeAttr = escapeHtml(getHuntCode(h) || '');
  return `
    <div class="hunt-card${selected ? ' is-selected' : ''}" data-hunt-key="${huntKey}" role="button" tabindex="0">
      <div class="hunt-card-head">
        <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR" class="hunt-card-logo">
        <div>
          <div class="hunt-card-code">${code}</div>
          <div class="hunt-card-title">${name}</div>
        </div>
      </div>
      <div class="hunt-card-actions">
        <button type="button" class="secondary hunt-research-ring" data-hunt-research-code="${codeAttr}">
          Hunt Research
        </button>
      </div>
    </div>`;
}

export function renderMatchingHunts() {
  const container = document.getElementById('matchingHunts');
  if (!container) return;
  const list = getDisplayHunts();
  const selectedKey = getSelectedHuntKey();
  const selectedHunt = getSelectedHunt();
  updateStatus(
    !hasActiveMatrixSelections() && !selectedHunt
      ? 'Select filters or click a hunt unit to begin.'
      : `${list.length} matching hunt${list.length === 1 ? '' : 's'}`
  );
  container.innerHTML = list.length
    ? list.map(h => buildMatchingHuntCard(h, selectedKey)).join('')
    : '<div class="empty-note">Use the matrix or click a hunt unit to load matching hunts.</div>';
}

export function buildDnrPlate(hunt, compact = false, roomy = false) {
  const plateUrl = assetUrl(roomy ? LOGO_DNR_ROOMY : LOGO_DNR);
  const code = escapeHtml(getHuntCode(hunt) || '');
  const unit = escapeHtml(getUnitName(hunt) || getHuntTitle(hunt));
  const species = escapeHtml(getSpeciesDisplay(hunt) || 'N/A');
  const sex = escapeHtml(getNormalizedSex(hunt) || 'N/A');
  const huntType = escapeHtml(getHuntType(hunt) || 'N/A');
  const weapon = escapeHtml(getWeapon(hunt) || 'N/A');
  const dates = escapeHtml(getDates(hunt) || 'See official hunt details');
  const heading = escapeHtml(getPanelHeading(hunt));
  const boundaryLink = getBoundaryLinkLocal(hunt);
  const panelWidth = roomy ? 760 : (compact ? 480 : 560);
  const panelHeight = roomy ? 420 : (compact ? 184 : 214);
  const wrapperWidth = compact ? `width:${panelWidth}px;max-width:${panelWidth}px;` : `width:${panelWidth}px;max-width:100%;`;
  const titleSize = roomy ? '24px' : (compact ? '21px' : '23px');
  const metaSize = roomy ? '15px' : (compact ? '14px' : '15px');
  const infoTop = roomy ? '108px' : (compact ? '15px' : '17px');
  const infoLeft = roomy ? '37%' : (compact ? '38%' : '37%');
  const infoRight = roomy ? '30px' : '18px';
  const infoBottom = roomy ? '28px' : '16px';
  const infoGap = roomy ? '10px' : (compact ? '7px' : '9px');
  const detailGap = roomy ? '6px' : (compact ? '4px' : '6px');
  const unitSize = roomy ? '18px' : (compact ? '18px' : '19px');
  const linkSize = roomy ? '16px' : metaSize;

  if (roomy) {
    return `
      <div style="position:relative;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;border:1px solid ${DNR_ORANGE};border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(58,37,18,0.18);">
        <img src="${plateUrl}" alt="Utah DNR hunt information plate" style="display:block;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;object-fit:contain;border:0;">
        <div style="position:absolute;left:52px;top:322px;width:220px;display:grid;gap:1px;color:#2b1c12;">
          <div style="font-size:42px;font-weight:900;line-height:0.98;color:${DNR_BROWN};">${code}</div>
        </div>
        <div style="position:absolute;top:140px;left:37%;right:34px;bottom:28px;display:grid;align-content:start;gap:10px;color:#2b1c12;">
          <div style="display:grid;gap:4px;justify-items:center;text-align:center;">
            <div style="font-size:28px;font-weight:900;letter-spacing:.01em;text-transform:uppercase;color:${DNR_ORANGE};line-height:1.02;">${heading}</div>
            <div style="font-size:32px;font-weight:900;line-height:1.02;">${unit}</div>
          </div>
          <div style="display:grid;gap:6px;font-size:18px;line-height:1.28;">
            <div><strong>Species:</strong> ${species}</div>
            <div><strong>Sex:</strong> ${sex}</div>
            <div><strong>Hunt Type:</strong> ${huntType}</div>
            <div><strong>Weapon:</strong> ${weapon}</div>
            <div><strong>Dates:</strong> ${dates}</div>
          </div>
          ${boundaryLink ? `<button type="button" data-inline-hunt-details style="margin-top:4px;padding:0;border:0;background:transparent;color:#2f7fd1;font-size:18px;font-weight:800;text-decoration:none;text-align:left;cursor:pointer;">Official Utah DWR Hunt Details</button>` : ''}
        </div>
      </div>`;
  }

  return `
    <div style="position:relative;${wrapperWidth}height:${panelHeight}px;border:1px solid ${DNR_ORANGE};border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 8px 24px rgba(58,37,18,0.18);">
      <img src="${plateUrl}" alt="Utah DNR hunt information plate" style="display:block;width:${panelWidth}px;max-width:100%;height:${panelHeight}px;object-fit:fill;border:0;">
      <div style="position:absolute;top:${infoTop};left:${infoLeft};right:${infoRight};bottom:${infoBottom};display:grid;align-content:start;gap:${infoGap};color:#2b1c12;">
        <div style="display:grid;gap:3px;">
          <div style="font-size:${roomy ? '12px' : '13px'};font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">${heading}</div>
          <div style="font-size:${titleSize};font-weight:900;line-height:1.05;">${code}</div>
          <div style="font-size:${unitSize};font-weight:800;line-height:1.12;">${unit}</div>
        </div>
        <div style="display:grid;gap:${detailGap};font-size:${metaSize};line-height:1.28;">
          <div><strong>Species:</strong> ${species}</div>
          <div><strong>Sex:</strong> ${sex}</div>
          <div><strong>Hunt Type:</strong> ${huntType}</div>
          <div><strong>Weapon:</strong> ${weapon}</div>
          <div><strong>Dates:</strong> ${dates}</div>
        </div>
        ${boundaryLink ? `<button type="button" data-inline-hunt-details style="margin-top:2px;padding:0;border:0;background:transparent;color:#2f7fd1;font-size:${linkSize};font-weight:800;text-decoration:none;text-align:left;cursor:pointer;">Official Utah DWR Hunt Details</button>` : ''}
      </div>
    </div>`;
}

function getBoundaryLinkLocal(h) { return firstNonEmpty(h.boundaryLink, h.boundaryURL, h.huntBoundaryLink); }
function getUnitValue(h) { return firstNonEmpty(getUnitCode(h), getUnitName(h)); }

export function buildPopupCardForHunt(hunt) {
  return buildDnrPlate(hunt, true);
}

export function buildPopupListForMatches(matches) {
  return `
    <div style="display:grid;gap:10px;min-width:320px;max-width:380px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="${LOGO_DWR_SELECTOR}" alt="Utah DWR logo" style="width:48px;height:48px;object-fit:contain;border-radius:8px;background:#fff;padding:3px;border:1px solid #d6c1ae;">
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">DWR Hunt Unit</div>
          <div style="font-size:15px;font-weight:900;color:#2b1c12;">Multiple Matching Hunts</div>
        </div>
      </div>
      ${matches.slice(0, 8).map(h => `
        <button type="button" data-popup-hunt-key="${escapeHtml(getHuntRecordKey(h))}" style="text-align:left;border:1px solid #d6c1ae;border-radius:10px;background:#fffdf8;padding:10px;cursor:pointer;color:#2b1c12;">
          <div style="font-weight:900;">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
          <div style="font-size:12px;color:#6b5646;">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getWeapon(h))}</div>
        </button>
      `).join('')}
    </div>`;
}

export function showHuntMatchesChooser(title, matches, kicker = 'Matching Hunts') {
  const mapChooser = document.getElementById('mapChooser');
  const mapChooserBody = document.getElementById('mapChooserBody');
  const mapChooserTitle = document.getElementById('mapChooserTitle');
  const mapChooserKicker = document.getElementById('mapChooserKicker');
  if (!mapChooser || !mapChooserBody || !mapChooserTitle || !mapChooserKicker) return;
  closeSelectedHuntFloat();
  setSelectedBoundaryMatches(matches.slice());
  mapChooserKicker.textContent = kicker;
  mapChooserTitle.textContent = firstNonEmpty(title, 'Matching Hunts');
  mapChooserBody.innerHTML = matches.length ? matches.slice(0, 12).map(h => `
    <div class="map-chooser-card" data-popup-hunt-key="${escapeHtml(getHuntRecordKey(h))}" role="button" tabindex="0">
      <div class="hunt-card-title">${escapeHtml(getHuntCode(h))} | ${escapeHtml(getUnitName(h) || getHuntTitle(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(h))} | ${escapeHtml(getNormalizedSex(h))} | ${escapeHtml(getHuntType(h))}</div>
      <div class="map-chooser-meta">${escapeHtml(getWeapon(h))} | ${escapeHtml(getDates(h) || 'See official hunt details')}</div>
    </div>
  `).join('') : '<div class="map-chooser-empty">No matching hunts found for this boundary.</div>';
  mapChooser.classList.add('is-open');
  mapChooser.setAttribute('aria-hidden', 'false');
  mapChooserBody.querySelectorAll('[data-popup-hunt-key]').forEach(card => {
    const select = () => {
      closeSelectedHuntPopup();
      window.selectHuntByKey(card.getAttribute('data-popup-hunt-key'));
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', evt => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        select();
      }
    });
  });
}

export function openMapChooser(feature, matches) {
  const boundaryName = firstNonEmpty(feature?.getProperty?.('Boundary_Name'), 'Selected Unit');
  showHuntMatchesChooser(boundaryName, matches, hasActiveMatrixSelections() || getSelectedHunt() ? 'Matching Hunts' : 'Selected Unit');
}

export function getSelectedUnitGroups() {
  const groups = new Map();
  getDisplayHunts().forEach(hunt => {
    const key = firstNonEmpty(getBoundaryId(hunt), getUnitValue(hunt), getUnitName(hunt), getHuntCode(hunt));
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        unitValue: getUnitValue(hunt),
        unitName: getUnitName(hunt) || getHuntTitle(hunt),
        hunts: []
      });
    }
    groups.get(key).hunts.push(hunt);
  });
  return Array.from(groups.values()).sort((a, b) => safe(a.unitName).localeCompare(safe(b.unitName)));
}

export function openSelectedUnitsChooser() {
  const mapChooser = document.getElementById('mapChooser');
  const mapChooserBody = document.getElementById('mapChooserBody');
  const mapChooserTitle = document.getElementById('mapChooserTitle');
  const mapChooserKicker = document.getElementById('mapChooserKicker');
  if (!mapChooser || !mapChooserBody || !mapChooserTitle || !mapChooserKicker) return;
  const groups = getSelectedUnitGroups();
  if (groups.length <= 1) {
    closeSelectedHuntPopup();
    return;
  }
  closeSelectedHuntFloat();
  closeSelectionInfoWindow();
  setSelectedBoundaryMatches([]);
  mapChooserKicker.textContent = 'Selected Units';
  mapChooserTitle.textContent = `${groups.length} Units Selected`;
  mapChooserBody.innerHTML = groups.map(group => `
    <div class="map-chooser-card" data-selected-unit="${escapeHtml(group.unitValue || group.key)}" role="button" tabindex="0">
      <div class="hunt-card-title">${escapeHtml(group.unitName)}</div>
      <div class="map-chooser-meta">${group.hunts.length} matching hunt${group.hunts.length === 1 ? '' : 's'}</div>
      <div class="map-chooser-meta">${escapeHtml(getSpeciesDisplay(group.hunts[0]))} | ${escapeHtml(getHuntType(group.hunts[0]))}</div>
    </div>
  `).join('');
  mapChooser.classList.add('is-open');
  mapChooser.setAttribute('aria-hidden', 'false');
  mapChooserBody.querySelectorAll('[data-selected-unit]').forEach(card => {
    const select = () => {
      const unitFilter = document.getElementById('unitFilter');
      const unitValue = safe(card.getAttribute('data-selected-unit'));
      if (unitFilter) unitFilter.value = unitValue;
      refreshSelectionMatrix();
      styleBoundaryLayer();
      renderMatchingHunts();
      renderSelectedHunt();
      renderOutfitters();
      const hunts = getDisplayHunts().filter(h => getUnitValue(h) === unitValue);
      const unitTitle = firstNonEmpty(hunts[0] && getUnitName(hunts[0]), unitValue);
      showHuntMatchesChooser(unitTitle, hunts, 'Matching Hunts');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
}

export function renderSelectedHunt() {
  const panel = document.getElementById('selectedHuntPanel');
  const hunt = getSelectedHunt();

  if (!panel) return;

  if (!hunt) {
    panel.innerHTML = '<div class="empty-note">No hunt selected yet.</div>';
    closeSelectedHuntFloat();
    return;
  }

  const name = escapeHtml(firstNonEmpty(hunt.hunt_name, getUnitName(hunt), getHuntTitle(hunt), 'Unknown Hunt'));
  const code = escapeHtml(getHuntCode(hunt) || '');
  const species = escapeHtml(getSpeciesDisplay(hunt) || '');
  const weapon = escapeHtml(getWeapon(hunt) || '');
  const huntType = escapeHtml(getHuntType(hunt) || '');

  window.UOGA_UI?.recordRecentHunt?.({
    hunt_code: getHuntCode(hunt),
    hunt_name: firstNonEmpty(hunt.hunt_name, getUnitName(hunt), getHuntTitle(hunt), 'Unknown Hunt'),
    unit: getUnitName(hunt),
    species: getSpeciesDisplay(hunt),
    weapon: getWeapon(hunt),
    updated_at: Date.now()
  });

  panel.innerHTML = `
    <div class="selected-hunt-card">
      <div style="display:grid; gap:10px;">
        <div><strong>${name}</strong></div>
        <div><strong>Hunt Code:</strong> ${code}</div>
        <div><strong>Species:</strong> ${species}</div>
        <div><strong>Weapon:</strong> ${weapon}</div>
        <div><strong>Hunt Type:</strong> ${huntType}</div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
          <button
            type="button"
            class="secondary hunt-research-ring"
            id="selectedHuntResearchBtn">
            Open Hunt Research
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('selectedHuntResearchBtn')?.addEventListener('click', () => {
    openHuntResearch(getHuntCode(hunt));
  });

  openSelectedHuntFloat();
}

export function openInlineHuntDetails(hunt) {
  const section = document.getElementById('huntDetailsSection');
  const frame = document.getElementById('huntDetailsFrame');
  const title = document.getElementById('huntDetailsTitle');
  const meta = document.getElementById('huntDetailsMeta');
  const fallback = document.getElementById('huntDetailsFallbackLink');
  const link = getBoundaryLinkLocal(hunt);
  if (!section || !frame || !link || !hunt) return;
  if (title) title.textContent = `${getHuntCode(hunt)} | ${getUnitName(hunt) || getHuntTitle(hunt)}`;
  if (meta) meta.textContent = `${getSpeciesDisplay(hunt)} | ${getNormalizedSex(hunt)} | ${getHuntType(hunt)} | ${getWeapon(hunt)}`;
  if (fallback) fallback.href = link;
  frame.src = link;
  section.hidden = false;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateStatus('Official Utah DWR hunt details loaded below the map.');
}

export function closeInlineHuntDetails() {
  const section = document.getElementById('huntDetailsSection');
  const frame = document.getElementById('huntDetailsFrame');
  if (!section || !frame) return;
  section.hidden = true;
  frame.src = 'about:blank';
}

// Set global window functions for hunt selection (used by inline HTML event handlers)
if (typeof window !== 'undefined') {
  window.selectHuntByKey = (key) => {
    const h = getAllHunts().find(x => getHuntRecordKey(x) === key);
    if (h) {
      setSelectedHunt(h);
      renderSelectedHunt();
      renderOutfitters();
      closeSelectedHuntPopup();
      renderMatchingHunts();
      styleBoundaryLayer();
      zoomToSelectedBoundary();
    }
  };
  window.selectHuntByCode = (code) => {
    const h = getAllHunts().find(x => getHuntCode(x) === code);
    if (h) window.selectHuntByKey(getHuntRecordKey(h));
  };
}
