import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import {_electron as electron} from "playwright";
const {version}=JSON.parse(await fs.readFile("package.json","utf8"));
const out=path.resolve(`design/review/${version}/reimagined`);await fs.mkdir(out,{recursive:true});
const packaged=process.argv.includes("--packaged"),suffix=packaged?"-packaged":"";
const env={...process.env,ZYON_USER_DATA:path.resolve(".runtime",`reimagined-${Date.now()}`),ZYON_OVERLAY_PREVIEW:"1"};
delete env.ELECTRON_RUN_AS_NODE;delete env.ZYON_DEV_URL;
const app=await electron.launch({...packaged?{executablePath:path.resolve(process.env.ZYON_TEST_EXE||"release/win-unpacked/Zyon TFT.exe"),args:[]}:{args:["."]},env});
const checks=[],errors=[];
try{
 const page=await app.firstWindow();page.on("pageerror",e=>errors.push(e.message));
 await page.getByRole("heading",{name:"Composições",exact:true}).waitFor();
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({x:40,y:25,width:1536,height:1000}));
 const ready=async target=>{await target.evaluate(()=>document.fonts.ready);await target.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));};
 const shot=async(name,target=page)=>{await ready(target);if(target!==page)await target.evaluate(()=>{document.querySelector(".game-content")?.scrollTo(0,0);});await target.screenshot({path:path.join(out,`${name}${suffix}.png`),animations:"disabled"});};
 await shot("library");
 const palette=await page.locator(".zyon-reimagined").evaluate(el=>({background:getComputedStyle(el).backgroundColor,accent:getComputedStyle(el).getPropertyValue("--accent").trim()}));
 assert.equal(palette.accent,"#347aff");assert.equal(palette.background,"rgb(7, 10, 16)");
 checks.push("charcoal background stays dark; modern blue is the primary action colour");
 assert.equal(await page.locator(".brand .zyon-mark").getAttribute("src"),"./assets/brand/zyontftlogo.png");
 assert.ok(await page.locator(".row-pin .zyon-mark").count()>20);
 assert.equal(await page.locator(".row-pin svg").count(),0);
 const row=page.locator('.comp-row[data-tier="S"]').first();const id=await row.getAttribute("data-comp-id");
 if(!await row.locator(".row-pin").evaluate(el=>el.classList.contains("row-pinned"))) await row.locator(".row-pin").click();
 await page.waitForFunction(id=>document.querySelector(`.comp-row[data-comp-id="${id}"] .row-pin`).classList.contains("row-pinned"),id);
 checks.push("original PNG is the app identity and all selection buttons use the logo");
 const dock=page.getByRole("region",{name:"Atalhos do plano escolhido"});
 assert.ok(await dock.locator(".sidebar-comp-roster img").count()>0);
 await dock.getByTitle("Abrir progressão da comp",{exact:true}).click();
 await page.locator(".row-expanded .level-navigator").waitFor();
 const appRail=page.locator(".row-expanded .level-navigator");
 const appLevel=Number(await appRail.locator('button[aria-pressed="true"]').innerText());
 await appRail.getByRole("button",{name:"Consultar próximo nível",exact:true}).click();
 assert.equal(await appRail.getByRole("button",{name:`Nível ${appLevel+1}`,exact:true}).getAttribute("aria-pressed"),"true");
 await appRail.getByRole("button",{name:"Consultar nível anterior",exact:true}).click();
 assert.equal(await appRail.getByRole("button",{name:`Nível ${appLevel}`,exact:true}).getAttribute("aria-pressed"),"true");
 await dock.getByTitle("Abrir equipe escolhida",{exact:true}).click();
 await page.locator(".row-expanded .guide-unit-table").waitFor();
 assert.equal(await page.locator(".row-expanded").getAttribute("data-comp-id"),id);
 checks.push("sidebar composition dock opens the actual chosen plan; next/previous level controls change the preview");
 for(const [label,selector] of [["Equipe",".guide-unit-table"],["Itens",".guide-items-view"],["Aprimoramentos",".pivot-augments"]]){
  await page.getByRole("navigation",{name:"Estudar a comp escolhida"}).getByRole("button",{name:new RegExp(label)}).click();
  await page.locator(`.row-expanded ${selector}`).waitFor();
  assert.equal(await page.locator(".row-expanded").getAttribute("data-comp-id"),id);
  if(label==="Aprimoramentos"){
   const search=page.getByRole("textbox",{name:"Buscar aprimoramento da comp"});
   await search.fill("zz-no-result");assert.equal(await page.locator(".row-expanded .pivot-augment-list>div").count(),0);
   await page.getByRole("button",{name:"Limpar filtros",exact:true}).click();
   assert.ok(await page.locator(".row-expanded .pivot-augment-list>div").count()>0);
  }
  await shot(label==="Equipe"?"units":label==="Itens"?"items":"augments");
 }
 checks.push("side shortcuts open the selected comp's team/items/augments and augment search clears correctly");
 for(const [label,selector,name] of [["Visão geral",".pivot-guide","overview"],["Progressão",".level-guide","progression"]]){
  await page.locator(".row-expanded .detail-tabs").getByRole("tab",{name:label,exact:true}).click();
  await page.locator(`.row-expanded ${selector}`).waitFor();await shot(name);
 }
 checks.push("all five comp detail tabs remain available with the same chosen composition");
 await page.getByRole("navigation",{name:"Navegação principal"}).getByRole("button",{name:"Banco de dados",exact:true}).click();
 await page.getByRole("button",{name:"Somente esta comp",exact:true}).click();
 const state=await page.evaluate(()=>window.zyon.getState());
 assert.equal(await page.locator(".data-table tbody tr").count(),state.guideComp.champions.length);
 await page.getByRole("tab",{name:"Itens",exact:true}).click();await shot("database-items");
 checks.push("database can be scoped to the chosen composition, preserving context across catalogue tabs");
 await page.getByRole("navigation",{name:"Navegação principal"}).getByRole("button",{name:"Planejador",exact:true}).click();await shot("planner");
 await page.getByRole("navigation",{name:"Navegação principal"}).getByRole("button",{name:"Meu overlay",exact:true}).click();await shot("settings");
 await page.locator(".overlay-toggle").click();await page.evaluate(()=>window.zyon.setReader(false));
 let guide;for(let i=0;i<70&&!guide;i++){guide=app.windows().find(w=>w.url().includes("view=guide"));if(!guide)await page.waitForTimeout(100);}
 assert.ok(guide);guide.on("pageerror",e=>errors.push(e.message));
 await guide.getByRole("tab",{name:"Equipe",exact:true}).click();
 await guide.getByRole("button",{name:"Consultar nível 8",exact:true}).click();await shot("overlay-team",guide);
 const sessionBefore=await page.evaluate(async()=>(await window.zyon.getState()).gameSession);
 await guide.getByRole("button",{name:"Consultar próximo nível",exact:true}).click();
 assert.equal(await guide.getByRole("button",{name:"Consultar nível 9",exact:true}).getAttribute("aria-pressed"),"true");
 await guide.getByRole("button",{name:"Consultar nível anterior",exact:true}).click();
 assert.equal(await guide.getByRole("button",{name:"Consultar nível 8",exact:true}).getAttribute("aria-pressed"),"true");
 assert.deepEqual((await page.evaluate(()=>window.zyon.getState())).gameSession,sessionBefore);
 const cursor=await guide.locator(".level-rail-track").evaluate(el=>({duration:getComputedStyle(el,"::after").transitionDuration,width:el.getBoundingClientRect().width,buttons:[...el.children].map(b=>b.getBoundingClientRect().width)}));
 assert.ok(cursor.duration.includes("0.26s"));assert.ok(cursor.buttons.every(w=>w>=25));
 checks.push("animated level cursor and next/previous browsing leave OCR, gold, copies and purchases unchanged");
 await guide.getByRole("tab",{name:"Aprim.",exact:true}).click();await shot("overlay-augments",guide);
 await guide.getByRole("button",{name:"Recolher guia",exact:true}).click();
 await guide.waitForFunction(()=>innerHeight===160);await shot("overlay-collapsed",guide);
 checks.push("overlay shares the brand and blue system across team, augments and full-roster collapsed mode");
 await page.getByRole("navigation",{name:"Fluxo da composição"}).getByRole("button",{name:"Escolha sua comp",exact:true}).click();
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes("view=")).setBounds({x:40,y:25,width:1050,height:850}));
 await page.waitForFunction(()=>innerWidth===1050);await shot("library-narrow");
 const overflow=await page.evaluate(()=>{const problems=[];for(const el of document.querySelectorAll(".row-controls,.ranked-lineup,.comp-spotlight,.preparation-flow")){const r=el.getBoundingClientRect();if(r.right>innerWidth+1||r.left<0)problems.push(el.className);}return problems;});assert.deepEqual(overflow,[]);
 await page.emulateMedia({reducedMotion:"reduce"});
 assert.ok(parseFloat(await page.locator(".comp-spotlight").evaluate(el=>getComputedStyle(el).animationDuration))<=.001);
 checks.push("layout fits 1536px/1050px and reduced-motion overrides animations");
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,`checks${suffix}.json`),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
}finally{await app.close();}
