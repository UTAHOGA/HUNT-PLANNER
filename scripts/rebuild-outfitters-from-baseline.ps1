param(
  [string]$WorkbookPath = 'C:\DOWNLOADS\UOGA_Master_Outfitters_URL_Validated.xlsx',
  [string]$ExistingMasterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json',
  [string]$OriginalSourcePath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters.json',
  [string]$LogoApprovedPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-sourcing-approved.json',
  [string]$ServiceOverridesPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-service-overrides.json',
  [string]$UsfsForestsPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\usfs-forests.json',
  [string]$UsfsDistrictsPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\usfs-districts.json',
  [string]$BlmDistrictsPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\blm-districts.json',
  [string]$OutMasterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json',
  [string]$OutPublicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json',
  [string]$OutReviewCsv = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-baseline-review.csv'
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-EntryText {
  param($Zip, [string]$Name)
  $entry = $Zip.GetEntry($Name)
  if (-not $entry) { throw "Missing ZIP entry: $Name" }
  $reader = New-Object IO.StreamReader($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Close() }
}

function Normalize-Key([string]$Value) {
  if (-not $Value) { return '' }
  return (($Value.ToLower() -replace '[^a-z0-9]+',' ').Trim())
}

function First-NonEmpty {
  param([Parameter(ValueFromRemainingArguments = $true)] $Values)
  foreach ($value in $Values) {
    if ($null -eq $value) { continue }
    $text = "$value".Trim()
    if ($text) { return $text }
  }
  return ''
}

function Slugify([string]$Value) {
  if (-not $Value) { return '' }
  return (($Value.ToLower() -replace '[^a-z0-9]+','-').Trim('-'))
}

function Canonical-BusinessName([string]$Value) {
  $text = Normalize-Key $Value
  if (-not $text) { return '' }
  $text = $text -replace '\b(guides and outfitters|guides outfitters|guide and outfitter|guide outfitter)\b','go'
  $text = $text -replace '\bg o\b','go'
  $text = $text -replace '\bg\/o\b','go'
  $text = $text -replace '\boutfitters\b','outfitters'
  $text = $text -replace '\boutfitting\b','outfitting'
  $text = $text -replace '\b(llc|l l c|inc|incorporated|co|company|corp|corporation|dba)\b',''
  return (($text -replace '\s+',' ').Trim())
}

function Clean-Text([string]$Value) {
  if (-not $Value) { return '' }
  return (($Value -replace '[\u0000-\u001F]',' ' -replace '\s+',' ').Trim())
}

function Ensure-Array($Value) {
  if ($null -eq $Value) { return @() }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    return @($Value | Where-Object { $_ -ne $null -and "$_".Trim() -ne '' })
  }
  $text = "$Value".Trim()
  if ($text) { return @($text) }
  return @()
}

function Unique-Array {
  param([object[]]$Values)
  return @($Values | Where-Object { $_ -ne $null -and "$_".Trim() -ne '' } | Select-Object -Unique)
}

function Join-Values([object[]]$Values) {
  return ((($Values | Where-Object { $_ } | ForEach-Object { "$_".Trim() }) -join ' ') -replace '\s+',' ').Trim()
}

function Match-ReferenceIds {
  param(
    [object[]]$Values,
    [object[]]$Db
  )
  $text = (Join-Values $Values).ToLower()
  if (-not $text) { return @() }
  $hits = New-Object System.Collections.ArrayList
  foreach ($item in @($Db)) {
    $aliases = @()
    if ($item.aliases) { $aliases += @($item.aliases) }
    if ($item.name) { $aliases += @($item.name) }
    if ($item.shortName) { $aliases += @($item.shortName) }
    foreach ($alias in $aliases) {
      $needle = "$alias".Trim().ToLower()
      if (-not $needle) { continue }
      if ($text -match ('(^|[^a-z])' + [regex]::Escape($needle) + '([^a-z]|$)')) {
        [void]$hits.Add([string]$item.id)
        break
      }
    }
  }
  return Unique-Array @($hits)
}

function Merge-UniqueValues {
  param(
    $Left,
    $Right
  )
  return Unique-Array (@(Ensure-Array $Left) + @(Ensure-Array $Right))
}

function Get-ServiceOverridesForRecord {
  param(
    [string]$DisplayName,
    [object[]]$Overrides
  )
  $key = Canonical-BusinessName $DisplayName
  $hits = @()
  foreach ($override in @($Overrides)) {
    $names = @()
    if ($override.matchDisplayNames) { $names += @($override.matchDisplayNames) }
    if ($override.aliases) { $names += @($override.aliases) }
    foreach ($name in $names) {
      if ((Canonical-BusinessName "$name") -eq $key) {
        $hits += $override
        break
      }
    }
  }
  return @($hits)
}

