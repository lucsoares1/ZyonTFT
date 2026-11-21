param([string]$ImagePath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$script=Get-Content -LiteralPath (Join-Path $PSScriptRoot '../electron/shop-reader.ps1') -Raw
$source=[regex]::Match($script,"(?s)-TypeDefinition @'\r?\n(.*?)\r?\n'@").Groups[1].Value
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $source
$image=if($ImagePath){[System.Drawing.Bitmap]::FromFile($ImagePath)}else{New-Object System.Drawing.Bitmap(1232,207)}
if(-not $ImagePath){
  $graphics=[System.Drawing.Graphics]::FromImage($image)
  $pen=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130,145,150),2)
  try {for($slot=0;$slot -lt 5;$slot++){$graphics.DrawRectangle($pen,(214+$slot*203),55,190,145)}}finally{$pen.Dispose();$graphics.Dispose()}
}
try {
  $results=@()
  foreach($scale in @(.75,1,1.25,2)){
  $scaled=New-Object System.Drawing.Bitmap([int]($image.Width*$scale),[int]($image.Height*$scale))
  $graphics=[System.Drawing.Graphics]::FromImage($scaled)
  $graphics.DrawImage($image,0,0,$scaled.Width,$scaled.Height)
  $graphics.Dispose()
  try {foreach($offset in @(-95,0,95)){
    $frame=@(([double](209+$offset)*$scale/$scaled.Width),([double]55*$scale/$scaled.Height),([double]1017*$scale/$scaled.Width),([double]150*$scale/$scaled.Height))
    $watch=[Diagnostics.Stopwatch]::StartNew()
    $aligned=[ZyonWindows]::AlignShopFrame($scaled,$frame)
    $watch.Stop()
    if([Math]::Abs($aligned[0]*$scaled.Width-209*$scale) -gt 8*$scale){throw "Incorrect anchor at scale $scale, offset $offset"}
    $cards=@()
    for($slot=0;$slot -lt 5;$slot++){
      $rect=[ZyonWindows]::FindCardRect($scaled,[int]($aligned[0]*$scaled.Width)+$slot*[int](203*$scale),[int](55*$scale),[int](203*$scale),[int](150*$scale))
      $cards+=,$rect
    }
    $results+=@{scale=$scale;offset=$offset;left=$aligned[0]*$scaled.Width;milliseconds=$watch.ElapsedMilliseconds;cards=$cards}
  }}finally{$scaled.Dispose()}
  }
  $blank=New-Object System.Drawing.Bitmap($image.Width,$image.Height)
  try {
    $frame=@(.2,.2,.5,.5)
    $aligned=[ZyonWindows]::AlignShopFrame($blank,$frame)
    if(($aligned -join ',') -ne ($frame -join ',')){throw 'Blank frames must not create a new anchor'}
    if([ZyonWindows]::ConfirmShopFrame($blank,$frame)){throw 'Blank frame must not be confirmed'}
  }finally{$blank.Dispose()}
  $results|ConvertTo-Json -Depth 5 -Compress
}finally{$image.Dispose()}
