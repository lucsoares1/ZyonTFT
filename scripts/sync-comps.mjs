// Import a reviewed snapshot. There is deliberately no undocumented provider API.
import fs from "node:fs/promises";
import path from "node:path";
import { catalogRevision, validateComps } from "../src/comp-catalog.mjs";
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const target = "src/generated/comps.json";
const current = await read(target);
const { champions } = await read("src/generated/catalog.json");
const { items } = await read("src/generated/workspace.json");
const args = process.argv.slice(2);
if (
  args.length &&
  !(args.length === 1 && args[0] === "--check") &&
  !(
    args[0] === "--from" &&
    args[1] &&
    (args.length === 2 || (args.length === 3 && args[2] === "--check"))
  )
)
  throw Error("Use --check ou --from caminho.json [--check]");
const source = args.includes("--from")
  ? args[args.indexOf("--from") + 1]
  : target;
if (!source || source.startsWith("--"))
  throw Error("Informe o arquivo JSON revisado após --from");
const next = validateComps(await read(source), champions, items);
for (const comp of next) {
  for (const id of comp.champions)
    await fs.access(`public/assets/portraits/${id}.png`);
  for (const item of Object.values(comp.items || {}).flat())
    await fs.access(`public/assets/items/${item}.png`);
}
if (source !== target && !args.includes("--check")) {
  // A truncated scrape must never silently replace a complete catalogue.
  if (next.length < current.length)
    throw Error(
      "Snapshot menor que a base instalada. Revise remoções antes de substituir o catálogo.",
    );
  await fs.mkdir(".runtime/catalog-backups", { recursive: true });
  await fs.writeFile(
    path.join(".runtime/catalog-backups", `${Date.now()}.json`),
    JSON.stringify(current, null, 2),
  );
  const temp = `${target}.tmp`;
  await fs.writeFile(temp, JSON.stringify(next, null, 2) + "\n");
  await fs.rename(temp, target);
}
console.log(
  `${next.length} comps validadas. Revisão ${catalogRevision(next)}. ${source === target || args.includes("--check") ? "Sem alteração de arquivos." : "Compile o app para distribuir a atualização."}`,
);
