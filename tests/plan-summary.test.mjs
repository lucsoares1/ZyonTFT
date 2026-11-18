import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePlan, equipmentGroups } from '../src/plan-summary.mjs';
import fs from 'node:fs';
import {championRole} from '../src/planning.mjs';
const champions = { a: { cost: 5 }, b: { cost: 2 } };
const items = [{ id: 'armor', recipe: ['belt', 'belt'] }, { id: 'staff', recipe: ['rod', 'tear'] }];
test('shopping budget counts only one missing copy of valid roster units', () => {
  const result = summarizePlan({ champions: ['a', 'b', 'a', 'unknown'] }, champions, items, ['a', 'unknown']);
  assert.deepEqual(result.missing, ['b']);
  assert.equal(result.totalCost, 7);
  assert.equal(result.remainingCost, 2);
  assert.equal(result.collected, 1);
});
test('component totals preserve duplicate ingredients and repeated items', () => {
  const result = summarizePlan({ champions: ['a', 'b'], carry: 'b', items: { a: ['armor', 'armor'], b: ['staff'], removed: ['armor'] } }, champions, items);
  assert.deepEqual(Object.fromEntries(result.components), { belt: 4, rod: 1, tear: 1 });
  assert.deepEqual(result.holders, ['b', 'a']);
});
test('completed or empty checklists never produce a negative budget', () => {
  assert.equal(summarizePlan({ champions: ['a', 'b'] }, champions, items, ['a', 'b', 'b']).remainingCost, 0);
  const result = summarizePlan({ champions: [], items: { a: ['armor'] } }, champions, items);
  assert.equal(result.remainingCost, 0);
  assert.deepEqual(result.components, []);
});
test('equipment groups include every equipped unit in every catalog comp without duplicating frontline carries',()=>{
 const catalog=Object.fromEntries(JSON.parse(fs.readFileSync('src/generated/catalog.json')).champions.map(c=>[c.id,{...c,role:championRole(c.id,c.role)}]));
 const comps=[...JSON.parse(fs.readFileSync('src/generated/pivot.json')).comps,...JSON.parse(fs.readFileSync('src/generated/comps.json'))];
 for(const comp of comps){
  const before=JSON.stringify(comp),groups=equipmentGroups(comp,catalog),ids=groups.flatMap(g=>g.ids);
  assert.equal(ids.length,new Set(ids).size,comp.name+' unique holders');
  for(const id of comp.champions.filter(id=>comp.items?.[id]?.length))assert.ok(ids.includes(id),comp.name+' includes '+id);
  for(const group of groups)for(const id of group.ids){
   assert.ok(comp.champions.includes(id)&&catalog[id]);
   if(group.key==='frontline')assert.equal(catalog[id].role,'Linha de frente');
  }
  assert.equal(JSON.stringify(comp),before);
 }
});
test('personal plans retain tank and support items and exclude removed units and stale carries',()=>{
 const catalog={a:{role:'Linha de frente'},b:{role:'Linha de frente'},c:{role:'Retaguarda'},d:{role:'Retaguarda'}};
 const comp={champions:['a','b','c','d'],carry:'a',pivot:{carries:['removed','d']},items:{a:['x','x'],b:['y'],c:['z'],removed:['x']}};
 assert.deepEqual(equipmentGroups(comp,catalog),[
  {key:'carries',label:'Carries',ids:['a','d']},
  {key:'frontline',label:'Linha de frente',ids:['b']},
  {key:'other',label:'Outras unidades',ids:['c']},
 ]);
 assert.deepEqual(equipmentGroups({...comp,items:{}},catalog),[]);
 assert.deepEqual(equipmentGroups({champions:[],carry:'a',items:{a:['x']}},catalog),[]);
});
