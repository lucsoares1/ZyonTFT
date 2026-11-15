import test from "node:test";
import assert from "node:assert/strict";
import tracker from "../electron/purchase-tracker.cjs";
import gold from "../electron/gold-ocr.cjs";
import session from "../electron/game-session.cjs";
const catalog = [
  { id: "Vi", cost: 3 },
  { id: "Yi", cost: 3 },
  { id: "Alistar", cost: 2 },
  { id: "Rubri", cost: 1 },
];
const base = {
  matchId: "game-1",
  slots: ["Vi", "Yi", "Alistar", "Rubri", null],
  empty: [false, false, false, false, true],
  gold: 18,
  clicks: [],
};
function setup() {
  const t = new tracker.PurchaseTracker(catalog);
  t.observe({ ...base, at: 1000 });
  t.observe({ ...base, at: 2000 });
  return t;
}
const buy = {
  ...base,
  at: 3000,
  gold: 16,
  slots: ["Vi", "Yi", null, "Rubri", null],
  empty: [false, false, true, false, true],
  clicks: [{ slot: 2, at: 2500 }],
};
test("gold parser rejects partial/ambiguous OCR and confirms decreases and zero twice", () => {
  for (const s of ["", "8 8", "8/68", "P 18", "-3", "1000", "1O", "08"])
    assert.equal(gold.parseGold(s), null);
  let r = gold.freshGoldReading();
  for (const n of [18, 8, 0, 108, 999]) {
    r = gold.acceptGold(r, String(n), 1000);
    assert.notEqual(r.status, "confirmed");
    r = gold.acceptGold(r, String(n), 2000);
    assert.equal(r.gold, n);
  }
  assert.equal(gold.acceptGold(r, "999", 10000).status, "confirming");
  assert.equal(gold.acceptGold(r, "?", 2500).gold, 999);
});
test("purchase requires click, gold debit and two visually empty shop frames; never double counts", () => {
  const t = setup();
  assert.deepEqual(t.observe(buy), []);
  const confirmed = t.observe({ ...buy, at: 4000, clicks: [] });
  assert.deepEqual(
    confirmed.map((p) => p.id),
    ["Alistar"],
  );
  assert.deepEqual(t.observe({ ...buy, at: 5000, clicks: [] }), []);
});
test("no purchase for failed click, OCR dropout, reroll, wrong debit, stale click or missing click", () => {
  for (const override of [
    { slots: base.slots, empty: base.empty, gold: 18 },
    { empty: base.empty },
    { slots: ["Rubri", "Vi", null, "Rubri", null] },
    { gold: 15 },
    { clicks: [{ slot: 2, at: 500 }] },
    { clicks: [] },
    {
      clicks: [
        { slot: 2, at: 2500 },
        { slot: -1, at: 2600 },
      ],
    },
  ]) {
    const t = setup();
    assert.deepEqual(t.observe({ ...buy, ...override }), []);
    assert.deepEqual(
      t.observe({ ...buy, ...override, at: 4000, clicks: [] }),
      [],
    );
  }
});
test("two purchases, repeated clicks and identical champions keep their slot identity", () => {
  const t = setup();
  const f = {
    ...buy,
    slots: [null, "Yi", null, "Rubri", null],
    empty: [true, false, true, false, true],
    gold: 13,
    clicks: [
      { slot: 0, at: 2300 },
      { slot: 0, at: 2400 },
      { slot: 2, at: 2500 },
    ],
  };
  t.observe(f);
  assert.deepEqual(
    t.observe({ ...f, at: 4000, clicks: [] }).map((p) => p.id),
    ["Vi", "Alistar"],
  );
  const d = new tracker.PurchaseTracker(catalog);
  const b = { ...base, slots: ["Vi", "Vi", "Alistar", "Rubri", null] };
  d.observe({ ...b, at: 1000 });
  d.observe({ ...b, at: 2000 });
  const after = {
    ...b,
    at: 3000,
    gold: 12,
    slots: [null, null, "Alistar", "Rubri", null],
    empty: [true, true, false, false, true],
    clicks: [
      { slot: 0, at: 2300 },
      { slot: 1, at: 2400 },
    ],
  };
  d.observe(after);
  assert.deepEqual(
    d.observe({ ...after, at: 4000, clicks: [] }).map((p) => p.id),
    ["Vi", "Vi"],
  );
});
test("uncertain readings, reset and new match discard pending purchase evidence", () => {
  for (const interrupt of [
    (t) => t.reset(),
    (t) => t.observe({ ...buy, at: 3500, gold: null }),
    (t) => t.observe({ ...buy, at: 3500, matchId: "game-2", clicks: [] }),
  ]) {
    const t = setup();
    t.observe(buy);
    interrupt(t);
    assert.deepEqual(t.observe({ ...buy, at: 4000, clicks: [] }), []);
  }
});
test("new game resets resources and purchases, same game resumes, gold remains automatic", () => {
  let s = session.changeSession(session.freshSession(), {
    type: "match",
    id: "game-1",
  });
  s = session.changeSession(s, { type: "ocr-gold", value: 18 });
  s = session.changeSession(s, { type: "purchase", id: "Alistar", at: 4000 });
  assert.equal(s.context.copies.Alistar, 1);
  assert.deepEqual(
    session.changeSession(JSON.parse(JSON.stringify(s)), {
      type: "match",
      id: "game-1",
    }),
    s,
  );
  s = session.changeSession(s, { type: "gold", delta: 1 });
  assert.equal(s.context.gold, 18);
  assert.equal(session.normalizeSession({...s,goldMode:"manual"}).goldMode,"ocr");
  assert.equal(
    session.changeSession(s, { type: "ocr-gold", value: 8 }).context.gold,
    8,
  );
  s = session.changeSession(s, { type: "gold-mode", value: "ocr" });
  assert.equal(
    session.changeSession(s, { type: "ocr-gold", value: 8 }).context.gold,
    8,
  );
  s = session.changeSession(s, { type: "match", id: "game-2" });
  assert.deepEqual(s.context.copies, {});
  assert.deepEqual(s.purchases, []);
  assert.equal(s.context.gold, 0);
  assert.equal(s.context.level, 1);
  assert.equal(session.changeSession(s, { type: "reset" }).matchId, "game-2");
});
