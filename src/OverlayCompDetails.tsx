import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Crosshair, Layers3, Pencil, Sparkles, Star } from 'lucide-react';
import { allItems, byId, dataset, initialComps, itemNames, pivotSnapshot, portrait, splash, type Comp } from './data';
import { CompTierBadge } from './CompTier';
import { CompPerformance } from './CompPerformance';
import { BoardPanel, Items, equipmentFor } from './TftPanels';
import { TraitRail } from './ZyonPieces';
import { TacticalOverview } from './TacticalOverview';
import { publishedBoard } from './board-preview.mjs';
import { indexItemRecommendations, recommendItems } from './item-recommendations.mjs';
import './overlay-comp-details.css';

type DetailTab = 'home' | 'items' | 'champions' | 'transitions' | 'route' | 'planner' | 'augments';
const tabs: [DetailTab, string][] = [['home', 'Início'], ['items', 'Itens'], ['champions', 'Campeões'], ['transitions', 'Transições'], ['route', 'Roteiro']];

const ChampionInspection = createContext<{ inspect: (id: string, target: HTMLElement) => void; leave: () => void; close: () => void; inspected: string | null } | null>(null);

function ChampionPortrait({ id, comp, stars = false }: { id: string; comp: Comp; stars?: boolean }) {
  const inspection = useContext(ChampionInspection);
  return <button type="button" className={`zy-detail-portrait cost-${byId[id].cost}`} aria-label={`Ver itens de ${byId[id].name}`} aria-describedby={inspection?.inspected === id ? 'zy-detail-champion-tooltip' : undefined} onMouseEnter={event => inspection?.inspect(id, event.currentTarget)} onMouseLeave={() => inspection?.leave()} onFocus={event => inspection?.inspect(id, event.currentTarget)} onBlur={() => inspection?.leave()}><img src={portrait(id)} alt="" draggable={false} />{stars && comp.stars?.[id] === 3 && <span className="zy-detail-stars" aria-label="Meta de três estrelas">{[0, 1, 2].map(index => <Star key={index} size={10} fill="currentColor" />)}</span>}</button>;
}

