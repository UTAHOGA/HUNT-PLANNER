param(
  [string]$WorkbookPath = "C:\DOWNLOADS\Tyler Files\Tyler Files\DWR OUTFITTERS.xlsx",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$DwrExportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\dwr-registered-outfitters-2026-03-27.csv",
  [string]$MatchReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-registration-match-report.csv",
  [string]$NotRegisteredCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-not-registered-with-dwr-2026-03-27.csv",
  [string]$FishingPoolCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-fishing-pool-2026-03-27.csv",
  [string]$BigGamePoolCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-big-game-pool-2026-03-27.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Text([string]$value) {
  $text = ($value ?? '').ToLowerInvariant().Trim()
  if (-not $text) { return '' }
  $text = $text -replace '&', ' and '
  $text = $text -replace '\bllc\b|\binc\b|\bl\.l\.c\.\b|\bco\b|\bcompany\b|\boutfitters?\b|\bguide(s)?\b', ' '
  $text = $text -replace '[^a-z0-9]+', ' '
  $text = $text -replace '\s+', ' '
  return $text.Trim()
}

function Get-XlsxRows([string]$path) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ('dwr-outfitters-' + [guid]::NewGuid().ToString() + '.xlsx')
  $source = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $target = [System.IO.File]::Create($tempPath)
    try {
      $source.CopyTo($target)
    }
    finally {
      $target.Dispose()
      $source.Dispose()
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($tempPath)
    $shared = @()
    $ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
    if ($ssEntry) {
      $reader = New-Object IO.StreamReader($ssEntry.Open())
      $ssXml = [xml]$reader.ReadToEnd()
      $reader.Close()
      foreach ($si in $ssXml.sst.si) {
        $text = ''
        if ($si.t) { $text = [string]$si.t }
        elseif ($si.r) { $text = (($si.r | ForEach-Object { $_.t }) -join '') }
        $shared += $text
      }
    }

    $sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
    $reader = New-Object IO.StreamReader($sheetEntry.Open())
    $sheetXml = [xml]$reader.ReadToEnd()
    $reader.Close()

    $allRows = @()
    foreach ($row in $sheetXml.worksheet.sheetData.row) {
      $values = @()
      foreach ($cell in $row.c) {
        $value = if ($cell.v) { [string]$cell.v } else { '' }
        if ($cell.t -eq 's' -and $value -match '^\d+$') {
          $value = $shared[[int]$value]
        }
        $values += $value
      }
      $allRows += ,@($values)
    }
    return $allRows
  }
  finally {
    if ($zip) { $zip.Dispose() }
    if (Test-Path $tempPath) { Remove-Item $tempPath -Force -ErrorAction SilentlyContinue }
  }
}

$xlsxRows = Get-XlsxRows $WorkbookPath
if ($xlsxRows.Count -lt 2) {
  throw "Workbook did not contain expected data rows."
}

$header = $xlsxRows[0]
$dwrRows = foreach ($row in $xlsxRows | Select-Object -Skip 1) {
  if ($row.Count -lt 3) { continue }
  [pscustomobject]@{
    Outfitter = [string]$row[0]
    Owner = [string]$row[1]
    Activity = [string]$row[2]
    OutfitterKey = Normalize-Text ([string]$row[0])
    OwnerKey = Normalize-Text ([string]$row[1])
  }
}

$bigGameRows = @($dwrRows | Where-Object { $_.Activity -match 'Big Game' })
$fishingRows = @($dwrRows | Where-Object { $_.Activity -match 'Fishing' })
$dwrRows | Sort-Object Outfitter | Export-Csv -Path $DwrExportCsv -NoTypeInformation -Encoding UTF8

$reviewRows = Import-Csv $ReviewCsv
function Build-Lookups($rows) {
  $byName = @{}
  $byOwner = @{}
  foreach ($row in $rows) {
    if ($row.OutfitterKey -and -not $byName.ContainsKey($row.OutfitterKey)) { $byName[$row.OutfitterKey] = @() }
    if ($row.OutfitterKey) { $byName[$row.OutfitterKey] += $row }
    if ($row.OwnerKey -and -not $byOwner.ContainsKey($row.OwnerKey)) { $byOwner[$row.OwnerKey] = @() }
    if ($row.OwnerKey) { $byOwner[$row.OwnerKey] += $row }
  }
  return [pscustomobject]@{ ByName = $byName; ByOwner = $byOwner }
}

$allLookups = Build-Lookups $dwrRows
$bigGameLookups = Build-Lookups $bigGameRows
$fishingLookups = Build-Lookups $fishingRows

function Find-Match($nameKey, $ownerKey, $lookups) {
  if ($nameKey -and $lookups.ByName.ContainsKey($nameKey)) {
    return [pscustomobject]@{ Rows = @($lookups.ByName[$nameKey]); Method = 'Outfitter name' }
  }
  if ($ownerKey -and $lookups.ByOwner.ContainsKey($ownerKey)) {
    return [pscustomobject]@{ Rows = @($lookups.ByOwner[$ownerKey]); Method = 'Owner name' }
  }
  return [pscustomobject]@{ Rows = @(); Method = '' }
}

