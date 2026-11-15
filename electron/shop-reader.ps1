param([string]$ConfigPath,[string]$ImagePath,[switch]$Once,[switch]$ShopFixture,[switch]$LevelFixture,[switch]$GoldFixture,[switch]$RepeatFixture)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
  . (Join-Path $PSScriptRoot 'game-process.ps1')
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  Add-Type -AssemblyName System.Drawing
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using System.Threading;
public class ZyonWindows {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint id);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
  [StructLayout(LayoutKind.Sequential)] struct Point { public int X,Y; }
  public class Click { public long at; public int slot; public uint pid; }
  static readonly Queue<Click> clicks = new Queue<Click>();
  public static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
  public static void ObserveClicks(int left, int top, int width, int height) {
    // Passive observation only; never sends input or touches the game process.
    var thread = new Thread(() => {
      bool wasDown = (GetAsyncKeyState(1) & 0x8000) != 0;
      while (true) {
        bool down = (GetAsyncKeyState(1) & 0x8000) != 0;
        if (down && !wasDown) {
          Point p; uint pid;
          GetWindowThreadProcessId(GetForegroundWindow(), out pid);
          if (GetCursorPos(out p) && p.Y >= top && p.Y < top + height && p.X >= left-width/5 && p.X < left+width) {
            int slot = p.X < left ? -1 : Math.Min(4, (p.X-left)*5/width);
            lock(clicks) { if(clicks.Count < 100) clicks.Enqueue(new Click {at=Now(),slot=slot,pid=pid}); }
          }
        }
        wasDown = down; Thread.Sleep(8);
      }
    });
    thread.IsBackground = true; thread.Start();
  }
  public static Click[] Drain(long until) {
    var found = new List<Click>();
    lock(clicks) { while(clicks.Count > 0 && clicks.Peek().at <= until) found.Add(clicks.Dequeue()); }
    return found.ToArray();
  }
  public static bool EmptyCard(System.Drawing.Bitmap image, int left, int top, int width, int height) {
    double sum=0, square=0; int count=0, bright=0;
    for(int y=top+height/5;y<top+height*3/4;y+=3) for(int x=left+width/5;x<left+width*4/5;x+=3) {
      var p=image.GetPixel(x,y); double v=(p.R+p.G+p.B)/3.0;
      sum+=v; square+=v*v; count++; if(v>60) bright++;
    }
    if(count==0) return false;
    double mean=sum/count;
    return mean<28 && Math.Sqrt(Math.Max(0,square/count-mean*mean))<18 && (double)bright/count<.03;
  }
  public static System.Drawing.Bitmap PrepareLevel(System.Drawing.Bitmap source) {
    // White HUD letters become dark ink with a quiet margin for the OCR engine.
    var result = new System.Drawing.Bitmap(source.Width * 3 + 32, source.Height * 3 + 32);
    using (var g = System.Drawing.Graphics.FromImage(result)) g.Clear(System.Drawing.Color.White);
    for (int y = 0; y < source.Height; y++) for (int x = 0; x < source.Width; x++) {
      var p = source.GetPixel(x,y);
      var ink = System.Drawing.Color.FromArgb(255-p.R,255-p.G,255-p.B);
      for (int yy = 0; yy < 3; yy++) for (int xx = 0; xx < 3; xx++) result.SetPixel(16+x*3+xx,16+y*3+yy,ink);
    }
    return result;
  }
  public static System.Drawing.Bitmap PrepareGold(System.Drawing.Bitmap source) {
    var ink=new bool[source.Width,source.Height];
    for(int y=0;y<source.Height;y++) for(int x=0;x<source.Width;x++) {
      var p=source.GetPixel(x,y);
      ink[x,y] = p.R>140 && p.G>140 && p.B>130 && Math.Max(p.R,Math.Max(p.G,p.B))-Math.Min(p.R,Math.Min(p.G,p.B))<45;
    }
    var groups=new List<List<System.Drawing.Point>>(); int tallest=0;
    for(int y=0;y<source.Height;y++) for(int x=0;x<source.Width;x++) if(ink[x,y]) {
      var group=new List<System.Drawing.Point>(); var todo=new Queue<System.Drawing.Point>();
      todo.Enqueue(new System.Drawing.Point(x,y)); ink[x,y]=false; int low=y,high=y;
      while(todo.Count>0) {
        var p=todo.Dequeue();group.Add(p);low=Math.Min(low,p.Y);high=Math.Max(high,p.Y);
        for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
          int nx=p.X+dx,ny=p.Y+dy;
          if(nx>=0 && ny>=0 && nx<source.Width && ny<source.Height && ink[nx,ny]) { ink[nx,ny]=false;todo.Enqueue(new System.Drawing.Point(nx,ny)); }
        }
      }
      tallest=Math.Max(tallest,high-low+1);groups.Add(group);
    }
    var digits=new List<System.Drawing.Point>();
    int left=source.Width,right=-1,top=source.Height,bottom=-1;
    foreach(var group in groups) {
      int low=source.Height,high=0;
      foreach(var p in group){low=Math.Min(low,p.Y);high=Math.Max(high,p.Y);}
      // Discard short glints from the gold coin, retaining full-height digits.
      if(high-low+1 < tallest*.7 || group.Count<3) continue;
      foreach(var p in group) {
        digits.Add(p);left=Math.Min(left,p.X);right=Math.Max(right,p.X);
        top=Math.Min(top,p.Y);bottom=Math.Max(bottom,p.Y);
      }
    }
    // OCR of short numbers is sensitive to large asymmetric empty margins.
    // Fit the surviving digits, keeping a small, even quiet zone on all sides.
    var result = new System.Drawing.Bitmap(Math.Max(1,right-left+1)*4+24,Math.Max(1,bottom-top+1)*4+24);
    using(var g=System.Drawing.Graphics.FromImage(result)) g.Clear(System.Drawing.Color.White);
    foreach(var p in digits) for(int yy=0;yy<4;yy++) for(int xx=0;xx<4;xx++)
      result.SetPixel(12+(p.X-left)*4+xx,12+(p.Y-top)*4+yy,System.Drawing.Color.Black);
    return result;
  }
}
'@
  $null=[ZyonWindows]::SetProcessDPIAware()
  $null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
  $null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
  $null=[Windows.Graphics.Imaging.SoftwareBitmap,Windows.Foundation,ContentType=WindowsRuntime]
  $null=[Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Foundation,ContentType=WindowsRuntime]
  $null=[Windows.Storage.Streams.DataWriter,Windows.Foundation,ContentType=WindowsRuntime]
  $null=[Windows.Media.Ocr.OcrResult,Windows.Foundation,ContentType=WindowsRuntime]
  $asTask=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Length -eq 1 -and $_.GetParameters().Length -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1)
  function Await-Zyon($operation,[Type]$resultType) {
    $task=$asTask.MakeGenericMethod($resultType).Invoke($null,@($operation))
    $task.Wait()
    return $task.Result
  }
  $engine=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if($null -eq $engine){throw 'Nenhum idioma de OCR instalado. Instale um pacote de idioma do Windows.'}
  function Read-ZyonBitmap($bitmap) {
    $memory=New-Object System.IO.MemoryStream
    $stream=New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
    $writer=New-Object Windows.Storage.Streams.DataWriter($stream)
    try {
      $bitmap.Save($memory,[System.Drawing.Imaging.ImageFormat]::Png)
      $writer.WriteBytes($memory.ToArray())
      $null=Await-Zyon ($writer.StoreAsync()) ([uint32])
      $null=$writer.DetachStream()
      $stream.Seek(0)
      $decoder=Await-Zyon ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
      $software=Await-Zyon ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
      try { return Await-Zyon ($engine.RecognizeAsync($software)) ([Windows.Media.Ocr.OcrResult]) }
      finally { $software.Dispose() }
    } finally { $writer.Dispose();$stream.Dispose();$memory.Dispose() }
  }
  if($ImagePath -and -not $ShopFixture){
    $fixture=[System.Drawing.Bitmap]::FromFile($ImagePath)
    try {
      if($LevelFixture -or $GoldFixture){
        if($ConfigPath){
          $levelConfig=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
          $r=if($GoldFixture){$levelConfig.goldRect}else{$levelConfig.levelRect}
          $cropped=$fixture.Clone((New-Object System.Drawing.Rectangle([int]($fixture.Width*$r.x),[int]($fixture.Height*$r.y),[int]($fixture.Width*$r.width),[int]($fixture.Height*$r.height))),$fixture.PixelFormat)
          $fixture.Dispose();$fixture=$cropped
        }
        $scaled=if($GoldFixture){[ZyonWindows]::PrepareGold($fixture)}else{[ZyonWindows]::PrepareLevel($fixture)}
        try {
          $result=Read-ZyonBitmap $scaled
          $fixtureGoldImage=''
          $fixtureLevelImage=''
          if($GoldFixture -or $LevelFixture){
            $m=New-Object System.IO.MemoryStream
            try{
              $scaled.Save($m,[System.Drawing.Imaging.ImageFormat]::Png)
              $fixtureImage=[Convert]::ToBase64String($m.ToArray())
              if($GoldFixture){$fixtureGoldImage=$fixtureImage}else{$fixtureLevelImage=$fixtureImage}
            }finally{$m.Dispose()}
          }
        }
        finally {$scaled.Dispose()}
      }else{$result=Read-ZyonBitmap $fixture}
      @{text=$result.Text;levelText=$result.Text;goldText=$result.Text;levelImage=$fixtureLevelImage;goldImage=$fixtureGoldImage;language=$engine.RecognizerLanguage.LanguageTag}|ConvertTo-Json -Compress
    }
    finally {$fixture.Dispose()}
    exit 0
  }
  $fixture=$null
  if($ShopFixture){
    $fixture=[System.Drawing.Bitmap]::FromFile($ImagePath)
    $bounds=New-Object System.Drawing.Rectangle(0,0,$fixture.Width,$fixture.Height)
    if($ConfigPath){$config=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json}
    else{$config=@{rect=@{x=.2295;y=.858;width=.53;height=.139}}}
  }else{
  $config=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
  # Screen.FromPoint resolves physical monitor bounds independently of Electron's DIP scale.
  $point=New-Object System.Drawing.Point([int](($config.display.x+$config.display.width/2)*$config.scale),[int](($config.display.y+$config.display.height/2)*$config.scale))
  $bounds=[System.Windows.Forms.Screen]::FromPoint($point).Bounds
  }
  $rect=$config.rect
  $left=[int]($bounds.X+$bounds.Width*$rect.x)
  $cardTop=[int]($bounds.Y+$bounds.Height*$rect.y)
  $totalWidth=[int]($bounds.Width*$rect.width)
  $cardHeight=[int]($bounds.Height*$rect.height)
  $slotWidth=[int]($totalWidth/5)
  $textTop=$cardTop+[int]($cardHeight*.80)
  $textHeight=[Math]::Min([Math]::Max(22,[int]($cardHeight*.20)),$bounds.Bottom-$textTop)
  $levelRect=$config.levelRect
  if(-not $levelRect){$levelRect=@{x=[Math]::Max([double]0,($rect.x - $rect.width / 5 * 1.0));y=[Math]::Max([double]0,($rect.y - $rect.height * .29));width=$rect.width / 5 * .40;height=$rect.height * .16}}
  $levelLeft=[int]($bounds.X+$bounds.Width*$levelRect.x)
  $levelTop=[int]($bounds.Y+$bounds.Height*$levelRect.y)
  $levelWidth=[Math]::Min([int]($bounds.Width*$levelRect.width),$bounds.Right-$levelLeft)
  $levelHeight=[Math]::Min([int]($bounds.Height*$levelRect.height),$bounds.Bottom-$levelTop)
  $goldRect=$config.goldRect
  if(-not $goldRect){$goldRect=@{x=$rect.x+$rect.width*.455;y=[Math]::Max([double]0,($rect.y-$rect.height*.29));width=$rect.width*.07;height=$rect.height*.18}}
  $goldLeft=[int]($bounds.X+$bounds.Width*$goldRect.x)
  $goldTop=[int]($bounds.Y+$bounds.Height*$goldRect.y)
  $goldWidth=[int]($bounds.Width*$goldRect.width)
  $goldHeight=[int]($bounds.Height*$goldRect.height)
  $matchProcess=$null
  $matchId=$null
  if(-not $ShopFixture){[ZyonWindows]::ObserveClicks($left,$cardTop,$totalWidth,$cardHeight)}
  do {
    if(-not $ShopFixture){
    $foregroundId=[uint32]0
    $foregroundWindow=[ZyonWindows]::GetForegroundWindow()
    $null=[ZyonWindows]::GetWindowThreadProcessId($foregroundWindow,[ref]$foregroundId)
    $foregroundProcess=Get-Process -Id $foregroundId -ErrorAction SilentlyContinue
    $foregroundName=$foregroundProcess.ProcessName
    if(-not (Test-ZyonGameProcess $foregroundName)){
      $ended=$null
      if($matchProcess -and $matchProcess.HasExited){$ended=$matchId;$matchProcess=$null;$matchId=$null}
      $null=[ZyonWindows]::Drain([ZyonWindows]::Now())
      @{slots=@('','','','','');idle=$true;foregroundWindow=$foregroundWindow.ToInt64().ToString();matchId=$matchId;endedMatchId=$ended;reason='TFT fora de foco'}|ConvertTo-Json -Compress
      if($Once){break};Start-Sleep -Milliseconds 1200;continue
    }
    $matchProcess=$foregroundProcess
    $matchId="$foregroundId-$($foregroundProcess.StartTime.ToUniversalTime().Ticks)"
    }
    else{$matchId='fixture-17'}
    $capturedAt=[ZyonWindows]::Now()
    $frame=$fixture
    if(-not $ShopFixture){
      $frame=New-Object System.Drawing.Bitmap($bounds.Width,$bounds.Height)
      $frameGraphics=[System.Drawing.Graphics]::FromImage($frame)
      try {$frameGraphics.CopyFromScreen($bounds.X,$bounds.Y,0,0,$frame.Size)}finally{$frameGraphics.Dispose()}
    }
    $frameClicks=@([ZyonWindows]::Drain($capturedAt)|Where-Object{$_.pid -eq $foregroundId}|ForEach-Object{@{slot=$_.slot;at=$_.at}})
    $names=@()
    $emptySlots=@()
    for($i=0;$i -lt 5;$i++){
      $bitmap=New-Object System.Drawing.Bitmap($slotWidth,$textHeight)
      $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.DrawImage($frame,(New-Object System.Drawing.Rectangle(0,0,$slotWidth,$textHeight)),(New-Object System.Drawing.Rectangle(($left-$bounds.X+$i*$slotWidth),($textTop-$bounds.Y),$slotWidth,$textHeight)),[System.Drawing.GraphicsUnit]::Pixel)
        $emptySlots += [ZyonWindows]::EmptyCard($frame,($left-$bounds.X+$i*$slotWidth),($cardTop-$bounds.Y),$slotWidth,$cardHeight)
        $scaled=New-Object System.Drawing.Bitmap(($slotWidth*2),($textHeight*2))
        $scaleGraphics=[System.Drawing.Graphics]::FromImage($scaled)
        try {
          $scaleGraphics.DrawImage($bitmap,0,0,$scaled.Width,$scaled.Height)
          $ocr=Read-ZyonBitmap $scaled
          $names+=($ocr.Lines|ForEach-Object{$_.Text}) -join "`n"
        }finally{$scaleGraphics.Dispose();$scaled.Dispose()}
      }finally{$graphics.Dispose();$bitmap.Dispose()}
    }
    $levelText=''
    $levelImage=''
    if($levelWidth -gt 0 -and $levelHeight -gt 0){
      $levelBitmap=New-Object System.Drawing.Bitmap($levelWidth,$levelHeight)
      $levelGraphics=[System.Drawing.Graphics]::FromImage($levelBitmap)
      $levelScaled=$null
      try {
        $levelGraphics.DrawImage($frame,(New-Object System.Drawing.Rectangle(0,0,$levelWidth,$levelHeight)),(New-Object System.Drawing.Rectangle(($levelLeft-$bounds.X),($levelTop-$bounds.Y),$levelWidth,$levelHeight)),[System.Drawing.GraphicsUnit]::Pixel)
        $levelScaled=[ZyonWindows]::PrepareLevel($levelBitmap)
        $levelOcr=Read-ZyonBitmap $levelScaled
        $levelText=$levelOcr.Text
        if($levelText -notmatch '(?i)(nv|lv|nivel|level)\s*[.:]?\s*(10|[1-9])(?!\d)'){
          $levelMemory=New-Object System.IO.MemoryStream
          try {$levelScaled.Save($levelMemory,[System.Drawing.Imaging.ImageFormat]::Png);$levelImage=[Convert]::ToBase64String($levelMemory.ToArray())}
          finally {$levelMemory.Dispose()}
        }
      }finally{if($levelScaled){$levelScaled.Dispose()};$levelGraphics.Dispose();$levelBitmap.Dispose()}
    }
    $goldBitmap=$frame.Clone((New-Object System.Drawing.Rectangle(($goldLeft-$bounds.X),($goldTop-$bounds.Y),$goldWidth,$goldHeight)),$frame.PixelFormat)
    $goldScaled=[ZyonWindows]::PrepareGold($goldBitmap)
    $goldMemory=New-Object System.IO.MemoryStream
    try {
      $goldText=(Read-ZyonBitmap $goldScaled).Text
      $goldImage=''
      if($goldText.Trim() -notmatch '^(0|[1-9]\d{0,2})$'){
        $goldScaled.Save($goldMemory,[System.Drawing.Imaging.ImageFormat]::Png)
        $goldImage=[Convert]::ToBase64String($goldMemory.ToArray())
      }
    }finally{$goldMemory.Dispose();$goldScaled.Dispose();$goldBitmap.Dispose()}
    $endText=''
    try {
      if($levelText -notmatch '(?i)(nv|lv|nivel|level)\s*[.:]?\s*(10|[1-9])(?!\d)' -and $goldText.Trim() -notmatch '^(0|[1-9]\d{0,2})$') {
        $endLines=@()
        foreach($region in @(@{x=0;y=0;w=1;h=1})) {
          $area=[System.Drawing.Rectangle]::new([int]($frame.Width*$region.x),[int]($frame.Height*$region.y),[int]($frame.Width*$region.w),[int]($frame.Height*$region.h))
          $resultBitmap=$frame.Clone($area,$frame.PixelFormat)
          try {$endOcr=Read-ZyonBitmap $resultBitmap;$endLines+=@($endOcr.Lines|ForEach-Object{$_.Text})}
          finally {$resultBitmap.Dispose()}
        }
        $endText=$endLines -join "`n"
      }
    }finally{if(-not $ShopFixture){$frame.Dispose()}}
    @{slots=$names;emptySlots=$emptySlots;clicks=$frameClicks;capturedAt=$capturedAt;matchId=$matchId;endText=$endText;levelText=$levelText;levelImage=$levelImage;goldText=$goldText;goldImage=$goldImage;idle=$false;geometry=@{left=$left;top=$cardTop;width=$totalWidth;height=$cardHeight;textTop=$textTop;textHeight=$textHeight;slotWidth=$slotWidth;levelLeft=$levelLeft;levelTop=$levelTop;levelWidth=$levelWidth;levelHeight=$levelHeight;goldLeft=$goldLeft;goldTop=$goldTop;goldWidth=$goldWidth;goldHeight=$goldHeight}}|ConvertTo-Json -Compress -Depth 5
    if($ShopFixture -and -not $RepeatFixture){break}
    if(-not $Once){Start-Sleep -Milliseconds 850}
  }while(-not $Once)
  if($fixture){$fixture.Dispose()}
}catch{
  if($ImagePath){[Console]::Error.WriteLine($_.ScriptStackTrace)}
  @{error=('OCR indisponível: '+$_.Exception.Message)}|ConvertTo-Json -Compress
  exit 1
}




