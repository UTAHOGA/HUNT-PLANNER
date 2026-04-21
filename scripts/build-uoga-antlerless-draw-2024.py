from __future__ import annotations

import csv
import json
import re
import shutil
from collections import Counter
from pathlib import Path

from pypdf import PdfReader


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")
RAW_DATA_DIR = Path(r"C:\UOGA HUNTS\raw_data 2024")
RAW_DATA_DIR_ALT = Path(r"C:\UOGA HUNTS\raw_data_2024")
RAW_DATA_ROOT = RAW_DATA_DIR if RAW_DATA_DIR.exists() else RAW_DATA_DIR_ALT
PDF_PATH = RAW_DATA_ROOT / "24_antlerless_drawing_odds_report.pdf"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_antlerless_draw_layers_2024"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "antlerless_draw_2024.csv"

RAW_SECTION_PATH = OUTPUT_DIR / "layer_04_antlerless_draw_hunt_sections_raw_2024.jsonl"
CSV_PATH = OUTPUT_DIR / "antlerless_draw_2024.csv"
VALIDATION_PATH = OUTPUT_DIR / "antlerless_draw_2024.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "antlerless_draw_2024.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "antlerless_draw_2024.status.json"

HEADER_RE = re.compile(r"Hunt:\s*([A-Z]{2}\d+)\s+(.*?)\s*$", re.IGNORECASE)
DATA_LINE_RE = re.compile(r"^\s*(?:[0-9]|1[0-9]|20|Totals)\b")


def tokenize(line: str) -> list[str]:
    return [token for token in re.split(r"\s+", line.strip()) if token]


def clean_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def derive_land_type(hunt_header: str) -> str:
    header_upper = hunt_header.upper()
    has_cwmu = "CWMU" in header_upper
    has_public = "PUBLIC" in header_upper
    has_private = "PRIVATE" in header_upper

    if (has_cwmu and (has_public or has_private)) or (has_public and has_private):
        return "mixed"
    if has_cwmu:
        return "cwmu"
    return "public"


def parse_ratio(tokens: list[str], start_index: int) -> tuple[str, int]:
    if start_index >= len(tokens):
        raise ValueError("Missing ratio token")

    if tokens[start_index] == "N/A":
        return "N/A", start_index + 1

    if start_index + 2 < len(tokens) and tokens[start_index : start_index + 3] == ["N", "/", "A"]:
        return "N/A", start_index + 3

    if start_index + 1 < len(tokens) and tokens[start_index : start_index + 2] in (["N", "/A"], ["N/", "A"]):
        return "N/A", start_index + 2

    if start_index + 2 < len(tokens) and tokens[start_index] == "1" and tokens[start_index + 1] == "in":
        return f"1 in {tokens[start_index + 2]}", start_index + 3

    if (
        start_index + 4 < len(tokens)
        and tokens[start_index] == "1"
        and tokens[start_index + 1 : start_index + 3] == ["i", "n"]
    ):
        pieces: list[str] = []
        index = start_index + 3
        while index < len(tokens) and re.fullmatch(r"\d+(?:\.\d+)?|\.", tokens[index]):
            pieces.append(tokens[index])
            candidate = "".join(pieces)
            index += 1
            next_token = tokens[index] if index < len(tokens) else None
            if re.fullmatch(r"\d+(?:\.\d+)?", candidate) and next_token not in {".", None}:
                return f"1 in {candidate}", index
            if re.fullmatch(r"\d+(?:\.\d+)?", candidate) and next_token is None:
                return f"1 in {candidate}", index

    raise ValueError(f"Unrecognized ratio tokens near index {start_index}: {tokens[start_index:start_index + 5]}")


def parse_side(tokens: list[str], start_index: int, expected_point: str | None) -> tuple[dict[str, object], int]:
    if start_index >= len(tokens):
        raise ValueError("No tokens left for side parse")

    point_token = tokens[start_index]
    next_index = start_index + 1
    if point_token == "Totals":
        point_level = "Totals"
    else:
        if expected_point is not None and point_token != expected_point:
            raise ValueError(f"Point mismatch. Expected {expected_point}, found {point_token}")
        if not point_token.isdigit():
            raise ValueError(f"Invalid point token {point_token}")
        point_level = point_token

    if next_index + 3 >= len(tokens):
        raise ValueError("Insufficient tokens for applicants/permits")

    applicants = int(tokens[next_index])
    # Antlerless output is preference-only. Preserve awarded permits from the total permits column.
    _bonus_like_column = int(tokens[next_index + 1])
    _regular_like_column = int(tokens[next_index + 2])
    permits_awarded = int(tokens[next_index + 3])
    ratio_text, ratio_end = parse_ratio(tokens, next_index + 4)

    return (
        {
            "point_level_raw": point_level,
            "applicants": applicants,
            "permits_awarded": permits_awarded,
            "success_ratio_text": ratio_text,
        },
        ratio_end,
    )


