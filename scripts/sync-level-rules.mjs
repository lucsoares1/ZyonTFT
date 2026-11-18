// The game build number (16.22) and TFT balance patch (18.6) are different.
import fs from "node:fs/promises";
import crypto from "node:crypto";
const url =
  "https://raw.communitydragon.org/16.22/game/data/maps/shipping/map22/map22.bin.json";
const cache = ".research/map22-16.22.json";
let raw;
try {
  raw = await fs.readFile(cache, "utf8");
} catch {
  const response = await fetch(url);
  if (!response.ok) throw Error(`Map: ${response.status}`);
  raw = await response.text();
  await fs.mkdir(".research", { recursive: true });
  await fs.writeFile(cache, raw);
}
const map = JSON.parse(raw);
const setPath = "Maps/Shipping/Map22/Sets/TFTSet18";
const tableKey = map[setPath].DropRateTables.Shop;
const odds = Object.fromEntries(
  map[tableKey].mDropRatesByLevel.slice(0, 10).map((row, i) => [
    i + 1,
    Object.values(row)
      .find(Array.isArray)
      .map((n) => Math.round(n * 100)),
  ]),
);
for (const row of Object.values(odds))
  if (row.length !== 5 || row.reduce((a, b) => a + b, 0) !== 100)
    throw Error("Invalid shop odds");
const cd = JSON.parse(
  await fs.readFile(".research/cdragon.json", "utf8"),
).setData.find((s) => s.number === 18 && s.mutator === "TFTSet18");
const roster = JSON.parse(
  await fs.readFile("src/generated/catalog.json", "utf8"),
).champions;
const apex = cd.traits.find(t=>t.apiName==='DA_18_ApexPredator');
const apexFacts=apex?.desc.match(/ocupa (\d+) espaços.*concede \+(\d+) à característica ([^.]+)\./);
if(!apexFacts)throw Error('Elder Dragon slot/trait facts unavailable');
const capacityTraits=cd.traits.flatMap(t=>t.effects.filter(e=>e.variables?.TeamSize>0).map(e=>({trait:t.name,minUnits:e.minUnits,slots:e.variables.TeamSize})));
const units = Object.fromEntries(
  roster.map((c) => {
    const data = cd.champions.find((x) => x.apiName === c.id);
    const description = data?.ability?.desc || "";
    return [
      c.id,
      {
        damage: /Dano Mágico/i.test(description)
          ? "ap"
          : /Dano Físico/i.test(description)
            ? "ad"
            : "utility",
        frontline: c.role === "Linha de frente" && c.id !== "DA_Nidalee18_AP",
        slots: c.id === "DA_18_ElderDragon" ? Number(apexFacts[1]) : 1,
        ...(c.id==='DA_18_ElderDragon'?{traitContributions:{[apexFacts[3]]:Number(apexFacts[2])}}:{}),
        family: /Lux/i.test(c.id) ? "Lux" : c.id,
      },
    ];
  }),
);
const out = {
  set: 18,
  patch: "18.6",
  checkedAt: new Date().toISOString().slice(0,10),
  source: url,
  setPath,
  tableKey,
  sha256: crypto.createHash("sha256").update(raw).digest("hex"),
  odds,
  capacityTraits,
  units,
};
await fs.writeFile(
  "src/generated/level-rules.json",
  JSON.stringify(out, null, 2) + "\n",
);
console.log(
  `Set 18 shop table ${tableKey}: ${Object.keys(odds).length} levels, ${roster.length} units.`,
);
