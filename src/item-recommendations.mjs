// These are item choices from published builds, not win-rate estimates.
const templates = {
  tank: ['DA_WarmogsArmor', 'DA_GargoyleStoneplate', 'DA_SteadfastHeart', 'DA_BrambleVest', 'DA_DragonsClaw', 'DA_SpiritVisage'],
  caster: ['DA_SpearOfShojin', 'DA_JeweledGauntlet', 'DA_RabadonsDeathcap', 'DA_ArchangelsStaff', 'DA_HextechGunblade', 'DA_VoidStaff'],
  lowManaCaster: ['DA_BlueBuff', 'DA_JeweledGauntlet', 'DA_RabadonsDeathcap', 'DA_ArchangelsStaff', 'DA_HextechGunblade', 'DA_VoidStaff'],
  support: ['DA_SpearOfShojin', 'DA_ArchangelsStaff', 'DA_RabadonsDeathcap', 'DA_AdaptiveHelm', 'DA_JeweledGauntlet', 'DA_HextechGunblade'],
};
// Explicit fallbacks for the current set's units without item loadouts in guides.
// The UI labels these as Zyon suggestions by function, never as source statistics.
const profiles = {
  DA_18_Kobuko: 'tank', DA_18_Leona: 'tank', DA_18_Rakan: 'tank', DA_18_Yorick: 'tank',
  DA_Gromp18_AP: 'lowManaCaster', DA_18_Ivern: 'support', DA_Lux18_Base: 'caster',
  DA_18_Lux_Coven: 'caster', DA_Lux18_Blackthorn: 'caster', DA_18_Lux_Fae: 'caster',
  DA_18_Lux_Inferno: 'caster', DA_18_Lux_Primal: 'caster', DA_18_Lux_Elderwood: 'caster', DA_18_Lux_Sunbeam: 'caster',
};
const canonical = id => id.replace(/radiant/gi, '').replace(/_/g, '').toLowerCase();
export const itemKind = item => /radiant/i.test(item?.id || '') ? 'Radiante' : /artifact/i.test(item?.id || '') ? 'Artefato' : item?.category;

export function indexItemRecommendations(guides, items, {patch, set} = {}) {
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
  return {byItem, byUnit, radiants};
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
  const fallback = !regular.length;
  const base = fallback ? (templates[profiles[championId]] || []).filter(id => index.byItem.has(id)) : regular;
  const toItem = id => index.byItem.get(id);
  const primary = base.slice(0, 3).map(toItem);
  const alternatives = base.slice(3, 9).map(toItem);
  const radiantItems = [...new Map(base.slice(0, 6).map(id => index.radiants.get(canonical(id))).filter(Boolean).map(i => [i.id, i])).values()];
  const artifacts = ranked.filter(id => itemKind(toItem(id)) === 'Artefato').slice(0, 6).map(toItem);
  // Emblems are only suggested in the exact referenced build, not for every user of a unit.
  const conditional = [...new Set(context?.ids || [])].filter(id => itemKind(toItem(id)) === 'Emblema').map(toItem);
  const sources = [...new Map((context ? [context] : entries).map(e => [e.source.url, {name: e.source.name, url: e.source.url, build: e.name, checkedAt: e.source.checkedAt}])).values()].slice(0, 3);
  return {primary, alternatives, radiants: radiantItems, artifacts, conditional, sources, context: context?.name || null, mode: fallback ? 'function' : 'guides', profile: profiles[championId] || null};
}
