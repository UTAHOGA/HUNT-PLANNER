param(
  [string]$MasterPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json',
  [string]$PublicPath = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json',
  [string]$ReportCsv = 'C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-contact-verification.csv',
  [int]$Limit = 999,
  [switch]$ApplyUpdates
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

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

function Get-PrimaryUrl($row) {
  return @(
    $row.contact.website,
    $row.contact.facebookUrl,
    $row.contact.instagramUrl
  ) | Where-Object { "$_".Trim() } | Select-Object -First 1
}

function Extract-Emails([string]$Text) {
  if (-not $Text) { return @() }
  $matches = [regex]::Matches($Text, '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', 'IgnoreCase')
  $values = foreach ($m in $matches) {
    $email = $m.Value.ToLower()
    if ($email -match 'sentry-next\.wixpress\.com|example\.com|wixpress\.com') { continue }
    $email
  }
  return Unique-Array $values
}

function Extract-Phones([string]$Text) {
  if (-not $Text) { return @() }
  $matches = [regex]::Matches($Text, '(?:(?:\+?1[\s\-.]*)?(?:\(?\d{3}\)?[\s\-.]*)\d{3}[\s\-.]*\d{4})')
  $values = foreach ($m in $matches) {
    $phone = $m.Value.Trim()
    if ($phone -notmatch '[\(\)\-\.\s]') { continue }
    if ((Normalize-Phone $phone).Length -lt 10) { continue }
    $phone
  }
  return Unique-Array $values
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

function Normalize-Phone([string]$Value) {
  return (($Value -replace '[^\d]','').Trim())
}

function Get-Host([string]$Url) {
  if (-not $Url) { return '' }
  try {
    return (([Uri]$Url).Host.ToLower() -replace '^www\.','')
  } catch {
    return ''
  }
}

function Prefer-WebsiteEmail([string[]]$Candidates, [string]$Url) {
  $hostKey = Get-Host $Url
  if (-not $hostKey) { return ($Candidates | Select-Object -First 1) }
  $match = $Candidates | Where-Object { $_ -match ('@' + [regex]::Escape($hostKey) + '$') } | Select-Object -First 1
  if ($match) { return $match }
  return ($Candidates | Select-Object -First 1)
}

function Get-HighConfidenceEmail([string[]]$Candidates, [string]$Url) {
  $clean = Unique-Array $Candidates
  if (-not $clean.Count) { return '' }
  $preferred = Prefer-WebsiteEmail $clean $Url
  if ($preferred) { return $preferred }
  if ($clean.Count -eq 1) { return $clean[0] }
  return ''
}

function Fetch-Page([string]$Url) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers @{ 'User-Agent'='Codex/1.0' } -TimeoutSec 25 -MaximumRedirection 5
    return [pscustomobject]@{
      Ok = $true
      FinalUrl = $resp.BaseResponse.ResponseUri.AbsoluteUri
      Content = [string]$resp.Content
      StatusCode = [int]$resp.StatusCode
      Error = ''
    }
  } catch {
    return [pscustomobject]@{
      Ok = $false
      FinalUrl = $Url
      Content = ''
      StatusCode = 0
      Error = $_.Exception.Message
    }
  }
}

$master = @(Get-Content $MasterPath -Raw | ConvertFrom-Json)
$public = @(Get-Content $PublicPath -Raw | ConvertFrom-Json)
$publicIds = [System.Collections.Generic.HashSet[string]]::new()
$public | ForEach-Object { [void]$publicIds.Add([string]$_.id) }

$report = @()
$processed = 0

