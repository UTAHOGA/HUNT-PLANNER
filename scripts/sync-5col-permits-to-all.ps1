param(
  [string]$FiveColCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-5col-2026-03-27.csv",
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$PublicJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$SlimReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$SlimPermitsCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-slim-2026-03-27.csv",
  [string]$CoverageCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.csv",
  [string]$CoverageJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.json",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-5col-sync-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-List([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return @() }
  return @($text -split '\s*\|\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
}

function Forest-Id([string]$name) {
  switch -Regex ($name) {
    '^Ashley$' { 'ashley'; break }
    '^Dixie(\s*\(.*\))?$' { 'dixie'; break }
    '^Fishlake$' { 'fishlake'; break }
    '^Manti-La Sal(\s*\(.*\))?$' { 'manti-la-sal'; break }
    '^Uinta-Wasatch-Cache(\s*\(.*\))?$' { 'uinta-wasatch-cache'; break }
    default { '' }
  }
}

function Blm-Id([string]$name) {
  switch -Regex ($name) {
    '^Grand Staircase$' { 'blm-grand-staircase'; break }
    '^Kanab$' { 'blm-kanab'; break }
    '^Fishlake$' { 'blm-fishlake'; break }
    '^St\.? George(Field Office)?$' { 'blm-st-george'; break }
    '^Color Country District \(Cedar City Field Office\)$' { 'blm-cedar-city'; break }
    '^Cedar City$' { 'blm-cedar-city'; break }
    default { '' }
  }
}

function Join-List($value) {
  if ($null -eq $value) { return '' }
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    return (@($value | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }) -join ' | ')
  }
  return [string]$value
}

$sourceRows = Import-Csv $FiveColCsv
$sourceByName = @{}
foreach ($row in $sourceRows) {
  $sourceByName[[string]$row.Outfitter] = $row
}

$report = New-Object System.Collections.Generic.List[object]

foreach ($jsonPath in @($MasterJson, $PublicJson)) {
  $data = @(Get-Content $jsonPath -Raw | ConvertFrom-Json)
  foreach ($item in $data) {
    $src = $sourceByName[[string]$item.displayName]
    if ($null -eq $src) { continue }

    $changed = New-Object System.Collections.Generic.List[string]

    $newPrimary = [string]$src.'Primary Owner'
    $newSecondary = [string]$src.'Secondary Contact'
    $newUsfs = Normalize-List ([string]$src.'USFS Permits')
    $newBlm = Normalize-List ([string]$src.'BLM Permits')
    $newUsfsIds = @($newUsfs | ForEach-Object { Forest-Id $_ } | Where-Object { $_ } | Select-Object -Unique)
    $newBlmIds = @($newBlm | ForEach-Object { Blm-Id $_ } | Where-Object { $_ } | Select-Object -Unique)

    if ([string]$item.contact.primaryName -ne $newPrimary) {
      $item.contact.primaryName = $newPrimary
      $changed.Add('contact.primaryName') | Out-Null
    }
    if (-not ($item.contact.PSObject.Properties.Name -contains 'secondaryContactName')) {
      $item.contact | Add-Member -NotePropertyName secondaryContactName -NotePropertyValue '' -Force
    }
    if ([string]$item.contact.secondaryContactName -ne $newSecondary) {
      $item.contact.secondaryContactName = $newSecondary
      $changed.Add('contact.secondaryContactName') | Out-Null
    }

    $currentUsfs = Join-List $item.serviceArea.usfsForests
    $currentUsfsIds = Join-List $item.serviceArea.usfsForestIds
    $currentUsfsText = [string]$item.serviceArea.usfsPermitText
    $targetUsfs = $newUsfs -join ' | '
    $targetUsfsIds = $newUsfsIds -join ' | '
    if ($currentUsfs -ne $targetUsfs) {
      $item.serviceArea.usfsForests = @($newUsfs)
      $changed.Add('serviceArea.usfsForests') | Out-Null
    }
    if ($currentUsfsIds -ne $targetUsfsIds) {
      $item.serviceArea.usfsForestIds = @($newUsfsIds)
      $changed.Add('serviceArea.usfsForestIds') | Out-Null
    }
    if ($currentUsfsText -ne $targetUsfs) {
      $item.serviceArea.usfsPermitText = $targetUsfs
      $changed.Add('serviceArea.usfsPermitText') | Out-Null
    }

    $currentBlm = Join-List $item.serviceArea.blmDistricts
    $currentBlmIds = Join-List $item.serviceArea.blmDistrictIds
    $currentBlmText = [string]$item.serviceArea.blmPermitText
    $targetBlm = $newBlm -join ' | '
    $targetBlmIds = $newBlmIds -join ' | '
    if ($currentBlm -ne $targetBlm) {
      $item.serviceArea.blmDistricts = @($newBlm)
      $changed.Add('serviceArea.blmDistricts') | Out-Null
    }
    if ($currentBlmIds -ne $targetBlmIds) {
      $item.serviceArea.blmDistrictIds = @($newBlmIds)
      $changed.Add('serviceArea.blmDistrictIds') | Out-Null
    }
    if ($currentBlmText -ne $targetBlm) {
      $item.serviceArea.blmPermitText = $targetBlm
      $changed.Add('serviceArea.blmPermitText') | Out-Null
    }

    if ($changed.Count -gt 0) {
      $report.Add([pscustomobject]@{
        File = [System.IO.Path]::GetFileName($jsonPath)
        Outfitter = $item.displayName
        ChangedFields = ($changed -join ' | ')
      }) | Out-Null
    }
  }
  $data | ConvertTo-Json -Depth 14 | Set-Content -Path $jsonPath -Encoding UTF8
}

