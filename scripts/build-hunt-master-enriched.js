const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\UOGA HUNTS\\HUNT-PLANNER';
const PROCESSED = path.join(ROOT, 'processed_data');
const ROOT_PROCESSED = 'C:\\UOGA HUNTS\\processed_data';

const JOIN_PATH = path.join(PROCESSED, 'hunt_join_2025.csv');
const DRAW_PRESSURE_PATH = path.join(PROCESSED, 'draw_breakdown_2025.csv');
const PUBLIC_PERMITS_PATH = path.join(PROCESSED, 'recommended_permits_2026.csv');
const PROJECTED_BONUS_PATH = path.join(ROOT_PROCESSED, 'projected_bonus_draw_2026.csv');
const HUNT_SUCCESS_PATHS = [
  path.join(PROCESSED, 'hunt_success_2025.csv'),
  path.join(ROOT_PROCESSED, '2025', 'hunt_success_2025.csv'),
  path.join(ROOT_PROCESSED, '2025', 'harvest_2025.csv'),
  path.join(ROOT, 'data', 'uoga_harvest_layers', 'harvest_2025.csv'),
];
const OUTPUT_PATH = path.join(PROCESSED, 'hunt_master_enriched.csv');

function pickFirstExisting(paths) {
  const match = paths.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error(`No source file found in: ${paths.join(', ')}`);
  }
  return match;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const rows = [];
  let current = '';
  const logicalRows = [];

  for (const line of lines) {
    current += (current ? '\n' : '') + line;
    const quoteCount = (current.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      logicalRows.push(current);
      current = '';
    }
  }
  if (current) logicalRows.push(current);

  const headers = parseCsvLine(logicalRows.shift());
  for (const rowText of logicalRows) {
    const values = parseCsvLine(rowText);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line) {
  const values = [];
  let value = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toInt(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function residencyKey(value) {
  return String(value || '').trim().toLowerCase() === 'nonresident' ? 'nonresident' : 'resident';
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const groupKey = String(row[key] || '').trim();
    if (!groupKey) continue;
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(row);
  }
  return grouped;
}

function summarizeDrawPressure(rows) {
  const grouped = groupBy(rows, 'hunt_code');
  const output = new Map();
  for (const [huntCode, group] of grouped.entries()) {
    const summary = {
      draw_pressure_row_count: group.length,
      draw_pressure_resident_rows: 0,
      draw_pressure_nonresident_rows: 0,
      draw_pressure_resident_total_applicants: 0,
      draw_pressure_nonresident_total_applicants: 0,
      draw_pressure_resident_total_permits: 0,
      draw_pressure_nonresident_total_permits: 0,
      draw_pressure_resident_min_point: '',
      draw_pressure_resident_max_point: '',
      draw_pressure_nonresident_min_point: '',
      draw_pressure_nonresident_max_point: '',
    };

    for (const side of ['resident', 'nonresident']) {
      const sideRows = group.filter((row) => residencyKey(row.residency) === side);
      const points = sideRows.map((row) => toInt(row.point_level)).filter((value) => value != null);
      summary[`draw_pressure_${side}_rows`] = sideRows.length;
      summary[`draw_pressure_${side}_total_applicants`] = sideRows.reduce((sum, row) => sum + (toInt(row.applicants) || 0), 0);
      summary[`draw_pressure_${side}_total_permits`] = sideRows.reduce((sum, row) => sum + (toInt(row.total_permits) || 0), 0);
      summary[`draw_pressure_${side}_min_point`] = points.length ? Math.min(...points) : '';
      summary[`draw_pressure_${side}_max_point`] = points.length ? Math.max(...points) : '';
    }

    output.set(huntCode, summary);
  }
  return output;
}

function summarizePublicPermits(rows) {
  const output = new Map();
  for (const row of rows) {
    const huntCode = String(row.hunt_code || '').trim();
    if (!huntCode) continue;
    output.set(huntCode, {
      public_permits_2026_resident: toInt(row.resident_permits) ?? '',
      public_permits_2026_nonresident: toInt(row.nonresident_permits) ?? '',
      public_permits_2026_total: toInt(row.total_permits) ?? '',
      public_permits_2026_source_type: row.source_type || '',
      public_permits_2026_source_authority: row.source_authority_level || '',
      public_permits_2026_source_page: toInt(row.source_page_number) ?? '',
    });
  }
  return output;
}

function summarizeProjectedBonus(rows) {
  const grouped = groupBy(rows, 'hunt_code');
  const output = new Map();
  for (const [huntCode, group] of grouped.entries()) {
    const summary = {
      projected_bonus_row_count: group.length,
      projected_bonus_resident_rows: 0,
      projected_bonus_nonresident_rows: 0,
      projected_bonus_resident_min_point: '',
      projected_bonus_resident_max_point: '',
      projected_bonus_nonresident_min_point: '',
      projected_bonus_nonresident_max_point: '',
      projected_bonus_resident_current_permits: '',
      projected_bonus_nonresident_current_permits: '',
      projected_bonus_resident_max_draw_odds_pct: '',
      projected_bonus_nonresident_max_draw_odds_pct: '',
    };

    for (const side of ['resident', 'nonresident']) {
      const sideRows = group.filter((row) => residencyKey(row.residency) === side);
      const points = sideRows.map((row) => toInt(row.apply_with_points)).filter((value) => value != null);
      const odds = sideRows
        .map((row) => Number.parseFloat(row.projected_total_probability_pct))
        .filter((value) => Number.isFinite(value));
      const currentPermits = sideRows.map((row) => toInt(row.current_recommended_permits)).find((value) => value != null);
      summary[`projected_bonus_${side}_rows`] = sideRows.length;
      summary[`projected_bonus_${side}_min_point`] = points.length ? Math.min(...points) : '';
      summary[`projected_bonus_${side}_max_point`] = points.length ? Math.max(...points) : '';
      summary[`projected_bonus_${side}_current_permits`] = currentPermits ?? '';
      summary[`projected_bonus_${side}_max_draw_odds_pct`] = odds.length ? Math.max(...odds) : '';
    }

    output.set(huntCode, summary);
  }
  return output;
}

function summarizeHuntSuccess(rows) {
  const output = new Map();
  for (const row of rows) {
    const huntCode = String(row.hunt_code || '').trim();
    if (!huntCode) continue;
    output.set(huntCode, {
      hunt_success_2025_hunters: toInt(row.hunters) ?? '',
      hunt_success_2025_harvest: toInt(row.harvest) ?? '',
      hunt_success_2025_percent_success: row.percent_success || '',
      hunt_success_2025_avg_days: row.avg_days || '',
      hunt_success_2025_satisfaction: row.satisfaction || '',
      hunt_success_2025_access_type: row.access_type || '',
    });
  }
  return output;
}

function main() {
  const huntSuccessPath = pickFirstExisting(HUNT_SUCCESS_PATHS);

  const joinRows = parseCsv(fs.readFileSync(JOIN_PATH, 'utf8'));
  const drawPressure = summarizeDrawPressure(parseCsv(fs.readFileSync(DRAW_PRESSURE_PATH, 'utf8')));
  const publicPermits = summarizePublicPermits(parseCsv(fs.readFileSync(PUBLIC_PERMITS_PATH, 'utf8')));
  const projectedBonus = summarizeProjectedBonus(parseCsv(fs.readFileSync(PROJECTED_BONUS_PATH, 'utf8')));
  const huntSuccess = summarizeHuntSuccess(parseCsv(fs.readFileSync(huntSuccessPath, 'utf8')));

  const baseFields = joinRows.length ? Object.keys(joinRows[0]) : [];
  const addedFields = [
    'draw_pressure_row_count',
    'draw_pressure_resident_rows',
    'draw_pressure_nonresident_rows',
    'draw_pressure_resident_total_applicants',
    'draw_pressure_nonresident_total_applicants',
    'draw_pressure_resident_total_permits',
    'draw_pressure_nonresident_total_permits',
    'draw_pressure_resident_min_point',
    'draw_pressure_resident_max_point',
    'draw_pressure_nonresident_min_point',
    'draw_pressure_nonresident_max_point',
    'public_permits_2026_resident',
    'public_permits_2026_nonresident',
    'public_permits_2026_total',
    'public_permits_2026_source_type',
    'public_permits_2026_source_authority',
    'public_permits_2026_source_page',
    'projected_bonus_row_count',
    'projected_bonus_resident_rows',
    'projected_bonus_nonresident_rows',
    'projected_bonus_resident_min_point',
    'projected_bonus_resident_max_point',
    'projected_bonus_nonresident_min_point',
    'projected_bonus_nonresident_max_point',
    'projected_bonus_resident_current_permits',
    'projected_bonus_nonresident_current_permits',
    'projected_bonus_resident_max_draw_odds_pct',
    'projected_bonus_nonresident_max_draw_odds_pct',
    'hunt_success_2025_hunters',
    'hunt_success_2025_harvest',
    'hunt_success_2025_percent_success',
    'hunt_success_2025_avg_days',
    'hunt_success_2025_satisfaction',
    'hunt_success_2025_access_type',
    'gap_missing_draw_pressure_2025',
    'gap_missing_public_permits_2026',
    'gap_missing_projected_bonus_draw_2026',
    'gap_missing_hunt_success_2025',
    'gap_missing_any_child_data',
    'child_gap_count',
    'canonical_base_source',
    'hunt_success_source_file',
  ];

  const fieldnames = [...baseFields, ...addedFields];
  const lines = [fieldnames.map(csvEscape).join(',')];

  for (const baseRow of joinRows) {
    const huntCode = String(baseRow.hunt_code || '').trim();
    const merged = { ...baseRow };
    Object.assign(merged, drawPressure.get(huntCode) || {});
    Object.assign(merged, publicPermits.get(huntCode) || {});
    Object.assign(merged, projectedBonus.get(huntCode) || {});
    Object.assign(merged, huntSuccess.get(huntCode) || {});

    const gapDraw = !drawPressure.has(huntCode);
    const gapPermits = !publicPermits.has(huntCode);
    const gapProjected = !projectedBonus.has(huntCode);
    const gapSuccess = !huntSuccess.has(huntCode);
    const gapCount = [gapDraw, gapPermits, gapProjected, gapSuccess].filter(Boolean).length;

    merged.gap_missing_draw_pressure_2025 = String(gapDraw).toUpperCase();
    merged.gap_missing_public_permits_2026 = String(gapPermits).toUpperCase();
    merged.gap_missing_projected_bonus_draw_2026 = String(gapProjected).toUpperCase();
    merged.gap_missing_hunt_success_2025 = String(gapSuccess).toUpperCase();
    merged.gap_missing_any_child_data = String(gapCount > 0).toUpperCase();
    merged.child_gap_count = gapCount;
    merged.canonical_base_source = JOIN_PATH;
    merged.hunt_success_source_file = huntSuccessPath;

    lines.push(fieldnames.map((field) => csvEscape(merged[field] ?? '')).join(','));
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${joinRows.length} rows to ${OUTPUT_PATH}`);
}

main();