function ChampionInspector({ state, children }: { state: any; children: ReactNode }) {
  const [inspected, setInspected] = useState<string | null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltip = useRef<HTMLElement>(null);
  const guides = state.saved?.comps || initialComps;
  const championStatistics = state.championStatistics || (pivotSnapshot as any).championStatistics || {};
  const index = useMemo(() => indexItemRecommendations(guides, allItems, { ...dataset, championStatistics }), [guides, championStatistics]);
  const recommendation = inspected ? recommendItems(index, inspected, state.guideComp?.id) : null;
  const champion = inspected ? byId[inspected] : null;
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const close = () => { cancel(); setInspected(null); };
  const leave = () => { cancel(); timer.current = setTimeout(() => setInspected(null), 180); };
  const inspect = (id: string, target: HTMLElement) => {
    cancel();
    const rect = target.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const useBelow = below >= above;
    const height = Math.max(0, Math.min(360, useBelow ? below : above));
    setPosition({ left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left)), top: useBelow ? rect.bottom + 8 : rect.top - height - 8, width, maxHeight: height });
    setInspected(id);
  };
  useEffect(() => () => cancel(), []);
  useEffect(() => { close(); }, [state.guideComp?.id]);
  useEffect(() => {
    if (!inspected) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
    const scroll = (event: Event) => { if (!(event.target instanceof Node) || !tooltip.current?.contains(event.target)) close(); };
    window.addEventListener('keydown', escape, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => { window.removeEventListener('keydown', escape, true); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', close); window.removeEventListener('blur', close); };
  }, [inspected]);
  return <ChampionInspection.Provider value={{ inspect, leave, close, inspected }}>{children}{champion && recommendation && createPortal(<section ref={tooltip} id="zy-detail-champion-tooltip" className="zy-detail-champion-tooltip" role="tooltip" aria-label={`Itens ideais de ${champion.name}`} style={position} onMouseEnter={cancel} onMouseLeave={leave}>
    <header><img src={portrait(champion.id)} alt="" /><div><h3>{champion.name}</h3><p>{champion.traits.join(' · ')}</p></div><span>Custo {champion.cost}</span></header>
    <h4>{recommendation.mode === 'statistics' ? 'Conjunto do campeão' : 'Itens publicados'}</h4>
    {recommendation.primary.length ? <><div className="zy-detail-tooltip-items">{recommendation.primary.map((item: any, itemIndex: number) => <div key={`${item.id}-${itemIndex}`}><img src={`./assets/items/${item.id}.png`} alt="" /><span>{item.name}</span></div>)}</div>{recommendation.statistics ? <><p className="zy-detail-tooltip-result"><strong>{recommendation.statistics.builds[0].average.toFixed(2).replace('.', ',')}</strong> média · {recommendation.statistics.builds[0].games.toLocaleString('pt-BR')} partidas</p><p>PivotTFT · Emerald+ · Patch {recommendation.statistics.patch}<br />Amostra de {new Date(recommendation.statistics.made * 1000).toLocaleDateString('pt-BR')}. Melhor média entre os conjuntos disponíveis; o resultado depende da comp.</p></> : <p>Guias de comps · Patch {dataset.patch}{recommendation.context ? ` · ${recommendation.context}` : ''}. Sem amostra estatística válida de conjunto para este campeão.</p>}</> : <p>Sem conjunto específico disponível para este campeão. Nenhum kit genérico de classe é apresentado como meta.</p>}
  </section>, document.body)}</ChampionInspection.Provider>;
}

function DetailRoster({ comp, ids = comp.champions, items = true }: { comp: Comp; ids?: string[]; items?: boolean }) {
  const roster = ids.filter(id => byId[id]);
  return <div className="zy-detail-roster" style={{ '--detail-unit-count': Math.max(1, roster.length) } as CSSProperties}>
    {roster.map(id => <div className="zy-detail-unit" key={id}>
      <ChampionPortrait id={id} comp={comp} stars={items} />
      {items && <Items ids={equipmentFor(comp, id)} />}
      <span title={byId[id].name}>{byId[id].name}</span>
    </div>)}
  </div>;
}

function QuickStart({ state, comp, reference, onPlan }: { state: any; comp: Comp; reference?: Comp; onPlan: () => void }) {
  const inspection = useContext(ChampionInspection);
  const guide = comp.pivot ? comp : reference?.pivot ? reference : undefined;
  const adjusted = Boolean(guide && guide !== comp);
  const [selection, setSelection] = useState<{ compId: string; level: number | 'final' }>({ compId: comp.id, level: 'final' });
  const levels = guide?.pivot?.levels || [];
  const selected = selection.compId === comp.id ? selection.level : 'final';
  const step = levels.find(level => level.level === selected);
  const preview: Comp = step ? publishedBoard(guide || comp, byId, { level: step.level, units: step.units, context: state.gameSession?.context || {} }) : comp;
  const choose = (level: number | 'final') => setSelection({ compId: comp.id, level });
  const openers = (guide?.pivot?.openers || []).filter(id => byId[id]);
  const carries = [...new Set([comp.carry, ...(guide?.pivot?.carries || [])])].filter(id => byId[id] && comp.champions.includes(id));
  const goals = comp.champions.filter(id => byId[id] && comp.stars?.[id] === 3);
  const priority = guide?.pivot?.itemOrder || [];
  return <div className="zy-detail-start">
    <aside className="zy-detail-progression">
      <section className="zy-detail-block"><header><h2>Progressão da comp</h2></header>
        {adjusted && <p className="zy-detail-note">Sua equipe foi ajustada. As etapas abaixo continuam sendo as do guia original.</p>}
        <div className="zy-detail-steps" aria-label="Consultar a progressão publicada">
          {levels.map(level => <article key={level.level} className="zy-detail-step" data-selected={selected === level.level}>
            <button className="zy-detail-step-select" aria-pressed={selected === level.level} aria-label={`Consultar equipe no nível ${level.level}`} onClick={() => choose(level.level)}><span className="zy-detail-step-label"><strong>Nv. {level.level}</strong><span>{level.stage || 'Etapa do guia'}</span><ArrowRight size={14} /></span></button>
            <DetailRoster comp={guide || comp} ids={level.units} items={false} />
          </article>)}
          <button className="zy-detail-final-step" aria-pressed={!step} onClick={() => choose('final')}><span className="zy-detail-step-label"><strong>Equipe final</strong><span>{comp.champions.length} campeões</span><ArrowRight size={14} /></span></button>
        </div>
        {!levels.length && <p className="zy-detail-note">Este plano não tem etapas publicadas. Consulte a equipe final e ajuste-a no planejador.</p>}
      </section>
      {openers.length > 0 && <section className="zy-detail-block"><header><h2>Primeiras peças</h2><span>Guia publicado</span></header><DetailRoster comp={guide || comp} ids={openers} items={false} /></section>}
      {goals.length > 0 && <section className="zy-detail-block"><header><h2>Metas de três estrelas</h2></header><DetailRoster comp={comp} ids={goals} items={false} /></section>}
      {comp.description && <section className="zy-detail-block"><header><h2>Como jogar</h2></header><p className="zy-detail-description">{comp.description}</p></section>}
    </aside>
    <div className="zy-detail-field">
      <section className="zy-detail-positioning"><header className="zy-detail-section-heading"><div><h2><Crosshair size={16} />Posicionamento</h2><p>{step ? `Nível ${step.level}${step.stage ? ` · ${step.stage}` : ''}` : 'Equipe final do seu plano'}</p></div><button onClick={onPlan}><Pencil size={14} />Planejar</button></header>
        <div className="zy-detail-board-inspection" onMouseOver={event => { const target = event.target as HTMLElement; if (target.closest('.equipment,.hex-equipment')) { inspection?.close(); return; } const unit = target.closest<HTMLElement>('[data-champion-id]'); if (!unit?.dataset.championId || !byId[unit.dataset.championId] || (event.relatedTarget instanceof Node && unit.contains(event.relatedTarget) && !(event.relatedTarget instanceof Element && event.relatedTarget.closest('.equipment,.hex-equipment')))) return; inspection?.inspect(unit.dataset.championId, unit); }} onMouseOut={event => { const unit = (event.target as HTMLElement).closest<HTMLElement>('[data-champion-id]'); if (unit && (!(event.relatedTarget instanceof Node) || !unit.contains(event.relatedTarget))) inspection?.leave(); }}><BoardPanel comp={preview} native traitProgress /></div>
        <p className="zy-detail-note">{step ? 'Consulta da etapa publicada. ' : 'Posições do plano selecionado. '}A prévia não altera o nível nem as compras da partida.</p>
      </section>
      <section className="zy-detail-leveling"><header><h2>{guide?.style || comp.style}</h2><span>{step ? 'Etapa em consulta' : 'Roteiro do guia'}</span></header>
        {levels.length > 0 ? <div className="zy-detail-level-track">{levels.map(level => <button key={level.level} aria-pressed={selected === level.level} onClick={() => choose(level.level)}><strong>Nv. {level.level}</strong>{level.stage && <span>{level.stage}</span>}{level.economy?.reserve !== undefined ? <small>Reserva {level.economy.reserve} ouro</small> : level.economy?.floor !== undefined ? <small>Limite {level.economy.floor} ouro</small> : null}</button>)}</div> : <p className="zy-detail-note">Sem roteiro de níveis publicado para este plano.</p>}
      </section>
      <div className="zy-detail-bottom">
        {priority.length > 0 && <section className="zy-detail-block"><header><h2>Prioridade de itens</h2><span>{adjusted ? 'Guia original' : 'Ordem do guia'}</span></header><ol className="zy-detail-priority">{priority.map((id, index) => <li key={`${id}-${index}`}><Items ids={[id]} /><span>{itemNames[id] || id}</span></li>)}</ol></section>}
        {carries.length > 0 && <section className="zy-detail-block"><header><h2>Carries do plano</h2><span>Itens definidos na equipe</span></header><DetailRoster comp={comp} ids={carries} /></section>}
      </div>
    </div>
  </div>;
}

function CompDetailsContent({ state, renderGuide }: { state: any; renderGuide: (state: any) => ReactNode }) {
  const comp = state.guideComp as Comp | null;
  const reference = state.baseGuideComp as Comp | undefined;
  const [selected, setSelected] = useState<{ compId: string | null; tab: DetailTab }>({ compId: comp?.id || null, tab: 'home' });
  const tab = selected.compId === comp?.id ? selected.tab : 'home';
  const [error, setError] = useState('');
  const library = state.gameSession?.tab === 'comps';
  const embedded = (legacyTab: string) => renderGuide({ ...state, gameSession: { ...state.gameSession, collapsed: false, shopOnly: false, tab: legacyTab } });
  const select = (next: DetailTab) => { setSelected({ compId: comp?.id || null, tab: next }); };
  const navigate = async (next: string) => {
    setError('');
    try { await window.zyon?.gameAction({ type: 'tab', compId: comp?.id || null, value: next }); }
    catch { setError('Não foi possível abrir a biblioteca. Tente novamente.'); }
  };
  if (library || !comp) return <div className="zy-comp-details zy-detail-library"><div className="zy-detail-library-heading">{comp && <button onClick={() => void navigate('team')}><ArrowLeft size={16} />Voltar à comp</button>}<h2>Escolha sua composição</h2></div>{error && <p role="alert">{error}</p>}<div className="zy-detail-legacy zy-embedded-guide">{embedded('comps')}</div></div>;
  return <div className="zy-comp-details">
    <header className="zy-detail-hero">{byId[comp.carry] && <img className="zy-detail-carry-art" src={splash(comp.carry)} alt="" draggable={false} />}<div className="zy-detail-title-row"><CompTierBadge comp={comp} /><div className="zy-detail-identity"><h1>{comp.name}</h1><TraitRail comp={comp} /></div><span className="zy-detail-style">{comp.style}</span><button onClick={() => void navigate('comps')}><Layers3 size={15} />Trocar comp</button></div>
      <div className="zy-detail-hero-content"><div className="zy-detail-core"><span className="zy-detail-core-label">Núcleo da comp · {comp.champions.length} campeões</span><DetailRoster comp={comp} /></div><CompPerformance comp={comp} /></div>
    </header>
    <nav className="zy-detail-tabs" aria-label="Detalhes da composição">{tabs.map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => select(id)}>{label}</button>)}<button aria-pressed={tab === 'augments'} aria-label="Aprimoramentos" title="Aprimoramentos" onClick={() => select('augments')}><Sparkles size={16} /></button><button className="zy-detail-plan-button" aria-pressed={tab === 'planner'} onClick={() => select('planner')}><Pencil size={14} />Planejar</button></nav>
    {error && <p className="zy-detail-error" role="alert">{error}</p>}
    <div className={`zy-detail-content ${tab === 'home' || tab === 'champions' || tab === 'transitions' ? 'is-document' : 'is-embedded'}`}>
      {tab === 'home' ? <QuickStart key={comp.id} state={state} comp={comp} reference={reference} onPlan={() => select('planner')} /> : tab === 'transitions' ? <TacticalOverview comp={comp} referenceComp={reference} native context={state.gameSession?.context} /> : tab === 'champions' ? <div className="zy-detail-champions"><header><h2>Campeões da equipe</h2><p>Equipamentos do plano. Passe o mouse no retrato para consultar os itens do campeão.</p></header>{comp.champions.filter(id => byId[id]).map(id => <article key={id}><ChampionPortrait id={id} comp={comp} /><div><h3>{byId[id].name}</h3><p>{byId[id].traits.join(' · ')}</p></div>{equipmentFor(comp, id).length ? <Items ids={equipmentFor(comp, id)} /> : <span className="zy-detail-note">Sem itens definidos no plano</span>}</article>)}</div> : <div className="zy-detail-legacy zy-embedded-guide">{embedded(tab)}</div>}
    </div>
  </div>;
}

export function OverlayCompDetails({ state, renderGuide }: { state: any; renderGuide: (state: any) => ReactNode }) {
  return <ChampionInspector state={state}><CompDetailsContent state={state} renderGuide={renderGuide} /></ChampionInspector>;
}