foreach ($row in $master) {
  if ($processed -ge $Limit) { break }
  $url = Get-PrimaryUrl $row
  if (-not $url) { continue }
  $processed++

  $page = Fetch-Page $url
  $emailsFound = if ($page.Ok) { Extract-Emails $page.Content } else { @() }
  $phonesFound = if ($page.Ok) { Extract-Phones $page.Content } else { @() }

  $currentEmails = Sanitize-EmailValues @((Ensure-Array $row.contact.emailAddresses) + (Ensure-Array $row.contact.emailPrimary))
  $currentPhones = Sanitize-PhoneValues @((Ensure-Array $row.contact.phoneNumbers) + (Ensure-Array $row.contact.phonePrimary))

  $emailConfirmed = $false
  $phoneConfirmed = $false

  if ($row.contact.emailPrimary -and $emailsFound -contains $row.contact.emailPrimary.ToLower()) {
    $emailConfirmed = $true
  }
  if ($row.contact.phonePrimary) {
    $normalizedCurrent = Normalize-Phone $row.contact.phonePrimary
    if ($normalizedCurrent -and ($phonesFound | ForEach-Object { Normalize-Phone $_ }) -contains $normalizedCurrent) {
      $phoneConfirmed = $true
    }
  }

  $newPrimaryEmail = $row.contact.emailPrimary
  if (-not $newPrimaryEmail) {
    $newPrimaryEmail = Get-HighConfidenceEmail $emailsFound $page.FinalUrl
  }
  $newPrimaryPhone = $row.contact.phonePrimary
  if (-not $newPrimaryPhone -and $phonesFound.Count -eq 1) {
    $newPrimaryPhone = $phonesFound[0]
  }

  if ($page.Ok -and $ApplyUpdates) {
    if (-not $row.contact.emailPrimary -and $newPrimaryEmail) {
      $row.contact.emailPrimary = $newPrimaryEmail
    }
    if (-not $row.contact.phonePrimary -and $newPrimaryPhone) {
      $row.contact.phonePrimary = $newPrimaryPhone
    }

    $row.contact.emailAddresses = if ($currentEmails.Count) {
      @($currentEmails)
    } elseif ($row.contact.emailPrimary) {
      @($row.contact.emailPrimary.ToLower())
    } else {
      @()
    }
    $row.contact.phoneNumbers = if ($currentPhones.Count) {
      @($currentPhones)
    } elseif ($row.contact.phonePrimary) {
      @($row.contact.phonePrimary)
    } else {
      @()
    }

    if ($page.FinalUrl -and $row.contact.website -and $row.contact.website -notmatch 'facebook\.com|instagram\.com') {
      $row.contact.website = $page.FinalUrl.TrimEnd('/')
    }
  }

  if (-not $row.internal) {
    $row | Add-Member -NotePropertyName internal -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $row.internal | Add-Member -NotePropertyName lastContactVerifiedAt -NotePropertyValue (Get-Date -Format 'yyyy-MM-dd') -Force
  $row.internal | Add-Member -NotePropertyName lastContactVerifiedUrl -NotePropertyValue $page.FinalUrl -Force
  $row.internal | Add-Member -NotePropertyName lastContactVerifiedStatus -NotePropertyValue $(if ($page.Ok) { 'checked' } else { 'failed' }) -Force

  $report += [pscustomobject]@{
    'Business Name' = $row.displayName
    'Public Record' = $publicIds.Contains([string]$row.id)
    'Source URL' = $url
    'Final URL' = $page.FinalUrl
    'Status Code' = $page.StatusCode
    'Fetch OK' = $page.Ok
    'Email Confirmed' = $emailConfirmed
    'Phone Confirmed' = $phoneConfirmed
    'Current Email' = $row.contact.emailPrimary
    'Current Phone' = $row.contact.phonePrimary
    'Emails Found On Page' = ($emailsFound -join ' | ')
    'Phones Found On Page' = ($phonesFound -join ' | ')
    'Error' = $page.Error
  }
}

$masterOut = $master
if ($ApplyUpdates) {
  $masterOut | ConvertTo-Json -Depth 12 | Set-Content $MasterPath
  ($masterOut | Where-Object { $publicIds.Contains([string]$_.id) }) | ConvertTo-Json -Depth 12 | Set-Content $PublicPath
}
$report | Export-Csv -NoTypeInformation -Path $ReportCsv

Write-Output ("VERIFIED_COUNT=" + $processed)
Write-Output ("REPORT=" + $ReportCsv)
