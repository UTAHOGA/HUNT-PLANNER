from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")
RAW_DATA_DIR = UOGA_ROOT / "raw_data 2025"
RAW_DATA_DIR_ALT = UOGA_ROOT / "raw_data_2025"
RAW_DATA_ROOT = RAW_DATA_DIR if RAW_DATA_DIR.exists() else RAW_DATA_DIR_ALT
PDF_PATH = RAW_DATA_ROOT / "25_bg-odds.pdf"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_bg_draw_layers"

SECTION_TEXT_PATH = OUTPUT_DIR / "layer_04_bg_draw_hunt_sections_raw_2025.jsonl"
CSV_PATH = OUTPUT_DIR / "draw_breakdown_2025.csv"
VALIDATION_PATH = OUTPUT_DIR / "draw_breakdown_2025.validation.json"
STATUS_PATH = OUTPUT_DIR / "draw_breakdown_2025.status.json"

HEADER_RE = re.compile(r"Hunt:\s*([A-Z]{2}\d+)\s+(.*?)\s+Page\s+\d+\b", re.IGNORECASE | re.DOTALL)
DATA_LINE_RE = re.compile(r"^\s*(?:[0-9]|[12][0-9]|3[0-2]|Totals)\b")
BONUS_DRAW_PREFIXES = {"DB", "EB", "PB", "BI", "DS", "GO", "MB", "RS"}


@dataclass
class ParsedSide:
    point_level_raw: str
    applicants: int
    bonus_permits: int
    random_permits: int
    total_permits: int
    success_ratio_text: str
    next_index: int
    split_cost: int


