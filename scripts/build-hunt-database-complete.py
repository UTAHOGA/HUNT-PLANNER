from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


WINDOWS_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER")
POSIX_ROOT = Path("/mnt/c/UOGA HUNTS/HUNT-PLANNER")
ROOT = POSIX_ROOT if POSIX_ROOT.exists() else WINDOWS_ROOT
PROCESSED = ROOT / "processed_data"

JOIN_PATH = PROCESSED / "hunt_join_2025.csv"
MASTER_PATH = PROCESSED / "hunt_master_enriched.csv"
ENGINE_PATH = PROCESSED / "draw_reality_engine.csv"
LADDER_PATH = PROCESSED / "point_ladder_view.csv"
DRAW_PATH = PROCESSED / "draw_breakdown_2025.csv"

OUTPUT_CSV = PROCESSED / "hunt_database_complete.csv"
OUTPUT_JSON = PROCESSED / "hunt_database_complete_summary.json"

RESIDENCIES = ("Resident", "Nonresident")

MANUAL_REASON_OVERRIDES = {
    # User-validated cleanup for edge cases that should not remain in the
    # unresolved public-draw blocker bucket.
    "BI6527": "pending_public_permits_not_posted",
    "DB0009": "excluded_special_permit_class",
    "DS6605": "excluded_special_permit_class",
}


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def clean(value: object) -> str:
    return str(value or "").strip()


def truthy(value: object) -> bool:
    return clean(value).lower() in {"true", "1", "yes", "y"}


def residency_key(value: object) -> str:
    text = clean(value).lower()
    return "Nonresident" if text == "nonresident" else "Resident"


def first_nonempty(*values: object) -> str:
    for value in values:
        text = clean(value)
        if text:
            return text
    return ""


def summarize_master(rows: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, str]]:
    by_key: dict[tuple[str, str], dict[str, str]] = {}
    for row in rows:
        hunt_code = clean(row.get("hunt_code"))
        if not hunt_code:
            continue
        residency_value = clean(row.get("residency"))
        if residency_value:
            by_key[(hunt_code, residency_key(residency_value))] = row
        else:
            by_key[(hunt_code, "Resident")] = row
            by_key[(hunt_code, "Nonresident")] = row
    return by_key


def summarize_engine(rows: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, str]]:
    by_key: dict[tuple[str, str], dict[str, str]] = {}
    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        hunt_code = clean(row.get("hunt_code"))
        residency = residency_key(row.get("residency"))
        if not hunt_code:
            continue
        grouped[(hunt_code, residency)].append(row)

    for key, group in grouped.items():
        first = group[0]
        points = sorted(
            {
                int(clean(row.get("points")))
                for row in group
                if clean(row.get("points"))
            }
        )
        by_key[key] = {
            "has_engine_model": "TRUE",
            "engine_point_rows": str(len(group)),
            "modeled_min_points": str(points[0]) if points else "",
            "modeled_max_points": str(points[-1]) if points else "",
            "public_permits_2025": clean(first.get("public_permits_2025")),
            "public_permits_2026": clean(first.get("public_permits_2026")),
            "projected_applicants_2026": str(sum(int(clean(row.get("applicants_at_level")) or "0") for row in group)),
            "max_point_permits_2026": clean(first.get("max_point_permits_2026")),
            "random_permits_2026": clean(first.get("random_permits_2026")),
            "guaranteed_at_2026": clean(first.get("guaranteed_at_2026")),
            "delta_gap": clean(first.get("delta_gap")),
            "trend": clean(first.get("trend")),
        }
    return by_key


def summarize_draw(rows: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, str]]:
    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        hunt_code = clean(row.get("hunt_code"))
        residency = residency_key(row.get("residency"))
        if not hunt_code:
            continue
        grouped[(hunt_code, residency)].append(row)

    by_key: dict[tuple[str, str], dict[str, str]] = {}
    for key, group in grouped.items():
        by_key[key] = {
            "applicants_2025": str(sum(int(clean(row.get("applicants")) or "0") for row in group)),
        }
    return by_key


def summarize_ladder(rows: list[dict[str, str]]) -> dict[tuple[str, str], dict[str, str]]:
    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        hunt_code = clean(row.get("hunt_code"))
        residency = residency_key(row.get("residency"))
        if not hunt_code:
            continue
        grouped[(hunt_code, residency)].append(row)

    summary: dict[tuple[str, str], dict[str, str]] = {}
    for key, group in grouped.items():
        summary[key] = {
            "has_ladder_rows": "TRUE",
            "ladder_row_count": str(len(group)),
        }
    return summary


def coverage_status(has_engine_model: bool, has_context_metrics: bool, has_master_record: bool) -> str:
    if has_engine_model:
        return "MODELED"
    if has_context_metrics or has_master_record:
        return "CONTEXT_ONLY"
    return "MISSING_SOURCE_DATA"


