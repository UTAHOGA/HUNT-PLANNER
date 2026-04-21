from __future__ import annotations

import csv
import json
from collections import Counter
from pathlib import Path


WINDOWS_ROOT = Path(r"C:\UOGA HUNTS")
POSIX_ROOT = Path("/mnt/c/UOGA HUNTS")
ROOT = POSIX_ROOT if POSIX_ROOT.exists() else WINDOWS_ROOT

APP_ROOT = ROOT / "HUNT-PLANNER"
PROCESSED = APP_ROOT / "processed_data"
STAGING = ROOT / "PROJECT CORE" / "NORMALIZED STAGING"

JOIN_PATH = PROCESSED / "hunt_join_2025.csv"
PERMITS_PATH = ROOT / "processed_data" / "recommended_permits_2026.csv"
CURRENT_DRAW_PATH = PROCESSED / "draw_breakdown_2025.csv"
ENGINE_PATH = PROCESSED / "draw_reality_engine.csv"
MASTER_PATH = PROCESSED / "hunt_master_enriched.csv"

STAGING_PATHS = [
    STAGING / "normalized_25_bg-odds_1_.csv",
    STAGING / "normalized_25_deer_odds.csv",
    STAGING / "normalized_25_dh_odds.csv",
    STAGING / "normalized_25_antlerless_drawing_odds_report_1_.csv",
    STAGING / "normalized_25_youth_elk.csv",
    STAGING / "normalized_25_youth_deer.csv",
]

OUTPUT_CSV = PROCESSED / "draw_backfill_readiness_audit.csv"
OUTPUT_JSON = PROCESSED / "draw_backfill_readiness_summary.json"


def clean(value: object) -> str:
    return str(value or "").strip()


def load_codes(path: Path, field: str = "hunt_code") -> set[str]:
    codes: set[str] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            code = clean(row.get(field))
            if code:
                codes.add(code)
    return codes


def load_master_meta(path: Path) -> dict[str, tuple[str, str, str]]:
    out: dict[str, tuple[str, str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            code = clean(row.get("hunt_code"))
            if code and code not in out:
                out[code] = (
                    clean(row.get("species")),
                    clean(row.get("hunt_name")),
                    clean(row.get("weapon")),
                )
    return out


def main() -> None:
    join_codes = load_codes(JOIN_PATH)
    permit_codes = load_codes(PERMITS_PATH)
    current_draw_codes = load_codes(CURRENT_DRAW_PATH)
    engine_codes = load_codes(ENGINE_PATH)
    master_meta = load_master_meta(MASTER_PATH)

    staging_codes: set[str] = set()
    by_source: dict[str, int] = {}
    for path in STAGING_PATHS:
        codes = load_codes(path)
        staging_codes |= codes
        by_source[path.name] = len(codes - current_draw_codes)

    additional_draw_codes = (staging_codes - current_draw_codes) & join_codes

    rows: list[dict[str, str]] = []
    readiness_counts = Counter()
    species_counts = Counter()

    for code in sorted(additional_draw_codes):
        has_permits = code in permit_codes
        currently_modeled = code in engine_codes
        readiness = (
            "projection_only_after_draw_merge"
            if has_permits and not currently_modeled
            else "still_missing_permits_after_draw_merge"
        )
        species, hunt_name, weapon = master_meta.get(code, ("", "", ""))
        rows.append(
            {
                "hunt_code": code,
                "species": species,
                "hunt_name": hunt_name,
                "weapon": weapon,
                "has_current_permits": "TRUE" if has_permits else "FALSE",
                "currently_modeled": "TRUE" if currently_modeled else "FALSE",
                "readiness_after_draw_merge": readiness,
            }
        )
        readiness_counts[readiness] += 1
        species_counts[species or "UNKNOWN"] += 1

    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "hunt_code",
                "species",
                "hunt_name",
                "weapon",
                "has_current_permits",
                "currently_modeled",
                "readiness_after_draw_merge",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    summary = {
        "join_hunt_codes": len(join_codes),
        "current_draw_codes": len(current_draw_codes),
        "staging_draw_codes": len(staging_codes),
        "additional_draw_codes_in_staging": len(additional_draw_codes),
        "current_permit_codes": len(permit_codes & join_codes),
        "current_engine_codes": len(engine_codes),
        "readiness_counts": dict(readiness_counts),
        "species_counts": dict(species_counts),
        "staging_source_new_code_counts": by_source,
        "output_csv": str(OUTPUT_CSV),
    }

    with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(f"Wrote draw backfill readiness audit: {OUTPUT_CSV}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
