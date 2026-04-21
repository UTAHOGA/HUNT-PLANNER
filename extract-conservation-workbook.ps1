$WorkbookPath = 'C:\UOGA HUNTS\HUNT-PLANNER\raw_data_2026\2025-27_conservation_permits (2).xlsx'
$OutputJson = 'C:\DOCUMENTS\GitHub\HUNT-PLANNER\data\conservation-permit-workbook-2025-27-raw.json'
$OutputCsv = 'C:\DOCUMENTS\GitHub\HUNT-PLANNER\data\conservation-permit-workbook-2025-27-raw.csv'
$OutputSummary = 'C:\DOCUMENTS\GitHub\HUNT-PLANNER\data\conservation-permit-workbook-2025-27-summary.json'

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-WorkbookRows {
  param(
    [string]$Path
  )

  $zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
  try {
    $shared = @()
    $sharedEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
    if ($sharedEntry) {
      $reader = New-Object System.IO.StreamReader($sharedEntry.Open())
      try { [xml]$sharedXml = $reader.ReadToEnd() } finally { $reader.Close() }
      foreach ($si in $sharedXml.sst.si) {
        if ($si.t) {
          $shared += [string]$si.t
        } elseif ($si.r) {
          $shared += (($si.r | ForEach-Object { $_.t.'#text' }) -join '')
        } else {
          $shared += ''
        }
      }
    }

    $sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet1.xml' }
    $reader = New-Object System.IO.StreamReader($sheetEntry.Open())
    try { [xml]$sheetXml = $reader.ReadToEnd() } finally { $reader.Close() }

    $rows = @()
    foreach ($row in @($sheetXml.worksheet.sheetData.row)) {
      $values = @()
      foreach ($cell in @($row.c)) {
        $value = ''
        if ($cell.t -eq 's' -and $cell.v) {
          $idx = [int]$cell.v
          if ($idx -ge 0 -and $idx -lt $shared.Count) {
            $value = $shared[$idx]
          }
        } elseif ($cell.v) {
          $value = [string]$cell.v
        } elseif ($cell.is -and $cell.is.t) {
          $value = [string]$cell.is.t
        }
        $values += $value
      }

      if ($values.Count -ge 7 -and $values[0] -match '^\d+$') {
        $rows += [pscustomobject]@{
          row_number    = [int]$values[0]
          species       = $values[1]
          area          = $values[2]
          condition     = $values[3]
          average_value = [decimal]$values[4]
          source_row    = [int]$values[5]
          organization  = $values[6]
          hunt_class    = $values[6]
        }
      }
    }

    return $rows
  }
  finally {
    $zip.Dispose()
  }
}

$rows = Get-WorkbookRows -Path $WorkbookPath

$rows | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $OutputJson -Encoding UTF8
$rows | Export-Csv -LiteralPath $OutputCsv -NoTypeInformation -Encoding UTF8

$summary = [pscustomobject]@{
  source_file = $WorkbookPath
  extracted_at = (Get-Date).ToString('s')
  row_count = $rows.Count
  species_counts = @(
    $rows |
      Group-Object species |
      Sort-Object Name |
      ForEach-Object {
        [pscustomobject]@{
          species = $_.Name
          count = $_.Count
        }
      }
  )
  organization_counts = @(
    $rows |
      Group-Object organization |
      Sort-Object Name |
      ForEach-Object {
        [pscustomobject]@{
          organization = $_.Name
          count = $_.Count
        }
      }
  )
}

$summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputSummary -Encoding UTF8

Write-Output "Extracted $($rows.Count) workbook rows."
Write-Output $OutputJson
Write-Output $OutputCsv
Write-Output $OutputSummary
