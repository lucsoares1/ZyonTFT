param([string]$SourcePath,[string]$OutputDirectory)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=[System.Drawing.Bitmap]::FromFile($SourcePath)
try {
  $left=[int]($source.Width*.2295);$top=[int]($source.Height*.858);$width=[int]($source.Width*.53);$slot=[int]($width/5);$height=[int]($source.Height*.139)
  $swap=$source.Clone();$g=[System.Drawing.Graphics]::FromImage($swap)
  try {
    foreach($pair in @(@(0,2),@(2,0))){
      $g.DrawImage($source,[System.Drawing.Rectangle]::new(($left+$pair[0]*$slot),$top,$slot,$height),[System.Drawing.Rectangle]::new(($left+$pair[1]*$slot),$top,$slot,$height),[System.Drawing.GraphicsUnit]::Pixel)
    }
    $swap.Save((Join-Path $OutputDirectory 'swapped.png'),[System.Drawing.Imaging.ImageFormat]::Png)
  }finally{$g.Dispose()}
  $g=[System.Drawing.Graphics]::FromImage($swap)
  try{$g.FillRectangle([System.Drawing.Brushes]::Black,($left+2*$slot),$top,$slot,$height);$swap.Save((Join-Path $OutputDirectory 'sold.png'),[System.Drawing.Imaging.ImageFormat]::Png)}finally{$g.Dispose();$swap.Dispose()}
}finally{$source.Dispose()}
