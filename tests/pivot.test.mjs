import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  extractPivot,
  normalizePivot,
  mergePivot,
} from "../src/pivot-catalog.mjs";
import { validateComps, catalogRevision } from "../src/comp-catalog.mjs";
import { planForLevel, teamSlots, costOdds } from "../src/level-planner.mjs";
import { migrateSaved } from "../src/preferences.mjs";
const read = (p) => JSON.parse(fs.readFileSync(p));
const pivot = read("src/generated/pivot.json"),
  registry = read("src/generated/pivot-registry.json"),
  catalog = read("src/generated/catalog.json").champions;
const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
const raw = () => ({
  comps: {
    edition: pivot.edition,
    comps: pivot.comps.map((c) => ({
      id: c.id.replace("s18-pivot-", "s18-"),
      slug: c.source.url.split("/").filter(Boolean).at(-1),
      name: c.name,
      tier: c.tier,
      playstyle: c.style.startsWith("Slow") ? "Reroll" : c.style,
      level: c.pivot.finalLevel,
      family: c.pivot.family,
      tab: c.pivot.build,
      difficulty: c.pivot.difficulty,
      isPublished: true,
      units: c.champions.map((id) => ({
        championId: id,
        isCarry: id === c.carry,
        starLevel: c.stars[id],
        items: (c.items[id] || []).map((id) =>
          Object.keys(registry.itemSlugs).find(
            (s) => registry.itemSlugs[s] === id,
          ),
        ),
      })),
      levels: c.pivot.levels.map((s) => ({ ...s, note: "" })),
      placements: Object.entries(c.positions).map(([championId, p]) => ({
        championId,
        row: 3 - Math.floor(p / 7),
        col: p % 7,
      })),
      earlyUnits: c.pivot.openers,
      recommendedAugments: c.pivot.augments,
      itemOrder: c.pivot.itemOrder.map((id) =>
        Object.keys(registry.itemSlugs).find(
          (s) => registry.itemSlugs[s] === id,
        ),
      ),
      updatedAt: c.pivot.updatedAt,
    })),
  },
  tiers: {
    edition: pivot.edition,
    items: pivot.tiers.items.map((t) => ({
      id: Object.keys(registry.itemSlugs).find(
        (s) => registry.itemSlugs[s] === t.id,
      ),
      tier: t.tier,
    })),
    augments: pivot.tiers.augments,
  },
});
test("Pivot catalogue keeps all 62 builds, exact board orientation, item order, variants and asset references", () => {
  assert.equal(pivot.comps.length, 62);
  assert.equal(pivot.tiers.items.length, 146);
  assert.equal(pivot.tiers.augments.length, 252);
  validateComps(pivot.comps, catalog, registry.items);
  const ashe = pivot.comps.find((c) => c.name === "Ashe Fast 9");
  assert.equal(ashe.positions.DA_18_Ashe, 21);
  assert.equal(ashe.positions.DA_Taric18, 5);
  assert.equal(
    pivot.comps.filter((c) => c.pivot.family === ashe.pivot.family).length,
    3,
  );
  assert.equal(
    ashe.pivot.levels.find((s) => s.level === 8).swaps[0].replaces,
    "DA_18_Sejuani",
  );
  for (const c of pivot.comps) {
    assert.ok(c.pivot.levels.length);
    assert.ok(c.pivot.itemOrder.length);
    for (const id of [
      ...c.champions,
      ...c.pivot.levels.flatMap((l) => l.units),
    ])
      assert.ok(fs.existsSync(`public/assets/portraits/${id}.png`));
  }
  for (const i of registry.items) {
    assert.ok(fs.existsSync(`public/assets/items/${i.id}.png`), i.id);
    for (const id of i.recipe)
      assert.ok(fs.existsSync(`public/assets/items/${id}.png`), `recipe ${id}`);
  }
  for (const a of Object.values(registry.augments))
    if (a.icon)
      assert.ok(fs.existsSync(`public/assets/augments/${a.id}.png`), a.id);
});
test("HTML extraction does not execute scripts and incompatible or incomplete data is rejected", () => {
  const data = raw();
  assert.equal(
    extractPivot(
      `<script>throw Error('no execution')</script><script type="application/json">${JSON.stringify(data)}</script>`,
    ).comps.comps.length,
    62,
  );
  assert.throws(() => extractPivot("<html>challenge</html>"), /formato/);
  normalizePivot(data, registry, catalog);
  data.comps.edition = { ...data.comps.edition, patch: "18.7" };
  assert.throws(() => normalizePivot(data, registry, catalog), /patch/);
  const invalid = raw();
  invalid.comps.comps[0].units[0].items = ["unknown-item"];
  assert.throws(() => normalizePivot(invalid, registry, catalog), /Item/);
  const bad = structuredClone(pivot.comps);
  bad[0].pivot.levels[0].variants = [
    [{ championId: "missing", replaces: "DA_18_Ashe" }],
  ];
  assert.throws(
    () => validateComps(bad, catalog, registry.items),
    /substituição/,
  );
});
test("every imported route has an attainable adaptive team and no premature legendary roll priority", () => {
  for (const comp of pivot.comps)
    for (let level = 1; level <= 10; level++) {
      const p = planForLevel(comp, byId, {
        level,
        gold: 50,
        hp: 80,
        copies: {},
      });
      assert.ok(teamSlots(p.team.ids) <= level, `${comp.name} level ${level}`);
      for (const id of p.search) {
        assert.ok(
          byId[id].cost < 4 || level >= (byId[id].cost === 5 ? 9 : 8),
          `${id} at ${level}`,
        );
        assert.ok(costOdds(level, byId[id].cost) > 0);
      }
    }
  const ashe = pivot.comps.find((c) => c.name === "Ashe Fast 9");
  assert.deepEqual(
    new Set(planForLevel(ashe, byId, { level: 6 }).team.ids),
    new Set(ashe.pivot.levels.find((s) => s.level === 6).units),
  );
  assert.ok(
    !planForLevel(ashe, byId, { level: 8 }).search.includes("DA_18_Ashe"),
  );
  const owned=planForLevel(ashe,byId,{level:3,copies:{DA_18_Yorick:3}});
  assert.ok(owned.team.ids.includes('DA_18_Yorick'));
  assert.ok(!owned.team.ids.includes('DA_18_Sejuani'));
});
test("Pivot refresh preserves the 18 old plans and personal edits without duplicate IDs", () => {
  const old = read("src/generated/comps.json"),
    custom = {
      ...pivot.comps[0],
      style: "Personalizada",
      name: "Minha versão",
    };
  const merged = mergePivot(
    [...old, ...pivot.comps.slice(1), custom],
    pivot.comps,
  );
  assert.equal(merged.length, 80);
  assert.equal(new Set(merged.map((c) => c.id)).size, 80);
  assert.equal(merged.find((c) => c.id === custom.id).name, "Minha versão");
  const defaults = {
    comps: [...pivot.comps, ...old],
    active: pivot.comps[0].id,
    pinned: pivot.comps[0].id,
    selected: pivot.comps[0].champions,
  };
  const migrated = migrateSaved(
    {
      comps: old,
      active: old[0].id,
      pinned: old[0].id,
      selected: old[0].champions,
    },
    defaults,
    catalog,
    catalogRevision(defaults.comps),
  );
  assert.equal(migrated.comps.length, 80);
  assert.equal(migrated.pinned, old[0].id);
});
test("offline, wrong patch and partial refresh retain last good snapshot; validated refresh is cached atomically", async () => {
  const { createPivotService } = createRequire(import.meta.url)(
    "../electron/pivot-service.cjs",
  );
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "zyon-pivot-"));
  try {
    let count = 0;
    const offline = createPivotService(folder, {
      fetcher: async () => {
        count++;
        throw Error("offline");
      },
    });
    const result = await offline.refresh(true);
    assert.equal(result.snapshot.comps.length, 62);
    assert.match(result.error, /offline/);
    await offline.refresh(true);
    assert.equal(count, 1);
    for (const mode of ["patch", "partial", "valid"]) {
      const d = raw();
      d.comps.edition = { ...d.comps.edition };
      if (mode === "patch") d.comps.edition.patch = "19.1";
      if (mode === "partial") d.comps.comps = d.comps.comps.slice(0, 3);
      const service = createPivotService(folder, {
        fetcher: async () =>
          new Response(`<script>${JSON.stringify(d)}</script>`),
      });
      const r = await service.refresh(true);
      assert.equal(r.snapshot.comps.length, 62);
      assert.equal(Boolean(r.error), mode !== "valid");
    }
    assert.ok(fs.existsSync(path.join(folder, "pivot-catalog-v1.json")));
    assert.ok(!fs.existsSync(path.join(folder, "pivot-catalog-v1.json.tmp")));
    assert.equal(
      (await createPivotService(folder).get()).snapshot.comps.length,
      62,
    );
    const corrupted=structuredClone(pivot);delete corrupted.tiers;
    fs.writeFileSync(path.join(folder,'pivot-catalog-v1.json'),JSON.stringify(corrupted));
    assert.equal((await createPivotService(folder).get()).snapshot.tiers.augments.length,252);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
