export const STAT_RANKS = [
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];
const validCounts = (c) =>
  Array.isArray(c) &&
  c.length === 4 &&
  c.every(Number.isSafeInteger) &&
  c[0] > 0 &&
  c[0] <= 1e9 &&
  c[1] >= c[0] &&
  c[1] <= c[0] * 8 &&
  c[2] >= 0 &&
  c[2] <= c[0] &&
  c[3] >= 0 &&
  c[3] <= c[2];
export function statsFromCounts(counts, boards) {
  if (!validCounts(counts) || counts[0] < 100) return null;
  const [games, places, top4, wins] = counts;
  return {
    games,
    average: places / games,
    top4: top4 / games,
    winRate: wins / games,
    ...(Number.isSafeInteger(boards) && boards >= games
      ? { pickRate: games / boards }
      : {}),
  };
}
export function validStatistics(s, comp, registry) {
  const performance = (p) =>
    p &&
    Number.isSafeInteger(p.games) &&
    p.games >= 100 &&
    Number.isFinite(p.average) &&
    p.average >= 1 &&
    p.average <= 8 &&
    ["top4", "winRate"].every(
      (k) => Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 1,
    ) &&
    p.winRate <= p.top4 &&
    (p.pickRate === undefined ||
      (Number.isFinite(p.pickRate) && p.pickRate >= 0 && p.pickRate <= 1));
  const items = new Set(registry.items.map((i) => i.id));
  return (
    s &&
    s.set === 18 &&
    s.patch === "18.6" &&
    s.ranks === "Emerald+" &&
    s.region === "all" &&
    Number.isSafeInteger(s.made) &&
    s.made * 1000 <= Date.now() + 86400000 &&
    (s.performance === null || performance(s.performance)) &&
    Array.isArray(s.itemBuilds) &&
    s.itemBuilds.length <= 36 &&
    s.itemBuilds.every(
      (b) =>
        comp.champions.includes(b.championId) &&
        performance(b) &&
        Array.isArray(b.items) &&
        b.items.length === 3 &&
        b.items.every((id) => items.has(id)),
    )
  );
}
const add = (a, b) => a.map((n, i) => n + b[i]);
function fullBuildStats(details,registry){
  const validItems = new Set(
    registry.items
      .filter(
        (i) =>
          !i.id.includes("Component_") &&
          ![
            "DA_TacticiansCape",
            "DA_TacticiansCrown",
            "DA_TacticiansShield",
          ].includes(i.id),
      )
      .map((i) => i.id),
  );
  const championBuilds = new Map();
  for (const [championId, detail] of Object.entries(details || {})) {
    const groups = new Map();
    for (const r of STAT_RANKS)
      for (const [items, c] of detail?.slices?.[r]?.builds || []) {
        if (
          !Array.isArray(items) ||
          items.length !== 3 ||
          items.some((id) => !validItems.has(id)) ||
          !validCounts(c)
        )
          continue;
        const key = [...items].sort().join("|");
        groups.set(key, add(groups.get(key) || [0, 0, 0, 0], c));
      }
    championBuilds.set(
      championId,
      [...groups]
        .map(([key, c]) => ({
          championId,
          items: key.split("|"),
          ...statsFromCounts(c),
        }))
        .filter((b) => b.games >= 100)
        .sort((a, b) => a.average - b.average || b.games - a.games)
        .slice(0, 3),
    );
  }
  return championBuilds;
}
export function normalizeStats(
  data,
  comps,
  details,
  registry,
  now = Date.now(),
) {
  if (
    data?.v !== 1 ||
    data.set !== 18 ||
    data.patch !== "18.6" ||
    !Number.isSafeInteger(data.made) ||
    data.made * 1000 > now + 86400000 ||
    !STAT_RANKS.every((r) => data.slices?.[r])
  )
    throw Error("Estatísticas Pivot incompatíveis com o set/patch.");
  const slices = STAT_RANKS.map((r) => data.slices[r]);
  const boards = slices.reduce((n, s) => n + s.boards, 0);
  if (!Number.isSafeInteger(boards) || boards <= 0)
    throw Error("Amostra Pivot inválida.");
  const meta = {
    set: 18,
    patch: "18.6",
    ranks: "Emerald+",
    region: "all",
    made: data.made,
    since: data.since,
    until: data.until,
  };
  const championBuilds = fullBuildStats(details, registry);
  return Object.fromEntries(
    comps.map((c) => {
      const rawId = c.id.replace("s18-pivot-", "s18-");
      const source = data.comps?.find((s) => s.id === rawId);
      // IDs, not names or carry similarity, identify a published composition.
      if (
        !source ||
        source.slug !== c.source.url.split("/").filter(Boolean).at(-1)
      )
        return [c.id, null];
      let count = [0, 0, 0, 0],
        invalid = false;
      for (const s of slices) {
        const value = s.comps?.[rawId];
        if (value) {
          if (!validCounts(value)) {
            invalid = true;
            break;
          }
          count = add(count, value);
        }
      }
      const performance = invalid ? null : statsFromCounts(count, boards);
      return [
        c.id,
        {
          ...meta,
          performance,
          itemBuilds: (c.pivot.carries || [c.carry]).flatMap(
            (id) => championBuilds.get(id) || [],
          ),
        },
      ];
    }),
  );
}

