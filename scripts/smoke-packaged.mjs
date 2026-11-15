import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const env = {
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `packaged-${Date.now()}`),
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const app = await electron.launch({
  executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
  args: [],
  env,
});
try {
  const productionVersion = await app.evaluate(({ app }) => app.getVersion());
  assert.equal(productionVersion, "0.10.0");
  const page = await app.firstWindow();
  page.setDefaultTimeout(20000);
  await page.getByRole("heading", { name: "Composições" }).waitFor();
  assert.equal(await page.locator(".comp-row").count(), 18);
  await page.getByText("Set 18 · Patch 18.6", { exact: true }).waitFor();
  await page.waitForFunction(() =>
    Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
  );
  await page
    .locator(".shopping-aside")
    .getByRole("checkbox", { name: "Alune já comprado", exact: true })
    .click();
  assert.equal(await page.locator(".purchase-total strong").innerText(), "31");
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  await page.getByRole("button", { name: "Nível 7", exact: true }).click();
  await page.getByLabel("Ouro disponível", { exact: true }).fill("60");
  await page.locator(".level-reason summary").click();
  assert.match(await page.locator(".level-decision").innerText(), /1%/);
  assert.equal(
    await page.locator('.level-team-section [data-unit="DA_18_Alune"]').count(),
    0,
  );
  await page
    .getByRole("tablist", { name: "Detalhes da composição" })
    .getByRole("tab", { name: "Itens", exact: true })
    .click();
  assert.equal(await page.locator(".holder-recipes .item-recipe").count(), 9);
  assert.ok(
    page.url().startsWith("file:"),
    "Packaged app must use local production files",
  );
  assert.ok(
    await fs.stat(
      "release/win-unpacked/resources/app.asar.unpacked/electron/shop-reader.ps1",
    ),
  );
  await page.locator(".overlay-toggle").click();
  await page
    .getByRole("button", { name: "Overlay ativo", exact: false })
    .waitFor();
  await page.getByRole("button", { name: "Meu overlay", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".reader-status")
      ?.textContent.includes("Aguardando TFT em primeiro plano"),
  );
  await page
    .getByRole("button", { name: "Pausar leitura", exact: true })
    .click();
  assert.equal(app.windows().length, 3);
  const result = {
    passed: true,
    version: productionVersion,
    productionFiles: true,
    assetsLoaded: true,
    separateOverlay: true,
    packagedOcrProcess: true,
    detailedGuide: true,
    adaptiveLevelPlan: true,
    shoppingChecklist: true,
    gameTested: false,
  };
  await fs.writeFile(
    "design/review/0.8/packaged-check.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await app.close();
}

const preferencesPath = path.join(env.ZYON_USER_DATA, "preferences-v1.json");
const persisted = JSON.parse(await fs.readFile(preferencesPath, "utf8"));
assert.equal(persisted.version, 2);
assert.equal(persisted.levelContexts["s18-ap-exodia"].level, 7);
assert.equal(persisted.levelContexts["s18-ap-exodia"].gold, 60);
assert.ok(persisted.checklists["s18-ap-exodia"].includes("DA_18_Alune"));
persisted.opacity = 75;
await fs.writeFile(preferencesPath, JSON.stringify(persisted));
const reopened = await electron.launch({
  executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
  args: [],
  env,
});
try {
  const page = await reopened.firstWindow();
  page.setDefaultTimeout(20000);
  await page.getByRole("heading", { name: "Composições" }).waitFor();
  assert.equal(
    await page
      .getByRole("checkbox", { name: "Alune já comprado", exact: true })
      .getAttribute("aria-checked"),
    "true",
  );
  await page
    .getByRole("button", { name: "Expandir AP Exodia", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Nível 7", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(
    await page.getByLabel("Ouro disponível", { exact: true }).inputValue(),
    "60",
  );
  await page.getByRole("button", { name: "Meu overlay", exact: true }).click();
  assert.equal(
    await page.getByLabel("Opacidade", { exact: true }).inputValue(),
    "75",
    "Saved version 2 must survive a full process restart",
  );
  const result = JSON.parse(
    await fs.readFile("design/review/0.8/packaged-check.json", "utf8"),
  );
  result.version2PreferencesRestart = true;
  await fs.writeFile(
    "design/review/0.8/packaged-check.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    "PASS: packaged version 2 preferences restored after full restart.",
  );
} finally {
  await reopened.close();
}
