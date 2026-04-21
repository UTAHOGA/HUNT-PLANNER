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
PDF_PATH = UOGA_ROOT / "raw_data" / "2025" / "2025-preliminary-bg-harvest.pdf"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_harvest_layers"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "harvest_2025.csv"

RAW_TEXT_PATH = OUTPUT_DIR / "layer_02_harvest_pdf_raw_text_2025.txt"
RAW_SECTIONS_PATH = OUTPUT_DIR / "layer_03_harvest_hunt_sections_raw_2025.jsonl"
CSV_PATH = OUTPUT_DIR / "harvest_2025.csv"
VALIDATION_PATH = OUTPUT_DIR / "harvest_2025.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "harvest_2025.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "harvest_2025.status.json"
SAMPLE_AUDIT_PATH = OUTPUT_DIR / "harvest_2025.sample_audit.json"

HUNT_CODE_RE = re.compile(r"^[A-Z]{2}\d{4}$")
NUMERIC_RE = re.compile(r"^-?\d+(?:\.\d+)?$")

SPECIES_VALUES = [
    "Rocky Mountain Bighorn Sheep",
    "Desert Bighorn Sheep",
    "Mountain Goat",
    "Pronghorn",
    "Bison",
    "Deer",
    "Elk",
    "Moose",
]
HUNT_TYPE_VALUES = [
    "Limited Entry on General Season",
    "General Season Youth Any Bull",
    "General Season Spike Bull",
    "General Season Landowner",
    "Antlerless Elk Control",
    "Premium Limited Entry",
    "Private Lands Only",
    "Management Buck",
    "General Season Any Bull",
    "Limited Entry Landowner",
    "CWMU Antlerless",
    "General Season",
    "Limited Entry",
    "Conservation",
    "CWMU Management",
    "CWMU Cactus",
    "Cactus Buck",
    "Sportsman",
    "Antlerless",
    "CWMU",
    "OIAL",
]
WEAPON_VALUES = [
    "Archery, Muzzleloader, Shotgun",
    "Multiseason Restricted",
    "Muzzleloader Restricted",
    "Rifle Restricted",
    "Early Any Legal Weapon",
    "Late Any Legal Weapon",
    "September Archery",
    "Any Legal Weapon",
    "Extended Archery",
    "Dedicated Hunter",
    "Late Archery",
    "Mid Any Legal Weapon",
    "Multiseason",
    "Muzzleloader",
    "Archery Restricted",
    "Archery",
    "HAMSS",
]
SEX_TYPE_VALUES = [
    "Hunter's Choice",
    "Female Only",
    "Male Only",
]
HEADER_PREFIXES = (
    "2025 Utah Big Game Harvest",
    "Hunt # Species Hunt Name Hunt Type Weapon Sex Type",
    "Permit",
    "sHarves",
    "successAverag",
    "e DaysAverage",
    "Satisfactio",
)
SAMPLE_AUDIT_CODES = ["BI0001", "DA1011", "DB1058", "EA2002", "EA1282"]


def clean_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_pdf_lines(raw_text: str) -> list[str]:
    filtered: list[str] = []
    for raw_line in raw_text.splitlines():
        line = clean_ws(raw_line)
        if not line:
            continue
        if any(line.startswith(prefix) for prefix in HEADER_PREFIXES):
            continue
        if line.startswith("Utah Division of Wildlife Resources"):
            continue
        if re.fullmatch(r"\d+", line):
            continue
        filtered.append(line)
    return filtered


def match_prefix(text: str, values: list[str]) -> tuple[str, str]:
    for value in sorted(values, key=len, reverse=True):
        if text.startswith(value + " "):
            return value, text[len(value) + 1 :].strip()
        if text == value:
            return value, ""
    raise ValueError(f"Unable to match prefix from: {text}")


