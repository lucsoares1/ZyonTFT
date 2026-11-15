const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  shell,
  dialog,
  safeStorage,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const readline = require("node:readline");
const {
  freshSession,
  normalizeSession,
  changeSession,
} = require("./game-session.cjs");
const {
  parseLevel,
  freshReading,
  pauseLevelReading,
  acceptReading,
  defaultLevelRect,
  validLevelRect,
} = require("./level-ocr.cjs");
const {
  readLevelImage,
  readGoldImage,
  stopLevelWorker,
} = require("./level-fallback.cjs");
const {
  parseGold,
  freshGoldReading,
  pauseGoldReading,
  acceptGold,
  defaultGoldRect,
} = require("./gold-ocr.cjs");
const { PurchaseTracker } = require("./purchase-tracker.cjs");
const {SocialService}=require('./social-service.cjs');
const {UpdateService}=require('./update-service.cjs');
let planTools,socialService,updateService;
const { champions } = require("../src/generated/catalog.json");
const championById=Object.fromEntries(champions.map(c=>[c.id,c]));
const shopModule = import("../src/shop.mjs");
const purchases = new PurchaseTracker(champions);
const {MatchEndTracker}=require("./match-end.cjs");
const matchEnd=new MatchEndTracker();
const { OverlayGate } = require("./overlay-visibility.cjs");
const overlayGate = new OverlayGate();
const overlayPreview = !!(
  process.env.ZYON_USER_DATA && process.env.ZYON_OVERLAY_PREVIEW === "1"
);
let presenceProcess, presenceTimer, presenceWatchdog;
let lastPresence = 0,
  focusBoundaryAt = 0;
let readerSuppressed = false;
let hudQueue = Promise.resolve();
let readerEpoch = 0;
let sessionEpoch = 0;
let sessionBoundaryAt = 0;
let levelJob = 0,
  levelBusy = false;
let mainWindow,
  overlayWindow,
  guideWindow,
  readerProcess,
  staleTimer,
  saveTimer;
let overlayEnabled = false;
let state = {
  slots: [],
  selected: [],
  overlayPlans: {},
  opacity: 92,
  pinned: null,
  source: "demo",
  compact: false,
  overlayPreview,
  gameForeground: false,
  gameSession: freshSession(),
  levelReading: freshReading(),
  goldReading: freshGoldReading(),
  rect: { x: 0.2295, y: 0.858, width: 0.53, height: 0.139 },
};
let lastCapture = 0;
let lastOverlayVisibilityReason = null;
let quitting = false;
const devUrl = process.env.ZYON_DEV_URL;
const settingsFile = () =>
  path.join(app.getPath("userData"), "preferences-v1.json");
