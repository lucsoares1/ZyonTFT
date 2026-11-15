function guideBoundsFor(display, session, { count = 0, safeTop = .858 } = {}) {
  const compactWidth = Math.min(640, Math.max(480, count * 45 + 48));
  const width = Math.min(session.shopOnly ? 116 : session.collapsed ? compactWidth : 840, display.width - 24);
  const available = Math.max(180, Math.floor(display.height * safeTop) - 80);
  const height = session.shopOnly ? 44 : session.collapsed ? 160 : Math.min(800, available);
  const position = session.guidePosition;
  const x = position?.x ?? (session.side === 'right' ? display.width - width - 12 : 12);
  const y = position?.y ?? 64;
  return {
    x: display.x + Math.max(0, Math.min(display.width - width, Math.round(x))),
    y: display.y + Math.max(0, Math.min(display.height - height, Math.round(y))),
    width, height,
  };
}
module.exports = { guideBoundsFor };
