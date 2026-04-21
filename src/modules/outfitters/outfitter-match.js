import { getOutfitters, getFederalCoverageForHunt, normalizeListValues } from '../outfitters/outfitter-data.js';
import {
  getSpeciesDisplay, getUnitCode, getUnitName, normalizeBoundaryKey,
  getRequiredUsfsForestsForHunt, titleCaseWords, safe, firstNonEmpty
} from '../hunts/hunt-data.js';

export function deterministicHash(input) {
  const text = safe(input);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getOutfitterLocalityScore(outfitter, hunt, requiredUsfsForests = []) {
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const city = normalizeBoundaryKey(outfitter.city);
  const hometown = normalizeBoundaryKey(outfitter.hometown);
  const region = normalizeBoundaryKey(outfitter.region);
  const usfsForestIds = normalizeListValues(outfitter.usfsForestIds).map(normalizeBoundaryKey);
  let score = 0;

  [city, hometown, region].filter(Boolean).forEach(place => {
    if (!place) return;
    if (unitName && (unitName.includes(place) || place.includes(unitName))) score += 8;
    if (unitCode && (unitCode.includes(place) || place.includes(unitCode))) score += 5;
  });

  if ((city === 'manti' || hometown === 'manti' || region === 'manti')
    && requiredUsfsForests.includes('manti-la-sal')) {
    score += 6;
  }
  if (requiredUsfsForests.some(required => usfsForestIds.includes(required))) {
    score += 2;
  }
  return score;
}

export function orderOutfitterMatchesForDisplay(hunt, matches, requiredUsfsForests = []) {
  const huntSeed = `${normalizeBoundaryKey(getSpeciesDisplay(hunt))}|${normalizeBoundaryKey(getUnitCode(hunt))}|${normalizeBoundaryKey(getUnitName(hunt))}`;
  return [...matches].sort((a, b) => {
    const aLocal = getOutfitterLocalityScore(a, hunt, requiredUsfsForests);
    const bLocal = getOutfitterLocalityScore(b, hunt, requiredUsfsForests);
    if (bLocal !== aLocal) return bLocal - aLocal;
    const aReasons = normalizeListValues(a.matchReasons).length;
    const bReasons = normalizeListValues(b.matchReasons).length;
    if (bReasons !== aReasons) return bReasons - aReasons;
    const aRand = deterministicHash(`${huntSeed}|${safe(a.id || a.slug || a.listingName)}`);
    const bRand = deterministicHash(`${huntSeed}|${safe(b.id || b.slug || b.listingName)}`);
    return aRand - bRand;
  });
}

export function getMatchingOutfittersForHunt(hunt) {
  const outfitters = getOutfitters();
  if (!hunt || !outfitters.length) return [];
  const publishedCoverage = getFederalCoverageForHunt(hunt);
  const species = normalizeBoundaryKey(getSpeciesDisplay(hunt));
  const unitCode = normalizeBoundaryKey(getUnitCode(hunt));
  const unitName = normalizeBoundaryKey(getUnitName(hunt));
  const requiredUsfsForests = getRequiredUsfsForestsForHunt(hunt);
  const evaluated = outfitters.map(o => {
    const speciesServed = normalizeListValues(o.speciesServed).map(normalizeBoundaryKey);
    const unitsServed = normalizeListValues(o.unitsServed).map(normalizeBoundaryKey);
    const usfsForests = normalizeListValues(o.usfsForests).map(normalizeBoundaryKey);
    const usfsForestIds = normalizeListValues(o.usfsForestIds).map(normalizeBoundaryKey);
    const speciesMatch = !speciesServed.length || speciesServed.includes(species);
    const unitMatch = !unitsServed.length
      || unitsServed.includes(unitCode)
      || unitsServed.includes(unitName)
      || unitsServed.some(u => unitName.includes(u) || u.includes(unitName) || unitCode.includes(u));
    const forestMatch = !requiredUsfsForests.length
      || requiredUsfsForests.some(required => usfsForestIds.includes(required) || usfsForests.includes(required));
    const confidence = [
      speciesMatch ? 1 : 0,
      unitMatch ? 1 : 0,
      forestMatch ? 2 : 0,
      usfsForestIds.length ? 1 : 0
    ].reduce((sum, value) => sum + value, 0);
    const matchReasons = [];
    if (forestMatch && requiredUsfsForests.length) {
      const forestLabel = requiredUsfsForests[0]
        .split('-')
        .map(part => titleCaseWords(part))
        .join('-');
      matchReasons.push(`${forestLabel} Permit Match`);
    }
    if (unitMatch && unitsServed.length) matchReasons.push('Unit Match');
    if (speciesMatch && speciesServed.length) matchReasons.push('Species Match');
    if (o.guidedHunts) matchReasons.push('Guided Hunts');
    return { outfitter: o, speciesMatch, unitMatch, forestMatch, confidence, matchReasons };
  });

  const strongMatches = evaluated
    .filter(row => row.speciesMatch && row.unitMatch && row.forestMatch)
    .sort((a, b) => b.confidence - a.confidence || a.outfitter.listingName.localeCompare(b.outfitter.listingName))
    .map(row => ({ ...row.outfitter, matchReasons: row.matchReasons }));

  const speciesOnlyMatches = evaluated
    .filter(row => row.speciesMatch && row.forestMatch)
    .sort((a, b) => b.confidence - a.confidence || a.outfitter.listingName.localeCompare(b.outfitter.listingName))
    .map(row => ({ ...row.outfitter, matchReasons: row.matchReasons }));

  const fallbackMatches = strongMatches.length ? strongMatches : speciesOnlyMatches;
  if (publishedCoverage && publishedCoverage.federalCoverageEligible !== 'No') {
    const publishedNames = normalizeListValues(
      publishedCoverage.federalPermitMatchedOutfitters?.length
        ? publishedCoverage.federalPermitMatchedOutfitters
        : publishedCoverage.usfsPermitMatchedOutfitters
    );
    if (publishedNames.length) {
      const lookup = new Map(outfitters.map(o => [safe(o.listingName).trim().toLowerCase(), o]));
      const publishedMatches = publishedNames
        .map(name => lookup.get(safe(name).trim().toLowerCase()))
        .filter(Boolean)
        .map(o => {
          const matchReasons = [];
          if (publishedCoverage.primaryUsfsForestName) {
            matchReasons.push(`${publishedCoverage.primaryUsfsForestName} Permit Match`);
          }
          if (publishedCoverage.primaryBlmDistrictName) {
            matchReasons.push(`${publishedCoverage.primaryBlmDistrictName} Permit Match`);
          }
          return { ...o, matchReasons: [...new Set(matchReasons)] };
        });
      const merged = [];
      const mergedIndex = new Map();
      const upsert = (candidate) => {
        const key = safe(firstNonEmpty(candidate.id, candidate.slug, candidate.listingName)).trim().toLowerCase();
        if (!key) return;
        const existing = mergedIndex.get(key);
        if (!existing) {
          const normalized = {
            ...candidate,
            matchReasons: [...new Set(normalizeListValues(candidate.matchReasons))]
          };
          mergedIndex.set(key, normalized);
          merged.push(normalized);
          return;
        }
        existing.matchReasons = [...new Set([
          ...normalizeListValues(existing.matchReasons),
          ...normalizeListValues(candidate.matchReasons)
        ])];
      };
      publishedMatches.forEach(upsert);
      fallbackMatches.forEach(upsert);
      if (merged.length) return orderOutfitterMatchesForDisplay(hunt, merged, requiredUsfsForests);
    }
  }
  return orderOutfitterMatchesForDisplay(hunt, fallbackMatches, requiredUsfsForests);
}
