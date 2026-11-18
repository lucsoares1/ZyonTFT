import {boardPositions} from './planning.mjs';
import {planForLevel} from './level-planner.mjs';

// Presentation-only builders shared by every level/route surface.
// Preserve saved cells; never rebuild a published team from an empty position map.
export function plannedBoard(comp, catalog, plan, copies = {}) {
  const base = {
    ...comp,
    champions: [...plan.team.ids],
    carry: plan.team.carry || comp.carry,
    items: plan.equipment,
    stars: Object.fromEntries(plan.team.ids.map(id => [id,
      copies[id] >= 9 ? 3 : copies[id] >= 3 ? 2 : copies[id] > 0 ? 1 : 0,
    ])),
  };
  return {...base, positions: boardPositions(base, catalog)};
}

export function publishedBoard(comp, catalog, {level, units, swaps = [], context = {}}) {
  const plan = planForLevel(comp, catalog, {...context, level});
  const preview = plannedBoard(comp, catalog, plan, context.copies);
  const positions = {...comp.positions};
  const items = {...preview.items};
  for (const {championId, replaces} of swaps) {
    if (!items[championId] && items[replaces]) items[championId] = items[replaces];
    delete items[replaces];
  }
  const base = {
    ...preview,
    champions: [...units],
    carry: units.includes(preview.carry) ? preview.carry : units.includes(comp.carry) ? comp.carry : units[0],
    positions,
    items: Object.fromEntries(units.filter(id => items[id]).map(id => [id, items[id]])),
    stars: Object.fromEntries(units.map(id => [id,
      context.copies?.[id] >= 9 ? 3 : context.copies?.[id] >= 3 ? 2 : context.copies?.[id] > 0 ? 1 : 0,
    ])),
  };
  return {...base, positions: boardPositions(base, catalog)};
}
