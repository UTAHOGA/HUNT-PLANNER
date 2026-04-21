import { normalizeBoundaryKey, getSpeciesDisplay, getUnitCode, firstNonEmpty, safe } from '../hunts/hunt-data.js';

// --- Helpers ---
export function normalizeListValues(values) {
  if (Array.isArray(values)) return values.map(v => safe(v).trim()).filter(Boolean);
  const one = safe(values).trim();
  return one ? [one] : [];
}
export function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const lowered = safe(value).trim().toLowerCase();
  return lowered === 'true' || lowered === 'yes' || lowered === '1';
}
export function choosePrimaryListValue(primaryValue, values) {
  const list = normalizeListValues(values);
  const primary = safe(primaryValue).trim();
  if (primary && primary.length > 3) return primary;
  return list[0] || primary;
}

export function normalizeOutfitterRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const isNested = !!(record.contact || record.branding || record.serviceArea || record.headquarters);
  if (!isNested) {
    return {
      ...record,
      listingName: firstNonEmpty(record.listingName, record.displayName, record.businessName, record.Outfitter),
      logoUrl: firstNonEmpty(record.logoUrl, record.logo, record.logoURL),
      website: firstNonEmpty(record.website, record.url),
      phone: normalizeListValues(record.phone),
      speciesServed: normalizeListValues(record.speciesServed),
      unitsServed: normalizeListValues(record.unitsServed),
      address: firstNonEmpty(record.address, record.hometown),
      city: firstNonEmpty(record.city),
      region: firstNonEmpty(record.region, record.state)
    };
  }

  const contact = record.contact || {};
  const branding = record.branding || {};
  const headquarters = record.headquarters || {};
  const serviceArea = record.serviceArea || {};
  const services = record.services || {};

  return {
    ...record,
    listingName: firstNonEmpty(record.displayName, record.legalBusinessName, record.businessName, record.Outfitter),
    businessName: firstNonEmpty(record.displayName, record.legalBusinessName, record.businessName),
    logoUrl: firstNonEmpty(branding.logoUrl, branding.cardImageUrl, branding.heroImageUrl),
    website: firstNonEmpty(contact.website, contact.facebookUrl, contact.instagramUrl, contact.instagramHandle),
    phone: normalizeListValues(contact.phoneNumbers?.length ? contact.phoneNumbers : contact.phonePrimary),
    email: normalizeListValues(contact.emailAddresses?.length ? contact.emailAddresses : contact.emailPrimary),
    phonePrimary: choosePrimaryListValue(contact.phonePrimary, contact.phoneNumbers),
    emailPrimary: choosePrimaryListValue(contact.emailPrimary, contact.emailAddresses),
    ownerNames: normalizeListValues(contact.ownerNames?.length ? contact.ownerNames : contact.primaryName),
    address: firstNonEmpty(headquarters.mailingAddress, headquarters.publicMeetingLocation),
    hometown: firstNonEmpty(headquarters.publicMeetingLocation, headquarters.city),
    city: firstNonEmpty(headquarters.city),
    region: firstNonEmpty(headquarters.region, headquarters.state),
    state: firstNonEmpty(headquarters.state),
    latitude: Number.isFinite(Number(headquarters.latitude)) ? Number(headquarters.latitude) : null,
    longitude: Number.isFinite(Number(headquarters.longitude)) ? Number(headquarters.longitude) : null,
    speciesServed: normalizeListValues(serviceArea.speciesServed),
    unitsServed: normalizeListValues(serviceArea.unitsServed),
    usfsForests: normalizeListValues(serviceArea.usfsForests),
    usfsForestIds: normalizeListValues(serviceArea.usfsForestIds),
    usfsDistrictIds: normalizeListValues(serviceArea.usfsDistrictIds),
    blmDistricts: normalizeListValues(serviceArea.blmDistricts),
    blmDistrictIds: normalizeListValues(serviceArea.blmDistrictIds),
    zoneTags: normalizeListValues(serviceArea.zoneTags),
    countiesServed: normalizeListValues(serviceArea.countiesServed),
    wmasServed: normalizeListValues(serviceArea.wmasServed),
    stateParks: normalizeListValues(serviceArea.stateParks),
    sitla: normalizeListValues(serviceArea.sitla),
    statewide: normalizeBoolean(serviceArea.statewide),
    guidedHunts: normalizeBoolean(services.guidedHunts),
    diySupport: normalizeBoolean(services.diySupport),
    trespassAccess: normalizeBoolean(services.trespassAccess),
    lodgingIncluded: normalizeBoolean(services.lodgingIncluded),
    mealsIncluded: normalizeBoolean(services.mealsIncluded),
    packTrips: normalizeBoolean(services.packTrips),
    youthHunts: normalizeBoolean(services.youthHunts),
    archery: normalizeBoolean(services.archery),
    muzzleloader: normalizeBoolean(services.muzzleloader),
    socialUrls: [
      firstNonEmpty(contact.facebookUrl),
      firstNonEmpty(contact.instagramUrl, contact.instagramHandle),
      firstNonEmpty(contact.youtubeUrl)
    ].filter(Boolean)
  };
}
export function normalizeOutfitterList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeOutfitterRecord).filter(Boolean);
}
export function getOutfitterCoverageKey(species, unitCode) {
  return `${normalizeBoundaryKey(species)}|${normalizeBoundaryKey(unitCode)}`;
}
export function normalizeOutfitterCoverageList(list) {
  return (Array.isArray(list) ? list : []).map(row => {
    const species = firstNonEmpty(row.Species, row.species);
    const unitCode = firstNonEmpty(row.UnitCode, row.unitCode);
    const unitName = firstNonEmpty(row.UnitName, row.unitName);
    return {
      species,
      unitCode,
      unitName,
      primaryUsfsForestName: firstNonEmpty(row.PrimaryUsfsForestName, row.primaryUsfsForestName),
      primaryBlmDistrictName: firstNonEmpty(row.PrimaryBlmDistrictName, row.primaryBlmDistrictName),
      usfsAuthoritySource: firstNonEmpty(row.UsfsAuthoritySource, row.usfsAuthoritySource),
      blmAuthoritySource: firstNonEmpty(row.BlmAuthoritySource, row.blmAuthoritySource),
      usfsPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.UsfsPermitMatchedOutfitters, row.usfsPermitMatchedOutfitters)),
      blmPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.BlmPermitMatchedOutfitters, row.blmPermitMatchedOutfitters)),
      federalPermitMatchedOutfitters: normalizeListValues(firstNonEmpty(row.FederalPermitMatchedOutfitters, row.federalPermitMatchedOutfitters)),
      federalCoverageEligible: firstNonEmpty(row.FederalCoverageEligible, row.federalCoverageEligible),
      notes: firstNonEmpty(row.Notes, row.notes)
    };
  }).filter(row => row.species && row.unitCode);
}

// --- State ---
let outfitters = [];
let outfitterFederalCoverage = [];
const outfitterFederalCoverageIndex = new Map();

export function setOutfitters(list) { outfitters = Array.isArray(list) ? list : []; }
export function getOutfitters() { return outfitters; }

export function setOutfitterFederalCoverage(list) {
  indexOutfitterFederalCoverage(list);
}

export function indexOutfitterFederalCoverage(list) {
  outfitterFederalCoverageIndex.clear();
  outfitterFederalCoverage = normalizeOutfitterCoverageList(list);
  outfitterFederalCoverage.forEach(row => {
    outfitterFederalCoverageIndex.set(getOutfitterCoverageKey(row.species, row.unitCode), row);
  });
}
export function getFederalCoverageForHunt(hunt) {
  if (!hunt) return null;
  return outfitterFederalCoverageIndex.get(getOutfitterCoverageKey(getSpeciesDisplay(hunt), getUnitCode(hunt))) || null;
}
