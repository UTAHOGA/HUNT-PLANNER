$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\fishlake-email-cleanup-report.csv'
$targetIds = @(
  'outfitter-desert-mountain-outfitters',
  'outfitter-high-top-outfitters-llc',
  'outfitter-kolob-outfitters',
  'outfitter-red-creek-outfitters',
  'outfitter-rim-rock-outfitters',
  'outfitter-robb-hunting',
  'outfitter-utah-hunting-outfitters',
  'outfitter-dc-outfitters-llc',
  'outfitter-dirtnap-outfitters-llc',
  'outfitter-double-c-guides',
  'outfitter-f-n-h-outfitters',
  'outfitter-martin-hunting',
  'outfitter-mossback-g-o-inc',
  'outfitter-pine-valley-outfitters',
  'outfitter-psc-outdoors-llc',
  'outfitter-infinity-guides-and-outfitters',
  'outfitter-wilderness-pursuits',
  'outfitter-wild-eyez-outfitters'
)
function Extract-Emails([string]$Text) {
  if (-not $Text) { return @() }
  $matches = [regex]::Matches($Text, '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', 'IgnoreCase')
  $vals = foreach($m in $matches){ $e = $m.Value.ToLower(); if($e -notmatch 'wixpress|example\.com'){ $e } }
  @($vals | Select-Object -Unique)
}
function Ensure-Array($v){ if($null -eq $v){@()} elseif($v -is [System.Collections.IEnumerable] -and -not ($v -is [string])){ @($v) } elseif("$v".Trim()){ @("$v".Trim()) } else {@()} }
$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })
$report = foreach($row in $master){
  if($targetIds -notcontains $row.id){ continue }
  $before = @((Ensure-Array $row.contact.emailAddresses) + (Ensure-Array $row.contact.emailPrimary)) -join ' | '
  $emails = @()
  foreach($piece in @((Ensure-Array $row.contact.emailAddresses) + (Ensure-Array $row.contact.emailPrimary))){
    $emails += Extract-Emails "$piece"
  }
  $emails = @($emails | Select-Object -Unique)
  $row.contact.emailAddresses = @($emails)
  if($row.contact.emailPrimary){
    $preferred = Extract-Emails "$($row.contact.emailPrimary)" | Select-Object -First 1
    if($preferred){ $row.contact.emailPrimary = $preferred }
    elseif($emails.Count){ $row.contact.emailPrimary = $emails[0] }
  } elseif($emails.Count){
    $row.contact.emailPrimary = $emails[0]
  }
  [pscustomobject]@{ Name=$row.displayName; Before=$before; After=(@($row.contact.emailAddresses)-join ' | '); Primary=$row.contact.emailPrimary }
}
$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$report | Export-Csv -NoTypeInformation -Path $reportPath
Write-Output 'CLEANED'
Write-Output ('REPORT=' + $reportPath)
