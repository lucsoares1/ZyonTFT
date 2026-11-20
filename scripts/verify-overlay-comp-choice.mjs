import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';

const profile=path.resolve('.runtime/overlay-comp-choice-'+Date.now());
await fs.mkdir(profile,{recursive:true});
const presence=path.join(profile,'presence.json');
await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'}));
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'))[0];
const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
const app=await _electron.launch({args:['.'],env});
const errors=[];
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
 let guide;
 for(let attempt=0;attempt<100&&!guide;attempt++){
  guide=app.windows().find(page=>page.url().includes('view=guide'));
  if(!guide)await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(guide,'native guide exists');
 guide.on('pageerror',error=>errors.push(error.message));
 await guide.locator('.game-guide').waitFor();
 await guide.evaluate(async()=>{const state=await window.zyon.getState();await window.zyon.gameAction({type:'tab',value:'comps',compId:state.pinned});});
 await guide.locator('.overlay-comp-library').waitFor();
 const before=await guide.evaluate(()=>window.zyon.getState());
 const target=before.saved.comps.find(comp=>comp.id!==before.pinned);
 assert.ok(target);
 await guide.getByRole('button',{name:`Usar composição ${target.name}`,exact:true}).click();
 await guide.waitForFunction(async id=>(await window.zyon.getState()).pinned===id,target.id);
 assert.equal(await guide.locator('.overlay-comp-detail').count(),0,'selection needs no inspector');
 assert.equal((await guide.evaluate(()=>window.zyon.getState())).gameSession.tab,'now','selection opens live guidance');
 await guide.getByRole('tab',{name:'Comps',exact:true}).click();
 await guide.getByRole('button',{name:`Composição ${target.name} em uso`,exact:true}).waitFor();
 const after=await guide.evaluate(()=>window.zyon.getState());
 assert.deepEqual(after.gameSession.context,before.gameSession.context,'choosing preserves live match data and copies');
 assert.equal(after.gameSession.matchId,before.gameSession.matchId);
 await guide.getByRole('button',{name:`Ver detalhes de ${target.name}`,exact:true}).click();
 await guide.locator('.overlay-comp-detail').waitFor();
 await guide.getByRole('button',{name:'Todas as comps',exact:true}).click();
 await guide.getByRole('button',{name:`Ver detalhes de ${before.saved.comps.find(comp=>comp.id!==target.id).name}`,exact:true}).first().click();
 const preview=before.saved.comps.find(comp=>comp.id!==target.id);
 await guide.getByRole('button',{name:`Usar composição ${preview.name}`,exact:true}).waitFor();
 assert.equal((await guide.evaluate(()=>window.zyon.getState())).pinned,target.id,'preview does not switch comp');
 await guide.getByRole('button',{name:'Todas as comps',exact:true}).click();
 const search=guide.getByRole('textbox',{name:'Buscar composição no overlay',exact:true});
 await search.fill('zzzz-sem-comp-fixture');
 await guide.locator('.overlay-comp-empty').waitFor();
 await search.fill('');
 assert.equal(await guide.locator('.overlay-comp-option').count(),before.saved.comps.length,'complete catalog remains available');
 const keyboard=guide.getByRole('button',{name:`Usar composição ${preview.name}`,exact:true});
 await keyboard.focus();await keyboard.press('Enter');
 await guide.waitForFunction(async id=>(await window.zyon.getState()).pinned===id,preview.id);
 await guide.getByRole('tab',{name:'Comps',exact:true}).click();
 await guide.evaluate(async()=>{const state=await window.zyon.getState();if(!state.gameSession.guideExpanded)await window.zyon.gameAction({type:'guide-expand',compId:state.pinned});});
 const sizes=[];
 for(const [width,height] of [[640,800],[840,980],[1120,950]]){
  await app.evaluate(({BrowserWindow},{width,height,monitor})=>{
   const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide'));
   window.setBounds({x:monitor.x+12,y:monitor.y+12,width,height});
  },{width,height,monitor});
  await guide.waitForFunction(width=>innerWidth===width,width);
  await guide.evaluate(()=>{document.querySelector('.game-content').scrollTop=0;});
  const geometry=await guide.evaluate(()=>{
   const library=document.querySelector('.overlay-comp-library'),cards=[...library.querySelectorAll('.overlay-comp-option')];
   const issues=[];
   for(const card of cards){
    const box=card.getBoundingClientRect();
    const heading=card.querySelector('.overlay-card-heading').getBoundingClientRect(),traits=card.querySelector('.overlay-card-traits').getBoundingClientRect();
    if(traits.top-heading.bottom<6)issues.push('heading and traits overlap');
    const roster=card.querySelector('.overlay-card-roster'),units=[...roster.querySelectorAll('.lineup-unit')];
    const rosterBox=roster.getBoundingClientRect(),unitBoxes=units.map(unit=>unit.getBoundingClientRect());
    if(unitBoxes.some(rect=>Math.abs(rect.top-unitBoxes[0].top)>1))issues.push('roster wraps');
    if(unitBoxes.some(rect=>rect.left<rosterBox.left-1||rect.right>rosterBox.right+1))issues.push('roster clipped');
    if(units.length<=10&&unitBoxes.some(rect=>rect.width<38))issues.push('portraits too small');
    for(const unit of units){
     const portrait=unit.querySelector('.portrait-frame').getBoundingClientRect(),stars=unit.querySelector('.lineup-stars').getBoundingClientRect();
     if(Math.abs(stars.top-portrait.top+8)>1)issues.push('stars not lowered');
     for(const item of unit.querySelectorAll('.mini-equipment img')){
      const rect=item.getBoundingClientRect();
      if(rect.width<11&&units.length<=10)issues.push('items too small');
      if(rect.left<portrait.left-1||rect.right>portrait.right+1||rect.bottom>rosterBox.bottom+1)issues.push('equipment clipped');
     }
    }
    for(const element of card.querySelectorAll('.overlay-card-actions button,.lineup-unit,.overlay-card-heading')){
     const rect=element.getBoundingClientRect();if(rect.left<box.left-1||rect.right>box.right+1)issues.push('card overflow');
    }
   }
   return {width:innerWidth,height:innerHeight,columns:getComputedStyle(library.querySelector('.overlay-comp-grid')).gridTemplateColumns,issues,horizontal:document.querySelector('.game-content').scrollWidth>document.querySelector('.game-content').clientWidth+1};
  });
  assert.deepEqual(geometry.issues,[]);assert.equal(geometry.horizontal,false);
  await guide.screenshot({path:path.join(profile,'library-'+width+'.png')});sizes.push(geometry);
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,monitor,sizes,oneClickSelection:true,keyboardSelection:true,independentPreview:true,completeCatalog:true,matchPreserved:true,errors,profile,realGame:false}));
}finally{
 if(page)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
 await app.close();
}
