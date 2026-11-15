param([string]$ConfigPath,[string]$ImagePath,[switch]$Once,[switch]$ShopFixture,[switch]$LevelFixture,[switch]$GoldFixture,[switch]$RepeatFixture,[switch]$Fast,[string]$FixtureSequence)
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
  [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hWnd, out Rect r);
  [DllImport("user32.dll")] static extern bool ClientToScreen(IntPtr hWnd, ref Point p);
  [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left,Top,Right,Bottom; }
  public static int[] ClientBounds(IntPtr hWnd) {
    Rect r; var p=new Point();
    if(!GetClientRect(hWnd,out r)||!ClientToScreen(hWnd,ref p)) return null;
    return new int[]{p.X,p.Y,r.Right-r.Left,r.Bottom-r.Top};
  }
  public static double[] FitShopRect(int[] client,int[] monitor) {
    double referenceWidth=Math.Min(client[2],client[3]*16.0/9);
    return new double[]{(client[0]-monitor[0]+(client[2]-referenceWidth)/2+referenceWidth*.2295)/monitor[2],
      (client[1]-monitor[1]+client[3]*.858)/monitor[3],referenceWidth*.53/monitor[2],client[3]*.139/monitor[3]};
  }
  static double BorderScore(System.Drawing.Bitmap image,bool vertical,int at,int from,int length) {
    double sum=0,square=0,contrast=0;int count=0;
    for(int k=0;k<24;k++) {
      double f=vertical?.3+k*.45/23:.12+k*.76/23;
      if(!vertical&&f>.35&&f<.65)continue; // original jewel owns the top center
      int along=from+(int)(length*f),x=vertical?at:along,y=vertical?along:at;
      if(x<3||y<3||x>=image.Width-3||y>=image.Height-3)return -1000;
      var p=image.GetPixel(x,y);var a=image.GetPixel(x-(vertical?2:0),y-(vertical?0:2));var b=image.GetPixel(x+(vertical?2:0),y+(vertical?0:2));
      double v=(p.R+p.G+p.B)/3.0;
      sum+=v;square+=v*v;contrast+=v-(a.R+a.G+a.B+b.R+b.G+b.B)/6.0;count++;
    }
    double mean=sum/count,deviation=Math.Sqrt(Math.Max(0,square/count-mean*mean));
    return deviation>(vertical?20:90)?-1000:contrast/count-deviation*(vertical?.8:.15)+mean*.025;
  }
  public static double[] FindCardRect(System.Drawing.Bitmap image,int left,int top,int width,int height) {
    int[] best={left+width/40,left+width-width/25,top,Math.Min(image.Height-2,top+height-4)};
    double[] scores={-1000,-1000,-1000,-1000};
    for(int side=0;side<4;side++) {
      int center=best[side],range=side<2?Math.Max(4,width/25):4;
      for(int at=center-range;at<=center+range;at++) {
        if((side==0&&at<left)||(side==1&&at>left+width))continue;
        double score=BorderScore(image,side<2,at,side<2?top:left,side<2?height:width);
        if(score>scores[side]){scores[side]=score;best[side]=at;}
      }
    }
    if(scores[0]<2||scores[1]<2||scores[2]<2||scores[3]<2||best[1]-best[0]<width*.83||best[3]-best[2]<height*.8)return null;
    return new double[]{best[0]/(double)image.Width,best[2]/(double)image.Height,(best[1]-best[0])/(double)image.Width,(best[3]-best[2])/(double)image.Height};
  }
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
  [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
  [StructLayout(LayoutKind.Sequential)] struct Point { public int X,Y; }
  public class Click { public long at; public int slot; public uint pid; }
  static readonly Queue<Click> clicks = new Queue<Click>();
  public static long Now() { return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(); }
  static int shopLeft,shopTop,shopWidth,shopHeight;
  public static void SetShopBounds(int left,int top,int width,int height) { shopLeft=left;shopTop=top;shopWidth=width;shopHeight=height; }
  public static void ObserveClicks(int left, int top, int width, int height) {
    SetShopBounds(left,top,width,height);
    // Passive observation only; never sends input or touches the game process.
    var thread = new Thread(() => {
      bool wasDown = (GetAsyncKeyState(1) & 0x8000) != 0;
      while (true) {
        left=shopLeft;top=shopTop;width=shopWidth;height=shopHeight;
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
  static readonly int[][] artSamples=new int[5][];
  static readonly bool[][] nameSamples=new bool[5][];
  public static void ResetVisuals() { Array.Clear(artSamples,0,5);Array.Clear(nameSamples,0,5); }
  public static bool SlotChanged(int slot, System.Drawing.Bitmap image, int left, int top, int width, int height, int textTop, int textHeight) {
    return SlotChange(slot,image,left,top,width,height,textTop,textHeight)==2;
  }
  public static int SlotChange(int slot, System.Drawing.Bitmap image, int left, int top, int width, int height, int textTop, int textHeight) {
    // Compare with a stable reference, not an exact hash. Hover brightness,
    // glints and a few antialiased name pixels must not invalidate a card.
    // This is change detection only; identity still requires exact native OCR.
    var art=new int[128*3];var name=new List<bool>();int n=0;
      for(int y=0;y<8;y++) for(int x=0;x<16;x++) {
        // The upper 40% belongs to our seal. Sample below it and inside
        // the frame so drawing our own overlay cannot trigger a reroll.
        var p=image.GetPixel(left+width/8+x*width*3/4/16,top+height*2/5+y*height*3/10/8);
        art[n++]=p.R;art[n++]=p.G;art[n++]=p.B;
      }
      // Leave the colored card frame outside the name mask as well.
      for(int y=2;y<textHeight-6;y+=2) for(int x=width/20;x<width*9/10;x+=2) {
        var p=image.GetPixel(left+x,textTop+y);
        name.Add(p.R>140 && p.G>140 && p.B>140);
      }
    var previous=artSamples[slot];var previousName=nameSamples[slot];
    int change=previous==null||previousName==null||previousName.Length!=name.Count?2:0;
    if(change==0) {
      int different=0,ink=0;for(int i=0;i<name.Count;i++){if(name[i]||previousName[i])ink++;if(name[i]!=previousName[i])different++;}
      // Remove uniform lighting shifts before comparing the actual artwork.
      double[] light=new double[3];for(int i=0;i<art.Length;i++)light[i%3]+=art[i]-previous[i];
      for(int c=0;c<3;c++)light[c]/=128;
      double detail=0;for(int i=0;i<art.Length;i++)detail+=Math.Abs(art[i]-previous[i]-light[i%3]);
      bool nameChanged=different>Math.Max(6,ink*.18);
      // Animated art or antialias changes request OCR without removing a
      // confirmed seal. A replacement requires both independent regions.
      change=nameChanged&&detail/art.Length>8?2:nameChanged||detail/art.Length>24?1:0;
    }
    if(change!=0){artSamples[slot]=art;nameSamples[slot]=name.ToArray();}
    return change;
  }
  public static bool EmptyCard(System.Drawing.Bitmap image, int left, int top, int width, int height) {
    double sum=0, square=0; int count=0, bright=0;
    // A previously drawn seal must not make an empty shop slot look occupied.
    for(int y=top+height*2/5;y<top+height*3/4;y+=3) for(int x=left+width/5;x<left+width*4/5;x+=3) {
      var p=image.GetPixel(x,y); double v=(p.R+p.G+p.B)/3.0;
      sum+=v; square+=v*v; count++; if(v>60) bright++;
    }
    if(count==0) return false;
    double mean=sum/count;
    if(mean>=28 || Math.Sqrt(Math.Max(0,square/count-mean*mean))>=18 || (double)bright/count>=.03)return false;
    // Very dark champion art is still an occupied card when name ink remains.
    int ink=0;
    for(int y=top+height*4/5+2;y<top+height-6;y+=2)for(int x=left+width/20;x<left+width*3/4;x+=2){
      var p=image.GetPixel(x,y);if(p.R>140&&p.G>140&&p.B>140&&++ink>=4)return false;
    }
    return true;
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
  function Set-ZyonGeometry($effectiveRect) {
  $script:rect=$effectiveRect
  $script:left=[int]($bounds.X+$bounds.Width*$rect.x)
  $script:cardTop=[int]($bounds.Y+$bounds.Height*$rect.y)
  $script:totalWidth=[int]($bounds.Width*$rect.width)
  $script:cardHeight=[int]($bounds.Height*$rect.height)
  $script:slotWidth=[int]($totalWidth/5)
  $script:textTop=$cardTop+[int]($cardHeight*.80)
  $script:textHeight=[Math]::Min([Math]::Max(22,[int]($cardHeight*.20)),$bounds.Bottom-$textTop)
  $script:levelRect=if($config.customLevelRect){$config.levelRect}else{$null}
  if(-not $levelRect){$script:levelRect=@{x=[Math]::Max([double]0,($rect.x - $rect.width / 5 * 1.0));y=[Math]::Max([double]0,($rect.y - $rect.height * .29));width=$rect.width / 5 * .40;height=$rect.height * .16}}
  $script:levelLeft=[int]($bounds.X+$bounds.Width*$levelRect.x)
  $script:levelTop=[int]($bounds.Y+$bounds.Height*$levelRect.y)
  $script:levelWidth=[Math]::Min([int]($bounds.Width*$levelRect.width),$bounds.Right-$levelLeft)
  $script:levelHeight=[Math]::Min([int]($bounds.Height*$levelRect.height),$bounds.Bottom-$levelTop)
  $script:goldRect=$null
  if(-not $goldRect){$script:goldRect=@{x=$rect.x+$rect.width*.455;y=[Math]::Max([double]0,($rect.y-$rect.height*.29));width=$rect.width*.07;height=$rect.height*.18}}
  $script:goldLeft=[int]($bounds.X+$bounds.Width*$goldRect.x)
  $script:goldTop=[int]($bounds.Y+$bounds.Height*$goldRect.y)
  $script:goldWidth=[int]($bounds.Width*$goldRect.width)
  $script:goldHeight=[int]($bounds.Height*$goldRect.height)
  [ZyonWindows]::SetShopBounds($left,$cardTop,$totalWidth,$cardHeight)
  }
  Set-ZyonGeometry $config.rect
  $geometryKey=''
  $matchProcess=$null
  $matchId=$null
  $cachedNames=@('','','','','')
  $cardRects=@($null,$null,$null,$null,$null)
  $rectAttempt=@(0L,0L,0L,0L,0L)
  $unreadableSince=@(0L,0L,0L,0L,0L)
  $lastRead=@(0L,0L,0L,0L,0L)
  $nameMisses=@(0,0,0,0,0)
  $lastHudAt=0L
  $lastEndScanAt=0L
  $pendingClicks=@()
  $knownNames=@{}
  if($Fast -and $config.shopNames){foreach($name in $config.shopNames){$knownNames[($name.Normalize([Text.NormalizationForm]::FormD) -replace '[\u0300-\u036f]','' -replace '[^a-zA-Z]','').ToLowerInvariant()]=$true}}
  $sequence=$null;$sequenceIndex=-1;$sequenceUntil=0L;$sequenceChangedAt=0L
  if($ShopFixture -and $FixtureSequence){$sequence=Get-Content -LiteralPath $FixtureSequence -Raw|ConvertFrom-Json}
  if(-not $ShopFixture){[ZyonWindows]::ObserveClicks($left,$cardTop,$totalWidth,$cardHeight)}
  do {
    if(-not $ShopFixture){
    $foregroundId=[uint32]0
    $foregroundWindow=[ZyonWindows]::GetForegroundWindow()
    $null=[ZyonWindows]::GetWindowThreadProcessId($foregroundWindow,[ref]$foregroundId)
    $foregroundProcess=Get-Process -Id $foregroundId -ErrorAction SilentlyContinue
    $foregroundName=$foregroundProcess.ProcessName
    if(-not (Test-ZyonGameProcess $foregroundName)){
      $cachedNames=@('','','','','');$unreadableSince=@(0L,0L,0L,0L,0L);[ZyonWindows]::ResetVisuals();$lastRead=@(0L,0L,0L,0L,0L);$nameMisses=@(0,0,0,0,0);$pendingClicks=@()
      $ended=$null
      if($matchProcess -and $matchProcess.HasExited){$ended=$matchId;$matchProcess=$null;$matchId=$null}
      $null=[ZyonWindows]::Drain([ZyonWindows]::Now())
      @{slots=@('','','','','');idle=$true;foregroundWindow=$foregroundWindow.ToInt64().ToString();matchId=$matchId;endedMatchId=$ended;reason='TFT fora de foco'}|ConvertTo-Json -Compress
      if($Once){break};Start-Sleep -Milliseconds $(if($Fast){100}else{1200});continue
    }
    $matchProcess=$foregroundProcess
    $matchId="$foregroundId-$($foregroundProcess.StartTime.ToUniversalTime().Ticks)"
    }
    else{$matchId='fixture-17'}
    if($sequence -and [ZyonWindows]::Now() -ge $sequenceUntil -and $sequenceIndex+1 -lt $sequence.Count){
      $sequenceIndex++
      $nextFixture=[System.Drawing.Bitmap]::FromFile($sequence[$sequenceIndex].path)
      if($nextFixture.Width -ne $fixture.Width -or $nextFixture.Height -ne $fixture.Height){$nextFixture.Dispose();throw 'Fixture sequence dimensions differ'}
      $fixture.Dispose();$fixture=$nextFixture
      $sequenceChangedAt=if($sequenceIndex -eq 0){[ZyonWindows]::Now()}else{$sequenceUntil}
      $sequenceUntil=$sequenceChangedAt+[long]$sequence[$sequenceIndex].holdMs
    }
    if(-not $ShopFixture -and $config.automaticRect){
      $client=[ZyonWindows]::ClientBounds($foregroundWindow)
      if($client -and $client[2] -gt 400 -and $client[3] -gt 300){
        $key=$client -join ','
        if($key -ne $geometryKey){
          # TFT's centered shop scales with viewport height, not monitor width.
          $fit=[ZyonWindows]::FitShopRect($client,@($bounds.X,$bounds.Y,$bounds.Width,$bounds.Height))
          $fitted=@{x=$fit[0];y=$fit[1];width=$fit[2];height=$fit[3]}
          if($fitted.x -ge 0 -and $fitted.y -ge 0 -and $fitted.x+$fitted.width -le 1.001 -and $fitted.y+$fitted.height -le 1.001){
            Set-ZyonGeometry $fitted
            [ZyonWindows]::ResetVisuals();$cachedNames=@('','','','','');$cardRects=@($null,$null,$null,$null,$null);$rectAttempt=@(0L,0L,0L,0L,0L);$lastRead=@(0L,0L,0L,0L,0L);$pendingClicks=@();$geometryKey=$key
          }
        }
      }
    }
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
    if($Fast){
      $pendingClicks+=@($frameClicks)
      $changed=@()
      $replacements=@()
      $hardChanges=@()
      for($i=0;$i -lt 5;$i++){
        $slotLeft=$left-$bounds.X+$i*$slotWidth
        $emptySlots += [ZyonWindows]::EmptyCard($frame,$slotLeft,($cardTop-$bounds.Y),$slotWidth,$cardHeight)
        if(-not $cardRects[$i] -and $cachedNames[$i] -and -not $emptySlots[$i] -and $capturedAt-$rectAttempt[$i] -ge 500){
          $rectAttempt[$i]=$capturedAt
          # Snap only once to the original frame. Never chase our own outline.
          $found=[ZyonWindows]::FindCardRect($frame,$slotLeft,($cardTop-$bounds.Y),$slotWidth,$cardHeight)
          if($found){$cardRects[$i]=@{x=$found[0];y=$found[1];width=$found[2];height=$found[3]}}
        }
        $visualChange=[ZyonWindows]::SlotChange($i,$frame,$slotLeft,($cardTop-$bounds.Y),$slotWidth,$cardHeight,($textTop-$bounds.Y),$textHeight)
        $visualChanged=$visualChange -eq 2
        $replacements+=,$visualChanged
        if($visualChanged -or ($visualChange -eq 1 -and $capturedAt-$lastRead[$i] -ge 120) -or $emptySlots[$i] -or $capturedAt-$lastRead[$i] -ge 2000){
          if($visualChanged){$hardChanges+=,$i;$nameMisses[$i]=0;$unreadableSince[$i]=0}
          if($emptySlots[$i]){$cachedNames[$i]='';$lastRead[$i]=$capturedAt}else{$changed+=,$i}
        }
      }
      # Multiple replaced cards identify a reroll. One noisy/animated card
      # changes atomically after OCR, never empty -> same champion -> empty.
      if($hardChanges.Count -ge 2){foreach($i in $hardChanges){$cachedNames[$i]=''}}
      # Publish disappearance before spending time on recognition or HUD OCR.
      @{kind='shop';phase='observed';shopRect=$rect;shopCards=$cardRects;slots=$cachedNames;capturedAt=$capturedAt;matchId=$matchId;idle=$false;fixtureIndex=$sequenceIndex;fixtureChangedAt=$sequenceChangedAt}|ConvertTo-Json -Compress -Depth 3
      if($changed.Count -gt 0){
        $readNames=@('','','','','')
        $rowHeight=$textHeight*2+24
        $atlas=New-Object System.Drawing.Bitmap(($slotWidth*2),($rowHeight*$changed.Count))
        $atlasGraphics=[System.Drawing.Graphics]::FromImage($atlas)
        try{
          $atlasGraphics.Clear([System.Drawing.Color]::Black)
          for($r=0;$r -lt $changed.Count;$r++){
            $i=$changed[$r]
            $atlasGraphics.DrawImage($frame,[System.Drawing.Rectangle]::new(0,($r*$rowHeight+12),($slotWidth*2),($textHeight*2)),[System.Drawing.Rectangle]::new(($left-$bounds.X+$i*$slotWidth),($textTop-$bounds.Y),$slotWidth,$textHeight),[System.Drawing.GraphicsUnit]::Pixel)
          }
          $batch=Read-ZyonBitmap $atlas
          foreach($line in $batch.Lines){
            # OCR may merge neighbouring rows into one line. Assign words by
            # their actual coordinates, preserving duplicate fixed slots.
            $rowWords=@{}
            foreach($word in $line.Words){
              $row=[int][Math]::Floor(($word.BoundingRect.Y+$word.BoundingRect.Height/2)/$rowHeight)
              if($row -ge 0 -and $row -lt $changed.Count){$rowWords[$row]=@($rowWords[$row])+$word.Text}
            }
            foreach($row in $rowWords.Keys){$i=$changed[$row];$readNames[$i]+=(($rowWords[$row] -join ' ').Trim()+"`n")}
          }
          foreach($i in $changed){
            $lastRead[$i]=$capturedAt
            if($knownNames.Count -gt 0){
              $known=$false
              foreach($line in ($readNames[$i] -split "`n")){if($knownNames[($line.Normalize([Text.NormalizationForm]::FormD) -replace '[\u0300-\u036f]','' -replace '[^a-zA-Z]','').ToLowerInvariant()]){$known=$true;break}}
              # A fading/unknown name is retried after120ms, not held for2s.
              if(-not $known){
                if($replacements[$i]){$cachedNames[$i]=''}
                $nameMisses[$i]++;$lastRead[$i]=$capturedAt-$(if($nameMisses[$i] -le 4){1880}else{1000})
                if(-not $unreadableSince[$i]){$unreadableSince[$i]=$capturedAt}
                # An OCR miss alone is not evidence that the champion left.
                # A confirmed replacement or empty slot already cleared it.
              }else{$nameMisses[$i]=0;$unreadableSince[$i]=0;$cachedNames[$i]=$readNames[$i]}
            }else{$cachedNames[$i]=$readNames[$i]}
            if(-not $cardRects[$i] -and $cachedNames[$i] -and $capturedAt-$rectAttempt[$i] -ge 500){
              $rectAttempt[$i]=$capturedAt
              $found=[ZyonWindows]::FindCardRect($frame,($left-$bounds.X+$i*$slotWidth),($cardTop-$bounds.Y),$slotWidth,$cardHeight)
              if($found){$cardRects[$i]=@{x=$found[0];y=$found[1];width=$found[2];height=$found[3]}}
            }
          }
        }finally{$atlasGraphics.Dispose();$atlas.Dispose()}
        @{kind='shop';phase='recognized';shopRect=$rect;shopCards=$cardRects;slots=$cachedNames;capturedAt=$capturedAt;matchId=$matchId;idle=$false;processingMs=([ZyonWindows]::Now()-$capturedAt);fixtureIndex=$sequenceIndex;fixtureChangedAt=$sequenceChangedAt}|ConvertTo-Json -Compress -Depth 3
      }
      $names=@($cachedNames)
      if($capturedAt-$lastHudAt -lt 400){
        if(-not $ShopFixture){$frame.Dispose()}
        if($Once -or ($ShopFixture -and -not $RepeatFixture)){break}
        Start-Sleep -Milliseconds ([Math]::Max(1,(60-([ZyonWindows]::Now()-$capturedAt))))
        continue
      }
      $lastHudAt=$capturedAt
      $frameClicks=@($pendingClicks);$pendingClicks=@()
    }else{
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
    $endChecked=$true
    try {
      if($levelText -notmatch '(?i)(nv|lv|nivel|level)\s*[.:]?\s*(10|[1-9])(?!\d)' -and $goldText.Trim() -notmatch '^(0|[1-9]\d{0,2})$') {
        $endChecked=-not $Fast -or $capturedAt-$lastEndScanAt -ge 1000
        if($endChecked){
        $lastEndScanAt=$capturedAt
        $endLines=@()
        foreach($region in @(@{x=0;y=0;w=1;h=1})) {
          $area=[System.Drawing.Rectangle]::new([int]($frame.Width*$region.x),[int]($frame.Height*$region.y),[int]($frame.Width*$region.w),[int]($frame.Height*$region.h))
          $resultBitmap=$frame.Clone($area,$frame.PixelFormat)
          try {$endOcr=Read-ZyonBitmap $resultBitmap;$endLines+=@($endOcr.Lines|ForEach-Object{$_.Text})}
          finally {$resultBitmap.Dispose()}
        }
        $endText=$endLines -join "`n"
        }
      }
    }finally{if(-not $ShopFixture){$frame.Dispose()}}
    @{kind='hud';slots=$names;emptySlots=$emptySlots;clicks=$frameClicks;capturedAt=$capturedAt;matchId=$matchId;endText=$endText;endChecked=$endChecked;levelText=$levelText;levelImage=$levelImage;goldText=$goldText;goldImage=$goldImage;idle=$false;geometry=@{left=$left;top=$cardTop;width=$totalWidth;height=$cardHeight;textTop=$textTop;textHeight=$textHeight;slotWidth=$slotWidth;levelLeft=$levelLeft;levelTop=$levelTop;levelWidth=$levelWidth;levelHeight=$levelHeight;goldLeft=$goldLeft;goldTop=$goldTop;goldWidth=$goldWidth;goldHeight=$goldHeight}}|ConvertTo-Json -Compress -Depth 5
    if($ShopFixture -and -not $RepeatFixture){break}
    if(-not $Once){Start-Sleep -Milliseconds $(if($Fast){[Math]::Max(1,(60-([ZyonWindows]::Now()-$capturedAt)))}else{850})}
  }while(-not $Once)
  if($fixture){$fixture.Dispose()}
}catch{
  if($ImagePath){[Console]::Error.WriteLine($_.ScriptStackTrace)}
  @{error=('OCR indisponível: '+$_.Exception.Message)}|ConvertTo-Json -Compress
  exit 1
}




