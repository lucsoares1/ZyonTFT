import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const packaged = process.argv.includes("--packaged");
const suffix = packaged ? "-packaged" : "";
const out = path.resolve(`design/review/${version}/details`);
await fs.mkdir(out, { recursive: true });
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `details-${Date.now()}`),
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const app = await electron.launch({
  ...(packaged
    ? {
        executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
        args: [],
      }
    : { args: ["."] }),
  env,
});
const reports = [],
  errors = [];
function inspect(root) {
  const issues = [];
  let equipped = 0;
  const r = (el) => el.getBoundingClientRect();
  const near = (a, b, label) => {
    if (Math.abs(a - b) > 1) issues.push({ type: label, a, b });
  };
  for (const unit of root.querySelectorAll(".lineup-unit")) {
    if (!unit.getClientRects().length) continue;
    const frame = unit.querySelector(".portrait-frame"),
      name = unit.querySelector(":scope > span"),
      equipment = unit.querySelector(".mini-equipment");
    if (r(frame).width > r(unit).width + 1)
      issues.push({ type: "portrait wider than unit" });
    near(
      r(frame).x + r(frame).width / 2,
      r(unit).x + r(unit).width / 2,
      "portrait center",
    );
    if (r(equipment).y < r(frame).bottom - 1)
      issues.push({ type: "portrait/items overlap" });
    if (r(name).y < r(equipment).bottom - 1)
      issues.push({ type: "items/name overlap" });
  }
  for (const hex of root.querySelectorAll(".tft-hex.occupied")) {
    if (!hex.getClientRects().length) continue;
    const items = hex.querySelector(".hex-equipment"),
      name = hex.querySelector(".hex-unit-name");
    if (!items?.children.length) continue;
    equipped++;
    if (r(items).width > r(hex).width + 1)
      issues.push({
        type: "hex items wider than cell",
        unit: hex.title,
        items: r(items).width,
        cell: r(hex).width,
      });
    if (r(name).bottom > r(items).y - 1)
      issues.push({ type: "hex name/items overlap", unit: hex.title });
    if (r(name).width > r(hex).width + 1)
      issues.push({ type: "hex name outside cell" });
    near(
      r(items).x + r(items).width / 2,
      r(hex).x + r(hex).width / 2,
      "hex items center",
    );
  }
  for (const el of root.querySelectorAll(
    ".pivot-guide,.guide-items-view,.holder-loadout,.guide-units-view,.pivot-augment-list,.pivot-route-main,.pivot-route-aside,.game-content",
  ))
    if (el.getClientRects().length && el.scrollWidth > el.clientWidth + 2)
      issues.push({
        type: "horizontal overflow",
        selector: el.className,
        width: el.clientWidth,
        content: el.scrollWidth,
      });
  return { equipped, issues };
}
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".comp-row").length > 60,
  );
  await page.locator(".comp-row").first().locator(".comp-option").click();
  for (const width of [1536, 1050]) {
    await app.evaluate(
      ({ BrowserWindow }, w) =>
        BrowserWindow.getAllWindows()[0].setSize(w, 1000),
      width,
    );
    for (const tab of [
      "Visão geral",
      "Itens",
      "Unidades",
      "Progressão",
      "Aprimoramentos",
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page.locator(".comp-guide").scrollIntoViewIfNeeded();
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      );
      const report = await page.locator(".comp-guide").evaluate(inspect);
      reports.push({ surface: "app", width, tab, ...report });
      await page.screenshot({
        path: path.join(out, `${width}-${tab}${suffix}.png`),
      });
      if (tab === "Visão geral")
        await page
          .locator(".comp-guide .tft-board-panel")
          .first()
          .screenshot({ path: path.join(out, `board-${width}${suffix}.png`) });
    }
  }
  // Check the planner's wider board with the same equipped comp.
  await page.getByRole("button", { name: "Planejador", exact: true }).click();
  await page.locator(".planner-board .tft-board-panel").waitFor();
  reports.push({
    surface: "planner",
    ...(await page.locator(".planner-board").evaluate(inspect)),
  });
  await page
    .locator(".planner-board .tft-board-panel")
    .screenshot({ path: path.join(out, `planner-board${suffix}.png`) });
  await page.getByRole("button", { name: "Composições", exact: true }).click();
  await page.locator(".overlay-toggle").click();
  let guide;
  for (let i = 0; i < 60 && !guide; i++) {
    guide = app.windows().find((w) => w.url().includes("guide"));
    if (!guide) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(guide);
  guide.on("pageerror", (e) => errors.push(e.message));
  await guide.getByRole("tab", { name: "Agora", exact: true }).waitFor();
  await page.evaluate(() => window.zyon.setReader(false));
  for (const tab of [
    "Agora",
    "Equipe",
    "Roteiro",
    "Itens",
    "Aprim.",
    "Partida",
  ]) {
    await guide.getByRole("tab", { name: tab, exact: true }).click();
    if (tab === "Equipe")
      await guide
        .getByRole("button", { name: "Equipe final", exact: true })
        .click();
    if (tab === "Roteiro") {
      await guide.getByRole("button", { name: "Final", exact: true }).click();
      if (await guide.locator(".pivot-board-disclosure summary").count())
        await guide.locator(".pivot-board-disclosure summary").click();
    }
    await guide.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    const report = await guide.locator(".game-guide").evaluate(inspect);
    reports.push({ surface: "overlay", width: 440, tab, ...report });
    await guide.screenshot({
      path: path.join(out, `overlay-${tab}${suffix}.png`),
    });
    if (tab === "Equipe")
      await guide
        .locator(".tft-board-panel")
        .screenshot({ path: path.join(out, `overlay-board${suffix}.png`) });
  }
  await fs.writeFile(
    path.join(out, `report${suffix}.json`),
    JSON.stringify({ reports, errors }, null, 2),
  );
  assert.deepEqual(
    reports.flatMap((r) =>
      r.issues.map((issue) => ({ ...issue, surface: r.surface, tab: r.tab })),
    ),
    [],
  );
  assert.ok(
    reports.filter((r) => r.surface === "overlay").some((r) => r.equipped >= 3),
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, reports }, null, 2));
} finally {
  await app.close();
}
