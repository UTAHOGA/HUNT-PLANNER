window.UOGA_OUTFITTERS = (() => {
  const { KNOWN_OUTFITTER_COORDS, UTAH_LOCATION_BOUNDS } = window.UOGA_CONFIG;

  function safe(v) { return String(v ?? ''); }
  function firstNonEmpty(...a) { for (const x of a) { const t = safe(x).trim(); if (t) return t; } return ''; }
  function normalizeBoundaryKey(value) {
    return safe(value)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function titleCaseWords(v) {
    return safe(v).split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  function normalizeVisibleVerificationLabel(v) { return safe(v).replace(/\bVetted\b/g, 'Verified'); }

  function normalizeListValues(values) {
    if (Array.isArray(values)) return values.map(v => safe(v).trim()).filter(Boolean);
    const one = safe(values).trim();
    return one ? [one] : [];
  }

  function normalizeBoolean(value) {
    if (typeof value === 'boolean') return value;
    const lowered = safe(value).trim().toLowerCase();
    return lowered === 'true' || lowered === 'yes' || lowered === '1';
  }

  function choosePrimaryListValue(primaryValue, values) {
    const list = normalizeListValues(values);
    const primary = safe(primaryValue).trim();
    if (primary && primary.length > 3) return primary;
    return list[0] || primary;
  }

  function normalizeOutfitterRecord(record) {
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

  function normalizeOutfitterList(list) {
    return (Array.isArray(list) ? list : []).map(normalizeOutfitterRecord).filter(Boolean);
  }

  function getOutfitterCoverageKey(species, unitCode) {
    return `${normalizeBoundaryKey(species)}|${normalizeBoundaryKey(unitCode)}`;
  }

  function normalizeOutfitterCoverageList(list) {
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

  // --- STATE ACCESSORS ---
  function getOutfitters() { return window.UOGA_STATE?.outfitters || []; }
  function getOutfitterFederalCoverage() { return window.UOGA_STATE?.outfitterFederalCoverage || []; }
  function getOutfitterFederalCoverageIndex() { return window.UOGA_STATE?.outfitterFederalCoverageIndex || new Map(); }

  function getOutfitterLocationText(outfitter) {
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

  function getOutfitterPrimaryPhone(outfitter) {
    return choosePrimaryListValue(outfitter.phonePrimary, outfitter.phone);
  }

  function getOutfitterPrimaryEmail(outfitter) {
    return choosePrimaryListValue(outfitter.emailPrimary, outfitter.email);
  }

  function getOutfitterSummaryTags(outfitter) {
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

  function getKnownOutfitterCoords(outfitter) {
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

  function isWithinUtahBounds(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= UTAH_LOCATION_BOUNDS.minLat
      && lat <= UTAH_LOCATION_BOUNDS.maxLat
      && lng >= UTAH_LOCATION_BOUNDS.minLng
      && lng <= UTAH_LOCATION_BOUNDS.maxLng;
  }

  function deterministicHash(input) {
    const text = safe(input);
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function getOutfitterLocalityScore(outfitter, hunt, requiredUsfsForests = []) {
    const unitName = normalizeBoundaryKey(window.UOGA_HUNTS?.getUnitName(hunt) || '');
    const unitCode = normalizeBoundaryKey(window.UOGA_HUNTS?.getUnitCode(hunt) || '');
    const city = normalizeBoundaryKey(outfitter.city);
    const hometown = normalizeBoundaryKey(outfitter.hometown);
    const region = normalizeBoundaryKey(outfitter.region);
    const usfsForestIds = normalizeListValues(outfitter.usfsForestIds).map(normalizeBoundaryKey);
    let score = 0;

    [city, hometown, region].filter(Boolean).forEach(place => {
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

  function orderOutfitterMatchesForDisplay(hunt, matches, requiredUsfsForests = []) {
    const huntSeed = `${normalizeBoundaryKey(window.UOGA_HUNTS?.getSpeciesDisplay(hunt) || '')}|${normalizeBoundaryKey(window.UOGA_HUNTS?.getUnitCode(hunt) || '')}|${normalizeBoundaryKey(window.UOGA_HUNTS?.getUnitName(hunt) || '')}`;
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

  return {
    normalizeOutfitterRecord,
    normalizeOutfitterList,
    normalizeOutfitterCoverageList,
    getOutfitterCoverageKey,
    getOutfitters,
    getOutfitterFederalCoverage,
    getOutfitterFederalCoverageIndex,
    getOutfitterLocationText,
    getOutfitterPrimaryPhone,
    getOutfitterPrimaryEmail,
    getOutfitterSummaryTags,
    getKnownOutfitterCoords,
    isWithinUtahBounds,
    deterministicHash,
    getOutfitterLocalityScore,
    orderOutfitterMatchesForDisplay,
    normalizeListValues,
    normalizeBoolean,
    choosePrimaryListValue,
    normalizeVisibleVerificationLabel,
    safe,
    firstNonEmpty,
    normalizeBoundaryKey,
    titleCaseWords
  };
})();
