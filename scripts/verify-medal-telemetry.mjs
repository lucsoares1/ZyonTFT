import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {_electron as electron} from "playwright";
import fallback from "../electron/level-fallback.cjs";
import {parseGold} from "../electron/gold-ocr.cjs";
import {parseLevel} from "../electron/level-ocr.cjs";
import {planForLevel} from "../src/level-planner.mjs";
const {version}=JSON.parse(await fs.readFile("package.json","utf8"));
const out=path.resolve(`design/review/${version}/medal`);
await fs.mkdir(out,{recursive:true});
const profile=path.resolve(".runtime",`medal-${Date.now()}`);
await fs.mkdir(profile,{recursive:true});
const cfg=path.join(profile,"cropped-hud.json");
await fs.writeFile(cfg,JSON.stringify({levelRect:{x:.032,y:.945,width:.072,height:.033},goldRect:{x:.54,y:.94,width:.065,height:.05}}));
const readings={};
try {
 for(const kind of ["Level","Gold"]){
  const {stdout}=await promisify(execFile)("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File","electron/shop-reader.ps1","-ImagePath","design/references/38-ocr-level8-gold3-cropped.png",`-${kind}Fixture`,"-ConfigPath",cfg],{windowsHide:true,timeout:30000});
  const raw=JSON.parse(stdout.trim());
  let text=kind==="Gold" ? raw.goldText : raw.levelText;
  const parse=kind==="Gold" ? parseGold : parseLevel;
  if(parse(text)===null) text=kind==="Gold" ? await fallback.readGoldImage(raw.goldImage) : await fallback.readLevelImage(raw.levelImage);
  readings[kind]={windowsText:raw.text,text,parsed:parse(text)};
 }
}finally{await fallback.stopLevelWorker();}
assert.equal(readings.Level.parsed,8);assert.equal(readings.Gold.parsed,3);
await fs.writeFile(path.join(out,"user-ocr.json"),JSON.stringify(readings,null,2));
const packaged=process.argv.includes("--packaged");
const env={...process.env,ZYON_USER_DATA:profile,ZYON_OVERLAY_PREVIEW:"1"};
delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;
const app=await electron.launch({...packaged?{executablePath:path.resolve("release/win-unpacked/Zyon TFT.exe"),args:[]}:{args:["."]},env});
try{
 const page=await app.firstWindow();
 await page.getByRole("heading",{name:"Composições",exact:true}).waitFor();
 await page.locator(".overlay-toggle").click();
 await page.evaluate(()=>window.zyon.setReader(false));
 let overlay;
 for(let i=0;i<60&&!overlay;i++){overlay=app.windows().find(w=>w.url().includes("view=overlay"));if(!overlay)await page.waitForTimeout(100);}
 assert.ok(overlay);
 const s=await page.evaluate(()=>window.zyon.getState());
 const catalog=Object.fromEntries(JSON.parse(await fs.readFile("src/generated/catalog.json","utf8")).champions.map(c=>[c.id,c]));
 const plan=planForLevel(s.guideComp,catalog,{...s.gameSession.context,level:7});
 const slots=[plan.search[0],plan.reserve[0]||s.guideComp.champions[1],...s.guideComp.champions].filter(Boolean).slice(0,5);
 await page.evaluate(async({slots})=>{
  const s=await window.zyon.getState();
  await window.zyon.gameAction({type:"level",delta:7-s.gameSession.context.level,compId:s.pinned});
  const next=await window.zyon.getState();
  await window.zyon.publish({...next,slots,selected:slots});
 },{slots});
 await overlay.waitForFunction(()=>document.querySelectorAll(".shop-medal").length===5);
 const image=await fs.readFile("design/references/35-game-level1-gold3.png");
 await overlay.evaluate(async data=>{
  const url=`data:image/png;base64,${data}`;
  const image=new Image();image.src=url;await image.decode();
  document.querySelector(".native-overlay").style.setProperty("background",`url(${url}) center / 100% 100% no-repeat`,"important");
 },image.toString("base64"));
 const geometry=await overlay.evaluate(async()=>{
  const s=await window.zyon.getState(),r=s.rect,w=innerWidth,h=innerHeight;
  return [...document.querySelectorAll(".native-slot")].map((slot,i)=>{
   const b=slot.querySelector(".shop-medal").getBoundingClientRect();
   const caption=slot.querySelector(".shop-medal-caption").getBoundingClientRect();
   return {slot:i,left:Math.min(b.left,caption.left),right:Math.max(b.right,caption.right),bottom:Math.max(b.bottom,caption.bottom),cardLeft:(r.x+r.width*i/5)*w,cardRight:(r.x+r.width*(i+1)/5)*w,traitsTop:(r.y+r.height*.25)*h};
  });
 });
 for(const g of geometry){assert.ok(g.left>=g.cardLeft&&g.right<=g.cardRight);assert.ok(g.bottom<g.traitsTop,"medal must clear traits and champion names");}
 await overlay.screenshot({path:path.join(out,`shop${packaged?"-packaged":""}.png`),clip:{x:430,y:885,width:1045,height:195}});
 const guide=app.windows().find(w=>w.url().includes("view=guide"));
 assert.equal(await guide.getByRole("button",{name:/Usar nível manual|Aumentar nível da partida|Diminuir nível da partida/}).count(),0);
 await fs.writeFile(path.join(out,`checks${packaged?"-packaged":""}.json`),JSON.stringify({readings,geometry,manualControls:0,note:"OCR uses user HUD crop; shop highlights are simulated solely for visual placement in an isolated profile."},null,2));
 console.log(JSON.stringify({ok:true,readings,medals:geometry.length,manualControls:0}));
}finally{await app.close();}
