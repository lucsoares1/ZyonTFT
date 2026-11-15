import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
import fallback from "../electron/level-fallback.cjs";
import gold from "../electron/gold-ocr.cjs";
const out = path.resolve("design/review/0.9.1");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(".runtime", { recursive: true });
const cfg = path.resolve(".runtime/gold-fixture.json");
await fs.writeFile(
  cfg,
  JSON.stringify({ goldRect: { x: 0.55, y: 0.15, width: 0.35, height: 0.75 } }),
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
    "design/references/18-gold-ocr.png",
    "-GoldFixture",
    "-ConfigPath",
    cfg,
  ],
  { windowsHide: true, timeout: 30000 },
);
const raw = JSON.parse(stdout.trim());
const text =
  gold.parseGold(raw.goldText) === null
    ? await fallback.readGoldImage(raw.goldImage)
    : raw.goldText;
await fallback.stopLevelWorker();
assert.equal(gold.parseGold(text), 8);
await fs.writeFile(
  path.join(out, "gold-user-8.json"),
  JSON.stringify(
    {
      realOcr: true,
      windowsText: raw.goldText,
      localFallbackText: text,
      parsed: 8,
    },
    null,
    2,
  ),
);
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `economy-${Date.now()}`),
  ZYON_OCR_FIXTURE: path.resolve("design/references/17-game-ocr.png"),
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
const errors = [];
async function waitState(page, predicate) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => window.zyon.getState());
    if (predicate(state)) return state;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("State did not reach expected condition");
}
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.locator(".overlay-toggle").click();
  await waitState(page, (s) => !!s.guideComp);
  const guide =
    app.windows().find((w) => w.url().includes("view=guide")) ||
    (await app.waitForEvent("window", (w) => w.url().includes("view=guide")));
  assert.equal(
    (await guide.evaluate(() => window.zyon.getState())).readerActive,
    true,
  );
  await waitState(
    guide,
    (s) =>
      s.goldReading.status === "confirmed" &&
      s.gameSession.context.gold === 18 &&
      s.gameSession.context.level === 7,
  );
  const actual = await guide.evaluate(() => window.zyon.getState());
  // Only the isolated test process substitutes sensor frames. Production has
  // no IPC endpoint or environment flag that can inject a purchase.
  await app.evaluate(({ app }) => {
    const req = process
      .getBuiltinModule("module")
      .createRequire(app.getAppPath() + "/package.json");
    const { PurchaseTracker } = req("./electron/purchase-tracker.cjs");
    const original = PurchaseTracker.prototype.observe;
    const slots = [
      "DA_Vi18",
      "DA_MasterYi18",
      "DA_Alistar18",
      "DA_18_Sentry",
      null,
    ];
    // Resolve by names so future catalog IDs cannot silently break this test.
    const { champions } = req("./src/generated/catalog.json");
    slots[0] = champions.find((c) => c.name === "Vi").id;
    slots[1] = champions.find((c) => c.name === "Master Yi").id;
    slots[2] = champions.find((c) => c.name === "Alistar").id;
    slots[3] = champions.find((c) => c.cost === 1).id;
    let n = 0;
    const epoch = Date.now();
    PurchaseTracker.prototype.observe = function (frame) {
      if (++n > 4) return original.call(this, frame);
      if (n === 1) this.reset();
      const after = n >= 3;
      return original.call(this, {
        ...frame,
        at: epoch + n * 1000,
        gold: after ? 16 : 18,
        slots: slots.map((s, i) => (after && i === 2 ? null : s)),
        empty: [false, false, after, false, true],
        clicks: n === 3 ? [{ slot: 2, at: epoch + 2500 }] : [],
      });
    };
  });
  await waitState(guide, (s) => s.gameSession.purchases.length === 1);
  const purchased = await guide.evaluate(() => window.zyon.getState());
  const id = purchased.gameSession.purchases[0].id;
  assert.equal(purchased.gameSession.context.copies[id], 1);
  await guide
    .locator(".game-last-purchase")
    .getByText(/Alistar/)
    .waitFor();
  await guide.evaluate(() => document.fonts.ready);
  await guide.screenshot({
    path: path.join(
      out,
      packaged ? "overlay-economy-packaged.png" : "overlay-economy.png",
    ),
    animations: "disabled",
  });
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();
  assert.equal(await guide.getByRole("button", { name: /ouro/i }).count(), 0);
  assert.equal(await guide.locator(".game-copies button").count(), 0);
  assert.equal(
    await guide.getByLabel("Ouro lido", { exact: true }).innerText(),
    "18",
  );
  await guide.screenshot({
    path: path.join(out, "partida-automatica.png"),
    animations: "disabled",
  });
  await guide.locator(".game-copy-correction summary").click();
  await guide
    .getByRole("button", { name: "Remover cópia de Alistar", exact: true })
    .click();
  await waitState(guide, (s) => s.gameSession.context.copies[id] === 0);
  await guide.locator(".game-copy-correction summary").click();
  assert.equal(await guide.locator(".game-copies button").count(), 0);
  await guide.getByRole("tab", { name: "Agora", exact: true }).click();
  assert.equal(await guide.locator(".game-priorities button").count(), 0);
  for (const name of ["Equipe", "Itens"]) {
    await guide.getByRole("tab", { name, exact: true }).click();
  }
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();
  for (const type of ["gold", "gold-mode"])
    assert.equal(
      await guide.evaluate(async (type) => {
        const s = await window.zyon.getState();
        return window.zyon.gameAction({
          compId: s.pinned,
          type,
          delta: 10,
          value: "manual",
        });
      }, type),
      false,
    );
  await guide.getByRole('button',{name:'Pausar OCR',exact:true}).click();
  await waitState(guide,s=>!s.readerActive);
  assert.equal(await guide.getByLabel('Ouro lido',{exact:true}).innerText(),'—');
  await guide.getByRole('button',{name:'Ler loja, nível e ouro',exact:true}).click();
  await waitState(guide,s=>s.goldReading.status==='confirmed');
  const spoof = await guide.evaluate(async () => {
    const s = await window.zyon.getState();
    return window.zyon.gameAction({
      compId: s.pinned,
      type: "purchase",
      id: "DA_18_Alune",
      at: Date.now(),
    });
  });
  assert.equal(spoof, false);
  await guide
    .getByRole("button", { name: "Nova partida", exact: true })
    .click();
  await guide
    .getByRole("button", { name: "Recomeçar no nível 2", exact: true })
    .click();
  const cleared = await guide.evaluate(() => window.zyon.getState());
  assert.deepEqual(cleared.gameSession.context.copies, {});
  assert.deepEqual(cleared.gameSession.purchases, []);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(out, packaged ? "economy-packaged.json" : "economy.json"),
    JSON.stringify(
      {
        passed: true,
        packaged,
        screenshotGold: actual.gameSession.context.gold,
        screenshotLevel: actual.gameSession.context.level,
        screenshotMatch: actual.gameSession.matchId,
        syntheticPurchase: id,
        copyCount: 1,
        automaticGoldOnly: true,
        automaticReaderStart: true,
        correctionCollapsedByDefault: true,
        resetClearsCopies: true,
        rendererCannotInjectPurchase: true,
        liveGameTested: false,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS real OCR gold 8 and 18, level 7, synthetic purchase -> main -> overlay, automatic UI, optional copy correction and reset",
  );
} finally {
  await app.close();
}
