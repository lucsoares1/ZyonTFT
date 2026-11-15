// A content revision makes installed preferences pick up reviewed catalogue changes.
// This is an identity fingerprint, not a cryptographic security check.
export function catalogRevision(comps) {
  let hash = 2166136261;
  for (const c of JSON.stringify(comps))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `set18-${(hash >>> 0).toString(16)}`;
}

export function validateComps(
  comps,
  catalog,
  items,
  { set = 18, patch = "18.6" } = {},
) {
  const fail = (message) => {
    throw Error(`Catálogo recusado: ${message}`);
  };
  if (!Array.isArray(comps) || !comps.length || comps.length > 300)
    fail("quantidade de comps inválida");
  const units = new Map(catalog.map((c) => [c.id, c]));
  const equipment = new Set(items.map((i) => i.id));
  const ids = new Set();
  for (const c of comps) {
    if (!c || !/^s18-[a-z0-9-]+$/.test(c.id) || ids.has(c.id))
      fail("ID inválido ou duplicado");
    ids.add(c.id);
    if (typeof c.name !== "string" || !c.name.trim() || c.name.length > 100)
      fail(`${c.id}: nome inválido`);
    if (
      ![
        "Fast 8",
        "Fast 9",
        "Slow roll · nível 5",
        "Slow roll · nível 6",
        "Slow roll · nível 7",
      ].includes(c.style)
    )
      fail(`${c.id}: estilo não suportado`);
    if (typeof c.description !== "string" || c.description.length > 1000)
      fail(`${c.id}: descrição inválida`);
    if (
      !Array.isArray(c.champions) ||
      !c.champions.length ||
      c.champions.length > (c.pivot ? 12 : 10) ||
      new Set(c.champions).size !== c.champions.length ||
      c.champions.some((id) => !units.has(id))
    )
      fail(`${c.id}: campeões incompatíveis`);
    if (!c.champions.includes(c.carry)) fail(`${c.id}: carry fora da equipe`);
    if (c.source?.set !== set || c.source?.patch !== patch)
      fail(`${c.id}: set/patch diferente de ${set}/${patch}`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(c.source.checkedAt) ||
      !Number.isFinite(Date.parse(c.source.checkedAt)) ||
      Date.parse(c.source.checkedAt) > Date.now() + 86400000
    )
      fail(`${c.id}: data inválida`);
    let url;
    try {
      url = new URL(c.source.url);
    } catch {
      fail(`${c.id}: origem inválida`);
    }
    if (url.protocol !== "https:" || url.username || url.password)
      fail(`${c.id}: origem precisa ser HTTPS`);
    if (typeof c.source.name !== "string" || !c.source.name.trim())
      fail(`${c.id}: falta nome da fonte`);
    for (const [id, list] of Object.entries(c.items || {})) {
      if (
        !c.champions.includes(id) ||
        !Array.isArray(list) ||
        list.length > 3 ||
        list.some((i) => !equipment.has(i))
      )
        fail(`${c.id}: itens incompatíveis`);
    }
    for (const [id, stars] of Object.entries(c.stars || {}))
      if (!c.champions.includes(id) || ![1, 2, 3].includes(stars))
        fail(`${c.id}: estrelas inválidas`);
    const positions = Object.entries(c.positions || {});
    if (
      new Set(positions.map(([, p]) => p)).size !== positions.length ||
      positions.some(
        ([id, p]) =>
          !c.champions.includes(id) || !Number.isInteger(p) || p < 0 || p > 27,
      )
    )
      fail(`${c.id}: posições inválidas`);
    if (
      c.conditions &&
      (!Array.isArray(c.conditions) ||
        c.conditions.some((s) => typeof s !== "string" || s.length > 1000))
    )
      fail(`${c.id}: condições inválidas`);
    if (c.strategy) {
      for (const role of ["damage", "tank"])
        if (
          !Array.isArray(c.strategy[role]) ||
          c.strategy[role].some((id) => !units.has(id))
        )
          fail(`${c.id}: transição inválida`);
      if (!Array.isArray(c.strategy.rerollStages))
        fail(`${c.id}: etapas inválidas`);
      let previous = 0;
      for (const stage of c.strategy.rerollStages) {
        if (
          ![5, 6, 7].includes(stage.level) ||
          stage.level <= previous ||
          !Array.isArray(stage.targets) ||
          !stage.targets.length ||
          stage.targets.some(
            (id) =>
              !c.champions.includes(id) || units.get(id).cost > stage.level - 4,
          )
        )
          fail(`${c.id}: alvos de reroll incompatíveis com nível`);
        previous = stage.level;
      }
    }
    if (c.pivot) {
      if (
        !c.id.startsWith("s18-pivot-") ||
        c.source.name !== "PivotTFT" ||
        !Array.isArray(c.pivot.levels) ||
        c.pivot.levels.length > 10
      )
        fail(`${c.id}: guia Pivot inválido`);
      let previous = 2;
      for (const step of c.pivot.levels) {
        if (
          !Number.isInteger(step.level) ||
          step.level <= previous ||
          step.level > 10 ||
          !Array.isArray(step.units) ||
          step.units.length > 12 ||
          new Set(step.units).size !== step.units.length ||
          step.units.some((id) => !units.has(id))
        )
          fail(`${c.id}: equipe por nível inválida`);
        previous = step.level;
        if (
          !Array.isArray(step.swaps) ||
          !Array.isArray(step.variants) ||
          step.variants.length > 10
        )
          fail(`${c.id}: alternativas inválidas`);
        for (const s of [...step.swaps, ...step.variants.flat()])
          if (!units.has(s.championId) || !units.has(s.replaces))
            fail(`${c.id}: substituição inválida`);
      }
      if (c.pivot.itemOrder.some((id) => !equipment.has(id)))
        fail(`${c.id}: ordem de itens inválida`);
    }
  }
  return comps;
}
