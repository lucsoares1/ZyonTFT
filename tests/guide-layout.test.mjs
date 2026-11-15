import test from 'node:test';
import assert from 'node:assert/strict';
import {guideBoundsFor} from '../electron/guide-layout.cjs';
import {freshSession,changeSession,normalizeSession} from '../electron/game-session.cjs';
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
test('free placement stays reachable on another resolution and negative-origin monitor',()=>{
  const display={x:-1920,y:0,width:1920,height:1080};
  let s={...freshSession(),guidePosition:{x:360,y:190}};
  assert.deepEqual(guideBoundsFor(display,s),{x:-1560,y:190,width:840,height:800});
  assert.deepEqual(guideBoundsFor(display,{...s,shopOnly:true}),{x:-1560,y:190,width:116,height:44});
  const small=guideBoundsFor({x:0,y:0,width:1280,height:720},{...s,guidePosition:{x:1800,y:900}});
  assert.ok(small.x>=0&&small.y>=0&&small.x+small.width<=1280&&small.y+small.height<=720);
});
