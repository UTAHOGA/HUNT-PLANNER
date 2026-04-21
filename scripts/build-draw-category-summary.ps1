$ErrorActionPreference = 'Stop'

$dataDir = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data'
$canonicalResearchDir = Join-Path $dataDir 'canonical\research'
$oddsWorkbookPath = Join-Path $dataDir '25_bg-odds.xlsx'
$outJson = Join-Path $canonicalResearchDir 'draw_category_summary_2025_all_applicants.json'
$outCsv = Join-Path $canonicalResearchDir 'draw_category_summary_2025_all_applicants.csv'
$outSummaryJson = Join-Path $canonicalResearchDir 'draw_category_summary_2025_all_applicants.summary.json'
$outStatusJson = Join-Path $canonicalResearchDir 'draw_hunt_detail_2025.status.json'

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

if (-not (Test-Path $canonicalResearchDir)) {
  New-Item -ItemType Directory -Path $canonicalResearchDir -Force | Out-Null
}

$rows = Read-WorksheetRows -Path $oddsWorkbookPath
$sectionStarts = $rows | Where-Object {
  [string]$_.Cells['A'] -like '2025 Draw 5, Big Game Draw Results*'
}

$records = foreach ($section in $sectionStarts) {
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
        Residency = 'nonresident'
        PointLevel = $leftPoints
        Applicants = [string]$row.Cells['F']
        BonusPermits = [string]$row.Cells['I']
        RegularPermits = [string]$row.Cells['L']
        TotalPermits = [string]$row.Cells['O']
        Ratio = [string]$row.Cells['R']
      },
      @{
        Residency = 'resident'
        PointLevel = $rightPoints
        Applicants = [string]$row.Cells['Z']
        BonusPermits = [string]$row.Cells['AB']
        RegularPermits = [string]$row.Cells['AE']
        TotalPermits = [string]$row.Cells['AH']
        Ratio = [string]$row.Cells['AK']
      }
    )) {
      if (-not $side.PointLevel) { continue }

      [pscustomobject]@{
        drawYear = 2025
        reportCategory = $speciesLabel
        reportVariant = 'All Applicants'
        species = $speciesLabel
        residency = $side.Residency
        pointLevel = $side.PointLevel
        isTotalsRow = $isTotalsRow
        applicants = Convert-ToNullableInt $side.Applicants
        bonusPermits = Convert-ToNullableInt $side.BonusPermits
        regularPermits = Convert-ToNullableInt $side.RegularPermits
        totalPermits = Convert-ToNullableInt $side.TotalPermits
        publishedRatioText = if ($side.Ratio) { $side.Ratio } else { $null }
        publishedOddsPct = Convert-RatioToOddsPct $side.Ratio
        sourceFile = [System.IO.Path]::GetFileName($oddsWorkbookPath)
        sourceSheet = 'Table 1'
        sourceSectionRow = $section.RowNumber
        sourceRowNumber = $row.RowNumber
        sourceType = 'draw_odds'
        sourceStage = 'published'
      }
    }
  }
}

$records | ConvertTo-Json -Depth 5 | Set-Content $outJson
$records | Export-Csv -NoTypeInformation -Path $outCsv

$summary = [pscustomobject]@{
  records = $records.Count
  titledSections = $sectionStarts.Count
  speciesBreakdown = $records |
    Where-Object { -not $_.isTotalsRow } |
    Group-Object reportCategory, residency |
    ForEach-Object {
      [pscustomobject]@{
        reportCategory = $_.Group[0].reportCategory
        residency = $_.Group[0].residency
        rows = $_.Count
      }
    }
}
$summary | ConvertTo-Json -Depth 5 | Set-Content $outSummaryJson

$drawHuntStatus = [pscustomobject]@{
  drawYear = 2025
  table = 'draw_hunt_detail'
  status = 'blocked'
  reason = '25_bg-odds.xlsx contains species-level All Applicants point-bucket summaries, not hunt-code-level detail.'
  availableSourceUsed = [System.IO.Path]::GetFileName($oddsWorkbookPath)
  nextNeededSource = 'hunt-code-level draw report or structured hunt-level draw table'
}
$drawHuntStatus | ConvertTo-Json -Depth 4 | Set-Content $outStatusJson

$summary | ConvertTo-Json -Depth 5
