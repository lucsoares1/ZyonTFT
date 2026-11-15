import test from "node:test";
import assert from "node:assert/strict";
import { boardPositions, moveUnit, personalizePlan } from "../src/planning.mjs";
const catalog = {
  a: { role: "Retaguarda" },
  b: { role: "Linha de frente" },
  c: { role: "Retaguarda" },
};
const comp = {
  champions: ["a", "b"],
  carry: "a",
  positions: { a: 21, b: 3 },
  source: { name: "Guide" },
};
test("moving an existing unit swaps occupants without changing the roster or source", () => {
  const moved = moveUnit(comp, "a", 3, catalog);
  assert.deepEqual(moved.champions, ["a", "b"]);
  assert.deepEqual(moved.positions, { a: 3, b: 21 });
  assert.equal(moved.source.name, "Guide");
  assert.equal(comp.positions.a, 21);
});
test("adding onto an occupied cell moves its occupant to an empty cell and marks a personal plan", () => {
  const next = moveUnit(comp, "c", 21, catalog);
  assert.equal(next.positions.c, 21);
  assert.notEqual(next.positions.a, 21);
  assert.equal(new Set(Object.values(next.positions)).size, 3);
  assert.equal(next.style, "Personalizada");
  assert.equal(next.source, undefined);
  assert.deepEqual(next.champions, ["a", "b", "c"]);
});
test("invalid units, invalid positions and full boards reject additions", () => {
  assert.equal(moveUnit(comp, "unknown", 0, catalog), comp);
  assert.equal(moveUnit(comp, "a", 28, catalog), comp);
  const full = { champions: Array.from({ length: 28 }, (_, i) => `unit${i}`) };
  assert.equal(moveUnit(full, "a", 0, catalog), full);
});
test("invalid and colliding saved cells are repaired to unique in-bounds positions", () => {
  const positions = boardPositions(
    { champions: ["a", "b", "c"], positions: { a: 99, b: 3, c: 3 } },
    catalog,
  );
  assert.equal(Object.keys(positions).length, 3);
  assert.equal(new Set(Object.values(positions)).size, 3);
  assert.ok(Object.values(positions).every((p) => p >= 0 && p < 28));
});

// Every edit in the planner enters persistence as a personal plan.
import { migrateSaved } from "../src/preferences.mjs";
test("moved,renamed,starred and carry-edited curated plans survive a data revision change", () => {
  const edited = personalizePlan({
    ...moveUnit({ ...comp, id: "curated", name: "Original" }, "a", 3, catalog),
    name: "Meu ajuste",
    stars: { a: 3 },
    carry: "b",
  });
  const defaults = {
    version: 2,
    dataRevision: "next",
    comps: [{ ...comp, id: "curated", name: "Novo guia" }],
    active: "curated",
    pinned: "curated",
    selected: ["a", "b"],
  };
  const saved = migrateSaved(
    {
      version: 2,
      dataRevision: "previous",
      comps: [edited],
      active: "curated",
      pinned: "curated",
      selected: ["a", "b"],
    },
    defaults,
    Object.keys(catalog).map((id) => ({ id, name: id })),
    "next",
  );
  const own = saved.comps.find((c) => c.id === "curated");
  assert.equal(own.name, "Meu ajuste");
  assert.equal(own.carry, "b");
  assert.deepEqual(own.stars, { a: 3 });
  assert.deepEqual(own.positions, { a: 3, b: 21 });
  assert.equal(saved.pinned, "curated");
  assert.deepEqual(saved.selected, ["a", "b"]);
  assert.equal(own.style, "Personalizada");
});
