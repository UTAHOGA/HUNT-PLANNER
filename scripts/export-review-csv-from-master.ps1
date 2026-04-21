param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$OutCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Join-List($Value) {
  if ($null -eq $Value) { return '' }
  if ($Value -is [System.Array]) {
    return (@($Value | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }) -join ' | ')
  }
  return [string]$Value
}

function Get-FirstLast([string]$FullName) {
  $text = (($FullName ?? '') -replace '\s+', ' ').Trim()
  if (-not $text) {
    return [pscustomobject]@{ First = ''; Last = '' }
  }
  $parts = @($text -split ' ')
  if ($parts.Count -eq 1) {
    return [pscustomobject]@{ First = $parts[0]; Last = '' }
  }
  return [pscustomobject]@{
    First = ($parts[0..($parts.Count - 2)] -join ' ')
    Last = $parts[-1]
  }
}

$data = Get-Content $MasterJson -Raw | ConvertFrom-Json
$rows = foreach ($item in $data) {
  $primaryName = [string]$item.contact.primaryName
  $secondaryContactName = ''
  if ($item.contact.PSObject.Properties.Name -contains 'secondaryContactName') {
    $secondaryContactName = [string]$item.contact.secondaryContactName
  }
  $firstLast = Get-FirstLast $primaryName

  $dwrRegistrationStatus = ''
  if ($item.internal -and $item.internal.PSObject.Properties.Name -contains 'dwrRegistrationStatus') {
    $dwrRegistrationStatus = [string]$item.internal.dwrRegistrationStatus
  }

  [pscustomobject]@{
    id = $item.id
    slug = $item.slug
    displayName = $item.displayName
    legalBusinessName = $item.legalBusinessName
    listingType = $item.listingType
    publicStatus = $item.publicStatus
    verificationStatus = $item.verificationStatus
    dwrRegistrationStatus = $dwrRegistrationStatus
    certLevel = $item.certLevel
    primaryName = $primaryName
    secondaryContactName = $secondaryContactName
    ownerNames = [string]$item.contact.ownerNames
    phonePrimary = [string]$item.contact.phonePrimary
    phoneNumbers = Join-List $item.contact.phoneNumbers
    emailPrimary = [string]$item.contact.emailPrimary
    emailAddresses = Join-List $item.contact.emailAddresses
    website = [string]$item.contact.website
    facebookUrl = [string]$item.contact.facebookUrl
    instagramUrl = [string]$item.contact.instagramUrl
    city = [string]$item.headquarters.city
    region = [string]$item.headquarters.region
    state = [string]$item.headquarters.state
    mailingAddress = [string]$item.headquarters.mailingAddress
    publicMeetingLocation = [string]$item.headquarters.publicMeetingLocation
    latitude = [string]$item.headquarters.latitude
    longitude = [string]$item.headquarters.longitude
    speciesServed = Join-List $item.serviceArea.speciesServed
    unitsServed = Join-List $item.serviceArea.unitsServed
    usfsForests = Join-List $item.serviceArea.usfsForests
    usfsForestIds = Join-List $item.serviceArea.usfsForestIds
    usfsDistrictIds = Join-List $item.serviceArea.usfsDistrictIds
    usfsPermitAreasRaw = Join-List $item.serviceArea.usfsPermitAreasRaw
    usfsPermitText = [string]$item.serviceArea.usfsPermitText
    blmDistricts = Join-List $item.serviceArea.blmDistricts
    blmDistrictIds = Join-List $item.serviceArea.blmDistrictIds
    blmPermitAreasRaw = Join-List $item.serviceArea.blmPermitAreasRaw
    blmPermitText = [string]$item.serviceArea.blmPermitText
    zoneTags = Join-List $item.serviceArea.zoneTags
    countiesServed = Join-List $item.serviceArea.countiesServed
    wmasServed = Join-List $item.serviceArea.wmasServed
    sitlaServed = Join-List $item.serviceArea.sitla
    sitlaCount = @($item.serviceArea.sitla).Count
    stateParksServed = Join-List $item.serviceArea.stateParks
    stateParksCount = @($item.serviceArea.stateParks).Count
    statewide = [string]$item.serviceArea.statewide
    guidedHunts = [string]$item.services.guidedHunts
    diySupport = [string]$item.services.diySupport
    trespassAccess = [string]$item.services.trespassAccess
    lodgingIncluded = [string]$item.services.lodgingIncluded
    mealsIncluded = [string]$item.services.mealsIncluded
    packTrips = [string]$item.services.packTrips
    youthHunts = [string]$item.services.youthHunts
    archery = [string]$item.services.archery
    muzzleloader = [string]$item.services.muzzleloader
    whyListed = [string]$item.publication.whyListed
    sourceNotes = Join-List $item.internal.sourceNotes
    dataCompleteness = [string]$item.internal.dataCompleteness
    lastNormalizedAt = [string]$item.internal.lastNormalizedAt
    lastEditedBy = [string]$item.internal.lastEditedBy
    appliedServiceOverrides = Join-List $item.internal.appliedServiceOverrides
    contactFirstName = $firstLast.First
    contactLastName = $firstLast.Last
  }
}

$rows | Export-Csv -NoTypeInformation -Encoding UTF8 $OutCsv
Write-Output ("Review CSV rebuilt from master: {0}" -f $OutCsv)
