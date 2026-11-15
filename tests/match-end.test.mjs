import test from "node:test";
import assert from "node:assert/strict";
import {MatchEndTracker,resultScreen} from "../electron/match-end.cjs";
import {OverlayGate} from "../electron/overlay-visibility.cjs";
import {changeSession,normalizeSession} from "../electron/game-session.cjs";
const frame={matchId:"same-exe",at:1000,levelText:"",goldText:"",endText:"VOCÊ TERMINOU EM 20 LUGAR SAIR AGORA"};
test('throttled result scans require two actual captures and a recovered HUD cancels pending results',()=>{
 const tracker=new MatchEndTracker();assert.equal(tracker.observe(frame),false);
 for(const at of [1100,1200,1300])assert.equal(tracker.observe({...frame,at,endChecked:false}),false);
 assert.equal(tracker.observe({...frame,at:2100}),true);
 const reset=new MatchEndTracker();reset.observe(frame);reset.observe({...frame,at:1200,endChecked:false,goldText:'10'});assert.equal(reset.observe({...frame,at:2200}),false);
});
test("actual OCR wording from placement screenshot ends only after two HUD-free frames",()=>{
 const tracker=new MatchEndTracker();
 assert.equal(resultScreen(frame.endText),true);
 assert.equal(tracker.observe(frame),false);
 assert.equal(tracker.observe({...frame,at:2000}),true);
 for(const endText of ["Escolha um aprimoramento","Carrossel","Continuar","Sair","Condições de vitória"]){
  const t=new MatchEndTracker();assert.equal(resultScreen(endText),false);t.observe({...frame,endText});assert.equal(t.observe({...frame,endText,at:2000}),false);
 }
 for(const patch of [{levelText:"Nv. 9"},{goldText:"56"}]){
  const t=new MatchEndTracker();t.observe({...frame,...patch});assert.equal(t.observe({...frame,...patch,at:2000}),false,"active HUD contradicts result text");
 }
});
test("result latch survives focus heartbeats and session persistence; same process may start a clean round",()=>{
 const gate=new OverlayGate(),presence={foreground:true,processName:"TFTClient-Win64-Shipping",matchId:"same-exe"};
 gate.presence(presence);gate.confirmGold(presence.matchId,{status:"confirmed",gold:56});
 gate.setEnabled(false);gate.endGame(presence.matchId);gate.presence(presence);
 assert.equal(gate.canShow(true,true),false);assert.equal(gate.confirmGold(presence.matchId,{status:"confirmed",gold:56}),false);
 let session=normalizeSession({matchId:presence.matchId,context:{level:9,gold:56,copies:{test:4}},purchases:[{id:"test",at:1000}]});
 session=changeSession(session,{type:"end"});
 assert.deepEqual(session.context.copies,{});assert.equal(session.context.gold,0);assert.equal(session.context.level,1);assert.deepEqual(session.purchases,[]);
 assert.equal(normalizeSession(JSON.parse(JSON.stringify(session))).ended,true);
 gate.resumeGame(presence.matchId);session=changeSession(session,{type:"resume"});
 assert.equal(session.ended,false);assert.equal(gate.confirmGold(presence.matchId,{status:"confirmed",gold:3}),true);
 assert.equal(gate.canShow(true,true),true);
});
