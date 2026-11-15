import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalogRevision, validateComps } from "../src/comp-catalog.mjs";
import { migrateSaved } from "../src/preferences.mjs";
import { planForLevel, strategyFor } from "../src/level-planner.mjs";
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const comps = read("src/generated/comps.json");
const { champions } = read("src/generated/catalog.json");
const { items } = read("src/generated/workspace.json");
const byId = Object.fromEntries(champions.map((c) => [c.id, c]));
test("reviewed catalogue has valid sources, IDs, loadouts and packaged assets", () => {
  validateComps(comps, champions, items);
  for (const c of comps) {
    for (const id of c.champions)
      assert.ok(fs.existsSync(`public/assets/portraits/${id}.png`));
    for (const id of Object.values(c.items).flat())
      assert.ok(fs.existsSync(`public/assets/items/${id}.png`));
  }
});
test("malformed and wrong-patch imports are rejected as a whole", () => {
  for (const change of [
    (c) => (c.source.set = 17),
    (c) => (c.source.patch = "18.5"),
    (c) => (c.carry = "missing"),
    (c) => (c.items[c.carry] = ["unknown"]),
    (c) => (c.source.url = "javascript:alert(1)"),
    (c) =>
      (c.strategy = {
        damage: [],
        tank: [],
        rerollStages: [{ level: 5, targets: ["DA_Taric18"] }],
      }),
    (c) => (c.positions = Object.fromEntries(c.champions.map((id) => [id, 0]))),
  ]) {
    const next = structuredClone(comps);
    change(next[0]);
    assert.throws(
      () => validateComps(next, champions, items),
      /Catálogo recusado/,
    );
  }
  assert.throws(() => validateComps([...comps, comps[0]], champions, items));
  assert.throws(() => validateComps([], champions, items));
});
test("expanded catalogue reaches installed profiles and keeps personal edits and pins", () => {
  const personal = {
    ...comps[0],
    name: "Meu ajuste",
    style: "Personalizada",
    source: undefined,
    positions: { [comps[0].carry]: 25 },
  };
  const defaults = {
    comps,
    active: comps[0].id,
    pinned: comps[0].id,
    selected: comps[0].champions,
  };
  const old = {
    ...defaults,
    dataRevision: "set18-18.6-r1",
    comps: [personal, ...comps.slice(1, 6)],
    opacity: 75,
  };
  const next = migrateSaved(old, defaults, champions, catalogRevision(comps));
  assert.equal(next.comps.length, 18);
  assert.equal(next.pinned, personal.id);
  assert.deepEqual(
    next.comps.find((c) => c.id === personal.id),
    personal,
  );
  assert.equal(next.opacity, 75);
  assert.deepEqual(
    migrateSaved(next, defaults, champions, catalogRevision(comps)),
    next,
  );
  const revised = structuredClone(comps);
  revised[0].items[revised[0].carry].pop();
  assert.notEqual(catalogRevision(revised), catalogRevision(comps));
});
test("mixed-cost rerolls advance to their next level only after the first targets complete", () => {
  for (const [slug, firstLevel, nextLevel] of [
    ["kill-stack-repeat", 5, 6],
    ["riftbeast-reroll", 5, 7],
  ]) {
    const c = comps.find((c) => c.id === `s18-${slug}`);
    const first = strategyFor(c, byId);
    assert.equal(first.targetLevel, firstLevel);
    assert.ok(first.targets.every((id) => byId[id].cost === 1));
    const partial = Object.fromEntries(
      first.targets.map((id, i) => [id, i ? 8 : 9]),
    );
    assert.equal(
      strategyFor(c, byId, { copies: partial }).targetLevel,
      firstLevel,
    );
    const copies = Object.fromEntries(first.targets.map((id) => [id, 9]));
    const p = planForLevel(c, byId, { level: 5, gold: 60, copies });
    assert.equal(p.strategy.targetLevel, nextLevel);
    assert.equal(p.decision.kind, "level");
    for (const id of first.targets) {
      assert.ok(p.team.ids.includes(id), "completed cheap carry must stay");
      assert.ok(!p.search.includes(id));
    }
  }
});
test("new reroll carries use the proper cost window and conditions reach both guide consumers", () => {
  for (const c of comps.slice(6).filter((c) => /Slow/.test(c.style))) {
    const s = strategyFor(c, byId);
    assert.ok(s.targets.length);
    assert.ok(s.targets.every((id) => byId[id].cost <= s.targetLevel - 4));
    const p = planForLevel(c, byId, { level: 2 });
    for (const note of c.conditions) assert.ok(p.notes.includes(note));
  }
});