function Normalize-ListingType([string]$Value) {
  $text = Clean-Text $Value
  switch -Regex ($text) {
    '^Hunting$' { return 'Hunting' }
    '^Fishing$' { return 'Fishing' }
    '^Outfitter$' { return 'Outfitter' }
    default { return $text }
  }
}

function Normalize-UrlStatus([string]$Value) {
  $text = Clean-Text $Value
  switch ($text) {
    'Validated' { return 'Validated' }
    'Syntax OK / not live-checked' { return 'Syntax OK' }
    'Social URL' { return 'Social Only' }
    'Blank' { return 'Missing' }
    'Needs manual review' { return 'Review Needed' }
    default { return $text }
  }
}

function Normalize-UsfsForests {
  param([object[]]$Values)
  $text = Join-Values $Values
  $canon = New-Object System.Collections.ArrayList
  if ($text -match 'Ashley|Vernal|Roosevelt') { [void]$canon.Add('Ashley') }
  if ($text -match 'Dixie|Cedar|Escalante|Lake\s*Powell|Pine\s*Valley') { [void]$canon.Add('Dixie') }
  if ($text -match 'Fishlake') { [void]$canon.Add('Fishlake') }
  if ($text -match 'Manti\s*Lasal|Manti\s*LaSal|Manti') { [void]$canon.Add('Manti-La Sal') }
  if ($text -match 'Uwc|Uinta|Wasatch|Cache|Heber/?Kamas|Spanish\s*Fork|Pleasant\s*Grove|Duchesne|Evanston') { [void]$canon.Add('Uinta-Wasatch-Cache') }
  return Unique-Array @($canon)
}

function Normalize-BlmDistricts {
  param([object[]]$Values)
  $text = Join-Values $Values
  $canon = New-Object System.Collections.ArrayList
  if ($text -match 'Grand\s*Staircas|Grand\s*Staircase') { [void]$canon.Add('Grand Staircase') }
  if ($text -match 'Kanab') { [void]$canon.Add('Kanab') }
  if ($text -match 'Cedar\s*City|Cedar\s*\|\s*City') { [void]$canon.Add('Cedar City') }
  if ($text -match 'Fishlake') { [void]$canon.Add('Fishlake') }
  return Unique-Array @($canon)
}

function Sanitize-EmailValues {
  param([object[]]$Values)
  $combined = @()
  foreach ($value in $Values) {
    if ($null -eq $value) { continue }
    $text = "$value".Trim()
    if (-not $text) { continue }
    $combined += Extract-Emails $text
  }
  $unique = Unique-Array $combined
  $filtered = foreach ($email in $unique) {
    $parts = $email -split '@', 2
    if ($parts.Count -ne 2) { continue }
    $local = $parts[0]
    $domain = $parts[1]
    $shadowed = $false
    foreach ($other in $unique) {
      if ($other -eq $email) { continue }
      $otherParts = $other -split '@', 2
      if ($otherParts.Count -ne 2) { continue }
      if ($otherParts[1] -ne $domain) { continue }
      if ($otherParts[0].Length -gt $local.Length -and $otherParts[0].EndsWith($local)) {
        $shadowed = $true
        break
      }
    }
    if (-not $shadowed) { $email }
  }
  return Unique-Array $filtered
}

function Sanitize-PhoneValues {
  param([object[]]$Values)
  $combined = New-Object System.Collections.ArrayList
  $seen = @{}
  foreach ($value in $Values) {
    if ($null -eq $value) { continue }
    $text = "$value".Trim()
    if (-not $text) { continue }
    foreach ($phone in @(Extract-Phones $text)) {
      $digits = ($phone -replace '[^\d]','')
      if (-not $digits) { continue }
      if ($seen.ContainsKey($digits)) {
        $existing = [string]$seen[$digits]
        if ($existing -notmatch '[\(\)\-\.\s]' -and $phone -match '[\(\)\-\.\s]') {
          $seen[$digits] = $phone
        }
        continue
      }
      $seen[$digits] = $phone
      [void]$combined.Add($phone)
    }
  }
  return Unique-Array @($combined)
}

function Split-MultiValue([string]$Value) {
  $text = Clean-Text $Value
  if (-not $text) { return @() }
  $pieces = $text -split '\s{2,}|[\r\n]+| ::: '
  return Unique-Array ($pieces | ForEach-Object { Clean-Text $_ })
}

function Extract-Emails([string]$Value) {
  if (-not $Value) { return @() }
  $matches = [regex]::Matches($Value, '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', 'IgnoreCase')
  return Unique-Array ($matches | ForEach-Object { $_.Value.ToLower() })
}

function Extract-Phones([string]$Value) {
  if (-not $Value) { return @() }
  $matches = [regex]::Matches($Value, '(?:(?:\+?1[\s\-.]*)?(?:\(?\d{3}\)?[\s\-.]*)\d{3}[\s\-.]*\d{4})')
  return Unique-Array ($matches | ForEach-Object { Clean-Text $_.Value })
}

