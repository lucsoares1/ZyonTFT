import rules from "./generated/level-rules.json" with { type: "json" };

export const shopRules = rules;
export const DEFAULT_LEVEL_CONTEXT = {
  level: 6,
  gold: 50,
  hp: 75,
  strength: "stable",
  contested: false,
  copies: {},
};
const minimumLevel = { 1: 1, 2: 3, 3: 5, 4: 8, 5: 9 };
const rerollLevel = { 1: 5, 2: 6, 3: 7 };
const presets = {
  "s18-ap-exodia": {
    damage: ["DA_Karma18", "DA_18_LeBlanc", "DA_18_Cassiopeia", "DA_18_Ahri"],
    tank: ["DA_18_Ornn", "DA_18_Elise", "DA_18_Hecarim", "DA_18_Lillia"],
  },
  "s18-elderwood": {
    damage: ["DA_18_Xayah", "DA_18_Kayle", "DA_18_Tristana"],
    tank: ["DA_18_Ornn", "DA_18_Alistar", "DA_18_Hecarim", "DA_18_Lillia"],
  },
  "s18-ad-exodia": {
    damage: ["DA_18_Xayah", "DA_18_Kayle", "DA_18_Tristana", "DA_18_Aphelios"],
    tank: ["DA_18_Ornn", "DA_18_Alistar", "DA_Vi18", "DA_Amumu18"],
  },
  "s18-b4l": {
    damage: ["DA_Karma18", "DA_18_LeBlanc", "DA_18_Cassiopeia"],
    tank: ["DA_18_Yorick", "DA_18_Rakan", "DA_Vi18", "DA_18_Lillia"],
  },
  "s18-adaptors": {
    damage: ["DA_Karma18", "DA_Gromp18_AP"],
    tank: ["DA_18_Akali_AD", "DA_18_Elise", "DA_Vi18"],
    reroll: ["DA_18_MasterYi_AD", "DA_Vi18", "DA_18_Rengar"],
  },
  "s18-riftbeasts": {
    damage: [
      "DA_Cinderling18",
      "DA_18_Caitlyn",
      "DA_CrimsonRaptor18",
      "DA_Brambleback18",
    ],
    tank: ["DA_18_RekSai", "DA_Scuttlecrab18", "DA_Krug18", "DA_Sentinel18"],
  },
};
const clamp = (n, min, max, fallback) =>
  Number.isFinite(Number(n))
    ? Math.max(min, Math.min(max, Math.floor(Number(n))))
    : fallback;
export function normalizeLevelContext(value = {}) {
  return {
    level: clamp(value?.level, 1, 10, 6),
    gold: clamp(value?.gold, 0, 999, 50),
    hp: clamp(value?.hp, 1, 200, 75),
    strength: value?.strength === "weak" ? "weak" : "stable",
    contested: value?.contested === true,
    copies: Object.fromEntries(
      Object.entries(
        value?.copies && typeof value.copies === "object" ? value.copies : {},
      ).map(([id, n]) => [id, clamp(n, 0, 9, 0)]),
    ),
  };
}
export const unitSlots = (id) => rules.units[id]?.slots || 1;
export const teamSlots = (ids) =>
  ids.reduce((sum, id) => sum + unitSlots(id), 0);
const family = (id) => rules.units[id]?.family || id;
const front = (id, catalog) =>
  rules.units[id]?.frontline ?? catalog[id]?.role === "Linha de frente";
export const costOdds = (level, cost) =>
  rules.odds[clamp(level, 1, 10, 6)]?.[cost - 1] || 0;

