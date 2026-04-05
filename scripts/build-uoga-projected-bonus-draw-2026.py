from __future__ import annotations

import csv
import json
import math
import shutil
from collections import defaultdict
from pathlib import Path


WINDOWS_WORKSPACE_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER")
WINDOWS_UOGA_ROOT = Path(r"C:\UOGA HUNTS")
LEGACY_WINDOWS_WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
POSIX_WORKSPACE_ROOT = Path("/mnt/c/UOGA HUNTS/HUNT-PLANNER")
POSIX_UOGA_ROOT = Path("/mnt/c/UOGA HUNTS")
LEGACY_POSIX_WORKSPACE_ROOT = Path("/mnt/c/DOWNLOADS/test website/HUNT-PLANNER")

if POSIX_WORKSPACE_ROOT.exists():
    WORKSPACE_ROOT = POSIX_WORKSPACE_ROOT
elif WINDOWS_WORKSPACE_ROOT.exists():
    WORKSPACE_ROOT = WINDOWS_WORKSPACE_ROOT
elif LEGACY_POSIX_WORKSPACE_ROOT.exists():
    WORKSPACE_ROOT = LEGACY_POSIX_WORKSPACE_ROOT
else:
    WORKSPACE_ROOT = LEGACY_WINDOWS_WORKSPACE_ROOT

UOGA_ROOT = POSIX_UOGA_ROOT if POSIX_UOGA_ROOT.exists() else WINDOWS_UOGA_ROOT

DRAW_2025_PATH = WORKSPACE_ROOT / "processed_data" / "draw_breakdown_2025.csv"
PERMITS_2026_PATH = UOGA_ROOT / "processed_data" / "recommended_permits_2026.csv"

OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_projected_bonus_draw_2026"
CSV_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.csv"
VALIDATION_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.status.json"
CORRECTIONS_LOG_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.corrections.json"
AUDIT_SUMMARY_PATH = OUTPUT_DIR / "projected_bonus_draw_2026.audit_summary.md"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "projected_bonus_draw_2026.csv"
PROCESSED_YEAR_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "2026" / "projected_bonus_draw_2026.csv"