function Extract-Urls([string]$Value) {
  if (-not $Value) { return @() }
  $matches = [regex]::Matches($Value, 'https?://[^\s]+', 'IgnoreCase')
  $cleaned = foreach ($match in $matches) {
    $candidate = $match.Value.Trim()
    $candidate = $candidate -replace '%20:::%20.*$',''
    $candidate = $candidate -replace ':::.+$',''
    $candidate = $candidate -replace '\|.+$',''
    $candidate = $candidate.TrimEnd('/ ')
    if ($candidate) { $candidate }
  }
  return Unique-Array $cleaned
}

function Split-CsvField([string]$Value) {
  $text = Clean-Text $Value
  if (-not $text) { return @() }
  $text = $text -replace '&#8211;', '-'
  return Unique-Array (($text -split '\s*,\s*|[\r\n]+') | ForEach-Object { Clean-Text $_ })
}

function Get-WebsiteHost([string]$Url) {
  $text = Clean-Text $Url
  if (-not $text) { return '' }
  try {
    $uri = [Uri]$text
    return ($uri.Host.ToLower() -replace '^www\.','')
  } catch {
    return ''
  }
}

function Select-PreferredEmail([string[]]$Emails, [string]$Website, [string]$Fallback) {
  $all = Unique-Array @($Emails + (Ensure-Array $Fallback))
  if (-not $all.Count) { return '' }
  $hostKey = Get-WebsiteHost $Website
  if ($hostKey) {
    $domainMatch = $all | Where-Object { $_ -match ('@' + [regex]::Escape($hostKey) + '$') } | Select-Object -First 1
    if ($domainMatch) { return $domainMatch }
  }
  return ($all | Select-Object -First 1)
}

function Clean-MailingAddress([string]$Street, [string]$City, [string]$State, [string]$LegacyAddress) {
  $streetText = Clean-Text $Street
  $cityText = Clean-Text $City
  $stateText = (Clean-Text $State).ToUpper()
  $legacyText = Clean-Text $LegacyAddress
  $parts = @($streetText, $cityText, $stateText) | Where-Object { $_ }
  $candidate = ($parts -join ', ')
  if ($candidate -match ', \d{4}$') {
    $candidate = $candidate -replace ', \d{4}$',''
  }
  if ($candidate -and $candidate -notmatch '\d' -and $candidate -notmatch ',') {
    $candidate = ''
  }
  if ($candidate -and $candidate -notmatch '\d' -and $legacyText -match '\d') {
    return $legacyText
  }
  if ($legacyText -and $legacyText -notmatch '\d' -and $legacyText -notmatch ',') {
    $legacyText = ''
  }
  return First-NonEmpty $candidate $legacyText ''
}

function Get-CellText {
  param($Cell, $Ns, [string[]]$SharedStrings)
  if (-not $Cell) { return '' }
  $type = [string]$Cell.t
  if ($type -eq 'inlineStr') {
    $node = $Cell.SelectSingleNode('./x:is', $Ns)
    if ($node) {
      return (($node.SelectNodes('.//x:t', $Ns) | ForEach-Object { $_.'#text' }) -join '')
    }
  }
  $vNode = $Cell.SelectSingleNode('./x:v', $Ns)
  if (-not $vNode) { return '' }
  $raw = [string]$vNode.InnerText
  if ($type -eq 's') {
    $idx = [int]$raw
    if ($idx -ge 0 -and $idx -lt $SharedStrings.Count) { return $SharedStrings[$idx] }
  }
  return $raw
}

$existingMaster = @()
if (Test-Path $ExistingMasterPath) {
  $existingMaster = @(Get-Content $ExistingMasterPath -Raw | ConvertFrom-Json)
}
$originalSource = @()
if (Test-Path $OriginalSourcePath) {
  $originalSource = @(Get-Content $OriginalSourcePath -Raw | ConvertFrom-Json)
}
$logoApproved = @()
if (Test-Path $LogoApprovedPath) {
  $logoApproved = @(Get-Content $LogoApprovedPath -Raw | ConvertFrom-Json)
}

$serviceOverrides = @()
if (Test-Path $ServiceOverridesPath) {
  $serviceOverrides = @(Get-Content $ServiceOverridesPath -Raw | ConvertFrom-Json)
}

$usfsForestsDb = @()
if (Test-Path $UsfsForestsPath) {
  $usfsForestsDb = @(Get-Content $UsfsForestsPath -Raw | ConvertFrom-Json)
}

$usfsDistrictsDb = @()
if (Test-Path $UsfsDistrictsPath) {
  $usfsDistrictsDb = @(Get-Content $UsfsDistrictsPath -Raw | ConvertFrom-Json)
}

