param([string]$BackgroundPath,[string]$PopupPath,[string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$background=[Drawing.Bitmap]::FromFile($BackgroundPath)
$popup=[Drawing.Bitmap]::FromFile($PopupPath)
$image=[Drawing.Bitmap]::new(1920,1080)
$g=[Drawing.Graphics]::FromImage($image)
try {
  # Explicit test composite of two user screenshots, without a live shop HUD.
  $g.DrawImage($background,0,0,1920,1080)
  $brush=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(30,12,70))
  try{$g.FillRectangle($brush,0,820,1920,260)}finally{$brush.Dispose()}
  $g.DrawImageUnscaled($popup,820,340)
  $image.Save($OutputPath,[Drawing.Imaging.ImageFormat]::Png)
}finally{$g.Dispose();$image.Dispose();$popup.Dispose();$background.Dispose()}
