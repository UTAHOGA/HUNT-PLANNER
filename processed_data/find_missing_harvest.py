
out_path = r"C:\UOGA HUNTS\processed_data\trend_2025_missing_harvest_rows.csv"
missing_clean.to_csv(out_path, index=False)

print("DONE")
print(f"Saved to: {out_path}")
print(f"Missing rows: {len(missing_clean)}")