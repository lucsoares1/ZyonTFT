export function personalizePlan(comp) {
  return { ...comp, style: "Personalizada", source: undefined, pivot: undefined };
}
export function boardPositions(comp, catalog) {
  const positions = {};
  const used = new Set();
  for (const id of comp.champions) {
    const pos = comp.positions?.[id];
    if (Number.isInteger(pos) && pos >= 0 && pos < 28 && !used.has(pos)) {
      positions[id] = pos;
      used.add(pos);
    }
  }
  const front = [1, 3, 5, 0, 6, 2, 4, 8, 10, 12, 7, 9, 11, 13];
  const back = [21, 27, 23, 25, 22, 26, 24, 15, 17, 19, 14, 16, 18, 20];
  for (const id of comp.champions) {
    if (id in positions) continue;
    const preferred = catalog[id]?.role === "Retaguarda" ? back : front;
    const pos = [...preferred, ...Array.from({ length: 28 }, (_, i) => i)].find(
      (p) => !used.has(p),
    );
    if (pos !== undefined) {
      positions[id] = pos;
      used.add(pos);
    }
  }
  return positions;
}
export function moveUnit(comp, id, target, catalog) {
  if (!catalog[id] || !Number.isInteger(target) || target < 0 || target > 27)
    return comp;
  const existing = comp.champions.includes(id);
  if (!existing && comp.champions.length >= 28) return comp;
  const positions = boardPositions(comp, catalog);
  const origin = positions[id];
  const occupant = Object.keys(positions).find(
    (key) => positions[key] === target && key !== id,
  );
  if (occupant)
    positions[occupant] = existing
      ? origin
      : Array.from({ length: 28 }, (_, i) => i).find(
          (p) => !Object.values(positions).includes(p),
        );
  positions[id] = target;
  return {
    ...comp,
    champions: existing ? comp.champions : [...comp.champions, id],
    carry: comp.champions.length ? comp.carry : id,
    positions,
    placement: "manual",
    ...(!existing ? { style: "Personalizada", source: undefined } : {}),
  };
}
