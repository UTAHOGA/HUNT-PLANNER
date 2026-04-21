$ErrorActionPreference = 'Stop'

$workspaceRoot = 'C:\DOWNLOADS\test website\HUNT-PLANNER'
$uogaRoot = 'C:\UOGA HUNTS'
$outputDir = Join-Path $workspaceRoot 'data\uoga_bg_draw_layers'
$pdfDeclaredSourcePath = Join-Path $uogaRoot 'raw_data 2025\25_bg-odds.pdf'
$xlsxSurrogatePath = Join-Path $workspaceRoot 'data\25_bg-odds.xlsx'

$layer1ManifestPath = Join-Path $outputDir 'layer_01_source_manifest_2025_bg_draw.json'
$layer2PdfRawTextPath = Join-Path $outputDir 'layer_02_bg_draw_pdf_raw_text_2025.txt'
$layer3AvailableSummaryCsvPath = Join-Path $outputDir 'layer_03_bg_draw_available_summary_2025.csv'
$layer4StatusPath = Join-Path $outputDir 'draw_breakdown_2025.status.json'

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

function Read-WorksheetRows {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    [xml]$sharedXml = Read-ZipXmlText -Zip $zip -EntryName 'xl/sharedStrings.xml'
    [xml]$sheetXml = Read-ZipXmlText -Zip $zip -EntryName 'xl/worksheets/sheet1.xml'
    $sharedStrings = Get-SharedStrings -SharedXml $sharedXml
    $rows = @()

    foreach ($row in @($sheetXml.worksheet.sheetData.row)) {
      $cells = @{}
      foreach ($cell in @($row.c)) {
        $column = Get-CellColumnName -CellRef $cell.r
        $rawValue = Get-XmlChildText -Node $cell -LocalName 'v'
        $value = ''
        if ($cell.t -eq 's') {
          if ($rawValue -ne $null -and $rawValue -ne '') {
            $index = [int]$rawValue
            if ($index -ge 0 -and $index -lt $sharedStrings.Count) {
              $value = $sharedStrings[$index]
            }
          }
        } elseif ($rawValue) {
          $value = $rawValue
        }
        if ($value -ne '') {
          $cells[$column] = $value
        }
      }
      $rows += [pscustomobject]@{
        RowNumber = [int]$row.r
        Cells = $cells
      }
    }

    return $rows
  } finally {
    $zip.Dispose()
  }
}

function Convert-ToNullableInt {
  param([string]$Value)
  if ($null -eq $Value) { return $null }
  $clean = ($Value -replace '[^0-9-]', '').Trim()
  if ($clean -eq '') { return $null }
  return [int]$clean
}

