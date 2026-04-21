const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'processed_data', 'hunt_research_2026.json');
const OUTPUT_CSV = path.join(ROOT, 'processed_data', 'hunt_research_2026_coverage_audit.csv');
const OUTPUT_JSON = path.join(ROOT, 'processed_data', 'hunt_research_2026_coverage_summary.json');

function loadBundle(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.hunts)) return raw.hunts;
  throw new Error(`Unsupported bundle shape in ${filePath}`);
}

function hasRows(block) {
  if (!block || typeof block !== 'object') return false;
  const resident = Array.isArray(block.resident) ? block.resident.length : 0;
  const nonresident = Array.isArray(block.nonresident) ? block.nonresident.length : 0;
  return resident > 0 || nonresident > 0;
}

function csvValue(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function statusForHunt(hunt) {
  const drawFamily = String(hunt.draw_family || '').trim().toLowerCase() || 'none';
  const hasRecommendedPermits = Boolean(hunt.recommended_permits);
  const hasBonusDrawRows = hasRows(hunt.bonus_draw);
  const hasAntlerlessDrawRows = hasRows(hunt.antlerless_draw);
  const hasProjectedBonusRows = hasRows(hunt.projected_bonus_draw);
  const hasScores = [
    hunt.draw_family,
    hunt.resident_point_signal,
    hunt.nonresident_point_signal,
    hunt.harvest_success_score,
    hunt.harvest_pressure_score,
    hunt.harvest_efficiency_score
  ].some((value) => value !== null && value !== undefined && value !== '');
  const hasOutfitterCounts = [hunt.verified_outfitter_count, hunt.cpo_outfitter_count]
    .some((value) => value !== null && value !== undefined && value !== '');
  const hasMasterRecord = [hunt.dwr_unit_name, hunt.dwr_boundary_link, hunt.dwr_source_guide]
    .some((value) => String(value || '').trim().length > 0);

  const reasons = [];
  let status = 'complete';

  if (drawFamily === 'bonus_draw') {
    if (!hasRecommendedPermits) reasons.push('missing_recommended_permits');
    if (!hasBonusDrawRows) reasons.push('missing_2025_bonus_rows');
    if (!hasProjectedBonusRows) reasons.push('missing_2026_projected_bonus_rows');
    if (hunt.has_bonus_draw && !hasBonusDrawRows) reasons.push('join_flag_says_bonus_rows_should_exist');
  } else if (drawFamily === 'preference_draw') {
    if (!hasRecommendedPermits) reasons.push('missing_recommended_permits');
    if (!hasAntlerlessDrawRows) reasons.push('missing_2025_preference_rows');
    if (hunt.has_antlerless_draw && !hasAntlerlessDrawRows) reasons.push('join_flag_says_preference_rows_should_exist');
  } else {
    if (!hasRecommendedPermits) reasons.push('missing_recommended_permits');
  }

  if (!hasMasterRecord) reasons.push('missing_master_record');
  if (!hasScores) reasons.push('missing_score_context');

  if (reasons.length) {
    const flaggedJoinProblem = reasons.some((reason) => reason.startsWith('join_flag_'));
    if (flaggedJoinProblem) {
      status = 'broken_join';
    } else if (drawFamily === 'none') {
      status = 'context_only';
    } else if (reasons.every((reason) => ['missing_score_context', 'missing_master_record'].includes(reason))) {
      status = 'complete';
    } else {
      status = 'missing_rows';
    }
  }

  return {
    hunt_code: String(hunt.hunt_code || '').trim(),
    hunt_name: String(hunt.hunt_name || '').trim(),
    draw_family: drawFamily,
    has_recommended_permits: hasRecommendedPermits,
    has_bonus_draw_rows: hasBonusDrawRows,
    has_antlerless_draw_rows: hasAntlerlessDrawRows,
    has_projected_bonus_rows: hasProjectedBonusRows,
    has_scores: hasScores,
    has_outfitter_counts: hasOutfitterCounts,
    has_master_record: hasMasterRecord,
    status,
    missing_reason: reasons.join('|')
  };
}

function main() {
  const hunts = loadBundle(INPUT_PATH);
  const auditRows = hunts.map(statusForHunt).sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return a.hunt_code.localeCompare(b.hunt_code);
  });

  const header = [
    'hunt_code',
    'hunt_name',
    'draw_family',
    'has_recommended_permits',
    'has_bonus_draw_rows',
    'has_antlerless_draw_rows',
    'has_projected_bonus_rows',
    'has_scores',
    'has_outfitter_counts',
    'has_master_record',
    'status',
    'missing_reason'
  ];

  const csv = [
    header.join(','),
    ...auditRows.map((row) => header.map((key) => csvValue(row[key])).join(','))
  ].join('\n');

  fs.writeFileSync(OUTPUT_CSV, csv, 'utf8');

  const summary = {
    generated_at: new Date().toISOString(),
    input_path: INPUT_PATH,
    total_hunts: auditRows.length,
    status_counts: auditRows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {}),
    missing_reason_counts: auditRows.reduce((acc, row) => {
      const reasons = row.missing_reason ? row.missing_reason.split('|') : [];
      reasons.forEach((reason) => {
        if (!reason) return;
        acc[reason] = (acc[reason] || 0) + 1;
      });
      return acc;
    }, {}),
    files: {
      csv: OUTPUT_CSV,
      json: OUTPUT_JSON
    }
  };

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`Wrote coverage audit CSV: ${OUTPUT_CSV}`);
  console.log(`Wrote coverage summary JSON: ${OUTPUT_JSON}`);
  console.log(JSON.stringify(summary.status_counts, null, 2));
}

main();
