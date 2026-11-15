// Checks the actual files delivered by NSIS, not the developer's node_modules.
// An isolated, signed-out app must open and run its bundled OCR completely offline.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {_electron as electron} from 'playwright';
import {verifyPackagedFiles} from './packaged-files.mjs';
const run=promisify(execFile),root=process.cwd(),arg=name=>process.argv[process.argv.indexOf(name)+1];
const profile=await fs.mkdtemp(path.resolve('.runtime/runtime-check-'));
let executablePath=path.resolve(process.argv.includes('--exe')?arg('--exe'):'release/win-unpacked/Zyon TFT.exe');
const fromInstaller=process.argv.includes('--installer');let extractedRoot;
if(fromInstaller){
 const installer=path.resolve(arg('--installer'));
 const tools=[process.env.ZYON_7ZIP_PATH,path.join(process.env.ProgramFiles||'C:/Program Files','7-Zip/7z.exe'),path.resolve('node_modules/electron-winstaller/vendor/7z.exe')].filter(Boolean);
 let sevenZip;for(const file of tools)try{await fs.access(file);sevenZip=file;break;}catch{}
 if(!sevenZip){try{sevenZip=(await run('where.exe',['7z.exe'],{windowsHide:true})).stdout.trim().split(/\r?\n/)[0];}catch{}}
 assert.ok(sevenZip,'7-Zip is required on the build machine to verify the NSIS payload');
 // Outside the checkout: Node must not find a missing module in the developer's
 // parent node_modules and turn an incomplete distribution into a false pass.
 const extraction=await fs.mkdtemp(path.join(os.tmpdir(),'zyon-installer-check-'));extractedRoot=extraction;
 const container=path.join(extraction,'container'),payload=path.join(extraction,'installation');
 await run(sevenZip,['x',installer,'-o'+container,'-y','-bso0','-bsp0'],{windowsHide:true,maxBuffer:1024*1024});
 await run(sevenZip,['x',path.join(container,'$PLUGINSDIR/app-64.7z'),'-o'+payload,'-y','-bso0','-bsp0'],{windowsHide:true,maxBuffer:1024*1024});
 executablePath=path.join(payload,'Zyon TFT.exe');
}
const archive=path.join(path.dirname(executablePath),'resources/app.asar');
const baseline=process.argv.includes('--baseline');
const inventory=verifyPackagedFiles(archive,{requireBootstrap:!baseline,builtDirectory:path.join(root,baseline?'public':'dist')});
const env={...process.env,ZYON_USER_DATA:path.join(profile,'user'),ZYON_TEST_BACKGROUND:'1'};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_UPDATE_TEST','ZYON_TEST_UPDATE_URL','ZYON_OCR_FIXTURE','ZYON_OVERLAY_PREVIEW','PORTABLE_EXECUTABLE_FILE','NODE_PATH'])delete env[key];
let app;
try{
 let guardedCopy=false,recoverableFailure=false;
 if(fromInstaller&&!baseline){
  assert.equal(path.dirname(extractedRoot),os.tmpdir());assert.ok(path.basename(extractedRoot).startsWith('zyon-installer-check-'));
  const marker=path.dirname(executablePath)+'.zyon-installing';
  const dependency=path.join(path.dirname(executablePath),'resources/app.asar.unpacked/node_modules/tesseract.js/package.json'),hidden=dependency+'.during-install';
  await fs.writeFile(marker,String(process.pid));await fs.rename(dependency,hidden);
  try{
   await run(executablePath,[],{env,windowsHide:true,timeout:15000});guardedCopy=true;
   await fs.unlink(marker);
   await assert.rejects(run(executablePath,[],{env,windowsHide:true,timeout:15000}),error=>error.code===1);
   const log=await fs.readFile(path.join(env.ZYON_USER_DATA,'startup.log'),'utf8');assert.match(log,/Incomplete installation:[\s\S]*tesseract\.js/);recoverableFailure=true;
  }finally{await fs.rename(hidden,dependency);await fs.unlink(marker).catch(()=>{});}
 }
 app=await electron.launch({executablePath,env,timeout:30000});const page=await app.firstWindow();
 await page.getByRole('heading',{name:'Bom ter você por aqui.',exact:true}).waitFor({timeout:30000});
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 // Block network after startup so neither the OCR model nor worker can download
 // anything. The test requires the real bundled WASM worker and traineddata.
 const images=await page.evaluate(()=>['Nv. 8','56'].map(text=>{const c=document.createElement('canvas');c.width=340;c.height=100;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.font='bold 56px Arial';g.fillStyle='#fff';g.fillText(text,15,72);return c.toDataURL('image/png').split(',')[1];}));
 const runtime=await app.evaluate(async({app},images)=>{
  const require=process.mainModule.require('node:module').createRequire(app.getAppPath()+'/electron/main.cjs');
  const modules=['tesseract.js','tesseract.js-core','electron-updater','@supabase/supabase-js'].map(name=>{const file=require.resolve(name).replace('app.asar.unpacked','app.asar');if(!file.startsWith(app.getAppPath()+process.mainModule.require('node:path').sep))throw new Error('Module resolved outside installation: '+name);require(name);return name;});
  const fallback=require('./level-fallback.cjs'),{parseLevel}=require('./level-ocr.cjs'),{parseGold}=require('./gold-ocr.cjs');
  const originalFetch=globalThis.fetch;globalThis.fetch=()=>Promise.reject(new Error('offline packaged-runtime test'));
  try{return {version:app.getVersion(),modules,level:parseLevel(await fallback.readLevelImage(images[0])),gold:parseGold(await fallback.readGoldImage(images[1]))};}
  finally{await fallback.stopLevelWorker();globalThis.fetch=originalFetch;}
 },images);
 assert.equal(runtime.level,8);assert.equal(runtime.gold,56);assert.equal(runtime.version,inventory.version);
 const result={ok:true,fromInstaller,isolated:true,authGate:true,offlineOcr:true,guardedCopy,recoverableFailure,inventory,...runtime};
 const out=path.resolve('design/review',runtime.version);await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,fromInstaller?'installer-runtime.json':'packaged-runtime.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{
 await app?.close();
 if(extractedRoot){
  assert.equal(path.dirname(extractedRoot),os.tmpdir());assert.ok(path.basename(extractedRoot).startsWith('zyon-installer-check-'));
  await fs.rm(extractedRoot,{recursive:true,force:true,maxRetries:10,retryDelay:200});
 }
}
