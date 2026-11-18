import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { _electron } from "playwright";
const users = JSON.parse(
    await fs.readFile(".runtime/duo-live-credentials.json", "utf8"),
  ),
  out = path.resolve("design/review/0.17.28/arena"),
  profile = path.resolve(".runtime/arena-preview-" + Date.now());
await fs.mkdir(out, { recursive: true });
const env = {
  ...process.env,
  ZYON_USER_DATA: profile,
  ZYON_TEST_BACKGROUND: "1",
};
for (const k of [
  "ELECTRON_RUN_AS_NODE",
  "ZYON_DEV_URL",
  "ZYON_OVERLAY_PREVIEW",
  "ZYON_OCR_FIXTURE",
])
  delete env[k];
let app, page;
const errors = [],
  metrics = [],
  checks = [];
async function capture(name) {
  await page.evaluate(async () => {await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).map(i=>i.decode().catch(()=>{})));});
  const png = await app.evaluate(async ({ BrowserWindow }, url) => {
    const w = BrowserWindow.getAllWindows().find(
      (w) => w.webContents.getURL() === url,
    );
    w.showInactive();
    try {
      await w.webContents.executeJavaScript(
        "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
      );
      await new Promise((r) => setTimeout(r, 450));
      return (await w.webContents.capturePage()).toPNG().toString("base64");
    } finally {
      w.hide();
    }
  }, page.url());
  await fs.writeFile(path.join(out, name + ".png"), Buffer.from(png, "base64"));
}
async function size(width, height) {
  await app.evaluate(
    ({ BrowserWindow }, { url, width, height }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL() === url)
        .setBounds({ x: 20, y: 20, width, height }),
    { url: page.url(), width, height },
  );
  await page.waitForTimeout(150);
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
  page.setDefaultTimeout(15000);
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

  await page.getByRole('button',{name:'Fixar Lunar Kayle',exact:true}).click();
  await page.waitForFunction(async()=>!!(await window.zyon.getState()).saved?.comps?.length,{},{timeout:20000});
  const state=await page.evaluate(()=>window.zyon.getState());
  const ids=async locator=>locator.evaluateAll(nodes=>nodes.map(n=>decodeURIComponent(n.getAttribute('src').split('/').at(-1).slice(0,-4))));
  const sameTeam=async(root,units)=>{
    assert.deepEqual(await ids(root.locator('.zy-path-team .portrait-frame>img')),units,'roster follows the selected option');
    assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...units].sort(),'board and roster agree');
  };
  for(const name of ['Lunar Kayle','Lunar Aphelios Fast 9']) {
    await page.getByPlaceholder('Buscar composição ou campeão',{exact:true}).fill(name);
    const comp=state.saved.comps.find(c=>c.name===name),row=page.locator(`[data-comp-id="${comp.id}"]`);
    if(!await row.locator('.zy-plan-explorer').count()) await row.getByRole('button',{name:'Expandir '+name,exact:true}).click();
    const root=row.locator('.zy-plan-explorer'),step=comp.pivot.levels.find(s=>s.variants.length);
    if(name==='Lunar Aphelios Fast 9') {
      await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Flex',exact:true}).click();
      await root.getByText('Selecione um nível para consultar as substituições publicadas naquela etapa.',{exact:true}).waitFor();
      const empty=comp.pivot.levels.find(s=>!s.variants.length);
      await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:new RegExp('^Nv\\. '+empty.level+'(?: |$)')}).click();
      await root.getByText('Nenhuma substituição publicada para este nível. Consulte outra etapa do roteiro.',{exact:true}).waitFor();
      await size(1050,820);await root.evaluate(e=>e.scrollIntoView({block:'start'}));await capture('14-options-empty-1050');
    }
    await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Níveis',exact:true}).click();
    await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:new RegExp('^Nv\\. '+step.level+'(?: |$)')}).click();
    for(let i=0;i<step.variants.length;i++) {
      await root.locator('.zy-path-option').nth(i+1).click();
      const expected=step.units.map(id=>step.variants[i].find(s=>s.replaces===id)?.championId||id);
      await sameTeam(root,expected);
      const previous=comp.pivot.levels.filter(s=>s.level<step.level).at(-1);
      const changes=await root.locator('.zy-path-transitions>div').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.querySelector(':scope>span').textContent,[...n.querySelectorAll('.portrait-frame>img')].map(i=>decodeURIComponent(i.getAttribute('src').split('/').at(-1).slice(0,-4)))])));
      if(previous){const entering=expected.filter(id=>!previous.units.includes(id)),leaving=previous.units.filter(id=>!expected.includes(id));assert.deepEqual(changes,{...(entering.length?{Entram:entering}:{}),...(leaving.length?{Saem:leaving}:{})});}
      assert.equal(await root.locator('.zy-path-option').nth(i+1).getAttribute('aria-pressed'),'true');
      assert.ok((await root.getByRole('status').textContent()).includes('opção '+(i+1)));
      assert.ok((await root.locator('.zy-path-option').nth(i+1).textContent()).includes('Em prévia'));
    }
    for(const width of [1536,1050]) {await size(width,width===1536?1000:820);await root.evaluate(e=>e.scrollIntoView({block:'start'}));await capture('14-options-'+name.split(' ')[1].toLowerCase()+'-'+width);assert.ok(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
    await root.locator('.zy-path-option').first().click();await sameTeam(root,step.units);
    assert.equal(await root.locator('.zy-path-option').first().getAttribute('aria-pressed'),'true');
    await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Final',exact:true}).click();await sameTeam(root,comp.champions);
    assert.deepEqual((await page.evaluate(()=>window.zyon.getState())).gameSession,state.gameSession);
    const planFields=comps=>comps.map(({id,champions,carry,items,stars,positions})=>({id,champions,carry,items,stars,positions}));
    assert.deepEqual(planFields((await page.evaluate(()=>window.zyon.getState())).saved.comps),planFields(state.saved.comps),'consultation does not edit saved teams, items, stars or positions; live statistics can refresh');
    await row.getByRole('button',{name:'Recolher '+name,exact:true}).click();checks.push(name+': alternativas/lista/tabuleiro, retorno ao guia/final, estados Flex e dados preservados');
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'options-checks.json'),JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,checks}));
} finally {await app?.close();}
