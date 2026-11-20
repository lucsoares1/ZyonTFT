const canonical = id => id.replace(/radiant/gi, '').replace(/_/g, '').toLowerCase();
export const itemKind = item => /radiant/i.test(item?.id || '') ? 'Radiante' : /artifact/i.test(item?.id || '') ? 'Artefato' : item?.category;

export function indexItemRecommendations(guides, items, {patch, set, championStatistics = {}} = {}) {
  const byItem = new Map(items.map(i => [i.id, i]));
  const byUnit = new Map();
  const seen = new Set();
  for (const guide of guides) {
    if (!guide.source || (patch && guide.source.patch !== patch) || (set && guide.source.set !== set) || seen.has(guide.id)) continue;
    seen.add(guide.id);
    for (const [unit, loadout] of Object.entries(guide.items || {})) {
      const ids = loadout.filter(id => byItem.has(id));
      if (!ids.length) continue;
      const list = byUnit.get(unit) || [];
      list.push({id: guide.id, family: `${guide.source.name}:${guide.pivot?.family || guide.id}`, name: guide.name, source: guide.source, ids});
      byUnit.set(unit, list);
    }
  }
  const radiants = new Map(items.filter(i => itemKind(i) === 'Radiante').map(i => [canonical(i.id), i]));
  const statistics = new Map();
  for (const [id, value] of Object.entries(championStatistics || {})) {
    if ((patch && value?.patch !== patch) || (set && value?.set !== set) || value?.ranks !== 'Emerald+' || value?.region !== 'all' || !Number.isSafeInteger(value?.made) || value.made <= 0 || value.made * 1000 > Date.now() + 86400000) continue;
    const builds = (Array.isArray(value.itemBuilds) ? value.itemBuilds : []).filter(build => build?.championId === id && Number.isSafeInteger(build.games) && build.games >= 100 && Number.isFinite(build.average) && build.average >= 1 && build.average <= 8 && Number.isFinite(build.top4) && build.top4 >= 0 && build.top4 <= 1 && Array.isArray(build.items) && build.items.length === 3 && build.items.every(itemId => byItem.has(itemId) && itemKind(byItem.get(itemId)) === 'Completo' && !itemId.includes('Tactician'))).sort((first, second) => first.average - second.average || second.games - first.games).slice(0, 3);
    if (builds.length) statistics.set(id, {builds, made:value.made, patch:value.patch, ranks:value.ranks});
  }
  return {byItem, byUnit, radiants, statistics};
}

export function recommendItems(index, championId, referenceId) {
  const entries = index.byUnit.get(championId) || [];
  const context = entries.find(e => e.id === referenceId);
  const votes = new Map();
  for (const entry of entries) for (const id of new Set(entry.ids)) {
    const families = votes.get(id) || new Set();
    families.add(entry.family); votes.set(id, families);
  }
  const ranked = [...votes.keys()].sort((a, b) => votes.get(b).size - votes.get(a).size || a.localeCompare(b));
  const regular = [...new Set([...(context?.ids || []), ...ranked])].filter(id => itemKind(index.byItem.get(id)) === 'Completo' && !id.includes('Tactician'));
  const statistics = index.statistics?.get(championId);
  const best = statistics?.builds[0];
  const base = best ? [...best.items, ...new Set(statistics.builds.slice(1).flatMap(build => build.items).filter(id => !best.items.includes(id)))] : regular;
  const toItem = id => index.byItem.get(id);
  const primary = base.slice(0, 3).map(toItem);
  const alternatives = base.slice(3, 9).map(toItem);
  const radiantItems = [...new Map(base.slice(0, 6).map(id => index.radiants.get(canonical(id))).filter(Boolean).map(i => [i.id, i])).values()];
  const artifacts = ranked.filter(id => itemKind(toItem(id)) === 'Artefato').slice(0, 6).map(toItem);
  // Emblems are only suggested in the exact referenced build, not for every user of a unit.
  const conditional = [...new Set(context?.ids || [])].filter(id => itemKind(toItem(id)) === 'Emblema').map(toItem);
  const sources = [...new Map((context ? [context] : entries).map(e => [e.source.url, {name: e.source.name, url: e.source.url, build: e.name, checkedAt: e.source.checkedAt}])).values()].slice(0, 3);
  if (statistics) sources.unshift({name:'PivotTFT', url:`https://www.pivottft.com/stats/#champs:${encodeURIComponent(championId)}`, build:'Conjuntos do campeão', checkedAt:new Date(statistics.made * 1000).toISOString()});
  return {primary, alternatives, radiants: radiantItems, artifacts, conditional, sources, context: statistics ? null : context?.name || null, mode: statistics ? 'statistics' : regular.length ? 'guides' : 'unavailable', statistics:statistics || null, profile:null};
}
