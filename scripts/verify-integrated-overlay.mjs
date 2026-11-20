import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';

const output=path.resolve('.runtime/integrated-overlay-qa');
const profile=path.join(output,`profile-${Date.now()}`);
await fs.mkdir(profile,{recursive:true});
const presence=path.join(profile,'presence.json');
await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-integrated'}));
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'))[2];
assert.ok(credentials?.email&&credentials?.password,'Requires isolated fixture account');
const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
const app=await _electron.launch({args:['.'],env});
const report={ok:false,realGame:false,errors:[],surfaces:[]};
let main;
async function state(){return main.evaluate(()=>window.zyon.getState());}
function plan(comp){return Object.fromEntries(['id','name','style','champions','items','stars','positions','carry'].map(key=>[key,comp?.[key]]));}
async function settled(predicate){for(let attempt=0;attempt<150;attempt++){const value=await state();if(predicate(value))return value;await main.waitForTimeout(100);}throw Error('State did not settle');}
async function pageFor(view){for(let attempt=0;attempt<150;attempt++){const page=app.windows().find(page=>new URL(page.url()||'about:blank').searchParams.get('view')===view);if(page)return page;await main.waitForTimeout(100);}throw Error('Missing '+view);}
async function windows(){return app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(window=>({view:new URL(window.webContents.getURL()||'about:blank').searchParams.get('view')||'main',visible:window.isVisible(),bounds:window.getBounds()})));}
async function capture(page,name){
 await page.evaluate(()=>document.fonts.ready);
 const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,summary:document.querySelectorAll('.zy-summary-unit').length,nested:document.querySelectorAll('button button').length,broken:[...document.images].filter(image=>image.complete&&!image.naturalWidth).map(image=>image.src)}));
 assert.equal(metrics.overflow,false,name+' overflow');assert.equal(metrics.nested,0,name+' nested buttons');assert.deepEqual(metrics.broken,[],name+' images');
 const summaryGeometry=await page.evaluate(()=>Object.fromEntries(['.zy-launcher','.zy-integrated-content','.zy-companion-summary','.zy-summary-identity','.zy-summary-roster','.zy-summary-actions'].map(selector=>{const element=document.querySelector(selector),rect=element?.getBoundingClientRect();return[selector,rect?{top:rect.top,bottom:rect.bottom,height:rect.height,padding:getComputedStyle(element).padding}:null];})));
 assert.ok(await page.locator('.zy-summary-actions').evaluate(element=>element.getBoundingClientRect().bottom<=innerHeight),'Summary actions stay visible '+JSON.stringify(summaryGeometry));
 await page.screenshot({path:path.join(output,name+'.png')});report.surfaces.push({name,...metrics});
}
try{
 report.monitor=await app.evaluate(({app,BrowserWindow,screen})=>{
  const primary=screen.getPrimaryDisplay(),secondary=screen.getAllDisplays().find(display=>display.id!==primary.id);
  if(!secondary)throw Error('Requires a free secondary monitor');
  screen.getPrimaryDisplay=()=>secondary;screen.getAllDisplays=()=>[secondary];
  const quiet=window=>{
   window.setOpacity(0);window.setPosition(secondary.bounds.x,secondary.bounds.y);window.setIgnoreMouseEvents(true,{forward:true});window.webContents.setBackgroundThrottling(false);
   const ignore=()=>{if(!window.isDestroyed())window.setIgnoreMouseEvents(true,{forward:true});};
   window.on('show',()=>queueMicrotask(ignore));window.once('ready-to-show',()=>queueMicrotask(ignore));queueMicrotask(ignore);
  };
  BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,window)=>quiet(window));
  return secondary.bounds;
 });
 main=await app.firstWindow();
 main.on('pageerror',error=>report.errors.push(error.message));
 await main.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials.email);
 await main.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials.password);
 await main.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await settled(value=>value.social?.profile&&value.guideComp);
 await main.evaluate(async()=>{await window.zyon.setOverlay(true);await window.zyon.setReader(false);await window.zyon.overlayAction({type:'open',panel:'comp'});await window.zyon.overlayAction({type:'pin',panel:'comp'});await window.zyon.overlayAction({type:'open',panel:'champions'});});
 const before=await state();
 const launcher=await pageFor('launcher');launcher.on('pageerror',error=>report.errors.push(error.message));
 const firstId=before.guideComp.champions[0];
 assert.equal(await launcher.evaluate(id=>window.zyon.targetAction({list:'buy',type:'toggle',id}),firstId),false,'Floating launcher has no task permissions');
 await launcher.getByRole('button',{name:'Testar painel integrado',exact:true}).click();
 await settled(value=>value.overlayLayout.presentation==='integrated'&&!value.overlayLayout.activePanel);
 await launcher.locator('.zy-integrated').waitFor();
 await launcher.emulateMedia({reducedMotion:'no-preference'});
 await launcher.evaluate(()=>{window.resizeProof=[];window.addEventListener('resize',()=>{const summary=document.querySelector('.zy-companion-summary')?.getBoundingClientRect();window.resizeProof.push({height:innerHeight,gap:summary?innerHeight-summary.bottom:0,content:!!document.querySelector('.zy-integrated-content [data-panel]')});});});
 await launcher.waitForTimeout(400);await capture(launcher,'integrated-resting');
 const summaryItem=launcher.locator('.zy-summary-items img').first();
 for(let attempt=0;attempt<2;attempt++){
  await summaryItem.hover();
  const tooltip=await pageFor('item-tooltip');
  await tooltip.getByRole('tooltip').waitFor();
  await launcher.waitForTimeout(300);
  const nativeWindows=await windows(),owner=nativeWindows.find(window=>window.view==='launcher'),tip=nativeWindows.find(window=>window.view==='item-tooltip');
  assert.ok(tip.visible,'Native item tooltip appears, including repeated hover on the same item');
  assert.equal(owner.bounds.x<tip.bounds.x+tip.bounds.width&&owner.bounds.x+owner.bounds.width>tip.bounds.x&&owner.bounds.y<tip.bounds.y+tip.bounds.height&&owner.bounds.y+owner.bounds.height>tip.bounds.y,false,'Tooltip never overlaps the summary window');
  assert.equal(await launcher.getByRole('tooltip').count(),0,'Tooltip is not drawn over the roster');
  assert.ok(await tooltip.getByRole('tooltip').evaluate(element=>element.scrollHeight<=element.clientHeight+1),'Item content is not clipped');
  await tooltip.screenshot({path:path.join(output,'native-summary-item.png')});
  await launcher.mouse.move(2,2);await launcher.waitForTimeout(100);
  assert.equal((await windows()).find(window=>window.view==='item-tooltip').visible,false);
 }
 await launcher.evaluate(()=>{window.resizeProof=[];});
 const compact=(await windows()).find(window=>window.view==='launcher').bounds;
 assert.ok((await windows()).filter(window=>['guide','panel'].includes(window.view)).every(window=>!window.visible),'No task windows remain visible');
 assert.equal(await launcher.evaluate(id=>window.zyon.targetAction({list:'buy',type:'toggle',id}),firstId),false,'Resting integrated launcher has no task permissions');
 for(const [panel,label]of [['champions','Campeões'],['comp','Comp'],['duo','Dupla'],['status','Leitura e partida']]){
  await launcher.getByRole('button',{name:'Abrir '+label,exact:true}).click();
  await launcher.locator(`.zy-integrated-content [data-panel="${panel}"]`).waitFor();await launcher.waitForTimeout(350);
  const current=(await windows()).find(window=>window.view==='launcher').bounds;
  assert.equal(current.x,compact.x);assert.equal(current.y,compact.y);assert.equal(current.width,compact.width);assert.ok(current.height>compact.height);
  assert.ok(current.y+current.height<=report.monitor.y+report.monitor.height*.86,'Window stays above shop');
  const geometry=await launcher.evaluate(()=>{const middle=document.querySelector('.zy-integrated-content').getBoundingClientRect(),summary=document.querySelector('.zy-companion-summary').getBoundingClientRect();return{middleBottom:middle.bottom,summaryTop:summary.top,summaryBottom:summary.bottom,height:innerHeight};});
  assert.ok(Math.abs(geometry.middleBottom-geometry.summaryTop)<2,'Task is between tools and summary');assert.ok(geometry.summaryBottom<=geometry.height);
  assert.ok((await windows()).filter(window=>['guide','panel'].includes(window.view)).every(window=>!window.visible));
  assert.equal(await launcher.locator('.zy-summary-unit').count(),before.guideComp.champions.length);
  assert.equal(await launcher.getByRole('button',{name:'Fixar painel ao lado',exact:true}).count(),0);
  if(panel==='champions'){
   await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=launcher')).setBounds({height:566}));
   await capture(launcher,'integrated-champions-short');
   const short=await launcher.evaluate(()=>{const tile=document.querySelector('.oc-champion').getBoundingClientRect(),catalog=document.querySelector('.oc-catalog').getBoundingClientRect();return{tileBottom:tile.bottom,catalogBottom:catalog.bottom};});
   assert.ok(short.tileBottom<=short.catalogBottom,'Short integrated catalog keeps a whole champion row visible');
   await app.evaluate(({BrowserWindow},bounds)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=launcher')).setBounds(bounds),current);
   const selection=launcher.locator('.oc-selected-list');
   const leftArrow=launcher.getByRole('button',{name:'Ver campeões marcados à esquerda',exact:true});
   const rightArrow=launcher.getByRole('button',{name:'Ver campeões marcados à direita',exact:true});
   await rightArrow.waitFor({state:'visible'});
   assert.equal(await leftArrow.isVisible(),false,'No left arrow at the beginning');
   assert.equal(await selection.evaluate(element=>getComputedStyle(element).scrollbarWidth),'none');
   assert.equal(await launcher.locator('.oc-selection-carousel').evaluate(element=>getComputedStyle(element).userSelect),'none');
   for(let step=0;step<8&&await rightArrow.isVisible();step++){await rightArrow.click();await launcher.waitForTimeout(400);}
   assert.equal(await rightArrow.isVisible(),false,'No right arrow at the end');
   assert.equal(await leftArrow.isVisible(),true);
   await launcher.screenshot({path:path.join(output,'integrated-selection-end.png')});
   for(let step=0;step<8&&await leftArrow.isVisible();step++){await leftArrow.click();await launcher.waitForTimeout(400);}
   assert.equal(await leftArrow.isVisible(),false,'Left arrow disappears again at the beginning');
   assert.equal(await rightArrow.isVisible(),true);
   const tile=launcher.locator('.oc-champion').first(),id=await tile.getAttribute('data-champion-id');
   const previous=await tile.getAttribute('aria-pressed');await tile.click();
   await launcher.waitForFunction(({id,previous})=>document.querySelector(`.oc-champion[data-champion-id="${id}"]`)?.getAttribute('aria-pressed')!==previous,{id,previous});
   assert.deepEqual((await state()).gameSession.context,before.gameSession.context);
   assert.deepEqual(plan((await state()).guideComp),plan(before.guideComp));
   report.catalogHeight=await launcher.locator('.oc-catalog').evaluate(element=>element.clientHeight);
   assert.ok(report.catalogHeight>=340,'Expanded catalog gains useful vertical space');
  }
  await capture(launcher,'integrated-'+panel);
 }
 const targetsAfterInteraction=structuredClone((await state()).shopTargets);
 await launcher.getByRole('button',{name:'Fechar painel',exact:true}).click();
 await launcher.waitForTimeout(400);
 assert.equal((await windows()).find(window=>window.view==='launcher').bounds.height,compact.height);
 assert.deepEqual((await state()).gameSession.context,before.gameSession.context);
 const frames=await launcher.evaluate(()=>window.resizeProof);
 assert.ok(frames.filter(frame=>frame.height>compact.height+8&&frame.height<compact.height+400).length>=3,'Native window moves through intermediate heights');
 assert.ok(frames.every(frame=>Math.abs(frame.gap)<=2),'No empty area ever appears below the summary');
 assert.ok(frames.filter(frame=>frame.height>compact.height+8).every(frame=>frame.content),'Content is mounted before the window grows');
 report.synchronizedFrames=frames.length;
 for(const panel of ['champions','comp','duo']){await launcher.evaluate(panel=>window.zyon.overlayAction({type:'toggle',panel}),panel);await launcher.waitForTimeout(35);}
 for(let cycle=0;cycle<3;cycle++){await launcher.evaluate(()=>window.zyon.overlayAction({type:'toggle',panel:'duo'}));await launcher.waitForTimeout(30);await launcher.evaluate(()=>window.zyon.overlayAction({type:'toggle',panel:'duo'}));await launcher.waitForTimeout(30);}
 await launcher.waitForTimeout(450);assert.equal((await state()).overlayLayout.activePanel,'duo');await capture(launcher,'integrated-rapid-switch');
 assert.ok((await windows()).find(window=>window.view==='launcher').bounds.height>compact.height,'Interrupted closing never shrinks a reopened panel');
 await launcher.emulateMedia({reducedMotion:'reduce'});const count=await launcher.evaluate(()=>window.resizeProof.length);
 await launcher.getByRole('button',{name:'Fechar painel',exact:true}).click();await launcher.waitForTimeout(400);
 assert.ok((await launcher.evaluate(count=>window.resizeProof.slice(count),count)).every(frame=>frame.height===compact.height),'Reduced motion avoids intermediate heights');
 assert.equal(await launcher.getByRole('button',{name:'Voltar ao modo anterior',exact:true}).count(),0);
 await launcher.getByRole('button',{name:'Minimizar overlay',exact:true}).click();await launcher.waitForTimeout(400);
 const minimized=(await windows()).find(window=>window.view==='launcher').bounds;
 assert.equal(minimized.height,42);assert.equal(minimized.width,244);
 assert.equal(await launcher.locator('.zy-companion-summary').count(),0);
 assert.equal(await launcher.locator('.zy-task-panel').count(),0);
 const expand=launcher.getByRole('button',{name:'Expandir overlay',exact:true});
 assert.ok(await expand.evaluate(element=>element.getBoundingClientRect().right<=innerWidth));
 await launcher.screenshot({path:path.join(output,'integrated-minimized.png')});
 await expand.click();await launcher.waitForTimeout(400);await capture(launcher,'integrated-restored-summary');
 await launcher.getByRole('button',{name:'Minimizar overlay',exact:true}).click();await launcher.waitForTimeout(400);
 await launcher.getByRole('button',{name:'Abrir Campeões',exact:true}).click();await launcher.waitForTimeout(400);
 assert.equal((await state()).overlayLayout.summaryCollapsed,false);
 await capture(launcher,'integrated-expanded-from-tool');
 const originalDisplay=await app.evaluate(({screen})=>screen.getPrimaryDisplay());
 await app.evaluate(({screen},original)=>{
  const changed={...original,bounds:{...original.bounds,width:1280,height:720},workArea:{...original.workArea,width:1280,height:680},scaleFactor:1.5};
  screen.getPrimaryDisplay=()=>changed;screen.getAllDisplays=()=>[changed];
  screen.emit('display-metrics-changed',{},changed,['bounds','scaleFactor']);
 },originalDisplay);
 await launcher.waitForTimeout(200);
 const resized=(await windows()).find(window=>window.view==='launcher').bounds;
 assert.ok(resized.x>=report.monitor.x&&resized.x+resized.width<=report.monitor.x+1280);
 assert.ok(resized.y+resized.height<=720*.86,'Changing resolution immediately fits the native window above the shop');
 await app.evaluate(({screen},original)=>{screen.getPrimaryDisplay=()=>original;screen.getAllDisplays=()=>[original];screen.emit('display-metrics-changed',{},original,['bounds','scaleFactor']);},originalDisplay);
 await launcher.waitForTimeout(200);
 report.displayMetricsRecovery=true;
 await launcher.evaluate(()=>window.zyon.overlayAction({type:'setPresentation',value:'floating'}));await launcher.waitForTimeout(400);
 assert.deepEqual((await state()).overlayLayout,before.overlayLayout,'One-click rollback restores exact layout');
 assert.deepEqual(plan((await state()).guideComp),plan(before.guideComp));assert.deepEqual((await state()).gameSession.context,before.gameSession.context);
 assert.deepEqual((await state()).shopTargets,targetsAfterInteraction,'Rollback preserves intentional shopping changes');
 assert.equal((await state()).readerActive,before.readerActive);
 assert.equal(await launcher.evaluate(id=>window.zyon.targetAction({list:'buy',type:'toggle',id}),firstId),false,'Rollback removes integrated task permissions');
 assert.ok((await windows()).some(window=>window.view==='guide'&&window.visible));assert.ok((await windows()).some(window=>window.view==='panel'&&window.visible));
 await capture(launcher,'floating-restored');
 for(const window of await windows()){assert.ok(window.bounds.x>=report.monitor.x);assert.ok(window.bounds.x+window.bounds.width<=report.monitor.x+report.monitor.width);}
 assert.deepEqual(report.errors,[]);report.ok=true;report.reversible=true;report.singleInteractiveWindow=true;report.reducedMotion=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{await app.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
