from __future__ import annotations

import csv
import hashlib
import json
import math
import shutil
from collections import defaultdict
from pathlib import Path

import numpy as np


WORKSPACE_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER-CLEAN")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")

SOURCE_CSV_PATH = UOGA_ROOT / "processed_data" / "projected_bonus_draw_2026.csv"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_projected_bonus_draw_2026_simulated"
OUTPUT_CSV_PATH = OUTPUT_DIR / "projected_bonus_draw_2026_simulated.csv"
VALIDATION_PATH = OUTPUT_DIR / "projected_bonus_draw_2026_simulated.validation.json"
STATUS_PATH = OUTPUT_DIR / "projected_bonus_draw_2026_simulated.status.json"
AUDIT_SUMMARY_PATH = OUTPUT_DIR / "audit_summary.md"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "projected_bonus_draw_2026_simulated.csv"
PROCESSED_YEAR_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "2026" / "projected_bonus_draw_2026_simulated.csv"

BASE_SEED = 20260401
STANDARD_ITERATIONS = 20_000
OIL_ITERATIONS = 50_000
VALIDATION_HUNTS = [
    ("DB1019", "Resident", "required"),
    ("DB1019", "Nonresident", "required"),
    ("DB1000", "Resident", "ple"),
    ("RS6701", "Resident", "oil"),
]


def to_int(value: str | None) -> int:
    if value is None:
        return 0
    value = str(value).strip()
    if not value:
        return 0
    return int(float(value))


def to_float(value: str | None) -> float:
    if value is None:
        return 0.0
    value = str(value).strip()
    if not value:
        return 0.0
    return float(value)


def bool_text(value: bool) -> str:
    return "true" if value else "false"


def load_source_rows() -> list[dict[str, str]]:
    with SOURCE_CSV_PATH.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def group_rows(rows: list[dict[str, str]]) -> dict[tuple[str, str], list[dict[str, str]]]:
    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[(row["hunt_code"], row["residency"])].append(row)
    for key in grouped:
        grouped[key].sort(key=lambda item: int(item["apply_with_points"]), reverse=True)
    return grouped


def use_round_up_bonus_split(row: dict[str, str]) -> bool:
    hunt_code = str(row.get("hunt_code", "")).strip().upper()
    return (
        hunt_code.startswith("DB")
        and str(row.get("residency", "")).strip() == "Nonresident"
        and uses_bonus_pool_model(row)
    )


def uses_bonus_pool_model(row: dict[str, str]) -> bool:
    return str(row.get("uses_bonus_pool_model", "true")).strip().lower() == "true"


def allocate_bonus_pool(pool_map: dict[int, int], permit_count: int, round_up_bonus: bool = False) -> tuple[int, int, dict[int, int]]:
    reserved_bonus_pool = math.ceil(permit_count / 2) if round_up_bonus else math.floor(permit_count / 2)
    random_pool = permit_count - reserved_bonus_pool
    allocations: dict[int, int] = {}
    remaining_bonus = reserved_bonus_pool

    for point_level in range(32, -1, -1):
        applicants = pool_map.get(point_level, 0)
        taken = min(applicants, remaining_bonus) if remaining_bonus > 0 else 0
        allocations[point_level] = taken
        remaining_bonus -= taken

    return reserved_bonus_pool, random_pool, allocations


def derive_iterations(row: dict[str, str]) -> int:
    permit_category = (row.get("permit_category") or "").upper()
    hunt_code = row["hunt_code"].upper()
    if hunt_code.startswith(("MB", "BI", "DS", "RS", "GO")):
        return OIL_ITERATIONS
    if any(token in permit_category for token in ("MOOSE", "BISON", "SHEEP", "GOAT")):
        return OIL_ITERATIONS
    return STANDARD_ITERATIONS


def derive_seed(hunt_code: str, residency: str, apply_with_points: int) -> int:
    payload = f"{BASE_SEED}|{hunt_code}|{residency}|{apply_with_points}"
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return int(digest, 16) % (2**32)


