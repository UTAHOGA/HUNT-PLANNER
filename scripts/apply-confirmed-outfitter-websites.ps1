$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-website-confirmations.csv'

$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })
$report = New-Object System.Collections.ArrayList

function Add-Note($row, $note) {
  if(-not $row.internal){
    $row | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $notes = @()
  if($row.internal.reviewNotes){ $notes += @($row.internal.reviewNotes) }
  $notes += $note
  $row.internal.reviewNotes = @($notes | Select-Object -Unique)
}

$updates = @(
  @{ name='Utah Big Game Outfitters'; website='https://www.utahbiggameoutfitters.com'; note='User confirmed this website belongs to Utah Big Game Outfitters.' },
  @{ name='Lone Tree Outfitters'; website='https://www.lonetreeoutfitters.com/'; note='User provided Lone Tree Outfitters website.' }
)

foreach($u in $updates){
  $row = $master | Where-Object { $_.displayName -eq $u.name } | Select-Object -First 1
  if(-not $row){ continue }
  $before = $row.contact.website
  $row.contact.website = $u.website.TrimEnd('/')
  if($row.urlStatus -eq 'Missing'){ $row.urlStatus = 'Syntax OK' }
  if(-not $row.validationNote){ $row.validationNote = 'Website added from user confirmation.' }
  Add-Note $row $u.note
  [void]$report.Add([pscustomobject]@{ Name=$u.name; BeforeWebsite=$before; AfterWebsite=$row.contact.website; UrlStatus=$row.urlStatus })
}

$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$report | Export-Csv -NoTypeInformation -Path $reportPath
Write-Output 'UPDATED_WEBSITES'
Write-Output ('REPORT=' + $reportPath)
