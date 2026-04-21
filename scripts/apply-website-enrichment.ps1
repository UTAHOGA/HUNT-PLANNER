param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$EnrichmentJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\website-enrichment-approved.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $EnrichmentJson)) {
  throw "Approved enrichment file not found: $EnrichmentJson"
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100
$approved = Get-Content $EnrichmentJson -Raw | ConvertFrom-Json -Depth 100

function Add-UniqueValue {
  param(
    [object[]]$Existing,
    [string[]]$Incoming
  )
  $list = New-Object System.Collections.ArrayList
  foreach ($value in @($Existing) + @($Incoming)) {
    $text = [string]$value
    if (-not [string]::IsNullOrWhiteSpace($text) -and -not $list.Contains($text)) {
      [void]$list.Add($text)
    }
  }
  return @($list)
}

foreach ($item in $approved) {
  $record = $master | Where-Object { $_.id -eq $item.id }
  if (-not $record) { continue }

  if ($item.businessDescription) {
    $record.publication.longDescription = [string]$item.businessDescription
  }
  if ($item.shortDescription) {
    $record.publication.shortDescription = [string]$item.shortDescription
  }
  if ($item.speciesServed) {
    $record.serviceArea.speciesServed = Add-UniqueValue -Existing $record.serviceArea.speciesServed -Incoming $item.speciesServed
  }
  if ($item.unitsServed) {
    $record.serviceArea.unitsServed = Add-UniqueValue -Existing $record.serviceArea.unitsServed -Incoming $item.unitsServed
  }
  if ($item.usfsForests) {
    $record.serviceArea.usfsForests = Add-UniqueValue -Existing $record.serviceArea.usfsForests -Incoming $item.usfsForests
  }
  if ($item.blmDistricts) {
    $record.serviceArea.blmDistricts = Add-UniqueValue -Existing $record.serviceArea.blmDistricts -Incoming $item.blmDistricts
  }
  if ($item.address -and -not $record.headquarters.mailingAddress) {
    $record.headquarters.mailingAddress = [string]$item.address
  }
  if ($item.phone -and -not $record.contact.phonePrimary) {
    $record.contact.phonePrimary = [string]$item.phone
  }
  if ($item.phone) {
    $record.contact.phoneNumbers = Add-UniqueValue -Existing $record.contact.phoneNumbers -Incoming @([string]$item.phone)
  }
  if ($item.email -and -not $record.contact.emailPrimary) {
    $record.contact.emailPrimary = [string]$item.email
  }
  if ($item.email) {
    $record.contact.emailAddresses = Add-UniqueValue -Existing $record.contact.emailAddresses -Incoming @([string]$item.email)
  }
  if ($item.contactPage) {
    $record.contact.website = [string]$item.contactPage
  }
  if ($item.socialLinks) {
    if (-not $record.internal.websiteResearch) {
      $record.internal | Add-Member -NotePropertyName websiteResearch -NotePropertyValue @{} -Force
    }
    $record.internal.websiteResearch.socialLinks = @($item.socialLinks)
  }
  if ($item.permitOrLicenseText) {
    if (-not $record.internal.websiteResearch) {
      $record.internal | Add-Member -NotePropertyName websiteResearch -NotePropertyValue @{} -Force
    }
    $record.internal.websiteResearch.permitOrLicenseText = [string]$item.permitOrLicenseText
  }
  if (-not $record.internal.sourceNotes) { $record.internal.sourceNotes = @() }
  if ("Website enrichment applied" -notin $record.internal.sourceNotes) {
    $record.internal.sourceNotes += "Website enrichment applied"
  }
}

$master | ConvertTo-Json -Depth 100 | Set-Content $MasterJson
$master | Where-Object { $_.publicStatus -eq "active" -and $_.publication.showOnPlanner } | ConvertTo-Json -Depth 100 | Set-Content "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json"

Write-Output ("APPLIED=" + $approved.Count)