def coverage_reason(
    hunt_code: str,
    has_engine_model: bool,
    has_master_record: bool,
    has_draw_history: bool,
    has_projection: bool,
    has_permits: bool,
    excluded_from_public_draw_model: bool,
    pending_public_permits: bool,
) -> str:
    override = MANUAL_REASON_OVERRIDES.get(clean(hunt_code))
    if override:
        return override
    if has_engine_model:
        return "modeled_engine"
    if not has_master_record:
        return "missing_master_record"
    if excluded_from_public_draw_model:
        return "excluded_special_permit_class"
    if pending_public_permits:
        return "pending_public_permits_not_posted"
    if not has_draw_history and not has_projection and not has_permits:
        return "missing_draw_projection_permits"
    if not has_draw_history and not has_projection:
        return "missing_draw_and_projection"
    if not has_projection:
        return "missing_projection_only"
    if not has_draw_history:
        return "missing_draw_only"
    if not has_permits:
        return "missing_permits_only"
    return "context_only"


def is_excluded_special_permit_hunt(hunt_type: object, hunt_name: object) -> bool:
    text = f"{clean(hunt_type)} {clean(hunt_name)}".upper()
    blocked_markers = (
        "CONSERVATION",
        "SPORTSMAN",
        "CONTROL",
        "PRIVATE LANDS ONLY",
        "PRIVATE LAND ONLY",
        "LANDOWNER",
    )
    if any(marker in text for marker in blocked_markers):
        return True

    # General-season OTC elk hunts are metadata/reference hunts for this system,
    # not public draw permit hunts for the draw-odds model.
    if "GENERAL SEASON" in text:
        return True

    return False


def is_pending_public_permit_hunt(hunt_type: object, access_type: object, has_permits: bool) -> bool:
    if has_permits:
        return False
    hunt_text = clean(hunt_type).upper()
    access_text = clean(access_type).upper()
    if "ANTLERLESS" in hunt_text:
        return True
    if "CWMU ANTLERLESS" in hunt_text:
        return True
    if access_text == "CWMU" and "ANTLERLESS" in hunt_text:
        return True
    return False