def match_suffix(text: str, values: list[str]) -> tuple[str, str]:
    for value in sorted(values, key=len, reverse=True):
        if text.endswith(" " + value):
            return value, text[: -(len(value) + 1)].strip()
        if text == value:
            return value, ""
    raise ValueError(f"Unable to match suffix from: {text}")


def split_numeric_tail(tokens: list[str]) -> tuple[list[str], list[str]]:
    numeric_count = 0
    for token in reversed(tokens):
        if NUMERIC_RE.fullmatch(token):
            numeric_count += 1
        else:
            break
    if numeric_count < 2 or numeric_count > 6:
        raise ValueError(f"Malformed numeric tail: {tokens}")
    return tokens[:-numeric_count], tokens[-numeric_count:]


def parse_numeric_tail(tokens: list[str]) -> dict[str, int | float | None]:
    fields = ["permits_total", "hunters", "harvest", "percent_success", "avg_days", "satisfaction"]
    parsed: dict[str, int | float | None] = {field: None for field in fields}
    for field, token in zip(fields, tokens):
        if field in {"permits_total", "hunters", "harvest"}:
            parsed[field] = int(token)
        else:
            parsed[field] = float(token)
    return parsed


def derive_access_fields(hunt_type: str, hunt_name: str) -> tuple[str, str | None]:
    source_text = f"{hunt_type} {hunt_name}".upper()
    if "CWMU" in source_text:
        return "CWMU", "CWMU"
    if "LANDOWNER" in source_text:
        return "Public", "Landowner"
    if "PRIVATE LANDS ONLY" in source_text:
        return "Public", "Private Lands Only"
    if "SELECT-ACCESS" in source_text or "SELECT ACCESS" in source_text:
        return "Public", "Select Access"
    return "Public", None


def extract_raw_sections(reader: PdfReader) -> tuple[str, list[dict[str, object]]]:
    page_texts: list[str] = []
    filtered_lines: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        page_texts.append(text)
        filtered_lines.extend(normalize_pdf_lines(text))

    flat_text = " ".join(filtered_lines)
    flat_text = re.sub(r"\b\d+\s+of\s+\d+\s+sHunter\s+tPercent\s+n\b", "", flat_text)
    flat_text = re.sub(r"\b\d+\s+of\s+\d+\b", "", flat_text)
    flat_text = clean_ws(flat_text)
    chunk_pattern = re.compile(r"([A-Z]{2}\d{4}\b.*?)(?=\s[A-Z]{2}\d{4}\b|$)")
    raw_sections: list[dict[str, object]] = []
    for chunk_index, chunk in enumerate(chunk_pattern.findall(flat_text), start=1):
        chunk_text = clean_ws(chunk)
        hunt_code = chunk_text.split()[0]
        if not HUNT_CODE_RE.fullmatch(hunt_code):
            continue
        raw_sections.append(
            {
                "chunk_index": chunk_index,
                "hunt_code": hunt_code,
                "raw_chunk_text": chunk_text,
            }
        )
    return "\n".join(page_texts), raw_sections


def parse_chunk(chunk_text: str) -> dict[str, object]:
    tokens = chunk_text.split()
    hunt_code = tokens[0]
    if not HUNT_CODE_RE.fullmatch(hunt_code):
        raise ValueError(f"Invalid hunt code in chunk: {chunk_text}")

    prefix_tokens, numeric_tokens = split_numeric_tail(tokens[1:])
    numeric_fields = parse_numeric_tail(numeric_tokens)
    prefix_text = " ".join(prefix_tokens)

    species, remainder = match_prefix(prefix_text, SPECIES_VALUES)
    sex_type, remainder = match_suffix(remainder, SEX_TYPE_VALUES)
    weapon, remainder = match_suffix(remainder, WEAPON_VALUES)
    hunt_type, hunt_name = match_suffix(remainder, HUNT_TYPE_VALUES)

    if not hunt_name:
        raise ValueError(f"Missing hunt name for chunk: {chunk_text}")

    access_type, access_classification = derive_access_fields(hunt_type, hunt_name)

    return {
        "hunt_code": hunt_code,
        "species": species,
        "hunt_name": hunt_name,
        "hunt_type": hunt_type,
        "weapon": weapon,
        "sex_type": sex_type,
        **numeric_fields,
        "access_type": access_type,
        "access_classification": access_classification,
    }


