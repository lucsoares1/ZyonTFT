import { _electron as electron } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const packaged = process.argv.includes("--packaged");
const executablePath = path.resolve(
  packaged
    ? "release/win-unpacked/Zyon TFT.exe"
    : "node_modules/electron/dist/electron.exe",
);
const args = packaged ? [] : ["."];
const env = {
  ...process.env,
  ZYON_USER_DATA: path.resolve(".runtime", `single-instance-${Date.now()}`),
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const started = Date.now();
const app = await electron.launch({ executablePath, args, env });
let second;
try {
  const page = await app.firstWindow();
  await page
    .getByRole("heading", { name: /^(Composições|Bom ter você por aqui\.)$/ })
    .waitFor();
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isVisible(),
    ),
    true,
  );
  const readyMs = Date.now() - started;
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].minimize(),
  );
  for (let i = 0; i < 50; i++) {
    if (await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized())) break;
    await new Promise(r => setTimeout(r, 100));
  }
  second = spawn(executablePath, args, {
    env,
    windowsHide: true,
    stdio: "ignore",
  });
  const exit = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Duplicate process did not exit")),
      10000,
    );
    second.once("error", reject);
    second.once("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
  assert.equal(exit, 0);
  let restored = false;
  for (let i = 0; i < 50; i++) {
    restored = await app.evaluate(({ BrowserWindow }) => {
      const w = BrowserWindow.getAllWindows()[0];
      return w.isVisible() && !w.isMinimized();
    });
    if (restored) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!restored) console.log(await fs.readFile(path.join(env.ZYON_USER_DATA, 'startup.log'), 'utf8'), await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({visible:w.isVisible(), minimized:w.isMinimized()}))));
  assert.equal(restored, true);
  assert.equal(app.windows().length, 1);
  await fs.mkdir("design/review/startup", { recursive: true });
  const report = {
    passed: true,
    packaged,
    readyMs,
    duplicateExited: true,
    existingWindowRestored: true,
  };
  await fs.writeFile(
    `design/review/startup/${packaged ? "packaged" : "development"}-single-instance.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(report);
} finally {
  if (second?.exitCode === null) second.kill();
  await app.close();
}
