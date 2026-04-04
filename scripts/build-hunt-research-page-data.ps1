$ErrorActionPreference = 'Stop'

$root = 'C:\UOGA HUNTS\HUNT-PLANNER'
$processedDir = Join-Path $root 'processed_data'
$dataDir = Join-Path $root 'data'

$huntJoinPath = 'C:\UOGA HUNTS\HUNT-PLANNER\processed_data\hunt_join_2025.csv'
$huntScoresPath = 'C:\UOGA HUNTS\processed_data\2025\hunt_scores_2025.csv'
$huntWithOutfittersPath = 'C:\UOGA HUNTS\processed_data\2025\hunt_with_outfitters_2025.csv'
$bonusDrawPath = 'C:\UOGA HUNTS\HUNT-PLANNER\processed_data\draw_breakdown_2025.csv'
$antlerlessDrawPath = 'C:\UOGA HUNTS\processed_data\2025\antlerless_draw_2025.csv'
$recommendedPermitsPath = 'C:\UOGA HUNTS\HUNT-PLANNER\processed_data\recommended_permits_2026.csv'
$projectedBonusPath = 'C:\UOGA HUNTS\processed_data\projected_bonus_draw_2026_simulated.csv'
$huntMasterPath = Join-Path $dataDir 'utah-hunt-planner-master-all.json'

$bundlePath = Join-Path $processedDir 'hunt_research_2026.json'

if (-not (Test-Path $processedDir)) {
  New-Item -ItemType Directory -Path $processedDir | Out-Null
}

function To-NullableNumber {
  param([object]$Value)

  if ($null -eq $Value) { return $null }
  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) { return $null }

  $clean = ($text -replace '[^0-9\.\-]', '')
  if ([string]::IsNullOrWhiteSpace($clean)) { return $null }

  $number = 0.0
  if ([double]::TryParse($clean, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return $number
  }

  return $null
}

function To-NullableInt {
  param([object]$Value)

  $number = To-NullableNumber $Value
  if ($null -eq $number) { return $null }
  return [int][Math]::Round($number, 0)
}

function To-NullableLong {
  param([object]$Value)

  $number = To-NullableNumber $Value
  if ($null -eq $number) { return $null }
  return [long][Math]::Round($number, 0)
}

function To-Bool {
  param([object]$Value)

  $text = ([string]$Value).Trim().ToLowerInvariant()
  return $text -in @('true', 'yes', '1')
}

function Sort-PointRowsDescending {
  param([System.Collections.IEnumerable]$Rows, [string]$PointField)
  return @($Rows | Sort-Object { [int]($_.$PointField) } -Descending)
}

$huntJoinRows = Import-Csv -LiteralPath $huntJoinPath
$huntScoresRows = Import-Csv -LiteralPath $huntScoresPath
$huntWithOutfittersRows = Import-Csv -LiteralPath $huntWithOutfittersPath
$bonusDrawRows = Import-Csv -LiteralPath $bonusDrawPath
$antlerlessDrawRows = Import-Csv -LiteralPath $antlerlessDrawPath
$recommendedPermitRows = Import-Csv -LiteralPath $recommendedPermitsPath
$projectedBonusRows = Import-Csv -LiteralPath $projectedBonusPath
$huntMasterRows = Get-Content -Raw -LiteralPath $huntMasterPath | ConvertFrom-Json

$scoresByCode = @{}
foreach ($row in $huntScoresRows) {
  $scoresByCode[$row.hunt_code] = $row
}

$outfittersByCode = @{}
foreach ($row in $huntWithOutfittersRows) {
  $outfittersByCode[$row.hunt_code] = $row
}

$masterByCode = @{}
foreach ($row in $huntMasterRows) {
  $code = [string]$row.huntCode
  if (-not [string]::IsNullOrWhiteSpace($code) -and -not $masterByCode.ContainsKey($code)) {
    $masterByCode[$code] = $row
  }
}

$recommendedPermitsByCode = @{}
foreach ($row in $recommendedPermitRows) {
  $code = [string]$row.hunt_code
  if ([string]::IsNullOrWhiteSpace($code)) { continue }

  $recommendedPermitsByCode[$code] = [pscustomobject]@{
    recommendation_year = To-NullableInt $row.recommendation_year
    permit_category = $row.permit_category
    section_title = $row.section_title
    hunt_name = $row.hunt_name
    weapon = $row.weapon
    sex_type = $row.sex_type
    access_class = $row.access_class
    resident_permits = To-NullableInt $row.resident_permits
    nonresident_permits = To-NullableInt $row.nonresident_permits
    total_permits = To-NullableInt $row.total_permits
    resident_permits_prior = To-NullableInt $row.resident_permits_prior
    nonresident_permits_prior = To-NullableInt $row.nonresident_permits_prior
    total_permits_prior = To-NullableInt $row.total_permits_prior
    source_page_number = To-NullableInt $row.source_page_number
    source_type = $row.source_type
    source_authority_level = $row.source_authority_level
  }
}

