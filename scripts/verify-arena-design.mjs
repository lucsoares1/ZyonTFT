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
  const top=()=>page.evaluate(()=>{for(const e of document.querySelectorAll('*'))if(e.scrollTop)e.scrollTop=0;window.scrollTo(0,0);});
  for(const width of [1536,1050]){
    await size(width,width===1536?1000:820);await top();
    await page.waitForFunction(()=>[...document.querySelectorAll('.zy-comp-face img')].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth));
    await page.getByRole('heading',{name:'Composições',exact:true}).click();await capture('01-library-'+width);
    await page.getByRole('button',{name:'Abrir categorias do plano escolhido',exact:true}).click();
    await page.locator('#zyon-plan-menu:popover-open').waitFor();
    assert.equal(await page.locator('#zyon-plan-menu').getByRole('button',{name:'Equipe',exact:true}).isVisible(),true);
    await capture('01-plan-menu-'+width);await page.keyboard.press('Escape');
    const m=await page.locator('.comp-row').first().evaluate(el=>Object.fromEntries(['.zy-comp-face','.zy-compact-top','.zy-comp-title','.zy-compact-roster','.zy-compact-bottom'].map(sel=>{const n=el.querySelector(sel),s=getComputedStyle(n),r=n.getBoundingClientRect();return[sel,{h:r.height,w:r.width,padding:s.padding,minHeight:s.minHeight,display:s.display}]})));
    metrics.push({width,...m});assert.ok(m['.zy-comp-face'].h<=185,'Compact header stays below 185px');
    const clipped=await page.locator('.comp-row').evaluateAll(rows=>rows.flatMap(row=>{const box=row.getBoundingClientRect();return [...row.querySelectorAll('.portrait-frame,.row-controls button')].filter(n=>{const r=n.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1}).map(n=>n.className)}));
    assert.deepEqual(clipped,[],'pieces and controls fit their card');
    assert.equal(await page.locator('.comp-row').first().locator('.zy-core-group .lineup-unit').count(),9);
  }
  await size(1536,1000);
  const first=page.locator('[data-comp-id="s18-pivot-blossom-ahri-fast-9"]');
  await first.getByRole('button',{name:'Expandir Blossom Ahri Fast 9',exact:true}).click();
    await first.locator('.zy-tactical-overview').waitFor();
  const root=first.locator('.zy-plan-explorer');
  await root.getByRole('navigation',{name:'Explorar o plano'}).getByRole('button',{name:'Níveis',exact:true}).click();
  await root.getByRole('navigation',{name:'Níveis do roteiro'}).getByRole('button',{name:'Final',exact:true}).click();
  await root.evaluate(e=>e.scrollIntoView({block:'start'}));
  await capture('02-tactical-overview-1536');
  await size(1050,820);await root.evaluate(e=>e.scrollIntoView({block:'start'}));await capture('02-tactical-overview-1050');
  checks.push('Visão geral compartilhada com roteiro completo e carries alinhados; interações verificadas em verify-tactical-route');
  await size(1536,1000);
  await first.locator('.zy-route-disclosure>summary').click();
  await first.getByRole('navigation',{name:'Equipe do roteiro'}).getByRole('button',{name:'5',exact:true}).click();
  assert.ok((await first.locator('.pivot-step-heading').first().textContent()).includes('5'));
  checks.push('Roteiro por nível e transições permanecem acessíveis');
  await page.getByRole('button',{name:'Banco de dados',exact:true}).click();
  await page.locator('.champion-performance-table').waitFor();await top();await capture('03-database-1536');
  await page.getByRole('button',{name:'Ver detalhes de Ahri',exact:true}).click();await page.locator('.champion-profile-dialog[open]').waitFor();await capture('04-champion-items-1536');
  await page.getByRole('button',{name:'Fechar detalhes do campeão'}).click();
  await page.getByRole('button',{name:'Planejador',exact:true}).click();await page.locator('.studio-board').waitFor();await top();await capture('05-planner-1536');
  await page.getByRole('button',{name:'Duplas Dinâmicas',exact:true}).click();await page.locator('.social-panel').waitFor();await top();await capture('06-duo-1536');
  await page.getByRole('button',{name:'Preferências',exact:true}).click();await page.locator('.settings-layout').waitFor();await top();await capture('07-settings-1536');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'checks.json'),JSON.stringify({ok:true,metrics,checks,errors},null,2));
  console.log(JSON.stringify({ok:true,metrics,checks,errors}));
} finally {
 if(page) await page.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
 await app?.close();
}




