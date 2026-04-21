param()

$workbookPath = 'C:\DOWNLOADS\latest all outfitters with Emails 08.25.25 (1).xlsx'
$masterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json'
$publicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json'
$reportPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-2025-workbook-fill-report.csv'

function Normalize-Name([string]$s){
  if([string]::IsNullOrWhiteSpace($s)){ return '' }
  $s = $s.ToUpperInvariant()
  $s = $s -replace '&',' AND '
  $s = $s -replace '[^A-Z0-9]+',' '
  $s = $s -replace '\s+',' '
  $s.Trim()
}
function Normalize-PhoneList([string]$value){
  if([string]::IsNullOrWhiteSpace($value)){ return @() }
  $matches = [regex]::Matches($value, '(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}') | ForEach-Object { $_.Value }
  $normalized = foreach($m in $matches){
    $digits = ($m -replace '\D','')
    if($digits.Length -eq 11 -and $digits.StartsWith('1')){ $digits = $digits.Substring(1) }
    if($digits.Length -eq 10){ '({0}) {1}-{2}' -f $digits.Substring(0,3),$digits.Substring(3,3),$digits.Substring(6,4) }
  }
  @($normalized | Where-Object { $_ } | Select-Object -Unique)
}
function Normalize-EmailList([string]$value){
  if([string]::IsNullOrWhiteSpace($value)){ return @() }
  $matches = [regex]::Matches($value.ToLower(), '[a-z0-9._%+''-]+@[a-z0-9.-]+\.[a-z]{2,}') | ForEach-Object { $_.Value.Trim() }
  @($matches | Where-Object { $_ } | Select-Object -Unique)
}
function Normalize-Website([string]$value){
  if([string]::IsNullOrWhiteSpace($value)){ return '' }
  $m = [regex]::Match($value, 'https?://[^\s,;]+', 'IgnoreCase')
  if($m.Success){ return $m.Value.Trim() }
  return $value.Trim()
}
function Split-Tokens([string]$value){
  if([string]::IsNullOrWhiteSpace($value)){ return @() }
  $v = $value -replace '[\r\n]+', ' | '
  $parts = $v -split '\s{2,}|\s*\|\s*|\s*,\s*'
  @($parts | ForEach-Object { $_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
}
function Add-Unique([System.Collections.ArrayList]$list, [string[]]$values){
  foreach($v in $values){ if($v -and -not $list.Contains($v)){ [void]$list.Add($v) } }
}
function Parse-USFS([string]$value){
  $tokens = Split-Tokens $value
  $forests = New-Object System.Collections.ArrayList
  $forestIds = New-Object System.Collections.ArrayList
  $districtIds = New-Object System.Collections.ArrayList
  foreach($t in $tokens){
    $n = Normalize-Name $t
    switch -Regex ($n) {
      'FISHLAKE' { Add-Unique $forests @('Fishlake'); Add-Unique $forestIds @('fishlake'); continue }
      'MANTI LASAL|MANTI LA SAL' { Add-Unique $forests @('Manti-La Sal'); Add-Unique $forestIds @('manti-la-sal'); continue }
      'ASHLEY' { Add-Unique $forests @('Ashley'); Add-Unique $forestIds @('ashley'); continue }
      'UINTA|WASATCH|CACHE|UWC' { Add-Unique $forests @('Uinta-Wasatch-Cache'); Add-Unique $forestIds @('uwc'); continue }
      'DIXIE' { Add-Unique $forests @('Dixie'); Add-Unique $forestIds @('dixie'); continue }
      'NORTH' { Add-Unique $districtIds @('manti-la-sal-north'); continue }
      'SOUTH' { Add-Unique $districtIds @('manti-la-sal-south'); continue }
      'MOAB' { Add-Unique $districtIds @('manti-la-sal-moab'); continue }
      'MONTICELLO' { Add-Unique $districtIds @('manti-la-sal-monticello'); continue }
      'NEBO' { Add-Unique $districtIds @('uwc-nebo'); continue }
      'UINTA DISTRICT' { Add-Unique $districtIds @('uwc-uinta'); continue }
      'WASATCH DISTRICT' { Add-Unique $districtIds @('uwc-wasatch'); continue }
      'CACHE DISTRICT' { Add-Unique $districtIds @('uwc-cache'); continue }
      'POWELL' { Add-Unique $districtIds @('dixie-powell'); continue }
      'ESCALANTE' { Add-Unique $districtIds @('dixie-escalante'); continue }
      'CEDAR' { Add-Unique $districtIds @('dixie-cedar-city'); continue }
      'PINE VALLEY' { Add-Unique $districtIds @('dixie-pine-valley'); continue }
      'VERNAL' { Add-Unique $districtIds @('ashley-vernal'); continue }
      'ROOSEVELT' { Add-Unique $districtIds @('ashley-roosevelt'); continue }
    }
  }
  [pscustomobject]@{ Raw=$tokens; Forests=@($forests); ForestIds=@($forestIds); DistrictIds=@($districtIds) }
}
function Parse-BLM([string]$value){
  $tokens = Split-Tokens $value
  $districts = New-Object System.Collections.ArrayList
  $districtIds = New-Object System.Collections.ArrayList
  foreach($t in $tokens){
    $n = Normalize-Name $t
    switch -Regex ($n) {
      'GRAND STAIRCASE' { Add-Unique $districts @('Grand Staircase'); Add-Unique $districtIds @('blm-grand-staircase'); continue }
      'KANAB' { Add-Unique $districts @('Kanab'); Add-Unique $districtIds @('blm-kanab'); continue }
      'CEDAR CITY' { Add-Unique $districts @('Cedar City'); Add-Unique $districtIds @('blm-cedar-city'); continue }
      'FISHLAKE' { Add-Unique $districts @('Fishlake'); Add-Unique $districtIds @('blm-fishlake'); continue }
      'ST GEORGE' { Add-Unique $districts @('St. George Field Office'); Add-Unique $districtIds @('blm-st-george'); continue }
    }
  }
  [pscustomobject]@{ Raw=$tokens; Districts=@($districts); DistrictIds=@($districtIds) }
}
function Proper-Primary($values){ if($values -and $values.Count -gt 0){ return $values[0] } return $null }
function Build-WorkbookRows($xlsxPath){
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip=[System.IO.Compression.ZipFile]::OpenRead($xlsxPath)
  function Get-EntryText($name){ $entry=$zip.Entries | Where-Object FullName -eq $name | Select-Object -First 1; $sr=New-Object IO.StreamReader($entry.Open()); $t=$sr.ReadToEnd(); $sr.Close(); return $t }
  function Get-NodeText($node){ if($null -eq $node){ return '' }; if($node -is [string]){ return $node }; if($node -is [System.Xml.XmlElement]){ return $node.InnerText }; return [string]$node }
  [xml]$sharedXml = Get-EntryText 'xl/sharedStrings.xml'
  $sharedStrings = @(); foreach($si in $sharedXml.sst.si){ $sharedStrings += Get-NodeText $si }
  [xml]$sheetXml = Get-EntryText 'xl/worksheets/sheet1.xml'
  function ColIndex($cellRef){ $letters = ($cellRef -replace '\d',''); $sum=0; foreach($ch in $letters.ToCharArray()){ $sum = $sum*26 + ([int][char]::ToUpper($ch) - [int][char]'A' + 1) }; return $sum }
  $rows=@()
  foreach($row in $sheetXml.worksheet.sheetData.row){
    $obj=@{}
    foreach($c in $row.c){
      $idx = ColIndex $c.r
      $v=''
      if($c.t -eq 's'){ $v = $sharedStrings[[int]$c.v] }
      elseif($c.t -eq 'inlineStr'){ $v = Get-NodeText $c.is }
      else { $v = Get-NodeText $c.v }
      $obj[$idx]=$v
    }
    $rows += ,$obj
  }
  $zip.Dispose()
  $data=@()
  for($r=2; $r -lt $rows.Count; $r++){
    $row=$rows[$r]
    $name = [string]($row[1])
    if([string]::IsNullOrWhiteSpace($name)){ continue }
    $data += [pscustomobject]@{
      Outfitter = [string]($row[1])
      Owner = [string]($row[2])
      Phone = [string]($row[3])
      Website = [string]($row[4])
      Email = [string]($row[5])
      USFS = [string]($row[6])
      BLM = [string]($row[7])
      StateParks = [string]($row[8])
      SITLA = [string]($row[9])
      DeerUnits = [string]($row[10])
      ElkUnits = [string]($row[11])
      AntelopeUnits = [string]($row[12])
      MooseUnits = [string]($row[13])
      GoatUnits = [string]($row[14])
      SheepUnits = [string]($row[15])
      BisonUnits = [string]($row[16])
      FurbearerUnits = [string]($row[17])
    }
  }
  return $data
}

$master = Get-Content $masterPath -Raw | ConvertFrom-Json
$public = Get-Content $publicPath -Raw | ConvertFrom-Json
$rows = Build-WorkbookRows $workbookPath

$aliasMap = @{
  'ALPHA OUTFITTERS' = 'Garrett Smith Hunting'
  'ADAM BRONSON HUNTING' = 'Bronson Outfitting'
  'ADAM BRONSON OUTFITTING' = 'Bronson Outfitting'
  'MOSSBACK OUTFITTERS' = 'Mossback G/O, Inc'
  'MOSSBACK GUIDES AND OUTFITTERS' = 'Mossback G/O, Inc'
  'FNH OUTFITTERS' = 'F-N-H Outfitters'
  'DC OUTFITTERS' = 'Dc Outfitters, Llc'
  'DIRTNAP OUTFITTERS' = 'Dirtnap Outfitters Llc'
  'JAKE BESS HUNTS' = 'Jake Bess Hunting'
  'OFFGRID OUTFITTERS' = 'OFFGRID OUTDOORS'
  'RIMROCK OUTFITTERS' = 'Rim Rock Outfitters'
  'X FACTOR OUTFITTERS' = 'X-FACTOR OUTFITTERS'
  'SHANE SCOTT OUTFITTERS' = 'Shane Scott Outfitting L.L.C.'
  'WILD EYEZ OUTFITTERS' = 'Wild Eyez Outfitters'
  'LONETREE OUTFITTERS' = 'Lone Tree Outfitters'
  'UTAH BIG GAME OUTFITTERS' = 'Utah Big Game Outfitters'
  'NORTH RIM OUTFITTERS' = 'North Rim Outfitters'
  'BOOK CLIFF OUTFITTERS' = 'Book Clif Outfitters/Cisco Outfitters'
}
$masterByNorm=@{}
foreach($m in $master){ $masterByNorm[(Normalize-Name $m.displayName)] = $m }

$report = New-Object System.Collections.ArrayList
foreach($row in $rows){
  $sourceNorm = Normalize-Name $row.Outfitter
  $targetName = if($aliasMap.ContainsKey($sourceNorm)){ $aliasMap[$sourceNorm] } else { $null }
  $record = $null
  if($targetName){
    $record = $master | Where-Object displayName -eq $targetName | Select-Object -First 1
  } elseif($masterByNorm.ContainsKey($sourceNorm)){
    $record = $masterByNorm[$sourceNorm]
  }
  if(-not $record){
    [void]$report.Add([pscustomobject]@{ Outfitter=$row.Outfitter; MatchedRecord=''; Action='Skipped'; Notes='No safe match' })
    continue
  }

  $actions = New-Object System.Collections.ArrayList
  $emails = Normalize-EmailList $row.Email
  $phones = Normalize-PhoneList $row.Phone
  $website = Normalize-Website $row.Website
  $owners = Split-Tokens $row.Owner
  $usfs = Parse-USFS $row.USFS
  $blm = Parse-BLM $row.BLM

  if(((-not $record.contact.ownerNames) -or [string]::IsNullOrWhiteSpace([string]$record.contact.ownerNames)) -and $owners.Count -gt 0){
    $record.contact.ownerNames = ($owners -join ' | ')
    $record.contact.primaryName = $owners[0]
    [void]$actions.Add('owner')
  }
  if(((-not $record.contact.phoneNumbers) -or @($record.contact.phoneNumbers).Count -eq 0) -and $phones.Count -gt 0){
    $record.contact.phoneNumbers = @($phones)
    $record.contact.phonePrimary = Proper-Primary $phones
    [void]$actions.Add('phone')
  }
  if(((-not $record.contact.emailAddresses) -or @($record.contact.emailAddresses).Count -eq 0) -and $emails.Count -gt 0){
    $record.contact.emailAddresses = @($emails)
    $record.contact.emailPrimary = Proper-Primary $emails
    [void]$actions.Add('email')
  }
  if(((-not $record.contact.website) -or [string]::IsNullOrWhiteSpace([string]$record.contact.website)) -and $website){
    $record.contact.website = $website
    [void]$actions.Add('website')
  }
  # repair bad one-char primaries from existing arrays
  if((([string]$record.contact.phonePrimary).Length -lt 7) -and @($record.contact.phoneNumbers).Count -gt 0){ $record.contact.phonePrimary = $record.contact.phoneNumbers[0]; [void]$actions.Add('phonePrimaryRepair') }
  if((([string]$record.contact.emailPrimary).Length -lt 5) -and @($record.contact.emailAddresses).Count -gt 0){ $record.contact.emailPrimary = $record.contact.emailAddresses[0]; [void]$actions.Add('emailPrimaryRepair') }

  if(((-not $record.serviceArea.stateParks) -or @($record.serviceArea.stateParks).Count -eq 0) -and -not [string]::IsNullOrWhiteSpace($row.StateParks)){
    $record.serviceArea.stateParks = @(Split-Tokens $row.StateParks)
    [void]$actions.Add('stateParks')
  }
  if(((-not $record.serviceArea.sitla) -or @($record.serviceArea.sitla).Count -eq 0) -and -not [string]::IsNullOrWhiteSpace($row.SITLA)){
    $record.serviceArea.sitla = @(Split-Tokens $row.SITLA)
    [void]$actions.Add('sitla')
  }

  $speciesMap = @{
    'Deer' = $row.DeerUnits; 'Elk' = $row.ElkUnits; 'Antelope' = $row.AntelopeUnits; 'Moose' = $row.MooseUnits; 'Goat' = $row.GoatUnits; 'Sheep' = $row.SheepUnits; 'Bison' = $row.BisonUnits; 'Furbearer' = $row.FurbearerUnits
  }
  $units = New-Object System.Collections.ArrayList
  foreach($kv in $speciesMap.GetEnumerator()){
    if(-not [string]::IsNullOrWhiteSpace($kv.Value)){
      if(-not $record.serviceArea.speciesServed){ $record.serviceArea.speciesServed = @() }
      if($record.serviceArea.speciesServed -notcontains $kv.Key){ $record.serviceArea.speciesServed += $kv.Key; [void]$actions.Add("species:$($kv.Key)") }
      Add-Unique $units (Split-Tokens $kv.Value)
    }
  }
  if($units.Count -gt 0){
    if(-not $record.serviceArea.unitsServed){ $record.serviceArea.unitsServed = @() }
    $existing = New-Object System.Collections.ArrayList
    Add-Unique $existing @($record.serviceArea.unitsServed)
    $before = $existing.Count
    Add-Unique $existing @($units)
    if($existing.Count -gt $before){ $record.serviceArea.unitsServed = @($existing); [void]$actions.Add('unitsServed+') }
  }

  if($usfs.Raw.Count -gt 0){
    if((-not $record.serviceArea.usfsPermitAreasRaw) -or @($record.serviceArea.usfsPermitAreasRaw).Count -eq 0){ $record.serviceArea.usfsPermitAreasRaw = @($usfs.Raw); [void]$actions.Add('usfsRaw') }
    if(((-not $record.serviceArea.usfsPermitText) -or [string]::IsNullOrWhiteSpace([string]$record.serviceArea.usfsPermitText))){ $record.serviceArea.usfsPermitText = ($usfs.Raw -join ' | '); [void]$actions.Add('usfsText') }
    if($usfs.Forests.Count -gt 0 -and ((-not $record.serviceArea.usfsForests) -or @($record.serviceArea.usfsForests).Count -eq 0)){
      $record.serviceArea.usfsForests = @($usfs.Forests)
      $record.serviceArea.usfsForestIds = @($usfs.ForestIds)
      [void]$actions.Add('usfsForests')
    }
    if($usfs.DistrictIds.Count -gt 0 -and ((-not $record.serviceArea.usfsDistrictIds) -or @($record.serviceArea.usfsDistrictIds).Count -eq 0)){
      $record.serviceArea.usfsDistrictIds = @($usfs.DistrictIds)
      [void]$actions.Add('usfsDistrictIds')
    }
  }

  $skipBlm = -not [string]::IsNullOrWhiteSpace($row.BLM) -and ((Normalize-Name $row.BLM) -match 'DIXIE')
  if(-not $skipBlm -and $blm.Raw.Count -gt 0){
    if((-not $record.serviceArea.blmPermitAreasRaw) -or @($record.serviceArea.blmPermitAreasRaw).Count -eq 0){ $record.serviceArea.blmPermitAreasRaw = @($blm.Raw); [void]$actions.Add('blmRaw') }
    if(((-not $record.serviceArea.blmPermitText) -or [string]::IsNullOrWhiteSpace([string]$record.serviceArea.blmPermitText))){ $record.serviceArea.blmPermitText = ($blm.Raw -join ' | '); [void]$actions.Add('blmText') }
    if($blm.Districts.Count -gt 0 -and ((-not $record.serviceArea.blmDistricts) -or @($record.serviceArea.blmDistricts).Count -eq 0)){
      $record.serviceArea.blmDistricts = @($blm.Districts)
      $record.serviceArea.blmDistrictIds = @($blm.DistrictIds)
      [void]$actions.Add('blmDistricts')
    }
  }

  [void]$report.Add([pscustomobject]@{ Outfitter=$row.Outfitter; MatchedRecord=$record.displayName; Action=if($actions.Count){($actions -join ', ')}else{'No change'}; Notes=if($skipBlm){'Dixie BLM not updated'}else{''} })
}

$masterByName=@{}
foreach($m in $master){ $masterByName[$m.displayName]=$m }
foreach($p in $public){ if($masterByName.ContainsKey($p.displayName)){ $p.contact = $masterByName[$p.displayName].contact; $p.serviceArea = $masterByName[$p.displayName].serviceArea } }

$master | ConvertTo-Json -Depth 100 | Set-Content $masterPath
$public | ConvertTo-Json -Depth 100 | Set-Content $publicPath
$report | Export-Csv -NoTypeInformation $reportPath
Write-Output "ROWS=$($rows.Count)"
Write-Output "MATCHED=$((($report | Where-Object MatchedRecord).Count))"
Write-Output "CHANGED=$((($report | Where-Object { $_.Action -ne 'No change' -and $_.Action -ne 'Skipped' }).Count))"
Write-Output "REPORT=$reportPath"
