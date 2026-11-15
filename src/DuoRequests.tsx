import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUp,Check,Plus,Search,RefreshCw,X} from 'lucide-react';
import {byId,champions,portrait} from './data';

export const requestPriorityNames=['Normal','Alta','Urgente'];
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function DuoRequests({compId,edit,copies={}}:{compId:string;edit:any;copies?:Record<string,number>}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[priority,setPriority]=useState(0),[goal,setGoal]=useState(1),[pending,setPending]=useState(0),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const draft=useRef<{id:string;goal:number;priority:number}|null>(null),alive=useRef(true);
 const revisions=useRef(new Map<string,number>()),failures=useRef(new Map<string,{action:any;message:string}>());
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const requests=useMemo(()=>(edit?.requests||[]).filter((w:any)=>byId[w.id]).slice().sort((a:any,b:any)=>b.priority-a.priority),[edit?.requests]);
 const shown=useMemo(()=>champions.filter(c=>norm(c.name+' '+c.traits.join(' ')).includes(norm(query))).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'pt-BR')),[query]);
 async function change(action:any){
  const revision=(revisions.current.get(action.id)||0)+1;revisions.current.set(action.id,revision);
  failures.current.delete(action.id);setError([...failures.current.values()][0]?.message||'');setPending(n=>n+1);setSaved(false);
  let message='';
  try{const result=await window.zyon?.editPlan({compId,...action});if(!result||result.error)message=result?.error||'Não foi possível salvar o pedido. Tente novamente.';}
  catch{message='Não foi possível salvar o pedido. Tente novamente.';}
  if(!alive.current)return;
  // A late reply must not replace the outcome of a newer edit or cancellation.
  if(revisions.current.get(action.id)===revision){
   if(message)failures.current.set(action.id,{action,message});else failures.current.delete(action.id);
   setError([...failures.current.values()][0]?.message||'');setSaved(!message);
  }
  setPending(n=>Math.max(0,n-1));
 }
 function configure(w:any){draft.current={id:w.id,goal:w.goal,priority:w.priority||0};setSelected(w.id);setPriority(w.priority||0);setGoal(w.goal);setOpen(true);}
 function choose(id:string){
  const previous=requests.find((w:any)=>w.id===id)||(draft.current?.id===id?draft.current:null);
  if(previous){configure(previous);return;}
  if(requests.length>=28){setError('Você já tem 28 pedidos. Remova um para pedir outro campeão.');return;}
  configure({id,goal:1,priority:0});void change({type:'request',id,goal:1,priority:0});
 }
 function adjust(value:{goal?:number;priority?:number}){
  if(!draft.current)return;
  // Read the latest intent synchronously, even when two controls change before a render.
  const next={...draft.current,...value};configure(next);void change({type:'request',...next});
 }
 function remove(id:string){if(draft.current?.id===id){draft.current=null;setSelected('');}void change({type:'removeRequest',id});}
 return <section className="duo-requests" aria-label="Seus pedidos à dupla">
  <header><div><h3>Seus pedidos à dupla</h3><p>Marcou, salvou. Sua comp continua igual.</p></div><button aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={14}/>:<Plus size={14}/>}<span>{open?'Fechar':'Pedir campeão'}</span></button></header>
  {error&&<div className="duo-error" role="alert"><span>{error}</span>{failures.current.size>0&&<button onClick={()=>{for(const {action} of [...failures.current.values()])void change(action);}}><RefreshCw size={13}/>Tentar novamente</button>}</div>}
  {open&&<div className="duo-request-editor">
   <label className="duo-request-search"><Search size={15}/><input aria-label="Buscar campeão para pedir à dupla" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busque qualquer campeão"/></label>
   <div className="duo-request-catalog" role="group" aria-label="Escolher campeão para a dupla">{shown.map(c=>{const marked=requests.some((w:any)=>w.id===c.id);return <button type="button" key={c.id} aria-pressed={marked} data-focused={selected===c.id||undefined} aria-label={`Pedir ${c.name} à dupla`} onClick={()=>choose(c.id)}><img className={`cost-${c.cost}`} src={portrait(c.id)} alt=""/><span>{c.name}</span>{marked&&<Check size={13}/>}</button>;})}{!shown.length&&<p>Nenhum campeão encontrado.</p>}</div>
   {selected&&<div className="duo-request-selection"><img src={portrait(selected)} alt=""/><div><strong>{byId[selected].name}</strong><small>{byId[selected].traits.join(' · ')}</small></div><label><span>Meta total</span><select aria-label="Meta de cópias do pedido à dupla" value={goal} onChange={e=>adjust({goal:Number(e.target.value)})}>{[1,3,9].map(n=><option key={n} value={n}>{n} {n===1?'cópia':'cópias'}</option>)}</select></label></div>}
   <fieldset className="duo-request-priority"><legend>Quanto você precisa agora?</legend><div>{requestPriorityNames.map((name,i)=><label key={name} data-priority={i}><input type="radio" name={`duo-priority-${compId}`} aria-label={`Prioridade ${name.toLowerCase()} do pedido`} checked={priority===i} disabled={!selected} onChange={()=>adjust({priority:i})}/><span>{i>0&&<ArrowUp size={13}/>} {name}</span></label>)}</div><p>{!selected?'Marque um campeão para começar.':priority===2?'Fica no topo da lista e aparece como urgente na loja do amigo.':priority===1?'Aparece antes dos pedidos normais para o seu amigo.':'Seu amigo verá o pedido junto aos destaques da sua comp.'}</p></fieldset>
  </div>}
  {(open||pending>0||saved||error)&&<p className="duo-request-save-state" role="status" aria-live="polite" aria-atomic="true">{pending>0?<><RefreshCw size={12}/>Salvando alterações…</>:error?'Há alterações não salvas.':saved?<><Check size={12}/>Pedido salvo automaticamente</>:'Selecionar e ajustar já salva o pedido.'}</p>}
  <div className="duo-request-list">{requests.map((w:any)=><div key={w.id} className="duo-own-request" data-priority={w.priority}><button className="duo-request-configure" aria-label={`Editar pedido de ${byId[w.id].name}`} onClick={()=>configure(w)}><img src={portrait(w.id)} alt=""/><span><strong>{byId[w.id].name}</strong><small>{Math.max(0,w.goal-(copies[w.id]||0))===0?'Meta atingida':`Meta: ${w.goal} ${w.goal===1?'cópia':'cópias'}`}</small></span><b className="duo-priority-tag" data-priority={w.priority}>{requestPriorityNames[w.priority]||'Normal'}</b></button><button className="duo-icon-action" aria-label={`Cancelar pedido de ${byId[w.id].name}`} onClick={()=>remove(w.id)}><X size={14}/></button></div>)}</div>
  {!requests.length&&!open&&<p className="duo-request-empty">Precisou de uma peça fora do plano? Peça aqui e escolha a prioridade.</p>}
 </section>;
}
