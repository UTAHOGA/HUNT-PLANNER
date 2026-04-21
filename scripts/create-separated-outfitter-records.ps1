$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-new-records-report.csv'

function New-Record {
  param(
    [string]$Id,
    [string]$Slug,
    [string]$DisplayName,
    [string]$PrimaryName,
    [string]$EmailPrimary,
    [string[]]$Emails,
    [string[]]$UsfsForestIds,
    [string[]]$ZoneTags,
    [string[]]$SourceNotes,
    [string]$WhyListed,
    [string]$ValidationNote
  )
  [pscustomobject][ordered]@{
    id = $Id
    slug = $Slug
    displayName = $DisplayName
    legalBusinessName = ''
    listingType = 'Hunting'
    publicStatus = 'active'
    verificationStatus = 'Provisional'
    certLevel = ''
    memberStatus = 'unknown'
    referralStatus = 'eligible'
    referralPriority = 'standard'
    referralRotationGroup = 'uoga-master-default'
    contact = [pscustomobject][ordered]@{
      primaryName = $PrimaryName
      ownerNames = @($PrimaryName)
      phonePrimary = ''
      phoneNumbers = @()
      emailPrimary = $EmailPrimary
      emailAddresses = @($Emails)
      website = ''
      facebookUrl = ''
      instagramUrl = ''
      instagramHandle = ''
      youtubeUrl = ''
    }
    branding = [pscustomobject][ordered]@{
      logoUrl = ''
      heroImageUrl = ''
      cardImageUrl = ''
    }
    headquarters = [pscustomobject][ordered]@{
      city = ''
      region = 'Utah'
      state = 'UT'
      mailingAddress = ''
      publicMeetingLocation = ''
      latitude = $null
      longitude = $null
    }
    serviceArea = [pscustomobject][ordered]@{
      speciesServed = @()
      unitsServed = @()
      usfsForests = @()
      usfsForestIds = @($UsfsForestIds)
      usfsDistrictIds = @()
      usfsPermitAreasRaw = @()
      usfsPermitText = ''
      blmDistricts = @()
      blmDistrictIds = @()
      blmPermitAreasRaw = @()
      blmPermitText = ''
      zoneTags = @($ZoneTags)
      countiesServed = @()
      wmasServed = @()
      stateParks = @()
      sitla = @()
      statewide = $false
    }
    services = [pscustomobject][ordered]@{
      guidedHunts = $true
      diySupport = $false
      trespassAccess = $false
      lodgingIncluded = $false
      mealsIncluded = $false
      packTrips = $false
      airportPickup = $false
      youthHunts = $false
      archery = $false
      muzzleloader = $false
      rifle = $false
      hamss = $false
      otherServices = @()
    }
    huntFit = [pscustomobject][ordered]@{
      trophyFocus = $false
      generalSeasonFocus = $false
      limitedEntryFocus = $false
      oilFocus = $false
      speciesSummary = ''
      terrainSummary = ''
      publicLandStrength = ''
      accessSummary = ''
    }
    compliance = [pscustomobject][ordered]@{
      stateLicenseNumber = ''
      guideLicenseNumber = ''
      outfitterLicenseNumber = ''
      insuranceVerified = $false
      contractOnFile = $false
      vettingReviewedAt = ''
      vettingReviewedBy = ''
      nextReviewDue = ''
    }
    publication = [pscustomobject][ordered]@{
      shortDescription = ''
      longDescription = ''
      whyListed = $WhyListed
      featuredRank = 0
      showOnPlanner = $true
      showOnPublicList = $true
      showOnHomepage = $false
    }
    internal = [pscustomobject][ordered]@{
      sourceNotes = @($SourceNotes)
      dataCompleteness = 'provisional-manual-record'
      lastNormalizedAt = '2026-03-26'
      lastEditedBy = 'Codex'
      migrationSource = 'Manual record creation from user correction'
      reviewNotes = @('Created as separate business per user correction.')
      appliedServiceOverrides = @()
    }
    businessName = $DisplayName
    urlStatus = 'Missing'
    validationNote = $ValidationNote
  }
}

$master = [System.Collections.ArrayList]@(Get-Content $masterPath -Raw | ConvertFrom-Json)
$public = [System.Collections.ArrayList]@(Get-Content $publicPath -Raw | ConvertFrom-Json)
$added = New-Object System.Collections.ArrayList

$newRecords = @(
  (New-Record -Id 'outfitter-utah-big-game-outfitters' -Slug 'utah-big-game-outfitters' -DisplayName 'Utah Big Game Outfitters' -PrimaryName 'Coby Hunt' -EmailPrimary 'utahbiggameoutfitters@gmail.com' -Emails @('utahbiggameoutfitters@gmail.com') -UsfsForestIds @('fishlake') -ZoneTags @('fishlake-forest-permittees') -SourceNotes @('Created from user correction separating Utah Big Game Outfitters from Utah Hunting Outfitters.','Fishlake permittee email list / user correction') -WhyListed 'Created from user correction to separate Utah Big Game Outfitters from Utah Hunting Outfitters.' -ValidationNote 'Separate business created per user correction; website/phone still needs confirmation.'),
  (New-Record -Id 'outfitter-lone-tree-outfitters' -Slug 'lone-tree-outfitters' -DisplayName 'Lone Tree Outfitters' -PrimaryName 'John' -EmailPrimary 'lonetreeoutfitters@hotmail.com' -Emails @('lonetreeoutfitters@hotmail.com') -UsfsForestIds @('fishlake') -ZoneTags @('fishlake-forest-permittees') -SourceNotes @('Created from user correction separating Lone Tree Outfitters from Lone Ridge Outfitters.','Fishlake permittee email list / user correction') -WhyListed 'Created from user correction to separate Lone Tree Outfitters from Lone Ridge Outfitters.' -ValidationNote 'Separate business created per user correction; website/phone still needs confirmation.')
)

foreach($rec in $newRecords){
  $exists = $master | Where-Object { $_.id -eq $rec.id -or $_.displayName -eq $rec.displayName } | Select-Object -First 1
  if(-not $exists){
    [void]$master.Add($rec)
    [void]$public.Add($rec)
    [void]$added.Add([pscustomobject]@{ Name=$rec.displayName; Id=$rec.id; Email=$rec.contact.emailPrimary; Status='created' })
  } else {
    [void]$added.Add([pscustomobject]@{ Name=$rec.displayName; Id=$rec.id; Email=$rec.contact.emailPrimary; Status='already-exists' })
  }
}

$master = [System.Collections.ArrayList]@($master | Sort-Object displayName)
$public = [System.Collections.ArrayList]@($public | Sort-Object displayName)
$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
$public | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$added | Export-Csv -NoTypeInformation -Path $reportPath
Write-Output 'CREATED_RECORDS'
Write-Output ('REPORT=' + $reportPath)
