import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingSocialNotices,SocialNoticeTracker} from '../electron/social-notices.cjs';
test('only incoming friend requests and duo invitations notify, once per account session',()=>{
  const tracker=new SocialNoticeTracker();
  const social={user:{id:'recipient'},friendRequests:[{id:'one',incoming:true,profile:{display_name:'Ana'}},{id:'two',incoming:false}],invites:[{id:'duo',incoming:true,profile:{display_name:'Bia'}}]};
  assert.deepEqual(pendingSocialNotices(social).map(n=>n.key),['friend:one','invite:duo']);
  assert.equal(tracker.update(social).length,2);
  assert.deepEqual(tracker.update({...social,status:'reconnecting'}),[]);
  assert.deepEqual(tracker.update({...social,friendRequests:[]}),[]);
  assert.deepEqual(tracker.update({...social,user:null}),[]);
  assert.equal(tracker.update(social).length,2,'pending requests are visible again after signing in');
});
