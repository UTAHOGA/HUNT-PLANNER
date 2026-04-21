$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\fishlake-email-integration-report.csv'

function Ensure-Array($v) {
  if ($null -eq $v) { return @() }
  if ($v -is [System.Collections.IEnumerable] -and -not ($v -is [string])) { return @($v) }
  if ("$v".Trim()) { return @("$v".Trim()) }
  return @()
}
function Unique-Array([object[]]$vals) {
  @($vals | Where-Object { $_ -and "$_.Trim()" -ne '' } | Select-Object -Unique)
}

$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })

$updates = @(
  @{ match='Bronson Outfitting'; add=@('adambronsonhunting@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Albrecht Outfitters'; add=@('tayloralbrecht@hotmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Battleground Guides & Outfitters, Llc'; add=@('freedomrv@hotmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Beaver Mountain Outfitters'; add=@('edwardsslade@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Dc Outfitters, Llc'; add=@('rpcarter4@gmail.com'); setPrimary=$null; note='Added owner email from Fishlake permittee list' },
  @{ match='Desert Mountain Outfitters'; add=@('shieldshunting@yahoo.com'); setPrimary='shieldshunting@yahoo.com'; note='Replaced incorrect primary with Fishlake permittee email from user list' },
  @{ match='Dirtnap Outfitters Llc'; add=@('gage@fiercearms.com'); setPrimary=$null; note='Added owner email from Fishlake permittee list' },
  @{ match='Double C Guides'; add=@('droptine375@gmail.com','droptine@doublecguides.com'); setPrimary=$null; note='Added Fishlake permittee emails from user list' },
  @{ match='Dusty Trails Outfitting, Llc'; add=@('dusty@dustytrailsoutfitting.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Elite Western Outfitters Llc'; add=@('elitewesternout@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='F-N-H Outfitters'; add=@('kale_h@hotmail.com'); setPrimary=$null; note='Added owner email from Fishlake permittee list' },
  @{ match='Graylight Outfitters'; add=@('graylightoutfitters@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Gunner Steele Hunting'; add=@('gshunting@yahoo.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='High Desert Wild Sheep'; add=@('randy@highdesertsheepguides.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='High Top Outfitters Llc'; add=@('hightopoutfitters@gmail.com'); setPrimary='hightopoutfitters@gmail.com'; note='Replaced broken primary with Fishlake permittee email from user list' },
  @{ match='Jake Bess Hunting'; add=@('jakebesshunts@hotmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Jmc Hunting'; add=@('jr1972mc@netscape.net'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Kolob Outfitters'; add=@('koloboutfitters@gmail.com'); setPrimary='koloboutfitters@gmail.com'; note='Replaced questionable primary with Fishlake permittee email from user list' },
  @{ match='Lone Ridge Outfitters'; add=@('lonetreeoutfitters@hotmail.com'); setPrimary=$null; note='Linked Lone Tree permittee email to current baseline record' },
  @{ match='Martin Hunting'; add=@('david@martin-hunting.com'); setPrimary=$null; note='Added Fishlake permittee email from user list' },
  @{ match='Mecham Outfitters'; add=@('merrmecham@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Mossback G/O, Inc'; add=@('caryn@mossback.com'); setPrimary=$null; note='Added Fishlake permittee owner email from user list' },
  @{ match='Needle Rock Outfitters'; add=@('james@needlerockoutfitters.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Oak Creek Outfitters'; add=@('alan.wood@ipsc.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Offgrid Outdoors'; add=@('rusty@offgridoutdoors.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Pine Valley Outfitters'; add=@('wadehollerman@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Psc Outdoors Llc'; add=@('pscoutdoors@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Red Creek Outfitters'; add=@('redcreekoutfitters@gmail.com'); setPrimary='redcreekoutfitters@gmail.com'; note='Replaced questionable primary with Fishlake permittee business email from user list' },
  @{ match='Rim Rock Outfitters'; add=@('payneshunting1@gmail.com'); setPrimary='payneshunting1@gmail.com'; note='Added missing primary from Fishlake permittee user list' },
  @{ match='Robb Hunting'; add=@('robbhunting2505@gmail.com','bjlrobb@gmail.com'); setPrimary='robbhunting2505@gmail.com'; note='Added Fishlake permittee emails from user list' },
  @{ match='Shane Scott Outfitting L.L.C.'; add=@('shanescottoutfitting@hotmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Sportsman''S Hunting Adventures'; add=@('ashhunts@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Triple H Hunting'; add=@('RBH2443@aol.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Utah Hunting Outfitters'; add=@('utahbiggameoutfitters@gmail.com'); setPrimary=$null; note='Using Utah Hunting Outfitters as current baseline match for Utah Big Game Outfitters email' },
  @{ match='Western Pursuits Llc Dba Western Lands Outfitters'; add=@('westernlandsoutfitters@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Wilderness Pursuits'; add=@('wkoakden@hotmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Wild Eyez Outfitters'; add=@('tyler@wildeyez.net'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Chunky Trout Outfitters Llc'; add=@('chunkytroutoutfitters@gmail.com'); setPrimary=$null; note='Fishlake permittee email confirmed from user list' },
  @{ match='Infinity Guides And Outfitters'; add=@('martymartak@gmail.com'); setPrimary=$null; note='Added Marty Martak email from user list' }
)

$report = New-Object System.Collections.ArrayList
foreach($u in $updates){
  $row = $master | Where-Object { $_.displayName -eq $u.match } | Select-Object -First 1
  if(-not $row){
    [void]$report.Add([pscustomobject]@{ Match=$u.match; Status='unmatched'; PrimaryBefore=''; PrimaryAfter=''; EmailsAfter=''; Note=$u.note })
    continue
  }
  $before = $row.contact.emailPrimary
  $emails = Unique-Array @((Ensure-Array $row.contact.emailAddresses) + (Ensure-Array $row.contact.emailPrimary) + $u.add)
  $row.contact.emailAddresses = @($emails)
  if($u.setPrimary){ $row.contact.emailPrimary = $u.setPrimary }
  elseif(-not $row.contact.emailPrimary -and $emails.Count){ $row.contact.emailPrimary = $emails[0] }
  if(-not $row.internal){ $row | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force }
  $notes = Unique-Array @((Ensure-Array $row.internal.reviewNotes) + @($u.note))
  $row.internal.reviewNotes = @($notes)
  [void]$report.Add([pscustomobject]@{ Match=$u.match; Status='updated'; PrimaryBefore=$before; PrimaryAfter=$row.contact.emailPrimary; EmailsAfter=(@($row.contact.emailAddresses) -join ' | '); Note=$u.note })
}

$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$report | Export-Csv -NoTypeInformation -Path $reportPath
