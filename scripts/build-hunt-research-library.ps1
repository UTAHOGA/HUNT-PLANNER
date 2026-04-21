$ErrorActionPreference = 'Stop'

$dataDir = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data'
$canonicalResearchDir = Join-Path $dataDir 'canonical\research'
$harvestWorkbookPath = Join-Path $dataDir '2026-03-06-2025-preliminary-bg-harvest.xlsx'
$canonicalPath = Join-Path $dataDir 'hunt-master-canonical.json'
$outHarvestJson = Join-Path $dataDir 'hunt-research-harvest-2025-normalized.json'
$outHarvestCsv = Join-Path $dataDir 'hunt-research-harvest-2025-normalized.csv'
$outLibraryJson = Join-Path $dataDir 'hunt-research-library.json'
$outLibraryCsv = Join-Path $dataDir 'hunt-research-library.csv'
$outSummaryJson = Join-Path $dataDir 'hunt-research-library-summary.json'
$outManifestJson = Join-Path $dataDir 'hunt-research-library-manifest.json'
$outHarvestDetailJson = Join-Path $canonicalResearchDir 'harvest_hunt_detail_2025_preliminary.json'
$outHarvestDetailCsv = Join-Path $canonicalResearchDir 'harvest_hunt_detail_2025_preliminary.csv'
$outAllHuntsJson = Join-Path $canonicalResearchDir 'all_hunts_2025_preliminary_harvest_only.json'
$outAllHuntsCsv = Join-Path $canonicalResearchDir 'all_hunts_2025_preliminary_harvest_only.csv'
$outPublicHuntsJson = Join-Path $canonicalResearchDir 'public_hunts_2025_preliminary_harvest_only.json'
$outPublicHuntsCsv = Join-Path $canonicalResearchDir 'public_hunts_2025_preliminary_harvest_only.csv'
$outCwmuHuntsJson = Join-Path $canonicalResearchDir 'cwmu_hunts_2025_preliminary_harvest_only.json'
$outCwmuHuntsCsv = Join-Path $canonicalResearchDir 'cwmu_hunts_2025_preliminary_harvest_only.csv'
$outGeneralSeasonJson = Join-Path $canonicalResearchDir 'general_season_hunts_2025_preliminary.json'
$outGeneralSeasonCsv = Join-Path $canonicalResearchDir 'general_season_hunts_2025_preliminary.csv'
$outHuntClassificationJson = Join-Path $canonicalResearchDir 'hunt_classification_2025_preliminary.json'
$outHuntClassificationCsv = Join-Path $canonicalResearchDir 'hunt_classification_2025_preliminary.csv'

function Convert-ColumnLettersToIndex {
  param([string]$Letters)
  $value = 0
  foreach ($char in $Letters.ToCharArray()) {
    $value = ($value * 26) + ([int][char]::ToUpperInvariant($char) - [int][char]'A' + 1)
  }
  return $value
}

function Get-CellColumnName {
  param([string]$CellRef)
  if ($CellRef -match '^[A-Z]+') { return $Matches[0] }
  return ''
}

function Read-ZipXmlText {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$EntryName
  )
  $entry = $Zip.GetEntry($EntryName)
  if (-not $entry) { return $null }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Close() }
}

function Get-SharedStrings {
  param([xml]$SharedXml)
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($si in $SharedXml.sst.si) {
    if ($si.r) {
      $parts = foreach ($run in @($si.r)) {
        $textNode = @($run.ChildNodes | Where-Object { $_.LocalName -eq 't' } | Select-Object -First 1)
        if ($textNode) { [string]$textNode[0].InnerText } else { '' }
      }
      $list.Add(($parts -join ''))
      continue
    }
    if ($si.t) {
      $list.Add([string]$si.t.InnerText)
      continue
    }
    $list.Add('')
  }
  return $list
}

function Get-XmlChildText {
  param(
    [System.Xml.XmlNode]$Node,
    [string]$LocalName
  )

  if (-not $Node) { return $null }
  $child = @($Node.ChildNodes | Where-Object { $_.LocalName -eq $LocalName } | Select-Object -First 1)
  if (-not $child) { return $null }
  return [string]$child[0].InnerText
}

