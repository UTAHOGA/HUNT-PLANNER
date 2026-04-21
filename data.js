window.UOGA_DATA = (() => {
  let officialBoundaryLookupPromise = null;

  async function fetchJson(url) {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async function fetchGeoJson(url) {
    return fetchJson(url);
  }

  async function fetchFirstGeoJson(urls) {
    let lastError = null;
    for (const url of urls) {
      try {
        return await fetchGeoJson(url);
      } catch (error) {
        lastError = error;
        console.error('Failed to load GeoJSON from', url, error);
      }
    }
    throw lastError || new Error('No GeoJSON source succeeded');
  }

  async function fetchArcGisPagedGeoJson(layerUrl, where, pageSize = 2000) {
    const allFeatures = [];
    let offset = 0;
    while (true) {
      const url = `${layerUrl}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=${pageSize}&resultOffset=${offset}`;
      const geojson = await fetchGeoJson(url);
      const features = Array.isArray(geojson?.features) ? geojson.features : [];
      allFeatures.push(...features);
      if (features.length < pageSize) break;
      offset += pageSize;
    }
    return { type: 'FeatureCollection', features: allFeatures };
  }

  async function loadOfficialBoundaryLookup(deps) {
    const {
      OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES,
      normalizeHuntCode,
      safe
    } = deps;

    if (!officialBoundaryLookupPromise) {
      officialBoundaryLookupPromise = (async () => {
        const lookup = new Map();
        for (const source of OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES) {
          try {
            const json = await fetchJson(source);
            const features = Array.isArray(json?.features) ? json.features : [];
            features.forEach(feature => {
              const attrs = feature?.attributes || {};
              const huntCode = normalizeHuntCode(attrs.HUNT_NUMBER);
              const boundaryId = safe(attrs.BOUNDARYID).trim();
              const boundaryName = safe(attrs.BOUNDARY_NAME).trim();
              if (!huntCode || (!boundaryId && !boundaryName)) return;
              const current = lookup.get(huntCode) || { ids: new Set(), names: new Set() };
              if (boundaryId) current.ids.add(boundaryId);
              if (boundaryName) current.names.add(boundaryName);
              lookup.set(huntCode, current);
            });
          } catch (error) {
            console.error(`Failed to load official hunt boundary lookup from ${source}.`, error);
          }
        }
        return lookup;
      })();
    }
    return officialBoundaryLookupPromise;
  }

  async function applyOfficialBoundaryMappings(records, deps) {
    const {
      normalizeHuntCode,
      getHuntCode,
      getBoundaryId,
      safe
    } = deps;

    const lookup = await loadOfficialBoundaryLookup(deps);
    if (!lookup?.size) return;
    records.forEach(record => {
      const huntCode = normalizeHuntCode(getHuntCode(record));
      if (!huntCode) return;
      const official = lookup.get(huntCode);
      if (!official) return;
      const officialBoundaryIds = Array.from(official.ids || []);
      const officialBoundaryNames = Array.from(official.names || []);
      if (officialBoundaryIds.length) {
        record.officialBoundaryIds = officialBoundaryIds;
        if (!safe(getBoundaryId(record)).trim() && officialBoundaryIds.length === 1) {
          record.boundaryId = officialBoundaryIds[0];
        }
      }
      if (officialBoundaryNames.length) {
        record.officialBoundaryNames = officialBoundaryNames;
      }
    });
  }

  async function loadOfficialElkBoundaryFeatures(deps) {
    const { ELK_BOUNDARY_TABLE_SOURCES } = deps;
    for (const candidate of ELK_BOUNDARY_TABLE_SOURCES) {
      try {
        const json = await fetchJson(candidate);
        const features = Array.isArray(json?.features) ? json.features : [];
        if (features.length) {
          console.log(`Loaded ${features.length} official elk boundary rows from ${candidate}`);
          return features;
        }
      } catch (error) {
        console.error(`Failed to load official elk boundary rows from ${candidate}.`, error);
      }
    }
    return [];
  }

  function getBoundaryRecordScore(record, deps) {
    const { getSpeciesDisplay, getNormalizedSex, getUnitName, safe } = deps;
    let score = 0;
    if (getSpeciesDisplay(record) === 'Elk') score += 8;
    if (getNormalizedSex(record) === 'Bull') score += 4;
    if (getUnitName(record) && !/units?/i.test(getUnitName(record))) score += 3;
    if (safe(record.sourceBoundaryName).trim()) score += 2;
    if (safe(record.region).trim()) score += 1;
    return score;
  }

  function getRepresentativeBoundaryRecord(records, deps) {
    const { getBoundaryId, safe } = deps;
    const byBoundary = new Map();
    records.forEach(record => {
      const boundaryId = safe(getBoundaryId(record)).trim();
      if (!boundaryId) return;
      const existing = byBoundary.get(boundaryId);
      const existingScore = existing ? getBoundaryRecordScore(existing, deps) : -1;
      const candidateScore = getBoundaryRecordScore(record, deps);
      if (!existing || candidateScore > existingScore) {
        byBoundary.set(boundaryId, record);
      }
    });
    return byBoundary;
  }

  function buildDerivedSpikeElkRecord(template, boundaryRecord, boundaryId, officialFeature, deps) {
    const { firstNonEmpty, getUnitName, normalizeBoundaryKey, safe, getHuntCode } = deps;
    const attrs = officialFeature?.attributes || {};
    const officialName = firstNonEmpty(
      boundaryRecord && getUnitName(boundaryRecord),
      boundaryRecord && boundaryRecord.sourceBoundaryName,
      attrs.UNIT_NAME,
      attrs.BOUNDARY_LABEL,
      attrs.BOUNDARY_NAME,
      template.sourceBoundaryName,
      template.unitName
    );
    const next = {
      ...template,
      boundaryId: Number(boundaryId),
      sourceBoundaryName: officialName,
      unitName: officialName,
      unitCode: normalizeBoundaryKey(officialName || template.unitCode || getHuntCode(template)),
      boundaryLink: template.boundaryLink || `https://dwrapps.utah.gov/huntboundary/hbstart?HN=${encodeURIComponent(getHuntCode(template))}`,
      derivedFromOfficialElkTable: true
    };
    if (boundaryRecord) {
      next.region = firstNonEmpty(boundaryRecord.region, template.region);
    }
    if (!safe(next.unitName).trim()) {
      next.unitName = safe(template.unitName).trim();
    }
    return next;
  }

  async function loadDerivedSpikeElkRecords(existingRecords, deps) {
    const { SPIKE_ELK_HUNT_CODES, normalizeHuntCode, getHuntCode } = deps;
    const features = await loadOfficialElkBoundaryFeatures(deps);
    if (!features.length) return [];

    const templatesByCode = new Map();
    existingRecords.forEach(record => {
      const code = normalizeHuntCode(getHuntCode(record));
      if (!SPIKE_ELK_HUNT_CODES.has(code)) return;
      if (!templatesByCode.has(code)) templatesByCode.set(code, record);
    });
    if (!templatesByCode.size) return [];

    const boundaryRefs = getRepresentativeBoundaryRecord(existingRecords, deps);
    const derived = [];
    const seen = new Set();
    features.forEach(feature => {
      const attrs = feature?.attributes || {};
      const code = normalizeHuntCode(attrs.HUNT_NUMBER);
      const boundaryId = deps.safe(attrs.BOUNDARYID).trim();
      const template = templatesByCode.get(code);
      if (!template || !boundaryId) return;
      const dedupeKey = `${code}|${boundaryId}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      const boundaryRecord = boundaryRefs.get(boundaryId);
      derived.push(buildDerivedSpikeElkRecord(template, boundaryRecord, boundaryId, feature, deps));
    });
    return derived;
  }

  async function loadHuntDataRecords(deps) {
    const {
      HUNT_DATA_SOURCES,
      getHuntRecordKey,
      updateStatus
    } = deps;

    const merged = [];
    const seenKeys = new Set();
    let authoritativeLoaded = false;
    let loadedPrimaryLabel = '';
    updateStatus('Loading hunt data...');

    for (const source of HUNT_DATA_SOURCES) {
      let sourceLoaded = false;
      for (const candidate of source.candidates) {
        try {
          const json = await fetchJson(candidate);
          const records = Array.isArray(json?.records) ? json.records : (Array.isArray(json) ? json : []);
          if (records.length > 0) {
            let added = 0;
            records.forEach(record => {
              const key = getHuntRecordKey(record);
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                merged.push(record);
                added += 1;
              }
            });
            console.log(`Successfully loaded ${records.length} hunts for ${source.label} from ${candidate} (${added} added after dedupe)`);
            sourceLoaded = true;
            if (!loadedPrimaryLabel) loadedPrimaryLabel = source.label;
            if (source.authoritative) authoritativeLoaded = true;
            break;
          }
        } catch (error) {
          console.error(`Failed to load ${source.label} from ${candidate}.`, error);
        }
      }
      if (sourceLoaded && source.authoritative) {
        break;
      }
    }

    if (!merged.length) {
      throw new Error('Unable to load any hunt data records.');
    }

    if (!authoritativeLoaded) {
      const derivedSpikeRecords = await loadDerivedSpikeElkRecords(merged, deps);
      if (derivedSpikeRecords.length) {
        let added = 0;
        derivedSpikeRecords.forEach(record => {
          const key = getHuntRecordKey(record);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            merged.push(record);
            added += 1;
          }
        });
        console.log(`Derived ${derivedSpikeRecords.length} spike elk records from official elk table (${added} added after dedupe)`);
      }

      await applyOfficialBoundaryMappings(merged, deps);
    } else {
      console.log(`Using authoritative hunt data source: ${loadedPrimaryLabel}`);
    }

    return merged;
  }

  async function loadFirstNormalizedList(candidates, normalizer, emptyValue = []) {
    for (const candidate of candidates) {
      try {
        const json = await fetchJson(candidate);
        const normalized = normalizer(json);
        if (normalized.length) return normalized;
      } catch (error) {
        console.error('Failed to load data from', candidate, error);
      }
    }
    return emptyValue;
  }

  return {
    fetchJson,
    fetchGeoJson,
    fetchFirstGeoJson,
    fetchArcGisPagedGeoJson,
    loadOfficialBoundaryLookup,
    applyOfficialBoundaryMappings,
    loadOfficialElkBoundaryFeatures,
    loadDerivedSpikeElkRecords,
    loadHuntDataRecords,
    loadFirstNormalizedList
  };
})();
