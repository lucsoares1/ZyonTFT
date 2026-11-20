import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.resolve('.runtime/modular-overlay-qa');
await fs.mkdir(output,{recursive:true});
const fixture=`import React from'react';import{createRoot}from'react-dom/client';import{OverlayLauncher}from'./src/ModularOverlay';import{Items}from'./src/TftPanels';import{initialComps,byId,itemById}from'./src/data';
let state={guideComp:initialComps[0],overlayLayout:{summaryCollapsed:false},readerActive:false};let listener=()=>{};window.fixture={actions:[],longItems:Object.entries(itemById).filter(([,item])=>item.category==='Completo').sort(([,one],[,two])=>(two.desc||'').length-(one.desc||'').length).slice(0,8).map(([id])=>id),setItem(id){state={...state,guideComp:{...state.guideComp,items:{[state.guideComp.champions[0]]:[id]}}};listener(state);},setRoster(count){const ids=[...new Set([...initialComps[0].champions,...Object.keys(byId)])].slice(0,count);state={...state,guideComp:{...initialComps[0],name:'Plano ajustado de teste',champions:ids}};listener(state);},state:()=>state};window.zyon={getState:async()=>state,onState(callback){listener=callback;return()=>{}},overlayAction:async action=>{window.fixture.actions.push(action);if(action.type==='summaryToggle'){state={...state,overlayLayout:{summaryCollapsed:!state.overlayLayout.summaryCollapsed}};listener(state);}return{ok:true}}};const root=createRoot(document.getElementById('root'));root.render(<OverlayLauncher/>);window.fixture.showFullItem=()=>root.render(<div style={{position:'fixed',top:220,left:100}}><Items ids={['DA_SunfireCape']}/></div>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const cssName=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
const css=await fs.readFile(path.join('dist/assets',cssName),'utf8');
const server=http.createServer(async(request,response)=>{try{
 const url=new URL(request.url,'http://localhost');
 if(url.pathname.startsWith('/assets/')||url.pathname.endsWith('.woff2')){
  const base=url.pathname.endsWith('.woff2')?'dist/assets':'public',relative=base==='public'?url.pathname.slice(1):path.basename(url.pathname),file=path.resolve(base,decodeURIComponent(relative));
  if(!file.startsWith(path.resolve(base)+path.sep))throw Error('Invalid path');
  response.end(await fs.readFile(file));
 }else{response.setHeader('Content-Type','text/html; charset=utf-8');response.end('<html><meta charset="utf-8"><style>'+css+'html,body,#root{height:100%;margin:0;overflow:hidden}</style><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');}
 }catch{response.statusCode=404;response.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const report={ok:false,headless:true,sizes:[],errors:[]};
try{
 const page=await browser.newPage({viewport:{width:568,height:234}});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>document.fonts.ready);
 for(const count of [8,9,10,11,12]){
  const width=Math.min(740,Math.max(568,count*58+44));
  await page.setViewportSize({width,height:234});await page.evaluate(count=>window.fixture.setRoster(count),count);
  await page.waitForFunction(count=>document.querySelectorAll('.zy-summary-unit').length===count,count);
  const metrics=await page.evaluate(()=>{const units=[...document.querySelectorAll('.zy-summary-unit')].map(unit=>{const rect=unit.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,bottom:rect.bottom};}),footer=document.querySelector('.zy-summary-actions').getBoundingClientRect();return{units,footerBottom:footer.bottom,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,width:innerWidth};});
  assert.equal(new Set(metrics.units.map(unit=>unit.y)).size,1,'All champions remain on one line');
  assert.equal(metrics.scrollWidth,metrics.width,'No horizontal overflow');
  assert.ok(metrics.units.every(unit=>unit.width>=40),'Portraits remain large enough for 8–12 champions');
  assert.ok(metrics.footerBottom<=metrics.height-4,'Summary actions keep bottom breathing room');
  report.sizes.push({count,width,...metrics});
  await page.screenshot({path:path.join(output,`summary-${count}-champions.png`)});
 }
 const item=page.locator('.zy-summary-items img').first();await item.hover();
 await page.getByRole('tooltip').waitFor();
 const tooltip=await page.getByRole('tooltip').evaluate(element=>{const box=element.getBoundingClientRect();return{x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:innerWidth,height:innerHeight,clipped:element.scrollHeight>element.clientHeight+1,text:element.innerText};});
 report.tooltip=tooltip;
 assert.ok(tooltip.x>=0&&tooltip.y>=0&&tooltip.right<=tooltip.width&&tooltip.bottom<=tooltip.height,'Item tooltip stays inside summary window');
 await page.screenshot({path:path.join(output,'summary-item-tooltip.png')});
 await page.mouse.move(1,1);
  report.longTooltips=[];
  for(const id of await page.evaluate(()=>window.fixture.longItems)){
   await page.evaluate(id=>window.fixture.setItem(id),id);await page.mouse.move(1,1);
   await page.locator('.zy-summary-items img').first().hover();await page.getByRole('tooltip').waitFor();
   const metrics=await page.getByRole('tooltip').evaluate(element=>({clipped:element.scrollHeight>element.clientHeight+1,scrollHeight:element.scrollHeight,height:element.clientHeight}));
   report.longTooltips.push({id,...metrics});
   assert.equal(metrics.clipped,false,`${id} compact item tooltip is not clipped`);
   const help=await page.getByRole('tooltip').evaluate(element=>getComputedStyle(element,'::after').content);
   report.longTooltips.at(-1).help=help;
   assert.ok(help.includes('completa em Ver detalhes'),'Compact tooltip explains where to read full description');
   await page.mouse.move(1,1);
  }
 await page.getByRole('button',{name:'Ver detalhes',exact:true}).click();
 await page.getByRole('button',{name:'Ver comps',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>window.fixture.actions.map(action=>action.type)),['details','library']);
 await page.setViewportSize({width:960,height:740});await page.evaluate(()=>window.fixture.showFullItem());
 await page.locator('.equipment img').hover();await page.getByRole('tooltip').waitFor();
 report.fullItem=await page.getByRole('tooltip').boundingBox();
 assert.ok(report.fullItem.y>=8&&report.fullItem.y+report.fullItem.height<=732,'Full item description is clamped inside the detail window');
 assert.ok(await page.getByRole('tooltip').locator('.zy-item-tooltip-desc').isVisible(),'Full item description is available in details');
 assert.deepEqual(report.errors,[]);
 report.ok=true;
}catch(error){report.failure=error.stack;process.exitCode=1;}
finally{await browser.close();server.close();await fs.writeFile(path.join(output,'summary-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
