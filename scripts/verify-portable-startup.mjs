import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const executable = path.resolve(`release/Zyon-TFT-${version}.exe`);
const userData = path.resolve('.runtime', `portable-startup-${Date.now()}`);
await fs.mkdir(userData, {recursive:true});
const server=net.createServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
await new Promise(resolve=>server.close(resolve));
const env={...process.env,ZYON_USER_DATA:userData};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const started=Date.now();
const launcher=spawn(executable,[`--remote-debugging-port=${port}`],{env,windowsHide:true,stdio:'ignore'});
let browser;
try {
  let endpoint;
  while(Date.now()-started<120000) {
    if(launcher.exitCode!==null) throw new Error(`Portable exited early: ${launcher.exitCode}`);
    try {
      const response=await fetch(`http://127.0.0.1:${port}/json/version`);
      endpoint=(await response.json()).webSocketDebuggerUrl;
      if(endpoint) break;
    } catch {}
    await new Promise(r=>setTimeout(r,250));
  }
  assert.ok(endpoint,'Portable did not start a renderer');
  browser=await chromium.connectOverCDP(endpoint);
  const context=browser.contexts()[0];
  const page=context.pages()[0] || await context.waitForEvent('page');
  await page.getByRole('heading',{name:/^(Composições|Bom ter você por aqui\.)$/}).waitFor();
  const readyMs=Date.now()-started;
  const url=page.url();
  assert.ok(url.includes('/ns'), 'Expected per-launch NSIS temporary directory');
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  await fs.mkdir('design/review/startup',{recursive:true});
  await page.screenshot({path:`design/review/startup/portable-${version}.png`,animations:'disabled'});
  const report={passed:true,executable,readyMs,actualSelfExtractingLauncher:true,perLaunchDirectory:true,rendererUrl:url};
  await fs.writeFile(`design/review/startup/portable-${version}.json`,JSON.stringify(report,null,2));
  console.log(report);
  await page.evaluate(()=>window.zyon.close());
  await new Promise((resolve,reject)=>{
    if(launcher.exitCode!==null)return resolve();
    const timer=setTimeout(()=>reject(new Error('Portable cleanup did not finish')),15000);
    launcher.once('exit',()=>{clearTimeout(timer);resolve()});
  });
} finally { await browser?.close().catch(()=>{}); if(launcher.exitCode===null) launcher.kill(); }
