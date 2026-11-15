const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const config=require('./cloud-config.json');
const {pendingSocialNotices}=require('./social-notices.cjs');
const empty=()=>({profile:null,friends:[],friendRequests:[],invites:[],session:null,partner:null,partnerPlan:null,myPlan:null});
function message(error){
 const m=String(error?.message||'Não foi possível conectar.');
 if(/Invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
 if(/Email not confirmed/i.test(m))return 'Confirme seu e-mail antes de entrar.';
 if(/rate limit/i.test(m))return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
 if(/email.*(not authorized|not allowed)|sending.*email|error sending confirmation/i.test(m))return 'O servidor não conseguiu enviar a confirmação. O envio de e-mails do projeto precisa ser configurado.';
 if(/saving new user|duplicate key/i.test(m))return 'Não foi possível criar a conta. Tente outro nome de usuário.';
 if(/fetch|network|timeout|abort|ENOTFOUND/i.test(m))return 'Sem conexão com o servidor. Seus planos locais continuam disponíveis.';
 return m.slice(0,250);
}
class SocialService {
 constructor({directory,safeStorage,onChange,getLocal,normalizePlan}){
  this.onChange=onChange;this.getLocal=getLocal;this.normalizePlan=normalizePlan;this.epoch=0;
  this.state={configured:Boolean(config.url&&config.publishableKey),status:'connecting',user:null,error:null,...empty()};
  const file=path.join(directory,'online-session.enc'),scope=createHash('sha256').update(config.url).digest('hex').slice(0,12);
  const storage={
   getItem:key=>{try{if(!safeStorage.isEncryptionAvailable())return null;const d=JSON.parse(fs.readFileSync(file,'utf8'));return d.key===scope+key?safeStorage.decryptString(Buffer.from(d.value,'base64')):null;}catch{return null;}},
   setItem:(key,value)=>{if(!safeStorage.isEncryptionAvailable())return;fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file,JSON.stringify({key:scope+key,value:safeStorage.encryptString(value).toString('base64')}),{mode:0o600});},
   removeItem:()=>{try{fs.unlinkSync(file);}catch{}}
  };
  if(!this.state.configured){this.state.status='unconfigured';return;}
  this.client=createClient(config.url,config.publishableKey,{auth:{persistSession:safeStorage.isEncryptionAvailable(),storage,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(url,init={})=>fetch(url,{...init,signal:AbortSignal.any([AbortSignal.timeout(15000),...(init.signal?[init.signal]:[])])})}});
  this.client.auth.onAuthStateChange((event,session)=>{
   if(this.closed)return;
   const prior=this.state.user?.id,next=session?.user;
   if(prior!==next?.id){this.epoch++;this.lastSignature=null;this.state={...this.state,...empty()};}
   this.state.user=next?{id:next.id,email:next.email}:null;
   if(!next){this.state.status='signed-out';this.client.removeAllChannels();this.channel=null;this.emit();}
   else {this.state.status='connecting';this.emit();queueMicrotask(()=>this.refresh());}
  });
  this.client.auth.getSession().then(({data,error})=>{if(this.closed)return;if(error){this.state.status='error';this.state.error=message(error);this.emit();}else if(!data.session){this.state.status='signed-out';this.emit();}});
  this.timer=setInterval(()=>{if(this.state.user){this.refresh();this.publish(true);}},15000);this.timer.unref();
 }
 snapshot(){return {...this.state,notices:pendingSocialNotices(this.state)};}
 emit(){if(!this.closed)this.onChange(this.snapshot());}
 async refresh(){
  if(!this.state.user||this.closed)return;
  if(this.refreshing){this.refreshAgain=true;return;}
  this.refreshing=true;const epoch=this.epoch;
  try{
   const {data,error}=await this.client.rpc('zyon_social_snapshot');if(error)throw error;
   if(epoch!==this.epoch||this.closed)return;
   if(data.partnerPlan)data.partnerPlan.payload=this.normalizePlan(data.partnerPlan.payload);
   this.state={...this.state,...data,status:'online',error:null,refreshedAt:Date.now()};this.emit();
   if(!this.channel){
    this.channel=this.client.channel('zyon-social-'+this.state.user.id);
    for(const table of ['zyon_friendships','zyon_duo_invites','zyon_duo_sessions','zyon_duo_plans'])this.channel.on('postgres_changes',{event:'*',schema:'public',table},()=>{clearTimeout(this.refreshDelay);this.refreshDelay=setTimeout(()=>this.refresh(),80);});
    const channelEpoch=this.epoch;
    this.channel.subscribe(status=>{if(this.closed||!this.state.user||this.epoch!==channelEpoch)return;if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){this.state.status='reconnecting';this.emit();}else if(status==='SUBSCRIBED')this.refresh();});
   }
   void this.publish();
  }catch(error){if(epoch===this.epoch&&!this.closed){this.state.status='reconnecting';this.state.error=message(error);this.emit();}}
  finally{this.refreshing=false;if(this.refreshAgain){this.refreshAgain=false;queueMicrotask(()=>this.refresh());}}
 }
 schedulePublish(){clearTimeout(this.publishDelay);this.publishDelay=setTimeout(()=>this.publish(),200);}
 async publish(force=false){
  const session=this.state.session;if(!session||!this.state.user||this.closed||this.publishing)return;
  const plan=this.getLocal(),signature=session.id+JSON.stringify(plan);
  if(!force&&signature===this.lastSignature)return;
  this.publishing=true;const epoch=this.epoch;let success=false;
  try{const {error}=await this.client.rpc('zyon_publish_plan',{duo_id:session.id,plan});if(error)throw error;if(epoch===this.epoch){this.lastSignature=signature;success=true;}}
  catch(error){if(epoch===this.epoch&&!this.closed){this.state.status='reconnecting';this.state.error=message(error);this.emit();}}
  finally{this.publishing=false;if(success&&this.state.session?.id===session.id&&signature!==session.id+JSON.stringify(this.getLocal()))this.schedulePublish();}
 }
 async action(a){
  if(!this.client)return {error:'O serviço online ainda não está configurado.'};
  try{
   if(a.type==='login'||a.type==='signup'){
    const email=String(a.email||'').trim().slice(0,254),password=String(a.password||'');
    if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>128)throw new Error('Use um e-mail válido e uma senha entre 8 e 128 caracteres.');
    let result;
    if(a.type==='signup'){
     const handle=String(a.handle||'').trim().toLowerCase(),display_name=String(a.displayName||'').trim();
     if(!/^[a-z0-9_]{3,20}$/.test(handle)||display_name.length<2||display_name.length>32)throw new Error('Use um nome de 2 a 32 caracteres e um usuário de 3 a 20 letras, números ou _.');
     result=await this.client.auth.signUp({email,password,options:{data:{handle,display_name}}});
    }else result=await this.client.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(!result.data.session)return {ok:true,confirmation:true,message:'Confirme seu e-mail pelo link recebido. Depois volte e entre com sua senha.'};
    await this.refresh();return {ok:true};
   }
   if(a.type==='logout'){
    if(this.state.session)await this.client.rpc('zyon_publish_plan',{duo_id:this.state.session.id,plan:{...this.getLocal(),playing:false}});
    const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;return {ok:true};
   }
   if(!this.state.user)throw new Error('Entre na sua conta primeiro.');
   const actions={friendRequest:['zyon_friend_request',{code:String(a.code||'').replace(/[^a-z0-9]/gi,'').slice(0,12)}],friendAccept:['zyon_friend_respond',{friendship_id:a.id,accept:true}],friendDecline:['zyon_friend_respond',{friendship_id:a.id,accept:false}],friendRemove:['zyon_friend_remove',{friendship_id:a.id}],invite:['zyon_duo_invite',{friend_id:a.id}],acceptInvite:['zyon_duo_respond',{invite_id:a.id,accept:true}],declineInvite:['zyon_duo_respond',{invite_id:a.id,accept:false}],leave:['zyon_duo_leave',{session_id:this.state.session?.id}]};
   if(a.type==='refresh'){await this.refresh();return {ok:true};}
   const chosen=actions[a.type];if(!chosen)throw new Error('Ação indisponível.');
   const {error}=await this.client.rpc(chosen[0],chosen[1]);if(error)throw error;this.lastSignature=null;await this.refresh();return {ok:true};
  }catch(error){return {error:message(error)};}
 }
 close(){this.closed=true;clearInterval(this.timer);clearTimeout(this.refreshDelay);clearTimeout(this.publishDelay);this.client?.auth.stopAutoRefresh();void this.client?.removeAllChannels();}
}
module.exports={SocialService};
