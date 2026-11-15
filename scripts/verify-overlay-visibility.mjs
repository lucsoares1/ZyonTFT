import { _electron as electron } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const { version } = JSON.parse(await fs.readFile("package.json", "utf8"));
const packaged = process.argv.includes("--packaged");
const opening = process.argv.includes("--opening");
const out = path.resolve(`design/review/${version}/${opening ? "opening" : "visibility"}`);
await fs.mkdir(out, { recursive: true });
const profile = path.resolve(".runtime", `visibility-${Date.now()}`);
await fs.mkdir(profile, { recursive: true });
const presence = path.join(profile, "presence.json");
const setPresence = async (record) => {
  const temp = `${presence}.next`;
  await fs.writeFile(temp, JSON.stringify(record));
  await fs.rename(temp, presence);
};
const focused = {
  foreground: true,
  processName: opening ? "TFTClient-Win64-Shipping" : "League of Legends",
  matchId: "fixture-17",
};
await setPresence({ foreground: false });
const env = {
  ...process.env,
  ZYON_USER_DATA: profile,
  ZYON_PRESENCE_FIXTURE: presence,
  ZYON_OCR_FIXTURE: path.resolve(opening ? "design/references/35-game-level1-gold3.png" : "design/references/17-game-ocr.png"),
};
delete env.ZYON_OVERLAY_PREVIEW;
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
const checks = [];
const windows = () =>
  app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((w) => ({
      url: w.webContents.getURL(),
      visible: w.isVisible(),
      focusable: w.isFocusable(),
    })),
  );
