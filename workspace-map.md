# U.O.G.A. Workspace Map

This repo is the active site tree.

## Active Home

- `C:\DOCUMENTS\GitHub\HUNT-PLANNER`

Use this for:
- live site HTML
- shared runtime JS/CSS
- site-facing data exports
- page labels and layout
- publishable changes

## Source Inputs

- `C:\UOGA HUNTS\raw_data_2023`
- `C:\UOGA HUNTS\raw_data_2024`
- `C:\UOGA HUNTS\raw_data_2025`
- `C:\UOGA HUNTS\raw_data_2026`

Use these for:
- raw PDFs
- workbooks
- first-pass source extracts
- yearly comparisons

## Build Engine

- `C:\UOGA HUNTS\PROJECT CORE`

Use this for:
- extraction scripts
- production build logic
- validation reports
- engine-side CSV/SQLite outputs

## Archive

- `C:\UOGA HUNTS\ARCHIVE`

Use this for:
- old site snapshots
- dead-end experiments
- superseded exports
- comparison copies

## Downloads

- `C:\DOWNLOADS\...`

Use this only for:
- temporary downloads
- snapshots to inspect
- local comparisons

Do not treat Downloads as the home base.

## Rules

1. Keep one active tree.
2. Keep raw inputs separate from live site files.
3. Keep derived outputs in the repo or build engine, not in random folders.
4. Archive old copies instead of cloning new homes.
5. If a file does not clearly belong, pause and classify it before adding it anywhere.

## File Placement

- `index.html`, `hunt-research.html`, `vetting.html`, `hard-copy.html` belong in the active repo root.
- `app.js`, `config.js`, `data.js`, `hunt-research.js`, `ui.js`, `style.css`, `server.js` belong with the active site shell.
- `processed_data/` is for derived, page-ready outputs.
- `data/` is for planner truth, canonical layers, and reference assets.
- `raw_data_*` stays source-only.

