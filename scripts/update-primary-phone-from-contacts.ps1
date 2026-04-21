param(
  [string]$ContactsCsv = "C:\DOWNLOADS\contacts (8).csv",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-primary-phone-update-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-primary-phone-unmatched-contacts.csv"
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

function Normalize-Phone([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $digits = ($Value -replace '[^0-9]', '')
  if ($digits.Length -eq 11 -and $digits.StartsWith('1')) {
    $digits = $digits.Substring(1)
  }
  if ($digits.Length -ne 10) { return '' }
  return "({0}) {1}-{2}" -f $digits.Substring(0,3), $digits.Substring(3,3), $digits.Substring(6,4)
}

function Get-PhonesFromNotes([string]$Notes) {
  $phones = @()
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $phones }
  $matches = [regex]::Matches($Notes, '(?im)Phone\s*\d*\s*:\s*([^\r\n]+)')
  foreach ($match in $matches) {
    $phone = Normalize-Phone $match.Groups[1].Value
    if ($phone) { $phones += $phone }
  }
  return $phones
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

function Get-BestContactPhone($Row) {
  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($raw in @($Row.'Phone 1 - Value', $Row.'Phone 2 - Value')) {
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    foreach ($part in ($raw -split ':::')) {
      $phone = Normalize-Phone $part
      if ($phone -and -not $candidates.Contains($phone)) { $null = $candidates.Add($phone) }
    }
  }
  foreach ($phone in Get-PhonesFromNotes $Row.Notes) {
    if ($phone -and -not $candidates.Contains($phone)) { $null = $candidates.Add($phone) }
  }
  return @($candidates)
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
  $phones = @(Get-BestContactPhone $contact)
  if ($phones.Count -eq 0) { continue }

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
      extractedPhones = $phones -join ' | '
    }) | Out-Null
    continue
  }

  $newPrimary = $phones[0]
  $oldPrimary = [string]$matchedRow.phonePrimary
  $changed = $oldPrimary -ne $newPrimary
  $matchedRow.phonePrimary = $newPrimary

  $report.Add([pscustomobject]@{
    displayName = $matchedRow.displayName
    matchedOn = $matchName
    oldPhonePrimary = $oldPrimary
    newPhonePrimary = $newPrimary
    additionalPhonesFound = (@($phones | Select-Object -Skip 1)) -join ' | '
    changed = $changed
  }) | Out-Null
}

$reviewRows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
$unmatched | Sort-Object organizationName, contactName | Export-Csv -NoTypeInformation -Encoding UTF8 $UnmatchedCsv

Write-Output "Updated review CSV: $ReviewCsv"
Write-Output "Phone report: $ReportCsv"
Write-Output "Unmatched contacts: $UnmatchedCsv"
Write-Output ("Matched rows: {0}" -f $report.Count)
Write-Output ("Changed rows: {0}" -f (@($report | Where-Object { $_.changed }).Count))
Write-Output ("Unmatched contacts with phones: {0}" -f $unmatched.Count)
