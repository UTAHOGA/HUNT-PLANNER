param(
  [string]$GoogleCsv = "C:\DOCUMENTS\outfitter's database\outfitters - google contacts.csv",
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$CompareCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-google-compare-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-google-unmatched.csv",
  [string]$SnapshotJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-google-import-snapshot.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Normalize-Text {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $text = $Value.ToUpperInvariant().Trim()
  $text = $text -replace "DBA", " "
  $text = $text -replace "&", " AND "
  $text = $text -replace "[^A-Z0-9]+", " "
  $text = $text -replace "\b(LLC|INC|L L C|CO|COMPANY|GUIDES|GUIDE|OUTFITTER|OUTFITTERS)\b", " "
  $text = $text -replace "\s+", " "
  return $text.Trim()
}

function Normalize-Email {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $fixed = $Value.Trim().ToLowerInvariant()
  $fixed = $fixed.Replace("ﬂ", "fl").Replace("ﬁ", "fi")
  return $fixed
}

function Normalize-Phone {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $digits = ($Value -replace "[^\d]", "")
  if ($digits.Length -eq 11 -and $digits.StartsWith("1")) {
    $digits = $digits.Substring(1)
  }
  return $digits
}

function Add-UniqueValue {
  param(
    [System.Collections.ArrayList]$List,
    [string]$Value
  )
  if ([string]::IsNullOrWhiteSpace($Value)) { return }
  if (-not $List.Contains($Value)) {
    [void]$List.Add($Value)
  }
}

function Get-NotesMap {
  param([string]$Notes)
  $map = @{}
  if ([string]::IsNullOrWhiteSpace($Notes)) { return $map }
  $lines = $Notes -split "(`r`n|`n|`r)"
  foreach ($raw in $lines) {
    $line = [string]$raw
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    if ($line -match '^\s*([^:]+):\s*(.*)$') {
      $key = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (-not $map.ContainsKey($key)) {
        $map[$key] = [System.Collections.ArrayList]::new()
      }
      if ($value) {
        [void]$map[$key].Add($value)
      }
    }
  }
  return $map
}

function First-MapValue {
  param(
    [hashtable]$Map,
    [string[]]$Keys
  )
  foreach ($key in $Keys) {
    if ($Map.ContainsKey($key) -and $Map[$key].Count -gt 0) {
      return [string]$Map[$key][0]
    }
  }
  return ""
}

function All-MapValues {
  param(
    [hashtable]$Map,
    [string[]]$Keys
  )
  $result = [System.Collections.ArrayList]::new()
  foreach ($key in $Keys) {
    if ($Map.ContainsKey($key)) {
      foreach ($value in $Map[$key]) {
        if (-not [string]::IsNullOrWhiteSpace($value)) {
          Add-UniqueValue -List $result -Value ([string]$value)
        }
      }
    }
  }
  return @($result)
}

function Clean-Website {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  $text = $Value.Trim()
  if ($text -match '^(https?://\S+)') {
    return $matches[1]
  }
  return ""
}

function Parse-GoogleRow {
  param($Row)

  $notesMap = Get-NotesMap -Notes ([string]$Row.Notes)

  $business = First-MapValue -Map $notesMap -Keys @("OUTFITTER", "BUSINESS")
  if (-not $business) { $business = [string]$Row."Organization Name" }

  $owner = First-MapValue -Map $notesMap -Keys @("OWNER", "first last")
  if (-not $owner) {
    $owner = @($Row."First Name", $Row."Last Name" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join " "
  }

  $emails = [System.Collections.ArrayList]::new()
  foreach ($value in @(
      $Row."E-mail 1 - Value",
      $Row."E-mail 2 - Value",
      $Row."E-mail 3 - Value"
    )) {
    $email = Normalize-Email $value
    if ($email -and $email -notmatch '^https?://') {
      Add-UniqueValue -List $emails -Value $email
    }
  }
  foreach ($value in All-MapValues -Map $notesMap -Keys @("Email 1", "Email 2", "Email 3")) {
    $email = Normalize-Email $value
    if ($email -and $email -notmatch '^https?://') {
      Add-UniqueValue -List $emails -Value $email
    }
  }

  $phones = [System.Collections.ArrayList]::new()
  foreach ($value in @(
      $Row."Phone 1 - Value",
      $Row."Phone 2 - Value"
    )) {
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      Add-UniqueValue -List $phones -Value ([string]$value).Trim()
    }
  }
  foreach ($value in All-MapValues -Map $notesMap -Keys @("Phone 1", "Phone 2")) {
    if (-not [string]::IsNullOrWhiteSpace($value)) {
      Add-UniqueValue -List $phones -Value ([string]$value).Trim()
    }
  }

  $website = Clean-Website ([string]$Row."Website 1 - Value")
  if (-not $website) {
    $website = Clean-Website (First-MapValue -Map $notesMap -Keys @("WEBSITE"))
  }

  $address = [string]$Row."Address 1 - Formatted"
  if (-not $address) {
    $address = First-MapValue -Map $notesMap -Keys @("Address Full")
  }

  [PSCustomObject]@{
    businessName = [string]$business
    businessNorm = Normalize-Text $business
    organizationName = [string]$Row."Organization Name"
    owner = [string]$owner
    ownerNorm = Normalize-Text $owner
    emails = @($emails)
    phones = @($phones)
    phoneNorms = @($phones | ForEach-Object { Normalize-Phone $_ } | Where-Object { $_ })
    primaryEmail = if ($emails.Count -gt 0) { $emails[0] } else { "" }
    primaryPhone = if ($phones.Count -gt 0) { $phones[0] } else { "" }
    website = [string]$website
    address = [string]$address
    city = [string]$Row."Address 1 - City"
    region = [string]$Row."Address 1 - Region"
    postal = [string]$Row."Address 1 - Postal Code"
    ownerField = First-MapValue -Map $notesMap -Keys @("OWNER")
    outfitterField = First-MapValue -Map $notesMap -Keys @("OUTFITTER", "BUSINESS")
    huntingFishing = First-MapValue -Map $notesMap -Keys @("HUNTING OR FISHING")
    usfs = First-MapValue -Map $notesMap -Keys @("SUP's USFS", "SUP’s USFS")
    blm = First-MapValue -Map $notesMap -Keys @("SRP's BLM")
    sourceRow = $Row
  }
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100
$masterByName = @{}
$masterByEmail = @{}
$masterByPhone = @{}
$masterByOwner = @{}

foreach ($record in $master) {
  foreach ($name in @($record.displayName, $record.businessName, $record.legalBusinessName)) {
    $norm = Normalize-Text $name
    if ($norm -and -not $masterByName.ContainsKey($norm)) {
      $masterByName[$norm] = $record
    }
  }
  foreach ($email in @($record.contact.emailPrimary) + @($record.contact.emailAddresses)) {
    $norm = Normalize-Email $email
    if ($norm -and -not $masterByEmail.ContainsKey($norm)) {
      $masterByEmail[$norm] = $record
    }
  }
  foreach ($phone in @($record.contact.phonePrimary) + @($record.contact.phoneNumbers)) {
    $norm = Normalize-Phone $phone
    if ($norm -and -not $masterByPhone.ContainsKey($norm)) {
      $masterByPhone[$norm] = $record
    }
  }
  foreach ($owner in @($record.contact.primaryName) + @($record.contact.ownerNames)) {
    $norm = Normalize-Text $owner
    if ($norm -and -not $masterByOwner.ContainsKey($norm)) {
      $masterByOwner[$norm] = $record
    }
  }
}

$googleRows = Import-Csv $GoogleCsv
$parsedRows = foreach ($row in $googleRows) { Parse-GoogleRow -Row $row }

$report = [System.Collections.ArrayList]::new()
$unmatched = [System.Collections.ArrayList]::new()
$changedRecords = New-Object System.Collections.Generic.HashSet[string]

foreach ($row in $parsedRows) {
  if (-not $row.businessNorm -and -not $row.primaryEmail -and -not $row.primaryPhone) {
    continue
  }

  $match = $null
  $matchType = ""

  if ($row.businessNorm -and $masterByName.ContainsKey($row.businessNorm)) {
    $match = $masterByName[$row.businessNorm]
    $matchType = "business-name"
  }

  if (-not $match) {
    foreach ($email in $row.emails) {
      $emailNorm = Normalize-Email $email
      if ($emailNorm -and $masterByEmail.ContainsKey($emailNorm)) {
        $match = $masterByEmail[$emailNorm]
        $matchType = "email"
        break
      }
    }
  }

  if (-not $match) {
    foreach ($phoneNorm in $row.phoneNorms) {
      if ($phoneNorm -and $masterByPhone.ContainsKey($phoneNorm)) {
        $match = $masterByPhone[$phoneNorm]
        $matchType = "phone"
        break
      }
    }
  }

  if (-not $match) {
    $ownerNorm = Normalize-Text $row.owner
    if ($ownerNorm -and $masterByOwner.ContainsKey($ownerNorm)) {
      $match = $masterByOwner[$ownerNorm]
      $matchType = "owner"
    }
  }

  if (-not $match) {
    [void]$unmatched.Add([PSCustomObject]@{
      BusinessName = $row.businessName
      Owner = $row.owner
      PrimaryEmail = $row.primaryEmail
      PrimaryPhone = $row.primaryPhone
      Website = $row.website
      Address = $row.address
      USFS = $row.usfs
      BLM = $row.blm
      Source = "google contacts csv"
    })
    continue
  }

  $updates = [System.Collections.ArrayList]::new()

  if ([string]::IsNullOrWhiteSpace($match.businessName) -and $row.businessName) {
    $match | Add-Member -NotePropertyName businessName -NotePropertyValue $row.businessName -Force
    [void]$updates.Add("businessName")
  }
  if ([string]::IsNullOrWhiteSpace($match.displayName) -and $row.businessName) {
    $match.displayName = $row.businessName
    [void]$updates.Add("displayName")
  }

  if ($row.owner) {
    if ([string]::IsNullOrWhiteSpace($match.contact.primaryName)) {
      $match.contact.primaryName = $row.owner
      [void]$updates.Add("primaryName")
    }
    if (-not $match.contact.ownerNames) {
      $match.contact.ownerNames = @()
    }
    if ($row.owner -notin $match.contact.ownerNames) {
      $match.contact.ownerNames += $row.owner
      [void]$updates.Add("ownerNames+")
    }
  }

  foreach ($email in $row.emails) {
    if (-not $match.contact.emailAddresses) {
      $match.contact.emailAddresses = @()
    }
    if ($email -and $email -notin $match.contact.emailAddresses) {
      $match.contact.emailAddresses += $email
      [void]$updates.Add("email+")
    }
    if ([string]::IsNullOrWhiteSpace($match.contact.emailPrimary) -and $email) {
      $match.contact.emailPrimary = $email
      [void]$updates.Add("emailPrimary")
    }
  }

  foreach ($phone in $row.phones) {
    if (-not $match.contact.phoneNumbers) {
      $match.contact.phoneNumbers = @()
    }
    if ($phone -and $phone -notin $match.contact.phoneNumbers) {
      $match.contact.phoneNumbers += $phone
      [void]$updates.Add("phone+")
    }
    if ([string]::IsNullOrWhiteSpace($match.contact.phonePrimary) -and $phone) {
      $match.contact.phonePrimary = $phone
      [void]$updates.Add("phonePrimary")
    }
  }

  if ([string]::IsNullOrWhiteSpace($match.contact.website) -and $row.website -and $row.website -match '^https?://') {
    $match.contact.website = $row.website
    [void]$updates.Add("website")
  }

  if ([string]::IsNullOrWhiteSpace($match.headquarters.mailingAddress) -and $row.address) {
    $match.headquarters.mailingAddress = $row.address
    [void]$updates.Add("mailingAddress")
  }
  if ([string]::IsNullOrWhiteSpace($match.headquarters.city) -and $row.city) {
    $match.headquarters.city = $row.city
    [void]$updates.Add("city")
  }
  if ([string]::IsNullOrWhiteSpace($match.headquarters.region) -and $row.region) {
    $match.headquarters.region = $row.region
    [void]$updates.Add("region")
  }
  if ([string]::IsNullOrWhiteSpace($match.headquarters.state) -and $row.region) {
    $match.headquarters.state = $row.region
    [void]$updates.Add("state")
  }

  if ($row.usfs) {
    if (-not $match.serviceArea.usfsForests) { $match.serviceArea.usfsForests = @() }
    if ($row.usfs -notin $match.serviceArea.usfsForests) {
      $match.serviceArea.usfsForests += $row.usfs
      [void]$updates.Add("usfs")
    }
  }
  if ($row.blm) {
    if (-not $match.serviceArea.blmDistricts) { $match.serviceArea.blmDistricts = @() }
    if ($row.blm -notin $match.serviceArea.blmDistricts) {
      $match.serviceArea.blmDistricts += $row.blm
      [void]$updates.Add("blm")
    }
  }

  if (-not $match.internal.sourceNotes) {
    $match.internal.sourceNotes = @()
  }
  if ("Google contacts CSV compare merge" -notin $match.internal.sourceNotes) {
    $match.internal.sourceNotes += "Google contacts CSV compare merge"
  }

  if ($updates.Count -gt 0) {
    [void]$changedRecords.Add($match.id)
  }

  [void]$report.Add([PSCustomObject]@{
    GoogleBusinessName = $row.businessName
    GoogleOwner = $row.owner
    MatchType = $matchType
    MasterBusinessName = $match.displayName
    MasterId = $match.id
    PrimaryEmail = $row.primaryEmail
    PrimaryPhone = $row.primaryPhone
    Website = $row.website
    AppliedUpdates = ($updates -join " | ")
  })
}

$master | ConvertTo-Json -Depth 100 | Set-Content $MasterJson
$master | Where-Object { $_.publicStatus -eq "active" -and $_.publication.showOnPlanner } | ConvertTo-Json -Depth 100 | Set-Content "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json"
$parsedRows | Select-Object businessName, owner, primaryEmail, primaryPhone, website, address, usfs, blm | ConvertTo-Json -Depth 6 | Set-Content $SnapshotJson
$report | Export-Csv -NoTypeInformation $CompareCsv
$unmatched | Export-Csv -NoTypeInformation $UnmatchedCsv

Write-Output ("GOOGLE_ROWS=" + $parsedRows.Count)
Write-Output ("MATCHED=" + $report.Count)
Write-Output ("UNMATCHED=" + $unmatched.Count)
Write-Output ("MASTER_CHANGED=" + $changedRecords.Count)
