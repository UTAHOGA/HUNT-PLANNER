$ErrorActionPreference = 'Stop'

$huntDbPath = "C:\UOGA HUNTS\HUNT-PLANNER-CLEAN\processed_data\hunt_database_2026.csv"
$permitOverlayPath = "C:\UOGA HUNTS\uoga_project_backup\raw_data 2025\hunt_join_2025.1.csv"
$outputPath = "C:\UOGA HUNTS\HUNT-PLANNER-CLEAN\processed_data\hunt_database_2026_enriched2.csv"

function To-NullableInt {
    param([object]$value)
    if ($null -eq $value) { return $null }
    $text = ([string]$value).Trim()
    if (-not $text) { return $null }
    try { return [int][double]$text } catch { return $null }
}

$huntDb = Import-Csv $huntDbPath
$overlay = Import-Csv $permitOverlayPath

$overlayByCode = @{}
foreach ($row in $overlay) {
    $code = ([string]$row.hunt_code).Trim()
    if (-not $code) { continue }
    $overlayByCode[$code] = $row
}

$merged = foreach ($row in $huntDb) {
    $code = ([string]$row.hunt_code).Trim()

    if ($overlayByCode.ContainsKey($code)) {
        $o = $overlayByCode[$code]

        $row | Add-Member -NotePropertyName permits_2025_res   -NotePropertyValue "" -Force
        $row | Add-Member -NotePropertyName permits_2025_nr    -NotePropertyValue "" -Force
        $row | Add-Member -NotePropertyName permits_2025_total -NotePropertyValue "" -Force

        $p25r = To-NullableInt $o.permits_2025_res
        $p25n = To-NullableInt $o.permits_2025_nr
        $p25t = To-NullableInt $o.permits_2025_total

        $p26r = To-NullableInt $o.permits_2026_res
        $p26n = To-NullableInt $o.permits_2026_nr
        $p26t = To-NullableInt $o.permits_2026_total

        if ($null -ne $p25r) { $row.permits_2025_res = $p25r }
        if ($null -ne $p25n) { $row.permits_2025_nr = $p25n }
        if ($null -ne $p25t) { $row.permits_2025_total = $p25t }

        if ($null -ne $p26r) { $row.permits_2026_res = $p26r }
        if ($null -ne $p26n) { $row.permits_2026_nr = $p26n }
        if ($null -ne $p26t) { $row.permits_2026_total = $p26t }

        $row | Add-Member -NotePropertyName permit_overlay_source -NotePropertyValue "hunt_join_2025.1.csv" -Force
    }
    else {
        $row | Add-Member -NotePropertyName permits_2025_res -NotePropertyValue "" -Force
        $row | Add-Member -NotePropertyName permits_2025_nr -NotePropertyValue "" -Force
        $row | Add-Member -NotePropertyName permits_2025_total -NotePropertyValue "" -Force
        $row | Add-Member -NotePropertyName permit_overlay_source -NotePropertyValue "" -Force
    }

    $row
}

$merged | Export-Csv $outputPath -NoTypeInformation -Encoding UTF8

Write-Host "Merged hunt database created:"
Write-Host $outputPath
Write-Host "Rows:" ($merged.Count)