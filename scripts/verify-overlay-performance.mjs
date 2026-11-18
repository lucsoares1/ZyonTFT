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
  guide.on("pageerror", (e) => errors.push(e.message));
  for (const width of [840, 640]) {
    await app.evaluate(({ screen, BrowserWindow }, width) => {
      const current = screen.getPrimaryDisplay(),
        display = {
          ...current,
          bounds: { ...current.bounds, width: width + 24 },
          workArea: { ...current.workArea, width: width + 24 },
        };
      screen.getAllDisplays = () => [display];
      screen.getPrimaryDisplay = () => display;
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("view=guide"))
        .setBounds({ width, height: 800 });
    }, width);
    await guide.getByRole("tab", { name: "Itens", exact: true }).click();
    await guide
      .getByRole("region", { name: "Estatísticas dos itens dos carries" })
      .waitFor();
    await guide.waitForFunction((width) => innerWidth === width, width);
    let m = await layout();
    assert.ok(m.scroll <= m.client + 1 && m.broken === 0, JSON.stringify(m));
    await capture("04-overlay-current-items-" + width);
    await guide
      .getByRole("button", { name: "Trocar composição no overlay" })
      .click();
    await guide
      .locator(".overlay-comp-grid .comp-performance")
      .first()
      .waitFor();
    m = await layout();
    assert.ok(m.scroll <= m.client + 1 && m.broken === 0, JSON.stringify(m));
    assert.ok(await guide.locator('.overlay-comp-option .zy-compact-face').first().evaluate(e=>e.getBoundingClientRect().height)<(width===640?245:190),'compact native header');
    await capture("05-overlay-comps-" + width);
    await guide
      .getByRole("button", {
        name: "Ver itens e aprimoramentos de Blossom Ahri Fast 9",
        exact: true,
      })
      .click();
    await guide.locator('.zy-tactical-overview').waitFor();
    await capture('08-overlay-overview-'+width);
    await guide
      .getByRole("tab", { name: "Itens dos carries", exact: true })
      .click();
    await guide
      .getByRole("region", { name: "Estatísticas dos itens dos carries" })
      .waitFor();
    await capture("06-overlay-detail-" + width);
    m = await layout();
    assert.ok(m.scroll <= m.client + 1 && m.broken === 0, JSON.stringify(m));
    await guide
      .getByRole("tab", { name: "Aprimoramentos", exact: true })
      .click();
    await guide
      .getByRole("heading", { name: "Aprimoramentos para esta build" })
      .waitFor();
    await capture("07-overlay-augments-" + width);
    await guide
      .getByRole("button", { name: "Todas as comps", exact: true })
      .click();
    checks.push(
      "native " +
        width +
        "px: current item stats, comparison cards, inspect items and augments without changing chosen comp",
    );
  }
  const before = await page.evaluate(() => window.zyon.getState());
  const target = before.saved.comps.find(
    (c) => c.pivot && c.id !== before.pinned,
  );
  await guide
    .getByRole("button", {
      name: "Usar composição " + target.name,
      exact: true,
    })
    .click();
  await wait(
    async () =>
      (await page.evaluate(() => window.zyon.getState())).pinned === target.id,
    "choose new comp",
  );
  const after = await page.evaluate(() => window.zyon.getState());
  assert.equal(after.gameSession.matchId, before.gameSession.matchId);
  assert.deepEqual(after.gameSession.copies, before.gameSession.copies);
  assert.deepEqual(errors, []);
  checks.push(
    "choosing from native list updates exact pinned comp and preserves match/copies",
  );
  await guide.getByRole('tab',{name:'Equipe',exact:true}).click();
  await guide.getByRole('button',{name:'Consultar nível 1',exact:true}).waitFor();
  const live=await page.evaluate(()=>window.zyon.getState());
  const catalog=Object.fromEntries(JSON.parse(await fs.readFile('src/generated/catalog.json','utf8')).champions.map(c=>[c.id,c]));
  for(let level=1;level<=10;level++) {
    await guide.getByRole('button',{name:`Consultar nível ${level}`,exact:true}).click();
    const plan=planForLevel(live.guideComp,catalog,{...live.gameSession.context,level});
    await guide.getByRole('heading',{name:`Equipe no nível ${level}`,exact:true}).waitFor();
    assert.deepEqual((await guide.locator('.game-team-info .game-unit').evaluateAll(nodes=>nodes.map(n=>n.dataset.unit))).sort(),[...plan.team.ids].sort());
    assert.equal(await guide.locator('.game-team-board .tft-hex.occupied').count(),plan.team.ids.length);
    assert.deepEqual((await page.evaluate(()=>window.zyon.getState())).gameSession,live.gameSession,'consulting levels must preserve the live session');
  }
  checks.push('all ten level previews match the real planner and preserve live level, gold, purchases and copies');
  await fs.writeFile(
    path.join(out, "overlay-checks.json"),
    JSON.stringify(
      {
        ok: true,
        checks,
        errors,
        realAccount: true,
        isolatedProfile: true,
        fixture: true,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, checks }));
} finally {
  if (page)
    await page
      .evaluate(() => window.zyon.socialAction({ type: "logout" }))
      .catch(() => {});
  await app?.close();
}


