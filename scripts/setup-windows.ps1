$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows first.' }
if (-not (Test-Path (Join-Path $repo '.git'))) { git -C $repo init; git -C $repo branch -M main }
Copy-Item (Join-Path $repo '.env.example') (Join-Path $repo '.env') -ErrorAction SilentlyContinue
& (Join-Path $repo 'scripts\validate.ps1')
Write-Host 'UPFS is ready. Open this folder in Codex:' $repo
