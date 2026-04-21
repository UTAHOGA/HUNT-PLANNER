param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$ApprovedJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-sourcing-approved.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $ApprovedJson)) {
  throw "Approved logo file not found: $ApprovedJson"
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100
$approved = Get-Content $ApprovedJson -Raw | ConvertFrom-Json -Depth 100

foreach ($item in $approved) {
  $record = $master | Where-Object { $_.id -eq $item.id }
  if (-not $record) { continue }
  if (-not [string]::IsNullOrWhiteSpace([string]$item.selectedLogoUrl)) {
    $record.branding.logoUrl = [string]$item.selectedLogoUrl
  }
  if (-not $record.internal.sourceNotes) { $record.internal.sourceNotes = @() }
  if ("Logo sourcing applied" -notin $record.internal.sourceNotes) {
    $record.internal.sourceNotes += "Logo sourcing applied"
  }
}

$master | ConvertTo-Json -Depth 100 | Set-Content $MasterJson
$master | Where-Object { $_.publicStatus -eq "active" -and $_.publication.showOnPlanner } | ConvertTo-Json -Depth 100 | Set-Content "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json"

Write-Output ("APPLIED=" + $approved.Count)
