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

  const snapshot=await page.evaluate(()=>window.zyon.getState());
  await guide.getByRole('button',{name:'Trocar composição no overlay'}).click();
  const ids=async locator=>locator.evaluateAll(nodes=>nodes.map(n=>decodeURIComponent(n.getAttribute('src').split('/').at(-1).slice(0,-4))));
  for(const name of ['Lunar Kayle','Lunar Aphelios Fast 9']) {
    if(name!=='Lunar Kayle')await guide.getByRole('button',{name:'Todas as comps',exact:true}).click();
    await guide.getByRole('button',{name:'Ver itens e aprimoramentos de '+name,exact:true}).click();
    const comp=snapshot.saved.comps.find(c=>c.name===name),root=guide.locator('.zy-plan-explorer');await root.waitFor();
    await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Níveis',exact:true}).click();
    const live=(await page.evaluate(()=>window.zyon.getState())).gameSession;
    for(const width of [840,640]) {
      await app.evaluate(({screen,BrowserWindow},width)=>{const current=screen.getPrimaryDisplay(),display={...current,bounds:{...current.bounds,width:width+24},workArea:{...current.workArea,width:width+24}};screen.getAllDisplays=()=>[display];screen.getPrimaryDisplay=()=>display;BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('view=guide')).setBounds({width,height:800});},width);
      await guide.waitForFunction(w=>innerWidth===w,width);
      if(name==='Lunar Aphelios Fast 9') {
        await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Flex',exact:true}).click();
        await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Final',exact:true}).click();
        await root.getByText('Selecione um nível para consultar as substituições publicadas naquela etapa.',{exact:true}).waitFor();
        const empty=comp.pivot.levels.find(s=>!s.variants.length);
        await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:new RegExp('^Nv\\. '+empty.level+'(?: |$)')}).click();
        await root.getByText('Nenhuma substituição publicada para este nível. Consulte outra etapa do roteiro.',{exact:true}).waitFor();
      }
      const step=comp.pivot.levels.find(s=>s.variants.length);
      await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:new RegExp('^Nv\\. '+step.level+'(?: |$)')}).click();
      await root.locator('.zy-path-option').nth(1).click();
      const expected=step.units.map(id=>step.variants[0].find(s=>s.replaces===id)?.championId||id);
      assert.deepEqual(await ids(root.locator('.zy-path-team .portrait-frame>img')),expected);
      assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...expected].sort());
      await root.evaluate(e=>{const c=document.querySelector('.game-content');c.scrollTop+=e.getBoundingClientRect().top-c.getBoundingClientRect().top-62;document.scrollingElement.scrollTop=0;});
      await capture('15-options-'+name.split(' ')[1].toLowerCase()+'-'+width);
      const m=await layout();assert.ok(m.scroll<=m.client+1&&m.broken===0,JSON.stringify(m));
      assert.deepEqual((await page.evaluate(()=>window.zyon.getState())).gameSession,live);
      await root.locator('.zy-path-option').first().click();assert.deepEqual(await ids(root.locator('.zy-path-team .portrait-frame>img')),step.units);
      checks.push(name+' '+width+': alternativa sincronizada, estados Flex claros, sessão preservada');
    }
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'options-overlay-checks.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
} finally {await app?.close();}
