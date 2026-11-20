import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';

const output=path.resolve('.runtime/modular-overlay-qa');
const profile=path.join(output,`profile-${Date.now()}`);
await fs.mkdir(profile,{recursive:true});
const presence=path.join(profile,'presence.json');
await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-modular'}));
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'))[2];
assert.ok(credentials?.email&&credentials?.password,'A terceira conta de fixture isolada é necessária');
const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
const app=await _electron.launch({args:['.'],env});
const errors=[];
const report={ok:false,profile,realGame:false,errors,surfaces:[]};
let main;
const read=()=>main.evaluate(()=>window.zyon.getState());
async function waitForState(predicate,description){
  for(let attempt=0;attempt<150;attempt++){
    const state=await read();
    if(predicate(state))return state;
    await main.waitForTimeout(100);
  }
  throw Error(`State did not settle: ${description}`);
}
async function windowFor(view){
  let page;
  for(let attempt=0;attempt<150&&!page;attempt++){
    page=app.windows().find(candidate=>candidate.url().includes(`view=${view}`));
    if(!page)await main.waitForTimeout(100);
  }
  assert.ok(page,`native ${view} window exists`);
  page.on('pageerror',error=>errors.push(error.message));
  return page;
}
async function nativeWindows(){return app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().map(window=>({view:new URL(window.webContents.getURL()||'about:blank').searchParams.get('view')||'main',bounds:window.getBounds(),visible:window.isVisible()})));}
async function capture(page,name,panel){
  if(panel)await page.locator(`[data-panel="${panel}"]`).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].filter(image=>{const box=image.getBoundingClientRect();return box.width&&box.height&&box.bottom>0&&box.y<innerHeight;}).every(image=>image.complete));
  const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,horizontal:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(image=>image.complete&&!image.naturalWidth).map(image=>image.getAttribute('src')),bodyOverflow:[...document.querySelectorAll('.zy-task-body')].some(element=>element.scrollWidth>element.clientWidth+1)}));
  assert.equal(geometry.horizontal,false,`${name} document horizontal overflow`);
  assert.equal(geometry.bodyOverflow,false,`${name} body horizontal overflow`);
  assert.deepEqual(geometry.brokenImages,[],`${name} broken images`);
  if(panel==='comp'){
    assert.equal(await page.locator('button button').count(),0,`${name} has no nested interactive buttons`);
    const metricGeometry=await page.locator('.zy-detail-hero .performance-numbers > div').evaluateAll(elements=>elements.map(element=>{const box=element.getBoundingClientRect();return{x:box.x,right:box.right,width:box.width,overflow:element.scrollWidth>element.clientWidth+1};}));
    for(let index=1;index<metricGeometry.length;index++)assert.ok(metricGeometry[index].x>=metricGeometry[index-1].right+4,`${name} metrics have visible separation`);
    assert.ok(metricGeometry.every(metric=>!metric.overflow),`${name} metric labels and values fit`);
  }
  if(panel==='champions'){
    const type=await page.locator('.oc-champion>strong').first().evaluate(element=>({family:getComputedStyle(element).fontFamily,size:getComputedStyle(element).fontSize,weight:getComputedStyle(element).fontWeight,fontReady:document.fonts.check('500 13px "Inter Variable"')}));
    assert.equal(type.fontReady,true,'Local Inter font has loaded');
    assert.ok(type.family.includes('Inter Variable'));
    assert.equal(type.size,'13px');assert.equal(type.weight,'500');
    assert.equal(await page.locator('.oc-item-trigger').count(),0,'Items open on hover without a separate icon');
    geometry.typography=type;
  }
  await page.screenshot({path:path.join(output,`${name}.png`)});
  report.surfaces.push({name,...geometry});
}
try{
  report.monitor=await app.evaluate(({app,BrowserWindow,screen})=>{
    const primary=screen.getPrimaryDisplay(),display=screen.getAllDisplays().find(candidate=>candidate.id!==primary.id);
    if(!display)throw Error('Teste requer o monitor secundário livre');
    screen.getPrimaryDisplay=()=>display;
    screen.getAllDisplays=()=>[display];
    const quiet=window=>{
      window.setOpacity(0);
      window.setPosition(display.workArea.x,display.workArea.y);
      window.setIgnoreMouseEvents(true,{forward:true});
      window.webContents.setBackgroundThrottling(false);
      window.on('show',()=>window.setIgnoreMouseEvents(true,{forward:true}));
      queueMicrotask(()=>{if(!window.isDestroyed())window.setIgnoreMouseEvents(true,{forward:true});});
    };
    BrowserWindow.getAllWindows().forEach(quiet);
    app.on('browser-window-created',(_,window)=>quiet(window));
    return {id:display.id,...display.bounds};
  });
  main=await app.firstWindow();
  main.on('pageerror',error=>errors.push(error.message));
  await main.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials.email);
  await main.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials.password);
  await main.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
  await waitForState(state=>state.social?.user&&state.social?.profile&&state.saved?.comps?.length&&state.gameSession?.matchId,'authenticated fixture');
  report.setOverlay=await main.evaluate(()=>window.zyon.setOverlay(true));
  assert.equal(report.setOverlay,true);
  const initial=await read();
  report.initialState={user:!!initial.social?.user,profile:!!initial.social?.profile,armed:initial.overlayArmed,pinned:initial.pinned};
  const launcher=await windowFor('launcher');
  await launcher.getByRole('navigation',{name:'Ferramentas Zyon TFT'}).waitFor();
  assert.equal(await launcher.getByRole('navigation').getByRole('button',{name:/^Abrir /}).count(),4);
  await capture(launcher,'launcher');
  const launcherWindow=(await nativeWindows()).find(window=>window.view==='launcher');
  if(!initial.pinned){assert.equal(launcherWindow.bounds.width,204);assert.equal(launcherWindow.bounds.height,48);}
  assert.equal(await launcher.evaluate(id=>window.zyon.targetAction({list:'buy',type:'toggle',id}),initial.saved.comps[0].champions[0]),false);
  assert.equal(await launcher.evaluate(()=>window.zyon.getUpdate()),null);
  await launcher.getByRole('button',{name:'Abrir Comp',exact:true}).click();
  const guide=await windowFor('guide');
  await guide.locator('[data-panel="comp"]').waitFor();
  assert.equal(await guide.evaluate(()=>window.zyon.updateAction('check')),null);
  assert.ok((await guide.evaluate(()=>window.zyon.socialAction({type:'logout'}))).error);
  report.ipcPermissionBoundaries=true;
  if(!(await read()).pinned){
    await guide.getByRole('button',{name:/^Usar composição /}).first().click();
  }
  await main.evaluate(async()=>{await window.zyon.setReader(false);const state=await window.zyon.getState();await window.zyon.gameAction({type:'copies',compId:state.pinned,id:state.guideComp.champions[0],delta:2});await window.zyon.gameAction({type:'hp',compId:state.pinned,delta:-7});});
  const before=await read();
  await launcher.getByRole('region',{name:'Resumo da composição'}).waitFor();
  assert.equal(await launcher.locator('.zy-summary-unit').count(),before.guideComp.champions.length);
  const expandedBounds=(await nativeWindows()).find(window=>window.view==='launcher').bounds;
  assert.equal(expandedBounds.height,234);
  const contextBeforeCollapse=structuredClone(before.gameSession);
  await launcher.getByRole('button',{name:'Recolher resumo da comp',exact:true}).click();
  await waitForState(state=>state.overlayLayout.summaryCollapsed,'summary collapsed');
  assert.equal((await nativeWindows()).find(window=>window.view==='launcher').bounds.height,48);
  await launcher.getByRole('button',{name:'Mostrar resumo da comp',exact:true}).click();
  await waitForState(state=>!state.overlayLayout.summaryCollapsed,'summary reopened');
  assert.deepEqual((await read()).gameSession,contextBeforeCollapse,'Collapse does not mutate session');
  await capture(launcher,'comp-summary');
  await guide.getByRole('button',{name:'Trocar comp',exact:true}).click();
  const choices=guide.getByRole('button',{name:/^Usar composição /});
  await choices.first().waitFor();
  report.compositionChoices=await choices.count();
  assert.ok(report.compositionChoices>2);
  assert.equal(report.compositionChoices+1,before.saved.comps.length);
  const nextComp=before.saved.comps.find(comp=>comp.id!==before.pinned);
  await guide.getByRole('button',{name:`Usar composição ${nextComp.name}`,exact:true}).click();
  assert.equal((await read()).pinned,nextComp.id);
  assert.deepEqual((await read()).gameSession.context,before.gameSession.context);
  for(const [label,name]of [['Itens','items'],['Campeões','champions'],['Transições','transitions'],['Roteiro','route'],['Aprimoramentos','augments']]){
    await guide.getByRole('navigation',{name:'Detalhes da composição'}).getByRole('button',{name:label,exact:true}).click();
    await capture(guide,`comp-detail-${name}`,'comp');
    assert.ok(await guide.locator('.zy-detail-content').evaluate(element=>element.clientHeight>=100),`${name} keeps a usable content area`);
  }
  await guide.getByRole('navigation',{name:'Detalhes da composição'}).getByRole('button',{name:'Planejar',exact:true}).click();
  await capture(guide,'comp-planner-960','comp');
  await guide.getByRole('button',{name:'Início',exact:true}).click();
  await capture(guide,'comp-quick-start-960','comp');
  for(const item of await guide.locator('.zy-detail-hero .equipment img').all()){
    await item.hover();
    const itemTip=guide.locator('.zy-item-tooltip');
    await itemTip.waitFor();
    const box=await itemTip.boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=960&&box.y+box.height<=740,'Full item tooltip remains inside detail window');
    await guide.mouse.move(950,55);
  }
  const beforeDetailHover=await read();
  await guide.locator('.zy-detail-hero .zy-detail-portrait').first().hover();
  const detailTooltip=guide.locator('.zy-detail-champion-tooltip');
  await detailTooltip.waitFor();
  assert.match(await detailTooltip.innerText(),/PivotTFT|Guias de comps|Sem conjunto específico/,'Detail hover identifies its evidence');
  await detailTooltip.hover();await guide.waitForTimeout(220);assert.equal(await detailTooltip.isVisible(),true,'Detail hover permits reading the popup');
  await capture(guide,'comp-champion-hover','comp');
  await guide.keyboard.press('Escape');assert.equal(await detailTooltip.count(),0);
  assert.equal((await read()).overlayLayout.activePanel,'comp','First Escape closes hover, not panel');
  await guide.locator('.zy-detail-board-inspection .tft-hex.occupied').first().hover();
  await detailTooltip.waitFor();
  await guide.keyboard.press('Escape');assert.equal(await detailTooltip.count(),0);
  const afterDetailHover=await read();
  assert.deepEqual(afterDetailHover.gameSession,beforeDetailHover.gameSession,'Detail hover never changes gameplay');
  assert.deepEqual(afterDetailHover.shopTargets,beforeDetailHover.shopTargets,'Detail hover never toggles targets');
  assert.deepEqual(afterDetailHover.overlayPlans,beforeDetailHover.overlayPlans,'Detail hover never edits a plan');
  assert.equal(await guide.locator('.tft-hex').count(),28);
  assert.ok(await guide.locator('.tft-hex.occupied').count()>2);
  assert.equal((await nativeWindows()).find(window=>window.view==='guide').bounds.width,960);
  const fullCompBounds=(await nativeWindows()).find(window=>window.view==='guide').bounds;
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).setBounds({width:640,height:500}));
  await capture(guide,'comp-quick-start-small','comp');
  assert.ok(await guide.locator('.zy-detail-content').evaluate(element=>element.clientHeight>=100),'Small view keeps usable content below header');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).setBounds({width:500,height:566}));
  await capture(guide,'comp-quick-start-500','comp');
  assert.ok(await guide.locator('.zy-detail-content').evaluate(element=>element.clientHeight>=100),'Packed 720p view keeps a usable content area');
  await app.evaluate(({BrowserWindow},bounds)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).setBounds(bounds),fullCompBounds);
  const editedId=nextComp.champions.at(-1);
  await guide.evaluate(({compId,id})=>window.zyon.editPlan({type:'toggle',compId,id}),{compId:nextComp.id,id:editedId});
  await waitForState(state=>!state.guideComp.champions.includes(editedId),'planner edit reflected in active composition');
  await launcher.waitForFunction(count=>document.querySelectorAll('.zy-summary-unit').length===count,nextComp.champions.length-1);
  assert.equal(await launcher.locator('.zy-summary-unit').count(),nextComp.champions.length-1,'Summary follows adjusted roster');
  await guide.evaluate(({compId,id})=>window.zyon.editPlan({type:'toggle',compId,id}),{compId:nextComp.id,id:editedId});
  await waitForState(state=>state.guideComp.champions.includes(editedId),'planner champion restored');
  assert.deepEqual((await read()).gameSession.context,before.gameSession.context,'Planner edits do not reset gameplay');
  await launcher.getByRole('button',{name:'Abrir Campeões',exact:true}).click();
  await capture(guide,'champions-460','champions');
  const fullCatalogBounds=(await nativeWindows()).find(window=>window.view==='guide').bounds;
  for(const height of [320,310,300]){
    await app.evaluate(({BrowserWindow},height)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).setBounds({width:460,height}),height);
    await capture(guide,`champions-short-${height}`,'champions');
    assert.ok(await guide.locator('.oc-catalog').evaluate(element=>element.clientHeight>=70),'Short packed catalog retains scrollable champions');
    const shortGeometry=await guide.evaluate(()=>{const catalog=document.querySelector('.oc-catalog').getBoundingClientRect(),tile=document.querySelector('.oc-champion').getBoundingClientRect(),footer=document.querySelector('.oc-footer').getBoundingClientRect(),selected=document.querySelector('.oc-selected-list>button').getBoundingClientRect();return{catalog:{top:catalog.top,bottom:catalog.bottom},tile:{top:tile.top,bottom:tile.bottom},footer:{top:footer.top,bottom:footer.bottom},selected:{top:selected.top,bottom:selected.bottom},height:innerHeight};});
    assert.ok(shortGeometry.tile.top>=shortGeometry.catalog.top&&shortGeometry.tile.bottom<=shortGeometry.catalog.bottom,'Short catalog shows one complete champion row');
    assert.ok(shortGeometry.selected.top>=shortGeometry.footer.top&&shortGeometry.selected.bottom<=shortGeometry.height,'Short selection tray remains usable');
  }
  await app.evaluate(({BrowserWindow},bounds)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).setBounds(bounds),fullCatalogBounds);
  assert.equal(await launcher.locator('.zy-summary-unit').count(),nextComp.champions.length,'Catalog retains complete summary');
  assert.equal(await guide.getByRole('combobox').count(),1,'catalog has only the cost filter');
  assert.equal(await guide.getByRole('button',{name:'Pedir à dupla',exact:true}).count(),0);
  const inheritedId=nextComp.champions[0];
  const inheritedTile=guide.locator(`.oc-champion[data-champion-id="${inheritedId}"]`);
  assert.equal(await inheritedTile.getAttribute('aria-pressed'),'true');
  await inheritedTile.click();
  await waitForState(state=>state.shopTargets.excluded?.includes(inheritedId),'inherited target removed');
  await inheritedTile.waitFor({state:'visible'});
  await guide.waitForFunction(id=>document.querySelector(`.oc-champion[data-champion-id="${id}"]`)?.getAttribute('aria-pressed')==='false',inheritedId);
  assert.equal(await guide.locator('.oc-inspector').count(),0,'marking does not open the item inspector');
  await inheritedTile.click();
  await waitForState(state=>!state.shopTargets.excluded?.includes(inheritedId)&&state.shopTargets.buy.some(target=>target.id===inheritedId),'inherited target restored');
  const unmarked=guide.locator('.oc-champion[aria-pressed="false"]').first();
  const manualId=await unmarked.getAttribute('data-champion-id');
  await unmarked.click();
  const bought=await waitForState(state=>state.shopTargets.buy.some(target=>target.id===manualId),'one click manual target');
  assert.equal(bought.shopTargets.buy.find(target=>target.id===manualId).goal,9);
  assert.deepEqual((await read()).gameSession.context,before.gameSession.context);
  const beforeHover=structuredClone((await read()).shopTargets);
  await guide.mouse.move(1,1);
  await guide.locator(`.oc-champion[data-champion-id="${manualId}"]`).hover();
  await guide.getByRole('tooltip').waitFor();
  assert.deepEqual((await read()).shopTargets,beforeHover,'Hovering items never toggles selection');
  await capture(guide,'champion-items-target','champions');
  assert.equal(await guide.getByRole('combobox').count(),1,'item inspector has no goals or request priorities');
  await guide.getByRole('button',{name:'Fechar itens do campeão',exact:true}).click();
  assert.equal((await nativeWindows()).find(window=>window.view==='guide').bounds.width,460);
  await launcher.getByRole('button',{name:'Abrir Comp',exact:true}).click();
  await guide.locator('[data-panel="comp"]').waitFor();
  await guide.getByRole('button',{name:'Fixar painel ao lado',exact:true}).click();
  const pinned=await windowFor('panel');
  await pinned.locator('[data-panel="comp"]').waitFor();
  assert.equal((await read()).overlayLayout.activePanel,null);
  await launcher.getByRole('button',{name:'Abrir Campeões',exact:true}).click();
  await guide.locator('[data-panel="champions"]').waitFor();
  const paired=await read();
  assert.equal(paired.overlayLayout.activePanel,'champions');assert.equal(paired.overlayLayout.pinnedPanel,'comp');
  await capture(pinned,'pinned-comp','comp');
  report.pairedWindows=await nativeWindows();
  assert.equal(report.pairedWindows.filter(window=>['guide','panel'].includes(window.view)&&window.visible).length,2);
  const packed=report.pairedWindows.filter(window=>['launcher','guide','panel'].includes(window.view)&&window.visible);
  for(let first=0;first<packed.length;first++)for(let second=first+1;second<packed.length;second++){
    const one=packed[first].bounds,two=packed[second].bounds;
    assert.equal(one.x<two.x+two.width&&one.x+one.width>two.x&&one.y<two.y+two.height&&one.y+one.height>two.y,false,`${packed[first].view}/${packed[second].view} do not collide`);
  }
  await launcher.getByRole('button',{name:'Abrir Dupla',exact:true}).click();
  await capture(guide,'duo-480','duo');
  assert.equal(await launcher.locator('.zy-summary-unit').count(),nextComp.champions.length,'Duo retains complete summary');
  assert.equal((await nativeWindows()).find(window=>window.view==='guide').bounds.width,480);
  assert.equal(await guide.getByRole('button',{name:'Copiar meu código de amigo',exact:true}).count(),1);
  await guide.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__qaCopiedCode=value;}}}));
  await guide.getByRole('button',{name:'Copiar meu código de amigo',exact:true}).click();
  assert.equal(await guide.evaluate(()=>window.__qaCopiedCode),(await read()).social.profile.friend_code);
  report.clipboardIntercepted=true;
  await guide.getByRole('button',{name:'Adicionar amigo',exact:true}).click();
  await guide.getByRole('textbox',{name:'Código de amigo',exact:true}).waitFor();
  await capture(guide,'duo-friends-form','duo');
  await guide.getByRole('button',{name:'Fechar formulário de amizade',exact:true}).click();
  assert.equal((await read()).overlayLayout.pinnedPanel,'comp');
  assert.equal((await nativeWindows()).filter(window=>['guide','panel'].includes(window.view)&&window.visible).length,2);
  await launcher.getByRole('button',{name:'Abrir Leitura e partida',exact:true}).click();
  await capture(guide,'status-400','status');
  const after=await read();
  assert.deepEqual(after.gameSession.context,before.gameSession.context);
  assert.equal(after.gameSession.matchId,before.gameSession.matchId);
  await guide.getByRole('button',{name:'Fechar painel',exact:true}).click();
  await waitForState(state=>state.overlayLayout.activePanel===null,'active panel closed');
  assert.equal((await nativeWindows()).find(window=>window.view==='guide').visible,false);
  await pinned.getByRole('button',{name:'Fechar painel',exact:true}).click();
  await waitForState(state=>state.overlayLayout.pinnedPanel===null,'pinned panel closed');
  assert.equal((await nativeWindows()).find(window=>window.view==='panel').visible,false);
  await main.evaluate(async()=>{
    const state=await window.zyon.getState();
    await window.zyon.publish({...state,pinned:null,baseGuideComp:null,guideComp:null,selected:[],saved:{...state.saved,pinned:null}});
  });
  assert.equal((await read()).pinned,null);
  await launcher.getByRole('button',{name:'Abrir Comp',exact:true}).click();
  await guide.getByRole('heading',{name:'Escolha sua composição',exact:true}).waitFor();
  assert.ok(await guide.getByRole('button',{name:/^Usar composição /}).count()>2,'No composition still exposes the complete library');
  await capture(guide,'library-without-comp','comp');
  await main.evaluate(id=>window.zyon.targetAction({list:'buy',type:'set',id,goal:3,priority:1}),before.guideComp.champions[0]);
  await launcher.getByRole('button',{name:'Abrir Campeões',exact:true}).click();
  await guide.locator('[data-panel="champions"]').waitFor();
  const independent=await read();
  assert.equal(independent.pinned,null);
  assert.ok(independent.shopTargets.buy.some(target=>target.id===before.guideComp.champions[0]));
  await capture(guide,'champions-without-comp','champions');
  await guide.getByRole('button',{name:'Fechar painel',exact:true}).click();
  const windows=await nativeWindows();
  for(const window of windows.filter(window=>['launcher','guide','panel'].includes(window.view))){
    assert.ok(window.bounds.x>=report.monitor.x&&window.bounds.x+window.bounds.width<=report.monitor.x+report.monitor.width,`${window.view} stays on secondary display`);
    assert.ok(window.bounds.y>=report.monitor.y&&window.bounds.y+window.bounds.height<=report.monitor.y+report.monitor.height,`${window.view} stays on secondary display`);
  }
  assert.deepEqual(errors,[]);
  Object.assign(report,{ok:true,launcherButtons:4,sessionPreserved:true,maximumPanels:2,closedWindowsHidden:true,oneClickTargets:true,inheritedTargetsRemovable:true,independentTargetsWithoutComposition:true,nativeFriendControls:true,windows});
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{
  if(main)await main.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
  await app.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
