param(
  [string]$ReviewCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-database-review-slim-2026-03-27.csv",
  [string]$DwrCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\dwr-registered-outfitters-2026-03-27.csv",
  [string]$MatchReportCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-registration-match-report.csv",
  [string]$OutputCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-dwr-likely-match-manual-review.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-Text([string]$value) {
  $text = ($value ?? '').ToLowerInvariant().Trim()
  if (-not $text) { return '' }
  $text = $text -replace '&', ' and '
  $text = $text -replace '\bllc\b|\binc\b|\bl\.l\.c\.\b|\bco\b|\bcompany\b', ' '
  $text = $text -replace '[^a-z0-9]+', ' '
  $text = $text -replace '\s+', ' '
  return $text.Trim()
}

function Get-Tokens([string]$value) {
  $norm = Normalize-Text $value
  if (-not $norm) { return @() }
  $stop = @('outfitter','outfitters','guide','guides','and','hunting','fishing','big','game','dba')
  return @($norm -split ' ' | Where-Object { $_ -and $_ -notin $stop } | Select-Object -Unique)
}

function Score-Candidate($outfitterName, $ownerName, $dwrOutfitter, $dwrOwner) {
  $score = 0
  $nameNorm = Normalize-Text $outfitterName
  $ownerNorm = Normalize-Text $ownerName
  $dwrNameNorm = Normalize-Text $dwrOutfitter
  $dwrOwnerNorm = Normalize-Text $dwrOwner

  if ($nameNorm -and $nameNorm -eq $dwrNameNorm) { $score += 100 }
  if ($ownerNorm -and $ownerNorm -eq $dwrOwnerNorm) { $score += 90 }
  if ($nameNorm -and $dwrNameNorm -and ($nameNorm.Contains($dwrNameNorm) -or $dwrNameNorm.Contains($nameNorm))) { $score += 35 }
  if ($ownerNorm -and $dwrOwnerNorm -and ($ownerNorm.Contains($dwrOwnerNorm) -or $dwrOwnerNorm.Contains($ownerNorm))) { $score += 30 }

  $nameTokens = Get-Tokens $outfitterName
  $ownerTokens = Get-Tokens $ownerName
  $dwrNameTokens = Get-Tokens $dwrOutfitter
  $dwrOwnerTokens = Get-Tokens $dwrOwner

  foreach ($token in $nameTokens) {
    if ($dwrNameTokens -contains $token) { $score += 8 }
    elseif ($dwrOwnerTokens -contains $token) { $score += 3 }
  }
  foreach ($token in $ownerTokens) {
    if ($dwrOwnerTokens -contains $token) { $score += 10 }
    elseif ($dwrNameTokens -contains $token) { $score += 4 }
  }

  return $score
}

$review = Import-Csv $ReviewCsv
$dwr = Import-Csv $DwrCsv
$matchReport = Import-Csv $MatchReportCsv
$notMatchedIds = @($matchReport | Where-Object { $_.RegisteredWithDwr -eq 'No' } | Select-Object -ExpandProperty id)

$rows = foreach ($row in $review | Where-Object { $notMatchedIds -contains $_.id }) {
  $candidates = foreach ($cand in $dwr) {
    $score = Score-Candidate $row.displayName $row.primaryName $cand.Outfitter $cand.Owner
    if ($score -gt 0) {
      [pscustomobject]@{
        DwrOutfitter = $cand.Outfitter
        DwrOwner = $cand.Owner
        Score = $score
      }
    }
  }

  $top = @($candidates | Sort-Object @{Expression='Score';Descending=$true}, @{Expression='DwrOutfitter';Descending=$false} | Select-Object -First 3)
  [pscustomobject]@{
    id = $row.id
    displayName = $row.displayName
    primaryName = $row.primaryName
    website = $row.website
    usfsPermitText = $row.usfsPermitText
    blmPermitText = $row.blmPermitText
    Candidate1 = if ($top.Count -ge 1) { $top[0].DwrOutfitter } else { '' }
    Candidate1Owner = if ($top.Count -ge 1) { $top[0].DwrOwner } else { '' }
    Candidate1Score = if ($top.Count -ge 1) { $top[0].Score } else { '' }
    Candidate2 = if ($top.Count -ge 2) { $top[1].DwrOutfitter } else { '' }
    Candidate2Owner = if ($top.Count -ge 2) { $top[1].DwrOwner } else { '' }
    Candidate2Score = if ($top.Count -ge 2) { $top[1].Score } else { '' }
    Candidate3 = if ($top.Count -ge 3) { $top[2].DwrOutfitter } else { '' }
    Candidate3Owner = if ($top.Count -ge 3) { $top[2].DwrOwner } else { '' }
    Candidate3Score = if ($top.Count -ge 3) { $top[2].Score } else { '' }
  }
}

$rows | Sort-Object displayName | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
Get-Item $OutputCsv | Select-Object FullName,Length
