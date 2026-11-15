import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  planForLevel,
  strategyFor,
  costOdds,
  teamSlots,
  shopRules,
  normalizeLevelContext,
} from "../src/level-planner.mjs";
const catalog = Object.fromEntries(
  JSON.parse(fs.readFileSync("src/generated/catalog.json")).champions.map(
    (c) => [c.id, c],
  ),
);
const comps = JSON.parse(fs.readFileSync("src/generated/comps.json"));
const find = (id) => comps.find((c) => c.id === id);
const ap = find("s18-ap-exodia"),
  adapt = find("s18-adaptors");

test("an upgraded temporary holder keeps its items until the replacement is ready", () => {
  const copies = { DA_Karma18: 3 };
  const held = planForLevel(ap, catalog, { level: 8, copies });
  assert.equal(held.team.carry, "DA_Karma18");
  assert.equal(
    held.transfers.find((t) => t.target === ap.carry).holder,
    "DA_Karma18",
  );
  const unbought = planForLevel(ap, catalog, { level: 9, copies });
  assert.equal(unbought.team.carry, "DA_Karma18");
  const ready = planForLevel(ap, catalog, {
    level: 9,
    copies: { ...copies, [ap.carry]: 1 },
  });
  assert.equal(ready.team.carry, ap.carry);
});

test("a pair is promoted above empty purchases and completed upgrades leave the queue", () => {
  const base = planForLevel(ap, catalog, { level: 7 });
  const pair = base.search.find((id) => id !== base.team.carry);
  const next = planForLevel(ap, catalog, { level: 7, copies: { [pair]: 2 } });
  assert.equal(next.priorities[0].id, pair);
  assert.match(next.priorities[0].reason, /fecha 2/);
  assert.ok(
    !planForLevel(ap, catalog, {
      level: 7,
      copies: { [pair]: 3 },
    }).search.includes(pair),
  );
});

test("roll estimates preserve purchases and economy, and urgent rolls stay short", () => {
  for (const comp of comps)
    for (const gold of [0, 10, 20, 50, 55, 70]) {
      const p = planForLevel(comp, catalog, { level: 9, gold });
      assert.ok(p.budget.rolls >= 0);
      if (p.budget.rolls)
        assert.ok(
          p.budget.rolls * 2 + p.budget.purchaseReserve + p.budget.floor <=
            gold,
        );
      if (!["roll", "stabilize"].includes(p.decision.kind))
        assert.equal(p.budget.rolls, 0);
      const urgent = planForLevel(comp, catalog, { level: 7, gold, hp: 20 });
      assert.ok(urgent.budget.rolls <= 3);
    }
  const slow = planForLevel(adapt, catalog, { level: 7, gold: 55 });
  assert.equal(slow.budget.rolls, 0);
  assert.match(slow.instruction, /não deixa margem/);
});

test("a contested reroll stops asking for more copies of two-star targets", () => {
  const target = strategyFor(adapt, catalog).targets[0];
  const p = planForLevel(adapt, catalog, {
    level: 7,
    gold: 60,
    contested: true,
    copies: { [target]: 3 },
  });
  assert.equal(p.decision.kind, "pivot");
  assert.ok(p.team.ids.includes(target));
  assert.ok(!p.search.includes(target));
  assert.ok(!p.reserve.includes(target));
  assert.ok(p.priorities.every((x) => x.goal === 3));
});

