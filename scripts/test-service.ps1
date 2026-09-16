$root=Join-Path $env:LOCALAPPDATA "ObsidianDailyLogger"; $token=Get-Content (Join-Path $root "config\auth-token") -Raw
Invoke-RestMethod "http://127.0.0.1:8765/api/health" -Headers @{"X-ODL-Token"=$token.Trim()}
