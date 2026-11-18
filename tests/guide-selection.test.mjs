import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseGuideComposition,guardCompositionPublication,commitPlannerComposition} from '../electron/guide-selection.cjs';
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

test('planner commits activate the edited roster atomically and reject older renderer publications',()=>{
 const catalog={a:{id:'a'},b:{id:'b'},c:{id:'c'}};
 const session={matchId:'live',context:{level:7,copies:{a:2}},purchases:[{id:'a'}]};
 const state={saved:{comps:[first,second],pinned:first.id,active:second.id},pinned:first.id,baseGuideComp:first,guideComp:first,overlayPlans:{[second.id]:{champions:['a'],requests:[{id:'a',goal:9,priority:2}],traits:[],excluded:[],goals:{a:9}}},gameSession:session};
 const next=commitPlannerComposition(state,{...second,champions:['c'],carry:'c',stars:{c:3},positions:{c:27},items:{c:['TFT_Item_BFSword']}},effectiveComp,catalog);
 assert.equal(next.pinned,second.id);assert.deepEqual(next.guideComp.champions,['c']);assert.equal(next.guideComp.style,'Personalizada');
 assert.equal(next.gameSession,session);assert.deepEqual(next.selected,['c']);assert.equal(next.overlayPlans[second.id].requests[0].id,'a');assert.equal(next.overlayPlans[second.id].goals.c,9);
 const late=guardCompositionPublication(next,{...state,compSelectionRevision:0});assert.deepEqual(late.saved.comps,next.saved.comps);assert.deepEqual(late.guideComp.champions,['c']);
 assert.equal(commitPlannerComposition(state,{...second,champions:['unknown']},effectiveComp,catalog),null);
});