export function strategyFor(comp, catalog, context = {}) {
  const ids = [...new Set(comp.champions)].filter((id) => catalog[id]);
  const carry = ids.includes(comp.carry) ? comp.carry : ids[0];
  const preset =
    comp.style !== "Personalizada" ? comp.strategy || presets[comp.id] : null;
  const stages = (preset?.rerollStages || []).filter(
    (s) =>
      s.targets?.length &&
      s.targets.every((id) => ids.includes(id) && catalog[id]?.cost <= 3),
  );
  const stage =
    stages.find((s) =>
      s.targets.some((id) => (context.copies?.[id] || 0) < 9),
    ) || stages.at(-1);
  const lowCarry = (catalog[carry]?.cost || 5) <= 3;
  const wantsReroll =
    /slow|reroll/i.test(comp.style) ||
    (comp.style === "Personalizada" && lowCarry);
  const targets = wantsReroll
    ? (
        stage?.targets ||
        preset?.reroll ||
        (lowCarry ? [carry] : ids.filter((id) => catalog[id].cost === 3))
      ).filter((id) => ids.includes(id) && catalog[id].cost <= 3)
    : [];
  const cost = targets.length
    ? catalog[targets[0]].cost
    : catalog[carry]?.cost || 4;
  const targetLevel = targets.length
    ? stage?.level || rerollLevel[cost]
    : Math.max(
        minimumLevel[cost],
        Number(comp.style.match(/Fast\s*(\d+)/i)?.[1]) || 0,
        comp.style !== "Personalizada" ? comp.pivot?.finalLevel || 0 : 0,
      );
  const shared = (id) =>
    catalog[id].traits.filter((t) =>
      ids.some((x) => catalog[x].traits.includes(t)),
    ).length;
  const damageType = rules.units[carry]?.damage;
  const candidates = Object.keys(catalog).filter((id) => catalog[id].cost <= 4&&!comp.excludedChampions?.includes(id));
  const damage =
    preset?.damage ||
    candidates
      .filter((id) => !front(id, catalog))
      .sort(
        (a, b) =>
          (rules.units[b]?.damage === damageType ? 4 : 0) +
            shared(b) -
            ((rules.units[a]?.damage === damageType ? 4 : 0) + shared(a)) ||
          a.localeCompare(b),
      );
  const tank =
    preset?.tank ||
    candidates
      .filter((id) => front(id, catalog))
      .sort((a, b) => shared(b) - shared(a) || a.localeCompare(b));
  return {
    ids,
    carry,
    targets,
    allTargets: stages.length
      ? [...new Set(stages.flatMap((s) => s.targets))]
      : targets,
    cost,
    style: comp.style,
    bridge: damage.find((id) => catalog[id]?.cost === 4),
    targetLevel: Math.min(targetLevel, 10),
    damage: damage.filter((id) => catalog[id]),
    tank: tank.filter((id) => catalog[id]),
    reroll: targets.length > 0,
  };
}

