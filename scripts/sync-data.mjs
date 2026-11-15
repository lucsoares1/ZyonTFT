// Refresh Set 18 catalog/assets. Guides are independently reviewed in comps.json.
import fs from "node:fs/promises";
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r;
};
const version = (
  await (
    await get("https://ddragon.leagueoflegends.com/api/versions.json")
  ).json()
)[0];
const base = `https://ddragon.leagueoflegends.com/cdn/${version}`;
const [official, english, items, community] = await Promise.all([
  get(`${base}/data/pt_BR/tft-champion.json`).then((r) => r.json()),
  get(`${base}/data/en_US/tft-champion.json`).then((r) => r.json()),
  get(`${base}/data/pt_BR/tft-item.json`).then((r) => r.json()),
  get("https://raw.communitydragon.org/latest/cdragon/tft/pt_br.json").then(
    (r) => r.json(),
  ),
]);
const set = community.setData.find(
  (s) => s.number === 18 && s.mutator === "TFTSet18",
);
const englishById = Object.fromEntries(
  Object.values(english.data).map((c) => [c.id, c]),
);
const itemsById = Object.fromEntries(
  Object.values(items.data).map((c) => [c.id, c]),
);
if (!set) throw Error("Set 18 missing; do not silently import another set.");
const roster = Object.values(official.data).filter(
  (c) =>
    c.id.startsWith("DA_") &&
    set.champions.some((x) => x.apiName === c.id && x.traits.length),
);
if (roster.length < 60) throw Error("Incomplete Set 18 roster");
const champions = roster
  .map((c) => {
    const details = set.champions.find((x) => x.apiName === c.id);
    const ranged = details.stats.range >= 3;
    return {
      id: c.id,
      name: c.name,
      cost: c.cost,
      role: ranged ? "Retaguarda" : "Linha de frente",
      trait: details.traits[0],
      traits: details.traits,
      position: ranged ? 24 : 3,
      aliases: [englishById[c.id]?.name].filter(Boolean),
    };
  })
  .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, "pt-BR"));
const guides = JSON.parse(
  await fs.readFile("src/generated/comps.json", "utf8"),
);
const itemIds = [
  ...new Set(guides.flatMap((c) => Object.values(c.items || {}).flat())),
];
for (const comp of guides)
  for (const id of comp.champions)
    if (!champions.some((c) => c.id === id))
      throw Error(`Unknown ${id} in ${comp.name}`);
const origins = [];
const jobs = [];
for (const folder of ["champions", "items"])
  await fs.mkdir(`public/assets/${folder}`, { recursive: true });
for (const c of roster)
  jobs.push([
    `public/assets/champions/${c.id}.png`,
    `${base}/img/tft-champion/${c.image.full}`,
  ]);
for (const id of itemIds) {
  const item = itemsById[id];
  if (!item) throw Error(`Unknown item ${id}`);
  jobs.push([
    `public/assets/items/${id}.png`,
    `${base}/img/tft-item/${item.image.full}`,
  ]);
}
for (let i = 0; i < jobs.length; i += 6)
  await Promise.all(
    jobs.slice(i, i + 6).map(async ([file, url]) => {
      await fs.writeFile(
        file,
        Buffer.from(await (await get(url)).arrayBuffer()),
      );
      origins.push({ file, source: url, owner: "Riot Games" });
    }),
  );
await fs.writeFile(
  "src/generated/catalog.json",
  JSON.stringify(
    {
      assetVersion: version,
      champions,
      traits: Object.fromEntries(
        set.traits.map((t) => [
          t.name,
          t.effects.map((e) => e.minUnits).filter(Number.isFinite),
        ]),
      ),
      items: Object.fromEntries(itemIds.map((id) => [id, itemsById[id].name])),
    },
    null,
    2,
  ),
);
await fs.writeFile(
  "public/assets/set18-provenance.json",
  JSON.stringify(
    {
      retrieved: new Date().toISOString(),
      sources: [
        `${base}/data/pt_BR/tft-champion.json`,
        "https://raw.communitydragon.org/latest/cdragon/tft/pt_br.json",
      ],
      assets: origins,
    },
    null,
    2,
  ),
);
console.log(
  `Set 18: ${champions.length} units, ${itemIds.length} items. Asset version ${version}; TFT patch is declared separately.`,
);
