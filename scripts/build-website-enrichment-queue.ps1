param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$QueueJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\website-enrichment-queue.json",
  [string]$QueueCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\website-enrichment-review.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-HostClass {
  param([string]$DomainHost)
  $h = ($DomainHost ?? "").ToLowerInvariant()
  if (-not $h) { return "missing" }
  if ($h -match 'facebook\.com|instagram\.com|l\.facebook\.com|youtube\.com|youtu\.be|x\.com|twitter\.com') { return "social" }
  if ($h -match 'netscape\.net|me\.com|citlink\.net|globalmedia\.io') { return "weak-domain" }
  return "direct-domain"
}

function Get-ReviewPriority {
  param([string]$HostClass, [string]$Website, [bool]$ShowOnPlanner)
  if (-not $Website) { return "skip" }
  if ($HostClass -eq "direct-domain" -and $ShowOnPlanner) { return "high" }
  if ($HostClass -eq "direct-domain") { return "medium" }
  if ($HostClass -eq "social") { return "low" }
  return "review"
}

function Get-UrlHost {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return "" }
  try {
    return ([uri]$Url).Host
  } catch {
    return ""
  }
}

function Get-NormalizedDomain {
  param([string]$DomainHost)
  if ([string]::IsNullOrWhiteSpace($DomainHost)) { return "" }
  $h = $DomainHost.ToLowerInvariant()
  if ($h.StartsWith("www.")) { $h = $h.Substring(4) }
  return $h
}

function Join-Values {
  param([object[]]$Values)
  $clean = foreach ($value in @($Values)) {
    $text = [string]$value
    if (-not [string]::IsNullOrWhiteSpace($text)) { $text.Trim() }
  }
  return (@($clean) -join " | ")
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100

$queue = foreach ($record in $master) {
  $website = [string]$record.contact.website
  $urlHost = Get-UrlHost $website
  $hostClass = Get-HostClass $urlHost
  $domain = Get-NormalizedDomain $urlHost
  $priority = Get-ReviewPriority -HostClass $hostClass -Website $website -ShowOnPlanner ([bool]$record.publication.showOnPlanner)

  [PSCustomObject]@{
    id = $record.id
    displayName = $record.displayName
    businessName = $record.businessName
    website = $website
    host = $urlHost
    normalizedDomain = $domain
    hostClass = $hostClass
    reviewPriority = $priority
    showOnPlanner = [bool]$record.publication.showOnPlanner
    verificationStatus = [string]$record.verificationStatus
    referralStatus = [string]$record.referralStatus
    city = [string]$record.headquarters.city
    primaryContact = [string]$record.contact.primaryName
    primaryEmail = [string]$record.contact.emailPrimary
    primaryPhone = [string]$record.contact.phonePrimary
    speciesSummary = [string]$record.huntFit.speciesSummary
    speciesServed = Join-Values @($record.serviceArea.speciesServed)
    unitsServed = Join-Values @($record.serviceArea.unitsServed)
    usfsForests = Join-Values @($record.serviceArea.usfsForests)
    blmDistricts = Join-Values @($record.serviceArea.blmDistricts)
    extractBusinessDescription = ""
    extractSpeciesOffered = ""
    extractHuntTypes = ""
    extractUnitsOrAreas = ""
    extractAddress = ""
    extractPhone = ""
    extractEmail = ""
    extractPermitOrLicenseText = ""
    extractSocialLinks = ""
    extractContactPage = ""
    extractBookingOrInquiryLink = ""
    notes = ""
  }
}

$queue | Sort-Object reviewPriority, displayName | ConvertTo-Json -Depth 8 | Set-Content $QueueJson
$queue | Sort-Object reviewPriority, displayName | Export-Csv -NoTypeInformation $QueueCsv

$counts = $queue | Group-Object hostClass | Sort-Object Name
foreach ($group in $counts) {
  Write-Output ("HOSTCLASS_" + $group.Name.ToUpperInvariant().Replace('-', '_') + "=" + $group.Count)
}
Write-Output ("TOTAL=" + $queue.Count)
