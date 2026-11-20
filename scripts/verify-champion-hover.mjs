import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.resolve('.runtime/modular-overlay-qa');
await fs.mkdir(output,{recursive:true});
const fixture=`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{OverlayChampions}from'./src/OverlayChampions';import{byId,pivotSnapshot}from'./src/data';import{shoppingWishes}from'./src/duo-plans.mjs';import{editShopTargets}from'./electron/shop-targets.cjs';
function Fixture(){const[state,setState]=useState({pinned:null,guideComp:null,shopTargets:{buy:[],requests:[],excluded:[]},championStatistics:pivotSnapshot.championStatistics,gameSession:{context:{copies:{}}}});window.fixture={calls:window.fixture?.calls||[],state};window.zyon={targetAction:async action=>{window.fixture.calls.push(action);const next=editShopTargets(state.shopTargets,action,byId,shoppingWishes(null,null,state.gameSession,byId));setState({...state,shopTargets:next});return{ok:true,shopTargets:next};}};return <OverlayChampions state={state}/>;}createRoot(document.getElementById('root')).render(<Fixture/>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const cssName=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
const css=await fs.readFile(path.join('dist/assets',cssName),'utf8');
const server=http.createServer(async(request,response)=>{try{
 const url=new URL(request.url,'http://localhost');
 if(url.pathname.startsWith('/assets/')||url.pathname.endsWith('.woff2')){
  const base=url.pathname.endsWith('.woff2')?'dist/assets':'public',relative=base==='public'?url.pathname.slice(1):path.basename(url.pathname),file=path.resolve(base,decodeURIComponent(relative));
  if(!file.startsWith(path.resolve(base)+path.sep))throw Error('Invalid path');
  response.end(await fs.readFile(file));
 }else{response.setHeader('Content-Type','text/html');response.end('<html><style>'+css+'html,body,#root{height:100%;margin:0;overflow:hidden}</style><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');}
}catch{response.statusCode=404;response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:460,height:700}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.oc-item-trigger').count(),0);
 const groups=await page.locator('.oc-cost-group').evaluateAll(elements=>elements.map(group=>({cost:Number(group.dataset.cost),units:[...group.querySelectorAll('.oc-champion')].map(tile=>({id:tile.dataset.championId,name:tile.querySelector('strong').textContent,traits:[...tile.querySelectorAll('.oc-unit-traits img')].map(icon=>({name:icon.alt,src:icon.getAttribute('src')}))}))})));
 assert.deepEqual(groups.map(group=>group.cost),groups.map(group=>group.cost).toSorted((first,second)=>first-second),'Cost sections ascend');
 assert.equal(groups.reduce((total,group)=>total+group.units.length,0),74,'Complete champion catalog');
 for(const group of groups){
  assert.deepEqual(group.units.map(unit=>unit.name),group.units.map(unit=>unit.name).toSorted((first,second)=>first.localeCompare(second,'pt-BR')),'Stable alphabetic order within each cost');
  assert.ok(group.units.every(unit=>unit.traits.length>0&&unit.traits.every(trait=>trait.name&&trait.src)),'Each champion shows named trait icons');
 }
 await page.screenshot({path:path.join(output,'champions-by-cost.png')});
 await page.getByLabel('Filtrar custo dos campeões').selectOption('2');
 assert.deepEqual(await page.locator('.oc-cost-group').evaluateAll(elements=>elements.map(element=>Number(element.dataset.cost))),[2]);
 await page.getByLabel('Filtrar custo dos campeões').selectOption('0');
 const sets=[];
 for(const name of ['Rakan','Leona','Kobuko','Yorick']){
  await page.getByRole('textbox').fill(name);
  const tile=page.getByRole('button',{name:`Marcar ${name} para comprar`,exact:true});
  const before=await tile.boundingBox();await tile.hover();
  const tooltip=page.getByRole('tooltip',{name:'Itens de '+name});await tooltip.waitFor();
  assert.deepEqual(await tile.boundingBox(),before,'Hover does not reflow the catalog');
  const tooltipBox=await tooltip.boundingBox();assert.ok(tooltipBox.y>=before.y+before.height||tooltipBox.y+tooltipBox.height<=before.y,'Tooltip does not intercept the champion click');
  const ids=await tooltip.locator('.oc-items img').evaluateAll(images=>images.map(image=>image.src.split('/').at(-1).replace('.png','')));
  sets.push(ids.join('|'));
  const expected=await page.evaluate(name=>{const id=Object.keys(window.fixture.state.championStatistics).find(id=>id==='DA_18_'+name);return window.fixture.state.championStatistics[id].itemBuilds[0].items;},name);
  assert.deepEqual(ids,expected);
  await tooltip.hover();await page.waitForTimeout(250);assert.equal(await tooltip.isVisible(),true);
  assert.equal(await page.evaluate(()=>window.fixture.calls.length),0,'Hovering never marks a champion');
  if(name==='Rakan')await page.screenshot({path:path.join(output,'champion-hover-rakan.png')});
  await page.keyboard.press('Escape');assert.equal(await tooltip.count(),0);
 }
 assert.equal(new Set(sets).size,4);
 await page.getByRole('textbox').fill('Rakan');
 const rakan=page.getByRole('button',{name:'Marcar Rakan para comprar',exact:true});
 await rakan.focus();await page.getByRole('tooltip').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0);
 await rakan.click();await page.getByRole('button',{name:'Remover Rakan dos marcados'}).waitFor();assert.equal(await page.evaluate(()=>window.fixture.calls.length),1);
 await page.getByRole('textbox').fill('');
 assert.deepEqual(await page.locator('.oc-champion').evaluateAll(tiles=>tiles.map(tile=>tile.dataset.championId)),groups.flatMap(group=>group.units.map(unit=>unit.id)),'Selection does not reorder champions');
 await page.getByRole('textbox').fill('Rakan');
 for(const [width,height]of [[360,400],[460,700]]){
  await page.setViewportSize({width,height});await page.mouse.move(width-2,2);await page.waitForTimeout(100);await page.getByRole('button',{name:'Desmarcar Rakan para comprar',exact:true}).hover();
  const box=await page.getByRole('tooltip').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
  const header=await page.locator('.oc-controls').boundingBox();assert.ok(box.y>=header.y+header.height,'Tooltip keeps search available');
  await page.mouse.move(width-2,height-2);await page.waitForTimeout(250);assert.equal(await page.getByRole('tooltip').count(),0);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,headless:true,individualTankSets:4,hover:true,keyboard:true,clickStillToggles:true,noReflow:true,sizes:[[360,400],[460,700]],errors}));
}finally{await browser.close();server.close();}
