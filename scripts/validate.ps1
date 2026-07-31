$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$required = @('README.md','START_HERE.md','AGENTS.md','tasks/queue.yaml','contracts/openapi/public-api.yaml','contracts/asyncapi/platform-events.yaml','contracts/schemas/transaction.schema.json')
$missing = @($required | Where-Object { -not (Test-Path (Join-Path $root $_)) })
if ($missing.Count -gt 0) { throw "Missing required files: $($missing -join ', ')" }
$jsonFiles = Get-ChildItem (Join-Path $root 'contracts') -Recurse -Filter '*.json'
foreach ($file in $jsonFiles) { Get-Content -Raw $file.FullName | ConvertFrom-Json | Out-Null }
$markdown = Get-ChildItem $root -Recurse -Filter '*.md' | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
$badLinks = @()
foreach ($file in $markdown) {
  $body = Get-Content -Raw $file.FullName
  foreach ($match in [regex]::Matches($body, '\[[^\]]+\]\((?!https?://|#)([^)]+)\)')) {
    $target = $match.Groups[1].Value.Split('#')[0]
    if ($target -and -not (Test-Path (Join-Path $file.DirectoryName $target))) { $badLinks += "$($file.FullName): $target" }
  }
}
if ($badLinks.Count -gt 0) { throw "Broken local links:`n$($badLinks -join "`n")" }
$queue = Get-Content -Raw (Join-Path $root 'tasks/queue.yaml')
if ($queue -notmatch 'id: TASK-0001' -or $queue -notmatch 'status: ready') { throw 'Task queue baseline is invalid' }
$artifactDir = Join-Path $root 'artifacts'
New-Item -ItemType Directory -Force $artifactDir | Out-Null
$report = [ordered]@{ status='passed'; timestamp=(Get-Date).ToUniversalTime().ToString('o'); markdown_files=$markdown.Count; json_contracts=$jsonFiles.Count; required_files=$required.Count }
$report | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $artifactDir 'validation-report.json')
Write-Host "UPFS validation passed: $($markdown.Count) Markdown files; $($jsonFiles.Count) JSON contracts."