& "C:\DOWNLOADS\test website\HUNT-PLANNER\scripts\export-review-csv-from-master.ps1" -MasterJson $MasterJson -OutCsv $ReviewCsv | Out-Null

$review = Import-Csv $ReviewCsv
$slimColumns = @(
  'id','displayName','primaryName','secondaryContactName','ownerNames','phonePrimary','phoneNumbers',
  'emailPrimary','emailAddresses','website','facebookUrl','instagramUrl','city','state','mailingAddress',
  'speciesServed','unitsServed','usfsForests','usfsForestIds','usfsDistrictIds','usfsPermitText',
  'blmDistricts','blmDistrictIds','blmPermitText','sitlaServed','stateParksServed'
)
$review | Select-Object $slimColumns | Export-Csv -Path $SlimReviewCsv -NoTypeInformation -Encoding UTF8

$public = @(Get-Content $PublicJson -Raw | ConvertFrom-Json)
$fiveRows = foreach ($row in $public) {
  [pscustomobject]@{
    Outfitter = $row.displayName
    'Primary Owner' = [string]$row.contact.primaryName
    'Secondary Contact' = [string]$row.contact.secondaryContactName
    'USFS Permits' = (((@($row.serviceArea.usfsForests) + @(([string]$row.serviceArea.usfsPermitText) -split '\s*\|\s*')) | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ' | ')
    'BLM Permits' = (((@($row.serviceArea.blmDistricts) + @(([string]$row.serviceArea.blmPermitText) -split '\s*\|\s*')) | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ' | ')
  }
}
$fiveRows | Sort-Object Outfitter | Export-Csv -Path $FiveColCsv -NoTypeInformation -Encoding UTF8
$fiveRows | ForEach-Object {
  [pscustomobject]@{
    'Outfitter/Owner' = if ($_.'Primary Owner') { "$($_.Outfitter) | $($_.'Primary Owner')" } else { $_.Outfitter }
    'USFS Permits' = $_.'USFS Permits'
    'BLM Permits' = $_.'BLM Permits'
  }
} | Sort-Object 'Outfitter/Owner' | Export-Csv -Path $SlimPermitsCsv -NoTypeInformation -Encoding UTF8

& "C:\DOWNLOADS\test website\HUNT-PLANNER\scripts\export-outfitter-federal-unit-coverage.ps1" -OutputCsv $CoverageCsv -OutputJson $CoverageJson | Out-Null

$report | Export-Csv -Path $ReportCsv -NoTypeInformation -Encoding UTF8
$report
