param([string]$BasePath,[string]$LevelPath,[string]$OutputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$board=[Drawing.Bitmap]::FromFile($BasePath)
$hud=[Drawing.Bitmap]::FromFile($LevelPath)
$g=[Drawing.Graphics]::FromImage($board)
try {
  # Test-only composite: the actual Nv.9 pixels from screenshot41 over the
  # screenshot17 HUD. Shop, gold and all other pixels stay in screenshot17.
  $left=[int]($board.Width*.1235);$top=[int]($board.Height*.81769)
  $brush=[Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(15,29,33))
  try{$g.FillRectangle($brush,$left,$top,81,24)}finally{$brush.Dispose()}
  $g.DrawImage($hud,[Drawing.Rectangle]::new($left+4,$top+1,63,22),[Drawing.Rectangle]::new(52,735,63,22),[Drawing.GraphicsUnit]::Pixel)
  $board.Save($OutputPath,[Drawing.Imaging.ImageFormat]::Png)
}finally{$g.Dispose();$hud.Dispose();$board.Dispose()}
