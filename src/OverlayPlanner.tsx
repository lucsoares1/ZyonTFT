import {useEffect,useMemo,useState} from 'react';
import {Search,Check,Plus,RotateCcw,Users,Minus,X,Layers3,ScanLine,ArrowRight} from 'lucide-react';
import {byId,champions,portrait,allTraits,traitIcon,type Comp} from './data';
import {Items} from './TftPanels';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const traits=[...new Set(champions.flatMap(c=>c.traits))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
const traitImages=new Map(allTraits.map(t=>[t.name,traitIcon(t.name)]));
const goals=[{goal:0,stars:0,label:'Não pedir cópias'},{goal:1,stars:1,label:'1 estrela, 1 cópia'},{goal:3,stars:2,label:'2 estrelas, 3 cópias'},{goal:9,stars:3,label:'3 estrelas, 9 cópias'}];
function TraitArt({name}:{name:string}){return traitImages.has(name)?<img src={traitImages.get(name)} alt=""/>:<Layers3 size={20}/>;}
function GoalSelector({id,value,onChange,disabled}:{id:string;value:number;onChange:(goal:number)=>Promise<boolean>;disabled:boolean}){
 const [selected,setSelected]=useState(value);useEffect(()=>setSelected(value),[id,value]);
 async function choose(goal:number){setSelected(goal);if(!await onChange(goal))setSelected(current=>current===goal?value:current);}
 return <fieldset className="plan-request" aria-label={`Pedido de ${byId[id].name}`}><legend>Meta de estrelas</legend><div className="plan-goals">{goals.map(g=><label key={g.goal} className="plan-goal"><input type="radio" name={`goal-${id}`} aria-label={`${g.label} de ${byId[id].name}`} checked={selected===g.goal} disabled={disabled} onChange={()=>choose(g.goal)}/><span>{g.stars?<><strong>{g.stars}</strong><i className="plan-star-pips" aria-hidden="true">{Array.from({length:g.stars},(_,i)=><b key={i}/>)}</i></>:<Minus size={17}/>}</span></label>)}</div><p className="plan-goal-caption">{selected===0?'Sem pedido de compra ou envio':`${selected===1?'1 estrela':selected===3?'2 estrelas':'3 estrelas'} · ${selected} ${selected===1?'cópia':'cópias'}`}</p></fieldset>;
}
export function OverlayPlanner({state}:{state:any}){
 const comp=state.guideComp as Comp|null,base=(state.baseGuideComp||comp) as Comp|null;
 const [query,setQuery]=useState(''),[cost,setCost]=useState('all'),[only,setOnly]=useState(false),[error,setError]=useState(''),[activeId,setActiveId]=useState(''),[mode,setMode]=useState<'champions'|'traits'>('champions'),[busy,setBusy]=useState(false);
 const picked=useMemo(()=>new Set<string>(comp?.champions||[]),[comp?.champions]);
 const edit=state.overlayPlans?.[state.pinned],wantedTraits:string[]=edit?.traits||[],copies=state.gameSession?.context?.copies||{};
 const focus=comp?.champions.find(id=>id===activeId)||comp?.champions[0];
 const shown=useMemo(()=>champions.filter(c=>(!only||picked.has(c.id))&&(cost==='all'||c.cost===Number(cost))&&norm(c.name+' '+c.traits.join(' ')).includes(norm(query))).sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'pt-BR')),[query,cost,only,picked]);
 const shownTraits=useMemo(()=>traits.filter(name=>norm(name).includes(norm(query))),[query]);
 const connected=Boolean(state.social?.session&&state.social?.partner);
 async function change(action:any){if(busy)return false;setBusy(true);setError('');try{const result=await window.zyon?.editPlan({compId:state.pinned,...action});if(result?.error)setError(result.error);return Boolean(result&&!result.error);}catch{setError('Não foi possível mudar o plano. Tente novamente.');return false;}finally{setBusy(false);}}
 const unitGoal=(id:string)=>edit?.goals?.[id]??(comp?.stars?.[id]===3?9:3);
 if(!comp||!base)return <p>Escolha uma comp na aba Comps para começar seu plano.</p>;
 return <div className="overlay-planner plan-workbench">
  <header className="overlay-planner-heading"><div><h2>Planejar a partida</h2><p>{comp.name}</p></div><button onClick={()=>change({type:'restore'})} disabled={!edit||busy}><RotateCcw size={14}/>Restaurar comp</button></header>
  <div className="plan-section-heading"><h3>Sua equipe <span>{comp.champions.length}</span></h3><span className={`plan-sync-state ${connected?'is-connected':''}`}><Users size={13}/>{connected?`Compartilhado com ${state.social.partner.display_name}`:'Plano solo'}</span></div>
  {error&&<p role="alert" className="duo-error">{error}</p>}
  <div className="overlay-plan-roster" aria-label="Campeões do seu plano">{comp.champions.map(id=><article className={`plan-unit cost-${byId[id].cost} ${focus===id?'is-focused':''}`} key={id}>
   <button className="plan-unit-select" aria-label={`Configurar meta de ${byId[id].name}`} aria-pressed={focus===id} onClick={()=>setActiveId(id)}><img src={portrait(id)} alt=""/><span><strong title={byId[id].name}>{byId[id].name}</strong>{comp.items?.[id]?.length?<Items ids={comp.items[id]}/>:<small>{unitGoal(id)===0?'Sem pedido':`${Math.min(9,copies[id]||0)}/${unitGoal(id)} cópias`}</small>}</span></button>
   <button className="plan-remove" disabled={busy} onClick={()=>change({type:'toggle',id})} title={`Retirar ${byId[id].name}`} aria-label={`Retirar ${byId[id].name} da comp`}><X size={13}/></button>
  </article>)}</div>
  {focus?<section className="plan-focus" aria-label={`Meta de ${byId[focus].name}`} key={focus}>
   <div className="plan-focus-unit"><img className={`cost-${byId[focus].cost}`} src={portrait(focus)} alt=""/><div><strong>{byId[focus].name}</strong><span>{byId[focus].traits.join(' · ')}</span><small>{copies[focus]||0} {copies[focus]===1?'cópia acompanhada':'cópias acompanhadas'}</small></div></div>
   <GoalSelector id={focus} value={unitGoal(focus)} disabled={busy} onChange={goal=>change({type:'goal',id:focus,goal})}/>
  </section>:<p className="duo-empty">Comece escolhendo um campeão abaixo.</p>}
  <div className="plan-catalog-heading"><div role="tablist" aria-label="Catálogo do planejador"><button role="tab" aria-selected={mode==='champions'} onClick={()=>{setMode('champions');setQuery('');}}>Campeões <span>{champions.length}</span></button><button role="tab" aria-selected={mode==='traits'} onClick={()=>{setMode('traits');setQuery('');}}>Sinergias <span>{traits.length}</span></button></div><span><ScanLine size={13}/>Destaques na loja</span></div>
  {!!wantedTraits.length&&<div className="plan-selected-traits" aria-label="Sinergias marcadas">{wantedTraits.map(name=><button key={name} aria-label={`Remover sinergia ${name} dos destaques`} onClick={()=>change({type:'trait',name})} disabled={busy}><TraitArt name={name}/><span>{name}</span><X size={12}/></button>)}</div>}
  <div className="overlay-planner-tools"><label><Search size={16}/><input aria-label={mode==='champions'?'Buscar campeão no overlay':'Buscar sinergia no overlay'} value={query} onChange={e=>setQuery(e.target.value)} placeholder={mode==='champions'?'Buscar campeão ou sinergia':'Buscar sinergia'}/>{query&&<button aria-label="Limpar busca do planejador" onClick={()=>setQuery('')}><X size={13}/></button>}</label>{mode==='champions'&&<><select aria-label="Custo no planejador do overlay" value={cost} onChange={e=>setCost(e.target.value)}><option value="all">Todos os custos</option>{[1,2,3,4,5].map(c=><option key={c} value={c}>Custo {c}</option>)}</select><button aria-pressed={only} onClick={()=>setOnly(!only)}>Minha equipe</button></>}</div>
  {mode==='champions'?<><div className="overlay-champion-pool" aria-label="Todos os campeões do set">{shown.map(c=>{
   const targeted=c.traits.some(t=>wantedTraits.includes(t));
   return <button key={c.id} className={`plan-pool-unit cost-${c.cost}`} data-targeted={targeted||undefined} disabled={busy} aria-label={`${picked.has(c.id)?'Retirar':'Adicionar'} ${c.name} ${picked.has(c.id)?'da':'à'} comp`} aria-pressed={picked.has(c.id)} onClick={async()=>{if(await change({type:'toggle',id:c.id})&&!picked.has(c.id))setActiveId(c.id);}}>
    <span className="overlay-pool-portrait"><img src={portrait(c.id)} alt=""/><i>{picked.has(c.id)?<Check size={13}/>:<Plus size={13}/>}</i></span><span className="plan-pool-copy"><strong>{c.name}</strong><small><b className="plan-cost">{c.cost}<span className="coin-dot"/></b>{targeted?<span className="plan-pool-trait">Sinergia</span>:<span>{c.traits[0]}</span>}</small></span>
   </button>;
  })}</div>{!shown.length&&<p className="duo-empty">Nenhum campeão encontrado. Tente outro nome ou custo.</p>}</>:<><div className="plan-trait-catalog" aria-label="Todas as sinergias do set">{shownTraits.map(name=>{
   const members=champions.filter(c=>c.traits.includes(name)),inPlan=members.filter(c=>picked.has(c.id)).length,selected=wantedTraits.includes(name);
   return <button key={name} aria-label={`${selected?'Deixar de procurar':'Procurar'} sinergia ${name}`} aria-pressed={selected} disabled={busy} onClick={()=>change({type:'trait',name})}><span className="plan-trait-emblem"><TraitArt name={name}/></span><span className="plan-trait-copy"><strong>{name}</strong><small>{members.length} {members.length===1?'campeão':'campeões'} <span>{inPlan} no plano</span></small></span><span className="plan-trait-check">{selected?<Check size={16}/>:<Plus size={16}/>}</span><span className="plan-trait-members">{members.slice(0,6).map(c=><img key={c.id} src={portrait(c.id)} alt={c.name} title={c.name}/>)}{members.length>6&&<span>+{members.length-6}</span>}<b>{selected?'Procurando':'Procurar'}</b></span></button>;
  })}</div>{!shownTraits.length&&<p className="duo-empty">Nenhuma sinergia encontrada. Tente outro nome.</p>}</>}
  <p className="plan-workbench-note"><ArrowRight size={13}/>{mode==='traits'?'Marque uma sinergia para procurar uma cópia de cada campeão.':'Selecione uma peça da equipe para ajustar sua meta.'}{connected?' Sua dupla recebe os mesmos destaques.':''}</p>
 </div>;
}
