from __future__ import annotations

import csv
import json
import shutil
from pathlib import Path


WORKSPACE_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")

PROJECTION_PATH = UOGA_ROOT / "processed_data" / "projected_bonus_draw_2026_simulated.csv"
METADATA_PATH = WORKSPACE_ROOT / "processed_data" / "hunt_join_2025.csv"

OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_hunt_research_view_2026"
OUTPUT_CSV_PATH = OUTPUT_DIR / "hunt_research_view_2026.csv"
VALIDATION_PATH = OUTPUT_DIR / "hunt_research_view_2026.validation.json"
STATUS_PATH = OUTPUT_DIR / "hunt_research_view_2026.status.json"
PROCESSED_OUTPUT_PATH = WORKSPACE_ROOT / "processed_data" / "hunt_research_view_2026.csv"
PROCESSED_YEAR_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "hunt_research_view_2026.csv"

METADATA_FIELDS = [
    "species",
    "hunt_type",
    "weapon",
    "access_type",
    "percent_success",
    "harvest",
    "satisfaction",
    "avg_days",
]


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def build_metadata_map(rows: list[dict[str, str]]) -> tuple[dict[str, dict[str, str]], list[str]]:
    metadata_map: dict[str, dict[str, str]] = {}
    collisions: list[str] = []
    for row in rows:
        hunt_code = row["hunt_code"]
        if hunt_code in metadata_map:
            collisions.append(hunt_code)
            continue
        metadata_map[hunt_code] = {field: row.get(field, "") for field in METADATA_FIELDS}
    return metadata_map, sorted(set(collisions))


def build_view_rows(
    projection_rows: list[dict[str, str]],
    metadata_map: dict[str, dict[str, str]],
) -> tuple[list[dict[str, str]], dict[str, int]]:
    joined_rows: list[dict[str, str]] = []
    matched = 0
    unmatched = 0

    for row in projection_rows:
        joined = dict(row)
        metadata = metadata_map.get(row["hunt_code"])
        if metadata:
            matched += 1
        else:
            unmatched += 1
            metadata = {field: "" for field in METADATA_FIELDS}

        # Preserve projection values exactly; only backfill requested metadata.
        joined["species"] = metadata["species"]
        joined["hunt_type"] = metadata["hunt_type"]
        joined["access_type"] = metadata["access_type"]
        joined["percent_success"] = metadata["percent_success"]
        joined["harvest"] = metadata["harvest"]
        joined["satisfaction"] = metadata["satisfaction"]
        joined["avg_days"] = metadata["avg_days"]

        if not joined.get("weapon"):
            joined["weapon"] = metadata["weapon"]

        joined_rows.append(joined)

    return joined_rows, {"matched_projection_rows": matched, "unmatched_projection_rows": unmatched}


def write_csv(rows: list[dict[str, str]], path: Path) -> None:
    fieldnames = list(rows[0].keys())
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def validate(rows: list[dict[str, str]], metadata_collisions: list[str], projection_rows: list[dict[str, str]]) -> dict[str, object]:
    projection_count = len(projection_rows)
    row_count = len(rows)
    keys = [(row["hunt_code"], row["residency"], row["apply_with_points"]) for row in rows]

    seen: set[tuple[str, str, str]] = set()
    duplicate_rows: list[str] = []
    for key in keys:
        if key in seen:
            duplicate_rows.append("|".join(key))
        else:
            seen.add(key)

    return {
        "projection_row_count": projection_count,
        "output_row_count": row_count,
        "row_count_matches_projection": row_count == projection_count,
        "distinct_hunt_code_count": len({row["hunt_code"] for row in rows}),
        "distinct_hunt_residency_point_rows": len(set(keys)),
        "metadata_join_collisions": metadata_collisions,
        "duplicate_output_rows": sorted(set(duplicate_rows)),
    }


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    projection_rows = load_csv(PROJECTION_PATH)
    metadata_rows = load_csv(METADATA_PATH)
    metadata_map, metadata_collisions = build_metadata_map(metadata_rows)
    joined_rows, match_stats = build_view_rows(projection_rows, metadata_map)

    write_csv(joined_rows, OUTPUT_CSV_PATH)

    validation = validate(joined_rows, metadata_collisions, projection_rows)
    validation.update(match_stats)
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    status = {
        "dataset": "hunt_research_view_2026",
        "source_projection_path": str(PROJECTION_PATH),
        "source_metadata_path": str(METADATA_PATH),
        "published_output_path": str(PROCESSED_OUTPUT_PATH),
        "published_year_output_path": str(PROCESSED_YEAR_OUTPUT_PATH),
        "row_count_matches_projection": validation["row_count_matches_projection"],
        "metadata_join_collisions": validation["metadata_join_collisions"],
        "duplicate_output_rows": validation["duplicate_output_rows"],
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    if not metadata_collisions and not validation["duplicate_output_rows"] and validation["row_count_matches_projection"]:
        for target in (PROCESSED_OUTPUT_PATH, PROCESSED_YEAR_OUTPUT_PATH):
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(OUTPUT_CSV_PATH, target)
            except OSError:
                pass


if __name__ == "__main__":
    main()