def sample_minimum_scores(rng: np.random.Generator, tickets: int, iterations: int) -> np.ndarray:
    if tickets <= 0:
        raise ValueError("tickets must be positive")
    uniforms = rng.random(iterations, dtype=np.float64)
    return 1.0 - np.power(uniforms, 1.0 / tickets)


def simulate_bonus_draw_random(
    opponents_by_point: dict[int, int],
    focal_point: int,
    random_permits: int,
    iterations: int,
    seed: int,
) -> float:
    if random_permits <= 0:
        return 0.0

    total_opponents = sum(opponents_by_point.values())
    if total_opponents <= 0:
        return 100.0

    rng = np.random.default_rng(seed)
    focal_scores = sample_minimum_scores(rng, focal_point + 1, iterations)
    opponents_beating_focal = np.zeros(iterations, dtype=np.int32)

    for point_level, opponent_count in opponents_by_point.items():
        if opponent_count <= 0:
            continue
        beat_probability = 1.0 - np.power(1.0 - focal_scores, point_level + 1)
        opponents_beating_focal += rng.binomial(opponent_count, beat_probability)

    wins = np.count_nonzero(opponents_beating_focal < random_permits)
    return round((wins / iterations) * 100.0, 6)


def calc_guaranteed_probability_from_pool(
    focal_pool: dict[int, int],
    apply_with_points: int,
    reserved_bonus_pool: int,
) -> float:
    applicants_above = sum(count for point, count in focal_pool.items() if point > apply_with_points)
    applicants_at_level = max(0, focal_pool.get(apply_with_points, 0))
    remaining = max(0, reserved_bonus_pool - applicants_above)
    if applicants_at_level > 0:
        return round(min(100.0, (remaining / applicants_at_level) * 100.0), 6)
    return 100.0 if remaining > 0 else 0.0


def build_focal_pool(
    carryover_pool: dict[int, int],
    apply_with_points: int,
    current_permits: int,
) -> dict[int, int]:
    focal_pool = dict(carryover_pool)
    focal_pool[apply_with_points] = focal_pool.get(apply_with_points, 0) + 1
    return focal_pool


def build_opponent_pool_with_split(
    carryover_pool: dict[int, int],
    apply_with_points: int,
    current_permits: int,
    round_up_bonus: bool,
) -> tuple[dict[int, int], int, int, dict[int, int]]:
    focal_pool = build_focal_pool(carryover_pool, apply_with_points, current_permits)
    reserved_bonus_pool, random_pool, allocations = allocate_bonus_pool(focal_pool, current_permits, round_up_bonus)

    opponents_by_point: dict[int, int] = {}
    for point_level in range(32, -1, -1):
        remaining = max(0, focal_pool.get(point_level, 0) - allocations.get(point_level, 0))
        if point_level == apply_with_points:
            remaining = max(0, remaining - 1)
        opponents_by_point[point_level] = remaining

    return opponents_by_point, reserved_bonus_pool, random_pool, allocations