// NSIS relaunches through Explorer, which drops test environment variables.
// An explicit adjacent fixture keeps integration restarts out of personal data.
if(app.isPackaged){
  const installation=path.dirname(app.getPath('exe')),runtime=path.dirname(installation);
  if(path.basename(runtime)==='.runtime')try{
    const fixture=JSON.parse(fs.readFileSync(path.join(runtime,`${path.basename(installation)}.test.json`),'utf8'));
    if(fixture.enabled===true&&path.dirname(path.resolve(fixture.userData))===runtime){
      process.env.ZYON_USER_DATA=path.resolve(fixture.userData);process.env.ZYON_UPDATE_TEST='1';process.env.ZYON_TEST_UPDATE_URL=fixture.feed;
    }
  }catch{/* Only explicitly configured, local test installations use fixtures. */}
}
if (process.env.ZYON_USER_DATA) {
  fs.mkdirSync(process.env.ZYON_USER_DATA, { recursive: true });
  app.setPath("userData", process.env.ZYON_USER_DATA);
}
// Reopening the executable restores the existing window instead of starting
// competing renderer/overlay processes against the same preferences.
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
function showMainWindow(attempt = 0) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  // Windows may still be animating the minimize when a second launch arrives.
  // A restore issued during that transition can be ignored by the window manager.
  if (attempt < 10)
    setTimeout(() => {
      if (
        mainWindow &&
        !mainWindow.isDestroyed() &&
        (mainWindow.isMinimized() || !mainWindow.isVisible())
      )
        showMainWindow(attempt + 1);
    }, 150).unref();
}
app.on("second-instance", () => {
  startupLog("Second instance: restoring main window");
  showMainWindow();
});
app.on("activate", () => showMainWindow());
function startupLog(message) {
  try {
    const logPath = path.join(app.getPath("userData"), "startup.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 131072)
      fs.writeFileSync(logPath, "");
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`);
  } catch {
    /* Logging must not prevent startup. */
  }
}
function validRect(r) {
  return (
    r &&
    ["x", "y", "width", "height"].every((k) => Number.isFinite(r[k])) &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.width >= 0.2 &&
    r.height >= 0.02 &&
    r.x + r.width <= 1.001 &&
    r.y + r.height <= 1.001
  );
}
function mainSender(event) {
  return mainWindow && event.sender === mainWindow.webContents;
}
function broadcast() {
  for (const window of [overlayWindow, guideWindow])
    if (window && !window.isDestroyed())
      window.webContents.send("state:update", state);
}
function save() {
  if (!state.saved) return;
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(state.saved, null, 2));
  } catch (error) {
    console.error("Preferences:", error.message);
  }
}
function applyWorkingPlan(){
  const base=state.baseGuideComp;
  state.guideComp=planTools.effectiveComp(base,state.overlayPlans?.[state.pinned],championById);
  if(state.overlayPlans?.[state.pinned])state.selected=state.guideComp?.champions||[];
}
function loadWindow(window, view = "") {
  if (devUrl) window.loadURL(devUrl + (view ? `/?view=${view}` : ""));
  else
    window.loadFile(
      path.join(__dirname, "../dist/index.html"),
      view ? { query: { view } } : {},
    );
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const link = new URL(url);
      if (
        link.protocol === "https:" &&
        link.hostname === "mobalytics.gg" &&
        link.pathname.startsWith("/tft/comps-guide/")
      )
        shell.openExternal(url);
    } catch {}
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    const allowed = devUrl
      ? url.startsWith(devUrl + "/")
      : url.startsWith("file:");
    if (!allowed) event.preventDefault();
  });
}
function chosenDisplay() {
  return (
    screen.getAllDisplays().find((d) => d.id === state.displayId) ||
    screen.getPrimaryDisplay()
  );
}
function guideBounds() {
  const b = chosenDisplay().bounds;
  const comp = state.guideComp;
  const count = (comp?.champions?.length || 0) +
    (comp?.pivot?.upgrades?.filter(id => !comp.champions.includes(id)).length || 0);
  const compactWidth = Math.min(640, Math.max(480, count * 45 + 48));
  const width = Math.min(state.gameSession.collapsed ? compactWidth : 840, b.width - 24);
  const y = 64;
  const levelRect = validLevelRect(state.levelRect)
    ? state.levelRect
    : defaultLevelRect(state.rect);
  const safeTop = Math.min(state.rect?.y || 0.858, levelRect.y);
  const available = Math.max(180, Math.floor(b.height * safeTop) - y - 16);
  return {
    x: b.x + (state.gameSession.side === "right" ? b.width - width - 12 : 12),
    y: b.y + y,
    width,
    height: state.gameSession.collapsed ? 160 : Math.min(800, available),
  };
}
function positionGuide() {
  if (guideWindow && !guideWindow.isDestroyed())
    guideWindow.setBounds(guideBounds());
}
function updateGame(action) {
  if (["reset", "match", "copies", "end", "resume"].includes(action.type)) {
    sessionEpoch++;
    sessionBoundaryAt = Date.now();
    purchases.reset();
  }
  if (["reset", "match", "end"].includes(action.type)) {
    purchases.reset();
    state.levelReading = freshReading();
    state.goldReading = freshGoldReading();
    matchEnd.reset();
  }
  if (action.type === "reset" || action.type === "level-mode")
    state.levelReading = freshReading();
  state.gameSession = changeSession(state.gameSession, action);
  if(state.gameSession.matchId&&!state.gameSession.ended&&!state.gameSession.startedAt)state.gameSession.startedAt=Date.now();
  if (state.saved) state.saved.gameSession = state.gameSession;
  socialService?.schedulePublish();
  positionGuide();
  save();
  broadcast();
  return state.gameSession;
}
function showGuide() {
  if (guideWindow && !guideWindow.isDestroyed()) {
    positionGuide();
    syncOverlayVisibility();
    return;
  }
  guideWindow = new BrowserWindow({
    ...guideBounds(),
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    show: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  guideWindow.setAlwaysOnTop(true, "screen-saver");
  guideWindow.setIgnoreMouseEvents(false);
  guideWindow.once("ready-to-show", () => {
    if (!quitting && overlayEnabled) {
      syncOverlayVisibility();
      broadcast();
    }
  });
  loadWindow(guideWindow, "guide");
}
function accountReady(){return Boolean(state.social?.user&&state.social?.profile);}
function syncOverlayVisibility() {
  state.gameForeground = overlayGate.foreground;
  // Missing OCR is not evidence that the game ended. Keep an attached guide
  // visible through carousel/augment screens and unreadable HUD frames.
  const reason = quitting ? "shutdown"
    : !accountReady() ? "account-required"
    : !overlayEnabled ? "disabled"
    : state.gameSession.ended ? "match-ended"
    : !state.pinned ? "no-composition"
    : !overlayPreview && !overlayGate.foreground ? "game-unfocused"
    : !overlayPreview && !overlayGate.canShow(overlayEnabled,state.pinned) ? "waiting-for-game-confirmation"
    : "visible";
  const visible = reason === "visible";
  if(reason!==lastOverlayVisibilityReason){
    startupLog(`Overlay visibility: ${reason}`);
    lastOverlayVisibilityReason=reason;
  }
  for (const window of [overlayWindow, guideWindow]) {
    if (!window || window.isDestroyed()) continue;
    if (visible) window.showInactive();
    else window.hide();
  }
}
function ensureAutomaticReader() {
  if (
    accountReady() &&
    !overlayPreview &&
    overlayGate.foreground &&
    state.pinned &&
    !readerProcess &&
    !readerSuppressed
  )
    setReader(true, { automatic: true });
}
function guideNativeHandle() {
  if (!guideWindow || guideWindow.isDestroyed()) return null;
  const handle = guideWindow.getNativeWindowHandle();
  return handle.length === 8 ? handle.readBigUInt64LE().toString() : String(handle.readUInt32LE());
}
function acceptPresence(data) {
  if (!data || typeof data !== "object" || quitting || !accountReady()) return;
  lastPresence = Date.now();
  const previousFocus = overlayGate.foreground;
  const result = overlayGate.presence(data, guideNativeHandle());
  if (result.changedMatch) {
    readerSuppressed = false;
    if (overlayGate.matchId)
      updateGame({ type: "match", id: overlayGate.matchId });
    else if (state.gameSession.matchId) {
      updateGame({ type: "reset" });
      state.gameSession.matchId = null;
      overlayEnabled = false;
      mainWindow?.webContents.send("overlay:status", false);
      save();
    }
  }
  if(state.gameSession.ended && overlayGate.matchId===state.gameSession.matchId)
    overlayGate.endGame(overlayGate.matchId);
  if (previousFocus !== overlayGate.foreground || result.changedMatch) {
    startupLog(`Game focus ${overlayGate.foreground ? "on: " + data.processName : "off"}`);
    focusBoundaryAt = Date.now();
    levelJob++;
    levelBusy = false;
    purchases.reset();
    state.slots = [];
    state.goldReading = pauseGoldReading(state.goldReading);
    state.levelReading = pauseLevelReading(state.levelReading);
    state.readerPresence = overlayGate.foreground ? "live" : "waiting";
    mainWindow?.webContents.send("reader:data", { slots: [], idle: true });
    broadcast();
  }
  syncOverlayVisibility();
  ensureAutomaticReader();
}
function startPresenceWatch() {
  if (overlayPreview || process.platform !== "win32") return;
  if (process.env.ZYON_USER_DATA && process.env.ZYON_PRESENCE_FIXTURE) {
    const read = () => {
      try {
        acceptPresence(
          JSON.parse(
            fs.readFileSync(process.env.ZYON_PRESENCE_FIXTURE, "utf8"),
          ),
        );
      } catch {
        overlayGate.away();
        syncOverlayVisibility();
      }
    };
    read();
    presenceTimer = setInterval(read, 100);
    return;
  }
  const script = app.isPackaged
    ? path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "electron",
        "game-presence.ps1",
      )
    : path.join(__dirname, "game-presence.ps1");
  presenceProcess = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      script,
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const lines = readline.createInterface({ input: presenceProcess.stdout });
  lines.on("line", (line) => {
    try {
      acceptPresence(JSON.parse(line));
    } catch {}
  });
  const lost = () => {
    overlayGate.away();
    syncOverlayVisibility();
  };
  presenceProcess.on("error", lost);
  presenceProcess.on("exit", lost);
  presenceProcess.stderr.on("data", (chunk) =>
    console.error("Foreground:", String(chunk).slice(0, 250)),
  );
  presenceWatchdog = setInterval(() => {
    if (Date.now() - lastPresence > 2500) {
      overlayGate.away();
      syncOverlayVisibility();
    }
  }, 500);
}
function stopPresenceWatch() {
  clearInterval(presenceTimer);
  clearInterval(presenceWatchdog);
  presenceProcess?.kill();
  presenceProcess = null;
}
function setOverlay(enabled, { automatic = false } = {}) {
  if(enabled&&!accountReady())return false;
  if (!automatic) overlayGate.setEnabled(enabled);
  overlayEnabled = enabled;
  if (!enabled) {
    overlayWindow?.hide();
    guideWindow?.hide();
    mainWindow?.webContents.send("overlay:status", false);
    return false;
  }
  const display = chosenDisplay();
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    overlayWindow = new BrowserWindow({
      ...display.bounds,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      show: false,
      hasShadow: false,
      resizable: false,
      movable: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.once("ready-to-show", () => {
      if (!quitting && overlayEnabled) {
        syncOverlayVisibility();
        broadcast();
      }
    });
    loadWindow(overlayWindow, "overlay");
  } else {
    overlayWindow.setBounds(display.bounds);
    syncOverlayVisibility();
    broadcast();
  }
  showGuide();
  syncOverlayVisibility();
  if (!readerProcess) setReader(true);
  mainWindow?.webContents.send("overlay:status", true);
  return true;
}
function clearReader(error) {
  if (error) readerSuppressed = true;
  readerEpoch++;
  purchases.reset();
  state.goldReading = pauseGoldReading(state.goldReading);
  levelJob++;
  levelBusy = false;
  if (staleTimer) clearInterval(staleTimer);
  staleTimer = null;
  if (readerProcess) {
    const proc = readerProcess;
    readerProcess = null;
    proc.kill();
  }
  state.slots = [];
  state.readerActive = false;
  state.readerPresence = "paused";
  state.readerError = error || "";
  state.levelReading = pauseLevelReading(state.levelReading);
  mainWindow?.webContents.send("reader:status", false);
  broadcast();
  if (error) mainWindow?.webContents.send("reader:data", { error });
}
async function processLevel(data, process) {
  if (
    !overlayPreview &&
    !data.idle &&
    !data.error &&
    (!overlayGate.foreground ||
      data.matchId !== overlayGate.matchId ||
      data.capturedAt < focusBoundaryAt)
  )
    return;
  if (data.capturedAt && data.capturedAt < sessionBoundaryAt) return;
  if (data.idle || data.error) {
    state.readerPresence = "waiting";
    purchases.reset();
    state.goldReading = pauseGoldReading(state.goldReading);
    if (data.endedMatchId && data.endedMatchId === state.gameSession.matchId) {
      updateGame({ type: "reset" });
      state.gameSession.matchId = null;
      save();
    }
    levelJob++;
    levelBusy = false;
    state.levelReading = pauseLevelReading(state.levelReading);
    broadcast();
    return;
  }
  if (levelBusy) return;
  state.readerPresence = "live";
  const job = ++levelJob;
  levelBusy = true;
  let text = data.levelText;
  try {
    // PID plus creation time identifies a game, including after app restarts.
    // Alt-tab and OCR pause keep the same identity; a new game starts clean.
    if (data.matchId && data.matchId !== state.gameSession.matchId)
      updateGame({ type: "match", id: data.matchId });
    const matchEpoch = sessionEpoch;
    if (parseLevel(text) === null && data.levelImage)
      text = await readLevelImage(data.levelImage).catch(error => {
        console.error("Level fallback:", error.message);
        return "";
      });
    let goldText = data.goldText;
    if (parseGold(goldText) === null && data.goldImage)
      goldText = await readGoldImage(data.goldImage).catch(error => {
        console.error("Gold fallback:", error.message);
        return "";
      });
    if (
      job !== levelJob ||
      process !== readerProcess ||
      matchEpoch !== sessionEpoch
    )
      return;
    if(!state.gameSession.ended && matchEnd.observe({matchId:data.matchId,at:data.capturedAt,levelText:text,goldText,endText:data.endText})){
      overlayGate.endGame(data.matchId);
      updateGame({type:"end"});
      overlayEnabled=false;
      mainWindow?.webContents.send("overlay:status",false);
      state.slots=[];
      state.readerPresence="ended";
      mainWindow?.webContents.send("reader:data",{slots:[],idle:true,matchEnded:true});
      syncOverlayVisibility();broadcast();
      startupLog(`Results screen: ended ${data.matchId}; cleared HUD and purchases`);
      return;
    }
    syncOverlayVisibility();
    if(state.gameSession.ended){
      const startLevel=parseLevel(text);
      if(startLevel===null||startLevel>3){
        state.levelReading=freshReading();state.goldReading=freshGoldReading();
        state.readerPresence="ended";broadcast();return;
      }
      state.levelReading=acceptReading(state.levelReading,text,1);
      state.goldReading=acceptGold(state.goldReading,goldText,data.capturedAt);
      if(state.levelReading.status!=="confirmed"||state.goldReading.status!=="confirmed")return;
      overlayGate.resumeGame(data.matchId);
      updateGame({type:"resume"});
      startupLog(`New round in same process: ${data.matchId}`);
    }
    state.levelReading = acceptReading(
      state.levelReading,
      text,
      state.gameSession.levelMode === "ocr"
        ? state.gameSession.context.level
        : 1,
    );
    if (
      state.gameSession.levelMode === "ocr" &&
      state.levelReading.status === "confirmed" &&
      state.levelReading.level !== state.gameSession.context.level
    )
      updateGame({ type: "ocr-level", value: state.levelReading.level });
    state.goldReading = acceptGold(
      state.goldReading,
      goldText,
      data.capturedAt,
    );
    if (
      state.goldReading.status === "confirmed" &&
      state.gameSession.goldMode === "ocr" &&
      state.goldReading.gold !== state.gameSession.context.gold
    )
      updateGame({ type: "ocr-gold", value: state.goldReading.gold });
    if (
      !overlayPreview &&
      state.levelReading.status === "confirmed" &&
      overlayGate.confirmGold(data.matchId, state.goldReading) &&
      !overlayEnabled
    ) {
      startupLog(`Auto overlay: gold ${state.goldReading.gold}, level ${state.gameSession.context.level}`);
      setOverlay(true, { automatic: true });
    }
    syncOverlayVisibility();
    const { recognizeNames } = await shopModule;
    if (job !== levelJob || process !== readerProcess) return;
    const found = purchases.observe({
      at: data.capturedAt,
      matchId: data.matchId,
      gold: parseGold(goldText),
      slots: recognizeNames(data.slots || [], champions).map((s) => s.id),
      empty: (data.emptySlots || []).map(
        (blank, i) => blank && !String(data.slots?.[i] || "").trim(),
      ),
      clicks: data.clicks,
    });
    for (const purchase of found) updateGame({ type: "purchase", ...purchase });
    broadcast();
  } catch (error) {
    if (job === levelJob) {
      state.levelReading = { ...pauseLevelReading(state.levelReading), status: "unreadable" };
      state.goldReading = { ...pauseGoldReading(state.goldReading), status: "unreadable" };
      purchases.reset();
      broadcast();
    }
    console.error("Level OCR:", error.message);
  } finally {
    if (job === levelJob) levelBusy = false;
  }
}
function setReader(enabled, { automatic = false } = {}) {
  if(enabled&&!accountReady())return false;
  if (!automatic) readerSuppressed = !enabled;
  if (!enabled) {
    clearReader();
    return false;
  }
  if (process.platform !== "win32") {
    mainWindow?.webContents.send("reader:data", {
      error: "A leitura OCR precisa do Windows.",
    });
    return false;
  }
  if (!validRect(state.rect)) {
    mainWindow?.webContents.send("reader:data", {
      error: "Área inválida. Ajuste a loja dentro dos limites da tela.",
    });
    return false;
  }
  if (state.levelRect && !validLevelRect(state.levelRect)) {
    mainWindow?.webContents.send("reader:data", {
      error:
        "Faixa do nível inválida. Confira a calibração ou restaure a posição automática.",
    });
    return false;
  }
  clearReader();
  const display = chosenDisplay();
  const configPath = path.join(app.getPath("userData"), "reader-config.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      rect: state.rect,
      goldRect: defaultGoldRect(state.rect),
      levelRect: validLevelRect(state.levelRect)
        ? state.levelRect
        : defaultLevelRect(state.rect),
      display: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      },
      scale: display.scaleFactor,
    }),
  );
  readerProcess = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      app.isPackaged
        ? path.join(
            process.resourcesPath,
            "app.asar.unpacked",
            "electron",
            "shop-reader.ps1",
          )
        : path.join(__dirname, "shop-reader.ps1"),
      "-ConfigPath",
      configPath,
      ...(process.env.ZYON_USER_DATA && process.env.ZYON_OCR_FIXTURE
        ? [
            "-ImagePath",
            process.env.ZYON_OCR_FIXTURE,
            "-ShopFixture",
            "-RepeatFixture",
          ]
        : []),
    ],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  const current = readerProcess;
  const lines = readline.createInterface({ input: current.stdout });
  lines.on("line", (line) => {
    if (current !== readerProcess) return;
    try {
      const data = JSON.parse(line);
      lastCapture = Date.now();
      // Reading pauses while the player uses the guide. Keep the last HUD
      // values and purchase evidence; only leaving the attached game resets it.
      if (data.idle && !data.endedMatchId &&
        (overlayGate.interacting || overlayGate.isGuideWindow(data, guideNativeHandle()))) return;
      if (
        !overlayPreview &&
        !data.idle &&
        !data.error &&
        (!overlayGate.foreground ||
          data.matchId !== overlayGate.matchId ||
          data.capturedAt < focusBoundaryAt)
      )
        return;
      const epoch = readerEpoch;
      // Serial processing preserves clicks and image order during fallback OCR.
      hudQueue = hudQueue
        .then(() => {
          if (
            current === readerProcess &&
            epoch === readerEpoch &&
            (!data.capturedAt || Date.now() - data.capturedAt < 5000)
          )
            return processLevel(data, current);
          purchases.reset();
        })
        .catch((error) => console.error("HUD:", error.message));
      const { levelImage, goldImage, clicks, ...publicData } = data;
      if(state.gameSession.ended){publicData.slots=[];publicData.matchEnded=true;}
      mainWindow?.webContents.send("reader:data", publicData);
      if (data.error) clearReader();
    } catch {
      /* Ignore non-JSON diagnostic output. */
    }
  });
  current.on("error", () =>
    clearReader("Não foi possível iniciar o OCR do Windows."),
  );
  current.on("exit", () => {
    if (current === readerProcess)
      clearReader(
        "Leitura encerrada. Verifique o idioma de OCR instalado no Windows.",
      );
  });
  current.stderr.on("data", (chunk) =>
    console.error("OCR:", String(chunk).slice(0, 400)),
  );
  lastCapture = Date.now();
  staleTimer = setInterval(() => {
    if (Date.now() - lastCapture > 4000) {
      state.slots = [];
      state.levelReading = pauseLevelReading(state.levelReading);
      state.goldReading = pauseGoldReading(state.goldReading);
      purchases.reset();
      broadcast();
      mainWindow?.webContents.send("reader:data", { slots: [], idle: true });
    }
  }, 1000);
  state.readerActive = true;
  state.readerPresence = "waiting";
  state.readerError = "";
  mainWindow?.webContents.send("reader:status", true);
  broadcast();
  return true;
}
if (primaryInstance)
  app.whenReady().then(async () => {
    planTools=await import('../src/duo-plans.mjs');
    const pivotService = require("./pivot-service.cjs").createPivotService(
      app.getPath("userData"),
    );
    ipcMain.handle("catalog:get", (event) =>
      mainSender(event) ? pivotService.get() : null,
    );
    ipcMain.handle("catalog:refresh", (event, force) =>
      mainSender(event)&&accountReady() ? pivotService.refresh(force === true) : null,
    );
    ipcMain.handle("guide:build", (event, id) => {
      if (!accountReady()||event.sender !== guideWindow?.webContents) return false;
      const build = state.saved?.comps?.find(
        (c) =>
          c.id === id &&
          c.pivot?.family === state.guideComp?.pivot?.family &&
          c.pivot,
      );
      if (!build) return false;
      mainWindow?.webContents.send("guide:build", id);
      return true;
    });
    startupLog(`Starting ${app.getVersion()}`);
    try {
      const saved = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
      if ([1, 2].includes(saved?.version)) {
        state.saved = saved;
        state.gameSession = normalizeSession(saved.gameSession);
        state.overlayPlans=Object.fromEntries((saved.comps||[]).map(c=>[c.id,planTools.normalizeWorkingPlan(c,saved.overlayPlans?.[c.id],championById)]).filter(([,v])=>v));
      }
    } catch {
      /* First launch. */
    }
    socialService=new SocialService({directory:app.getPath('userData'),safeStorage,
      getLocal:()=>planTools.sharingPayload(state.guideComp,state.overlayPlans?.[state.pinned],state.gameSession,championById),
      normalizePlan:value=>planTools.normalizeSharedPlan(value,championById),
      onChange:snapshot=>{state.social=snapshot;mainWindow?.webContents.send('social:update',snapshot);
        if(!accountReady()){setOverlay(false,{automatic:true});setReader(false,{automatic:true});}
        syncOverlayVisibility();broadcast();}
    });
    state.social=socialService.snapshot();
    mainWindow = new BrowserWindow({
      icon: path.join(__dirname,"icon.png"),
      width: 1500,
      height: 1020,
      minWidth: 1050,
      minHeight: 740,
      frame: false,
      backgroundColor: "#111619",
      show: true,
      title: "Zyon TFT",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mainWindow.once("ready-to-show", showMainWindow);
    mainWindow.webContents.once("did-finish-load", () =>
      startupLog("Main interface loaded"),
    );
    mainWindow.webContents.on(
      "did-fail-load",
      (_event, code, description, _url, isMainFrame) => {
        if (!isMainFrame || code === -3) return;
        startupLog(`Load failed: ${code} ${description}`);
        showMainWindow();
        dialog.showErrorBox(
          "Não foi possível abrir o Zyon",
          `A interface não carregou (${code}). Feche o app e abra novamente pela pasta extraída.\n\n${description}`,
        );
      },
    );
    mainWindow.webContents.on("render-process-gone", (_event, details) =>
      startupLog(`Renderer stopped: ${details.reason}`),
    );
    loadWindow(mainWindow);
    let {autoUpdater}=require('electron-updater');
    // Overrides exist only for isolated integration tests on this machine.
    if(process.env.ZYON_USER_DATA&&process.env.ZYON_UPDATE_TEST==='1'&&process.env.ZYON_TEST_UPDATE_URL){
      const feed=new URL(process.env.ZYON_TEST_UPDATE_URL);
      if(feed.protocol!=='http:'||feed.hostname!=='127.0.0.1'||!path.resolve(app.getPath('exe')).includes(`${path.sep}.runtime${path.sep}`))throw new Error('Invalid isolated update test');
      autoUpdater.setFeedURL({provider:'generic',url:feed.href});
      Object.defineProperty(autoUpdater.app,'baseCachePath',{value:path.join(app.getPath('userData'),'update-cache')});
      autoUpdater.disableDifferentialDownload=true;
    }
    autoUpdater.logger={info:()=>{},warn:()=>{},error:()=>{startupLog('Update: request failed');},debug:()=>{}};
    const updateEnabled=app.isPackaged&&!process.env.PORTABLE_EXECUTABLE_FILE;
    updateService=new UpdateService({updater:autoUpdater,version:app.getVersion(),enabled:updateEnabled,
      reason:updateEnabled?'':!app.isPackaged?'Atualizações disponíveis na versão instalada.':'Esta é a edição portátil. Instale o Zyon para receber atualizações pelo app.',
      prepareInstall:async()=>{
        if(state.gameSession.matchId&&!state.gameSession.ended){
          const result=await dialog.showMessageBox(mainWindow,{type:'question',title:'Atualizar o Zyon',message:'Você ainda está em uma partida.',detail:'O overlay será fechado durante a atualização. Você pode atualizar depois de jogar.',buttons:['Continuar jogando','Reiniciar e atualizar'],defaultId:0,cancelId:0,noLink:true});
          if(result.response!==1)return false;
        }
        save();return true;
      }});
    updateService.on('change',snapshot=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('update:changed',snapshot);});
    ipcMain.handle('update:get',event=>mainSender(event)?updateService.snapshot():null);
    ipcMain.handle('update:action',async(event,action)=>{
      if(!mainSender(event)||!['check','download','install'].includes(action))return null;
      return updateService[action]();
    });
    updateService.start();
    mainWindow.on("closed", () => {
      mainWindow = null;
      app.quit();
    });
    ipcMain.handle("state:get", () => ({
      ...state,
      overlayVisible: Boolean(overlayWindow?.isVisible()),
      guideInteractive: overlayGate.interacting,
      overlayArmed: overlayEnabled,
      gameForeground: overlayGate.foreground,
      overlayPreview,
      readerActive: Boolean(readerProcess),
    }));
    ipcMain.handle('social:get',event=>(mainSender(event)||event.sender===guideWindow?.webContents)?socialService.snapshot():null);
    ipcMain.handle('social:action',(event,action)=>{
      if(!mainSender(event)&&event.sender!==guideWindow?.webContents)return {error:'Janela sem permissão.'};
      if(['signup','login','logout'].includes(action?.type)&&!mainSender(event))return {error:'Entre na conta pela janela principal do Zyon.'};
      if(action?.type==='open'){showMainWindow();mainWindow?.webContents.send('social:open');return {ok:true};}
      return socialService.action(action||{});
    });
    ipcMain.handle('plan:edit',(event,action)=>{
      if(!accountReady())return {error:'Entre na sua conta para usar o planejador.'};
      if(!mainSender(event)&&event.sender!==guideWindow?.webContents)return {error:'Janela sem permissão.'};
      const current=action?.compId===state.pinned;
      if(!current&&(!mainSender(event)||action?.type!=='restore'))return {error:'Escolha uma comp antes de editar.'};
      const base=current?state.baseGuideComp:state.saved?.comps?.find(c=>c.id===action.compId);if(!base)return {error:'Escolha uma comp no aplicativo.'};
      if(!['toggle','goal','restore'].includes(action?.type))return {error:'Ação de plano inválida.'};
      const edit=planTools.editWorkingPlan(base,state.overlayPlans[base.id],action,championById);
      state.overlayPlans={...state.overlayPlans};if(edit)state.overlayPlans[base.id]=edit;else delete state.overlayPlans[base.id];
      applyWorkingPlan();state.selected=state.guideComp?.champions||[];
      if(state.saved){state.saved.overlayPlans=state.overlayPlans;state.saved.selected=state.selected;}
      mainWindow?.webContents.send('plan:changed',{compId:base.id,edit});
      positionGuide();save();broadcast();socialService.schedulePublish();return {ok:true};
    });
    ipcMain.handle("fixture:get", () => {
      if (!process.env.ZYON_FIXTURE_RESULT || !process.env.ZYON_FIXTURE_IMAGE)
        return null;
      const result = JSON.parse(
        fs.readFileSync(process.env.ZYON_FIXTURE_RESULT, "utf8"),
      );
      return {
        ...result,
        image: `data:image/png;base64,${fs.readFileSync(process.env.ZYON_FIXTURE_IMAGE).toString("base64")}`,
      };
    });
    ipcMain.handle("state:publish", (event, next) => {
      if (!accountReady() || !mainSender(event) || !next || !Array.isArray(next.selected))
        return false;
      const previousRect = JSON.stringify(state.rect);
      const previousDisplay = state.displayId;
      const previousLevelRect = JSON.stringify(state.levelRect);
      const overlayPlans=state.overlayPlans,social=state.social;
      state = {
        ...state,
        ...next,
        opacity: Math.max(30, Math.min(100, Number(next.opacity) || 92)),
        selected: next.selected
          .filter((id) => typeof id === "string" && /^[a-zA-Z0-9_]+$/.test(id))
          .slice(0, 30),
        // OCR/app publications may contain a stale copy of the live session.
        gameSession: state.gameSession,
        levelReading: state.levelReading,
        goldReading: state.goldReading,
        readerPresence: state.readerPresence,
        gameForeground: overlayGate.foreground,
        overlayPreview,
        saved: { ...next.saved, gameSession: state.gameSession,overlayPlans },
        overlayPlans,social,
        baseGuideComp:next.baseGuideComp||next.guideComp||null,
      };
      applyWorkingPlan();socialService.schedulePublish();
      if (next.compact !== undefined && next.compact !== state._lastCompact) {
        if (state._lastCompact !== undefined || next.compact === true)
          state.gameSession.collapsed = Boolean(next.compact);
        state._lastCompact = next.compact;
      }
      positionGuide();
      if (
        overlayWindow &&
        !overlayWindow.isDestroyed() &&
        previousDisplay !== state.displayId
      )
        overlayWindow.setBounds(chosenDisplay().bounds);
      if (
        readerProcess &&
        (previousRect !== JSON.stringify(state.rect) ||
          previousLevelRect !== JSON.stringify(state.levelRect) ||
          previousDisplay !== state.displayId)
      )
        setReader(true);
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 250);
      syncOverlayVisibility();
      ensureAutomaticReader();
      broadcast();
      return true;
    });
    ipcMain.handle("overlay:set", (event, enabled) =>
      mainSender(event) ? setOverlay(Boolean(enabled)) : false,
    );
    ipcMain.handle("game:action", (event, action) => {
      if(!accountReady())return false;
      if (event.sender !== guideWindow?.webContents && !mainSender(event))
        return false;
      if (action?.compId !== state.pinned) return false;
      if (["level", "level-mode"].includes(action?.type) && !overlayPreview) return false;
      if (
        ![
          "level",
          "hp",
          "copies",
          "strength",
          "contested",
          "tab",
          "side",
          "collapse",
          "reset",
          "level-mode",
        ].includes(action?.type)
      )
        return false;
      return updateGame(action);
    });
    ipcMain.handle("reader:set", (event, enabled) =>
      mainSender(event) || event.sender === guideWindow?.webContents
        ? setReader(Boolean(enabled))
        : false,
    );
    ipcMain.handle("displays:get", () =>
      screen
        .getAllDisplays()
        .map((d) => ({ id: d.id, ...d.bounds, scale: d.scaleFactor })),
    );
    ipcMain.on("window:minimize", (event) => {
      if (mainSender(event)) mainWindow.minimize();
    });
    ipcMain.on("window:close", (event) => {
      if (mainSender(event)) app.quit();
    });
    globalShortcut.register("CommandOrControl+Shift+O", () =>
      setOverlay(!overlayEnabled),
    );
    globalShortcut.register("CommandOrControl+Shift+Q", () => app.quit());
    globalShortcut.register("CommandOrControl+Shift+G", () => {
      if (overlayEnabled) updateGame({ type: "collapse" });
    });
    startPresenceWatch();
    screen.on("display-removed", () => {
      if (overlayWindow && !overlayWindow.isDestroyed())
        overlayWindow.setBounds(chosenDisplay().bounds);
      positionGuide();
      clearReader(
        "Monitor alterado. Confira a calibração e reinicie a leitura.",
      );
    });
  });
app.on("before-quit", () => {
  quitting = true;
  socialService?.close();
  updateService?.close();
  stopPresenceWatch();
  save();
  clearReader();
  overlayWindow?.destroy();
  guideWindow?.destroy();
  void stopLevelWorker();
});
app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