function Read-HarvestWorkbook {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    [xml]$sharedXml = Read-ZipXmlText -Zip $zip -EntryName 'xl/sharedStrings.xml'
    [xml]$sheetXml = Read-ZipXmlText -Zip $zip -EntryName 'xl/worksheets/sheet1.xml'

    $sharedStrings = Get-SharedStrings -SharedXml $sharedXml
    $rows = @($sheetXml.worksheet.sheetData.row)

    $parsedRows = @()
    foreach ($row in $rows) {
      $cells = @{}
      foreach ($cell in @($row.c)) {
        $column = Get-CellColumnName -CellRef $cell.r
        $value = ''
        $sharedIndexText = Get-XmlChildText -Node $cell -LocalName 'v'
        if ($cell.t -eq 's') {
          $index = [int]$sharedIndexText
          if ($index -ge 0 -and $index -lt $sharedStrings.Count) {
            $value = $sharedStrings[$index]
          }
        } elseif ($sharedIndexText) {
          $value = $sharedIndexText
        } elseif (Get-XmlChildText -Node $cell -LocalName 'is') {
          $inlineNode = @($cell.ChildNodes | Where-Object { $_.LocalName -eq 'is' } | Select-Object -First 1)
          $inlineText = Get-XmlChildText -Node $inlineNode[0] -LocalName 't'
          if ($inlineText) { $value = $inlineText }
        }
        $cells[$column] = $value
      }
      $parsedRows += [pscustomobject]@{
        RowNumber = [int]$row.r
        Cells = $cells
      }
    }

    if (-not $parsedRows.Count) { return @() }

    $headerRow = $parsedRows[0]
    $columns = $headerRow.Cells.Keys | Sort-Object { Convert-ColumnLettersToIndex $_ }
    $headers = @{}
    foreach ($column in $columns) {
      $raw = [string]$headerRow.Cells[$column]
      $clean = ($raw -replace '\s+', ' ').Trim()
      if (-not $clean) { $clean = $column }
      $headers[$column] = $clean
    }

    $records = @()
    foreach ($row in ($parsedRows | Select-Object -Skip 1)) {
      $record = [ordered]@{
        sourceSheet = 'Table 1'
        sourceRowNumber = $row.RowNumber
      }
      foreach ($column in $columns) {
        $header = $headers[$column]
        $record[$header] = [string]($row.Cells[$column] ?? '')
      }
      $huntNumber = [string]$record['Hunt #']
      if ($huntNumber -and $huntNumber -ne 'Hunt #' -and $huntNumber -match '^[A-Z]{2}\d{4}$') {
        $records += [pscustomobject]$record
      }
    }

    return $records
  } finally {
    $zip.Dispose()
  }
}

function Convert-ToNullableInt {
  param([string]$Value)
  $clean = ($Value -replace '[^0-9-]', '').Trim()
  if ($clean -eq '') { return $null }
  return [int]$clean
}

function Convert-ToNullableDouble {
  param([string]$Value)
  $clean = ($Value -replace '[^0-9\.-]', '').Trim()
  if ($clean -eq '') { return $null }
  return [double]$clean
}

function Get-OfficialTableFiles {
  param([string]$DirectoryPath)
  return Get-ChildItem $DirectoryPath -File | Where-Object { $_.Name -like '*_hunt_table_official.json' }
}

function Get-HuntAccessType {
  param([string]$HuntType)

  if ($HuntType -match '^CWMU') { return 'CWMU' }
  return 'Public'
}

function Get-SourceModelLayer {
  param([string]$HuntType)

  if ($HuntType -match 'Antlerless') { return 'antlerless_draw_breakdown' }

  switch -Regex ($HuntType) {
    '^General Season' { return 'general_season_hunts' }
    '^Private Lands Only$' { return 'general_season_hunts' }
    '^Sportsman$' { return 'general_season_hunts' }
    '^Conservation$' { return 'general_season_hunts' }
    '^General Season Landowner$' { return 'general_season_hunts' }
    '^Limited Entry Landowner$' { return 'general_season_hunts' }
    '^OIAL$' { return 'draw_breakdown' }
    default { return 'draw_breakdown' }
  }
}