def write_jsonl(records: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True))
            handle.write("\n")


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
    fieldnames = [
        "hunt_code",
        "species",
        "hunt_name",
        "hunt_type",
        "weapon",
        "sex_type",
        "permits_total",
        "hunters",
        "harvest",
        "percent_success",
        "avg_days",
        "satisfaction",
        "access_type",
        "access_classification",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field) for field in fieldnames})


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF_PATH))
    full_raw_text, raw_sections = extract_raw_sections(reader)
    RAW_TEXT_PATH.write_text(full_raw_text, encoding="utf-8")
    write_jsonl(raw_sections, RAW_SECTIONS_PATH)

    parsed_rows: list[dict[str, object]] = []
    malformed_chunks: list[dict[str, object]] = []
    for section in raw_sections:
        try:
            parsed_rows.append(parse_chunk(str(section["raw_chunk_text"])))
        except Exception as exc:  # noqa: BLE001
            malformed_chunks.append(
                {
                    "hunt_code": section["hunt_code"],
                    "chunk_index": section["chunk_index"],
                    "error": str(exc),
                    "raw_chunk_text": section["raw_chunk_text"],
                }
            )

    if malformed_chunks:
        raise RuntimeError(f"Malformed row shapes detected: {json.dumps(malformed_chunks[:10], ensure_ascii=True)}")

    parsed_rows.sort(key=lambda row: row["hunt_code"])
    write_csv(parsed_rows, CSV_PATH)

    hunt_codes = [str(row["hunt_code"]) for row in parsed_rows]
    distinct_hunt_codes = sorted(set(hunt_codes))
    duplicates = sorted(code for code, count in Counter(hunt_codes).items() if count > 1)
    totals_rows = [section["hunt_code"] for section in raw_sections if str(section["hunt_code"]).upper() == "TOTALS"]

    required_columns = [
        "hunt_code",
        "species",
        "hunt_name",
        "hunt_type",
        "weapon",
        "sex_type",
        "permits_total",
        "hunters",
        "harvest",
        "percent_success",
        "avg_days",
        "satisfaction",
        "access_type",
    ]
    output_columns = list(parsed_rows[0].keys()) if parsed_rows else []
    required_columns_present = all(column in output_columns for column in required_columns)

    numeric_fields = ["permits_total", "hunters", "harvest", "percent_success", "avg_days", "satisfaction"]
    numeric_parse_failures: dict[str, list[str]] = {field: [] for field in numeric_fields}
    for row in parsed_rows:
        for field in numeric_fields:
            value = row[field]
            if value is not None and not isinstance(value, (int, float)):
                numeric_parse_failures[field].append(str(row["hunt_code"]))

    access_values = sorted({str(row["access_type"]) for row in parsed_rows})
    access_sane = set(access_values).issubset({"Public", "CWMU"})

    sample_audit = []
    raw_section_map = {str(section["hunt_code"]): section for section in raw_sections}
    parsed_row_map = {str(row["hunt_code"]): row for row in parsed_rows}
    for hunt_code in SAMPLE_AUDIT_CODES:
        sample_audit.append(
            {
                "hunt_code": hunt_code,
                "raw_chunk_text": raw_section_map[hunt_code]["raw_chunk_text"] if hunt_code in raw_section_map else None,
                "parsed_row": parsed_row_map.get(hunt_code),
            }
        )
    SAMPLE_AUDIT_PATH.write_text(json.dumps(sample_audit, indent=2), encoding="utf-8")

    validation = {
        "table": "harvest_source",
        "draw_year": 2025,
        "source_pdf": str(PDF_PATH),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "extraction_tool": "python+pypdf",
        "target_grain": "one row per hunt_code",
        "pages_in_pdf": len(reader.pages),
        "raw_sections_detected": len(raw_sections),
        "rows_written": len(parsed_rows),
        "distinct_hunt_codes": len(distinct_hunt_codes),
        "duplicate_hunt_code_count": len(duplicates),
        "required_columns_present": required_columns_present,
        "column_list": output_columns,
        "numeric_columns": numeric_fields,
        "numeric_parse_failures": numeric_parse_failures,
        "totals_rows_detected": totals_rows,
        "access_values": access_values,
        "summary_artifacts_role": "exploratory_only",
        "sample_audit_codes": SAMPLE_AUDIT_CODES,
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    failing_hunt_codes: set[str] = set(duplicates)
    if not required_columns_present:
        failing_hunt_codes.update(distinct_hunt_codes)
    for field, codes in numeric_parse_failures.items():
        if codes:
            failing_hunt_codes.update(codes)
    for entry in sample_audit:
        if not entry["raw_chunk_text"] or not entry["parsed_row"]:
            failing_hunt_codes.add(str(entry["hunt_code"]))

    accepted_for_use = (
        len(duplicates) == 0
        and required_columns_present
        and all(not codes for codes in numeric_parse_failures.values())
        and len(totals_rows) == 0
        and len(parsed_rows) == len(distinct_hunt_codes)
        and len(sample_audit) == 5
        and all(entry["raw_chunk_text"] and entry["parsed_row"] for entry in sample_audit)
        and access_sane
    )

    acceptance = {
        "accepted_for_use": accepted_for_use,
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "checks": {
            "no_duplicate_hunt_code_rows": len(duplicates) == 0,
            "required_columns_all_present": required_columns_present,
            "numeric_columns_parse_correctly": all(not codes for codes in numeric_parse_failures.values()),
            "no_totals_rows_included": len(totals_rows) == 0,
            "hunt_code_level_rows_only": len(parsed_rows) == len(distinct_hunt_codes),
            "sample_audit_complete_for_5_hunt_codes": len(sample_audit) == 5
            and all(entry["raw_chunk_text"] and entry["parsed_row"] for entry in sample_audit),
            "access_type_classification_present_and_sane": access_sane
            and all(row["access_type"] in {"Public", "CWMU"} for row in parsed_rows),
        },
        "failing_hunt_codes": sorted(failing_hunt_codes),
        "summary": {
            "rows_written": len(parsed_rows),
            "distinct_hunt_codes": len(distinct_hunt_codes),
            "access_type_distribution": dict(Counter(row["access_type"] for row in parsed_rows)),
            "access_classification_distribution": dict(
                Counter(row["access_classification"] or "" for row in parsed_rows)
            ),
        },
    }
    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")

    status = {
        "table": "harvest_source",
        "draw_year": 2025,
        "target_grain": "one row per hunt_code",
        "source_pdf": str(PDF_PATH),
        "source_validity": "valid",
        "hunt_level_data_in_pdf": True,
        "status": "ready" if accepted_for_use else "failed_acceptance",
        "extraction_path": "tool_assisted_python",
        "extraction_tool": "pypdf",
        "rows_written": len(parsed_rows),
        "distinct_hunt_codes": len(distinct_hunt_codes),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "accepted_for_use": accepted_for_use,
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    return {
        "accepted_for_use": accepted_for_use,
        "rows_written": len(parsed_rows),
        "distinct_hunt_codes": len(distinct_hunt_codes),
        "failing_hunt_codes": sorted(failing_hunt_codes),
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
                "accepted_for_use": result["accepted_for_use"],
                "rows_written": result["rows_written"],
                "distinct_hunt_codes": result["distinct_hunt_codes"],
                "failing_hunt_codes": result["failing_hunt_codes"],
                "published": published,
                "published_path": str(PROCESSED_OUTPUT_PATH) if published else None,
            },
            indent=2,
        )
    )
