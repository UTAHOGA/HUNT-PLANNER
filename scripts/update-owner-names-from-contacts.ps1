param(
  [string]$ContactsCsv = "C:\DOWNLOADS\contacts (8).csv",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-owner-name-update-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-owner-name-unmatched-contacts.csv"
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

function Clean-PersonName([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $text = $Value.Trim()
  $text = $text -replace '\*', ''
  $text = $text -replace '\s+', ' '
  $text = $text.Trim(' ',',',';','|')
  if ($text -match '^(utah|u\.?t\.?|myton|fairview|randlett|clawson|cedar city|layton),?\s*ut\.?$') { return '' }
  return $text
}

function Get-NoteValues([string]$Notes, [string]$Label) {
  $values = @()
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $values }
  $matches = [regex]::Matches($Notes, "(?im)^\s*$([regex]::Escape($Label))\s*:\s*(.+?)\s*$")
  foreach ($match in $matches) {
    $raw = $match.Groups[1].Value.Trim()
    if ($raw) { $values += $raw }
  }
  return $values
}

function Split-OwnerLine([string]$Value) {
  $clean = Clean-PersonName $Value
  if (-not $clean) { return @() }
  $parts = $clean -split '\s{2,}| \| |;'
  $names = @()
  foreach ($part in $parts) {
    $name = Clean-PersonName $part
    if ($name) { $names += $name }
  }
  return $names
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

function Get-ContactPriorityScore($Row, $NameData) {
  $score = 0
  $notes = [string]$Row.Notes
  if ($notes -match '(?im)^\s*OUTFITTER:\s*') { $score += 5 }
  if ($notes -match '(?im)^\s*BUSINESS:\s*') { $score += 4 }
  if ($notes -match '(?im)^\s*OWNER:\s*') { $score += 3 }
  if ($notes -match 'Source:\s*Contact Import') { $score += 2 }
  if ($notes -match 'Source:\s*Form Submission') { $score += 1 }
  if ($NameData.ContactFirstName -and $NameData.ContactLastName) { $score += 2 }
  if ($NameData.OwnerNames.Count -gt 0) { $score += 2 }
  if ($NameData.PrimaryName) { $score += 2 }
  return $score
}

function Get-ContactNameData($Row) {
  $first = Clean-PersonName $Row.'First Name'
  $last = Clean-PersonName $Row.'Last Name'
  $primary = Clean-PersonName ((@($first, $last) | Where-Object { $_ }) -join ' ')

  $firstLastNotes = @((Get-NoteValues $Row.Notes 'first last') | ForEach-Object { Clean-PersonName $_ } | Where-Object { $_ })
  $ownerNotesRaw = @(Get-NoteValues $Row.Notes 'OWNER')
  $ownerNotes = @()
  foreach ($line in $ownerNotesRaw) {
    $ownerNotes += @(Split-OwnerLine $line)
  }

  if (-not $primary -and $firstLastNotes.Count) { $primary = $firstLastNotes[0] }
  if (-not $primary -and $ownerNotes.Count) { $primary = $ownerNotes[0] }

  $ownerNames = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in @($primary) + $firstLastNotes + $ownerNotes) {
    $name = Clean-PersonName $candidate
    if ($name -and -not $ownerNames.Contains($name)) { $null = $ownerNames.Add($name) }
  }

  return [pscustomobject]@{
    ContactFirstName = $first
    ContactLastName = $last
    PrimaryName = $primary
    OwnerNames = @($ownerNames)
  }
}

$reviewRows = Import-Csv $ReviewCsv
$contactRows = Import-Csv $ContactsCsv

foreach ($row in $reviewRows) {
  if (-not ($row.PSObject.Properties.Name -contains 'contactFirstName')) {
    Add-Member -InputObject $row -NotePropertyName contactFirstName -NotePropertyValue '' -Force
  }
  if (-not ($row.PSObject.Properties.Name -contains 'contactLastName')) {
    Add-Member -InputObject $row -NotePropertyName contactLastName -NotePropertyValue '' -Force
  }
}

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
$bestMatchById = @{}

foreach ($contact in $contactRows) {
  $nameData = Get-ContactNameData $contact
  if (-not $nameData.PrimaryName -and $nameData.OwnerNames.Count -eq 0 -and -not $nameData.ContactFirstName -and -not $nameData.ContactLastName) {
    continue
  }

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
      contactFirstName = $nameData.ContactFirstName
      contactLastName = $nameData.ContactLastName
      organizationName = $contact.'Organization Name'
      candidateOutfitterNames = $candidateNames -join ' | '
      primaryName = $nameData.PrimaryName
      ownerNames = $nameData.OwnerNames -join ' | '
    }) | Out-Null
    continue
  }

  $score = Get-ContactPriorityScore $contact $nameData
  $existing = $bestMatchById[[string]$matchedRow.id]
  if (-not $existing -or $score -gt $existing.score) {
    $bestMatchById[[string]$matchedRow.id] = [pscustomobject]@{
      row = $matchedRow
      matchName = $matchName
      nameData = $nameData
      score = $score
    }
  }
}

foreach ($entry in $bestMatchById.Values) {
  $matchedRow = $entry.row
  $nameData = $entry.nameData
  $oldPrimary = [string]$matchedRow.primaryName
  $oldOwnerNames = [string]$matchedRow.ownerNames
  $oldFirst = [string]$matchedRow.contactFirstName
  $oldLast = [string]$matchedRow.contactLastName

  if ($nameData.PrimaryName) { $matchedRow.primaryName = $nameData.PrimaryName }
  if ($nameData.OwnerNames.Count) { $matchedRow.ownerNames = $nameData.OwnerNames -join ' | ' }
  $matchedRow.contactFirstName = $nameData.ContactFirstName
  $matchedRow.contactLastName = $nameData.ContactLastName

  $changed = (
    $oldPrimary -ne [string]$matchedRow.primaryName -or
    $oldOwnerNames -ne [string]$matchedRow.ownerNames -or
    $oldFirst -ne [string]$matchedRow.contactFirstName -or
    $oldLast -ne [string]$matchedRow.contactLastName
  )

  $report.Add([pscustomobject]@{
    displayName = $matchedRow.displayName
    matchedOn = $entry.matchName
    oldPrimaryName = $oldPrimary
    newPrimaryName = [string]$matchedRow.primaryName
    oldOwnerNames = $oldOwnerNames
    newOwnerNames = [string]$matchedRow.ownerNames
    contactFirstName = [string]$matchedRow.contactFirstName
    contactLastName = [string]$matchedRow.contactLastName
    changed = $changed
  }) | Out-Null
}

$reviewRows | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
$unmatched | Sort-Object organizationName, contactLastName, contactFirstName | Export-Csv -NoTypeInformation -Encoding UTF8 $UnmatchedCsv

Write-Output "Updated review CSV: $ReviewCsv"
Write-Output "Owner-name report: $ReportCsv"
Write-Output "Unmatched contacts: $UnmatchedCsv"
Write-Output ("Matched rows: {0}" -f $report.Count)
Write-Output ("Changed rows: {0}" -f (@($report | Where-Object { $_.changed }).Count))
Write-Output ("Unmatched contacts with owner/name data: {0}" -f $unmatched.Count)
