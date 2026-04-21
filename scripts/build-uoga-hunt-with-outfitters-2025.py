from __future__ import annotations

import csv
import json
import shutil
from collections import Counter, defaultdict
from pathlib import Path


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")

HUNT_SCORES_PATH = UOGA_ROOT / "processed_data" / "hunt_scores_2025.csv"
OUTFITTER_MASTER_PATH = WORKSPACE_ROOT / "data" / "_archive_files" / "outfitters-master-2026-03-30.csv"
OUTFITTER_COVERAGE_PATH = WORKSPACE_ROOT / "data" / "_archive_files" / "outfitter-huntrow-coverage-score-v7-2026-03-29.csv"

OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_hunt_with_outfitters_layers"
OUTFITTER_VERIFICATION_PATH = OUTPUT_DIR / "outfitter_verification_2025.csv"
CSV_PATH = OUTPUT_DIR / "hunt_with_outfitters_2025.csv"
VALIDATION_PATH = OUTPUT_DIR / "hunt_with_outfitters_2025.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "hunt_with_outfitters_2025.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "hunt_with_outfitters_2025.status.json"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "hunt_with_outfitters_2025.csv"

MIN_THRESHOLD = 3
MATCHABLE_COVERAGE_TIERS = {"Full Candidate", "Primary Candidate", "Partial Candidate"}
IDENTITY_CONFIRMED_METHODS = {"Desktop DWR CSV (outfitter-exact)", "Imported from Desktop DWR CSV"}
IDENTITY_CONFLICT_METHODS = {"Desktop DWR CSV (outfitter-close)", "No match in Desktop DWR CSV"}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = list(rows[0].keys()) if rows else []
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def to_float(value: str | None) -> float | None:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    return float(value)


def draw_access_score(row: dict[str, str]) -> float | None:
    draw_family = (row.get("draw_family") or "").strip()
    difficulty = (row.get("draw_difficulty_flag") or "").strip()
    if draw_family == "none" or difficulty == "":
        return None
    if difficulty == "low":
        return 3.0
    if difficulty == "moderate":
        return 2.0
    if difficulty == "high":
        return 1.0
    return None


