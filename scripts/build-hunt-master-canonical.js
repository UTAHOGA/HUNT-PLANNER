const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CANONICAL_DIR = path.join(DATA_DIR, 'canonical');

const MASTER_FILE = path.join(DATA_DIR, 'utah-hunt-planner-master-all.json');
const HUNT_BOUNDARIES_FILE = path.join(DATA_DIR, 'hunt_boundaries.geojson');
const CWMU_BOUNDARIES_FILE = path.join(DATA_DIR, 'cwmu-boundaries.geojson');
const ELK_BOUNDARY_2025_FILE = path.join(ROOT, 'Utah_Big_Game_Hunt_Boundaries_2025_elk.geojson');
const ELK_BOUNDARY_2025_DATA_DIR = path.join(DATA_DIR, 'Utah_Big_Game_Hunt_Boundaries_2025_elk');
const DEER_BOUNDARY_2025_GEOJSON_FILE = path.join(ROOT, 'Utah_Big_Game_Hunt_Boundaries deer.geojson');
const DEER_BOUNDARY_2025_SHP_FILE = path.join(DATA_DIR, 'Utah_Big_Game_Hunt_Boundaries_2025_deer', 'BigGameHuntBoundaries_2025.shp');
const ELK_CWMU_WORKBOOK_FILE = path.join(DATA_DIR, 'ELK CWMU.xlsx');
const ANTLERLESS_BOUNDARIES_2025_FILE = path.join(DATA_DIR, 'Utah_Antlerless_Hunt_Boundaries_2025.geojson');
const ANTLERLESS_TABLE_2025_FILE = path.join(DATA_DIR, 'Utah_Antlerless_Hunt_Table_2025.geojson');

const OFFICIAL_TABLE_FILES = [
  'bighorn_sheep_hunt_table_official.json',
  'bison_hunt_table_official.json',
  'black_bear_hunt_table_official.json',
  'cougar_hunt_table_official.json',
  'elk_antlerless_hunt_table_official.json',
  'elk_hunt_table_official.json',
  'moose_hunt_table_official.json',
  'mountain_goat_hunt_table_official.json',
  'pronghorn_hunt_table_official.json',
  'turkey_hunt_table_official.json'
];

const BOUNDARY_NAME_OVERRIDES = {
  DB1503: ['Manti, San Rafael'],
  DB1533: ['Manti, San Rafael'],
  DB1504: ['Nebo'],
  DB1534: ['Nebo'],
  DB1510: ['Monroe'],
  DB1540: ['Monroe'],
  DB1506: ['Fillmore'],
  DB1536: ['Fillmore'],
  EA1220: ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon'],
  EA1221: ['Fishlake/Thousand Lakes', 'Fishlake/Thousand Lakes East', 'Fishlake/Thousand Lakes West'],
  EA1258: ['La Sal Mtns', 'Dolores Triangle', 'La Sal, La Sal Mtns-North'],
  'la-sal-conservation': ['La Sal'],
  'fishlake-conservation': ['Fishlake'],
  'manti-conservation': ['Manti, North', 'Manti, South', 'Manti, West', 'Manti, Central', 'Manti, Mohrland-Stump Flat', 'Manti, Horn Mtn', 'Manti, Gordon Creek-Price Canyon', 'Manti, Ferron Canyon', 'South Manti', 'Manti, Northeast', 'Manti, Northwest', 'Manti, Southeast', 'Manti, Southwest'],
  'cache-conservation': ['Cache'],
  'wasatch-mtns-conservation': ['Wasatch Mtns, West', 'Wasatch Mtns, East', 'Wasatch Mtns, Cascade', 'Wasatch Mtns, Currant Creek', 'Wasatch Mtns, Timpanogos A', 'Wasatch Mtns, Box Elder Peak', 'Wasatch Mtns, Lone Peak', 'Wasatch Mtns, Provo Peak', 'Wasatch Mtns, Alpine'],
  'antelope-island-conservation-expo': ['Antelope Island'],
  'book-cliffs-north-and-south': ['Book Cliffs, North', 'Book Cliffs, South']
};