$bonusByCode = @{}
foreach ($row in $bonusDrawRows) {
  $code = [string]$row.hunt_code
  if (-not $bonusByCode.ContainsKey($code)) {
    $bonusByCode[$code] = @{
      Resident = New-Object System.Collections.ArrayList
      Nonresident = New-Object System.Collections.ArrayList
    }
  }

  $entry = [ordered]@{
    point_level = To-NullableInt $row.point_level
    applicants = To-NullableInt $row.applicants
    bonus_permits = To-NullableInt $row.bonus_permits
    random_permits = To-NullableInt $row.random_permits
    total_permits = To-NullableInt $row.total_permits
    success_ratio_text = $row.success_ratio_text
  }

  [void]$bonusByCode[$code][$row.residency].Add([pscustomobject]$entry)
}

$antlerlessByCode = @{}
foreach ($row in $antlerlessDrawRows) {
  $code = [string]$row.hunt_code
  if (-not $antlerlessByCode.ContainsKey($code)) {
    $antlerlessByCode[$code] = @{
      land_type = $row.land_type
      Resident = New-Object System.Collections.ArrayList
      Nonresident = New-Object System.Collections.ArrayList
    }
  }

  $entry = [ordered]@{
    point_level = To-NullableInt $row.point_level
    applicants = To-NullableInt $row.applicants
    permits_awarded = To-NullableInt $row.permits_awarded
    success_ratio_text = $row.success_ratio_text
    land_type = $row.land_type
  }

  [void]$antlerlessByCode[$code][$row.residency].Add([pscustomobject]$entry)
}

$projectedByCode = @{}
foreach ($row in $projectedBonusRows) {
  $code = [string]$row.hunt_code
  if (-not $projectedByCode.ContainsKey($code)) {
    $projectedByCode[$code] = @{
      Resident = New-Object System.Collections.ArrayList
      Nonresident = New-Object System.Collections.ArrayList
    }
  }

  $entry = [ordered]@{
    apply_with_points = To-NullableInt $row.apply_with_points
    current_recommended_permits = To-NullableInt $row.current_recommended_permits
    prior_year_permits = To-NullableInt $row.prior_year_permits
    projected_bonus_pool_permits = To-NullableInt $row.projected_bonus_pool_permits
    projected_random_pool_permits = To-NullableInt $row.projected_random_pool_permits
    projected_total_applicants_at_point = To-NullableInt $row.projected_total_applicants_at_point
    projected_bonus_pool_applicants = To-NullableInt $row.projected_bonus_pool_applicants
    projected_random_pool_applicants = To-NullableInt $row.projected_random_pool_applicants
    projected_guaranteed_draws_at_point = To-NullableInt $row.projected_guaranteed_draws_at_point
    projected_guaranteed_probability_pct = To-NullableNumber $row.projected_guaranteed_probability_pct
    projected_random_probability_pct = To-NullableNumber $row.projected_random_probability_pct
    projected_total_probability_pct = To-NullableNumber $row.projected_total_probability_pct
    projected_bonus_cutoff_point = To-NullableInt $row.projected_bonus_cutoff_point
    projected_cutoff_point = To-NullableInt $row.projected_cutoff_point
    projected_cutoff_pressure_ratio = To-NullableNumber $row.projected_cutoff_pressure_ratio
    projected_remaining_applicants_after_bonus = To-NullableInt $row.projected_remaining_applicants_after_bonus
    projected_remaining_weighted_random_tickets = To-NullableInt $row.projected_remaining_weighted_random_tickets
    projected_carryover_pool_at_point = To-NullableInt $row.projected_carryover_pool_at_point
    source_2025_total_applicants = To-NullableInt $row.source_2025_total_applicants
    source_2025_total_winners = To-NullableInt $row.source_2025_total_winners
    projection_method = $row.projection_method
    random_method = $row.random_method
    simulation_iterations = To-NullableInt $row.simulation_iterations
    simulation_seed = To-NullableLong $row.simulation_seed
    permit_source_type = $row.permit_source_type
    permit_source_authority = $row.permit_source_authority
    permit_source_page_number = To-NullableInt $row.permit_source_page_number
    permit_category = $row.permit_category
    section_title = $row.section_title
    is_guaranteed_draw = To-Bool $row.is_guaranteed_draw
    is_cutoff_tier = To-Bool $row.is_cutoff_tier
    corrections_applied = $row.corrections_applied
  }

  [void]$projectedByCode[$code][$row.residency].Add([pscustomobject]$entry)
}

$bundleRows = New-Object System.Collections.ArrayList

