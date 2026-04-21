# Database Finish Work Map

This note separates the remaining active database outputs from archive and page assets.

## Canonical / source-aligned

- `processed_data/canonical/hunt_master_canonical_2026_dwr_aligned.csv`
- `processed_data/foundation/hunt_database_foundation_dwr_aligned.sqlite`
- `processed_data/trend/hunt_history_2025_2026_dwr_aligned.csv`

## Derived canonical / build outputs

- `processed_data/canonical/hunt_master_canonical_2026_built.csv`
- `processed_data/canonical/hunt_master_canonical_2026_built.sqlite`
- `processed_data/research/hunt_research_foundation_2026_built.csv`

## Current meaning

- `processed_data/canonical/hunt_master_canonical_2026_dwr_aligned.csv` is the main aligned hunt identity file.
- `processed_data/canonical/hunt_master_canonical_2026_built.csv` and `processed_data/canonical/hunt_master_canonical_2026_built.sqlite` are the built canonical mirror.
- `processed_data/foundation/hunt_database_foundation_dwr_aligned.sqlite` is the SQLite foundation mirror.
- `processed_data/trend/hunt_history_2025_2026_dwr_aligned.csv` is the historical bridge table.
- `processed_data/research/hunt_research_foundation_2026_built.csv` is the research-side built layer.

## Rule of thumb

- Keep these files out of archive.
- Do not move them into the live page root unless a script or page explicitly depends on the root path.
- Use this set as the final database finish-work layer before any further page wiring.
