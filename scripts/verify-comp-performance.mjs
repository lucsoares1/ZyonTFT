import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { _electron } from "playwright";
const users = JSON.parse(
    await fs.readFile(".runtime/duo-live-credentials.json", "utf8"),
  ),
  out = path.resolve("design/review/0.17.28/stats"),
  profile = path.resolve(".runtime/comp-stats-" + Date.now());
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
  await page.evaluate(() => document.fonts.ready);
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
  const first = page.locator('[data-comp-id="s18-pivot-blossom-ahri-fast-9"]');
  await first.locator(".comp-performance").waitFor();
  for (const [w, h] of [
    [1536, 1000],
    [1050, 820],
  ]) {
    await size(w, h);
    await first.scrollIntoViewIfNeeded();
    const m = await page.locator(".comp-row-summary").evaluateAll((rows) =>
      rows.map((row) => {
        const box = row.getBoundingClientRect(),
          decision = row
            .querySelector(".comp-row-decision")
            .getBoundingClientRect(),
          units = [...row.querySelectorAll(".zy-compact-roster .portrait-frame")].map((e) =>
            e.getBoundingClientRect(),
          );
        return {
          width: box.width,
          client: row.clientWidth,
          scroll: row.scrollWidth,
          overlap: units.some(
            (r) =>
              r.left < decision.right &&
              r.right > decision.left &&
              r.top < decision.bottom &&
              r.bottom > decision.top,
          ),
          decisionOutside: decision.right > box.right + 1,
          broken: [...row.querySelectorAll("img")].filter(
            (i) => i.complete && !i.naturalWidth,
          ).length,
        };
      }),
    );
    assert.ok(
      m.every(
        (r) =>
          r.scroll <= r.client + 1 &&
          !r.overlap &&
          !r.decisionOutside &&
          r.broken === 0,
      ),
      JSON.stringify(
        m.filter(
          (r) =>
            r.scroll > r.client + 1 ||
            r.overlap ||
            r.decisionOutside ||
            r.broken,
        ),
      ),
    );
    metrics.push({ width: w, rows: m.length });
    await capture("01-cards-" + w);
  }
  await first.locator(".row-augment-preview button").first().click();
  await first
    .getByRole("heading", { name: "Aprimoramentos para esta build" })
    .waitFor();
  await capture("02-augments");
  checks.push("compact augment icons open exact comp augment tab");
  await first.getByRole("tab", { name: "Itens", exact: true }).click();
  const builds = first.getByRole("region", {
    name: "Estatísticas dos itens dos carries",
  });
  await builds.waitFor();
  await builds.scrollIntoViewIfNeeded();
  assert.ok((await builds.locator(".carry-build-group").count()) >= 2);
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".carry-build-statistics img")].every(
      (i) => i.complete && i.naturalWidth,
    ),
  );
  await capture("03-carry-items-1050");
  await size(1536, 1000);
  await builds.scrollIntoViewIfNeeded();
  await capture("03-carry-items-1536");
  checks.push(
    "Ahri and Ashe use exact champion triples, real samples, local item icons and explicit all-comps scope",
  );
  const pin = first.locator(".row-pin");
  if ((await pin.getAttribute("aria-pressed")) === "true") await pin.click();
  await first
    .getByRole("button", { name: "Fixar Blossom Ahri Fast 9", exact: true })
    .click();
  assert.equal(
    await first
      .getByRole("button", {
        name: "Desafixar Blossom Ahri Fast 9",
        exact: true,
      })
      .getAttribute("aria-pressed"),
    "true",
  );
  checks.push("choose/fix and expand controls keep behavior");
  const actual = await page.evaluate(() => window.zyon.getState());
  assert.equal(actual.saved.pinned, "s18-pivot-blossom-ahri-fast-9");
  assert.ok(
    actual.saved.comps.find((c) => c.id === actual.saved.pinned).pivot
      .statistics.performance.games >= 100,
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(out, "checks.json"),
    JSON.stringify(
      {
        ok: true,
        metrics,
        checks,
        errors,
        isolatedProfile: true,
        realAccount: true,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, metrics, checks }));
} finally {
  if (page)
    await page
      .evaluate(() => window.zyon.socialAction({ type: "logout" }))
      .catch(() => {});
  await app?.close();
}

