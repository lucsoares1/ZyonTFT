// Real NSIS download/install/restart test. Both installs and app data are isolated.
import fs from 'node:fs/promises';import {createReadStream} from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {_electron as electron} from 'playwright';import {createClient} from '@supabase/supabase-js';
const tag=crypto.randomBytes(5).toString('hex'),root=process.cwd(),profile=path.resolve('.runtime',`update-profile-${tag}`),installed=path.resolve('.runtime',`update-install-${tag}`),out=path.resolve('design/review/0.17.0/updates');
const source=path.resolve('release-staging/0.17.0-ui'),installer='Zyon-TFT-Setup-0.17.0.exe',base=path.resolve('release-staging/update-base-ui/Zyon-TFT-Setup-0.16.99.exe');
await fs.mkdir(profile,{recursive:true});await fs.mkdir(out,{recursive:true});
let corrupt=true,downloads=0,app,server,client;const errors=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const windowsEnv={...process.env,PSModulePath:path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','Modules')};
async function poll(fn,ok,label,ms=60000){const until=Date.now()+ms;let value;while(Date.now()<until){value=await fn();if(ok(value))return value;await pause(200);}throw new Error(`Timed out: ${label}`);}
function run(exe,args,env){return new Promise((resolve,reject)=>{let error='';const p=spawn(exe,args,{env,windowsHide:true,stdio:['ignore','ignore','pipe']});p.stderr.on('data',s=>{error+=s;});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(new Error(`${path.basename(exe)} exited ${code}: ${error.slice(0,1200)}`)));});}
async function closeInstalled(){await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$target='${installed.replaceAll("'","''")}\\Zyon TFT.exe'; Get-CimInstance Win32_Process -Filter "Name = 'Zyon TFT.exe'" | Where-Object { $_.ExecutablePath -eq $target } | ForEach-Object { $p=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue; if($p.MainWindowHandle -ne 0){[void]$p.CloseMainWindow()} }`],process.env);}
try{
 // The installed builder scopes process checks to the installation directory
 // when PowerShell is available. Never use its global-name fallback in tests.
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"if (-not (Get-Command Get-CimInstance -ErrorAction SilentlyContinue) -or (Get-ExecutionPolicy -Scope Process) -eq 'Restricted') {exit 1}"],windowsEnv);
 const config=JSON.parse(await fs.readFile('electron/cloud-config.json','utf8'));
 const settings=await fetch(`${config.url}/auth/v1/settings`,{headers:{apikey:config.publishableKey}}).then(r=>r.json());assert.equal(settings.mailer_autoconfirm,true);
 client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const email=`zyon-update-${tag}@example.invalid`,password=crypto.randomBytes(24).toString('base64url');
 const signup=await client.auth.signUp({email,password,options:{data:{handle:`update${tag}`,display_name:'Teste de atualização'}}});assert.ifError(signup.error);assert.ok(signup.data.session);
 await fs.writeFile('.runtime/update-fixture.json',JSON.stringify({id:signup.data.user.id}));await client.auth.signOut();
 const manifest=await fs.readFile(path.join(source,'latest.yml'));
 server=http.createServer(async(req,res)=>{
  try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);
   if(name==='latest.yml'){res.writeHead(200,{'Content-Type':'text/yaml','Content-Length':manifest.length});res.end(manifest);return;}
   if(![installer,installer+'.blockmap'].includes(name)){res.writeHead(404);res.end();return;}
   const file=path.join(source,name),stat=await fs.stat(file);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':stat.size});
   if(name===installer){downloads++;if(corrupt){res.write(Buffer.from([0]));createReadStream(file,{start:1}).pipe(res);return;}}
   createReadStream(file).pipe(res);
  }catch{res.writeHead(500);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const feed=`http://127.0.0.1:${server.address().port}/`;
 await fs.writeFile(`${installed}.test.json`,JSON.stringify({enabled:true,userData:profile,feed}));
 const env={...windowsEnv,ZYON_USER_DATA:profile,ZYON_UPDATE_TEST:'1',ZYON_TEST_UPDATE_URL:feed};delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;delete env.PORTABLE_EXECUTABLE_FILE;
 console.log('Installing isolated base 0.16.99');await run(base,['/S',`/D=${installed}`],env);
 const executablePath=path.join(installed,'Zyon TFT.exe');await fs.access(executablePath);
 app=await electron.launch({executablePath,env});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>{w.webContents.setBackgroundThrottling(false);w.hide();}));let page=await app.firstWindow();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 assert.equal(await app.evaluate(({app})=>app.getVersion()),'0.16.99');
 await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor();
 await page.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(email);await page.getByLabel('Senha da conta Zyon',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();
 await page.locator('.sidebar-bottom').getByRole('button',{name:'Preferências',exact:true}).click();await page.getByRole('heading',{name:'Atualizações do Zyon',exact:true}).waitFor();
 await page.getByRole('slider',{name:'Opacidade',exact:true}).fill('74');
 const before=await poll(()=>page.evaluate(()=>window.zyon.getState()),s=>s.saved?.opacity===74&&s.saved.comps.length>=80,'settings saved');
 const beforeIds=before.saved.comps.map(c=>c.id),beforeUser=before.social.user.id;
 await page.evaluate(()=>window.zyon.updateAction('check'));
 await poll(()=>page.evaluate(()=>window.zyon.getUpdate()),s=>s.status==='available','version available');
 await page.screenshot({path:path.join(out,'available.png'),animations:'disabled'});
 await page.evaluate(()=>window.zyon.updateAction('download'));
 const rejected=await page.evaluate(()=>window.zyon.getUpdate());assert.equal(rejected.status,'error');
 assert.equal(await app.evaluate(({app})=>app.getVersion()),'0.16.99');
 console.log('Corrupted installer rejected; retrying original file');corrupt=false;
 await page.evaluate(()=>window.zyon.updateAction('download'));
 await poll(()=>page.evaluate(()=>window.zyon.getUpdate()),s=>s.status==='downloaded','downloaded update');
 await page.screenshot({path:path.join(out,'downloaded.png'),animations:'disabled'});
 await page.getByRole('button',{name:'Reiniciar e atualizar',exact:true}).first().click();
 await poll(()=>fs.readFile(path.join(profile,'startup.log'),'utf8').catch(()=>''),s=>s.includes('Starting 0.17.0')&&s.slice(s.indexOf('Starting 0.17.0')).includes('Main interface loaded'),'updated app automatically relaunched',120000);
 await app.close().catch(()=>{});app=null;await closeInstalled();await pause(1800);
 app=await electron.launch({executablePath,env});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>{w.webContents.setBackgroundThrottling(false);w.hide();}));page=await app.firstWindow();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
 await page.getByRole('heading',{name:'Composições',exact:true}).waitFor();assert.equal(await app.evaluate(({app})=>app.getVersion()),'0.17.0');
 const after=await page.evaluate(()=>window.zyon.getState());assert.equal(after.social.user.id,beforeUser);assert.equal(after.saved.opacity,74);assert.deepEqual(after.saved.comps.map(c=>c.id),beforeIds);
 await page.locator('.sidebar-bottom').getByRole('button',{name:'Preferências',exact:true}).click();await page.getByRole('heading',{name:'Atualizações do Zyon',exact:true}).waitFor();await page.evaluate(()=>window.zyon.updateAction('check'));
 await poll(()=>page.evaluate(()=>window.zyon.getUpdate()),s=>s.status==='current','updated version current');await page.screenshot({path:path.join(out,'installed.png'),animations:'disabled'});
 await page.evaluate(()=>window.zyon.socialAction({type:'logout'}));assert.deepEqual(errors,[]);assert.ok(downloads>=2);
 const result={ok:true,from:'0.16.99',to:'0.17.0',realNsisInstallation:true,realDownload:true,corruptionRejected:true,automaticRestart:true,accountRestored:true,compsPreserved:beforeIds.length,settingsPreserved:true,isolated:true,feed:'local integration server',downloads,errors};await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await app?.close().catch(()=>{});await closeInstalled().catch(()=>{});server?.close();await client?.auth.signOut();}
