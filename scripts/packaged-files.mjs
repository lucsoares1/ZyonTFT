import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import asar from '@electron/asar';
export const requiredPackagedFiles=[
 'package.json','electron/main.cjs','electron/level-fallback.cjs','electron/preload.cjs',
 'electron/shop-reader.ps1','electron/game-presence.ps1','electron/cloud-config.json','electron/match-start.cjs','electron/round-ocr.cjs',
 'electron/ocr/eng.traineddata','dist/index.html','src/shop.mjs','src/duo-plans.mjs',
 'src/generated/catalog.json','src/generated/pivot.json','src/generated/pivot-registry.json',
 'src/pivot-catalog.mjs','src/comp-catalog.mjs'
];
export const bootstrapRequiredFiles=['electron/bootstrap.cjs','electron/startup-guard.cjs','src/level-planner.mjs','src/generated/level-rules.json'];
export function verifyPackagedFiles(archive,{requireBootstrap=true,builtDirectory=null}={}){
 const entries=new Map();
 function walk(node,prefix=''){for(const [name,entry] of Object.entries(node.files||{})){const file=prefix?prefix+'/'+name:name;if(entry.files)walk(entry,file);else entries.set(file,entry);}}
 walk(asar.getRawHeader(archive).header);
 const read=name=>asar.extractFile(archive,name.split('/').join(path.sep));
 const mustHave=requiredPackagedFiles.concat(requireBootstrap?bootstrapRequiredFiles:[]);
 for(const name of mustHave)assert.ok(entries.has(name),'Missing packaged file: '+name);
 const pkg=JSON.parse(read('package.json'));
 if(requireBootstrap)assert.equal(pkg.main,'electron/bootstrap.cjs');
 assert.ok(entries.get('electron/ocr/eng.traineddata').size>1000000,'OCR language model is missing or a placeholder');
 let bytes=0,unpacked=0;
 for(const [name,entry] of entries){
  if(entry.link)continue;
  let data;try{data=read(name);}catch{throw new Error('Missing/unreadable packaged file: '+name);}
  assert.equal(data.length,entry.size,'Wrong packaged size: '+name);
  if(entry.integrity){assert.equal(entry.integrity.algorithm,'SHA256');assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.integrity.hash,'Corrupted packaged file: '+name);}
  bytes+=data.length;if(entry.unpacked)unpacked++;
 }
 const packages=[['',pkg],...[...entries.keys()].filter(n=>n.startsWith('node_modules/')&&n.endsWith('/package.json')).map(n=>[path.posix.dirname(n),JSON.parse(read(n))])];
 let dependencies=0;
 for(const [folder,metadata] of packages){
  for(const dependency of Object.keys(metadata.dependencies||{})){
   if(metadata.optionalDependencies?.[dependency])continue;
   let current=folder,found=false;
   while(true){
    if(entries.has((current?current+'/':'')+'node_modules/'+dependency+'/package.json')){found=true;break;}
    if(!current)break;const parent=path.posix.dirname(current);current=parent==='.'?'':parent;
   }
   assert.ok(found,`Missing runtime dependency ${dependency} required by ${metadata.name||folder}`);dependencies++;
  }
 }
 let builtFiles=0;
 if(builtDirectory){
  function check(dir,prefix=''){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const relative=prefix+file.name;if(file.isDirectory())check(path.join(dir,file.name),relative+'/');else{assert.ok(entries.has('dist/'+relative),'Missing app asset: '+relative);builtFiles++;}}}
  check(builtDirectory);
 }
 return {ok:true,version:pkg.version,files:entries.size,unpacked,bytes,dependencies,builtFiles,model:true};
}
