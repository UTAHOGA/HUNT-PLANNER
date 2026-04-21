from __future__ import annotations

import csv
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path


WINDOWS_ROOT = Path(r"C:\UOGA HUNTS")
POSIX_ROOT = Path("/mnt/c/UOGA HUNTS")
ROOT = POSIX_ROOT if POSIX_ROOT.exists() else WINDOWS_ROOT

APP_ROOT = ROOT / "HUNT-PLANNER"
RAW_2026 = ROOT / "raw_data_2026"
PROCESSED = APP_ROOT / "processed_data"

JOIN_PATH = PROCESSED / "hunt_join_2025.csv"
PERMITS_PATH = PROCESSED / "recommended_permits_2026.csv"
OUTPUT_CSV = PROCESSED / "recommended_permits_2026_workbook_backfill_candidates.csv"
OUTPUT_JSON = PROCESSED / "recommended_permits_2026_workbook_backfill_summary.json"

NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
HUNT_CODE_RE = re.compile(r"^[A-Z]{2}\d{4}$")
RES_RE = re.compile(r"Res:\s*(\d+)", re.IGNORECASE)
NONRES_RE = re.compile(r"NonRes:\s*(\d+)", re.IGNORECASE)
TOTAL_RE = re.compile(r"^(?:permits?:\s*)?(\d+)$", re.IGNORECASE)

WORKBOOKS: list[tuple[str, str]] = [
    ("BULL ELK DATABASE.xlsx", "Elk"),
    ("BUCK DEER.xlsx", "Deer"),
    ("pronghorn buck.xlsx", "Pronghorn"),
    ("pronghorn doe.xlsx", "Pronghorn"),
    ("bull moose.xlsx", "Moose"),
    ("cow moose.xlsx", "Moose"),
    ("mtn goat.xlsx", "Mountain Goat"),
    ("desert sheep ram.xlsx", "Desert Bighorn Sheep"),
    ("rocky mtn. sheep.xlsx", "Rocky Mountain Bighorn Sheep"),
    ("rocky mtn sheep ewe.xlsx", "Rocky Mountain Bighorn Sheep"),
    ("bison bull.xlsx", "Bison"),
    ("bison  cow.xlsx", "Bison"),
    ("antlerless deer.xlsx", "Deer"),
    ("antlerless elk.xlsx", "Elk"),
    ("black bear.xlsx", "Black Bear"),
    ("cougar.xlsx", "Cougar"),
    ("deer hunter's choice.xlsx", "Deer"),
    ("bull elk hunter's choice.xlsx", "Elk"),
    ("Turkey Bearded.xlsx", "Turkey"),
    ("Turkey  Either Sex.xlsx", "Turkey"),
]


def clean(value: object) -> str:
    return str(value or "").strip()


def column_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    total = 0
    for char in letters:
        total = total * 26 + (ord(char.upper()) - ord("A") + 1)
    return max(total - 1, 0)


def load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for item in root.findall("main:si", NS):
        text = "".join(node.text or "" for node in item.iterfind(".//main:t", NS))
        strings.append(text)
    return strings


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iterfind(".//main:t", NS)).strip()
    value = cell.find("main:v", NS)
    if value is None or value.text is None:
        return ""
    raw = value.text.strip()
    if cell_type == "s":
        index = int(raw)
        return shared_strings[index] if 0 <= index < len(shared_strings) else raw
    return raw


def read_xlsx_rows(path: Path) -> list[list[str]]:
    with zipfile.ZipFile(path) as archive:
        shared_strings = load_shared_strings(archive)
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    rows: list[list[str]] = []
    for row in root.findall(".//main:sheetData/main:row", NS):
        values: dict[int, str] = {}
        max_index = -1
        for cell in row.findall("main:c", NS):
            ref = cell.attrib.get("r", "A1")
            index = column_index(ref)
            values[index] = clean(cell_value(cell, shared_strings))
            max_index = max(max_index, index)
        if max_index < 0:
            rows.append([])
            continue
        rows.append([values.get(i, "") for i in range(max_index + 1)])
    return rows


