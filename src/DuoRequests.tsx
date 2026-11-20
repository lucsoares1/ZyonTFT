import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,Plus,Search,RefreshCw,X} from 'lucide-react';
import {byId,champions,portrait} from './data';

const norm=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
type RequestChange={type:'set'|'remove';id:string;goal?:1|3|9};
export function DuoRequests({compId,edit,copies={},targets}:{compId?:string;edit?:any;copies?:Record<string,number>;targets?:any}){
 const [snapshot,setSnapshot]=useState<any>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[goal,setGoal]=useState<1|3|9>(1),[pending,setPending]=useState(0),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const draft=useRef<{id:string;goal:1|3|9}|null>(null),alive=useRef(true);
 const revisions=useRef(new Map<string,number>()),failures=useRef(new Map<string,{action:RequestChange;message:string}>());
 useEffect(()=>{
  alive.current=true;
  const accept=(state:any)=>{if(alive.current)setSnapshot(state);};
  window.zyon?.getState().then(accept);const off=window.zyon?.onState(accept);
  return()=>{alive.current=false;off?.();};
 },[]);
 const legacyEdit=edit||snapshot?.overlayPlans?.[compId||snapshot?.pinned];
 const requests=useMemo(()=>{
  const merged=new Map<string,any>();
  for(const request of [...(legacyEdit?.requests||[]),...((targets||snapshot?.shopTargets)?.requests||[])])if(byId[request.id])merged.set(request.id,request);
  return [...merged.values()].sort((first,second)=>byId[first.id].name.localeCompare(byId[second.id].name,'pt-BR'));
 },[legacyEdit?.requests,targets,snapshot?.shopTargets]);
 const shown=useMemo(()=>champions.filter(champion=>norm(champion.name+' '+champion.traits.join(' ')).includes(norm(query))).sort((first,second)=>first.cost-second.cost||first.name.localeCompare(second.name,'pt-BR')),[query]);
 async function change(action:RequestChange){
  const revision=(revisions.current.get(action.id)||0)+1;revisions.current.set(action.id,revision);
  failures.current.delete(action.id);setError([...failures.current.values()][0]?.message||'');setPending(count=>count+1);setSaved(false);
  let message='';
  try{
   const result=await window.zyon?.targetAction({list:'requests',...action,priority:0});
   if(!result||result.error||result.ok===false)throw Error(result?.error||'Não foi possível salvar o pedido. Tente novamente.');
   if(result.shopTargets&&alive.current)setSnapshot((previous:any)=>({...previous,shopTargets:result.shopTargets}));
   const legacyCompId=compId||snapshot?.pinned;
   if(legacyCompId&&legacyEdit?.requests?.some((request:any)=>request.id===action.id)){
    const removed=await window.zyon?.editPlan({compId:legacyCompId,type:'removeRequest',id:action.id});
    if(!removed||removed.error)throw Error(removed?.error||'O pedido antigo não foi atualizado. Tente novamente.');
   }
  }catch(failure){message=failure instanceof Error?failure.message:'Não foi possível salvar o pedido. Tente novamente.';}
  if(!alive.current)return;
  if(revisions.current.get(action.id)===revision){
   if(message)failures.current.set(action.id,{action,message});else failures.current.delete(action.id);
   setError([...failures.current.values()][0]?.message||'');setSaved(!message);
  }
  setPending(count=>Math.max(0,count-1));
 }
 function configure(request:any){draft.current={id:request.id,goal:request.goal};setSelected(request.id);setGoal(request.goal);setOpen(true);}
 function choose(id:string){
  const previous=requests.find(request=>request.id===id)||(draft.current?.id===id?draft.current:null);
  if(previous){configure(previous);return;}
  if(requests.length>=28){setError('Você já tem 28 pedidos. Remova um para pedir outro campeão.');return;}
  const nextGoal=([1,3,9] as const).find(count=>count>(copies[id]||0))||9;
  configure({id,goal:nextGoal});void change({type:'set',id,goal:nextGoal});
 }
 function adjust(nextGoal:1|3|9){
  if(!draft.current)return;
  const next={...draft.current,goal:nextGoal};configure(next);void change({type:'set',...next});
 }
 function remove(id:string){if(draft.current?.id===id){draft.current=null;setSelected('');}void change({type:'remove',id});}
 return <section className="duo-requests" aria-label="Seus pedidos à dupla">
  <header><div><h3>Seus pedidos à dupla</h3><p>Peça qualquer campeão, mesmo sem escolher uma comp.</p></div><button aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={14}/>:<Plus size={14}/>}<span>{open?'Fechar':'Pedir campeão'}</span></button></header>
  {error&&<div className="duo-error" role="alert"><span>{error}</span>{failures.current.size>0&&<button onClick={()=>{for(const {action} of [...failures.current.values()])void change(action);}}><RefreshCw size={13}/>Tentar novamente</button>}</div>}
  {open&&<div className="duo-request-editor">
   <label className="duo-request-search"><Search size={15}/><input aria-label="Buscar campeão para pedir à dupla" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Busque qualquer campeão"/></label>
   <div className="duo-request-catalog" role="group" aria-label="Escolher campeão para a dupla">{shown.map(champion=>{const marked=requests.some(request=>request.id===champion.id);return <button type="button" key={champion.id} aria-pressed={marked} data-focused={selected===champion.id||undefined} aria-label={`Pedir ${champion.name} à dupla`} onClick={()=>choose(champion.id)}><img className={`cost-${champion.cost}`} src={portrait(champion.id)} alt=""/><span>{champion.name}</span>{marked&&<Check size={13}/>}</button>;})}{!shown.length&&<p>Nenhum campeão encontrado.</p>}</div>
   {selected&&<div className="duo-request-selection"><img src={portrait(selected)} alt=""/><div><strong>{byId[selected].name}</strong><small>{byId[selected].traits.join(' · ')}</small></div><label><span>Meta total</span><select aria-label="Meta de cópias do pedido à dupla" value={goal} onChange={event=>adjust(Number(event.target.value) as 1|3|9)}>{[1,3,9].map(count=><option key={count} value={count}>{count} {count===1?'cópia':'cópias'}</option>)}</select></label></div>}
  </div>}
  {(open||pending>0||saved||error)&&<p className="duo-request-save-state" role="status" aria-live="polite" aria-atomic="true">{pending>0?<><RefreshCw size={12}/>Salvando pedido…</>:error?'Há alterações não salvas.':saved?<><Check size={12}/>Pedido salvo</>:'Escolher um campeão já envia o pedido à sua dupla.'}</p>}
  <div className="duo-request-list">{requests.map(request=><div key={request.id} className="duo-own-request"><button className="duo-request-configure" aria-label={`Editar pedido de ${byId[request.id].name}`} onClick={()=>configure(request)}><img src={portrait(request.id)} alt=""/><span><strong>{byId[request.id].name}</strong><small>{Math.max(0,request.goal-(copies[request.id]||0))===0?'Meta atingida':`${copies[request.id]||0}/${request.goal} cópias`}</small></span></button><button className="duo-icon-action" aria-label={`Cancelar pedido de ${byId[request.id].name}`} onClick={()=>remove(request.id)}><X size={14}/></button></div>)}</div>
  {!requests.length&&!open&&<p className="duo-request-empty">Peça uma peça avulsa para seu amigo procurar na loja.</p>}
 </section>;
}