const SPECIAL_BOUNDARY_ID_OVERRIDES = {
  DB0007: ['454'],
  DB0008: ['280', '803', '851', '852', '853', '855', '101', '106', '109', '218', '282', '283', '311', '312', '313', '731', '9218'],
  DB1056: ['714', '15'],
  DB1075: ['714', '15'],
  DB1076: ['714', '15'],
  DB0001: ['857'],
  DB0002: ['857'],
  DB0003: ['857'],
  DB0004: ['865'],
  DB0005: ['865'],
  DB0006: ['865'],
  DB0010: ['865'],
  DB0011: ['865'],
  DB0012: ['865'],
  DB0013: ['865']
};

const SPECIAL_BOUNDARY_NAME_OVERRIDES = {
  DB0007: ['Statewide'],
  DB0008: [
    'Ogden Extended Archery Area',
    'Cache Laketown Extended Archery',
    'West Mountain Extended Archery Area',
    'Monticello Extended Archery Area',
    'Green River Extended Archery Area',
    'Oquirrh Extended Archery Area',
    'Herriman South Valley Extended Archery Area',
    'South Wasatch Front Extended Archery Area',
    'Utah Lake Extended Archery Area',
    'Uintah Basin Extended Archery Area',
    'Wasatch Front Extended Archery Area',
    'Sanpete Valley Extended Archery Area',
    'West Cache Extended Archery Area'
  ],
  DB1056: ['Book Cliffs, North', 'Book Cliffs, South'],
  DB1075: ['Book Cliffs, North', 'Book Cliffs, South'],
  DB1076: ['Book Cliffs, North', 'Book Cliffs, South'],
  DB0001: ['Southeastern Region-Navajo buck deer'],
  DB0002: ['Southeastern Region-Navajo buck deer'],
  DB0003: ['Southeastern Region-Navajo buck deer'],
  DB0004: ['Navajo Nation SR permit area'],
  DB0005: ['Navajo Nation SR permit area'],
  DB0006: ['Navajo Nation SR permit area'],
  DB0010: ['Southern Paiute Buck Deer (early)'],
  DB0011: ['Southern Paiute Buck Deer'],
  DB0012: ['Southern Paiute Buck Deer'],
  DB0013: ['Southern Paiute Buck Deer (late)']
};

const CWMU_NAME_OVERRIDES = {
  'blind-springs-cwmu': ['Blind Spring'],
  'johnson-mountain-ranch-cwmu': ['Johnson Mtn Ranch'],
  'whites-valley-cwmu': ['Whites Valley'],
  '5s-cwmu': ['5S Land and Livestock'],
  'big-piney-ranch-cwmu': ['Big Piney Mountain Ranch'],
  'cactus-ranch-llc-cwmu': ['Cactus Ranch', 'Cactus Ranch LLC', 'Riverview Ranch LLC']
};

const CWMU_BOUNDARY_ID_OVERRIDES = {
  EB3545: ['517']
};

const EXTERNAL_GEOMETRY_NAME_OVERRIDES = {
  DB0010: { type: 'tribal-boundaries', names: ['Southern Paiute Buck Deer (early)'] },
  DB0011: { type: 'tribal-boundaries', names: ['Southern Paiute Buck Deer'] },
  DB0012: { type: 'tribal-boundaries', names: ['Southern Paiute Buck Deer'] },
  DB0013: { type: 'tribal-boundaries', names: ['Southern Paiute Buck Deer (late)'] },
  EB3545: { type: 'cwmu-boundaries', names: ['Cactus Ranch LLC'] }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function normalizeBoundaryKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeArray(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))];
}

function isStatewideText(...values) {
  return values.some(v => /statewide/i.test(String(v || '')));
}

function getRenderStrategy(row, boundaryIds) {
  const huntType = String(row.huntType || '').toLowerCase();
  const huntCategory = String(row.huntCategory || '').toLowerCase();
  const unitName = String(row.unitName || '').toLowerCase();
  const title = String(row.title || '').toLowerCase();
  if (huntCategory.includes('cwmu') || unitName.includes('cwmu')) return 'cwmu';
  if (huntCategory.includes('private') || huntType.includes('private') || unitName.includes('private land')) return 'private-land-only';
  if (isStatewideText(row.unitName, row.title, row.huntCategory)) return 'statewide';
  if (boundaryIds.length > 1) return 'multi-boundary';
  return 'single-boundary';
}

