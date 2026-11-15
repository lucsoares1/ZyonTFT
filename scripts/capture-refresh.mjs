import { _electron as electron } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

// Actual renderer screenshots, with an isolated demo session.
const out = path.resolve("design/review/0.8");
await fs.mkdir(out, { recursive: true });
const env = { ...process.env, ZYON_USER_DATA: path.resolve(".runtime", `refresh-${Date.now()}`) };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const app = await electron.launch({ args: ["."], env });
const ready = async page => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
};
try {
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 1200));
  await page.getByRole("heading", { name: "Composições", exact: true }).waitFor();
  await page.getByRole("button", { name: "Expandir AP Exodia", exact: true }).click();
  await page.getByRole("button", { name: "Nível 7", exact: true }).click();
  await ready(page);
  await page.screenshot({ path: path.join(out, "workspace-expanded.png"), animations: "disabled" });
  await page.locator(".overlay-toggle").click();
  await page.waitForFunction(async () => (await window.zyon.getState()).overlayVisible);
  const guide = app.windows().find(w => w.url().includes("view=guide")) || await app.waitForEvent("window", { predicate: w => w.url().includes("view=guide") });
  await guide.getByRole("heading", { name: "Monte sua primeira equipe", exact: true }).waitFor();
  for (let i = 0; i < 5; i++) await guide.getByRole("button", { name: "Aumentar nível da partida", exact: true }).click();
  await guide.getByRole("tab", { name: "Partida", exact: true }).click();
  for (let i = 0; i < 5; i++) await guide.getByRole("button", { name: "Adicionar 10 de ouro", exact: true }).click();
  await guide.getByRole("tab", { name: "Agora", exact: true }).click();
  await ready(guide);
  await guide.screenshot({ path: path.join(out, "overlay-focus.png"), omitBackground: true, animations: "disabled" });
  console.log("Captured workspace-expanded.png and overlay-focus.png from Electron");
} finally { await app.close(); }
