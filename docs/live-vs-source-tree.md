# Live vs Source Tree

This file separates what belongs in the published Hunt Planner site from what belongs in source/input storage.

## Live site root
These files power the published website and should stay at the root of the site repo.

- `index.html`
- `hunt-research.html`
- `vetting.html`
- `hard-copy.html`
- `app.js`
- `config.js`
- `data.js`
- `hunt-research.js`
- `ui.js`
- `server.js`
- `style.css`
- `manifest.json`
- `.nojekyll`
- `favicon.ico`

## Live planner data
These files feed the planner page and should stay in the site repo under `data/`.

- `data/hunt-master-canonical.json`
- `data/utah-hunt-planner-master-all.json`
- `data/hunt_boundaries.geojson`
- `data/hunt-boundaries-lite.geojson`
- `data/hunt_boundaries_arcgis.json`
- `data/cwmu-boundaries.geojson`
- `data/dwr-GetCWMUBoundaries.json`
- `data/outfitters-public.json`
- `data/outfitters.json`
- `data/outfitter-federal-unit-coverage-review.json`
- official hunt table JSON files under `data/`

## Live research data
These are the engine and delivery files the Hunt Research page uses.

- `processed_data/hunt_research_2026.json`
- `processed_data/draw_reality_engine.csv`
- `processed_data/draw_reality_view.csv`
- `processed_data/point_ladder_view.csv`
- `processed_data/hunt_master_enriched.csv`
- `processed_data/hunt_unit_reference_linked.csv`
- `processed_data/recommended_permits_2026.csv`
- `processed_data/projected_bonus_draw_2026.csv`
- `processed_data/projected_bonus_draw_2026_simulated.csv`
- `processed_data/hunt_database_2026.csv`
- `processed_data/hunt_database_2026.xlsx`
- `processed_data/hunt_database_foundation_dwr_aligned.sqlite`
- `processed_data/hunt_join_2025.csv`
- `processed_data/draw_breakdown_2025.csv`
- `processed_data/antlerless_draw_2025.csv`
- `processed_data/harvest_2025.csv`
- `processed_data/hunt_scores_2025.csv`
- `processed_data/hunt_with_outfitters_2025.csv`
- `processed_data/hunt_research_2026_split/` as optional packaging only

## Source-only folders
These are inputs and should not be mixed into the published site root.

- `raw_data_2023/`
- `raw_data_2024/`
- `raw_data_2025/`
- `raw_data_2026/`

## Raw year folders
Each raw year folder is a source workspace, not a live site folder.

### 2023
- `Draw Odds Data/`
- `Harvest Data/`
- `hunt_local_data_bundle/`
- `hunt-platform-starter/`
- `processed_data/`
- `scripts/`
- `uoga_2023_current_working_master/`
- `uoga_2023_working_database/`

### 2024
- `Draw Odds/`
- `Harvest/`

### 2025
- `Draw Odds/`
- `Harvest/`

### 2026
- `2026 hunt files/`
- `Draw Odds/`
- `Harvest/`

## Archive / legacy
These should stay out of the live site path unless they are explicitly promoted.

- `ARCHIVE/`
- `HUNT-PLANNER\_archive_root/`
- `HUNT-PLANNER\data\_archive_files/`
- `uoga_project_backup/`
- old scratch or duplicate downloads under `DOWNLOADS/`

## Rule of thumb
- If a file powers a page now, it belongs in the live site root, `data/`, or `processed_data/`.
- If a file is a source PDF, workbook, or raw export, it belongs in the year-specific raw folder.
- If a file is an older copy, it belongs in archive.
