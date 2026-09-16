$root=Split-Path -Parent $PSScriptRoot; & node (Join-Path $root "dist\local\server.js")
