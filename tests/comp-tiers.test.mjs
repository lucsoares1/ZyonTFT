import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compTier, buildCompSections } from "../src/comp-tiers.mjs";
const pivot = JSON.parse(fs.readFileSync("src/generated/pivot.json")).comps;
const old = JSON.parse(fs.readFileSync("src/generated/comps.json"));
test("tiers are ordered by strength and all three S builds remain discoverable", () => {
  const sections = buildCompSections([...old, ...pivot].reverse());
  assert.deepEqual(
    sections.map((s) => s.id),
    ["S", "A", "B", "C", "X", "legacy"],
  );
  assert.equal(sections[0].builds, 3);
  assert.equal(sections[0].comps.length, 3);
  assert.equal(
    sections.reduce((n, s) => n + s.builds, 0),
    80,
  );
  assert.ok(
    sections
      .find((s) => s.id === "legacy")
      .comps.every((c) => c.source.name === "Mobalytics"),
  );
});
test("a selected weaker variant does not hide the stronger build in its family", () => {
  const weak = pivot.find((c) => c.pivot.family === "Ahri" && c.tier === "B");
  const sections = buildCompSections(pivot, { activeId: weak.id });
  assert.ok(
    sections
      .find((s) => s.id === "S")
      .comps.some((c) => c.pivot.family === "Ahri" && c.tier === "S"),
  );
  assert.ok(
    sections.find((s) => s.id === "B").comps.some((c) => c.id === weak.id),
  );
  assert.ok(sections.every((s) => s.comps.every((c) => c.tier === s.id)));
});
test("tier filtering is compatible with query results and personal plans never inherit a rank", () => {
  const personal = { ...pivot[0], style: "Personalizada" };
  assert.equal(compTier(personal), "personal");
  assert.equal(
    compTier({ ...pivot[0], source: { ...pivot[0].source, patch: "18.5" } }),
    "unranked",
  );
  assert.equal(compTier({ ...pivot[0], tier: "unknown" }), "unranked");
  const onlyA = buildCompSections(
    pivot.filter((c) => c.name.includes("Ashe")),
    { filter: "A" },
  );
  assert.deepEqual(
    onlyA.map((s) => s.id),
    ["A"],
  );
  assert.ok(onlyA[0].comps.length > 0);
  assert.equal(buildCompSections(pivot, { filter: "personal" }).length, 0);
});
