from __future__ import annotations

import csv
import json
import shutil
from collections import Counter
from pathlib import Path


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")

INPUT_PATH = UOGA_ROOT / "processed_data" / "hunt_join_2025.csv"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_hunt_scores_layers"
CSV_PATH = OUTPUT_DIR / "hunt_scores_2025.csv"
VALIDATION_PATH = OUTPUT_DIR / "hunt_scores_2025.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "hunt_scores_2025.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "hunt_scores_2025.status.json"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "hunt_scores_2025.csv"


PRESERVE_FIELDS = [
    "hunt_code",
    "species",
    "hunt_name",
    "hunt_type",
    "weapon",
    "sex_type",
    "access_type",
    "has_harvest",
    "has_bonus_draw",
    "has_antlerless_draw",
    "bonus_draw_hunt_code",
    "bonus_draw_row_count",
    "bonus_draw_resident_min_point",
    "bonus_draw_resident_max_point",
    "bonus_draw_nonresident_min_point",
    "bonus_draw_nonresident_max_point",
    "antlerless_draw_hunt_code",
    "antlerless_draw_row_count",
    "antlerless_resident_min_point",
    "antlerless_resident_max_point",
    "antlerless_nonresident_min_point",
    "antlerless_nonresident_max_point",
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def to_int(value: str | None) -> int | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return int(float(value))


def to_float(value: str | None) -> float | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return float(value)


def to_bool(value: str | None) -> bool:
    return str(value).strip().lower() == "true"


def score_family_for_row(row: dict[str, str]) -> tuple[str, str]:
    hunt_type = (row.get("hunt_type") or "").upper()
    access_type = (row.get("access_type") or "").upper()

    if access_type == "CWMU":
        return "excluded_private", "CWMU access excluded from public ranking"
    if "PRIVATE LANDS ONLY" in hunt_type:
        return "excluded_private", "Private-lands-only hunt excluded from public ranking"
    if "LANDOWNER" in hunt_type:
        return "excluded_landowner", "Landowner hunt excluded from public ranking"
    if any(flag in hunt_type for flag in ["SPORTSMAN", "CONSERVATION", "OIAL", "CACTUS", "MANAGEMENT", "CONTROL", "YOUTH"]):
        return "excluded_special_program", "Special-program hunt excluded from public ranking"
    if to_bool(row.get("has_bonus_draw")):
        return "public_bonus", "Public hunt with bonus-draw source"
    if to_bool(row.get("has_antlerless_draw")):
        return "public_preference", "Public hunt with preference-draw source"
    return "public_general", "Public hunt with harvest-only/general structure"


def draw_family_for_row(row: dict[str, str]) -> str | None:
    has_bonus = to_bool(row.get("has_bonus_draw"))
    has_antlerless = to_bool(row.get("has_antlerless_draw"))
    if has_bonus and has_antlerless:
        return None
    if has_bonus:
        return "bonus_draw"
    if has_antlerless:
        return "preference_draw"
    return "none"


def draw_presence_flag(draw_family: str | None) -> str:
    if draw_family in {"bonus_draw", "preference_draw"}:
        return "yes"
    return "no"


def private_or_cwmu_flag(row: dict[str, str]) -> str:
    hunt_type = (row.get("hunt_type") or "").upper()
    access_type = (row.get("access_type") or "").upper()
    if access_type == "CWMU" or "PRIVATE LANDS ONLY" in hunt_type or "LANDOWNER" in hunt_type:
        return "yes"
    return "no"


def public_rank_eligible(score_family: str) -> str:
    return "yes" if score_family in {"public_bonus", "public_preference", "public_general"} else "no"


def harvest_success_score(row: dict[str, str]) -> float | None:
    return to_float(row.get("percent_success"))


def harvest_pressure_score(row: dict[str, str]) -> float | None:
    hunters = to_float(row.get("hunters"))
    permits_total = to_float(row.get("permits_total"))
    if hunters is None or permits_total in {None, 0}:
        return None
    return round(hunters / permits_total, 4)


def harvest_efficiency_score(row: dict[str, str]) -> float | None:
    harvest = to_float(row.get("harvest"))
    hunters = to_float(row.get("hunters"))
    if harvest is None or hunters in {None, 0}:
        return None
    return round(harvest / hunters, 4)


def point_signal(row: dict[str, str], residency: str) -> int | None:
    if to_bool(row.get("has_bonus_draw")):
        return to_int(row.get(f"bonus_draw_{residency}_lowest_point_with_permit")) or to_int(
            row.get(f"bonus_draw_{residency}_min_point")
        )
    if to_bool(row.get("has_antlerless_draw")):
        if residency == "resident":
            return to_int(row.get("antlerless_draw_resident_lowest_point_with_permit")) or to_int(
                row.get("antlerless_resident_min_point")
            )
        return to_int(row.get("antlerless_draw_nonresident_lowest_point_with_permit")) or to_int(
            row.get("antlerless_nonresident_min_point")
        )
    return None


def draw_difficulty_flag(row: dict[str, str]) -> str | None:
    if to_bool(row.get("has_bonus_draw")):
        signal = point_signal(row, "resident")
        if signal is None:
            return None
        if signal >= 20:
            return "high"
        if signal >= 10:
            return "moderate"
        return "low"
    if to_bool(row.get("has_antlerless_draw")):
        signal = point_signal(row, "resident")
        if signal is None:
            return None
        if signal >= 10:
            return "high"
        if signal >= 5:
            return "moderate"
        return "low"
    return None


def scoring_notes(row: dict[str, str], draw_family: str | None, score_family: str) -> str:
    notes: list[str] = []
    success = harvest_success_score(row)
    pressure = harvest_pressure_score(row)
    efficiency = harvest_efficiency_score(row)
    if success is not None:
        notes.append(f"success={success}")
    if pressure is not None:
        notes.append(f"pressure=hunters/permits={pressure}")
    if efficiency is not None:
        notes.append(f"efficiency=harvest/hunters={efficiency}")

    if draw_family == "bonus_draw":
        notes.append(
            f"bonus resident signal={point_signal(row, 'resident')} nonresident signal={point_signal(row, 'nonresident')}"
        )
    elif draw_family == "preference_draw":
        notes.append(
            f"preference resident signal={point_signal(row, 'resident')} nonresident signal={point_signal(row, 'nonresident')}"
        )
    else:
        notes.append("no draw-source signal")

    notes.append(f"score_family={score_family}")
    return "; ".join(notes)


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    input_rows = read_csv(INPUT_PATH)

    duplicates = sorted(code for code, count in Counter(row["hunt_code"] for row in input_rows).items() if count > 1)
    if duplicates:
        raise RuntimeError(f"Duplicate hunt_code rows in source join file: {duplicates[:20]}")

    scored_rows: list[dict[str, object]] = []
    for row in input_rows:
        draw_family = draw_family_for_row(row)
        score_family, family_note = score_family_for_row(row)
        private_flag = private_or_cwmu_flag(row)
        public_flag = public_rank_eligible(score_family)

        scored_row: dict[str, object] = {field: row.get(field) for field in PRESERVE_FIELDS}
        scored_row.update(
            {
                "draw_family": draw_family,
                "draw_presence_flag": draw_presence_flag(draw_family),
                "score_family": score_family,
                "private_or_cwmu_flag": private_flag,
                "public_rank_eligible": public_flag,
                "harvest_success_score": harvest_success_score(row),
                "harvest_pressure_score": harvest_pressure_score(row),
                "harvest_efficiency_score": harvest_efficiency_score(row),
                "draw_difficulty_flag": draw_difficulty_flag(row),
                "resident_point_signal": point_signal(row, "resident"),
                "nonresident_point_signal": point_signal(row, "nonresident"),
                "scoring_notes": f"{family_note}; {scoring_notes(row, draw_family, score_family)}",
            }
        )
        scored_rows.append(scored_row)

    write_csv(scored_rows, CSV_PATH)

    row_count = len(scored_rows)
    distinct_hunt_codes = len({row["hunt_code"] for row in scored_rows})
    duplicate_hunt_code_count = row_count - distinct_hunt_codes

    failing_hunt_codes: set[str] = set()

    def row_fail(condition: bool, hunt_code: str) -> None:
        if not condition:
            failing_hunt_codes.add(hunt_code)

    for row in scored_rows:
        hunt_code = str(row["hunt_code"])
        has_bonus = str(row["has_bonus_draw"]).lower() == "true"
        has_antlerless = str(row["has_antlerless_draw"]).lower() == "true"
        draw_family = row["draw_family"]
        public_flag = row["public_rank_eligible"]
        score_family = row["score_family"]
        hunt_type = str(row["hunt_type"] or "").upper()
        access_type = str(row["access_type"] or "").upper()

        row_fail(not (has_bonus and has_antlerless), hunt_code)
        row_fail(
            (has_bonus and draw_family == "bonus_draw")
            or (has_antlerless and draw_family == "preference_draw")
            or ((not has_bonus and not has_antlerless) and draw_family == "none"),
            hunt_code,
        )

        if any(flag in hunt_type for flag in ["LANDOWNER", "PRIVATE LANDS ONLY"]) or access_type == "CWMU":
            row_fail(public_flag == "no", hunt_code)

        if score_family == "excluded_special_program":
            row_fail(public_flag == "no", hunt_code)

        if draw_family == "none":
            row_fail(row["draw_difficulty_flag"] is None, hunt_code)
            row_fail(row["resident_point_signal"] is None, hunt_code)
            row_fail(row["nonresident_point_signal"] is None, hunt_code)

        if not has_bonus:
            row_fail(
                row["bonus_draw_hunt_code"] in {"", None},
                hunt_code,
            )
        if not has_antlerless:
            row_fail(
                row["antlerless_draw_hunt_code"] in {"", None},
                hunt_code,
            )

    public_rank_eligible_count = sum(1 for row in scored_rows if row["public_rank_eligible"] == "yes")
    excluded_private_cwmu_count = sum(1 for row in scored_rows if row["private_or_cwmu_flag"] == "yes")

    validation = {
        "input_row_count": len(input_rows),
        "output_row_count": row_count,
        "distinct_hunt_code_count": distinct_hunt_codes,
        "duplicate_hunt_code_count": duplicate_hunt_code_count,
        "public_rank_eligible_count": public_rank_eligible_count,
        "excluded_private_cwmu_count": excluded_private_cwmu_count,
        "score_family_distribution": dict(Counter(row["score_family"] for row in scored_rows)),
        "draw_family_distribution": dict(Counter(row["draw_family"] for row in scored_rows)),
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    acceptance = {
        "accepted_for_use": (
            row_count == len(input_rows)
            and distinct_hunt_codes == row_count
            and duplicate_hunt_code_count == 0
            and len(failing_hunt_codes) == 0
        ),
        "checks": {
            "row_count_matches_hunt_join": row_count == len(input_rows),
            "distinct_hunt_code_count_equals_row_count": distinct_hunt_codes == row_count,
            "no_duplicate_hunt_code_rows": duplicate_hunt_code_count == 0,
            "public_rank_eligible_excludes_private_cwmu_landowner": len(
                [
                    row
                    for row in scored_rows
                    if row["public_rank_eligible"] == "yes"
                    and (
                        str(row["access_type"]).upper() == "CWMU"
                        or "LANDOWNER" in str(row["hunt_type"]).upper()
                        or "PRIVATE LANDS ONLY" in str(row["hunt_type"]).upper()
                    )
                ]
            )
            == 0,
            "draw_family_aligns_with_source_presence_flags": len(
                [
                    row
                    for row in scored_rows
                    if not (
                        (str(row["has_bonus_draw"]).lower() == "true" and row["draw_family"] == "bonus_draw")
                        or (str(row["has_antlerless_draw"]).lower() == "true" and row["draw_family"] == "preference_draw")
                        or (
                            str(row["has_bonus_draw"]).lower() != "true"
                            and str(row["has_antlerless_draw"]).lower() != "true"
                            and row["draw_family"] == "none"
                        )
                    )
                ]
            )
            == 0,
            "no_unsupported_score_values_without_source_support": len(
                [
                    row
                    for row in scored_rows
                    if row["draw_family"] == "none"
                    and (
                        row["draw_difficulty_flag"] is not None
                        or row["resident_point_signal"] is not None
                        or row["nonresident_point_signal"] is not None
                    )
                ]
            )
            == 0,
        },
        "failing_hunt_codes": sorted(failing_hunt_codes),
        "summary": {
            "output_csv": str(PROCESSED_OUTPUT_PATH),
            "row_count": row_count,
            "distinct_hunt_code_count": distinct_hunt_codes,
            "duplicate_hunt_code_count": duplicate_hunt_code_count,
            "public_rank_eligible_count": public_rank_eligible_count,
            "excluded_private_cwmu_count": excluded_private_cwmu_count,
        },
    }
    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")

    status = {
        "table": "hunt_scores_2025",
        "source_join": str(INPUT_PATH),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "status": "ready" if acceptance["accepted_for_use"] else "failed_acceptance",
        "accepted_for_use": acceptance["accepted_for_use"],
        "row_count": row_count,
        "distinct_hunt_code_count": distinct_hunt_codes,
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    return acceptance


def publish_if_accepted() -> bool:
    acceptance = json.loads(ACCEPTANCE_PATH.read_text(encoding="utf-8"))
    if not acceptance.get("accepted_for_use"):
        return False
    PROCESSED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CSV_PATH, PROCESSED_OUTPUT_PATH)
    return True


if __name__ == "__main__":
    acceptance = build()
    published = publish_if_accepted()
    print(
        json.dumps(
            {
                "accepted_for_use": acceptance["accepted_for_use"],
                "output_path": str(PROCESSED_OUTPUT_PATH),
                "row_count": acceptance["summary"]["row_count"],
                "distinct_hunt_code_count": acceptance["summary"]["distinct_hunt_code_count"],
                "duplicate_hunt_code_count": acceptance["summary"]["duplicate_hunt_code_count"],
                "public_rank_eligible_count": acceptance["summary"]["public_rank_eligible_count"],
                "excluded_private_cwmu_count": acceptance["summary"]["excluded_private_cwmu_count"],
                "failing_hunt_codes": acceptance["failing_hunt_codes"],
                "published": published,
            },
            indent=2,
        )
    )
