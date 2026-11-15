import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {augmentOrigin,augmentCatalog,compAugments} from '../src/comp-augments.mjs';
import {personalizePlan} from '../src/planning.mjs';
import {effectiveComp,editWorkingPlan} from '../src/duo-plans.mjs';
import {migrateSaved} from '../src/preferences.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),snapshot=read('src/generated/pivot.json'),registry=read('src/generated/pivot-registry.json').augments,catalog=Object.fromEntries(read('src/generated/catalog.json').champions.map(c=>[c.id,c]));
const base=snapshot.comps.find(c=>c.id==='s18-pivot-blossom-ahri-fast-9');
test('each published build resolves its own ordered augment recommendations, not a global list',()=>{
 for(const comp of snapshot.comps){const result=compAugments(comp,augmentCatalog(snapshot),registry);assert.deepEqual(result.ids,comp.pivot.augments);assert.deepEqual(result.focus,comp.pivot.augmentFocus);assert.equal(result.source.id,comp.id);assert.equal(result.adapted,false);}
 assert.equal(compAugments(base,snapshot,registry).ids.length,8);
 assert.notDeepEqual(compAugments(base,snapshot,registry).ids,compAugments(snapshot.comps[1],snapshot,registry).ids);
});
test('editing a roster preserves a live augment reference without restoring source level boards or units',()=>{
 const before=structuredClone(base),edit=editWorkingPlan(base,null,{type:'toggle',id:base.champions[0]},catalog),working=effectiveComp(base,edit,catalog);
 assert.equal(working.pivot,undefined);assert.ok(!working.champions.includes(base.champions[0]));
 const result=compAugments(working,snapshot,registry);assert.deepEqual(result.ids,base.pivot.augments);assert.equal(result.adapted,true);
 const custom=personalizePlan(base);assert.equal(custom.pivot,undefined);assert.equal(custom.augmentSource,base.id);
 assert.deepEqual(compAugments({...custom,id:'comp-copy',name:'Meu ajuste'},snapshot,registry).ids,base.pivot.augments);
 assert.deepEqual(compAugments({...custom,augmentSource:undefined},snapshot,registry).ids,base.pivot.augments,'older saved personal plans recover by stable build ID');
 assert.deepEqual(base,before);
});
test('updated source recommendations override stale personal copies, including an explicitly empty source list',()=>{
 const changed=structuredClone(snapshot),source=changed.comps.find(c=>c.id===base.id);source.pivot.augments=[snapshot.comps[1].pivot.augments[0]];source.pivot.augmentFocus=['reroll'];
 const result=compAugments(personalizePlan(base),augmentCatalog(changed),registry);assert.deepEqual(result.ids,source.pivot.augments);assert.deepEqual(result.focus,['reroll']);
 source.pivot.augments=[];assert.deepEqual(compAugments(base,changed,registry).ids,[]);
});
test('unrelated custom comps do not inherit another build by carry or similar name; references use validated source identities',()=>{
 const custom={id:'comp-handmade',name:base.name,carry:base.carry,champions:base.champions,style:'Personalizada'};
 assert.deepEqual(compAugments(custom,snapshot,registry).ids,[]);
 assert.deepEqual(compAugments({...custom,augmentSource:base.source.url},snapshot,registry).ids,base.pivot.augments);
 assert.equal(augmentOrigin({...custom,source:{name:'PivotTFT',url:'https://attacker.invalid/comps/blossom-ahri-fast-9/'}}),undefined);
 assert.deepEqual(compAugments({...custom,augmentSource:'__proto__'},snapshot,registry).ids,[]);
 const changed=structuredClone(snapshot);changed.comps[0].pivot.augments.push('bogus','__proto__',changed.comps[0].pivot.augments[0]);
 assert.deepEqual(compAugments(changed.comps[0],changed,registry).ids,snapshot.comps[0].pivot.augments);
});
test('compact overlay catalogue keeps exact references without level boards; preferences retain references across catalogue updates',()=>{
 const compact=augmentCatalog(snapshot);assert.ok(JSON.stringify(compact).length<JSON.stringify(snapshot).length/2);assert.equal(compact.comps[0].pivot.levels,undefined);
 const custom={...personalizePlan(base),id:'comp-adjusted'},defaults={comps:snapshot.comps,active:base.id,pinned:base.id,selected:base.champions};
 const migrated=migrateSaved({comps:[custom],active:custom.id,pinned:custom.id,selected:custom.champions,dataRevision:'old'},defaults,Object.values(catalog),'new');
 assert.equal(migrated.comps.find(c=>c.id===custom.id).augmentSource,base.id);
 assert.deepEqual(compAugments(migrated.comps.find(c=>c.id===custom.id),compact,registry).ids,base.pivot.augments);
});