def build_outfitter_verification(
    master_rows: list[dict[str, str]], coverage_rows: list[dict[str, str]]
) -> tuple[list[dict[str, object]], dict[str, dict[str, object]], list[dict[str, object]]]:
    coverage_by_outfitter: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in coverage_rows:
        coverage_by_outfitter[row["outfitterId"]].append(row)

    verification_rows: list[dict[str, object]] = []
    verification_map: dict[str, dict[str, object]] = {}
    missing_required_field_rows: list[dict[str, object]] = []

    for row in master_rows:
        outfitter_id = row["id"]
        coverage = coverage_by_outfitter.get(outfitter_id, [])
        dwr_status = (row.get("dwrRegistrationStatus") or "").strip()
        dwr_method = (row.get("dwrMatchMethod") or "").strip()

        business_identity_confirmed = dwr_method in IDENTITY_CONFIRMED_METHODS
        dwr_registration_identified = dwr_status in {"Registered", "Not Registered"}
        unit_claim_matches_data = any(c["coverageTier"] in MATCHABLE_COVERAGE_TIERS for c in coverage)
        no_identity_conflict = dwr_method not in IDENTITY_CONFLICT_METHODS and dwr_method != ""

        if business_identity_confirmed and dwr_registration_identified and unit_claim_matches_data and no_identity_conflict:
            verification_status = "verified"
        elif business_identity_confirmed or dwr_registration_identified or unit_claim_matches_data:
            verification_status = "partially_verified"
        else:
            verification_status = "unverified"

        insurance_verified = False
        cpr_first_aid_verified = False
        operating_experience_years = None
        ethics_agreement_signed = False
        sop_agreement_signed = False

        certification_status = "cpo"
        if not (
            verification_status == "verified"
            and insurance_verified
            and cpr_first_aid_verified
            and operating_experience_years is not None
            and operating_experience_years >= MIN_THRESHOLD
            and ethics_agreement_signed
            and sop_agreement_signed
        ):
            certification_status = "none"

        good_standing_flag = dwr_status == "Registered" and no_identity_conflict

        verification_record = {
            "outfitter_id": outfitter_id,
            "display_name": row.get("displayName", ""),
            "business_identity_confirmed": business_identity_confirmed,
            "dwr_registration_identified": dwr_registration_identified,
            "unit_claim_matches_data": unit_claim_matches_data,
            "no_identity_conflict": no_identity_conflict,
            "verification_status": verification_status,
            "insurance_verified": insurance_verified,
            "cpr_first_aid_verified": cpr_first_aid_verified,
            "operating_experience_years": operating_experience_years,
            "ethics_agreement_signed": ethics_agreement_signed,
            "sop_agreement_signed": sop_agreement_signed,
            "certification_status": certification_status,
            "good_standing_flag": good_standing_flag,
            "source_dwr_registration_status": dwr_status,
            "source_dwr_match_method": dwr_method,
            "coverage_row_count": len(coverage),
        }

        required_fields = [
            "business_identity_confirmed",
            "dwr_registration_identified",
            "unit_claim_matches_data",
            "no_identity_conflict",
            "insurance_verified",
            "cpr_first_aid_verified",
            "operating_experience_years",
            "ethics_agreement_signed",
            "sop_agreement_signed",
        ]
        if any(field not in verification_record for field in required_fields):
            missing_required_field_rows.append({"outfitter_id": outfitter_id})

        verification_rows.append(verification_record)
        verification_map[outfitter_id] = verification_record

    return verification_rows, verification_map, missing_required_field_rows


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    hunt_rows = read_csv(HUNT_SCORES_PATH)
    master_rows = read_csv(OUTFITTER_MASTER_PATH)
    coverage_rows = read_csv(OUTFITTER_COVERAGE_PATH)

    hunt_duplicates = sorted(code for code, count in Counter(row["hunt_code"] for row in hunt_rows).items() if count > 1)
    if hunt_duplicates:
        raise RuntimeError(f"Duplicate hunt_code rows in hunt scores source: {hunt_duplicates[:20]}")

    verification_rows, verification_map, missing_required_field_rows = build_outfitter_verification(master_rows, coverage_rows)
    write_csv(verification_rows, OUTFITTER_VERIFICATION_PATH)

    coverage_ids = {row["outfitterId"] for row in coverage_rows}
    master_ids = {row["id"] for row in master_rows}
    unmatched_coverage_outfitters = sorted(coverage_ids - master_ids)

    coverage_by_hunt: dict[str, set[str]] = defaultdict(set)
    for row in coverage_rows:
        if row["coverageTier"] not in MATCHABLE_COVERAGE_TIERS:
            continue
        coverage_by_hunt[row["huntCode"]].add(row["outfitterId"])

    output_rows: list[dict[str, object]] = []
    failing_hunt_codes: set[str] = set()

    for row in hunt_rows:
        hunt_code = row["hunt_code"]
        linked_outfitters = coverage_by_hunt.get(hunt_code, set())
        verified_count = 0
        cpo_count = 0

        for outfitter_id in linked_outfitters:
            verification = verification_map.get(outfitter_id)
            if not verification:
                continue
            if verification["verification_status"] == "verified":
                verified_count += 1
            if verification["certification_status"] == "cpo":
                cpo_count += 1

        out_row = {
            "hunt_code": hunt_code,
            "species": row["species"],
            "harvest_success": to_float(row.get("harvest_success_score")),
            "pressure_index": to_float(row.get("harvest_pressure_score")),
            "draw_access_score": draw_access_score(row),
            "verified_outfitter_count": verified_count,
            "cpo_outfitter_count": cpo_count,
        }
        output_rows.append(out_row)

    write_csv(output_rows, CSV_PATH)

    row_count = len(output_rows)
    distinct_hunt_codes = len({row["hunt_code"] for row in output_rows})
    duplicate_hunt_code_count = row_count - distinct_hunt_codes

    certification_violations = [
        row["outfitter_id"]
        for row in verification_rows
        if row["certification_status"] == "cpo"
        and not (
            row["verification_status"] == "verified"
            and row["insurance_verified"] is True
            and row["cpr_first_aid_verified"] is True
            and row["operating_experience_years"] is not None
            and row["operating_experience_years"] >= MIN_THRESHOLD
            and row["ethics_agreement_signed"] is True
            and row["sop_agreement_signed"] is True
        )
    ]

    validation = {
        "row_count": row_count,
        "distinct_hunt_code_count": distinct_hunt_codes,
        "duplicate_hunt_code_count": duplicate_hunt_code_count,
        "unmatched_coverage_outfitter_ids": unmatched_coverage_outfitters,
        "verification_status_distribution": dict(Counter(row["verification_status"] for row in verification_rows)),
        "certification_status_distribution": dict(Counter(row["certification_status"] for row in verification_rows)),
        "missing_required_certification_field_rows": missing_required_field_rows,
        "certification_violations": certification_violations,
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    accepted_for_use = (
        duplicate_hunt_code_count == 0
        and len(missing_required_field_rows) == 0
        and len(certification_violations) == 0
    )

    acceptance = {
        "accepted_for_use": accepted_for_use,
        "checks": {
            "no_duplicate_hunt_code_rows": duplicate_hunt_code_count == 0,
            "no_inferred_certification": all(row["certification_status"] == "none" for row in verification_rows),
            "no_missing_required_certification_fields": len(missing_required_field_rows) == 0,
            "no_invalid_certification_assignments": len(certification_violations) == 0,
        },
        "failing_hunt_codes": sorted(failing_hunt_codes),
        "summary": {
            "output_csv": str(PROCESSED_OUTPUT_PATH),
            "row_count": row_count,
            "distinct_hunt_code_count": distinct_hunt_codes,
            "duplicate_hunt_code_count": duplicate_hunt_code_count,
            "verified_outfitter_rows": sum(row["verification_status"] == "verified" for row in verification_rows),
            "cpo_outfitter_rows": sum(row["certification_status"] == "cpo" for row in verification_rows),
        },
    }
    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")

    status = {
        "table": "hunt_with_outfitters_2025",
        "source_hunt_scores": str(HUNT_SCORES_PATH),
        "source_outfitter_master": str(OUTFITTER_MASTER_PATH),
        "source_hunt_coverage": str(OUTFITTER_COVERAGE_PATH),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "status": "ready" if accepted_for_use else "failed_acceptance",
        "accepted_for_use": accepted_for_use,
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
                "verified_outfitter_rows": acceptance["summary"]["verified_outfitter_rows"],
                "cpo_outfitter_rows": acceptance["summary"]["cpo_outfitter_rows"],
                "failing_hunt_codes": acceptance["failing_hunt_codes"],
                "published": published,
            },
            indent=2,
        )
    )
