param(
  [string]$MasterPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$PublicPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$ReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$SlimReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$FiveColPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-5col-2026-03-27.csv",
  [string]$SlimPermitsPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-federal-permits-slim-2026-03-27.csv",
  [string]$ReportPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\cedar-city-blm-normalize-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$old = 'Cedar City'
$new = 'Color Country District (Cedar City Field Office)'

function Normalize-List($value) {
  if ($null -eq $value) { return @() }
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    return @($value | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() })
  }
  $text = [string]$value
  if (-not $text.Trim()) { return @() }
  return @($text -split '\s*\|\s*' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}

function Replace-ListValue($list) {
  $changed = $false
  $result = @()
  foreach ($item in (Normalize-List $list)) {
    if ($item -eq $old) {
      $result += $new
      $changed = $true
    } else {
      $result += $item
    }
  }
  return [pscustomobject]@{
    Values = @($result | Select-Object -Unique)
    Changed = $changed
  }
}

function Update-JsonFile($path) {
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $report = @()
  foreach ($row in $json) {
    if ($null -eq $row.serviceArea) { continue }
    $districts = Replace-ListValue $row.serviceArea.blmDistricts
    $permitText = Replace-ListValue $row.serviceArea.blmPermitText
    if ($districts.Changed -or $permitText.Changed) {
      $row.serviceArea.blmDistricts = $districts.Values
      $row.serviceArea.blmPermitText = ($permitText.Values -join ' | ')
      $report += [pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = $row.displayName
        BlmDistricts = ($districts.Values -join ' | ')
        BlmPermitText = $row.serviceArea.blmPermitText
      }
    }
  }
  $json | ConvertTo-Json -Depth 12 | Set-Content -Path $path -Encoding UTF8
  return $report
}

function Update-CsvFile($path, $blmColumns) {
  $rows = Import-Csv $path
  $report = @()
  foreach ($row in $rows) {
    $rowChanged = $false
    foreach ($col in $blmColumns) {
      if ($row.PSObject.Properties[$col]) {
        $current = [string]$row.$col
        if ($current -match [regex]::Escape($old)) {
          $parts = Replace-ListValue $current
          $row.$col = if ($col -like '*Permits' -or $col -like '*PermitText' -or $col -eq 'BLM Permits') { ($parts.Values -join ' | ') } else { ($parts.Values -join ' | ') }
          $rowChanged = $true
        }
      }
    }
    if ($rowChanged) {
      $name = if ($row.PSObject.Properties['displayName']) { $row.displayName } elseif ($row.PSObject.Properties['Outfitter']) { $row.Outfitter } else { '' }
      $report += [pscustomobject]@{
        File = [System.IO.Path]::GetFileName($path)
        DisplayName = $name
      }
    }
  }
  $rows | Export-Csv -Path $path -NoTypeInformation -Encoding UTF8
  return $report
}

$report = @()
$report += Update-JsonFile $MasterPath
$report += Update-JsonFile $PublicPath
$report += Update-CsvFile $ReviewPath @('blmDistricts','blmPermitText')
$report += Update-CsvFile $SlimReviewPath @('blmDistricts','blmPermitText')
$report += Update-CsvFile $FiveColPath @('BLM Permits')
$report += Update-CsvFile $SlimPermitsPath @('BLM Permits')

$report | Export-Csv -Path $ReportPath -NoTypeInformation -Encoding UTF8
[pscustomobject]@{
  Report = $ReportPath
  RowsChanged = $report.Count
} | Format-List
