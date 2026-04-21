# DWR-Aligned Hunt Database Foundation Report
Built from uploaded files:
- hunt_database_2026_validated.csv
- hunt_join_2025.csv

## Output files
- hunt_master_canonical_2026_dwr_aligned.csv
- hunt_history_2025_2026_dwr_aligned.csv
- hunt_database_foundation_dwr_aligned.sqlite

## Locked structure
- Kept DWR-native identifiers: `hunt_number`, `hunt_name`
- Kept selection matrix shape: `species`, `sex_type`, `hunt_type`, `weapon`, `hunt_class`
- Added hidden database/control fields only where useful: `hunt_subclass`, `access_type`, `eligibility_class`, `display_in_matrix`, `draw_family`
- Did **not** add season-start/season-end fields

## 2026 canonical summary
- Rows: 1,289
- Unique hunt numbers: 1,289
- Duplicate hunt numbers: 0

### Species counts
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

### Hunt type counts
hunt_type
Limited Entry                         286
CWMU                                  284
General Season                        282
Limited Entry - Private Land Only     145
General Season - Private Land Only    105
Once-in-a-lifetime                     80
Private Lands Only                     27
Conservation                           25
Statewide                              10
Tribal                                 10
Premium Limited Entry                  10
Management Buck Deer                    5
General Season - Any Bull               5
Fall Management                         4
General Season - Spike Bull             3
Extended Archery                        2
Pursuit                                 1
Cactus Buck                             1
Antlerless Elk Control                  1
General Season - Archery                1
General Season - Youth                  1
Spring General Season                   1

### Hunt class counts
hunt_class
Limited Entry             286
General Season            284
CWMU                      284
Private Land Only         277
Once-in-a-Lifetime         80
Conservation               25
Premium Limited Entry      10
Statewide                  10
Tribal                     10
Management                 10
General Any Bull            5
Spike Only                  3
Extended Archery            2
Pursuit                     1
Antlerless Elk Control      1
Youth                       1

### Access type counts
access_type
Public               835
CWMU                 284
Private Land Only    160
Tribal                10

### Matrix visibility counts
display_in_matrix
yes    1129
no      160

### 2026 permit status counts
permit_status_2026
FULL_SPLIT    788
MISSING       303
TOTAL_ONLY    193
PARTIAL         5

### Data status counts
data_status
COMPLETE                     788
COMPLETE_TOTAL_ONLY          191
SUPPRESSED_FROM_MATRIX       160
MISSING_SOURCE               145
COMPLETE_PARTIAL_OFFICIAL      5

## Important decisions applied
- Exclusive private-land-only hunts are retained in the database but flagged `display_in_matrix = no`.
- CWMU hunts are retained as draw hunts and kept visible in the matrix.
- HAMSS remains under `weapon` where present.
- Expo/conservation treatment was **not** surfaced in the matrix; that remains a hidden rules/data issue.
- 2025 history is attached where present from `hunt_join_2025` and prior permit fields.
- 2024 and 2023 were **not** built because those source files were not uploaded.

## What still needs to be uploaded for full modeling
- 2024 permit history
- 2024 harvest/hunter/success history
- 2023 permit history
- 2023 harvest/hunter/success history
- any official draw-history tables needed for rule validation across years