// A deterministic suggested board, not a combat simulation. Rare units only
// enter before their search level when the user explicitly owns a copy.
export function teamAtLevel(comp, catalog, level, context = {}, previous = []) {
  const state = normalizeLevelContext({ ...context, level });
  const strategy = strategyFor(comp, catalog, context);
  if (!strategy.ids.length)
    return { ids: [], carry: null, temporary: [], slots: 0 };
  const allowed = (id) =>
    catalog[id] &&
    !comp.excludedChampions?.includes(id) &&
    (level >= minimumLevel[catalog[id].cost] || state.copies[id] > 0);
  const damageBridge = strategy.damage
    .filter(allowed)
    .sort(
      (a, b) =>
        catalog[b].cost - catalog[a].cost ||
        strategy.damage.indexOf(a) - strategy.damage.indexOf(b),
    )[0];
  const proposedCarry = allowed(strategy.carry) ? strategy.carry : damageBridge;
  // An unlocked shop tier does not make an unbought one-star replacement
  // stronger than the player's upgraded item holder. Keep that holder until
  // the replacement has actually been registered (2★ for costs 1–4).
  const upgradedHolder = strategy.damage
    .filter((id) => allowed(id) && (state.copies[id] || 0) >= 3)
    .sort(
      (a, b) =>
        (state.copies[b] || 0) - (state.copies[a] || 0) ||
        catalog[b].cost - catalog[a].cost,
    )[0];
  const readyCopies = catalog[proposedCarry]?.cost === 5 ? 1 : 3;
  const activeCarry =
    upgradedHolder &&
    proposedCarry !== upgradedHolder &&
    (state.copies[proposedCarry] || 0) < readyCopies &&
    !strategy.targets.includes(proposedCarry)
      ? upgradedHolder
      : proposedCarry;
  const candidates = [
    ...new Set([
      ...strategy.ids,
      ...strategy.damage,
      ...strategy.tank,
      ...Object.keys(catalog).filter((id) => catalog[id].cost <= 3),
    ]),
  ].filter(allowed);
  const selected = [];
  const fits = (id) =>
    !selected.includes(id) &&
    !selected.some((x) => family(x) === family(id)) &&
    teamSlots(selected) + unitSlots(id) <= level;
  // Never rotate an explicitly completed reroll target out for an expensive filler.
  for (const id of strategy.allTargets.filter((id) => state.copies[id] >= 9))
    if (fits(id)) selected.push(id);
  if (activeCarry && fits(activeCarry)) selected.push(activeCarry);
  const sourceStep =
    comp.style !== "Personalizada" &&
    comp.pivot?.levels?.filter((s) => s.level <= level).at(-1);
  if (sourceStep) {
    // Follow the published route, but don't chase scarce costs early or exceed
    // capacity. Natural purchases and completed 3★ holders remain respected.
    if (
      activeCarry &&
      !sourceStep.units.includes(activeCarry) &&
      (state.copies[activeCarry] || 0) < 3 &&
      selected.includes(activeCarry)
    )
      selected.splice(selected.indexOf(activeCarry), 1);
    let routeIds = [...sourceStep.units];
    const alternatives = (sourceStep.variants || [])
      .map((group) => ({
        group,
        score: group.reduce(
          (score, s) =>
            score +
            (state.copies[s.championId] || 0) -
            (state.copies[s.replaces] || 0),
          0,
        ),
      }))
      .filter(
        (v) =>
          v.score > 0 &&
          v.group.every(
            (s) =>
              allowed(s.championId) && (state.copies[s.championId] || 0) > 0,
          ),
      )
      .sort((a, b) => b.score - a.score);
    if (alternatives.length)
      for (const s of alternatives[0].group)
        routeIds = routeIds.map((id) =>
          id === s.replaces ? s.championId : id,
        );
    for (const id of routeIds.filter(allowed)) if (fits(id)) selected.push(id);
    for (const id of previous.filter(allowed)) if (fits(id)) selected.push(id);
  }
  while (true) {
    const currentFront = selected.filter((id) => front(id, catalog)).length;
    const score = (id) => {
      const shared = catalog[id].traits.reduce(
        (n, t) =>
          n + selected.filter((x) => catalog[x].traits.includes(t)).length,
        0,
      );
      return (
        (strategy.ids.includes(id) ? 65 : 0) +
        (strategy.targets.includes(id) ? 26 : 0) +
        (front(id, catalog) && currentFront < Math.max(1, Math.floor(level / 2))
          ? 34
          : 0) +
        (state.copies[id] >= 9
          ? 100
          : state.copies[id] >= 3
            ? 22
            : state.copies[id] > 0
              ? 8
              : 0) +
        Math.min(shared, 5) * 8 +
        catalog[id].cost * 3 +
        (previous.includes(id) ? 5 : 0) +
        (strategy.tank.includes(id) ? 8 : 0) +
        (strategy.damage.includes(id) ? 4 : 0)
      );
    };
    const next = candidates
      .filter(fits)
      .sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
    if (!next) break;
    selected.push(next);
  }
  return {
    ids: selected,
    carry: selected.includes(activeCarry)
      ? activeCarry
      : selected.find((id) => !front(id, catalog)) || selected[0],
    temporary: selected.filter((id) => !strategy.ids.includes(id)),
    slots: teamSlots(selected),
  };
}

