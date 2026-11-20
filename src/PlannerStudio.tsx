import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, CheckCircle2, Copy, Crosshair, Gem, MousePointer2, Move, Plus, Search, Shield, Star, Trash2, Undo2, X} from 'lucide-react';
import {allItems, byId, champions, dataset, initialComps, itemNames, portrait, pivotSnapshot, type Comp} from './data';
import {indexItemRecommendations, itemKind, recommendItems} from './item-recommendations.mjs';
import {BoardPanel, Items, Stars} from './TftPanels';
import {boardPositions, moveUnit} from './planning.mjs';
import {teamSlots} from './level-planner.mjs';
import {BrandMark} from './Brand';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const equipment=allItems.filter(i=>i.category!=='Componente');
const categories=[...new Set(equipment.map(itemKind))];
type Item=typeof allItems[number];
function ItemButton({item,equipped,onEquip}:{item:Item;equipped:string[];onEquip:(id:string)=>void}){
 const count=equipped.filter(id=>id===item.id).length;
 return <button disabled={equipped.length>=3} onClick={()=>onEquip(item.id)} aria-label={`Equipar ${item.name}`} title={item.name} data-item-kind={itemKind(item)}><img src={`./assets/items/${item.id}.png`} alt="" draggable={false}/><span><strong>{item.name}</strong><small>{itemKind(item)}{count>0&&` · ${count} equipado${count>1?'s':''}`}</small></span>{count>0?<Check size={15}/>:<Plus size={15}/>}</button>;
}
function RecommendationGroup({title,description,items,equipped,onEquip,special=false}:{title:string;description?:string;items:Item[];equipped:string[];onEquip:(id:string)=>void;special?:boolean}){
 if(!items.length)return null;
 return <section className={`studio-recommendation-group ${special?'is-special':''}`} aria-label={title}><header><h3 tabIndex={special?-1:undefined}>{special&&<Gem size={15}/>} {title}</h3>{description&&<p>{description}</p>}</header><div className="studio-item-grid">{items.map(i=><ItemButton key={i.id} item={i} equipped={equipped} onEquip={onEquip}/>)}</div></section>;
}
type Picker={kind:'champions'|'items';cell:number};
function StarChoice({value,onChange}:{value:number;onChange:(n:number)=>void}){
 return <fieldset className="studio-star-choice"><legend>Meta de estrelas</legend><div>{[1,2,3].map(n=><label key={n}><input type="radio" name="studio-stars" checked={value===n} onChange={()=>onChange(n)} aria-label={`${n} ${n===1?'estrela':'estrelas'}`}/><span><span>{Array.from({length:n},(_,i)=><Star key={i} size={13} fill="currentColor"/>)}</span><b>{n===1?'1 cópia':n===2?'3 cópias':'9 cópias'}</b></span></label>)}</div></fieldset>;
}
export function Planner({comp,onChange,onPin,pinned,onNotify,focusId,itemGuides=initialComps}:{comp:Comp;onChange:(c:Comp)=>void;onPin:()=>void;pinned:boolean;onNotify:(s:string)=>void;focusId?:string;itemGuides?:Comp[]}){
 const [picker,setPicker]=useState<Picker|null>(()=>focusId?{kind:'items',cell:(boardPositions(comp,byId) as Record<string,number>)[focusId]??21}:null);
 const [query,setQuery]=useState(''),[cost,setCost]=useState(0),[category,setCategory]=useState('Todos'),[stars,setStars]=useState(2),[history,setHistory]=useState<Comp[]>([]),[moveId,setMoveId]=useState<string|null>(null);
 const [itemView,setItemView]=useState<'recommended'|'all'>('recommended');
 const current=useRef(comp);current.current=comp;
 const dialog=useRef<HTMLDialogElement>(null),search=useRef<HTMLInputElement>(null);
 const positions=boardPositions(comp,byId) as Record<string,number>;
 const selected=picker?Object.keys(positions).find(id=>positions[id]===picker.cell):undefined;
 const commit=(next:Comp)=>{const previous=current.current;setHistory(h=>[...h.slice(-19),previous]);current.current=next;onChange(next);};
 const edited=(value:Partial<Comp>)=>commit({...current.current,...value,style:'Personalizada',source:undefined});
 const open=(cell:number,kind?:Picker['kind'])=>{const id=Object.keys(positions).find(id=>positions[id]===cell);setQuery('');setCost(0);setCategory('Todos');setItemView('recommended');setStars(id?(comp.stars?.[id]||2):2);setPicker({cell,kind:kind||(id?'items':'champions')});};
 const close=()=>setPicker(null);
 useEffect(()=>{const node=dialog.current;if(picker){if(!node?.open)node?.showModal();requestAnimationFrame(()=>search.current?.focus());}else if(node?.open)node.close();},[picker?.kind,picker?.cell]);
 useEffect(()=>{if(!moveId)return;const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape')setMoveId(null);};window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);},[moveId]);
 const put=(id:string,target:number)=>{commit(moveUnit(current.current,id,target,byId) as Comp);setMoveId(null);};
 const choose=(id:string)=>{if(!picker)return;let base=current.current;const pos=boardPositions(base,byId) as Record<string,number>,occupant=Object.keys(pos).find(key=>pos[key]===picker.cell);
  if(occupant&&occupant!==id){const clean={...base.positions};delete clean[occupant];base={...base,champions:base.champions.filter(key=>key!==occupant),positions:clean,items:Object.fromEntries(Object.entries(base.items||{}).filter(([key])=>key!==occupant)),stars:Object.fromEntries(Object.entries(base.stars||{}).filter(([key])=>key!==occupant))};}
  const next=moveUnit(base,id,picker.cell,byId) as Comp;commit({...next,carry:next.champions.includes(next.carry)?next.carry:id,stars:{...next.stars,[id]:stars}});close();onNotify(`${byId[id].name} adicionado à casa ${picker.cell+1}.`);
 };
 const remove=()=>{if(!selected)return;const next=current.current,positions={...next.positions},items={...next.items},stars={...next.stars};delete positions[selected];delete items[selected];delete stars[selected];edited({champions:next.champions.filter(id=>id!==selected),positions,items,stars,carry:next.carry===selected?next.champions.find(id=>id!==selected)||next.carry:next.carry});close();};
 const equip=(id:string)=>{if(!selected)return;const next=current.current,items=next.items?.[selected]||[];if(items.length>=3)return;edited({items:{...next.items,[selected]:[...items,id]}});};
 const removeItem=(index:number)=>{if(!selected)return;const next=current.current;edited({items:{...next.items,[selected]:(next.items?.[selected]||[]).filter((_,i)=>i!==index)}});};
 const filteredChampions=useMemo(()=>champions.filter(c=>(!cost||c.cost===cost)&&norm(`${c.name} ${c.traits.join(' ')}`).includes(norm(query))),[cost,query]);
 const filteredItems=useMemo(()=>equipment.filter(i=>(category==='Todos'||itemKind(i)===category)&&norm(i.name).includes(norm(query))),[category,query]);
 const [championStatistics,setChampionStatistics]=useState<any>((pivotSnapshot as any).championStatistics||{});
 useEffect(()=>{let alive=true;const accept=(state:any)=>{if(alive&&state?.championStatistics)setChampionStatistics(state.championStatistics);};void window.zyon?.getState().then(accept);const off=window.zyon?.onState(accept);return()=>{alive=false;off?.();};},[]);
 const recommendationIndex=useMemo(()=>indexItemRecommendations([...itemGuides,...initialComps.filter(c=>c.source?.name!=='PivotTFT')],allItems,{...dataset,championStatistics}),[itemGuides,championStatistics]);
 const recommendations=useMemo(()=>recommendItems(recommendationIndex,selected,comp.augmentSource||comp.id),[recommendationIndex,selected,comp.augmentSource,comp.id]);
 const showRadiants=()=>{setItemView('recommended');setQuery('');setCategory('Todos');requestAnimationFrame(()=>{const node=dialog.current?.querySelector<HTMLElement>('.studio-recommendation-group.is-special'),scroll=dialog.current?.querySelector<HTMLElement>('.studio-catalog-scroll');if(node&&scroll){scroll.scrollTop+=node.getBoundingClientRect().top-scroll.getBoundingClientRect().top;node.querySelector<HTMLElement>('h3')?.focus({preventScroll:true});}});};
 const equipped=selected?comp.items?.[selected]||[]:[];
 const undo=()=>{const previous=history.at(-1);if(previous){current.current=previous;onChange(previous);setHistory(h=>h.slice(0,-1));close();setMoveId(null);}};
 // Clipboard keeps the existing portable Zyon plan format.
  const exportPlan = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify({
          format: "zyon-plan",
          version: 1,
          set: dataset.set,
          comp,
        }),
      );
      onNotify("Plano copiado. Use Importar plano para abrir em outro Zyon.");
    } catch {
      onNotify("Não foi possível acessar a área de transferência.");
    }
  };
  const importPlan = async () => {
    try {
      const parsed = JSON.parse(await navigator.clipboard.readText());
      const incoming = parsed.comp;
      if (
        parsed.format !== "zyon-plan" ||
        parsed.set !== dataset.set ||
        !incoming ||
        !Array.isArray(incoming.champions) ||
        incoming.champions.length > 28 ||
        incoming.champions.some(
          (id: unknown) => typeof id !== "string" || !byId[id],
        )
      )
        throw Error();
      const cleanPositions: Record<string, number> = {};
      for (const id of incoming.champions) {
        const pos = incoming.positions?.[id];
        if (Number.isInteger(pos) && pos >= 0 && pos < 28)
          cleanPositions[id] = pos;
      }
      const cleanItems: Record<string, string[]> = {};
      const cleanStars: Record<string, number> = {};
      for (const id of incoming.champions) {
        const stars = incoming.stars?.[id];
        if (Number.isInteger(stars) && stars >= 1 && stars <= 3)
          cleanStars[id] = stars;
      }
      for (const id of incoming.champions)
        cleanItems[id] = (
          Array.isArray(incoming.items?.[id]) ? incoming.items[id] : []
        )
          .filter(
            (item: unknown) =>
              typeof item === "string" && allItems.some((i) => i.id === item),
          )
          .slice(0, 3);
      commit({
        ...comp,
        name: String(incoming.name || "Plano importado").slice(0, 40),
        champions: [...new Set<string>(incoming.champions)],
        carry: incoming.champions.includes(incoming.carry)
          ? incoming.carry
          : incoming.champions[0] || comp.carry,
        positions: cleanPositions,
        items: cleanItems,
        stars: cleanStars,
        placement: "manual",
        style: "Personalizada",
        source: undefined,
      });
      onNotify("Plano importado.");
    } catch {
      onNotify("Copie um plano Zyon válido do set 18 e tente novamente.");
    }
  };

 return <main className="planner-page planner-studio">
  <header className="studio-header"><div><span className="studio-eyebrow"><Crosshair size={15}/>Planejador de equipe</span><input className="studio-name" value={comp.name} maxLength={40} aria-label="Nome do plano" onChange={e=>onChange({...comp,name:e.target.value})}/><p>Monte a equipe no tabuleiro. Cada escolha fica salva automaticamente.</p></div><button className={`studio-pin ${pinned?'is-pinned':''}`} disabled={!comp.champions.length} onClick={onPin}><BrandMark/>{pinned?'No seu overlay':'Usar no overlay'}{pinned&&<Check size={15}/>}</button></header>
  <div className="studio-layout"><section className="studio-canvas">
   <div className="studio-canvas-top"><div><h2>Seu tabuleiro</h2><span>{comp.champions.length} campeões · {teamSlots(comp.champions)} espaços</span></div><button className="studio-undo" onClick={undo} disabled={!history.length}><Undo2 size={15}/>Desfazer</button></div>
   {moveId?<div className="studio-move-notice" role="status"><Move size={17}/><span>Escolha a nova casa de <strong>{byId[moveId].name}</strong>.</span><button onClick={()=>setMoveId(null)}>Cancelar</button></div>:null}
   <div className="studio-board"><BoardPanel comp={comp} pinned={pinned} selectedCell={picker?.cell} pointerEditing onCellClick={cell=>moveId?put(moveId,cell):open(cell)} onUnitDrop={put}/></div>
   <div className="studio-instructions"><span><MousePointer2 size={18}/><span><strong>Casa vazia</strong><small>Escolha campeão e estrelas</small></span></span><span><Gem size={18}/><span><strong>Campeão no tabuleiro</strong><small>Adicione ou troque os itens</small></span></span><span><Move size={18}/><span><strong>Arraste para reposicionar</strong><small>Solte na casa destacada</small></span></span></div>
  </section><aside className="studio-roster"><header><h2>Sua equipe</h2><span>{comp.champions.length}</span></header>{comp.champions.length?<div className="studio-roster-list">{comp.champions.map(id=><button key={id} onClick={()=>open(positions[id])} aria-label={`Editar ${byId[id]?.name}`}><img className={`cost-${byId[id]?.cost}`} src={portrait(id)} alt="" draggable={false}/><span><strong>{byId[id]?.name}{id===comp.carry&&<Crosshair size={12} aria-label="Carry principal"/>}</strong><Stars count={comp.stars?.[id]||2}/><Items ids={comp.items?.[id]||[]}/></span><Plus size={14}/></button>)}</div>:<div className="studio-empty"><Plus size={24}/><strong>Comece por uma casa</strong><p>Clique no tabuleiro para escolher o primeiro campeão.</p></div>}<div className="studio-roster-note"><Shield size={15}/><p>As estrelas definem a meta da sua comp. Os itens acompanham o campeão quando ele muda de posição.</p></div></aside></div>
  <footer className="studio-footer"><span><CheckCircle2 size={14}/>Salvo neste dispositivo</span><div><button onClick={importPlan}><Copy size={14}/>Importar plano</button><button onClick={exportPlan}><Copy size={14}/>Copiar plano</button><button disabled={!comp.champions.length} onClick={()=>{edited({champions:[],positions:{},items:{},stars:{}});setMoveId(null);}}><Trash2 size={14}/>Limpar tabuleiro</button></div></footer>
  <dialog className="studio-dialog" data-kind={picker?.kind} ref={dialog} onClose={close} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-labelledby="studio-dialog-title"><div className="studio-dialog-inner">
   <header className="studio-dialog-header"><div>{picker?.kind==='items'&&selected?<><img className={`cost-${byId[selected].cost}`} src={portrait(selected)} alt="" draggable={false}/><div><span>Equipamentos do campeão</span><h2 id="studio-dialog-title">{byId[selected].name}</h2><p>{byId[selected].traits.join(' · ')}</p></div></>:<div><span>Casa {(picker?.cell||0)+1} · {Math.floor((picker?.cell||0)/7)<2?'Linha de frente':'Retaguarda'}</span><h2 id="studio-dialog-title">Quem entra nessa casa?</h2><p>Escolha a meta de estrelas e clique em um campeão.</p></div>}</div><button className="studio-close" aria-label="Fechar seleção" onClick={close}><X size={21}/></button></header>
   <div className="studio-dialog-settings"><StarChoice value={picker?.kind==='items'&&selected?comp.stars?.[selected]||2:stars} onChange={n=>{if(picker?.kind==='items'&&selected)edited({stars:{...current.current.stars,[selected]:n}});else setStars(n);}}/>
   {picker?.kind==='items'&&selected&&<div className="studio-equipped"><span>Itens equipados <b>{equipped.length}/3</b></span><div>{Array.from({length:3},(_,i)=><button key={i} disabled={!equipped[i]} className={equipped[i]?'has-item':''} aria-label={equipped[i]?`Remover ${itemNames[equipped[i]]}, espaço ${i+1}`:`Espaço de item ${i+1} vazio`} title={equipped[i]?`Remover ${itemNames[equipped[i]]}`:'Escolha um item abaixo'} onClick={()=>removeItem(i)}>{equipped[i]?<><img src={`./assets/items/${equipped[i]}.png`} alt={itemNames[equipped[i]]} draggable={false}/><X size={12}/></>:<Plus size={20}/>}</button>)}</div></div>}</div>
   {picker?.kind==='items'&&<div className="studio-item-views"><div role="tablist" aria-label="Escolha de equipamentos"><button role="tab" aria-selected={itemView==='recommended'} onClick={()=>{setItemView('recommended');setQuery('');setCategory('Todos');const scroll=dialog.current?.querySelector('.studio-catalog-scroll');if(scroll)scroll.scrollTop=0;}}>Recomendados</button><button role="tab" aria-selected={itemView==='all'} onClick={()=>setItemView('all')}>Todos os itens</button></div>{!!recommendations.radiants.length&&<button className="studio-special-jump" onClick={showRadiants}><Gem size={13}/>Ver radiantes</button>}</div>}
   <div className="studio-catalog-toolbar"><label className="studio-search"><Search size={17}/><input ref={search} value={query} onChange={e=>{setQuery(e.target.value);if(picker?.kind==='items')setItemView('all');}} aria-label={picker?.kind==='champions'?'Buscar campeão ou sinergia':'Buscar item para equipar'} placeholder={picker?.kind==='champions'?'Buscar campeão ou sinergia':'Buscar item pelo nome'}/>{query&&<button aria-label="Limpar busca" onClick={()=>setQuery('')}><X size={14}/></button>}</label>{picker?.kind==='champions'?<div className="studio-costs" role="group" aria-label="Filtrar por custo">{[0,1,2,3,4,5].map(n=><button key={n} aria-pressed={cost===n} onClick={()=>setCost(n)}>{n||'Todos'}{n>0&&<span/>}</button>)}</div>:<select value={category} onChange={e=>{setCategory(e.target.value);setItemView('all');}} aria-label="Categoria de item"><option>Todos</option>{categories.map(c=><option key={c}>{c}</option>)}</select>}</div>
   <div className="studio-catalog-status" role="status"><span>{picker?.kind==='champions'?`${filteredChampions.length} campeões`:itemView==='recommended'?'Escolhas para este campeão':`${filteredItems.length} itens`}</span><span>{picker?.kind==='items'?(equipped.length===3?'3 itens equipados. Remova um para trocar.':'Clique em um item para equipar.'): 'O campeão entra na casa selecionada.'}</span></div>
   <div className="studio-catalog-scroll">{picker?.kind==='champions'?<div className="studio-champion-grid">{filteredChampions.map(c=><button key={c.id} className={comp.champions.includes(c.id)?'on-board':''} onClick={()=>choose(c.id)} aria-label={`${comp.champions.includes(c.id)?'Mover':'Adicionar'} ${c.name}, ${stars} estrelas`}><div className={`studio-candidate-art cost-${c.cost}`}><img src={portrait(c.id)} alt="" draggable={false}/><span>{c.cost}<i/></span>{comp.champions.includes(c.id)&&<b><Check size={12}/></b>}</div><strong>{c.name}</strong><small>{comp.champions.includes(c.id)?'No tabuleiro':c.traits.slice(0,2).join(' · ')}</small></button>)}</div> :itemView==='recommended'?<div className="studio-recommendations" aria-label={`Itens recomendados para ${selected?byId[selected].name:'o campeão'}`}><header><h3>Itens para {selected?byId[selected].name:'este campeão'}</h3><p>{recommendations.mode==='statistics'?'Conjunto do campeão no PivotTFT · '+recommendations.statistics.builds[0].games.toLocaleString('pt-BR')+' partidas · patch '+recommendations.statistics.patch+'.':recommendations.mode==='unavailable'?'Sem conjunto específico publicado ou amostra válida para este campeão.':recommendations.context?`Build de referência: ${recommendations.context}.`:'Itens usados nas builds publicadas para este campeão. Ajuste à sua comp e aos itens disponíveis.'}</p></header><RecommendationGroup title="Principais" items={recommendations.primary} equipped={equipped} onEquip={equip}/><RecommendationGroup title="Outras opções" items={recommendations.alternatives} equipped={equipped} onEquip={equip}/><RecommendationGroup title="Radiantes, se aparecerem" description="Alternativas aos itens comuns. Não é preciso esperar por elas para equipar o campeão." items={recommendations.radiants} equipped={equipped} onEquip={equip} special/><RecommendationGroup title="Artefatos nas builds" description="Opções especiais indicadas para este campeão nas fontes." items={recommendations.artifacts} equipped={equipped} onEquip={equip} special/><RecommendationGroup title="Específicos desta build" description="Emblemas dependem da composição e da disponibilidade. Não são requisitos para toda build deste campeão." items={recommendations.conditional} equipped={equipped} onEquip={equip}/>{!!recommendations.sources.length&&<p className="studio-item-sources">Referências: {recommendations.sources.map((source:any,i:number)=><span key={source.url}>{i>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer" title={`${source.build} · conferido em ${source.checkedAt}`}>{source.build} ({source.name})</a></span>)}</p>}{!recommendations.primary.length&&<div className="studio-no-results"><strong>Sem recomendação específica</strong><p>Explore o catálogo para escolher os itens do seu plano.</p><button onClick={()=>setItemView('all')}>Ver todos os itens</button></div>}</div>:<div className="studio-item-grid">{filteredItems.map(i=><ItemButton key={i.id} item={i} equipped={equipped} onEquip={equip}/>)}</div>}{(picker?.kind==='champions'?filteredChampions.length===0:itemView==='all'&&filteredItems.length===0)&&<div className="studio-no-results"><Search size={24}/><strong>Nenhum resultado</strong><p>Tente outro nome ou ajuste os filtros.</p><button onClick={()=>{setQuery('');setCost(0);setCategory('Todos');}}>Limpar filtros</button></div>}</div>
   <footer className="studio-dialog-footer">{picker?.kind==='items'&&selected?<><div><button onClick={()=>{setMoveId(selected);close();}}><Move size={14}/>Mover</button><button onClick={()=>open(picker.cell,'champions')}><Undo2 size={14}/>Trocar campeão</button><button onClick={()=>edited({carry:selected})} aria-pressed={comp.carry===selected}><Crosshair size={14}/>{comp.carry===selected?'Carry principal':'Definir carry'}</button><button className="studio-remove" onClick={remove} aria-label={`Remover ${byId[selected].name} do tabuleiro`}><Trash2 size={15}/></button></div><button className="studio-done" onClick={close}><Check size={15}/>Concluir</button></>:<><span>Esc para fechar · Escolhas salvas automaticamente</span><button onClick={close}>Cancelar</button></>}</footer>
  </div></dialog>
 </main>;
}