$matchReport = @()
$notRegistered = @()
$fishingPool = @()
$bigGamePool = @()

foreach ($row in $reviewRows) {
  $nameCandidates = @(
    [string]$row.displayName,
    [string]$row.legalBusinessName
  ) | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique
  $nameKey = ''
  $nameWinner = ''
  foreach ($candidate in $nameCandidates) {
    $candidateKey = Normalize-Text $candidate
    if ($candidateKey -and $allLookups.ByName.ContainsKey($candidateKey)) {
      $nameKey = $candidateKey
      $nameWinner = $candidate
      break
    }
    if (-not $nameKey -and $candidateKey) {
      $nameKey = $candidateKey
      $nameWinner = $candidate
    }
  }
  $ownerKey = Normalize-Text ([string]$row.primaryName)

  $anyMatch = Find-Match $nameKey $ownerKey $allLookups
  $bigGameMatch = Find-Match $nameKey $ownerKey $bigGameLookups
  $fishingMatch = Find-Match $nameKey $ownerKey $fishingLookups

  $pool = if ($bigGameMatch.Rows.Count -gt 0) { 'Big Game' } elseif ($fishingMatch.Rows.Count -gt 0) { 'Fishing' } else { 'Unmatched' }
  $method = if ($bigGameMatch.Rows.Count -gt 0) { $bigGameMatch.Method } elseif ($fishingMatch.Rows.Count -gt 0) { $fishingMatch.Method } else { '' }
  if ($method -eq 'Outfitter name' -and $nameWinner -and $nameWinner -ne [string]$row.displayName) {
    $method = 'Business name'
  }
  $winner = if ($bigGameMatch.Rows.Count -gt 0) { $bigGameMatch.Rows[0] } elseif ($fishingMatch.Rows.Count -gt 0) { $fishingMatch.Rows[0] } else { $null }

  $entry = [pscustomobject]@{
    id = $row.id
    displayName = $row.displayName
    primaryName = $row.primaryName
    website = $row.website
    MatchMethod = $method
    DwrOutfitter = if ($winner) { $winner.Outfitter } else { '' }
    DwrOwner = if ($winner) { $winner.Owner } else { '' }
    DwrActivity = if ($winner) { $winner.Activity } else { '' }
    DwrPool = $pool
    RegisteredWithDwr = if ($pool -eq 'Unmatched') { 'No' } else { 'Yes' }
  }
  $matchReport += $entry

  if ($pool -eq 'Big Game') {
    $bigGamePool += [pscustomobject]@{
      id = $row.id
      displayName = $row.displayName
      primaryName = $row.primaryName
      website = $row.website
      MatchMethod = $method
      DwrOutfitter = $winner.Outfitter
      DwrOwner = $winner.Owner
      DwrActivity = $winner.Activity
    }
  }
  elseif ($pool -eq 'Fishing') {
    $fishingPool += [pscustomobject]@{
      id = $row.id
      displayName = $row.displayName
      primaryName = $row.primaryName
      website = $row.website
      MatchMethod = $method
      DwrOutfitter = $winner.Outfitter
      DwrOwner = $winner.Owner
      DwrActivity = $winner.Activity
      usfsPermitText = $row.usfsPermitText
      blmPermitText = $row.blmPermitText
    }
  }
  else {
    $notRegistered += [pscustomobject]@{
      id = $row.id
      displayName = $row.displayName
      primaryName = $row.primaryName
      secondaryContactName = $row.secondaryContactName
      phonePrimary = $row.phonePrimary
      emailPrimary = $row.emailPrimary
      website = $row.website
      usfsPermitText = $row.usfsPermitText
      blmPermitText = $row.blmPermitText
    }
  }
}

$matchReport | Sort-Object displayName | Export-Csv -Path $MatchReportCsv -NoTypeInformation -Encoding UTF8
$notRegistered | Sort-Object displayName | Export-Csv -Path $NotRegisteredCsv -NoTypeInformation -Encoding UTF8
$fishingPool | Sort-Object displayName | Export-Csv -Path $FishingPoolCsv -NoTypeInformation -Encoding UTF8
$bigGamePool | Sort-Object displayName | Export-Csv -Path $BigGamePoolCsv -NoTypeInformation -Encoding UTF8

[pscustomobject]@{
  DwrBigGameRows = $bigGameRows.Count
  DwrFishingRows = $fishingRows.Count
  CurrentOutfitters = $reviewRows.Count
  BigGameMatched = $bigGamePool.Count
  FishingPool = $fishingPool.Count
  NotRegistered = $notRegistered.Count
  DwrExportCsv = $DwrExportCsv
  MatchReportCsv = $MatchReportCsv
  NotRegisteredCsv = $NotRegisteredCsv
  FishingPoolCsv = $FishingPoolCsv
  BigGamePoolCsv = $BigGamePoolCsv
} | Format-List