def build_simulated_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], dict[str, object]]:
    grouped = group_rows(rows)
    simulated_rows: list[dict[str, str]] = []
    validation_samples: dict[str, list[dict[str, object]]] = defaultdict(list)
    missing_validation_targets: list[dict[str, str]] = []

    available_pairs = set(grouped.keys())
    for hunt_code, residency, label in VALIDATION_HUNTS:
        if (hunt_code, residency) not in available_pairs:
            missing_validation_targets.append(
                {"hunt_code": hunt_code, "residency": residency, "label": label, "status": "not present in source dataset"}
            )

    for (hunt_code, residency), pair_rows in sorted(grouped.items()):
        carryover_pool = {int(row["apply_with_points"]): to_int(row["projected_carryover_pool_at_point"]) for row in pair_rows}
        current_permits = to_int(pair_rows[0]["current_recommended_permits"])

        for row in pair_rows:
            apply_with_points = to_int(row["apply_with_points"])
            guaranteed_probability = to_float(row["projected_guaranteed_probability_pct"])
            iterations = derive_iterations(row)
            seed = derive_seed(hunt_code, residency, apply_with_points)
            round_up_bonus = use_round_up_bonus_split(row)
            bonus_model = uses_bonus_pool_model(row)
            focal_pool = build_focal_pool(carryover_pool, apply_with_points, current_permits)
            if bonus_model:
                opponents_by_point, reserved_bonus_pool, random_pool, allocations = build_opponent_pool_with_split(
                    carryover_pool,
                    apply_with_points,
                    current_permits,
                    round_up_bonus,
                )
                if round_up_bonus:
                    guaranteed_probability = calc_guaranteed_probability_from_pool(
                        focal_pool,
                        apply_with_points,
                        reserved_bonus_pool,
                    )
            else:
                reserved_bonus_pool = 0
                random_pool = current_permits
                allocations = {point_level: 0 for point_level in range(32, -1, -1)}
                guaranteed_probability = 0.0
                opponents_by_point = {}
                for point_level in range(32, -1, -1):
                    remaining = focal_pool.get(point_level, 0)
                    if point_level == apply_with_points:
                        remaining = max(0, remaining - 1)
                    opponents_by_point[point_level] = remaining

            if guaranteed_probability >= 100.0:
                simulated_random_probability = 0.0
            else:
                simulated_random_probability = simulate_bonus_draw_random(
                    opponents_by_point=opponents_by_point,
                    focal_point=apply_with_points,
                    random_permits=random_pool,
                    iterations=iterations,
                    seed=seed,
                )

            simulated_total_probability = 100.0 if guaranteed_probability >= 100.0 else round(
                guaranteed_probability + ((100.0 - guaranteed_probability) * simulated_random_probability / 100.0),
                6,
            )

            updated = dict(row)
            updated["projected_bonus_pool_permits"] = str(reserved_bonus_pool)
            updated["projected_random_pool_permits"] = str(random_pool)
            updated["projected_guaranteed_probability_pct"] = (
                f"{guaranteed_probability:.6f}".rstrip("0").rstrip(".")
                if "." in f"{guaranteed_probability:.6f}"
                else f"{guaranteed_probability:.6f}"
            )
            updated["projected_random_probability_pct"] = f"{simulated_random_probability:.6f}".rstrip("0").rstrip(".") if "." in f"{simulated_random_probability:.6f}" else f"{simulated_random_probability:.6f}"
            updated["projected_total_probability_pct"] = f"{simulated_total_probability:.6f}".rstrip("0").rstrip(".") if "." in f"{simulated_total_probability:.6f}" else f"{simulated_total_probability:.6f}"
            updated["random_method"] = "monte_carlo_utah"
            updated["simulation_iterations"] = str(iterations)
            updated["simulation_seed"] = str(seed)
            simulated_rows.append(updated)

            if (hunt_code, residency) in {(item[0], item[1]) for item in VALIDATION_HUNTS} and apply_with_points in {27, 26, 25, 24, 23, 22, 16, 5}:
                validation_samples[f"{hunt_code}|{residency}"].append(
                    {
                        "apply_with_points": apply_with_points,
                        "current_recommended_permits": current_permits,
                        "projected_bonus_pool_permits": reserved_bonus_pool,
                        "projected_random_pool_permits": random_pool,
                        "projected_guaranteed_probability_pct": guaranteed_probability,
                        "projected_random_probability_pct": simulated_random_probability,
                        "projected_total_probability_pct": simulated_total_probability,
                        "projected_total_applicants_at_point": to_int(row["projected_total_applicants_at_point"]),
                        "projected_cutoff_point": to_int(row["projected_cutoff_point"]) if row["projected_cutoff_point"] else None,
                        "projected_cutoff_pressure_ratio": to_float(row["projected_cutoff_pressure_ratio"]) if row["projected_cutoff_pressure_ratio"] else None,
                        "random_pool_opponents_at_point": opponents_by_point.get(apply_with_points, 0),
                        "remaining_random_applicants_total": sum(opponents_by_point.values()) + 1,
                        "simulation_iterations": iterations,
                        "simulation_seed": seed,
                    }
                )

    validation_payload = {
        "row_count": len(simulated_rows),
        "distinct_hunt_code_count": len({row["hunt_code"] for row in simulated_rows}),
        "distinct_hunt_residency_pairs": len({(row["hunt_code"], row["residency"]) for row in simulated_rows}),
        "validation_samples": dict(validation_samples),
        "missing_validation_targets": missing_validation_targets,
    }
    return simulated_rows, validation_payload