function getBaseCandidateNames(row) {
  const unitName = String(row.unitName || '').trim();
  const unitCode = String(row.unitCode || '').trim();
  const huntCode = String(row.huntCode || '').trim();
  const stripped = unitName.replace(/\s*\((?:conservation|private lands only|select areas only|expo)\)\s*$/i, '').trim();
  const overrides = BOUNDARY_NAME_OVERRIDES[unitCode] || BOUNDARY_NAME_OVERRIDES[huntCode] || [];
  return safeArray([unitName, stripped, ...overrides]);
}

function buildBoundaryIndexes(boundaryGeoJson) {
  const byNormName = new Map();
  const byId = new Map();
  const features = Array.isArray(boundaryGeoJson.features) ? boundaryGeoJson.features : [];
  for (const feature of features) {
    const name = String(feature?.properties?.Boundary_Name || '').trim();
    const id = String(feature?.properties?.BoundaryID || '').trim();
    if (!name || !id) continue;
    const norm = normalizeBoundaryKey(name);
    const list = byNormName.get(norm) || [];
    list.push({ id, name });
    byNormName.set(norm, list);
    byId.set(id, { id, name });
  }
  return { byNormName, byId, features };
}

function buildCwmuIndexes(cwmuGeoJson) {
  const byNormName = new Map();
  const byId = new Map();
  const features = Array.isArray(cwmuGeoJson?.features) ? cwmuGeoJson.features : [];
  for (const feature of features) {
    const name = String(feature?.properties?.Boundary_Name || '').trim();
    const id = String(feature?.properties?.BoundaryID || '').trim();
    if (!name || !id) continue;
    const norm = normalizeBoundaryKey(name);
    const list = byNormName.get(norm) || [];
    list.push({ id, name });
    byNormName.set(norm, list);
    byId.set(id, { id, name });
  }
  return { byNormName, byId, features };
}

function inferBoundariesFromNames(candidateNames, boundaryIndex) {
  const results = [];
  const seen = new Set();
  const normalizedCandidates = safeArray(candidateNames).map(normalizeBoundaryKey).filter(Boolean);
  for (const candidate of normalizedCandidates) {
    const exact = boundaryIndex.byNormName.get(candidate) || [];
    let candidateMatchedExactly = false;
    for (const match of exact) {
      candidateMatchedExactly = true;
      const key = `${match.id}|${match.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(match);
      }
    }
    if (!candidateMatchedExactly) {
      const broadMatches = [];
      for (const feature of boundaryIndex.features) {
        const name = String(feature?.properties?.Boundary_Name || '').trim();
        const id = String(feature?.properties?.BoundaryID || '').trim();
        const norm = normalizeBoundaryKey(name);
        if (!id || !name) continue;
        if (norm.startsWith(`${candidate}-`) || candidate.startsWith(`${norm}-`)) {
          broadMatches.push({ id, name });
        }
      }
      if (broadMatches.length && broadMatches.length <= 12) {
        for (const match of broadMatches) {
          const key = `${match.id}|${match.name}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push(match);
          }
        }
      }
    }
  }
  return pruneGenericParentMatches(results);
}

function pruneGenericParentMatches(matches) {
  return matches.filter(match => {
    const name = String(match.name || '').trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    const hasMoreSpecificSibling = matches.some(other => {
      if (other === match) return false;
      const otherName = String(other.name || '').trim().toLowerCase();
      if (!otherName) return false;
      return otherName.startsWith(`${lower},`) || otherName.startsWith(`${lower} `) || otherName.startsWith(`${lower}-`);
    });
    return !hasMoreSpecificSibling;
  });
}

