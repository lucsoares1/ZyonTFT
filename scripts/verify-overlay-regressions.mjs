import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import{execFile}from'node:child_process';import{promisify}from'node:util';import{_electron}from'playwright';
const root=path.resolve('.runtime','overlay-regression-'+Date.now()),users=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));await fs.mkdir(root,{recursive:true});
const custom={id:'comp-regression',name:'Comp pessoal isolada',style:'Personalizada',champions:['DA_18_Ahri'],carry:'DA_18_Ahri',color:'#347aff'};await fs.writeFile(path.join(root,'preferences-v1.json'),JSON.stringify({version:2,comps:[custom],active:custom.id,pinned:custom.id,selected:custom.champions,source:'custom',rect:{x:.2295,y:.858,width:.53,height:.139},opacity:92}));
const presence=path.join(root,'presence.json');await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'}));
const env={...process.env,ZYON_USER_DATA:root,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};for(const k of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[k];
const pause=ms=>new Promise(r=>setTimeout(r,ms));let app,page;const checks=[];const state=()=>page.evaluate(()=>window.zyon.getState());
async function wait(fn,label){const until=Date.now()+45000;while(Date.now()<until){const v=await fn();if(v)return v;await pause(100);}throw Error('Timeout '+label);}
try{
 app=await _electron.launch({args:['.'],env});await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.setAlwaysOnTop(false);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w));});
 page=await app.firstWindow();await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(users[2].email);await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(users[2].password);await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();await wait(async()=>(await state()).overlayVisible,'actual signed-in overlay');
 const guide=await wait(async()=>app.windows().find(w=>w.url().includes('view=guide')),'guide');await page.evaluate(()=>window.zyon.setReader(false));
 const getBounds=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).getBounds());
 const display=await app.evaluate(({screen})=>screen.getPrimaryDisplay().bounds);
 // Native position, real DOM clicks and delayed move events at every corner.
 for(const [x,y] of [[display.x,display.y],[display.x+display.width-840,display.y+64],[display.x+display.width-840,display.y+display.height-800]]){
  await app.evaluate(({BrowserWindow},{x,y})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setPosition(Math.max(0,x),Math.max(0,y)),{x,y});await pause(500);const before=await getBounds();
  for(let i=0;i<3;i++){
   await guide.locator('[data-guide-shop-toggle]').click({force:true});await wait(async()=>(await state()).gameSession.shopOnly,'minimize');await pause(350);
   await guide.locator('[data-guide-shop-toggle]').click({force:true});await wait(async()=>!(await state()).gameSession.shopOnly,'restore');await pause(500);assert.deepEqual(await getBounds(),before);
  }
 }
 console.log('Corner round trips passed');checks.push('real Electron minimize/restore remains at each original corner through nine round trips');
 // Personal planner comp contains only a legendary absent from this actual shop.
 await page.evaluate(()=>window.zyon.setReader(true));
 await wait(async()=>{const s=await state();return s.guideComp.id==='comp-regression'&&s.slots?.some(x=>x.id==='DA_Vi18');},'custom composition + native shop');
 const medal=await wait(async()=>app.windows().find(w=>w.url().includes('view=overlay')),'medals');await pause(500);assert.equal(await medal.locator('.shop-medal').count(),0);checks.push('personal comp at early level has no unselected filler badges with real Windows OCR');
 await page.evaluate(async()=>{const s=await window.zyon.getState();await window.zyon.editPlan({compId:s.pinned,type:'request',id:'DA_Vi18',goal:1,priority:2});});await wait(async()=>(await medal.locator('.shop-medal').count())===1,'explicit request badge');checks.push('explicit off-comp request still highlights immediately');
 const protectedWindows=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('view=')).map(w=>w.isContentProtected()));assert.ok(protectedWindows.length===2&&protectedWindows.every(Boolean));
 // Native screen capture must see the backing window, not the protected overlay.
 const point=await app.evaluate(async({BrowserWindow,screen})=>{const d=screen.getPrimaryDisplay().bounds,p={x:d.x+20,y:d.y+20,width:100,height:100};globalThis.captureProbe=[];for(const color of ['#12a134','#da1122']){const w=new BrowserWindow({...p,frame:false,show:false,skipTaskbar:true,focusable:false,backgroundColor:color});await w.loadURL('data:text/html,<body style="margin:0;background:'+encodeURIComponent(color)+'">');w.setOpacity(1);w.setIgnoreMouseEvents(true);w.setAlwaysOnTop(true,'screen-saver');if(color==='#da1122')w.setContentProtection(true);w.showInactive();globalThis.captureProbe.push(w);}return{x:p.x+50,y:p.y+50};});await pause(700);
 const script=`Add-Type -AssemblyName System.Drawing;$b=New-Object System.Drawing.Bitmap(1,1);$g=[System.Drawing.Graphics]::FromImage($b);$g.CopyFromScreen(${point.x},${point.y},0,0,$b.Size);$c=$b.GetPixel(0,0);@{r=$c.R;g=$c.G;b=$c.B}|ConvertTo-Json -Compress;$g.Dispose();$b.Dispose()`;
 const pixel=JSON.parse((await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true})).stdout);await app.evaluate(()=>globalThis.captureProbe.forEach(w=>w.destroy()));assert.ok(pixel.g>100&&pixel.r<60&&pixel.b<100,JSON.stringify(pixel));checks.push('real CopyFromScreen excludes protected overlay and captures the window underneath');
 const out=path.resolve('design/review/0.17.19');await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'overlay-regressions.json'),JSON.stringify({ok:true,checks,pixel,realAccount:true,realWindowsOcr:true,simulatedFocus:true,personalProfileUntouched:true},null,2));console.log(JSON.stringify({ok:true,checks}));
}finally{if(page)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});await app?.close();}
