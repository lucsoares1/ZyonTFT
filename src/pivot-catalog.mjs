import { validateComps } from "./comp-catalog.mjs";

export const PIVOT_URL = "https://www.pivottft.com/comps/";
export function extractPivot(html) {
  if (typeof html !== "string" || html.length > 5000000)
    throw Error("Página do PivotTFT inválida.");
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const content = match[1].trim();
    if (content.startsWith('{"comps":')) return JSON.parse(content);
  }
  throw Error("O formato da página mudou. Mantido o último catálogo válido.");
}
// Keep structured game facts. Editorial paragraphs remain in the linked guide.
export function normalizePivot(
  data,
  registry,
  catalog,
  { set = 18, patch = "18.6", now = new Date() } = {},
) {
  const edition = data?.comps?.edition;
  if (edition?.setNumber !== set || edition?.patch !== patch)
    throw Error(`PivotTFT usa outro set/patch. Esperado: ${set}/${patch}.`);
  if (
    !Number.isFinite(edition.updatedAt) ||
    edition.updatedAt * 1000 > now.getTime() + 86400000
  )
    throw Error("Data da edição inválida.");
  if (
    data.tiers?.edition?.setNumber !== set ||
    data.tiers?.edition?.patch !== patch ||
    !data.tiers?.items?.length ||
    !data.tiers?.augments?.length
  )
    throw Error("Tier lists ausentes ou incompatíveis com o patch.");
  if (!Array.isArray(data.comps.comps) || !data.comps.comps.length)
    throw Error("Catálogo vazio.");
  const known = new Map(catalog.map((c) => [c.id, c]));
  const item = (slug) => {
    const id = registry.itemSlugs[slug];
    if (!id) throw Error(`Item ainda não suportado: ${slug}`);
    return id;
  };
  const unit = (id) => {
    if (!known.has(id)) throw Error(`Campeão ainda não suportado: ${id}`);
    return id;
  };
  const swap = (s) => ({
    championId: unit(s.championId),
    replaces: unit(s.replaces),
  });
  const checkedAt = now.toISOString().slice(0, 10);
  const comps = data.comps.comps
    .filter((c) => c.isPublished)
    .map((c) => {
      if (!/^s18-[a-z0-9-]+$/.test(c.id) || !/^[a-z0-9-]+$/.test(c.slug))
        throw Error("Identificador Pivot inválido.");
      const champions = c.units.map((u) => unit(u.championId));
      const carry = c.units.find((u) => u.isCarry)?.championId || champions[0];
      const stages = [1, 2, 3]
        .map((cost) => ({
          level: cost + 4,
          targets: c.units
            .filter(
              (u) => u.starLevel === 3 && known.get(u.championId).cost === cost,
            )
            .map((u) => u.championId),
        }))
        .filter((s) => s.targets.length);
      const style =
        c.playstyle === "Reroll"
          ? `Slow roll · nível ${stages[0]?.level || Math.min(7, Math.max(5, known.get(carry).cost + 4))}`
          : c.playstyle;
      const levels = (c.levels || []).map((l) => ({
        level: l.level,
        units: l.units.map(unit),
        stage: l.stage || "",
        swaps: (l.swaps || []).map(swap),
        variants: (l.variants || []).map((v) => v.map(swap)),
        economy: economyFacts(l.note || ""),
      }));
      const early = [
        ...new Set(levels.filter((l) => l.level <= 7).flatMap((l) => l.units)),
      ];
      const names = (ids) => ids.map((id) => known.get(id).name).join(", ");
      const opening = openingFacts(c.when || "", registry);
      return {
        id: `s18-pivot-${c.id.slice(4)}`,
        name: c.name,
        subtitle: `${c.family || c.name} · ${c.tab || c.playstyle}`,
        tier: c.tier,
        style,
        champions,
        carry,
        color: "#c7aa65",
        placement: "manual",
        description: `Plano ${style} com ${known.get(carry).name}. ${stages.length ? `Alvos de 3★: ${names(stages.flatMap((s) => s.targets))}.` : `Complete a equipe no nível ${c.level}.`}`,
        conditions: [
          ...(c.units.some((u) => u.items?.some((i) => i.includes("emblem")))
            ? [
                "Esta build inclui emblemas. Confira os requisitos no Roteiro antes de comprometer sua economia.",
              ]
            : []),
          ...(opening.highHealth
            ? [
                "A rota depende de preservar vida para chegar às unidades caras. Estabilize antes de priorizar XP se estiver perdendo forte.",
              ]
            : []),
        ],
        positions: Object.fromEntries(
          (c.placements || []).map((p) => [
            unit(p.championId),
            (3 - p.row) * 7 + p.col,
          ]),
        ),
        stars: Object.fromEntries(
          c.units.map((u) => [u.championId, u.starLevel || 2]),
        ),
        items: Object.fromEntries(
          c.units
            .filter((u) => u.items?.length)
            .map((u) => [u.championId, u.items.map(item)]),
        ),
        source: {
          name: "PivotTFT",
          url: `https://www.pivottft.com/comps/${c.slug}/`,
          set,
          patch,
          checkedAt,
        },
        strategy: {
          damage: early.filter(
            (id) => known.get(id).role !== "Linha de frente",
          ),
          tank: early.filter((id) => known.get(id).role === "Linha de frente"),
          rerollStages: stages,
        },
        pivot: {
          family: c.family || c.id,
          build: c.tab || c.name,
          difficulty: c.difficulty,
          finalLevel: c.level,
          levels,
          opening,
          openers: (c.earlyUnits || []).map(unit),
          itemOrder: (c.itemOrder || []).map(item),
          augments: (c.recommendedAugments || []).map((id) => {
            if (!registry.augments[id])
              throw Error(`Aprimoramento ainda não suportado: ${id}`);
            return id;
          }),
          augmentFocus: c.augmentFocus || [],
          upgrades: (c.upgrades || []).map((u) => unit(u.championId)),
          updatedAt: c.updatedAt,
        },
      };
    });
  validateComps(comps, catalog, registry.items, { set, patch });
  const tiers = {
    items: (data.tiers?.items || []).map((t) => ({
      id: item(t.id),
      tier: t.tier,
    })),
    augments: (data.tiers?.augments || []).map((t) => {
      if (!registry.augments[t.id])
        throw Error(`Aprimoramento desconhecido: ${t.id}`);
      return { id: t.id, tier: t.tier };
    }),
  };
  return {
    edition,
    comps,
    tiers,
    fetchedAt: now.toISOString(),
    source: PIVOT_URL,
  };
}
export function economyFacts(note) {
  const facts = {};
  const reserve = note.match(
    /(?:save\s+(?:past\s+|to\s+)?|above\s+|over\s+)(\d+)\s*(?:gold)?/i,
  );
  const floor = note.match(
    /(?:roll\s+(?:down\s+)?to|stop\s+at)\s+(\d+)\s*gold/i,
  );
  const until = note.match(/(?:until|for)\s+(\d-\d)/i);
  if (reserve) facts.reserve = Number(reserve[1]);
  if (floor) facts.floor = Number(floor[1]);
  if (until) facts.until = until[1];
  return facts;
}
export function openingFacts(text, registry) {
  const components = [
    ["bf-sword", /b\.?f\.?\s*swords?/i],
    ["recurve-bow", /recurve bows?/i],
    ["needlessly-large-rod", /needlessly large rods?/i],
    ["tear-of-the-goddess", /tears? of the goddess/i],
    ["sparring-gloves", /sparring gloves/i],
    ["chain-vest", /chain vests?/i],
    ["giants-belt", /giant'?s? belts?/i],
    ["negatron-cloak", /negatron cloaks?/i],
    ["frying-pan", /frying pan/i],
    ["spatula", /spatula/i],
  ];
  const counts = {};
  const numbers = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  for (const [slug, re] of components) {
    const match = text.match(re);
    if (!match) continue;
    const prefix = text
      .slice(0, match.index)
      .match(/\b(one|two|three|four|five|[1-9])\s*$/i);
    if (prefix && registry.itemSlugs[slug])
      counts[registry.itemSlugs[slug]] =
        numbers[prefix[1].toLowerCase()] || Number(prefix[1]);
  }
  return {
    rounds: [...new Set(text.match(/\d-\d/g) || [])],
    pairs: /pairs|two .*copies/i.test(text),
    highHealth: /high health/i.test(text),
    components: components
      .filter(([, re]) => re.test(text))
      .map(([slug]) => registry.itemSlugs[slug])
      .filter(Boolean),
    counts,
  };
}
export function mergePivot(current, incoming) {
  const personal = current.filter(
    (c) => c.style === "Personalizada" || c.id.startsWith("comp-"),
  );
  return [
    ...incoming.filter((c) => !personal.some((p) => p.id === c.id)),
    ...current.filter((c) => !c.pivot || personal.includes(c)),
  ];
}
