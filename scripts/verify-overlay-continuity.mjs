import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {_electron as electron} from 'playwright';
const baseline=process.argv.includes('--baseline'),packaged=process.argv.includes('--packaged');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const tag=crypto.randomBytes(5).toString('hex'),profile=path.resolve('.runtime',`continuity-${tag}`),out=path.resolve(`design/review/${version}/continuity`);
await fs.mkdir(profile,{recursive:true});await fs.mkdir(out,{recursive:true});
const blank=path.join(profile,'no-hud.png'),presence=path.join(profile,'presence.json');
await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.Drawing; $bitmap=New-Object System.Drawing.Bitmap(1920,1080); $graphics=[System.Drawing.Graphics]::FromImage($bitmap); $graphics.Clear([System.Drawing.Color]::FromArgb(22,25,31)); $bitmap.Save('${blank.replaceAll("'","''")}',[System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bitmap.Dispose()`],{windowsHide:true});
const focus={foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'};
async function setPresence(value){await fs.writeFile(`${presence}.next`,JSON.stringify(value));await fs.rename(`${presence}.next`,presence);}
await setPresence(focus);
const env={...process.env,ZYON_USER_DATA:profile,ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
let app,page,userId;
async function waitFor(predicate,label,timeout=60000){const until=Date.now()+timeout;while(Date.now()<until){const state=await page.evaluate(()=>window.zyon.getState());if(predicate(state))return state;await new Promise(r=>setTimeout(r,150));}throw Error(`Timeout: ${label}`);}
async function changeFixture(file){await page.evaluate(()=>window.zyon.setReader(false));await app.evaluate((_,value)=>{process.env.ZYON_OCR_FIXTURE=value;},file);await page.evaluate(()=>window.zyon.setReader(true));}
try{
 app=await electron.launch({...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||path.join(process.env.LOCALAPPDATA,'Programs/Zyon TFT/Zyon TFT.exe'))}:{args:['.']},env});
 await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.webContents.setBackgroundThrottling(false);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w));});
 page=await app.firstWindow();page.setDefaultTimeout(30000);
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.getByRole('textbox',{name:'Seu nome no Zyon',exact:true}).fill('Teste de continuidade');
 await page.getByRole('textbox',{name:'Nome de usuário Zyon',exact:true}).fill(`cont_${tag}`);
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(`zyon-continuity-${tag}@example.invalid`);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(crypto.randomBytes(24).toString('base64url'));
 await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
 const signedIn=await waitFor(s=>s.social?.user&&s.social?.profile,'real account');userId=signedIn.social.user.id;
 await fs.writeFile(`.runtime/continuity-user-${tag}.json`,JSON.stringify({id:userId,email:`zyon-continuity-${tag}@example.invalid`}));
 const original=await waitFor(s=>s.overlayVisible&&s.levelReading.status==='confirmed'&&s.goldReading.status==='confirmed','game started');
 const id=original.guideComp.champions[0];await page.evaluate(({id,compId})=>window.zyon.gameAction({type:'copies',id,delta:1,compId}),{id,compId:original.pinned});
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
