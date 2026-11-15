import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { migrateSaved } from "../src/preferences.mjs";
import { recognizeNames, matchShop } from "../src/shop.mjs";
const catalog = JSON.parse(
  fs.readFileSync("src/generated/catalog.json"),
).champions;
const comps = JSON.parse(fs.readFileSync("src/generated/comps.json"));
const defaults = {
  version: 2,
  dataRevision: "set18-18.6-r1",
  comps,
  active: comps[0].id,
  pinned: comps[0].id,
  selected: comps[0].champions,
};
test("every curated Set 18 comp, carry and item holder resolves in the current roster", () => {
  assert.equal(comps.length, 18);
  assert.equal(catalog.length, 74);
  for (const comp of comps) {
    assert.equal(comp.source.set, 18);
    assert.equal(comp.source.patch, "18.6");
    assert.ok(comp.champions.includes(comp.carry));
    for (const id of comp.champions)
      assert.ok(catalog.some((c) => c.id === id));
    for (const id of Object.keys(comp.items))
      assert.ok(comp.champions.includes(id));
  }
  assert.equal(catalog.find((c) => c.name === "Ashe").cost, 5);
  assert.deepEqual(catalog.find((c) => c.name === "Master Yi").traits, [
    "Florescer",
    "Adaptador",
  ]);
});
test("installed demo preferences migrate while preserving personal plans and settings", () => {
  const value = {
    version: 1,
    comps: [
      {
        id: "ashe",
        name: "Ashe e guardiões",
        champions: [
          "Ashe",
          "Sejuani",
          "Braum",
          "Leona",
          "Shen",
          "Varus",
          "Lulu",
          "Jinx",
        ],
      },
      {
        id: "comp-123",
        style: "Personalizada",
        name: "Meu plano",
        champions: ["Vi", "Braum", "MasterYi"],
        carry: "Vi",
      },
    ],
    active: "ashe",
    pinned: "ashe",
    selected: ["Ashe"],
    opacity: 75,
  };
  const saved = migrateSaved(value, defaults, catalog, defaults.dataRevision);
  assert.equal(saved.comps.length, comps.length + 1);
  assert.equal(saved.active, comps[0].id);
  assert.equal(saved.pinned, comps[0].id);
  assert.equal(saved.opacity, 75);
  assert.deepEqual(saved.comps.at(-1).champions, [
    "DA_Vi18",
    "DA_18_MasterYi_AD",
  ]);
  assert.deepEqual(saved.selected, comps[0].champions);
  assert.deepEqual(
    migrateSaved(saved, defaults, catalog, defaults.dataRevision),
    saved,
  );
});
test("current roster recognizes screenshot units and separates Lux forms", () => {
  const recognized = recognizeNames(
    ["Vi", "Master Yi", "Alistar", "Rubrivirim", "Camelô"],
    catalog,
  );
  assert.deepEqual(
    recognized.map((c) => c.id),
    ["DA_Vi18", "DA_18_MasterYi_AD", "DA_18_Alistar", "DA_Cinderling18", null],
  );
  const lux = recognizeNames(
    ["Lux", "Lux (Lunar)", "Lux (Sabugueiro)"],
    catalog,
  );
  assert.deepEqual(
    lux.slice(0, 3).map((c) => c.id),
    ["DA_Lux18_Base", "DA_18_Lux_Moonbeam", "DA_18_Lux_Elderwood"],
  );
  const badges = matchShop(lux, ["DA_18_Lux_Moonbeam"]);
  assert.deepEqual(
    badges.map((c) => c.highlighted),
    [false, true, false, false, false],
  );
});

test("editing a built-in legacy demo preserves its renamed plan, pin and selection", () => {
  const value = {
    version: 1,
    comps: [
      {
        id: "ashe",
        name: "Minha adaptação",
        style: "Personalizada",
        champions: ["Vi", "MasterYi"],
        carry: "MasterYi",
      },
    ],
    active: "ashe",
    pinned: "ashe",
    selected: ["MasterYi"],
    opacity: 75,
  };
  const saved = migrateSaved(value, defaults, catalog, defaults.dataRevision);
  const own = saved.comps.find((c) => c.id === "comp-legacy-ashe");
  assert.equal(own.name, "Minha adaptação");
  assert.equal(own.style, "Personalizada");
  assert.deepEqual(own.champions, ["DA_Vi18", "DA_18_MasterYi_AD"]);
  assert.equal(own.carry, "DA_18_MasterYi_AD");
  assert.equal(saved.pinned, own.id);
  assert.equal(saved.active, own.id);
  assert.deepEqual(saved.selected, ["DA_18_MasterYi_AD"]);
  assert.deepEqual(
    migrateSaved(saved, defaults, catalog, defaults.dataRevision),
    saved,
  );
  const editWithoutStyle = migrateSaved(
    { ...value, comps: [{ ...value.comps[0], style: "Ataque à distância" }] },
    defaults,
    catalog,
    defaults.dataRevision,
  );
  assert.ok(editWithoutStyle.comps.find((c) => c.name === "Minha adaptação"));
});
