import test from 'node:test';
import assert from 'node:assert/strict';
import { syncOverlayWindows } from '../electron/overlay-window.cjs';

function mockWindow({ visible = true, minimized = false, top = true, destroyed = false } = {}) {
  const calls = [];
  return {
    calls,
    isDestroyed: () => destroyed,
    isVisible: () => visible,
    isMinimized: () => minimized,
    isAlwaysOnTop: () => top,
    restore: () => { calls.push('restore'); minimized = false; },
    setAlwaysOnTop: (...args) => { calls.push(['top', ...args]); top = true; },
    showInactive: () => { calls.push('showInactive'); visible = true; },
    moveTop: () => calls.push('moveTop'),
    hide: () => { calls.push('hide'); visible = false; },
  };
}

test('game return restores both overlays without activating or resetting them', () => {
  const windows = [mockWindow({ visible: false }), mockWindow({ minimized: true })];
  syncOverlayWindows(windows, true, { raise: true });
  for (const window of windows) {
    assert.ok(window.calls.some(call => Array.isArray(call) && call[0] === 'top' && call[2] === 'screen-saver'));
    assert.ok(window.calls.includes('showInactive'));
    assert.equal(window.calls.at(-1), 'moveTop');
  }
  assert.equal(windows[1].calls[0], 'restore');
});

test('a visible overlay behind the game is raised on focus return and heartbeats', () => {
  const window = mockWindow();
  syncOverlayWindows([window], true, { raise: true });
  assert.deepEqual(window.calls, [['top', true, 'screen-saver'], 'moveTop']);
  window.calls.length = 0;
  syncOverlayWindows([window], true);
  assert.deepEqual(window.calls, ['moveTop']);
});

test('lost topmost status is repaired; away, disabled and ended overlays stay hidden', () => {
  const window = mockWindow({ top: false });
  syncOverlayWindows([window], true);
  assert.deepEqual(window.calls, [['top', true, 'screen-saver'], 'moveTop']);
  window.calls.length = 0;
  syncOverlayWindows([window], false, { raise: true });
  syncOverlayWindows([window, null, mockWindow({ destroyed: true })], false);
  assert.deepEqual(window.calls, ['hide']);
});
