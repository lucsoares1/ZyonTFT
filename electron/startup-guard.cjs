const fs=require('node:fs');
const path=require('node:path');
const INSTALL_MARKER_SUFFIX='.zyon-installing';
function processAlive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
function installInProgress(executable,{now=Date.now(),alive=processAlive}={}){
 try{
  const marker=path.dirname(executable)+INSTALL_MARKER_SUFFIX,stamp=fs.statSync(marker).mtimeMs;
  const pid=Number(fs.readFileSync(marker,'utf8').trim());
  return Number.isSafeInteger(pid)&&pid>0&&now-stamp<600000&&now>=stamp-10000&&alive(pid);
 }catch{return false;}
}
function launchApplication({app,dialog,load}){
 if(app.isPackaged&&installInProgress(app.getPath('exe'))){
  // NSIS will open the app after ALL files have been copied. A second click
  // during that copy must not load a mixture of old/new runtime dependencies.
  app.exit(0);return 'updating';
 }
 try{load();return 'started';}catch(error){
  if(!['MODULE_NOT_FOUND','ENOENT'].includes(error.code))throw error;
  const profile=process.env.ZYON_USER_DATA||app.getPath('userData');
  try{fs.mkdirSync(profile,{recursive:true});fs.appendFileSync(path.join(profile,'startup.log'),new Date().toISOString()+' Incomplete installation: '+String(error.stack||error)+'\n');}catch{}
  if(!(process.env.ZYON_USER_DATA&&process.env.ZYON_TEST_BACKGROUND==='1'))dialog.showErrorBox('A instalação do Zyon precisa ser concluída','Aguarde a atualização terminar e abra o Zyon novamente. Se continuar, reinstale o Setup mais recente em github.com/lucsoares1/ZyonTFT/releases/latest. Sua conta e suas comps serão preservadas.');
  app.exit(1);return 'incomplete';
 }
}
module.exports={INSTALL_MARKER_SUFFIX,installInProgress,launchApplication};
