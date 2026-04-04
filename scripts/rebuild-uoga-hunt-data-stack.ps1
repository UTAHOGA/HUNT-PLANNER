$ErrorActionPreference = 'Stop'

$python = 'C:\Program Files\QGIS 3.44.8\apps\Python312\python.exe'
$plannerRoot = 'C:\UOGA HUNTS\HUNT-PLANNER'
$cleanRoot = 'C:\UOGA HUNTS\HUNT-PLANNER-CLEAN'
$productionRoot = 'C:\UOGA HUNTS\PROJECT CORE\PRODUCTION BUILD'

Write-Host 'Rebuilding canonical hunt data stack...'

& $python 'C:\UOGA HUNTS\HUNT-PLANNER\scripts\build-hunt-master-enriched.py'
& $python 'C:\UOGA HUNTS\PROJECT CORE\PRODUCTION BUILD\build_production_engine.py'
& $python 'C:\UOGA HUNTS\PROJECT CORE\PRODUCTION BUILD\build_production_views.py'
& $python 'C:\UOGA HUNTS\HUNT-PLANNER\scripts\build-hunt-database-complete.py'
& 'C:\UOGA HUNTS\HUNT-PLANNER\scripts\build-hunt-research-page-data.ps1'

Write-Host 'Syncing rebuilt outputs into canonical app and clean repo...'

Copy-Item "$productionRoot\draw_reality_engine.csv" "$plannerRoot\processed_data\draw_reality_engine.csv" -Force
Copy-Item "$productionRoot\point_ladder_view.csv" "$plannerRoot\processed_data\point_ladder_view.csv" -Force
Copy-Item "$productionRoot\hunt_master_enriched.csv" "$plannerRoot\processed_data\hunt_master_enriched.csv" -Force

Copy-Item "$plannerRoot\processed_data\draw_reality_engine.csv" "$cleanRoot\processed_data\draw_reality_engine.csv" -Force
Copy-Item "$plannerRoot\processed_data\point_ladder_view.csv" "$cleanRoot\processed_data\point_ladder_view.csv" -Force
Copy-Item "$plannerRoot\processed_data\hunt_master_enriched.csv" "$cleanRoot\processed_data\hunt_master_enriched.csv" -Force
Copy-Item "$plannerRoot\processed_data\hunt_database_complete.csv" "$cleanRoot\processed_data\hunt_database_complete.csv" -Force
Copy-Item "$plannerRoot\processed_data\hunt_research_2026.json" "$cleanRoot\processed_data\hunt_research_2026.json" -Force

Write-Host 'Done.'
Get-Item `
  "$plannerRoot\processed_data\draw_reality_engine.csv", `
  "$plannerRoot\processed_data\point_ladder_view.csv", `
  "$plannerRoot\processed_data\hunt_master_enriched.csv", `
  "$plannerRoot\processed_data\hunt_database_complete.csv", `
  "$plannerRoot\processed_data\hunt_research_2026.json" | Select-Object FullName, LastWriteTime, Length
