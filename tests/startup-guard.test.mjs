import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import guard from '../electron/startup-guard.cjs';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'zyon-bootstrap-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const executable=path.join(root,'installation/Zyon TFT.exe'),marker=path.dirname(executable)+guard.INSTALL_MARKER_SUFFIX;return {root,executable,marker};}
test('opening a shortcut during a live installation does not load the partly-copied app',t=>{
 const {root,executable,marker}=fixture(t);fs.writeFileSync(marker,String(process.pid));const exits=[],dialogs=[];
 const result=guard.launchApplication({app:{isPackaged:true,getPath:n=>n==='exe'?executable:root,exit:code=>exits.push(code)},dialog:{showErrorBox:(...a)=>dialogs.push(a)},load:()=>{throw new Error('must not load dependencies during install');}});
 assert.equal(result,'updating');assert.deepEqual(exits,[0]);assert.deepEqual(dialogs,[]);
});
test('dead or stale installer markers do not lock the program after a failed update',t=>{
 const {executable,marker}=fixture(t);fs.writeFileSync(marker,'42');
 assert.equal(guard.installInProgress(executable,{alive:()=>false}),false);
 assert.equal(guard.installInProgress(executable,{alive:()=>true,now:Date.now()+600001}),false);
 fs.writeFileSync(marker,'not a process');assert.equal(guard.installInProgress(executable,{alive:()=>true}),false);
});
test('a missing runtime has a recoverable message and log, without deleting preferences',t=>{
 const {root,executable}=fixture(t);const preferences=path.join(root,'preferences-v1.json');fs.writeFileSync(preferences,'personal settings');const dialogs=[],exits=[];
 const result=guard.launchApplication({app:{isPackaged:true,getPath:n=>n==='exe'?executable:root,exit:c=>exits.push(c)},dialog:{showErrorBox:(...a)=>dialogs.push(a)},load:()=>{throw Object.assign(new Error("Cannot find module 'tesseract.js'"),{code:'MODULE_NOT_FOUND'});}});
 assert.equal(result,'incomplete');assert.deepEqual(exits,[1]);assert.equal(dialogs.length,1);assert.match(dialogs[0][1],/reinstale o Setup/);assert.match(fs.readFileSync(path.join(root,'startup.log'),'utf8'),/tesseract/);assert.equal(fs.readFileSync(preferences,'utf8'),'personal settings');
});