SOURCE_ROW_CORRECTIONS: dict[tuple[str, str, int], dict[str, object]] = {
    ("DB1003", "Nonresident", 26): {
        "updates": {"applicants": 18, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '26 18 0 0 0 N/A' into applicants=1 and bonus_permits=8.",
        "evidence": "Raw hunt section totals require 18 applicants at point 26 for DB1003 nonresident.",
    },
    ("DB1003", "Nonresident", 25): {
        "updates": {"applicants": 20, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '25 20 0 0 0 N/A' into applicants=2.",
        "evidence": "Raw hunt section totals require 20 applicants at point 25 for DB1003 nonresident.",
    },
    ("DB1004", "Nonresident", 26): {
        "updates": {"applicants": 15, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '26 15 0 0 0 N/A' into applicants=1 and bonus_permits=5.",
        "evidence": "Raw hunt section totals require 15 applicants at point 26 for DB1004 nonresident.",
    },
    ("DB1004", "Nonresident", 25): {
        "updates": {"applicants": 20, "bonus_permits": 0, "random_permits": 1, "total_permits": 1},
        "reason": "OCR split '25 20 0 1 1 1 in 20.0' into total_permits=11 and applicants=2.",
        "evidence": "Raw hunt section and hunt totals confirm one random permit at point 25 for DB1004 nonresident.",
    },
    ("DB1004", "Nonresident", 22): {
        "updates": {"applicants": 36, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '22 36 0 0 0 N/A' into applicants=3 and bonus_permits=6.",
        "evidence": "Raw hunt section totals require 36 applicants at point 22 for DB1004 nonresident.",
    },
    ("DB1019", "Nonresident", 24): {
        "updates": {"applicants": 12, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '24 12 0 0 0 N/A' into applicants=1 and bonus_permits=2.",
        "evidence": "Raw hunt section totals require 12 applicants at point 24 for DB1019 nonresident.",
    },
    ("DS6601", "Nonresident", 21): {
        "updates": {"applicants": 86, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 86 0 0 0 N/A' into applicants=8 and bonus_permits=6.",
        "evidence": "Raw hunt section shows nonresident point 21 as 86 applicants and no permits for DS6601.",
    },
    ("DS6603", "Nonresident", 24): {
        "updates": {"applicants": 19, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '24 19 0 0 0 N/A' into applicants=1 and bonus_permits=9.",
        "evidence": "Raw hunt section shows nonresident point 24 as 19 applicants and no permits for DS6603.",
    },
    ("DS6608", "Nonresident", 25): {
        "updates": {"applicants": 17, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '25 17 0 0 0 N/A' into applicants=1 and bonus_permits=7.",
        "evidence": "Raw hunt section shows nonresident point 25 as 17 applicants and no permits for DS6608.",
    },
    ("DS6608", "Nonresident", 22): {
        "updates": {"applicants": 16, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '22 16 0 0 0 N/A' into applicants=1 and bonus_permits=6.",
        "evidence": "Raw hunt section shows nonresident point 22 as 16 applicants and no permits for DS6608.",
    },
    ("DS6610", "Nonresident", 26): {
        "updates": {"applicants": 12, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '26 12 0 0 0 N/A' into applicants=1 and bonus_permits=2.",
        "evidence": "Raw hunt section shows nonresident point 26 as 12 applicants and no permits for DS6610.",
    },
    ("DS6610", "Nonresident", 25): {
        "updates": {"applicants": 15, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '25 15 0 0 0 N/A' into applicants=1 and bonus_permits=5.",
        "evidence": "Raw hunt section shows nonresident point 25 as 15 applicants and no permits for DS6610.",
    },
    ("DS6610", "Nonresident", 21): {
        "updates": {"applicants": 39, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 39 0 0 0 N/A' into applicants=3 and bonus_permits=9.",
        "evidence": "Raw hunt section shows nonresident point 21 as 39 applicants and no permits for DS6610.",
    },
    ("DS6626", "Nonresident", 21): {
        "updates": {"applicants": 14, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 14 0 0 0 N/A' into applicants=1 and bonus_permits=4.",
        "evidence": "Raw hunt section shows nonresident point 21 as 14 applicants and no permits for DS6626.",
    },
    ("EB3038", "Nonresident", 21): {
        "updates": {"applicants": 15, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 15 0 0 0 N/A' into applicants=1 and bonus_permits=5.",
        "evidence": "Raw hunt section shows nonresident point 21 as 15 applicants and no permits for EB3038.",
    },
    ("EB3047", "Nonresident", 21): {
        "updates": {"applicants": 12, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 12 0 0 0 N/A' into applicants=1 and bonus_permits=2.",
        "evidence": "Raw hunt section shows nonresident point 21 as 12 applicants and no permits for EB3047.",
    },
    ("GO6800", "Nonresident", 22): {
        "updates": {"applicants": 11, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '22 11 0 0 0 N/A' into applicants=1 and bonus_permits=1.",
        "evidence": "Raw hunt section shows nonresident point 22 as 11 applicants and no permits for GO6800.",
    },
    ("GO6817", "Nonresident", 20): {
        "updates": {"applicants": 12, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '20 12 0 0 0 N/A' into applicants=1 and bonus_permits=2.",
        "evidence": "Raw hunt section shows nonresident point 20 as 12 applicants and no permits for GO6817.",
    },
    ("MB6000", "Nonresident", 22): {
        "updates": {"applicants": 27, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '22 27 0 0 0 N/A' into applicants=2 and bonus_permits=7.",
        "evidence": "Raw hunt section shows nonresident point 22 as 27 applicants and no permits for MB6000.",
    },
    ("MB6006", "Nonresident", 21): {
        "updates": {"applicants": 29, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 29 0 0 0 N/A' into applicants=2 and bonus_permits=9.",
        "evidence": "Raw hunt section shows nonresident point 21 as 29 applicants and no permits for MB6006.",
    },
    ("MB6011", "Nonresident", 21): {
        "updates": {"applicants": 16, "bonus_permits": 0, "random_permits": 0, "total_permits": 0},
        "reason": "OCR split '21 16 0 0 0 N/A' into applicants=1 and bonus_permits=6.",
        "evidence": "Raw hunt section shows nonresident point 21 as 16 applicants and no permits for MB6011.",
    },
}


def to_int(value: str | None) -> int | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    return int(float(value))


def log_combination(n: int, k: int) -> float | None:
    if k < 0 or n < 0 or k > n:
        return None
    if k == 0 or k == n:
        return 0.0
    m = min(k, n - k)
    total = 0.0
    for index in range(1, m + 1):
        total += math.log(n - m + index) - math.log(index)
    return total


def weighted_random_probability(total_tickets: int, user_tickets: int, random_permits: int) -> float:
    if random_permits <= 0 or user_tickets <= 0 or total_tickets <= 0:
        return 0.0
    if user_tickets >= total_tickets or random_permits >= total_tickets:
        return 100.0

    miss_log = log_combination(total_tickets - user_tickets, random_permits)
    total_log = log_combination(total_tickets, random_permits)
    if miss_log is None or total_log is None:
        return 0.0
    miss_probability = math.exp(miss_log - total_log)
    return max(0.0, min(100.0, (1 - miss_probability) * 100))


def allocate_bonus_pool(pool_map: dict[int, int], permit_count: int, round_up_bonus: bool = False) -> tuple[int, int, dict[int, int], int | None]:
    reserved_bonus_pool = math.ceil(permit_count / 2) if round_up_bonus else math.floor(permit_count / 2)
    random_pool = permit_count - reserved_bonus_pool
    allocations: dict[int, int] = {}
    remaining_bonus = reserved_bonus_pool
    cutoff_point: int | None = None

    for point_level in range(32, -1, -1):
        applicants = pool_map.get(point_level, 0)
        taken = min(applicants, remaining_bonus) if remaining_bonus > 0 else 0
        allocations[point_level] = taken
        if taken > 0:
            cutoff_point = point_level
        remaining_bonus -= taken

    return reserved_bonus_pool, random_pool, allocations, cutoff_point


def apply_source_corrections(row: dict[str, object], corrections_log: list[dict[str, object]]) -> dict[str, object]:
    key = (str(row["hunt_code"]), str(row["residency"]), int(row["point_level"]))
    correction = SOURCE_ROW_CORRECTIONS.get(key)
    if not correction:
        return row

    updated = dict(row)
    changed_fields: list[dict[str, object]] = []
    for field_name, new_value in dict(correction["updates"]).items():
        old_value = updated[field_name]
        if old_value != new_value:
            changed_fields.append({"field": field_name, "old": old_value, "new": new_value})
            updated[field_name] = new_value

    if changed_fields:
        corrections_log.append(
            {
                "hunt_code": key[0],
                "residency": key[1],
                "point_level": key[2],
                "changed_fields": changed_fields,
                "reason": correction["reason"],
                "evidence": correction["evidence"],
            }
        )
    return updated


def load_draw_rows() -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]]]:
    rows: list[dict[str, object]] = []
    corrections_log: list[dict[str, object]] = []
    unresolved_anomalies: list[dict[str, object]] = []

    with DRAW_2025_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            normalized = {
                "hunt_code": row["hunt_code"],
                "residency": row["residency"],
                "point_level": to_int(row["point_level"]),
                "applicants": to_int(row["applicants"]) or 0,
                "bonus_permits": to_int(row["bonus_permits"]) or 0,
                "random_permits": to_int(row["random_permits"]) or 0,
                "total_permits": to_int(row["total_permits"]) or 0,
                "success_ratio_text": row["success_ratio_text"],
            }
            normalized = apply_source_corrections(normalized, corrections_log)
            if (
                int(normalized["total_permits"]) != int(normalized["bonus_permits"]) + int(normalized["random_permits"])
                or int(normalized["applicants"]) < int(normalized["total_permits"])
                or int(normalized["applicants"]) < int(normalized["bonus_permits"])
                or int(normalized["applicants"]) < int(normalized["random_permits"])
            ):
                unresolved_anomalies.append(
                    {
                        "hunt_code": normalized["hunt_code"],
                        "residency": normalized["residency"],
                        "point_level": normalized["point_level"],
                        "applicants": normalized["applicants"],
                        "bonus_permits": normalized["bonus_permits"],
                        "random_permits": normalized["random_permits"],
                        "total_permits": normalized["total_permits"],
                        "success_ratio_text": normalized["success_ratio_text"],
                    }
                )
            rows.append(normalized)

    return rows, corrections_log, unresolved_anomalies


def build_historical_bonus_structure_map(draw_rows: list[dict[str, object]]) -> set[tuple[str, str]]:
    bonus_pairs: set[tuple[str, str]] = set()
    for row in draw_rows:
        hunt_code = str(row["hunt_code"]).strip().upper()
        residency = str(row["residency"]).strip()
        if int(row["bonus_permits"]) > 0:
            bonus_pairs.add((hunt_code, residency))
    return bonus_pairs


def load_permit_rows() -> dict[tuple[str, str], dict[str, object]]:
    permit_map: dict[tuple[str, str], dict[str, object]] = {}
    with PERMITS_2026_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            hunt_code = row["hunt_code"]
            for residency in ("Resident", "Nonresident"):
                permits = to_int(row["resident_permits"] if residency == "Resident" else row["nonresident_permits"])
                prior_permits = to_int(row["resident_permits_prior"] if residency == "Resident" else row["nonresident_permits_prior"])
                permit_map[(hunt_code, residency)] = {
                    "recommendation_year": to_int(row["recommendation_year"]),
                    "permit_category": row["permit_category"],
                    "section_title": row["section_title"],
                    "hunt_name": row["hunt_name"],
                    "weapon": row["weapon"],
                    "current_permits": permits,
                    "prior_permits": prior_permits,
                    "source_type": row["source_type"],
                    "source_authority_level": row["source_authority_level"],
                    "source_page_number": to_int(row["source_page_number"]),
                }
    return permit_map


def use_round_up_bonus_split(
    hunt_code: str,
    residency: str,
    historical_bonus_pairs: set[tuple[str, str]],
) -> bool:
    normalized_code = str(hunt_code or "").strip().upper()
    normalized_residency = str(residency or "").strip()
    return (
        normalized_code.startswith("DB")
        and normalized_residency == "Nonresident"
        and (normalized_code, normalized_residency) in historical_bonus_pairs
    )


def uses_bonus_pool_model(
    hunt_code: str,
    residency: str,
    permit_category: str,
    historical_bonus_pairs: set[tuple[str, str]],
) -> bool:
    normalized_code = str(hunt_code or "").strip().upper()
    normalized_residency = str(residency or "").strip()
    normalized_category = str(permit_category or "").upper()

    if normalized_code.startswith("PB") and normalized_residency == "Nonresident":
        return (normalized_code, normalized_residency) in historical_bonus_pairs

    if "PRONGHORN" in normalized_category and normalized_code.startswith("PD"):
        return False

    return True


def build_2025_rows_by_hunt(draw_rows: list[dict[str, object]]) -> dict[tuple[str, str], dict[int, dict[str, object]]]:
    by_hunt: dict[tuple[str, str], dict[int, dict[str, object]]] = defaultdict(dict)
    for row in draw_rows:
        by_hunt[(str(row["hunt_code"]), str(row["residency"]))][int(row["point_level"])] = row
    return by_hunt


def build_carryover_pool(point_rows: dict[int, dict[str, object]]) -> tuple[dict[int, int], int, int]:
    carryover_pool: dict[int, int] = defaultdict(int)
    total_2025_applicants = 0
    total_2025_winners = 0

    for point_level in range(32, -1, -1):
        row = point_rows.get(point_level)
        applicants = int(row["applicants"]) if row else 0
        winners = int(row["total_permits"]) if row else 0
        total_2025_applicants += applicants
        total_2025_winners += winners
        unsuccessful = max(0, applicants - winners)
        if point_level == 0:
            carryover_pool[0] += unsuccessful
        elif unsuccessful > 0:
            carryover_pool[min(32, point_level + 1)] += unsuccessful

    return carryover_pool, total_2025_applicants, total_2025_winners


def build_projected_rows() -> tuple[list[dict[str, object]], list[dict[str, object]], list[dict[str, object]], dict[str, object]]:
    draw_rows, corrections_log, unresolved_anomalies = load_draw_rows()
    historical_bonus_pairs = build_historical_bonus_structure_map(draw_rows)
    permit_map = load_permit_rows()
    by_hunt = build_2025_rows_by_hunt(draw_rows)
    projected_rows: list[dict[str, object]] = []

    split_mismatch_pairs: list[dict[str, object]] = []
    skipped_missing_permits: list[dict[str, object]] = []

    for key, point_rows in sorted(by_hunt.items()):
        hunt_code, residency = key
        permit_info = permit_map.get((hunt_code, residency))
        if not permit_info:
            skipped_missing_permits.append({"hunt_code": hunt_code, "residency": residency, "reason": "missing permit row"})
            continue

        current_permits = permit_info["current_permits"]
        if current_permits is None:
            skipped_missing_permits.append({"hunt_code": hunt_code, "residency": residency, "reason": "null current permits"})
            continue

        carryover_pool, total_2025_applicants, total_2025_winners = build_carryover_pool(point_rows)
        round_up_bonus = use_round_up_bonus_split(hunt_code, residency, historical_bonus_pairs)
        uses_bonus_model = uses_bonus_pool_model(
            hunt_code,
            residency,
            str(permit_info["permit_category"]),
            historical_bonus_pairs,
        )
        if uses_bonus_model:
            reserved_bonus_pool, random_pool, _, base_cutoff_point = allocate_bonus_pool(carryover_pool, int(current_permits), round_up_bonus)
        else:
            reserved_bonus_pool = 0
            random_pool = int(current_permits)
            base_cutoff_point = None

        if reserved_bonus_pool + random_pool != int(current_permits):
            split_mismatch_pairs.append(
                {
                    "hunt_code": hunt_code,
                    "residency": residency,
                    "current_permits": current_permits,
                    "projected_bonus_pool_permits": reserved_bonus_pool,
                    "projected_random_pool_permits": random_pool,
                }
            )

        hunt_corrections = [
            f"{item['hunt_code']}|{item['residency']}|{item['point_level']}"
            for item in corrections_log
            if item["hunt_code"] == hunt_code and item["residency"] == residency
        ]
        corrections_applied = "; ".join(hunt_corrections)

        for apply_with_points in range(32, -1, -1):
            focal_pool = dict(carryover_pool)
            focal_pool[apply_with_points] = focal_pool.get(apply_with_points, 0) + 1

            if uses_bonus_model:
                _, _, focal_allocations, focal_cutoff_point = allocate_bonus_pool(focal_pool, int(current_permits), round_up_bonus)
            else:
                focal_allocations = {point_level: 0 for point_level in range(32, -1, -1)}
                focal_cutoff_point = None

            total_applicants_at_point = carryover_pool.get(apply_with_points, 0)
            guaranteed_draws_at_point = focal_allocations.get(apply_with_points, 0)
            guaranteed_probability = 0.0
            if guaranteed_draws_at_point > 0:
                guaranteed_probability = (guaranteed_draws_at_point / (total_applicants_at_point + 1)) * 100

            remaining_applicants_after_bonus = 0
            remaining_weighted_random_tickets = 0
            projected_random_pool_applicants = 0

            for point_level in range(32, -1, -1):
                remaining = max(0, focal_pool.get(point_level, 0) - focal_allocations.get(point_level, 0))
                if remaining <= 0:
                    continue
                remaining_applicants_after_bonus += remaining
                remaining_weighted_random_tickets += remaining * (point_level + 1)
                if point_level == apply_with_points:
                    projected_random_pool_applicants = max(0, remaining - 1)

            random_probability = 0.0 if guaranteed_probability >= 100 else weighted_random_probability(
                remaining_weighted_random_tickets,
                apply_with_points + 1,
                random_pool,
            )
            projected_total_probability = 100.0 if guaranteed_probability >= 100 else (
                guaranteed_probability + ((100.0 - guaranteed_probability) * random_probability / 100.0)
            )

            cutoff_point = focal_cutoff_point
            cutoff_pressure_ratio = None
            if cutoff_point is not None:
                cutoff_applicants = carryover_pool.get(cutoff_point, 0)
                cutoff_draws = focal_allocations.get(cutoff_point, 0)
                if cutoff_draws > 0:
                    cutoff_pressure_ratio = round((cutoff_applicants + 1) / cutoff_draws, 6)

            is_guaranteed_draw = guaranteed_probability >= 100.0
            is_cutoff_tier = cutoff_point is not None and apply_with_points == cutoff_point and 0 < guaranteed_probability < 100.0

            projected_rows.append(
                {
                    "projection_year": 2026,
                    "hunt_code": hunt_code,
                    "residency": residency,
                    "apply_with_points": apply_with_points,
                    "current_recommended_permits": current_permits,
                    "prior_year_permits": permit_info["prior_permits"],
                    "projected_bonus_pool_permits": reserved_bonus_pool,
                    "projected_random_pool_permits": random_pool,
                    "projected_total_applicants_at_point": total_applicants_at_point,
                    "projected_bonus_pool_applicants": total_applicants_at_point,
                    "projected_random_pool_applicants": projected_random_pool_applicants,
                    "projected_guaranteed_draws_at_point": guaranteed_draws_at_point,
                    "projected_guaranteed_probability_pct": round(guaranteed_probability, 6),
                    "projected_random_probability_pct": round(random_probability, 6),
                    "projected_total_probability_pct": round(projected_total_probability, 6),
                    "projected_bonus_cutoff_point": base_cutoff_point,
                    "projected_cutoff_point": cutoff_point,
                    "projected_cutoff_pressure_ratio": cutoff_pressure_ratio,
                    "projected_remaining_applicants_after_bonus": remaining_applicants_after_bonus,
                    "projected_remaining_weighted_random_tickets": remaining_weighted_random_tickets,
                    "projected_carryover_pool_at_point": carryover_pool.get(apply_with_points, 0),
                    "source_2025_total_applicants": total_2025_applicants,
                    "source_2025_total_winners": total_2025_winners,
                    "projection_method": "2025 odds carry-forward, remove winners, hold 0-point baseline flat, evaluate one focal applicant against 2026 permits",
                    "permit_source_type": permit_info["source_type"],
                    "permit_source_authority": permit_info["source_authority_level"],
                    "permit_source_page_number": permit_info["source_page_number"],
                    "permit_category": permit_info["permit_category"],
                    "section_title": permit_info["section_title"],
                    "hunt_name": permit_info["hunt_name"],
                    "weapon": permit_info["weapon"],
                    "uses_bonus_pool_model": str(uses_bonus_model).lower(),
                    "is_guaranteed_draw": str(is_guaranteed_draw).lower(),
                    "is_cutoff_tier": str(is_cutoff_tier).lower(),
                    "corrections_applied": corrections_applied,
                }
            )

    audit_stats = {
        "correction_count": len(corrections_log),
        "corrected_source_rows": corrections_log,
        "unresolved_source_anomalies": unresolved_anomalies,
        "split_mismatch_pairs": split_mismatch_pairs,
        "skipped_missing_permits": skipped_missing_permits,
    }
    return projected_rows, corrections_log, unresolved_anomalies, audit_stats


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = [
        "projection_year",
        "hunt_code",
        "residency",
        "apply_with_points",
        "current_recommended_permits",
        "prior_year_permits",
        "projected_bonus_pool_permits",
        "projected_random_pool_permits",
        "projected_total_applicants_at_point",
        "projected_bonus_pool_applicants",
        "projected_random_pool_applicants",
        "projected_guaranteed_draws_at_point",
        "projected_guaranteed_probability_pct",
        "projected_random_probability_pct",
        "projected_total_probability_pct",
        "projected_bonus_cutoff_point",
        "projected_cutoff_point",
        "projected_cutoff_pressure_ratio",
        "projected_remaining_applicants_after_bonus",
        "projected_remaining_weighted_random_tickets",
        "projected_carryover_pool_at_point",
        "source_2025_total_applicants",
        "source_2025_total_winners",
        "projection_method",
        "permit_source_type",
        "permit_source_authority",
        "permit_source_page_number",
        "permit_category",
        "section_title",
        "hunt_name",
        "weapon",
        "uses_bonus_pool_model",
        "is_guaranteed_draw",
        "is_cutoff_tier",
        "corrections_applied",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def validate(rows: list[dict[str, object]], audit_stats: dict[str, object]) -> dict[str, object]:
    keys = [(str(r["hunt_code"]), str(r["residency"]), int(r["apply_with_points"])) for r in rows]
    seen: set[tuple[str, str, int]] = set()
    duplicates: list[str] = []
    for key in keys:
        if key in seen:
            duplicates.append(f"{key[0]}|{key[1]}|{key[2]}")
        else:
            seen.add(key)

    per_hunt_counts: dict[str, int] = defaultdict(int)
    split_math_failures: list[dict[str, object]] = []
    unsupported_probability_rows: list[str] = []

    for row in rows:
        per_hunt_counts[str(row["hunt_code"])] += 1
        current_permits = int(row["current_recommended_permits"])
        reserved = int(row["projected_bonus_pool_permits"])
        random_pool = int(row["projected_random_pool_permits"])
        if reserved + random_pool != current_permits:
            split_math_failures.append(
                {
                    "hunt_code": row["hunt_code"],
                    "residency": row["residency"],
                    "current_recommended_permits": current_permits,
                    "projected_bonus_pool_permits": reserved,
                    "projected_random_pool_permits": random_pool,
                }
            )
        total_probability = float(row["projected_total_probability_pct"])
        if total_probability < 0 or total_probability > 100:
            unsupported_probability_rows.append(f"{row['hunt_code']}|{row['residency']}|{row['apply_with_points']}")

    malformed = sorted([hunt_code for hunt_code, count in per_hunt_counts.items() if count not in (33, 66)])

    return {
        "row_count": len(rows),
        "distinct_hunt_code_count": len(set(h for h, _, _ in keys)),
        "duplicate_grain_keys": sorted(set(duplicates)),
        "malformed_hunt_codes": malformed,
        "split_math_failures": split_math_failures,
        "unresolved_source_anomalies": audit_stats["unresolved_source_anomalies"],
        "correction_count": audit_stats["correction_count"],
        "unsupported_probability_rows": unsupported_probability_rows,
    }


def write_corrections_log(corrections_log: list[dict[str, object]], audit_stats: dict[str, object]) -> None:
    payload = {
        "correction_count": len(corrections_log),
        "corrections": corrections_log,
        "unresolved_source_anomalies": audit_stats["unresolved_source_anomalies"],
        "split_mismatch_pairs": audit_stats["split_mismatch_pairs"],
        "skipped_missing_permits": audit_stats["skipped_missing_permits"],
    }
    CORRECTIONS_LOG_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_audit_summary(validation: dict[str, object], audit_stats: dict[str, object]) -> None:
    lines = [
        "# Projected Bonus Draw 2026 Audit Summary",
        "",
        f"- Corrected CSV: `{CSV_PATH}`",
        f"- Row count: `{validation['row_count']}`",
        f"- Distinct hunt codes: `{validation['distinct_hunt_code_count']}`",
        f"- Source-row corrections applied: `{validation['correction_count']}`",
        f"- Duplicate grain keys: `{len(validation['duplicate_grain_keys'])}`",
        f"- Split-math failures: `{len(validation['split_math_failures'])}`",
        f"- Unresolved source anomalies: `{len(validation['unresolved_source_anomalies'])}`",
        "",
        "## Applied Corrections",
        "",
    ]

    if audit_stats["corrected_source_rows"]:
        for item in audit_stats["corrected_source_rows"]:
            changes = ", ".join(
                f"{field['field']}: {field['old']} -> {field['new']}"
                for field in item["changed_fields"]
            )
            lines.append(
                f"- `{item['hunt_code']} {item['residency']} point {item['point_level']}`: {changes}. {item['reason']}"
            )
    else:
        lines.append("- None.")

    lines.extend(["", "## Notes", ""])
    lines.append("- The projected applicant pool is carry-forward only; no speculative applicant growth was added.")
    lines.append("- `projected_total_applicants_at_point` reflects the carry-forward pool only.")
    lines.append("- Probability columns evaluate one focal applicant against that carry-forward pool.")

    AUDIT_SUMMARY_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    projected_rows, corrections_log, unresolved_anomalies, audit_stats = build_projected_rows()
    write_csv(projected_rows, CSV_PATH)
    write_corrections_log(corrections_log, audit_stats)

    validation = validate(projected_rows, audit_stats)
    accepted_for_use = (
        not validation["duplicate_grain_keys"]
        and not validation["malformed_hunt_codes"]
        and not validation["split_math_failures"]
        and not validation["unresolved_source_anomalies"]
        and not validation["unsupported_probability_rows"]
    )
    validation["accepted_for_use"] = accepted_for_use

    acceptance = {
        "accepted_for_use": accepted_for_use,
        "row_count": validation["row_count"],
        "distinct_hunt_code_count": validation["distinct_hunt_code_count"],
        "duplicate_grain_keys": validation["duplicate_grain_keys"],
        "malformed_hunt_codes": validation["malformed_hunt_codes"],
        "split_math_failures": validation["split_math_failures"],
        "unresolved_source_anomalies": validation["unresolved_source_anomalies"],
        "published_output_path": str(PROCESSED_OUTPUT_PATH),
        "published_year_output_path": str(PROCESSED_YEAR_OUTPUT_PATH),
        "corrections_log_path": str(CORRECTIONS_LOG_PATH),
        "audit_summary_path": str(AUDIT_SUMMARY_PATH),
    }
    status = {
        "dataset": "projected_bonus_draw_2026",
        "accepted_for_use": accepted_for_use,
        "source_odds_file": str(DRAW_2025_PATH),
        "source_permits_file": str(PERMITS_2026_PATH),
        "projection_role": "next_year_bonus_draw_projection",
        "published_output_path": str(PROCESSED_OUTPUT_PATH),
        "published_year_output_path": str(PROCESSED_YEAR_OUTPUT_PATH),
        "correction_count": validation["correction_count"],
    }

    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")
    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")
    write_audit_summary(validation, audit_stats)

    if accepted_for_use:
        for target in (PROCESSED_OUTPUT_PATH, PROCESSED_YEAR_OUTPUT_PATH):
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(CSV_PATH, target)
            except OSError:
                pass


if __name__ == "__main__":
    main()
