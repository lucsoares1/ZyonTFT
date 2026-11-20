import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';

const fixture=`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{OverlayComps}from'./src/OverlayComps';import{initialComps}from'./src/data';
const comps=initialComps.slice(0,2);window.fixture={calls:[],reply:'success',delay:0,comps};
function Fixture(){const[state,setState]=useState({saved:{comps},pinned:comps[0].id});window.fixture.state=state;
window.zyon={chooseComp:async id=>{window.fixture.calls.push(id);const{delay,reply}=window.fixture;if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(reply==='error')return false;if(reply==='throw')throw Error('Fixture');setState(previous=>({...previous,pinned:id}));return true;}};
return <div className="game-guide game-wide zy-native-reference"><main className="game-content"><OverlayComps state={state}/></main></div>;}createRoot(document.getElementById('root')).render(<Fixture/>);`;
const bundle=await build({stdin:{contents:fixture,loader:'tsx',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',write:false,loader:{'.svg':'dataurl','.css':'empty'},define:{'process.env.NODE_ENV':'"production"'}});
const cssFile=(await fs.readdir('dist/assets')).find(name=>/^index-.*\.css$/.test(name));
const css=await fs.readFile(path.join('dist/assets',cssFile),'utf8');
const server=http.createServer(async(request,response)=>{
 try{
  if(request.url.startsWith('/assets/')){
   const relative=decodeURIComponent(request.url).slice(1),asset=path.resolve('public',relative);
   if(!asset.startsWith(path.resolve('public')+path.sep))throw Error('Invalid path');
   response.end(await fs.readFile(asset));
  }else{
   response.setHeader('Content-Type','text/html');
   response.end('<html><style>'+css+'.game-guide.zy-native-reference{display:block;height:100vh}.game-guide.zy-native-reference .game-content{height:100%;padding:16px}</style><div id="root"></div><script>'+bundle.outputFiles[0].text+'</script></html>');
  }
 }catch{response.statusCode=404;response.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.ZYON_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:640,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const comps=await page.evaluate(()=>window.fixture.comps),target=comps[1];
 const use=page.getByRole('button',{name:'Usar composição '+target.name,exact:true});
 await page.evaluate(()=>{window.fixture.reply='error';window.fixture.delay=200;});
 await use.click();
 await page.getByText('Aplicando…',{exact:true}).waitFor();assert.equal(await use.isDisabled(),true);
 await page.getByRole('alert').waitFor();assert.equal(await use.isEnabled(),true);
 assert.equal(await page.evaluate(()=>window.fixture.state.pinned),comps[0].id,'failure never claims selection');
 await page.evaluate(()=>{window.fixture.reply='throw';window.fixture.delay=0;});
 await use.click();await page.getByRole('alert').waitFor();assert.equal(await use.isEnabled(),true);
 await page.evaluate(()=>window.fixture.reply='success');await use.click();
 await page.getByRole('button',{name:'Composição '+target.name+' em uso',exact:true}).waitFor();
 assert.equal(await page.getByRole('alert').count(),0);
 await page.getByRole('button',{name:'Ver detalhes de '+target.name,exact:true}).click();
 await page.getByRole('button',{name:'Todas as comps',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Ver detalhes de '+target.name);
 assert.equal(await page.evaluate(()=>window.fixture.calls.length),3,'preview and back do not select or republish');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,headless:true,loading:true,failedSelectionRetry:true,thrownFailureRetry:true,keyboardFocusRestored:true,errors}));
}finally{await browser.close();server.close();}
