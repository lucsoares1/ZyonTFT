import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {_electron as electron} from 'playwright';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const tag=crypto.randomBytes(5).toString('hex'),profile=path.resolve('.runtime',`account-gate-${tag}`),out=path.resolve(`design/review/${version}/account`),packaged=process.argv.includes('--packaged'),suffix=packaged?'-packaged':'';
await fs.mkdir(out,{recursive:true});
const env={...process.env,ZYON_USER_DATA:profile,ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;
const opts={...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||'release/win-unpacked/Zyon TFT.exe'),args:[]}:{args:['.']},env};
const email=`zyon-gate-${tag}@example.invalid`,password=crypto.randomBytes(24).toString('base64url'),name='Teste de perfil',handle=`teste_${tag}`,errors=[];let app;
async function poll(page,fn,label){let s;for(let i=0;i<240;i++){s=await page.evaluate(()=>window.zyon.getState());if(fn(s))return s;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+label);}
async function launch(){app=await electron.launch(opts);const p=await app.firstWindow();p.on('pageerror',e=>errors.push(e.message));return p;}
try{
 let page=await launch();await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Navegação principal'}).count(),0);
 assert.equal(await page.evaluate(()=>window.zyon.setOverlay(true)),false);assert.equal(await page.evaluate(()=>window.zyon.setReader(true)),false);
 assert.equal(await page.evaluate(()=>window.zyon.publish({selected:[],pinned:'anything'})),false);
 assert.ok((await page.evaluate(()=>window.zyon.editPlan({type:'restore'}))).error);
 const stateBefore=await page.evaluate(()=>window.zyon.getState());
 for(const [width,height] of [[1500,1020],[1050,740]]){
  await app.evaluate(({BrowserWindow},{width,height})=>BrowserWindow.getAllWindows()[0].setBounds({width,height}),{width,height});
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  const geometry=await page.locator('.entry-screen').evaluate(el=>({w:el.clientWidth,sw:el.scrollWidth}));assert.ok(geometry.sw<=geometry.w+1);
  await page.screenshot({path:path.join(out,`login-${width}${suffix}.png`),animations:'disabled'});
 }
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(email);await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Mostrar senha',exact:true}).click();assert.equal(await page.getByLabel('Senha da conta Zyon',{exact:true}).getAttribute('type'),'text');
 await page.getByRole('button',{name:'Ocultar senha',exact:true}).click();
 await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();await page.getByRole('alert').filter({hasText:'E-mail ou senha incorretos'}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Navegação principal'}).count(),0);
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.getByRole('textbox',{name:'Seu nome no Zyon',exact:true}).fill(name);await page.getByRole('textbox',{name:'Nome de usuário Zyon',exact:true}).fill(handle);
 await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(password);
 await page.screenshot({path:path.join(out,`signup-1050${suffix}.png`),animations:'disabled'});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.entry-piece').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();
 const signedIn=await poll(page,s=>s.social?.profile&&s.social.status==='online','signup');
 let fixtures=[];try{fixtures=JSON.parse(await fs.readFile('.runtime/account-gate-fixtures.json','utf8'));}catch{}fixtures.push(signedIn.social.user.id);await fs.writeFile('.runtime/account-gate-fixtures.json',JSON.stringify(fixtures));
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Abrir meu perfil',exact:true}).locator('strong').innerText(),name);
 if(process.argv.includes('--controls')){
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1500,height:1000}));
  await page.screenshot({path:path.join(out,`controls-library${suffix}.png`),animations:'disabled'});
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Planejador',exact:true}).click();
  await page.getByRole('textbox',{name:'Nome do plano',exact:true}).focus();
  await page.screenshot({path:path.join(out,`controls-planner${suffix}.png`),animations:'disabled'});
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:'Banco de dados',exact:true}).click();
  await page.screenshot({path:path.join(out,`controls-database${suffix}.png`),animations:'disabled'});
 }
 assert.ok((await page.getByRole('button',{name:'Abrir meu perfil',exact:true}).textContent()).includes(handle));
 await page.getByRole('button',{name:'Abrir meu perfil',exact:true}).click();await page.getByRole('heading',{name:'Minha conta',exact:true}).waitFor();await page.getByText(email,{exact:true}).waitFor();
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1500,height:1000}));
 await page.screenshot({path:path.join(out,`profile${suffix}.png`),animations:'disabled'});
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1050,height:740}));
 assert.ok(await page.locator('.sidebar').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 await page.screenshot({path:path.join(out,`profile-compact${suffix}.png`),animations:'disabled'});
 await page.evaluate(()=>window.zyon.setOverlay(true));await poll(page,s=>s.readerActive&&s.gameSession.matchId,'authenticated reader');
 if(process.argv.includes('--controls')){
  const guide=app.windows().find(w=>w.url().includes('view=guide'));
  assert.ok(guide,'Authenticated guide is available');
  await page.evaluate(()=>window.zyon.setReader(false));
  await guide.getByRole('tab',{name:'Planejar',exact:true}).click();
  await guide.evaluate(()=>document.querySelector('.game-content')?.scrollTo(0,0));
  await guide.screenshot({path:path.join(out,`controls-overlay-planner${suffix}.png`),animations:'disabled'});
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width:640}));
  await guide.screenshot({path:path.join(out,`controls-overlay-planner-640${suffix}.png`),animations:'disabled'});
  await guide.getByRole('tab',{name:'Equipe',exact:true}).click();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width:640}));
  await guide.screenshot({path:path.join(out,`controls-overlay-levels-640${suffix}.png`),animations:'disabled'});
  await page.evaluate(()=>window.zyon.setReader(true));
 }
 await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor();
 const locked=await page.evaluate(()=>window.zyon.getState());assert.equal(locked.overlayArmed,false);assert.equal(locked.readerActive,false);assert.equal(locked.overlayVisible,false);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>w.webContents.getURL().includes('view=guide')).some(w=>w.isVisible())),false);
 assert.equal(await page.evaluate(()=>window.zyon.setOverlay(true)),false);
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(email);await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 await app.close();app=null;page=await launch();await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 const restored=await poll(page,s=>s.social?.profile,'restore');assert.equal(restored.social.user.id,signedIn.social.user.id);
 await page.evaluate(()=>window.zyon.socialAction({type:'logout'}));await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor();
 assert.deepEqual(errors,[]);const checks={ok:true,signupWithoutEmailConfirmation:true,invalidLoginStaysLocked:true,nativeReaderAndOverlayRequireLogin:true,profileIdentity:true,logoutHidesOverlayAndStopsReader:true,encryptedSessionRestores:true,reducedMotion:true,widths:[1500,1050],errors};await fs.writeFile(path.join(out,`checks${suffix}.json`),JSON.stringify(checks,null,2));console.log(checks);
}finally{await app?.close().catch(()=>{});}