def parse_data_line(line: str) -> list[dict[str, object]]:
    tokens = tokenize(line)
    left, next_index = parse_side(tokens, 0, expected_point=None)
    right, right_end = parse_side(tokens, next_index, expected_point=str(left["point_level_raw"]))
    if right_end != len(tokens):
        raise ValueError(f"Unexpected trailing tokens: {tokens[right_end:]}")

    return [
        {
            "residency": "Resident",
            **left,
        },
        {
            "residency": "Nonresident",
            **right,
        },
    ]


def extract_hunt_pages(reader: PdfReader) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    section_records: list[dict[str, object]] = []
    rows: list[dict[str, object]] = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if "Hunt:" not in text:
            continue

        header_line = None
        for line in text.splitlines():
            if line.strip().startswith("Hunt:"):
                header_line = clean_ws(line)
                break

        if not header_line:
            continue

        match = HEADER_RE.search(header_line)
        if not match:
            section_records.append(
                {
                    "page_number": page_number,
                    "header_parse_status": "failed",
                    "raw_text": text,
                }
            )
            continue

        hunt_code = match.group(1)
        hunt_header = clean_ws(match.group(2))
        land_type = derive_land_type(hunt_header)
        section_records.append(
            {
                "page_number": page_number,
                "header_parse_status": "ok",
                "hunt_code": hunt_code,
                "hunt_header": hunt_header,
                "land_type": land_type,
                "raw_text": text,
            }
        )

        for line_number, line in enumerate(text.splitlines(), start=1):
            stripped = line.strip()
            if not DATA_LINE_RE.match(stripped):
                continue
            if stripped.startswith("Totals"):
                continue

            parsed_rows = parse_data_line(stripped)
            for parsed in parsed_rows:
                rows.append(
                    {
                        "hunt_code": hunt_code,
                        "residency": parsed["residency"],
                        "point_level": int(str(parsed["point_level_raw"])),
                        "applicants": int(parsed["applicants"]),
                        "permits_awarded": int(parsed["permits_awarded"]),
                        "success_ratio_text": str(parsed["success_ratio_text"]),
                        "land_type": land_type,
                        "source_page_number": page_number,
                        "source_line_number": line_number,
                    }
                )

    return section_records, rows


