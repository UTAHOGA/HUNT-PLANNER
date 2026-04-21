param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$QueueJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-sourcing-queue.json",
  [string]$QueueCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-sourcing-review.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-UrlHost {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return "" }
  try { return ([uri]$Url).Host } catch { return "" }
}

function Get-SourceType {
  param([string]$Website)
  $urlHost = (Get-UrlHost $Website).ToLowerInvariant()
  if (-not $urlHost) { return "missing" }
  if ($urlHost -match 'facebook\.com|l\.facebook\.com') { return "facebook" }
  if ($urlHost -match 'instagram\.com') { return "instagram" }
  if ($urlHost -match 'youtube\.com|youtu\.be|x\.com|twitter\.com') { return "other-social" }
  return "domain"
}

function Get-Priority {
  param([string]$SourceType, [bool]$ShowOnPlanner)
  if ($SourceType -eq "domain" -and $ShowOnPlanner) { return "high" }
  if ($SourceType -eq "domain") { return "medium" }
  if (($SourceType -eq "facebook" -or $SourceType -eq "instagram") -and $ShowOnPlanner) { return "medium" }
  if ($SourceType -eq "facebook" -or $SourceType -eq "instagram") { return "social" }
  if ($SourceType -eq "other-social") { return "low" }
  return "skip"
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100

$rows = foreach ($record in $master) {
  $website = [string]$record.contact.website
  $sourceType = Get-SourceType $website
  $priority = Get-Priority -SourceType $sourceType -ShowOnPlanner ([bool]$record.publication.showOnPlanner)
  $currentLogoUrl = [string]$record.branding.logoUrl

  if (-not [string]::IsNullOrWhiteSpace($currentLogoUrl)) {
    continue
  }

  [PSCustomObject]@{
    id = $record.id
    displayName = $record.displayName
    businessName = $record.businessName
    website = $website
    sourceType = $sourceType
    priority = $priority
    showOnPlanner = [bool]$record.publication.showOnPlanner
    verificationStatus = [string]$record.verificationStatus
    currentLogoUrl = $currentLogoUrl
    selectedLogoUrl = ""
    sourcePageUrl = ""
    sourceMethod = ""
    confidence = ""
    notes = ""
  }
}

$rows | Sort-Object priority, displayName | ConvertTo-Json -Depth 8 | Set-Content $QueueJson
$rows | Sort-Object priority, displayName | Export-Csv -NoTypeInformation $QueueCsv

($rows | Group-Object sourceType | Sort-Object Name) | ForEach-Object {
  Write-Output ("SOURCE_" + $_.Name.ToUpperInvariant().Replace('-','_') + "=" + $_.Count)
}
Write-Output ("TOTAL=" + $rows.Count)
