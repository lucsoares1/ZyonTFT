param([string]$OutputDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$base=[Drawing.Bitmap]::FromFile((Resolve-Path 'design/references/17-game-ocr.png'))
$shop=[Drawing.Bitmap]::FromFile((Resolve-Path 'design/references/35-game-level1-gold3.png'))
try {
 foreach($variant in @('level6','level7','blank-level')){
  $image=[Drawing.Bitmap]::new($base);$g=[Drawing.Graphics]::FromImage($image)
  try {
   # Controlled fixture: actual Ornn card pixels replace Vi in screenshot17.
   $src=[Drawing.Rectangle]::new([int]($shop.Width*(.2295+.53*4/5)),[int]($shop.Height*.858),[int]($shop.Width*.53/5),[int]($shop.Height*.139))
   $dst=[Drawing.Rectangle]::new([int]($base.Width*.2295),[int]($base.Height*.858),[int]($base.Width*.53/5),[int]($base.Height*.139))
   $g.DrawImage($shop,$dst,$src,[Drawing.GraphicsUnit]::Pixel)
   if($variant -ne 'level7'){
    $left=[int]($base.Width*.1235);$top=[int]($base.Height*.81769)
    $brush=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(15,29,33));$font=[Drawing.Font]::new('Arial',14,[Drawing.FontStyle]::Bold)
    try{$g.FillRectangle($brush,$left,$top,81,24);if($variant -eq 'level6'){$g.DrawString('Nv. 6',$font,[Drawing.Brushes]::White,($left+2),($top+1))}}finally{$brush.Dispose();$font.Dispose()}
   }
   $image.Save((Join-Path $OutputDirectory ($variant+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  }finally{$g.Dispose();$image.Dispose()}
 }
}finally{$base.Dispose();$shop.Dispose()}
