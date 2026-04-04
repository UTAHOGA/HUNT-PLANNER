from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path


WINDOWS_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER")
POSIX_ROOT = Path("/mnt/c/UOGA HUNTS/HUNT-PLANNER")
ROOT = POSIX_ROOT if POSIX_ROOT.exists() else WINDOWS_ROOT
PROCESSED = ROOT / "processed_data"
WINDOWS_ROOT_PROCESSED = Path(r"C:\UOGA HUNTS\processed_data")
POSIX_ROOT_PROCESSED = Path("/mnt/c/UOGA HUNTS/processed_data")
ROOT_PROCESSED = POSIX_ROOT_PROCESSED if POSIX_ROOT_PROCESSED.exists() else WINDOWS_ROOT_PROCESSED

JOIN_PATH = PROCESSED / "hunt_join_2025.csv"
DRAW_PRESSURE_PATH = PROCESSED / "draw_breakdown_2025.csv"
PUBLIC_PERMITS_PATH = PROCESSED / "recommended_permits_2026.csv"
PROJECTED_SIMULATED_PATH = ROOT_PROCESSED / "projected_bonus_draw_2026_simulated.csv"
PROJECTED_BASE_PATH = ROOT_PROCESSED / "projected_bonus_draw_2026.csv"
PROJECTED_BONUS_PATH = PROJECTED_SIMULATED_PATH if PROJECTED_SIMULATED_PATH.exists() else PROJECTED_BASE_PATH
HUNT_SUCCESS_PATHS = [
    PROCESSED / "hunt_success_2025.csv",
    ROOT_PROCESSED / "2025" / "hunt_success_2025.csv",
    ROOT_PROCESSED / "2025" / "harvest_2025.csv",
    ROOT / "data" / "uoga_harvest_layers" / "harvest_2025.csv",
]
OUTPUT_PATH = PROCESSED / "hunt_master_enriched.csv"


def pick_first_existing(paths: list[Path]) -> Path:
    for path in paths:
        if path.exists():
            return path
    raise FileNotFoundError(f"No source file found in: {paths}")


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def to_int(value: str | None) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return int(round(float(text)))
    except ValueError:
        return None


def residency_key(value: str | None) -> str:
    text = str(value or "").strip().lower()
    return "nonresident" if text == "nonresident" else "resident"