test("shop odds follow the Set18 Shop reference and every row totals 100", () => {
  assert.equal(shopRules.tableKey, "{1ee21754}");
  assert.deepEqual(shopRules.odds[7], [19, 30, 40, 10, 1]);
  assert.equal(costOdds(8, 5), 3);
  assert.equal(costOdds(9, 5), 15);
  for (const row of Object.values(shopRules.odds))
    assert.equal(
      row.reduce((a, b) => a + b, 0),
      100,
    );
});
test("all catalogue comps have valid capacity-limited teams and consistent transitions at every level", () => {
  for (const comp of comps)
    for (let level = 1; level <= 10; level++) {
      const p = planForLevel(comp, catalog, { level });
      assert.ok(p.team.slots <= level, `${comp.name} ${level}`);
      assert.equal(p.team.slots, teamSlots(p.team.ids));
      assert.equal(new Set(p.team.ids).size, p.team.ids.length);
      assert.equal(
        new Set(p.team.ids.map((id) => shopRules.units[id].family)).size,
        p.team.ids.length,
      );
      assert.ok(p.team.ids.every((id) => catalog[id]));
      assert.ok(p.team.ids.every((id) => catalog[id].cost < 4 || level >= 8));
      assert.ok(p.team.ids.every((id) => catalog[id].cost < 5 || level >= 9));
      if (level > 1) {
        assert.deepEqual(
          new Set([...p.retained, ...p.entering]),
          new Set(p.team.ids),
        );
        assert.deepEqual(
          new Set([...p.retained, ...p.leaving]),
          new Set(p.teams[level - 1].ids),
        );
      }
      for (const [id, items] of Object.entries(p.equipment)) {
        assert.ok(p.team.ids.includes(id));
        assert.ok(items.length <= 3);
      }
    }
});
test("Fast 9 uses an affordable AP holder and postpones legendary search at 1% and 3%", () => {
  for (const level of [7, 8]) {
    const p = planForLevel(ap, catalog, { level, gold: 60 });
    assert.equal(p.decision.kind, "level");
    assert.ok(p.later.includes(ap.carry));
    assert.ok(!p.search.includes(ap.carry));
    assert.ok(catalog[p.team.carry].cost < 5);
    assert.equal(shopRules.units[p.team.carry].damage, "ap");
  }
  const p = planForLevel(ap, catalog, { level: 9, gold: 60 });
  assert.equal(p.team.carry, ap.carry);
  assert.ok(p.search.includes(ap.carry));
  assert.equal(p.decision.kind, "roll");
});
test("an explicitly acquired rare unit can enter early without becoming an early reroll target", () => {
  const p = planForLevel(ap, catalog, { level: 7, copies: { [ap.carry]: 1 } });
  assert.ok(p.team.ids.includes(ap.carry));
  assert.ok(!p.search.includes(ap.carry));
  assert.ok(!p.later.includes(ap.carry));
  assert.equal(p.decision.kind, "level");
  assert.ok(p.team.slots <= 7);
});
test("health, board strength and economy override the default rush", () => {
  assert.equal(
    planForLevel(ap, catalog, { level: 7, hp: 20, gold: 50 }).decision.kind,
    "stabilize",
  );
  assert.equal(
    planForLevel(ap, catalog, { level: 7, hp: 80, gold: 50, strength: "weak" })
      .decision.kind,
    "stabilize",
  );
  assert.equal(
    planForLevel(ap, catalog, { level: 7, hp: 80, gold: 15 }).decision.kind,
    "save",
  );
});
test("Adaptor reroll targets cost-3s, never Nidalee 3-star, and reacts to copies and contest", () => {
  const p = planForLevel(adapt, catalog, { level: 7, gold: 60 });
  assert.ok(p.strategy.targets.length > 0);
  assert.ok(p.strategy.targets.every((id) => catalog[id].cost === 3));
  assert.ok(!p.strategy.targets.includes(adapt.carry));
  assert.equal(p.decision.kind, "roll");
  assert.equal(p.team.carry, "DA_Gromp18_AP");
  assert.equal(
    planForLevel(adapt, catalog, { level: 7, gold: 60, contested: true })
      .decision.kind,
    "pivot",
  );
  assert.equal(
    planForLevel(adapt, catalog, { level: 7, gold: 30 }).decision.kind,
    "save",
  );
  const completed = Object.fromEntries(p.strategy.targets.map((id) => [id, 9]));
  const done = planForLevel(adapt, catalog, {
    level: 7,
    gold: 60,
    copies: completed,
  });
  assert.equal(done.decision.kind, "level");
  assert.equal(done.targets.length, 0);
  const later = planForLevel(adapt, catalog, { level: 9, copies: completed });
  assert.ok(p.strategy.targets.every((id) => later.team.ids.includes(id)));
});
test("custom comps derive one-, two- and three-cost reroll levels and accept empty rosters", () => {
  for (const [carry, level] of [
    ["DA_Karma18", 5],
    ["DA_18_LeBlanc", 6],
    ["DA_18_MasterYi_AD", 7],
  ]) {
    const comp = {
      id: "comp-custom",
      style: "Personalizada",
      champions: [carry],
      carry,
    };
    assert.equal(strategyFor(comp, catalog).targetLevel, level);
    assert.equal(
      planForLevel(comp, catalog, { level, gold: 60 }).decision.kind,
      "roll",
    );
  }
  assert.deepEqual(
    planForLevel(
      { id: "empty", style: "Personalizada", champions: [], carry: "" },
      catalog,
    ).team.ids,
    [],
  );
});
test("Elder Dragon consumes two slots and Fast 8 Riftbeasts stabilizes on its four-cost bridge", () => {
  const comp = find("s18-riftbeasts");
  const eight = planForLevel(comp, catalog, { level: 8, gold: 60 });
  assert.equal(eight.decision.kind, "roll");
  assert.match(eight.decision.title, /Rubrivira/);
  assert.ok(!eight.search.includes(comp.carry));
  const stable = planForLevel(comp, catalog, {
    level: 8,
    gold: 60,
    copies: { DA_Brambleback18: 3 },
  });
  assert.equal(stable.decision.kind, "level");
  const nine = planForLevel(comp, catalog, { level: 9 });
  assert.ok(nine.team.ids.includes(comp.carry));
  assert.equal(nine.team.ids.length, 8);
  assert.equal(nine.team.slots, 9);
});
test("invalid saved input is clamped and no algorithm mutates comps or context", () => {
  assert.deepEqual(
    normalizeLevelContext({
      level: 99,
      gold: -4,
      hp: NaN,
      copies: { x: 20, y: -5 },
      strength: "unknown",
    }),
    {
      level: 10,
      gold: 0,
      hp: 75,
      copies: { x: 9, y: 0 },
      strength: "stable",
      contested: false,
    },
  );
  const comp = structuredClone(ap),
    context = { level: 7, copies: { [ap.carry]: 1 } };
  const before = JSON.stringify([comp, context]);
  planForLevel(comp, catalog, context);
  assert.equal(JSON.stringify([comp, context]), before);
});
