param([string]$SourcePath,[string]$OutputDirectory,[string]$BarPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=[Drawing.Bitmap]::FromFile($SourcePath)
try {
  foreach($variant in @('top-only','blank')){
    $image=[Drawing.Bitmap]::new($source.Width,$source.Height)
    $g=[Drawing.Graphics]::FromImage($image)
    try{
      $g.Clear([Drawing.Color]::FromArgb(22,25,31))
      if($variant -eq 'top-only'){$g.DrawImage($source,[Drawing.Rectangle]::new(0,0,$source.Width,80),[Drawing.Rectangle]::new(0,0,$source.Width,80),[Drawing.GraphicsUnit]::Pixel)}
      $image.Save((Join-Path $OutputDirectory ($variant+'.png')),[Drawing.Imaging.ImageFormat]::Png)
    }finally{$g.Dispose();$image.Dispose()}
  }
  if($BarPath){
    $bar=[Drawing.Bitmap]::FromFile($BarPath);$image=[Drawing.Bitmap]::new($source.Width,$source.Height);$g=[Drawing.Graphics]::FromImage($image)
    try{
      $g.Clear([Drawing.Color]::FromArgb(22,25,31));$g.DrawImageUnscaled($bar,[int](($source.Width-$bar.Width)/2),0)
      $image.Save((Join-Path $OutputDirectory 'round-3-3.png'),[Drawing.Imaging.ImageFormat]::Png)
    }finally{$g.Dispose();$image.Dispose();$bar.Dispose()}
  }
}finally{$source.Dispose()}
