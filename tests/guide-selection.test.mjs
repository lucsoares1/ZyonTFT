import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGuideComposition,guardCompositionPublication} from '../electron/guide-selection.cjs';
import {effectiveComp} from '../src/duo-plans.mjs';
const first={id:'first',name:'Primeira',champions:['a'],carry:'a'},second={id:'personal',name:'Minha comp',champions:['b'],carry:'b'};
test('overlay may select any saved comp without resetting the game or accepting unknown IDs',()=>{
  const match={context:{level:9,gold:56,copies:{a:3}},purchases:[{id:'a',at:10}],matchId:'live'};
  const state={saved:{comps:[first,second],pinned:first.id,active:first.id},pinned:first.id,guideComp:first,baseGuideComp:first,selected:['a'],gameSession:match,overlayPlans:{}};
  assert.equal(chooseGuideComposition(state,'unknown',effectiveComp,{}),null);
  const selected=chooseGuideComposition(state,second.id,effectiveComp,{b:{id:'b'}});
  assert.equal(selected.pinned,second.id);assert.equal(selected.saved.active,second.id);
  assert.equal(selected.gameSession,match);assert.deepEqual(selected.selected,['b']);
  assert.equal(state.pinned,first.id);
  const guarded=guardCompositionPublication(selected,{...state,opacity:80,saved:{...state.saved,opacity:80}});
  assert.equal(guarded.pinned,second.id);assert.equal(guarded.saved.pinned,second.id);assert.equal(guarded.opacity,80);
  const acknowledged={...state,compSelectionRevision:selected.compSelectionRevision};
  assert.equal(guardCompositionPublication(selected,acknowledged),acknowledged,'subsequent choices from the main app remain available');
});
