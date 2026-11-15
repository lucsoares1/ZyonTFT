param([string]$ImagePath='design/references/17-game-ocr.png')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Get-Content electron/shop-reader.ps1 -Raw
$code=($source -split "@'",2)[1] -split "'@",2 | Select-Object -First 1
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$b=[System.Drawing.Bitmap]::FromFile((Resolve-Path $ImagePath))
try {
 $rows=@()
 foreach($size in @(@(1920,1080),@(1280,720),@(2560,1440),@(2560,1080))){
  $w=$size[0];$h=$size[1];$canvas=[System.Drawing.Bitmap]::new($w,$h);$g=[System.Drawing.Graphics]::FromImage($canvas);$g.Clear([System.Drawing.Color]::Black)
  $rw=[Math]::Min($w,$h*16.0/9);$g.DrawImage($b,[System.Drawing.Rectangle]::new([int](($w-$rw)/2),0,[int]$rw,$h));$g.Dispose()
  try {
   $fit=[ZyonWindows]::FitShopRect(@(-2560,0,$w,$h),@(-2560,0,$w,$h))
   $left=[int]($w*$fit[0]);$top=[int]($h*$fit[1]);$sw=[int]($w*$fit[2]/5);$ch=[int]($h*$fit[3])
   foreach($slot in 0..3){
    $r=[ZyonWindows]::FindCardRect($canvas,($left+$slot*$sw),$top,$sw,$ch)
    if(-not $r){throw "Original frame not found at $w x $h slot $slot"}
    if([Math]::Abs($r[1]-$fit[1]) -gt .012 -or $r[1]+$r[3] -lt .98){throw 'Frame is displaced from original shop card'}
    $rows+=@{width=$w;height=$h;slot=$slot;rect=$r}
   }
  }finally{$canvas.Dispose()}
 }
 @{ok=$true;manualTextCalibrationIgnored=$true;negativeMonitorOrigin=$true;frames=$rows}|ConvertTo-Json -Depth 5
}finally{$b.Dispose()}
