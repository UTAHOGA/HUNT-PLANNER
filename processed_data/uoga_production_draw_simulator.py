#!/usr/bin/env python3
"""U.O.G.A. production Monte Carlo draw simulator.

Purpose
-------
Production-grade Utah-style weighted random draw simulation with:
- deterministic max/preference pool handling
- weighted random pool simulation without replacement
- support for stacked historical master datasets
- flexible column detection for UOGA pipeline files

Notes
-----
This script does not hard-code one permit split rule if split columns already exist.
Priority order:
1) Use explicit split columns from the input dataset when present.
2) Otherwise use a fallback split function.

Weighted random selection uses the Efraimidis-Spirakis method for weighted sampling
without replacement, which is efficient and mathematically sound for this use case.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import random
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import pandas as pd


# -----------------------------
# Config / flexible column map
# -----------------------------
COLUMN_ALIASES: Dict[str, Sequence[str]] = {
    "year": ["year"],
    "species": ["species"],
    "hunt_code": ["hunt_code", "hunt_number", "hunt"],
    "hunt_name": ["hunt_name", "hunt_title", "unit"],
    "point_level": ["point_level", "points", "point", "bonus_points", "preference_points"],
    "res_applicants": ["res_applicants", "resident_applicants", "res_total_applicants"],
    "nr_applicants": ["nr_applicants", "nonresident_applicants", "nr_total_applicants"],
    "res_success": ["res_success", "resident_success", "res_successful_applicants", "resident_successful_applicants"],
    "nr_success": ["nr_success", "nonresident_success", "nr_successful_applicants", "nonresident_successful_applicants"],
    "res_permits": ["res_permits", "resident_permits"],
    "nr_permits": ["nr_permits", "nonresident_permits"],
    "res_max": ["res_max", "resident_max_permits", "res_max_permits", "resident_bonus_permits"],
    "res_random": ["res_random", "resident_random_permits", "res_random_permits", "resident_regular_permits"],
    "nr_max": ["nr_max", "nonresident_max_permits", "nr_max_permits", "nonresident_bonus_permits"],
    "nr_random": ["nr_random", "nonresident_random_permits", "nr_random_permits", "nonresident_regular_permits"],
    "success_rate": ["success_rate", "harvest_success_rate"],
    "harvest": ["harvest"],
    "hunters": ["hunters"],
}


@dataclass(frozen=True)
class Bucket:
    points: int
    applicants: int
    success: int = 0


@dataclass
class ResidencyResult:
    residency: str
    total_permits: int
    max_permits: int
    random_permits: int
    deterministic_max_cutoff: Optional[int]
    deterministic_max_status: str
    random_probability: float
    combined_probability: float


# -----------------------------
# Utility helpers
# -----------------------------
def detect_column(df: pd.DataFrame, key: str) -> Optional[str]:
    for alias in COLUMN_ALIASES.get(key, []):
        if alias in df.columns:
            return alias
    return None


def require_column(df: pd.DataFrame, key: str) -> str:
    col = detect_column(df, key)
    if col is None:
        raise KeyError(f"Missing required column for '{key}'. Tried aliases: {COLUMN_ALIASES.get(key, [])}")
    return col


def safe_int(value) -> int:
    if pd.isna(value):
        return 0
    if isinstance(value, str):
        value = value.strip().replace(",", "")
        if value == "" or value.upper() == "N/A":
            return 0
    return int(float(value))


def fallback_split(permits: int) -> Tuple[int, int]:
    """Fallback only when explicit split columns are absent.

    Current default mirrors the user's most recent locked simplified rule:
    single permit -> random only
    otherwise max = floor(total/2), random = remainder
    """
    if permits <= 0:
        return 0, 0
    if permits == 1:
        return 0, 1
    max_pool = permits // 2
    random_pool = permits - max_pool
    return max_pool, random_pool


# -----------------------------
# Deterministic max-pool logic
# -----------------------------
def deterministic_max_draw(buckets: List[Bucket], max_permits: int, focal_points: int) -> Tuple[Optional[int], str, int]:
    """Returns cutoff, status, and remaining focal applicants eligible for random.

    Status:
    - GUARANTEED_MAX
    - TIE_AT_CUTOFF
    - BELOW_MAX
    - NO_MAX_POOL
    """
    if max_permits <= 0:
        return None, "NO_MAX_POOL", 1

    ordered = sorted(buckets, key=lambda b: b.points, reverse=True)
    permits_left = max_permits
    cutoff = None
    focal_remaining = 1

    for bucket in ordered:
        if permits_left <= 0:
            break
        if bucket.applicants <= 0:
            continue
        cutoff = bucket.points
        if bucket.points > focal_points:
            permits_left -= bucket.applicants
            continue
        if bucket.points == focal_points:
            if permits_left >= bucket.applicants:
                return cutoff, "GUARANTEED_MAX", 0
            return cutoff, "TIE_AT_CUTOFF", 1
        if bucket.points < focal_points:
            break

    return cutoff, "BELOW_MAX", 1


# -----------------------------
# Weighted random draw
# -----------------------------
def weighted_sample_without_replacement(weights: List[float], k: int, rng: random.Random) -> List[int]:
    """Efraimidis-Spirakis weighted sampling without replacement.

    For each item with weight w > 0, draw key = U^(1/w). Take top-k keys.
    """
    if k <= 0 or not weights:
        return []
    keyed: List[Tuple[float, int]] = []
    for idx, w in enumerate(weights):
        if w <= 0:
            continue
        u = rng.random()
        while u == 0.0:
            u = rng.random()
        key = u ** (1.0 / w)
        keyed.append((key, idx))
    keyed.sort(reverse=True)
    return [idx for _, idx in keyed[:k]]


def build_random_pool_individual_weights(buckets: List[Bucket], focal_points: int) -> Tuple[List[float], int]:
    """Expand only counts, not literal ticket copies. Each applicant gets weight=points+1.

    Returns weights list and focal applicant index.
    """
    weights: List[float] = []
    focal_index = -1

    for bucket in buckets:
        for _ in range(bucket.applicants):
            weights.append(bucket.points + 1)

    focal_index = len(weights)
    weights.append(focal_points + 1)
    return weights, focal_index


def monte_carlo_random_probability(
    buckets: List[Bucket],
    random_permits: int,
    focal_points: int,
    iterations: int,
    seed: int,
) -> float:
    if random_permits <= 0:
        return 0.0
    rng = random.Random(seed)
    wins = 0
    weights, focal_index = build_random_pool_individual_weights(buckets, focal_points)

    for _ in range(iterations):
        winners = weighted_sample_without_replacement(weights, random_permits, rng)
        if focal_index in winners:
            wins += 1
    return wins / iterations


# -----------------------------
# Data shaping
# -----------------------------
def load_dataset(path: str) -> pd.DataFrame:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    if path.lower().endswith(".csv"):
        return pd.read_csv(path)
    if path.lower().endswith((".xlsx", ".xls")):
        return pd.read_excel(path)
    raise ValueError(f"Unsupported input format: {path}")


def normalize_draw_dataset(df: pd.DataFrame) -> pd.DataFrame:
    hunt_code = require_column(df, "hunt_code")
    point_level = require_column(df, "point_level")

    colmap = {"hunt_code": hunt_code, "point_level": point_level}
    optional = [
        "year", "species", "hunt_name", "res_applicants", "nr_applicants", "res_success", "nr_success",
        "res_permits", "nr_permits", "res_max", "res_random", "nr_max", "nr_random"
    ]
    for key in optional:
        col = detect_column(df, key)
        if col:
            colmap[key] = col

    out = pd.DataFrame()
    for key, col in colmap.items():
        out[key] = df[col]

    out["hunt_code"] = out["hunt_code"].astype(str).str.strip().str.upper()
    out["point_level"] = out["point_level"].apply(safe_int)

    for col in [
        "res_applicants", "nr_applicants", "res_success", "nr_success",
        "res_permits", "nr_permits", "res_max", "res_random", "nr_max", "nr_random"
    ]:
        if col in out.columns:
            out[col] = out[col].apply(safe_int)
        else:
            out[col] = 0

    if "year" not in out.columns:
        out["year"] = None
    if "species" not in out.columns:
        out["species"] = None
    if "hunt_name" not in out.columns:
        out["hunt_name"] = None

    return out


def build_hunt_buckets(df: pd.DataFrame, hunt_code_value: str, residency: str) -> List[Bucket]:
    sub = df[df["hunt_code"] == hunt_code_value].copy()
    app_col = "res_applicants" if residency == "res" else "nr_applicants"
    success_col = "res_success" if residency == "res" else "nr_success"

    grouped = sub.groupby("point_level", as_index=False)[[app_col, success_col]].sum()
    return [Bucket(points=int(r["point_level"]), applicants=int(r[app_col]), success=int(r[success_col])) for _, r in grouped.iterrows()]


def detect_or_compute_split(sub: pd.DataFrame, residency: str) -> Tuple[int, int, int]:
    permits_col = "res_permits" if residency == "res" else "nr_permits"
    max_col = "res_max" if residency == "res" else "nr_max"
    random_col = "res_random" if residency == "res" else "nr_random"

    total_permits = int(sub[permits_col].max()) if permits_col in sub.columns else int(sub[("res_success" if residency=="res" else "nr_success")].sum())
    explicit_max = int(sub[max_col].max()) if max_col in sub.columns else 0
    explicit_random = int(sub[random_col].max()) if random_col in sub.columns else 0

    if explicit_max or explicit_random:
        return total_permits, explicit_max, explicit_random

    max_pool, random_pool = fallback_split(total_permits)
    return total_permits, max_pool, random_pool


# -----------------------------
# Simulation entry points
# -----------------------------
def simulate_hunt(
    df: pd.DataFrame,
    hunt_code_value: str,
    focal_points_res: Optional[int],
    focal_points_nr: Optional[int],
    iterations: int,
    seed: int,
) -> List[ResidencyResult]:
    results: List[ResidencyResult] = []
    sub = df[df["hunt_code"] == hunt_code_value].copy()
    if sub.empty:
        raise ValueError(f"Hunt code not found: {hunt_code_value}")

    for residency, focal_points in (("res", focal_points_res), ("nr", focal_points_nr)):
        if focal_points is None:
            continue
        buckets = build_hunt_buckets(df, hunt_code_value, residency)
        total_permits, max_permits, random_permits = detect_or_compute_split(sub, residency)
        cutoff, status, focal_remaining = deterministic_max_draw(buckets, max_permits, focal_points)

        if status == "GUARANTEED_MAX":
            random_prob = 0.0
            combined = 1.0
        else:
            random_prob = monte_carlo_random_probability(
                buckets=buckets,
                random_permits=random_permits,
                focal_points=focal_points,
                iterations=iterations,
                seed=seed + (1 if residency == "nr" else 0),
            )
            combined = random_prob

        results.append(
            ResidencyResult(
                residency=residency,
                total_permits=total_permits,
                max_permits=max_permits,
                random_permits=random_permits,
                deterministic_max_cutoff=cutoff,
                deterministic_max_status=status,
                random_probability=round(random_prob, 6),
                combined_probability=round(combined, 6),
            )
        )
    return results


def stack_historical_draws(paths: List[str]) -> pd.DataFrame:
    frames = [normalize_draw_dataset(load_dataset(p)) for p in paths]
    return pd.concat(frames, ignore_index=True)


# -----------------------------
# CLI
# -----------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="UOGA production draw simulator")
    subparsers = parser.add_subparsers(dest="command", required=True)

    stack_parser = subparsers.add_parser("stack", help="Stack multiple normalized draw datasets into one historical master")
    stack_parser.add_argument("inputs", nargs="+", help="Input CSV/XLSX draw datasets")
    stack_parser.add_argument("--output", required=True, help="Output CSV path")

    sim_parser = subparsers.add_parser("simulate", help="Simulate a single hunt for focal points")
    sim_parser.add_argument("input", help="Historical or single-year normalized draw dataset")
    sim_parser.add_argument("hunt_code", help="Hunt code to simulate")
    sim_parser.add_argument("--res-points", type=int, default=None)
    sim_parser.add_argument("--nr-points", type=int, default=None)
    sim_parser.add_argument("--iterations", type=int, default=50000)
    sim_parser.add_argument("--seed", type=int, default=42)
    sim_parser.add_argument("--output", default=None, help="Optional JSON output file")

    args = parser.parse_args()

    if args.command == "stack":
        master = stack_historical_draws(args.inputs)
        master.to_csv(args.output, index=False)
        print(f"wrote {args.output} rows={len(master)}")
        return

    if args.command == "simulate":
        df = normalize_draw_dataset(load_dataset(args.input))
        results = simulate_hunt(
            df=df,
            hunt_code_value=args.hunt_code.strip().upper(),
            focal_points_res=args.res_points,
            focal_points_nr=args.nr_points,
            iterations=args.iterations,
            seed=args.seed,
        )
        payload = [r.__dict__ for r in results]
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            print(f"wrote {args.output}")
        else:
            print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
