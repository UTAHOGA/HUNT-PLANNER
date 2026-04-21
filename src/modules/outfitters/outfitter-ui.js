import { getMatchingOutfittersForHunt, orderOutfitterMatchesForDisplay } from '../outfitters/outfitter-match.js';
import {
  escapeHtml, safe, firstNonEmpty, normalizeVisibleVerificationLabel,
  getHuntCode, getUnitCode, getUnitName, getRequiredUsfsForestsForHunt
} from '../hunts/hunt-data.js';
import { normalizeListValues, choosePrimaryListValue } from '../outfitters/outfitter-data.js';
// Circular dep: map-manager.js and ui-renderer.js import from this file; safe since only used in function bodies
import { getMap, applyMapMode } from '../map/map-manager.js';
import {
  closeSelectionInfoWindow, getSelectionInfoWindow, setSelectionInfoWindow, getSelectedHunt
} from '../ui/ui-state.js';
import { updateStatus } from '../ui/ui-renderer.js';

const { KNOWN_OUTFITTER_COORDS, UTAH_LOCATION_BOUNDS, DNR_ORANGE } = window.UOGA_CONFIG;

// --- State ---
let outfitterMarkers = [];
const outfitterGeocodeCache = new Map();
const outfitterMarkerIndex = new Map();
let outfitterMarkerRunId = 0;
let suppressLandClickUntil = 0;

export function noteOutfitterInteraction() {
  suppressLandClickUntil = Date.now() + 800;
}
export function shouldSuppressLandClick() {
  return Date.now() < suppressLandClickUntil;
}

export function getOutfitterLocationText(outfitter) {
  const address = safe(outfitter.address).trim();
  const hometown = safe(outfitter.hometown).trim();
  const city = safe(outfitter.city).trim();
  const region = safe(outfitter.region).trim();
  const state = safe(outfitter.state).trim() || 'Utah';
  if (address) return address;
  if (hometown && city && hometown.toLowerCase() !== city.toLowerCase()) return `${hometown} | ${city}, ${state}`;
  if (hometown) return hometown;
  if (city) return `${city}, ${state}`;
  if (region) return region;
  return '';
}
export function getOutfitterPrimaryPhone(outfitter) {
  return choosePrimaryListValue(outfitter.phonePrimary, outfitter.phone);
}
export function getOutfitterPrimaryEmail(outfitter) {
  return choosePrimaryListValue(outfitter.emailPrimary, outfitter.email);
}
export function getOutfitterSummaryTags(outfitter) {
  const tags = [];
  const listingType = normalizeVisibleVerificationLabel(firstNonEmpty(outfitter.verificationStatus, outfitter.certLevel, outfitter.listingType));
  if (listingType) tags.push(listingType);
  if (outfitter.guidedHunts) tags.push('Guided Hunts');
  if (outfitter.packTrips) tags.push('Pack Trips');
  if (outfitter.lodgingIncluded) tags.push('Lodging');
  if (outfitter.archery) tags.push('Archery');
  if (outfitter.muzzleloader) tags.push('Muzzleloader');
  return Array.from(new Set(tags));
}

