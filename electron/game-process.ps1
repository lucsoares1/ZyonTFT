# Keep the assignment direct: Windows PowerShell 5 returns JSON arrays as one
# pipeline object. Wrapping this pipeline in @() creates a nested array.
$script:ZyonGameProcessNames = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'game-processes.json') -Raw | ConvertFrom-Json
function Test-ZyonGameProcess([string]$Name) {
  return $script:ZyonGameProcessNames -contains $Name
}
