import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const out = path.resolve(`design/review/${version}`);
await fs.mkdir(out, { recursive: true });
const env = {
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `alignment-${Date.now()}`),
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
const reports = [];
const errors = [];
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".comp-row").length > 60,
  );
  for (const width of [1536, 1050]) {
    await app.evaluate(
      ({ BrowserWindow }, width) =>
        BrowserWindow.getAllWindows()[0].setSize(width, 1000),
      width,
    );
    for (const mode of ["compact", "expanded", "stars-expanded"]) {
      const expanded = mode !== "compact";
      const open = page.locator(".row-expanded .row-expand");
      if (await open.count()) await open.click();
      const first = page
        .locator(".comp-row")
        .nth(mode === "stars-expanded" ? 1 : 0);
      if (
        (await first.locator(".comp-option").getAttribute("aria-expanded")) !==
        String(expanded)
      )
        await first.locator(".row-expand").click();
      await page.waitForFunction(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      );
      const report = await page.locator(".comp-row").evaluateAll((rows) =>
        rows.map((row) => {
          const rect = (el) => {
            const r = el.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
              cx: r.x + r.width / 2,
              cy: r.y + r.height / 2,
              right: r.right,
            };
          };
          const issues = [];
          const near = (a, b, label) => {
            if (Math.abs(a - b) > 1) issues.push(`${label}: ${a} != ${b}`);
          };
          const summary = rect(row.querySelector(".comp-row-summary"));
          const units = [
            ...row.querySelectorAll(".comp-row-summary .lineup-unit"),
          ];
          for (const unit of units) {
            const portrait = rect(unit.querySelector(".portrait-frame"));
            const items = unit.querySelectorAll(".mini-equipment img");
            if (items.length) {
              const a = rect(items[0]),
                z = rect(items[items.length - 1]);
              if (a.x < portrait.x - 1 || z.right > portrait.right + 1)
                issues.push("items outside portrait");
            }
            const stars = unit.querySelector(".unit-stars");
            if (stars) near(rect(stars).cx, portrait.cx, "stars center");
          }
          const core = row.querySelector(".ranked-core .portrait-frame"),
            flex = row.querySelector(".ranked-flex .portrait-frame");
          if (core && flex) near(rect(core).y, rect(flex).y, "core/flex top");
          for (const btn of row.querySelectorAll(".row-controls button")) {
            const b = rect(btn),
              s = rect(btn.querySelector("svg"));
            near(b.cx, s.cx, "button x");
            near(b.cy, s.cy, "button y");
            if (b.right > summary.right + 1) issues.push("control overflow");
          }
          const header = rect(row.querySelector(".comp-row-title"));
          const body = rect(row.querySelector(".ranked-body"));
          near(header.x, body.x, "header/body left");
          near(header.w, body.w, "header/body width");
          const lines = new Map();
          for (const unit of units) {
            const y = rect(unit.querySelector(".portrait-frame")).y;
            const name = rect(unit.querySelector(":scope > span"));
            if (lines.has(y)) near(name.y, lines.get(y), "name baseline");
            else lines.set(y, name.y);
          }
          const badge = rect(row.querySelector(".rank-marker"));
          const copy = rect(row.querySelector(".comp-heading-copy"));
          near(badge.cy, copy.cy, "header center");
          return { id: row.dataset.compId, issues };
        }),
      );
      const issues = report.filter((r) => r.issues.length);
      reports.push({ width, mode, cards: report.length, issues });
      await page.locator(".tier-section").first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(
          out,
          `alignment-${width}-${mode}${packaged ? "-packaged" : ""}.png`,
        ),
      });
      if (mode === "compact" && width === 1536) {
        const a = await page.locator(".comp-row").nth(0).boundingBox();
        const b = await page.locator(".comp-row").nth(1).boundingBox();
        await page.screenshot({
          path: path.join(
            out,
            `cards-detail${packaged ? "-packaged" : ""}.png`,
          ),
          clip: {
            x: a.x,
            y: a.y,
            width: a.width,
            height: b.y + b.height - a.y,
          },
        });
      }
      assert.deepEqual(issues, [], `Alignment ${width} expanded=${expanded}`);
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(out, `alignment${packaged ? "-packaged" : ""}.json`),
    JSON.stringify({ reports, errors }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, reports }, null, 2));
} finally {
  await app.close();
}
