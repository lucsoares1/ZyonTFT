// The live match belongs to the main process, never to the app's browsing level.
const tabs = ["now", "team", "items", "match", "route", "augments", "planner", "duo", "comps"];
const clamp = (value, min, max, fallback) =>
  Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value)))
    : fallback;
function freshSession() {
  return {
    context: {
      level: 1,
      gold: 0,
      hp: 100,
      strength: "stable",
      contested: false,
      copies: {},
    },
    levelMode: "ocr",
    goldMode: "ocr",
    matchId: null,
    startedAt: 0,
    round: null,
    ended: false,
    purchases: [],
    tab: "now",
    side: "left",
    collapsed: false,
    shopOnly: false,
    guidePosition: null,
    guideControlOffset: null,
  };
}
function normalizeSession(value) {
  const base = freshSession(),
    c = value?.context || {};
  return {
    ...base,
    tab: tabs.includes(value?.tab) ? value.tab : "now",
    side: value?.side === "right" ? "right" : "left",
    collapsed: value?.collapsed === true,
    shopOnly: value?.shopOnly === true,
    guidePosition: Number.isFinite(value?.guidePosition?.x) && Number.isFinite(value?.guidePosition?.y)
      ? {x:clamp(value.guidePosition.x,0,32768,0),y:clamp(value.guidePosition.y,0,32768,0)} : null,
    guideControlOffset: Number.isFinite(value?.guideControlOffset?.x) && Number.isFinite(value?.guideControlOffset?.y)
      ? {x:clamp(value.guideControlOffset.x,0,2000,0),y:clamp(value.guideControlOffset.y,0,1000,0)} : null,
    levelMode: "ocr",
    goldMode: "ocr",
    ended: value?.ended === true,
    matchId:
      typeof value?.matchId === "string" ? value.matchId.slice(0, 100) : null,
    startedAt: Number.isFinite(value?.startedAt) ? value.startedAt : 0,
    round: /^[1-9]-[1-9]$/.test(value?.round||'') ? value.round : null,
    purchases: Array.isArray(value?.purchases)
      ? value.purchases
          .filter(
            (p) => /^[a-zA-Z0-9_]+$/.test(p?.id) && Number.isFinite(p?.at),
          )
          .slice(-30)
      : [],
    context: {
      level: clamp(c.level, 1, 10, 1),
      gold: clamp(c.gold, 0, 999, 0),
      hp: clamp(c.hp, 1, 200, 100),
      strength: c.strength === "weak" ? "weak" : "stable",
      contested: c.contested === true,
      copies: Object.fromEntries(
        Object.entries(c.copies || {})
          .filter(([id, n]) => /^[a-zA-Z0-9_]+$/.test(id) && Number.isFinite(n))
          .slice(0, 100)
          .map(([id, n]) => [id, clamp(n, 0, 9, 0)]),
      ),
    },
  };
}
function changeSession(value, action) {
  const next = normalizeSession(value),
    c = next.context;
  if (!action || typeof action !== "object") return next;
  if (
    ["level", "hp"].includes(action.type) &&
    Number.isFinite(action.delta)
  )
    c[action.type] += clamp(action.delta, -10, 10, 0);
  if (
    action.type === "ocr-gold" &&
    next.goldMode === "ocr" &&
    Number.isInteger(action.value) &&
    action.value >= 0 &&
    action.value <= 999
  )
    c.gold = action.value;
  if (
    (action.type === "match" || action.type === "round") &&
    typeof action.id === "string" &&
    (action.type === "round" || action.id !== next.matchId)
  )
    return {
      ...freshSession(),
      matchId: action.id.slice(0, 100),
      startedAt: Date.now(),
      side: next.side,
      collapsed: next.collapsed,
      shopOnly: next.shopOnly,
      guidePosition: next.guidePosition,
      guideControlOffset: next.guideControlOffset,
    };
  if (
    action.type === "purchase" &&
    /^[a-zA-Z0-9_]+$/.test(action.id) &&
    Number.isFinite(action.at)
  ) {
    c.copies[action.id] = (c.copies[action.id] || 0) + 1;
    next.purchases.push({ id: action.id, at: action.at });
  }
  if (
    action.type === "ocr-level" &&
    next.levelMode === "ocr" &&
    Number.isInteger(action.value) &&
    action.value >= 1 &&
    action.value <= 10
  )
    c.level = action.value;
  if (
    action.type === "copies" &&
    /^[a-zA-Z0-9_]+$/.test(action.id) &&
    Math.abs(action.delta) === 1
  )
    c.copies[action.id] = (c.copies[action.id] || 0) + action.delta;
  if (action.type === "strength") c.strength = action.value;
  if (action.type === "contested") c.contested = action.value === true;
  if (action.type === "tab" && tabs.includes(action.value))
    next.tab = action.value;
  if (action.type === "side")
    next.side = next.side === "left" ? "right" : "left";
  if (action.type === "collapse") next.collapsed = !next.collapsed;
  if (action.type === "shop-only") {
    next.shopOnly = !next.shopOnly;
    if(action.placement){next.guidePosition=action.placement.guidePosition;next.guideControlOffset=action.placement.guideControlOffset;}
  }
  if (action.type === "guide-position") next.guidePosition = action.position;
  if (action.type === "end")
    return {...freshSession(),matchId:next.matchId,round:next.round,ended:true,side:next.side,collapsed:next.collapsed,shopOnly:next.shopOnly,guidePosition:next.guidePosition,guideControlOffset:next.guideControlOffset};
  if (action.type === "resume") { next.ended=false;next.startedAt=Date.now(); }
  if(action.type==='round-reading'&&/^[1-9]-[1-9]$/.test(action.round||''))next.round=action.round;
  if (action.type === "reset")
    return { ...freshSession(), side: next.side, shopOnly:next.shopOnly,guidePosition:next.guidePosition,guideControlOffset:next.guideControlOffset,matchId: next.matchId };
  return normalizeSession(next);
}
module.exports = { freshSession, normalizeSession, changeSession };