function Get-DrawSystem {
  param(
    [string]$HuntType,
    [string]$SourceModelLayer
  )

  if ($HuntType -eq 'Sportsman' -or $HuntType -eq 'Conservation') { return 'sportsman' }
  if ($SourceModelLayer -eq 'antlerless_draw_breakdown') { return 'preference' }
  if ($SourceModelLayer -eq 'general_season_hunts') { return 'none' }
  return 'bonus'
}

function Get-OpportunityType {
  param([string]$HuntType)

  switch -Regex ($HuntType) {
    '^General Season Any Bull$' { return 'OTC' }
    '^General Season Spike Bull$' { return 'OTC' }
    '^General Season Youth Any Bull$' { return 'OTC' }
    '^General Season$' { return 'General Season' }
    '^General Season Landowner$' { return 'Quota' }
    '^Private Lands Only$' { return 'Quota' }
    '^Antlerless Elk Control$' { return 'Quota' }
    '^Sportsman$' { return 'Quota' }
    '^Conservation$' { return 'Quota' }
    default { return $null }
  }
}

function Get-GeneralSeasonOpportunityType {
  param(
    [string]$HuntType,
    [string]$HuntName,
    [string]$Weapon
  )

  $huntTypeText = ([string]$HuntType).Trim()
  $huntNameText = ([string]$HuntName).Trim()
  $weaponText = ([string]$Weapon).Trim()

  if ($huntTypeText -match '^(Sportsman|Conservation)$') { return 'unknown' }
  if ($huntTypeText -match 'Dedicated Hunter') { return 'general_season_dedicated_hunter' }
  if ($huntTypeText -match 'Landowner') { return 'general_season_landowner' }
  if ($huntTypeText -match 'CWMU' -or $huntNameText -match 'CWMU' -or $huntTypeText -eq 'Private Lands Only') { return 'general_season_private' }
  if ($huntTypeText -match 'Early' -or $huntNameText -match 'Early' -or $weaponText -match 'Early') { return 'general_season_early' }
  return 'general_season_public'
}

function Get-GeneralSeasonAccessType {
  param(
    [string]$HuntType,
    [string]$HuntName
  )

  $huntTypeText = ([string]$HuntType).Trim()
  $huntNameText = ([string]$HuntName).Trim()

  if ($huntTypeText -match 'CWMU' -or $huntNameText -match 'CWMU') { return 'CWMU' }
  if ($huntTypeText -match 'Landowner') { return 'Landowner' }
  if ($huntTypeText -eq 'Private Lands Only') { return 'Private' }
  return 'Public'
}

function Get-GeneralSeasonModelingFamily {
  param(
    [string]$HuntType,
    [string]$AccessType,
    [string]$OpportunityType
  )

  $huntTypeText = ([string]$HuntType).Trim()

  if ($huntTypeText -match '^(Sportsman|Conservation)$') { return 'excluded_special_program' }
  if ($AccessType -eq 'CWMU' -or $AccessType -eq 'Private') { return 'excluded_private' }
  if ($AccessType -eq 'Landowner') { return 'excluded_landowner' }
  if ($OpportunityType -eq 'general_season_dedicated_hunter') { return 'excluded_special_program' }
  return 'pressure_access'
}

function Get-PublicBaselineFlag {
  param(
    [string]$OpportunityType,
    [string]$AccessType,
    [string]$ModelingFamily
  )

  return ($OpportunityType -eq 'general_season_public' -and $AccessType -eq 'Public' -and $ModelingFamily -eq 'pressure_access')
}

if (-not (Test-Path $canonicalResearchDir)) {
  New-Item -ItemType Directory -Path $canonicalResearchDir -Force | Out-Null
}

$harvestRows = Read-HarvestWorkbook -Path $harvestWorkbookPath
$canonicalRows = Get-Content $canonicalPath -Raw | ConvertFrom-Json
$canonicalByCode = @{}
foreach ($row in $canonicalRows) {
  if ($row.huntCode) { $canonicalByCode[[string]$row.huntCode] = $row }
}