def main() -> None:
    join_rows = read_csv_rows(JOIN_PATH)
    master_by_key = summarize_master(read_csv_rows(MASTER_PATH))
    engine_by_key = summarize_engine(read_csv_rows(ENGINE_PATH))
    ladder_by_key = summarize_ladder(read_csv_rows(LADDER_PATH))
    draw_by_key = summarize_draw(read_csv_rows(DRAW_PATH))

    fieldnames = [
        "hunt_code",
        "residency",
        "species",
        "hunt_name",
        "weapon",
        "hunt_type",
        "access_type",
        "join_key",
        "source_family_presence",
        "harvest_model_family",
        "bonus_draw_model_family",
        "antlerless_draw_model_family",
        "success_hunters",
        "success_harvest",
        "success_percent",
        "public_permits_2025",
        "public_permits_2026",
        "applicants_2025",
        "projected_applicants_2026",
        "max_point_permits_2026",
        "random_permits_2026",
        "guaranteed_at_2026",
        "delta_gap",
        "trend",
        "engine_point_rows",
        "modeled_min_points",
        "modeled_max_points",
        "has_master_record",
        "has_permits",
        "has_draw_history",
        "has_projection",
        "has_engine_model",
        "has_ladder_rows",
        "has_context_metrics",
        "ladder_row_count",
        "coverage_status",
        "coverage_reason",
    ]

    output_rows: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str]] = set()

    for join_row in join_rows:
        hunt_code = clean(join_row.get("hunt_code"))
        if not hunt_code:
            continue

        for residency in RESIDENCIES:
            key = (hunt_code, residency)
            seen_keys.add(key)
            master_row = master_by_key.get(key, {})
            engine_row = engine_by_key.get(key, {})
            ladder_row = ladder_by_key.get(key, {})
            draw_row = draw_by_key.get(key, {})

            has_master_record = bool(master_row)
            has_permits = (
                clean(master_row.get("missing_permits")).upper() == "FALSE"
                or bool(clean(master_row.get("public_permits_2026")))
                or bool(clean(master_row.get("public_permits_2026_total")))
                or bool(clean(master_row.get("public_permits_2026_resident")))
                or bool(clean(master_row.get("public_permits_2026_nonresident")))
                or bool(clean(engine_row.get("public_permits_2026")))
                or clean(master_row.get("gap_missing_public_permits_2026")).upper() == "FALSE"
            )
            has_draw_history = (
                clean(master_row.get("missing_draw_data")).upper() == "FALSE"
                or bool(engine_row)
                or clean(master_row.get("gap_missing_draw_pressure_2025")).upper() == "FALSE"
            )
            has_projection = (
                clean(master_row.get("missing_projection")).upper() == "FALSE"
                or bool(engine_row)
                or clean(master_row.get("gap_missing_projected_bonus_draw_2026")).upper() == "FALSE"
            )
            has_engine_model = bool(engine_row)
            merged_hunt_type = first_nonempty(master_row.get("hunt_type"), join_row.get("hunt_type"))
            merged_hunt_name = first_nonempty(master_row.get("hunt_name"), join_row.get("hunt_name"))
            merged_access_type = first_nonempty(master_row.get("access_type"), join_row.get("access_type"))
            excluded_from_public_draw_model = is_excluded_special_permit_hunt(
                merged_hunt_type,
                merged_hunt_name,
            )
            pending_public_permits = is_pending_public_permit_hunt(
                merged_hunt_type,
                merged_access_type,
                has_permits,
            )
            has_context_metrics = any(
                bool(first_nonempty(
                    master_row.get("success_hunters"),
                    master_row.get("success_harvest"),
                    master_row.get("success_percent"),
                    join_row.get("hunters"),
                    join_row.get("harvest"),
                    join_row.get("percent_success"),
                ))
                for _ in [0]
            )

            row = {
                "hunt_code": hunt_code,
                "residency": residency,
                "species": first_nonempty(master_row.get("species"), join_row.get("species")),
                "hunt_name": merged_hunt_name,
                "weapon": first_nonempty(master_row.get("weapon"), join_row.get("weapon")),
                "hunt_type": merged_hunt_type,
                "access_type": merged_access_type,
                "join_key": clean(join_row.get("join_key")),
                "source_family_presence": clean(join_row.get("source_family_presence")),
                "harvest_model_family": clean(join_row.get("harvest_model_family")),
                "bonus_draw_model_family": clean(join_row.get("bonus_draw_model_family")),
                "antlerless_draw_model_family": clean(join_row.get("antlerless_draw_model_family")),
                "success_hunters": first_nonempty(master_row.get("success_hunters"), join_row.get("hunters")),
                "success_harvest": first_nonempty(master_row.get("success_harvest"), join_row.get("harvest")),
                "success_percent": first_nonempty(master_row.get("success_percent"), join_row.get("percent_success")),
                "public_permits_2025": first_nonempty(engine_row.get("public_permits_2025"), master_row.get("public_permits_2025")),
                "public_permits_2026": first_nonempty(master_row.get("public_permits_2026"), engine_row.get("public_permits_2026")),
                "applicants_2025": first_nonempty(draw_row.get("applicants_2025"), master_row.get("applicants_2025")),
                "projected_applicants_2026": first_nonempty(engine_row.get("projected_applicants_2026"), master_row.get("projected_applicants_2026")),
                "max_point_permits_2026": clean(engine_row.get("max_point_permits_2026")),
                "random_permits_2026": clean(engine_row.get("random_permits_2026")),
                "guaranteed_at_2026": clean(engine_row.get("guaranteed_at_2026")),
                "delta_gap": clean(engine_row.get("delta_gap")),
                "trend": clean(engine_row.get("trend")),
                "engine_point_rows": clean(engine_row.get("engine_point_rows")),
                "modeled_min_points": clean(engine_row.get("modeled_min_points")),
                "modeled_max_points": clean(engine_row.get("modeled_max_points")),
                "has_master_record": "TRUE" if has_master_record else "FALSE",
                "has_permits": "TRUE" if has_permits else "FALSE",
                "has_draw_history": "TRUE" if has_draw_history else "FALSE",
                "has_projection": "TRUE" if has_projection else "FALSE",
                "has_engine_model": "TRUE" if has_engine_model else "FALSE",
                "has_ladder_rows": clean(ladder_row.get("has_ladder_rows")) or "FALSE",
                "has_context_metrics": "TRUE" if has_context_metrics else "FALSE",
                "ladder_row_count": clean(ladder_row.get("ladder_row_count")),
            }
            row["coverage_status"] = coverage_status(has_engine_model, has_context_metrics, has_master_record)
            row["coverage_reason"] = coverage_reason(
                hunt_code=hunt_code,
                has_engine_model=has_engine_model,
                has_master_record=has_master_record,
                has_draw_history=has_draw_history,
                has_projection=has_projection,
                has_permits=has_permits,
                excluded_from_public_draw_model=excluded_from_public_draw_model,
                pending_public_permits=pending_public_permits,
            )
            output_rows.append(row)

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output_rows)

    status_counts = Counter(row["coverage_status"] for row in output_rows)
    reason_counts = Counter(row["coverage_reason"] for row in output_rows)

    summary = {
        "generated_from": {
            "hunt_join": str(JOIN_PATH),
            "hunt_master_enriched": str(MASTER_PATH),
            "draw_reality_engine": str(ENGINE_PATH),
            "point_ladder_view": str(LADDER_PATH),
        },
        "total_rows": len(output_rows),
        "distinct_hunt_codes": len({row["hunt_code"] for row in output_rows}),
        "status_counts": dict(status_counts),
        "reason_counts": dict(reason_counts),
        "output_csv": str(OUTPUT_CSV),
    }

    with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(f"Wrote complete hunt database: {OUTPUT_CSV}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
