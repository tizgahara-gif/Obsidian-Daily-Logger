$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dataRoot = Join-Path $env:LOCALAPPDATA "ObsidianDailyLogger"
$configDir = Join-Path $dataRoot "config"
$configFile = Join-Path $configDir "config.json"
$vault = Read-Host "Obsidian Vault Path"
if (-not (Test-Path -LiteralPath $vault -PathType Container)) { throw "Vault path is not a directory" }
$daily = Read-Host "Daily Notes Folder [Daily]"; if ([string]::IsNullOrWhiteSpace($daily)) { $daily = "Daily" }
$timezone = Read-Host "Timezone [Asia/Tokyo]"; if ([string]::IsNullOrWhiteSpace($timezone)) { $timezone = "Asia/Tokyo" }
try { [System.TimeZoneInfo]::FindSystemTimeZoneById($timezone) | Out-Null } catch { if ($timezone -ne "Asia/Tokyo") { throw "Invalid timezone" } }
$summaryTime = Read-Host "Summary Time [00:05]"; if ([string]::IsNullOrWhiteSpace($summaryTime)) { $summaryTime = "00:05" }
if ($summaryTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$') { throw "Invalid time (HH:mm required)" }
New-Item -ItemType Directory -Force $configDir, (Join-Path $dataRoot "data\conversations"), (Join-Path $dataRoot "data\events"), (Join-Path $dataRoot "data\manual-notes"), (Join-Path $dataRoot "data\summaries"), (Join-Path $dataRoot "logs") | Out-Null
if (-not (Test-Path -LiteralPath $configFile)) {
  @{schemaVersion=1;timezone=$timezone;server=@{host="127.0.0.1";port=8765};obsidian=@{vaultPath=$vault;dailyNotesDirectory=$daily;dailyNoteFormat="YYYY-MM-DD"};summary=@{provider="openai";model="";autoRun=$true;runAt=$summaryTime;targetDate="yesterday";dayBoundaryHour=0;includeSourceLinks=$true};capture=@{chatgpt=$true;includeUserMessages=$true;includeAssistantMessages=$true}} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configFile -Encoding utf8
} else { Write-Warning "Existing config preserved: $configFile" }
$tokenFile = Join-Path $configDir "auth-token"; if (-not (Test-Path $tokenFile)) { $bytes=New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Fill($bytes); [Convert]::ToHexString($bytes).ToLowerInvariant() | Set-Content $tokenFile -NoNewline }
$node=(Get-Command node).Source
$serviceAction=New-ScheduledTaskAction -Execute $node -Argument ('"{0}"' -f (Join-Path $root "dist\local\server.js")) -WorkingDirectory $root
Register-ScheduledTask -TaskName "Obsidian Daily Logger - Service" -Action $serviceAction -Trigger (New-ScheduledTaskTrigger -AtLogOn) -Force | Out-Null
$summaryAction=New-ScheduledTaskAction -Execute $node -Argument ('"{0}" summarize --date yesterday' -f (Join-Path $root "dist\local\cli.js")) -WorkingDirectory $root
$trigger=New-ScheduledTaskTrigger -Daily -At $summaryTime; $settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 4 -RestartInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "Obsidian Daily Logger - Daily Summary" -Action $summaryAction -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Installed. Copy this token into the Chrome extension options:"; Get-Content $tokenFile
