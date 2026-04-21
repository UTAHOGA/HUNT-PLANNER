import json
from pathlib import Path


ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
INPUT_PATH = ROOT / "processed_data" / "hunt_research_2026.json"
OUTPUT_DIR = ROOT / "processed_data" / "hunt_research_2026_split"
DETAIL_DIR = OUTPUT_DIR / "hunts"
UPLOAD_DIR = ROOT / "cloudflare-upload" / "hunt_research_2026_split"
UPLOAD_DETAIL_DIR = UPLOAD_DIR / "hunts"


def compact_projection_rows(rows):
    compact = []
    for row in rows or []:
      compact.append({
          "apply_with_points": row.get("apply_with_points"),
          "projected_total_probability_pct": row.get("projected_total_probability_pct"),
          "projected_guaranteed_probability_pct": row.get("projected_guaranteed_probability_pct"),
          "projected_random_probability_pct": row.get("projected_random_probability_pct"),
          "projected_cutoff_point": row.get("projected_cutoff_point"),
          "is_guaranteed_draw": row.get("is_guaranteed_draw"),
          "is_cutoff_tier": row.get("is_cutoff_tier"),
      })
    return compact


def compact_preference_rows(rows):
    compact = []
    for row in rows or []:
        compact.append({
            "point_level": row.get("point_level"),
            "success_ratio_text": row.get("success_ratio_text"),
            "permits_awarded": row.get("permits_awarded"),
            "applicants": row.get("applicants"),
        })
    return compact


def build_index_row(hunt):
    return {
        "hunt_code": hunt.get("hunt_code"),
        "species": hunt.get("species"),
        "hunt_name": hunt.get("hunt_name"),
        "hunt_type": hunt.get("hunt_type"),
        "weapon": hunt.get("weapon"),
        "sex_type": hunt.get("sex_type"),
        "access_type": hunt.get("access_type"),
        "permits_total": hunt.get("permits_total"),
        "hunters": hunt.get("hunters"),
        "harvest": hunt.get("harvest"),
        "percent_success": hunt.get("percent_success"),
        "avg_days": hunt.get("avg_days"),
        "satisfaction": hunt.get("satisfaction"),
        "has_harvest": hunt.get("has_harvest"),
        "has_bonus_draw": hunt.get("has_bonus_draw"),
        "has_antlerless_draw": hunt.get("has_antlerless_draw"),
        "draw_family": hunt.get("draw_family"),
        "draw_presence_flag": hunt.get("draw_presence_flag"),
        "score_family": hunt.get("score_family"),
        "public_rank_eligible": hunt.get("public_rank_eligible"),
        "draw_difficulty_flag": hunt.get("draw_difficulty_flag"),
        "resident_point_signal": hunt.get("resident_point_signal"),
        "nonresident_point_signal": hunt.get("nonresident_point_signal"),
        "harvest_success_score": hunt.get("harvest_success_score"),
        "harvest_pressure_score": hunt.get("harvest_pressure_score"),
        "harvest_efficiency_score": hunt.get("harvest_efficiency_score"),
        "scoring_notes": hunt.get("scoring_notes"),
        "draw_access_score": hunt.get("draw_access_score"),
        "verified_outfitter_count": hunt.get("verified_outfitter_count"),
        "cpo_outfitter_count": hunt.get("cpo_outfitter_count"),
        "dwr_boundary_link": hunt.get("dwr_boundary_link"),
        "dwr_source_guide": hunt.get("dwr_source_guide"),
        "dwr_unit_name": hunt.get("dwr_unit_name"),
        "recommended_permits": hunt.get("recommended_permits"),
        "detail_path": f"./processed_data/hunt_research_2026_split/hunts/{hunt.get('hunt_code')}.json",
        "projected_bonus_draw_summary": {
            "resident": compact_projection_rows((hunt.get("projected_bonus_draw") or {}).get("resident")),
            "nonresident": compact_projection_rows((hunt.get("projected_bonus_draw") or {}).get("nonresident")),
        } if hunt.get("projected_bonus_draw") else None,
        "antlerless_draw_summary": {
            "resident": compact_preference_rows((hunt.get("antlerless_draw") or {}).get("resident")),
            "nonresident": compact_preference_rows((hunt.get("antlerless_draw") or {}).get("nonresident")),
        } if hunt.get("antlerless_draw") else None,
    }


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    hunts = json.loads(INPUT_PATH.read_text(encoding="utf-8"))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DETAIL_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DETAIL_DIR.mkdir(parents=True, exist_ok=True)

    index_rows = []
    manifest = {
        "count": len(hunts),
        "index_file": "hunt_research_2026.index.json",
        "detail_dir": "hunts",
        "notes": "Index contains lightweight metadata plus matrix-facing summary ladders. Full ladders and projections live in per-hunt detail files.",
    }

    for hunt in hunts:
        hunt_code = hunt.get("hunt_code")
        if not hunt_code:
            continue
        index_row = build_index_row(hunt)
        index_rows.append(index_row)
        write_json(DETAIL_DIR / f"{hunt_code}.json", hunt)
        write_json(UPLOAD_DETAIL_DIR / f"{hunt_code}.json", hunt)

    write_json(OUTPUT_DIR / "hunt_research_2026.index.json", index_rows)
    write_json(OUTPUT_DIR / "manifest.json", manifest)
    write_json(UPLOAD_DIR / "hunt_research_2026.index.json", index_rows)
    write_json(UPLOAD_DIR / "manifest.json", manifest)

    summary = {
        "count": len(index_rows),
        "index_bytes": (OUTPUT_DIR / "hunt_research_2026.index.json").stat().st_size,
        "detail_files": len(list(DETAIL_DIR.glob("*.json"))),
    }
    write_json(OUTPUT_DIR / "split-summary.json", summary)


if __name__ == "__main__":
    main()