def parse_permit_text(value: str) -> tuple[int | None, int | None, int | None]:
    text = clean(value)
    if not text:
        return None, None, None
    res_match = RES_RE.search(text)
    nonres_match = NONRES_RE.search(text)
    total_match = TOTAL_RE.match(text)
    resident = int(res_match.group(1)) if res_match else None
    nonresident = int(nonres_match.group(1)) if nonres_match else None
    total = int(total_match.group(1)) if total_match else None
    return resident, nonresident, total


def load_join_codes() -> set[str]:
    codes: set[str] = set()
    with JOIN_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            code = clean(row.get("hunt_code"))
            if code:
                codes.add(code)
    return codes


def load_existing_permit_codes() -> set[str]:
    codes: set[str] = set()
    with PERMITS_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            code = clean(row.get("hunt_code"))
            if code:
                codes.add(code)
    return codes


def extract_candidates(path: Path, species_hint: str, join_codes: set[str], existing_codes: set[str]) -> list[dict[str, str]]:
    rows = read_xlsx_rows(path)
    candidates: list[dict[str, str]] = []
    seen_codes: set[str] = set()

    for index, row in enumerate(rows):
        code = clean(row[1]).upper() if len(row) > 1 else ""
        if not HUNT_CODE_RE.match(code):
            continue
        if code not in join_codes or code in existing_codes or code in seen_codes:
            continue

        hunt_name = clean(row[0]) if len(row) > 0 else ""
        sex_type = clean(row[2]) if len(row) > 2 else ""
        species = clean(row[3]) if len(row) > 3 else species_hint
        weapon = clean(row[4]) if len(row) > 4 else ""
        access_class = clean(row[5]) if len(row) > 5 else ""
        season = clean(row[6]) if len(row) > 6 else ""
        permit_text = clean(row[7]) if len(row) > 7 else ""

        resident, nonresident, total = parse_permit_text(permit_text)
        next_text = ""
        if index + 1 < len(rows):
            next_row = rows[index + 1]
            next_text = clean(next_row[7]) if len(next_row) > 7 else ""
        if nonresident is None and next_text:
            _, nonresident, _ = parse_permit_text(next_text)

        if total is None and resident is not None and nonresident is not None:
            total = resident + nonresident
        if total is None and resident is not None and nonresident is None:
            total = resident

        if resident is None and nonresident is None and total is None:
            continue

        candidates.append(
            {
                "hunt_code": code,
                "species": species or species_hint,
                "hunt_name": hunt_name,
                "weapon": weapon,
                "sex_type": sex_type,
                "access_class": access_class,
                "season": season,
                "resident_permits": "" if resident is None else str(resident),
                "nonresident_permits": "" if nonresident is None else str(nonresident),
                "total_permits": "" if total is None else str(total),
                "source_workbook": path.name,
                "source_permit_text": permit_text,
                "source_next_row_text": next_text,
            }
        )
        seen_codes.add(code)

    return candidates


def main() -> None:
    join_codes = load_join_codes()
    existing_codes = load_existing_permit_codes()

    all_candidates: list[dict[str, str]] = []
    by_workbook = Counter()

    for filename, species_hint in WORKBOOKS:
        path = RAW_2026 / filename
        if not path.exists():
            continue
        candidates = extract_candidates(path, species_hint, join_codes, existing_codes)
        all_candidates.extend(candidates)
        by_workbook[filename] = len(candidates)

    fieldnames = [
        "hunt_code",
        "species",
        "hunt_name",
        "weapon",
        "sex_type",
        "access_class",
        "season",
        "resident_permits",
        "nonresident_permits",
        "total_permits",
        "source_workbook",
        "source_permit_text",
        "source_next_row_text",
    ]

    all_candidates.sort(key=lambda row: (row["species"], row["hunt_code"]))
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_candidates)

    summary = {
        "join_hunt_codes": len(join_codes),
        "existing_permit_codes": len(existing_codes),
        "candidate_backfill_rows": len(all_candidates),
        "candidate_distinct_hunt_codes": len({row["hunt_code"] for row in all_candidates}),
        "by_workbook": dict(by_workbook),
        "output_csv": str(OUTPUT_CSV),
    }
    with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)

    print(f"Wrote workbook permit backfill candidates: {OUTPUT_CSV}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