$blmDistrictsDb = @()
if (Test-Path $BlmDistrictsPath) {
  $blmDistrictsDb = @(Get-Content $BlmDistrictsPath -Raw | ConvertFrom-Json)
}

$existingByKey = @{}
$existingByCanonical = @{}
foreach ($row in $existingMaster) {
  $keys = @(
    Normalize-Key $row.displayName,
    Normalize-Key $row.businessName,
    Normalize-Key $row.legalBusinessName
  ) | Where-Object { $_ }
  foreach ($key in $keys) {
    if (-not $existingByKey.ContainsKey($key)) {
      $existingByKey[$key] = $row
    }
  }
  $canonical = Canonical-BusinessName (First-NonEmpty $row.displayName $row.businessName $row.legalBusinessName)
  if ($canonical -and -not $existingByCanonical.ContainsKey($canonical)) {
    $existingByCanonical[$canonical] = $row
  }
}

$originalByKey = @{}
$originalByCanonical = @{}
foreach ($row in $originalSource) {
  $name = First-NonEmpty $row.listingName $row.displayName $row.businessName
  $keys = @(Normalize-Key $name, Normalize-Key $row.listingName, Normalize-Key $row.businessName) | Where-Object { $_ }
  foreach ($key in $keys) {
    if (-not $originalByKey.ContainsKey($key)) { $originalByKey[$key] = $row }
  }
  $canonical = Canonical-BusinessName $name
  if ($canonical -and -not $originalByCanonical.ContainsKey($canonical)) {
    $originalByCanonical[$canonical] = $row
  }
}

