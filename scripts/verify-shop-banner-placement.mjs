import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const source=process.argv[2];
assert.ok(source,'Pass the supplied shop screenshot');
const proof=JSON.parse((await fs.readFile('.runtime/shop-banner-anchor-proof.json','utf8')).replace(/^\uFEFF/,''));
const cards=proof.find(entry=>entry.scale===1&&entry.offset===95).cards.map(rect=>({x:rect[0],y:rect[1],width:rect[2],height:rect[3]}));
const fixture=`import React from'react';import{createRoot}from'react-dom/client';import App from'./src/App';import{champions,initialComps}from'./src/data';const ids=['Yorick','LeBlanc','Aronguejo','Cascalho','Cassiopeia'].map(name=>champions.find(champion=>champion.name===name)?.id||champions[0].id);const state={pinned:'fixture',guideComp:{...initialComps[0],id:'fixture',style:'Personalizada',champions:ids},shopCards:${JSON.stringify(cards)},shopRect:{x:209/1232,y:55/207,width:1017/1232,height:150/207},shopTargets:{buy:ids.map(id=>({id,goal:3})),requests:[],excluded:[]},slots:ids.map(id=>({id,confidence:1})),gameSession:{context:{copies:{}}},overlayPlans:{},shopRevision:1};window.zyon={getState:async()=>state,onState:()=>()=>{},onShop:()=>()=>{}};createRoot(document.getElementById('root')).render(<App/>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const stylesheet=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
const css=await fs.readFile(path.join('dist/assets',stylesheet),'utf8');
const server=http.createServer(async(request,response)=>{
 try{
  const pathname=new URL(request.url,'http://localhost').pathname;
  if(pathname==='/fixture.png'){response.setHeader('Content-Type','image/png');response.end(await fs.readFile(source));}
  else if(pathname.startsWith('/assets/')){
   const directory=pathname.endsWith('.woff2')?'dist/assets':'public',file=path.resolve(directory,pathname.endsWith('.woff2')?path.basename(pathname):'.'+pathname);
   assert.ok(file.startsWith(path.resolve(directory)+path.sep));response.end(await fs.readFile(file));
  }else{response.setHeader('Content-Type','text/html');response.end('<html><style>'+css+'body{margin:0;overflow:hidden}.anchor-fixture{position:fixed;inset:0;width:100%;height:100%;z-index:0}.native-overlay{z-index:1}</style><img class="anchor-fixture" src="/fixture.png" alt=""><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');}
 }catch{response.statusCode=404;response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1232,height:207}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/?view=overlay');
 await page.locator('.shop-medal').nth(4).waitFor();
 await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
 const actual=await page.locator('.shop-medal').evaluateAll(elements=>elements.map(element=>({box:element.getBoundingClientRect().toJSON(),pointerEvents:getComputedStyle(element).pointerEvents})));
 for(const [index,item]of actual.entries()){
  const card=cards[index];
  assert.ok(item.box.x>=card.x*1232&&item.box.x+item.box.width<card.x*1232+card.width*1232*.3);
  assert.ok(Math.abs(item.box.y-card.y*207-2)<1);
  assert.equal(item.pointerEvents,'none');
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'.runtime/shop-banner-corrected.png'});
 console.log(JSON.stringify({ok:true,headless:true,realGame:false,cards:actual.length,correctedScreenshot:'.runtime/shop-banner-corrected.png',errors}));
}finally{await browser.close();server.close();}
