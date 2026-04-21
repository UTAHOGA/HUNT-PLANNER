param(
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string[]]$JsonFiles = @(
    "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
    "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json"
  ),
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-json-sync-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Phone([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $digits = ($Value -replace '[^0-9]', '')
  if ($digits.Length -eq 11 -and $digits.StartsWith('1')) { $digits = $digits.Substring(1) }
  if ($digits.Length -ne 10) { return '' }
  return "({0}) {1}-{2}" -f $digits.Substring(0,3), $digits.Substring(3,3), $digits.Substring(6,4)
}

function Normalize-Email([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return ($Value.Trim().ToLowerInvariant() -replace '\s+', '')
}

function Normalize-Website([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return $Value.Trim().TrimEnd('/')
}

function Normalize-State([string]$Value) {
  $text = ($Value ?? '').Trim()
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

function Ensure-ListContains([object]$Existing, [string]$Value) {
  $items = @()
  if ($Existing -is [System.Array]) { $items = @($Existing) }
  elseif ($Existing) { $items = @([string]$Existing) }
  $clean = $Value.Trim()
  if (-not $clean) { return @($items) }
  if ($items -notcontains $clean) { return @($clean) + @($items) }
  return @($items)
}

$reviewRows = Import-Csv $ReviewCsv
$reviewById = @{}
foreach ($row in $reviewRows) {
  if ($row.id) { $reviewById[[string]$row.id] = $row }
}

$report = New-Object System.Collections.Generic.List[object]

foreach ($jsonFile in $JsonFiles) {
  $rowsChanged = 0
  $data = Get-Content $jsonFile -Raw | ConvertFrom-Json
  foreach ($item in $data) {
    $review = $reviewById[[string]$item.id]
    if (-not $review) { continue }

    if (-not $item.contact) { $item | Add-Member -NotePropertyName contact -NotePropertyValue ([pscustomobject]@{}) -Force }
    if (-not $item.headquarters) { $item | Add-Member -NotePropertyName headquarters -NotePropertyValue ([pscustomobject]@{}) -Force }

    $changedFields = New-Object System.Collections.Generic.List[string]

    $newPrimaryName = ($review.primaryName ?? '').Trim()
    if ($newPrimaryName -and [string]$item.contact.primaryName -ne $newPrimaryName) {
      $item.contact.primaryName = $newPrimaryName
      $changedFields.Add('contact.primaryName') | Out-Null
    }

    $reviewSecondaryField = ''
    if ($review.PSObject.Properties.Name -contains 'secondaryContactName') {
      $reviewSecondaryField = [string]$review.secondaryContactName
    }
    $newSecondaryContactName = ($reviewSecondaryField ?? '').Trim()
    $existingSecondaryContactName = ''
    if ($item.contact.PSObject.Properties.Name -contains 'secondaryContactName') {
      $existingSecondaryContactName = [string]$item.contact.secondaryContactName
    }
    if ($newSecondaryContactName -and $existingSecondaryContactName -ne $newSecondaryContactName) {
      if (-not ($item.contact.PSObject.Properties.Name -contains 'secondaryContactName')) {
        $item.contact | Add-Member -NotePropertyName secondaryContactName -NotePropertyValue '' -Force
      }
      $item.contact.secondaryContactName = $newSecondaryContactName
      $changedFields.Add('contact.secondaryContactName') | Out-Null
    }
    elseif (-not $newSecondaryContactName -and $item.contact.PSObject.Properties.Name -contains 'secondaryContactName' -and [string]$item.contact.secondaryContactName) {
      $item.contact.secondaryContactName = ''
      $changedFields.Add('contact.secondaryContactName') | Out-Null
    }

    $newOwnerNames = ($review.ownerNames ?? '').Trim()
    if ($newOwnerNames -and [string]$item.contact.ownerNames -ne $newOwnerNames) {
      $item.contact.ownerNames = $newOwnerNames
      $changedFields.Add('contact.ownerNames') | Out-Null
    }

    $newPhone = Normalize-Phone $review.phonePrimary
    if ($newPhone -and [string]$item.contact.phonePrimary -ne $newPhone) {
      $item.contact.phonePrimary = $newPhone
      $changedFields.Add('contact.phonePrimary') | Out-Null
    }
    if ($newPhone) {
      $updatedPhones = Ensure-ListContains $item.contact.phoneNumbers $newPhone
      if ((@($item.contact.phoneNumbers) -join '|') -ne ($updatedPhones -join '|')) {
        $item.contact.phoneNumbers = @($updatedPhones)
        $changedFields.Add('contact.phoneNumbers') | Out-Null
      }
    }

    $newEmail = Normalize-Email $review.emailPrimary
    if ($newEmail -and [string]$item.contact.emailPrimary -ne $newEmail) {
      $item.contact.emailPrimary = $newEmail
      $changedFields.Add('contact.emailPrimary') | Out-Null
    }
    if ($newEmail) {
      $updatedEmails = Ensure-ListContains $item.contact.emailAddresses $newEmail
      if ((@($item.contact.emailAddresses) -join '|') -ne ($updatedEmails -join '|')) {
        $item.contact.emailAddresses = @($updatedEmails)
        $changedFields.Add('contact.emailAddresses') | Out-Null
      }
    }

    $newWebsite = Normalize-Website $review.website
    if ($newWebsite -and (Normalize-Website ([string]$item.contact.website)) -ne $newWebsite) {
      $item.contact.website = $newWebsite
      $changedFields.Add('contact.website') | Out-Null
    }

    $newCity = ($review.city ?? '').Trim()
    if ($newCity -and [string]$item.headquarters.city -ne $newCity) {
      $item.headquarters.city = $newCity
      $changedFields.Add('headquarters.city') | Out-Null
    }

    $newRegion = Normalize-State $review.region
    if ($newRegion -and (Normalize-State ([string]$item.headquarters.region)) -ne $newRegion) {
      $item.headquarters.region = $newRegion
      $changedFields.Add('headquarters.region') | Out-Null
    }

    $newState = Normalize-State $review.state
    if ($newState -and (Normalize-State ([string]$item.headquarters.state)) -ne $newState) {
      $item.headquarters.state = $newState
      $changedFields.Add('headquarters.state') | Out-Null
    }

    $newMail = ($review.mailingAddress ?? '').Trim()
    if ($newMail -and [string]$item.headquarters.mailingAddress -ne $newMail) {
      $item.headquarters.mailingAddress = $newMail
      $changedFields.Add('headquarters.mailingAddress') | Out-Null
    }

    if ($changedFields.Count -gt 0) {
      $rowsChanged += 1
      $report.Add([pscustomobject]@{
        jsonFile = [System.IO.Path]::GetFileName($jsonFile)
        id = $item.id
        displayName = $item.displayName
        changedFields = ($changedFields -join ' | ')
      }) | Out-Null
    }
  }

  $data | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $jsonFile
  Write-Output ("Updated {0}: {1} rows changed" -f $jsonFile, $rowsChanged)
}

$report | Sort-Object jsonFile, displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
Write-Output ("Sync report: {0}" -f $ReportCsv)
