// Require the level label: XP fractions, prices and arbitrary digits are not levels.
function parseLevel(text) {
  const normalized = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const matches = [
    ...normalized.matchAll(
      /(?:^|\s)(?:n\s*v|nivel|lvl|lv|level)\s*[.:]?\s*(10|[1-9])(?!\d)/gi,
    ),
  ];
  const levels = [...new Set(matches.map((m) => Number(m[1])))];
  return levels.length === 1 ? levels[0] : null;
}
function freshReading() {
  return {
    candidate: null,
    hits: 0,
    level: null,
    lastSeen: 0,
    status: "waiting",
  };
}
function acceptReading(previous, text, currentLevel, now = Date.now()) {
  const level = parseLevel(text);
  const recent = now - previous.lastSeen <= 5000;
  if (!level)
    return { ...previous, candidate: null, hits: 0, status: "unreadable" };
  if (level < currentLevel && previous.level !== null)
    return { ...previous, candidate: null, hits: 0, status: "lower" };
  const hits =
    recent && previous.candidate === level ? Math.min(2, previous.hits + 1) : 1;
  return {
    candidate: level,
    hits,
    level: hits >= 2 ? level : previous.level,
    lastSeen: now,
    status: hits >= 2 ? "confirmed" : "confirming",
  };
}
function pauseLevelReading(previous) {
  return { ...freshReading(), level: previous?.level ?? null, lastSeen: previous?.lastSeen || 0 };
}
function defaultLevelRect(shop) {
  const width = (shop.width / 5) * 0.4,
    height = shop.height * 0.16;
  return {
    x: Math.max(0, shop.x - shop.width / 5),
    y: Math.max(0, shop.y - shop.height * 0.29),
    width,
    height,
  };
}
function validLevelRect(r) {
  return (
    r &&
    ["x", "y", "width", "height"].every((k) => Number.isFinite(r[k])) &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.width >= 0.02 &&
    r.height >= 0.01 &&
    r.width <= 0.25 &&
    r.height <= 0.15 &&
    r.x + r.width <= 1 &&
    r.y + r.height <= 1
  );
}
module.exports = {
  parseLevel,
  freshReading,
  pauseLevelReading,
  acceptReading,
  defaultLevelRect,
  validLevelRect,
};