export function buildOutfitterPopupCard(outfitter) {
  const logo = safe(outfitter.logoUrl).trim();
  const name = safe(outfitter.listingName).trim() || 'Outfitter';
  const website = safe(outfitter.website).trim();
  const phone = getOutfitterPrimaryPhone(outfitter);
  const email = getOutfitterPrimaryEmail(outfitter);
  const location = getOutfitterLocationText(outfitter);
  const tags = [...normalizeListValues(outfitter.matchReasons), ...getOutfitterSummaryTags(outfitter)].slice(0, 5);
  return `
    <div style="display:grid;gap:10px;min-width:280px;max-width:340px;">
      <div style="display:grid;grid-template-columns:58px minmax(0,1fr);align-items:center;gap:12px;">
        ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)} logo" style="width:58px;height:58px;object-fit:cover;object-position:center;border-radius:12px;background:#fff;padding:3px;border:1px solid #d6c1ae;box-shadow:0 6px 14px rgba(0,0,0,.14);">` : ''}
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${DNR_ORANGE};">Verified Outfitter</div>
          <div style="font-size:17px;font-weight:900;color:#2b1c12;line-height:1.15;">${escapeHtml(name)}</div>
        </div>
      </div>
      ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${tags.map(tag => `<span style="display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:rgba(214,106,31,.11);border:1px solid rgba(214,106,31,.2);font-size:12px;font-weight:800;color:#3b2417;">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      ${location ? `<div style="font-size:13px;color:#6b5646;line-height:1.35;">${escapeHtml(location)}</div>` : ''}
      ${phone ? `<div style="font-size:13px;color:#6b5646;">${escapeHtml(phone)}</div>` : ''}
      ${email ? `<div style="font-size:13px;color:#6b5646;">${escapeHtml(email)}</div>` : ''}
      ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer" style="color:#2f7fd1;font-weight:800;text-decoration:none;">Visit website</a>` : ''}
    </div>`;
}

export function openOutfitterInfoWindow(outfitter, position) {
  const googleBaselineMap = getMap();
  noteOutfitterInteraction();
  closeSelectionInfoWindow();
  setSelectionInfoWindow(new google.maps.InfoWindow({
    content: buildOutfitterPopupCard(outfitter),
    position,
    pixelOffset: new google.maps.Size(0, -36)
  }));
  getSelectionInfoWindow().open(googleBaselineMap);
}

export function clearOutfitterMarkers() {
  outfitterMarkerRunId += 1;
  outfitterMarkers.forEach(marker => marker?.setMap?.(null));
  outfitterMarkers = [];
  outfitterMarkerIndex.clear();
}

export function getKnownOutfitterCoords(outfitter) {
  const keys = [
    firstNonEmpty(outfitter?.id),
    firstNonEmpty(outfitter?.slug),
    safe(firstNonEmpty(outfitter?.listingName, outfitter?.displayName, outfitter?.businessName)).toLowerCase().trim()
  ].filter(Boolean);
  for (const key of keys) {
    const coords = KNOWN_OUTFITTER_COORDS.get(key);
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) return coords;
  }
  return null;
}

export function isWithinUtahBounds(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= UTAH_LOCATION_BOUNDS.minLat
    && lat <= UTAH_LOCATION_BOUNDS.maxLat
    && lng >= UTAH_LOCATION_BOUNDS.minLng
    && lng <= UTAH_LOCATION_BOUNDS.maxLng;
}

export function getLatLngLiteral(value) {
  if (!value) return null;
  if (typeof value.lat === 'function' && typeof value.lng === 'function') {
    return { lat: value.lat(), lng: value.lng() };
  }
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
}

export function isUtahGeocodeResult(result) {
  const location = getLatLngLiteral(result?.geometry?.location);
  if (!location || !isWithinUtahBounds(location.lat, location.lng)) return false;
  const components = Array.isArray(result?.address_components) ? result.address_components : [];
  const stateComponent = components.find(component => Array.isArray(component.types) && component.types.includes('administrative_area_level_1'));
  if (!stateComponent) return true;
  const shortName = safe(stateComponent.short_name).toUpperCase();
  const longName = safe(stateComponent.long_name).toUpperCase();
  return shortName === 'UT' || longName === 'UTAH';
}

export function formatUtahAddressPart(value) {
  return safe(value)
    .replace(/\bNorth\b/ig, 'N')
    .replace(/\bSouth\b/ig, 'S')
    .replace(/\bEast\b/ig, 'E')
    .replace(/\bWest\b/ig, 'W')
    .replace(/\bUtah\b/ig, 'UT')
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
    .trim();
}

export function cleanUtahAddress(rawAddress, city, state) {
  const raw = safe(rawAddress).trim();
  if (!raw) return '';
  const parts = raw.split(',').map(part => formatUtahAddressPart(part)).filter(Boolean);
  const cityText = formatUtahAddressPart(city);
  const stateText = formatUtahAddressPart(state) || 'UT';
  const zip = firstNonEmpty(raw.match(/\b\d{5}(?:-\d{4})?\b/)?.[0], '');
  const street = parts.find(part => /\d/.test(part) && /\b(?:N|S|E|W|HWY|HIGHWAY|RD|ROAD|ST|STREET|AVE|AVENUE|DR|DRIVE|LN|LANE|BLVD|WAY|CT|COURT|CIR|CIRCLE)\b/i.test(part))
    || parts.find(part => /\d/.test(part) && !/\b(?:UT|USA|UNITED STATES)\b/i.test(part))
    || '';
  const cityCandidate = cityText
    || parts.find(part => /^[A-Za-z .'-]+$/.test(part) && !/\b(?:UT|USA|UNITED STATES)\b/i.test(part) && !/\d/.test(part))
    || '';
  const normalizedState = stateText.toUpperCase() === 'UTAH' ? 'UT' : stateText.toUpperCase();
  const combined = [street, cityCandidate, normalizedState, zip].filter(Boolean).join(', ');
  return combined.length >= 8 ? combined : '';
}

export function getOutfitterGeocodeQueries(outfitter) {
  const address = safe(outfitter.address).trim();
  const hometown = safe(outfitter.hometown).trim();
  const city = safe(outfitter.city).trim();
  const region = safe(outfitter.region).trim();
  const state = safe(outfitter.state).trim() || 'Utah';
  const cleanedAddress = cleanUtahAddress(address, city || hometown, state);
  const queries = [];
  const pushQuery = value => {
    const text = safe(value).trim();
    if (!text) return;
    if (/^utah$/i.test(text)) return;
    if (!queries.includes(text)) queries.push(text);
  };

  pushQuery(cleanedAddress);
  pushQuery(address);
  if (address && !/utah/i.test(address)) pushQuery(`${address}, ${state}`);
  if (cleanedAddress && !/\bUT\b/i.test(cleanedAddress) && !/utah/i.test(cleanedAddress)) pushQuery(`${cleanedAddress}, UT`);
  if (hometown && city && hometown.toLowerCase() !== city.toLowerCase()) pushQuery(`${hometown}, ${city}, ${state}`);
  pushQuery(hometown && !/utah/i.test(hometown) ? `${hometown}, ${state}` : hometown);
  pushQuery(city ? `${city}, ${state}` : '');
  pushQuery(region && !/utah/i.test(region) ? `${region}, ${state}` : region);
  return queries;
}

export function geocodeOutfitter(outfitter) {
  const key = `${safe(outfitter.listingName)}|${getOutfitterLocationText(outfitter)}`;
  if (outfitterGeocodeCache.has(key)) {
    return Promise.resolve(outfitterGeocodeCache.get(key));
  }
  const knownCoords = getKnownOutfitterCoords(outfitter);
  if (knownCoords) {
    const knownLocation = new google.maps.LatLng(knownCoords.lat, knownCoords.lng);
    outfitterGeocodeCache.set(key, knownLocation);
    return Promise.resolve(knownLocation);
  }
  if (Number.isFinite(outfitter?.latitude) && Number.isFinite(outfitter?.longitude)) {
    if (isWithinUtahBounds(outfitter.latitude, outfitter.longitude)) {
      const directLocation = new google.maps.LatLng(outfitter.latitude, outfitter.longitude);
      outfitterGeocodeCache.set(key, directLocation);
      return Promise.resolve(directLocation);
    }
  }
  if (!google.maps?.Geocoder) return Promise.resolve(null);
  const queries = getOutfitterGeocodeQueries(outfitter);
  if (!queries.length) return Promise.resolve(null);
  const geocoder = new google.maps.Geocoder();
  return (async () => {
    for (const query of queries) {
      const loc = await new Promise(done => {
        geocoder.geocode({
          address: query,
          componentRestrictions: { country: 'US' }
        }, (results, status) => {
          const result = status === 'OK' && Array.isArray(results)
            ? results.find(entry => isUtahGeocodeResult(entry))
            : null;
          const location = result?.geometry?.location || null;
          done(location);
        });
      });
      if (loc) {
        outfitterGeocodeCache.set(key, loc);
        return loc;
      }
    }
    outfitterGeocodeCache.set(key, null);
    return null;
  })();
}

export function createOutfitterLogoMarker(position, outfitter) {
  const marker = new google.maps.OverlayView();
  marker.position = position;
  marker.outfitter = outfitter;
  marker.div = null;
  marker.onAdd = function() {
    const div = document.createElement('div');
    div.className = 'outfitter-logo-pin-shell';
    const initials = (safe(outfitter.listingName).trim().match(/[A-Z0-9]/ig) || ['O']).slice(0, 2).join('').toUpperCase();
    const logoMarkup = safe(outfitter.logoUrl).trim()
      ? `<img src="${escapeHtml(outfitter.logoUrl)}" alt="${escapeHtml(outfitter.listingName || 'Outfitter')}">`
      : `<span class="outfitter-logo-pin-fallback">${escapeHtml(initials)}</span>`;
    div.innerHTML = `
      <div class="outfitter-logo-pin-base"></div>
      <div class="outfitter-logo-pin-center">
        ${logoMarkup}
      </div>`;
    div.title = safe(outfitter.listingName).trim() || 'Outfitter';
    div.style.pointerEvents = 'auto';
    if (google.maps.OverlayView?.preventMapHitsAndGesturesFrom) {
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(div);
    }
    const openOutfitterInfo = (event) => {
      if (event) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
      openOutfitterInfoWindow(outfitter, position);
    };
    ['pointerdown', 'mousedown', 'touchstart'].forEach(type => {
      div.addEventListener(type, event => {
        event.preventDefault?.();
        event.stopPropagation?.();
        noteOutfitterInteraction();
      }, { passive: false });
    });
    div.addEventListener('click', openOutfitterInfo, { passive: false });
    this.div = div;
    this.getPanes().overlayMouseTarget.appendChild(div);
  };
  marker.draw = function() {
    if (!this.div) return;
    const projection = this.getProjection();
    if (!projection) return;
    const point = projection.fromLatLngToDivPixel(position);
    if (!point) return;
    this.div.style.position = 'absolute';
    this.div.style.left = `${point.x - 27}px`;
    this.div.style.top = `${point.y - 82}px`;
  };
  marker.onRemove = function() {
    if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
    this.div = null;
  };
  return marker;
}

function toLatLngLiteral(value) {
  if (!value) return null;
  if (typeof value.lat === 'function' && typeof value.lng === 'function') {
    return { lat: value.lat(), lng: value.lng() };
  }
  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return { lat: value.lat, lng: value.lng };
  }
  return null;
}

function getDistanceMeters(a, b) {
  const p1 = toLatLngLiteral(a);
  const p2 = toLatLngLiteral(b);
  if (!p1 || !p2) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => deg * Math.PI / 180;
  const earthRadius = 6371000;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

export function findNearbyOutfitterMarker(position, maxDistanceMeters = 120) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  outfitterMarkerIndex.forEach(({ position: markerPosition, outfitter }) => {
    const distance = getDistanceMeters(position, markerPosition);
    if (distance < nearestDistance && distance <= maxDistanceMeters) {
      nearest = { outfitter, position: markerPosition, distance };
      nearestDistance = distance;
    }
  });
  return nearest;
}

export function resolveOutfitterPriorityClick(position) {
  const nearby = findNearbyOutfitterMarker(position);
  if (!nearby) return false;
  focusOutfitter(nearby.outfitter);
  return true;
}

export async function focusOutfitter(outfitter) {
  const googleBaselineMap = getMap();
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  if (!googleBaselineMap || !outfitter) return;
  const markerKey = firstNonEmpty(outfitter.id, outfitter.slug, outfitter.listingName);
  const indexed = outfitterMarkerIndex.get(markerKey);
  let location = indexed?.position || null;
  if (!location) {
    location = await geocodeOutfitter(outfitter);
  }
  if (!location) {
    updateStatus(`Couldn't place ${firstNonEmpty(outfitter.listingName, 'that outfitter')} on the map yet.`);
    return;
  }
  noteOutfitterInteraction();
  if (safe(mapTypeSelect?.value).toLowerCase() === 'globe') {
    mapTypeSelect.value = 'terrain';
    applyMapMode();
  }
  googleBaselineMap.panTo(location);
  if ((googleBaselineMap.getZoom?.() || 0) < 14) {
    googleBaselineMap.setZoom(14);
  }
  openOutfitterInfoWindow(outfitter, location);
  updateStatus(`${firstNonEmpty(outfitter.listingName, 'Outfitter')} focused on the map.`);
}

