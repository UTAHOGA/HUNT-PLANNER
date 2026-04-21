param(
  [string]$ContactsCsv = "C:\DOWNLOADS\contacts (8).csv",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-city-state-update-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-city-state-unmatched-contacts.csv"
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

function Clean-Text([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return (($Value -replace '\s+', ' ').Trim())
}

function Normalize-State([string]$Value) {
  $text = Clean-Text $Value
  if (-not $text) { return '' }
  switch -Regex ($text.ToUpperInvariant()) {
    '^UTAH$' { 'UT'; break }
    '^UT$' { 'UT'; break }
    '^COLORADO$' { 'CO'; break }
    '^CO$' { 'CO'; break }
    '^WYOMING$' { 'WY'; break }
    '^WY$' { 'WY'; break }
    default { $text.ToUpperInvariant() }
  }
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

function Get-AddressFullFromNotes([string]$Notes) {
  if ([string]::IsNullOrWhiteSpace($Notes)) { return '' }
  if ($Notes -match '(?im)^\s*Address Full:\s*(.+?)\s*$') {
    return Clean-Text $matches[1]
  }
  return ''
}

function Get-AddressStreetLinesFromNotes([string]$Notes) {
  $values = @{}
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $values }
  foreach ($n in 1..4) {
    if ($Notes -match "(?im)^\s*Address $n - Street:\s*(.+?)\s*$") {
      $values[$n] = Clean-Text $matches[1]
    }
  }
  return $values
}

function Try-ParseCityStateFromOwner([string]$Notes) {
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $null }
  if ($Notes -match '(?im)^\s*OWNER:\s*(?<city>[A-Za-z .''-]+),\s*(?<state>UT|CO|WY)\.?\s*$') {
    return [pscustomobject]@{
      City = Clean-Text $matches['city']
      Region = Normalize-State $matches['state']
    }
  }
  return $null
}

function Get-LocationData($Row) {
  $city = Clean-Text $Row.'Address 1 - City'
  $region = Normalize-State $Row.'Address 1 - Region'
  $postal = Clean-Text $Row.'Address 1 - Postal Code'
  $street = Clean-Text $Row.'Address 1 - Street'
  $formatted = Clean-Text $Row.'Address 1 - Formatted'
  $addressFull = Get-AddressFullFromNotes $Row.Notes
  $noteLines = Get-AddressStreetLinesFromNotes $Row.Notes

  if ($addressFull) {
    $parts = $addressFull -split '\s*,\s*'
    if ($parts.Count -ge 4) {
      if (-not $city) { $city = Get-CleanValue $parts[-3] }
      if (-not $region) { $region = Normalize-State $parts[-2] }
      if (-not $postal) { $postal = Get-CleanValue $parts[-1] }
      if (-not $street) { $street = ($parts[0..($parts.Count - 4)] -join ', ').Trim() }
    }
  }

  if (-not $city -and $noteLines.ContainsKey(1)) {
    if ($noteLines[1] -match '^(?<city>[A-Za-z .''-]+)\s+(?<state>UT|CO|WY)\s+(?<zip>\d{5})$') {
      $city = Clean-Text $matches['city']
      if (-not $region) { $region = Normalize-State $matches['state'] }
      if (-not $postal) { $postal = Clean-Text $matches['zip'] }
      $street = ''
    }
  }

  if (-not $city -and $noteLines.ContainsKey(1) -and $noteLines.ContainsKey(3)) {
    if (-not ($noteLines[1] -match '\d') -and $noteLines[3] -match '^(UT|CO|WY)$') {
      $city = Clean-Text $noteLines[1]
      if (-not $region) { $region = Normalize-State $noteLines[3] }
    }
  }

  if (-not $city -and $formatted) {
    $formattedLines = $formatted -split '[\r\n]+' | ForEach-Object { Clean-Text $_ } | Where-Object { $_ }
    if ($formattedLines.Count -ge 1 -and $formattedLines[0] -match '^(?<city>[A-Za-z .''-]+),\s*(?<state>[A-Z]{2})$') {
      $city = Clean-Text $matches['city']
      if (-not $region) { $region = Normalize-State $matches['state'] }
    }
  }

  if (-not $region -and $noteLines.ContainsKey(2) -and $noteLines[2] -match '^(UT|CO|WY|Utah|Colorado|Wyoming)$') {
    $region = Normalize-State $noteLines[2]
  }
  if (-not $city -and $noteLines.ContainsKey(1) -and -not ($noteLines[1] -match '\d')) {
    $city = Clean-Text $noteLines[1]
  }

  $ownerLocation = Try-ParseCityStateFromOwner $Row.Notes
  if (-not $city -and $ownerLocation) { $city = $ownerLocation.City }
  if (-not $region -and $ownerLocation) { $region = $ownerLocation.Region }

  return [pscustomobject]@{
    City = $city
    Region = $region
    State = if ($region) { $region } else { '' }
    MailingAddress = if ($addressFull) { $addressFull } elseif ($street) { $street } else { '' }
    PostalCode = $postal
  }
}

function Get-CleanValue([string]$Value) {
  return Clean-Text $Value
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
  $location = Get-LocationData $contact
  if (-not $location.City -and -not $location.Region -and -not $location.MailingAddress) { continue }

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
      organizationName = $contact.'Organization Name'
      candidateOutfitterNames = $candidateNames -join ' | '
      city = $location.City
      region = $location.Region
      state = $location.State
      mailingAddress = $location.MailingAddress
    }) | Out-Null
    continue
  }

  $oldCity = [string]$matchedRow.city
  $oldRegion = [string]$matchedRow.region
  $oldState = [string]$matchedRow.state
  $oldMail = [string]$matchedRow.mailingAddress

  if ($location.City) { $matchedRow.city = $location.City }
  if ($location.Region) { $matchedRow.region = $location.Region }
  if ($location.State) { $matchedRow.state = $location.State }
  if ($location.MailingAddress) { $matchedRow.mailingAddress = $location.MailingAddress }

  $changed = (
    $oldCity -ne [string]$matchedRow.city -or
    $oldRegion -ne [string]$matchedRow.region -or
    $oldState -ne [string]$matchedRow.state -or
    $oldMail -ne [string]$matchedRow.mailingAddress
  )

  $report.Add([pscustomobject]@{
    displayName = $matchedRow.displayName
    matchedOn = $matchName
    oldCity = $oldCity
    newCity = [string]$matchedRow.city
    oldRegion = $oldRegion
    newRegion = [string]$matchedRow.region
    oldState = $oldState
    newState = [string]$matchedRow.state
    oldMailingAddress = $oldMail
    newMailingAddress = [string]$matchedRow.mailingAddress
    changed = $changed
  }) | Out-Null
}

$reviewRows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
$unmatched | Sort-Object organizationName | Export-Csv -NoTypeInformation -Encoding UTF8 $UnmatchedCsv

Write-Output "Updated review CSV: $ReviewCsv"
Write-Output "City/state report: $ReportCsv"
Write-Output "Unmatched contacts: $UnmatchedCsv"
Write-Output ("Matched rows: {0}" -f $report.Count)
Write-Output ("Changed rows: {0}" -f (@($report | Where-Object { $_.changed }).Count))
Write-Output ("Unmatched contacts with location data: {0}" -f $unmatched.Count)
