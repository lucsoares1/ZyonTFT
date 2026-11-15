import test from 'node:test';import assert from 'node:assert/strict';
import {MatchStartTracker} from '../electron/match-start.cjs';
import {changeSession,normalizeSession} from '../electron/game-session.cjs';
const session=normalizeSession({matchId:'persistent-client',startedAt:1000,context:{level:8,gold:29,copies:{DA_Cinderling18:4}},purchases:[{id:'DA_Cinderling18',at:2000}],tab:'duo',collapsed:true,shopOnly:true,guidePosition:{x:300,y:12},guideControlOffset:{x:775,y:25}});
const frame={session,matchId:session.matchId,at:400000,levelText:'Nv. 2',goldText:'3'};
test('a missed result screen in a persistent process needs sustained independent early HUD captures',()=>{
 const t=new MatchStartTracker();for(const delta of [0,400,800,1200])assert.deepEqual(t.observe({...frame,at:frame.at+delta}),{pending:true,started:false});
 assert.equal(t.observe({...frame,at:frame.at+1600}).started,true);
 const next=changeSession(session,{type:'round',id:session.matchId});
 assert.equal(next.matchId,session.matchId);assert.ok(next.startedAt>session.startedAt);assert.deepEqual(next.context.copies,{});assert.deepEqual(next.purchases,[]);assert.equal(next.context.level,1);
 for(const key of ['collapsed','shopOnly','side','guidePosition','guideControlOffset'])assert.deepEqual(next[key],session[key]);assert.equal(session.context.copies.DA_Cinderling18,4);
});
test('ordinary level corrections, high gold, unknown HUD, focus loss and a short game cannot reset the match',()=>{
 for(const patch of [{levelText:'Nv. 7'},{goldText:'29'},{goldText:''},{levelText:''},{idle:true},{matchId:'other'},{session:{...session,ended:true}},{session:{...session,startedAt:399000}}]){
  const t=new MatchStartTracker();for(let i=0;i<8;i++)assert.equal(t.observe({...frame,...patch,at:frame.at+i*400}).started,false);
 }
});
test('duplicate captures do not confirm a round; uncertain or separated frames break the confirmation',()=>{
 const t=new MatchStartTracker();for(let i=0;i<6;i++)assert.equal(t.observe(frame).started,false);
 t.observe({...frame,at:400800,goldText:''});
 assert.equal(t.observe({...frame,at:401600}).started,false);assert.equal(t.observe({...frame,at:408000}).started,false);
 assert.equal(t.observe({...frame,at:408400,levelText:'Nv. 1'}).started,false);
});
test('the new round cannot be detected again in its own fresh session',()=>{
 const next=changeSession(session,{type:'round',id:session.matchId}),t=new MatchStartTracker();
 for(let i=0;i<8;i++)assert.equal(t.observe({...frame,session:next,at:next.startedAt+i*400}).started,false);
});
