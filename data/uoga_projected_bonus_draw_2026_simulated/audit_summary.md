# Projected Bonus Draw 2026 Monte Carlo Audit

- Source corrected table: `C:\UOGA HUNTS\processed_data\projected_bonus_draw_2026.csv`
- Output simulated table: `C:\UOGA HUNTS\HUNT-PLANNER-CLEAN\data\uoga_projected_bonus_draw_2026_simulated\projected_bonus_draw_2026_simulated.csv`
- Row count: `46992`
- Distinct hunt codes: `712`
- Distinct hunt/residency pairs: `1424`

## Method

- Random-side shortcut math was removed from the simulated output.
- The carry-forward pool was left unchanged from the corrected base table.
- Each focal applicant receives `(points + 1)` random numbers.
- The simulated applicant score is the minimum of those random numbers, sampled via the exact equivalent minimum-score distribution.
- Opposing applicants are simulated tier-by-tier with Monte Carlo using the same Utah random method.

## Validation Hunts

### DB1019|Resident
- Points `27`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `1263801377`
- Points `26`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `1871122700`
- Points `25`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `3805806798`
- Points `24`: guaranteed `25.714286%`, random `1.825000%`, total `27.070000%`, iterations `20000`, seed `2290584502`
- Points `23`: guaranteed `0.000000%`, random `1.685000%`, total `1.685000%`, iterations `20000`, seed `1789896385`
- Points `22`: guaranteed `0.000000%`, random `1.670000%`, total `1.670000%`, iterations `20000`, seed `1854434536`
- Points `16`: guaranteed `0.000000%`, random `1.210000%`, total `1.210000%`, iterations `20000`, seed `73498791`
- Points `5`: guaranteed `0.000000%`, random `0.445000%`, total `0.445000%`, iterations `20000`, seed `981472435`

### DB1019|Nonresident
- Points `27`: guaranteed `33.333333%`, random `0.615000%`, total `33.743333%`, iterations `20000`, seed `2741330037`
- Points `26`: guaranteed `0.000000%`, random `0.590000%`, total `0.590000%`, iterations `20000`, seed `1320013989`
- Points `25`: guaranteed `0.000000%`, random `0.580000%`, total `0.580000%`, iterations `20000`, seed `2978716586`
- Points `24`: guaranteed `0.000000%`, random `0.435000%`, total `0.435000%`, iterations `20000`, seed `2910400029`
- Points `23`: guaranteed `0.000000%`, random `0.545000%`, total `0.545000%`, iterations `20000`, seed `3942792066`
- Points `22`: guaranteed `0.000000%`, random `0.430000%`, total `0.430000%`, iterations `20000`, seed `119297267`
- Points `16`: guaranteed `0.000000%`, random `0.325000%`, total `0.325000%`, iterations `20000`, seed `689113986`
- Points `5`: guaranteed `0.000000%`, random `0.125000%`, total `0.125000%`, iterations `20000`, seed `2428091331`

### DB1000|Resident
- Points `27`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `2659835468`
- Points `26`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `1483830066`
- Points `25`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `1484064005`
- Points `24`: guaranteed `100.000000%`, random `0.000000%`, total `100.000000%`, iterations `20000`, seed `4082768423`
- Points `23`: guaranteed `66.666667%`, random `1.685000%`, total `67.228334%`, iterations `20000`, seed `1463592652`
- Points `22`: guaranteed `0.000000%`, random `1.835000%`, total `1.835000%`, iterations `20000`, seed `2020805513`
- Points `16`: guaranteed `0.000000%`, random `1.280000%`, total `1.280000%`, iterations `20000`, seed `3140623722`
- Points `5`: guaranteed `0.000000%`, random `0.570000%`, total `0.570000%`, iterations `20000`, seed `3879089871`

### O.I.L. validation
- Validated RS6701|Resident with Monte Carlo output.

Utah doesn’t use simple odds, so we don’t either.
