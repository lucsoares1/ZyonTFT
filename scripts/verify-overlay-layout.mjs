import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const packaged = process.argv.includes("--packaged");
const suffix = packaged ? "-packaged" : "";
const out = path.resolve(`design/review/${version}/overlay`);
await fs.mkdir(out, { recursive: true });
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `overlay-layout-${Date.now()}`),
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
const checks = [],
  errors = [];
try {
  const page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".comp-row").length > 60,
  );
  const row = page
    .locator(".comp-row")
    .filter({ has: page.getByText("Lunar Kayle", { exact: true }) });
  await row.locator(".row-pin").click();
  await page.locator(".overlay-toggle").click();
  let guide;
  for (let i = 0; i < 60 && !guide; i++) {
    guide = app.windows().find((w) => w.url().includes("view=guide"));
    if (!guide) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(guide);
  guide.on("pageerror", (e) => errors.push(e.message));
  await guide.getByRole("tab", { name: "Agora", exact: true }).waitFor();
  await page.evaluate(() => window.zyon.setReader(false));
  const ready = async () => {
    await guide.evaluate(() => document.fonts.ready);
    await guide.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
  };
  const capture = async (name) => {
    await ready();
    await guide.screenshot({
      path: path.join(out, `${name}${suffix}.png`),
      omitBackground: true,
    });
  };
  const facts = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()
      .filter((w) => w.webContents.getURL().includes("view="))
      .map((w) => ({
        url: w.webContents.getURL(),
        bounds: w.getBounds(),
        focusable: w.isFocusable(),
      })),
  );
  const bounds = facts.find((w) => w.url.includes("guide")).bounds;
  const screen = facts.find((w) => w.url.includes("overlay")).bounds;
  assert.ok(
    bounds.width <= 840 &&
      bounds.x >= screen.x &&
      bounds.x + bounds.width <= screen.x + screen.width,
  );
  assert.ok(bounds.y + bounds.height < screen.y + screen.height * 0.858);
  assert.ok(facts.every((w) => w.url.includes("view=guide") ? w.focusable : !w.focusable));
  checks.push("guide is interactive, badges remain click-through, panel stays inside display and above OCR/shop");
  const state = await guide.evaluate(() => window.zyon.getState());
  const comp = state.guideComp;
  const expected =
    comp.champions.length +
    (comp.pivot?.upgrades.filter((id) => !comp.champions.includes(id)).length ||
      0);
  assert.equal(
    await guide.locator(".overlay-roster .lineup-unit").count(),
    expected,
  );
  const inspect = async () => {
    const issues = await guide.locator(".overlay-roster").evaluate((root) => {
      const b = root.getBoundingClientRect(),
        problems = [];
      for (const el of root.querySelectorAll(".lineup-unit")) {
        const r = el.getBoundingClientRect();
        if (r.left < b.left - 1 || r.right > b.right + 1)
          problems.push("unit outside roster");
        const items = el
          .querySelector(".mini-equipment .equipment")
          .getBoundingClientRect();
        const p = el.querySelector(".portrait-frame").getBoundingClientRect();
        if (items.width > p.width + 1) problems.push("items outside portrait");
      }
      const heading = root.closest(".game-heading").getBoundingClientRect();
      if (b.top < heading.top || b.bottom > heading.bottom)
        problems.push("roster outside heading");
      return problems;
    });
    assert.deepEqual(issues, []);
  };
  await ready();
  await inspect();
  await guide.evaluate(async () => {
    const s = await window.zyon.getState();
    await window.zyon.gameAction({
      type: "copies",
      id: s.guideComp.champions[0],
      delta: 2,
      compId: s.pinned,
    });
  });
  const before = await guide.evaluate(() => window.zyon.getState());
  await guide
    .getByRole("button", { name: "Recolher guia", exact: true })
    .click();
  await guide.waitForFunction(() => document.querySelector(".game-collapsed"));
  await guide.waitForFunction(() => innerHeight === 160);
  await guide.waitForFunction(() => innerWidth >= 480 && innerWidth <= 640);
  await inspect();
  await capture("collapsed");
  const after = await guide.evaluate(() => window.zyon.getState());
  assert.deepEqual(after.gameSession.context, before.gameSession.context);
  assert.equal(
    await guide.locator(".overlay-roster .lineup-unit").count(),
    expected,
  );
  checks.push(
    `collapsed roster shows all ${expected} units, targets, items, names and keeps session`,
  );
  await guide
    .getByRole("button", { name: "Expandir guia", exact: true })
    .click();
  await guide.getByRole("tab", { name: "Agora", exact: true }).waitFor();
  await guide.waitForFunction(() => innerWidth === 840);
  await capture("start");
  await guide.evaluate(async () => {
    const s = await window.zyon.getState();
    await window.zyon.gameAction({ type: "level", delta: 6-s.gameSession.context.level, compId: s.pinned });
  });
  for (const tab of [
    "Equipe",
    "Agora",
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
    if (tab === "Agora")
      assert.ok(
        (await guide.locator(".game-now-layout .tft-hex.occupied").count()) <=
          6,
        "Agora never inherits final-team preview",
      );
    if (tab === "Roteiro")
      await guide
        .locator(".pivot-step-heading strong")
        .filter({ hasText: /Nível 6/ })
        .waitFor();
    await capture(tab);
    assert.equal(
      await guide
        .locator(".game-content")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
      `${tab} horizontal overflow`,
    );
  }
  checks.push(
    "all six tabs render without horizontal overflow; Agora keeps current-level board after viewing final team",
  );
  const current = await guide.evaluate(() => window.zyon.getState());
  await guide
    .getByRole("button", { name: "Trocar lado do painel", exact: true })
    .click();
  const side = await guide.evaluate(() => window.zyon.getState());
  assert.notEqual(current.gameSession.side, side.gameSession.side);
  assert.deepEqual(current.gameSession.context, side.gameSession.context);
  checks.push("side switch preserves resources and copies");
  await guide.getByRole("button", { name: "Recolher guia", exact: true }).click();
  const largest = await page.evaluate(async () => {
    const s = await window.zyon.getState();
    const size = c => c.champions.length + (c.pivot?.upgrades?.filter(id=>!c.champions.includes(id)).length || 0);
    return [...s.saved.comps].sort((a,b)=>size(b)-size(a)).slice(0,5);
  });
  for (const candidate of largest) {
    await page.evaluate(async c => {
      const s = await window.zyon.getState();
      await window.zyon.publish({...s,pinned:c.id,guideComp:c});
    },candidate);
    await guide.waitForFunction(name=>document.querySelector(".game-heading h1")?.textContent===name,candidate.name);
    await inspect();
  }
  await capture("largest-collapsed");
  checks.push("five largest rosters fit the adaptive compact width without clipping any portrait or item");
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(out, `checks${suffix}.json`),
    JSON.stringify({ version, checks, bounds, errors }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, checks, bounds }, null, 2));
} finally {
  await app.close();
}