def write_jsonl(records: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True))
            handle.write("\n")


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = [
        "hunt_code",
        "land_type",
        "residency",
        "point_level",
        "applicants",
        "permits_awarded",
        "success_ratio_text",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in fieldnames})


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF_PATH))
    section_records, rows = extract_hunt_pages(reader)

    grain_counts = Counter((row["hunt_code"], row["residency"], row["point_level"]) for row in rows)
    duplicate_keys = [
        {"hunt_code": key[0], "residency": key[1], "point_level": key[2], "count": count}
        for key, count in grain_counts.items()
        if count > 1
    ]
    if duplicate_keys:
        raise RuntimeError(f"Duplicate grain keys detected: {duplicate_keys[:10]}")

    rows.sort(key=lambda row: (row["hunt_code"], row["residency"], -int(row["point_level"])))
    write_jsonl(section_records, RAW_SECTION_PATH)
    write_csv(rows, CSV_PATH)

    hunt_codes = {row["hunt_code"] for row in rows}
    hunt_sections = {record["hunt_code"] for record in section_records if record.get("header_parse_status") == "ok"}
    hunt_row_counts = Counter(row["hunt_code"] for row in rows)
    hunt_res_counts = Counter((row["hunt_code"], row["residency"]) for row in rows)
    point_values = sorted({int(row["point_level"]) for row in rows})

    validation = {
        "table": "antlerless_draw_breakdown",
        "draw_year": 2025,
        "source_pdf": str(PDF_PATH),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "extraction_tool": "python+pypdf",
        "target_grain": "hunt_code x residency x point_level",
        "pages_in_pdf": len(reader.pages),
        "hunt_pages_detected": len(section_records),
        "rows_written": len(rows),
        "distinct_hunt_codes": len(hunt_codes),
        "duplicate_key_count": len(duplicate_keys),
        "required_columns_present": True,
        "column_list": [
            "hunt_code",
            "land_type",
            "residency",
            "point_level",
            "applicants",
            "permits_awarded",
            "success_ratio_text",
        ],
        "numeric_columns": ["point_level", "applicants", "permits_awarded"],
        "summary_artifacts_role": "exploratory_only",
        "preference_system_only": True,
        "land_type_rule": "Explicit hunt description only; default public; mixed only if explicitly ambiguous.",
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    expected_point_levels_per_residency = len(point_values)
    expected_rows_per_hunt = expected_point_levels_per_residency * 2

    acceptance = {
        "accepted_for_use": (
            hunt_codes == hunt_sections
            and len(duplicate_keys) == 0
            and point_values == list(range(0, expected_point_levels_per_residency))
            and all(len({row["residency"] for row in rows if row["hunt_code"] == hc}) == 2 for hc in hunt_codes)
            and all(count == expected_rows_per_hunt for count in hunt_row_counts.values())
            and all(count == expected_point_levels_per_residency for count in hunt_res_counts.values())
        ),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "checks": {
            "hunt_code_count_matches_sections": hunt_codes == hunt_sections,
            "totals_rows_excluded_from_csv": True,
            "point_level_domain_valid_0_19": point_values == list(range(0, expected_point_levels_per_residency)),
            "no_duplicate_grain_keys": len(duplicate_keys) == 0,
            "resident_nonresident_blocks_preserved": all(
                len({row["residency"] for row in rows if row["hunt_code"] == hc}) == 2 for hc in hunt_codes
            ),
            "per_hunt_row_count_valid": all(count == expected_rows_per_hunt for count in hunt_row_counts.values()),
            "per_hunt_residency_row_count_valid": all(
                count == expected_point_levels_per_residency for count in hunt_res_counts.values()
            ),
        },
        "failing_hunt_codes": [],
        "summary": {
            "distinct_hunt_codes_csv": len(hunt_codes),
            "distinct_hunt_sections_jsonl": len(hunt_sections),
            "rows_written": len(rows),
            "point_level_min": min(point_values) if point_values else None,
            "point_level_max": max(point_values) if point_values else None,
            "expected_point_levels_per_residency": expected_point_levels_per_residency,
            "expected_rows_per_hunt": expected_rows_per_hunt,
            "land_type_distribution": dict(Counter(row["land_type"] for row in rows)),
        },
    }

    if not acceptance["accepted_for_use"]:
        failing = set()
        for hc in sorted(hunt_codes | hunt_sections):
            if hunt_row_counts.get(hc, 0) != expected_rows_per_hunt:
                failing.add(hc)
            if {row["residency"] for row in rows if row["hunt_code"] == hc} != {"Resident", "Nonresident"}:
                failing.add(hc)
            if (
                hunt_res_counts.get((hc, "Resident"), 0) != expected_point_levels_per_residency
                or hunt_res_counts.get((hc, "Nonresident"), 0) != expected_point_levels_per_residency
            ):
                failing.add(hc)
        acceptance["failing_hunt_codes"] = sorted(failing)

    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")

    status = {
        "table": "antlerless_draw_breakdown",
        "draw_year": 2025,
        "target_grain": "hunt_code x residency x point_level",
        "source_pdf": str(PDF_PATH),
        "source_validity": "valid",
        "hunt_level_data_in_pdf": True,
        "status": "ready" if acceptance["accepted_for_use"] else "failed_acceptance",
        "extraction_path": "tool_assisted_python",
        "extraction_tool": "pypdf",
        "summary_artifacts_role": "exploratory_only",
        "rows_written": len(rows),
        "distinct_hunt_codes": len(hunt_codes),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "accepted_for_use": acceptance["accepted_for_use"],
        "land_type_rule": "Explicit hunt description only; default public; mixed only if explicitly ambiguous.",
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    return {
        "status": status,
        "acceptance": acceptance,
    }


def publish_if_accepted() -> bool:
    acceptance = json.loads(ACCEPTANCE_PATH.read_text(encoding="utf-8"))
    if not acceptance.get("accepted_for_use"):
        return False
    PROCESSED_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(CSV_PATH, PROCESSED_OUTPUT_PATH)
    return True


if __name__ == "__main__":
    result = build()
    published = publish_if_accepted()
    print(
        json.dumps(
            {
                "status": result["status"],
                "acceptance": result["acceptance"],
                "published": published,
                "published_path": str(PROCESSED_OUTPUT_PATH) if published else None,
            },
            indent=2,
        )
    )
