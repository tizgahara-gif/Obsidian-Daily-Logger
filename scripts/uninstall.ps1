$ErrorActionPreference="Stop"
"Obsidian Daily Logger - Service","Obsidian Daily Logger - Daily Summary" | ForEach-Object { Unregister-ScheduledTask -TaskName $_ -Confirm:$false -ErrorAction SilentlyContinue }
Write-Host "Tasks removed. Config, logs, and conversation data were preserved."
