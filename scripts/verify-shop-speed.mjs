import fs from 'node:fs/promises';import path from 'node:path';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import readline from 'node:readline';import assert from 'node:assert/strict';import {recognizeNames} from '../src/shop.mjs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{champions}=require('../src/generated/catalog.json'),{version}=require('../package.json');
const dir=path.resolve('.runtime',`shop-speed-${Date.now()}`),out=path.resolve(`design/review/${version}/shop-speed`);await fs.mkdir(dir,{recursive:true});await fs.mkdir(out,{recursive:true});
const base=path.resolve('design/references/17-game-ocr.png');
await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-shop-sequence.ps1','-SourcePath',base,'-OutputDirectory',dir],{windowsHide:true});
const frames=[{path:base,holdMs:1200},{path:path.join(dir,'swapped.png'),holdMs:1200},{path:path.join(dir,'sold.png'),holdMs:1200},{path:base,holdMs:1200}];await fs.writeFile(path.join(dir,'sequence.json'),JSON.stringify(frames));
const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','electron/shop-reader.ps1','-ImagePath',base,'-ShopFixture','-RepeatFixture','-Fast','-FixtureSequence',path.join(dir,'sequence.json')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
const samples=[];let error='';child.stderr.on('data',s=>error+=s);const lines=readline.createInterface({input:child.stdout});
let done;const result=new Promise((r,j)=>{done=r;lines.on('line',line=>{try{const f=JSON.parse(line);if(f.error){j(Error(f.error));return;}if(f.kind==='shop'){samples.push({...f,receivedAt:Date.now()});if(f.fixtureIndex===3&&f.phase==='recognized')r();}}catch{}});child.on('error',j);child.on('exit',()=>j(Error(error||'Reader exited')));});
const timer=setTimeout(()=>done(),15000);
try{await result;
 const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$p=Get-Process -Id ${child.pid}; @{cpuSeconds=$p.TotalProcessorTime.TotalSeconds;peakWorkingSetMiB=[Math]::Round($p.PeakWorkingSet64/1MB,1)}|ConvertTo-Json -Compress`],{windowsHide:true});const resources=JSON.parse(stdout.trim());child.kill();
 const names=f=>recognizeNames(f.slots,champions).map(s=>s.id);
 const expected=[['DA_Vi18','DA_18_MasterYi_AD','DA_18_Alistar','DA_Cinderling18',null],['DA_18_Alistar','DA_18_MasterYi_AD','DA_Vi18','DA_Cinderling18',null],['DA_18_Alistar','DA_18_MasterYi_AD',null,'DA_Cinderling18',null],['DA_Vi18','DA_18_MasterYi_AD','DA_18_Alistar','DA_Cinderling18',null]];
 const timings=[];
 const duplicateFixture=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','electron/shop-reader.ps1','-ImagePath','design/references/35-game-level1-gold3.png','-ShopFixture','-Fast','-Once'],{windowsHide:true,maxBuffer:2000000});
 const duplicates=duplicateFixture.stdout.trim().split(/\r?\n/).map(line=>JSON.parse(line)).find(f=>f.kind==='shop'&&f.phase==='recognized');
 assert.deepEqual(duplicates.slots.map(s=>s.trim()),['Veigar','Camille','Varus','Veigar','Ornn']);assert.equal(names(duplicates)[0],names(duplicates)[3]);assert.ok(names(duplicates).every(Boolean));
 for(let index=0;index<4;index++){
  const first=samples.find(f=>f.fixtureIndex===index),recognized=samples.find(f=>f.fixtureIndex===index&&JSON.stringify(names(f))===JSON.stringify(expected[index]));assert.ok(first&&recognized,`Missing sequence ${index}`);
  assert.deepEqual(names(recognized),expected[index]);
  if(index===1){assert.equal(names(first)[0],null);assert.equal(names(first)[2],null);assert.equal(names(first)[1],expected[0][1]);}
  if(index===2)assert.equal(names(first)[2],null,'sold card cleared before OCR');
  timings.push({index,clearMs:first.receivedAt-first.fixtureChangedAt,recognizedMs:recognized.receivedAt-recognized.fixtureChangedAt});
 }
 const report={ok:true,engine:'Windows.Media.Ocr',newRuntimeDependencies:0,nativePollTargetMs:60,exactFixedSlots:true,duplicateChampionsPreserved:true,invalidatesBeforeOcr:true,soldCardClears:true,unknownOfferRejected:true,timings,resources,scope:'real Windows OCR on a sequence derived from an existing screenshot; resource measurement covers only the native reader, not the entire Electron app; no live game latency claim'};
 await fs.writeFile(path.join(out,'reader.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{clearTimeout(timer);child.kill();}
