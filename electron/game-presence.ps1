$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'game-process.ps1')
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ZyonForeground {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint id);
}
'@
$previousPid = -1
$gameProcess = $null
$matchId = $null
$lastKey = ''
$lastSent = [DateTime]::MinValue
while ($true) {
  $foregroundId = [uint32]0
  $foregroundWindow = [ZyonForeground]::GetForegroundWindow()
  $null = [ZyonForeground]::GetWindowThreadProcessId($foregroundWindow, [ref]$foregroundId)
  $ended = $null
  if ($gameProcess -and $gameProcess.HasExited) {
    $ended = $matchId; $gameProcess.Dispose(); $gameProcess = $null; $matchId = $null; $previousPid = -1
  }
  if ($foregroundId -ne $previousPid) {
    $previousPid = $foregroundId
    $foregroundGame = $false
    $gameName = ''
    try {
      $candidate = [System.Diagnostics.Process]::GetProcessById([int]$foregroundId)
      if (Test-ZyonGameProcess $candidate.ProcessName) {
        $candidateId = "$foregroundId-$($candidate.StartTime.ToUniversalTime().Ticks)"
        if ($gameProcess) { $gameProcess.Dispose() }
        $gameProcess = $candidate; $matchId = $candidateId
        $foregroundGame = $true; $gameName = $candidate.ProcessName
      } else { $candidate.Dispose() }
    } catch { $foregroundGame = $false; $gameName = '' }
  }
  $presenceRecord = @{foreground=$foregroundGame;foregroundWindow=$foregroundWindow.ToInt64().ToString();processName=$gameName;matchId=$matchId;endedMatchId=$ended}
  $key = $presenceRecord | ConvertTo-Json -Compress
  if ($key -ne $lastKey -or ([DateTime]::UtcNow - $lastSent).TotalMilliseconds -ge 1000) {
    $lastKey = $key; $lastSent = [DateTime]::UtcNow
    $presenceRecord.at = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $presenceRecord | ConvertTo-Json -Compress
  }
  Start-Sleep -Milliseconds 100
}
