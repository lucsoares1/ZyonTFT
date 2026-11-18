const {EventEmitter}=require('node:events');

// The renderer only receives status. Feed URLs, paths and installer execution
// stay in the main process and cannot be supplied through IPC.
class UpdateService extends EventEmitter {
 constructor({updater,version,enabled=true,reason='',prepareInstall=async()=>true,now=Date.now}) {
  super();this.updater=updater;this.prepareInstall=prepareInstall;this.now=now;this.closed=false;
  this.state={status:enabled?'idle':'unsupported',currentVersion:version,version:null,percent:0,transferred:0,total:0,checkedAt:null,message:reason};
  this.enabled=enabled;this.lastCheck=0;this.busy=false;this.installing=false;this.downloadedVersion=null;this.handlers=[];
  if(!enabled)return;
  updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.allowDowngrade=false;updater.allowPrerelease=false;updater.disableWebInstaller=true;
  const on=(event,fn)=>{updater.on(event,fn);this.handlers.push([event,fn]);};
  on('checking-for-update',()=>this.set({status:'checking',message:''}));
  on('update-available',info=>this.set({status:this.downloadedVersion===info.version?'downloaded':'available',version:info.version,percent:this.downloadedVersion===info.version?100:0,transferred:0,total:0,message:this.downloadedVersion===info.version?'Tudo pronto. Reinicie quando quiser atualizar.':'Uma nova versão do Zyon está disponível.'}));
  on('update-not-available',()=>this.set({status:'current',version:null,percent:0,message:'Você está na versão mais recente.',checkedAt:this.now()}));
  on('download-progress',p=>this.set({status:'downloading',percent:Math.max(0,Math.min(100,Number(p.percent)||0)),transferred:Number(p.transferred)||0,total:Number(p.total)||0}));
  on('update-downloaded',info=>{this.downloadedVersion=info.version;this.set({status:'downloaded',version:info.version,percent:100,message:'Tudo pronto. Reinicie quando quiser atualizar.'});});
  on('error',error=>this.fail(error));
 }
 snapshot(){return {...this.state};}
 set(value){if(this.closed)return;Object.assign(this.state,value);this.emit('change',this.snapshot());}
 fail(error){
  if(this.closed)return;
  if(['ERR_UPDATER_NO_PUBLISHED_VERSIONS','ERR_UPDATER_LATEST_VERSION_NOT_FOUND'].includes(error?.code))this.set({status:'current',version:null,message:'Ainda não há uma versão nova publicada.',checkedAt:this.now()});
  else this.set({status:'error',message:['ERR_UPDATER_CHECKSUM_MISMATCH','ERR_CHECKSUM_MISMATCH'].includes(error?.code)?'O arquivo não passou na verificação. Tente baixar novamente.':'Não foi possível atualizar agora. Confira a conexão e tente novamente.'});
 }
 start(){if(!this.enabled)return;this.initial=setTimeout(()=>void this.check(),8000);this.initial.unref?.();this.interval=setInterval(()=>void this.check(),4*60*60*1000);this.interval.unref?.();}
 async check(){
  if(!this.enabled||this.closed||this.busy||this.installing||['downloading','installing'].includes(this.state.status))return this.snapshot();
  if(this.lastCheck&&this.now()-this.lastCheck<15000)return this.snapshot();
  this.lastCheck=this.now();this.busy=true;this.set({status:'checking',message:''});
  try{await this.updater.checkForUpdates();this.set({checkedAt:this.now()});}catch(e){this.fail(e);}finally{this.busy=false;}
  return this.snapshot();
 }
 async download(){
  if(!this.enabled||this.closed||this.busy||!this.state.version||!['available','error'].includes(this.state.status))return this.snapshot();
  this.busy=true;
  try{await this.updater.checkForUpdates();if(this.state.status==='available'){this.set({status:'downloading',percent:0,message:''});await this.updater.downloadUpdate();}}catch(e){this.fail(e);}finally{this.busy=false;}
  return this.snapshot();
 }
 async install(){
  if(!this.enabled||this.closed||this.busy||this.state.status!=='downloaded'||this.installing)return this.snapshot();
  this.installing=true;this.busy=true;
  try{await this.updater.checkForUpdates();if(this.state.status==='available'){this.set({status:'downloading',percent:0,message:''});await this.updater.downloadUpdate();}if(this.state.status==='downloaded'&&await this.prepareInstall()){this.set({status:'installing',message:'Reiniciando para atualizar…'});this.updater.quitAndInstall(true,true);}}catch(e){this.fail(e);}finally{this.installing=false;this.busy=false;}
  return this.snapshot();
 }
 close(){this.closed=true;clearTimeout(this.initial);clearInterval(this.interval);for(const [event,fn] of this.handlers)this.updater.removeListener(event,fn);this.removeAllListeners();}
}
module.exports={UpdateService};
