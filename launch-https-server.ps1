$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @('server.js') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
