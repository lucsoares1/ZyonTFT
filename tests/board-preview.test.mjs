import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boardPositions,championRole} from '../src/planning.mjs';
import {plannedBoard,publishedBoard} from '../src/board-preview.mjs';
import {planForLevel,shopRules} from '../src/level-planner.mjs';
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync('src/generated/catalog.json')).champions.map(c=>[c.id,c]));
const {comps}=JSON.parse(fs.readFileSync('src/generated/pivot.json'));
const kayle=comps.find(c=>c.name==='Lunar Kayle');
const sorted=value=>Object.fromEntries(Object.entries(value).sort());

test('published level six keeps the same saved cells and equipment as adaptive progression',()=>{
  const context={level:6,copies:{}},plan=planForLevel(kayle,catalog,context);
  const step=kayle.pivot.levels.find(s=>s.level===6);
  const route=publishedBoard(kayle,catalog,{level:6,units:step.units,context});
  const progression=plannedBoard(kayle,catalog,plan,context.copies);
  assert.deepEqual(sorted(route.positions),sorted(progression.positions));
  assert.deepEqual(sorted(route.items),sorted(progression.items));
  for(const id of step.units)assert.equal(route.positions[id],kayle.positions[id],id+' retains its published cell');
  assert.equal(route.positions[kayle.carry],24);
});

test('every matching published and adaptive team has identical cells, items and stars',()=>{
  let checked=0;
  for(const comp of comps)for(const step of comp.pivot.levels){
    const context={level:step.level,copies:{}},plan=planForLevel(comp,catalog,context);
    if([...step.units].sort().join()!==[...plan.team.ids].sort().join())continue;
    const route=publishedBoard(comp,catalog,{level:step.level,units:step.units,context});
    const adaptive=plannedBoard(comp,catalog,plan,context.copies);
    for(const field of ['positions','items','stars'])assert.deepEqual(sorted(route[field]),sorted(adaptive[field]),comp.name+' '+step.level+' '+field);
    checked++;
  }
  assert.ok(checked>300);
});

test('fallback cells are independent of roster order and use the same role authority as labels',()=>{
  const comp={champions:['DA_Nidalee18_AP','DA_18_Kayle','DA_18_Leona']};
  const positions=boardPositions(comp,catalog);
  assert.deepEqual(positions,boardPositions({...comp,champions:[...comp.champions].reverse()},catalog));
  assert.equal(championRole('DA_Nidalee18_AP',catalog.DA_Nidalee18_AP.role),'Retaguarda');
  assert.ok(positions.DA_Nidalee18_AP>=14);
  for(const [id,rule]of Object.entries(shopRules.units))assert.equal(championRole(id,catalog[id]?.role),rule.frontline?'Linha de frente':'Retaguarda');
  assert.equal(championRole('custom','Linha de frente'),'Linha de frente');
});

test('an owned published alternative agrees with the adaptive board without changing the plan',()=>{
  const before=JSON.stringify(kayle),step=kayle.pivot.levels.find(s=>s.level===6),swaps=step.variants[0];
  const units=step.units.map(id=>swaps.find(s=>s.replaces===id)?.championId||id);
  const context={level:6,copies:{[swaps[0].championId]:3}};
  const adaptive=plannedBoard(kayle,catalog,planForLevel(kayle,catalog,context),context.copies);
  const route=publishedBoard(kayle,catalog,{level:6,units,swaps,context});
  assert.deepEqual([...route.champions].sort(),[...adaptive.champions].sort());
  assert.deepEqual(sorted(route.positions),sorted(adaptive.positions));
  assert.deepEqual(sorted(route.items),sorted(adaptive.items));
  assert.deepEqual(sorted(route.stars),sorted(adaptive.stars));
  assert.equal(JSON.stringify(kayle),before);
});

test('manual saved positions survive every preview and retain valid unique cells',()=>{
  const manual={...kayle,style:'Personalizada',positions:{...kayle.positions,[kayle.carry]:26}};
  const before=JSON.stringify(manual),plan=planForLevel(manual,catalog,{level:8});
  const board=plannedBoard(manual,catalog,plan);
  assert.equal(board.positions[kayle.carry],26);
  assert.equal(new Set(Object.values(board.positions)).size,board.champions.length);
  assert.equal(JSON.stringify(manual),before);
});
