# Watches the project for local changes and auto-commits + pushes to GitHub.
# A push to origin/master triggers Vercel's connected GitHub integration to auto-deploy.
# Run manually: powershell -ExecutionPolicy Bypass -File scripts\auto-push.ps1

$ErrorActionPreference = "SilentlyContinue"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$debounceSeconds = 30
$excludeDirs = @('.git', 'node_modules', '.next', '.vercel')

$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $repoRoot
$fsw.IncludeSubdirectories = $true
$fsw.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName

$script:lastChange = Get-Date

$action = {
    $path = $Event.SourceEventArgs.FullPath
    foreach ($dir in $excludeDirs) {
        if ($path -like "*\$dir\*") { return }
    }
    $script:lastChange = Get-Date
}

Register-ObjectEvent $fsw Changed -Action $action | Out-Null
Register-ObjectEvent $fsw Created -Action $action | Out-Null
Register-ObjectEvent $fsw Deleted -Action $action | Out-Null
Register-ObjectEvent $fsw Renamed -Action $action | Out-Null
$fsw.EnableRaisingEvents = $true

Write-Host "Watching $repoRoot for changes (debounce: ${debounceSeconds}s). Ctrl+C to stop."

while ($true) {
    Start-Sleep -Seconds 5
    $idleFor = (Get-Date) - $script:lastChange
    if ($idleFor.TotalSeconds -lt $debounceSeconds) { continue }

    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) { continue }

    git add -A
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Auto-sync: local changes at $timestamp" | Out-Null
    git push origin master

    Write-Host "[$timestamp] Pushed local changes to GitHub."
    $script:lastChange = Get-Date -Date "1900-01-01"
}
