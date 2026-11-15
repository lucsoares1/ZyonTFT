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
const smallControl={x:96,y:22};
function shopOnlyPlacement(display,session,bounds,controlOffset) {
  const full=guideBoundsFor(display,{...session,shopOnly:false});
  const fallback={x:full.width-64,y:22};
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=bounds.width&&p.y<=bounds.height;
  const from=valid(controlOffset)?controlOffset:session.shopOnly?smallControl:session.guideControlOffset||fallback;
  const savedOffset=session.shopOnly?session.guideControlOffset||fallback:from;
  const to=session.shopOnly?savedOffset:smallControl;
  let guidePosition={x:bounds.x-display.x+from.x-to.x,y:bounds.y-display.y+from.y-to.y};
  let guideRestore=null;
  if(!session.shopOnly){
    // Record the actual full window, and the reachable miniature origin.
    // Clamping a miniature at a screen edge must not lose the full position.
    const mini=guideBoundsFor(display,{...session,shopOnly:true,guidePosition});
    guideRestore={x:bounds.x-display.x,y:bounds.y-display.y,miniX:mini.x-display.x,miniY:mini.y-display.y};
  }else if(session.guideRestore){
    const saved=session.guideRestore;
    guidePosition={x:saved.x+bounds.x-display.x-saved.miniX,y:saved.y+bounds.y-display.y-saved.miniY};
  }
  return {guidePosition,guideControlOffset:savedOffset,guideRestore};
}
module.exports = { guideBoundsFor,shopOnlyPlacement };
