import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
const userData = path.resolve(".runtime", `startup-${Date.now()}`);
await fs.mkdir(userData, { recursive: true });
await fs.copyFile(
  path.join(process.env.APPDATA, "zyon-tft/preferences-v1.json"),
  path.join(userData, "preferences-v1.json"),
);
const env = { ...process.env, ZYON_USER_DATA: userData };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const started = Date.now();
const app = await electron.launch({
  executablePath: path.resolve("release/win-unpacked/Zyon TFT.exe"),
  args: [],
  env,
});
const errors = [];
try {
  const page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor({ timeout: 20000 });
  for (let i = 0; i < 50; i++) {
    if (
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isVisible(),
      )
    )
      break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const result = {
    readyMs: Date.now() - started,
    errors,
    ...(await app.evaluate(({ app, BrowserWindow }) => ({
      version: app.getVersion(),
      windows: BrowserWindow.getAllWindows().map((w) => ({
        visible: w.isVisible(),
        minimized: w.isMinimized(),
        bounds: w.getBounds(),
        loading: w.webContents.isLoading(),
      })),
    }))),
  };
  await fs.mkdir("design/review/startup", { recursive: true });
  await page.screenshot({
    path: "design/review/startup/cloned-profile.png",
    animations: "disabled",
  });
  await fs.writeFile(
    "design/review/startup/cloned-profile.json",
    JSON.stringify(result, null, 2),
  );
  console.log(result);
} finally {
  await app.close();
}
