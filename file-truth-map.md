# U.O.G.A. File Truth Map

This map separates the active site, source inputs, derived outputs, and archive material.

## Live Site

These are the files the published site reads directly or uses as its shell:

- `index.html`
- `hunt-research.html`
- `vetting.html`
- `hard-copy.html`
- `app.js`
- `config.js`
- `data.js`
- `hunt-research.js`
- `ui.js`
- `style.css`
- `manifest.json`
- `.nojekyll`
- `favicon.ico`
- `CNAME`

Local server helpers live alongside the site shell, but they are not part of the browser page content:

- `server.js`
- `start-https-server.bat`
- `launch-https-server.ps1`

## Source Inputs

These are the canonical source and reference files that feed the build:

- `data/hunt-master-canonical.json`
- `data/utah-hunt-planner-master-all.json`
- `data/outfitters-public.json`
- `data/outfitters.json`
- `data/outfitters-master.json`
- `data/hunt_boundaries_arcgis.json`
- `data/hunt-boundaries-lite.geojson`
- `data/cwmu-boundaries.geojson`
- `data/dwr-GetCWMUBoundaries.json`
- `data/conservation-permit-areas.json`
- `data/conservation-permit-hunt-table-2025-27.csv`
- `data/conservation-permit-hunt-table-2025-27.json`
- `data/conservation-permit-hunt-table-2025-27.html`
- `data/conservation-permit-hunt-table-2025-27-summary.json`
- `data/Utah_Big_Game_Hunt_Boundaries_deer.csv`
- `data/Utah_Big_Game_Hunt_Boundaries_deer.xlsx`
- `data/Utah_Big_Game_Hunt_Boundaries_2025_elk.csv`
- `data/Utah_Big_Game_Hunt_Boundaries_2025_elk.geojson`
- `data/Utah_Big_Game_Hunt_Boundaries_2025_hunt table.csv`
- `data/Utah_Big_Game_Hunt_Boundaries_2025_hunt table.geojson`
- `data/Utah_Big_Game_Hunt_Boundaries_2025_-hunt table.xlsx`
- `data/Utah_Big_Game_Hunt_Boundaries deer.geojson`
- `data/usfs-surface-ownership-shapefile`
- `data/blm-surface-ownership-shapefile`
- `data/sitla-ownership-shapefile`
- `data/wma-boundaries-shapefile`
- `data/utah-black-bear-habitat.geojson`
- `data/utah-elk-habitat.geojson`
- `data/utah-mule-deer-habitat.geojson`
- `data/utah-migration-corridors-lite.geojson`
- `data/utah-migration-stopovers-lite.geojson`
- `data/utah-state-parks-shapefile`
- `data/logo-review-assets`
- `data/logo-sourcing-approved.json`

## Derived Outputs

These are built from the source inputs and are safe to regenerate:

- `processed_data/draw_reality_engine.csv`
- `processed_data/draw_reality_view.csv`
- `processed_data/draw_breakdown_2025.csv`
- `processed_data/harvest_2025.csv`
- `processed_data/harvest_2025.validation.json`
- `processed_data/historical_trend_2025.csv`
- `processed_data/hunt_join_2025.csv`
- `processed_data/hunt_master_enriched.csv`
- `processed_data/hunt_scores_2025.csv`
- `processed_data/hunt_with_outfitters_2025.csv`
- `processed_data/hunt_unit_reference_linked.csv`
- `processed_data/recommended_permits_2026.csv`
- `processed_data/projected_bonus_draw_2026.csv`
- `processed_data/projected_bonus_draw_2026_simulated.csv`
- `processed_data/antlerless_draw_2025.csv`
- `processed_data/hunt_database_complete.csv`
- `processed_data/hunt_decision_output.csv`
- `processed_data/hunt_master_canonical_2026_built.csv`
- `processed_data/hunt_master_canonical_2026_built.sqlite`
- `processed_data/hunt_database_foundation_dwr_aligned.sqlite`
- `processed_data/hunt_history_2025_2026_dwr_aligned.csv`
- `processed_data/hunt_research_2026_split/`
- `processed_data/hunt-master-canonical.json`
- `processed_data/point_ladder_view.csv`
- `processed_data/split-summary.json`

## Archive / Comparison

These are supporting or historical files that should not be treated as the active source:

- `ARCHIVE/`
- `uoga_project_backup/`
- `BUILD_COMPARISON_NOTES.md`
- `hunt_database_build_report.md`
- `hunt_database_foundation_dwr_report.md`
- `deer_2025_bonus_random_audit.csv`
- `deer_2025_bonus_random_summary.csv`
- `hunt-research.txt`

## Rule

If a file is not clearly source, live, or derived, put it in archive or keep it out of the active tree until it is classified.