def clean_ws(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def tokenize(line: str) -> list[str]:
    return [token for token in re.split(r"\s+", line.strip()) if token]


def integer_candidates(
    tokens: list[str],
    start_index: int,
    *,
    max_pieces: int,
    min_value: int | None = None,
    max_value: int | None = None,
    allow_totals: bool = False,
) -> list[tuple[str, int, int]]:
    candidates: list[tuple[str, int, int]] = []
    if start_index >= len(tokens):
        return candidates

    if allow_totals and tokens[start_index] == "Totals":
        candidates.append(("Totals", start_index + 1, 0))

    max_end = min(len(tokens), start_index + max_pieces)
    for end_index in range(start_index + 1, max_end + 1):
        chunk = tokens[start_index:end_index]
        if not all(token.isdigit() for token in chunk):
            break
        value_text = "".join(chunk)
        value_int = int(value_text)
        if min_value is not None and value_int < min_value:
            continue
        if max_value is not None and value_int > max_value:
            continue
        candidates.append((value_text, end_index, len(chunk) - 1))

    return candidates


def ratio_candidates(tokens: list[str], start_index: int) -> list[tuple[str, int, int]]:
    candidates: list[tuple[str, int, int]] = []
    if start_index >= len(tokens):
        return candidates

    if tokens[start_index] == "N/A":
        candidates.append(("N/A", start_index + 1, 0))

    if start_index + 2 < len(tokens) and tokens[start_index : start_index + 3] == ["N", "/", "A"]:
        candidates.append(("N/A", start_index + 3, 2))

    if start_index + 1 < len(tokens) and tokens[start_index : start_index + 2] in (["N", "/A"], ["N/", "A"]):
        candidates.append(("N/A", start_index + 2, 1))

    ratio_prefixes = []
    if start_index + 1 < len(tokens) and tokens[start_index : start_index + 2] == ["1", "in"]:
        ratio_prefixes.append((start_index + 2, 0))
    if start_index + 2 < len(tokens) and tokens[start_index : start_index + 3] == ["1", "i", "n"]:
        ratio_prefixes.append((start_index + 3, 1))

    for number_start, prefix_cost in ratio_prefixes:
        max_end = min(len(tokens), number_start + 6)
        for end_index in range(number_start + 1, max_end + 1):
            chunk = tokens[number_start:end_index]
            if not all(re.fullmatch(r"\d+(?:\.\d+)?|\.", token) for token in chunk):
                break
            number_text = "".join(chunk)
            if re.fullmatch(r"\d+(?:\.\d+)?", number_text):
                candidates.append((f"1 in {number_text}", end_index, prefix_cost + (len(chunk) - 1)))

    return candidates


def parse_side_candidates(tokens: list[str], start_index: int) -> list[ParsedSide]:
    side_candidates: list[ParsedSide] = []
    for point_level_raw, after_point, point_cost in integer_candidates(
        tokens,
        start_index,
        max_pieces=2,
        min_value=0,
        max_value=32,
        allow_totals=True,
    ):
        for applicants_text, after_applicants, applicants_cost in integer_candidates(tokens, after_point, max_pieces=4):
            for bonus_text, after_bonus, bonus_cost in integer_candidates(tokens, after_applicants, max_pieces=3):
                for random_text, after_random, random_cost in integer_candidates(tokens, after_bonus, max_pieces=3):
                    for total_text, after_total, total_cost in integer_candidates(tokens, after_random, max_pieces=3):
                        for ratio_text, after_ratio, ratio_cost in ratio_candidates(tokens, after_total):
                            side_candidates.append(
                                ParsedSide(
                                    point_level_raw=point_level_raw,
                                    applicants=int(applicants_text),
                                    bonus_permits=int(bonus_text),
                                    random_permits=int(random_text),
                                    total_permits=int(total_text),
                                    success_ratio_text=ratio_text,
                                    next_index=after_ratio,
                                    split_cost=point_cost + applicants_cost + bonus_cost + random_cost + total_cost + ratio_cost,
                                )
                            )
    return side_candidates


def parse_data_line(line: str) -> list[dict[str, object]]:
    tokens = tokenize(line)
    left_candidates = parse_side_candidates(tokens, 0)
    if not left_candidates:
        raise ValueError(f"Unable to parse left side from tokens {tokens}")

    best_pair: tuple[ParsedSide, ParsedSide] | None = None
    best_cost: int | None = None

    for left in left_candidates:
        right_candidates = parse_side_candidates(tokens, left.next_index)
        for right in right_candidates:
            if right.next_index != len(tokens):
                continue
            if right.point_level_raw != left.point_level_raw:
                continue
            total_cost = left.split_cost + right.split_cost
            if best_pair is None or total_cost < best_cost:
                best_pair = (left, right)
                best_cost = total_cost

    if best_pair is None:
        raise ValueError(f"Unable to parse full row from tokens {tokens}")

    left, right = best_pair

    rows: list[dict[str, object]] = []
    for residency, side in (("Resident", left), ("Nonresident", right)):
        rows.append(
            {
                "residency": residency,
                "point_level_raw": side.point_level_raw,
                "applicants": side.applicants,
                "bonus_permits": side.bonus_permits,
                "random_permits": side.random_permits,
                "total_permits": side.total_permits,
                "success_ratio_text": side.success_ratio_text,
            }
        )
    return rows


def extract_hunt_pages(reader: PdfReader) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    section_records: list[dict[str, object]] = []
    data_rows: list[dict[str, object]] = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        header_match = HEADER_RE.search(page_text)
        if not header_match:
            continue

        hunt_code = header_match.group(1).upper()
        if hunt_code[:2] not in BONUS_DRAW_PREFIXES:
            continue
        hunt_header = clean_ws(header_match.group(2))
        lines = [line.rstrip() for line in page_text.splitlines()]

        section_records.append(
            {
                "page_number": page_number,
                "header_parse_status": "ok",
                "hunt_code": hunt_code,
                "hunt_header": hunt_header,
                "raw_text": page_text,
            }
        )

        for line_number, line in enumerate(lines, start=1):
            if not DATA_LINE_RE.match(line):
                continue
            if line.strip().startswith("Totals"):
                continue

            parsed_rows = parse_data_line(line)
            for parsed_row in parsed_rows:
                data_rows.append(
                    {
                        "hunt_code": hunt_code,
                        "residency": parsed_row["residency"],
                        "point_level": int(parsed_row["point_level_raw"]),
                        "applicants": parsed_row["applicants"],
                        "bonus_permits": parsed_row["bonus_permits"],
                        "random_permits": parsed_row["random_permits"],
                        "total_permits": parsed_row["total_permits"],
                        "success_ratio_text": parsed_row["success_ratio_text"],
                        "source_page_number": page_number,
                        "source_line_number": line_number,
                    }
                )

    return section_records, data_rows


def write_section_records(section_records: list[dict[str, object]]) -> None:
    with SECTION_TEXT_PATH.open("w", encoding="utf-8", newline="") as handle:
        for record in section_records:
            handle.write(json.dumps(record, ensure_ascii=True))
            handle.write("\n")


def write_csv(rows: list[dict[str, object]]) -> None:
    fieldnames = [
        "hunt_code",
        "residency",
        "point_level",
        "applicants",
        "bonus_permits",
        "random_permits",
        "total_permits",
        "success_ratio_text",
    ]
    with CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in fieldnames})


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF_PATH))
    section_records, data_rows = extract_hunt_pages(reader)

    key_counts: dict[tuple[str, str, int], int] = {}
    for row in data_rows:
        key = (str(row["hunt_code"]), str(row["residency"]), int(row["point_level"]))
        key_counts[key] = key_counts.get(key, 0) + 1

    duplicate_keys = [
        {
            "hunt_code": key[0],
            "residency": key[1],
            "point_level": key[2],
            "count": count,
        }
        for key, count in key_counts.items()
        if count > 1
    ]

    if duplicate_keys:
        raise RuntimeError(f"Duplicate grain keys detected: {duplicate_keys[:10]}")

    data_rows.sort(key=lambda row: (row["hunt_code"], row["residency"], -int(row["point_level"])))

    write_section_records(section_records)
    write_csv(data_rows)

    validation = {
        "table": "draw_breakdown",
        "draw_year": 2025,
        "source_pdf": str(PDF_PATH),
        "extraction_tool": "python+pypdf",
        "target_grain": "hunt_code x residency x point_level",
        "pages_in_pdf": len(reader.pages),
        "hunt_pages_detected": len(section_records),
        "rows_written": len(data_rows),
        "distinct_hunt_codes": len({row["hunt_code"] for row in data_rows}),
        "duplicate_key_count": len(duplicate_keys),
        "required_columns_present": True,
        "numeric_columns": [
            "point_level",
            "applicants",
            "bonus_permits",
            "random_permits",
            "total_permits",
        ],
        "summary_artifacts_role": "exploratory_only",
    }

    with VALIDATION_PATH.open("w", encoding="utf-8") as handle:
        json.dump(validation, handle, indent=2)

    status = {
        "table": "draw_breakdown",
        "draw_year": 2025,
        "target_grain": "hunt_code x residency x point_level",
        "source_pdf": str(PDF_PATH),
        "source_validity": "valid",
        "hunt_level_data_in_pdf": True,
        "status": "ready",
        "extraction_path": "tool_assisted_python",
        "extraction_tool": "pypdf",
        "current_powershell_pdf_object_path": "unsuccessful_for_production_use",
        "summary_artifacts_role": "exploratory_only",
        "rows_written": len(data_rows),
        "distinct_hunt_codes": len({row["hunt_code"] for row in data_rows}),
        "output_csv": str(CSV_PATH),
    }

    with STATUS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(status, handle, indent=2)

    print(json.dumps(status, indent=2))


if __name__ == "__main__":
    main()
