from __future__ import annotations

import csv
from pathlib import Path


REFERENCE_PATH = Path(r"C:\UOGA HUNTS\raw_data_2026\antlerless_reference_odds_2025.csv")
LADDER_PATH = Path(r"C:\UOGA HUNTS\HUNT-PLANNER\processed_data\point_ladder_view.csv")
SIM_PATH = Path(r"C:\UOGA HUNTS\processed_data\projected_bonus_draw_2026_simulated.csv")
OUT_PATH = Path(r"C:\UOGA HUNTS\raw_data_2026\antlerless_model_compare.csv")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    ladder_by_key = {
        (row["hunt_code"], row["residency"], row["points"]): row
        for row in read_csv(LADDER_PATH)
    }
    sim_by_key = {
        (row["hunt_code"], row["residency"], row["apply_with_points"]): row
        for row in read_csv(SIM_PATH)
        if row.get("hunt_code") and row.get("residency") and row.get("apply_with_points")
    }

    rows_out: list[dict[str, object]] = []
    for row in read_csv(REFERENCE_PATH):
        key = (row["hunt_code"], row["residency"], row["points"])
        ladder = ladder_by_key.get(key, {})
        sim = sim_by_key.get(key, {})
        rows_out.append(
            {
                "hunt_code": row["hunt_code"],
                "hunt_name": row["hunt_name"],
                "residency": row["residency"],
                "points": row["points"],
                "reference_applicants": row["applicants"],
                "reference_total_permits": row["total_permits"],
                "reference_success_ratio_text": row["success_ratio_text"],
                "reference_success_pct": row["success_pct"],
                "model_max_pool_projection_2026": ladder.get("max_pool_projection_2026", ""),
                "model_random_draw_projection_2026": ladder.get("random_draw_projection_2026", ""),
                "model_odds_2026_projected": ladder.get("odds_2026_projected", ""),
                "sim_guaranteed_probability_pct": sim.get("projected_guaranteed_probability_pct", ""),
                "sim_random_probability_pct": sim.get("projected_random_probability_pct", ""),
                "sim_total_probability_pct": sim.get("projected_total_probability_pct", ""),
            }
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows_out[0].keys()))
        writer.writeheader()
        writer.writerows(rows_out)

    print(f"Wrote {len(rows_out)} rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
