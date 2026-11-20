import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {ownShoppingWishes, sharingPayload, shoppingWishes, normalizeSharedPlan} from '../src/duo-plans.mjs';

const require = createRequire(import.meta.url);
const {normalizeShopTargets, editShopTargets} = require('../electron/shop-targets.cjs');
const catalog = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('../src/generated/catalog.json', import.meta.url))).champions.map(champion => [champion.id, champion]));
const ids = Object.keys(catalog);
const comp = {id:'custom', name:'Meu plano', style:'Personalizada', carry:ids[0], champions:[ids[0]]};

test('independent targets validate catalog, bounded goals and lists without mutating input', () => {
  const original = {buy:[{id:ids[0], goal:3, priority:0}], requests:[]};
  const next = editShopTargets(original, {list:'requests', type:'set', id:ids[1], goal:9, priority:2}, catalog);
  assert.deepEqual(original, {buy:[{id:ids[0], goal:3, priority:0}], requests:[]});
  assert.deepEqual(next.requests, [{id:ids[1], goal:9, priority:2}]);
  assert.deepEqual(editShopTargets(next, {list:'buy', type:'set', id:'__proto__', goal:3}, catalog), next);
  assert.deepEqual(editShopTargets(next, {list:'buy', type:'set', id:ids[2], goal:Infinity, priority:0}, catalog), next);
  assert.deepEqual(normalizeShopTargets({buy:[{id:'bogus'}, {id:ids[0], goal:6, priority:999}]}, catalog), {buy:[{id:ids[0], goal:1, priority:0}], requests:[],excluded:[]});
  assert.equal(normalizeShopTargets({requests:ids.map(id => ({id, goal:1}))}, catalog).requests.length, 28);
});

test('personal buying does not become a duo request and works without a composition', () => {
  const targets = {buy:[{id:ids[1], goal:3, priority:0}], requests:[{id:ids[2], goal:9, priority:2}]};
  const session = {matchId:'match', context:{copies:{[ids[1]]:1, [ids[2]]:2}}};
  const before = structuredClone(session);
  assert.deepEqual(ownShoppingWishes(null, null, session, catalog, targets), [{id:ids[1], goal:3, priority:0, reason:'manual', owned:1}]);
  const payload = normalizeSharedPlan(sharingPayload(null, null, session, catalog, targets), catalog);
  assert.equal(payload.comp, null);
  assert.deepEqual(payload.shopping, [{id:ids[2], goal:9, priority:2, reason:'request', owned:2}]);
  assert.deepEqual(session, before);
});

test('removing a manual target preserves inherited comp demand and never changes roster or copies', () => {
  const session = {context:{level:7, copies:{[ids[0]]:1}}};
  const before = structuredClone({comp, session});
  let targets = editShopTargets(null, {list:'buy', type:'set', id:ids[0], goal:1, priority:0}, catalog);
  assert.equal(ownShoppingWishes(comp, null, session, catalog, targets)[0].goal, 3);
  targets = editShopTargets(targets, {list:'buy', type:'remove', id:ids[0]}, catalog);
  assert.deepEqual(ownShoppingWishes(comp, null, session, catalog, targets), shoppingWishes(comp, null, session, catalog));
  assert.deepEqual({comp, session}, before);
});

test('request edits supersede legacy same-champion demand once and preserve buying independence', () => {
  const targets = {buy:[{id:ids[1], goal:9, priority:0}], requests:[{id:ids[0], goal:1, priority:2}]};
  const session = {matchId:'match', context:{copies:{[ids[0]]:1}}};
  const payload = sharingPayload(comp, null, session, catalog, targets);
  assert.deepEqual(payload.shopping, [{id:ids[0], goal:1, priority:2, owned:1, reason:'request'}]);
  assert.ok(!payload.shopping.some(entry => entry.id === ids[1]));
  assert.equal(ownShoppingWishes(comp, null, session, catalog, targets).find(entry => entry.id === ids[0]).goal, 3);
});

test('one-click toggles override inherited shopping without altering composition, copies or explicit duo requests', () => {
  const session = {matchId:'match', context:{copies:{[ids[0]]:1}}};
  const before = structuredClone({comp,session});
  const inherited = shoppingWishes(comp,null,session,catalog);
  const original = {buy:[],requests:[{id:ids[0],goal:9,priority:2}]};
  let targets = editShopTargets(original,{list:'buy',type:'toggle',id:ids[0]},catalog,inherited);
  assert.deepEqual(targets.excluded,[ids[0]]);
  assert.equal(ownShoppingWishes(comp,null,session,catalog,targets).length,0);
  const shared = sharingPayload(comp,null,session,catalog,targets);
  assert.equal(shared.wishes.length,0);
  assert.deepEqual(shared.shopping,[{id:ids[0],goal:9,priority:2,owned:1,reason:'request'}]);
  targets = editShopTargets(targets,{list:'buy',type:'toggle',id:ids[0]},catalog,inherited);
  assert.deepEqual(targets.excluded,[]);
  assert.equal(ownShoppingWishes(comp,null,session,catalog,targets)[0].goal,3);
  assert.deepEqual({comp,session},before);
  assert.deepEqual(original,{buy:[],requests:[{id:ids[0],goal:9,priority:2}]});
});

test('manual one-click selection remains a shop target after three copies and can be deselected', () => {
  const session = {context:{copies:{[ids[1]]:3}}};
  let targets = editShopTargets(null,{list:'buy',type:'toggle',id:ids[1]},catalog,[]);
  const wanted = ownShoppingWishes(null,null,session,catalog,targets)[0];
  assert.equal(wanted.goal,9);
  assert.equal(wanted.owned,3);
  assert.ok(wanted.goal>wanted.owned);
  targets = editShopTargets(targets,{list:'buy',type:'toggle',id:ids[1]},catalog,[]);
  assert.equal(ownShoppingWishes(null,null,session,catalog,targets).length,0);
  assert.deepEqual(targets.excluded,[ids[1]]);
  targets = editShopTargets(targets,{list:'buy',type:'toggle',id:ids[1]},catalog,[]);
  assert.deepEqual(targets.excluded,[]);
  assert.equal(targets.buy[0].goal,9);
});

test('exclusions cover the entire catalog, not only the first roster of 28 units', () => {
  const targets = {buy:ids.map(id=>({id,goal:9,priority:0})),excluded:ids,requests:[]};
  assert.equal(ownShoppingWishes(null,null,null,catalog,targets).length,0);
  assert.equal(normalizeShopTargets(targets,catalog).excluded.length,ids.length);
});