$officialLookup = @{}
foreach ($file in (Get-OfficialTableFiles -DirectoryPath $dataDir)) {
  $json = Get-Content $file.FullName -Raw | ConvertFrom-Json
  foreach ($feature in ($json.features ?? @())) {
    $attr = $feature.attributes
    $huntNumber = [string]$attr.HUNT_NUMBER
    if (-not $huntNumber) { continue }
    if (-not $officialLookup.ContainsKey($huntNumber)) {
      $officialLookup[$huntNumber] = [ordered]@{
        tableFiles = New-Object System.Collections.Generic.HashSet[string]
        boundaryIds = New-Object System.Collections.Generic.HashSet[string]
        boundaryNames = New-Object System.Collections.Generic.HashSet[string]
        seasons = New-Object System.Collections.Generic.HashSet[string]
      }
    }
    $bucket = $officialLookup[$huntNumber]
    [void]$bucket.tableFiles.Add($file.Name)
    if ($attr.BOUNDARYID) { [void]$bucket.boundaryIds.Add([string]$attr.BOUNDARYID) }
    if ($attr.BOUNDARY_NAME) { [void]$bucket.boundaryNames.Add([string]$attr.BOUNDARY_NAME) }
    if ($attr.SEASON) { [void]$bucket.seasons.Add([string]$attr.SEASON) }
  }
}

$normalizedHarvest = foreach ($row in $harvestRows) {
  [pscustomobject]@{
    huntCode = [string]$row.'Hunt #'
    species = [string]$row.Species
    huntName = [string]$row.'Hunt Name'
    huntTypeWorkbook = [string]$row.'Hunt Type'
    weaponWorkbook = [string]$row.Weapon
    sexTypeWorkbook = [string]$row.'Sex Type'
    permits = Convert-ToNullableInt $row.'Permit s'
    hunters = Convert-ToNullableInt $row.'Hunter s'
    harvest = Convert-ToNullableInt $row.'Harves t'
    successPercent = Convert-ToNullableDouble $row.'Percent success'
    averageDays = Convert-ToNullableDouble $row.'Averag e Days'
    satisfaction = Convert-ToNullableDouble $row.'Satisfactio n'
    sourceWorkbook = [System.IO.Path]::GetFileName($harvestWorkbookPath)
    sourceSheet = [string]$row.sourceSheet
    sourceRowNumber = [int]$row.sourceRowNumber
    dataYear = 2025
    preliminary = $true
  }
}

$harvestHuntDetail = foreach ($harvest in $normalizedHarvest) {
  [pscustomobject]@{
    dataYear = 2025
    huntCode = $harvest.huntCode
    species = $harvest.species
    huntName = $harvest.huntName
    sourceHuntType = $harvest.huntTypeWorkbook
    sourceWeapon = $harvest.weaponWorkbook
    sourceSexType = $harvest.sexTypeWorkbook
    permits = $harvest.permits
    hunters = $harvest.hunters
    harvest = $harvest.harvest
    percentSuccess = $harvest.successPercent
    averageDays = $harvest.averageDays
    averageSatisfaction = $harvest.satisfaction
    sourceFile = $harvest.sourceWorkbook
    sourceSheet = $harvest.sourceSheet
    sourceRowNumber = $harvest.sourceRowNumber
    sourceType = 'harvest'
    sourceStage = 'preliminary'
  }
}

