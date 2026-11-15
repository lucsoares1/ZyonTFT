import fs from 'node:fs/promises';import path from 'node:path';import {spawn,execFile} from 'node:child_process';import {promisify} from 'node:util';import readline from 'node:readline';import assert from 'node:assert/strict';import {recognizeNames} from '../src/shop.mjs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{champions}=require('../src/generated/catalog.json'),{version}=require('../package.json');
const dir=path.resolve('.runtime',`shop-stability-${Date.now()}`),out=path.resolve(`design/review/${version}/shop-stability`);await fs.mkdir(dir,{recursive:true});await fs.mkdir(out,{recursive:true});
const ps=promisify(execFile),opts={windowsHide:true,maxBuffer:2000000};
const geometry=JSON.parse((await ps('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-shop-stability.ps1','-OutputDirectory',dir],opts)).stdout.trim());
if(process.argv.includes('--rendered')){
 const render=path.resolve(`design/review/${version}/continuity`);
 await ps('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-shop-stability.ps1','-OutputDirectory',dir,'-BaselinePath',path.join(render,'medal-baseline.png'),'-OverlayPath',path.join(render,'medal-1913-1.png')],opts);
 geometry.renderedMedalsAndFramesDoNotInvalidate=true;
 geometry.originalJewelsPreserved=true;
 geometry.emptyDetectionIgnoresOwnMedals=true;
}
await ps('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/create-shop-sequence.ps1','-SourcePath',path.resolve('design/references/17-game-ocr.png'),'-OutputDirectory',dir],opts);
const base=path.resolve('design/references/17-game-ocr.png'),frames=[{path:base,holdMs:2500},{path:path.join(dir,'hover.png'),holdMs:1800},{path:path.join(dir,'single-noise.png'),holdMs:1000},{path:base,holdMs:500},{path:path.join(dir,'swapped.png'),holdMs:1200},{path:path.join(dir,'sold.png'),holdMs:1200}];
await fs.writeFile(path.join(dir,'sequence.json'),JSON.stringify(frames));await fs.writeFile(path.join(dir,'config.json'),JSON.stringify({rect:{x:.2295,y:.858,width:.53,height:.139},shopNames:champions.flatMap(c=>[c.name,...(c.aliases||[])])}));
const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','electron/shop-reader.ps1','-ImagePath',base,'-ShopFixture','-RepeatFixture','-Fast','-ConfigPath',path.join(dir,'config.json'),'-FixtureSequence',path.join(dir,'sequence.json')],{windowsHide:true,stdio:['ignore','pipe','pipe']});
const samples=[];let errors='';child.stderr.on('data',s=>errors+=s);const lines=readline.createInterface({input:child.stdout});let timeout;
try{
 await new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(Error('Stability timeout '+errors)),25000);child.on('error',reject);child.on('exit',()=>reject(Error(errors||'Reader exited')));lines.on('line',line=>{let f;try{f=JSON.parse(line);}catch{return;}if(f.error)return reject(Error(f.error));if(f.kind==='shop'){samples.push({...f,at:Date.now(),ids:recognizeNames(f.slots,champions).map(s=>s.id)});if(f.fixtureIndex===5&&f.phase==='observed')resolve();}});});
 const initial=samples.findIndex(f=>f.ids[0]==='DA_Vi18');assert.ok(initial>=0);
 const stable=samples.slice(initial).filter(f=>f.fixtureIndex<4);assert.ok(stable.length>15);assert.ok(stable.some(f=>f.fixtureIndex===1));assert.ok(stable.some(f=>f.phase==='recognized'&&f.fixtureIndex===1));assert.ok(stable.some(f=>f.fixtureIndex===2&&f.phase==='recognized'));
 for(const frame of stable)assert.equal(frame.ids[0],'DA_Vi18','same card blinked during hover/revalidation');
 const changed=samples.find(f=>f.fixtureIndex===4);assert.equal(changed.ids[0],null,'reroll must invalidate old champion before OCR');
 assert.ok(samples.some(f=>f.fixtureIndex===4&&f.ids[2]==='DA_Vi18'));
 const sold=samples.find(f=>f.fixtureIndex===5);assert.equal(sold.ids[2],null);
 const result={ok:true,...geometry,stableFrames:stable.length,noBlinkAcrossHoverAndPeriodicOcr:true,rerollStillClearsBeforeOcr:true,soldSlotClears:true,scope:'Native Windows OCR on controlled screenshot changes; geometry checks include windowed, ultrawide and physical high-DPI monitor coordinates.'};await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{clearTimeout(timeout);child.kill();}