function getSpecialBoundaryMatches(row, boundaryIndex) {
  const huntCode = String(row.huntCode || '').trim();
  const ids = SPECIAL_BOUNDARY_ID_OVERRIDES[huntCode] || [];
  const names = SPECIAL_BOUNDARY_NAME_OVERRIDES[huntCode] || [];
  const results = [];
  const seen = new Set();

  for (const id of ids) {
    const match = boundaryIndex.byId.get(String(id));
    if (!match) continue;
    const key = `${match.id}|${match.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(match);
    }
  }

  for (const name of names) {
    const exact = boundaryIndex.byNormName.get(normalizeBoundaryKey(name)) || [];
    for (const match of exact) {
      const key = `${match.id}|${match.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(match);
      }
    }
  }

  return pruneGenericParentMatches(results);
}

function getSpecialCwmuMatches(row, cwmuIndex) {
  const huntCode = String(row.huntCode || '').trim();
  const huntType = String(row.huntType || '').toLowerCase();
  const huntCategory = String(row.huntCategory || '').toLowerCase();
  const unitName = String(row.unitName || '').toLowerCase();
  if (!(huntType.includes('cwmu') || huntCategory.includes('cwmu') || unitName.includes('cwmu'))) {
    return [];
  }

  const results = [];
  const seen = new Set();
  const overrideIds = CWMU_BOUNDARY_ID_OVERRIDES[huntCode] || [];
  for (const id of overrideIds) {
    const match = cwmuIndex.byId.get(String(id));
    if (!match) continue;
    const key = `${match.id}|${match.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(match);
    }
  }

  const candidates = safeArray([
    String(row.unitName || '').replace(/\s*\bCWMU\b\s*$/i, '').trim(),
    ...(CWMU_NAME_OVERRIDES[String(row.unitCode || '').trim()] || [])
  ]);

  for (const candidate of candidates) {
    const exact = cwmuIndex.byNormName.get(normalizeBoundaryKey(candidate)) || [];
    for (const match of exact) {
      const key = `${match.id}|${match.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(match);
      }
    }
  }

  return results;
}

function getNamedExternalGeometryOverride(row) {
  const huntCode = String(row.huntCode || '').trim();
  return EXTERNAL_GEOMETRY_NAME_OVERRIDES[huntCode] || null;
}

function applySiblingBoundaryCoverage(canonicalRows) {
  const byHuntCode = new Map();
  canonicalRows.forEach(row => {
    const key = String(row.huntCode || '').trim();
    if (!key) return;
    const group = byHuntCode.get(key) || [];
    group.push(row);
    byHuntCode.set(key, group);
  });

  byHuntCode.forEach(group => {
    const sharedIds = safeArray(group.flatMap(row => row.boundaryIds || []));
    const sharedNames = safeArray(group.flatMap(row => row.boundaryNames || []));
    if (!sharedIds.length) return;
    group.forEach(row => {
      if ((row.boundaryIds || []).length) return;
      row.boundaryIds = sharedIds;
      row.boundaryId = sharedIds[0] || '';
      row.boundaryNames = sharedNames;
      row.isMultiBoundary = sharedIds.length > 1;
      row.renderStrategy = getRenderStrategy(row, sharedIds);
      if (row.sourceConfidence === 'master-only') {
        row.sourceConfidence = 'sibling-huntcode-inferred';
      }
    });
  });
}