$allHuntsHarvestOnly = foreach ($harvest in $harvestHuntDetail) {
  $accessType = Get-HuntAccessType -HuntType ([string]$harvest.sourceHuntType)
  $sourceModelLayer = Get-SourceModelLayer -HuntType ([string]$harvest.sourceHuntType)
  $drawSystem = Get-DrawSystem -HuntType ([string]$harvest.sourceHuntType) -SourceModelLayer $sourceModelLayer
  $opportunityType = Get-OpportunityType -HuntType ([string]$harvest.sourceHuntType)
  $pressureIndex = $null
  if ($harvest.permits -ne $null -and $harvest.permits -gt 0 -and $harvest.hunters -ne $null) {
    $pressureIndex = [math]::Round(($harvest.hunters / $harvest.permits), 4)
  }
  $harvestEfficiency = $null
  if ($harvest.hunters -ne $null -and $harvest.hunters -gt 0 -and $harvest.harvest -ne $null) {
    $harvestEfficiency = [math]::Round(($harvest.harvest / $harvest.hunters), 4)
  }

  [pscustomobject]@{
    hunt_code = $harvest.huntCode
    species = $harvest.species
    hunt_name = $harvest.huntName
    hunt_type = $harvest.sourceHuntType
    weapon = $harvest.sourceWeapon
    sex_type = $harvest.sourceSexType
    permits_total = $harvest.permits
    hunters = $harvest.hunters
    harvest = $harvest.harvest
    percent_success = $harvest.percentSuccess
    avg_days = $harvest.averageDays
    satisfaction = $harvest.averageSatisfaction
    access_type = $accessType
    source_model_layer = $sourceModelLayer
    draw_system = $drawSystem
    opportunity_type = $opportunityType
    pressure_index = $pressureIndex
    harvest_efficiency = $harvestEfficiency
    source_file = $harvest.sourceFile
    source_sheet = $harvest.sourceSheet
    source_row_number = $harvest.sourceRowNumber
    source_type = $harvest.sourceType
    source_stage = $harvest.sourceStage
  }
}

$publicHuntsHarvestOnly = @($allHuntsHarvestOnly | Where-Object { $_.access_type -eq 'Public' })
$cwmuHuntsHarvestOnly = @($allHuntsHarvestOnly | Where-Object { $_.access_type -eq 'CWMU' })
$generalSeasonHunts = @(
  $allHuntsHarvestOnly | Where-Object { $_.source_model_layer -eq 'general_season_hunts' } | ForEach-Object {
    $generalSeasonOpportunityType = Get-GeneralSeasonOpportunityType -HuntType ([string]$_.hunt_type) -HuntName ([string]$_.hunt_name) -Weapon ([string]$_.weapon)
    $generalSeasonAccessType = Get-GeneralSeasonAccessType -HuntType ([string]$_.hunt_type) -HuntName ([string]$_.hunt_name)
    $generalSeasonModelingFamily = Get-GeneralSeasonModelingFamily -HuntType ([string]$_.hunt_type) -AccessType $generalSeasonAccessType -OpportunityType $generalSeasonOpportunityType
    $publicBaselineFlag = Get-PublicBaselineFlag -OpportunityType $generalSeasonOpportunityType -AccessType $generalSeasonAccessType -ModelingFamily $generalSeasonModelingFamily

    [pscustomobject]@{
      hunt_code = $_.hunt_code
      species = $_.species
      hunt_name = $_.hunt_name
      hunt_type = $_.hunt_type
      weapon = $_.weapon
      sex_type = $_.sex_type
      permits_total = $_.permits_total
      hunters = $_.hunters
      harvest = $_.harvest
      percent_success = $_.percent_success
      avg_days = $_.avg_days
      satisfaction = $_.satisfaction
      access_type = $generalSeasonAccessType
      opportunity_type = $generalSeasonOpportunityType
      modeling_family = $generalSeasonModelingFamily
      pressure_index = $_.pressure_index
      harvest_efficiency = $_.harvest_efficiency
      public_baseline_flag = $publicBaselineFlag
      source_model_layer = $_.source_model_layer
      draw_system = $_.draw_system
      source_file = $_.source_file
      source_sheet = $_.source_sheet
      source_row_number = $_.source_row_number
      source_type = $_.source_type
      source_stage = $_.source_stage
    }
  }
)
$huntClassification = @(
  $allHuntsHarvestOnly | ForEach-Object {
    [pscustomobject]@{
      hunt_code = $_.hunt_code
      species = $_.species
      hunt_name = $_.hunt_name
      hunt_type = $_.hunt_type
      weapon = $_.weapon
      sex_type = $_.sex_type
      access_type = $_.access_type
      source_model_layer = $_.source_model_layer
      draw_system = $_.draw_system
      opportunity_type = $_.opportunity_type
    }
  }
)

