import fs from "node:fs/promises";
import {enrichPivotStats} from '../src/pivot-stats.mjs';
import {
  extractPivot,
  normalizePivot,
  PIVOT_URL,
} from "../src/pivot-catalog.mjs";
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`${r.status}: ${url}`);
  return r;
};
const data = extractPivot(await (await get(PIVOT_URL)).text());
const catalog = await read("src/generated/catalog.json");
const workspace = await read("src/generated/workspace.json");
const community = await read(".research/cdragon.json");
const english = Object.values(
  (await read(".firecrawl/english-items.json")).data,
);
const slug = (s) =>
  s
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const itemSlugs = Object.fromEntries(
  [...english, ...english.filter((i) => i.id.startsWith("DA_"))].map((i) => [
    slug(i.name),
    i.id,
  ]),
);
itemSlugs["bf-sword"] = "DA_Component_BFSword";
itemSlugs["mogulsmail"] = "DA_Artifact_MogulsMail";
itemSlugs["ravager-emblem"] = "DA_18_EmblemSlayer";
const used = [
  ...new Set([
    ...data.comps.comps.flatMap((c) => [
      ...c.units.flatMap((u) => u.items || []),
      ...(c.itemOrder || []),
    ]),
    ...data.tiers.items.map((t) => t.id),
  ]),
];
const missing = used.filter((s) => !itemSlugs[s]);
if (missing.length)
  throw Error(`Mapeamento de itens ausente: ${missing.join(", ")}`);
const ids = new Set(used.map((s) => itemSlugs[s]));
const items = [...workspace.items];
for (const id of ids)
  if (!items.some((i) => i.id === id)) {
    const c = community.items.find((i) => i.apiName === id),
      e = english.find((i) => i.id === id);
    if (!c) throw Error(`Item Riot ausente: ${id}`);
    items.push({
      id,
      name: c.name || e.name,
      recipe: c.composition || [],
      category: id.includes("Emblem") ? "Emblema" : "Especial",
    });
  }
const augmentIds = [
  ...new Set([
    ...data.comps.comps.flatMap((c) => c.recommendedAugments || []),
    ...data.tiers.augments.map((t) => t.id),
  ]),
];
const augments = {};
for (const id of augmentIds) {
  const c = community.items.find((i) => i.apiName === id && i.isAugment);
  if (!c) {
    augments[id] = {
      id,
      name: id === "DA_HeartOfSteel" ? "Heart of Steel" : id,
      icon: false,
      unresolved: true,
    };
    continue;
  }
  augments[id] = { id, name: c.name, icon: true };
}
const registry = { itemSlugs, items, augments };
const snapshot = await enrichPivotStats(normalizePivot(data, registry, catalog.champions),registry,{champions:catalog.champions});
await fs.mkdir("public/assets/augments", { recursive: true });
const jobs = [];
for (const id of [...ids, ...augmentIds]) {
  const folder = augmentIds.includes(id) ? "augments" : "items";
  const file = `public/assets/${folder}/${id}.png`;
  try {
    await fs.access(file);
    continue;
  } catch {}
  const c = community.items.find((i) => i.apiName === id);
  if (!c) continue;
  const e = english.find((i) => i.id === id);
  const url =
    folder === "items" && e
      ? `https://ddragon.leagueoflegends.com/cdn/${catalog.assetVersion}/img/tft-item/${e.image.full}`
      : `https://raw.communitydragon.org/latest/game/${c.icon.toLowerCase().replace(/\.tex$/, ".png")}`;
  jobs.push({ file, url });
}
for (let n = 0; n < jobs.length; n += 8) {
  await Promise.all(
    jobs.slice(n, n + 8).map(async (j) => {
      const buffer = Buffer.from(await (await get(j.url)).arrayBuffer());
      if (buffer.readUInt32BE(0) !== 0x89504e47)
        throw Error(`Ícone inválido: ${j.url}`);
      await fs.writeFile(j.file, buffer);
    }),
  );
  console.log(`Ícones: ${Math.min(n + 8, jobs.length)}/${jobs.length}`);
}
await fs.writeFile(
  "src/generated/pivot-registry.json",
  JSON.stringify(registry, null, 2),
);
await fs.writeFile(
  "src/generated/pivot.json",
  JSON.stringify(snapshot, null, 2),
);
await fs.writeFile(
  "public/assets/pivot-provenance.json",
  JSON.stringify(
    {
      retrieved: snapshot.fetchedAt,
      source: PIVOT_URL,
      owner: "Riot Games (ícones); PivotTFT (seleção de builds)",
      assets: jobs,
    },
    null,
    2,
  ),
);
console.log(
  `${snapshot.comps.length} builds, ${items.length} itens, ${augmentIds.length} aprimoramentos. ${snapshot.edition.patch}`,
);
