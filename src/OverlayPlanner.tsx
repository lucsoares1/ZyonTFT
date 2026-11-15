import {useMemo,useState} from 'react';
import {Search,Check,Plus,RotateCcw,ArrowUpRight,Users} from 'lucide-react';
import {byId,champions,portrait,type Comp} from './data';
import {Items} from './TftPanels';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function OverlayPlanner({state}:{state:any}){
 const comp=state.guideComp as Comp|null,base=(state.baseGuideComp||comp) as Comp|null;
 const [query,setQuery]=useState(''),[cost,setCost]=useState('all'),[only,setOnly]=useState(false),[error,setError]=useState('');
 const picked=new Set<string>(comp?.champions||[]),edit=state.overlayPlans?.[state.pinned];
 const shown=useMemo(()=>champions.filter(c=>(!only||picked.has(c.id))&&(cost==='all'||c.cost===Number(cost))&&norm(c.name+' '+c.traits.join(' ')).includes(norm(query))).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'pt-BR')),[query,cost,only,comp]);
 async function change(action:any){setError('');const result=await window.zyon?.editPlan({compId:state.pinned,...action});if(result?.error)setError(result.error);}
 if(!comp||!base)return <p>Escolha uma comp no app para montar seu plano.</p>;
 return <div className="overlay-planner">
  <header className="overlay-planner-heading"><div><h2>Seu plano, suas escolhas</h2><p>Adicione ou retire campeões. Sua dupla recebe os pedidos automaticamente.</p></div><button onClick={()=>change({type:'restore'})} disabled={!edit}><RotateCcw size={13}/>Restaurar comp</button></header>
  {error&&<p role="alert" className="duo-error">{error}</p>}
  <div className="overlay-plan-roster" aria-label="Campeões do seu plano">{comp.champions.map(id=><div key={id}>
   <button onClick={()=>change({type:'toggle',id})} title={byId[id].name} aria-label={`Retirar ${byId[id].name} da comp`}><img className={`cost-${byId[id].cost}`} src={portrait(id)} alt=""/><span>{byId[id].name}</span><span className="roster-remove">×</span></button>
   <Items ids={comp.items?.[id]||[]}/>
   <label><span>Pedido à dupla</span><select aria-label={`Pedido de ${byId[id].name}`} value={edit?.goals?.[id]??(comp.stars?.[id]===3?9:3)} onChange={e=>change({type:'goal',id,goal:Number(e.target.value)})}><option value={0}>Sem pedido</option><option value={1}>1★ · 1 cópia</option><option value={3}>2★ · 3 cópias</option><option value={9}>3★ · 9 cópias</option></select></label>
  </div>)}</div>
  {!comp.champions.length&&<p className="duo-empty">Seu plano está vazio. Escolha os primeiros campeões abaixo.</p>}
  <p className="overlay-planner-note"><Users size={13}/>{state.social?.session?'Pedidos compartilhados com sua dupla.':'O plano funciona solo. Conecte uma dupla para compartilhar os pedidos.'}</p>
  <div className="overlay-planner-tools"><label><Search size={15}/><input aria-label="Buscar campeão no overlay" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Campeão ou característica"/></label><select aria-label="Custo no planejador do overlay" value={cost} onChange={e=>setCost(e.target.value)}><option value="all">Todos os custos</option>{[1,2,3,4,5].map(c=><option key={c} value={c}>Custo {c}</option>)}</select><button aria-pressed={only} onClick={()=>setOnly(!only)}>Só minha comp</button></div>
  <div className="overlay-champion-pool" aria-label="Todos os campeões do set">{shown.map(c=><button key={c.id} aria-label={`${picked.has(c.id)?'Retirar':'Adicionar'} ${c.name} ${picked.has(c.id)?'da':'à'} comp`} aria-pressed={picked.has(c.id)} onClick={()=>change({type:'toggle',id:c.id})}>
   <span className={`overlay-pool-portrait cost-${c.cost}`}><img src={portrait(c.id)} alt=""/>{picked.has(c.id)?<Check size={12}/>:<Plus size={12}/>}</span><strong>{c.name}</strong><small>{c.cost}<span className="coin-dot"/></small>
  </button>)}</div>
  {!shown.length&&<p className="duo-empty">Nenhum campeão encontrado. Tente outro nome ou custo.</p>}
  <p className="duo-footnote"><ArrowUpRight size={12}/>Mudanças ajustam seu plano e os pedidos. O tabuleiro continua respeitando os espaços de cada nível.</p>
 </div>;
}
