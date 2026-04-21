param(
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string[]]$JsonFiles = @(
    "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
    "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json"
  ),
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permit-sync-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Email([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  return ($Value.Trim().ToLowerInvariant() -replace '\s+', '')
}

function Normalize-Website([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
  $v = $Value.Trim().TrimEnd('/')
  return $v.ToLowerInvariant()
}

function Split-List([string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
  return @($Value -split '\s*\|\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
}

function Join-List([object]$Value) {
  if ($null -eq $Value) { return '' }
  if ($Value -is [System.Array]) { return (@($Value) -join ' | ') }
  return [string]$Value
}

function Set-ListIfDifferent([pscustomobject]$Target, [string]$PropertyName, [string[]]$NewValues, [System.Collections.Generic.List[string]]$ChangedFields) {
  $newList = @($NewValues | Where-Object { $_ } | Select-Object -Unique)
  $oldList = @()
  if ($Target.PSObject.Properties.Name -contains $PropertyName) {
    $existing = $Target.$PropertyName
    if ($existing -is [System.Array]) { $oldList = @($existing) }
    elseif ($existing) { $oldList = @([string]$existing) }
  }
  if ((Join-List $oldList) -ne (Join-List $newList)) {
    $Target.$PropertyName = @($newList)
    $ChangedFields.Add("serviceArea.$PropertyName") | Out-Null
  }
}

$reviewRows = Import-Csv $ReviewCsv
$reviewById = @{}
$reviewByEmail = @{}
$reviewByWebsite = @{}

foreach ($row in $reviewRows) {
  if ($row.id) { $reviewById[[string]$row.id] = $row }
  $email = Normalize-Email $row.emailPrimary
  if ($email -and -not $reviewByEmail.ContainsKey($email)) { $reviewByEmail[$email] = $row }
  $website = Normalize-Website $row.website
  if ($website -and -not $reviewByWebsite.ContainsKey($website)) { $reviewByWebsite[$website] = $row }
}

$report = New-Object System.Collections.Generic.List[object]

foreach ($jsonFile in $JsonFiles) {
  $rowsChanged = 0
  $data = Get-Content $jsonFile -Raw | ConvertFrom-Json

  foreach ($item in $data) {
    if (-not $item.serviceArea) {
      $item | Add-Member -NotePropertyName serviceArea -NotePropertyValue ([pscustomobject]@{}) -Force
    }

    $review = $null
    if ($reviewById.ContainsKey([string]$item.id)) {
      $review = $reviewById[[string]$item.id]
    }
    if (-not $review) {
      $email = Normalize-Email ([string]$item.contact.emailPrimary)
      if ($email -and $reviewByEmail.ContainsKey($email)) {
        $review = $reviewByEmail[$email]
      }
    }
    if (-not $review) {
      $website = Normalize-Website ([string]$item.contact.website)
      if ($website -and $reviewByWebsite.ContainsKey($website)) {
        $review = $reviewByWebsite[$website]
      }
    }
    if (-not $review) { continue }

    $changedFields = New-Object System.Collections.Generic.List[string]

    Set-ListIfDifferent $item.serviceArea 'usfsForests' (Split-List $review.usfsForests) $changedFields
    Set-ListIfDifferent $item.serviceArea 'usfsForestIds' (Split-List $review.usfsForestIds) $changedFields
    Set-ListIfDifferent $item.serviceArea 'usfsDistrictIds' (Split-List $review.usfsDistrictIds) $changedFields
    Set-ListIfDifferent $item.serviceArea 'blmDistricts' (Split-List $review.blmDistricts) $changedFields
    Set-ListIfDifferent $item.serviceArea 'blmDistrictIds' (Split-List $review.blmDistrictIds) $changedFields

    $newUsfsPermitText = [string]($review.usfsPermitText ?? '')
    if ([string]$item.serviceArea.usfsPermitText -ne $newUsfsPermitText) {
      $item.serviceArea.usfsPermitText = $newUsfsPermitText
      $changedFields.Add('serviceArea.usfsPermitText') | Out-Null
    }

    $newBlmPermitText = [string]($review.blmPermitText ?? '')
    if ([string]$item.serviceArea.blmPermitText -ne $newBlmPermitText) {
      $item.serviceArea.blmPermitText = $newBlmPermitText
      $changedFields.Add('serviceArea.blmPermitText') | Out-Null
    }

    if ($changedFields.Count -gt 0) {
      $rowsChanged += 1
      $report.Add([pscustomobject]@{
        jsonFile = [System.IO.Path]::GetFileName($jsonFile)
        id = $item.id
        displayName = $item.displayName
        matchBasis = if ($review.id -eq $item.id) { 'id' } elseif ((Normalize-Email ([string]$item.contact.emailPrimary)) -eq (Normalize-Email $review.emailPrimary)) { 'email' } else { 'website' }
        changedFields = ($changedFields -join ' | ')
      }) | Out-Null
    }
  }

  $data | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $jsonFile
  Write-Output ("Updated {0}: {1} rows changed" -f $jsonFile, $rowsChanged)
}

$report | Sort-Object jsonFile, displayName | Export-Csv -NoTypeInformation -Encoding UTF8 $ReportCsv
Write-Output ("Federal permit sync report: {0}" -f $ReportCsv)
