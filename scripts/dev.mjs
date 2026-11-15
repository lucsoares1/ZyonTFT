import { spawn } from "node:child_process";
import electron from "electron";
const vite = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5199",
    "--strictPort",
  ],
  { stdio: "inherit" },
);
let desktop;
for (let i = 0; i < 80; i++) {
  try {
    await fetch("http://127.0.0.1:5199");
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
desktop = spawn(electron, ["."], {
  stdio: "inherit",
  env: {
    ...process.env,
    ZYON_DEV_URL: "http://127.0.0.1:5199",
    ELECTRON_RUN_AS_NODE: "",
  },
});
const stop = () => {
  vite.kill();
  desktop?.kill();
};
desktop.on("exit", () => {
  vite.kill();
  process.exit();
});
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
