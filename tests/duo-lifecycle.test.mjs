import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import lifecycle from '../electron/duo-lifecycle.cjs';
import social from '../electron/social-service.cjs';
const {DuoLifecycle,DUO_OFFLINE_MS,partnerExpired,bindSessionEnd}=lifecycle;
const now=Date.now(),userId='player-a';
const active=(age=0,id='duo-a')=>({session:{id,created_at:new Date(now-1000).toISOString()},partner:{user_id:'player-b'},partnerPlan:{updated_at:new Date(now-age).toISOString(),payload:{wishes:[]}}});
function fixture(t,bootId='boot-a'){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zyon-duo-lifecycle-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const make=boot=>new DuoLifecycle({directory,bootId:boot,now:()=>now});return {guard:make(bootId),make};
}
function service(guard,rpc){
 return Object.assign(Object.create(social.SocialService.prototype),{lifecycle:guard,epoch:0,state:{user:{id:userId},profile:{handle:'test'},friends:[{id:'friend'}],...active()},client:{rpc},channel:{},getLocal:()=>({wishes:[]}),normalizePlan:p=>p,onChange:()=>{}});
}
test('ordinary app restart preserves the duo, Windows boot change ends only its previous duo',t=>{
 const {guard,make}=fixture(t);guard.observe(userId,active());
 assert.equal(make('boot-a').reason(userId,active()),null);
 assert.equal(make('boot-b').reason(userId,active()),'restart');
 assert.equal(make('boot-b').reason('other-user',active()),null);
 assert.equal(make('boot-b').reason(userId,active(0,'new-duo')),null);
 assert.equal(make(null).reason(userId,active()),null,'failed boot query is not evidence of a reboot');
 make(null).observe(userId,active());assert.equal(make('boot-b').reason(userId,active()),'restart','a failed boot query preserves the last known boot marker');
});
test('confirmed shutdown is durable even on Fast Startup, pending failures cannot revive a duo',t=>{
 const {guard,make}=fixture(t);guard.observe(userId,active());guard.markDisconnect(userId,'duo-a');
 assert.equal(make('boot-a').reason(userId,active()),'shutdown');
 const retry=make('boot-a');retry.observe(userId,{session:null});assert.equal(make('boot-a').reason(userId,active()),null);
});
test('offline expiry tolerates quick updates and checks partner heartbeat, then session creation',()=>{
 assert.equal(partnerExpired(active(DUO_OFFLINE_MS-1),now),false);
 assert.equal(partnerExpired(active(DUO_OFFLINE_MS),now),true);
 assert.equal(partnerExpired({...active(),partnerPlan:null},now),false);
 assert.equal(partnerExpired({session:{created_at:new Date(now-DUO_OFFLINE_MS).toISOString()}},now),true);
 assert.equal(partnerExpired({session:null},now),false);
 assert.equal(partnerExpired(active(-3600000),now),false,'a future clock is not proof of absence');
});
test('cancelled shutdown query does nothing; confirmed native session-end invokes cleanup once',()=>{
 const window=new EventEmitter();let calls=0;bindSessionEnd(window,{shutdown:async()=>{calls++;}});
 window.emit('query-session-end');assert.equal(calls,0);window.emit('session-end');assert.equal(calls,1);
});
test('refresh ends a previous-boot duo before publishing, keeps account and friendship',async t=>{
 const {guard,make}=fixture(t);guard.observe(userId,active());const calls=[];
 const svc=service(make('boot-b'),async name=>{calls.push(name);return name==='zyon_social_snapshot'?{data:calls.filter(n=>n==='zyon_social_snapshot').length===1?active():{session:null,partner:null,partnerPlan:null}}:{};});
 await svc.refresh();assert.deepEqual(calls,['zyon_social_snapshot','zyon_duo_leave','zyon_social_snapshot']);
 assert.equal(svc.state.session,null);assert.equal(svc.state.user.id,userId);assert.equal(svc.state.friends.length,1);assert.ok(svc.state.profile);
});
test('failed shutdown leave stays pending and blocked, then recovers from an already-ended race',async t=>{
 const {guard,make}=fixture(t);guard.markDisconnect(userId,'duo-a');let ended=false;const calls=[];
 const svc=service(guard,async name=>{calls.push(name);return name==='zyon_social_snapshot'?{data:ended?{session:null,partner:null,partnerPlan:null}:active()}:{error:new Error('offline')};});
 await svc.refresh();assert.equal(svc.state.session,null);assert.equal(svc.state.status,'reconnecting');
 assert.equal(make('boot-a').reason(userId,active()),'shutdown');await svc.publish(true);assert.ok(!calls.includes('zyon_publish_plan'));
 ended=true;await svc.refresh();assert.equal(svc.state.status,'online');assert.equal(make('boot-a').reason(userId,active()),null);
 guard.markDisconnect(userId,'duo-a');let snapshots=0;
 const race=service(guard,async name=>name==='zyon_social_snapshot'?{data:++snapshots===1?active():{session:null,partner:null,partnerPlan:null}}:{error:new Error('Dupla indisponível.')});
 await race.refresh();assert.equal(snapshots,2);assert.equal(race.state.status,'online');assert.equal(race.state.error,null);
});
test('Windows event records synchronously and suppresses heartbeats even when the network stalls',async t=>{
 const {guard,make}=fixture(t);let finish;const calls=[];
 const svc=service(guard,(name)=>{calls.push(name);return new Promise(resolve=>{finish=resolve;});});
 const ending=svc.shutdown();assert.equal(make('boot-a').reason(userId,active()),'shutdown');
 await svc.publish(true);await svc.refresh();assert.deepEqual(calls,['zyon_duo_leave']);
 finish({});await ending;await svc.shutdown();assert.equal(calls.length,1);
});