try {
  const page = await app.firstWindow();
  page.setDefaultTimeout(45000);
  const waitState = async (predicate) => {
    const until = Date.now() + 45000;
    while (Date.now() < until) {
      const snapshot = await page.evaluate(() => window.zyon.getState());
      if (predicate(snapshot)) return snapshot;
      await page.waitForTimeout(100);
    }
    throw new Error("Expected native state was not reached");
  };
  await page
    .getByRole("heading", { name: "Composições", exact: true })
    .waitFor();
  await waitState((s) => !!s.pinned);
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).overlayVisible,
    false,
  );
  checks.push("desktop starts without overlays or a manual enable click");
  await setPresence(focused);
  await waitState(
    (s) => s.overlayVisible && s.goldReading.status === "confirmed",
  );
  const detected = await page.evaluate(() => window.zyon.getState());
  await fs.writeFile(
    path.join(out, "detected.json"),
    JSON.stringify(
      {
        context: detected.gameSession.context,
        gold: detected.goldReading,
        level: detected.levelReading,
        match: detected.gameSession.matchId,
      },
      null,
      2,
    ),
  );
  assert.equal(detected.gameSession.context.gold, opening ? 3 : 18);
  assert.equal(detected.gameSession.context.level, opening ? 1 : 7);
  assert.equal(detected.levelReading.status, "confirmed");
  assert.equal(detected.overlayPreview, false);
  assert.equal(detected.gameSession.levelMode,"ocr");
  assert.equal(await page.evaluate(async()=>{
    const s=await window.zyon.getState();
    return window.zyon.gameAction({type:"level",delta:1,compId:s.pinned});
  }),false,"production overlay rejects manual level changes");
  const guide = app.windows().find((w) => w.url().includes("view=guide"));
  assert.ok(guide);
  await guide.getByRole("tab", { name: "Agora", exact: true }).waitFor();
  await guide.waitForFunction(() =>
    [...document.images].every((i) => i.complete && i.naturalWidth > 0),
  );
  await guide.screenshot({
    path: path.join(out, `auto-start${packaged ? "-packaged" : ""}.png`),
  });
  assert.ok(
    (await windows())
      .filter((w) => w.url.includes("view="))
      .every((w) => w.visible && (w.url.includes("view=guide") ? w.focusable : !w.focusable)),
  );
  checks.push(
    `real screenshot OCR confirms level ${opening ? 1 : 7} / gold ${opening ? 3 : 18} and automatically shows both native windows for ${focused.processName}`,
  );
  const handles = await app.evaluate(({ BrowserWindow }) => {
    const all = BrowserWindow.getAllWindows();
    return Object.fromEntries(["guide", "main"].map((kind) => {
      const w = all.find((w) => kind === "guide" ? w.webContents.getURL().includes("view=guide") : !w.webContents.getURL().includes("view="));
      return [kind, w.getNativeWindowHandle().readBigUInt64LE().toString()];
    }));
  });
  await setPresence({foreground:false,foregroundWindow:handles.guide,matchId:"fixture-17"});
  const nativeFocused = await app.evaluate(({BrowserWindow}) => {
    const guide = BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes("view=guide"));
    guide.focus();
    return guide.isFocused();
  });
  assert.equal(nativeFocused,true,"the guide must actually accept native window focus");
  await waitState(s=>s.guideInteractive && s.overlayVisible);
  await guide.getByRole("tab", {name:"Itens",exact:true}).click();
  assert.equal((await page.evaluate(()=>window.zyon.getState())).gameSession.tab,"items");
  assert.equal((await page.evaluate(()=>window.zyon.getState())).goldReading.gold, opening ? 3 : 18);
  await setPresence({foreground:false,foregroundWindow:handles.main,matchId:"fixture-17"});
  await waitState(s=>!s.gameForeground && !s.overlayVisible);
  await setPresence(focused);
  await waitState(s=>s.gameForeground && s.overlayVisible);
  checks.push("native guide accepts focus and tab clicks without hiding or clearing HUD; focusing the main app hides both overlays");
  const copyId = detected.guideComp.champions[0];
  await page.evaluate(async (id) => {
    const s = await window.zyon.getState();
    await window.zyon.gameAction({
      type: "copies",
      id,
      delta: 1,
      compId: s.pinned,
    });
  }, copyId);
  const start = Date.now();
  await setPresence({ foreground: false, matchId: "fixture-17" });
  await waitState((s) => !s.gameForeground);
  assert.ok(
    (await windows())
      .filter((w) => w.url.includes("view="))
      .every((w) => !w.visible),
  );
  const hideMs = Date.now() - start;
  await page.waitForTimeout(2200);
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).overlayVisible,
    false,
  );
  assert.equal((await page.evaluate(()=>window.zyon.getState())).goldReading.gold, opening ? 3 : 18,"Alt+Tab retains the last confirmed gold");
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).gameSession.context
      .copies[copyId],
    1,
  );
  checks.push(
    `simulated Alt+Tab hides both windows (${hideMs}ms); delayed OCR cannot bring them back; copies retained`,
  );
  await setPresence(focused);
  await waitState((s) => s.overlayVisible);
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).gameSession.context
      .copies[copyId],
    1,
  );
  await page.evaluate(() => window.zyon.setOverlay(false));
  await page.waitForTimeout(2200);
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).overlayVisible,
    false,
  );
  checks.push(
    "returning to the same match resumes; manually hiding is respected despite further gold readings",
  );
  await setPresence({ foreground: false, endedMatchId: "fixture-17" });
  await waitState((s) => s.gameSession.matchId === null);
  assert.deepEqual(
    (await page.evaluate(() => window.zyon.getState())).gameSession.context
      .copies,
    {},
  );
  await setPresence({ ...focused, matchId: "different-game" });
  await page.waitForTimeout(2000);
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).overlayVisible,
    false,
  );
  assert.equal(
    (await page.evaluate(() => window.zyon.getState())).gameSession.matchId,
    "different-game",
  );
  checks.push(
    "end resets purchases; a new game cannot reuse old-game OCR to open an overlay",
  );
  assert.ok((await windows()).find((w) => !w.url.includes("view="))?.visible);
  await fs.writeFile(
    path.join(out, `checks${packaged ? "-packaged" : ""}.json`),
    JSON.stringify(
      {
        version,
        checks,
        note: "Gold/level use real screenshot OCR; foreground transitions are simulated in an isolated test transport. No live TFT match.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, checks }, null, 2));
} finally {
  await app.close();
}
