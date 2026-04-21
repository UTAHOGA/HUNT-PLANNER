param(
  [string]$MasterPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$PublicPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$ReviewCsvPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$SlimReviewCsvPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$ReportCsvPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-derived-service-area-clear-report.csv",
  [switch]$SkipCsv
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-ListText($value) {
  if ($null -eq $value) { return '' }
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    return (@($value | Where-Object { $_ -and "$_".Trim() }) -join ' | ')
  }
  return [string]$value
}

function Clear-JsonFile($path) {
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $report = @()
  foreach ($record in $json) {
    if ($null -eq $record.serviceArea) { continue }
    $oldSpecies = @($record.serviceArea.speciesServed)
    $oldUnits = @($record.serviceArea.unitsServed)
    if ($oldSpecies.Count -gt 0 -or $oldUnits.Count -gt 0) {
      $record.serviceArea.speciesServed = @()
      $record.serviceArea.unitsServed = @()
      $note = 'Cleared inferred species/unit service area; retaining confirmed federal permits.'
      if ($null -eq $record.internal) {
        $record | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force
      }
      if ($null -eq $record.internal.reviewNotes) {
        $record.internal | Add-Member -NotePropertyName reviewNotes -NotePropertyValue @() -Force
      }
      $existingNotes = @($record.internal.reviewNotes)
      if ($existingNotes -notcontains $note) {
        $record.internal.reviewNotes = @($existingNotes + $note)
      }
      $report += [pscustomobject]@{
        SourceFile = [System.IO.Path]::GetFileName($path)
        Id = $record.id
        DisplayName = $record.displayName
        OldSpeciesServed = Normalize-ListText $oldSpecies
        OldUnitsServed = Normalize-ListText $oldUnits
      }
    }
  }
  $json | ConvertTo-Json -Depth 12 | Set-Content -Path $path -Encoding UTF8
  return $report
}

function Clear-CsvFile($path) {
  $rows = Import-Csv $path
  $report = @()
  foreach ($row in $rows) {
    $oldSpecies = [string]$row.speciesServed
    $oldUnits = [string]$row.unitsServed
    if (($oldSpecies.Trim()) -or ($oldUnits.Trim())) {
      $row.speciesServed = ''
      $row.unitsServed = ''
      $report += [pscustomobject]@{
        SourceFile = [System.IO.Path]::GetFileName($path)
        Id = $row.id
        DisplayName = $row.displayName
        OldSpeciesServed = $oldSpecies
        OldUnitsServed = $oldUnits
      }
    }
  }
  $rows | Export-Csv -Path $path -NoTypeInformation -Encoding UTF8
  return $report
}

$report = @()
$report += Clear-JsonFile -path $MasterPath
$report += Clear-JsonFile -path $PublicPath

$csvWarnings = @()
if (-not $SkipCsv) {
  foreach ($csvPath in @($ReviewCsvPath, $SlimReviewCsvPath)) {
    try {
      $report += Clear-CsvFile -path $csvPath
    } catch {
      $csvWarnings += "Skipped locked CSV: $csvPath"
    }
  }
}

$report | Sort-Object SourceFile, DisplayName | Export-Csv -Path $ReportCsvPath -NoTypeInformation -Encoding UTF8

[pscustomobject]@{
  ReportCsv = $ReportCsvPath
  ClearedRows = $report.Count
  MasterRowsChanged = @($report | Where-Object { $_.SourceFile -eq [System.IO.Path]::GetFileName($MasterPath) }).Count
  PublicRowsChanged = @($report | Where-Object { $_.SourceFile -eq [System.IO.Path]::GetFileName($PublicPath) }).Count
  ReviewRowsChanged = @($report | Where-Object { $_.SourceFile -eq [System.IO.Path]::GetFileName($ReviewCsvPath) }).Count
  SlimReviewRowsChanged = @($report | Where-Object { $_.SourceFile -eq [System.IO.Path]::GetFileName($SlimReviewCsvPath) }).Count
  CsvWarnings = $csvWarnings -join ' | '
} | Format-List
