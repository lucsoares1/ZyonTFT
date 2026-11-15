// Isolated component fixture: delayed local IPC replies, never an account-gate bypass.
import fs from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {build} from 'esbuild';import {chromium} from 'playwright';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));await fs.mkdir('.runtime',{recursive:true});const out=path.resolve('design/review/'+version+'/autosave');await fs.mkdir(out,{recursive:true});
await fs.writeFile('.runtime/request-autosave.tsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{DuoRequests}from'../src/DuoRequests';import{editWorkingPlan}from'../src/duo-plans.mjs';import{byId}from'../src/data';const base={id:'fixture',champions:['DA_18_Akali'],carry:'DA_18_Akali'};window.fixture={calls:[],nextReply:null,edit:null};function Fixture(){const[edit,setEdit]=useState(null);window.fixture.edit=edit;window.zyon={editPlan:async action=>{window.fixture.calls.push({...action});const reply=window.fixture.nextReply||{};window.fixture.nextReply=null;if(!reply.error)setEdit(previous=>editWorkingPlan(base,previous,action,byId));if(reply.delay)await new Promise(r=>setTimeout(r,reply.delay));return reply.error?{error:reply.error}:{ok:true};}};return <div className="game-guide game-wide" style={{height:'auto'}}><section className="social-panel social-native"><DuoRequests compId="fixture" edit={edit}/></section></div>;}createRoot(document.getElementById('root')).render(<Fixture/>);`);
const bundle=await build({entryPoints:['.runtime/request-autosave.tsx'],bundle:true,platform:'browser',format:'iife',write:false,define:{'process.env.NODE_ENV':'"production"'}});
const cssFile=(await fs.readdir('dist/assets')).find(f=>/^index-.*\.css$/.test(f));const css=await fs.readFile('dist/assets/'+cssFile,'utf8');
const server=http.createServer(async(req,res)=>{try{if(req.url.startsWith('/assets/')){const file=path.resolve('public','.'+decodeURIComponent(req.url));if(!file.startsWith(path.resolve('public')+path.sep))throw Error();res.setHeader('Content-Type',req.url.endsWith('.png')?'image/png':'application/octet-stream');res.end(await fs.readFile(file));}else{res.setHeader('Content-Type','text/html');res.end('<html><style>'+css+'body{margin:0;background:#090e16}#root{padding:12px}.duo-requests{margin:0}</style><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');}}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:640,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('button',{name:'Pedir campeão',exact:true}).click();
 assert.equal(await page.locator('.duo-request-submit').count(),0);
 await page.getByRole('button',{name:'Pedir Alistar à dupla',exact:true}).click();
 await page.waitForFunction(()=>window.fixture.edit?.requests.some(w=>w.id==='DA_18_Alistar'&&w.goal===1&&w.priority===0));
 const goal=page.getByRole('combobox',{name:'Meta de cópias do pedido à dupla',exact:true});
 await page.evaluate(()=>{
  window.fixture.nextReply={delay:250,error:'Falha antiga'};
  const goal=document.querySelector('.duo-request-selection select');goal.value='3';goal.dispatchEvent(new Event('change',{bubbles:true}));
  document.querySelector('[aria-label="Prioridade urgente do pedido"]').click();
 });
 await page.waitForFunction(()=>window.fixture.edit.requests.find(w=>w.id==='DA_18_Alistar')?.goal===3&&window.fixture.edit.requests.find(w=>w.id==='DA_18_Alistar')?.priority===2);
 await page.waitForTimeout(300);assert.equal(await page.getByRole('alert').count(),0,'old failure cannot override newer full-draft save');
 assert.deepEqual(await page.evaluate(()=>{const a=window.fixture.calls.at(-1);return [a.id,a.goal,a.priority];}),['DA_18_Alistar',3,2]);
 await page.evaluate(()=>window.fixture.nextReply={error:'Falha simulada ao salvar'});await goal.selectOption('9');
 await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.fixture.edit.requests.find(w=>w.id==='DA_18_Alistar').goal),3);
 await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await page.waitForFunction(()=>window.fixture.edit.requests.find(w=>w.id==='DA_18_Alistar').goal===9);assert.equal(await page.getByRole('alert').count(),0);
 await page.getByRole('button',{name:'Pedir Camille à dupla',exact:true}).click();
 await page.waitForFunction(()=>window.fixture.edit.requests.length===2);
 assert.equal(await page.getByRole('button',{name:'Pedir Alistar à dupla',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await page.getByRole('button',{name:'Pedir Camille à dupla',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Editar pedido de Alistar',exact:true}).click();
 const count=await page.evaluate(()=>window.fixture.calls.length);await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.getByRole('button',{name:'Pedir campeão',exact:true}).click();assert.equal(await page.evaluate(()=>window.fixture.calls.length),count,'opening or focusing must not publish a new request');
 await page.evaluate(()=>window.fixture.nextReply={delay:250});await goal.selectOption('1');await page.getByRole('button',{name:'Cancelar pedido de Alistar',exact:true}).click();
 await page.waitForTimeout(300);assert.ok(!await page.evaluate(()=>window.fixture.edit.requests.some(w=>w.id==='DA_18_Alistar')));assert.equal(await goal.count(),0,'cancellation clears selected draft');
 await page.getByRole('button',{name:'Editar pedido de Camille',exact:true}).click();
 for(const width of [640,840]){await page.setViewportSize({width,height:1000});await page.locator('.duo-requests').screenshot({path:path.join(out,'editor-'+width+'.png')});}
 assert.deepEqual(errors,[]);const checks={ok:true,immediateChampion:true,rapidGoalAndPriorityPreserved:true,lateFailureIgnored:true,latestFailureRetry:true,multipleChampionsRemainMarked:true,noWritesOnOpen:true,lateReplyCannotReviveCancelledRequest:true,errors};await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(checks,null,2));console.log(JSON.stringify(checks));
}finally{await browser.close();server.close();}
