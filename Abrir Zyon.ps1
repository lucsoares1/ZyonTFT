$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronExecutable = Join-Path $projectDirectory 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'dist\index.html'))) {
  Write-Error 'Execute npm run build na pasta do projeto antes de abrir.'
  exit 1
}
Start-Process -FilePath $electronExecutable -ArgumentList ('"' + $projectDirectory + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden
