$ErrorActionPreference = 'Stop'

$projectRoot = "C:\UOGA HUNTS\HUNT-PLANNER-CLEAN"
$outputDir = Join-Path $projectRoot 'processed_data'
$outputPath = Join-Path $outputDir 'hunt_database_2026.csv'
$inputDir = 'C:\UOGA HUNTS\raw_data_2026\2026 hunt files'

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

function Normalize-HuntType {
    param([string]$value)
    $t = ([string]$value).Trim()
    if (-not $t) { return '' }
    return $t
}

function Normalize-Weapon {
    param([string]$value)
    $t = ([string]$value).Trim()
    if ($t -match 'Any') { return 'Any Legal Weapon' }
    if ($t -match 'Archery') { return 'Archery' }
    if ($t -match 'Muzzle') { return 'Muzzleloader' }
    return $t
}

function Normalize-SexType {
    param([string]$value)
    $t = ([string]$value).Trim()
    if (-not $t) { return '' }
    if ($t -match 'Hunter') { return "Hunter's Choice" }
    if ($t -match 'Either') { return 'Either Sex' }
    if ($t -match 'Doe|Cow|Ewe|Antlerless') { return 'Antlerless' }
    if ($t -match 'Buck|Bull|Ram|Male|Bearded') { return 'Male Only' }
    return $t
}

function Parse-PermitText {
    param([string]$value)

    $result = [ordered]@{
        res = $null
        nr = $null
        total = $null
    }

    $text = ([string]$value).Trim()
    if (-not $text) { return [pscustomobject]$result }

    if ($text -match 'Res:\s*(\d+)') {
        $result.res = [int]$Matches[1]
    }
    if ($text -match 'NonRes:\s*(\d+)') {
        $result.nr = [int]$Matches[1]
    }
    if ($text -match 'Total:\s*(\d+)') {
        $result.total = [int]$Matches[1]
    }

    return [pscustomobject]$result
}

$rows = New-Object System.Collections.ArrayList
$files = Get-ChildItem $inputDir -File | Where-Object { $_.Extension -in '.xlsx', '.csv' }

foreach ($file in $files) {
    Write-Host "Reading $($file.Name)..."

    try {
        if ($file.Extension -ieq '.csv') {
            $sheetRows = Import-Csv $file.FullName
            foreach ($csvRow in $sheetRows) {
                # CSVs already have headers if needed later; skipping for now unless hunt_code exists
                if ($csvRow.hunt_code) {
                    [void]$rows.Add([pscustomobject]@{
                        hunt_code = [string]$csvRow.hunt_code
                        hunt_name = [string]$csvRow.hunt_name
                        sex_type = Normalize-SexType $csvRow.sex_type
                        species = [string]$csvRow.species
                        weapon = Normalize-Weapon $csvRow.weapon
                        hunt_type = Normalize-HuntType $csvRow.hunt_type
                        season = [string]$csvRow.season
                        permits_2026_res = $null
                        permits_2026_nr = $null
                        permits_2026_total = $null
                        source_file = $file.Name
                    })
                }
            }
            continue
        }

        $excelRows = Import-Excel $file.FullName -NoHeader
        if (-not $excelRows) { continue }

        $current = $null

        foreach ($r in $excelRows) {
            $c1 = [string]$r.P1
            $c2 = [string]$r.P2
            $c3 = [string]$r.P3
            $c4 = [string]$r.P4
            $c5 = [string]$r.P5
            $c6 = [string]$r.P6
            $c7 = [string]$r.P7
            $c8 = [string]$r.P8

            $hasHuntCode = $c2 -match '^[A-Z]{2}\d{4}$'

            if ($hasHuntCode) {
                if ($current) {
                    if ($null -eq $current.permits_2026_total) {
                        $sum = 0
                        $hasAny = $false
                        if ($null -ne $current.permits_2026_res) { $sum += $current.permits_2026_res; $hasAny = $true }
                        if ($null -ne $current.permits_2026_nr) { $sum += $current.permits_2026_nr; $hasAny = $true }
                        if ($hasAny) { $current.permits_2026_total = $sum }
                    }
                    [void]$rows.Add([pscustomobject]$current)
                }

                $permits = Parse-PermitText $c8

                $current = [ordered]@{
                    hunt_code = $c2.Trim()
                    hunt_name = $c1.Trim()
                    sex_type = Normalize-SexType $c3
                    species = ([string]$c4).Trim()
                    weapon = Normalize-Weapon $c5
                    hunt_type = Normalize-HuntType $c6
                    season = ([string]$c7).Trim()
                    permits_2026_res = $permits.res
                    permits_2026_nr = $permits.nr
                    permits_2026_total = $permits.total
                    source_file = $file.Name
                }
            }
            elseif ($current) {
                $permits = Parse-PermitText $c8
                if ($null -ne $permits.res) { $current.permits_2026_res = $permits.res }
                if ($null -ne $permits.nr) { $current.permits_2026_nr = $permits.nr }
                if ($null -ne $permits.total) { $current.permits_2026_total = $permits.total }
            }
        }

        if ($current) {
            if ($null -eq $current.permits_2026_total) {
                $sum = 0
                $hasAny = $false
                if ($null -ne $current.permits_2026_res) { $sum += $current.permits_2026_res; $hasAny = $true }
                if ($null -ne $current.permits_2026_nr) { $sum += $current.permits_2026_nr; $hasAny = $true }
                if ($hasAny) { $current.permits_2026_total = $sum }
            }
            [void]$rows.Add([pscustomobject]$current)
        }
    }
    catch {
        Write-Warning "Skipped unreadable file: $($file.FullName)"
    }
}

$final = $rows |
    Where-Object { $_.hunt_code } |
    Sort-Object hunt_code, source_file |
    Group-Object hunt_code |
    ForEach-Object {
        $_.Group |
            Sort-Object `
                @{ Expression = { if ($_.permits_2026_total -ne $null) { 1 } else { 0 } }; Descending = $true },
                @{ Expression = { $_.source_file }; Descending = $false } |
            Select-Object -First 1
    }

$final | Export-Csv $outputPath -NoTypeInformation -Encoding UTF8

Write-Host "Hunt database built:"
Write-Host $outputPath
Write-Host "Rows: $($final.Count)"