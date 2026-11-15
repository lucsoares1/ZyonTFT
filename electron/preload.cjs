const { contextBridge, ipcRenderer } = require("electron");
const listen = (channel, callback) => {
  const handler = (_event, value) => callback(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};
contextBridge.exposeInMainWorld("zyon", {
  getUpdate: () => ipcRenderer.invoke('update:get'),
  updateAction: (action) => ipcRenderer.invoke('update:action', action),
  onUpdate: (callback) => listen('update:changed', callback),
  getCatalog: () => ipcRenderer.invoke("catalog:get"),
  refreshCatalog: (force = false) =>
    ipcRenderer.invoke("catalog:refresh", force),
  chooseBuild: (id) => ipcRenderer.invoke("guide:build", id),
  onBuild: (callback) => listen("guide:build", callback),
  getState: () => ipcRenderer.invoke("state:get"),
  editPlan: (action) => ipcRenderer.invoke("plan:edit", action),
  onPlan: (callback) => listen("plan:changed", callback),
  getSocial: () => ipcRenderer.invoke("social:get"),
  socialAction: (action) => ipcRenderer.invoke("social:action", action),
  onSocial: (callback) => listen("social:update", callback),
  onSocialOpen: (callback) => listen("social:open", callback),
  getFixture: () => ipcRenderer.invoke("fixture:get"),
  publish: (state) => ipcRenderer.invoke("state:publish", state),
  gameAction: (action) => ipcRenderer.invoke("game:action", action),
  setOverlay: (enabled) => ipcRenderer.invoke("overlay:set", enabled),
  setReader: (enabled) => ipcRenderer.invoke("reader:set", enabled),
  displays: () => ipcRenderer.invoke("displays:get"),
  minimize: () => ipcRenderer.send("window:minimize"),
  close: () => ipcRenderer.send("window:close"),
  onState: (callback) => listen("state:update", callback),
  onShop: (callback) => listen('shop:update', callback),
  onDetection: (callback) => listen("reader:data", callback),
  onOverlay: (callback) => listen("overlay:status", callback),
  onReader: (callback) => listen("reader:status", callback),
});
