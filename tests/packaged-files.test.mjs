import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import asar from '@electron/asar';
import {verifyPackagedFiles,requiredPackagedFiles,bootstrapRequiredFiles} from '../scripts/packaged-files.mjs';
async function fixture(t,{missingHelper=false}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'zyon-package-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const source=path.join(root,'app'),archive=path.join(root,'app.asar');
 const files=Object.fromEntries([...requiredPackagedFiles,...bootstrapRequiredFiles,'node_modules/fixture-runtime/index.js','node_modules/fixture-helper/index.js'].map(n=>[n,'fixture data']));
 files['package.json']=JSON.stringify({name:'test-app',version:'1.0.0',main:'electron/bootstrap.cjs',dependencies:{'fixture-runtime':'1.0.0'}});
 files['node_modules/fixture-runtime/package.json']=JSON.stringify({name:'fixture-runtime',dependencies:{'fixture-helper':'1.0.0'}});
 if(!missingHelper)files['node_modules/fixture-helper/package.json']=JSON.stringify({name:'fixture-helper'});
 files['electron/ocr/eng.traineddata']=Buffer.alloc(1000001);
 for(const [name,data] of Object.entries(files)){const file=path.join(source,name);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,data);}
 await asar.createPackageWithOptions(source,archive,{unpack:'**/*.js'});return {archive,unpacked:path.join(archive+'.unpacked','node_modules/fixture-runtime/index.js')};
}
test('release validation detects missing and corrupt files outside app.asar',async t=>{
 const {archive,unpacked}=await fixture(t);assert.equal(verifyPackagedFiles(archive).dependencies,2);
 const original=await fs.readFile(unpacked);await fs.writeFile(unpacked,Buffer.alloc(original.length,1));assert.throws(()=>verifyPackagedFiles(archive),/Corrupted packaged file/);
 await fs.unlink(unpacked);assert.throws(()=>verifyPackagedFiles(archive),/Missing\/unreadable packaged file/);
});
test('release validation rejects an absent transitive dependency even when main modules exist',async t=>{
 const {archive}=await fixture(t,{missingHelper:true});assert.throws(()=>verifyPackagedFiles(archive),/Missing runtime dependency fixture-helper/);
});
