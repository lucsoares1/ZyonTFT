import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseLevel } from "../electron/level-ocr.cjs";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const out = path.resolve(`design/review/${version}/ocr-session`);
await fs.mkdir(out, { recursive: true });
const original =
  "C:/Users/Lucas/AppData/Local/Temp/codex-clipboard-06cec95f-e012-49a9-ad16-ddbdf6421102.png";
const fullFixture = path.resolve("design/references/17-game-ocr.png");
try {
  await fs.access(fullFixture);
} catch {
  await fs.copyFile(original, fullFixture);
}
const cfg = path.resolve(".runtime/level-fixture.json");
await fs.mkdir(".runtime", { recursive: true });
await fs.writeFile(
  cfg,
  JSON.stringify({ levelRect: { x: 0, y: 0, width: 0.6, height: 0.32 } }),
);
const { stdout } = await promisify(execFile)(
  "powershell.exe",
  [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    "electron/shop-reader.ps1",
    "-ImagePath",
    "design/references/16-level-ocr.png",
    "-LevelFixture",
    "-ConfigPath",
    cfg,
  ],
  { windowsHide: true, timeout: 30000 },
);
const sample = JSON.parse(stdout.trim());
assert.equal(parseLevel(sample.levelText), 8);
await fs.writeFile(
  path.join(out, "ocr-user-level-8.json"),
  JSON.stringify({ ...sample, parsedLevel: 8, realOcr: true }, null, 2),
);
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `game-guide-${Date.now()}`),
  ZYON_OCR_FIXTURE: fullFixture,
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const packaged = process.argv.includes("--packaged");
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
        args: [],
      }
    : { args: ["."] }),
  env,
});
const checks = [],
  errors = [];
