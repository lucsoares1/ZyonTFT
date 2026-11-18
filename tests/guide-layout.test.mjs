import test from 'node:test';
import assert from 'node:assert/strict';
import {guideBoundsFor,shopOnlyPlacement} from '../electron/guide-layout.cjs';
import {freshSession,changeSession,normalizeSession} from '../electron/game-session.cjs';

test('expanded overlay restores through both compact modes without changing match data',()=>{
  const display={x:-1920,y:0,width:1920,height:1080};
  const original=freshSession();
  const expanded=changeSession(original,{type:'guide-expand'});
  assert.deepEqual(expanded.context,original.context);
  assert.equal(guideBoundsFor(display,expanded).width,1672);
  assert.equal(guideBoundsFor(display,expanded).height,941);
  const compact=changeSession(expanded,{type:'collapse'});
  assert.equal(guideBoundsFor(display,compact).height,160);
  assert.equal(changeSession(compact,{type:'collapse'}).guideExpanded,true);
  const shop=changeSession(expanded,{type:'shop-only'});
  assert.equal(guideBoundsFor(display,shop).width,116);
  assert.equal(guideBoundsFor(display,shop).height,44);
  assert.equal(changeSession(shop,{type:'shop-only'}).guideExpanded,true);
  for(const action of [{type:'match',id:'new'},{type:'end'},{type:'reset'}])assert.equal(changeSession(expanded,action).guideExpanded,true);
  const small=guideBoundsFor({x:0,y:0,width:1280,height:720},expanded);
  assert.ok(small.x>=0&&small.y>=0&&small.x+small.width<=1280&&small.y+small.height<=720);
  assert.equal(normalizeSession({guideExpanded:'true'}).guideExpanded,false);
  const resized=changeSession(expanded,{type:'guide-size',size:{width:1122,height:1402}});
  assert.deepEqual(normalizeSession(resized).guideSize,{width:1122,height:1402});
  assert.deepEqual(changeSession(resized,{type:'reset'}).guideSize,resized.guideSize);
  assert.deepEqual(changeSession(resized,{type:'end'}).guideSize,resized.guideSize);
  assert.equal(normalizeSession({guideSize:{width:Infinity,height:3}}).guideSize,null);
});
test('shop-only mode and dragged position survive match boundaries without changing copies',()=>{
  let s=changeSession(freshSession(),{type:'guide-position',position:{x:360,y:190}});
  s=changeSession(s,{type:'shop-only'});
  for(const action of [{type:'match',id:'game'},{type:'end'},{type:'reset'}]){
    s=changeSession(s,action);assert.equal(s.shopOnly,true);assert.deepEqual(s.guidePosition,{x:360,y:190});
  }
  assert.deepEqual(s.context.copies,{});
  assert.equal(normalizeSession({guidePosition:{x:Infinity,y:2}}).guidePosition,null);
  assert.equal(changeSession(s,{type:'shop-only'}).shopOnly,false);
});
test('minimize and restore anchor the control on screen, including a dragged miniature',()=>{
  const display={x:-1920,y:0,width:1920,height:1080};
  const original={...freshSession(),guidePosition:{x:500,y:100}};
  const bounds=guideBoundsFor(display,original),offset={x:776,y:23};
  const placement=shopOnlyPlacement(display,original,bounds,offset);
  const small=changeSession(original,{type:'shop-only',placement}),smallBounds=guideBoundsFor(display,small);
  assert.equal(bounds.x+offset.x,smallBounds.x+96);assert.equal(bounds.y+offset.y,smallBounds.y+22);
  const restored=changeSession(small,{type:'shop-only',placement:shopOnlyPlacement(display,small,smallBounds,{x:96,y:22})});
  assert.deepEqual(guideBoundsFor(display,restored),bounds);
  const moved=changeSession(small,{type:'guide-position',position:{x:1200,y:180}}),movedBounds=guideBoundsFor(display,moved);
  const expanded=changeSession(moved,{type:'shop-only',placement:shopOnlyPlacement(display,moved,movedBounds,{x:96,y:22})});
  const expandedBounds=guideBoundsFor(display,expanded);
  assert.equal(movedBounds.x+96,expandedBounds.x+offset.x);assert.equal(movedBounds.y+22,expandedBounds.y+offset.y);
});
test('free placement stays reachable on another resolution and negative-origin monitor',()=>{
  const display={x:-1920,y:0,width:1920,height:1080};
  let s={...freshSession(),guidePosition:{x:360,y:190}};
  assert.deepEqual(guideBoundsFor(display,s),{x:-1560,y:190,width:840,height:800});
  assert.deepEqual(guideBoundsFor(display,{...s,shopOnly:true}),{x:-1560,y:190,width:116,height:44});
  const small=guideBoundsFor({x:0,y:0,width:1280,height:720},{...s,guidePosition:{x:1800,y:900}});
  assert.ok(small.x>=0&&small.y>=0&&small.x+small.width<=1280&&small.y+small.height<=720);
});

test('edge-clamped miniature restores the actual full origin repeatedly and after restart',()=>{
 const display={x:0,y:0,width:1280,height:720};
 for(const position of [{x:0,y:0},{x:440,y:64},{x:440,y:100},{x:0,y:100}]){
  let s={...freshSession(),guidePosition:position};const original=guideBoundsFor(display,s);
  for(let i=0;i<4;i++){
   s=changeSession(s,{type:'shop-only',placement:shopOnlyPlacement(display,s,guideBoundsFor(display,s),{x:830,y:150})});
   s=normalizeSession(JSON.parse(JSON.stringify(s)));
   s=changeSession(s,{type:'shop-only',placement:shopOnlyPlacement(display,s,guideBoundsFor(display,s),{x:96,y:22})});
   assert.deepEqual(guideBoundsFor(display,s),original);
  }
 }
});
