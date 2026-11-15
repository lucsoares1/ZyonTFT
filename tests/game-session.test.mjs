import test from "node:test";
import assert from "node:assert/strict";
import session from "../electron/game-session.cjs";
import ocr from "../electron/level-ocr.cjs";
import { planForLevel } from "../src/level-planner.mjs";
import fs from "node:fs";
const catalog = Object.fromEntries(
  JSON.parse(fs.readFileSync("src/generated/catalog.json")).champions.map(
    (c) => [c.id, c],
  ),
);
const comps = JSON.parse(fs.readFileSync("src/generated/comps.json"));
test("fresh match starts at 1 and legacy manual mode always migrates to OCR", () => {
  let s = session.freshSession();
  assert.equal(s.context.level, 1);
  assert.equal(s.levelMode, "ocr");
  for (let i = 0; i < 30; i++)
    s = session.changeSession(s, { type: "level", delta: 1 });
  assert.equal(s.context.level, 10);
  assert.equal(s.levelMode, "ocr");
  assert.equal(
    session.changeSession(s, { type: "ocr-level", value: 7 }).context.level,
    7,
  );
  s = session.changeSession(s, { type: "level-mode", value: "ocr" });
  assert.equal(
    session.changeSession(s, { type: "ocr-level", value: 7 }).context.level,
    7,
  );
  s = session.changeSession(s, { type: "reset" });
  assert.deepEqual(s, session.freshSession());
  for (let i = 0; i < 12; i++)
    s = session.changeSession(s, { type: "copies", id: "DA_Vi18", delta: 1 });
  assert.equal(s.context.copies.DA_Vi18, 9);
});
test("first OCR reading corrects a legacy manual level; later lower readings remain rejected", () => {
  const saved = session.normalizeSession({levelMode:"manual",context:{level:10}});
  assert.equal(saved.levelMode,"ocr");
  let r=ocr.acceptReading(ocr.freshReading(),"Nv. 8",saved.context.level,1000);
  assert.equal(r.status,"confirming");
  r=ocr.acceptReading(r,"Nv. 8",saved.context.level,2000);
  assert.equal(r.level,8);
  assert.equal(ocr.acceptReading(ocr.pauseLevelReading(r),"Nv. 7",8,3000).status,"lower");
});
test("level parser rejects XP fractions, prices, incomplete labels and conflicting labels", () => {
  for (const [text, level] of [
    ["Nv. 8", 8],
    ["Nv.7", 7],
    ["Lvl 10", 10],
    ["Nível 9", 9],
    ["Level 6", 6],
    ["Nv.1", 1],
  ])
    assert.equal(ocr.parseLevel(text), level);
  for (const text of [
    "0/68 Comprar EXP",
    "52/56",
    "8",
    "Nv. 80",
    "Nv.0",
    "Nv.11",
    "Nv. 7 Nv. 8",
    "",
  ])
    assert.equal(ocr.parseLevel(text), null, text);
});
test("two consecutive frames, freshness and no downward jump protect the active match", () => {
  let r = ocr.acceptReading(ocr.freshReading(), "Nv. 8", 2, 10000);
  assert.equal(r.status, "confirming");
  assert.equal(r.level, null);
  r = ocr.acceptReading(r, "Nv. 8", 2, 11000);
  assert.equal(r.level, 8);
  assert.equal(ocr.acceptReading(r, "Nv. 7", 8, 12000).status, "lower");
  assert.equal(ocr.acceptReading(r, "Nv. 9", 8, 19000).status, "confirming");
  r = ocr.acceptReading(r, "", 8, 12000);
  assert.equal(r.hits, 0);
  assert.equal(r.level, 8);
  assert.equal(ocr.acceptReading(r, "Nv. 9", 8, 13000).status, "confirming");
});
test("fresh start and transition purchase targets are attainable for every comp", () => {
  for (const comp of comps) {
    const early = planForLevel(comp, catalog, session.freshSession().context);
    assert.equal(early.decision.kind, "setup");
    assert.equal(early.team.slots, 1);
    assert.ok(early.search.every((id) => catalog[id].cost === 1));
    for (let level = 1; level <= 10; level++) {
      const p = planForLevel(comp, catalog, { level });
      assert.ok(p.reserve.every((id) => !p.team.ids.includes(id)));
      assert.ok(
        [...p.search, ...p.reserve].every(
          (id) => level >= [0, 1, 3, 5, 8, 9][catalog[id].cost],
        ),
      );
    }
  }
});
