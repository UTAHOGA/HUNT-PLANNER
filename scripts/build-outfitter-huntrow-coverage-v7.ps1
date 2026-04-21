param(
  [string]$HuntsPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\utah-hunt-planner-master-all.json",
  [string]$OutfittersPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-master.json",
  [string]$FederalReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.csv",
  [string]$LandOverlapPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\hunt-unit-land-authority-overlap-2026-03-29.csv",
  [string]$MuleHabitatPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\hunt-unit-mule-deer-habitat-overlap-2026-03-29.csv",
  [string]$ElkHabitatPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\hunt-unit-elk-habitat-overlap-2026-03-29.csv",
  [string]$StopoverPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\hunt-unit-stopover-overlap-2026-03-29.csv",
  [string]$OutputCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-huntrow-coverage-score-v7-2026-03-29.csv",
  [string]$OutputJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-huntrow-coverage-score-v7-2026-03-29.json",
  [string]$PrivateCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-private-hunt-coverage-v7-2026-03-29.csv",
  [string]$SummaryCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-huntrow-coverage-v7-summary-2026-03-29.csv",
  [string]$PrivateSummaryCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-private-hunt-coverage-v7-summary-2026-03-29.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function SafeString($value) {
  if ($null -eq $value) { return '' }
  return [string]$value
}

function Normalize-Key($value) {
  $text = SafeString $value
  $text = $text.Trim().ToLowerInvariant()
  if (-not $text) { return '' }
  $text = $text -replace '&', ' and '
  $text = $text -replace '[^a-z0-9]+', '-'
  $text = $text -replace '-{2,}', '-'
  return $text.Trim('-')
}

function Normalize-List($value) {
  if ($null -eq $value) { return @() }
  $items = @()
  if ($value -is [System.Collections.IEnumerable] -and $value -isnot [string]) {
    foreach ($entry in $value) {
      $text = SafeString $entry
      if ($text.Trim()) { $items += $text.Trim() }
    }
  } else {
    $text = SafeString $value
    if ($text.Trim()) {
      $parts = $text -split '\s*\|\s*'
      foreach ($part in $parts) {
        if ($part.Trim()) { $items += $part.Trim() }
      }
    }
  }
  return @($items | Where-Object { $_ } | Select-Object -Unique)
}

function To-Number($value) {
  $text = SafeString $value
  if (-not $text) { return 0.0 }
  return [double]::Parse($text, [System.Globalization.CultureInfo]::InvariantCulture)
}

function Join-List($items) {
  return (@($items | Where-Object { $_ }) -join ' | ')
}

function Get-PropValue($obj, [string[]]$names) {
  foreach ($name in $names) {
    $prop = $obj.PSObject.Properties[$name]
    if ($prop) { return $prop.Value }
  }
  return $null
}

function Canonical-UsfsId($value) {
  switch ((Normalize-Key $value)) {
    'uinta-wasatch-cache' { return 'uwc' }
    'uwc' { return 'uwc' }
    'fishlake' { return 'fishlake' }
    'manti-la-sal' { return 'manti-la-sal' }
    'ashley' { return 'ashley' }
    'dixie' { return 'dixie' }
    default { return (Normalize-Key $value) }
  }
}

function Canonical-BlmId($value) {
  switch ((Normalize-Key $value)) {
    'blm-st-george' { return 'blm-st-george' }
    'st-george-field-office' { return 'blm-st-george' }
    'blm-cedar-city' { return 'blm-cedar-city' }
    'color-country-district-cedar-city-field-office' { return 'blm-cedar-city' }
    'cedar-city' { return 'blm-cedar-city' }
    'blm-grand-staircase' { return 'blm-grand-staircase' }
    'grand-staircase' { return 'blm-grand-staircase' }
    'blm-kanab' { return 'blm-kanab' }
    'kanab' { return 'blm-kanab' }
    'blm-fishlake' { return 'blm-fishlake' }
    'fishlake' { return 'blm-fishlake' }
    default { return (Normalize-Key $value) }
  }
}

function Get-HabitatWeight($species, $season, $valueClass) {
  $seasonKey = Normalize-Key $season
  $valueKey = Normalize-Key $valueClass
  $valueWeight = if ($valueKey -eq 'crucial') { 1.0 } elseif ($valueKey -eq 'substantial') { 0.72 } else { 0.55 }
  if ($species -eq 'elk') {
    $seasonWeight = switch ($seasonKey) {
      'winter' { 1.0 }
      'winter-spring' { 0.9 }
      'year-long' { 0.8 }
      'spring-fall' { 0.6 }
      'transition' { 0.55 }
      'summer-fall' { 0.5 }
      'summer' { 0.45 }
      default { 0.45 }
    }
  } else {
    $seasonWeight = switch ($seasonKey) {
      'winter' { 1.0 }
      'winter-spring' { 0.85 }
      'year-long' { 0.8 }
      'spring-fall' { 0.55 }
      'summer-fall' { 0.45 }
      'summer' { 0.35 }
      default { 0.35 }
    }
  }
  return $seasonWeight * $valueWeight
}

function New-HtmlTable($title, $csvPath, $htmlPath) {
  $rows = Import-Csv $csvPath
  if (-not $rows) { return }
  $headers = @($rows[0].PSObject.Properties.Name)
  $json = $rows | ConvertTo-Json -Depth 6 -Compress
  $ths = ($headers | ForEach-Object { "<th>$($_)</th>" }) -join ''
  $html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>$title</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 20px; background: #f7f3ea; color: #221b14; }
    h1 { margin: 0 0 12px; color: #8f4a13; }
    .toolbar { display:flex; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
    input { padding:10px 12px; min-width:320px; border:1px solid #c8b8a8; border-radius:8px; }
    .count { color:#6d5a48; font-size:14px; }
    table { border-collapse: collapse; width: 100%; background: white; }
    th, td { border: 1px solid #e6dccf; padding: 8px 10px; font-size: 13px; vertical-align: top; }
    th { position: sticky; top: 0; background: #f1e3cf; text-align:left; }
    tr:nth-child(even) td { background:#fcfaf6; }
  </style>
</head>
<body>
  <h1>$title</h1>
  <div class="toolbar">
    <input id="search" type="search" placeholder="Search hunts, units, outfitters, rules..." />
    <div class="count" id="count"></div>
  </div>
  <table>
    <thead><tr>$ths</tr></thead>
    <tbody id="tbody"></tbody>
  </table>
  <script>
    const rows = $json;
    const headers = $(($headers | ConvertTo-Json -Compress));
    const tbody = document.getElementById('tbody');
    const search = document.getElementById('search');
    const count = document.getElementById('count');
    function render() {
      const q = (search.value || '').toLowerCase();
      const filtered = rows.filter(r => !q || headers.some(h => String(r[h] ?? '').toLowerCase().includes(q)));
      tbody.innerHTML = filtered.map(r => '<tr>' + headers.map(h => '<td>' + String(r[h] ?? '') + '</td>').join('') + '</tr>').join('');
      count.textContent = filtered.length + ' rows';
    }
    search.addEventListener('input', render);
    render();
  </script>
</body>
</html>
"@
  Set-Content -Path $htmlPath -Value $html -Encoding UTF8
}

$hunts = @(Get-Content $HuntsPath -Raw | ConvertFrom-Json)
$outfitters = @(Get-Content $OutfittersPath -Raw | ConvertFrom-Json)
$federalReview = @(Import-Csv $FederalReviewPath)
$landOverlapRows = @(Import-Csv $LandOverlapPath)
$muleHabitatRows = @(Import-Csv $MuleHabitatPath)
$elkHabitatRows = @(Import-Csv $ElkHabitatPath)
$stopoverRows = @(Import-Csv $StopoverPath)

$reviewBySpeciesUnit = @{}
foreach ($row in $federalReview) {
  $key = "{0}|{1}" -f (Normalize-Key $row.Species), (Normalize-Key $row.UnitCode)
  $reviewBySpeciesUnit[$key] = $row
}

$landByBoundary = @{}
foreach ($row in $landOverlapRows) {
  $key = SafeString $row.BoundaryID
  if (-not $landByBoundary.ContainsKey($key)) {
    $landByBoundary[$key] = @{
      USFS = 0.0
      BLM = 0.0
      SITLA = 0.0
      CWMU = 0.0
      StateParks = 0.0
    }
  }
  $pct = To-Number $row.pct_of_unit
  switch ($row.authority) {
    'USFS' { $landByBoundary[$key].USFS = $pct }
    'BLM' { $landByBoundary[$key].BLM = $pct }
    'SITLA' { $landByBoundary[$key].SITLA = $pct }
    'CWMU' { $landByBoundary[$key].CWMU = $pct }
    'StateParks' { $landByBoundary[$key].StateParks = $pct }
  }
}

$muleByBoundary = @{}
foreach ($row in $muleHabitatRows) {
  $key = SafeString $row.BoundaryID
  if (-not $muleByBoundary.ContainsKey($key)) { $muleByBoundary[$key] = @() }
  $muleByBoundary[$key] += $row
}

$elkByBoundary = @{}
foreach ($row in $elkHabitatRows) {
  $key = SafeString $row.BoundaryID
  if (-not $elkByBoundary.ContainsKey($key)) { $elkByBoundary[$key] = @() }
  $elkByBoundary[$key] += $row
}

$stopoverByBoundary = @{}
foreach ($row in $stopoverRows) {
  $key = SafeString $row.BoundaryID
  if (-not $stopoverByBoundary.ContainsKey($key)) { $stopoverByBoundary[$key] = @() }
  $stopoverByBoundary[$key] += $row
}

$rows = New-Object System.Collections.Generic.List[object]

foreach ($hunt in $hunts) {
  $species = SafeString (Get-PropValue $hunt @('species','Species'))
  $unitName = SafeString (Get-PropValue $hunt @('unitName','UnitName'))
  $unitCode = SafeString (Get-PropValue $hunt @('unitCode','UnitCode'))
  $huntCode = SafeString (Get-PropValue $hunt @('huntCode','HuntCode','code'))
  $boundaryId = SafeString (Get-PropValue $hunt @('boundaryId','BoundaryID','boundaryID'))
  if (-not $huntCode -or -not $species -or -not $unitName) { continue }

  $listingKey = "{0}|{1}" -f (Normalize-Key $species), (Normalize-Key $unitCode)
  $review = if ($reviewBySpeciesUnit.ContainsKey($listingKey)) { $reviewBySpeciesUnit[$listingKey] } else { $null }
  $land = if ($landByBoundary.ContainsKey($boundaryId)) { $landByBoundary[$boundaryId] } else { @{ USFS = 0.0; BLM = 0.0; SITLA = 0.0; CWMU = 0.0; StateParks = 0.0 } }

  $titleText = Join-List @((Get-PropValue $hunt @('title','Title')), (Get-PropValue $hunt @('huntType','HuntType')), (Get-PropValue $hunt @('seasonLabel','SeasonLabel')), $unitName)
  $titleKey = Normalize-Key $titleText
  $privateHunt = ($titleKey -match 'private-lands') -or ((Normalize-Key (Get-PropValue $hunt @('huntType','HuntType'))) -eq 'private-lands-only')
  $cwmuHunt = ($titleKey -match 'cwmu')
  $antelopeIslandHunt = ($titleKey -match 'antelope-island')

  $requiredUsfs = @()
  $requiredBlm = @()
  if ($null -ne $review) {
    $requiredUsfs = @(Normalize-List $review.PrimaryUsfsForestId | ForEach-Object { Canonical-UsfsId $_ } | Where-Object { $_ })
    $requiredBlm = @(Normalize-List $review.PrimaryBlmDistrictId | ForEach-Object { Canonical-BlmId $_ } | Where-Object { $_ })
  }

  $bestSignal = 0.0
  $dominantSignal = ''
  if ((Normalize-Key $species) -eq 'mule-deer' -and $muleByBoundary.ContainsKey($boundaryId)) {
    foreach ($entry in $muleByBoundary[$boundaryId]) {
      $pct = To-Number $entry.pct_of_unit
      $weighted = $pct * (Get-HabitatWeight 'mule-deer' $entry.SEASON $entry.VALUE)
      if ($weighted -gt $bestSignal) {
        $bestSignal = $weighted
        $dominantSignal = "{0} {1}" -f $entry.SEASON, $entry.VALUE
      }
    }
    if ($stopoverByBoundary.ContainsKey($boundaryId)) {
      $stopoverMax = ($stopoverByBoundary[$boundaryId] | ForEach-Object { To-Number $_.pct_of_unit } | Measure-Object -Maximum).Maximum
      if ($stopoverMax -gt $bestSignal) {
        $bestSignal = $stopoverMax
        $dominantSignal = 'migration stopover'
      }
    }
  } elseif ((Normalize-Key $species) -eq 'elk' -and $elkByBoundary.ContainsKey($boundaryId)) {
    foreach ($entry in $elkByBoundary[$boundaryId]) {
      $pct = To-Number $entry.pct_of_unit
      $weighted = $pct * (Get-HabitatWeight 'elk' $entry.SEASON $entry.VALUE)
      if ($weighted -gt $bestSignal) {
        $bestSignal = $weighted
        $dominantSignal = "{0} {1}" -f $entry.SEASON, $entry.VALUE
      }
    }
  }
  $bestSignal = [math]::Round($bestSignal, 2)

  foreach ($outfitter in $outfitters) {
    if ((Normalize-Key $outfitter.listingType) -ne 'hunting') { continue }
    if (-not $outfitter.services.guidedHunts) { continue }

    $serviceArea = $outfitter.serviceArea
    $usfsClaimedIds = @(Normalize-List $serviceArea.usfsForestIds | ForEach-Object { Canonical-UsfsId $_ } | Where-Object { $_ })
    $blmClaimedIds = @(Normalize-List $serviceArea.blmDistrictIds | ForEach-Object { Canonical-BlmId $_ } | Where-Object { $_ })
    $sitlaClaimed = @(Normalize-List $serviceArea.sitla).Count -gt 0
    $stateParksClaims = @(Normalize-List $serviceArea.stateParks)
    $stateParksClaimed = $stateParksClaims.Count -gt 0
    $privateClaimed = [bool]$outfitter.services.trespassAccess
    $unitsServedKeys = @(
      Normalize-List $serviceArea.unitsServed |
      ForEach-Object { Normalize-Key $_ }
    )

    $usfsMatch = $false
    if ($requiredUsfs.Count -gt 0) {
      foreach ($req in $requiredUsfs) {
        if ($usfsClaimedIds -contains $req) { $usfsMatch = $true; break }
      }
    } else {
      $usfsMatch = ($usfsClaimedIds.Count -gt 0 -and $land.USFS -gt 0)
    }

    $blmMatch = $false
    if ($requiredBlm.Count -gt 0) {
      foreach ($req in $requiredBlm) {
        if ($blmClaimedIds -contains $req) { $blmMatch = $true; break }
      }
    } else {
      $blmMatch = ($blmClaimedIds.Count -gt 0 -and $land.BLM -gt 0)
    }

    $adjacentPublicAuthorityProxy = $usfsMatch -or $blmMatch -or ($sitlaClaimed -and $land.SITLA -gt 0) -or ($stateParksClaimed -and $land.StateParks -gt 0)
    $specificCwmuClaim = $false
    if ($cwmuHunt) {
          $unitKey = Normalize-Key $unitName
          $titleUnitKey = Normalize-Key (Get-PropValue $hunt @('title','Title'))
      foreach ($entry in $unitsServedKeys) {
        if (-not $entry) { continue }
        if ($entry -eq $unitKey -or $entry -eq (Normalize-Key $unitCode) -or ($titleUnitKey -and $entry -eq $titleUnitKey) -or ($entry -like "*$unitKey*")) {
          $specificCwmuClaim = $true
          break
        }
      }
    }

    $antelopeClaim = $false
    if ($antelopeIslandHunt) {
      foreach ($park in $stateParksClaims) {
        if ((Normalize-Key $park) -match 'antelope-island') { $antelopeClaim = $true; break }
      }
    }

    $candidate = $false
    if ($privateHunt) {
      $candidate = $privateClaimed -or $adjacentPublicAuthorityProxy
    } elseif ($cwmuHunt) {
      $candidate = $specificCwmuClaim
    } elseif ($antelopeIslandHunt) {
      $candidate = $antelopeClaim
    } else {
      $candidate = $usfsMatch -or $blmMatch -or ($sitlaClaimed -and $land.SITLA -gt 0) -or ($stateParksClaimed -and $land.StateParks -gt 0)
    }

    if (-not $candidate) { continue }

    $legalCoverage = 0.0
    $specialRuleApplied = ''
    $notes = New-Object System.Collections.Generic.List[string]

    if ($usfsMatch) { $legalCoverage += $land.USFS; [void]$notes.Add('USFS claimed') }
    if ($blmMatch) { $legalCoverage += $land.BLM; [void]$notes.Add('BLM claimed') }
    if ($sitlaClaimed -and $land.SITLA -gt 0) { $legalCoverage += $land.SITLA; [void]$notes.Add('SITLA claimed') }
    if ($stateParksClaimed -and $land.StateParks -gt 0) { $legalCoverage += $land.StateParks; [void]$notes.Add('State Parks claimed') }

    if ($cwmuHunt -and $specificCwmuClaim) {
      $legalCoverage = 100.0
      $specialRuleApplied = 'Specific CWMU access claim => 100%'
    } elseif ($antelopeIslandHunt -and $antelopeClaim) {
      $legalCoverage = 100.0
      $specialRuleApplied = 'Antelope Island State Parks privilege => 100%'
    } elseif ($privateHunt -and ($privateClaimed -or $adjacentPublicAuthorityProxy)) {
      $legalCoverage = 100.0
      if ($privateClaimed) {
        $specialRuleApplied = 'Private hunt with private access claim => 100%'
      } else {
        $specialRuleApplied = 'Private hunt with adjacent/direct public authority proxy => 100%'
      }
    }

    $legalCoverage = [math]::Round([math]::Min(100.0, $legalCoverage), 2)
    $primaryCoverage = if ($bestSignal -gt 0) { [math]::Round([math]::Min($legalCoverage, $bestSignal), 2) } else { $null }

    $coverageTier = if ($legalCoverage -ge 80) {
      'Full Candidate'
    } elseif ($legalCoverage -ge 35) {
      'Primary Candidate'
    } elseif ($legalCoverage -gt 0) {
      'Partial Candidate'
    } else {
      'No Confirmed Land Match'
    }

    if ($dominantSignal) { [void]$notes.Add("Primary hunting signal: $dominantSignal") }
    if ($specialRuleApplied) { [void]$notes.Add($specialRuleApplied) }

    $rows.Add([pscustomobject]@{
      huntCode = $huntCode
      title = SafeString (Get-PropValue $hunt @('title','Title'))
      species = $species
      sex = SafeString (Get-PropValue $hunt @('sex','Sex'))
      weapon = SafeString (Get-PropValue $hunt @('weapon','Weapon'))
      huntType = SafeString (Get-PropValue $hunt @('huntType','HuntType'))
      huntClass = SafeString (Get-PropValue $hunt @('huntCategory','huntClass','HuntClass'))
      seasonLabel = SafeString (Get-PropValue $hunt @('seasonLabel','SeasonLabel'))
      unitName = $unitName
      unitCode = $unitCode
      outfitterId = SafeString $outfitter.id
      outfitter = SafeString $outfitter.displayName
      legalUnitCoveragePct = $legalCoverage
      primaryHuntingAreaSignalPct = if ($bestSignal -gt 0) { $bestSignal } else { $null }
      primaryHuntingAreaCoveragePct = $primaryCoverage
      coverageTier = $coverageTier
      privateHunt = $privateHunt
      cwmuHunt = $cwmuHunt
      antelopeIslandHunt = $antelopeIslandHunt
      specialRuleApplied = $specialRuleApplied
      notes = (Join-List $notes)
    }) | Out-Null
  }
}

$sorted = @($rows | Sort-Object huntCode, outfitter)
$sorted | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
$sorted | ConvertTo-Json -Depth 6 | Set-Content -Path $OutputJson -Encoding UTF8

$privateRows = @($sorted | Where-Object { $_.privateHunt -eq $true })
$privateRows | Export-Csv -Path $PrivateCsv -NoTypeInformation -Encoding UTF8

$summary = @(
  $sorted | Group-Object coverageTier | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ coverageTier = $_.Name; Count = $_.Count }
  }
)
$summary | Export-Csv -Path $SummaryCsv -NoTypeInformation -Encoding UTF8

$privateSummary = @(
  $privateRows | Group-Object coverageTier | Sort-Object Name | ForEach-Object {
    [pscustomobject]@{ coverageTier = $_.Name; Count = $_.Count }
  }
)
$privateSummary | Export-Csv -Path $PrivateSummaryCsv -NoTypeInformation -Encoding UTF8

New-HtmlTable 'Outfitter Huntrow Coverage v7' $OutputCsv ($OutputCsv -replace '\.csv$', '.html')
New-HtmlTable 'Outfitter Private Hunt Coverage v7' $PrivateCsv ($PrivateCsv -replace '\.csv$', '.html')

Write-Output ("ROWS={0}" -f $sorted.Count)
Write-Output ("PRIVATE_ROWS={0}" -f $privateRows.Count)