foreach ($huntRow in $huntJoinRows) {
  $code = [string]$huntRow.hunt_code
  $scoreRow = $scoresByCode[$code]
  $outfitterRow = $outfittersByCode[$code]
  $masterRow = $masterByCode[$code]
  $recommendedPermitRow = $recommendedPermitsByCode[$code]
  $bonusRowSet = $bonusByCode[$code]
  $antlerlessRowSet = $antlerlessByCode[$code]
  $projectedRowSet = $projectedByCode[$code]

  $payload = [ordered]@{
    hunt_code = $code
    species = $huntRow.species
    hunt_name = $huntRow.hunt_name
    hunt_type = $huntRow.hunt_type
    weapon = $huntRow.weapon
    sex_type = $huntRow.sex_type
    access_type = $huntRow.access_type
    permits_total = To-NullableInt $huntRow.permits_total
    hunters = To-NullableInt $huntRow.hunters
    harvest = To-NullableInt $huntRow.harvest
    percent_success = To-NullableNumber $huntRow.percent_success
    avg_days = To-NullableNumber $huntRow.avg_days
    satisfaction = To-NullableNumber $huntRow.satisfaction
    has_harvest = To-Bool $huntRow.has_harvest
    has_bonus_draw = To-Bool $huntRow.has_bonus_draw
    has_antlerless_draw = To-Bool $huntRow.has_antlerless_draw
    draw_family = if ($scoreRow) { $scoreRow.draw_family } else { $null }
    draw_presence_flag = if ($scoreRow) { $scoreRow.draw_presence_flag } else { $null }
    score_family = if ($scoreRow) { $scoreRow.score_family } else { $null }
    public_rank_eligible = if ($scoreRow) { $scoreRow.public_rank_eligible } else { $null }
    draw_difficulty_flag = if ($scoreRow) { $scoreRow.draw_difficulty_flag } else { $null }
    resident_point_signal = if ($scoreRow) { To-NullableNumber $scoreRow.resident_point_signal } else { $null }
    nonresident_point_signal = if ($scoreRow) { To-NullableNumber $scoreRow.nonresident_point_signal } else { $null }
    harvest_success_score = if ($scoreRow) { To-NullableNumber $scoreRow.harvest_success_score } else { $null }
    harvest_pressure_score = if ($scoreRow) { To-NullableNumber $scoreRow.harvest_pressure_score } else { $null }
    harvest_efficiency_score = if ($scoreRow) { To-NullableNumber $scoreRow.harvest_efficiency_score } else { $null }
    scoring_notes = if ($scoreRow) { $scoreRow.scoring_notes } else { $null }
    draw_access_score = if ($outfitterRow) { To-NullableNumber $outfitterRow.draw_access_score } else { $null }
    verified_outfitter_count = if ($outfitterRow) { To-NullableInt $outfitterRow.verified_outfitter_count } else { 0 }
    cpo_outfitter_count = if ($outfitterRow) { To-NullableInt $outfitterRow.cpo_outfitter_count } else { 0 }
    dwr_boundary_link = if ($masterRow) { [string]$masterRow.boundaryLink } else { $null }
    dwr_source_guide = if ($masterRow) { [string]$masterRow.sourceGuide } else { $null }
    dwr_unit_name = if ($masterRow) { [string]$masterRow.unitName } else { $null }
    recommended_permits = if ($recommendedPermitRow) { $recommendedPermitRow } else { $null }
    bonus_draw = if ($bonusRowSet) {
      [ordered]@{
        resident = (Sort-PointRowsDescending -Rows $bonusRowSet.Resident -PointField 'point_level')
        nonresident = (Sort-PointRowsDescending -Rows $bonusRowSet.Nonresident -PointField 'point_level')
      }
    } else {
      $null
    }
    antlerless_draw = if ($antlerlessRowSet) {
      [ordered]@{
        land_type = $antlerlessRowSet.land_type
        resident = (Sort-PointRowsDescending -Rows $antlerlessRowSet.Resident -PointField 'point_level')
        nonresident = (Sort-PointRowsDescending -Rows $antlerlessRowSet.Nonresident -PointField 'point_level')
      }
    } else {
      $null
    }
    projected_bonus_draw = if ($projectedRowSet) {
      [ordered]@{
        resident = (Sort-PointRowsDescending -Rows $projectedRowSet.Resident -PointField 'apply_with_points')
        nonresident = (Sort-PointRowsDescending -Rows $projectedRowSet.Nonresident -PointField 'apply_with_points')
      }
    } else {
      $null
    }
  }

  [void]$bundleRows.Add([pscustomobject]$payload)
}

$json = $bundleRows | ConvertTo-Json -Depth 9
[System.IO.File]::WriteAllText($bundlePath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Built hunt research page bundle:"
Write-Host "  $bundlePath"
