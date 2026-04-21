$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\fishlake-email-authoritative-report.csv'

$mapping = @(
  @{ name='Bronson Outfitting'; primary='adambronsonhunting@gmail.com'; emails=@('adambronsonhunting@gmail.com') },
  @{ name='Albrecht Outfitters'; primary='tayloralbrecht@hotmail.com'; emails=@('tayloralbrecht@hotmail.com') },
  @{ name='Battleground Guides & Outfitters, Llc'; primary='freedomrv@hotmail.com'; emails=@('freedomrv@hotmail.com') },
  @{ name='Beaver Mountain Outfitters'; primary='edwardsslade@gmail.com'; emails=@('edwardsslade@gmail.com') },
  @{ name='Dc Outfitters, Llc'; primary='ryan@dcoutah.com'; emails=@('ryan@dcoutah.com','rpcarter4@gmail.com') },
  @{ name='Desert Mountain Outfitters'; primary='shieldshunting@yahoo.com'; emails=@('shieldshunting@yahoo.com','aust4.ab@gmail.com') },
  @{ name='Dirtnap Outfitters Llc'; primary='gage@fiercearms.com'; emails=@('gage@fiercearms.com') },
  @{ name='Double C Guides'; primary='droptine@doublecguides.com'; emails=@('droptine@doublecguides.com','droptine375@gmail.com') },
  @{ name='Dusty Trails Outfitting, Llc'; primary='dusty@dustytrailsoutfitting.com'; emails=@('dusty@dustytrailsoutfitting.com') },
  @{ name='Elite Western Outfitters Llc'; primary='elitewesternout@gmail.com'; emails=@('elitewesternout@gmail.com') },
  @{ name='F-N-H Outfitters'; primary='info@fnhoutfitters.com'; emails=@('info@fnhoutfitters.com','kale_h@hotmail.com') },
  @{ name='Graylight Outfitters'; primary='graylightoutfitters@gmail.com'; emails=@('graylightoutfitters@gmail.com') },
  @{ name='Gunner Steele Hunting'; primary='gshunting@yahoo.com'; emails=@('gshunting@yahoo.com') },
  @{ name='High Desert Wild Sheep'; primary='randy@highdesertsheepguides.com'; emails=@('randy@highdesertsheepguides.com') },
  @{ name='High Top Outfitters Llc'; primary='hightopoutfitters@gmail.com'; emails=@('hightopoutfitters@gmail.com') },
  @{ name='Jake Bess Hunting'; primary='jakebesshunts@hotmail.com'; emails=@('jakebesshunts@hotmail.com') },
  @{ name='Jmc Hunting'; primary='jr1972mc@netscape.net'; emails=@('jr1972mc@netscape.net') },
  @{ name='Kolob Outfitters'; primary='koloboutfitters@gmail.com'; emails=@('koloboutfitters@gmail.com') },
  @{ name='Lone Ridge Outfitters'; primary='lonetreeoutfitters@hotmail.com'; emails=@('lonetreeoutfitters@hotmail.com') },
  @{ name='Martin Hunting'; primary='david@martin-hunting.com'; emails=@('david@martin-hunting.com') },
  @{ name='Mecham Outfitters'; primary='merrmecham@gmail.com'; emails=@('merrmecham@gmail.com') },
  @{ name='Mossback G/O, Inc'; primary='doyle@mossback.com'; emails=@('doyle@mossback.com','caryn@mossback.com') },
  @{ name='Needle Rock Outfitters'; primary='james@needlerockoutfitters.com'; emails=@('james@needlerockoutfitters.com') },
  @{ name='Oak Creek Outfitters'; primary='alan.wood@ipsc.com'; emails=@('alan.wood@ipsc.com') },
  @{ name='Offgrid Outdoors'; primary='rusty@offgridoutdoors.com'; emails=@('rusty@offgridoutdoors.com') },
  @{ name='Pine Valley Outfitters'; primary='wadehollerman@gmail.com'; emails=@('wadehollerman@gmail.com') },
  @{ name='Psc Outdoors Llc'; primary='pscoutdoors@gmail.com'; emails=@('pscoutdoors@gmail.com') },
  @{ name='Red Creek Outfitters'; primary='redcreekoutfitters@gmail.com'; emails=@('redcreekoutfitters@gmail.com') },
  @{ name='Rim Rock Outfitters'; primary='payneshunting1@gmail.com'; emails=@('payneshunting1@gmail.com') },
  @{ name='Robb Hunting'; primary='robbhunting2505@gmail.com'; emails=@('robbhunting2505@gmail.com','bjlrobb@gmail.com') },
  @{ name='Shane Scott Outfitting L.L.C.'; primary='shanescottoutfitting@hotmail.com'; emails=@('shanescottoutfitting@hotmail.com') },
  @{ name='Sportsman''S Hunting Adventures'; primary='ashhunts@gmail.com'; emails=@('ashhunts@gmail.com') },
  @{ name='Triple H Hunting'; primary='rbh2443@aol.com'; emails=@('rbh2443@aol.com') },
  @{ name='Utah Hunting Outfitters'; primary='utahbiggameoutfitters@gmail.com'; emails=@('utahbiggameoutfitters@gmail.com') },
  @{ name='Western Pursuits Llc Dba Western Lands Outfitters'; primary='westernlandsoutfitters@gmail.com'; emails=@('westernlandsoutfitters@gmail.com') },
  @{ name='Wilderness Pursuits'; primary='wkoakden@hotmail.com'; emails=@('wkoakden@hotmail.com') },
  @{ name='Wild Eyez Outfitters'; primary='tyler@wildeyez.net'; emails=@('tyler@wildeyez.net') },
  @{ name='Chunky Trout Outfitters Llc'; primary='chunkytroutoutfitters@gmail.com'; emails=@('chunkytroutoutfitters@gmail.com') },
  @{ name='Infinity Guides And Outfitters'; primary='martymartak@gmail.com'; emails=@('martymartak@gmail.com') }
)

$master = @(Get-Content $masterPath -Raw | ConvertFrom-Json)
$publicIds = @((Get-Content $publicPath -Raw | ConvertFrom-Json) | ForEach-Object { $_.id })
$report = foreach($item in $mapping){
  $row = $master | Where-Object { $_.displayName -eq $item.name } | Select-Object -First 1
  if(-not $row){ [pscustomobject]@{Name=$item.name;Status='unmatched';Primary='';Emails=''}; continue }
  $row.contact.emailPrimary = $item.primary
  $row.contact.emailAddresses = @($item.emails | Select-Object -Unique)
  [pscustomobject]@{Name=$item.name;Status='updated';Primary=$row.contact.emailPrimary;Emails=(@($row.contact.emailAddresses)-join ' | ')}
}
$master | ConvertTo-Json -Depth 12 | Set-Content $masterPath
($master | Where-Object { $publicIds -contains $_.id }) | ConvertTo-Json -Depth 12 | Set-Content $publicPath
$report | Export-Csv -NoTypeInformation -Path $reportPath
Write-Output 'AUTH_UPDATED'
Write-Output ('REPORT=' + $reportPath)
