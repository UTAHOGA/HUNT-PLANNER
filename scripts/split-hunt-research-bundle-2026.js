const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\DOWNLOADS\\test website\\HUNT-PLANNER';
const INPUT_PATH = path.join(ROOT, 'processed_data', 'hunt_research_2026.json');
const OUTPUT_DIR = path.join(ROOT, 'processed_data', 'hunt_research_2026_split');
const DETAIL_DIR = path.join(OUTPUT_DIR, 'hunts');
const UPLOAD_DIR = path.join(ROOT, 'cloudflare-upload', 'hunt_research_2026_split');
const UPLOAD_DETAIL_DIR = path.join(UPLOAD_DIR, 'hunts');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function compactProjectionRows(rows) {
  return (rows || []).map((row) => ({
    apply_with_points: row.apply_with_points ?? null,
    projected_total_probability_pct: row.projected_total_probability_pct ?? null,
    projected_guaranteed_probability_pct: row.projected_guaranteed_probability_pct ?? null,
    projected_random_probability_pct: row.projected_random_probability_pct ?? null,
    projected_cutoff_point: row.projected_cutoff_point ?? null,
    is_guaranteed_draw: row.is_guaranteed_draw ?? false,
    is_cutoff_tier: row.is_cutoff_tier ?? false,
  }));
}

function compactPreferenceRows(rows) {
  return (rows || []).map((row) => ({
    point_level: row.point_level ?? null,
    success_ratio_text: row.success_ratio_text ?? '',
    permits_awarded: row.permits_awarded ?? null,
    applicants: row.applicants ?? null,
  }));
}

function buildIndexRow(hunt) {
  return {
    hunt_code: hunt.hunt_code,
    species: hunt.species,
    hunt_name: hunt.hunt_name,
    hunt_type: hunt.hunt_type,
    weapon: hunt.weapon,
    sex_type: hunt.sex_type,
    access_type: hunt.access_type,
    permits_total: hunt.permits_total,
    hunters: hunt.hunters,
    harvest: hunt.harvest,
    percent_success: hunt.percent_success,
    avg_days: hunt.avg_days,
    satisfaction: hunt.satisfaction,
    has_harvest: hunt.has_harvest,
    has_bonus_draw: hunt.has_bonus_draw,
    has_antlerless_draw: hunt.has_antlerless_draw,
    draw_family: hunt.draw_family,
    draw_presence_flag: hunt.draw_presence_flag,
    score_family: hunt.score_family,
    public_rank_eligible: hunt.public_rank_eligible,
    draw_difficulty_flag: hunt.draw_difficulty_flag,
    resident_point_signal: hunt.resident_point_signal,
    nonresident_point_signal: hunt.nonresident_point_signal,
    harvest_success_score: hunt.harvest_success_score,
    harvest_pressure_score: hunt.harvest_pressure_score,
    harvest_efficiency_score: hunt.harvest_efficiency_score,
    scoring_notes: hunt.scoring_notes,
    draw_access_score: hunt.draw_access_score,
    verified_outfitter_count: hunt.verified_outfitter_count,
    cpo_outfitter_count: hunt.cpo_outfitter_count,
    dwr_boundary_link: hunt.dwr_boundary_link,
    dwr_source_guide: hunt.dwr_source_guide,
    dwr_unit_name: hunt.dwr_unit_name,
    recommended_permits: hunt.recommended_permits ?? null,
    detail_path: `./processed_data/hunt_research_2026_split/hunts/${hunt.hunt_code}.json`,
    projected_bonus_draw_summary: hunt.projected_bonus_draw ? {
      resident: compactProjectionRows(hunt.projected_bonus_draw.resident),
      nonresident: compactProjectionRows(hunt.projected_bonus_draw.nonresident),
    } : null,
    antlerless_draw_summary: hunt.antlerless_draw ? {
      resident: compactPreferenceRows(hunt.antlerless_draw.resident),
      nonresident: compactPreferenceRows(hunt.antlerless_draw.nonresident),
    } : null,
  };
}

const hunts = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));

ensureDir(DETAIL_DIR);
ensureDir(UPLOAD_DETAIL_DIR);

const indexRows = [];

for (const hunt of hunts) {
  if (!hunt || !hunt.hunt_code) continue;
  indexRows.push(buildIndexRow(hunt));
  writeJson(path.join(DETAIL_DIR, `${hunt.hunt_code}.json`), hunt);
  writeJson(path.join(UPLOAD_DETAIL_DIR, `${hunt.hunt_code}.json`), hunt);
}

const manifest = {
  count: indexRows.length,
  index_file: 'hunt_research_2026.index.json',
  detail_dir: 'hunts',
  notes: 'Index contains lightweight metadata plus matrix-facing summary ladders. Full ladders and projections live in per-hunt detail files.',
};

const summary = {
  count: indexRows.length,
  index_bytes: Buffer.byteLength(JSON.stringify(indexRows)),
  detail_files: indexRows.length,
};

writeJson(path.join(OUTPUT_DIR, 'hunt_research_2026.index.json'), indexRows);
writeJson(path.join(OUTPUT_DIR, 'manifest.json'), manifest);
writeJson(path.join(OUTPUT_DIR, 'split-summary.json'), summary);
writeJson(path.join(UPLOAD_DIR, 'hunt_research_2026.index.json'), indexRows);
writeJson(path.join(UPLOAD_DIR, 'manifest.json'), manifest);
