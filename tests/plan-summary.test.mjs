import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePlan } from '../src/plan-summary.mjs';
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
