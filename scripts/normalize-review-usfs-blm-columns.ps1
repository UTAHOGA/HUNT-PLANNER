param(
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-usfs-blm-normalize-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$forestIdToName = [ordered]@{
  'ashley' = 'Ashley'
  'dixie' = 'Dixie'
  'fishlake' = 'Fishlake'
  'manti-la-sal' = 'Manti-La Sal'
  'uwc' = 'Uinta-Wasatch-Cache'
}

$districtIdToLabel = [ordered]@{
  'ashley-roosevelt' = 'Ashley (Roosevelt Ranger District)'
  'ashley-vernal' = 'Ashley (Vernal Ranger District)'
  'dixie-cedar' = 'Dixie (Cedar City Ranger District)'
  'dixie-powell' = 'Dixie (Powell Ranger District)'
  'dixie-escalante' = 'Dixie (Escalante Ranger District)'
  'dixie-pine-valley' = 'Dixie (Pine Valley Ranger District)'
  'manti-la-sal-north' = 'Manti-La Sal (North Zone)'
  'manti-la-sal-moab' = 'Manti-La Sal (Moab Ranger District)'
  'manti-la-sal-monticello' = 'Manti-La Sal (Monticello Ranger District)'
  'uwc-nebo' = 'Uinta-Wasatch-Cache (Nebo Ranger District)'
  'uwc-uinta' = 'Uinta-Wasatch-Cache (Uinta Ranger District)'
  'uwc-wasatch' = 'Uinta-Wasatch-Cache (Wasatch Ranger District)'
}

$blmIdToName = [ordered]@{
  'blm-cedar-city' = 'Color Country District (Cedar City Field Office)'
  'blm-fishlake' = 'Fishlake'
  'blm-grand-staircase' = 'Grand Staircase'
  'blm-kanab' = 'Kanab'
  'blm-st-george' = 'St. George Field Office'
}

$forestOrder = @($forestIdToName.Keys)
$districtOrder = @($districtIdToLabel.Keys)
$blmOrder = @($blmIdToName.Keys)

function Split-List([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
  return @($Value -split '\s*\|\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Normalize-Text([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return (($Value.ToUpperInvariant() -replace '&',' AND ') -replace '[^A-Z0-9]+',' ').Trim()
}

function Add-Unique([System.Collections.Generic.List[string]]$List, [string]$Value) {
  if (-not [string]::IsNullOrWhiteSpace($Value) -and -not $List.Contains($Value)) {
    $List.Add($Value) | Out-Null
  }
}

function Get-CanonicalUsfsForestIds([object]$Row) {
  $ids = New-Object 'System.Collections.Generic.List[string]'
  foreach ($existingId in Split-List $Row.usfsForestIds) {
    if ($forestIdToName.Contains($existingId)) { Add-Unique $ids $existingId }
  }
  $rawText = @(
    [string]$Row.usfsForests,
    [string]$Row.usfsPermitAreasRaw,
    [string]$Row.usfsPermitText,
    [string]$Row.usfsDistrictIds
  ) -join ' | '
  $text = Normalize-Text $rawText
  if ($text -match 'ASHLEY|VERNAL|ROOSEVELT') { Add-Unique $ids 'ashley' }
  if ($text -match 'DIXIE|CEDAR|ESCALANTE|POWELL|PINE VALLEY|LAKE POWELL') { Add-Unique $ids 'dixie' }
  if ($text -match 'FISHLAKE') { Add-Unique $ids 'fishlake' }
  if ($text -match 'MANTI LA SAL|MANTI LASAL') { Add-Unique $ids 'manti-la-sal' }
  if ($text -match 'UINTA|WASATCH|CACHE|UWC|NEBO|SPANISH FORK|PLEASANT GROVE|HEBER|KAMAS') { Add-Unique $ids 'uwc' }
  return @($forestOrder | Where-Object { $ids.Contains($_) })
}

function Get-CanonicalUsfsDistrictIds([object]$Row) {
  $ids = New-Object 'System.Collections.Generic.List[string]'
  $text = Normalize-Text (@(
    [string]$Row.usfsPermitAreasRaw
  ) -join ' | ')
  if ($text -match 'ROOSEVELT( RANGER DISTRICT)?') { Add-Unique $ids 'ashley-roosevelt' }
  if ($text -match 'VERNAL( RANGER DISTRICT)?') { Add-Unique $ids 'ashley-vernal' }
  if ($text -match 'CEDAR( CITY)?( RANGER DISTRICT)?') { Add-Unique $ids 'dixie-cedar' }
  if ($text -match 'POWELL( RANGER DISTRICT)?|LAKE POWELL') { Add-Unique $ids 'dixie-powell' }
  if ($text -match 'ESCALANTE( RANGER DISTRICT)?') { Add-Unique $ids 'dixie-escalante' }
  if ($text -match 'PINE VALLEY( RANGER DISTRICT)?') { Add-Unique $ids 'dixie-pine-valley' }
  if ($text -match 'MANTI LA SAL NORTH|MANTI NORTH|NORTH ZONE') { Add-Unique $ids 'manti-la-sal-north' }
  if ($text -match 'MOAB( RANGER DISTRICT)?') { Add-Unique $ids 'manti-la-sal-moab' }
  if ($text -match 'MONTICELLO( RANGER DISTRICT)?') { Add-Unique $ids 'manti-la-sal-monticello' }
  if ($text -match 'NEBO( RANGER DISTRICT)?') { Add-Unique $ids 'uwc-nebo' }
  if ($text -match 'UINTA RANGER DISTRICT') { Add-Unique $ids 'uwc-uinta' }
  if ($text -match 'WASATCH RANGER DISTRICT') { Add-Unique $ids 'uwc-wasatch' }
  return @($districtOrder | Where-Object { $ids.Contains($_) })
}

function Get-CanonicalBlmIds([object]$Row) {
  $ids = New-Object 'System.Collections.Generic.List[string]'
  foreach ($existingId in Split-List $Row.blmDistrictIds) {
    if ($blmIdToName.Contains($existingId)) { Add-Unique $ids $existingId }
  }
  $text = Normalize-Text (@(
    [string]$Row.blmDistricts,
    [string]$Row.blmPermitAreasRaw,
    [string]$Row.blmPermitText
  ) -join ' | ')
  if ($text -match 'CEDAR CITY') { Add-Unique $ids 'blm-cedar-city' }
  if ($text -match 'GRAND STAIRCASE') { Add-Unique $ids 'blm-grand-staircase' }
  if ($text -match 'KANAB') { Add-Unique $ids 'blm-kanab' }
  if ($text -match 'FISHLAKE|RICHFIELD') { Add-Unique $ids 'blm-fishlake' }
  if ($text -match 'ST GEORGE|SGFO|PINE VALLEY|ZION') { Add-Unique $ids 'blm-st-george' }
  return @($blmOrder | Where-Object { $ids.Contains($_) })
}

$rows = Import-Csv $ReviewCsv
$report = New-Object System.Collections.Generic.List[object]

foreach ($row in $rows) {
  $oldUsfsForests = [string]$row.usfsForests
  $oldUsfsForestIds = [string]$row.usfsForestIds
  $oldUsfsDistrictIds = [string]$row.usfsDistrictIds
  $oldUsfsPermitText = [string]$row.usfsPermitText
  $oldBlmDistricts = [string]$row.blmDistricts
  $oldBlmDistrictIds = [string]$row.blmDistrictIds
  $oldBlmPermitText = [string]$row.blmPermitText

  $usfsForestIds = @(Get-CanonicalUsfsForestIds $row)
  $usfsDistrictIds = @(Get-CanonicalUsfsDistrictIds $row)
  $blmIds = @(Get-CanonicalBlmIds $row)

  $row.usfsForestIds = ($usfsForestIds -join ' | ')
  $row.usfsForests = (($usfsForestIds | ForEach-Object { $forestIdToName[$_] }) -join ' | ')
  $row.usfsDistrictIds = ($usfsDistrictIds -join ' | ')
  $row.usfsPermitText = ((@($usfsDistrictIds | ForEach-Object { $districtIdToLabel[$_] }) + @($usfsForestIds | Where-Object { $usfsDistrictIds.Count -eq 0 } | ForEach-Object { $forestIdToName[$_] })) -join ' | ')

  $row.blmDistrictIds = ($blmIds -join ' | ')
  $row.blmDistricts = (($blmIds | ForEach-Object { $blmIdToName[$_] }) -join ' | ')
  $row.blmPermitText = (($blmIds | ForEach-Object { $blmIdToName[$_] }) -join ' | ')

  if (
    $oldUsfsForests -ne [string]$row.usfsForests -or
    $oldUsfsForestIds -ne [string]$row.usfsForestIds -or
    $oldUsfsDistrictIds -ne [string]$row.usfsDistrictIds -or
    $oldUsfsPermitText -ne [string]$row.usfsPermitText -or
    $oldBlmDistricts -ne [string]$row.blmDistricts -or
    $oldBlmDistrictIds -ne [string]$row.blmDistrictIds -or
    $oldBlmPermitText -ne [string]$row.blmPermitText
  ) {
    $report.Add([pscustomobject]@{
      displayName = $row.displayName
      usfsForests = $row.usfsForests
      usfsForestIds = $row.usfsForestIds
      usfsDistrictIds = $row.usfsDistrictIds
      blmDistricts = $row.blmDistricts
      blmDistrictIds = $row.blmDistrictIds
    }) | Out-Null
  }
}

$rows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv

Write-Output ("Updated review CSV: {0}" -f $ReviewCsv)
Write-Output ("Normalization report: {0}" -f $ReportCsv)
