import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {_electron} from 'playwright';
const out=path.resolve('design/review/0.17.27/tiers');await fs.mkdir(out,{recursive:true});
const users=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const env={...process.env,ZYON_USER_DATA:path.resolve('.runtime/tiers-'+Date.now()),ZYON_TEST_BACKGROUND:'1'};
for(const k of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW','ZYON_OCR_FIXTURE'])delete env[k];
let app,page;const errors=[],metrics=[];
try{
app=await _electron.launch({args:['.'],env});
await app.evaluate(({app,BrowserWindow})=>{const quiet=w=>{w.setOpacity(0);w.setIgnoreMouseEvents(true);w.setAlwaysOnTop(false);w.webContents.setBackgroundThrottling(false)};BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,w)=>quiet(w))});
page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(users[2].email);
await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(users[2].password);
await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
await page.locator('.tier-section-cards .comp-tier-badge img').first().waitFor();
for(const [width,height] of [[1536,1000],[1050,820]]){
await app.evaluate(({BrowserWindow},{url,width,height})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).setBounds({x:20,y:20,width,height}),{url:page.url(),width,height});
await page.evaluate(()=>document.fonts.ready);
const badges=await page.locator('.comp-tier-badge').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),img=e.querySelector('img');return{tier:e.dataset.tier,label:e.getAttribute('aria-label'),width:r.width,height:r.height,loaded:img?img.complete&&img.naturalWidth>0:true,local:img?img.src.startsWith('data:')||img.src.startsWith('file:'):true}}));
assert.ok(badges.length>5);assert.ok(badges.every(b=>b.loaded&&b.local&&b.width>0&&b.height>0));
for(const tier of ['S','A','B'])assert.ok(badges.some(b=>b.tier===tier&&b.label==='Tier '+tier));
metrics.push({width,height,badges});
const png=await app.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);w.showInactive();try{await w.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await new Promise(r=>setTimeout(r,150));return(await w.webContents.capturePage()).toPNG().toString('base64')}finally{w.hide()}},page.url());
await fs.writeFile(path.join(out,'catalog-'+width+'.png'),Buffer.from(png,'base64'));
}
assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({ok:true,metrics,errors,isolatedProfile:true},null,2));console.log(JSON.stringify({ok:true,sizes:metrics.map(m=>m.width),badges:metrics[0].badges.length}));
}finally{if(page)await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});await app?.close()}
