import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { _electron } from "playwright";

const projectRoot = process.cwd();
const output = path.resolve("design/review/reference-2026-11-17");
const credentials = JSON.parse(
  await fs.readFile(".runtime/duo-live-credentials.json", "utf8"),
);
const environment = {
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime/interface-design-" + Date.now()),
  ZYON_TEST_BACKGROUND: "1",
  ZYON_OVERLAY_PREVIEW: "1",
  ZYON_OCR_FIXTURE: path.resolve("design/references/17-game-ocr.png"),
};
for (const key of ["ELECTRON_RUN_AS_NODE", "ZYON_DEV_URL"])
  delete environment[key];

const errors = [];
const checks = [];
const captures = [];
let application;
let mainPage;
await fs.mkdir(output, { recursive: true });

async function capture(page, name) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((image) => {
          const bounds = image.getBoundingClientRect();
          return bounds.top < innerHeight && bounds.bottom > 0;
        })
        .map((image) => image.decode().catch(() => {})),
    );
  });
  const encoded = await application.evaluate(
    async ({ BrowserWindow }, url) => {
      const window = BrowserWindow.getAllWindows().find(
        (candidate) => candidate.webContents.getURL() === url,
      );
      window.showInactive();
      try {
        await window.webContents.executeJavaScript(
          "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
        );
        await new Promise((resolve) => setTimeout(resolve, 180));
        return (await window.webContents.capturePage()).toPNG().toString("base64");
      } finally {
        window.hide();
      }
    },
    page.url(),
  );
  const destination = path.join(output, name + ".png");
  await fs.writeFile(destination, Buffer.from(encoded, "base64"));
  captures.push(destination);
}

async function resize(page, width, height, native = false) {
  await application.evaluate(
    ({ BrowserWindow, screen }, { url, width, height, native }) => {
      if (native) {
        const current = screen.getPrimaryDisplay();
        const display = {
          ...current,
          bounds: { ...current.bounds, width: width + 24 },
          workArea: { ...current.workArea, width: width + 24 },
        };
        screen.getPrimaryDisplay = () => display;
        screen.getAllDisplays = () => [display];
      }
      BrowserWindow.getAllWindows()
        .find((candidate) => candidate.webContents.getURL() === url)
        .setBounds({ x: 20, y: 20, width, height });
    },
    { url: page.url(), width, height, native },
  );
  await page.waitForFunction((width) => innerWidth === width, width);
}

async function verifyLayout(page, label) {
  const layout = await page.evaluate(() => {
    const content = document.querySelector(".game-content") || document.documentElement;
    return {
      width: content.clientWidth,
      scroll: content.scrollWidth,
      brokenImages: [...content.querySelectorAll("img")].filter(
        (image) => image.complete && !image.naturalWidth,
      ).length,
    };
  });
  assert.ok(layout.scroll <= layout.width + 1, label + " overflows horizontally");
  assert.equal(layout.brokenImages, 0, label + " has broken images");
  checks.push({ label, ...layout });
}

