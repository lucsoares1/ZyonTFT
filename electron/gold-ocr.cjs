function parseGold(text) {
  const value = String(text ?? "").trim();
  return /^(0|[1-9]\d{0,2})$/.test(value) ? Number(value) : null;
}
function freshGoldReading() {
  return {
    candidate: null,
    hits: 0,
    gold: null,
    lastSeen: 0,
    confirmedAt: 0,
    status: "waiting",
  };
}
function acceptGold(previous, text, now = Date.now()) {
  const gold = parseGold(text);
  if (gold === null)
    return { ...previous, candidate: null, hits: 0, status: "unreadable" };
  const hits =
    previous.candidate === gold && now - previous.lastSeen <= 5000
      ? Math.min(2, previous.hits + 1)
      : 1;
  return {
    candidate: gold,
    hits,
    gold: hits === 2 ? gold : previous.gold,
    lastSeen: now,
    confirmedAt: hits === 2 ? now : previous.confirmedAt || 0,
    status: hits === 2 ? "confirmed" : "confirming",
  };
}
function pauseGoldReading(previous) {
  return { ...freshGoldReading(), gold: previous?.gold ?? null, lastSeen: previous?.lastSeen || 0, confirmedAt: previous?.confirmedAt || 0 };
}
function defaultGoldRect(shop) {
  return {
    x: shop.x + shop.width * 0.455,
    y: Math.max(0, shop.y - shop.height * 0.29),
    width: shop.width * 0.07,
    height: shop.height * 0.18,
  };
}
module.exports = { parseGold, freshGoldReading, pauseGoldReading, acceptGold, defaultGoldRect };
