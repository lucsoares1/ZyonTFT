const fs=require('node:fs');
const path=require('node:path');
const {execFile}=require('node:child_process');

// A brief app restart/update can keep the duo. A Windows restart cannot.
const DUO_OFFLINE_MS=120000;
function readBootId(){
 if(process.platform!=='win32')return Promise.resolve(null);
 return new Promise(resolve=>execFile('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',"(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().Ticks"],{windowsHide:true,timeout:4000,encoding:'utf8'},(error,stdout)=>resolve(!error&&/^\d{16,20}$/.test(stdout.trim())?stdout.trim():null)));
}
function partnerExpired(data,now=Date.now()){
 if(!data.session)return false;
 const stamp=Date.parse(data.partnerPlan?.updated_at||data.session.created_at);
 return Number.isFinite(stamp)&&now-stamp>=DUO_OFFLINE_MS;
}
class DuoLifecycle {
 constructor({directory,bootId,now=Date.now}){
  this.file=path.join(directory,'duo-device-session.json');this.bootId=bootId;this.now=now;this.records={};
  try{const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.version===1&&data.records&&typeof data.records==='object')for(const [id,r] of Object.entries(data.records))if(r&&typeof r.sessionId==='string')this.records[id]={sessionId:r.sessionId,bootId:typeof r.bootId==='string'?r.bootId:null,pending:r.pending===true};}catch{/* First launch or an unreadable local marker. */}
 }
 save(){fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify({version:1,records:this.records}),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);}
 reason(userId,data){
  if(!data.session)return null;
  const previous=this.records[userId];
  if(previous?.sessionId===data.session.id){
   if(previous.pending)return 'shutdown';
   if(this.bootId&&previous.bootId&&this.bootId!==previous.bootId)return 'restart';
  }
  return partnerExpired(data,this.now())?'offline':null;
 }
 observe(userId,data){
  const previous=this.records[userId];
  const record=data.session?{sessionId:data.session.id,bootId:this.bootId||(previous?.sessionId===data.session.id?previous.bootId:null),pending:false}:null;
  if(JSON.stringify(this.records[userId]||null)===JSON.stringify(record))return;
  if(record)this.records[userId]=record;else delete this.records[userId];
  this.save();
 }
 markDisconnect(userId,sessionId){
  if(!userId||!sessionId)return;
  this.records[userId]={sessionId,bootId:this.bootId,pending:true};this.save();
 }
}
function bindSessionEnd(window,service){
 // query-session-end may be cancelled by Windows/the user; only the confirmed
 // event marks the duo for removal. Never prevent/delay the operating system.
 window.on('session-end',()=>{void service.shutdown();});
}
module.exports={DuoLifecycle,DUO_OFFLINE_MS,partnerExpired,readBootId,bindSessionEnd};
