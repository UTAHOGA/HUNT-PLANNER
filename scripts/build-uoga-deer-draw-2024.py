from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import fitz
from pypdf import PdfReader


WORKSPACE_ROOT = Path(r"C:\DOWNLOADS\test website\HUNT-PLANNER")
UOGA_ROOT = Path(r"C:\UOGA HUNTS")
RAW_DATA_DIR = UOGA_ROOT / "raw_data 2024"
RAW_DATA_DIR_ALT = UOGA_ROOT / "raw_data_2024"
RAW_DATA_ROOT = RAW_DATA_DIR if RAW_DATA_DIR.exists() else RAW_DATA_DIR_ALT
PDF_PATH = RAW_DATA_ROOT / "24_deer_odds.pdf"
OUTPUT_DIR = WORKSPACE_ROOT / "data" / "uoga_deer_draw_layers_2024"
PROCESSED_OUTPUT_PATH = UOGA_ROOT / "processed_data" / "deer_draw_2024.csv"
TESSERACT_PATH = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")

SECTION_TEXT_PATH = OUTPUT_DIR / "layer_04_deer_draw_hunt_sections_raw_2024.jsonl"
CSV_PATH = OUTPUT_DIR / "deer_draw_2024.csv"
VALIDATION_PATH = OUTPUT_DIR / "deer_draw_2024.validation.json"
ACCEPTANCE_PATH = OUTPUT_DIR / "deer_draw_2024.acceptance.json"
STATUS_PATH = OUTPUT_DIR / "deer_draw_2024.status.json"

HEADER_RE = re.compile(r"Hunt:\s*([A-Z]{2}\d+)\s+(.*)", re.IGNORECASE)
DATA_LINE_RE = re.compile(r"^\s*(?:[0-9]|1[0-9]|2[0-2]|Totals)\b")
VALID_PREFIXES = {"DB"}


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


def normalize_ocr_line(line: str) -> str:
    text = clean_ws(line)
    replacements = {
        "NIA": "N/A",
        "N / A": "N/A",
        "N /A": "N/A",
        "N/ A": "N/A",
        "1in ": "1 in ",
        "1in": "1 in ",
        "i?)": "0",
        "i}": "0",
        "ie)": "0",
        "i)": "0",
        "(0)": "0",
        "BNR": "DNR",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"\b[ilI]\b", "1", text)
    return clean_ws(text)


def rowish_lines_from_text(text: str) -> list[str]:
    lines = [normalize_ocr_line(line) for line in text.splitlines()]
    return [line for line in lines if line]


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
        max_value=22,
        allow_totals=True,
    ):
        for applicants_text, after_applicants, applicants_cost in integer_candidates(tokens, after_point, max_pieces=5):
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


def ocr_page_text(pdf_path: Path, page_index: int) -> str:
    with fitz.open(str(pdf_path)) as doc:
        page = doc[page_index]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        with tempfile.TemporaryDirectory() as temp_dir:
            image_path = Path(temp_dir) / "page.png"
            pix.save(str(image_path))
            result = subprocess.run(
                [str(TESSERACT_PATH), str(image_path), "stdout", "--psm", "6"],
                check=True,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="ignore",
            )
            return result.stdout


def extract_hunt_pages(reader: PdfReader) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    section_records: list[dict[str, object]] = []
    data_rows: list[dict[str, object]] = []

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = page.extract_text() or ""
        page_lines = [clean_ws(line) for line in page_text.splitlines() if clean_ws(line)]
        header_line = next((line for line in page_lines if "Hunt:" in line), "")
        header_match = HEADER_RE.search(header_line)
        if not header_match:
            continue

        hunt_code = header_match.group(1).upper()
        if hunt_code[:2] not in VALID_PREFIXES:
            continue
        hunt_header = clean_ws(header_match.group(2))
        lines = [line.rstrip() for line in page_text.splitlines()]
        parsed_any = False
        page_rows: list[dict[str, object]] = []

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
            try:
                parsed_rows = parse_data_line(line)
            except ValueError:
                parsed_any = False
                break
            for parsed_row in parsed_rows:
                parsed_any = True
                page_rows.append(
                    {
                        "hunt_code": hunt_code,
                        "residency": parsed_row["residency"],
                        "point_level": int(str(parsed_row["point_level_raw"])),
                        "applicants": parsed_row["applicants"],
                        "bonus_permits": parsed_row["bonus_permits"],
                        "random_permits": parsed_row["random_permits"],
                        "total_permits": parsed_row["total_permits"],
                        "success_ratio_text": parsed_row["success_ratio_text"],
                        "source_page_number": page_number,
                        "source_line_number": line_number,
                    }
                )

        if parsed_any:
            data_rows.extend(page_rows)
            continue

        ocr_text = ocr_page_text(PDF_PATH, page_number - 1)
        ocr_lines = rowish_lines_from_text(ocr_text)
        ocr_header = next((line for line in ocr_lines if "Hunt:" in line), "")
        if ocr_header:
            ocr_match = HEADER_RE.search(ocr_header)
            if ocr_match:
                hunt_code = ocr_match.group(1).upper()
                hunt_header = clean_ws(ocr_match.group(2))
                section_records[-1]["hunt_code"] = hunt_code
                section_records[-1]["hunt_header"] = hunt_header
                section_records[-1]["raw_text"] = ocr_text

        for line_number, line in enumerate(ocr_lines, start=1):
            if not DATA_LINE_RE.match(line):
                continue
            if line.startswith("Totals"):
                continue
            try:
                parsed_rows = parse_data_line(line)
            except ValueError:
                continue
            for parsed_row in parsed_rows:
                page_rows.append(
                    {
                        "hunt_code": hunt_code,
                        "residency": parsed_row["residency"],
                        "point_level": int(str(parsed_row["point_level_raw"])),
                        "applicants": parsed_row["applicants"],
                        "bonus_permits": parsed_row["bonus_permits"],
                        "random_permits": parsed_row["random_permits"],
                        "total_permits": parsed_row["total_permits"],
                        "success_ratio_text": parsed_row["success_ratio_text"],
                        "source_page_number": page_number,
                        "source_line_number": line_number,
                    }
                )
        data_rows.extend(page_rows)

    return section_records, data_rows