export async function updateOutfitterMarkers(matches) {
  clearOutfitterMarkers();
  const googleBaselineMap = getMap();
  const mapTypeSelect = document.getElementById('mapTypeSelect');
  const runId = outfitterMarkerRunId;
  if (!googleBaselineMap || safe(mapTypeSelect?.value).toLowerCase() === 'globe') return;
  const unique = [];
  const seen = new Set();
  for (const outfitter of matches) {
    const name = safe(outfitter.listingName).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(outfitter);
  }
  for (const outfitter of unique) {
    try {
      const location = await geocodeOutfitter(outfitter);
      if (runId !== outfitterMarkerRunId) return;
      if (!location) continue;
      const marker = createOutfitterLogoMarker(location, outfitter);
      marker.setMap(googleBaselineMap);
      outfitterMarkers.push(marker);
      outfitterMarkerIndex.set(firstNonEmpty(outfitter.id, outfitter.slug, outfitter.listingName), { marker, position: location });
    } catch (error) {
      console.error('Outfitter marker failed', outfitter?.listingName, error);
    }
  }
}

export function renderOutfitters() {
  const container = document.getElementById('outfitterResults');
  const selectedHunt = getSelectedHunt();
  if (!container) return;
  if (!selectedHunt) {
    container.innerHTML = '<div class="empty-note">Select a hunt to load matching verified outfitters.</div>';
    clearOutfitterMarkers();
    return;
  }
  const matches = getMatchingOutfittersForHunt(selectedHunt);
  if (!matches.length) {
    container.innerHTML = '<div class="empty-note">No verified outfitters matched this hunt yet.</div>';
    clearOutfitterMarkers();
    return;
  }
  container.innerHTML = matches.map(o => {
    const website = safe(o.website).trim();
    const phone = getOutfitterPrimaryPhone(o);
    const email = getOutfitterPrimaryEmail(o);
    const logo = safe(o.logoUrl).trim();
    const location = getOutfitterLocationText(o);
    const tags = [...normalizeListValues(o.matchReasons), ...getOutfitterSummaryTags(o)].slice(0, 4);
    return `
      <div class="outfitter-card" data-outfitter-id="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}" role="button" tabindex="0" title="Zoom to ${escapeHtml(o.listingName || 'outfitter')}">
        <div class="outfitter-card-header">
          ${logo ? `<img class="outfitter-card-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(o.listingName || 'Outfitter logo')}">` : ''}
          <div class="outfitter-card-title-wrap">
            <div class="hunt-card-title">${escapeHtml(o.listingName || 'Outfitter')}</div>
            <div class="outfitter-card-subline">${escapeHtml(normalizeVisibleVerificationLabel(firstNonEmpty(o.verificationStatus, o.certLevel, o.listingType, 'Outfitter')))}</div>
          </div>
        </div>
        ${location ? `<div class="outfitter-card-subline">${escapeHtml(location)}</div>` : ''}
        ${tags.length ? `<div class="outfitter-card-meta-row">${tags.map(tag => `<span class="outfitter-card-chip">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        <div class="outfitter-card-actions">
          <button type="button" class="outfitter-action-btn primary" data-outfitter-focus="${escapeHtml(firstNonEmpty(o.id, o.slug, o.listingName))}">Map Link</button>
          ${website ? `<a class="outfitter-action-btn" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
        </div>
        ${phone ? `<div class="hunt-card-meta">${escapeHtml(phone)}</div>` : ''}
        ${email ? `<div class="hunt-card-meta">${escapeHtml(email)}</div>` : ''}
      </div>`;
  }).join('');
  container.querySelectorAll('[data-outfitter-focus]').forEach(button => {
    const outfitterId = button.getAttribute('data-outfitter-focus');
    const outfitter = matches.find(item => firstNonEmpty(item.id, item.slug, item.listingName) === outfitterId);
    if (!outfitter) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      focusOutfitter(outfitter);
    });
  });
  container.querySelectorAll('[data-outfitter-id]').forEach(card => {
    const outfitterId = card.getAttribute('data-outfitter-id');
    const outfitter = matches.find(item => firstNonEmpty(item.id, item.slug, item.listingName) === outfitterId);
    if (!outfitter) return;
    const open = () => focusOutfitter(outfitter);
    card.addEventListener('click', open);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
  updateOutfitterMarkers(matches);
}
