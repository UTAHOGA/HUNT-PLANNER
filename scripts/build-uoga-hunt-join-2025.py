from __future__ import annotations

import csv
import json
import shutil
from collections import Counter, defaultdict
from pathlib import Path


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")

HARVEST_PATH = UOGA_ROOT / "processed_data" / "harvest_2025.csv"
DRAW_PATH = UOGA_ROOT / "processed_data" / "draw_breakdown_2025.csv"
ANTLERLESS_PATH = UOGA_ROOT / "processed_data" / "antlerless_draw_2025.csv"

OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_hunt_join_layers"
CSV_PATH = OUTPUT_DIR / "hunt_join_2025.csv"
STATUS_PATH = OUTPUT_DIR / "hunt_join_2025.status.json"
VALIDATION_PATH = OUTPUT_DIR / "hunt_join_2025.validation.json"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "hunt_join_2025.csv"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def to_int(value: str | None) -> int | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return int(value)


def to_float(value: str | None) -> float | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return float(value)


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def summarize_bonus_draw(rows: list[dict[str, str]]) -> tuple[dict[str, dict[str, object]], list[dict[str, object]]]:
    grouped: dict[str, dict[str, list[dict[str, str]]]] = defaultdict(lambda: defaultdict(list))
    source_collisions: list[dict[str, object]] = []

    for row in rows:
        grouped[row["hunt_code"]][row["residency"]].append(row)

    summaries: dict[str, dict[str, object]] = {}
    for hunt_code, residency_map in grouped.items():
        summary: dict[str, object] = {
            "has_bonus_draw": True,
            "bonus_draw_model_family": "bonus_draw_probability",
            "bonus_draw_hunt_code": hunt_code,
            "bonus_draw_row_count": sum(len(rows) for rows in residency_map.values()),
        }
        for residency in ["Resident", "Nonresident"]:
            residency_rows = residency_map.get(residency, [])
            if not residency_rows:
                summary[f"bonus_draw_{residency.lower()}_rows"] = None
                summary[f"bonus_draw_{residency.lower()}_total_applicants"] = None
                summary[f"bonus_draw_{residency.lower()}_bonus_permits"] = None
                summary[f"bonus_draw_{residency.lower()}_random_permits"] = None
                summary[f"bonus_draw_{residency.lower()}_total_permits"] = None
                summary[f"bonus_draw_{residency.lower()}_highest_point_with_permit"] = None
                summary[f"bonus_draw_{residency.lower()}_lowest_point_with_permit"] = None
                summary[f"bonus_draw_{residency.lower()}_min_point"] = None
                summary[f"bonus_draw_{residency.lower()}_max_point"] = None
                continue

            key_counts = Counter((r["point_level"], r["residency"]) for r in residency_rows)
            for (point_level, _), count in key_counts.items():
                if count > 1:
                    source_collisions.append(
                        {
                            "source": "draw_breakdown_2025",
                            "hunt_code": hunt_code,
                            "residency": residency,
                            "point_level": point_level,
                            "count": count,
                        }
                    )

            applicants_sum = sum(to_int(r["applicants"]) or 0 for r in residency_rows)
            bonus_sum = sum(to_int(r["bonus_permits"]) or 0 for r in residency_rows)
            random_sum = sum(to_int(r["random_permits"]) or 0 for r in residency_rows)
            total_sum = sum(to_int(r["total_permits"]) or 0 for r in residency_rows)
            point_levels = sorted(to_int(r["point_level"]) for r in residency_rows)
            permit_points = sorted(
                [to_int(r["point_level"]) for r in residency_rows if (to_int(r["total_permits"]) or 0) > 0]
            )

            prefix = f"bonus_draw_{residency.lower()}"
            summary[f"{prefix}_rows"] = len(residency_rows)
            summary[f"{prefix}_total_applicants"] = applicants_sum
            summary[f"{prefix}_bonus_permits"] = bonus_sum
            summary[f"{prefix}_random_permits"] = random_sum
            summary[f"{prefix}_total_permits"] = total_sum
            summary[f"{prefix}_min_point"] = min(point_levels) if point_levels else None
            summary[f"{prefix}_max_point"] = max(point_levels) if point_levels else None
            summary[f"{prefix}_highest_point_with_permit"] = max(permit_points) if permit_points else None
            summary[f"{prefix}_lowest_point_with_permit"] = min(permit_points) if permit_points else None

        summaries[hunt_code] = summary

    return summaries, source_collisions


