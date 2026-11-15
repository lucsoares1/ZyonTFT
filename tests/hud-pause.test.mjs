import test from "node:test";
import assert from "node:assert/strict";
import gold from "../electron/gold-ocr.cjs";
import level from "../electron/level-ocr.cjs";

test("focus pauses keep confirmed HUD values but require two fresh frames after returning",()=>{
  let g=gold.acceptGold(gold.acceptGold(gold.freshGoldReading(),"3",1000),"3",2000);
  g=gold.pauseGoldReading(g);
  assert.equal(g.gold,3); assert.equal(g.status,"waiting"); assert.equal(g.hits,0);
  g=gold.acceptGold(g,"15",3000);
  assert.equal(g.gold,3); assert.equal(g.status,"confirming");
  assert.equal(gold.acceptGold(g,"15",4000).gold,15);
  let l=level.acceptReading(level.acceptReading(level.freshReading(),"Nv. 8",1,1000),"Nv. 8",1,2000);
  l=level.pauseLevelReading(l);
  assert.equal(l.level,8); assert.equal(l.status,"waiting"); assert.equal(l.hits,0);
  assert.equal(level.acceptReading(l,"Nv. 7",8,3000).status,"lower");
  assert.equal(gold.freshGoldReading().gold,null,"a new match never keeps previous gold");
});
