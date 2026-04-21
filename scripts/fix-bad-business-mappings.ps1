$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$unresolvedJson = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-unresolved-businesses.json'
$unresolvedCsv = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-unresolved-businesses.csv'

$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })

$bad = @(
  @{ existing='Utah Hunting Outfitters'; wrongEmail='utahbiggameoutfitters@gmail.com'; separateBusiness='Utah Big Game Outfitters'; note='User confirmed Utah Big Game Outfitters is not Utah Hunting Outfitters.' },
  @{ existing='Lone Ridge Outfitters'; wrongEmail='lonetreeoutfitters@hotmail.com'; separateBusiness='Lone Tree Outfitters'; note='User confirmed Lone Tree Outfitters is not Lone Ridge Outfitters.' }
)

$report = New-Object System.Collections.ArrayList
foreach($b in $bad){
  $row = $master | Where-Object { $_.displayName -eq $b.existing } | Select-Object -First 1
  if(-not $row){ continue }
  $beforePrimary = $row.contact.emailPrimary
  $beforeEmails = @($row.contact.emailAddresses)
  if($row.contact.emailPrimary -eq $b.wrongEmail){ $row.contact.emailPrimary = '' }
  $row.contact.emailAddresses = @(@($row.contact.emailAddresses) | Where-Object { $_ -and $_ -ne $b.wrongEmail })
  if(-not $row.internal){ $row | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force }
  $notes = @()
  if($row.internal.reviewNotes){ $notes += @($row.internal.reviewNotes) }
  $notes += $b.note
  $row.internal.reviewNotes = @($notes | Select-Object -Unique)
  [void]$report.Add([pscustomobject]@{
    ExistingBusiness = $b.existing
    RemovedEmail = $b.wrongEmail
    BeforePrimary = $beforePrimary
    AfterPrimary = $row.contact.emailPrimary
    BeforeEmails = ($beforeEmails -join ' | ')
    AfterEmails = (@($row.contact.emailAddresses) -join ' | ')
    SeparateBusinessNeeded = $b.separateBusiness
    Note = $b.note
  })
}

$unresolved = @(
  [pscustomobject]@{ BusinessName='Utah Big Game Outfitters'; KnownEmail='utahbiggameoutfitters@gmail.com'; Reason='Separate business from Utah Hunting Outfitters'; Source='Fishlake permittee email list / user correction'; Status='needs-record' },
  [pscustomobject]@{ BusinessName='Lone Tree Outfitters'; KnownEmail='lonetreeoutfitters@hotmail.com'; Reason='Separate business from Lone Ridge Outfitters'; Source='Fishlake permittee email list / user correction'; Status='needs-record' }
)

$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$unresolved | ConvertTo-Json -Depth 6 | Set-Content $unresolvedJson
$unresolved | Export-Csv -NoTypeInformation -Path $unresolvedCsv
$report | Export-Csv -NoTypeInformation -Path 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-bad-mapping-fixes.csv'
Write-Output 'FIXED_BAD_MAPPINGS'
