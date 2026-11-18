import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { _electron } from 'playwright';

const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const catalog=Object.fromEntries(JSON.parse(await fs.readFile('src/generated/catalog.json','utf8')).champions.map(champion=>[champion.id,champion]));
const root=path.resolve('.runtime/reopen-planner-duo-'+Date.now());
await fs.mkdir(root,{recursive:true});
const apps=[],checks=[];
const pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const state=page=>page.evaluate(()=>window.zyon.getState());
const social=page=>page.evaluate(()=>window.zyon.getSocial());
async function action(page,value){const result=await page.evaluate(value=>window.zyon.socialAction(value),value);assert.ok(!result?.error,result?.error);return result;}
async function wait(read,predicate,label){const until=Date.now()+35000;while(Date.now()<until){const value=await read();if(predicate(value))return value;await pause(120);}throw Error('Timeout: '+label);}
async function launch(index){
 const profile=path.join(root,String(index));await fs.mkdir(profile,{recursive:true});const presence=path.join(profile,'presence.json');
 await fs.writeFile(presence,JSON.stringify({foreground:true,processName:'TFTClient-Win64-Shipping',matchId:'fixture-17'}));
 const env={...process.env,ZYON_USER_DATA:profile,ZYON_TEST_BACKGROUND:'1',ZYON_PRESENCE_FIXTURE:presence,ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
 for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW'])delete env[key];
 const app=await _electron.launch({args:['.'],env});apps.push(app);
 await app.evaluate(({app,BrowserWindow,screen})=>{
  const primary=screen.getPrimaryDisplay(),display=screen.getAllDisplays().find(display=>display.id!==primary.id);
  if(!display)throw Error('Teste requer o monitor secundário livre');
  screen.getPrimaryDisplay=()=>display;screen.getAllDisplays=()=>[display];
  const quiet=window=>{window.setOpacity(0);window.setPosition(display.workArea.x+24,display.workArea.y+24);window.setIgnoreMouseEvents(true,{forward:true});window.webContents.setBackgroundThrottling(false);window.on('show',()=>window.setIgnoreMouseEvents(true,{forward:true}));queueMicrotask(()=>{if(!window.isDestroyed())window.setIgnoreMouseEvents(true,{forward:true});});};
  BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,window)=>quiet(window));
 });
 const page=await app.firstWindow();await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials[index].email);await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials[index].password);await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await wait(()=>state(page),value=>value.overlayVisible&&value.slots?.some(slot=>slot.id==='DA_Vi18'),'native fixture game');
 return {app,page,presence};
}
try{
 const first=await launch(0),second=await launch(1);
 const firstSocial=await social(first.page),secondSocial=await social(second.page);
 for(const client of [first,second])if((await social(client.page)).session)await action(client.page,{type:'leave'});
 if(!firstSocial.friends.some(friend=>friend.profile?.user_id===secondSocial.profile.user_id)){
  await action(first.page,{type:'friendRequest',code:secondSocial.profile.friend_code});
  const incoming=await wait(()=>social(second.page),value=>value.friendRequests.some(request=>request.incoming),'friend request');
  await action(second.page,{type:'friendAccept',id:incoming.friendRequests.find(request=>request.incoming).id});
 }
 await action(first.page,{type:'invite',id:secondSocial.profile.user_id});
 const invitation=await wait(()=>social(second.page),value=>value.invites.some(invite=>invite.incoming),'duo invitation');
 await action(second.page,{type:'acceptInvite',id:invitation.invites.find(invite=>invite.incoming).id});
 await wait(()=>social(first.page),value=>Boolean(value.session&&value.partnerPlan),'real duo connected');
 const own=await state(first.page);
 await first.page.evaluate(comp=>window.zyon.commitPlan({...comp,name:'Fixture sem pedidos próprios',champions:[]}),own.guideComp);
 await wait(()=>state(first.page),value=>value.guideComp.champions.length===0,'no local shopping wishes');
 const original=await state(second.page),removed='DA_18_MasterYi_AD',added='DA_Vi18';
 assert.ok(original.guideComp.champions.includes(removed),'published initial comp contains the test champion');
 await wait(()=>social(first.page),value=>value.partnerPlan?.payload?.shopping?.some(wish=>wish.id===removed),'initial remote roster');
 const medals=first.app.windows().find(page=>page.url().includes('view=overlay'));
 const shop=await state(first.page),removedIndex=shop.slots.findIndex(slot=>slot.id===removed),addedIndex=shop.slots.findIndex(slot=>slot.id===added);
 assert.ok(removedIndex>=0&&addedIndex>=0,'both test champions were recognized by native OCR');
 await wait(()=>medals.locator('.native-slot').nth(removedIndex).locator('.shop-medal').count(),count=>count===1,'initial remote medal');
 await second.page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Planejador',exact:true}).click();
 await second.page.getByRole('button',{name:'Editar '+catalog[removed].name,exact:true}).click();
 await second.page.getByRole('button',{name:'Remover '+catalog[removed].name+' do tabuleiro',exact:true}).click();
 await wait(()=>state(second.page),value=>!value.guideComp.champions.includes(removed),'local removal');
 await wait(()=>social(first.page),value=>!value.partnerPlan.payload.comp.champions.includes(removed)&&!value.partnerPlan.payload.shopping.some(wish=>wish.id===removed),'remote removal');
 await wait(()=>medals.locator('.native-slot').nth(removedIndex).locator('.shop-medal').count(),count=>count===0,'removed remote medal');
 const occupied=await second.page.locator('.studio-board [data-board-cell]').evaluateAll(elements=>elements.filter(element=>!element.querySelector('img')).map(element=>element.getAttribute('data-board-cell')));
 await second.page.locator(`.studio-board [data-board-cell="${occupied[0]}"]`).click();
 await second.page.getByRole('radio',{name:'3 estrelas',exact:true}).check();
 await second.page.getByRole('textbox',{name:'Buscar campeão ou sinergia',exact:true}).fill(catalog[added].name);
 await second.page.getByRole('button',{name:'Adicionar '+catalog[added].name+', 3 estrelas',exact:true}).click();
 await second.page.getByRole('textbox',{name:'Nome do plano',exact:true}).fill('Plano alterado pela dupla');
 await wait(()=>social(first.page),value=>value.partnerPlan.payload.comp.name==='Plano alterado pela dupla'&&value.partnerPlan.payload.comp.champions.includes(added)&&value.partnerPlan.payload.shopping.some(wish=>wish.id===added&&wish.goal===9),'remote addition, name and star target');
 await wait(()=>medals.locator('.native-slot').nth(addedIndex).locator('.shop-medal').count(),count=>count===1,'added remote medal');
 assert.deepEqual((await state(second.page)).gameSession.context.copies,original.gameSession.context.copies);
 checks.push('main planner removal/addition/name/star changes reach the actual second client and native shop medals through the real server');
 await fs.writeFile(first.presence,JSON.stringify({foreground:false,processName:'chrome',matchId:'fixture-17'}));
 await wait(()=>state(first.page),value=>!value.gameForeground,'away from game');
 await first.page.evaluate(()=>window.zyon.setOverlay(false));
 await first.page.getByRole('button',{name:'Ativar overlay',exact:true}).click();
 await wait(()=>first.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide'))?.isVisible()),Boolean,'manual guide opens immediately outside the game');
 assert.equal(await first.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=overlay')).isVisible()),false);
 const guide=first.app.windows().find(page=>page.url().includes('view=guide'));
 await guide.getByRole('button',{name:'Ocultar overlay',exact:true}).click();
 await first.page.getByRole('button',{name:'Ativar overlay',exact:true}).click();
 await wait(()=>first.app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL().includes('view=guide')).isVisible()),Boolean,'reopen after the guide close button');
 checks.push('manual button reopens the closed guide without foreground/OCR, while shop badges remain gated to the game');
 const result={ok:true,checks,isolatedProfiles:true,realServer:true,nativeOcrFixture:true,realGame:false};await fs.writeFile(path.join(root,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{
 for(const app of apps){const page=app.windows().find(page=>!page.url().includes('view='));if(page){await page.evaluate(()=>window.zyon.socialAction({type:'leave'})).catch(()=>{});await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});}await app.close();}
}
