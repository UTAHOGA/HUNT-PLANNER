param(
  [string]$ManualReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-logo-manual-review-2026-03-27.csv",
  [string]$CandidatesCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-candidates-all-review-2026-03-27.csv",
  [string]$OutputDir = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\logo-review-assets",
  [int]$Limit = 999
)

$ErrorActionPreference = "Stop"

function Get-SafeName {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "unnamed" }
  $safe = $Value -replace '[^A-Za-z0-9]+', '-'
  $safe = $safe.Trim('-').ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($safe)) { return "unnamed" }
  return $safe
}

function Pick-Extension {
  param([string]$Url, [string]$ContentType)
  $path = ""
  try { $path = ([Uri]$Url).AbsolutePath } catch {}
  $ext = [IO.Path]::GetExtension($path)
  if ($ext -and $ext.Length -le 5) { return $ext.ToLowerInvariant() }
  if ($ContentType -match "png") { return ".png" }
  if ($ContentType -match "svg") { return ".svg" }
  if ($ContentType -match "webp") { return ".webp" }
  if ($ContentType -match "gif") { return ".gif" }
  return ".jpg"
}

function Save-RemoteImage {
  param(
    [string]$Url,
    [string]$OutBase
  )
  if ([string]::IsNullOrWhiteSpace($Url)) { return $null }
  try {
    $response = Invoke-WebRequest -Uri $Url -MaximumRedirection 5 -TimeoutSec 45 -UseBasicParsing
    $ext = Pick-Extension -Url $Url -ContentType $response.Headers["Content-Type"]
    $target = "${OutBase}${ext}"
    [IO.File]::WriteAllBytes($target, $response.Content)
    return $target
  } catch {
    return $null
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$manual = Import-Csv $ManualReviewCsv
$candidateRows = Import-Csv $CandidatesCsv
$candidateMap = @{}
foreach ($row in $candidateRows) {
  $candidateMap[$row.displayName] = $row
}

$selected = $manual | Select-Object -First $Limit
$results = @()
$idx = 0

foreach ($row in $selected) {
  $idx++
  $slug = "{0:D3}-{1}" -f $idx, (Get-SafeName $row.displayName)
  $itemDir = Join-Path $OutputDir $slug
  New-Item -ItemType Directory -Force -Path $itemDir | Out-Null

  $candidateRow = $candidateMap[$row.displayName]
  $candidateUrl = $row.bestCandidateUrl
  if ([string]::IsNullOrWhiteSpace($candidateUrl) -and $candidateRow) {
    if (-not [string]::IsNullOrWhiteSpace($candidateRow.logoLike)) {
      $candidateUrl = $candidateRow.logoLike
    } elseif (-not [string]::IsNullOrWhiteSpace($candidateRow.ogImage)) {
      $candidateUrl = $candidateRow.ogImage
    } elseif (-not [string]::IsNullOrWhiteSpace($candidateRow.bestCandidateUrl)) {
      $candidateUrl = $candidateRow.bestCandidateUrl
    }
  }

  $currentPath = Save-RemoteImage -Url $row.currentLogoUrl -OutBase (Join-Path $itemDir "current")
  $candidatePath = Save-RemoteImage -Url $candidateUrl -OutBase (Join-Path $itemDir "candidate")

  $results += [pscustomobject]@{
    displayName = $row.displayName
    website = $row.website
    currentLogoUrl = $row.currentLogoUrl
    candidateUrl = $candidateUrl
    currentLocalPath = $currentPath
    candidateLocalPath = $candidatePath
    folder = $itemDir
  }
}

$htmlPath = Join-Path $OutputDir "logo-review-gallery.html"
$html = @()
$html += '<!doctype html>'
$html += '<html><head><meta charset="utf-8"><title>Outfitter Logo Review</title>'
$html += '<style>'
$html += 'body{font-family:Segoe UI,Arial,sans-serif;background:#f4efe8;color:#201814;margin:20px;}'
$html += '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;}'
$html += '.card{background:#fff;border:1px solid #d9c7b8;border-radius:14px;padding:16px;box-shadow:0 4px 18px rgba(0,0,0,.07);}'
$html += '.name{font-weight:700;font-size:20px;margin-bottom:8px;}'
$html += '.meta{font-size:12px;color:#6a5547;word-break:break-word;margin-bottom:10px;}'
$html += '.imgs{display:grid;grid-template-columns:1fr 1fr;gap:10px;}'
$html += '.imgbox{border:1px solid #e7ddd4;border-radius:10px;padding:8px;background:#faf8f6;}'
$html += '.label{font-size:12px;font-weight:700;margin-bottom:6px;color:#8a4a12;text-transform:uppercase;}'
$html += 'img{width:100%;height:180px;object-fit:contain;background:white;border-radius:6px;}'
$html += '.empty{height:180px;display:flex;align-items:center;justify-content:center;background:#f0ebe7;border-radius:6px;color:#8a7c72;font-size:13px;}'
$html += '</style></head><body>'
$html += '<h1>Outfitter Logo Review</h1>'
$html += '<p>Left is current logo. Right is imported candidate. Give go/no-go by outfitter name.</p>'
$html += '<div class="grid">'

foreach ($row in $results) {
  $currentRel = if ($row.currentLocalPath) { [IO.Path]::GetRelativePath($OutputDir, $row.currentLocalPath).Replace('\','/') } else { $null }
  $candidateRel = if ($row.candidateLocalPath) { [IO.Path]::GetRelativePath($OutputDir, $row.candidateLocalPath).Replace('\','/') } else { $null }
  $html += '<div class="card">'
  $html += "<div class='name'>$([System.Web.HttpUtility]::HtmlEncode($row.displayName))</div>"
  $html += "<div class='meta'>$([System.Web.HttpUtility]::HtmlEncode($row.website))</div>"
  $html += "<div class='imgs'>"
  $html += "<div class='imgbox'><div class='label'>Current</div>"
  if ($currentRel) { $html += "<img src='$currentRel' alt='Current logo'>" } else { $html += "<div class='empty'>No current image</div>" }
  $html += "</div>"
  $html += "<div class='imgbox'><div class='label'>Candidate</div>"
  if ($candidateRel) { $html += "<img src='$candidateRel' alt='Candidate logo'>" } else { $html += "<div class='empty'>No candidate image</div>" }
  $html += "</div>"
  $html += "</div></div>"
}

$html += '</div></body></html>'
Set-Content -Path $htmlPath -Value ($html -join "`r`n") -Encoding UTF8

$results | Export-Csv (Join-Path $OutputDir "logo-review-gallery-index.csv") -NoTypeInformation -Encoding UTF8

[pscustomobject]@{
  OutputDir = $OutputDir
  Html = $htmlPath
  Count = @($results).Count
} | ConvertTo-Json -Compress
