import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import fallback from "../electron/level-fallback.cjs";
import gold from "../electron/gold-ocr.cjs";
import level from "../electron/level-ocr.cjs";
const {version}=JSON.parse(await fs.readFile("package.json","utf8"));
const out=path.resolve(`design/review/${version}/gold`);
await fs.mkdir(out,{recursive:true});
const cases=[
 {file:"40-gold56-stale62.png",value:56,rect:{x:0,y:.9354,width:.19,height:.0592}},
 {file:"38-ocr-level8-gold3-cropped.png",value:3,rect:{x:.54,y:.94,width:.065,height:.05}},
 {file:"18-gold-ocr.png",value:8,rect:{x:.55,y:.15,width:.35,height:.75}},
 {file:"17-game-ocr.png",value:18,rect:gold.defaultGoldRect({x:.2295,y:.858,width:.53,height:.139})},
 {file:"41-level9-stale8.png",value:36,rect:{x:.5993,y:.9305,width:.0392,height:.0316}},
 {file:"41-level9-stale8.png",kind:"Level",value:9,rect:{x:.0384,y:.918,width:.069,height:.047}},
 {file:"38-ocr-level8-gold3-cropped.png",kind:"Level",value:8,rect:{x:.032,y:.945,width:.072,height:.033}},
];
const results=[];
try{
 for(const fixture of cases){
  const cfg=path.join(out,"fixture.json");
  const kind=fixture.kind||"Gold",isLevel=kind==="Level";
  await fs.writeFile(cfg,JSON.stringify({[isLevel?"levelRect":"goldRect"]:fixture.rect}));
  const{stdout}=await promisify(execFile)("powershell.exe",["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File","electron/shop-reader.ps1","-ImagePath",`design/references/${fixture.file}`,`-${kind}Fixture`,"-ConfigPath",cfg],{windowsHide:true,timeout:30000});
  const raw=JSON.parse(stdout.trim());
  const parse=isLevel?level.parseLevel:gold.parseGold,rawText=isLevel?raw.levelText:raw.goldText,rawImage=isLevel?raw.levelImage:raw.goldImage;
  await fs.writeFile(path.join(out,`${kind}-${fixture.value}-prepared.png`),Buffer.from(rawImage,"base64"));
  const text=parse(rawText)===null?await (isLevel?fallback.readLevelImage(rawImage):fallback.readGoldImage(rawImage)):rawText;
  assert.equal(parse(text),fixture.value,fixture.file);
  if(isLevel){let reading=level.acceptReading(level.freshReading(),"Nv. 8",8,1000);reading=level.acceptReading(reading,"Nv. 8",8,2000);reading=level.acceptReading(reading,text,8,3000);reading=level.acceptReading(reading,text,8,4000);assert.equal(reading.level,fixture.value);}
  results.push({kind,file:fixture.file,expected:fixture.value,windowsText:rawText,acceptedText:text,parsed:parse(text)});
 }
}finally{await fallback.stopLevelWorker();}
await fs.writeFile(path.join(out,"ocr-results.json"),JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:true,results}));
