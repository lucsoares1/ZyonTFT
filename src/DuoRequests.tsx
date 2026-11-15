import {useMemo,useState} from 'react';
import {ArrowUp,Check,Plus,Search,Send,X} from 'lucide-react';
import {byId,champions,portrait} from './data';

export const requestPriorityNames=['Normal','Alta','Urgente'];
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function DuoRequests({compId,edit,copies={}}:{compId:string;edit:any;copies?:Record<string,number>}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[selected,setSelected]=useState(''),[priority,setPriority]=useState(0),[goal,setGoal]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const requests=useMemo(()=>(edit?.requests||[]).filter((w:any)=>byId[w.id]).slice().sort((a:any,b:any)=>b.priority-a.priority),[edit?.requests]);
 const shown=useMemo(()=>champions.filter(c=>norm(c.name+' '+c.traits.join(' ')).includes(norm(query))).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'pt-BR')),[query]);
 async function change(action:any){setBusy(true);setError('');try{const result=await window.zyon?.editPlan({compId,...action});if(!result||result.error){setError(result?.error||'Não foi possível enviar o pedido. Tente novamente.');return false;}return true;}catch{setError('Não foi possível enviar o pedido. Tente novamente.');return false;}finally{setBusy(false);}}
 function configure(w:any){setSelected(w.id);setPriority(w.priority||0);setGoal(w.goal);setOpen(true);setQuery('');setError('');}
 const existing=requests.some((w:any)=>w.id===selected);
 return <section className="duo-requests" aria-label="Seus pedidos à dupla">
  <header><div><h3>Seus pedidos à dupla</h3><p>Peça qualquer campeão sem mudar sua comp.</p></div><button disabled={busy} aria-expanded={open} onClick={()=>{setOpen(!open);setError('');}}>{open?<X size={14}/>:<Plus size={14}/>}<span>{open?'Fechar':'Pedir campeão'}</span></button></header>
  {error&&<p className="duo-error" role="alert">{error}</p>}
  {open&&<form className="duo-request-editor" onSubmit={async e=>{e.preventDefault();if(!selected||busy)return;if(!existing&&requests.length>=28){setError('Você já tem 28 pedidos. Remova um para pedir outro campeão.');return;}if(await change({type:'request',id:selected,goal,priority})){setOpen(false);setSelected('');setQuery('');}}}>
   <label className="duo-request-search"><Search size={15}/><input aria-label="Buscar campeão para pedir à dupla" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Busque qualquer campeão"/></label>
   <div className="duo-request-catalog" role="group" aria-label="Escolher campeão para a dupla">{shown.map(c=><button type="button" key={c.id} aria-pressed={selected===c.id} aria-label={`Pedir ${c.name} à dupla`} disabled={busy} onClick={()=>{const previous=requests.find((w:any)=>w.id===c.id);if(previous)configure(previous);else{setSelected(c.id);setPriority(0);setGoal(1);}}}><img className={`cost-${c.cost}`} src={portrait(c.id)} alt=""/><span>{c.name}</span>{selected===c.id&&<Check size={13}/>}</button>)}{!shown.length&&<p>Nenhum campeão encontrado.</p>}</div>
   {selected&&<div className="duo-request-selection"><img src={portrait(selected)} alt=""/><div><strong>{byId[selected].name}</strong><small>{byId[selected].traits.join(' · ')}</small></div><label><span>Meta total</span><select aria-label="Meta de cópias do pedido à dupla" value={goal} disabled={busy} onChange={e=>setGoal(Number(e.target.value))}>{[1,3,9].map(n=><option key={n} value={n}>{n} {n===1?'cópia':'cópias'}</option>)}</select></label></div>}
   <fieldset className="duo-request-priority"><legend>Quanto você precisa agora?</legend><div>{requestPriorityNames.map((name,i)=><label key={name} data-priority={i}><input type="radio" name={`duo-priority-${compId}`} aria-label={`Prioridade ${name.toLowerCase()} do pedido`} checked={priority===i} disabled={busy} onChange={()=>setPriority(i)}/><span>{i>0&&<ArrowUp size={13}/>} {name}</span></label>)}</div><p>{priority===2?'Fica no topo da lista e aparece como urgente na loja do amigo.':priority===1?'Aparece antes dos pedidos normais para o seu amigo.':'Seu amigo verá o pedido junto aos destaques da sua comp.'}</p></fieldset>
   <button className="duo-request-submit" disabled={!selected||busy}><Send size={14}/>{busy?'Enviando…':existing?'Atualizar pedido':'Enviar pedido à dupla'}</button>
  </form>}
  <div className="duo-request-list">{requests.map((w:any)=><div key={w.id} className="duo-own-request" data-priority={w.priority}><button className="duo-request-configure" disabled={busy} aria-label={`Editar pedido de ${byId[w.id].name}`} onClick={()=>configure(w)}><img src={portrait(w.id)} alt=""/><span><strong>{byId[w.id].name}</strong><small>{Math.max(0,w.goal-(copies[w.id]||0))===0?'Meta atingida':`Meta: ${w.goal} ${w.goal===1?'cópia':'cópias'}`}</small></span><b className="duo-priority-tag" data-priority={w.priority}>{requestPriorityNames[w.priority]||'Normal'}</b></button><button className="duo-icon-action" disabled={busy} aria-label={`Cancelar pedido de ${byId[w.id].name}`} onClick={()=>change({type:'removeRequest',id:w.id})}><X size={14}/></button></div>)}</div>
  {!requests.length&&!open&&<p className="duo-request-empty">Precisou de uma peça fora do plano? Peça aqui e escolha a prioridade.</p>}
 </section>;
}
