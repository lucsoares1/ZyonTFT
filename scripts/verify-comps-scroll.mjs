import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
const users=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const env={...process.env,ZYON_USER_DATA:path.resolve('.runtime/comps-scroll-'+Date.now()),ZYON_TEST_BACKGROUND:'1',ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
for(const k of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL'])delete env[k];
let app,page;
const results=[],errors=[];
async function dimensions(target,selector){return target.locator(selector).evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {top:r.top,height:r.height,client:e.clientHeight,scroll:e.scrollHeight,offset:e.scrollTop,overflow:s.overflowY};});}
async function wheel(target,selector){
 await app.evaluate(({BrowserWindow},url)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).showInactive(),target.url());
 await target.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const point=await target.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.left+Math.min(180,r.width/2),y:Math.min(r.top+100,innerHeight-75)};});
 await target.mouse.move(point.x,point.y);await target.mouse.wheel(0,650);await target.waitForTimeout(350);
}
async function size(width,height){await app.evaluate(({BrowserWindow},{url,width,height})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).setBounds({x:20,y:20,width,height}),{url:page.url(),width,height});await page.waitForTimeout(150);}
try{
 app=await _electron.launch({args:['.'],env});
 await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.setAlwaysOnTop(false);w.webContents.setBackgroundThrottling(false);};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w));});
 page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(users[2].email);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(users[2].password);
 await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 for(const width of [1536,1050,780]){
  await size(width,width===1536?1000:820);
  await page.evaluate(()=>{for(const e of document.querySelectorAll('*'))if(e.scrollTop)e.scrollTop=0;});
  const fit=await page.evaluate(()=>{const content=document.querySelector('.workspace-content'),list=document.querySelector('.composition-layout'),feed=document.querySelector('.comp-feed'),s=getComputedStyle(content);return {available:content.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),list:list.getBoundingClientRect().width,feed:feed.getBoundingClientRect().width,horizontal:feed.scrollWidth-feed.clientWidth};});
  assert.ok(Math.abs(fit.available-fit.list)<2,'library fills the available width at '+width+': '+JSON.stringify(fit));
  assert.ok(fit.horizontal<2,'library has no horizontal overflow');
  const before=await dimensions(page,'.comp-feed');await wheel(page,'.comp-feed');const after=await dimensions(page,'.comp-feed');
  results.push({surface:'main',width,before,after});console.log(JSON.stringify(results.at(-1)));
  assert.ok(after.offset>before.offset+100,'mouse wheel must scroll the composition library at '+width);
  const heading=await page.locator('.workspace-heading').boundingBox();assert.ok(heading.y>=0,'main heading stays visible');
  await page.locator('.comp-feed').focus();await page.keyboard.press('Control+End');await page.waitForTimeout(180);
  await page.waitForFunction(()=>{const e=document.querySelector('.comp-feed');return e.scrollHeight-e.clientHeight-e.scrollTop<5;},{},{timeout:5000});
  let bottom=await dimensions(page,'.comp-feed');assert.ok(bottom.scroll-bottom.client-bottom.offset<5,'keyboard reaches last composition: '+JSON.stringify(bottom));
  const last=await page.locator('.comp-row').last().boundingBox();assert.ok(last.y+last.height<=(width===1536?1000:820),'last card remains reachable');
  await page.keyboard.press('Control+Home');await page.waitForFunction(()=>document.querySelector('.comp-feed').scrollTop<5,{},{timeout:5000});assert.ok((await dimensions(page,'.comp-feed')).offset<5,'keyboard returns to beginning');
  if(width!==780){
    await page.getByRole('heading',{name:'Composições',exact:true}).click();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));});
    const png=await app.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);await new Promise(r=>setTimeout(r,150));return(await w.webContents.capturePage()).toPNG().toString('base64');},page.url());
    await fs.writeFile('.runtime/comps-width-'+width+'.png',Buffer.from(png,'base64'));
  }
 }
 await size(1050,820);
 const first=page.locator('[data-comp-id="s18-pivot-blossom-ahri-fast-9"]');
 await first.getByRole('button',{name:'Expandir Blossom Ahri Fast 9',exact:true}).click();
 await first.locator('.zy-tactical-overview').waitFor();await wheel(page,'.comp-feed');assert.ok((await dimensions(page,'.comp-feed')).offset>100,'expanded detail also scrolls');
 await page.locator('.overlay-toggle').click();
  await page.waitForFunction(async()=>{const s=await window.zyon.getState();return !!s.gameSession.matchId&&s.levelReading.status==='confirmed';},{},{timeout:30000});
  await page.evaluate(()=>window.zyon.setReader(false));
 const deadline=Date.now()+30000;let guide;
 while(Date.now()<deadline){guide=app.windows().find(w=>w.url().includes('view=guide'));if(guide)break;await page.waitForTimeout(100);}
 assert.ok(guide,'native guide opens');guide.on('pageerror',e=>errors.push(e.message));
 for(const width of [840,640]){
  await app.evaluate(({BrowserWindow,screen},width)=>{const current=screen.getPrimaryDisplay();const display={...current,bounds:{...current.bounds,width:width+24},workArea:{...current.workArea,width:width+24}};screen.getAllDisplays=()=>[display];screen.getPrimaryDisplay=()=>display;const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide'));w.setBounds({width,height:800});},width);
  await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
  await guide.locator('.overlay-comp-grid').waitFor();await guide.locator('.game-content').evaluate(e=>e.scrollTop=0);
  const before=await dimensions(guide,'.game-content');await wheel(guide,'.game-content');const after=await dimensions(guide,'.game-content');
  results.push({surface:'overlay',width,before,after});console.log(JSON.stringify(results.at(-1)));
  assert.ok(after.offset>100,'native comparison list scrolls at '+width);
  await guide.locator('.game-content').focus();await guide.keyboard.press('Control+End');await guide.waitForTimeout(180);
  await guide.waitForFunction(()=>{const e=document.querySelector('.game-content');return e.scrollHeight-e.clientHeight-e.scrollTop<5;},{},{timeout:5000});
  const bottom=await dimensions(guide,'.game-content');assert.ok(bottom.scroll-bottom.client-bottom.offset<5,'native list reaches end');
 }
 assert.deepEqual(errors,[]);await fs.writeFile('.runtime/comps-scroll-checks.json',JSON.stringify({ok:true,results,errors},null,2));console.log('PASS: wheel and keyboard scrolling in main 1536/1050/780 and overlay840/640');
}finally{if(page)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});await app?.close();}