// Statistics are optional: a failed statistics request never discards the comp catalogue.
export async function enrichPivotStats(
  snapshot,
  registry,
  { fetcher = fetch, previous, timeout = 20000, champions = [] } = {},
) {
  const signal = AbortSignal.timeout(timeout);
  const get = async (url) => {
    const r = await fetcher(url, { signal, redirect: "error" });
    if (!r.ok) throw Error("Pivot stats HTTP " + r.status);
    const text = await r.text();
    if (text.length > 8000000) throw Error("Estatísticas grandes demais.");
    return JSON.parse(text);
  };
  try {
    const data = await get("https://www.pivottft.com/stats/data.json");
    // Validate edition before requesting any champion detail.
    normalizeStats(data, [], {}, registry);
    if (
      (previous?.comps || []).some(
        (c) => (c.pivot?.statistics?.made || 0) > data.made,
      )
    )
      throw Error("Amostra de estatísticas anterior ao cache.");
    const ids = [
      ...new Set([...snapshot.comps.flatMap((c) => c.pivot.carries || [c.carry]),...champions.map(c=>c.id)]),
    ];
    const details = {};
    let cursor = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (cursor < ids.length && !signal.aborted) {
          const id = ids[cursor++];
          try {
            details[id] = await get(
              "https://www.pivottft.com/stats/champion/" +
                encodeURIComponent(id) +
                ".json",
            );
          } catch {
            /* Keep valid comp statistics even if one champion is unavailable. */
          }
        }
      }),
    );
    const normalized = normalizeStats(data, snapshot.comps, details, registry);
    return {
      ...snapshot,
      comps: snapshot.comps.map((c) => ({
        ...c,
        pivot: { ...c.pivot, statistics: normalized[c.id] || undefined },
      })),
      championStatistics: normalizeChampionStats(data,champions.map(c=>c.id),details,registry),
      statisticsError: null,
    };
  } catch (error) {
    const prior = new Map((previous?.comps || []).map((c) => [c.id, c]));
    return {
      ...snapshot,
      comps: snapshot.comps.map((c) => {
        const old = prior.get(c.id);
        const s = old?.pivot?.statistics;
        return {
          ...c,
          pivot: {
            ...c.pivot,
            statistics:
              s?.patch === snapshot.edition.patch &&
              old.source.url === c.source.url
                ? s
                : undefined,
          },
        };
      }),
      championStatistics: previous?.championStatistics || {},
      statisticsError:
        "Não foi possível atualizar as estatísticas. Última amostra disponível mantida.",
    };
  }
}

export function normalizeChampionStats(data,ids,details,registry){
 normalizeStats(data,[],{},registry);
 const slices=STAT_RANKS.map(r=>data.slices[r]),boards=slices.reduce((n,s)=>n+s.boards,0),builds=fullBuildStats(details,registry);
 return Object.fromEntries(ids.map(id=>{let count=[0,0,0,0],invalid=false;for(const slice of slices){const value=slice.champs?.[id];if(value){if(!validCounts(value)){invalid=true;break;}count=add(count,value)}}const performance=invalid?null:statsFromCounts(count,boards);return[id,{set:18,patch:'18.6',ranks:'Emerald+',region:'all',made:data.made,performance,itemBuilds:builds.get(id)||[],tier:performance?(performance.average<=4.05?'S':performance.average<=4.4?'A':performance.average<=4.73?'B':'C'):null}] }));
}
