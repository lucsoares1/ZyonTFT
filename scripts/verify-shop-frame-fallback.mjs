import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';

const profile=path.resolve('.runtime/shop-frame-fallback-'+Date.now());
await fs.mkdir(profile,{recursive:true});
const presence=path.join(profile,'presence.json');
await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'}));
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'))[0];
const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
const app=await _electron.launch({args:['.'],env});
let page;
try{
 const monitor=await app.evaluate(({app,BrowserWindow,screen})=>{
  const primary=screen.getPrimaryDisplay(),display=screen.getAllDisplays().find(display=>display.id!==primary.id);
  if(!display)throw Error('Teste requer o monitor secundário livre');
  screen.getPrimaryDisplay=()=>display;screen.getAllDisplays=()=>[display];
  const quiet=window=>{
   window.setOpacity(0);window.setPosition(display.workArea.x,display.workArea.y);window.setIgnoreMouseEvents(true,{forward:true});window.webContents.setBackgroundThrottling(false);
   window.on('show',()=>window.setIgnoreMouseEvents(true,{forward:true}));
   queueMicrotask(()=>{if(!window.isDestroyed())window.setIgnoreMouseEvents(true,{forward:true});});
  };
  BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,window)=>quiet(window));
  return display.bounds;
 });
 page=await app.firstWindow();
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials.email);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials.password);
 await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await page.waitForFunction(async()=>{const state=await window.zyon.getState();return state.overlayVisible&&state.slots?.some(slot=>slot.id);});
 const state=await page.evaluate(async()=>{await window.zyon.setReader(false);return window.zyon.getState();});
 await app.evaluate(async({BrowserWindow},{monitor,preload,file})=>{
  const fixture=new BrowserWindow({x:monitor.x,y:monitor.y,width:monitor.width,height:monitor.height,show:false,frame:false,transparent:true,backgroundColor:'#00000000',webPreferences:{preload,contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  await fixture.loadFile(file,{query:{view:'overlay',fixture:'shop-frame'}});
 },{monitor,preload:path.resolve('electron/preload.cjs'),file:path.resolve('dist/index.html')});
 let overlay;
 for(let attempt=0;attempt<100&&!overlay;attempt++){
  overlay=app.windows().find(page=>page.url().includes('fixture=shop-frame'));
  if(!overlay)await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(overlay,'native shop renderer exists');
 await overlay.locator('.native-overlay').waitFor({state:'attached'});
 const physical={x:.2295,y:.858,width:.53,height:.139};
 const detected={x:.232,y:.86,width:.1,height:.13};
 const cases=[{name:'send-no-individual-borders',kind:'send',cards:[null,null,null,null,null]},
  {name:'shared-no-individual-borders',kind:'shared',cards:null},
  {name:'buy-detected-border',kind:'buy',cards:[detected,null,null,null,null]}];
 for(const [index,scenario] of cases.entries()){
  const id='DA_Vi18';
  const snapshot={...state,pinned:'frame-fixture',opacity:100,shopRevision:100000+index,shopRect:physical,shopCards:scenario.cards,slots:[{id,confidence:1},null,null,null,null],
   guideComp:{...state.guideComp,style:'Personalizada',champions:scenario.kind==='send'?[]:[id]},overlayPlans:scenario.kind==='buy'?{'frame-fixture':{requests:[{id,goal:3}]}}:{},
   gameSession:{...state.gameSession,matchId:'fixture-17',ended:false,context:{...state.gameSession.context,copies:{}}},
   social:scenario.kind==='buy'?{}:{session:{id:'fixture'},partner:{display_name:'Dupla de teste'},partnerPlan:{updated_at:new Date().toISOString(),payload:{playing:true,shopping:[{id,goal:3,owned:0}]}}}};
  await app.evaluate(({BrowserWindow},snapshot)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('fixture=shop-frame')).webContents.send('state:update',snapshot),snapshot);
  const slot=overlay.locator('.native-slot').nth(0);
  await overlay.waitForFunction(kind=>document.querySelector('.native-slot')?.getAttribute('data-kind')===kind,scenario.kind);
  await slot.locator('.shop-medal').waitFor();
  await slot.locator('.shop-frost-frame').waitFor();
  assert.equal(await overlay.locator('.shop-frost-frame').count(),1,'empty and unselected slots have no frame');
  const proof=await slot.evaluate(element=>{
   const box=element.getBoundingClientRect(),frame=element.querySelector('.shop-frost-frame'),style=getComputedStyle(frame);
   return {box:{x:box.x,y:box.y,width:box.width,height:box.height},viewport:{width:innerWidth,height:innerHeight},display:style.display,visibility:style.visibility,stroke:getComputedStyle(frame.querySelector(':scope > g > path')).stroke,accent:getComputedStyle(element).getPropertyValue('--shop-accent').trim()};
  });
  const expected=scenario.cards?.[0]||{x:physical.x+physical.width/5*.025,y:physical.y,width:physical.width/5*.94,height:physical.height*.975};
  assert.ok(Math.abs(proof.box.x-expected.x*proof.viewport.width)<1);
  assert.ok(Math.abs(proof.box.y-expected.y*proof.viewport.height)<1);
  assert.ok(Math.abs(proof.box.height-expected.height*proof.viewport.height)<1);
  assert.notEqual(proof.display,'none');assert.equal(proof.visibility,'visible');assert.notEqual(proof.stroke,'none');
  assert.equal(proof.accent,scenario.kind==='send'?'#a855f7':'#2497ff');
  await overlay.screenshot({path:path.join(profile,scenario.name+'.png'),omitBackground:true});
 }
 let preview;
 if(process.argv.includes('--preview')){
  const ids=['DA_Vi18','DA_18_MasterYi_AD','DA_18_Alistar','DA_Cinderling18'];
  const snapshot={...state,pinned:'frame-fixture',opacity:100,shopRevision:100010,shopRect:physical,shopCards:null,slots:[...ids.map(id=>({id,confidence:1})),null],
   guideComp:{...state.guideComp,style:'Personalizada',champions:[ids[0],ids[2]]},overlayPlans:{'frame-fixture':{requests:[{id:ids[0],goal:3}]}},
   gameSession:{...state.gameSession,matchId:'fixture-17',ended:false,context:{...state.gameSession.context,copies:{}}},
   social:{session:{id:'fixture'},partner:{display_name:'Dupla de teste'},partnerPlan:{updated_at:new Date().toISOString(),payload:{playing:true,shopping:[{id:ids[1],goal:3,owned:0},{id:ids[2],goal:3,owned:0}]}}}};
  await app.evaluate(({BrowserWindow},snapshot)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('fixture=shop-frame')).webContents.send('state:update',snapshot),snapshot);
  await overlay.waitForFunction(()=>document.querySelectorAll('.shop-frost-frame').length===3);
  await overlay.evaluate(async source=>{
   const image=document.createElement('img');image.src=source;
   Object.assign(image.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',objectFit:'fill',zIndex:'0'});
   document.body.prepend(image);Object.assign(document.querySelector('#root').style,{position:'relative',zIndex:'1'});
   await image.decode();
  },pathToFileURL(path.resolve('design/references/17-game-ocr.png')).href);
  preview=path.join(profile,'shop-preview.png');
  await overlay.screenshot({path:preview,clip:{x:420,y:880,width:1070,height:200}});
 }
 console.log(JSON.stringify({ok:true,monitor,cases:cases.map(scenario=>scenario.name),profile,preview,realGame:false}));
}finally{
 if(page)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
 await app.close();
}