$logoByHost = @{}
$logoByCanonical = @{}
foreach ($row in $logoApproved) {
  $hostKey = Get-WebsiteHost $row.sourcePageUrl
  if ($hostKey -and -not $logoByHost.ContainsKey($hostKey)) {
    $logoByHost[$hostKey] = $row.selectedLogoUrl
  }
  $canonical = Canonical-BusinessName ($row.id -replace '^outfitter-','' -replace '-',' ')
  if ($canonical -and -not $logoByCanonical.ContainsKey($canonical)) {
    $logoByCanonical[$canonical] = $row.selectedLogoUrl
  }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($WorkbookPath)
try {
  $sharedStrings = @()
  $sharedEntry = $zip.GetEntry('xl/sharedStrings.xml')
  if ($sharedEntry) {
    [xml]$sharedXml = Get-EntryText $zip 'xl/sharedStrings.xml'
    $sharedNs = New-Object System.Xml.XmlNamespaceManager($sharedXml.NameTable)
    $sharedNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    foreach ($si in $sharedXml.SelectNodes('//x:si', $sharedNs)) {
      $sharedStrings += (($si.SelectNodes('.//x:t', $sharedNs) | ForEach-Object { $_.'#text' }) -join '')
    }
  }

  [xml]$sheetXml = Get-EntryText $zip 'xl/worksheets/sheet1.xml'
  $sheetNs = New-Object System.Xml.XmlNamespaceManager($sheetXml.NameTable)
  $sheetNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $rows = @($sheetXml.SelectNodes('//x:sheetData/x:row', $sheetNs))
}
finally {
  $zip.Dispose()
}

if (-not $rows.Count) { throw 'No worksheet rows found.' }

$headers = @{}
$headerRow = $rows[0]
foreach ($cell in $headerRow.SelectNodes('./x:c', $sheetNs)) {
  $ref = [string]$cell.r
  $col = ($ref -replace '\d','')
  $headers[$col] = Clean-Text (Get-CellText $cell $sheetNs $sharedStrings)
}

$rebuilt = @()
for ($i = 1; $i -lt $rows.Count; $i++) {
  $rowNode = $rows[$i]
  $cells = @{}
  foreach ($cell in $rowNode.SelectNodes('./x:c', $sheetNs)) {
    $ref = [string]$cell.r
    $col = ($ref -replace '\d','')
    $cells[$col] = Clean-Text (Get-CellText $cell $sheetNs $sharedStrings)
  }

  $businessName = Clean-Text $cells['A']
  if (-not $businessName) { continue }

  $key = Normalize-Key $businessName
  $canonical = Canonical-BusinessName $businessName
  $legacy = if ($existingByKey.ContainsKey($key)) { $existingByKey[$key] } elseif ($existingByCanonical.ContainsKey($canonical)) { $existingByCanonical[$canonical] } else { $null }
  $original = if ($originalByKey.ContainsKey($key)) { $originalByKey[$key] } elseif ($originalByCanonical.ContainsKey($canonical)) { $originalByCanonical[$canonical] } else { $null }

  $ownerNames = Unique-Array @(
    Split-MultiValue $cells['B']
    Split-MultiValue $cells['C']
    Ensure-Array $legacy.contact.ownerNames
    Ensure-Array $original.ownerName
  )
  $workbookPhones = Sanitize-PhoneValues @(
    Extract-Phones $cells['D']
    Extract-Phones $cells['E']
  )
  $phones = $workbookPhones

  $workbookEmails = Sanitize-EmailValues @(
    Extract-Emails $cells['F']
    Extract-Emails $cells['G']
  )
  $emails = $workbookEmails
  $rawWebsites = Unique-Array @(
    Extract-Urls $cells['O']
    Extract-Urls $cells['H']
    Ensure-Array $legacy.contact.website
    Ensure-Array $legacy.contact.facebookUrl
    Ensure-Array $legacy.contact.instagramUrl
  )
  $primaryWebsite = $rawWebsites | Where-Object { $_ -notmatch 'facebook\.com|instagram\.com' } | Select-Object -First 1
  $facebookUrl = $rawWebsites | Where-Object { $_ -match 'facebook\.com' } | Select-Object -First 1
  $instagramUrl = $rawWebsites | Where-Object { $_ -match 'instagram\.com' } | Select-Object -First 1
  if (-not $primaryWebsite) { $primaryWebsite = First-NonEmpty $legacy.contact.website $original.website '' }
  if (-not $facebookUrl) { $facebookUrl = First-NonEmpty $legacy.contact.facebookUrl '' }
  if (-not $instagramUrl) { $instagramUrl = First-NonEmpty $legacy.contact.instagramUrl '' }
  $bestEmail = Select-PreferredEmail $emails $primaryWebsite (First-NonEmpty $legacy.contact.emailPrimary $original.email)

  $mailingAddress = Clean-MailingAddress $cells['I'] $cells['J'] $cells['K'] (First-NonEmpty $legacy.headquarters.mailingAddress '')

  $notes = Unique-Array @(
    Split-MultiValue $cells['N']
    Split-MultiValue $cells['Q']
    Ensure-Array $legacy.internal.reviewNotes
  )
  $activity = if ($cells['N'] -match 'Fishing') { 'Fishing' } elseif ($cells['N'] -match 'Hunting') { 'Hunting' } else { '' }
  $primaryHost = Get-WebsiteHost $primaryWebsite
  $facebookHost = Get-WebsiteHost $facebookUrl
  $legacyLogo = First-NonEmpty $legacy.branding.logoUrl ''
  if ($legacyLogo) {
    $legacyLogoHost = Get-WebsiteHost $legacyLogo
    if ($legacyLogoHost -and $primaryHost -and $legacyLogoHost -ne $primaryHost -and $legacyLogoHost -notmatch 'facebook\.com|instagram\.com|fbcdn\.net|cdninstagram\.com') {
      $legacyLogo = ''
    }
    if ($legacyLogoHost -match 'fbcdn\.net|cdninstagram\.com' -and -not $facebookUrl -and -not $instagramUrl) {
      $legacyLogo = ''
    }
  }
  $websiteLogo = $(if ($primaryHost -and $primaryHost -notmatch 'facebook\.com|instagram\.com') { $logoByHost[$primaryHost] })
  $socialLogo = $(if ($facebookHost -and $facebookHost -notmatch 'facebook\.com|instagram\.com') { $logoByHost[$facebookHost] })
  if ($legacyLogo -and $legacyLogo -match 'fbcdn\.net|cdninstagram\.com' -and $primaryWebsite -and -not $websiteLogo -and -not $logoByCanonical[$canonical] -and -not $original.logoUrl) {
    $legacyLogo = ''
  }
  $logoUrl = First-NonEmpty `
    $original.logoUrl `
    $websiteLogo `
    $socialLogo `
    $logoByCanonical[$canonical] `
    $legacyLogo `
    ''

  $usfsRaw = Unique-Array @(
    Split-CsvField $cells['L']
    Ensure-Array $legacy.serviceArea.usfsPermitAreasRaw
  )
  $blmRaw = Unique-Array @(
    Split-CsvField $cells['M']
    Ensure-Array $legacy.serviceArea.blmPermitAreasRaw
  )
  $usfs = if ($usfsRaw.Count) {
    Normalize-UsfsForests $usfsRaw
  } else {
    Unique-Array @(
      Ensure-Array $legacy.serviceArea.usfsForests
      Ensure-Array $original.usfsForests
    )
  }
  $blm = if ($blmRaw.Count) {
    Normalize-BlmDistricts $blmRaw
  } else {
    Unique-Array @(
      Ensure-Array $legacy.serviceArea.blmDistricts
      Ensure-Array $original.blmDistricts
    )
  }
  $usfsForestIds = if ($usfsRaw.Count) {
    Match-ReferenceIds $usfsRaw $usfsForestsDb
  } else {
    Ensure-Array $legacy.serviceArea.usfsForestIds
  }
  $usfsDistrictIds = if ($usfsRaw.Count) {
    Match-ReferenceIds $usfsRaw $usfsDistrictsDb
  } else {
    Ensure-Array $legacy.serviceArea.usfsDistrictIds
  }
  if (-not $usfsForestIds.Count -and $usfs.Count) {
    $usfsForestIds = Match-ReferenceIds $usfs $usfsForestsDb
  }
  $blmDistrictIds = if ($blmRaw.Count) {
    Match-ReferenceIds $blmRaw $blmDistrictsDb
  } else {
    Ensure-Array $legacy.serviceArea.blmDistrictIds
  }
  if (-not $blmDistrictIds.Count -and $blm.Count) {
    $blmDistrictIds = Match-ReferenceIds $blm $blmDistrictsDb
  }

  $displayName = $businessName
  $matchedOverrides = Get-ServiceOverridesForRecord $displayName $serviceOverrides
  $overrideUsfsForestIds = Unique-Array @($matchedOverrides | ForEach-Object { Ensure-Array $_.serviceArea.usfsForestIds })
  $overrideUsfsDistrictIds = Unique-Array @($matchedOverrides | ForEach-Object { Ensure-Array $_.serviceArea.usfsDistrictIds })
  $overrideBlmDistrictIds = Unique-Array @($matchedOverrides | ForEach-Object { Ensure-Array $_.serviceArea.blmDistrictIds })
  $overrideZoneTags = Unique-Array @($matchedOverrides | ForEach-Object { Ensure-Array $_.serviceArea.zoneTags })

  if ($overrideUsfsForestIds.Count) {
    $usfsForestIds = Merge-UniqueValues $usfsForestIds $overrideUsfsForestIds
  }
  if ($overrideUsfsDistrictIds.Count) {
    $usfsDistrictIds = Merge-UniqueValues $usfsDistrictIds $overrideUsfsDistrictIds
  }
  if ($overrideBlmDistrictIds.Count) {
    $blmDistrictIds = Merge-UniqueValues $blmDistrictIds $overrideBlmDistrictIds
  }
  if ($overrideUsfsForestIds.Count) {
    $usfs = Merge-UniqueValues $usfs ($usfsForestsDb | Where-Object { $overrideUsfsForestIds -contains $_.id } | ForEach-Object { $_.name })
  }
  if ($overrideBlmDistrictIds.Count) {
    $blm = Merge-UniqueValues $blm ($blmDistrictsDb | Where-Object { $overrideBlmDistrictIds -contains $_.id } | ForEach-Object { $_.name })
  }

  $record = [ordered]@{
    id = First-NonEmpty $legacy.id ("outfitter-" + (Slugify $displayName))
    slug = First-NonEmpty $legacy.slug (Slugify $displayName)
    displayName = $displayName
    legalBusinessName = First-NonEmpty $legacy.legalBusinessName ''
    listingType = Normalize-ListingType $(if ($activity) { $activity } else { First-NonEmpty $legacy.listingType 'Outfitter' })
    publicStatus = First-NonEmpty $legacy.publicStatus 'active'
    verificationStatus = First-NonEmpty $legacy.verificationStatus 'Validated'
    certLevel = First-NonEmpty $legacy.certLevel ''
    memberStatus = First-NonEmpty $legacy.memberStatus 'unknown'
    referralStatus = First-NonEmpty $legacy.referralStatus 'eligible'
    referralPriority = First-NonEmpty $legacy.referralPriority 'standard'
    referralRotationGroup = First-NonEmpty $legacy.referralRotationGroup 'uoga-master-default'
    contact = [ordered]@{
      primaryName = First-NonEmpty ($ownerNames | Select-Object -First 1) $legacy.contact.primaryName ''
      ownerNames = $ownerNames
      phonePrimary = First-NonEmpty ($phones | Select-Object -First 1) $legacy.contact.phonePrimary ''
      phoneNumbers = $phones
      emailPrimary = $bestEmail
      emailAddresses = $emails
      website = $primaryWebsite
      facebookUrl = $facebookUrl
      instagramUrl = $instagramUrl
      instagramHandle = First-NonEmpty $legacy.contact.instagramHandle ''
      youtubeUrl = First-NonEmpty $legacy.contact.youtubeUrl ''
    }
    branding = [ordered]@{
      logoUrl = $logoUrl
      heroImageUrl = First-NonEmpty $legacy.branding.heroImageUrl ''
      cardImageUrl = First-NonEmpty $legacy.branding.cardImageUrl ''
    }
    headquarters = [ordered]@{
      city = First-NonEmpty $cells['J'] $legacy.headquarters.city $original.city ''
      region = First-NonEmpty $legacy.headquarters.region $cells['K'] 'Utah'
      state = First-NonEmpty $cells['K'] $legacy.headquarters.state 'UT'
      mailingAddress = $mailingAddress
      publicMeetingLocation = First-NonEmpty $legacy.headquarters.publicMeetingLocation ''
      latitude = if ($null -ne $legacy.headquarters.latitude) { $legacy.headquarters.latitude } elseif ($null -ne $original.latitude) { $original.latitude } else { $null }
      longitude = if ($null -ne $legacy.headquarters.longitude) { $legacy.headquarters.longitude } elseif ($null -ne $original.longitude) { $original.longitude } else { $null }
    }
    serviceArea = [ordered]@{
      speciesServed = @((@(Ensure-Array $legacy.serviceArea.speciesServed) + @(Ensure-Array $original.speciesServed)) | Select-Object -Unique)
      unitsServed = @((@(Ensure-Array $legacy.serviceArea.unitsServed) + @(Ensure-Array $original.unitsServed)) | Select-Object -Unique)
      usfsForests = @(Ensure-Array $usfs)
      usfsForestIds = @(Ensure-Array $usfsForestIds)
      usfsDistrictIds = @(Ensure-Array $usfsDistrictIds)
      usfsPermitAreasRaw = @(Ensure-Array $usfsRaw)
      usfsPermitText = Clean-Text $cells['L']
      blmDistricts = @(Ensure-Array $blm)
      blmDistrictIds = @(Ensure-Array $blmDistrictIds)
      blmPermitAreasRaw = @(Ensure-Array $blmRaw)
      blmPermitText = Clean-Text $cells['M']
      zoneTags = @(Ensure-Array $overrideZoneTags)
      countiesServed = @(Ensure-Array $legacy.serviceArea.countiesServed | Select-Object -Unique)
      wmasServed = @(Ensure-Array $legacy.serviceArea.wmasServed | Select-Object -Unique)
      stateParks = @(Ensure-Array $legacy.serviceArea.stateParks | Select-Object -Unique)
      sitla = @(Ensure-Array $legacy.serviceArea.sitla | Select-Object -Unique)
      statewide = if ($null -ne $legacy.serviceArea.statewide) { [bool]$legacy.serviceArea.statewide } else { $false }
    }
    services = [ordered]@{
      guidedHunts = if ($activity -eq 'Hunting') { $true } elseif ($null -ne $legacy.services.guidedHunts) { [bool]$legacy.services.guidedHunts } else { $false }
      diySupport = if ($null -ne $legacy.services.diySupport) { [bool]$legacy.services.diySupport } else { $false }
      trespassAccess = if ($null -ne $legacy.services.trespassAccess) { [bool]$legacy.services.trespassAccess } else { $false }
      lodgingIncluded = if ($null -ne $legacy.services.lodgingIncluded) { [bool]$legacy.services.lodgingIncluded } else { $false }
      mealsIncluded = if ($null -ne $legacy.services.mealsIncluded) { [bool]$legacy.services.mealsIncluded } else { $false }
      packTrips = if ($null -ne $legacy.services.packTrips) { [bool]$legacy.services.packTrips } else { $false }
      airportPickup = if ($null -ne $legacy.services.airportPickup) { [bool]$legacy.services.airportPickup } else { $false }
      youthHunts = if ($null -ne $legacy.services.youthHunts) { [bool]$legacy.services.youthHunts } else { $false }
      archery = if ($null -ne $legacy.services.archery) { [bool]$legacy.services.archery } else { $false }
      muzzleloader = if ($null -ne $legacy.services.muzzleloader) { [bool]$legacy.services.muzzleloader } else { $false }
      rifle = if ($null -ne $legacy.services.rifle) { [bool]$legacy.services.rifle } else { $false }
      hamss = if ($null -ne $legacy.services.hamss) { [bool]$legacy.services.hamss } else { $false }
      otherServices = @(Ensure-Array $legacy.services.otherServices | Select-Object -Unique)
    }
    huntFit = [ordered]@{
      trophyFocus = if ($null -ne $legacy.huntFit.trophyFocus) { [bool]$legacy.huntFit.trophyFocus } else { $false }
      generalSeasonFocus = if ($null -ne $legacy.huntFit.generalSeasonFocus) { [bool]$legacy.huntFit.generalSeasonFocus } else { $false }
      limitedEntryFocus = if ($null -ne $legacy.huntFit.limitedEntryFocus) { [bool]$legacy.huntFit.limitedEntryFocus } else { $false }
      oilFocus = if ($null -ne $legacy.huntFit.oilFocus) { [bool]$legacy.huntFit.oilFocus } else { $false }
      speciesSummary = First-NonEmpty $legacy.huntFit.speciesSummary ''
      terrainSummary = First-NonEmpty $legacy.huntFit.terrainSummary ''
      publicLandStrength = First-NonEmpty $legacy.huntFit.publicLandStrength ''
      accessSummary = First-NonEmpty $legacy.huntFit.accessSummary ''
    }
    compliance = [ordered]@{
      stateLicenseNumber = First-NonEmpty $legacy.compliance.stateLicenseNumber ''
      guideLicenseNumber = First-NonEmpty $legacy.compliance.guideLicenseNumber ''
      outfitterLicenseNumber = First-NonEmpty $legacy.compliance.outfitterLicenseNumber ''
      insuranceVerified = if ($null -ne $legacy.compliance.insuranceVerified) { [bool]$legacy.compliance.insuranceVerified } else { $false }
      contractOnFile = if ($null -ne $legacy.compliance.contractOnFile) { [bool]$legacy.compliance.contractOnFile } else { $false }
      vettingReviewedAt = First-NonEmpty $legacy.compliance.vettingReviewedAt ''
      vettingReviewedBy = First-NonEmpty $legacy.compliance.vettingReviewedBy ''
      nextReviewDue = First-NonEmpty $legacy.compliance.nextReviewDue ''
    }
    publication = [ordered]@{
      shortDescription = First-NonEmpty $legacy.publication.shortDescription ''
      longDescription = First-NonEmpty $legacy.publication.longDescription ''
      whyListed = 'Baseline workbook: UOGA_Master_Outfitters_URL_Validated.xlsx'
      featuredRank = if ($null -ne $legacy.publication.featuredRank) { [int]$legacy.publication.featuredRank } else { 0 }
      showOnPlanner = $true
      showOnPublicList = $true
      showOnHomepage = if ($null -ne $legacy.publication.showOnHomepage) { [bool]$legacy.publication.showOnHomepage } else { $false }
    }
    internal = [ordered]@{
      sourceNotes = @('Baseline workbook: UOGA_Master_Outfitters_URL_Validated.xlsx')
      dataCompleteness = 'validated-baseline'
      lastNormalizedAt = (Get-Date -Format 'yyyy-MM-dd')
      lastEditedBy = 'Codex'
      migrationSource = 'UOGA_Master_Outfitters_URL_Validated.xlsx'
      reviewNotes = $notes
      appliedServiceOverrides = @($matchedOverrides | ForEach-Object { $_.id })
    }
    businessName = $displayName
    urlStatus = Normalize-UrlStatus $cells['P']
    validationNote = Clean-Text $cells['Q']
  }

  $rebuilt += [pscustomobject]$record
}

$rebuilt = @($rebuilt | Sort-Object displayName)
$public = @($rebuilt | Where-Object { $_.listingType -eq 'Hunting' -or $_.services.guidedHunts })

$review = $rebuilt | Select-Object `
  @{Name='Business Name';Expression={$_.displayName}},
  @{Name='Listing Type';Expression={$_.listingType}},
  @{Name='Owner';Expression={$_.contact.primaryName}},
  @{Name='Phone';Expression={$_.contact.phonePrimary}},
  @{Name='Website';Expression={$_.contact.website}},
  @{Name='Facebook';Expression={$_.contact.facebookUrl}},
  @{Name='Instagram';Expression={$_.contact.instagramUrl}},
  @{Name='Email';Expression={$_.contact.emailPrimary}},
  @{Name='Address';Expression={$_.headquarters.mailingAddress}},
  @{Name='USFS';Expression={($_.serviceArea.usfsForests -join ' | ')}},
  @{Name='USFS Forest IDs';Expression={($_.serviceArea.usfsForestIds -join ' | ')}},
  @{Name='USFS District IDs';Expression={($_.serviceArea.usfsDistrictIds -join ' | ')}},
  @{Name='USFS Raw';Expression={($_.serviceArea.usfsPermitAreasRaw -join ' | ')}},
  @{Name='BLM';Expression={($_.serviceArea.blmDistricts -join ' | ')}},
  @{Name='BLM District IDs';Expression={($_.serviceArea.blmDistrictIds -join ' | ')}},
  @{Name='BLM Raw';Expression={($_.serviceArea.blmPermitAreasRaw -join ' | ')}},
  @{Name='Zone Tags';Expression={($_.serviceArea.zoneTags -join ' | ')}},
  @{Name='Logo';Expression={$_.branding.logoUrl}},
  @{Name='URL Status';Expression={$_.urlStatus}},
  @{Name='Validation Note';Expression={$_.validationNote}}

$rebuilt | ConvertTo-Json -Depth 12 | Set-Content $OutMasterPath
$public | ConvertTo-Json -Depth 12 | Set-Content $OutPublicPath
$review | Export-Csv -NoTypeInformation -Path $OutReviewCsv

Write-Output ("REBUILT_COUNT=" + $rebuilt.Count)
Write-Output ("PUBLIC_COUNT=" + $public.Count)
Write-Output ("MASTER=" + $OutMasterPath)
Write-Output ("PUBLIC=" + $OutPublicPath)
Write-Output ("REVIEW=" + $OutReviewCsv)