function decisionFor(strategy, catalog, state, targets) {
  const { level, gold, hp, strength, contested, copies } = state;
  if (!strategy.ids.length)
    return {
      kind: "setup",
      title: "Escolha o núcleo da sua composição",
      text: "Adicione campeões no planejador para receber uma equipe e decisões adequadas a cada nível.",
    };
  const focusCost = strategy.reroll
    ? strategy.cost
    : catalog[strategy.carry]?.cost || 4;
  const targetName = targets.map((id) => catalog[id].name).join(", ");
  const currentOdds = costOdds(level, focusCost);
  const targetOdds = costOdds(strategy.targetLevel, focusCost);
  const urgency = strength === "weak" || hp <= 30;
  if (level === 1)
    return {
      kind: "setup",
      title: "Coloque sua primeira unidade em campo",
      text: "Use uma unidade de custo 1 da abertura, compre os pares na loja natural e guarde peças para o próximo nível. Não gaste em rerolls nem procure o carry caro agora.",
    };
  if (urgency)
    return {
      kind: "stabilize",
      title: "Estabilize antes de pensar em XP",
      text:
        gold >= 10
          ? `Com ${hp} de vida${strength === "weak" ? " e tabuleiro fraco" : ""}, priorize melhorias de 2★ e uma frente resistente nos custos acessíveis. Faça rolagens curtas, compre as melhorias e reavalie; não persiga lendários raros.`
          : `Você tem ${gold} de ouro. Compre melhorias na loja natural e reposicione a equipe; falta margem para uma rolagem longa ou uma subida segura.`,
    };
  if (level <= 4)
    return {
      kind: "setup",
      title:
        level <= 2
          ? "Monte sua primeira equipe"
          : `Complete sua base de ${level} unidades`,
      text: `Compre nas lojas naturais, coloque uma frente resistente e um portador de dano atrás. Junte 3 cópias para fazer 2★; não gaste ouro em rerolls agora. ${strategy.reroll && strategy.cost === 1 ? "Guarde os pares e preserve a janela de reroll no nível 5 antes de investir em XP." : "Guarde ouro e use as peças temporárias até as próximas transições."}`,
    };
  if (strategy.reroll && !targets.length)
    return {
      kind: "level",
      title:
        level < 10
          ? `Núcleo 3★ pronto: prepare o nível ${level + 1}`
          : "Núcleo pronto: melhore o suporte",
      text: "Pare de gastar em cópias concluídas. Use o ouro para ampliar as sinergias e melhorar as unidades de suporte.",
    };
  if (strategy.reroll && contested)
    return {
      kind: "pivot",
      title: "Disputa no núcleo: evite forçar o 3★",
      text: `Outros jogadores estão segurando seus alvos. Mantenha as versões 2★ e prepare a expansão do time; ${targetName} não deve consumir toda a sua economia.`,
    };
  if (!strategy.reroll && strategy.ids.every((id) => (copies[id] || 0) >= 3))
    return {
      kind: "level",
      title:
        level < 10
          ? `Time melhorado: prepare o nível ${level + 1}`
          : "Time melhorado: ajuste as posições",
      text: "As unidades finais já têm pelo menos 2★ nas cópias informadas. Preserve a economia e busque uma expansão útil; não persiga 3★ de custo alto sem avaliar a reserva e a disputa.",
    };
  if (
    !strategy.reroll &&
    level === 8 &&
    focusCost === 5 &&
    /Fast\s*8/i.test(strategy.style || "") &&
    strategy.bridge &&
    (copies[strategy.bridge] || 0) < 3
  )
    return {
      kind: gold < 20 ? "save" : "roll",
      title: `Estabilize com ${catalog[strategy.bridge].name} antes do 9`,
      text: `Melhore ${catalog[strategy.bridge].name} para 2★ no nível 8: custo 4 tem ${costOdds(8, 4)}% por espaço. Depois prepare o nível 9 para o carry de custo 5, que ainda tem apenas ${costOdds(8, 5)}% agora.`,
    };
  if (level < strategy.targetLevel)
    return {
      kind: gold < 40 ? "save" : "level",
      title:
        gold < 40
          ? `Faça economia para o nível ${Math.min(level + 1, strategy.targetLevel)}`
          : `Priorize XP rumo ao nível ${strategy.targetLevel}`,
      text: `Custo ${focusCost}: ${currentOdds}% por espaço agora, ${targetOdds}% no nível ${strategy.targetLevel}. ${strategy.reroll ? `Guarde cópias de ${targetName} nas lojas naturais antes de rolar.` : "Compre as peças que aparecerem, mas não gaste rerolls para perseguir o núcleo caro agora."} Preserve ouro para comprar e melhorar a equipe depois de subir.`,
    };
  if (strategy.reroll) {
    const closest = [...targets].sort(
      (a, b) => (copies[b] || 0) - (copies[a] || 0),
    )[0];
    const remaining = 9 - (copies[closest] || 0);
    if (gold < 50)
      return {
        kind: "save",
        title: "Recupere a economia antes do slow roll",
        text: `Com ${gold} de ouro e vida estável, volte a 50 antes de rolar. Faltam ${remaining} cópias de ${catalog[closest].name} para 3★; compre as que aparecerem naturalmente.`,
      };
    return {
      kind: "roll",
      title:
        remaining <= 2
          ? `Faltam ${remaining} cópias de ${catalog[closest].name}`
          : `Slow roll no nível ${level}`,
      text: `Busque ${targetName} 3★ usando o excedente de 50 de ouro, incluindo o custo de comprar as cópias. Custo ${focusCost}: ${currentOdds}% por espaço. ${level > strategy.targetLevel ? `Você já passou do nível ${strategy.targetLevel}; não existe como voltar. ` : ""}Pare quando concluir o núcleo ou quando a disputa/vida exigir mudar o plano.`,
    };
  }
  if (gold < 20)
    return {
      kind: "save",
      title: "Recomponha ouro para as melhorias",
      text: `Com ${gold} de ouro e tabuleiro estável, compre oportunidades e recupere a economia. Evite gastar tudo buscando uma única peça.`,
    };
  return {
    kind: "roll",
    title: `Procure o núcleo de custo ${focusCost}`,
    text: `A faixa de custo ${focusCost} tem ${currentOdds}% por espaço. Priorize carry e tanque 2★, reavalie a cada melhoria e guarde ouro para as compras. O percentual não é a chance de um campeão específico.`,
  };
}

