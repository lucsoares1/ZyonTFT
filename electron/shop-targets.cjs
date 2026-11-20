const validGoal = value => [1, 3, 9].includes(Number(value));
const validPriority = value => [0, 1, 2].includes(Number(value));
const known = (catalog, id) => typeof id === 'string' && Object.hasOwn(catalog || {}, id);

function normalizeList(value, catalog, limit) {
  const entries = new Map();
  for (const entry of Array.isArray(value) ? value : []) {
    if (!known(catalog, entry?.id)) continue;
    entries.set(entry.id, {id: entry.id, goal: validGoal(entry.goal) ? Number(entry.goal) : 1, priority: validPriority(entry.priority) ? Number(entry.priority) : 0});
    if (entries.size >= limit) break;
  }
  return [...entries.values()];
}

function normalizeShopTargets(value, catalog) {
  return {buy: normalizeList(value?.buy, catalog, 200), requests: normalizeList(value?.requests, catalog, 28), excluded:[...new Set(Array.isArray(value?.excluded) ? value.excluded : [])].filter(id => known(catalog, id)).slice(0,200)};
}

function editShopTargets(value, action, catalog, inheritedWishes = []) {
  const targets = normalizeShopTargets(value, catalog);
  if (!['buy', 'requests'].includes(action?.list) || !known(catalog, action?.id)) return targets;
  if (action.list === 'buy' && action.type === 'toggle') {
    const inherited = (Array.isArray(inheritedWishes) ? inheritedWishes : []).find(entry => entry?.id === action.id && entry.goal > 0);
    const selected = !targets.excluded.includes(action.id) && (Boolean(inherited) || targets.buy.some(entry => entry.id === action.id));
    targets.buy = targets.buy.filter(entry => entry.id !== action.id);
    targets.excluded = targets.excluded.filter(id => id !== action.id);
    if (selected) targets.excluded.push(action.id);
    else targets.buy.push({id:action.id, goal:validGoal(inherited?.goal) ? Number(inherited.goal) : 9, priority:0});
    return targets;
  }
  if (action.type === 'remove') targets[action.list] = targets[action.list].filter(entry => entry.id !== action.id);
  if (action.type === 'set' && validGoal(action.goal) && validPriority(action.priority ?? 0)) {
    const entries = targets[action.list].filter(entry => entry.id !== action.id);
    if (entries.length < (action.list === 'buy' ? 200 : 28)) {
      targets[action.list] = [...entries, {id: action.id, goal: Number(action.goal), priority: Number(action.priority ?? 0)}];
      if (action.list === 'buy') targets.excluded = targets.excluded.filter(id => id !== action.id);
    }
  }
  return targets;
}

module.exports = {normalizeShopTargets, editShopTargets};
