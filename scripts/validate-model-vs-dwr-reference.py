from __future__ import annotations

import csv
import json
from pathlib import Path


PLANNER_ROOT = Path(r"C:\UOGA HUNTS\HUNT-PLANNER")
PROCESSED = PLANNER_ROOT / "processed_data"
RAW_2026 = Path(r"C:\UOGA HUNTS\raw_data_2026")

LADDER_PATH = PROCESSED / "point_ladder_view.csv"
DRAW_BREAKDOWN_PATH = PROCESSED / "draw_breakdown_2025.csv"
ANTLERLESS_DRAW_PATH = Path(r"C:\UOGA HUNTS\processed_data\2025\antlerless_draw_2025.csv")
SIM_PATH = Path(r"C:\UOGA HUNTS\processed_data\projected_bonus_draw_2026_simulated.csv")

OUT_CSV = RAW_2026 / "model_vs_dwr_reference_compare.csv"
OUT_JSON = RAW_2026 / "model_vs_dwr_reference_summary.json"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def to_pct(value: str | None) -> float | None:
    text = str(value or "").strip()
    if not text or text.upper() == "N/A":
        return None
    if "%" in text:
        try:
            return float(text.replace("%", "").strip())
        except ValueError:
            return None
    if " in " in text:
        try:
            left, right = text.split(" in ", 1)
            return float(left.strip()) / float(right.strip()) * 100.0
        except ValueError:
            return None
    try:
        return float(text)
    except ValueError:
        return None


def build_actual_rows(path: Path, permits_key: str) -> list[dict[str, str]]:
    rows = []
    for row in read_csv(path):
        rows.append(
            {
                "hunt_code": row.get("hunt_code", "").strip(),
                "residency": row.get("residency", "").strip() or "Resident",
                "points": str(int(float(row.get("point_level", "0")))),
                "actual_odds_text": row.get("success_ratio_text", ""),
                "actual_odds_pct": to_pct(row.get("success_ratio_text")),
                "actual_applicants": row.get("applicants", ""),
                "actual_permits": row.get(permits_key, ""),
                "source_table": path.name,
            }
        )
    return rows


def main() -> None:
    actual_rows = build_actual_rows(DRAW_BREAKDOWN_PATH, "total_permits")
    actual_rows.extend(build_actual_rows(ANTLERLESS_DRAW_PATH, "permits_awarded"))

    ladder = {
        (row["hunt_code"], row["residency"], row["points"]): row
        for row in read_csv(LADDER_PATH)
    }
    sim = {
        (row["hunt_code"], row["residency"], row["apply_with_points"]): row
        for row in read_csv(SIM_PATH)
    }

    compare_rows: list[dict[str, object]] = []
    matched = 0
    matched_with_sim = 0
    for row in actual_rows:
        key = (row["hunt_code"], row["residency"], row["points"])
        ladder_row = ladder.get(key, {})
        sim_row = sim.get(key, {})
        if ladder_row:
            matched += 1
        if sim_row:
            matched_with_sim += 1
        compare_rows.append(
            {
                "hunt_code": row["hunt_code"],
                "residency": row["residency"],
                "points": row["points"],
                "source_table": row["source_table"],
                "actual_odds_text": row["actual_odds_text"],
                "actual_odds_pct": "" if row["actual_odds_pct"] is None else f"{row['actual_odds_pct']:.6f}",
                "actual_applicants": row["actual_applicants"],
                "actual_permits": row["actual_permits"],
                "ladder_odds_2025_actual": ladder_row.get("odds_2025_actual", ""),
                "ladder_max_pool_projection_2026": ladder_row.get("max_pool_projection_2026", ""),
                "ladder_random_draw_projection_2026": ladder_row.get("random_draw_projection_2026", ""),
                "ladder_odds_2026_projected": ladder_row.get("odds_2026_projected", ""),
                "sim_guaranteed_probability_pct": sim_row.get("projected_guaranteed_probability_pct", ""),
                "sim_random_probability_pct": sim_row.get("projected_random_probability_pct", ""),
                "sim_total_probability_pct": sim_row.get("projected_total_probability_pct", ""),
            }
        )

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(compare_rows[0].keys()))
        writer.writeheader()
        writer.writerows(compare_rows)

    summary = {
        "reference_rows": len(actual_rows),
        "matched_ladder_rows": matched,
        "matched_sim_rows": matched_with_sim,
        "output_csv": str(OUT_CSV),
    }
    OUT_JSON.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
