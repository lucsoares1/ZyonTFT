import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const output=path.resolve('.runtime/modular-overlay-qa');
await fs.mkdir(output,{recursive:true});
const cssFile=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
assert.ok(cssFile,'Build the current renderer before this verification');
const css=await fs.readFile(path.join('dist/assets',cssFile),'utf8');
const cards=[441,645,846,1049,1250].map(x=>({x:x/1913,y:917/1069,width:193/1913,height:148/1069}));
const fixture=`import React from 'react';import{createRoot}from'react-dom/client';import{ShopMedal}from'./src/ShopMedal';import{shopCardRect}from'./src/shop.mjs';
const cards=${JSON.stringify(cards)},kinds=['buy','send','shared','buy',null];
createRoot(document.getElementById('root')).render(<><img className="fixture-game" src="/fixture.png"/><div className="native-overlay">{cards.map((_,index)=>{const card=shopCardRect(null,cards,index),kind=kinds[index];return <div key={index} className="native-slot" data-kind={kind||'none'} style={{left:card.x*100+'%',top:card.y*100+'%',width:card.width*100+'%',height:card.height*100+'%','--medal-size':'clamp(16px, '+card.width*100*.14+'vw, 34px)'}}>{kind&&<ShopMedal kind={kind} label={'Alvo de teste '+index}/>}</div>;})}</div><div className="fixture-label">FIXTURE LOCAL · NÃO É PARTIDA AO VIVO</div></>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const server=http.createServer(async(request,response)=>{
 try{
  if(request.url==='/fixture.png'){
   response.setHeader('Content-Type','image/png');
   response.end(await fs.readFile('design/references/17-game-ocr.png'));
  }else if(request.url.startsWith('/assets/')){
   const asset=path.resolve('public',decodeURIComponent(request.url).slice(1));
   if(!asset.startsWith(path.resolve('public')+path.sep))throw Error('Invalid asset');
   response.end(await fs.readFile(asset));
  }else{
   response.setHeader('Content-Type','text/html');
   response.end('<html class="overlay-root"><style>'+css+'</style><style>html,body,#root{width:100%;height:100%;margin:0;overflow:hidden}.fixture-game{position:fixed;inset:0;width:100%;height:100%;object-fit:fill}.fixture-label{position:fixed;right:20px;top:20px;padding:8px 12px;background:#0c1018;color:#fff;font:12px sans-serif;z-index:10;pointer-events:none}</style><body class="overlay-body"><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></body></html>');
  }
 }catch{response.statusCode=404;response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('.shop-medal').nth(3).waitFor();
 await page.evaluate(async()=>Promise.all([...document.images].map(image=>image.decode())));
 const proof=await page.evaluate(()=>[...document.querySelectorAll('.native-slot')].map(slot=>{
  const medal=slot.querySelector('.shop-medal'),card=slot.getBoundingClientRect();
  if(!medal)return{kind:slot.dataset.kind,marked:false};
  const rect=medal.getBoundingClientRect(),style=getComputedStyle(medal),ancestors=[];
  for(let node=medal;node;node=node.parentElement)ancestors.push({opacity:getComputedStyle(node).opacity,pointerEvents:getComputedStyle(node).pointerEvents});
  const banner=getComputedStyle(medal.querySelector('.tft-banner'));
  const relief={shadow:banner.boxShadow,borderTop:banner.borderTopWidth,borderLeft:banner.borderLeftWidth,radius:banner.borderBottomLeftRadius,background:banner.backgroundImage,clip:banner.backgroundClip};
  return{kind:slot.dataset.kind,marked:true,text:medal.textContent,caption:!!medal.querySelector('.shop-medal-caption'),relief,ancestors,box:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},card:{x:card.x,y:card.y,width:card.width,height:card.height},pointerEvents:style.pointerEvents};
 }));
 assert.equal(proof.length,5);
 assert.equal(proof.filter(item=>item.marked).length,4);
 assert.equal(await page.locator('.shop-frost-frame').count(),0);
 for(const item of proof.filter(item=>item.marked)){
  assert.equal(item.text,'');assert.equal(item.caption,false);assert.equal(item.pointerEvents,'none');
  assert.ok(item.ancestors.every(node=>node.opacity==='1'),'No ancestor fades the solid tab');
  assert.ok(item.box.x>=item.card.x+6&&item.box.x<=item.card.x+12,'Move tab left to the first native badge lane');
  assert.ok(item.box.x+item.box.width<item.card.x+item.card.width*.4,'Do not cover center cost ornament');
  assert.ok(item.box.y>=item.card.y+1,'Keep original top border visible');
  assert.ok(item.box.y+item.box.height<item.card.y+item.card.height*.3,'Do not cover traits, name or lower cost');
  assert.equal(item.relief.borderTop,'0px','No upper rim');
  assert.ok(parseFloat(item.relief.borderLeft)>=1,'Native-like side bevel is present');
  assert.ok(item.relief.shadow.includes('inset')&&item.relief.shadow.includes('1px 3px'),'Provided bevel and offset shadow');
  assert.ok(item.relief.clip.includes('padding-box')&&item.relief.clip.includes('border-box'));
  assert.ok(Math.abs(item.box.height/item.box.width-30/28)<.01,'Native 28 by 30 proportions');
 }
 assert.ok(proof[0].relief.background.includes('rgb(36, 151, 255)'),'Zyon blue');
 assert.ok(proof[1].relief.background.includes('rgb(136, 69, 157)'),'Partner purple remains distinct');
 assert.ok(proof[2].relief.background.includes('rgb(36, 151, 255)')&&proof[2].relief.background.includes('rgb(136, 69, 157)'),'Both owners share a split banner');
 assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(output,'shop-native-tabs.png')});
 await page.screenshot({path:path.join(output,'shop-native-tabs-detail.png'),clip:{x:430,y:905,width:1035,height:175}});
 await page.evaluate(()=>{
  const gallery=document.createElement('section');
  gallery.style.cssText='position:fixed;inset:160px auto auto 180px;width:480px;height:220px;padding:24px;box-sizing:border-box;display:flex;align-items:flex-start;justify-content:space-around;background:#111820;z-index:999;color:#cbd5df;font:12px Inter,sans-serif;';
  for(const [index,label]of ['Para você','Para a dupla','Ambos'].entries()){
   const column=document.createElement('div');column.style.cssText='display:flex;flex-direction:column;align-items:center;gap:22px;';
   const flag=document.querySelectorAll('.shop-medal')[index].cloneNode(true);
   flag.style.cssText='position:relative;inset:auto;width:112px;height:120px;--shop-tab-width:112px;';
   const caption=document.createElement('span');caption.textContent=label;
   column.append(flag,caption);gallery.append(column);
  }
  document.body.append(gallery);
 });
 await page.screenshot({path:path.join(output,'shop-native-tabs-relief-4x.png'),clip:{x:180,y:160,width:480,height:220}});
 await fs.writeFile(path.join(output,'shop-native-tabs.json'),JSON.stringify({ok:true,fixture:true,realGame:false,headless:true,viewport:{width:1920,height:1080},proof,errors},null,2));
 console.log(JSON.stringify({ok:true,fixture:true,realGame:false,headless:true,output}));
}finally{await browser.close();server.close();}
