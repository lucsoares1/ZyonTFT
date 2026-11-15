import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { buildCompSections } from "../src/comp-tiers.mjs";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const packaged = process.argv.includes("--packaged");
const out = path.resolve(`design/review/${version}`);
await fs.mkdir(out, { recursive: true });
const userData = path.resolve(".runtime", `pivot-${Date.now()}`);
await fs.mkdir(userData, { recursive: true });
const old = JSON.parse(await fs.readFile("src/generated/comps.json", "utf8"));
const personal = {
  ...old[0],
  style: "Personalizada",
  source: undefined,
  name: "Meu plano preservado",
};
await fs.writeFile(
  path.join(userData, "preferences-v1.json"),
  JSON.stringify({
    version: 2,
    dataRevision: "old",
    comps: [personal, ...old.slice(1)],
    active: personal.id,
    pinned: personal.id,
    selected: personal.champions,
    opacity: 92,
  }),
);
const env = {
  ZYON_OVERLAY_PREVIEW: "1",
  ...process.env,
  ZYON_USER_DATA: userData,
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
const errors = [];
let guide;
const suffix = packaged ? "-packaged" : "";
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1536, 1000),
  );
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.waitForFunction(
    async () =>
      ((await window.zyon.getState()).saved?.comps?.length || 0) === 80,
  );
  const snapshot = await page.evaluate(() => window.zyon.getState());
  assert.equal(snapshot.saved.comps.length, 80);
  assert.ok(
    snapshot.saved.comps.some((c) => c.name === "Meu plano preservado"),
  );
  const expectedCards = buildCompSections(snapshot.saved.comps).reduce(
    (n, s) => n + s.comps.length,
    0,
  );
  await page.waitForFunction(
    (expected) => document.querySelectorAll(".comp-row").length === expected,
    expectedCards,
  );
  assert.deepEqual(
    await page
      .locator(".tier-section")
      .evaluateAll((sections) => sections.map((s) => s.dataset.tier)),
    ["S", "A", "B", "C", "X", "legacy", "personal"],
  );
  assert.equal(
    await page.locator('.tier-section[data-tier="S"] .comp-row').count(),
    3,
  );
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: path.join(out, `tier-library${suffix}.png`) });
  await page.getByLabel("Filtrar por tier", { exact: true }).selectOption("B");
  assert.ok((await page.locator(".comp-row").count()) > 0);
  assert.deepEqual(
    await page
      .locator(".comp-row")
      .evaluateAll((rows) => [...new Set(rows.map((r) => r.dataset.tier))]),
    ["B"],
  );
  await page
    .getByLabel("Filtrar por tier", { exact: true })
    .selectOption("Todas");
  await page
    .getByLabel("Buscar comp ou campeão", { exact: true })
    .fill("Ashe Fast 9");
  await page
    .locator(".comp-row")
    .filter({ has: page.getByText("Ashe Fast 9", { exact: true }) })
    .locator(".comp-option")
    .click();
  await page
    .locator(".pivot-builds button")
    .filter({ hasText: "Juggernaut" })
    .waitFor();
  await page.locator(".pivot-levels button").filter({ hasText: /^8$/ }).click();
  await page.getByText("Trocas desta etapa", { exact: true }).first().waitFor();
  assert.match(
    await page.locator(".pivot-step-detail").first().innerText(),
    /Sejuani/,
  );
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({ path: path.join(out, `pivot-level-8${suffix}.png`) });
  await page.locator(".row-expanded .row-pin").click();
  await page.locator(".overlay-toggle").click();
  for (let i = 0; i < 50 && !guide; i++) {
    guide = app.windows().find((w) => w.url().includes("guide"));
    if (!guide) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(guide);
  guide.on("pageerror", (e) => errors.push(e.message));
  await guide.getByRole("tab", { name: "Agora", exact: true }).waitFor();
  await page.evaluate(() => window.zyon.setReader(false));
  await guide.evaluate(async () => {
    const s = await window.zyon.getState();
    await window.zyon.gameAction({ type: "level", delta: 4, compId: s.pinned });
    await window.zyon.gameAction({
      type: "copies",
      delta: 1,
      id: "DA_Taric18",
      compId: s.pinned,
    });
  });
  await guide.getByRole("tab", { name: "Roteiro", exact: true }).click();
  await guide
    .locator(".pivot-step-heading strong")
    .filter({ hasText: /^Nível 6$/ })
    .waitFor();
  await guide.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await guide.screenshot({
    path: path.join(out, `overlay-pivot-route${suffix}.png`),
  });
  await guide
    .locator(".pivot-builds button")
    .filter({ hasText: "Elder Dragon" })
    .click();
  let switched;
  for (let n = 0; n < 60; n++) {
    switched = await guide.evaluate(() => window.zyon.getState());
    if (switched.guideComp?.name === "Ashe Elder Dragon Fast 9") break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(switched.guideComp.name, "Ashe Elder Dragon Fast 9");
  assert.equal(switched.gameSession.context.level, 6);
  assert.equal(switched.gameSession.context.copies.DA_Taric18, 1);
  await guide.getByRole("tab", { name: "Aprim.", exact: true }).click();
  await guide.locator(".pivot-augment-list>div").first().waitFor();
  assert.ok((await guide.locator(".pivot-augment-list>div").count()) >= 5);
  await guide.screenshot({
    path: path.join(out, `overlay-pivot-augments${suffix}.png`),
  });
  await page.evaluate(() => window.zyon.setOverlay(false));
  await page.getByRole("tab", { name: "Aprimoramentos", exact: true }).click();
  await page.locator(".row-expanded .comp-guide").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(out, `pivot-augments${suffix}.png`),
  });
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  await page.locator(".row-expanded .comp-option").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, `pivot-builds${suffix}.png`) });
  await page
    .locator(".pivot-builds button")
    .filter({ hasText: "Juggernaut" })
    .click();
  await page.locator('.row-expanded[data-tier="B"]').waitFor();
  const selectedRow = await page
    .locator(".row-expanded .comp-row-summary")
    .boundingBox();
  assert.ok(
    selectedRow && selectedRow.y >= 0 && selectedRow.y < 800,
    "selected cross-tier build follows into view",
  );
  await page.screenshot({
    path: path.join(out, `tier-variant-navigation${suffix}.png`),
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1536, 1400),
  );
  await page.locator(".row-expanded .comp-option").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(out, `pivot-overview${suffix}.png`),
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1536, 1000),
  );
  const live = await page.evaluate(() => window.zyon.refreshCatalog(true));
  assert.equal(live.snapshot.comps.length, 62);
  assert.equal(live.error, null);
  const groupedCards = await page.locator(".comp-row").count();
  await page
    .getByRole("button", { name: "Banco de dados", exact: true })
    .click();
  await page.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.equal(await page.locator(".data-table tbody tr").count(), 146);
  assert.ok((await page.locator(".pivot-tier").count()) > 100);
  await page.getByRole("tab", { name: "Aprimoramentos", exact: true }).click();
  assert.equal(await page.locator(".pivot-augment-list>div").count(), 252);
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({
    path: path.join(out, `pivot-tier-lists${suffix}.png`),
  });
  await page
    .getByLabel("Buscar no catálogo", { exact: true })
    .fill("Novo Nível");
  assert.ok((await page.locator(".pivot-augment-list>div").count()) >= 1);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(out, `pivot-checks${suffix}.json`),
    JSON.stringify(
      {
        version,
        builds: 80,
        pivot: 62,
        groupedCards,
        liveFetch: live.snapshot.fetchedAt,
        checks: [
          "migration + personal plans",
          "family grouping",
          "ordered tier sections, filter, exact variant rank and shields",
          "cross-tier selection follows into view",
          "source level 8 swaps",
          "native OCR-level route",
          "build switch retains match + copies",
          "augments in app + overlay",
          "live Pivot fetch + validation",
          "146 item tiers + 252 augments, searchable",
          "all rendered image assets",
          "no renderer errors",
        ],
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "Pivot UI: migration, source route, native tabs, build switching, live refresh and assets passed.",
  );
} finally {
  await app.close();
}
