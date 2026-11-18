import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { _electron } from "playwright";
import { planForLevel } from "../src/level-planner.mjs";
const users = JSON.parse(
    await fs.readFile(".runtime/duo-live-credentials.json", "utf8"),
  ),
  out = path.resolve("design/review/0.17.28/arena"),
  env = {
    ...process.env,
    ZYON_USER_DATA: path.resolve(".runtime/stats-overlay-" + Date.now()),
    ZYON_TEST_BACKGROUND: "1",
    ZYON_OVERLAY_PREVIEW: "1",
    ZYON_OCR_FIXTURE: path.resolve("design/references/17-game-ocr.png"),
  };
for (const k of ["ELECTRON_RUN_AS_NODE", "ZYON_DEV_URL"]) delete env[k];
let app, page, guide;
const errors = [],
  checks = [];
const wait = async (fn, label) => {
  const end = Date.now() + 25000;
  while (Date.now() < end) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Timeout " + label);
};
async function capture(name) {
  await guide.evaluate(async () => {await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));});
  const png = await app.evaluate(async ({ BrowserWindow }, url) => {
    const w = BrowserWindow.getAllWindows().find(
      (w) => w.webContents.getURL() === url,
    );
    w.showInactive();
    try {
      await w.webContents.executeJavaScript(
        "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
      );
      await new Promise((r) => setTimeout(r, 150));
      return (await w.webContents.capturePage()).toPNG().toString("base64");
    } finally {
      w.hide();
    }
  }, guide.url());
  await fs.writeFile(path.join(out, name + ".png"), Buffer.from(png, "base64"));
}
async function layout() {
  return guide.evaluate(() => {
    const c = document.querySelector(".game-content");
    return {
      client: c.clientWidth,
      scroll: c.scrollWidth,
      broken: [...c.querySelectorAll("img")].filter(
        (i) => i.complete && !i.naturalWidth,
      ).length,
    };
  });
}
try {
  app = await _electron.launch({ args: ["."], env });
  await app.evaluate(({ app, BrowserWindow }) => {
    const quiet = (w) => {
      w.setOpacity(0);
      w.setIgnoreMouseEvents(true);
      w.setAlwaysOnTop(false);
      w.webContents.setBackgroundThrottling(false);
    };
    BrowserWindow.getAllWindows().forEach(quiet);
    app.on("browser-window-created", (_, w) => quiet(w));
  });
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("textbox", { name: "E-mail da conta Zyon", exact: true })
    .fill(users[2].email);
  await page
    .getByLabel("Senha da conta Zyon", { exact: true })
    .fill(users[2].password);
  await page
    .getByRole("button", { name: "Entrar no Zyon", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.evaluate(() => window.zyon.setOverlay(true));
  await wait(async () => {
    const s = await page.evaluate(() => window.zyon.getState());
    return s.gameSession.matchId && s.levelReading.status === "confirmed";
  }, "fixture reader");
  await page.evaluate(() => window.zyon.setReader(false));
  guide = await wait(
    () => app.windows().find((w) => w.url().includes("view=guide")),
    "native guide",
  );
  guide.setDefaultTimeout(15000);
  guide.on("pageerror", (e) => errors.push(e.message));

  await page.getByRole('button',{name:'Fixar Lunar Kayle',exact:true}).click();
  await wait(async()=>(await page.evaluate(()=>window.zyon.getState())).pinned==='s18-pivot-lunar-kayle','chosen Kayle');
  const state=await page.evaluate(()=>window.zyon.getState()),comp=state.saved.comps.find(c=>c.name==='Lunar Kayle');
  const row=page.locator(`[data-comp-id="${comp.id}"]`);
  if(!await row.locator('.zy-plan-explorer').count())await row.getByRole('button',{name:'Expandir '+comp.name,exact:true}).click();
  let root=row.locator('.zy-plan-explorer');
  const ids=async locator=>locator.evaluateAll(nodes=>nodes.map(n=>decodeURIComponent(n.getAttribute('src').split('/').at(-1).slice(0,-4))));
  const board=async locator=>locator.locator('.tft-hex.occupied').evaluateAll(nodes=>nodes.map(n=>({cell:Number(n.dataset.boardCell),id:n.querySelector('.hex-portrait>img').getAttribute('src').split('/').at(-1).slice(0,-4),items:[...n.querySelectorAll('.hex-equipment>img')].map(i=>i.getAttribute('src').split('/').at(-1).slice(0,-4)),stars:n.querySelectorAll('.unit-stars>svg').length})));
  const summaryCheck=async root=>{
    assert.equal(await root.getByRole('button',{name:'Resumo',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await root.getByRole('button',{name:'Abertura',exact:true}).count(),0);
    assert.deepEqual(await ids(root.locator('.zy-summary-goals .portrait-frame>img')),comp.champions.filter(id=>comp.stars?.[id]===3));
    assert.deepEqual(await ids(root.locator('.zy-summary-start .portrait-frame>img')),comp.pivot.openers);
    assert.ok((await root.locator('.zy-summary-carry').textContent()).includes('Kayle'));
    assert.equal(await root.locator('.zy-comp-summary dd').first().textContent(),comp.style);
  };
  const fit=async(target,root)=>{await target.evaluate(()=>document.fonts.ready);assert.ok(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.equal(await root.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&!i.naturalWidth).length),0);};
  async function shot(target,name){
    await target.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));});
    const png=await app.evaluate(async({BrowserWindow},url)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url);w.showInactive();try{await w.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await new Promise(r=>setTimeout(r,250));return(await w.webContents.capturePage()).toPNG().toString('base64');}finally{w.hide();}},target.url());
    await fs.writeFile(path.join(out,name+'.png'),Buffer.from(png,'base64'));
  }
  await summaryCheck(root);
  for(const width of [1536,1050]){
    await app.evaluate(({BrowserWindow},{url,width})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL()===url).setBounds({width,height:width===1536?1000:820}),{url:page.url(),width});
    await root.evaluate(e=>e.scrollIntoView({block:'start'}));await shot(page,'16-summary-main-'+width);await fit(page,root);
  }
  await root.getByRole('button',{name:'Níveis',exact:true}).click();
  await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Nv. 6 3-1',exact:true}).click();
  const reference=await board(root.locator('.zy-plan-board'));
  assert.equal(reference.find(c=>c.id===comp.carry).cell,comp.positions[comp.carry]);
  assert.ok(reference.some(c=>c.items.length));
  await root.evaluate(e=>e.scrollIntoView({block:'start'}));await shot(page,'17-levels-main-1050');
  await row.getByRole('tab',{name:'Progressão',exact:true}).click();
  await row.getByRole('button',{name:'Nível 6',exact:true}).click();
  assert.deepEqual(await board(row.locator('.level-board')),reference,'Níveis and Progressão render identical cells, equipment and stars');
  await row.locator('.level-board').evaluate(e=>e.scrollIntoView({block:'center'}));await shot(page,'18-progression-main-1050');
  await row.getByRole('tab',{name:'Visão geral',exact:true}).click();
  root=row.locator('.zy-plan-explorer');await summaryCheck(root);
  await row.locator('.zy-route-disclosure>summary').click();
  await row.getByRole('navigation',{name:'Equipe do roteiro'}).getByRole('button',{name:'6',exact:true}).click();
  assert.deepEqual(await board(row.locator('.pivot-route-main>.tft-board-panel')),reference,'full guide matches the same level');
  checks.push('Main1536/1050: factual default summary; level6 cells/items/stars identical in Níveis, Progressão and full guide');
  await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
  await guide.getByRole('button',{name:'Ver itens e aprimoramentos de '+comp.name,exact:true}).click();
  let nativeRoot=guide.locator('.zy-plan-explorer');await nativeRoot.waitFor();
  const before=(await page.evaluate(()=>window.zyon.getState())).gameSession;
  for(const width of [840,640]){
    await app.evaluate(({screen,BrowserWindow},width)=>{const c=screen.getPrimaryDisplay(),d={...c,bounds:{...c.bounds,width:width+24},workArea:{...c.workArea,width:width+24}};screen.getAllDisplays=()=>[d];screen.getPrimaryDisplay=()=>d;BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width,height:800});},width);
    await guide.waitForFunction(w=>innerWidth===w,width);
    await nativeRoot.getByRole('button',{name:'Resumo',exact:true}).click();await summaryCheck(nativeRoot);
    await nativeRoot.evaluate(e=>{const c=document.querySelector('.game-content');c.scrollTop+=e.getBoundingClientRect().top-c.getBoundingClientRect().top;document.scrollingElement.scrollTop=0;});
    await shot(guide,'19-summary-native-'+width);await fit(guide,nativeRoot);
    await nativeRoot.getByRole('button',{name:'Níveis',exact:true}).click();
    await nativeRoot.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Nv. 6 3-1',exact:true}).click();
    assert.deepEqual(await board(nativeRoot.locator('.zy-plan-board')),reference,'native Níveis matches main');
    await nativeRoot.locator('.zy-plan-board').evaluate(e=>{const c=document.querySelector('.game-content');c.scrollTop+=e.getBoundingClientRect().top-c.getBoundingClientRect().top;document.scrollingElement.scrollTop=0;});
    await shot(guide,'20-levels-native-'+width);
    await guide.getByRole('tab',{name:'Equipe',exact:true}).click();await guide.getByRole('button',{name:'Consultar nível 6',exact:true}).click();
    assert.deepEqual(await board(guide.locator('.game-team-board>.tft-board-panel')),reference,'native Equipe matches allmain/native guide boards');
    await shot(guide,'21-team-native-'+width);
    await guide.getByRole('tab',{name:'Roteiro',exact:true}).click();
    await guide.getByRole('navigation',{name:'Equipe do roteiro'}).getByRole('button',{name:'6',exact:true}).click();
    assert.deepEqual(await board(guide.locator('.pivot-route-main>.tft-board-panel')),reference,'native Roteiro matches');
    await shot(guide,'22-route-native-'+width);
    await guide.getByRole('tab',{name:'Agora',exact:true}).click();const now=await board(guide.locator('.game-now-aside .tft-board-panel'));
    await guide.getByRole('tab',{name:'Equipe',exact:true}).click();await guide.getByRole('button',{name:'Consultar nível '+before.context.level,exact:true}).click();
    assert.deepEqual(await board(guide.locator('.game-team-board>.tft-board-panel')),now,'native Agora and Equipe agree at actual current level');
    const after=(await page.evaluate(()=>window.zyon.getState())).gameSession;
    for(const key of ['context','matchId','startedAt','purchases','levelMode','goldMode'])assert.deepEqual(after[key],before[key],key+' preserved');
    checks.push('Native'+width+': summary, Níveis, Equipe, Roteiro and Agora share cells/equipment/stars; live state preserved');
    await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();await guide.getByRole('button',{name:'Ver itens e aprimoramentos de '+comp.name,exact:true}).click();nativeRoot=guide.locator('.zy-plan-explorer');
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'board-consistency-checks.json'),JSON.stringify({ok:true,checks,reference,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
} finally {await app?.close();}
