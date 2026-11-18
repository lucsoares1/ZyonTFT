/** Groups only real plan equipment; a frontline carry remains a carry. */
export function equipmentGroups(comp, champions, publishedCarries = comp.pivot?.carries || []) {
  const ids = [...new Set(comp.champions)].filter(id => champions[id]);
  const carries = new Set([comp.carry, ...publishedCarries].filter(id => ids.includes(id)));
  const equipped = ids.filter(id => comp.items?.[id]?.length);
  if (!equipped.length) return [];
  return [
    { key: 'carries', label: 'Carries', ids: ids.filter(id => carries.has(id)) },
    { key: 'frontline', label: 'Linha de frente', ids: equipped.filter(id => !carries.has(id) && champions[id].role === 'Linha de frente') },
    { key: 'other', label: 'Outras unidades', ids: equipped.filter(id => !carries.has(id) && champions[id].role !== 'Linha de frente') },
  ].filter(group => group.ids.length);
}

export function summarizePlan(comp, champions, items, owned = []) {
  const ids = [...new Set(comp.champions)].filter(id => champions[id]);
  const ownedSet = new Set(Array.isArray(owned) ? owned : []);
  const missing = ids.filter(id => !ownedSet.has(id));
  const itemById = Object.fromEntries(items.map(item => [item.id, item]));
  const components = {};
  const holders = ids.filter(id => (comp.items?.[id] || []).length)
    .sort((a, b) => Number(b === comp.carry) - Number(a === comp.carry));
  for (const id of holders) {
    for (const item of comp.items[id]) {
      for (const component of itemById[item]?.recipe || []) {
        components[component] = (components[component] || 0) + 1;
      }
    }
  }
  return {
    ids, missing, holders,
    collected: ids.length - missing.length,
    totalCost: ids.reduce((sum, id) => sum + champions[id].cost, 0),
    remainingCost: missing.reduce((sum, id) => sum + champions[id].cost, 0),
    components: Object.entries(components).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  };
}
