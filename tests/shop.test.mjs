import test from "node:test";
import assert from "node:assert/strict";
import { matchShop, recognizeNames, validateRect } from "../src/shop.mjs";
test("five fixed slots preserve duplicate targets and sold positions", () => {
  const result = matchShop(
    ["Ashe", null, "Ashe", "Ahri", "Lulu"],
    ["Ashe", "Lulu"],
  );
  assert.deepEqual(
    result.map((s) => s.highlighted),
    [true, false, true, false, true],
  );
  assert.equal(result[2].index, 2);
});
test("uncertain and missing detections never receive a badge", () => {
  assert.deepEqual(
    matchShop(
      [
        { id: "Ashe", confidence: 0.4 },
        { id: "Ashe", confidence: 0.95 },
      ],
      ["Ashe"],
    ).map((s) => s.highlighted),
    [false, true, false, false, false],
  );
});
test("unpinning clears all matches", () =>
  assert.equal(
    matchShop(["Ashe", "Ashe"], []).some((s) => s.highlighted),
    false,
  ));
test("a special shop offer never matches a champion in the selected roster", () => {
  const catalog = [
    { id: "Vi", name: "Vi" },
    { id: "MasterYi", name: "Master Yi" },
    { id: "Alistar", name: "Alistar" },
    { id: "DA_Cinderling18", name: "Rubrivirim" },
  ];
  const detected = recognizeNames(
    ["Vi", "Master Yi", "Alistar", "Rubrivirim", "Camelô"],
    catalog,
  );
  assert.deepEqual(
    matchShop(detected, ["Vi", "Alistar", "DA_Cinderling18"]).map(
      (s) => s.highlighted,
    ),
    [true, false, true, true, false],
  );
});
test("OCR uses exact normalized names and preserves duplicate slots", () => {
  const catalog = [
    { id: "Ashe", name: "Ashe" },
    { id: "Braum", name: "Braum" },
  ];
  assert.deepEqual(
    recognizeNames(["ASHE", "bráum", "ASHE", "Ashel", ""], catalog).map(
      (s) => s.id,
    ),
    ["Ashe", "Braum", "Ashe", null, null],
  );
});
test("calibration must fit within the screen", () => {
  assert.ok(validateRect({ x: 0.245, y: 0.79, width: 0.53, height: 0.175 }));
  assert.equal(
    validateRect({ x: 0.8, y: 0.8, width: 0.5, height: 0.3 }),
    false,
  );
  assert.equal(validateRect({ x: NaN, y: 0, width: 0.5, height: 0.1 }), false);
});
