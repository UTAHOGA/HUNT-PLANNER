# Hunt Database Build Report

Built from:
- hunt_database_2026_validated.csv
- hunt_join_2025.csv
- uploaded turkey workbooks already reflected in validated source
- official source metadata retained from source_file / permit_overlay_source

## Outputs
- hunt_master_canonical_2026_built.csv
- hunt_master_canonical_2026_built.sqlite
- hunt_research_foundation_2026_built.csv

## QA
- Rows: 1289
- Unique hunt codes: 1289
- Duplicate hunt codes: 0

## Species counts
species
Elk                             558
Deer                            479
Pronghorn                       117
Moose                            32
Desert Bighorn Sheep             24
Rocky Mountain Bighorn Sheep     21
Bison                            19
Mountain Goat                    18
Turkey                           18
Black Bear                        2
Cougar                            1

## Permit status counts
permit_status
FULL_SPLIT    788
MISSING       303
TOTAL_ONLY    193
PARTIAL         5

## Data status counts
data_status
COMPLETE                       788
MISSING_PRIVATE_LAND_SOURCE    250
COMPLETE_TOTAL_ONLY            193
MISSING_CONSERVATION_SOURCE     14
MISSING_GENERAL_SOURCE          12
MISSING_STATEWIDE_SOURCE        10
MISSING_TRIBAL_SOURCE           10
COMPLETE_PARTIAL_OFFICIAL        5
MISSING_SOURCE                   4
MISSING_YOUTH_SOURCE             2
MISSING_PURSUIT_SOURCE           1

## Notes
- COMPLETE = full resident/nonresident/total permit split present
- COMPLETE_TOTAL_ONLY = official total present, split not present in source
- COMPLETE_PARTIAL_OFFICIAL = official partial row retained without fabrication
- MISSING_* = source category still needed or excluded/special source not yet integrated
