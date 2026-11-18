import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
import {equipmentGroups} from '../src/plan-summary.mjs';
import {championRole} from '../src/planning.mjs';

const users=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const catalog=Object.fromEntries(JSON.parse(await fs.readFile('src/generated/catalog.json','utf8')).champions.map(c=>[c.id,{...c,role:championRole(c.id,c.role)}]));
const out=path.resolve('design/review/0.17.28/arena');
const env={...process.env,ZYON_USER_DATA:path.resolve('.runtime/summary-equipment-'+Date.now()),ZYON_TEST_BACKGROUND:'1',ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL'])delete env[key];
const errors=[],checks=[];
const fullSweep=process.env.ZYON_SUMMARY_REFERENCE_ONLY!=='1';
const capacityCheck=process.env.ZYON_RIFTBEAST_CAPACITY==='1';
let app,page,guide;
async function wait(fn,label){const end=Date.now()+25000;while(Date.now()<end){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,100));}throw Error('Timeout '+label);}
async function bounds(target,width){await app.evaluate(({BrowserWindow,screen},{url,width})=>{if(url.includes('view=guide')){const c=screen.getPrimaryDisplay(),d={...c,bounds:{...c.bounds,width:width+24},workArea:{...c.workArea,width:width+24}};screen.getAllDisplays=()=>[d];screen.getPrimaryDisplay=()=>d;}BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).setBounds({width,height:900});},{url:target.url(),width});await target.waitForFunction(w=>innerWidth===w,width);}
async function shot(target,root,name){
 await root.evaluate(e=>{const c=e.closest('.game-content,.comp-feed');if(c)c.scrollTop+=e.getBoundingClientRect().top-c.getBoundingClientRect().top;document.scrollingElement.scrollTop=0;});
 await target.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));});
 const png=await app.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);w.showInactive();try{await w.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await new Promise(r=>setTimeout(r,250));return(await w.webContents.capturePage()).toPNG().toString('base64');}finally{w.hide();}},target.url());
 await fs.writeFile(path.join(out,name+'.png'),Buffer.from(png,'base64'));
}
async function verify(root,comp,reference){
 await root.waitFor();
 assert.equal(await root.getByRole('button',{name:'Resumo',exact:true}).getAttribute('aria-pressed'),'true',comp.name);
 const rows=await root.locator('.zy-comp-summary [data-holder-id]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.holderId,group:n.closest('[data-equipment-group]').dataset.equipmentGroup,items:[...n.querySelectorAll('.equipment>img')].map(i=>i.getAttribute('src').split('/').at(-1).slice(0,-4))})));
 const expected=equipmentGroups(comp,catalog,reference?.pivot?.carries||comp.pivot?.carries).flatMap(g=>g.ids.map(id=>({id,group:g.key,items:comp.items?.[id]||[]})));
 assert.deepEqual(rows,expected,comp.name+' exact carry/frontline/other equipment');
 if(!expected.length)assert.ok((await root.locator('.zy-summary-equipment').textContent()).includes('ainda não tem itens definidos'));
 assert.equal(await root.locator('.zy-comp-summary .zy-summary-equipment').count(),1);
 assert.equal(await root.locator('.zy-plan-field .zy-summary-equipment').count(),0,'no duplicate equipment in summary');
 if(!comp.pivot?.openers?.length){const roster=await root.locator('.zy-summary-roster .portrait-frame>img').evaluateAll(nodes=>nodes.map(i=>i.getAttribute('src').split('/').at(-1).slice(0,-4)));assert.deepEqual(roster,comp.champions.filter(id=>catalog[id]),comp.name+' exact personal roster');}
 assert.ok(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),comp.name+' root width');
 assert.ok(await root.locator('.zy-plan-path').evaluate(e=>e.scrollWidth<=e.clientWidth+1),comp.name+' summary width');
 assert.equal(await root.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).length),0,comp.name+' images');
}
try{
 app=await _electron.launch({args:['.'],env});
 await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.setAlwaysOnTop(false);w.webContents.setBackgroundThrottling(false);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w));});
 page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(users[2].email);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(users[2].password);
 await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 await page.evaluate(()=>window.zyon.setOverlay(true));
 await wait(async()=>{const s=await page.evaluate(()=>window.zyon.getState());return s.gameSession.matchId&&s.levelReading.status==='confirmed';},'fixture');
 await page.evaluate(()=>window.zyon.setReader(false));
 guide=await wait(()=>app.windows().find(w=>w.url().includes('view=guide')),'native guide');guide.on('pageerror',e=>errors.push(e.message));
 const original=await page.evaluate(()=>window.zyon.getState());
 const dragon=Object.values(catalog).find(c=>c.name==='Dragão Ancião');assert.ok(dragon);
 const front=Object.values(catalog).filter(c=>c.role==='Linha de frente'&&c.id!==dragon.id).slice(0,2).map(c=>c.id);
 const base=original.saved.comps.find(c=>c.name==='Blossom Ahri Fast 9')||original.saved.comps[0];
 const personal={...base,id:'comp-summary-equipped',name:'Plano pessoal equipado',style:'Personalizada',source:undefined,pivot:undefined,strategy:undefined};
 const empty={...personal,id:'comp-summary-empty',name:'Plano pessoal sem itens',champions:[dragon.id,...front],carry:dragon.id,items:{},stars:{},positions:{}};
 await page.evaluate(async({personal,empty})=>{const s=await window.zyon.getState();await window.zyon.publish({saved:{...s.saved,comps:[...s.saved.comps,personal,empty]},selected:s.selected});},{personal,empty});
 await page.reload();await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 await wait(async()=>(await page.evaluate(()=>window.zyon.getState())).saved.comps.some(c=>c.id===empty.id),'personal fixtures hydrated');
 const comps=(await page.evaluate(()=>window.zyon.getState())).saved.comps;
 const sessionBefore=(await page.evaluate(()=>window.zyon.getState())).gameSession;
 await bounds(page,1050);await bounds(guide,640);
 await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
 const selected=new Set(['Lunar Kayle','Alune Fast 9','Blossom Ahri Fast 9','Riftbeast 10',personal.name,empty.name]);
 let count=0;
 for(const comp of fullSweep?comps:[]){
  assert.equal(await guide.evaluate(id=>window.zyon.chooseComp(id),comp.id),true,'choose '+comp.name);
  const row=page.locator(`[data-comp-id="${comp.id}"]`),root=row.locator('.zy-plan-explorer');
  await verify(root,comp);
  await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
  await guide.locator(`[data-comp="${comp.id}"] .overlay-comp-detail-open`).click();
  const native=guide.locator('.zy-plan-explorer');await verify(native,comp);
  if(selected.has(comp.name)){
   const name=comp.id.replace('s18-pivot-','').replace('comp-summary-','personal-');
   await shot(page,root,'23-summary-items-main-'+name+'-1050');
   await shot(guide,native,'24-summary-items-native-'+name+'-640');
   await bounds(page,1536);await verify(root,comp);await shot(page,root,'23-summary-items-main-'+name+'-1536');await bounds(page,1050);
   await bounds(guide,840);await verify(native,comp);await shot(guide,native,'24-summary-items-native-'+name+'-840');await bounds(guide,640);
  }
  await guide.getByRole('button',{name:'Todas as comps',exact:true}).click();
  if(++count%20===0)console.log('Verified '+count+' compositions in both windows');
 }
 // A roster edit must appear identically in the personal summary in both windows.
 const editBase=comps.find(c=>c.name==='Riftbeast 10');assert.ok(editBase);
 await guide.evaluate(id=>window.zyon.chooseComp(id),editBase.id);
 const added=Object.keys(catalog).filter(id=>!editBase.champions.includes(id)).slice(0,2);
 for(const id of added)await guide.evaluate(({compId,id})=>window.zyon.editPlan({type:'toggle',compId,id}),{compId:editBase.id,id});
 await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
 await guide.locator(`[data-comp="${editBase.id}"] .overlay-comp-detail-open`).click();
 await wait(async()=>(await guide.locator('.zy-summary-roster .portrait-frame>img').count())===editBase.champions.length+added.length,'working roster summary');
 const edited=(await page.evaluate(()=>window.zyon.getState())).guideComp;
 const mainEdited=page.locator(`[data-comp-id="${editBase.id}"] .zy-plan-explorer`),nativeEdited=guide.locator('.zy-plan-explorer');
 await verify(mainEdited,edited,editBase);await verify(nativeEdited,edited,editBase);
 for(const root of [mainEdited,nativeEdited]){
  assert.ok((await root.locator('.zy-path-reference').textContent()).includes('roteiro original'));
  await root.getByRole('button',{name:'Níveis',exact:true}).click();
  assert.deepEqual(await root.locator('.zy-path-levels button strong').allTextContents(),[...editBase.pivot.levels.map(s=>'Nv. '+s.level),'Final']);
  await root.getByRole('button',{name:'Nv. 3',exact:false}).click();
  const levelIds=await root.locator('.zy-path-team .portrait-frame>img').evaluateAll(nodes=>nodes.map(i=>i.getAttribute('src').split('/').at(-1).slice(0,-4)));
  assert.deepEqual(levelIds,editBase.pivot.levels.find(s=>s.level===3).units,'published level3 stays exact after roster edit');
 }
 await shot(page,mainEdited,'25-adjusted-riftbeast-main-1050');await shot(guide,nativeEdited,'25-adjusted-riftbeast-native-640');
 await guide.getByRole('tab',{name:'Roteiro',exact:true}).click();
 await guide.getByRole('navigation',{name:'Equipe do roteiro'}).getByRole('button',{name:'3',exact:true}).click();
 assert.ok((await guide.locator('.game-caption').allTextContents()).some(t=>t.includes('Roteiro original')));
 await shot(guide,guide.locator('.pivot-guide'),'25-adjusted-riftbeast-route-640');
 if(capacityCheck){
  const board=async root=>root.locator('.tft-hex.occupied').evaluateAll(nodes=>nodes.map(n=>({cell:Number(n.dataset.boardCell),id:n.querySelector('.hex-portrait>img').getAttribute('src').split('/').at(-1).slice(0,-4),items:[...n.querySelectorAll('.hex-equipment>img')].map(i=>i.getAttribute('src').split('/').at(-1).slice(0,-4)),stars:n.querySelectorAll('.unit-stars>svg').length})));
  // Restore only the isolated fixture, through the same explicit action offered to users.
  await mainEdited.getByRole('button',{name:'Restaurar plano do guia',exact:true}).click();
  await wait(async()=>!(await page.evaluate(()=>window.zyon.getState())).overlayPlans[editBase.id],'main restore working plan');
  let mainRoot=page.locator(`[data-comp-id="${editBase.id}"] .zy-plan-explorer`);
  await mainRoot.getByRole('button',{name:'Níveis',exact:true}).click();
  await mainRoot.getByRole('button',{name:'Nv. 10',exact:false}).click();
  const expected=Object.entries(editBase.positions).map(([id,cell])=>({id,cell})).sort((a,b)=>a.cell-b.cell);
  const reference=await board(mainRoot.locator('.zy-plan-board'));
  assert.deepEqual(reference.map(({id,cell})=>({id,cell})),expected,'all eleven source units and exact saved cells');
  assert.equal(await page.locator(`[data-comp-id="${editBase.id}"] .zy-traits span`).filter({has:page.locator('img[alt="Fera do Rift"]')}).locator('b').textContent(),'10','header includes innate double contribution');
  await shot(page,mainRoot,'26-riftbeast-main-levels-1050');
  const row=page.locator(`[data-comp-id="${editBase.id}"]`);
  await row.getByRole('tab',{name:'Progressão',exact:true}).click();
  await row.getByRole('button',{name:'Nível 10',exact:true}).click();
  assert.deepEqual(await board(row.locator('.level-board')),reference,'main adaptive progression retains every source unit, cell, item and star');
  assert.ok((await row.locator('.level-section-title').textContent()).includes('12/12 espaços'));
  await shot(page,row.locator('.level-team-section'),'26-riftbeast-main-progression-1050');
  await bounds(page,1536);await shot(page,row.locator('.level-layout'),'26-riftbeast-main-progression-1536');await bounds(page,1050);
  await guide.getByRole('tab',{name:'Equipe',exact:true}).click();
  await guide.getByRole('button',{name:'Consultar nível 10',exact:true}).click();
  const nativeBoard=guide.locator('.game-team-board>.tft-board-panel');
  assert.deepEqual(await board(nativeBoard),reference,'native adaptive Equipe agrees with full published board');
  assert.ok((await guide.locator('.game-content').textContent()).includes('12/12 espaços'));
  await shot(guide,nativeBoard,'26-riftbeast-native-team-640');await bounds(guide,840);await shot(guide,nativeBoard,'26-riftbeast-native-team-840');await bounds(guide,640);
  await guide.getByRole('tab',{name:'Roteiro',exact:true}).click();
  await guide.getByRole('navigation',{name:'Equipe do roteiro'}).getByRole('button',{name:'10',exact:true}).click();
  assert.deepEqual(await board(guide.locator('.pivot-route-main>.tft-board-panel')),reference,'native published Roteiro agrees');
  await shot(guide,guide.locator('.pivot-guide'),'26-riftbeast-native-route-640');
  // Actual reported extra choices stay explicit and can be restored in the overlay too.
  for(const id of ['DA_Cinderling18','DA_18_Kobuko'])await guide.evaluate(({compId,id})=>window.zyon.editPlan({type:'toggle',compId,id}),{compId:editBase.id,id});
  await guide.getByRole('tab',{name:'Equipe',exact:true}).click();
  assert.ok((await guide.locator('.game-content').textContent()).includes('12/12 espaços'));
  assert.ok((await guide.locator('.zy-path-reference').textContent()).includes('ajustes de elenco'));
  await shot(guide,guide.locator('.zy-path-reference'),'27-riftbeast-adjusted-native-team-640');
  await guide.getByRole('button',{name:'Restaurar plano do guia',exact:true}).click();
  await wait(async()=>!(await page.evaluate(()=>window.zyon.getState())).overlayPlans[editBase.id],'native restore');
  await wait(async()=>JSON.stringify(await board(nativeBoard))===JSON.stringify(reference),'native restored board rendered');
  assert.deepEqual(await board(nativeBoard),reference,'native explicit restore returns to exact published team');
  checks.push('Riftbeast10: source11 units and all28-cell positions/items/stars agree across main Níveis/Progressão and native Equipe/Roteiro;12/12slots,+2capacity,traitcount10; explicit restore in both windows works; personal support choices remain until restore');
 }
 const sessionAfter=(await page.evaluate(()=>window.zyon.getState())).gameSession;
 for(const key of ['context','matchId','startedAt','purchases','levelMode','goldMode'])assert.deepEqual(sessionAfter[key],sessionBefore[key],key+' preserved');
 assert.deepEqual(errors,[]);
 if(fullSweep)checks.push(`${comps.length} comps: exact plan equipment and grouping, personal/empty states; desktop1050/native640`,`${selected.size} representative comps: desktop1536/native840 plus captures at all four sizes`);
 checks.push('Adjusted Riftbeast10: original levels3–10 available in both windows and native Roteiro; actual adjusted roster/equipment retained; live session preserved');
 await fs.writeFile(path.join(out,capacityCheck?'riftbeast-capacity-checks.json':fullSweep?'summary-equipment-checks.json':'summary-reference-checks.json'),JSON.stringify({ok:true,count:fullSweep?comps.length:1,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
}finally{await app?.close();}
