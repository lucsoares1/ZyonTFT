import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectiveComp,editWorkingPlan,sharingPayload,normalizeSharedPlan,partnerNeeds} from '../src/duo-plans.mjs';
import {planForLevel} from '../src/level-planner.mjs';
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync(new URL('../src/generated/catalog.json',import.meta.url))).champions.map(c=>[c.id,c]));
const comp=JSON.parse(fs.readFileSync(new URL('../src/generated/pivot.json',import.meta.url))).comps[0];
test('overlay roster edits are reversible, preserve the source and never reintroduce removed units',()=>{
 const original=structuredClone(comp),removed=comp.champions[0],added=Object.keys(catalog).find(id=>!comp.champions.includes(id));
 let edit=editWorkingPlan(comp,null,{type:'toggle',id:removed},catalog);edit=editWorkingPlan(comp,edit,{type:'toggle',id:added},catalog);
 const working=effectiveComp(comp,edit,catalog);assert.equal(working.pivot,undefined);assert.ok(!working.champions.includes(removed));assert.ok(working.champions.includes(added));
 for(let level=1;level<=10;level++){const p=planForLevel(working,catalog,{level,gold:50,hp:100,copies:{}});assert.ok(p.team.slots<=level);assert.ok(!p.team.ids.includes(removed));assert.ok(!p.search.includes(removed));}
 assert.deepEqual(comp,original);assert.equal(editWorkingPlan(comp,edit,{type:'restore'},catalog),null);assert.equal(effectiveComp(comp,null,catalog),comp);
});
test('shared wishes react to requested star goals and OCR copy counts without modifying the match',()=>{
 const s={matchId:'game',startedAt:Date.now(),context:{copies:{[comp.carry]:1}},ended:false},before=structuredClone(s);
 let edit=editWorkingPlan(comp,null,{type:'goal',id:comp.carry,goal:9},catalog);
 const p=sharingPayload(comp,edit,s,catalog);assert.deepEqual(p.wishes.find(w=>w.id===comp.carry),{id:comp.carry,goal:9,owned:1});
 edit=editWorkingPlan(comp,edit,{type:'goal',id:comp.carry,goal:0},catalog);assert.ok(!sharingPayload(comp,edit,s,catalog).wishes.some(w=>w.id===comp.carry));assert.deepEqual(s,before);
});
test('send advice expires, rejects another match and disappears immediately when either game ends',()=>{
 const now=Date.now(),session={matchId:'local',startedAt:now,ended:false},payload=sharingPayload(comp,null,{...session,context:{copies:{}}},catalog);
 const social={session:{id:'duo'},partnerPlan:{updated_at:new Date(now).toISOString(),payload}};
 assert.ok(partnerNeeds(social,session,now).length);
 assert.equal(partnerNeeds(social,session,now+45001).length,0);assert.equal(partnerNeeds(social,{...session,ended:true},now).length,0);
 assert.equal(partnerNeeds({...social,partnerPlan:{...social.partnerPlan,payload:{...payload,ended:true}}},session,now).length,0);
 assert.equal(partnerNeeds({...social,partnerPlan:{...social.partnerPlan,payload:{...payload,startedAt:now-200000}}},session,now).length,0);
 assert.equal(partnerNeeds({...social,session:null},session,now).length,0);
});
test('incoming plans cannot inject unknown units, excessive counts or arbitrary fields',()=>{
 const id=comp.carry,p=normalizeSharedPlan({comp:{name:'Plano',champions:[id,id,'bogus'],carry:'bogus',url:'bad'},wishes:[{id,goal:9,owned:500},{id:'bogus',goal:9,owned:0}]},catalog);
 assert.deepEqual(p.comp.champions,[id]);assert.equal(p.comp.url,undefined);assert.equal(p.wishes.length,1);assert.equal(p.wishes[0].owned,9);
});