$researchLibrary = foreach ($harvest in $normalizedHarvest) {
  $huntCode = [string]$harvest.huntCode
  $canonical = $canonicalByCode[$huntCode]
  $official = $officialLookup[$huntCode]

  [pscustomobject]@{
    huntCode = $huntCode
    dataYear = 2025
    preliminary = $true
    species = if ($canonical) { [string]$canonical.species } else { [string]$harvest.species }
    title = if ($canonical) { [string]$canonical.title } else { [string]$harvest.huntName }
    unitName = if ($canonical) { [string]$canonical.unitName } else { [string]$harvest.huntName }
    unitCode = if ($canonical) { [string]$canonical.unitCode } else { '' }
    sex = if ($canonical) { [string]$canonical.sex } else { [string]$harvest.sexTypeWorkbook }
    weapon = if ($canonical) { [string]$canonical.weapon } else { [string]$harvest.weaponWorkbook }
    huntType = if ($canonical) { [string]$canonical.huntType } else { [string]$harvest.huntTypeWorkbook }
    huntClass = if ($canonical) { [string]$canonical.huntClass } else { '' }
    huntCategory = if ($canonical) { [string]$canonical.huntCategory } else { '' }
    region = if ($canonical) { [string]$canonical.region } else { 'Utah' }
    seasonLabel = if ($canonical -and $canonical.seasonLabel) { [string]$canonical.seasonLabel } elseif ($official) { (($official.seasons | Sort-Object) -join ' | ') } else { '' }
    boundaryIds = if ($canonical) { @($canonical.boundaryIds) } elseif ($official) { @($official.boundaryIds | Sort-Object) } else { @() }
    boundaryNames = if ($canonical) { @($canonical.boundaryNames) } elseif ($official) { @($official.boundaryNames | Sort-Object) } else { @() }
    permits = $harvest.permits
    hunters = $harvest.hunters
    harvest = $harvest.harvest
    successPercent = $harvest.successPercent
    averageDays = $harvest.averageDays
    satisfaction = $harvest.satisfaction
    sourceWorkbook = $harvest.sourceWorkbook
    sourceSheet = $harvest.sourceSheet
    sourceRowNumber = $harvest.sourceRowNumber
    officialTableFiles = if ($official) { @($official.tableFiles | Sort-Object) } else { @() }
    canonicalMatched = [bool]$canonical
    officialTableMatched = [bool]$official
    plannerBoundaryLink = if ($canonical) { [string]$canonical.boundaryLink } else { "https://dwrapps.utah.gov/huntboundary/hbstart?HN=$huntCode" }
  }
}

$normalizedHarvest | ConvertTo-Json -Depth 5 | Set-Content $outHarvestJson
$normalizedHarvest | Export-Csv -NoTypeInformation -Path $outHarvestCsv
$harvestHuntDetail | ConvertTo-Json -Depth 5 | Set-Content $outHarvestDetailJson
$harvestHuntDetail | Export-Csv -NoTypeInformation -Path $outHarvestDetailCsv
$allHuntsHarvestOnly | ConvertTo-Json -Depth 5 | Set-Content $outAllHuntsJson
$allHuntsHarvestOnly | Export-Csv -NoTypeInformation -Path $outAllHuntsCsv
$publicHuntsHarvestOnly | ConvertTo-Json -Depth 5 | Set-Content $outPublicHuntsJson
$publicHuntsHarvestOnly | Export-Csv -NoTypeInformation -Path $outPublicHuntsCsv
$cwmuHuntsHarvestOnly | ConvertTo-Json -Depth 5 | Set-Content $outCwmuHuntsJson
$cwmuHuntsHarvestOnly | Export-Csv -NoTypeInformation -Path $outCwmuHuntsCsv
$generalSeasonHunts | ConvertTo-Json -Depth 5 | Set-Content $outGeneralSeasonJson
$generalSeasonHunts | Export-Csv -NoTypeInformation -Path $outGeneralSeasonCsv
$huntClassification | ConvertTo-Json -Depth 5 | Set-Content $outHuntClassificationJson
$huntClassification | Export-Csv -NoTypeInformation -Path $outHuntClassificationCsv
$researchLibrary | ConvertTo-Json -Depth 6 | Set-Content $outLibraryJson
$researchLibrary | Select-Object `
  huntCode, dataYear, preliminary, species, title, unitName, unitCode, sex, weapon, huntType, huntClass, huntCategory, region, seasonLabel, `
  permits, hunters, harvest, successPercent, averageDays, satisfaction, canonicalMatched, officialTableMatched, plannerBoundaryLink, `
  @{Name='boundaryIds';Expression={($_.boundaryIds -join ' | ')}}, `
  @{Name='boundaryNames';Expression={($_.boundaryNames -join ' | ')}}, `
  @{Name='officialTableFiles';Expression={($_.officialTableFiles -join ' | ')}} `
  | Export-Csv -NoTypeInformation -Path $outLibraryCsv

