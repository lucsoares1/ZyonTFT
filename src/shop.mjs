export const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

// Full snapshots and the small shop stream share a revision so delayed
// renderer replies cannot restore a badge after a purchase or reroll.
export function mergeOverlaySnapshot(previous,next){
  return (previous?.shopRevision||0)>(next?.shopRevision||0)
    ? {...next,slots:previous.slots,shopRect:previous.shopRect,shopCards:previous.shopCards,shopRevision:previous.shopRevision,shopCapturedAt:previous.shopCapturedAt,shopLatencyMs:previous.shopLatencyMs}
    : next;
}
export function mergeShopUpdate(previous,next){
  return previous&&(next.shopRevision||0)>=(previous.shopRevision||0)?{...previous,...next}:previous;
}

// Preserve all five positions, including duplicates and sold/empty slots.
export function matchShop(slots, selected) {
  const wanted = new Set(selected);
  return Array.from({ length: 5 }, (_, i) => {
    const slot = slots[i];
    const id = typeof slot === "string" ? slot : slot?.id;
    const confidence = typeof slot === "object" ? (slot?.confidence ?? 0) : 1;
    return {
      index: i,
      id: id || null,
      highlighted: Boolean(id && confidence >= 0.88 && wanted.has(id)),
    };
  });
}

export function recognizeNames(rawSlots, champions) {
  const aliases = new Map();
  const traitsById=new Map(champions.map(c=>[c.id,c.traits||[]]));
  champions.forEach((c) =>
    [c.name, c.id, ...(c.aliases || [])].forEach((a) =>
      aliases.set(normalizeName(a), c.id),
    ),
  );
  return Array.from({ length: 5 }, (_, i) => {
    const words = String(rawSlots[i] ?? "")
      .split(/\r?\n/)
      .map(normalizeName)
      .filter(Boolean);
    for (const word of words) {
      const id = aliases.get(word);
      if (id) return { id, confidence: 1, traits:[...traitsById.get(id)] };
    }
    return { id: null, confidence: 0, traits:[] };
  });
}

export function validateRect(rect) {
  return (
    rect &&
    ["x", "y", "width", "height"].every((key) => Number.isFinite(rect[key])) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.width >= 0.2 &&
    rect.height >= 0.02 &&
    rect.x + rect.width <= 1.001 &&
    rect.y + rect.height <= 1.001
  );
}