def summarize_antlerless_draw(rows: list[dict[str, str]]) -> tuple[dict[str, dict[str, object]], list[dict[str, object]]]:
    grouped: dict[str, dict[str, list[dict[str, str]]]] = defaultdict(lambda: defaultdict(list))
    land_types: dict[str, set[str]] = defaultdict(set)
    source_collisions: list[dict[str, object]] = []

    for row in rows:
        grouped[row["hunt_code"]][row["residency"]].append(row)
        land_types[row["hunt_code"]].add(row["land_type"])

    summaries: dict[str, dict[str, object]] = {}
    for hunt_code, residency_map in grouped.items():
        summary: dict[str, object] = {
            "has_antlerless_draw": True,
            "antlerless_draw_model_family": "preference_threshold",
            "antlerless_draw_hunt_code": hunt_code,
            "antlerless_draw_row_count": sum(len(rows) for rows in residency_map.values()),
        }
        hunt_land_types = sorted(land_types[hunt_code])
        if len(hunt_land_types) == 1:
            summary["antlerless_draw_land_type"] = hunt_land_types[0]
        elif len(hunt_land_types) == 0:
            summary["antlerless_draw_land_type"] = None
        else:
            summary["antlerless_draw_land_type"] = "mixed"

        for residency in ["Resident", "Nonresident"]:
            residency_rows = residency_map.get(residency, [])
            if not residency_rows:
                summary[f"antlerless_draw_{residency.lower()}_rows"] = None
                summary[f"antlerless_draw_{residency.lower()}_total_applicants"] = None
                summary[f"antlerless_draw_{residency.lower()}_permits_awarded"] = None
                summary[f"antlerless_draw_{residency.lower()}_highest_point_with_permit"] = None
                summary[f"antlerless_draw_{residency.lower()}_lowest_point_with_permit"] = None
                summary[f"antlerless_draw_{residency.lower()}_min_point"] = None
                summary[f"antlerless_draw_{residency.lower()}_max_point"] = None
                continue

            key_counts = Counter((r["point_level"], r["residency"]) for r in residency_rows)
            for (point_level, _), count in key_counts.items():
                if count > 1:
                    source_collisions.append(
                        {
                            "source": "antlerless_draw_2025",
                            "hunt_code": hunt_code,
                            "residency": residency,
                            "point_level": point_level,
                            "count": count,
                        }
                    )

            applicants_sum = sum(to_int(r["applicants"]) or 0 for r in residency_rows)
            permits_sum = sum(to_int(r["permits_awarded"]) or 0 for r in residency_rows)
            point_levels = sorted(to_int(r["point_level"]) for r in residency_rows)
            permit_points = sorted(
                [to_int(r["point_level"]) for r in residency_rows if (to_int(r["permits_awarded"]) or 0) > 0]
            )

            prefix = f"antlerless_draw_{residency.lower()}"
            summary[f"{prefix}_rows"] = len(residency_rows)
            summary[f"{prefix}_total_applicants"] = applicants_sum
            summary[f"{prefix}_permits_awarded"] = permits_sum
            summary[f"{prefix}_min_point"] = min(point_levels) if point_levels else None
            summary[f"{prefix}_max_point"] = max(point_levels) if point_levels else None
            summary[f"{prefix}_highest_point_with_permit"] = max(permit_points) if permit_points else None
            summary[f"{prefix}_lowest_point_with_permit"] = min(permit_points) if permit_points else None

        summaries[hunt_code] = summary

    return summaries, source_collisions


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    harvest_rows = read_csv(HARVEST_PATH)
    draw_rows = read_csv(DRAW_PATH)
    antlerless_rows = read_csv(ANTLERLESS_PATH)

    harvest_codes = [r["hunt_code"] for r in harvest_rows]
    draw_codes = {r["hunt_code"] for r in draw_rows}
    antlerless_codes = {r["hunt_code"] for r in antlerless_rows}

    harvest_duplicates = sorted(code for code, count in Counter(harvest_codes).items() if count > 1)
    bonus_summaries, bonus_collisions = summarize_bonus_draw(draw_rows)
    antlerless_summaries, antlerless_collisions = summarize_antlerless_draw(antlerless_rows)
    join_collisions = harvest_duplicates + [json.dumps(c, sort_keys=True) for c in bonus_collisions + antlerless_collisions]

    joined_rows: list[dict[str, object]] = []
    for harvest_row in sorted(harvest_rows, key=lambda row: row["hunt_code"]):
        hunt_code = harvest_row["hunt_code"]
        bonus = bonus_summaries.get(hunt_code, {})
        antlerless = antlerless_summaries.get(hunt_code, {})

        source_families = ["performance"]
        if hunt_code in bonus_summaries:
            source_families.append("bonus_draw_probability")
        if hunt_code in antlerless_summaries:
            source_families.append("preference_threshold")

        joined_rows.append(
            {
                "hunt_code": hunt_code,
                "join_key": hunt_code,
                "source_family_presence": "|".join(source_families),
                "has_harvest": True,
                "has_bonus_draw": bonus.get("has_bonus_draw", False),
                "has_antlerless_draw": antlerless.get("has_antlerless_draw", False),
                "harvest_model_family": "performance",
                "bonus_draw_model_family": bonus.get("bonus_draw_model_family"),
                "antlerless_draw_model_family": antlerless.get("antlerless_draw_model_family"),
                "species": harvest_row["species"],
                "hunt_name": harvest_row["hunt_name"],
                "hunt_type": harvest_row["hunt_type"],
                "weapon": harvest_row["weapon"],
                "sex_type": harvest_row["sex_type"],
                "access_type": harvest_row["access_type"],
                "permits_total": to_int(harvest_row["permits_total"]),
                "hunters": to_int(harvest_row["hunters"]),
                "harvest": to_int(harvest_row["harvest"]),
                "percent_success": to_float(harvest_row["percent_success"]),
                "avg_days": to_float(harvest_row["avg_days"]),
                "satisfaction": to_float(harvest_row["satisfaction"]),
                "bonus_draw_hunt_code": bonus.get("bonus_draw_hunt_code"),
                "bonus_draw_resident_rows": bonus.get("bonus_draw_resident_rows"),
                "bonus_draw_row_count": bonus.get("bonus_draw_row_count"),
                "bonus_draw_resident_min_point": bonus.get("bonus_draw_resident_min_point"),
                "bonus_draw_resident_max_point": bonus.get("bonus_draw_resident_max_point"),
                "bonus_draw_resident_total_applicants": bonus.get("bonus_draw_resident_total_applicants"),
                "bonus_draw_resident_bonus_permits": bonus.get("bonus_draw_resident_bonus_permits"),
                "bonus_draw_resident_random_permits": bonus.get("bonus_draw_resident_random_permits"),
                "bonus_draw_resident_total_permits": bonus.get("bonus_draw_resident_total_permits"),
                "bonus_draw_resident_highest_point_with_permit": bonus.get("bonus_draw_resident_highest_point_with_permit"),
                "bonus_draw_resident_lowest_point_with_permit": bonus.get("bonus_draw_resident_lowest_point_with_permit"),
                "bonus_draw_nonresident_rows": bonus.get("bonus_draw_nonresident_rows"),
                "bonus_draw_nonresident_min_point": bonus.get("bonus_draw_nonresident_min_point"),
                "bonus_draw_nonresident_max_point": bonus.get("bonus_draw_nonresident_max_point"),
                "bonus_draw_nonresident_total_applicants": bonus.get("bonus_draw_nonresident_total_applicants"),
                "bonus_draw_nonresident_bonus_permits": bonus.get("bonus_draw_nonresident_bonus_permits"),
                "bonus_draw_nonresident_random_permits": bonus.get("bonus_draw_nonresident_random_permits"),
                "bonus_draw_nonresident_total_permits": bonus.get("bonus_draw_nonresident_total_permits"),
                "bonus_draw_nonresident_highest_point_with_permit": bonus.get("bonus_draw_nonresident_highest_point_with_permit"),
                "bonus_draw_nonresident_lowest_point_with_permit": bonus.get("bonus_draw_nonresident_lowest_point_with_permit"),
                "antlerless_draw_land_type": antlerless.get("antlerless_draw_land_type"),
                "antlerless_draw_resident_rows": antlerless.get("antlerless_draw_resident_rows"),
                "antlerless_draw_hunt_code": antlerless.get("antlerless_draw_hunt_code"),
                "antlerless_draw_row_count": antlerless.get("antlerless_draw_row_count"),
                "antlerless_resident_min_point": antlerless.get("antlerless_draw_resident_min_point"),
                "antlerless_resident_max_point": antlerless.get("antlerless_draw_resident_max_point"),
                "antlerless_draw_resident_total_applicants": antlerless.get("antlerless_draw_resident_total_applicants"),
                "antlerless_draw_resident_permits_awarded": antlerless.get("antlerless_draw_resident_permits_awarded"),
                "antlerless_draw_resident_highest_point_with_permit": antlerless.get("antlerless_draw_resident_highest_point_with_permit"),
                "antlerless_draw_resident_lowest_point_with_permit": antlerless.get("antlerless_draw_resident_lowest_point_with_permit"),
                "antlerless_draw_nonresident_rows": antlerless.get("antlerless_draw_nonresident_rows"),
                "antlerless_nonresident_min_point": antlerless.get("antlerless_draw_nonresident_min_point"),
                "antlerless_nonresident_max_point": antlerless.get("antlerless_draw_nonresident_max_point"),
                "antlerless_draw_nonresident_total_applicants": antlerless.get("antlerless_draw_nonresident_total_applicants"),
                "antlerless_draw_nonresident_permits_awarded": antlerless.get("antlerless_draw_nonresident_permits_awarded"),
                "antlerless_draw_nonresident_highest_point_with_permit": antlerless.get("antlerless_draw_nonresident_highest_point_with_permit"),
                "antlerless_draw_nonresident_lowest_point_with_permit": antlerless.get("antlerless_draw_nonresident_lowest_point_with_permit"),
            }
        )

    write_csv(joined_rows, CSV_PATH)

    status = {
        "table": "hunt_join_2025",
        "target_grain": "one row per hunt_code",
        "authoritative_base_source": str(HARVEST_PATH),
        "bonus_draw_source": str(DRAW_PATH),
        "antlerless_draw_source": str(ANTLERLESS_PATH),
        "rows_written": len(joined_rows),
        "distinct_hunt_codes": len({r["hunt_code"] for r in joined_rows}),
        "join_collisions": join_collisions,
        "output_csv": str(PROCESSED_OUTPUT_PATH),
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    validation = {
        "harvest_row_count": len(harvest_rows),
        "draw_row_count": len(draw_rows),
        "antlerless_row_count": len(antlerless_rows),
        "joined_row_count": len(joined_rows),
        "harvest_hunt_codes": len(set(harvest_codes)),
        "draw_hunt_codes": len(draw_codes),
        "antlerless_hunt_codes": len(antlerless_codes),
        "draw_matched_to_harvest": len(draw_codes & set(harvest_codes)),
        "draw_unmatched_to_harvest": len(draw_codes - set(harvest_codes)),
        "antlerless_matched_to_harvest": len(antlerless_codes & set(harvest_codes)),
        "antlerless_unmatched_to_harvest": len(antlerless_codes - set(harvest_codes)),
        "harvest_without_bonus_draw": len(set(harvest_codes) - draw_codes),
        "harvest_without_antlerless_draw": len(set(harvest_codes) - antlerless_codes),
        "join_collisions": join_collisions,
        "source_family_separation_preserved": True,
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    return {
        "row_count": len(joined_rows),
        "matched_counts": {
            "harvest": len(set(harvest_codes)),
            "draw_matched": len(draw_codes & set(harvest_codes)),
            "draw_unmatched": len(draw_codes - set(harvest_codes)),
            "antlerless_matched": len(antlerless_codes & set(harvest_codes)),
            "antlerless_unmatched": len(antlerless_codes - set(harvest_codes)),
        },
        "join_collisions": join_collisions,
    }


def publish() -> None:
    PROCESSED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CSV_PATH, PROCESSED_OUTPUT_PATH)


if __name__ == "__main__":
    result = build()
    publish()
    print(json.dumps({**result, "output_path": str(PROCESSED_OUTPUT_PATH)}, indent=2))
