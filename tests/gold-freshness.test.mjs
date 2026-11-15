import test from "node:test";
import assert from "node:assert/strict";
import gold from "../electron/gold-ocr.cjs";
import {currentGold,currentLevel} from "../src/hud-reading.mjs";

test("failed or expired OCR never presents the old 62 as live gold", () => {
  let reading=gold.acceptGold(gold.acceptGold(gold.freshGoldReading(),"62",1000),"62",2000);
  assert.equal(currentGold(reading,2100),62);
  assert.equal(currentGold(reading,7001),null,"expiry also works without a new frame");
  reading=gold.acceptGold(reading,"",3000);
  assert.equal(reading.gold,62,"retain historical evidence internally");
  assert.equal(currentGold(reading,3100),null);
  reading=gold.acceptGold(reading,"56",4000);
  assert.equal(currentGold(reading,4100),null,"one new frame does not confirm the old number");
  assert.equal(reading.confirmedAt,2000);
  reading=gold.acceptGold(reading,"56",5000);
  assert.equal(currentGold(reading,5100),56);
  assert.equal(reading.confirmedAt,5000);
  assert.equal(currentGold(gold.pauseGoldReading(reading),5100),null);
  assert.equal(gold.pauseGoldReading(reading).confirmedAt,5000);
});
test("an old level is hidden until the new labelled level is confirmed",()=>{
 assert.equal(currentLevel({level:8,status:"confirmed",lastSeen:1000},2000),8);
 assert.equal(currentLevel({level:8,status:"confirmed",lastSeen:1000},6001),null);
 assert.equal(currentLevel({level:8,status:"confirming",lastSeen:2000},2100),null);
 assert.equal(currentLevel({level:9,status:"confirmed",lastSeen:3000},3100),9);
});
