import {
  getHuntRecordKey, getHuntCode, getBoundaryId, getSpeciesDisplay, getNormalizedSex,
  getUnitName, normalizeHuntCode, normalizeBoundaryKey, firstNonEmpty, safe
} from '../hunts/hunt-data.js';
import { normalizeOutfitterList, normalizeOutfitterCoverageList } from '../outfitters/outfitter-data.js';

const {
  HUNT_DATA_SOURCES,
  ELK_BOUNDARY_TABLE_SOURCES,
  OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
  SPIKE_ELK_HUNT_CODES,
  OUTFITTERS_DATA_SOURCES,
  OUTFITTER_FEDERAL_COVERAGE_SOURCES,
  CONSERVATION_PERMIT_AREA_SOURCES,
  CONSERVATION_PERMIT_HUNT_TABLE_SOURCES
} = window.UOGA_CONFIG;

export async function loadHunts(updateStatus) {
  return window.UOGA_DATA.loadHuntDataRecords({
    HUNT_DATA_SOURCES,
    ELK_BOUNDARY_TABLE_SOURCES,
    OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
    SPIKE_ELK_HUNT_CODES,
    getHuntRecordKey,
    getHuntCode,
    getBoundaryId,
    getSpeciesDisplay,
    getNormalizedSex,
    getUnitName,
    normalizeHuntCode,
    normalizeBoundaryKey,
    firstNonEmpty,
    safe,
    updateStatus: updateStatus || (() => {})
  });
}

export async function loadOutfitters() {
  return window.UOGA_DATA.loadFirstNormalizedList(OUTFITTERS_DATA_SOURCES, normalizeOutfitterList, []);
}

export async function loadOutfitterFederalCoverage() {
  return window.UOGA_DATA.loadFirstNormalizedList(OUTFITTER_FEDERAL_COVERAGE_SOURCES, normalizeOutfitterCoverageList, []);
}

export async function loadConservationPermitAreas() {
  try {
    return await window.UOGA_DATA.loadFirstNormalizedList(
      CONSERVATION_PERMIT_AREA_SOURCES,
      json => Array.isArray(json) ? json : [],
      []
    );
  } catch (error) {
    console.error('Conservation permit area load failed; continuing without conservation register.', error);
    return [];
  }
}

export async function loadConservationPermitHuntTable() {
  try {
    return await window.UOGA_DATA.loadFirstNormalizedList(
      CONSERVATION_PERMIT_HUNT_TABLE_SOURCES,
      json => Array.isArray(json) ? json : [],
      []
    );
  } catch (error) {
    console.error('Conservation permit hunt table load failed; continuing without synthetic conservation hunts.', error);
    return [];
  }
}
