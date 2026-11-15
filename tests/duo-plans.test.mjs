import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectiveComp,editWorkingPlan,sharingPayload,normalizeSharedPlan,partnerNeeds,shoppingWishes,normalizeWorkingPlan} from '../src/duo-plans.mjs';
import {planForLevel} from '../src/level-planner.mjs';
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync(new URL('../src/generated/catalog.json',import.meta.url))).champions.map(c=>[c.id,c]));
const comp=JSON.parse(fs.readFileSync(new URL('../src/generated/pivot.json',import.meta.url))).comps[0];

test('personal compositions never publish adaptive filler champions as implicit buys',()=>{
 const custom={...comp,id:'comp-personal',style:'Personalizada',pivot:undefined,champions:[comp.carry]};
 for(let level=1;level<=10;level++){
  const session={matchId:'test',context:{level,copies:{}}};
  assert.deepEqual(shoppingWishes(custom,null,session,catalog).map(w=>w.id),[comp.carry]);
  assert.deepEqual(normalizeSharedPlan(sharingPayload(custom,null,session,catalog),catalog).shopping.map(w=>w.id),[comp.carry]);
 }
 const other=Object.values(catalog).find(c=>c.id!==comp.carry);
 const edit={traits:[other.traits[0]],requests:[{id:other.id,goal:9,priority:2}]};
 const wishes=shoppingWishes(custom,edit,{context:{level:2}},catalog);
 assert.equal(wishes.find(w=>w.id===other.id).reason,'request');
 assert.ok(wishes.every(w=>w.id===comp.carry||w.reason==='trait'||w.reason==='request'));
 assert.deepEqual(shoppingWishes({...custom,champions:[]},null,{context:{level:2}},catalog),[]);
});
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
test('send advice expires and stops when either game ends; local attachment times do not identify a shared game',()=>{
 const now=Date.now(),session={matchId:'local',startedAt:now,ended:false},payload=sharingPayload(comp,null,{...session,context:{copies:{}}},catalog);
 const social={session:{id:'duo'},partnerPlan:{updated_at:new Date(now).toISOString(),payload}};
 assert.ok(partnerNeeds(social,session,now).length);
 assert.equal(partnerNeeds(social,session,now+45001).length,0);assert.equal(partnerNeeds(social,{...session,ended:true},now).length,0);
 assert.equal(partnerNeeds({...social,partnerPlan:{...social.partnerPlan,payload:{...payload,ended:true}}},session,now).length,0);
 for(const delta of [-14400000,-200000,200000,14400000])assert.ok(partnerNeeds({...social,partnerPlan:{...social.partnerPlan,payload:{...payload,startedAt:now+delta}}},session,now).length,'late launches and persistent clients must not hide fresh partner wishes');
 assert.equal(partnerNeeds({...social,partnerPlan:{...social.partnerPlan,payload:{...payload,playing:false}}},session,now).length,0);
 assert.equal(partnerNeeds(social,{...session,matchId:null},now).length,0);
 assert.equal(partnerNeeds({...social,session:null},session,now).length,0);
});
test('incoming plans cannot inject unknown units, excessive counts or arbitrary fields',()=>{
 const id=comp.carry,p=normalizeSharedPlan({comp:{name:'Plano',champions:[id,id,'bogus','__proto__','constructor'],carry:'bogus',url:'bad'},wishes:[{id,goal:9,owned:500},{id:'bogus',goal:9,owned:0},{id:'__proto__',goal:9,owned:0}]},catalog);
 assert.deepEqual(p.comp.champions,[id]);assert.equal(p.comp.url,undefined);assert.equal(p.wishes.length,1);assert.equal(p.wishes[0].owned,9);
});
test('marked synergies request champions without adding them to the board, and reach the partner',()=>{
 const target=Object.values(catalog).find(c=>!comp.champions.includes(c.id)),name=target.traits[0],session={matchId:'match',startedAt:Date.now(),context:{level:10,copies:{}}};
 const edit=editWorkingPlan(comp,null,{type:'trait',name},catalog),working=effectiveComp(comp,edit,catalog);
 assert.deepEqual(working.champions,comp.champions);assert.deepEqual(edit.traits,[name]);
 const payload=sharingPayload(working,edit,session,catalog),wish=payload.shopping.find(w=>w.id===target.id);
 assert.equal(wish.goal,1);assert.equal(wish.reason,'trait');assert.deepEqual(payload.traits,[name]);
 const normalized=normalizeSharedPlan(payload,catalog),social={session:{id:'duo'},partnerPlan:{updated_at:new Date().toISOString(),payload:normalized}};
 assert.ok(partnerNeeds(social,session).some(w=>w.id===target.id));
 const complete={...session,context:{...session.context,copies:{[target.id]:1}}};
 assert.ok(!shoppingWishes(working,edit,complete,catalog).some(w=>w.id===target.id&&w.goal>w.owned));
});
test('explicit champion goals and removals override synergy requests; restore clears both',()=>{
 const name=catalog[comp.carry].traits[0];let edit=editWorkingPlan(comp,null,{type:'trait',name},catalog);
 edit=editWorkingPlan(comp,edit,{type:'goal',id:comp.carry,goal:0},catalog);
 assert.ok(!shoppingWishes(effectiveComp(comp,edit,catalog),edit,{context:{level:10}},catalog).some(w=>w.id===comp.carry));
 edit=editWorkingPlan(comp,edit,{type:'toggle',id:comp.carry},catalog);
 assert.ok(!shoppingWishes(effectiveComp(comp,edit,catalog),edit,{context:{level:10}},catalog).some(w=>w.id===comp.carry));
 assert.equal(editWorkingPlan(comp,edit,{type:'restore'},catalog),null);
});
test('shared shopping includes transition highlights, validates synergies and stays within RPC size limits',()=>{
 const session={context:{level:3,copies:{}}};const payload=sharingPayload(comp,null,session,catalog);
 assert.ok(payload.shopping.some(w=>w.reason==='transition'&&!comp.champions.includes(w.id)));
 const traits=[...new Set(Object.values(catalog).flatMap(c=>c.traits))];let edit=editWorkingPlan(comp,null,{type:'trait',name:traits[0]},catalog);edit.traits=traits;
 const all=sharingPayload(comp,edit,session,catalog);assert.ok(Buffer.byteLength(JSON.stringify(all))<32768);assert.ok(all.wishes.length<=28);
 const normalized=normalizeSharedPlan({...all,traits:[...traits,'not-a-trait'],shopping:[...all.shopping,{id:'bogus',goal:9,owned:0},{id:'__proto__',goal:9,owned:0}]},catalog);
 assert.ok(!normalized.traits.includes('not-a-trait'));assert.ok(!normalized.shopping.some(w=>w.id==='bogus'));
});
test('urgent off-comp requests reach the partner first without editing the roster or session',()=>{
 const id=Object.keys(catalog).find(id=>!comp.champions.includes(id)),session={matchId:'match',startedAt:Date.now(),context:{level:10,copies:{}}},before=structuredClone(session);
 const edit=editWorkingPlan(comp,null,{type:'request',id,goal:3,priority:2},catalog);
 const working=effectiveComp(comp,edit,catalog);assert.deepEqual(working.champions,comp.champions);assert.deepEqual(working.pivot,comp.pivot);
 const payload=normalizeSharedPlan(sharingPayload(working,edit,session,catalog),catalog);
 assert.deepEqual(payload.shopping[0],{id,goal:3,owned:0,priority:2,reason:'request'});
 const social={session:{id:'duo'},partnerPlan:{updated_at:new Date().toISOString(),payload}};
 assert.equal(partnerNeeds(social,session)[0].id,id);assert.equal(partnerNeeds(social,session)[0].priority,2);
 assert.deepEqual(session,before);assert.deepEqual(normalizeWorkingPlan(comp,JSON.parse(JSON.stringify(edit)),catalog).requests,edit.requests);
 const fulfilled={...session,context:{...session.context,copies:{[id]:3}}};
 const done={...social,partnerPlan:{...social.partnerPlan,payload:normalizeSharedPlan(sharingPayload(working,edit,fulfilled,catalog),catalog)}};
 assert.ok(!partnerNeeds(done,session).some(w=>w.id===id));
 const removed=editWorkingPlan(comp,edit,{type:'removeRequest',id},catalog);assert.equal(removed.requests.length,0);assert.deepEqual(removed.champions,comp.champions);
});
test('duo request edits promote existing targets without duplicates and downgrade their priority immediately',()=>{
 const id=comp.carry;let edit=editWorkingPlan(comp,null,{type:'request',id,goal:9,priority:2},catalog);
 edit=editWorkingPlan(comp,edit,{type:'request',id,goal:3,priority:0},catalog);
 const shopping=shoppingWishes(comp,edit,{context:{level:10}},catalog);
 assert.equal(edit.requests.length,1);assert.equal(shopping.filter(w=>w.id===id).length,1);assert.equal(shopping.find(w=>w.id===id).priority,0);assert.equal(shopping.find(w=>w.id===id).goal,3);
 const removed=editWorkingPlan(comp,edit,{type:'removeRequest',id},catalog);
 assert.equal(shoppingWishes(comp,removed,{context:{level:10}},catalog).find(w=>w.id===id).reason,'team');
});
test('untrusted duo requests are bounded, catalog checked and cannot inject priorities',()=>{
 const requests=Object.keys(catalog).map(id=>({id,goal:Infinity,priority:'<script>'}));
 const edit=normalizeWorkingPlan(comp,{champions:comp.champions,requests:[{id:'__proto__',goal:9,priority:2},...requests]},catalog);
 assert.equal(edit.requests.length,28);assert.ok(edit.requests.every(w=>w.goal===1&&w.priority===0));
 const p=normalizeSharedPlan({shopping:[{id:comp.carry,goal:1,owned:0,priority:999,reason:'request'}]},catalog);
 assert.equal(p.shopping[0].priority,0);assert.equal(p.shopping[0].reason,'request');
 const old=normalizeSharedPlan({wishes:[{id:comp.carry,goal:1,owned:0}]},catalog);assert.equal(old.shopping[0].priority,0);
});
