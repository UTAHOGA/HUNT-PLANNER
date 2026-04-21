param(
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-secondary-contact-split-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Space([string]$Value) {
  return (($Value ?? '') -replace '\s+', ' ').Trim()
}

function Split-NameParts([string]$Value) {
  $clean = Normalize-Space $Value
  if (-not $clean) { return ,@() }
  return @($clean -split ' ')
}

function Join-NameParts([string[]]$Parts) {
  return (Normalize-Space ($Parts -join ' '))
}

function Expand-With-SharedLastName([string]$Left, [string]$Right) {
  $leftParts = @(Split-NameParts $Left)
  $rightParts = @(Split-NameParts $Right)
  if (@($leftParts).Count -eq 0 -or @($rightParts).Count -eq 0) {
    return ,@($Left, $Right)
  }

  if (@($rightParts).Count -ge 2 -and @($leftParts).Count -eq 1) {
    $sharedLast = $rightParts[-1]
    return ,@(
      (Join-NameParts @($leftParts[0], $sharedLast)),
      (Join-NameParts $rightParts)
    )
  }

  if (@($leftParts).Count -ge 2 -and @($rightParts).Count -eq 1) {
    $sharedLast = $leftParts[-1]
    return ,@(
      (Join-NameParts $leftParts),
      (Join-NameParts @($rightParts[0], $sharedLast))
    )
  }

  return ,@(
    (Join-NameParts $leftParts),
    (Join-NameParts $rightParts)
  )
}

function Get-SecondarySplit([string]$PrimaryName) {
  $text = Normalize-Space $PrimaryName
  if (-not $text) { return $null }

  $separator = $null
  foreach ($candidate in @(' and ', ' or ', ' & ')) {
    if ($text -like "*$candidate*") {
      $separator = $candidate
      break
    }
  }
  if (-not $separator) { return $null }

  $pieces = @($text -split [regex]::Escape($separator))
  if ($pieces.Count -ne 2) { return $null }

  $left = Normalize-Space $pieces[0]
  $right = Normalize-Space $pieces[1]
  if (-not $left -or -not $right) { return $null }

  $expanded = Expand-With-SharedLastName $left $right
  return [pscustomobject]@{
    Primary   = $expanded[0]
    Secondary = $expanded[1]
  }
}

function Get-FirstLast([string]$FullName) {
  $parts = @(Split-NameParts $FullName)
  if (@($parts).Count -eq 0) {
    return [pscustomobject]@{ First = ''; Last = '' }
  }
  if (@($parts).Count -eq 1) {
    return [pscustomobject]@{ First = $parts[0]; Last = '' }
  }
  return [pscustomobject]@{
    First = (Join-NameParts $parts[0..(@($parts).Count - 2)])
    Last  = $parts[-1]
  }
}

$rows = Import-Csv $ReviewCsv
$report = New-Object System.Collections.Generic.List[object]

foreach ($row in $rows) {
  if (-not ($row.PSObject.Properties.Name -contains 'secondaryContactName')) {
    $row | Add-Member -NotePropertyName secondaryContactName -NotePropertyValue ''
  }

  $split = Get-SecondarySplit $row.primaryName
  if (-not $split) { continue }

  $oldPrimary = $row.primaryName
  $oldOwnerNames = $row.ownerNames

  $row.primaryName = $split.Primary
  $row.secondaryContactName = $split.Secondary
  $row.ownerNames = (($split.Primary, $split.Secondary) -join ' | ')

  $firstLast = Get-FirstLast $split.Primary
  if ($row.PSObject.Properties.Name -contains 'contactFirstName') { $row.contactFirstName = $firstLast.First }
  if ($row.PSObject.Properties.Name -contains 'contactLastName') { $row.contactLastName = $firstLast.Last }

  $report.Add([pscustomobject]@{
    displayName = $row.displayName
    oldPrimaryName = $oldPrimary
    newPrimaryName = $row.primaryName
    secondaryContactName = $row.secondaryContactName
    oldOwnerNames = $oldOwnerNames
    newOwnerNames = $row.ownerNames
  }) | Out-Null
}

$exportColumns = @(
  'id','slug','displayName','legalBusinessName','listingType','publicStatus','verificationStatus','certLevel',
  'primaryName','secondaryContactName','ownerNames','phonePrimary','phoneNumbers','emailPrimary','emailAddresses',
  'website','facebookUrl','instagramUrl','city','region','state','mailingAddress','publicMeetingLocation',
  'latitude','longitude','speciesServed','unitsServed','usfsForests','usfsForestIds','usfsDistrictIds',
  'usfsPermitAreasRaw','usfsPermitText','blmDistricts','blmDistrictIds','blmPermitAreasRaw','blmPermitText',
  'zoneTags','countiesServed','wmasServed','sitlaServed','sitlaCount','stateParksServed','stateParksCount',
  'statewide','guidedHunts','diySupport','trespassAccess','lodgingIncluded','mealsIncluded','packTrips',
  'youthHunts','archery','muzzleloader','whyListed','sourceNotes','dataCompleteness','lastNormalizedAt',
  'lastEditedBy','appliedServiceOverrides','contactFirstName','contactLastName'
)

$selectedColumns = foreach ($column in $exportColumns) {
  if ($rows[0].PSObject.Properties.Name -contains $column) { $column }
}

$rows | Select-Object $selectedColumns | Export-Csv -NoTypeInformation -Encoding UTF8 $ReviewCsv
$report | Sort-Object displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv

Write-Output ("Updated review CSV: {0}" -f $ReviewCsv)
Write-Output ("Split report: {0}" -f $ReportCsv)