function Convert-RatioToOddsPct {
  param([string]$RatioText)
  if (-not $RatioText) { return $null }
  if ($RatioText -eq 'N/A') { return 0.0 }
  if ($RatioText -match '1 in ([0-9]+(?:\.[0-9]+)?)') {
    $denominator = [double]$Matches[1]
    if ($denominator -gt 0) {
      return [math]::Round(100.0 / $denominator, 4)
    }
  }
  return $null
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
  source_family = 'bonus_draw_probability'
  declared_source_pdf = $pdfDeclaredSourcePath
  extraction_surrogate = $xlsxSurrogatePath
  extraction_note = 'Raw source PDF declared by UOGA task. Matching workbook retained only as an exploratory summary artifact and is not valid for hunt-level draw_breakdown output.'
  source_validity = 'valid_hunt_level_pdf'
  hunt_level_data_in_pdf = $true
  current_environment_state = 'plain_hunt_detail_page_text_not_available_in_current_sandbox'
  preferred_extraction_path = 'tool_assisted_pdf_text_extraction'
  preferred_tools = @('python+pypdf', 'python+pdfplumber', 'python+pymupdf')
  fallback_extraction_path = 'user_pasted_hunt_sections'
  target_grain = 'hunt_code x residency x point_level'
  generated_at = (Get-Date).ToString('s')
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content $layer1ManifestPath

$pdfRawText = Get-PdfAsciiDump -Path $pdfDeclaredSourcePath
$pdfRawText | Set-Content $layer2PdfRawTextPath

$rows = Read-WorksheetRows -Path $xlsxSurrogatePath
$sectionStarts = $rows | Where-Object {
  [string]$_.Cells['A'] -like '2025 Draw 5, Big Game Draw Results*'
}

$availableSummaryRows = foreach ($section in $sectionStarts) {
  $title = [string]$section.Cells['A']
  $speciesLabel = ''
  if ($title -match 'Species:\s*(.+?)\s*-\s*All Applicants') {
    $speciesLabel = $Matches[1].Trim()
  } else {
    $speciesLabel = $title.Trim()
  }

  $dataRows = $rows | Where-Object {
    $_.RowNumber -gt ($section.RowNumber + 3) -and $_.RowNumber -lt ($section.RowNumber + 38)
  }

  foreach ($row in $dataRows) {
    $leftPoints = [string]$row.Cells['A']
    $rightPoints = [string]$row.Cells['V']
    $isTotalsRow = ($leftPoints -eq 'Totals' -or $rightPoints -eq 'Totals')

    foreach ($side in @(
      @{
        residency = 'Nonresident'
        point_level = $leftPoints
        applicants = [string]$row.Cells['F']
        bonus_permits = [string]$row.Cells['I']
        random_permits = [string]$row.Cells['L']
        total_permits = [string]$row.Cells['O']
        success_ratio_text = [string]$row.Cells['R']
      },
      @{
        residency = 'Resident'
        point_level = $rightPoints
        applicants = [string]$row.Cells['Z']
        bonus_permits = [string]$row.Cells['AB']
        random_permits = [string]$row.Cells['AE']
        total_permits = [string]$row.Cells['AH']
        success_ratio_text = [string]$row.Cells['AK']
      }
    )) {
      if (-not $side.point_level) { continue }

      [pscustomobject]@{
        report_scope = 'species_all_applicants_summary'
        draw_year = 2025
        species = $speciesLabel
        residency = $side.residency
        point_level = $side.point_level
        applicants = Convert-ToNullableInt $side.applicants
        bonus_permits = Convert-ToNullableInt $side.bonus_permits
        random_permits = Convert-ToNullableInt $side.random_permits
        total_permits = Convert-ToNullableInt $side.total_permits
        success_ratio_text = if ($side.success_ratio_text) { $side.success_ratio_text } else { $null }
        success_probability = Convert-RatioToOddsPct $side.success_ratio_text
        is_totals_row = $isTotalsRow
        source_row_number = $row.RowNumber
      }
    }
  }
}

$availableSummaryRows | Export-Csv -NoTypeInformation -Path $layer3AvailableSummaryCsvPath

$hasHuntLevelKeys = $false
$status = [pscustomobject]@{
  table = 'draw_breakdown'
  draw_year = 2025
  target_grain = 'hunt_code x residency x point_level'
  source_pdf = $pdfDeclaredSourcePath
  source_validity = 'valid'
  hunt_level_data_in_pdf = $true
  extraction_surrogate = $xlsxSurrogatePath
  extraction_surrogate_role = 'exploratory_summary_only_not_valid_for_draw_breakdown'
  available_rows = @($availableSummaryRows).Count
  titled_sections = @($sectionStarts).Count
  status = if ($hasHuntLevelKeys) { 'ready' } else { 'blocked_by_environment_tooling' }
  current_powershell_pdf_object_path = 'unsuccessful_for_production_use'
  reason = if ($hasHuntLevelKeys) {
    'Hunt-code-level draw rows are available.'
  } else {
    'The source PDF is valid and contains hunt-level draw tables, but the current environment only produced species-level summary extraction and does not yet provide plain hunt-detail page text suitable for production normalization.'
  }
  next_step = if ($hasHuntLevelKeys) {
    'normalize_hunt_level_rows'
  } else {
    'switch_to_tool_assisted_pdf_text_extraction'
  }
  preferred_tools = if ($hasHuntLevelKeys) {
    @()
  } else {
    @('python+pypdf', 'python+pdfplumber', 'python+pymupdf')
  }
  fallback_option = if ($hasHuntLevelKeys) {
    $null
  } else {
    'user_pasted_hunt_sections'
  }
}
$status | ConvertTo-Json -Depth 6 | Set-Content $layer4StatusPath
$status | ConvertTo-Json -Depth 6