export function planForLevel(comp, catalog, value = {}) {
  const context = normalizeLevelContext(value);
  const strategy = strategyFor(comp, catalog, context);
  const teams = {};
  for (let level = 1; level <= 10; level++)
    teams[level] = teamAtLevel(
      comp,
      catalog,
      level,
      context,
      teams[level - 1]?.ids || [],
    );
  const team = teams[context.level];
  const previous = teams[context.level - 1];
  const targets = strategy.targets.filter(
    (id) => (context.copies[id] || 0) < 9,
  );
  const upgradeGoal = (id) =>
    strategy.targets.includes(id) && !context.contested ? 9 : 3;
  const search = team.ids.filter(
    (id) =>
      context.level >= minimumLevel[catalog[id].cost] &&
      (context.copies[id] || 0) < upgradeGoal(id),
  );
  const later = strategy.ids.filter(
    (id) =>
      context.level < minimumLevel[catalog[id].cost] &&
      !(context.copies[id] > 0),
  );
  const reserve = strategy.ids.filter(
    (id) =>
      !team.ids.includes(id) &&
      context.level >= minimumLevel[catalog[id].cost] &&
      (context.copies[id] || 0) < upgradeGoal(id),
  );
  const retained = previous
    ? team.ids.filter((id) => previous.ids.includes(id))
    : [];
  const entering = previous
    ? team.ids.filter((id) => !previous.ids.includes(id))
    : team.ids;
  const leaving = previous
    ? previous.ids.filter((id) => !team.ids.includes(id))
    : [];
  const transfers = Object.entries(comp.items || {})
    .filter(([id, items]) => items.length && strategy.ids.includes(id))
    .map(([target, items]) => {
      const targetFront = front(target, catalog);
      const holder =
        target === strategy.carry
          ? team.carry
          : team.ids.includes(target)
            ? target
            : team.ids.find(
                (id) =>
                  !strategy.ids.includes(id) &&
                  front(id, catalog) === targetFront,
              );
      return {
        target,
        holder: holder || null,
        items,
        temporary: !!holder && holder !== target,
      };
    });
  // A temporary unit has only three item slots. Extra loadouts stay reserved.
  const equipment = {};
  for (const transfer of transfers.sort(
    (a, b) =>
      Number(b.target === strategy.carry) - Number(a.target === strategy.carry),
  )) {
    const occupied = equipment[transfer.holder]?.length || 0;
    if (transfer.holder && occupied + transfer.items.length <= 3)
      equipment[transfer.holder] = [
        ...(equipment[transfer.holder] || []),
        ...transfer.items,
      ];
    else transfer.holder = null;
  }
  const decision = decisionFor(strategy, catalog, context, targets);
  const priorityScore = (id) => {
    const n = context.copies[id] || 0;
    return (
      (strategy.targets.includes(id) && n >= 7 ? 120 : 0) +
      (n % 3 === 2 ? 80 : 0) +
      (id === team.carry ? 45 : 0) +
      (front(id, catalog) ? 20 : 0) +
      (n > 0 ? 10 : 0)
    );
  };
  search.sort(
    (a, b) =>
      priorityScore(b) - priorityScore(a) ||
      team.ids.indexOf(a) - team.ids.indexOf(b),
  );
  const priorities = search.slice(0, 3).map((id) => {
    const n = context.copies[id] || 0;
    const target = upgradeGoal(id);
    return {
      id,
      goal: target,
      reason:
        target === 9 && n >= 7
          ? `Faltam ${9 - n} para 3★`
          : n % 3 === 2
            ? "Mais uma cópia fecha 2★"
            : id === team.carry
              ? "Portador de dano agora"
              : front(id, catalog)
                ? "Reforce a linha de frente"
                : target === 9
                  ? "Junte cópias para 3★"
                  : "Complete as sinergias",
    };
  });
  const purchaseReserve = priorities.reduce(
    (sum, p) => sum + catalog[p.id].cost,
    0,
  );
  const floor = decision.kind === "stabilize" ? 0 : strategy.reroll ? 50 : 20;
  const rollBudget = ["roll", "stabilize"].includes(decision.kind)
    ? Math.min(
        decision.kind === "stabilize" ? 6 : Infinity,
        Math.max(0, context.gold - floor - purchaseReserve),
      )
    : 0;
  const budget = { purchaseReserve, floor, rolls: Math.floor(rollBudget / 2) };
  const instruction =
    decision.kind === "setup"
      ? "Compre na loja natural. Monte frente + dano; guarde pares."
      : decision.kind === "pivot"
        ? "Preserve suas peças 2★ e prepare outra rota, sem forçar o 3★."
        : decision.kind === "level"
          ? context.level < strategy.targetLevel
            ? `Guarde para XP e compras. Não role pelo núcleo caro antes do nível ${strategy.targetLevel}.`
            : "Seu núcleo está melhorado. Guarde ouro para expandir sinergias e melhorar o suporte."
          : decision.kind === "save"
            ? "Compre melhorias naturais. Recupere sua reserva antes de rolar."
            : budget.rolls
              ? `Até ${budget.rolls} rolagens nesta rodada; separe ${purchaseReserve} de ouro para compras. Reavalie após melhorar.`
              : "Compre na loja natural. O ouro atual não deixa margem segura para rolar e comprar.";
  return {
    context,
    strategy,
    teams,
    team,
    entering,
    leaving,
    retained,
    search,
    reserve,
    later,
    targets,
    equipment,
    transfers,
    decision,
    priorities,
    budget,
    instruction,
    odds: rules.odds[context.level],
    notes: [
      ...(comp.style !== "Personalizada" ? comp.conditions || [] : []),
      ...(strategy.ids.some((id) => unitSlots(id) > 1)
        ? [
            "Dragão Ancião ocupa 2 espaços. O plano respeita o limite de equipe do nível.",
          ]
        : []),
      ...(strategy.reroll && catalog[strategy.carry]?.cost > strategy.cost
        ? [
            `${catalog[strategy.carry].name} custa ${catalog[strategy.carry].cost}: é uma melhoria do time, não o alvo de 3★ deste reroll.`,
          ]
        : []),
      ...(comp.id === "s18-b4l" && comp.style !== "Personalizada"
        ? [
            "Esta comp depende do aprimoramento Bronze for Life. Sem ele, reavalie a escolha da comp.",
          ]
        : []),
      ...(comp.id === "s18-elderwood" && comp.style !== "Personalizada"
        ? [
            "O plano final usa Emblema de Sabugueiro no Aphelios. A seleção por nível não substitui essa condição.",
          ]
        : []),
    ],
  };
}
