$ErrorActionPreference = 'Stop'

$workspaceRoot = 'C:\DOWNLOADS\test website\HUNT-PLANNER'
$uogaRoot = 'C:\UOGA HUNTS'
$outputDir = Join-Path $workspaceRoot 'data\uoga_harvest_layers'
$xlsxSurrogatePath = Join-Path $workspaceRoot 'data\2026-03-06-2025-preliminary-bg-harvest.xlsx'
$pdfDeclaredSourcePath = Join-Path $uogaRoot 'raw_data 2025\2026-03-06-2025-preliminary-bg-harvest.pdf'

$layer1ManifestPath = Join-Path $outputDir 'layer_01_source_manifest_2025_harvest.json'
$layer2PdfRawTextPath = Join-Path $outputDir 'layer_02_harvest_pdf_raw_text_2025.txt'
$layer3RawCsvPath = Join-Path $outputDir 'layer_03_harvest_raw_source_values_2025.csv'
$layer4FinalCsvPath = Join-Path $outputDir 'harvest_2025.csv'
$layer4ValidationPath = Join-Path $outputDir 'harvest_2025.validation.json'

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
    if (-not $rows.Count) { return @() }

    $parsedRows = foreach ($row in $rows) {
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
      [pscustomobject]@{
        source_row_number = [int]$row.r
        Cells = $cells
      }
    }

    $headerRow = $parsedRows[0]
    $columns = $headerRow.Cells.Keys | Sort-Object { Convert-ColumnLettersToIndex $_ }
    $headers = @{}
    foreach ($column in $columns) {
      $raw = [string]$headerRow.Cells[$column]
      $clean = ($raw -replace '\s+', ' ').Trim()
      if (-not $clean) { $clean = $column }
      $headers[$column] = $clean
    }

    $records = foreach ($row in ($parsedRows | Select-Object -Skip 1)) {
      $record = [ordered]@{ source_row_number = $row.source_row_number }
      foreach ($column in $columns) {
        $header = $headers[$column]
        $record[$header] = [string]($row.Cells[$column] ?? '')
      }
      $huntCode = [string]$record['Hunt #']
      if ($huntCode -and $huntCode -match '^[A-Z]{2}\d{4}$') {
        [pscustomobject]$record
      }
    }

    return @($records)
  }
  finally {
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

function Get-PdfAsciiDump {
  param([string]$Path)

  $bytes = [System.IO.File]::ReadAllBytes($Path)
  return [System.Text.Encoding]::ASCII.GetString($bytes)
}

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$manifest = [pscustomobject]@{
  source_family = 'harvest_performance'
  declared_source_pdf = $pdfDeclaredSourcePath
  extraction_surrogate = $xlsxSurrogatePath
  extraction_note = 'Raw source PDF declared by UOGA task. Matching workbook used only to preserve table values because no local PDF extractor is available in the current workspace.'
  grain = 'one row per hunt_code'
  rules_applied = @(
    'preserve hunt_code exactly as published',
    'do not merge rows by hunt name',
    'treat weapon as part of hunt identity',
    'derive access_type only from hunt_type/source text',
    'if hunt_type indicates CWMU then access_type = CWMU else Public',
    'preserve raw source values before normalization'
  )
  generated_at = (Get-Date).ToString('s')
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content $layer1ManifestPath

$pdfRawText = Get-PdfAsciiDump -Path $pdfDeclaredSourcePath
$pdfRawText | Set-Content $layer2PdfRawTextPath

$rawRows = Read-HarvestWorkbook -Path $xlsxSurrogatePath | ForEach-Object {
  [pscustomobject]@{
    source_row_number = [int]$_.source_row_number
    raw_hunt_code = [string]$_.'Hunt #'
    raw_species = [string]$_.Species
    raw_hunt_name = [string]$_.'Hunt Name'
    raw_hunt_type = [string]$_.'Hunt Type'
    raw_weapon = [string]$_.Weapon
    raw_sex_type = [string]$_.'Sex Type'
    raw_permits_total = [string]$_.'Permit s'
    raw_hunters = [string]$_.'Hunter s'
    raw_harvest = [string]$_.'Harves t'
    raw_percent_success = [string]$_.'Percent success'
    raw_avg_days = [string]$_.'Averag e Days'
    raw_satisfaction = [string]$_.'Satisfactio n'
  }
}
$rawRows | Export-Csv -NoTypeInformation -Path $layer3RawCsvPath

$finalRows = $rawRows | ForEach-Object {
  [pscustomobject]@{
    hunt_code = $_.raw_hunt_code
    species = $_.raw_species
    hunt_name = $_.raw_hunt_name
    hunt_type = $_.raw_hunt_type
    weapon = $_.raw_weapon
    sex_type = $_.raw_sex_type
    permits_total = Convert-ToNullableInt $_.raw_permits_total
    hunters = Convert-ToNullableInt $_.raw_hunters
    harvest = Convert-ToNullableInt $_.raw_harvest
    percent_success = Convert-ToNullableDouble $_.raw_percent_success
    avg_days = Convert-ToNullableDouble $_.raw_avg_days
    satisfaction = Convert-ToNullableDouble $_.raw_satisfaction
    access_type = if ([string]$_.raw_hunt_type -match 'CWMU') { 'CWMU' } else { 'Public' }
  }
}

$duplicates = @($finalRows | Group-Object hunt_code | Where-Object { $_.Count -gt 1 })
if ($duplicates.Count -gt 0) {
  throw "Duplicate hunt_code rows detected. First duplicate: $($duplicates[0].Name)"
}

$validation = [pscustomobject]@{
  total_rows = @($finalRows).Count
  distinct_hunt_codes = @($finalRows | Select-Object -ExpandProperty hunt_code -Unique).Count
  duplicate_hunt_codes = @($duplicates | ForEach-Object { $_.Name })
  missing_hunt_codes = @($finalRows | Where-Object { [string]::IsNullOrWhiteSpace($_.hunt_code) }).Count
  null_numeric_counts = [pscustomobject]@{
    permits_total = @($finalRows | Where-Object { $_.permits_total -eq $null }).Count
    hunters = @($finalRows | Where-Object { $_.hunters -eq $null }).Count
    harvest = @($finalRows | Where-Object { $_.harvest -eq $null }).Count
    percent_success = @($finalRows | Where-Object { $_.percent_success -eq $null }).Count
  }
  access_breakdown = $finalRows | Group-Object access_type | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{
      access_type = $_.Name
      rows = $_.Count
    }
  }
  required_fields = @(
    'hunt_code',
    'species',
    'hunt_name',
    'hunt_type',
    'weapon',
    'sex_type',
    'permits_total',
    'hunters',
    'harvest',
    'percent_success',
    'avg_days',
    'satisfaction',
    'access_type'
  )
}

$finalRows | Export-Csv -NoTypeInformation -Path $layer4FinalCsvPath
$validation | ConvertTo-Json -Depth 6 | Set-Content $layer4ValidationPath
$validation | ConvertTo-Json -Depth 6
