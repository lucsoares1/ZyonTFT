import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {planForLevel} from '../src/level-planner.mjs';
import {shoppingWishes,sharingPayload,normalizeSharedPlan,partnerNeeds} from '../src/duo-plans.mjs';
import {freshReading,acceptReading} from '../electron/level-ocr.cjs';
import {freshSession,changeSession} from '../electron/game-session.cjs';
const catalog=Object.fromEntries(JSON.parse(fs.readFileSync('src/generated/catalog.json')).champions.map(c=>[c.id,c]));
const comps=JSON.parse(fs.readFileSync('src/generated/pivot.json')).comps;
const teemo=comps.find(c=>c.id==='s18-pivot-elderwood-teemo-reroll'),ornn='DA_18_Ornn';
const state=level=>({matchId:'test',startedAt:Date.now(),context:{level,copies:{[ornn]:2}}});
const wishes=(comp,session,edit=null)=>shoppingWishes(comp,edit,session,catalog);

test('a published temporary unit stops receiving purchases when its level window closes, even if retained as a pair',()=>{
 const early=state(6),late=state(7),before=structuredClone(teemo);
 assert.ok(wishes(teemo,early).some(w=>w.id===ornn));
 const plan=planForLevel(teemo,catalog,late.context);
 assert.ok(plan.team.ids.includes(ornn),'retaining a useful holder while its replacement is unavailable remains possible');
 assert.ok(!plan.search.includes(ornn));assert.ok(!plan.priorities.some(w=>w.id===ornn));assert.ok(!wishes(teemo,late).some(w=>w.id===ornn));
 for(let level=7;level<=10;level++)assert.ok(!wishes(teemo,{...late,context:{...late.context,level}}).some(w=>w.id===ornn));
 assert.deepEqual(teemo,before);
});

test('the 4 to 5 boundary is driven by two confirmed OCR readings and is not undone by missing or lower OCR',()=>{
 const comp={...teemo,pivot:{...teemo.pivot,levels:[
  {level:4,units:['DA_18_Teemo',ornn,'DA_18_Alistar','DA_18_Kobuko']},
  {level:5,units:['DA_18_Teemo','DA_Brambleback18','DA_18_Alistar','DA_18_Kobuko','DA_18_Veigar']},
 ]}};
 let session=changeSession(freshSession(),{type:'match',id:'test'});session=changeSession(session,{type:'ocr-level',value:4});
 let reading=freshReading();reading=acceptReading(reading,'Nv.4',4);reading=acceptReading(reading,'Nv.4',4);
 assert.ok(wishes(comp,session).some(w=>w.id===ornn));
 reading=acceptReading(reading,'Nv.5',4);assert.equal(reading.status,'confirming');assert.equal(session.context.level,4);
 reading=acceptReading(reading,'Nv.5',4);assert.equal(reading.status,'confirmed');session=changeSession(session,{type:'ocr-level',value:reading.level});
 assert.equal(session.context.level,5);assert.ok(!wishes(comp,session).some(w=>w.id===ornn));
 for(const text of ['', 'Nv.4', 'Nv.4']){reading=acceptReading(reading,text,session.context.level);if(reading.status==='confirmed')session=changeSession(session,{type:'ocr-level',value:reading.level});assert.equal(session.context.level,5);assert.ok(!wishes(comp,session).some(w=>w.id===ornn));}
});

test('the same transition removal reaches partner shopping and explicit requests or marked synergies still override it',()=>{
 const session=state(7),now=Date.now(),social={session:{id:'accepted'},partnerPlan:{updated_at:new Date(now).toISOString(),payload:normalizeSharedPlan(sharingPayload(teemo,null,session,catalog),catalog)}};
 assert.ok(!partnerNeeds(social,state(6),now).some(w=>w.id===ornn),'partner local level does not control sender purchase window');
 const request={requests:[{id:ornn,goal:3,priority:2}]};
 assert.equal(wishes(teemo,session,request).find(w=>w.id===ornn).reason,'request');
 const trait=catalog[ornn].traits[0];assert.equal(wishes(teemo,session,{traits:[trait]}).find(w=>w.id===ornn).reason,'trait');
 assert.ok(!wishes(teemo,session).some(w=>w.id===ornn),'cancelling the explicit request cannot restore expired transition buys');
});

test('published variants stop buying the replaced unit and final roster units remain valid',()=>{
 const base={...teemo,pivot:{...teemo.pivot,levels:[{level:6,units:['DA_18_Teemo',ornn,'DA_18_Alistar','DA_18_Kobuko','DA_18_Veigar','DA_18_LeBlanc'],variants:[[{replaces:ornn,championId:'DA_18_Shen'}]]}]}};
 const session=state(6);session.context.copies['DA_18_Shen']=3;
 assert.ok(!wishes(base,session).some(w=>w.id===ornn));
 assert.ok(wishes(base,session).some(w=>teemo.champions.includes(w.id)));
 const final={...base,champions:[...base.champions,ornn]};assert.ok(wishes(final,session).some(w=>w.id===ornn&&w.reason==='team'));
});

test('every published purchase priority belongs to its current resolved route or final roster',()=>{
 for(const comp of comps)for(let level=1;level<=10;level++){
  const session={context:{level,copies:{}}},route=comp.pivot?.levels?.filter(s=>s.level<=level).at(-1);if(!route)continue;
  const allowed=new Set([...route.units,...comp.champions]);
  for(const wish of wishes(comp,session))assert.ok(allowed.has(wish.id),`${comp.id} level ${level}: ${wish.id}`);
 }
});
