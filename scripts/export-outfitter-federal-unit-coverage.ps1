param(
  [string]$HuntsPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\utah-hunt-planner-master-all.json",
  [string]$OutfittersPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitters-public.json",
  [string]$DeerUsfsReviewPath = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\deer-unit-primary-usfs-review.csv",
  [string]$OutputCsv = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.csv",
  [string]$OutputJson = "C:\DOWNLOADS\test website\HUNT-PLANNER\data\outfitter-federal-unit-coverage-review.json"
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

function Get-HuntField($hunt, [string[]]$names) {
  foreach ($name in $names) {
    $prop = $hunt.PSObject.Properties[$name]
    if ($prop -and (SafeString $prop.Value).Trim()) {
      return $prop.Value
    }
  }
  return ''
}

function Get-HuntSpecies($hunt) {
  return SafeString (Get-HuntField $hunt @('species','Species'))
}

function Get-HuntCode($hunt) {
  return SafeString (Get-HuntField $hunt @('huntCode','hunt_code','HuntCode','code'))
}

function Get-UnitCode($hunt) {
  return SafeString (Get-HuntField $hunt @('unitCode','unit_code','UnitCode'))
}

function Get-UnitName($hunt) {
  return SafeString (Get-HuntField $hunt @('unitName','unit_name','UnitName'))
}

function Get-BoundaryNamesForHunt($hunt) {
  $names = @()
  $unitName = Get-UnitName $hunt
  if ($unitName) { $names += $unitName }
  return @($names | Select-Object -Unique)
}

function Get-RequiredUsfsForestsForHunt($hunt) {
  $boundaryKeys = @(Get-BoundaryNamesForHunt $hunt | ForEach-Object { Normalize-Key $_ })
  $required = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($key in $boundaryKeys) {
    if (-not $key) { continue }
    if (
      $key.Contains('manti') -or
      $key.Contains('san-rafael') -or
      $key.Contains('la-sal') -or
      $key.Contains('dolores') -or
      $key.Contains('ferron') -or
      $key.Contains('price-canyon') -or
      $key.Contains('gordon-creek') -or
      $key.Contains('mohrland') -or
      $key.Contains('horn-mtn') -or
      $key.Contains('moab') -or
      $key.Contains('monticello')
    ) {
      [void]$required.Add('manti-la-sal')
    }
    if (
      $key.Contains('fishlake') -or
      $key.Contains('thousand-lakes') -or
      $key.Contains('fillmore') -or
      $key.Contains('monroe') -or
      $key.Contains('beaver') -or
      $key.Contains('mt-dutton') -or
      $key.Contains('plateau')
    ) {
      [void]$required.Add('fishlake')
    }
    if ($key.Contains('nebo')) {
      [void]$required.Add('uwc')
    }
    if (
      $key.Contains('cache') -or
      $key.Contains('chalk-creek') -or
      $key.Contains('east-canyon') -or
      $key.Contains('kamas') -or
      $key.Contains('uinta') -or
      $key.Contains('wasatch')
    ) {
      [void]$required.Add('uwc')
    }
    if (
      $key.Contains('boulder') -or
      $key.Contains('kaiparowits') -or
      $key.Contains('pine-valley') -or
      $key.Contains('zion') -or
      $key.Contains('panguitch') -or
      $key.Contains('paunsaugunt')
    ) {
      [void]$required.Add('dixie')
    }
    if (
      $key.Contains('vernal') -or
      $key.Contains('diamond-mtn') -or
      $key.Contains('flaming-gorge') -or
      $key.Contains('browns-park')
    ) {
      [void]$required.Add('ashley')
    }
  }
  return @($required | Sort-Object)
}

function Get-ReadableForestName($forestId) {
  switch ($forestId) {
    'uwc' { return 'Uinta-Wasatch-Cache' }
    'dixie' { return 'Dixie' }
    'fishlake' { return 'Fishlake' }
    'manti-la-sal' { return 'Manti-La Sal' }
    'ashley' { return 'Ashley' }
    default { return $forestId }
  }
}

function Get-ReadableBlmName($blmId) {
  switch ($blmId) {
    'blm-grand-staircase' { return 'Grand Staircase' }
    'blm-kanab' { return 'Kanab' }
    'blm-cedar-city' { return 'Color Country District (Cedar City Field Office)' }
    'blm-st-george' { return 'St. George' }
    'blm-fishlake' { return 'Fishlake' }
    default { return $blmId }
  }
}

function Get-RequiredBlmDistrictsForHunt($hunt) {
  $boundaryKeys = @(Get-BoundaryNamesForHunt $hunt | ForEach-Object { Normalize-Key $_ })
  $required = [System.Collections.Generic.HashSet[string]]::new()
  foreach ($key in $boundaryKeys) {
    if (-not $key) { continue }
    if (
      $key.Contains('boulder') -or
      $key.Contains('kaiparowits') -or
      $key.Contains('escalante') -or
      $key.Contains('barney-top')
    ) {
      [void]$required.Add('blm-grand-staircase')
      [void]$required.Add('blm-kanab')
    }
    if (
      $key.Contains('fishlake') -or
      $key.Contains('thousand-lakes') -or
      $key.Contains('fillmore') -or
      $key.Contains('monroe') -or
      $key.Contains('beaver') -or
      $key.Contains('mt-dutton') -or
      $key.Contains('pahvant')
    ) {
      [void]$required.Add('blm-fishlake')
    }
  }
  return @($required | Sort-Object)
}

function Get-RecordList($record, [string]$path) {
  $node = $record
  foreach ($segment in ($path -split '\.')) {
    if ($null -eq $node) { return @() }
    $prop = $node.PSObject.Properties[$segment]
    if (-not $prop) { return @() }
    $node = $prop.Value
  }
  return @(Normalize-List $node)
}

$hunts = Get-Content $HuntsPath -Raw | ConvertFrom-Json
$outfitters = Get-Content $OutfittersPath -Raw | ConvertFrom-Json
$deerReview = @{}
Import-Csv $DeerUsfsReviewPath | ForEach-Object {
  $key = "{0}|{1}" -f (Normalize-Key $_.species), (Normalize-Key $_.unitCode)
  if ($_.primaryUsfsForestId) {
    $deerReview[$key] = $_
  }
}

$rows = @{}
foreach ($hunt in $hunts) {
  $species = (Get-HuntSpecies $hunt).Trim()
  $unitCode = (Get-UnitCode $hunt).Trim()
  $unitName = (Get-UnitName $hunt).Trim()
  $huntCode = (Get-HuntCode $hunt).Trim()
  if (-not $species -or -not $unitCode -or -not $unitName) { continue }

  $rowKey = "{0}|{1}" -f (Normalize-Key $species), (Normalize-Key $unitCode)
  if (-not $rows.ContainsKey($rowKey)) {
    $isPrivate = ($unitCode -match 'cwmu') -or ($unitName -match '(?i)private land only')
    $isStatewide = $unitName -match '(?i)statewide'
    $eligibility = 'Yes'
    $exclusionReason = ''
    if ($isPrivate) {
      $eligibility = 'No'
      $exclusionReason = 'Private/CWMU unit'
    } elseif ($isStatewide) {
      $eligibility = 'No'
      $exclusionReason = 'Statewide/non-unit hunt'
    }

    $primaryUsfsForestId = ''
    $usfsSource = ''
    $deerKey = "{0}|{1}" -f (Normalize-Key $species), (Normalize-Key $unitCode)
    if ($deerReview.ContainsKey($deerKey)) {
      $primaryUsfsForestId = SafeString $deerReview[$deerKey].primaryUsfsForestId
      if ($primaryUsfsForestId) {
        $usfsSource = 'Deer authority review'
      }
    }
    if (-not $primaryUsfsForestId -and $eligibility -eq 'Yes') {
      $derived = @(Get-RequiredUsfsForestsForHunt $hunt)
      if ($derived.Count -eq 1) {
        $primaryUsfsForestId = $derived[0]
        $usfsSource = 'App heuristic'
      } elseif ($derived.Count -gt 1) {
        $primaryUsfsForestId = $derived -join ' | '
        $usfsSource = 'App heuristic (multi-forest)'
      }
    }

    $primaryBlmDistrictId = ''
    $blmSource = ''
    if ($eligibility -eq 'Yes') {
      $derivedBlm = @(Get-RequiredBlmDistrictsForHunt $hunt)
      if ($derivedBlm.Count -eq 1) {
        $primaryBlmDistrictId = $derivedBlm[0]
        $blmSource = 'BLM heuristic'
      } elseif ($derivedBlm.Count -gt 1) {
        $primaryBlmDistrictId = $derivedBlm -join ' | '
        $blmSource = 'BLM heuristic (multi-district)'
      }
    }

    $rows[$rowKey] = [ordered]@{
      Species = $species
      UnitName = $unitName
      UnitCode = $unitCode
      HuntCount = 0
      ExampleHuntCodes = New-Object System.Collections.Generic.List[string]
      FederalCoverageEligible = $eligibility
      ExclusionReason = $exclusionReason
      PrimaryUsfsForestId = $primaryUsfsForestId
      PrimaryUsfsForestName = @((Normalize-List $primaryUsfsForestId) | ForEach-Object { Get-ReadableForestName $_ }) -join ' | '
      UsfsAuthoritySource = $usfsSource
      PrimaryBlmDistrictId = $primaryBlmDistrictId
      PrimaryBlmDistrictName = @((Normalize-List $primaryBlmDistrictId) | ForEach-Object { Get-ReadableBlmName $_ }) -join ' | '
      BlmAuthoritySource = $blmSource
      UsfsPermitMatchedOutfitters = New-Object System.Collections.Generic.List[string]
      UsfsPermitMatchedOutfitterCount = 0
      BlmPermitMatchedOutfitters = New-Object System.Collections.Generic.List[string]
      BlmPermitMatchedOutfitterCount = 0
      FederalPermitMatchedOutfitters = New-Object System.Collections.Generic.List[string]
      FederalPermitMatchedOutfitterCount = 0
      Notes = 'Federal permit matching only. Inferred species/unit service-area fields were cleared from the outfitter database on 2026-03-27.'
    }
  }
  $row = $rows[$rowKey]
  $row.HuntCount++
  if ($huntCode -and -not $row.ExampleHuntCodes.Contains($huntCode)) {
    [void]$row.ExampleHuntCodes.Add($huntCode)
  }
}

foreach ($rowKey in @($rows.Keys)) {
  $row = $rows[$rowKey]
  $speciesKey = Normalize-Key $row.Species
  $unitCodeKey = Normalize-Key $row.UnitCode
  $unitNameKey = Normalize-Key $row.UnitName
  $requiredUsfs = @(Normalize-List $row.PrimaryUsfsForestId)

  foreach ($outfitter in $outfitters) {
    $serviceArea = $outfitter.serviceArea
    if ($null -eq $serviceArea) { continue }
    $name = SafeString $outfitter.displayName
    if (-not $name) { continue }

    $usfsForestIds = @(Get-RecordList $serviceArea 'usfsForestIds' | ForEach-Object { Normalize-Key $_ })
    $usfsForests = @(Get-RecordList $serviceArea 'usfsForests' | ForEach-Object { Normalize-Key $_ })
    $blmDistrictIds = @(Get-RecordList $serviceArea 'blmDistrictIds' | ForEach-Object { Normalize-Key $_ })

    if ($requiredUsfs.Count -gt 0) {
      $forestMatch = $false
      foreach ($required in $requiredUsfs) {
        if (($usfsForestIds -contains $required) -or ($usfsForests -contains $required)) {
          $forestMatch = $true
          break
        }
      }
      if ($forestMatch) {
        if (-not $row.UsfsPermitMatchedOutfitters.Contains($name)) {
          [void]$row.UsfsPermitMatchedOutfitters.Add($name)
        }
        if (-not $row.FederalPermitMatchedOutfitters.Contains($name)) {
          [void]$row.FederalPermitMatchedOutfitters.Add($name)
        }
      }
    }

    $requiredBlm = @(Normalize-List $row.PrimaryBlmDistrictId)
    if ($requiredBlm.Count -gt 0) {
      $blmMatch = $false
      foreach ($required in $requiredBlm) {
        if ($blmDistrictIds -contains $required) {
          $blmMatch = $true
          break
        }
      }
      if ($blmMatch) {
        if (-not $row.BlmPermitMatchedOutfitters.Contains($name)) {
          [void]$row.BlmPermitMatchedOutfitters.Add($name)
        }
        if (-not $row.FederalPermitMatchedOutfitters.Contains($name)) {
          [void]$row.FederalPermitMatchedOutfitters.Add($name)
        }
      }
    }
  }

  $row.UsfsPermitMatchedOutfitterCount = $row.UsfsPermitMatchedOutfitters.Count
  $row.BlmPermitMatchedOutfitterCount = $row.BlmPermitMatchedOutfitters.Count
  $row.FederalPermitMatchedOutfitterCount = $row.FederalPermitMatchedOutfitters.Count
}

$exportRows = foreach ($row in ($rows.Values | Sort-Object Species, UnitName)) {
  [pscustomobject]@{
    Species = $row.Species
    UnitName = $row.UnitName
    UnitCode = $row.UnitCode
    HuntCount = $row.HuntCount
    ExampleHuntCodes = ($row.ExampleHuntCodes | Select-Object -First 8) -join ' | '
    FederalCoverageEligible = $row.FederalCoverageEligible
    ExclusionReason = $row.ExclusionReason
    PrimaryUsfsForestId = $row.PrimaryUsfsForestId
    PrimaryUsfsForestName = $row.PrimaryUsfsForestName
    UsfsAuthoritySource = $row.UsfsAuthoritySource
    PrimaryBlmDistrictId = $row.PrimaryBlmDistrictId
    PrimaryBlmDistrictName = $row.PrimaryBlmDistrictName
    BlmAuthoritySource = $row.BlmAuthoritySource
    UsfsPermitMatchedOutfitterCount = $row.UsfsPermitMatchedOutfitterCount
    UsfsPermitMatchedOutfitters = ($row.UsfsPermitMatchedOutfitters | Sort-Object) -join ' | '
    BlmPermitMatchedOutfitterCount = $row.BlmPermitMatchedOutfitterCount
    BlmPermitMatchedOutfitters = ($row.BlmPermitMatchedOutfitters | Sort-Object) -join ' | '
    FederalPermitMatchedOutfitterCount = $row.FederalPermitMatchedOutfitterCount
    FederalPermitMatchedOutfitters = ($row.FederalPermitMatchedOutfitters | Sort-Object) -join ' | '
    Notes = $row.Notes
  }
}

$exportRows | Export-Csv -Path $OutputCsv -NoTypeInformation -Encoding UTF8
$exportRows | ConvertTo-Json -Depth 6 | Set-Content -Path $OutputJson -Encoding UTF8

$summary = [pscustomobject]@{
  OutputCsv = $OutputCsv
  OutputJson = $OutputJson
  TotalRows = $exportRows.Count
  EligibleRows = @($exportRows | Where-Object { $_.FederalCoverageEligible -eq 'Yes' }).Count
  UsfsMappedRows = @($exportRows | Where-Object { $_.PrimaryUsfsForestId }).Count
  BlmMappedRows = @($exportRows | Where-Object { $_.PrimaryBlmDistrictId }).Count
  RowsWithUsfsPermitMatches = @($exportRows | Where-Object { [int]$_.UsfsPermitMatchedOutfitterCount -gt 0 }).Count
  RowsWithBlmPermitMatches = @($exportRows | Where-Object { [int]$_.BlmPermitMatchedOutfitterCount -gt 0 }).Count
  RowsWithFederalPermitMatches = @($exportRows | Where-Object { [int]$_.FederalPermitMatchedOutfitterCount -gt 0 }).Count
}

$summary | Format-List