function buildOfficialLookup() {
  const byHuntCode = new Map();
  for (const fileName of OFFICIAL_TABLE_FILES) {
    const filePath = path.join(DATA_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;
    const json = readJson(filePath);
    const features = Array.isArray(json.features) ? json.features : [];
    for (const feature of features) {
      const attrs = feature?.attributes || {};
      const huntCode = String(attrs.HUNT_NUMBER || '').trim();
      const boundaryId = String(attrs.BOUNDARYID || '').trim();
      const boundaryName = String(attrs.BOUNDARY_NAME || '').trim();
      if (!huntCode || (!boundaryId && !boundaryName)) continue;
      const current = byHuntCode.get(huntCode) || { ids: new Set(), names: new Set(), sourceFiles: new Set() };
      if (boundaryId) current.ids.add(boundaryId);
      if (boundaryName) current.names.add(boundaryName);
      current.sourceFiles.add(fileName);
      byHuntCode.set(huntCode, current);
    }
  }

  if (fs.existsSync(ELK_BOUNDARY_2025_FILE)) {
    const elkGeoJson = readJson(ELK_BOUNDARY_2025_FILE);
    const features = Array.isArray(elkGeoJson.features) ? elkGeoJson.features : [];
    for (const feature of features) {
      const props = feature?.properties || {};
      const huntCode = String(props.HUNT_NBR || '').trim();
      const boundaryId = String(props.BOUNDARY_ID || '').trim();
      const boundaryName = String(props.hunt_name || '').trim();
      if (!huntCode || !boundaryId) continue;
      const current = byHuntCode.get(huntCode) || { ids: new Set(), names: new Set(), sourceFiles: new Set() };
      current.ids.add(boundaryId);
      if (boundaryName) current.names.add(boundaryName);
      current.sourceFiles.add(path.basename(ELK_BOUNDARY_2025_FILE));
      byHuntCode.set(huntCode, current);
    }
  }

  if (fs.existsSync(ANTLERLESS_TABLE_2025_FILE)) {
    const antlerlessTable = readJson(ANTLERLESS_TABLE_2025_FILE);
    const antlerlessBoundaryNamesById = new Map();
    if (fs.existsSync(ANTLERLESS_BOUNDARIES_2025_FILE)) {
      const antlerlessBoundaries = readJson(ANTLERLESS_BOUNDARIES_2025_FILE);
      const features = Array.isArray(antlerlessBoundaries.features) ? antlerlessBoundaries.features : [];
      for (const feature of features) {
        const props = feature?.properties || {};
        const boundaryId = String(props.BoundaryID || '').trim();
        const boundaryName = String(props.Boundary_Name || '').trim();
        if (boundaryId && boundaryName && !antlerlessBoundaryNamesById.has(boundaryId)) {
          antlerlessBoundaryNamesById.set(boundaryId, boundaryName);
        }
      }
    }

    const features = Array.isArray(antlerlessTable.features) ? antlerlessTable.features : [];
    for (const feature of features) {
      const props = feature?.properties || {};
      const huntCode = String(props.hunt_num || '').trim();
      const boundaryId = String(props.boundary_id || '').trim();
      const boundaryName = antlerlessBoundaryNamesById.get(boundaryId) || String(props.hunt_name || '').trim();
      if (!huntCode || !boundaryId) continue;
      const current = byHuntCode.get(huntCode) || { ids: new Set(), names: new Set(), sourceFiles: new Set() };
      current.ids.add(boundaryId);
      if (boundaryName) current.names.add(boundaryName);
      current.sourceFiles.add(path.basename(ANTLERLESS_TABLE_2025_FILE));
      if (fs.existsSync(ANTLERLESS_BOUNDARIES_2025_FILE)) {
        current.sourceFiles.add(path.basename(ANTLERLESS_BOUNDARIES_2025_FILE));
      }
      byHuntCode.set(huntCode, current);
    }
  }

  return byHuntCode;
}

function toCanonicalRow(row, officialLookup, boundaryIndex, cwmuIndex) {
  const huntCode = String(row.huntCode || '').trim();
  const official = officialLookup.get(huntCode);
  const sourceFiles = ['utah-hunt-planner-master-all.json'];
  const officialBoundaryIds = official ? Array.from(official.ids) : [];
  const officialBoundaryNames = official ? Array.from(official.names) : [];
  if (official) {
    sourceFiles.push(...official.sourceFiles);
  }

  const candidateNames = getBaseCandidateNames(row);
  const specialMatches = getSpecialBoundaryMatches(row, boundaryIndex);
  const cwmuMatches = getSpecialCwmuMatches(row, cwmuIndex);
  const namedExternalOverride = getNamedExternalGeometryOverride(row);
  const inferredMatches = (!officialBoundaryIds.length && !officialBoundaryNames.length)
    ? inferBoundariesFromNames(candidateNames, boundaryIndex)
    : [];

  const boundaryIds = safeArray([
    row.boundaryId,
    ...specialMatches.map(match => match.id),
    ...officialBoundaryIds,
    ...inferredMatches.map(match => match.id)
  ]);

  const boundaryNames = safeArray([
    ...specialMatches.map(match => match.name),
    ...officialBoundaryNames,
    ...inferredMatches.map(match => match.name),
    ...(boundaryIds.length === 1 && !officialBoundaryNames.length && !inferredMatches.length ? candidateNames.slice(0, 1) : [])
  ]);

  let sourceConfidence = 'master-only';
  if (officialBoundaryIds.length || officialBoundaryNames.length) sourceConfidence = 'official-hunt-table';
  else if (specialMatches.length) sourceConfidence = 'special-case-override';
  else if (inferredMatches.length) sourceConfidence = 'boundary-name-inferred';
  else if (boundaryIds.length) sourceConfidence = 'master-boundary-id';
  else if (namedExternalOverride) sourceConfidence = 'named-external-reference';

  const renderStrategy = getRenderStrategy(row, boundaryIds);
  const geometrySource = boundaryIds.length > 0
    ? 'hunt-boundaries'
    : (cwmuMatches.length > 0
      ? 'cwmu-boundaries'
      : (namedExternalOverride?.type || 'hunt-boundaries'));
  const externalBoundaryIds = cwmuMatches.map(match => match.id);
  const externalBoundaryNames = cwmuMatches.length
    ? cwmuMatches.map(match => match.name)
    : (namedExternalOverride?.names || []);
  const geometryStatus = boundaryIds.length > 0 || externalBoundaryIds.length > 0
    ? 'resolved'
    : (externalBoundaryNames.length > 0 ? 'named-reference-only' : 'unresolved');

  return {
    huntCode,
    year: row.year ?? null,
    species: row.species || '',
    sex: row.sex || '',
    weapon: row.weapon || '',
    huntType: row.huntType || '',
    huntClass: row.huntClass || '',
    huntCategory: row.huntCategory || '',
    title: row.title || '',
    unitName: row.unitName || '',
    unitCode: row.unitCode || '',
    region: row.region || '',
    seasonLabel: row.seasonLabel || '',
    boundaryId: boundaryIds[0] || '',
    boundaryIds,
    boundaryNames,
    officialBoundaryIds,
    officialBoundaryNames,
    externalBoundaryIds,
    externalBoundaryNames,
    isMultiBoundary: boundaryIds.length > 1,
    renderStrategy,
    geometrySource,
    geometryStatus,
    sourceGuide: row.sourceGuide || '',
    sourceFiles: safeArray(sourceFiles),
    sourceConfidence,
    boundaryLink: row.boundaryLink || '',
    originalBoundaryId: row.boundaryId || ''
  };
}

function main() {
  fs.mkdirSync(CANONICAL_DIR, { recursive: true });
  const masterRows = readJson(MASTER_FILE);
  const boundaryGeoJson = readJson(HUNT_BOUNDARIES_FILE);
  const cwmuGeoJson = fs.existsSync(CWMU_BOUNDARIES_FILE) ? readJson(CWMU_BOUNDARIES_FILE) : { type: 'FeatureCollection', features: [] };
  const officialLookup = buildOfficialLookup();
  const boundaryIndex = buildBoundaryIndexes(boundaryGeoJson);
  const cwmuIndex = buildCwmuIndexes(cwmuGeoJson);

  const canonicalRows = masterRows.map(row => toCanonicalRow(row, officialLookup, boundaryIndex, cwmuIndex));
  applySiblingBoundaryCoverage(canonicalRows);

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      'utah-hunt-planner-master-all.json',
      ...OFFICIAL_TABLE_FILES,
      'hunt_boundaries.geojson',
      'cwmu-boundaries.geojson',
      ...(fs.existsSync(ELK_BOUNDARY_2025_FILE) ? [path.basename(ELK_BOUNDARY_2025_FILE)] : []),
      ...(fs.existsSync(path.join(ELK_BOUNDARY_2025_DATA_DIR, 'Elk_MultiUnit_BoundaryIDLookup_2025.dbf')) ? ['data/Utah_Big_Game_Hunt_Boundaries_2025_elk/Elk_MultiUnit_BoundaryIDLookup_2025.dbf'] : []),
      ...(fs.existsSync(DEER_BOUNDARY_2025_GEOJSON_FILE) ? [path.basename(DEER_BOUNDARY_2025_GEOJSON_FILE)] : []),
      ...(fs.existsSync(DEER_BOUNDARY_2025_SHP_FILE) ? ['Utah_Big_Game_Hunt_Boundaries_2025_deer/BigGameHuntBoundaries_2025.shp'] : []),
      ...(fs.existsSync(ELK_CWMU_WORKBOOK_FILE) ? [path.relative(ROOT, ELK_CWMU_WORKBOOK_FILE).replace(/\\/g, '/')] : []),
      ...(fs.existsSync(ANTLERLESS_TABLE_2025_FILE) ? [path.relative(ROOT, ANTLERLESS_TABLE_2025_FILE).replace(/\\/g, '/')] : []),
      ...(fs.existsSync(ANTLERLESS_BOUNDARIES_2025_FILE) ? [path.relative(ROOT, ANTLERLESS_BOUNDARIES_2025_FILE).replace(/\\/g, '/')] : [])
    ],
    sourceAudit: {
      elkBoundary2025GeojsonPresent: fs.existsSync(ELK_BOUNDARY_2025_FILE),
      elkBoundary2025LookupDbfPresent: fs.existsSync(path.join(ELK_BOUNDARY_2025_DATA_DIR, 'Elk_MultiUnit_BoundaryIDLookup_2025.dbf')),
      deerBoundary2025GeojsonPresent: fs.existsSync(DEER_BOUNDARY_2025_GEOJSON_FILE),
      deerBoundary2025ShapefilePresent: fs.existsSync(DEER_BOUNDARY_2025_SHP_FILE),
      elkCwmuWorkbookPresent: fs.existsSync(ELK_CWMU_WORKBOOK_FILE),
      antlerlessTable2025GeojsonPresent: fs.existsSync(ANTLERLESS_TABLE_2025_FILE),
      antlerlessBoundaries2025GeojsonPresent: fs.existsSync(ANTLERLESS_BOUNDARIES_2025_FILE)
    },
    totalRows: canonicalRows.length,
    rowsWithBoundaryIds: canonicalRows.filter(r => r.boundaryIds.length > 0).length,
    rowsWithExternalGeometryIds: canonicalRows.filter(r => Array.isArray(r.externalBoundaryIds) && r.externalBoundaryIds.length > 0).length,
    rowsWithNamedExternalGeometryOnly: canonicalRows.filter(r => (!r.boundaryIds.length) && (!r.externalBoundaryIds.length) && Array.isArray(r.externalBoundaryNames) && r.externalBoundaryNames.length > 0).length,
    rowsWithMultipleBoundaryIds: canonicalRows.filter(r => r.boundaryIds.length > 1).length,
    rowsUsingOfficialLookup: canonicalRows.filter(r => r.sourceConfidence === 'official-hunt-table').length,
    rowsUsingSpecialOverrides: canonicalRows.filter(r => r.sourceConfidence === 'special-case-override').length,
    rowsUsingNamedExternalReferences: canonicalRows.filter(r => r.sourceConfidence === 'named-external-reference').length,
    rowsUsingSiblingInference: canonicalRows.filter(r => r.sourceConfidence === 'sibling-huntcode-inferred').length,
    rowsUsingInferredBoundaryNames: canonicalRows.filter(r => r.sourceConfidence === 'boundary-name-inferred').length,
    rowsStillWithoutBoundaryIds: canonicalRows.filter(r => r.boundaryIds.length === 0).length,
    rowsStillWithoutAnyGeometryIds: canonicalRows.filter(r => r.boundaryIds.length === 0 && (!Array.isArray(r.externalBoundaryIds) || r.externalBoundaryIds.length === 0)).length
  };

  writeJson(path.join(CANONICAL_DIR, 'hunt-master-canonical.json'), canonicalRows);
  writeJson(path.join(CANONICAL_DIR, 'hunt-master-canonical-summary.json'), summary);

  console.log(JSON.stringify(summary, null, 2));
}

main();
