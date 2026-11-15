import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {_electron as electron} from 'playwright';
const baseline=process.argv.includes('--baseline'),packaged=process.argv.includes('--packaged');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const tag=crypto.randomBytes(5).toString('hex'),out=path.resolve(`design/review/${version}/continuity`);
let profile=path.resolve('.runtime',`continuity-${tag}`);
if(process.argv.includes('--reuse'))try{const p=JSON.parse(await fs.readFile('.runtime/medal-profile.json','utf8')).profile;if(path.dirname(p)===path.resolve('.runtime')&&path.basename(p).startsWith('continuity-'))profile=p;}catch{}
await fs.mkdir(profile,{recursive:true});await fs.mkdir(out,{recursive:true});
const blank=path.join(profile,'no-hud.png'),presence=path.join(profile,'presence.json');
await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Drawing; $bitmap=New-Object System.Drawing.Bitmap(1920,1080); $graphics=[System.Drawing.Graphics]::FromImage($bitmap); $graphics.Clear([System.Drawing.Color]::FromArgb(22,25,31)); $bitmap.Save('${blank.replaceAll("'","''")}',[System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bitmap.Dispose()`],{windowsHide:true});
const focus={foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'};
async function setPresence(value){await fs.writeFile(`${presence}.next`,JSON.stringify(value));await fs.rename(`${presence}.next`,presence);}
await setPresence(focus);
const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
let app,page,userId;
async function waitFor(predicate,label,timeout=60000){const until=Date.now()+timeout;while(Date.now()<until){const state=await page.evaluate(()=>window.zyon.getState());if(predicate(state))return state;await new Promise(r=>setTimeout(r,150));}throw Error(`Timeout: ${label}`);}
async function changeFixture(file){await page.evaluate(()=>window.zyon.setReader(false));await app.evaluate((_,value)=>{process.env.ZYON_OCR_FIXTURE=value;},file);await page.evaluate(()=>window.zyon.setReader(true));}
try{
 app=await electron.launch({...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||path.join(process.env.LOCALAPPDATA,'Programs/Zyon TFT/Zyon TFT.exe'))}:{args:['.']},env});
 await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.webContents.setBackgroundThrottling(false);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w));});
 page=await app.firstWindow();page.setDefaultTimeout(30000);
 const auth=await waitFor(s=>s.social?.profile||s.social?.status==='signed-out','auth initialized');
 if(!auth.social?.profile){
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.getByRole('textbox',{name:'Seu nome no Zyon',exact:true}).fill('Teste de continuidade');
 await page.getByRole('textbox',{name:'Nome de usuário Zyon',exact:true}).fill(`cont_${tag}`);
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(`zyon-continuity-${tag}@example.invalid`);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(crypto.randomBytes(24).toString('base64url'));
 await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
 }
 const signedIn=await waitFor(s=>s.social?.user&&s.social?.profile,'real account');userId=signedIn.social.user.id;
 await fs.writeFile(`.runtime/continuity-user-${tag}.json`,JSON.stringify({id:userId,email:signedIn.social.user.email}));
 if(process.argv.includes('--reuse'))await fs.writeFile('.runtime/medal-profile.json',JSON.stringify({profile}));
 const original=await waitFor(s=>s.overlayVisible&&s.levelReading.status==='confirmed'&&s.goldReading.status==='confirmed','game started');
 const id=original.guideComp.champions[0];await page.evaluate(async({id,compId,delta})=>{for(let n=0;n<Math.abs(delta);n++)await window.zyon.gameAction({type:'copies',id,delta:Math.sign(delta),compId});},{id,compId:original.pinned,delta:1-(original.gameSession.context.copies[id]||0)});
 assert.equal((await page.evaluate(()=>window.zyon.getState())).gameSession.context.copies[id],1);
 if(process.argv.includes('--medal')){
  const overlay=app.windows().find(w=>w.url().includes('view=overlay'));
  await page.evaluate(async()=>{for(const id of ['DA_Vi18','DA_18_MasterYi_AD','DA_18_Alistar','DA_Cinderling18']){const s=await window.zyon.getState();if(!s.guideComp.champions.includes(id))await window.zyon.editPlan({compId:s.pinned,type:'toggle',id});}});
  await overlay.waitForFunction(()=>document.querySelectorAll('.shop-medal').length===4);
  const image=(await fs.readFile('design/references/17-game-ocr.png')).toString('base64');
  await overlay.evaluate(data=>{document.querySelector('.native-overlay').style.background=`url(data:image/png;base64,${data}) center / auto 100% no-repeat`;},image);
  const measures=[];
  for(const [width,height,zoom] of [[1913,1069,1],[1920,1080,1],[1280,720,1],[2560,1080,1],[1920,1080,.8]]){
   // Fixture geometry uses the same height-based transform as FitShopRect.
   const ref=Math.min(width,height*16/9),rect={x:((width-ref)/2+ref*.2295)/width,y:.858,width:ref*.53/width,height:.139};
   const factor=height/1069,offset=(width-1913*factor)/2;
   const cards=original.shopCards.map(r=>r?{x:(r.x*1913*factor+offset)/width,y:r.y,width:r.width*1913*factor/width,height:r.height}:null);
   await app.evaluate(({BrowserWindow},{width,height,zoom,rect,cards})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=overlay'));w.setBounds({x:0,y:0,width,height});w.webContents.setZoomFactor(zoom);w.webContents.send('shop:update',{slots:[{id:'DA_Vi18',confidence:1},{id:'DA_18_MasterYi_AD',confidence:1},{id:'DA_18_Alistar',confidence:1},{id:'DA_Cinderling18',confidence:1},{id:null,confidence:0}],shopRect:rect,shopCards:cards,shopRevision:10000});},{width,height,zoom,rect,cards});
   await overlay.waitForTimeout(80);
   const bounds=await overlay.evaluate(()=>[...document.querySelectorAll('.native-slot[data-highlighted]')].map(el=>{const card=el.getBoundingClientRect(),seal=el.querySelector('.shop-medal').getBoundingClientRect(),caption=el.querySelector('.shop-medal-caption').getBoundingClientRect();return {card:{x:card.x,y:card.y,w:card.width,h:card.height},seal:{x:seal.x,y:seal.y,r:seal.right,b:seal.bottom},caption:{x:caption.x,r:caption.right,b:caption.bottom,center:caption.x+caption.width/2},logoCenter:el.querySelector('.shop-medal > svg').getBoundingClientRect().x+el.querySelector('.shop-medal > svg').getBoundingClientRect().width/2,frameJewel:el.querySelector('.shop-frost-frame').getAttribute('data-jewel'),closedTop:!el.querySelector('.shop-frost-frame > g').getAttribute('mask'),animated:getComputedStyle(el.querySelector('.shop-medal')).animationName};}));
   for(const b of bounds){assert.ok(b.seal.x>=b.card.x&&b.seal.r<=b.card.x+b.card.w);assert.ok(b.caption.b<=b.card.y+1,'purchase notice must sit above the frame');assert.ok(Math.abs(b.logoCenter-b.caption.center)<.5,'label and medal share a single center axis');assert.ok(b.seal.b<b.card.y+b.card.h*.3);assert.ok(b.caption.x>=b.card.x&&b.caption.r<=b.card.x+b.card.w);assert.equal(b.animated,'none');}
   assert.deepEqual(bounds.map(b=>b.frameJewel),['true','true','true','false']);assert.equal(bounds[3].closedTop,true,'cost 1 has a complete top border');
   measures.push({width,height,zoom,bounds});
   await overlay.screenshot({path:path.join(out,`medal-${width}-${zoom}.png`)});
   if(width===1913){
    const style=await overlay.addStyleTag({content:'.native-slot{visibility:hidden!important}'});
    await overlay.screenshot({path:path.join(out,'medal-baseline.png')});await style.evaluate(el=>el.remove());
   }
  }
  await fs.writeFile(path.join(out,'medal-geometry.json'),JSON.stringify({ok:true,measures,note:'Actual signed-in Electron renderer. Controlled geometry/slots for resolution and DPI layout checks only; native reading tested separately.'},null,2));
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=overlay'));w.webContents.setZoomFactor(1);w.webContents.reload();});
  console.log(JSON.stringify({medalLayout:true,widths:[1920,1280,2560],dpiZoom:.8}));
  if(process.argv.includes('--medal-only'))process.exitCode=0;
 }
 if(process.argv.includes('--medal-only')){if(!process.argv.includes('--reuse'))await page.evaluate(()=>window.zyon.socialAction({type:'logout'}));await app.close();app=null;process.exit(0);}
 if(process.argv.includes('--shop')){
  const image=path.resolve('design/references/17-game-ocr.png'),sequence=path.join(profile,'sequence.json');
  await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-shop-sequence.ps1','-SourcePath',image,'-OutputDirectory',profile],{windowsHide:true});
  await fs.writeFile(sequence,JSON.stringify([{path:image,holdMs:1200},{path:path.join(profile,'swapped.png'),holdMs:1200},{path:path.join(profile,'sold.png'),holdMs:1200},{path:image,holdMs:1200}]));
  await page.evaluate(async()=>{const s=await window.zyon.getState();if(!s.guideComp.champions.includes('DA_Vi18'))await window.zyon.editPlan({compId:s.pinned,type:'toggle',id:'DA_Vi18'});});
  const overlay=app.windows().find(w=>w.url().includes('view=overlay'));
  await overlay.evaluate(()=>{window.shopProbe=[];let latest;const record=()=>{if(latest)window.shopProbe.push({ids:latest.slots.map(s=>s.id),ms:Date.now()-latest.shopCapturedAt,badges:[...document.querySelectorAll('.native-slot')].map(s=>!!s.querySelector('.shop-medal'))});};window.zyon.onShop(next=>{latest=next;setTimeout(record,10);});new MutationObserver(record).observe(document.body,{childList:true,subtree:true});});
  await page.evaluate(()=>window.zyon.setReader(false));await app.evaluate((_,value)=>{process.env.ZYON_SHOP_SEQUENCE=value;},sequence);await page.evaluate(()=>window.zyon.setReader(true));
  await new Promise(r=>setTimeout(r,6500));
  const observations=await overlay.evaluate(()=>window.shopProbe),initial=observations.find(s=>s.ids[0]==='DA_Vi18'&&s.badges[0]),swapped=observations.find(s=>s.ids[2]==='DA_Vi18'&&s.badges[2]),removed=observations.find(s=>s.ids[0]==='DA_18_Alistar'&&s.ids[2]===null&&!s.badges[2]);
  assert.ok(initial,'new native OCR badge rendered');assert.ok(swapped,'reroll moves the badge to the new slot');assert.ok(removed,'sold slot removes the badge');
  const current=await page.evaluate(()=>window.zyon.getState());assert.equal(current.slots[0].id,'DA_Vi18');
  await page.evaluate(async()=>{const s=await window.zyon.getState();await window.zyon.publish({...s,slots:[null,null,'DA_Vi18',null,null]});});
  const protectedState=await page.evaluate(()=>window.zyon.getState());assert.equal(protectedState.slots[0].id,'DA_Vi18');assert.equal(protectedState.slots[2].id,'DA_18_Alistar');
  await fs.writeFile(path.join(out,'shop-renderer.json'),JSON.stringify({ok:true,captureToBadgeMs:initial.ms,rerollToBadgeMs:swapped.ms,soldSlotRemovalMs:removed.ms,lateRendererCannotRestoreSlots:true,scope:'real native OCR and Electron DOM with synthetic shop sequence and simulated foreground'},null,2));
  console.log(JSON.stringify({shopRenderer:true,captureToBadgeMs:initial.ms,rerollToBadgeMs:swapped.ms,soldSlotRemovalMs:removed.ms}));
  await app.evaluate(()=>{delete process.env.ZYON_SHOP_SEQUENCE;});
 }
 await changeFixture(blank);
 await waitFor(s=>s.levelReading.status==='unreadable'&&s.goldReading.status==='unreadable','HUD absent');
 await new Promise(r=>setTimeout(r,8500));
 const missing=await page.evaluate(()=>window.zyon.getState());
 if(baseline){assert.equal(missing.overlayVisible,false);assert.equal(missing.hudOccluded,true);console.log(JSON.stringify({baselineReproduced:true,gameStillFocused:missing.gameForeground,readerRunning:missing.readerActive,ended:missing.gameSession.ended,copiesRetained:missing.gameSession.context.copies[id]===1}));}
 else{
  assert.equal(missing.overlayVisible,true,'unreadable HUD must not hide the overlay');assert.equal(missing.gameSession.ended,false);assert.equal(missing.gameSession.context.copies[id],1);
  await setPresence({...focus,foreground:false});await waitFor(s=>!s.overlayVisible&&!s.gameForeground,'Alt+Tab hides');
  await setPresence(focus);await waitFor(s=>s.overlayVisible&&s.gameForeground,'return without OCR resumes');
  const guideHandle=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).getNativeWindowHandle().readBigUInt64LE().toString());
  await setPresence({foreground:false,foregroundWindow:guideHandle,matchId:focus.matchId});await waitFor(s=>s.overlayVisible&&s.guideInteractive,'guide interaction survives missing HUD');
  await setPresence(focus);await changeFixture(path.resolve('design/references/17-game-ocr.png'));
  const recovered=await waitFor(s=>s.overlayVisible&&s.goldReading.status==='confirmed','HUD recovered');assert.equal(recovered.gameSession.context.copies[id],1);
  const resultsImage=path.join(profile,'results.png');
  await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-results-fixture.ps1','-BackgroundPath',path.resolve('design/references/42-results-not-reset.png'),'-PopupPath',path.resolve('design/references/43-results-placement-exit.png'),'-OutputPath',resultsImage],{windowsHide:true});
  await changeFixture(resultsImage);
  const ended=await waitFor(s=>s.gameSession.ended&&!s.overlayVisible,'actual results screen hides and resets');assert.deepEqual(ended.gameSession.context.copies,{});assert.deepEqual(ended.gameSession.purchases,[]);
  await changeFixture(path.resolve('design/references/17-game-ocr.png'));await new Promise(r=>setTimeout(r,6000));
  const late=await page.evaluate(()=>window.zyon.getState());assert.equal(late.gameSession.ended,true);assert.equal(late.overlayVisible,false);
  await changeFixture(path.resolve('design/references/35-game-level1-gold3.png'));
  const next=await waitFor(s=>!s.gameSession.ended&&s.overlayVisible&&s.gameSession.context.level===1&&s.gameSession.context.gold===3,'same process starts new round');assert.deepEqual(next.gameSession.context.copies,{});
  const result={ok:true,unreadableHudDurationMs:8500,overlayRemainsVisible:true,altTabHides:true,returnWithoutHudResumes:true,guideInteractionPreserved:true,readingsRecover:true,copiesPreserved:true,actualResultScreenResets:true,lateFramesStayHidden:true,nextMatchSameProcessResumes:true,realWindowsOcr:true,simulatedPresence:true,isolated:true};
  await fs.writeFile(path.join(out,`checks${packaged?'-packaged':''}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }
}finally{if(page&&userId)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});await app?.close();}