def summarize_draw_pressure(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_code[row.get("hunt_code", "").strip()].append(row)

    for hunt_code, group in by_code.items():
        residency_groups: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in group:
            residency_groups[residency_key(row.get("residency"))].append(row)

        summary: dict[str, object] = {
            "draw_pressure_row_count": len(group),
            "draw_pressure_resident_rows": len(residency_groups["resident"]),
            "draw_pressure_nonresident_rows": len(residency_groups["nonresident"]),
        }

        for side in ("resident", "nonresident"):
            side_rows = residency_groups[side]
            applicants = [to_int(row.get("applicants")) or 0 for row in side_rows]
            permits = [to_int(row.get("total_permits")) or 0 for row in side_rows]
            points = [to_int(row.get("point_level")) for row in side_rows if to_int(row.get("point_level")) is not None]
            summary[f"draw_pressure_{side}_total_applicants"] = sum(applicants)
            summary[f"draw_pressure_{side}_total_permits"] = sum(permits)
            summary[f"draw_pressure_{side}_min_point"] = min(points) if points else ""
            summary[f"draw_pressure_{side}_max_point"] = max(points) if points else ""

        grouped[hunt_code] = summary

    return grouped


def summarize_public_permits(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    for row in rows:
        hunt_code = row.get("hunt_code", "").strip()
        if not hunt_code:
            continue
        grouped[hunt_code] = {
            "public_permits_2026_resident": to_int(row.get("resident_permits")),
            "public_permits_2026_nonresident": to_int(row.get("nonresident_permits")),
            "public_permits_2026_total": to_int(row.get("total_permits")),
            "public_permits_2026_source_type": row.get("source_type", ""),
            "public_permits_2026_source_authority": row.get("source_authority_level", ""),
            "public_permits_2026_source_page": to_int(row.get("source_page_number")) or "",
        }
    return grouped


def summarize_projected_bonus(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    by_code: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        by_code[row.get("hunt_code", "").strip()].append(row)

    for hunt_code, group in by_code.items():
        residency_groups: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in group:
            residency_groups[residency_key(row.get("residency"))].append(row)

        summary: dict[str, object] = {
            "projected_bonus_row_count": len(group),
            "projected_bonus_resident_rows": len(residency_groups["resident"]),
            "projected_bonus_nonresident_rows": len(residency_groups["nonresident"]),
        }

        for side in ("resident", "nonresident"):
            side_rows = residency_groups[side]
            points = [to_int(row.get("apply_with_points")) for row in side_rows if to_int(row.get("apply_with_points")) is not None]
            total_probs = [float(row.get("projected_total_probability_pct") or 0) for row in side_rows if str(row.get("projected_total_probability_pct", "")).strip()]
            current_permits = [to_int(row.get("current_recommended_permits")) for row in side_rows if to_int(row.get("current_recommended_permits")) is not None]
            summary[f"projected_bonus_{side}_min_point"] = min(points) if points else ""
            summary[f"projected_bonus_{side}_max_point"] = max(points) if points else ""
            summary[f"projected_bonus_{side}_current_permits"] = current_permits[0] if current_permits else ""
            summary[f"projected_bonus_{side}_max_draw_odds_pct"] = max(total_probs) if total_probs else ""

        grouped[hunt_code] = summary

    return grouped


def summarize_hunt_success(rows: list[dict[str, str]]) -> dict[str, dict[str, object]]:
    grouped: dict[str, dict[str, object]] = {}
    for row in rows:
        hunt_code = row.get("hunt_code", "").strip()
        if not hunt_code:
            continue
        grouped[hunt_code] = {
            "hunt_success_2025_hunters": to_int(row.get("hunters")) or "",
            "hunt_success_2025_harvest": to_int(row.get("harvest")) or "",
            "hunt_success_2025_percent_success": row.get("percent_success", ""),
            "hunt_success_2025_avg_days": row.get("avg_days", ""),
            "hunt_success_2025_satisfaction": row.get("satisfaction", ""),
            "hunt_success_2025_access_type": row.get("access_type", ""),
        }
    return grouped


def main() -> None:
    hunt_success_path = pick_first_existing(HUNT_SUCCESS_PATHS)

    join_rows = read_csv_rows(JOIN_PATH)
    draw_pressure = summarize_draw_pressure(read_csv_rows(DRAW_PRESSURE_PATH))
    public_permits = summarize_public_permits(read_csv_rows(PUBLIC_PERMITS_PATH))
    projected_bonus = summarize_projected_bonus(read_csv_rows(PROJECTED_BONUS_PATH))
    hunt_success = summarize_hunt_success(read_csv_rows(hunt_success_path))

    base_fields = list(join_rows[0].keys()) if join_rows else []
    added_fields = [
        "draw_pressure_row_count",
        "draw_pressure_resident_rows",
        "draw_pressure_nonresident_rows",
        "draw_pressure_resident_total_applicants",
        "draw_pressure_nonresident_total_applicants",
        "draw_pressure_resident_total_permits",
        "draw_pressure_nonresident_total_permits",
        "draw_pressure_resident_min_point",
        "draw_pressure_resident_max_point",
        "draw_pressure_nonresident_min_point",
        "draw_pressure_nonresident_max_point",
        "public_permits_2026_resident",
        "public_permits_2026_nonresident",
        "public_permits_2026_total",
        "public_permits_2026_source_type",
        "public_permits_2026_source_authority",
        "public_permits_2026_source_page",
        "projected_bonus_row_count",
        "projected_bonus_resident_rows",
        "projected_bonus_nonresident_rows",
        "projected_bonus_resident_min_point",
        "projected_bonus_resident_max_point",
        "projected_bonus_nonresident_min_point",
        "projected_bonus_nonresident_max_point",
        "projected_bonus_resident_current_permits",
        "projected_bonus_nonresident_current_permits",
        "projected_bonus_resident_max_draw_odds_pct",
        "projected_bonus_nonresident_max_draw_odds_pct",
        "hunt_success_2025_hunters",
        "hunt_success_2025_harvest",
        "hunt_success_2025_percent_success",
        "hunt_success_2025_avg_days",
        "hunt_success_2025_satisfaction",
        "hunt_success_2025_access_type",
        "gap_missing_draw_pressure_2025",
        "gap_missing_public_permits_2026",
        "gap_missing_projected_bonus_draw_2026",
        "gap_missing_hunt_success_2025",
        "gap_missing_any_child_data",
        "child_gap_count",
        "canonical_base_source",
        "hunt_success_source_file",
    ]

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=base_fields + added_fields)
        writer.writeheader()

        for base_row in join_rows:
            hunt_code = base_row.get("hunt_code", "").strip()
            merged = dict(base_row)
            merged.update(draw_pressure.get(hunt_code, {}))
            merged.update(public_permits.get(hunt_code, {}))
            merged.update(projected_bonus.get(hunt_code, {}))
            merged.update(hunt_success.get(hunt_code, {}))

            gap_draw = hunt_code not in draw_pressure
            gap_permits = hunt_code not in public_permits
            gap_projected = hunt_code not in projected_bonus
            gap_success = hunt_code not in hunt_success
            gap_count = sum((gap_draw, gap_permits, gap_projected, gap_success))

            merged["gap_missing_draw_pressure_2025"] = str(gap_draw).upper()
            merged["gap_missing_public_permits_2026"] = str(gap_permits).upper()
            merged["gap_missing_projected_bonus_draw_2026"] = str(gap_projected).upper()
            merged["gap_missing_hunt_success_2025"] = str(gap_success).upper()
            merged["gap_missing_any_child_data"] = str(gap_count > 0).upper()
            merged["child_gap_count"] = gap_count
            merged["canonical_base_source"] = str(JOIN_PATH)
            merged["hunt_success_source_file"] = str(hunt_success_path)

            writer.writerow(merged)

    print(f"Wrote {len(join_rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
