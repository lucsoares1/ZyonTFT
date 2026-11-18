import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planForLevel,traitCounts,teamCapacity,teamSlots,shopRules} from '../src/level-planner.mjs';
import {effectiveComp} from '../src/duo-plans.mjs';
import {publishedBoard,plannedBoard} from '../src/board-preview.mjs';
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync('src/generated/catalog.json')).champions.map(c=>[c.id,c]));
const {comps}=JSON.parse(fs.readFileSync('src/generated/pivot.json'));
const comp=comps.find(c=>c.id==='s18-pivot-riftbeast-10');
const equalSet=(a,b)=>assert.deepEqual([...a].sort(),[...b].sort());
test('Riftbeast capacity facts match the verified trait threshold and Elder Dragon contribution',()=>{
 assert.deepEqual(shopRules.capacityTraits,[{trait:'Fera do Rift',minUnits:10,slots:2}]);
 assert.equal(traitCounts([comp.carry],catalog)['Fera do Rift'],2);
 assert.equal(traitCounts(comp.champions,catalog)['Fera do Rift'],10);
 assert.equal(teamSlots(comp.champions),12);
 assert.equal(teamCapacity(comp.champions,catalog,10),12);
 const without=comp.champions.filter(id=>id!=='DA_Scuttlecrab18');
 assert.equal(traitCounts(without,catalog)['Fera do Rift'],9);
 assert.equal(teamCapacity(without,catalog,10),10);
});
test('level10 matches the entire published Riftbeast board, including Taric and Gnar',()=>{
 const before=JSON.stringify(comp),plan=planForLevel(comp,catalog,{level:10});
 equalSet(plan.team.ids,comp.champions);
 assert.equal(plan.team.ids.length,11);
 assert.equal(plan.team.slots,12);assert.equal(plan.team.capacity,12);
 const route=publishedBoard(comp,catalog,{level:10,units:comp.pivot.levels.find(s=>s.level===10).units});
 const adaptive=plannedBoard(comp,catalog,plan);
 assert.deepEqual(adaptive.positions,route.positions);
 assert.deepEqual(adaptive.items,route.items);
 assert.equal(JSON.stringify(comp),before);
});
test('the bonus cannot bootstrap its own unlock at level9 or survive a missing Riftbeast',()=>{
 const nine=planForLevel(comp,catalog,{level:9});
 assert.ok(nine.team.slots<=9);assert.equal(nine.team.capacity,9);
 const edited=effectiveComp(comp,{champions:comp.champions.filter(id=>id!=='DA_Scuttlecrab18')},catalog);
 const plan=planForLevel(edited,catalog,{level:10});
 assert.equal(plan.team.capacity,10);assert.ok(plan.team.slots<=10);
 assert.ok(!plan.team.ids.includes('DA_Scuttlecrab18'));
});
test('an adjusted Riftbeast roster unlocks the same real bonus without discarding personal support choices',()=>{
 const extras=['DA_18_Akali_AD','DA_18_Camille'];
 const adjusted=effectiveComp(comp,{champions:[...comp.champions,...extras]},catalog);
 const plan=planForLevel(adjusted,catalog,{level:10});
 for(const id of comp.champions.filter(id=>catalog[id].traits.includes('Fera do Rift')))assert.ok(plan.team.ids.includes(id));
 assert.equal(plan.team.capacity,12);assert.equal(plan.team.slots,12);
});
test('all published teams stay within real capacity, with unchanged transitions and valid traits',()=>{
 for(const c of comps)for(let level=1;level<=10;level++){
  const plan=planForLevel(c,catalog,{level});
  assert.ok(plan.team.slots<=plan.team.capacity,c.name+' '+level);
  assert.equal(plan.team.capacity,teamCapacity(plan.team.ids,catalog,level));
  if(plan.team.capacity>level)assert.equal(traitCounts(plan.team.ids,catalog)['Fera do Rift'],10);
 }
});
