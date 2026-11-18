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
  const snapshot=state.gameSession;
  const ids=async locator=>locator.evaluateAll(nodes=>nodes.map(n=>decodeURIComponent(n.getAttribute('src').split('/').at(-1).slice(0,-4))));
  for(const name of ['Lunar Kayle','Blossom Ahri Fast 9','Alune Fast 9']) {
    console.log('Checking '+name);
    const comp=state.saved.comps.find(c=>c.name===name);
    const row=page.locator(`[data-comp-id="${comp.id}"]`);
    if(!await row.locator('.zy-plan-explorer').count()) await row.getByRole('button',{name:'Expandir '+name,exact:true}).click();
    console.log('Expanded '+name);
    const root=row.locator('.zy-plan-explorer');
    await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Níveis',exact:true}).click();
    for(const step of (process.argv.includes('--capture-only')?[]:comp.pivot.levels)) {
      console.log('Level '+step.level);
      await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:new RegExp('^Nv\\. '+step.level+'(?: |$)')}).click();
      assert.deepEqual(await ids(root.getByLabel('Equipe no nível '+step.level,{exact:true}).locator('.portrait-frame>img')),step.units);
      assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...step.units].sort());
      for(let i=0;i<step.variants.length;i++) {
        await root.locator('.zy-path-option').nth(i+1).click();
        const expected=step.units.map(id=>step.variants[i].find(s=>s.replaces===id)?.championId||id);
        assert.deepEqual(await ids(root.getByLabel('Equipe no nível '+step.level,{exact:true}).locator('.portrait-frame>img')),expected,'alternative roster agrees with board');
        assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...expected].sort());
      }
    }
    await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Final',exact:true}).click();
    assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...comp.champions].sort());
    for(const width of [1536,1050]) {
      await size(width,width===1536?1000:820);
      await root.evaluate(e=>e.scrollIntoView({block:'start'}));
      await capture('09-route-'+name.split(' ')[0].toLowerCase()+'-'+width);
      const fit=await root.evaluate(e=>{
        const b=e.getBoundingClientRect();
        const bad=[...e.querySelectorAll('img,button,article')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&(r.left<b.left-1||r.right>b.right+1)}).map(n=>n.className);
        const list=e.querySelector('.zy-plan-carry-list'),box=list.getBoundingClientRect(),cards=[...list.children].map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top}});
        return {width:innerWidth,root:b.width,overflow:e.scrollWidth-e.clientWidth,bad,cards,listWidth:box.width};
      });
      assert.ok(fit.overflow<2,JSON.stringify(fit));assert.deepEqual(fit.bad,[],JSON.stringify(fit));
      assert.ok(Math.abs(fit.cards[0].width-fit.cards[1].width)<2,'carry columns have equal widths');
      assert.ok(fit.cards.every(c=>Math.abs(c.top-fit.cards[0].top)<2),'all carries share one aligned row');
      const used=fit.cards.at(-1).right-fit.cards[0].left;
      assert.ok(Math.abs(used-fit.listWidth)<2,'carry columns fill the available list');
      metrics.push({name,...fit});
    }
    if(!process.argv.includes('--capture-only')) {
    await size(1050,820);
    await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:/^Nv\. 6(?: |$)/}).click();
    await root.evaluate(e=>e.scrollIntoView({block:'start'}));await capture('10-route-level6-'+name.split(' ')[0].toLowerCase());
    await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Resumo',exact:true}).click();
    assert.deepEqual((await ids(root.locator('.zy-plan-board .hex-portrait>img'))).sort(),[...comp.champions].sort());
    console.log('Checking session '+name);
    assert.deepEqual((await page.evaluate(()=>window.zyon.getState())).gameSession,snapshot);
    }
    await row.getByRole('button',{name:'Recolher '+name,exact:true}).click();
    checks.push(name+(process.argv.includes('--capture-only')?': recaptura, carries alinhados e sem overflow':': todas as etapas publicadas, final, alternativas, resumo e sessão preservada'));
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,process.argv.includes('--capture-only')?'route-recapture-checks.json':'route-checks.json'),JSON.stringify({ok:true,metrics,checks,errors},null,2));
  console.log(JSON.stringify({ok:true,metrics,checks,errors}));
} finally {
 console.log('Closing isolated preview');
 await app?.close();
}