$summary = [pscustomobject]@{
  harvestRows = $normalizedHarvest.Count
  libraryRows = $researchLibrary.Count
  canonicalMatches = ($researchLibrary | Where-Object { $_.canonicalMatched }).Count
  officialTableMatches = ($researchLibrary | Where-Object { $_.officialTableMatched }).Count
  sourceModelLayerBreakdown = $allHuntsHarvestOnly | Group-Object source_model_layer | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ source_model_layer = $_.Name; rows = $_.Count }
  }
  drawSystemBreakdown = $allHuntsHarvestOnly | Group-Object draw_system | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ draw_system = $_.Name; rows = $_.Count }
  }
  speciesBreakdown = $researchLibrary | Group-Object species | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ species = $_.Name; rows = $_.Count }
  }
}
$summary | ConvertTo-Json -Depth 5 | Set-Content $outSummaryJson

$manifest = [pscustomobject]@{
  generatedAt = (Get-Date).ToString('s')
  inputs = @(
    [System.IO.Path]::GetFileName($harvestWorkbookPath),
    [System.IO.Path]::GetFileName($canonicalPath)
  ) + ((Get-OfficialTableFiles -DirectoryPath $dataDir).Name | Sort-Object)
  outputs = @(
    [System.IO.Path]::GetFileName($outHarvestJson),
    [System.IO.Path]::GetFileName($outHarvestCsv),
    [System.IO.Path]::GetFileName($outHarvestDetailJson),
    [System.IO.Path]::GetFileName($outHarvestDetailCsv),
    [System.IO.Path]::GetFileName($outAllHuntsJson),
    [System.IO.Path]::GetFileName($outAllHuntsCsv),
    [System.IO.Path]::GetFileName($outPublicHuntsJson),
    [System.IO.Path]::GetFileName($outPublicHuntsCsv),
    [System.IO.Path]::GetFileName($outCwmuHuntsJson),
    [System.IO.Path]::GetFileName($outCwmuHuntsCsv),
    [System.IO.Path]::GetFileName($outGeneralSeasonJson),
    [System.IO.Path]::GetFileName($outGeneralSeasonCsv),
    [System.IO.Path]::GetFileName($outHuntClassificationJson),
    [System.IO.Path]::GetFileName($outHuntClassificationCsv),
    [System.IO.Path]::GetFileName($outLibraryJson),
    [System.IO.Path]::GetFileName($outLibraryCsv),
    [System.IO.Path]::GetFileName($outSummaryJson)
  )
  notes = @(
    'Harvest workbook normalized from XLSX sheet data',
    'Dictionary-aligned harvest_hunt_detail export written to data/canonical/research',
    'Workbook-facing all_hunts, public_hunts, cwmu_hunts, and general_season_hunts harvest-only feeds written to data/canonical/research',
    'Hunt classification feed written with source_model_layer, draw_system, and opportunity_type',
    'Joined to canonical hunt master by huntCode',
    'Augmented with official table boundary and season data when available'
  )
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content $outManifestJson

$summary | ConvertTo-Json -Depth 5
