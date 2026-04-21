# Repo Alignment

The active site repo is `C:\DOCUMENTS\GitHub\HUNT-PLANNER`.

This file records how it lines up with the larger `C:\UOGA HUNTS` workspace.

## Keep In The Active Repo

These belong in the GitHub-synced site tree because the site reads them directly or they are part of the current publishable shell:

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
- `server.js`
- `start-https-server.bat`
- `launch-https-server.ps1`
- `processed_data/`
- `data/`

## Keep Only In The Umbrella Workspace

These belong in `C:\UOGA HUNTS` and should stay out of the active site repo unless they are intentionally promoted:

- `ARCHIVE/`
- `PROJECT CORE/`
- `raw_data_2023/`
- `raw_data_2024/`
- `raw_data_2025/`
- `raw_data_2026/`
- `data-dictionary/`
- `INFO DATABASE/`
- `Folders/`
- `uoga_project_backup/`
- `website recommendations/`
- `master_source_index.json`
- `MASTER_SOURCE_INDEX.md`
- `process_pdf.py`
- `merge_hunt_files.py`
- `repo_manifest.json`
- `codex-mode.ps1`
- `script.sh.save`
- `gpt chat on Hunt Planner to  04.03.26.txt`
- `THE SCIENCE.psd`
- `bison bull.xlsx`
- `permit compare.xlsx`

## Shared Names, Different Roles

Some names appear in both places, but they serve different roles:

- `index.html`, `hunt-research.html`, `vetting.html` are live pages in the active repo, while the umbrella workspace may also hold historical or duplicate copies.
- `point_ladder_view.csv` and related research files can exist in the repo as live outputs, while the umbrella workspace may also have older build versions.

## Rule

When in doubt:

1. Keep the live site copy in the active repo.
2. Keep raw inputs and historical artifacts in `C:\UOGA HUNTS`.
3. Move superseded copies to archive.
4. Do not create a new root just to avoid deciding.

