param(
  [string]$WorkbookPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-likely-match-manual-review.xlsx",
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$PublicJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-2026-03-27.csv",
  [string]$SlimReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$ReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-reviewed-status-report.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Copy-SharedFile([string]$sourcePath) {
  $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) ('dwr-reviewed-' + [guid]::NewGuid().ToString() + '.xlsx')
  $source = [System.IO.File]::Open($sourcePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $target = [System.IO.File]::Create($tempPath)
    try { $source.CopyTo($target) } finally { $target.Dispose() }
  } finally {
    $source.Dispose()
  }
  return $tempPath
}

function Read-WorkbookReviewedRows([string]$path) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $tempPath = Copy-SharedFile $path
  $zip = $null
  try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($tempPath)

    $shared = @()
    $ssEntry = $zip.GetEntry('xl/sharedStrings.xml')
    if ($ssEntry) {
      $reader = New-Object IO.StreamReader($ssEntry.Open())
      $ssXml = [xml]$reader.ReadToEnd()
      $reader.Close()
      foreach ($si in $ssXml.sst.si) {
        $text = ''
        if ($si.t) { $text = [string]$si.t }
        elseif ($si.r) { $text = (($si.r | ForEach-Object { $_.t }) -join '') }
        $shared += $text
      }
    }

    $sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
    $reader = New-Object IO.StreamReader($sheetEntry.Open())
    $sheetXml = [xml]$reader.ReadToEnd()
    $reader.Close()

    $statusByStyle = @{
      '1' = 'Not Registered'
      '2' = 'Registered'
    }

    $results = @()
    foreach ($row in $sheetXml.worksheet.sheetData.row | Select-Object -Skip 1) {
      $cells = @{}
      $rowStatus = ''
      foreach ($cell in $row.c) {
        $ref = [string]$cell.r
        $col = ($ref -replace '\d+', '')
        $value = if ($cell.v) { [string]$cell.v } else { '' }
        if ($cell.t -eq 's' -and $value -match '^\d+$') {
          $value = $shared[[int]$value]
        }
        $cells[$col] = $value
        if (-not $rowStatus -and $statusByStyle.ContainsKey([string]$cell.s)) {
          $rowStatus = $statusByStyle[[string]$cell.s]
        }
      }
      if ($cells.ContainsKey('A') -and $cells['A']) {
        $results += [pscustomobject]@{
          id = [string]$cells['A']
          displayName = [string]$cells['B']
          dwrRegistrationStatus = $rowStatus
        }
      }
    }
    return $results
  }
  finally {
    if ($zip) { $zip.Dispose() }
    if (Test-Path $tempPath) { Remove-Item $tempPath -Force -ErrorAction SilentlyContinue }
  }
}

$reviewedRows = @(Read-WorkbookReviewedRows $WorkbookPath | Where-Object { $_.dwrRegistrationStatus })
$statusById = @{}
foreach ($row in $reviewedRows) { $statusById[[string]$row.id] = [string]$row.dwrRegistrationStatus }

$report = @()
foreach ($jsonPath in @($MasterJson, $PublicJson)) {
  $data = @(Get-Content $jsonPath -Raw | ConvertFrom-Json)
  foreach ($item in $data) {
    $status = $statusById[[string]$item.id]
    if (-not $status) { continue }
    if (-not $item.internal) {
      $item | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    if (-not $item.publication) {
      $item | Add-Member -NotePropertyName publication -NotePropertyValue ([pscustomobject]@{}) -Force
    }
    $before = ''
    if ($item.internal.PSObject.Properties.Name -contains 'dwrRegistrationStatus') {
      $before = [string]$item.internal.dwrRegistrationStatus
    }
    $beforeShowOnPlanner = $true
    if ($item.publication.PSObject.Properties.Name -contains 'showOnPlanner') {
      $beforeShowOnPlanner = [bool]$item.publication.showOnPlanner
    }
    $beforeShowOnPublicList = $true
    if ($item.publication.PSObject.Properties.Name -contains 'showOnPublicList') {
      $beforeShowOnPublicList = [bool]$item.publication.showOnPublicList
    }
    if ($before -ne $status) {
      $item.internal | Add-Member -NotePropertyName dwrRegistrationStatus -NotePropertyValue $status -Force
      $item.internal | Add-Member -NotePropertyName dwrReviewedAt -NotePropertyValue (Get-Date -Format 'yyyy-MM-dd') -Force
    }
    if ($status -eq 'Not Registered') {
      $item.publication | Add-Member -NotePropertyName showOnPlanner -NotePropertyValue $false -Force
      $item.publication | Add-Member -NotePropertyName showOnPublicList -NotePropertyValue $false -Force
      $item.internal | Add-Member -NotePropertyName excludeFromPublicBecauseDwrNotRegistered -NotePropertyValue $true -Force
    }
    elseif ($status -eq 'Registered') {
      $item.internal | Add-Member -NotePropertyName excludeFromPublicBecauseDwrNotRegistered -NotePropertyValue $false -Force
    }
    $afterShowOnPlanner = $true
    if ($item.publication.PSObject.Properties.Name -contains 'showOnPlanner') {
      $afterShowOnPlanner = [bool]$item.publication.showOnPlanner
    }
    $afterShowOnPublicList = $true
    if ($item.publication.PSObject.Properties.Name -contains 'showOnPublicList') {
      $afterShowOnPublicList = [bool]$item.publication.showOnPublicList
    }
    if ($before -ne $status -or $beforeShowOnPlanner -ne $afterShowOnPlanner -or $beforeShowOnPublicList -ne $afterShowOnPublicList) {
      $report += [pscustomobject]@{
        File = [System.IO.Path]::GetFileName($jsonPath)
        id = $item.id
        displayName = $item.displayName
        dwrRegistrationStatus = $status
        showOnPlanner = $afterShowOnPlanner
        showOnPublicList = $afterShowOnPublicList
      }
    }
  }
  $data | ConvertTo-Json -Depth 14 | Set-Content -Path $jsonPath -Encoding UTF8
}

& "C:\DOWNLOADS\test website\HUNT-PLANNER\scripts\export-review-csv-from-master.ps1" -MasterJson $MasterJson -OutCsv $ReviewCsv | Out-Null
$review = Import-Csv $ReviewCsv
$slimColumns = @(
  'id','displayName','primaryName','secondaryContactName','ownerNames','phonePrimary','phoneNumbers',
  'emailPrimary','emailAddresses','website','facebookUrl','instagramUrl','city','state','mailingAddress',
  'speciesServed','unitsServed','usfsForests','usfsForestIds','usfsDistrictIds','usfsPermitText',
  'blmDistricts','blmDistrictIds','blmPermitText','sitlaServed','stateParksServed','dwrRegistrationStatus'
)
$review | Select-Object $slimColumns | Export-Csv -Path $SlimReviewCsv -NoTypeInformation -Encoding UTF8

$report | Export-Csv -Path $ReportCsv -NoTypeInformation -Encoding UTF8
[pscustomobject]@{
  ReviewedRows = $reviewedRows.Count
  UpdatedRows = $report.Count
  ReportCsv = $ReportCsv
} | Format-List
