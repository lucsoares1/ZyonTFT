$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Get-Content electron/shop-reader.ps1 -Raw
$code=($source -split "@'",2)[1] -split "'@",2 | Select-Object -First 1
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$original=[System.Drawing.Bitmap]::FromFile((Resolve-Path 'design/references/17-game-ocr.png'))
$root=Join-Path (Resolve-Path '.runtime') ('calibration-native-'+[guid]::NewGuid().ToString())
$null=New-Item -ItemType Directory -Path $root
try {
 $shift=[int]($original.Height*.05)
 $shifted=[System.Drawing.Bitmap]::new($original.Width,$original.Height)
 $g=[System.Drawing.Graphics]::FromImage($shifted);$g.Clear([System.Drawing.Color]::Black);$g.DrawImageUnscaled($original,0,-$shift);$g.Dispose()
 $image=Join-Path $root 'shop-higher.png';$shifted.Save($image,[System.Drawing.Imaging.ImageFormat]::Png);$shifted.Dispose()
 $rect=@{x=.2295;y=.858-$shift/$original.Height;width=.53;height=.139}
 $config=Join-Path $root 'reader.json';@{rect=$rect;cardRect=$rect;shopNames=@()}|ConvertTo-Json -Depth 4|Set-Content -LiteralPath $config -Encoding UTF8
 $events=@(& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File electron/shop-reader.ps1 -ImagePath $image -ShopFixture -Fast -Once -ConfigPath $config | ForEach-Object {$_|ConvertFrom-Json})
 if($LASTEXITCODE -ne 0 -or @($events|Where-Object {$_.error}).Count){throw 'Native adjusted reader failed'}
 $shops=@($events|Where-Object kind -eq 'shop');$recognized=@($shops|Where-Object phase -eq 'recognized')
 if(-not $shops.Count -or @($shops|Where-Object {[Math]::Abs($_.shopRect.y-$rect.y)-gt .00001}).Count){throw 'Manual frame not applied'}
 $events|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $root 'events.json') -Encoding UTF8
 $frames=@($shops[-1].shopCards|Where-Object {$null -ne $_});if($frames.Count -lt 4){throw 'Original borders not found in shifted shop'}
 if(-not $recognized.Count -or -not ($recognized[-1].slots -join '').Trim()){throw 'OCR did not read shifted shop'}
 $automatic=[ZyonWindows]::FitShopRect(@(-2560,0,2560,1080),@(-2560,0,2560,1080));$invalid=[ZyonWindows]::ResolveShopFrame($automatic,@(0,0,.1,.1));if($invalid[1]-ne .858){throw 'Invalid manual rectangle accepted'}
 $report=@{ok=$true;shiftPixels=$shift;frameY=$shops[-1].shopRect.y;frames=$frames.Count;slots=$recognized[-1].slots;invalidManualRejected=$true}
 $out='design/review/0.17.26';$null=New-Item -ItemType Directory -Path $out -Force;$report|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $out 'native-calibration.json') -Encoding UTF8;$report|ConvertTo-Json -Depth 5
}finally{$original.Dispose()}
