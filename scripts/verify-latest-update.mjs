import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { _electron } from 'playwright';

const directory=path.resolve('.runtime/latest-update-'+Date.now());await fs.mkdir(directory,{recursive:true});
let latest='0.17.29',application;const downloads=[];
const contents=version=>Buffer.from('MZ fixture, never execute '+version);
const server=http.createServer((request,response)=>{
 if(request.url.startsWith('/latest.yml')){const file=contents(latest),name='Zyon-TFT-Setup-'+latest+'.exe';response.setHeader('content-type','text/yaml');response.end(`version: ${latest}\nfiles:\n  - url: ${name}\n    sha512: ${crypto.createHash('sha512').update(file).digest('base64')}\n    size: ${file.length}\npath: ${name}\nsha512: ${crypto.createHash('sha512').update(file).digest('base64')}\nreleaseDate: '2026-11-18T00:00:00Z'\n`);return;}
 const version=request.url.match(/Setup-(\d+\.\d+\.\d+)\.exe/);if(!version){response.writeHead(404);response.end();return;}downloads.push(version[1]);response.end(contents(version[1]));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const config=path.join(directory,'app-update.yml');await fs.writeFile(config,`provider: generic\nurl: ${url}\nupdaterCacheDirName: isolated-updater\n`);
const env={...process.env,ZYON_USER_DATA:path.join(directory,'profile'),ZYON_TEST_BACKGROUND:'1'};
for(const key of ['ELECTRON_RUN_AS_NODE','ZYON_DEV_URL','ZYON_OVERLAY_PREVIEW','ZYON_PRESENCE_FIXTURE','ZYON_OCR_FIXTURE'])delete env[key];
try{
 application=await _electron.launch({args:['.'],env});await application.evaluate(({BrowserWindow,screen})=>{const primary=screen.getPrimaryDisplay(),display=screen.getAllDisplays().find(display=>display.id!==primary.id);if(!display)throw Error('Teste requer monitor secundário livre');BrowserWindow.getAllWindows().forEach(window=>{window.hide();window.setPosition(display.workArea.x+24,display.workArea.y+24);window.setIgnoreMouseEvents(true,{forward:true});});});
 await application.evaluate(async(_,{directory,config,url})=>{
  const require=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json');
  const {NsisUpdater}=require('electron-updater'),{ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor'),{UpdateService}=require(require('node:path').resolve('electron/update-service.cjs'));
  const app={version:'0.17.28',name:'Isolated Zyon updater',isPackaged:true,userDataPath:directory,baseCachePath:directory,appUpdateConfigPath:config,whenReady:async()=>{},onQuit:()=>{},quit:()=>{},relaunch:()=>{}};
  const updater=new NsisUpdater({provider:'generic',url},app);updater.httpExecutor=new ElectronHttpExecutor();updater.setFeedURL({provider:'generic',url});updater.logger={info(){},warn(){},error(){},debug(){}};updater.disableDifferentialDownload=true;
  const service=new UpdateService({updater,version:app.version});globalThis.latestUpdateTest={updater,service};updater.on('error',error=>{globalThis.latestUpdateTest.error={code:error.code,message:error.message};});updater.quitAndInstall=()=>{globalThis.latestUpdateTest.installVersion=service.snapshot().version;};await service.check();
 },{directory,config,url});
 latest='0.17.30';
 const downloaded=await application.evaluate(async()=>{const test=globalThis.latestUpdateTest;await test.service.download();return {...test.service.snapshot(),error:test.error};});
 assert.equal(downloaded.status,'downloaded',JSON.stringify(downloaded));assert.equal(downloaded.version,'0.17.30');assert.deepEqual(downloads,['0.17.30']);
 latest='0.17.31';
 const installed=await application.evaluate(async()=>{const test=globalThis.latestUpdateTest;await test.service.install();const result={...test.service.snapshot(),installVersion:test.installVersion};test.service.close();return result;});
 assert.equal(installed.installVersion,'0.17.31');assert.deepEqual(downloads,['0.17.30','0.17.31']);
 const result={ok:true,realNsisUpdater:true,realHttpDownloads:true,downloads,installVersion:installed.installVersion,installerExecutionStubbed:true,isolatedCache:true};await fs.writeFile(path.join(directory,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await application?.close();await new Promise(resolve=>server.close(resolve));}
