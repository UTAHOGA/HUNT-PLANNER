param(
  [string]$ContactsCsv = "C:\DOWNLOADS\contacts (8).csv",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-primary-email-update-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-primary-email-unmatched-contacts.csv"
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

function Normalize-Email([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $email = $Value.Trim().ToLowerInvariant()
  $email = $email.Replace([string][char]0xFB02, 'fl').Replace([string][char]0xFB01, 'fi')
  $email = $email -replace '\s+', ''
  if ($email -match '^[a-z0-9._%+\-''/]+@[a-z0-9.\-]+\.[a-z]{2,}$') {
    return $email
  }
  return ''
}

function Get-EmailsFromNotes([string]$Notes) {
  $emails = @()
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $emails }
  $matches = [regex]::Matches($Notes, '(?im)Email\s*\d*\s*:\s*([^\r\n]+)')
  foreach ($match in $matches) {
    $email = Normalize-Email $match.Groups[1].Value
    if ($email) { $emails += $email }
  }
  return $emails
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

function Get-BestContactEmails($Row) {
  $candidates = New-Object System.Collections.Generic.List[string]
  foreach ($raw in @($Row.'E-mail 1 - Value', $Row.'E-mail 2 - Value', $Row.'E-mail 3 - Value')) {
    if ([string]::IsNullOrWhiteSpace($raw)) { continue }
    foreach ($part in ($raw -split ':::')) {
      $email = Normalize-Email $part
      if ($email -and -not $candidates.Contains($email)) { $null = $candidates.Add($email) }
    }
  }
  foreach ($email in Get-EmailsFromNotes $Row.Notes) {
    if ($email -and -not $candidates.Contains($email)) { $null = $candidates.Add($email) }
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
  $emails = @(Get-BestContactEmails $contact)
  if ($emails.Count -eq 0) { continue }

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
      extractedEmails = $emails -join ' | '
    }) | Out-Null
    continue
  }

  $newPrimary = $emails[0]
  $oldPrimary = [string]$matchedRow.emailPrimary
  $changed = $oldPrimary -ne $newPrimary
  $matchedRow.emailPrimary = $newPrimary

  $report.Add([pscustomobject]@{
    displayName = $matchedRow.displayName
    matchedOn = $matchName
    oldEmailPrimary = $oldPrimary
    newEmailPrimary = $newPrimary
    additionalEmailsFound = (@($emails | Select-Object -Skip 1)) -join ' | '
    changed = $changed
  }) | Out-Null
}

$reviewRows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
$unmatched | Sort-Object organizationName, contactName | Export-Csv -NoTypeInformation -Encoding UTF8 $UnmatchedCsv

Write-Output "Updated review CSV: $ReviewCsv"
Write-Output "Email report: $ReportCsv"
Write-Output "Unmatched contacts: $UnmatchedCsv"
Write-Output ("Matched rows: {0}" -f $report.Count)
Write-Output ("Changed rows: {0}" -f (@($report | Where-Object { $_.changed }).Count))
Write-Output ("Unmatched contacts with emails: {0}" -f $unmatched.Count)
