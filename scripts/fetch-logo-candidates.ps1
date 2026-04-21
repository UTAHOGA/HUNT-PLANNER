param(
  [string]$MasterJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$OutputJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-candidates.json",
  [int]$Limit = 12,
  [int]$Skip = 0,
  [string]$SourceType = "",
  [string]$Priority = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-Url {
  param(
    [string]$BaseUrl,
    [string]$Candidate
  )
  if ([string]::IsNullOrWhiteSpace($Candidate)) { return "" }
  try {
    $base = [uri]$BaseUrl
    $uri = [uri]::new($base, $Candidate)
    return $uri.AbsoluteUri
  } catch {
    return $Candidate
  }
}

function Get-Matches {
  param(
    [string]$Html,
    [string]$Pattern
  )
  $results = New-Object System.Collections.ArrayList
  foreach ($m in [regex]::Matches($Html, $Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
    if ($m.Groups.Count -gt 1) {
      $value = $m.Groups[1].Value
      if (-not [string]::IsNullOrWhiteSpace($value) -and -not $results.Contains($value)) {
        [void]$results.Add($value)
      }
    }
  }
  return @($results)
}

$master = Get-Content $MasterJson -Raw | ConvertFrom-Json -Depth 100
function Get-UrlHost {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return "" }
  try { return ([uri]$Url).Host.ToLowerInvariant() } catch { return "" }
}

function Get-SourceType {
  param([string]$Url)
  $urlHost = Get-UrlHost $Url
  if (-not $urlHost) { return "missing" }
  if ($urlHost -match 'facebook\.com|l\.facebook\.com') { return "facebook" }
  if ($urlHost -match 'instagram\.com') { return "instagram" }
  if ($urlHost -match 'youtube\.com|youtu\.be|x\.com|twitter\.com') { return "other-social" }
  return "domain"
}

function Get-Priority {
  param([string]$Type, [bool]$ShowOnPlanner)
  if ($Type -eq "domain" -and $ShowOnPlanner) { return "high" }
  if ($Type -eq "domain") { return "medium" }
  if (($Type -eq "facebook" -or $Type -eq "instagram") -and $ShowOnPlanner) { return "medium" }
  if ($Type -eq "facebook" -or $Type -eq "instagram") { return "social" }
  return "low"
}

$targets = $master | Where-Object {
  -not $_.branding.logoUrl -and $_.contact.website -match '^https?://'
} | ForEach-Object {
  $type = Get-SourceType $_.contact.website
  $prio = Get-Priority -Type $type -ShowOnPlanner ([bool]$_.publication.showOnPlanner)
  [PSCustomObject]@{
    record = $_
    sourceType = $type
    priority = $prio
  }
} | Where-Object {
  (-not $SourceType -or $_.sourceType -eq $SourceType) -and
  (-not $Priority -or $_.priority -eq $Priority)
} | Select-Object -Skip $Skip -First $Limit

$results = New-Object System.Collections.ArrayList

foreach ($target in $targets) {
  $record = $target.record
  $url = [string]$record.contact.website
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 30
    $html = [string]$resp.Content

    $og = Get-Matches -Html $html -Pattern '<meta[^>]+property=["'']og:image["''][^>]+content=["'']([^"'']+)["'']'
    $tw = Get-Matches -Html $html -Pattern '<meta[^>]+name=["'']twitter:image["''][^>]+content=["'']([^"'']+)["'']'
    $icon = Get-Matches -Html $html -Pattern '<link[^>]+rel=["''][^"'']*(?:icon|shortcut icon)[^"'']*["''][^>]+href=["'']([^"'']+)["'']'
    $logoClass = Get-Matches -Html $html -Pattern '<img[^>]+(?:class|alt)=["''][^"'']*(?:logo|brand|header-logo)[^"'']*["''][^>]+src=["'']([^"'']+)["'']'
    $imgSrc = Get-Matches -Html $html -Pattern '<img[^>]+src=["'']([^"'']+)["'']'

    $resolved = New-Object System.Collections.ArrayList
    foreach ($candidate in @($og) + @($tw) + @($logoClass) + @($icon) + @($imgSrc)) {
      $absolute = Resolve-Url -BaseUrl $url -Candidate $candidate
      if (-not [string]::IsNullOrWhiteSpace($absolute) -and -not $resolved.Contains($absolute)) {
        [void]$resolved.Add($absolute)
      }
    }

    [void]$results.Add([PSCustomObject]@{
      id = $record.id
      displayName = $record.displayName
      sourceUrl = $url
      sourceType = $target.sourceType
      priority = $target.priority
      ogImage = @($og | ForEach-Object { Resolve-Url -BaseUrl $url -Candidate $_ })
      twitterImage = @($tw | ForEach-Object { Resolve-Url -BaseUrl $url -Candidate $_ })
      logoLikeImages = @($logoClass | ForEach-Object { Resolve-Url -BaseUrl $url -Candidate $_ })
      iconLinks = @($icon | ForEach-Object { Resolve-Url -BaseUrl $url -Candidate $_ })
      topImageSamples = @($imgSrc | Select-Object -First 8 | ForEach-Object { Resolve-Url -BaseUrl $url -Candidate $_ })
      candidateCount = $resolved.Count
      allCandidates = @($resolved)
    })
  } catch {
    [void]$results.Add([PSCustomObject]@{
      id = $record.id
      displayName = $record.displayName
      sourceUrl = $url
      sourceType = $target.sourceType
      priority = $target.priority
      error = $_.Exception.Message
    })
  }
}

$results | ConvertTo-Json -Depth 8 | Set-Content $OutputJson
Write-Output ("WROTE=" + $OutputJson)
Write-Output ("COUNT=" + $results.Count)
