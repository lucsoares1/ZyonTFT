import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {Check, ChevronLeft, ChevronRight, Coins, Search, X} from 'lucide-react';
import {allItems, byId, champions, dataset, initialComps, pivotSnapshot, portrait, traitIcon} from './data';
import {indexItemRecommendations, recommendItems} from './item-recommendations.mjs';
import {ownShoppingWishes} from './duo-plans.mjs';
import './overlay-champions.css';

const normalize = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
let viewMemory = {query:'',cost:0,onlyTargets:false};

export function OverlayChampions({state}:{state:any}) {
  const [query, setQuery] = useState(viewMemory.query);
  const [cost, setCost] = useState(viewMemory.cost);
  const [onlyTargets, setOnlyTargets] = useState(viewMemory.onlyTargets);
  const [inspected, setInspected] = useState<string|null>(null);
  const [pending, setPending] = useState<string|null>(null);
  const [error, setError] = useState('');
  const [retryId, setRetryId] = useState<string|null>(null);
  const [notice, setNotice] = useState('');
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const selectionList = useRef<HTMLDivElement>(null);
  const [selectionEdges,setSelectionEdges] = useState({left:false,right:false});
  const [inspectorStyle,setInspectorStyle] = useState<CSSProperties>({left:12,top:120,width:360});
  function cancelHover(){if(hoverTimer.current)clearTimeout(hoverTimer.current);hoverTimer.current=null;}
  function inspect(id:string,button:HTMLButtonElement){
    cancelHover();
    const rect=button.getBoundingClientRect(),safeTop=(button.closest('.overlay-champions')?.querySelector('.oc-controls')?.getBoundingClientRect().bottom||0)+8;
    const spaceBelow=window.innerHeight-rect.bottom-20,spaceAbove=rect.top-safeTop-8,below=spaceBelow>=spaceAbove;
    const width=Math.min(380,window.innerWidth-24),height=Math.max(0,Math.min(340,below?spaceBelow:spaceAbove));
    const top=below?rect.bottom+8:rect.top-height-8;
    setInspectorStyle({left:Math.max(12,Math.min(window.innerWidth-width-12,rect.left)),top,width,maxHeight:height});setInspected(id);
  }
  function leave(){cancelHover();hoverTimer.current=setTimeout(()=>setInspected(null),180);}
  useEffect(()=>()=>cancelHover(),[]);
  useEffect(()=>{const hide=()=>setInspected(null);window.addEventListener('resize',hide);return()=>window.removeEventListener('resize',hide);},[]);
  useEffect(()=>setInspected(null),[query,cost,onlyTargets]);
  useEffect(() => {viewMemory = {query,cost,onlyTargets};}, [query,cost,onlyTargets]);
  const targets = state.shopTargets || {buy:[], requests:[], excluded:[]};
  const own = ownShoppingWishes(state.guideComp, state.overlayPlans?.[state.pinned], state.gameSession, byId, targets);
  const ownIds = new Set<string>(own.map((entry:any) => entry.id));
  const selectionKey = own.map((entry:any)=>entry.id).join(',');
  function updateSelectionEdges(){
    const list=selectionList.current;
    setSelectionEdges(list?{left:list.scrollLeft>1,right:list.scrollWidth-list.clientWidth-list.scrollLeft>1}:{left:false,right:false});
  }
  useEffect(()=>{
    const list=selectionList.current;
    updateSelectionEdges();
    if(!list)return;
    const observer=new ResizeObserver(updateSelectionEdges);
    observer.observe(list);
    return()=>observer.disconnect();
  },[selectionKey]);
  function scrollSelection(direction:number){
    close();
    const list=selectionList.current;
    if(list)list.scrollBy({left:direction*Math.max(64,list.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  const filtered = champions.filter(champion => (!cost || champion.cost === cost) && (!onlyTargets || ownIds.has(champion.id)) && normalize(`${champion.name} ${champion.traits.join(' ')} ${(champion.aliases || []).join(' ')}`).includes(normalize(query))).sort((first, second) => first.cost - second.cost || first.name.localeCompare(second.name, 'pt-BR'));
  const costGroups = [...new Set(filtered.map(entry => entry.cost))].map(value => ({cost:value,units:filtered.filter(entry => entry.cost === value)}));
  const guides = state.saved?.comps || initialComps;
  const championStatistics = state.championStatistics || (pivotSnapshot as any).championStatistics || {};
  const itemIndex = useMemo(() => indexItemRecommendations(guides, allItems, {...dataset,championStatistics}), [guides,championStatistics]);
  const recommendation = inspected ? recommendItems(itemIndex, inspected, state.pinned) : null;
  const champion = inspected ? byId[inspected] : null;
  const close = () => {cancelHover();setInspected(null);};

  async function toggle(id:string) {
    if (pending) return;
    const wasSelected = ownIds.has(id);
    setPending(id);setError('');setNotice('');setRetryId(null);
    try {
      const bridge = window.zyon as typeof window.zyon & {targetAction?:(action:any)=>Promise<any>};
      if (!bridge?.targetAction) throw new Error('Conexão com o jogo indisponível. Reabra o painel.');
      const result = await bridge.targetAction({list:'buy',type:'toggle',id});
      if (result?.error) throw new Error(result.error);
      if (!result || result.ok === false) throw new Error('Não foi possível atualizar a marcação. Tente novamente.');
      setNotice(`${byId[id].name} ${wasSelected ? 'desmarcado' : 'marcado'} na sua loja.`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar a marcação.');setRetryId(id);
    } finally {setPending(null);}
  }

  return <section className="overlay-champions" aria-label="Campeões para comprar" onKeyDown={event => {if (event.key === 'Escape' && inspected) {event.stopPropagation();close();}}}>
    <div className="oc-controls">
      <label className="oc-search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Campeão ou característica" aria-label="Buscar campeão ou característica"/>{query && <button aria-label="Limpar busca" onClick={() => setQuery('')}><X size={15}/></button>}</label>
      <div className="oc-filters"><button aria-pressed={!onlyTargets} onClick={() => setOnlyTargets(false)}>Todos</button><button aria-pressed={onlyTargets} onClick={() => setOnlyTargets(true)}>Procurando <span>{ownIds.size}</span></button><label>Custo<select aria-label="Filtrar custo dos campeões" value={cost} onChange={event => setCost(Number(event.target.value))}><option value={0}>Todos</option>{[...new Set(champions.map(entry => entry.cost))].sort((first,second)=>first-second).map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>
    </div>
    <div className="oc-catalog" aria-label="Campeões disponíveis" onScroll={close}><p className="oc-count"><span>{filtered.length} campeões</span><span>Passe o mouse para ver itens</span></p>
      {costGroups.map(group => <section className="oc-cost-group" key={group.cost} data-cost={group.cost} aria-label={`Campeões de custo ${group.cost}`}>
      <header className="oc-cost-heading"><h3><Coins size={15}/><span>{group.cost}</span><span className="oc-cost-label">ouro</span></h3><span>{group.units.length} campeões</span></header>
      <div className="oc-grid">{group.units.map(entry => {
        const marked = ownIds.has(entry.id);
        return <div className="oc-unit" key={entry.id} data-marked={marked}>
          <button className="oc-champion" data-champion-id={entry.id} disabled={Boolean(pending)} aria-pressed={marked} aria-busy={pending === entry.id} aria-describedby={inspected===entry.id?'oc-item-tooltip':undefined} aria-label={`${marked ? 'Desmarcar' : 'Marcar'} ${entry.name} para comprar`} onMouseEnter={event=>inspect(entry.id,event.currentTarget)} onMouseLeave={leave} onFocus={event=>inspect(entry.id,event.currentTarget)} onBlur={leave} onClick={() => {close();void toggle(entry.id);}}>
            <span className={`oc-portrait cost-${entry.cost}`}><img src={portrait(entry.id)} alt="" draggable={false}/><span className="oc-unit-traits" aria-label={entry.traits.join(' · ')}>{entry.traits.map(trait => <img key={trait} src={traitIcon(trait)} alt={trait} title={trait}/>)}</span>{marked && <span className="oc-mark"><Check size={13}/></span>}</span><strong>{entry.name}</strong>
          </button>
        </div>;
      })}</div></section>)}
      {!filtered.length && <div className="oc-empty"><Search size={24}/><strong>{onlyTargets ? 'Nenhum campeão marcado com estes filtros' : 'Nenhum campeão encontrado'}</strong><p>{onlyTargets ? 'Marque os campeões que quer encontrar na sua loja.' : 'Busque por outro nome ou característica.'}</p><button onClick={() => {setQuery('');setCost(0);setOnlyTargets(false);}}>Mostrar todos</button></div>}
    </div>
    {champion && recommendation && <section id="oc-item-tooltip" role="tooltip" className="oc-inspector oc-hover-inspector" style={inspectorStyle} aria-label={`Itens de ${champion.name}`} onMouseEnter={cancelHover} onMouseLeave={leave}>
      <header><img src={portrait(champion.id)} alt=""/><div><h3>{champion.name}</h3><p>{champion.traits.join(' · ')}</p></div><button onClick={close} aria-label="Fechar itens do campeão"><X size={17}/></button></header>
      <div className="oc-inspector-scroll"><div className="oc-item-heading"><h4>{recommendation.mode==='statistics'?'Conjunto do campeão':'Itens publicados'}</h4><span>{recommendation.mode==='statistics'?'PivotTFT · Emerald+':'Guias de comps'}</span></div>
      {recommendation.primary.length ? <><div className="oc-items">{recommendation.primary.map((item:any,index:number) => <span key={item.id+'-'+index} title={item.name}><img src={`./assets/items/${item.id}.png`} alt=""/><span>{item.name}</span></span>)}</div>{recommendation.statistics && <><p className="oc-build-result"><strong>{recommendation.statistics.builds[0].average.toFixed(2).replace('.',',')}</strong> média <span>{recommendation.statistics.builds[0].games.toLocaleString('pt-BR')} partidas</span></p><p className="oc-source">Melhor média entre os conjuntos da amostra. Patch {recommendation.statistics.patch} · {new Date(recommendation.statistics.made*1000).toLocaleDateString('pt-BR')}. Não garante o melhor resultado em toda comp.</p>{recommendation.statistics.builds.length>1&&<div className="oc-build-alternatives"><h4>Outros conjuntos</h4>{recommendation.statistics.builds.slice(1).map((build:any,index:number)=><div key={index}><span>{build.items.map((id:string,itemIndex:number)=><img key={id+'-'+itemIndex} src={`./assets/items/${id}.png`} alt={allItems.find(item=>item.id===id)?.name||id} title={allItems.find(item=>item.id===id)?.name}/>)}</span><b>{build.average.toFixed(2).replace('.',',')}</b><small>{build.games.toLocaleString('pt-BR')} partidas</small></div>)}</div>}</>}{recommendation.context && <p className="oc-source">Na comp {recommendation.context}.</p>}{recommendation.mode==='guides'&&<p className="oc-source">Itens publicados para este campeão nos guias. Sem amostra estatística válida de conjunto.</p>}</> : <p className="oc-source">Sem conjunto específico disponível para este campeão. Não usamos um kit genérico da classe como se fosse o meta dele.</p>}
      </div>
    </section>}
    <footer className="oc-footer">
      <section className="oc-selected" aria-label="Campeões marcados na loja">
        <header><div><strong>Sua seleção</strong><span>Campeões destacados na loja</span></div><b>{ownIds.size}</b></header>
        {own.length ? <div className="oc-selection-carousel">
          <button className="oc-selection-arrow" data-direction="left" aria-label="Ver campeões marcados à esquerda" hidden={!selectionEdges.left} onClick={()=>scrollSelection(-1)}><ChevronLeft size={18}/></button>
          <div className="oc-selected-list" ref={selectionList} onScroll={()=>{close();updateSelectionEdges();}} tabIndex={0} role="group" aria-label="Campeões selecionados, use as setas para navegar" onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();scrollSelection(event.key==='ArrowLeft'?-1:1);}}}>{own.map((target:any) => <button key={target.id} disabled={Boolean(pending)} aria-label={`Remover ${byId[target.id].name} dos marcados`} onMouseEnter={event=>inspect(target.id,event.currentTarget)} onMouseLeave={leave} onFocus={event=>inspect(target.id,event.currentTarget)} onBlur={leave} onClick={() => {close();void toggle(target.id);}}><span className={`oc-selected-portrait cost-${byId[target.id].cost}`}><img src={portrait(target.id)} alt="" draggable={false}/><i><X size={12}/></i></span><span className="oc-selected-name">{byId[target.id].name}</span></button>)}</div>
          <button className="oc-selection-arrow" data-direction="right" aria-label="Ver campeões marcados à direita" hidden={!selectionEdges.right} onClick={()=>scrollSelection(1)}><ChevronRight size={18}/></button>
        </div> : <p className="oc-selected-empty">Sua seleção está vazia. Marque os campeões no catálogo acima.</p>}
      </section>
      {pending && <p className="oc-source" role="status">Atualizando {byId[pending].name}…</p>}{error && <div className="oc-error" role="alert"><span>{error}</span>{retryId && <button disabled={Boolean(pending)} onClick={() => toggle(retryId)}>Tentar novamente</button>}</div>}{notice && <p className="oc-notice" role="status">{notice}</p>}
    </footer>
  </section>;
}