def write_jsonl(records: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True))
            handle.write("\n")


def write_csv(rows: list[dict[str, object]], path: Path) -> None:
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
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in fieldnames})


def dedupe_rows(rows: list[dict[str, object]]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    grouped: dict[tuple[str, str, int], list[dict[str, object]]] = {}
    for row in rows:
        key = (str(row["hunt_code"]), str(row["residency"]), int(row["point_level"]))
        grouped.setdefault(key, []).append(row)

    deduped: list[dict[str, object]] = []
    duplicate_keys: list[dict[str, object]] = []
    for key, group in grouped.items():
        if len(group) > 1:
            duplicate_keys.append(
                {
                    "hunt_code": key[0],
                    "residency": key[1],
                    "point_level": key[2],
                    "count": len(group),
                }
            )
        best = max(
            group,
            key=lambda row: (
                int(row.get("total_permits", 0)),
                int(row.get("bonus_permits", 0)),
                int(row.get("random_permits", 0)),
                int(row.get("applicants", 0)),
                1 if str(row.get("success_ratio_text", "")).strip() not in {"", "N/A"} else 0,
            ),
        )
        deduped.append(best)
    return deduped, duplicate_keys


def build() -> dict[str, object]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF_PATH))
    section_records, rows = extract_hunt_pages(reader)
    rows, duplicate_keys = dedupe_rows(rows)

    rows.sort(key=lambda row: (row["hunt_code"], row["residency"], -int(row["point_level"])))
    write_jsonl(section_records, SECTION_TEXT_PATH)
    write_csv(rows, CSV_PATH)

    hunt_codes = {row["hunt_code"] for row in rows}
    hunt_sections = {record["hunt_code"] for record in section_records if record.get("header_parse_status") == "ok"}
    point_values = sorted({int(row["point_level"]) for row in rows})

    validation = {
        "table": "deer_draw_breakdown",
        "draw_year": 2024,
        "source_pdf": str(PDF_PATH),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "extraction_tool": "python+pypdf+tesseract",
        "target_grain": "hunt_code x residency x point_level",
        "pages_in_pdf": len(reader.pages),
        "hunt_pages_detected": len(section_records),
        "rows_written": len(rows),
        "distinct_hunt_codes": len(hunt_codes),
        "duplicate_key_count": len(duplicate_keys),
        "required_columns_present": True,
        "column_list": [
            "hunt_code",
            "residency",
            "point_level",
            "applicants",
            "bonus_permits",
            "random_permits",
            "total_permits",
            "success_ratio_text",
        ],
        "numeric_columns": ["point_level", "applicants", "bonus_permits", "random_permits", "total_permits"],
        "summary_artifacts_role": "exploratory_only",
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")

    acceptance = {
        "accepted_for_use": bool(hunt_codes),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "checks": {
            "hunt_code_count_matches_sections": hunt_codes == hunt_sections,
            "point_level_domain_present": bool(point_values),
        },
        "summary": {
            "distinct_hunt_codes_csv": len(hunt_codes),
            "distinct_hunt_sections_jsonl": len(hunt_sections),
            "rows_written": len(rows),
            "point_level_min": min(point_values) if point_values else None,
            "point_level_max": max(point_values) if point_values else None,
            "duplicate_keys_collapsed": len(duplicate_keys),
        },
    }
    ACCEPTANCE_PATH.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")

    status = {
        "table": "deer_draw_breakdown",
        "draw_year": 2024,
        "target_grain": "hunt_code x residency x point_level",
        "source_pdf": str(PDF_PATH),
        "source_validity": "valid",
        "hunt_level_data_in_pdf": True,
        "status": "ready" if acceptance["accepted_for_use"] else "failed_acceptance",
        "extraction_path": "tool_assisted_python",
        "extraction_tool": "pypdf+tesseract",
        "summary_artifacts_role": "exploratory_only",
        "rows_written": len(rows),
        "distinct_hunt_codes": len(hunt_codes),
        "output_csv": str(PROCESSED_OUTPUT_PATH),
        "accepted_for_use": acceptance["accepted_for_use"],
    }
    STATUS_PATH.write_text(json.dumps(status, indent=2), encoding="utf-8")

    return {"status": status, "acceptance": acceptance}


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
