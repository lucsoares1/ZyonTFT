function syncOverlayWindows(windows, visible, { raise = false } = {}) {
  for (const window of windows) {
    if (!window || window.isDestroyed()) continue;
    if (!visible) {
      if (window.isVisible()) window.hide();
      continue;
    }
    const restoring = window.isMinimized() || !window.isVisible();
    if (window.isMinimized()) window.restore();
    if (restoring || raise || !window.isAlwaysOnTop())
      window.setAlwaysOnTop(true, "screen-saver");
    if (restoring) window.showInactive();
    window.moveTop();
  }
}
module.exports = { syncOverlayWindows };
