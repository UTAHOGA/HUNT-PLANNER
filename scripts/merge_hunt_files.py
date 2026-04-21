from pathlib import Path
import pandas as pd

# --- EXACT FILE PATHS ---
MAIN_FILE = Path(r"C:\UOGA HUNTS\HUNT-PLANNER-CLEAN\processed_data\hunt_database_2026_enriched2.csv")
ELK_FILE = Path(r"C:\UOGA HUNTS\raw_data_2026\2026 hunt files\bull_elk.csv")
OUTPUT_FILE = Path(r"C:\UOGA HUNTS\HUNT-PLANNER-CLEAN\processed_data\hunt_database_2026_merged.csv")

permit_col = "Permit_number_res | Permit_number_nr | Permit_number_total"
permit_fields = ["permits_2026_res", "permits_2026_nr", "permits_2026_total"]
join_keys = ["hunt_code", "weapon"]

def is_bad_value(v: str) -> bool:
    s = str(v).strip()
    if s == "":
        return True
    return not s.isdigit()

print(f"Loading main file: {MAIN_FILE}")
print(f"Loading donor file: {ELK_FILE}")

if not MAIN_FILE.exists():
    raise FileNotFoundError(f"Main file not found: {MAIN_FILE}")
if not ELK_FILE.exists():
    raise FileNotFoundError(f"Donor file not found: {ELK_FILE}")

main = pd.read_csv(MAIN_FILE, dtype=str).fillna("")
elk = pd.read_csv(ELK_FILE, dtype=str).fillna("")

print("\nDonor columns found:")
for c in elk.columns:
    print(f"  {repr(c)}")

if permit_col not in elk.columns:
    raise ValueError(
        f"Missing expected donor column: {permit_col}\n"
        f"Actual donor columns: {list(elk.columns)}"
    )

split_permits = elk[permit_col].astype(str).str.split("|", expand=True)

print(f"\nSplit permit column parts: {split_permits.shape[1]}")

if split_permits.shape[1] < 3:
    raise ValueError("Donor permit column did not split into 3 parts.")

elk["permits_2026_res"] = split_permits[0].str.strip()
elk["permits_2026_nr"] = split_permits[1].str.strip()
elk["permits_2026_total"] = split_permits[2].str.strip()

elk = elk.drop(columns=[permit_col, "_"], errors="ignore")

for col in join_keys:
    if col not in main.columns:
        raise ValueError(f"Missing required column in main file: {col}")
    if col not in elk.columns:
        raise ValueError(f"Missing required column in donor file: {col}")

donor = elk[join_keys + permit_fields].copy()

merged = main.merge(
    donor,
    on=join_keys,
    how="left",
    suffixes=("", "_donor")
)

replacement_counts = {}

for col in permit_fields:
    donor_col = f"{col}_donor"
    before_bad = merged[col].apply(is_bad_value).sum() if col in merged.columns else 0

    merged[col] = merged.apply(
        lambda row: row[donor_col]
        if is_bad_value(row.get(col, "")) and str(row.get(donor_col, "")).strip() != ""
        else row.get(col, ""),
        axis=1
    )

    after_bad = merged[col].apply(is_bad_value).sum()
    replacement_counts[col] = int(before_bad - after_bad)

merged = merged.drop(columns=[c for c in merged.columns if c.endswith("_donor")], errors="ignore")
merged.to_csv(OUTPUT_FILE, index=False)

print("\nMerge complete.")
print(f"Output file: {OUTPUT_FILE}")
print(f"Output rows: {len(merged)}")
print("Replacements made:")
for k, v in replacement_counts.items():
    print(f"  {k}: {v}")