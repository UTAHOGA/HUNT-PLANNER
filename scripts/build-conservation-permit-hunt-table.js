const fs = require('fs');

const sourcePath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/2025-27_conservation_permits.csv';
const registerPath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/conservation-permit-areas.json';
const canonicalHuntPath = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/hunt-master-canonical.json';
const outBase = 'C:/DOWNLOADS/test website/HUNT-PLANNER/data/conservation-permit-hunt-table-2025-27';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (ch !== '\r') {
      cur += ch;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function moneyToNumber(value) {
  const cleaned = String(value || '').replace(/[$,]/g, '').trim();
  return cleaned ? Number(cleaned) : null;
}

function normalizeSpecies(raw) {
  const value = String(raw || '').trim();
  if (value === 'Antlerless Elk') return { species: 'Elk', sex: 'Antlerless' };
  if (value === 'Elk') return { species: 'Elk', sex: 'Bull' };
  if (value === 'Deer') return { species: 'Deer', sex: 'Buck' };
  if (value === 'Bear') return { species: 'Black Bear', sex: '' };
  if (value === 'Turkey') return { species: 'Turkey', sex: 'Bearded' };
  return { species: value, sex: '' };
}

function deriveSex(rawSpecies, condition, area) {
  const base = normalizeSpecies(rawSpecies).sex;
  const lowerCondition = String(condition || '').toLowerCase();
  const lowerArea = String(area || '').toLowerCase();
  if (rawSpecies === 'Bison') {
    if (lowerCondition.includes('cow only')) return 'Cow';
    if (lowerCondition.includes("hunter's choice")) return "Hunter's Choice";
  }
  if (rawSpecies === 'Moose') return 'Bull';
  if (rawSpecies === 'Mountain Goat') return "Hunter's Choice";
  if (rawSpecies === 'Pronghorn') return 'Buck';
  if (rawSpecies === 'Desert Bighorn Sheep' || rawSpecies === 'Rocky Mountain Bighorn Sheep') return 'Ram';
  if (rawSpecies === 'Black Bear' || rawSpecies === 'Bear') return 'Either Sex';
  if (lowerArea.includes('statewide') && !base) return '';
  return base;
}

function deriveWeapon(condition) {
  const text = String(condition || '').trim();
  const lower = text.toLowerCase();
  if (!text) return 'Any Legal Weapon';
  if (lower.includes("hunter's choice")) return "Hunter's Choice";
  if (lower.includes('archery')) return 'Archery';
  if (lower.includes('muzzle')) return 'Muzzleloader';
  if (lower.includes('multiseason')) return 'Multiseason';
  if (lower.includes('any legal weapon')) return 'Any Legal Weapon';
  return text;
}

function canonicalSpeciesNames(species) {
  if (species === 'Deer') return ['Mule Deer', 'Deer'];
  if (species === 'Black Bear') return ['Black Bear', 'Bear'];
  if (species === 'Bighorn Sheep') return ['Bighorn Sheep', 'Desert Bighorn Sheep', 'Rocky Mountain Bighorn Sheep'];
  if (species === 'Desert Bighorn Sheep' || species === 'Rocky Mountain Bighorn Sheep') return ['Bighorn Sheep'];
  return [species];
}

function areaAliases(area) {
  const source = String(area || '').trim();
  const aliases = new Set([source]);
  if (!source) return [];
  aliases.add(source.replace(/\s*\((early|late)\)\s*/gi, '').trim());
  aliases.add(source.replace(/\s*\(([^)]+)\)\s*/g, '').trim());
  aliases.add(source.replace(/\//g, ', '));
  aliases.add(source.replace(/,\s*/g, '/'));
  aliases.add(source.replace(/\s+Bull Elk$/i, ''));
  aliases.add(source.replace(/\s+Hunter'?s Choice/gi, '').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim());
  return [...aliases].map(v => v.trim()).filter(Boolean);
}

function getBoundaryIds(record) {
  return [...new Set([
    ...(Array.isArray(record?.boundaryIds) ? record.boundaryIds : []),
    ...(Array.isArray(record?.officialBoundaryIds) ? record.officialBoundaryIds : [])
  ].map(v => String(v || '').trim()).filter(Boolean))];
}

function buildCanonicalAreaIndex(records) {
  const index = new Map();
  for (const record of records) {
    const boundaryIds = getBoundaryIds(record);
    if (!boundaryIds.length) continue;
    const speciesNames = canonicalSpeciesNames(String(record.species || '').trim());
    const names = [
      record.unitName,
      record.unitCode,
      ...(Array.isArray(record.boundaryNames) ? record.boundaryNames : []),
      ...(Array.isArray(record.officialBoundaryNames) ? record.officialBoundaryNames : [])
    ].map(v => String(v || '').trim()).filter(Boolean);
    for (const species of speciesNames) {
      for (const name of names) {
        const key = `${species}::${slug(name)}`;
        if (!index.has(key)) {
          index.set(key, { boundaryIds: new Set(), huntCodes: new Set(), unitNames: new Set() });
        }
        const bucket = index.get(key);
        boundaryIds.forEach(id => bucket.boundaryIds.add(id));
        if (record.huntCode) bucket.huntCodes.add(String(record.huntCode).trim());
        if (record.unitName) bucket.unitNames.add(String(record.unitName).trim());
      }
    }
  }
  return index;
}

function buildCanonicalHuntCodeIndex(records) {
  const index = new Map();
  for (const record of records) {
    const huntCode = String(record.huntCode || '').trim();
    const boundaryIds = getBoundaryIds(record);
    if (!huntCode || !boundaryIds.length) continue;
    if (!index.has(huntCode)) {
      index.set(huntCode, { boundaryIds: new Set(), huntCodes: new Set(), unitNames: new Set() });
    }
    const bucket = index.get(huntCode);
    boundaryIds.forEach(id => bucket.boundaryIds.add(id));
    bucket.huntCodes.add(huntCode);
    if (record.unitName) bucket.unitNames.add(String(record.unitName).trim());
  }
  return index;
}

function buildExactUnitBoundaryIndex(records) {
  const index = new Map();
  for (const record of records) {
    const species = String(record.species || '').trim();
    const sex = String(record.sex || '').trim();
    const unitName = String(record.unitName || '').trim();
    const huntType = String(record.huntType || '').trim();
    const boundaryIds = getBoundaryIds(record);
    if (!species || !sex || !unitName || !boundaryIds.length) continue;
    if (!/limited entry/i.test(huntType)) continue;
    const key = `${species}::${sex}::${slug(unitName)}`;
    if (!index.has(key)) {
      index.set(key, { boundaryIds: new Set(), huntCodes: new Set(), unitNames: new Set() });
    }
    const bucket = index.get(key);
    boundaryIds.forEach(id => bucket.boundaryIds.add(id));
    if (record.huntCode) bucket.huntCodes.add(String(record.huntCode).trim());
    bucket.unitNames.add(unitName);
  }
  return index;
}

function matchRegister(register, species, sex, area) {
  const areaKeys = areaAliases(area).map(slug);
  return register.find(entry => {
    const entrySpecies = String(entry.species || '').trim();
    if (entrySpecies !== species) return false;
    const entrySex = String(entry.sex || '').trim();
    if (sex && entrySex && entrySex !== sex) return false;
    const names = [entry.label, ...(entry.unitNames || []), ...(entry.unitCodes || [])].map(slug);
    return areaKeys.some(areaKey =>
      names.includes(areaKey) ||
      names.some(name => name.includes(areaKey) || areaKey.includes(name))
    );
  }) || null;
}

function matchCanonical(index, species, area) {
  for (const alias of areaAliases(area)) {
    const direct = index.get(`${species}::${slug(alias)}`);
    if (direct) {
      return {
        boundaryIds: [...direct.boundaryIds].sort(),
        huntCodes: [...direct.huntCodes].sort(),
        unitNames: [...direct.unitNames].sort()
      };
    }
  }

  const tokens = slug(area).split('-').filter(token =>
    token && !['and', 'the', 'only', 'early', 'late', 'choice', 'hunter', 's'].includes(token)
  );
  if (!tokens.length) return null;

  let best = null;
  for (const [key, value] of index.entries()) {
    if (!key.startsWith(`${species}::`)) continue;
    const nameSlug = key.split('::')[1];
    const hitCount = tokens.filter(token => nameSlug.includes(token)).length;
    if (hitCount < Math.max(2, Math.ceil(tokens.length * 0.6))) continue;
    if (!best || hitCount > best.hitCount || (hitCount === best.hitCount && value.boundaryIds.size > best.value.boundaryIds.size)) {
      best = { hitCount, value };
    }
  }

  if (!best) return null;
  return {
    boundaryIds: [...best.value.boundaryIds].sort(),
    huntCodes: [...best.value.huntCodes].sort(),
    unitNames: [...best.value.unitNames].sort()
  };
}

function resolveRegisterGeometry(registerMatch, huntCodeIndex) {
  if (!registerMatch) return null;
  const directBoundaryIds = (Array.isArray(registerMatch.boundaryIds) ? registerMatch.boundaryIds : [])
    .map(v => String(v || '').trim())
    .filter(Boolean);
  if (directBoundaryIds.length) {
    return {
      boundaryIds: [...new Set(directBoundaryIds)].sort(),
      huntCodes: [...new Set((registerMatch.huntCodes || []).map(v => String(v || '').trim()).filter(Boolean))].sort(),
      unitNames: [...new Set((registerMatch.unitNames || []).map(v => String(v || '').trim()).filter(Boolean))].sort()
    };
  }

  const bucket = { boundaryIds: new Set(), huntCodes: new Set(), unitNames: new Set() };
  for (const huntCode of Array.isArray(registerMatch.huntCodes) ? registerMatch.huntCodes : []) {
    const match = huntCodeIndex.get(String(huntCode || '').trim());
    if (!match) continue;
    match.boundaryIds.forEach(id => bucket.boundaryIds.add(id));
    match.huntCodes.forEach(code => bucket.huntCodes.add(code));
    match.unitNames.forEach(name => bucket.unitNames.add(name));
  }
  if (!bucket.boundaryIds.size) return null;
  return {
    boundaryIds: [...bucket.boundaryIds].sort(),
    huntCodes: [...bucket.huntCodes].sort(),
    unitNames: [...bucket.unitNames].sort()
  };
}

function build() {
  const csvText = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(csvText).slice(1).filter(row => row[1] && row[1] !== 'Species');
  const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
  const canonicalHunts = JSON.parse(fs.readFileSync(canonicalHuntPath, 'utf8'));
  const canonicalIndex = buildCanonicalAreaIndex(canonicalHunts);
  const canonicalHuntCodeIndex = buildCanonicalHuntCodeIndex(canonicalHunts);
  const exactUnitBoundaryIndex = buildExactUnitBoundaryIndex(canonicalHunts);
  const groups = new Map();

  for (const row of rows) {
    const no = row[0];
    const rawSpecies = row[1];
    const area = row[2];
    const condition = row[3];
    const value = row[4];
    const organization = row[6];
    const sex = deriveSex(rawSpecies, condition, area);
    const weapon = deriveWeapon(condition);
    const huntClass = String(organization || '').trim() || 'Conservation';
    const key = [rawSpecies, sex, area, huntClass, weapon].join(' | ');

    if (!groups.has(key)) {
      const normalized = normalizeSpecies(rawSpecies);
      groups.set(key, {
        sourceRowStart: Number(no),
        sourceSpecies: rawSpecies,
        species: normalized.species,
        sex,
        area,
        weapon,
        conditions: new Set(),
        huntType: 'Conservation',
        huntClass,
        permitCount: 0,
        values: [],
        organizations: new Set(),
        sourceRowNumbers: [],
        huntCode: `CP-${slug(normalized.species)}-${slug(area)}-${slug(sex)}-${slug(weapon)}`.toUpperCase(),
        unitCode: slug(area)
      });
    }

    const group = groups.get(key);
    group.permitCount += 1;
    if (condition) group.conditions.add(condition);
    const numericValue = moneyToNumber(value);
    if (numericValue !== null && !Number.isNaN(numericValue)) group.values.push(numericValue);
    if (organization) group.organizations.add(organization);
    if (no) group.sourceRowNumbers.push(String(no));
  }

  const table = [...groups.values()].map(group => {
    const exactLeKey = `${group.species}::${group.sex}::${slug(group.area)}`;
    const exactLeMatch = exactUnitBoundaryIndex.get(exactLeKey);
    const registerMatch = matchRegister(register, group.species, group.sex, group.area);
    const registerGeometry = resolveRegisterGeometry(registerMatch, canonicalHuntCodeIndex);
    const canonicalMatch = exactLeMatch || registerGeometry ? null : matchCanonical(canonicalIndex, group.species, group.area);
    const averageValue = group.values.length
      ? group.values.reduce((sum, value) => sum + value, 0) / group.values.length
      : null;
    return {
      huntCode: group.huntCode,
      species: group.species,
      sex: group.sex,
      huntType: group.huntType,
      huntClass: group.huntClass,
      area: group.area,
      unitCode: group.unitCode,
      unitNames: exactLeMatch ? [...exactLeMatch.unitNames].sort() : (registerGeometry?.unitNames || registerMatch?.unitNames || canonicalMatch?.unitNames || [group.area]),
      weapon: group.weapon,
      conditions: [...group.conditions].sort(),
      permitCount: group.permitCount,
      organizations: [...group.organizations].sort(),
      averageValue,
      sourceSpecies: group.sourceSpecies,
      sourceRowStart: group.sourceRowStart,
      sourceRowNumbers: group.sourceRowNumbers,
      matchedPermitRegister: !!registerMatch,
      matchedRegisterLabel: registerMatch?.label || '',
      matchedCanonicalHunts: !!exactLeMatch || (!registerMatch && !!canonicalMatch),
      boundaryIds: exactLeMatch ? [...exactLeMatch.boundaryIds].sort() : (registerGeometry?.boundaryIds || canonicalMatch?.boundaryIds || []),
      sourceHuntCodes: exactLeMatch ? [...exactLeMatch.huntCodes].sort() : (registerGeometry?.huntCodes || canonicalMatch?.huntCodes || registerMatch?.huntCodes || [])
    };
  }).sort((a, b) =>
    a.species.localeCompare(b.species) ||
    a.area.localeCompare(b.area) ||
    a.weapon.localeCompare(b.weapon)
  );

  const headers = [
    'huntCode', 'species', 'sex', 'huntType', 'huntClass', 'area', 'unitCode', 'unitNames',
    'weapon', 'conditions', 'permitCount', 'organizations', 'averageValue', 'sourceSpecies',
    'sourceRowStart', 'sourceRowNumbers', 'matchedPermitRegister', 'matchedRegisterLabel', 'matchedCanonicalHunts',
    'boundaryIds', 'sourceHuntCodes'
  ];

  fs.writeFileSync(`${outBase}.json`, JSON.stringify(table, null, 2) + '\n');

  const csv = [
    headers.join(','),
    ...table.map(row => headers.map(header => {
      const value = Array.isArray(row[header]) ? row[header].join(' | ') : row[header];
      return csvEscape(value);
    }).join(','))
  ].join('\n');
  fs.writeFileSync(`${outBase}.csv`, csv);

  const summary = {
    sourceRows: rows.length,
    uniqueHuntRows: table.length,
    matchedPermitRegisterRows: table.filter(row => row.matchedPermitRegister).length,
    bySpecies: Object.fromEntries(
      Object.entries(table.reduce((acc, row) => {
        acc[row.species] = (acc[row.species] || 0) + 1;
        return acc;
      }, {})).sort()
    )
  };
  fs.writeFileSync(`${outBase}-summary.json`, JSON.stringify(summary, null, 2) + '\n');

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Conservation Permit Hunt Table 2025-27</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ccc;padding:6px;vertical-align:top}th{background:#f3f3f3;position:sticky;top:0}</style></head><body><h1>Conservation Permit Hunt Table 2025-27</h1><pre>${JSON.stringify(summary, null, 2)}</pre><table><thead><tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr></thead><tbody>${table.map(row => `<tr>${headers.map(header => {
    const value = Array.isArray(row[header]) ? row[header].join(' | ') : row[header] ?? '';
    return `<td>${String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  fs.writeFileSync(`${outBase}.html`, html);

  console.log(JSON.stringify(summary, null, 2));
}

build();
