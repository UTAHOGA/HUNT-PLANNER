param(
  [string]$WixCsv = "C:\DOCUMENTS\outfitter's database\outfitters - wix download.csv",
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$CompareCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-wix-compare-report.csv",
  [string]$UnmatchedCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-wix-unmatched.csv",
  [string]$SnapshotJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-wix-import-snapshot.json"
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
  return $Value.Trim().ToLowerInvariant()
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

function Parse-WixRow {
  param($Row)

  $custom = @{}
  foreach ($i in 1..23) {
    $labelProp = "Custom Field $i - Label"
    $valueProp = "Custom Field $i - Value"
    $label = $Row.$labelProp
    $value = $Row.$valueProp
    if (-not [string]::IsNullOrWhiteSpace($label)) {
      $custom[$label.Trim()] = [string]$value
    }
  }

  $business = if (-not [string]::IsNullOrWhiteSpace($custom["OUTFITTER"])) {
    $custom["OUTFITTER"]
  } elseif (-not [string]::IsNullOrWhiteSpace($Row."Organization Name")) {
    $Row."Organization Name"
  } else {
    ""
  }

  $owner = if (-not [string]::IsNullOrWhiteSpace($custom["OWNER"])) {
    $custom["OWNER"]
  } else {
    @($Row."First Name", $Row."Last Name" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join " "
  }

  $emails = [System.Collections.ArrayList]::new()
  foreach ($value in @(
      $Row."E-mail 1 - Value",
      $Row."E-mail 2 - Value",
      $Row."E-mail 3 - Value",
      $Row."E-mail 4 - Value",
      $Row."E-mail 5 - Value"
    )) {
    $email = Normalize-Email $value
    if ($email -and $email -notmatch "^https?://") {
      Add-UniqueValue -List $emails -Value $email
    }
  }

  $phones = [System.Collections.ArrayList]::new()
  foreach ($value in @(
      $Row."Phone 1 - Value",
      $Row."Phone 2 - Value",
      $Row."Phone 3 - Value",
      $Row."Phone 4 - Value",
      $Row."Phone 5 - Value"
    )) {
    $phone = [string]$value
    if (-not [string]::IsNullOrWhiteSpace($phone)) {
      Add-UniqueValue -List $phones -Value $phone.Trim()
    }
  }

  $address = $Row."Address 1 - Formatted"
  if ([string]::IsNullOrWhiteSpace($address)) {
    $address = $custom["Address Full"]
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
    website = [string]$custom["WEBSITE"]
    address = [string]$address
    city = [string]$Row."Address 1 - City"
    region = [string]$Row."Address 1 - Region"
    postal = [string]$Row."Address 1 - Postal Code"
    ownerField = [string]$custom["OWNER"]
    outfitterField = [string]$custom["OUTFITTER"]
    huntingFishing = [string]$custom["HUNTING OR FISHING"]
    usfs = [string]$custom["SUP’s USFS"]
    blm = [string]$custom["SRP's BLM"]
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

$wixRows = Import-Csv $WixCsv
$parsedRows = foreach ($row in $wixRows) { Parse-WixRow -Row $row }

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
      Source = "wix download csv"
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

  if (-not $match.headquarters) {
    $match | Add-Member -NotePropertyName headquarters -NotePropertyValue ([pscustomobject]@{}) -Force
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

  if (-not $match.internal) {
    $match | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{
      reviewNotes = ""
      sourceNotes = @()
    }) -Force
  }
  if (-not $match.internal.sourceNotes) {
    $match.internal | Add-Member -NotePropertyName sourceNotes -NotePropertyValue @() -Force
  }
  if ("Wix CSV compare merge" -notin $match.internal.sourceNotes) {
    $match.internal.sourceNotes += "Wix CSV compare merge"
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

  if ($updates.Count -gt 0) {
    [void]$changedRecords.Add($match.id)
  }

  [void]$report.Add([PSCustomObject]@{
    WixBusinessName = $row.businessName
    WixOwner = $row.owner
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

Write-Output ("WIX_ROWS=" + $parsedRows.Count)
Write-Output ("MATCHED=" + $report.Count)
Write-Output ("UNMATCHED=" + $unmatched.Count)
Write-Output ("MASTER_CHANGED=" + $changedRecords.Count)
