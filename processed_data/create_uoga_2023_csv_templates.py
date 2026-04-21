#!/usr/bin/env python3
"""
Create empty 2023 database CSV templates for the UOGA hunt project.

Outputs:
- hunt_master_2023.csv
- draw_breakdown_2023.csv
- permit_split_2023.csv
- harvest_2023.csv
- uoga_2023_master.csv

Usage:
    python create_uoga_2023_csv_templates.py
    python create_uoga_2023_csv_templates.py "C:\\UOGA HUNTS\\processed_data"
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

CSV_SCHEMAS = {
    "hunt_master_2023.csv": [
        "year",
        "hunt_code",
        "hunt_name",
        "species",
        "sex_type",
        "hunt_type",
        "weapon",
        "hunt_class",
        "res_permits",
        "nr_permits",
        "total_permits",
        "access_type",
        "is_youth",
        "is_dedicated_hunter",
        "is_antlerless",
        "is_once_in_a_lifetime",
        "is_general_season",
        "is_limited_entry",
        "draw_system",
        "pool_rule",
        "private_land_only_flag",
        "cwmu_flag",
        "expo_affected_flag",
        "conservation_permit_adjusted_flag",
        "multi_tag_flag",
        "source_draw_file",
        "source_harvest_file",
    ],
    "draw_breakdown_2023.csv": [
        "year",
        "hunt_code",
        "species",
        "residency",
        "point_level",
        "applicants",
        "successful_applicants",
        "success_ratio_text",
        "bonus_permits_at_point",
        "regular_permits_at_point",
        "total_permits_at_point",
    ],
    "permit_split_2023.csv": [
        "year",
        "hunt_code",
        "species",
        "residency",
        "total_permits",
        "max_pool_permits",
        "random_pool_permits",
        "single_permit_random_only_flag",
    ],
    "harvest_2023.csv": [
        "year",
        "hunt_code",
        "species",
        "hunters",
        "harvest",
        "success_rate",
        "avg_days_hunted",
        "days_per_harvest",
        "source_harvest_file",
    ],
    "uoga_2023_master.csv": [
        "year",
        "species",
        "hunt_code",
        "hunt_name",
        "sex_type",
        "hunt_type",
        "weapon",
        "hunt_class",
        "residency",
        "point_level",
        "res_permits",
        "nr_permits",
        "total_permits",
        "res_applicants",
        "nr_applicants",
        "res_success",
        "nr_success",
        "harvest",
        "success_rate",
        "avg_days_hunted",
        "days_per_harvest",
        "max_pool_res",
        "random_pool_res",
        "max_pool_nr",
        "random_pool_nr",
        "draw_system",
        "pool_rule",
        "private_land_only_flag",
        "cwmu_flag",
        "expo_affected_flag",
        "conservation_permit_adjusted_flag",
        "multi_tag_flag",
        "source_draw_file",
        "source_harvest_file",
    ],
}


def create_csv(path: Path, headers: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)


def main() -> int:
    output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    output_dir = output_dir.expanduser()

    print(f"Creating CSV templates in: {output_dir}")
    for filename, headers in CSV_SCHEMAS.items():
        out_path = output_dir / filename
        create_csv(out_path, headers)
        print(f"Created: {out_path}")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
