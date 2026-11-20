import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.resolve('.runtime/modular-overlay-qa');
await fs.mkdir(output,{recursive:true});
const fixture=`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{SocialPanel}from'./src/SocialPanel';import{champions}from'./src/data';
const friend={user_id:'fixture-friend',display_name:'Amigo de teste',handle:'fixture_amigo'},profile={user_id:'fixture-me',display_name:'Jogador de teste',handle:'fixture',friend_code:'ZYONTEST'};
const social={user:{id:'fixture-me'},profile,status:'online',friends:[{id:'friend-1',profile:friend}],friendRequests:[{id:'request-1',incoming:true,profile:{...friend,user_id:'requester',display_name:'Pedido de amizade'}}],invites:[{id:'invite-1',incoming:true,profile:{...friend,user_id:'inviter',display_name:'Convite de teste'}}]};
window.fixture={calls:[],copy:'',failSocial:false,failTarget:false,champion:champions.find(champion=>champion.name==='Rakan')};
const listeners=new Set();function Fixture(){const[state,setState]=useState({social,pinned:null,guideComp:null,shopTargets:{buy:[],requests:[]},gameSession:{context:{copies:{}}}});window.fixture.state=state;window.fixture.setState=next=>setState(next);window.fixture.connect=()=>setState(previous=>({...previous,social:{...social,session:{id:'fixture-duo'},partner:friend,invites:[],friendRequests:[],partnerPlan:{updated_at:new Date().toISOString(),payload:{comp:{name:'Plano compartilhado de teste',champions:champions.slice(0,8).map(champion=>champion.id)},playing:true,shopping:[{id:window.fixture.champion.id,goal:3,owned:0,priority:2,reason:'request'}]}}}}));
window.zyon={getState:async()=>state,getSocial:async()=>state.social,onSocial:()=>()=>{},onState:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},socialAction:async action=>{window.fixture.calls.push(action);return window.fixture.failSocial?{error:'Falha de convite da fixture. Tente novamente.'}:{ok:true};},targetAction:async action=>{window.fixture.calls.push(action);if(window.fixture.failTarget)return{error:'Falha de pedido da fixture.'};const requests=action.type==='remove'?state.shopTargets.requests.filter(request=>request.id!==action.id):[...state.shopTargets.requests.filter(request=>request.id!==action.id),{id:action.id,goal:action.goal,priority:0}];const next={...state,shopTargets:{...state.shopTargets,requests}};setState(next);for(const listener of listeners)listener(next);return{ok:true,shopTargets:next.shopTargets};},editPlan:async action=>{window.fixture.calls.push(action);return{ok:true};}};
return <main className="fixture-scroll"><div className="zy-duo-surface"><SocialPanel native gameState={state}/></div></main>;}createRoot(document.getElementById('root')).render(<Fixture/>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const cssFile=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
const css=await fs.readFile(path.join('dist/assets',cssFile),'utf8')+await fs.readFile('src/overlay-duo.css','utf8');
const server=http.createServer(async(request,response)=>{
 try{
  if(request.url.startsWith('/assets/')){
   const asset=path.resolve('public',decodeURIComponent(request.url).slice(1));
   if(!asset.startsWith(path.resolve('public')+path.sep))throw Error('Invalid path');
   response.end(await fs.readFile(asset));
  }else{
   response.setHeader('Content-Type','text/html');
   response.end('<html><style>'+css+'</style><style>html,body,#root{height:100%;margin:0;overflow:hidden;background:#0c1016}.fixture-scroll{height:100%;overflow:auto;min-width:0}*{box-sizing:border-box}</style><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');
  }
 }catch{response.statusCode=404;response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const errors=[],page=await browser.newPage({viewport:{width:480,height:700}});
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.fixture.copy=value;}}});});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('button',{name:'Copiar meu código de amigo'}).click();
 assert.equal(await page.evaluate(()=>window.fixture.copy),'ZYONTEST');
 await page.getByRole('button',{name:'Adicionar amigo',exact:true}).click();
 await page.getByRole('textbox',{name:'Código de amigo',exact:true}).fill('ABC123');
 await page.getByRole('button',{name:'Enviar pedido',exact:true}).click();
 await page.getByRole('button',{name:'Aceitar amizade de Pedido de amizade'}).click();
 await page.getByRole('button',{name:'Aceitar convite de Convite de teste'}).click();
 const actions=await page.evaluate(()=>window.fixture.calls.map(action=>action.type));
 assert.ok(actions.includes('friendRequest')&&actions.includes('friendAccept')&&actions.includes('acceptInvite'));
 await page.evaluate(()=>{window.fixture.failSocial=true;});
 await page.getByRole('button',{name:'Convidar Amigo de teste para dupla'}).click();
 await page.getByRole('alert').filter({hasText:'Falha de convite'}).waitFor();
 await page.evaluate(()=>{document.querySelector('.fixture-scroll').scrollTop=0;});
 await page.screenshot({path:path.join(output,'duo-no-partner-480.png')});
 await page.evaluate(()=>{window.fixture.failSocial=false;window.fixture.connect();});
 await page.getByRole('button',{name:'Encerrar dupla'}).waitFor();
 await page.getByText('Ver comp do parceiro',{exact:true}).click();
 await page.getByRole('button',{name:'Pedir campeão',exact:true}).click();
 await page.getByRole('textbox',{name:'Buscar campeão para pedir à dupla'}).fill('Rakan');
 await page.getByRole('button',{name:'Pedir Rakan à dupla',exact:true}).click();
 await page.getByRole('button',{name:'Cancelar pedido de Rakan',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.fixture.state.pinned),null,'Requests work without choosing a comp');
 const request=await page.evaluate(()=>window.fixture.calls.find(action=>action.list==='requests'));
 assert.equal(request.type,'set');assert.equal(request.priority,0);assert.equal(request.goal,1);
 await page.getByRole('combobox',{name:'Meta de cópias do pedido à dupla'}).selectOption('3');
 await page.waitForFunction(()=>window.fixture.state.shopTargets.requests[0]?.goal===3);
 await page.getByRole('button',{name:'Cancelar pedido de Rakan',exact:true}).click();
 await page.waitForFunction(()=>window.fixture.state.shopTargets.requests.length===0);
 await page.evaluate(()=>{window.fixture.failTarget=true;});
 await page.getByRole('button',{name:'Pedir Rakan à dupla',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Falha de pedido'}).waitFor();
 await page.evaluate(()=>{window.fixture.failTarget=false;});
 await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
 await page.getByRole('button',{name:'Cancelar pedido de Rakan',exact:true}).waitFor();
 await page.getByRole('button',{name:'Fechar',exact:true}).click();
 assert.equal(await page.locator('.duo-priority-tag,.duo-request-priority').count(),0);
 assert.equal(await page.getByText(/urgente|urgência|prioridade/i).count(),0);
 for(const width of [480,420]){
  await page.setViewportSize({width,height:700});
  await page.evaluate(()=>{document.querySelector('.fixture-scroll').scrollTop=0;});
  const geometry=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,scroll:document.querySelector('.fixture-scroll').scrollHeight,height:document.querySelector('.fixture-scroll').clientHeight,identity:getComputedStyle(document.querySelector('.duo-identity')).display,code:getComputedStyle(document.querySelector('.duo-friend-code')).display}));
  assert.equal(geometry.document,width);assert.ok(geometry.scroll>geometry.height);assert.notEqual(geometry.identity,'none');assert.notEqual(geometry.code,'none');
  await page.screenshot({path:path.join(output,'duo-connected-'+width+'.png')});
 }
 await page.setViewportSize({width:480,height:700});
 await page.locator('.duo-requests').evaluate(element=>element.scrollIntoView({block:'start'}));
 await page.screenshot({path:path.join(output,'duo-connected-requests-480.png')});
 await page.locator('.duo-friends').evaluate(element=>element.scrollIntoView({block:'start'}));
 await page.screenshot({path:path.join(output,'duo-connected-friends-480.png')});
 await page.getByRole('button',{name:'Encerrar dupla'}).click();
 assert.equal(await page.evaluate(()=>window.fixture.calls.at(-1).type),'leave');
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(output,'duo-states.json'),JSON.stringify({ok:true,fixture:true,realServer:false,headless:true,friendCode:true,friendRequest:true,friendAccept:true,inviteAccept:true,inviteError:true,requestWithoutComp:true,requestErrorRetry:true,noUrgency:true,widths:[420,480],errors},null,2));
 console.log(JSON.stringify({ok:true,fixture:true,realServer:false,headless:true,output}));
}finally{await browser.close();server.close();}
