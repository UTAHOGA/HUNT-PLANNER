param(
  [string]$ContactsCsv = "C:\DOWNLOADS\contacts (8).csv",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-website-update-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-website-unmatched-contacts.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Name([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $text = $Value.ToLowerInvariant()
  $text = $text -replace '&', ' and '
  $text = $text -replace '[^a-z0-9]+', ' '
  $text = $text -replace '\s+', ' '
  return $text.Trim()
}

function Normalize-Url([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $match = [regex]::Match($Value, 'https?://[^\s|:]+(?:/[^\s|]*)?')
  if (-not $match.Success) { return '' }
  $url = $match.Value.Trim().TrimEnd('/', '.', ',', ';')
  return $url
}

function Get-OutfitterNamesFromContact($Row) {
  $names = New-Object System.Collections.Generic.List[string]
  $add = {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    $trimmed = $Value.Trim()
    if (-not $trimmed) { return }
    if (-not $names.Contains($trimmed)) { $null = $names.Add($trimmed) }
  }

  & $add $Row.'Organization Name'

  if ($Row.Notes -match '(?im)^\s*OUTFITTER:\s*(.+?)\s*$') {
    & $add $matches[1]
  }
  if ($Row.Notes -match '(?im)^\s*BUSINESS:\s*(.+?)\s*$') {
    & $add $matches[1]
  }

  return @($names)
}

function Get-BestContactUrls($Row) {
  $urls = New-Object System.Collections.Generic.List[string]
  foreach ($raw in @($Row.'Website 1 - Value')) {
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    foreach ($part in ($raw -split ':::')) {
      $url = Normalize-Url $part
      if ($url -and -not $urls.Contains($url)) { $null = $urls.Add($url) }
    }
  }
  return @($urls)
}

$reviewRows = Import-Csv $ReviewCsv
$contactRows = Import-Csv $ContactsCsv

$reviewByName = @{}
foreach ($row in $reviewRows) {
  foreach ($name in @($row.displayName, $row.legalBusinessName, $row.slug)) {
    $key = Normalize-Name $name
    if (-not $key) { continue }
    if (-not $reviewByName.ContainsKey($key)) {
      $reviewByName[$key] = New-Object System.Collections.Generic.List[object]
    }
    $alreadyIndexed = $false
    foreach ($existing in $reviewByName[$key]) {
      if ([string]$existing.id -eq [string]$row.id) {
        $alreadyIndexed = $true
        break
      }
    }
    if (-not $alreadyIndexed) {
      $null = $reviewByName[$key].Add($row)
    }
  }
}

$report = New-Object System.Collections.Generic.List[object]
$unmatched = New-Object System.Collections.Generic.List[object]

foreach ($contact in $contactRows) {
  $urls = @(Get-BestContactUrls $contact)
  if ($urls.Count -eq 0) { continue }

  $candidateNames = Get-OutfitterNamesFromContact $contact
  $matchedRow = $null
  $matchName = ''

  foreach ($candidateName in $candidateNames) {
    $key = Normalize-Name $candidateName
    if (-not $key) { continue }
    if ($reviewByName.ContainsKey($key) -and $reviewByName[$key].Count -eq 1) {
      $matchedRow = $reviewByName[$key][0]
      $matchName = $candidateName
      break
    }
  }

  if (-not $matchedRow) {
    $unmatched.Add([pscustomobject]@{
      contactName = (@($contact.'First Name', $contact.'Last Name') | Where-Object { $_ }) -join ' '
      organizationName = $contact.'Organization Name'
      candidateOutfitterNames = $candidateNames -join ' | '
      extractedUrls = $urls -join ' | '
    }) | Out-Null
    continue
  }

  $newWebsite = $urls[0]
  $oldWebsite = [string]$matchedRow.website
  $changed = $oldWebsite -ne $newWebsite
  $matchedRow.website = $newWebsite

  $report.Add([pscustomobject]@{
    displayName = $matchedRow.displayName
    matchedOn = $matchName
    oldWebsite = $oldWebsite
    newWebsite = $newWebsite
    additionalUrlsFound = (@($urls | Select-Object -Skip 1)) -join ' | '
    changed = $changed
  }) | Out-Null
}

$reviewRows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
$unmatched | Sort-Object organizationName, contactName | Export-Csv -NoTypeInformation -Encoding UTF8 $UnmatchedCsv

Write-Output "Updated review CSV: $ReviewCsv"
Write-Output "Website report: $ReportCsv"
Write-Output "Unmatched contacts: $UnmatchedCsv"
Write-Output ("Matched rows: {0}" -f $report.Count)
Write-Output ("Changed rows: {0}" -f (@($report | Where-Object { $_.changed }).Count))
Write-Output ("Unmatched contacts with websites: {0}" -f $unmatched.Count)