try {
  application = await _electron.launch({ args: [projectRoot], env: environment });
  await application.evaluate(({ app, BrowserWindow }) => {
    const quiet = (window) => {
      window.setOpacity(0);
      window.setIgnoreMouseEvents(true);
      window.setAlwaysOnTop(false);
      window.webContents.setBackgroundThrottling(false);
    };
    BrowserWindow.getAllWindows().forEach(quiet);
    app.on("browser-window-created", (_, window) => quiet(window));
  });
  mainPage = await application.firstWindow();
  mainPage.on("pageerror", (error) => errors.push(error.message));
  await mainPage.getByRole("textbox", { name: "E-mail da conta Zyon", exact: true }).fill(credentials[2].email);
  await mainPage.getByLabel("Senha da conta Zyon", { exact: true }).fill(credentials[2].password);
  await mainPage.getByRole("button", { name: "Entrar no Zyon", exact: true }).click();
  await mainPage.getByRole("heading", { name: "Composições", exact: true }).waitFor();

  const composition = mainPage.locator('[data-comp-id="s18-pivot-blossom-ahri-fast-9"]');
  for (const width of process.env.ZYON_POSITION_ONLY ? [] : process.env.ZYON_VERIFY_WIDTH ? [Number(process.env.ZYON_VERIFY_WIDTH)] : [1672, 1536, 1050]) {
    await resize(mainPage, width, width === 1672 ? 941 : width === 1536 ? 1000 : 820);
    await mainPage.evaluate(() => {
      for (const element of document.querySelectorAll(".comp-feed,.main-shell,.workspace-content"))
        element.scrollTop = 0;
    });
    for (const selector of [".zy-plan-dock-trigger>span", ".sidebar-bottom>button>span", ".sidebar-profile>div:nth-child(2)"])
      for (const label of await mainPage.locator(selector).all())
        assert.ok(await label.isVisible(), "sidebar label visible at " + width + ": " + selector + " " + await label.evaluate(element=>JSON.stringify([element,...[element.parentElement,element.parentElement.parentElement]].map(node=>({class:node.className,display:getComputedStyle(node).display,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height})))));
    await capture(mainPage, "main-library-" + width);
    await mainPage.getByRole("button", { name: "Opções da biblioteca", exact: true }).click();
    const filters = mainPage.locator("#zy-library-options:popover-open");
    await filters.waitFor();
    const filterBounds = await filters.boundingBox();
    assert.ok(filterBounds.x >= 0 && filterBounds.x + filterBounds.width <= width);
    await filters.getByLabel("Classificação", { exact: true }).selectOption("A");
    assert.equal(await mainPage.locator(".tier-section").count(), 1);
    await capture(mainPage, "main-filters-" + width);
    await filters.getByRole("button", { name: "Limpar busca e filtros", exact: true }).click();
    const material = await composition.evaluate((element) => {
      const face = element.querySelector(".zy-compact-face");
      const cardStyle = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      const artBounds = face.querySelector(".zy-reference-art").getBoundingClientRect();
      const faceBounds = face.getBoundingClientRect();
      return {
        background: cardStyle.backgroundImage,
        shadow: cardStyle.boxShadow,
        height: face.getBoundingClientRect().height,
        artHeight: artBounds.height,
        artInset: artBounds.top - faceBounds.top,
        clipped: [...face.querySelectorAll(".portrait-frame,.zy-comp-disclosure")].some((control) => {
          const controlBounds = control.getBoundingClientRect();
          return controlBounds.left < bounds.left - 1 || controlBounds.right > bounds.right + 1;
        }),
      };
    });
    assert.ok(material.background.startsWith("linear-gradient"));
    assert.equal(material.shadow, "none");
    assert.ok(material.height <= 185);
    assert.ok(Math.abs(material.artHeight-material.height) <= 1, "carry artwork fills the card height");
    assert.ok(Math.abs(material.artInset) <= 1, "carry artwork is flush with the card top");
    if (width === 1050) assert.ok(material.height <= 132, "compact horizontal card geometry");
    assert.equal(material.clipped, false);
    const rowHeights = await mainPage.locator('.tier-section[data-tier="S"] .zy-reference-face').evaluateAll(elements=>elements.slice(0,3).map(element=>element.getBoundingClientRect().height));
    assert.ok(Math.max(...rowHeights)-Math.min(...rowHeights)<=1, "uniform S-tier card heights at " + width + ": " + rowHeights);
    checks.push({ label: "main compact card " + width, ...material });
    await composition.getByRole("button", { name: "Expandir Blossom Ahri Fast 9", exact: true }).click();
    const explorer = composition.locator(".zy-plan-explorer");
    await explorer.waitFor();
    await explorer.scrollIntoViewIfNeeded();
    await capture(mainPage, "main-summary-" + width);
    assert.equal(await explorer.locator(".tft-hex").count(), 28);
    await explorer.locator(".zy-plan-priority").scrollIntoViewIfNeeded();
    await capture(mainPage, "main-priority-" + width);
    await explorer.getByRole("button", { name: "Níveis", exact: true }).click();
    await explorer.getByRole("button", { name: "Final", exact: true }).click();
    await verifyLayout(mainPage, "main levels " + width);
    await capture(mainPage, "main-levels-" + width);
    await composition.getByRole("button", { name: "Recolher Blossom Ahri Fast 9", exact: true }).click();
  }

  await resize(mainPage, 1536, 1000);
  for (const [name, selector, filename] of process.env.ZYON_POSITION_ONLY ? [] : [
    ["Planejador", ".studio-board", "planner"],
    ["Banco de dados", ".champion-performance-table", "database"],
    ["Duplas Dinâmicas", ".social-panel", "duo"],
    ["Preferências", ".settings-layout", "settings"],
  ]) {
    await mainPage.getByRole("button", { name, exact: true }).click();
    await mainPage.locator(selector).waitFor();
    await capture(mainPage, "main-" + filename);
    await verifyLayout(mainPage, name);
  }

  await mainPage.evaluate(() => window.zyon.setOverlay(true));
  await mainPage.waitForFunction(async () => {
    const state = await window.zyon.getState();
    return state.gameSession.matchId && state.levelReading.status === "confirmed";
  }, null, { timeout: 45000 });
  await mainPage.evaluate(() => window.zyon.setReader(false));
  await mainPage.waitForFunction(async () => (await window.zyon.getState()).guideComp);
  const guide = await application.waitForEvent("window", {
    predicate: (page) => page.url().includes("view=guide"),
    timeout: 1000,
  }).catch(() => application.windows().find((page) => page.url().includes("view=guide")));
  assert.ok(guide, "native overlay exists");
  guide.on("pageerror", (error) => errors.push(error.message));

  for (const width of [840, 640]) {
    await resize(guide, width, 800, true);
    await guide.getByRole("tab", { name: "Equipe", exact: true }).click();
    if (process.env.ZYON_POSITION_ONLY) {
      await guide.getByRole('button', {name:'Equipe final',exact:true}).click();
      assert.equal(await guide.locator('.game-team-board .tft-hex').count(),28);
      await capture(guide,'overlay-position-final-'+width);
      await verifyLayout(guide,'overlay final positioning '+width);
      continue;
    }
    const before = await mainPage.evaluate(() => window.zyon.getState());
    await guide.getByRole("button", { name: "Consultar nível 8", exact: true }).click();
    await capture(guide, "overlay-team-" + width);
    await verifyLayout(guide, "overlay team " + width);
    const board=await guide.locator('.game-team-board>.native-board-panel').boundingBox();
    const footer=await guide.locator('.game-footer').boundingBox();
    assert.ok(board.y+board.height<=footer.y+1, 'entire28hex board fits the initial team viewport at '+width+': '+JSON.stringify({board,footer}));
    assert.deepEqual((await mainPage.evaluate(() => window.zyon.getState())).gameSession, before.gameSession);
    const workspace = await guide.locator('.game-content').boundingBox();
    assert.ok(workspace.height >= 540, "redesigned overlay prioritizes content height at " + width);
    await guide.getByRole('button', {name:'Ver equipe', exact:true}).click();
    await guide.getByRole('region', {name:'Composição completa fixada', exact:true}).waitFor();
    await capture(guide, 'overlay-roster-open-' + width);
    await guide.getByRole('button', {name:'Ocultar equipe', exact:true}).click();
    for (const [name, filename] of [['Agora','now'],['Planejar','planner'],['Roteiro','route'],['Itens','plan-items'],['Aprim.','augments'],['Partida','match']]) {
      await guide.getByRole('tab', {name, exact:true}).click();
      await capture(guide, 'overlay-' + filename + '-' + width);
      await verifyLayout(guide, 'overlay ' + filename + ' ' + width);
    }
    await guide.getByRole('tab', {name:'Equipe', exact:true}).focus();
    await guide.keyboard.press('ArrowDown');
    assert.equal(await guide.getByRole('tab', {name:'Planejar', exact:true}).getAttribute('aria-selected'),'true');
    await guide.getByRole("button", { name: "Trocar composição no overlay", exact: true }).click();
    await guide.locator(".overlay-comp-option .zy-compact-face").first().waitFor();
    const artwork = await guide.locator('.overlay-comp-option .zy-reference-face').first().evaluate(element=>{
      const card=element.getBoundingClientRect(),art=element.querySelector('.zy-reference-art').getBoundingClientRect();
      return {height:card.height,artHeight:art.height,inset:art.top-card.top};
    });
    assert.ok(Math.abs(artwork.height-artwork.artHeight)<=1&&Math.abs(artwork.inset)<=1,'native artwork fills continuous card at '+width+': '+JSON.stringify(artwork));
    await capture(guide, "overlay-library-" + width);
    await verifyLayout(guide, "overlay library " + width);
    await guide.locator('[data-comp="s18-pivot-blossom-ahri-fast-9"] .zy-comp-disclosure').click();
    const explorer = guide.locator(".zy-plan-explorer");
    await explorer.waitFor();
    await capture(guide, "overlay-summary-" + width);
    await verifyLayout(guide, "overlay summary " + width);
    assert.equal(await explorer.locator(".tft-hex").count(), 28);
    await guide.getByRole("tab", { name: "Itens dos carries", exact: true }).click();
    await guide.getByRole("region", { name: "Estatísticas dos itens dos carries" }).waitFor();
    await capture(guide, "overlay-items-" + width);
    await guide.getByRole("button", { name: "Recolher Blossom Ahri Fast 9", exact: true }).click();
    await guide.locator('.overlay-comp-search input').fill('zzzz-inexistente');
    await guide.locator('.overlay-comp-empty').waitFor();
    await capture(guide, 'overlay-search-empty-' + width);
    await guide.locator('.overlay-comp-search input').fill('');
    await guide.getByRole('button', {name:'Recolher guia',exact:true}).click();
    await guide.locator('.game-collapsed').waitFor();
    await capture(guide, 'overlay-collapsed-' + width);
    await verifyLayout(guide, 'overlay collapsed ' + width);
    await guide.getByRole('button', {name:'Expandir guia',exact:true}).click();
    await guide.locator('.zy-overlay-workspace').waitFor();
    await guide.getByRole('button', {name:'Encolher painel e manter avisos da loja',exact:true}).click();
    await guide.locator('.game-shop-only').waitFor();
    await capture(guide, 'overlay-shop-only-' + width);
    await verifyLayout(guide, 'overlay shop only ' + width);
    await guide.getByRole('button', {name:'Expandir painel do overlay',exact:true}).click();
    await guide.locator('.zy-overlay-workspace').waitFor();
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, process.env.ZYON_POSITION_ONLY?'position-checks.json':"checks.json"), JSON.stringify({ ok: true, checks, captures, errors, isolatedProfile: true, ocrFixture: true }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, screenshots: captures.length, output }));
} finally {
  if (mainPage)
    await mainPage.evaluate(() => window.zyon.socialAction({ type: "logout" })).catch(() => {});
  await application?.close();
}
