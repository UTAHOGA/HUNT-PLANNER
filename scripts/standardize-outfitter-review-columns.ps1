param()
$in = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-baseline-review.csv'
$out = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-baseline-standardized.csv'
$standards = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-column-standards.md'

function Split-Tokens([string]$text) {
  if (-not $text) { return @() }
  $parts = $text -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -ne '–' -and $_ -ne '-' }
  return @($parts)
}

function Unique-List($items) {
  @($items | Where-Object { $_ -and "$_.Trim()" -ne '' } | Select-Object -Unique)
}

function Normalize-ListingType([string]$value) {
  switch -Regex (($value ?? '').Trim()) {
    '^Hunting$' { 'Hunting'; break }
    '^Fishing$' { 'Fishing'; break }
    '^Outfitter$' { 'Outfitter'; break }
    default { (($value ?? '').Trim()) }
  }
}

function Normalize-UrlStatus([string]$value) {
  switch (($value ?? '').Trim()) {
    'Validated' { 'Validated' }
    'Syntax OK / not live-checked' { 'Syntax OK' }
    'Social URL' { 'Social Only' }
    'Blank' { 'Missing' }
    'Needs manual review' { 'Review Needed' }
    default { (($value ?? '').Trim()) }
  }
}

function Normalize-Usfs([string]$value) {
  $text = ($value ?? '')
  $canon = New-Object System.Collections.ArrayList
  if ($text -match 'Ashley|Vernal|Roosevelt') { [void]$canon.Add('Ashley') }
  if ($text -match 'Dixie|Cedar|Escalante|Lake\s*Powell|Pine\s*Valley') { [void]$canon.Add('Dixie') }
  if ($text -match 'Fishlake') { [void]$canon.Add('Fishlake') }
  if ($text -match 'Manti\s*Lasal|Manti\s*LaSal|Manti') { [void]$canon.Add('Manti-La Sal') }
  if ($text -match 'Uwc|Uinta|Wasatch|Cache|Heber/?Kamas|Spanish\s*Fork|Pleasant\s*Grove|Duchesne|Evanston') { [void]$canon.Add('Uinta-Wasatch-Cache') }
  return (Unique-List $canon) -join ' | '
}

function Normalize-Blm([string]$value) {
  $text = ($value ?? '')
  $canon = New-Object System.Collections.ArrayList
  if ($text -match 'Grand\s*Staircas|Grand\s*Staircase') { [void]$canon.Add('Grand Staircase') }
  if ($text -match 'Kanab') { [void]$canon.Add('Kanab') }
  if ($text -match 'Cedar\s*\|\s*City|Cedar\s*City') { [void]$canon.Add('Cedar City') }
  if ($text -match 'Fishlake') { [void]$canon.Add('Fishlake') }
  return (Unique-List $canon) -join ' | '
}

$rows = Import-Csv $in
$stdRows = foreach($r in $rows) {
  [pscustomobject]@{
    Outfitter = $r.Outfitter
    'Listing Type' = $r.'Listing Type'
    'Listing Type Standard' = Normalize-ListingType $r.'Listing Type'
    Owner = $r.Owner
    'Owner 2' = $r.'Owner 2'
    'Owner 3' = $r.'Owner 3'
    Phone = $r.Phone
    'Phone 2' = $r.'Phone 2'
    Website = $r.Website
    Facebook = $r.Facebook
    Instagram = $r.Instagram
    Email = $r.Email
    'Email 2' = $r.'Email 2'
    Address = $r.Address
    USFS = $r.USFS
    'USFS Standard' = Normalize-Usfs $r.USFS
    BLM = $r.BLM
    'BLM Standard' = Normalize-Blm $r.BLM
    Logo = $r.Logo
    'URL Status' = $r.'URL Status'
    'URL Status Standard' = Normalize-UrlStatus $r.'URL Status'
    'Validation Note' = $r.'Validation Note'
  }
}
$stdRows | Export-Csv -NoTypeInformation -Path $out

$md = @()
$md += '# Outfitter Column Standards'
$md += ''
$md += '## Listing Type'
$md += '- Hunting'
$md += '- Fishing'
$md += '- Outfitter'
$md += ''
$md += '## URL Status Standard'
$md += '- Validated'
$md += '- Syntax OK'
$md += '- Social Only'
$md += '- Missing'
$md += '- Review Needed'
$md += ''
$md += '## USFS Standard'
$md += '- Ashley'
$md += '- Dixie'
$md += '- Fishlake'
$md += '- Manti-La Sal'
$md += '- Uinta-Wasatch-Cache'
$md += ''
$md += '## BLM Standard'
$md += '- Grand Staircase'
$md += '- Kanab'
$md += '- Cedar City'
$md += '- Fishlake'
$md | Set-Content $standards

Write-Output "STANDARDIZED=$out"
Write-Output "STANDARDS=$standards"
Write-Output ('ROWS=' + $rows.Count)
