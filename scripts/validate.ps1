$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$artifactDir = Join-Path $root 'artifacts'
New-Item -ItemType Directory -Force $artifactDir | Out-Null

$validator = Join-Path $PSScriptRoot 'validate-repository.mjs'
if (-not (Test-Path $validator)) {
  throw "Missing validator script: $validator"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction Stop
}

$nodeModulesPath = Join-Path $root 'node_modules\yaml'
if (-not (Test-Path $nodeModulesPath)) {
  & $npmCommand.Source ci --ignore-scripts
}

& node $validator $root

$reportPath = Join-Path $artifactDir 'validation-report.json'
if (-not (Test-Path $reportPath)) {
  throw "Validation report was not produced at $reportPath"
}

$report = Get-Content -Raw $reportPath | ConvertFrom-Json
if ($report.status -ne 'passed') {
  throw 'Validation did not complete successfully.'
}

Write-Host "UPFS validation passed: $($report.metrics.markdown_files) Markdown files; $($report.metrics.json_contracts) JSON contracts; $($report.metrics.yaml_contracts) YAML contracts."
