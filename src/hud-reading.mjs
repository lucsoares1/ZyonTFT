// Keep historical values internally, but never present an old budget as live.
export function currentGold(reading, now = Date.now()) {
  return reading?.gold != null && reading?.status === "confirmed" &&
    now >= reading.confirmedAt && now - reading.confirmedAt <= 5000
    ? reading.gold : null;
}
export function currentLevel(reading, now = Date.now()) {
  return reading?.level != null && reading?.status === "confirmed" &&
    now >= reading.lastSeen && now - reading.lastSeen <= 5000
    ? reading.level : null;
}
