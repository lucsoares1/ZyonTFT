import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {ArrowDownToLine,Check,LoaderCircle,RefreshCw,RotateCw,X} from 'lucide-react';
type UpdateState={status:string;currentVersion:string;version:string|null;percent:number;transferred:number;total:number;checkedAt:number|null;message:string};
const UpdateContext=createContext<{state:UpdateState|null;action:(value:'check'|'download'|'install')=>void}>({state:null,action:()=>{}});
const useful=(s:UpdateState|null)=>Boolean(s&&['available','downloading','downloaded','installing'].includes(s.status)||s?.status==='error'&&s.version);
function UpdateAction({state,action}:{state:UpdateState;action:(value:'check'|'download'|'install')=>void}){
 if(state.status==='downloaded')return <button className="update-primary" onClick={()=>action('install')}><RotateCw size={15}/>Reiniciar e atualizar</button>;
 if(state.status==='available'||state.status==='error'&&state.version)return <button className="update-primary" onClick={()=>action('download')}><ArrowDownToLine size={15}/>{state.status==='error'?'Tentar baixar novamente':'Baixar atualização'}</button>;
 if(['checking','downloading','installing'].includes(state.status))return <span className="update-working"><LoaderCircle size={15}/>{state.status==='checking'?'Buscando…':state.status==='downloading'?`${Math.floor(state.percent)}%`:'Reiniciando…'}</span>;
 return <button className="update-secondary" onClick={()=>action('check')}><RefreshCw size={15}/>Buscar atualizações</button>;
}
function Progress({state}:{state:UpdateState|null}){return state?.status==='downloading'?<progress aria-label="Download da atualização" max="100" value={state.percent}/>:null;}
export function UpdateProvider({children}:{children:ReactNode}){
 const [state,setState]=useState<UpdateState|null>(null),[dismissed,setDismissed]=useState('');
 useEffect(()=>{let active=true;const stop=window.zyon?.onUpdate(s=>{if(active)setState(s);});void window.zyon?.getUpdate().then(s=>{if(active)setState(s);});return()=>{active=false;stop?.();};},[]);
 function action(value:'check'|'download'|'install'){void window.zyon?.updateAction(value);}
 const key=`${state?.version}:${state?.status==='downloaded'?'ready':'notice'}`;
 return <UpdateContext.Provider value={{state,action}}>{children}{state&&useful(state)&&dismissed!==key&&<aside className="update-notice" aria-label="Atualização do Zyon">
  <div className="update-notice-heading"><span className="update-emblem"><ArrowDownToLine size={20}/></span><div><strong>{state.status==='downloaded'?'Pronto para atualizar':'Tem novidade no Zyon'}</strong><span>Versão {state.version}</span></div><button aria-label="Lembrar da atualização depois" onClick={()=>setDismissed(key)}><X size={16}/></button></div>
  <p role="status">{state.status==='downloading'?'Baixando sua atualização. Pode continuar usando o app.':state.message}</p><Progress state={state}/><div className="update-notice-actions"><UpdateAction state={state} action={action}/>{state.status==='downloaded'&&<button className="update-secondary" onClick={()=>setDismissed(key)}>Depois</button>}</div>
 </aside>}</UpdateContext.Provider>;
}
export function UpdateIndicator(){const {state}=useContext(UpdateContext);return useful(state)?<i className="update-nav-dot" aria-hidden="true"/>:null;}
export function UpdatesSettings(){
 const {state,action}=useContext(UpdateContext);
 return <section className="updates-settings"><div className="updates-settings-heading"><span className="update-emblem">{state?.status==='current'?<Check size={22}/>:<ArrowDownToLine size={22}/>}</span><div><h2>Atualizações do Zyon</h2><p>Versão instalada {state?.currentVersion||'…'}{state?.version&&<> · Nova versão {state.version}</>}</p></div></div>
  <div className="updates-settings-body"><div><strong>{state?.status==='available'?'Uma versão nova espera por você':state?.status==='downloaded'?'Atualização pronta para instalar':state?.status==='downloading'?'Baixando a nova versão':state?.status==='checking'?'Buscando novidades':state?.status==='error'?'Vamos tentar novamente?':state?.status==='unsupported'?'Use a versão instalada':'Seu Zyon, sempre atualizado'}</strong><p role="status">{state?.message||'O Zyon busca novidades ao abrir e periodicamente. Suas comps e sua conta são preservadas.'}</p><Progress state={state}/>{state?.checkedAt&&<small>Última busca às {new Date(state.checkedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small>}</div>{state&&state.status!=='unsupported'&&<UpdateAction state={state} action={action}/>}</div>
 </section>;
}
