// Invoked by verify-duo --lifecycle. Real authenticated fixture clients only.
// Native session-end is emitted on an isolated window; this NEVER shuts down
// Windows, closes the personal app, or bypasses account authentication.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function verifyDuoLifecycle({a,b,launch,users,social,act,waitValue,pause,checks}){
 const marker=()=>path.join(a.profile,'duo-device-session.json');
 async function form(){
  const result=await act(a.page,{type:'invite',id:users[1].id});assert.ok(!result.error,result.error);
  const pending=await waitValue(()=>social(b.page),s=>s.invites?.some(i=>i.incoming),'lifecycle invite');
  const accepted=await act(b.page,{type:'acceptInvite',id:pending.invites.find(i=>i.incoming).id});assert.ok(!accepted.error,accepted.error);
  const s=await waitValue(()=>social(a.page),s=>s.session&&s.partner,'lifecycle duo');
  await waitValue(()=>social(b.page),v=>v.session?.id===s.session.id,'same lifecycle duo');return s.session.id;
 }
 async function reopenA(){Object.assign(a,await launch(0,a.profile));assert.equal((await social(a.page)).user.id,users[0].id);assert.equal((await social(a.page)).friends.length,1);}
 async function endFromWindows(offline=false){
  await a.app.evaluate(({BrowserWindow},offline)=>{
   if(offline){const original=globalThis.fetch;globalThis.fetch=(url,...args)=>String(url).includes('/rpc/zyon_duo_leave')?Promise.reject(new Error('isolated shutdown network failure')):original(url,...args);}
   BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('view=')).emit('session-end',{reasons:['shutdown']});
  },offline);
  const persisted=JSON.parse(await fs.readFile(marker(),'utf8'));assert.equal(persisted.records[users[0].id].pending,true);
 }
 const initial=await form();await a.app.close();await reopenA();
 assert.equal((await social(a.page)).session?.id,initial,'brief ordinary restart retains duo');
 await endFromWindows();await waitValue(()=>social(b.page),s=>!s.session&&!s.partnerPlan,'native shutdown disconnect reaches partner');
 await a.app.close();await reopenA();assert.equal((await social(a.page)).session,null);
 checks.push('confirmed Windows session-end ends the real server duo; brief app restart preserves it; accounts and friendship survive');
 await form();await endFromWindows(true);await a.app.close();await reopenA();
 await waitValue(()=>social(b.page),s=>!s.session,'offline shutdown is retried after opening');
 assert.equal((await social(a.page)).session,null);assert.ok(!JSON.parse(await fs.readFile(marker(),'utf8')).records[users[0].id]);
 checks.push('shutdown with a failed network request persists a marker, retries on authenticated startup and cannot revive the old duo');
 await form();await a.app.close();
 const oldBoot=JSON.parse(await fs.readFile(marker(),'utf8'));oldBoot.records[users[0].id].bootId='previous-boot-fixture';await fs.writeFile(marker(),JSON.stringify(oldBoot));
 await reopenA();await waitValue(()=>social(b.page),s=>!s.session,'changed boot ends previous duo before publishing');
 assert.equal((await social(a.page)).session,null);
 checks.push('a changed Windows boot ID ends the previous duo before its first publication, even without a shutdown event');
 await form();await b.app.close();const absentAt=Date.now();
 await pause(1000);assert.ok((await social(a.page)).session,'brief absence is tolerated');
 console.log(JSON.stringify({lifecycle:'waiting for real 120-second heartbeat expiry; personal app and Windows stay open'}));
 await waitValue(()=>social(a.page),s=>!s.session&&!s.partnerPlan,'real offline heartbeat expiry',155000);
 const expiryMs=Date.now()-absentAt;assert.ok(expiryMs>=100000&&expiryMs<=155000,`unexpected expiry ${expiryMs}`);
 Object.assign(b,await launch(1,b.profile));assert.equal((await social(b.page)).session,null);assert.equal((await social(b.page)).friends.length,1);
 checks.push(`a client that stops heartbeats expires on its partner after ${expiryMs}ms, without accelerated timers; reopening stays disconnected and keeps friendship`);
}
