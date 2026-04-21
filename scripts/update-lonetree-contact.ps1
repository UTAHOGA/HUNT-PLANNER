$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-lonetree-contact-update.csv'

$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })
$row = $master | Where-Object { $_.displayName -eq 'Lone Tree Outfitters' } | Select-Object -First 1
if(-not $row){ throw 'Lone Tree Outfitters not found' }

$before = [pscustomobject]@{
  PrimaryName = $row.contact.primaryName
  PhonePrimary = $row.contact.phonePrimary
  Website = $row.contact.website
  Address = $row.headquarters.mailingAddress
  City = $row.headquarters.city
}

$row.contact.primaryName = 'Brady Loveless'
$row.contact.ownerNames = @('Brady Loveless')
$row.contact.phonePrimary = '(801) 319-3226'
$row.contact.phoneNumbers = @('(801) 319-3226')
$row.headquarters.mailingAddress = 'PO Box 687, Payson, UT 84651'
$row.headquarters.city = 'Payson'
$row.headquarters.region = 'UT'
$row.headquarters.state = 'UT'
if(-not $row.internal){ $row | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force }
$notes = @()
if($row.internal.reviewNotes){ $notes += @($row.internal.reviewNotes) }
$notes += 'User confirmed Brady Loveless, PO Box 687, Payson, UT 84651, (801) 319-3226 for Lone Tree Outfitters.'
$row.internal.reviewNotes = @($notes | Select-Object -Unique)

$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath

[pscustomobject]@{
  Name = 'Lone Tree Outfitters'
  BeforePrimaryName = $before.PrimaryName
  AfterPrimaryName = $row.contact.primaryName
  BeforePhone = $before.PhonePrimary
  AfterPhone = $row.contact.phonePrimary
  BeforeAddress = $before.Address
  AfterAddress = $row.headquarters.mailingAddress
  BeforeCity = $before.City
  AfterCity = $row.headquarters.city
} | Export-Csv -NoTypeInformation -Path $reportPath

Write-Output 'UPDATED_LONETREE'
Write-Output ('REPORT=' + $reportPath)
