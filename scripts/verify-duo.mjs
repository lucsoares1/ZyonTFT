// Three disposable, email-confirmed fixture accounts are provisioned separately.
// This script never signs up users or sends email. All Electron profiles are isolated.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron as electron} from 'playwright';
import {createClient} from '@supabase/supabase-js';
import {shoppingWishes} from '../src/duo-plans.mjs';
const championCatalog=Object.fromEntries(JSON.parse(await fs.readFile('src/generated/catalog.json','utf8')).champions.map(c=>[c.id,c]));
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const config=JSON.parse(await fs.readFile('electron/cloud-config.json','utf8'));
const users=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const packaged=process.argv.includes('--packaged'),suffix=packaged?'-packaged':'';
const liveShop=process.argv.includes('--live-shop'),requestedName=liveShop?'Alistar':'Teemo',requestedId=liveShop?'DA_18_Alistar':'DA_18_Teemo';
const out=path.resolve(`design/review/${version}/duo`);await fs.mkdir(out,{recursive:true});
const fixture=path.resolve('design/references/17-game-ocr.png');
const apps=[],errors=[],checks=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function waitValue(fn,predicate,label,timeout=25000){const until=Date.now()+timeout;let value;while(Date.now()<until){value=await fn();if(predicate(value))return value;await pause(130);}throw new Error(`Timed out: ${label}`);}
const social=p=>p.evaluate(()=>window.zyon.getSocial());
const state=p=>p.evaluate(()=>window.zyon.getState());
const act=(p,a)=>p.evaluate(a=>window.zyon.socialAction(a),a);
async function controlPoint(app,page){
 const box=await page.locator('[data-guide-shop-toggle]').boundingBox();
 const native=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide'));return {bounds:w.getBounds(),zoom:w.webContents.getZoomFactor()};});
 return {x:native.bounds.x+(box.x+box.width/2)*native.zoom,y:native.bounds.y+(box.y+box.height/2)*native.zoom};
}
function sameControl(a,b){assert.ok(Math.abs(a.x-b.x)<=1&&Math.abs(a.y-b.y)<=1,`toggle moved from ${JSON.stringify(a)} to ${JSON.stringify(b)}`);}
async function capture(app,page,file){
 if(process.argv.includes('--no-captures'))return;
 await page.emulateMedia({reducedMotion:'reduce'});
 if(!process.argv.includes('--background'))return page.screenshot({path:file,animations:'disabled'});
 const png=await app.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);const wasVisible=w.isVisible();w.removeAllListeners('show');w.setAlwaysOnTop(false);w.showInactive();try{await w.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await new Promise(r=>setTimeout(r,150));return (await w.webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64');}finally{if(!wasVisible)w.hide();}},page.url());
 assert.ok(png.length>100);await fs.writeFile(file,Buffer.from(png,'base64'));
}
async function launch(i,reuseProfile){
 const profile=reuseProfile||path.resolve('.runtime',`duo-${i}-${Date.now()}`),env={...process.env,ZYON_USER_DATA:profile,ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:fixture};delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;
 if(process.argv.includes('--background'))env.ZYON_TEST_BACKGROUND='1';
 const app=await electron.launch({...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||'release/win-unpacked/Zyon TFT.exe'),args:[]}:{args:['.']},env});apps.push(app);
 if(process.argv.includes('--background'))await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.webContents.setBackgroundThrottling(false);w.setAlwaysOnTop(false);w.setOpacity(0);w.setIgnoreMouseEvents(true);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_e,w)=>quiet(w));});
 const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({x:35,y:25,width:1536,height:1000}));
 if(!reuseProfile){
 await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'E-mail da conta Zyon'}).fill(users[i].email);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(users[i].password);
 await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 }
 await waitValue(()=>social(page),s=>s?.profile&&s.status==='online',`user${i} login`);
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Duplas Dinâmicas',exact:true}).click();
 return {app,page,profile};
}
let c;
try{
 const a=await launch(0),b=await launch(1);
 c=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await c.auth.signInWithPassword({email:users[2].email,password:users[2].password});assert.ifError(login.error);
 for(const f of (await social(a.page)).friends)await act(a.page,{type:'friendRemove',id:f.id});
 for(const f of (await social(a.page)).friendRequests)await act(a.page,{type:'friendRemove',id:f.id});
 await act(b.page,{type:'refresh'});
 checks.push('two isolated desktop clients log into real Supabase accounts; no service-role key is used');
 const profileB=(await social(b.page)).profile;
 await a.page.evaluate(()=>window.zyon.setOverlay(true));
 await waitValue(()=>state(a.page),s=>s.gameSession.matchId&&s.levelReading.status==='confirmed','solo fixture HUD');
 const soloGuide=await waitValue(async()=>a.app.windows().find(w=>w.url().includes('view=guide')),Boolean,'solo guide');
 await soloGuide.getByRole('tab',{name:'Agora',exact:true}).waitFor();
 assert.equal(await soloGuide.getByRole('tab',{name:'Dupla',exact:true}).count(),0,'solo overlay hides Dupla');
 const originalSelection=await state(a.page),other=originalSelection.saved.comps.find(c=>c.id!==originalSelection.pinned&&c.pivot?.family!==originalSelection.guideComp.pivot?.family);
 assert.ok(other);assert.equal(await a.page.evaluate(id=>window.zyon.chooseComp(id),other.id),false,'main window cannot call the guide-only selector');
 await soloGuide.getByRole('button',{name:'Trocar composição no overlay',exact:true}).click();
 await capture(a.app,soloGuide,path.join(out,`overlay-comps-all${suffix}.png`));
 await soloGuide.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(other.name);
 await capture(a.app,soloGuide,path.join(out,`overlay-comps${suffix}.png`));
 await soloGuide.locator(`[data-comp="${other.id}"]`).click();
 const changedSelection=await waitValue(()=>state(a.page),s=>s.pinned===other.id&&s.saved.pinned===other.id,'another comp selected in game');
 assert.deepEqual(changedSelection.gameSession.context,originalSelection.gameSession.context);assert.deepEqual(changedSelection.gameSession.purchases,originalSelection.gameSession.purchases);
 await a.page.evaluate(snapshot=>window.zyon.publish(snapshot),originalSelection);
 assert.equal((await state(a.page)).pinned,other.id,'late app publication cannot undo an overlay choice');
 await soloGuide.getByRole('button',{name:'Trocar composição no overlay',exact:true}).click();
 await soloGuide.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(originalSelection.guideComp.name);
 await soloGuide.locator(`[data-comp="${originalSelection.pinned}"]`).click();
 await waitValue(()=>state(a.page),s=>s.pinned===originalSelection.pinned,'original comp restored');
 checks.push('solo overlay hides Dupla; full comp library can switch across families in game without resetting resources or purchases, and rejects stale app selections');
 await b.page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Composições',exact:true}).click();
 await a.page.getByRole('textbox',{name:'Código de amigo',exact:true}).fill(profileB.friend_code);
 await a.page.getByRole('button',{name:'Adicionar',exact:true}).click();
 const requestState=await waitValue(()=>social(b.page),s=>s.friendRequests?.some(f=>f.incoming),'friend request');
 const request=requestState.friendRequests.find(f=>f.incoming);
 await b.page.getByRole('status',{name:'Nova notificação social'}).waitFor();
 assert.equal(await b.page.locator('.social-unread-count').textContent(),'1');
 await capture(b.app,b.page,path.join(out,`new-friend-notification${suffix}.png`));
 await b.page.getByRole('button',{name:'Ver pedido',exact:true}).click();
 const rejected=await act(a.page,{type:'friendAccept',id:request.id});assert.ok(rejected.error,'sender cannot accept their own friend request');
 await b.page.getByRole('button',{name:`Aceitar amizade de ${users[0].displayName}`,exact:true}).click();
 await waitValue(()=>social(a.page),s=>s.friends?.length===1,'accepted friendship');
 await waitValue(async()=>b.page.locator('.social-unread-count').count(),n=>n===0,'notification counter clears after acceptance');
 checks.push('incoming friendship displays a global notification outside Duplas, opens the request and clears its pending count on acceptance');
 await a.page.getByRole('button',{name:'Convidar',exact:true}).click();
 const inviteState=await waitValue(()=>social(b.page),s=>s.invites?.some(i=>i.incoming),'duo invitation');
 const invite=inviteState.invites.find(i=>i.incoming);
 assert.ok((await c.rpc('zyon_duo_respond',{invite_id:invite.id,accept:true})).error,'third party cannot accept another player invitation');
 await b.page.getByRole('button',{name:`Aceitar convite de ${users[0].displayName}`,exact:true}).click();
 const together=await waitValue(()=>social(a.page),s=>s.session&&s.partner?.user_id===users[1].id,'duo formed');
 await waitValue(()=>social(b.page),s=>s.session?.id===together.session.id,'matching duo');
 checks.push('friend request, recipient acceptance, invitation and mutual duo formation work across clients');
 const blocked=await c.from('zyon_duo_plans').select('*').eq('session_id',together.session.id);assert.ifError(blocked.error);assert.deepEqual(blocked.data,[]);
 const profiles=await c.from('zyon_profiles').select('user_id');assert.ifError(profiles.error);assert.deepEqual(profiles.data.map(p=>p.user_id),[users[2].id]);
 assert.ok((await c.rpc('zyon_publish_plan',{duo_id:together.session.id,plan:{wishes:[]}})).error);
 assert.ok((await c.from('zyon_duo_plans').insert({session_id:together.session.id,user_id:users[2].id,payload:{}})).error);
 checks.push('RLS hides plans/profiles from a third account; unauthorized publishing and direct writes fail');
 await a.page.evaluate(()=>window.zyon.setOverlay(true));await b.page.evaluate(()=>window.zyon.setOverlay(true));
 await waitValue(()=>state(a.page),s=>s.gameSession.matchId&&s.levelReading.status==='confirmed','first fixture HUD');
 await waitValue(()=>state(b.page),s=>s.gameSession.matchId&&s.levelReading.status==='confirmed','second fixture HUD');
 if(!liveShop)await a.page.evaluate(()=>window.zyon.setReader(false));await b.page.evaluate(()=>window.zyon.setReader(false));
 const ga=await waitValue(async()=>a.app.windows().find(w=>w.url().includes('view=guide')),Boolean,'guide A');
 const gb=await waitValue(async()=>b.app.windows().find(w=>w.url().includes('view=guide')),Boolean,'guide B');
 ga.on('pageerror',e=>errors.push(e.message));gb.on('pageerror',e=>errors.push(e.message));
 await ga.getByRole('tab',{name:'Dupla',exact:true}).waitFor();
 await gb.getByRole('tab',{name:'Planejar',exact:true}).click();
 await gb.getByRole('textbox',{name:'Buscar campeão no overlay',exact:true}).fill(requestedName);
 const before=(await state(b.page)).gameSession;
 await gb.getByRole('button',{name:`Adicionar ${requestedName} à comp`,exact:true}).click();
 const modified=await waitValue(()=>state(b.page),s=>s.guideComp.champions.includes(requestedId),'working roster');
 assert.deepEqual(modified.gameSession,before,'plan edits do not mutate match/copies/gold');
 assert.ok(!modified.baseGuideComp.champions.includes(requestedId));
 await gb.getByRole('radio',{name:`1 estrela, 1 cópia de ${requestedName}`,exact:true}).check();
 const sentAt=Date.now();
 await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.wishes.some(w=>w.id===requestedId&&w.goal===1),'realtime requested champion');
 const syncMs=Date.now()-sentAt;
 checks.push(`overlay roster additions and 1-star requests reach the partner through real Realtime (${syncMs}ms observed)`);
 if(liveShop)await waitValue(()=>state(a.page),s=>s.slots?.some(slot=>slot.id===requestedId),'native shop identifies partner champion');
 else await a.page.evaluate(async()=>{const s=await window.zyon.getState();await window.zyon.publish({...s,slots:['DA_18_Teemo',null,null,null,null]});});
 const badges=await waitValue(async()=>a.app.windows().find(w=>w.url().includes('view=overlay')),Boolean,'shop badges');
 const requestedSlot=liveShop?(await state(a.page)).slots.findIndex(s=>s?.id===requestedId):0;assert.ok(requestedSlot>=0);
 const requestedBadge=badges.locator('.native-slot').nth(requestedSlot).locator('.shop-medal[data-kind="send"],.shop-medal[data-kind="shared"]');
 await requestedBadge.waitFor();
 const beforeMinimize=await state(a.page),medals=await badges.locator('.shop-medal').count();
 const expandedControl=await controlPoint(a.app,ga);
 await ga.getByRole('button',{name:'Encolher painel e manter avisos da loja',exact:true}).click();
 await ga.getByRole('button',{name:'Expandir painel do overlay',exact:true}).waitFor();
 const minimal=await a.app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide'));return {bounds:w.getBounds(),movable:w.isMovable()};});
 assert.equal(minimal.bounds.width,116);assert.equal(minimal.bounds.height,44);assert.equal(minimal.movable,true);
 sameControl(expandedControl,await controlPoint(a.app,ga));
 await capture(a.app,ga,path.join(out,`overlay-shop-only${suffix}.png`));
 assert.equal((await state(a.page)).readerActive,beforeMinimize.readerActive);
 assert.equal(await badges.locator('.shop-medal').count(),medals,'shop-only mode keeps native shop medals');
 await a.app.evaluate(({BrowserWindow,screen})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')),d=screen.getPrimaryDisplay().bounds;w.setPosition(d.x+1000,d.y+140);});
 await waitValue(()=>state(a.page),s=>s.gameSession.guidePosition?.x===1000&&s.gameSession.guidePosition?.y===140,'native window movement persists');
 const movedControl=await controlPoint(a.app,ga);
 await ga.getByRole('button',{name:'Expandir painel do overlay',exact:true}).click();
 await ga.getByRole('tab',{name:'Agora',exact:true}).waitFor();
 assert.equal(await ga.locator('.game-heading').evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'drag');
 assert.equal(await ga.getByRole('button',{name:'Encolher painel e manter avisos da loja',exact:true}).evaluate(el=>getComputedStyle(el).getPropertyValue('-webkit-app-region')),'no-drag');
 const restoredPosition=await a.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).getBounds());
 sameControl(movedControl,await controlPoint(a.app,ga));
 const repeatedShows=await a.app.evaluate(async({BrowserWindow})=>{
   const windows=BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('view='));let calls=0;
   const originals=windows.map(w=>{const fn=w.showInactive;w.showInactive=function(...args){calls++;return fn.apply(this,args)};return fn;});
   try{await new Promise(r=>setTimeout(r,1500));return calls;}finally{windows.forEach((w,i)=>{w.showInactive=originals[i]});}
 });
 assert.equal(repeatedShows,0,'HUD heartbeats must not repeatedly present already visible native windows');
 checks.push('shop-only mode keeps shop medals and reading, restores the guide, and native window movement persists without side switching');
 assert.ok((await requestedBadge.getAttribute('aria-label')).includes(users[1].displayName));
 await capture(a.app,badges,path.join(out,`shop-send${suffix}.png`));
 await ga.getByRole('tab',{name:'Dupla',exact:true}).click();
 await ga.locator('.duo-wish').first().waitFor();await capture(a.app,ga,path.join(out,`overlay-duo${suffix}.png`));
 await capture(b.app,gb,path.join(out,`overlay-planner${suffix}.png`));
 await capture(a.app,a.page,path.join(out,`friends${suffix}.png`));
 await gb.getByRole('radio',{name:`Não pedir cópias de ${requestedName}`,exact:true}).check();
 await waitValue(async()=>requestedBadge.count(),n=>n===0,'request cleared from shop');
 await gb.getByRole('radio',{name:`3 estrelas, 9 cópias de ${requestedName}`,exact:true}).check();
 await requestedBadge.waitFor();
 await gb.locator('.overlay-plan-roster').getByRole('button',{name:`Retirar ${requestedName} da comp`,exact:true}).click();
 await waitValue(async()=>requestedBadge.count(),n=>n===0,'removed unit no longer requested');
 await gb.getByRole('button',{name:'Restaurar comp',exact:true}).click();
 const restored=await state(b.page);assert.deepEqual(restored.guideComp.champions,restored.baseGuideComp.champions);assert.ok(restored.guideComp.pivot);
 if(process.argv.includes('--traits')){
  const beforeTraits=await state(b.page);
  const cleanComp=beforeTraits.saved.comps.find(c=>!shoppingWishes(c,null,beforeTraits.gameSession,championCatalog).some(w=>w.id===requestedId));assert.ok(cleanComp,'a comp without this existing request');
  if(cleanComp.id!==beforeTraits.pinned){await gb.getByRole('tab',{name:'Comps',exact:true}).click();await gb.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(cleanComp.name);await gb.locator(`[data-comp="${cleanComp.id}"]`).click();}
  await waitValue(()=>state(b.page),s=>s.pinned===cleanComp.id,'comp for synergy request');await gb.getByRole('tab',{name:'Planejar',exact:true}).click();
  const before=await state(b.page),trait=championCatalog[requestedId].traits[0];
  await gb.getByRole('tab',{name:/^Sinergias/}).click();await gb.getByRole('textbox',{name:'Buscar sinergia no overlay',exact:true}).fill(trait);
  await gb.getByRole('button',{name:`Procurar sinergia ${trait}`,exact:true}).click();
  await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.traits.includes(trait)&&s.partnerPlan.payload.shopping.some(w=>w.id===requestedId&&w.reason==='trait'),'synergy request arrives through real Realtime');
  const changed=await state(b.page);assert.deepEqual(changed.guideComp.champions,before.guideComp.champions);assert.deepEqual(changed.gameSession,before.gameSession);
  await requestedBadge.waitFor();
  if(liveShop)assert.ok((await state(a.page)).slots.find(s=>s?.id===requestedId)?.traits.includes(trait),'native shop reading exposes official synergy metadata');
  await capture(b.app,gb,path.join(out,`planner-synergy-selected${suffix}.png`));
  await gb.getByRole('textbox',{name:'Buscar sinergia no overlay',exact:true}).fill('');
  await gb.locator('.plan-trait-catalog').scrollIntoViewIfNeeded();await capture(b.app,gb,path.join(out,`planner-synergies${suffix}.png`));
  await gb.getByRole('button',{name:`Remover sinergia ${trait} dos destaques`,exact:true}).click();
  await waitValue(async()=>requestedBadge.count(),n=>n===0,'unmarked synergy clears partner badge');
  await gb.getByRole('tab',{name:/^Campeões/}).click();await gb.locator('.overlay-champion-pool').scrollIntoViewIfNeeded();await capture(b.app,gb,path.join(out,`planner-catalog${suffix}.png`));
  if(cleanComp.id!==beforeTraits.pinned){await gb.getByRole('tab',{name:'Comps',exact:true}).click();await gb.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(beforeTraits.guideComp.name);await gb.locator(`[data-comp="${beforeTraits.pinned}"]`).click();await gb.getByRole('tab',{name:'Planejar',exact:true}).click();}
  checks.push('selected synergy reaches partner Realtime and native shop badge without changing roster/copies; recognized champion includes official traits; unmarking clears the request');
 }
 if(process.argv.includes('--requests')){
  const original=await state(b.page),clean=original.saved.comps.find(c=>!shoppingWishes(c,null,original.gameSession,championCatalog).some(w=>w.id===requestedId));assert.ok(clean);
  if(clean.id!==original.pinned){await gb.getByRole('tab',{name:'Comps',exact:true}).click();await gb.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(clean.name);await gb.locator(`[data-comp="${clean.id}"]`).click();}
  await waitValue(()=>state(b.page),s=>s.pinned===clean.id,'off-comp request selection');
  const before=await state(b.page);
  await b.page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Duplas Dinâmicas',exact:true}).click();
  const editor=b.page.getByRole('region',{name:'Seus pedidos à dupla',exact:true});
  await editor.getByRole('button',{name:'Pedir campeão',exact:true}).click();
  await editor.getByRole('textbox',{name:'Buscar campeão para pedir à dupla',exact:true}).fill(requestedName);
  await editor.getByRole('button',{name:`Pedir ${requestedName} à dupla`,exact:true}).click();
  await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.shopping.some(w=>w.id===requestedId&&w.reason==='request'&&w.goal===1),'marking champion immediately creates the request');
  assert.equal(await editor.getByRole('button',{name:'Enviar pedido à dupla',exact:true}).count(),0);
  await editor.getByRole('combobox',{name:'Meta de cópias do pedido à dupla',exact:true}).selectOption('3');
  await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.shopping.find(w=>w.id===requestedId)?.goal===3,'goal auto-saves without confirmation');
  await editor.getByRole('combobox',{name:'Meta de cópias do pedido à dupla',exact:true}).selectOption('1');
  await editor.getByRole('radio',{name:'Prioridade urgente do pedido',exact:true}).check();
  await capture(b.app,b.page,path.join(out,`duo-request-editor${suffix}.png`));
  await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.shopping[0]?.id===requestedId&&s.partnerPlan.payload.shopping[0].priority===2,'urgent off-comp request reaches partner first');
  const changed=await state(b.page);assert.deepEqual(changed.guideComp.champions,before.guideComp.champions);assert.deepEqual(changed.gameSession,before.gameSession);
  await waitValue(async()=>requestedBadge.textContent(),text=>/Urgente|urgente/.test(text),'urgent shop caption');
  await ga.getByRole('tab',{name:'Dupla',exact:true}).click();
  await waitValue(async()=>ga.locator('.duo-wish').first().textContent(),text=>text.includes(requestedName)&&text.includes('Urgente'),'urgent partner list first');
  await ga.locator('.duo-wish').first().scrollIntoViewIfNeeded();
  await capture(a.app,ga,path.join(out,`duo-partner-priority${suffix}.png`));
  await capture(a.app,badges,path.join(out,`shop-send-urgent${suffix}.png`));
  const palette=await requestedBadge.locator('..').evaluate(slot=>({kind:slot.dataset.kind,stops:[...slot.querySelectorAll('.shop-frost-frame defs>linearGradient:first-child stop')].map(s=>getComputedStyle(s).stopColor)}));
  assert.ok(['send','shared'].includes(palette.kind));assert.ok(palette.stops.includes('rgb(198, 160, 238)'),'send/shared crystal rim includes purple highlights');
  await gb.getByRole('tab',{name:'Dupla',exact:true}).click();
  const nativeEditor=gb.getByRole('region',{name:'Seus pedidos à dupla',exact:true});
  await nativeEditor.getByRole('button',{name:`Editar pedido de ${requestedName}`,exact:true}).click();
  await nativeEditor.getByRole('radio',{name:'Prioridade alta do pedido',exact:true}).check();
  assert.equal(await nativeEditor.getByRole('button',{name:'Atualizar pedido',exact:true}).count(),0);
  await waitValue(()=>social(a.page),s=>s.partnerPlan?.payload?.shopping.find(w=>w.id===requestedId)?.priority===1,'priority update from guide');
  await waitValue(async()=>requestedBadge.textContent(),text=>text.includes('Alta')&&!/urgente/i.test(text),'shop caption changes without stale urgency');
  for(const width of [840,640]){
   await b.app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width}),width);
   await nativeEditor.getByRole('button',{name:`Editar pedido de ${requestedName}`,exact:true}).click();
   await nativeEditor.locator('.duo-request-priority').scrollIntoViewIfNeeded();
   await capture(b.app,gb,path.join(out,`duo-requests-${width}${suffix}.png`));
   const layout=await gb.locator('.game-content').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));assert.ok(layout.scroll<=layout.width+1);
   await nativeEditor.getByRole('button',{name:'Fechar',exact:true}).click();
  }
  await editor.getByRole('button',{name:`Cancelar pedido de ${requestedName}`,exact:true}).click();
  await waitValue(()=>social(a.page),s=>!s.partnerPlan?.payload?.shopping.some(w=>w.id===requestedId),'cancel clears manual request remotely');
  await waitValue(async()=>requestedBadge.count(),n=>n===0,'cancel clears partner shop badge');
  await gb.getByRole('tab',{name:'Planejar',exact:true}).click();
  if(clean.id!==original.pinned){await gb.getByRole('tab',{name:'Comps',exact:true}).click();await gb.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill(original.guideComp.name);await gb.locator(`[data-comp="${original.pinned}"]`).click();await gb.getByRole('tab',{name:'Planejar',exact:true}).click();}
  checks.push('marking off-comp champion auto-saves immediately; goal and priority changes auto-save from main/guide without confirmation; real partner Realtime/shop update and cancellation work without roster/session mutation; purple rim and 640/840 layouts verified');
 }
 for(const width of [840,640]){
  await b.app.evaluate(({BrowserWindow},width)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width}),width);
  await gb.evaluate(()=>document.querySelector('.game-content')?.scrollTo(0,0));
  await capture(b.app,gb,path.join(out,`planner-${width}${suffix}.png`));
  const tabLayout=await gb.locator('.game-tabs').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,count:el.querySelectorAll('[role=tab]').length}));
  assert.equal(tabLayout.count,9);assert.ok(tabLayout.scroll<=tabLayout.width+1,'all connected-duo tabs fit without a scrollbar');
  await gb.getByRole('tab',{name:'Itens',exact:true}).click();
  const layout=await gb.locator('.game-content').evaluate(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,scroll:el.scrollWidth,width:el.clientWidth,route:el.querySelector('.game-item-route')?.getBoundingClientRect().toJSON()}));
  assert.ok(layout.scroll<=layout.width+1);if(layout.route)assert.ok(layout.route.left-layout.left<30,'item routes use full content width');
  await capture(b.app,gb,path.join(out,`items-${width}${suffix}.png`));
  await gb.getByRole('tab',{name:'Planejar',exact:true}).click();
 }
 checks.push('shop medal identifies whom to send to; disabled requests and removed champions immediately clear it; restore preserves the published comp');
 for(const x of [a,b]){const ciphertext=await fs.readFile(path.join(x.profile,'online-session.enc'),'utf8');assert.ok(!ciphertext.includes(users[0].password)&&!ciphertext.includes(users[1].password)&&!ciphertext.includes('refresh_token')&&!ciphertext.includes('access_token'));}
 await a.page.getByRole('button',{name:'Encerrar dupla',exact:true}).click();
 await waitValue(()=>social(b.page),s=>!s.session&&!s.partnerPlan,'duo leaves on other PC');
 await waitValue(async()=>ga.getByRole('tab',{name:'Dupla',exact:true}).count(),n=>n===0,'Dupla hides when partnership ends');
 await ga.getByRole('tab',{name:'Agora',exact:true,selected:true}).waitFor();
 checks.push('encrypted desktop sessions contain no plaintext tokens/passwords; leaving a duo clears partner plans on the other PC');
 if(process.argv.includes('--lifecycle')){
  const {verifyDuoLifecycle}=await import('./verify-duo-lifecycle.mjs');
  await verifyDuoLifecycle({a,b,launch,users,social,act,waitValue,pause,checks});
 }
 await act(a.page,{type:'friendRemove',id:(await social(a.page)).friends[0].id});
 await act(a.page,{type:'logout'});await act(b.page,{type:'logout'});
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,`checks${suffix}.json`),JSON.stringify({ok:true,checks,errors,syncMs,liveSupabase:true,liveShopOcr:liveShop,disposableAccounts:true,gameInput:false},null,2));console.log(JSON.stringify({ok:true,checks}));
}finally{await c?.auth.signOut();for(const a of apps)await a.close().catch(()=>{});}
