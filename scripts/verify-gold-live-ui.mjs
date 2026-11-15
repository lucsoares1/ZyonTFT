import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {_electron as electron} from "playwright";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const {version}=JSON.parse(await fs.readFile("package.json","utf8"));
const out=path.resolve(`design/review/${version}/gold`);
await fs.mkdir(out,{recursive:true});
const packaged=process.argv.includes("--packaged");
const level9=process.argv.includes("--level9");
let fixture=path.resolve("design/references/17-game-ocr.png");
if(level9){const composite=path.join(out,"level9-composite.png");await promisify(execFile)("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File","scripts/create-level9-fixture.ps1","-BasePath",fixture,"-LevelPath",path.resolve("design/references/41-level9-stale8.png"),"-OutputPath",composite],{windowsHide:true});fixture=composite;}
const env={...process.env,ZYON_USER_DATA:path.resolve(".runtime",`gold-live-${Date.now()}`),ZYON_OVERLAY_PREVIEW:"1",ZYON_OCR_FIXTURE:fixture};
delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;
const app=await electron.launch({...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||"release/win-unpacked/Zyon TFT.exe"),args:[]}:{args:["."]},env});
const checks=[];
try{
 const page=await app.firstWindow();
 await page.getByRole("heading",{name:"Composições",exact:true}).waitFor();
 await page.locator(".overlay-toggle").click();
 let state;
 const until=Date.now()+30000;
 while(Date.now()<until){state=await page.evaluate(()=>window.zyon.getState());if(state.goldReading.status==="confirmed"&&state.goldReading.gold===18&&(!level9||state.levelReading.level===9))break;await page.waitForTimeout(100);}
 assert.equal(state.goldReading.gold,18);
 const guide=app.windows().find(w=>w.url().includes("view=guide"));
 assert.ok(guide);
 if(state.gameSession.collapsed)await page.evaluate(compId=>window.zyon.gameAction({type:"collapse",compId}),state.pinned);
 await guide.getByTestId("live-gold").waitFor();
 assert.equal(await guide.getByTestId("live-gold").innerText(),"18");
 if(level9){assert.equal(state.gameSession.context.level,9);assert.equal(await guide.locator(".game-level b").innerText(),"9");checks.push("Nv.9 pixels from screenshot41 reach the session and native guide as level9 (test composite)");}
 checks.push("actual screenshot OCR reaches main session and native guide as 18");
 await guide.evaluate(()=>{const original=Date.now;Date.now=()=>original()+60000;});
 await guide.getByRole("heading",{name:"Aguardando o nível atual",exact:true}).waitFor();
 assert.equal(await guide.getByTestId("live-gold").innerText(),"—");
 assert.equal(await guide.locator(".game-level b").innerText(),"—");
 checks.push("expiry hides old number and suspends budget advice without needing another frame");
 await page.evaluate(()=>window.zyon.setReader(false));
 state=await page.evaluate(()=>window.zyon.getState());
 assert.equal(state.goldReading.gold,18);
 assert.equal(await guide.getByTestId("live-gold").innerText(),"—");
 checks.push("pause retains historical value internally but never presents it as current");
 await guide.screenshot({path:path.join(out,`stale-guide${level9?"-level9":""}${packaged?"-packaged":""}.png`),omitBackground:true});
 await fs.writeFile(path.join(out,`ui-checks${level9?"-level9":""}${packaged?"-packaged":""}.json`),JSON.stringify({ok:true,checks},null,2));
 console.log(JSON.stringify({ok:true,checks}));
}finally{await app.close();}
