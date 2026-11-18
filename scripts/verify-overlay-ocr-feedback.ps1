param([string]$CleanPath,[string]$MarkedPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$source=Get-Content electron/shop-reader.ps1 -Raw
$code=($source -split "@'",2)[1] -split "'@",2 | Select-Object -First 1
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition $code
$clean=[System.Drawing.Bitmap]::FromFile((Resolve-Path $CleanPath))
$marked=[System.Drawing.Bitmap]::FromFile((Resolve-Path $MarkedPath))
try {
  if($clean.Size -ne $marked.Size){throw 'Different bitmap sizes'}
  $left=[int]($clean.Width*.2295);$top=[int]($clean.Height*.858)
  $width=[int]($clean.Width*.53);$height=[int]($clean.Height*.139)
  $slotWidth=[int]($width/5);$textTop=$top+[int]($height*.8)
  $textHeight=[Math]::Min([Math]::Max(22,[int]($height*.2)),$clean.Height-$textTop)
  $slots=@()
  foreach($slot in 0..4){
    $slotLeft=$left+$slot*$slotWidth
    $null=[ZyonWindows]::SlotChange($slot,$clean,$slotLeft,$top,$slotWidth,$height,$textTop,$textHeight)
    $change=[ZyonWindows]::SlotChange($slot,$marked,$slotLeft,$top,$slotWidth,$height,$textTop,$textHeight)
    $cleanEmpty=[ZyonWindows]::EmptyCard($clean,$slotLeft,$top,$slotWidth,$height)
    $markedEmpty=[ZyonWindows]::EmptyCard($marked,$slotLeft,$top,$slotWidth,$height)
    if($change -ne 0 -or $cleanEmpty -ne $markedEmpty){throw "Overlay changes card detection at slot $slot : change=$change empty=$cleanEmpty/$markedEmpty"}
    $slots+=@{slot=$slot;change=$change;empty=$markedEmpty}
  }
  @{ok=$true;slots=$slots}|ConvertTo-Json -Compress -Depth 4
}finally{$clean.Dispose();$marked.Dispose()}