const waitState = async (page, condition) => page.waitForFunction(condition);
const waitSnapshot = async (page, predicate) => {
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){const s=await page.evaluate(()=>window.zyon.getState());if(predicate(s))return s;await page.waitForTimeout(100);}
  throw Error("Expected OCR state not reached");
};
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  await page.getByRole("button", { name: "Nível 9", exact: true }).click();
  const pin = page.getByRole("button", {
    name: "Fixar AP Exodia",
    exact: true,
  });
  if (await pin.count()) await pin.click();
  await page.locator(".overlay-toggle").click();
  await waitSnapshot(page,s=>!!s.guideComp);
  for (let i = 0; i < 100 && app.windows().length < 3; i++)
    await new Promise((r) => setTimeout(r, 100));
  const guide = app.windows().find((w) => w.url().includes("view=guide"));
  const badges = app.windows().find((w) => w.url().includes("view=overlay"));
  assert.ok(guide && badges);
  await page.evaluate(() => window.zyon.setReader(false));
  guide.setDefaultTimeout(20000);
  guide.on("pageerror", (e) => errors.push(e.message));
  const ready = async () => {
    await guide.evaluate(() => document.fonts.ready);
    await guide.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
  };
  const capture = async (name) => {
    await ready();
    await guide.screenshot({
      path: path.join(out, name),
      omitBackground: true,
    });
  };
  await guide
    .getByRole("heading", { name: "Coloque sua primeira unidade em campo", exact: true })
    .waitFor();
  assert.equal(await guide.locator(".game-level b").innerText(), "—");
  await capture("overlay-inicio.png");
  checks.push("initial plan starts at level 1; HUD waits for actual OCR instead of displaying a manual level");
  assert.equal(await guide.locator(".game-priorities button").count(), 0);
  await guide.locator(".game-reason summary").click();
  assert.match(
    await guide.locator(".game-reason").innerText(),
    /não gaste.*rerolls/i,
  );
  await guide.locator(".game-reason summary").click();
  checks.push("priorities are read-only and decision explanation expands");
  const windowFacts = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((w) => ({
      url: w.webContents.getURL(),
      focusable: w.isFocusable(),
      bounds: w.getBounds(),
    })),
  );
  assert.ok(
    windowFacts
      .filter((w) => w.url.includes("?view="))
      .every((w) => w.url.includes("view=guide") ? w.focusable : !w.focusable),
  );
  const bounds = windowFacts.find((w) => w.url.includes("view=guide")).bounds;
  const bgBounds = windowFacts.find((w) =>
    w.url.includes("view=overlay"),
  ).bounds;
  assert.ok(bounds.y + bounds.height < bgBounds.y + bgBounds.height * 0.858);
  await guide
    .getByRole("button", { name: "Recolher guia", exact: true })
    .click();
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("view=guide"))
          .getBounds().height,
    ),
    160,
  );
  await capture("overlay-recolhido.png");
  await guide
    .getByRole("button", { name: "Expandir guia", exact: true })
    .click();
  await guide.getByRole("button", { name: "Trocar lado do painel" }).click();
  assert.ok(
    (await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()
          .find((w) => w.webContents.getURL().includes("view=guide"))
          .getBounds().x,
    )) > bounds.x,
  );
  await guide.getByRole("button", { name: "Trocar lado do painel" }).click();
  checks.push(
    "interactive guide, click-through badges, shop clearance, native collapse and side switch",
  );
  await guide
    .getByRole("button", { name: "Ler loja, nível e ouro", exact: true })
    .click();
  await waitState(
    guide,
    () =>
      document.querySelector(".game-level b")?.textContent === "7" &&
      document
        .querySelector(".game-level-status")
        ?.textContent.includes("confirmado"),
  );
  await waitSnapshot(guide,s=>s.goldReading.status==="confirmed");
  const detected = await guide.evaluate(() => window.zyon.getState());
  assert.equal(detected.gameSession.context.level, 7);
  assert.equal(detected.gameSession.context.gold, 18);
  assert.equal(detected.gameSession.goldMode, "ocr");
  assert.equal(detected.levelReading.status, "confirmed");
  assert.ok(
    !(await guide.locator('.game-buy [data-unit="DA_18_Alune"]').count()),
  );
  await capture("overlay-nivel-7-ocr.png");
  checks.push(
    "real screenshot through PowerShell capture, local fallback, two-frame filter, IPC and guide reaches 7",
  );
  await guide.getByRole("tab", { name: "Equipe", exact: true }).click();
  await capture("overlay-equipe.png");
  assert.equal(await guide.locator(".native-board-panel .tft-hex").count(), 28);
  await guide
    .getByRole("button", { name: "Equipe final", exact: true })
    .click();
  assert.equal(await guide.locator(".occupied").count(), 9);
  await guide.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.equal(
    await guide.locator(".item-recipe").count(),
    Object.values(detected.guideComp.items).flat().length,
  );
  await capture("overlay-itens.png");
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();

  await guide
    .getByRole("button", { name: "Perdendo forte", exact: true })
    .click();
  await guide.getByRole("tab", { name: "Agora", exact: true }).click();
  assert.match(await guide.locator(".game-decision").innerText(), /Estabilize/);
  assert.equal(await guide.getByRole("button",{name:/Aumentar nível da partida|Diminuir nível da partida|Usar nível manual/}).count(),0);
  await new Promise((r) => setTimeout(r, 2200));
  assert.equal(await guide.locator(".game-level b").innerText(), "7");
  checks.push(
    "level remains automatic across all tabs and weak-board decision; no manual level controls",
  );
  // A lower level is not applied mid-match; reset is the explicit fresh-match boundary.
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();
  await guide
    .getByRole("button", { name: "Nova partida", exact: true })
    .click();
  await guide
    .getByRole("button", { name: "Recomeçar no nível 1", exact: true })
    .click();
  await waitState(
    guide,
    () => document.querySelector(".game-level b")?.textContent === "7",
  );
  await guide.getByRole("button", { name: "Pausar OCR", exact: true }).click();
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();

  await guide.locator(".game-copy-correction summary").click();
  await guide
    .getByRole("button", { name: "Adicionar cópia de Alune", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  const persisted = await guide.evaluate(() => window.zyon.getState());
  assert.equal(persisted.gameSession.context.gold, 18);
  assert.equal(persisted.gameSession.context.copies.DA_18_Alune, 1);
  assert.equal(persisted.saved.levelContexts["s18-ap-exodia"].level, 9);
  checks.push(
    "app/reader publications and reload do not overwrite game context or copies",
  );
  await guide.getByRole("tab", { name: "Agora", exact: true }).click();
  await capture("overlay-transicao.png");
  const firstBuy = await guide
    .locator(".game-buy [data-unit]")
    .first()
    .getAttribute("data-unit");
  await page.evaluate(async (id) => {
    const state = await window.zyon.getState();
    await window.zyon.publish({
      ...state,
      slots: [id, { id, confidence: 0.1 }, null, null, null],
    });
  }, firstBuy);
  await badges.getByRole("img",{name:"Zyon: Comprar agora",exact:true}).waitFor();
  assert.equal(await badges.locator(".shop-badge").count(), 1);
  assert.equal(
    await badges.evaluate(async () => {
      const s = await window.zyon.getState();
      return window.zyon.gameAction({
        type: "level",
        delta: 1,
        compId: s.pinned,
      });
    }),
    false,
  );
  checks.push(
    "current-level purchase badge, low-confidence suppression and badge renderer cannot edit game",
  );
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();
  await capture("overlay-partida.png");
  await guide.getByRole("tab", { name: "Equipe", exact: true }).click();
  await guide.setViewportSize({ width: 340, height: 420 });
  assert.ok(
    await guide.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await guide.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.ok(
    await guide.evaluate(
      () =>
        document.querySelector(".game-content").scrollHeight >
        document.querySelector(".game-content").clientHeight,
    ),
  );
  checks.push("short and narrow guide retains tabs and scrolls content");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(
      out,
      packaged ? "game-guide-packaged.json" : "game-guide-checks.json",
    ),
    JSON.stringify(
      {
        passed: true,
        checks,
        errors,
        realScreenshotOcr: true,
        liveGameTested: false,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS",
    checks.length,
    "game guide flows",
    packaged ? "packaged" : "development",
  );
} finally {
  await app.close();
}
const saved = JSON.parse(
  await fs.readFile(
    path.join(env.ZYON_USER_DATA, "preferences-v1.json"),
    "utf8",
  ),
);
assert.equal(saved.gameSession.context.level, 7);
assert.equal(saved.gameSession.context.gold, 18);
const reopened = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
        args: [],
      }
    : { args: ["."] }),
  env,
});
try {
  const page = await reopened.firstWindow();
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await waitSnapshot(page,s=>!!s.guideComp);
  const restored = await page.evaluate(() => window.zyon.getState());
  assert.equal(restored.gameSession.context.level, 7);
  assert.equal(restored.gameSession.context.gold, 18);
  assert.equal(restored.gameSession.context.copies.DA_18_Alune, 1);
  assert.equal(restored.gameSession.levelMode, "ocr");
  assert.equal(restored.readerActive, false);
  const reportPath = path.join(
    out,
    packaged ? "game-guide-packaged.json" : "game-guide-checks.json",
  );
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  report.fullProcessRestart = true;
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log("PASS game session survives a full process restart");
} finally {
  await reopened.close();
}
