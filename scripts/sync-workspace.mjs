import fs from "node:fs/promises";
const catalog = JSON.parse(
  await fs.readFile("src/generated/catalog.json", "utf8"),
);
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r;
};
let community;
try {
  community = JSON.parse(await fs.readFile(".research/cdragon.json", "utf8"));
} catch {
  community = await (
    await get("https://raw.communitydragon.org/latest/cdragon/tft/pt_br.json")
  ).json();
}
const set = community.setData.find(
  (s) => s.number === 18 && s.mutator === "TFTSet18",
);
if (!set) throw Error("Set 18 missing");
const base = `https://ddragon.leagueoflegends.com/cdn/${catalog.assetVersion}`;
const official = Object.values(
  (await (await get(`${base}/data/pt_BR/tft-item.json`)).json()).data,
);
const sourceItems = community.items.filter(
  (i) =>
    i.apiName.startsWith("DA_") &&
    !i.isAugment &&
    (i.composition?.length === 2 || i.apiName.startsWith("DA_Component_")),
);
const items = sourceItems
  .map((i) => ({
    id: i.apiName,
    name: official.find((o) => o.id === i.apiName)?.name || i.name,
    recipe: i.composition || [],
    category: i.apiName.startsWith("DA_Component_")
      ? "Componente"
      : i.apiName.includes("Emblem")
        ? "Emblema"
        : "Completo",
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
const traits = set.traits
  .map((t) => ({
    id: t.apiName,
    name: t.name,
    breakpoints: t.effects.map((e) => e.minUnits).filter(Number.isFinite),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
const jobs = [];
for (const folder of ["items", "traits"])
  await fs.mkdir(`public/assets/${folder}`, { recursive: true });
for (const item of items) {
  const o = official.find((o) => o.id === item.id);
  if (!o) throw Error(`Missing item ${item.id}`);
  jobs.push([
    `public/assets/items/${item.id}.png`,
    `${base}/img/tft-item/${o.image.full}`,
  ]);
}
for (const trait of set.traits)
  jobs.push([
    `public/assets/traits/${trait.apiName}.png`,
    `https://raw.communitydragon.org/latest/game/${trait.icon.toLowerCase().replace(/\.tex$/, ".png")}`,
  ]);
for (let i = 0; i < jobs.length; i += 6)
  await Promise.all(
    jobs
      .slice(i, i + 6)
      .map(async ([file, url]) =>
        fs.writeFile(file, Buffer.from(await (await get(url)).arrayBuffer())),
      ),
  );
await fs.writeFile(
  "src/generated/workspace.json",
  JSON.stringify({ items, traits }, null, 2),
);
await fs.writeFile(
  "public/assets/workspace-provenance.json",
  JSON.stringify(
    {
      retrieved: new Date().toISOString(),
      assets: jobs.map(([file, source]) => ({
        file,
        source,
        owner: "Riot Games",
      })),
    },
    null,
    2,
  ),
);
console.log(`${items.length} items and ${traits.length} traits imported.`);