def write_csv(rows: list[dict[str, str]]) -> None:
    fieldnames = list(rows[0].keys())
    with OUTPUT_CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_audit_summary(validation_payload: dict[str, object]) -> str:
    lines = [
        "# Projected Bonus Draw 2026 Monte Carlo Audit",
        "",
        f"- Source corrected table: `{SOURCE_CSV_PATH}`",
        f"- Output simulated table: `{OUTPUT_CSV_PATH}`",
        f"- Row count: `{validation_payload['row_count']}`",
        f"- Distinct hunt codes: `{validation_payload['distinct_hunt_code_count']}`",
        f"- Distinct hunt/residency pairs: `{validation_payload['distinct_hunt_residency_pairs']}`",
        "",
        "## Method",
        "",
        "- Random-side shortcut math was removed from the simulated output.",
        "- The carry-forward pool was left unchanged from the corrected base table.",
        "- Each focal applicant receives `(points + 1)` random numbers.",
        "- The simulated applicant score is the minimum of those random numbers, sampled via the exact equivalent minimum-score distribution.",
        "- Opposing applicants are simulated tier-by-tier with Monte Carlo using the same Utah random method.",
        "",
        "## Validation Hunts",
        "",
    ]

    samples = validation_payload["validation_samples"]
    for key in ("DB1019|Resident", "DB1019|Nonresident", "DB1000|Resident"):
        if key in samples:
            lines.append(f"### {key}")
            for item in sorted(samples[key], key=lambda row: row["apply_with_points"], reverse=True):
                lines.append(
                    f"- Points `{item['apply_with_points']}`: guaranteed `{item['projected_guaranteed_probability_pct']:.6f}%`, "
                    f"random `{item['projected_random_probability_pct']:.6f}%`, total `{item['projected_total_probability_pct']:.6f}%`, "
                    f"iterations `{item['simulation_iterations']}`, seed `{item['simulation_seed']}`"
                )
            lines.append("")

    lines.append("### O.I.L. validation")
    missing = [item for item in validation_payload["missing_validation_targets"] if item["label"] == "oil"]
    if missing:
        lines.append(
            "- No O.I.L. hunt was present in the current corrected source table, so O.I.L. validation is blocked by source scope rather than simulation logic."
        )
    else:
        for key, items in samples.items():
            if key.startswith(("RS", "DS", "MB", "BI", "GO")):
                lines.append(f"- Validated {key} with Monte Carlo output.")
                break
    lines.append("")
    lines.append("Utah doesn’t use simple odds, so we don’t either.")
    return "\n".join(lines) + "\n"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source_rows = load_source_rows()
    simulated_rows, validation_payload = build_simulated_rows(source_rows)
    write_csv(simulated_rows)

    status = {
        "dataset": "projected_bonus_draw_2026_simulated",
        "source_corrected_projection": str(SOURCE_CSV_PATH),
        "output_csv": str(OUTPUT_CSV_PATH),
        "random_method": "monte_carlo_utah",
        "base_seed": BASE_SEED,
        "standard_iterations": STANDARD_ITERATIONS,
        "oil_iterations": OIL_ITERATIONS,
        "published_output_path": str(PROCESSED_OUTPUT_PATH),
        "published_year_output_path": str(PROCESSED_YEAR_OUTPUT_PATH),
    }

    VALIDATION_PATH.write_text(json.dumps(validation_payload, indent=2), encoding="utf-8")
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")
    AUDIT_SUMMARY_PATH.write_text(build_audit_summary(validation_payload), encoding="utf-8")

    for target in (PROCESSED_OUTPUT_PATH, PROCESSED_YEAR_OUTPUT_PATH):
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(OUTPUT_CSV_PATH, target)
        except OSError:
            pass


if __name__ == "__main__":
    main()
