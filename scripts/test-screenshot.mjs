import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { _electron as electron } from "playwright";
import { recognizeNames, matchShop } from "../src/shop.mjs";
const image = path.resolve(process.argv[2] || "");
if (!process.argv[2]) throw Error("Passe o caminho de uma captura PNG.");
const { stdout } = await promisify(execFile)(
  "powershell.exe",
  [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.resolve("electron/shop-reader.ps1"),
    "-ImagePath",
    image,
    "-Once",
    "-ShopFixture",
  ],
  { windowsHide: true, encoding: "utf8", timeout: 30000 },
);
const result = JSON.parse(stdout.trim());
if (result.error) throw Error(result.error);
const catalog = JSON.parse(
  await fs.readFile("src/generated/catalog.json", "utf8"),
).champions;
result.recognized = recognizeNames(result.slots, catalog);
result.selected = ["DA_Vi18", "DA_18_Alistar", "DA_Cinderling18"];
result.classifications = result.recognized.map((s, i) => ({
  ...s,
  kind: s.id
    ? "champion"
    : result.slots[i] === "Camelô"
      ? "special"
      : "unknown",
  label: result.slots[i],
}));
result.highlights = matchShop(result.recognized, result.selected).map(
  (s) => s.highlighted,
);
// Regression expectations for the exact user-provided screenshot; no hand-filled OCR values.
assert.deepEqual(result.slots, [
  "Vi",
  "Master Yi",
  "Alistar",
  "Rubrivirim",
  "Camelô",
]);
assert.deepEqual(result.highlights, [true, false, true, true, false]);
const data = await fs.readFile(image);
result.width = data.readUInt32BE(16);
result.height = data.readUInt32BE(20);
result.imagePath = image;
result.method = "Windows.Media.Ocr, five calibrated name crops, 2x scaling";
await fs.mkdir(".runtime", { recursive: true });
await fs.mkdir(".impeccable/review", { recursive: true });
const resultPath = path.resolve(".runtime/screenshot-result.json");
await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
await fs.writeFile(
  ".impeccable/review/ocr-result.json",
  JSON.stringify(result, null, 2),
);
const env = {
  ...process.env,
  ZYON_DEV_URL: "http://127.0.0.1:5199",
  ZYON_USER_DATA: path.resolve(".runtime", `capture-${Date.now()}`),
  ZYON_FIXTURE_IMAGE: image,
  ZYON_FIXTURE_RESULT: resultPath,
};
delete env.ELECTRON_RUN_AS_NODE;
if (process.env.ZYON_TEST_PRODUCTION) delete env.ZYON_DEV_URL;
const desktop = await electron.launch({ args: ["."], env });
try {
  const page = await desktop.firstWindow();
  page.setDefaultTimeout(15000);
  await page.goto(
    process.env.ZYON_TEST_PRODUCTION
      ? page.url().split("?")[0] + "?view=screenshot"
      : "http://127.0.0.1:5199/?view=screenshot",
  );
  await page.setViewportSize({ width: result.width, height: result.height });
  await page.locator(".screenshot-proof").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0),
  );
  assert.equal(await page.locator(".proof-badge").count(), 3);
  for (const slot of [1, 3, 4])
    assert.equal(
      await page
        .locator(`[data-slot="${slot}"]`)
        .getAttribute("data-highlighted"),
      "true",
    );
  for (const slot of [2, 5])
    assert.equal(
      await page
        .locator(`[data-slot="${slot}"]`)
        .getAttribute("data-highlighted"),
      "false",
    );
  await page.screenshot({
    path: path.resolve(".impeccable/review/sua-captura-com-badges.png"),
    fullPage: true,
  });
  console.log(
    JSON.stringify(
      {
        passed: true,
        raw: result.slots,
        highlights: result.highlights,
        image: ".impeccable/review/sua-captura-com-badges.png",
      },
      null,
      2,
    ),
  );
} finally {
  await desktop.close();
}
