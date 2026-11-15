param([string]$OutputDirectory,[string]$OverlayPath,[string]$BaselinePath='design/references/17-game-ocr.png')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Get-Content -LiteralPath 'electron/shop-reader.ps1' -Raw
$code=[regex]::Match($source,"(?s)Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$base=[System.Drawing.Bitmap]::FromFile((Resolve-Path $BaselinePath))
$left=[int]($base.Width*.2295);$top=[int]($base.Height*.858);$width=[int]($base.Width*.53);$slot=[int]($width/5);$height=[int]($base.Height*.139)
$hover=$base.Clone();$g=[System.Drawing.Graphics]::FromImage($hover)
try {
 $brush=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,255,255,255))
 $g.FillRectangle($brush,$left,$top,$width,([int]($height*.7)));$brush.Dispose()
 $g.FillRectangle([System.Drawing.Brushes]::White,($left+80),($top+28),2,2)
}finally{$g.Dispose()}
$hover.Save((Join-Path $OutputDirectory 'hover.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$first=[ZyonWindows]::SlotChanged(0,$base,$left,$top,$slot,$height,($top+[int]($height*.8)),[int]($height*.2))
$hoverChanged=[ZyonWindows]::SlotChanged(0,$hover,$left,$top,$slot,$height,($top+[int]($height*.8)),[int]($height*.2))
if(-not $first -or $hoverChanged){throw 'Hover/glint invalidated a stable champion'}
if($OverlayPath){
 $overlay=[System.Drawing.Bitmap]::FromFile($OverlayPath)
 try {
  for($i=0;$i -lt 4;$i++){
   [ZyonWindows]::ResetVisuals()
   $x=$left+$i*$slot
   $null=[ZyonWindows]::SlotChanged($i,$base,$x,$top,$slot,$height,($top+[int]($height*.8)),[int]($height*.2))
   if([ZyonWindows]::SlotChanged($i,$overlay,$x,$top,$slot,$height,($top+[int]($height*.8)),[int]($height*.2))){throw "Our own rendered medal/frame invalidated slot $i"}
   $empty=$overlay.Clone();$eg=[System.Drawing.Graphics]::FromImage($empty)
   try {
    # Keep the actual rendered seal, remove the purchased card beneath it.
    $eg.FillRectangle([System.Drawing.Brushes]::Black,$x,($top+[int][Math]::Floor($height*.4)),$slot,([int][Math]::Ceiling($height*.6)+1))
    $eg.Flush()
    if(-not [ZyonWindows]::EmptyCard($empty,$x,$top,$slot,$height)){throw "A lingering seal prevents empty-card detection in slot $i"}
   }finally{$eg.Dispose();$empty.Dispose()}
  }
 }finally{$overlay.Dispose()}
}
$geometry=@()
foreach($case in @(@{name='1080p';client=@(0,0,1920,1080);monitor=@(0,0,1920,1080)},@{name='1440p';client=@(0,0,2560,1440);monitor=@(0,0,2560,1440)},@{name='ultrawide';client=@(0,0,2560,1080);monitor=@(0,0,2560,1080)},@{name='windowed';client=@(160,100,1600,900);monitor=@(0,0,1920,1080)},@{name='second-monitor-150dpi';client=@(3840,0,2560,1440);monitor=@(3840,0,2560,1440)},@{name='4:3';client=@(0,0,1440,1080);monitor=@(0,0,1440,1080)})){
 $rect=[ZyonWindows]::FitShopRect($case.client,$case.monitor)
 $reference=[Math]::Min($case.client[2],$case.client[3]*16/9)
 $actualWidth=$rect[2]*$case.monitor[2];$expectedWidth=$reference*.53
 if([Math]::Abs($actualWidth-$expectedWidth) -gt .001){throw 'Shop stretched with monitor width'}
 $actualTop=$rect[1]*$case.monitor[3]+$case.monitor[1]
 if([Math]::Abs($actualTop-($case.client[1]+$case.client[3]*.858)) -gt .001){throw 'Shop top ignores game viewport'}
 $geometry+=@{name=$case.name;rect=$rect}
}
@{hoverDoesNotInvalidate=$true;geometry=$geometry}|ConvertTo-Json -Depth 5 -Compress
$hover.Dispose();$base.Dispose()
