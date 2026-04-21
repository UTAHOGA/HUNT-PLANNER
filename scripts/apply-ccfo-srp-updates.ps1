param(
  [string]$MasterPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$PublicPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$ReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$SlimReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$FiveColPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-5col-2026-03-27.csv",
  [string]$SlimPermitsPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-slim-2026-03-27.csv",
  [string]$CoverageCsvPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.csv",
  [string]$CoverageJsonPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.json",
  [string]$ReportPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\ccfo-srp-update-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$cedarOld = 'Cedar City'
$cedarNew = 'Color Country District (Cedar City Field Office)'
$cedarId = 'blm-cedar-city'

function Normalize-ListValue($value) {
  if ($null -eq $value) { return @() }
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    return @($value | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() })
  }
  $text = [string]$value
  if (-not $text.Trim()) { return @() }
  return @($text -split '\s*\|\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Join-List($value) {
  return (Normalize-ListValue $value | Select-Object -Unique) -join ' | '
}

function Set-CedarBlmFields([object]$serviceArea) {
  $districts = @(Normalize-ListValue $serviceArea.blmDistricts)
  $permitText = @(Normalize-ListValue $serviceArea.blmPermitText)
  $ids = @(Normalize-ListValue $serviceArea.blmDistrictIds)

  if ($districts -contains $cedarOld -or $ids -contains $cedarId -or $permitText -contains $cedarOld) {
    $districts = @($districts | ForEach-Object { if ($_ -eq $cedarOld) { $cedarNew } else { $_ } } | Select-Object -Unique)
    if (-not ($districts -contains $cedarNew)) { $districts += $cedarNew }
    if (-not ($ids -contains $cedarId)) { $ids += $cedarId }
    $permitText = @($permitText | ForEach-Object { if ($_ -eq $cedarOld) { $cedarNew } else { $_ } } | Select-Object -Unique)
    if (-not ($permitText -contains $cedarNew)) { $permitText += $cedarNew }

    $serviceArea.blmDistricts = $districts
    $serviceArea.blmDistrictIds = $ids
    $serviceArea.blmPermitText = ($permitText -join ' | ')
  }
}

