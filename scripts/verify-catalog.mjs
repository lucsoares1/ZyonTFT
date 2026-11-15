import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const packaged = process.argv.includes("--packaged");
const evidence = path.resolve("design/review/0.10.0");
await fs.mkdir(evidence, { recursive: true });
const comps = JSON.parse(await fs.readFile("src/generated/comps.json", "utf8"));
const userData = path.resolve(".runtime", `catalog-${Date.now()}`);
await fs.mkdir(userData, { recursive: true });
const personal = {
  ...comps[0],
  style: "Personalizada",
  source: undefined,
  name: "Meu plano preservado",
};
await fs.writeFile(
  path.join(userData, "preferences-v1.json"),
  JSON.stringify({
    version: 2,
    dataRevision: "set18-18.6-r1",
    comps: [personal, ...comps.slice(1, 6)],
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
    () => document.querySelectorAll(".comp-row").length === 18,
  );
  await page
    .getByText("Meu plano preservado", { exact: true })
    .first()
    .waitFor();
  await page.locator(".catalog-sources summary").click();
  assert.match(
    await page.locator(".catalog-sources").innerText(),
    /não há sincronização automática/,
  );
  await page.locator(".catalog-sources summary").click();
  for (const level of [5, 6, 7]) {
    const style = `Slow roll · nível ${level}`;
    await page
      .getByLabel("Filtrar por estilo", { exact: true })
      .selectOption(style);
    assert.equal(
      await page.locator(".comp-row").count(),
      comps.filter((c) => c.style === style).length,
    );
  }
  await page
    .getByLabel("Filtrar por estilo", { exact: true })
    .selectOption("Todas");
  await page
    .getByLabel("Buscar comp ou campeão", { exact: true })
    .fill("Solar Yunara");
  assert.equal(await page.locator(".comp-row").count(), 1);
  await page.locator(".comp-row .comp-option").click();
  await page.getByRole("tab", { name: "Itens", exact: true }).click();
  assert.equal(await page.locator(".item-recipe").count(), 11);
  await page.getByRole("tab", { name: "Visão geral", exact: true }).click();
  await page.getByRole("button", { name: "Nível 6", exact: true }).click();
  await page.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.screenshot({
    path: path.join(evidence, `solar-yunara${packaged ? "-packaged" : ""}.png`),
  });
  await page.locator(".comp-row .row-pin").click();
  await page.locator(".overlay-toggle").click();
  let guide;
  for (let i = 0; i < 50 && !guide; i++) {
    guide = app.windows().find((p) => p.url().includes("guide"));
    if (!guide) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(guide, "native guide opens");
  await guide.getByText("Solar Yunara", { exact: true }).first().waitFor();
  const state = await page.evaluate(() => window.zyon.getState());
  assert.equal(state.guideComp.id, "s18-solar-yunara");
  assert.equal(state.guideComp.strategy.rerollStages[0].level, 6);
  await page.evaluate(() => window.zyon.setReader(false));
  await guide.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await guide.screenshot({
    path: path.join(
      evidence,
      `overlay-new-comp${packaged ? "-packaged" : ""}.png`,
    ),
  });
  await page.locator(".overlay-toggle").click();
  await page.getByLabel("Buscar comp ou campeão", { exact: true }).fill("");
  await page.locator(".comp-row.row-expanded .comp-option").click();
  await page
    .getByRole("button", { name: "Expandir Deadwood Execution", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: path.join(
      evidence,
      `catalog-expanded${packaged ? "-packaged" : ""}.png`,
    ),
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(evidence, `catalog${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      {
        passed: true,
        comps: 18,
        personalPlanPreserved: true,
        filters: [5, 6, 7],
        items: 11,
        nativeOverlay: true,
        autoSync: false,
        liveGameTest: false,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: 18 comps, personal plan migration, filters 5/6/7, 11 item recipes, native overlay, assets and source disclosure.",
  );
} finally {
  await app.close();
}