function New-ProvisionalNextLevelRecord {
  $today = Get-Date -Format 'yyyy-MM-dd'
  return [pscustomobject]@{
    id = 'outfitter-next-level-outfitters'
    slug = 'next-level-outfitters'
    displayName = 'Next Level Outfitters'
    legalBusinessName = ''
    listingType = 'Hunting'
    publicStatus = 'active'
    verificationStatus = 'Provisional'
    certLevel = ''
    memberStatus = 'unknown'
    referralStatus = 'eligible'
    referralPriority = 'standard'
    referralRotationGroup = 'uoga-master-default'
    contact = [pscustomobject]@{
      primaryName = ''
      ownerNames = ''
      phonePrimary = $null
      phoneNumbers = @()
      emailPrimary = ''
      emailAddresses = @()
      website = ''
      facebookUrl = ''
      instagramUrl = ''
      instagramHandle = ''
      youtubeUrl = ''
      secondaryContactName = ''
    }
    branding = [pscustomobject]@{
      logoUrl = ''
      heroImageUrl = ''
      cardImageUrl = ''
    }
    headquarters = [pscustomobject]@{
      city = ''
      region = 'UT'
      state = 'UT'
      mailingAddress = ''
      publicMeetingLocation = ''
      latitude = $null
      longitude = $null
    }
    serviceArea = [pscustomobject]@{
      speciesServed = @()
      unitsServed = @()
      usfsForests = @()
      usfsForestIds = @()
      usfsDistrictIds = @()
      usfsPermitAreasRaw = @()
      usfsPermitText = ''
      blmDistricts = @($cedarNew)
      blmDistrictIds = @($cedarId)
      blmPermitAreasRaw = @('Cedar City Field Office','Color Country District')
      blmPermitText = $cedarNew
      zoneTags = @()
      countiesServed = @()
      wmasServed = @()
      stateParks = @()
      sitla = @()
      statewide = $false
    }
    services = [pscustomobject]@{
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
    huntFit = [pscustomobject]@{
      trophyFocus = $false
      generalSeasonFocus = $false
      limitedEntryFocus = $false
      oilFocus = $false
      speciesSummary = ''
      terrainSummary = ''
      publicLandStrength = ''
      accessSummary = ''
    }
    compliance = [pscustomobject]@{
      stateLicenseNumber = ''
      guideLicenseNumber = ''
      outfitterLicenseNumber = ''
      insuranceVerified = $false
      contractOnFile = $false
      vettingReviewedAt = ''
      vettingReviewedBy = ''
      nextReviewDue = ''
    }
    publication = [pscustomobject]@{
      shortDescription = ''
      longDescription = ''
      whyListed = 'Created from user-confirmed Q1 2026 CCFO Hunting Guide SRP document.'
      featuredRank = 0
      showOnPlanner = $true
      showOnPublicList = $true
      showOnHomepage = $false
    }
    internal = [pscustomobject]@{
      sourceNotes = @(
        'User-confirmed source: Q1_2026_CCFO_Hunting_Guide_SRPs[1].pdf',
        'CCFO Hunting Guide SRP attachment names Next Level Outfitters.'
      )
      dataCompleteness = 'provisional-manual-record'
      lastNormalizedAt = $today
      lastEditedBy = 'Codex'
      migrationSource = 'Manual record creation from CCFO SRP document'
      reviewNotes = @(
        'Created as provisional business from user-confirmed CCFO SRP document.',
        'Contact fields still need manual review.'
      )
      appliedServiceOverrides = @()
    }
    businessName = 'Next Level Outfitters'
    urlStatus = 'Missing'
    validationNote = 'Created from user-confirmed CCFO SRP document; contact details pending.'
  }
}

function Update-JsonFile([string]$path) {
  $data = @(Get-Content $path -Raw | ConvertFrom-Json)
  $report = New-Object System.Collections.Generic.List[object]

  foreach ($row in $data) {
    if ($null -ne $row.serviceArea) {
      $before = Join-List $row.serviceArea.blmDistricts
      Set-CedarBlmFields $row.serviceArea
      $after = Join-List $row.serviceArea.blmDistricts
      if ($before -ne $after) {
        $report.Add([pscustomobject]@{
          File = [System.IO.Path]::GetFileName($path)
          DisplayName = $row.displayName
          Action = 'Normalized Cedar City BLM label'
          BlmDistricts = $after
        })
      }
    }
  }

  if (-not ($data | Where-Object { $_.id -eq 'outfitter-next-level-outfitters' })) {
    $data += (New-ProvisionalNextLevelRecord)
    $report.Add([pscustomobject]@{
      File = [System.IO.Path]::GetFileName($path)
      DisplayName = 'Next Level Outfitters'
      Action = 'Created provisional CCFO record'
      BlmDistricts = $cedarNew
    })
  }

  $data | ConvertTo-Json -Depth 14 | Set-Content -Path $path -Encoding UTF8
  return $report
}

function Update-CsvFile([string]$path) {
  $rows = @(Import-Csv $path)
  $report = New-Object System.Collections.Generic.List[object]

  foreach ($row in $rows) {
    $changed = $false
    foreach ($column in @('blmDistricts','blmPermitText','BLM Permits')) {
      if ($row.PSObject.Properties[$column]) {
        $current = [string]$row.$column
        if ($current -match [regex]::Escape($cedarOld)) {
          $row.$column = (($current -split '\s*\|\s*' | ForEach-Object {
            if ($_.Trim() -eq $cedarOld) { $cedarNew } else { $_.Trim() }
          } | Where-Object { $_ } | Select-Object -Unique) -join ' | ')
          $changed = $true
        }
      }
    }
    if ($row.PSObject.Properties['blmDistrictIds'] -and ([string]$row.blmDistrictIds -match [regex]::Escape($cedarId))) {
      if (-not (([string]$row.blmDistricts) -match [regex]::Escape($cedarNew))) {
        $row.blmDistricts = (($row.blmDistricts -split '\s*\|\s*' | ForEach-Object {
          if ($_.Trim() -eq $cedarOld) { $cedarNew } else { $_.Trim() }
        } | Where-Object { $_ } | Select-Object -Unique) -join ' | ')
        $changed = $true
      }
      if ($row.PSObject.Properties['blmPermitText'] -and -not (([string]$row.blmPermitText) -match [regex]::Escape($cedarNew))) {
        $row.blmPermitText = (($row.blmPermitText -split '\s*\|\s*' | ForEach-Object {
          if ($_.Trim() -eq $cedarOld) { $cedarNew } else { $_.Trim() }
        } | Where-Object { $_ } | Select-Object -Unique) -join ' | ')
        $changed = $true
      }
    }
    if ($changed) {
      $name = if ($row.PSObject.Properties['displayName']) { $row.displayName } elseif ($row.PSObject.Properties['Outfitter']) { $row.Outfitter } else { '' }
      $report.Add([pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = $name
        Action = 'Normalized Cedar City BLM label'
      })
    }
  }

  if ($path -eq $ReviewPath -or $path -eq $SlimReviewPath) {
    $already = $rows | Where-Object { $_.id -eq 'outfitter-next-level-outfitters' }
    if (-not $already) {
      $template = $rows[0].PSObject.Properties.Name
      $newRow = [ordered]@{}
      foreach ($name in $template) { $newRow[$name] = '' }
      $newRow['id'] = 'outfitter-next-level-outfitters'
      $newRow['displayName'] = 'Next Level Outfitters'
      if ($newRow.Contains('primaryName')) { $newRow['primaryName'] = '' }
      if ($newRow.Contains('secondaryContactName')) { $newRow['secondaryContactName'] = '' }
      if ($newRow.Contains('ownerNames')) { $newRow['ownerNames'] = '' }
      if ($newRow.Contains('state')) { $newRow['state'] = 'UT' }
      if ($newRow.Contains('blmDistricts')) { $newRow['blmDistricts'] = $cedarNew }
      if ($newRow.Contains('blmDistrictIds')) { $newRow['blmDistrictIds'] = $cedarId }
      if ($newRow.Contains('blmPermitText')) { $newRow['blmPermitText'] = $cedarNew }
      $rows += [pscustomobject]$newRow
      $report.Add([pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = 'Next Level Outfitters'
        Action = 'Added provisional CCFO row'
      })
    }
  }

  if ($path -eq $FiveColPath) {
    if (-not ($rows | Where-Object { $_.Outfitter -eq 'Next Level Outfitters' })) {
      $rows += [pscustomobject]@{
        Outfitter = 'Next Level Outfitters'
        'Primary Owner' = ''
        'Secondary Contact' = ''
        'USFS Permits' = ''
        'BLM Permits' = $cedarNew
      }
      $report.Add([pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = 'Next Level Outfitters'
        Action = 'Added provisional CCFO row'
      })
    }
  }

  if ($path -eq $SlimPermitsPath) {
    if (-not ($rows | Where-Object { $_.'Outfitter/Owner' -eq 'Next Level Outfitters' })) {
      $rows += [pscustomobject]@{
        'Outfitter/Owner' = 'Next Level Outfitters'
        'USFS Permits' = ''
        'BLM Permits' = $cedarNew
      }
      $report.Add([pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = 'Next Level Outfitters'
        Action = 'Added provisional CCFO row'
      })
    }
  }

  $rows | Export-Csv -Path $path -NoTypeInformation -Encoding UTF8
  return $report
}

$report = @()
$report += Update-JsonFile $MasterPath
$report += Update-JsonFile $PublicPath
$report += Update-CsvFile $ReviewPath
$report += Update-CsvFile $SlimReviewPath
$report += Update-CsvFile $FiveColPath
$report += Update-CsvFile $SlimPermitsPath

$report | Export-Csv -Path $ReportPath -NoTypeInformation -Encoding UTF8
$report
