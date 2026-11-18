import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  CircleDot,
  Route,
  Sparkles,
  Swords,
  Users,
  Layers3,
  LayoutGrid,
  Send,
  Minimize2,
  Maximize2,
  GripVertical,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Coins,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { byId, portrait, splash, type Comp } from "./data";
import { BoardPanel, UnitStrip } from "./TftPanels";
import { OverlayRoster } from "./OverlayRoster";
import { currentGold, currentLevel } from "./hud-reading.mjs";
import {BrandMark} from "./Brand";
import {OverlayPlanner} from './OverlayPlanner';
import {SocialPanel} from './SocialPanel';
import {OverlayComps} from './OverlayComps';
import {PerformanceSource,CarryBuildStats} from './CompPerformance';
import { CompTierBadge } from "./CompTier";
import { ItemRecipe } from "./CompGuide";
import {
  PivotGuide,
  ItemOrder,
  AugmentGuide,
  BuildSwitch,
  PivotTiersContext,
  PivotAugmentContext,
} from "./PivotGuide";
import { pivotSnapshot } from "./data";
import {augmentCatalog} from './comp-augments.mjs';
import { plannedBoard } from "./board-preview.mjs";
import {
  costOdds,
  planForLevel,
  shopRules,
  type LevelContext,
} from "./level-planner.mjs";

type Tab = "now" | "team" | "items" | "match" | "route" | "augments" | "planner" | "duo" | "comps";
type Session = {
  context: LevelContext;
  levelMode: "ocr";
  goldMode: "ocr";
  purchases: { id: string; at: number }[];
  tab: Tab;
  collapsed: boolean;
  shopOnly: boolean;
  side: string;
};
type Action = {
  type: string;
  delta?: number;
  id?: string;
  value?: string | boolean;
};
const tabs: [Tab, string][] = [
  ["comps", "Comps"],
  ["now", "Agora"],
  ["team", "Equipe"],
  ["planner", "Planejar"],
  ["route", "Roteiro"],
  ["items", "Itens"],
  ["augments", "Aprim."],
  ["duo", "Dupla"],
  ["match", "Partida"],
];
function GuideTabIcon({ tab }: { tab: Tab }) {
  const Icon = {
    comps: Layers3,
    now: CircleDot,
    team: Users,
    planner: LayoutGrid,
    duo: Send,
    route: Route,
    items: Swords,
    augments: Sparkles,
    match: Activity,
  }[tab];
  return <Icon size={15} aria-hidden="true" />;
}
const names = (ids: string[]) => ids.map((id) => byId[id]?.name).join(", ");

function Faces({
  ids,
  context,
  temporary = [],
  targets = [],
}: {
  ids: string[];
  context: LevelContext;
  temporary?: string[];
  targets?: string[];
}) {
  return (
    <div className="game-faces">
      {ids.map((id) => (
        <div className="game-unit" key={id} data-unit={id}>
          <div className={`game-portrait cost-${byId[id].cost}`}>
            <img src={portrait(id)} alt="" />
            <b>{byId[id].cost}</b>
          </div>
          <strong title={byId[id].name}>{byId[id].name}</strong>
          <small>
            {targets.includes(id)
              ? "Meta 3★"
              : temporary.includes(id)
                ? "Temporário"
                : "Núcleo"}
          </small>
          <span className="game-copy-count">
            {context.copies[id] || 0}/{targets.includes(id) ? 9 : 3}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GameGuide() {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    document.body.classList.add("overlay-body");
    document.documentElement.classList.add("overlay-root");
    window.zyon?.getState().then(setState);
    return window.zyon?.onState(setState);
  }, []);
  if (!state?.gameSession) return null;
  return (
    <PivotTiersContext.Provider
      value={state.catalogTiers || pivotSnapshot.tiers}
    >
      <PivotAugmentContext.Provider value={state.catalogAugments||augmentCatalog(pivotSnapshot)}>
      <LiveGuide state={state} />
      </PivotAugmentContext.Provider>
    </PivotTiersContext.Provider>
  );
}

function LiveGuide({ state }: { state: any }) {
  const session = state.gameSession as Session;
  const comp = state.guideComp as Comp | null;
  const publishedComp=(comp?.pivot?comp:state.baseGuideComp?.pivot?state.baseGuideComp:null) as Comp|null;
  const { context, collapsed } = session;
  const duoConnected=Boolean(state.social?.session&&state.social?.partner);
  const tab=session.tab==='duo'&&!duoConnected?'now':session.tab;
  const visibleTabs=duoConnected?tabs:tabs.filter(([id])=>id!=='duo');
  const lastPurchase = session.purchases?.at(-1);
  const [clock, setClock] = useState(Date.now);
  const [showRoster, setShowRoster] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  // A sensor event can arrive between timer ticks; compare it to the current
  // render time rather than a timer value from before that fresh frame.
  const now = Math.max(clock, Date.now());
  const liveGold = currentGold(state.goldReading, now);
  const goldKnown = liveGold !== null;
  const goldValue = liveGold ?? "—";
  const liveLevel = currentLevel(state.levelReading, now);
  const levelKnown = liveLevel !== null;
  const hudKnown = goldKnown && levelKnown;
  const levelValue = liveLevel ?? "—";
  const goldStatus = !state.readerActive
    ? "Leitura pausada"
    : state.readerPresence === "waiting"
      ? "Aguardando a partida em primeiro plano"
      : goldKnown
        ? "Ouro lido no jogo"
        : state.goldReading?.gold != null
          ? `Atualizando ouro… Última confirmação: ${state.goldReading.gold}.`
          : "Aguardando leitura do ouro";
  const send = (action: Action) =>
    window.zyon?.gameAction({ ...action, compId: state.pinned });
  // null follows the live session; a number is a local browsing level only.
  const [teamLevel, setTeamLevel] = useState<number | "final" | null>(null);
  const finalTeam = teamLevel === "final";
  const viewedLevel = typeof teamLevel === "number" ? teamLevel : context.level;
  const [confirmReset, setConfirmReset] = useState(false);
  const [correctCopies, setCorrectCopies] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
    setConfirmReset(false);
    setCorrectCopies(false);
  }, [tab, comp?.id]);
  useEffect(() => {setTeamLevel(null);setShowRoster(false);}, [comp?.id]);
  const plan = useMemo(
    () => (comp ? planForLevel(comp, byId, context) : null),
    [comp, context],
  );
  const next = useMemo(
    () =>
      comp && context.level < 10
        ? planForLevel(comp, byId, { ...context, level: context.level + 1 })
        : null,
    [comp, context],
  );
  const levelPreview = useMemo(() => comp && plan ? plannedBoard(comp, byId, plan, context.copies) : null,
    [comp, plan, context.copies]);
  const teamPlan = useMemo(() => comp ? teamLevel === null ? plan :
    planForLevel(comp, byId, {...context, level: viewedLevel}) : null,
    [comp, plan, context, teamLevel, viewedLevel]);
  const preview = useMemo(() => finalTeam ? comp : comp && teamPlan ?
    plannedBoard(comp, byId, teamPlan, context.copies) : null,
    [comp, finalTeam, teamPlan, context.copies]);
  const phase =
    context.level <= 4
      ? "Início"
      : plan && context.level >= plan.strategy.targetLevel
        ? "Núcleo"
        : "Transição";
  const targetIds = plan
    ? [
        ...new Set([
          ...Object.keys(context.copies).filter(
            (id) => byId[id] && context.copies[id] > 0,
          ),
          ...plan.strategy.targets,
          ...plan.strategy.ids,
          ...plan.team.temporary,
          ...Object.keys(context.copies).filter(
            (id) => byId[id] && context.copies[id] > 0,
          ),
        ]),
      ]
    : [];
  if(session.shopOnly)return <section className="game-shop-only" aria-label="Overlay em modo só loja">
    <span className="guide-drag-grip" title="Arraste para mover o painel"><GripVertical size={16}/></span>
    <span className="game-shop-only-label"><BrandMark/>Painel</span>
    <button data-guide-shop-toggle aria-label="Expandir painel do overlay" title="Expandir painel · Ctrl+Shift+G" onClick={()=>send({type:'shop-only'})}><Maximize2 size={16}/></button>
  </section>;
  return (
    <section
      className={`game-guide game-wide zy-native-reference ${collapsed ? "game-collapsed" : ""}`}
      style={{ opacity: Math.max(0.75, state.opacity / 100) }}
      aria-label="Guia da partida"
    >
      <header className="game-heading">
        <div className="zy-overlay-windowbar">
          <span className="guide-drag-grip" title="Arraste pelo cabeçalho para mover o painel"><GripVertical size={15}/></span>
          <span className="zy-overlay-product"><BrandMark/><strong>Zyon TFT</strong></span>
          <span className="zy-overlay-reader" data-active={state.readerActive&&!state.readerError} data-error={Boolean(state.readerError)}>{state.readerError?'Erro de leitura':state.readerActive?'OCR ligado':'OCR pausado'}</span>
        <div className="game-heading-controls">
          {!collapsed&&<button title={state.gameSession?.guideExpanded?'Voltar ao painel':'Ampliar overlay'} aria-label={state.gameSession?.guideExpanded?'Voltar ao painel':'Ampliar overlay'} onClick={()=>send({type:'guide-expand'})}><Maximize2 size={16}/></button>}
          <button
            data-guide-shop-toggle
            title="Só avisos da loja"
            aria-label="Encolher painel e manter avisos da loja"
            onClick={() => send({ type: "shop-only" })}
          >
            <Minimize2 size={16} />
          </button>
          <button
            title="Ctrl+Shift+G"
            aria-label={collapsed ? "Expandir guia" : "Recolher guia"}
            onClick={() => send({ type: "collapse" })}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button title="Ocultar overlay" aria-label="Ocultar overlay" onClick={()=>window.zyon?.close()}><X size={17}/></button>
        </div>
        </div>
        <div className="zy-overlay-plan">
          {comp&&!collapsed&&<img className="zy-overlay-portrait" src={portrait(comp.carry)} alt="" draggable={false}/>}
          <div className="zy-overlay-identity">
            <button className="game-comp-trigger" aria-label="Trocar composição no overlay" title="Trocar composição" onClick={()=>{void send({type:'tab',value:'comps'});if(collapsed)void send({type:'collapse'});}}><h1 title={comp?.name}>{comp?.name || "Escolher composição"}</h1><ChevronDown size={14}/></button>
            <div className="zy-overlay-plan-meta">{comp&&<CompTierBadge comp={comp}/>}<span>{plan?.strategy.reroll?`Reroll no nível ${plan.strategy.targetLevel}`:comp?.style||'Escolha seu plano para começar'}</span></div>
          </div>
          {comp&&collapsed&&<div className="zy-overlay-mini-roster" aria-label="Equipe completa no modo compacto" style={{'--mini-count':comp.champions.length} as CSSProperties}><UnitStrip comp={comp}/></div>}
          {comp&&!collapsed&&<button className="zy-overlay-roster-toggle" aria-expanded={showRoster} aria-controls="zy-overlay-roster" onClick={()=>setShowRoster(value=>!value)}><Users size={15}/>{showRoster?'Ocultar equipe':'Ver equipe'}{showRoster?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>}
        </div>
        {comp&&showRoster&&!collapsed&&<div className="zy-overlay-roster" id="zy-overlay-roster"><OverlayRoster comp={comp}/></div>}
      </header>
      {collapsed ? (
        <button
          className="game-collapsed-action"
          onClick={() => send({ type: "collapse" })}
        >
          <b>Nv. {levelValue}</b>
          <span className="collapsed-gold">
            <Coins size={12} />
            {goldValue}
          </span>
          <span>{!state.readerActive?'OCR pausado':!hudKnown && comp ? "Atualizando dados do jogo…" : plan?.decision.title || "Fixe uma comp no app"}</span>
          <ChevronDown size={14} />
        </button>
      ) : (
        <>
          <div className="game-telemetry">
            <div className="game-context">
              <div className="game-level">
                <span>
                  Nível <b>{levelValue}</b>
                </span>
              </div>
              <button
                className="game-resources"
                title={`${goldStatus}. Vida informada manualmente.`}
                aria-label="Ver dados da partida"
                onClick={() => send({ type: "tab", value: "match" })}
              >
                <Coins size={14} />
                <b data-testid="live-gold">{goldValue}</b>
                <Heart size={14} />
                <b>{context.hp}</b>
              </button>
              <span
                className="game-mode"
                title="Nível acompanhado automaticamente pelo OCR do jogo"
              >
                Automático
              </span>
            </div>
            <div className="zy-overlay-reading-context"><p className="game-level-status">
              {!state.readerActive
                  ? "Inicie o OCR abaixo para acompanhar o nível do jogo."
                  : levelKnown
                    ? `Nível ${liveLevel} confirmado pelo OCR.`
                    : state.levelReading?.status === "lower"
                      ? "Leitura abaixo do nível atual. Nova partida? Reinicie em Partida."
                      : state.levelReading?.status === "confirming"
                        ? "Confirmando o nível em uma segunda leitura…"
                    : state.levelReading?.level != null ? `Atualizando nível. Última leitura: ${context.level}.` : "Aguardando leitura do nível no jogo."}
            </p>
            <div className="game-live-status" aria-live="polite">
              <span
                data-status={state.goldReading?.status}
              >
                {goldStatus}
              </span>
              {lastPurchase && byId[lastPurchase.id] && (
                <span className="game-last-purchase">
                  <img src={portrait(lastPurchase.id)} alt="" />
                  Última compra: {byId[lastPurchase.id].name}{" "}
                  <b>
                    {context.copies[lastPurchase.id] || 0}{" "}
                    {context.copies[lastPurchase.id] === 1 ? "cópia" : "cópias"}
                  </b>
                </span>
              )}
            </div>
            </div>
          </div>
          <div className="zy-overlay-workspace">
          <nav className="game-tabs" aria-label="Guia no jogo" role="tablist" aria-orientation="vertical" onKeyDown={event=>{
            if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
            event.preventDefault();
            const current=visibleTabs.findIndex(([id])=>`game-tab-${id}`===(event.target as HTMLElement).closest('button')?.id);
            const index=event.key==='Home'?0:event.key==='End'?visibleTabs.length-1:(current+(event.key==='ArrowDown'?1:-1)+visibleTabs.length)%visibleTabs.length;
            const nextTab=visibleTabs[index][0];void send({type:'tab',value:nextTab});document.getElementById(`game-tab-${nextTab}`)?.focus();
          }}>
            {visibleTabs.map(([id, label]) => (
              <button
                role="tab"
                id={`game-tab-${id}`}
                aria-controls="game-content"
                aria-selected={id === tab}
                tabIndex={id===tab?0:-1}
                key={id}
                onClick={() => send({ type: "tab", value: id })}
              >
                <GuideTabIcon tab={id} />
                {label}
              </button>
            ))}
          </nav>
          <div key={tab}
            className={`game-content game-tab-${tab}`}
            id="game-content"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`game-tab-${tab}`}
            ref={scroller}
          >
            {tab==='comps'?<OverlayComps state={state}/>:tab==='duo'&&duoConnected ? <SocialPanel native gameState={state}/> : !comp || !plan ? (
              <div className="game-empty">
                <h2>Escolha seu plano</h2>
                <p>
                  Abra Comps na lateral, consulte uma composição e escolha seu plano para o overlay.
                </p>
                <button onClick={()=>send({type:'tab',value:'comps'})}>Escolher composição<ArrowRight size={14}/></button>
              </div>
            ) : (
              <>
                {tab==='planner'&&<OverlayPlanner state={state}/>}
                {publishedComp&&!comp.pivot&&['now','team'].includes(tab)&&<div className="zy-path-reference">Seu plano tem ajustes de elenco. Esta equipe acompanha esses ajustes.<button className="zy-source-restore" onClick={()=>void window.zyon?.editPlan({type:'restore',compId:comp.id})}>Restaurar plano do guia</button></div>}
                {tab === "route" && (
                  <>
                    <BuildSwitch
                      comp={comp}
                      builds={(state.saved?.comps || []).filter(
                        (c: Comp) =>
                          c.pivot && c.pivot.family === comp.pivot?.family,
                      )}
                      onBuild={(id) => window.zyon?.chooseBuild(id)}
                    />
                    {publishedComp ? (
                     <>
                      {publishedComp!==comp&&<p className="game-caption">Roteiro original do guia PivotTFT. Seu plano ajustado continua em Agora e Equipe.</p>}
                      <PivotGuide
                        comp={publishedComp}
                        level={context.level}
                        context={context}
                        compact
                        wide
                      />
                     </>
                    ) : (
                      <p>
                        Esta comp usa o roteiro adaptativo. Veja as peças e
                        transições em Agora e Equipe.
                      </p>
                    )}
                  </>
                )}
                {tab === "augments" && <><header className="overlay-page-heading"><h2>Aprimoramentos</h2></header><AugmentGuide comp={comp} /></>}
                {tab === "now" && (
                  <div className="game-now-layout">
                    <div className="game-now-main">
                      <div className="game-phase">
                        <span className={phase === "Início" ? "current" : ""}>
                          Início
                        </span>
                        <i />
                        <span
                          className={phase === "Transição" ? "current" : ""}
                        >
                          Transição
                        </span>
                        <i />
                        <span className={phase === "Núcleo" ? "current" : ""}>
                          Núcleo
                        </span>
                      </div>
                      <section
                        className={`game-decision decision-${plan.decision.kind}`}
                        aria-live="polite"
                      >
                        <h2>{hudKnown ? plan.decision.title : !levelKnown ? "Aguardando o nível atual" : "Aguardando o ouro atual"}</h2>
                        <p>{hudKnown ? plan.instruction : "As unidades e transições continuam abaixo. A recomendação de gastar, rolar ou comprar XP volta assim que o OCR confirmar seu nível e ouro."}</p>
                        {hudKnown && <details className="game-reason">
                          <summary>Entenda a decisão</summary>
                          <p>{plan.decision.text}</p>
                          <p>
                            Considera o ouro e as cópias registrados nesta
                            partida. {plan.budget.purchaseReserve} de ouro
                            reservados para uma cópia de cada prioridade;
                            reavalie se aparecerem outras compras.
                          </p>
                        </details>}
                      </section>
                      {!!plan.notes.length && (
                        <details className="game-condition">
                          <summary>Condição deste plano</summary>
                          {plan.notes.map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </details>
                      )}
                      <section className="game-section game-buy">
                        <h3>
                          {context.level <= 4
                            ? "Compre nas lojas naturais"
                            : "Procure neste nível"}
                        </h3>
                        <p className="game-caption">
                          Compre os campeões destacados na loja. As cópias
                          aparecem aqui automaticamente.
                        </p>
                        <div className="game-priorities">
                          {plan.priorities.map(({ id, goal, reason }) => (
                            <div
                              className="game-priority"
                              data-unit={id}
                              key={id}
                            >
                              <img
                                className={`cost-${byId[id].cost}`}
                                src={portrait(id)}
                                alt=""
                              />
                              <div>
                                <strong>{byId[id].name}</strong>
                                <small>{reason}</small>
                              </div>
                              <span className="priority-cost">
                                <Coins size={11} />
                                {byId[id].cost}
                              </span>
                              <span className="game-copy-count">
                                {context.copies[id] || 0}
                                <small>/{goal}</small>
                              </span>
                            </div>
                          ))}
                        </div>
                        {plan.search.length > 3 && (
                          <details className="game-opportunities">
                            <summary>
                              Outras {plan.search.length - 3} melhorias deste
                              nível
                            </summary>
                            <Faces
                              ids={plan.search.slice(3)}
                              context={context}
                              temporary={plan.team.temporary}
                              targets={
                                context.contested ? [] : plan.strategy.targets
                              }
                            />
                          </details>
                        )}
                        {!plan.search.length && (
                          <p>
                            As melhorias sugeridas já foram registradas. Confira
                            a equipe e prepare a próxima etapa.
                          </p>
                        )}
                      </section>
                      {!!plan.reserve.length && (
                        <section className="game-section">
                          <h3>Guarde para a transição</h3>
                          <p className="game-caption">
                            Compre se aparecer e houver espaço no banco. Não
                            desmonte sua equipe antes da troca.
                          </p>
                          <Faces
                            ids={plan.reserve}
                            context={context}
                            targets={plan.strategy.targets}
                          />
                        </section>
                      )}
                    </div>
                    <aside className="game-now-aside">
                      <div className="game-board-caption">
                        <strong>Seu tabuleiro no nível {context.level}</strong>
                        <span>
                          {plan.team.slots}/{plan.team.capacity} espaços{plan.team.capacity>context.level?` · +${plan.team.capacity-context.level} da característica`:''} · sugestão
                          do plano
                        </span>
                      </div>
                      {levelPreview && (
                        <BoardPanel comp={levelPreview} native />
                      )}
                      <section className="game-next">
                        <h3>
                          {next
                            ? `Ao chegar ao nível ${context.level + 1}`
                            : "Time completo"}
                        </h3>
                        <p>
                          {next
                            ? next.entering.length
                              ? `Entram: ${names(next.entering)}.`
                              : "Mantenha o núcleo e melhore as estrelas."
                            : "Ajuste o posicionamento conforme os adversários."}
                        </p>
                        {next && next.entering.length > 0 && (
                          <div className="game-next-faces">
                            {next.entering.map((id) => (
                              <span key={id}>
                                <img
                                  className={`cost-${byId[id].cost}`}
                                  src={portrait(id)}
                                  alt=""
                                />
                                <b>{byId[id].name}</b>
                              </span>
                            ))}
                          </div>
                        )}
                        {next && next.leaving.length > 0 && (
                          <p>
                            Saem: {names(next.leaving)}, depois de comprar os
                            substitutos.
                          </p>
                        )}
                        {next &&
                          plan.strategy.reroll &&
                          context.level === plan.strategy.targetLevel &&
                          plan.targets.length > 0 && (
                            <p className="game-caution">
                              Antes de subir, conclua o núcleo 3★ ou reavalie se
                              a vida/disputa pedir.
                            </p>
                          )}
                        <button
                          className="game-text-action"
                          onClick={() => send({ type: "tab", value: "team" })}
                        >
                          Ver equipe e transições <ArrowRight size={13} />
                        </button>
                      </section>
                    </aside>
                  </div>
                )}
                {tab === "team" && teamPlan && (
                  <div className="game-team-layout">
                    <div className="overlay-team-heading"><h2>Equipe</h2><select aria-label="Consultar equipe por nível" value={teamLevel===null?'now':teamLevel} onChange={event=>setTeamLevel(event.target.value==='now'?null:event.target.value==='final'?'final':Number(event.target.value))}><option value="now">Equipe agora</option>{[1,2,3,4,5,6,7,8,9,10].map(level=><option value={level} key={level}>Nível {level}</option>)}<option value="final">Equipe final</option></select></div>
                    <div className="game-team-board">
                      <div className="game-subtabs">
                        <button
                          aria-pressed={teamLevel === null}
                          onClick={() => setTeamLevel(null)}
                        >
                          Agora
                        </button>
                        <button aria-pressed={teamLevel===teamPlan.strategy.targetLevel} onClick={()=>setTeamLevel(teamPlan.strategy.targetLevel)}>Nv. {teamPlan.strategy.targetLevel}</button>
                        <button
                          aria-pressed={finalTeam}
                          onClick={() => setTeamLevel("final")}
                        >
                          Equipe final
                        </button>
                      </div>
                      <p className="game-caption">
                        {finalTeam
                          ? "Referência do plano completo; não é a equipe para comprar agora."
                          : `Nível ${viewedLevel} · ${teamPlan.team.slots}/${teamPlan.team.capacity} espaços${teamPlan.team.capacity>viewedLevel?` · +${teamPlan.team.capacity-viewedLevel} da característica`:''}. ${teamLevel === null ? "Equipe sugerida para agora." : "Consulta do plano; o nível no jogo continua automático."}`}
                      </p>
                      {preview && <BoardPanel comp={preview} native traitProgress />}
                    </div>
                    <div className="game-team-info">
                      <section className="game-section">
                        <h3>
                          {finalTeam
                            ? "Unidades do plano final"
                            : teamLevel === null ? "Quem joga agora" : `Equipe no nível ${viewedLevel}`}
                        </h3>
                        <Faces
                          ids={finalTeam ? comp.champions : teamPlan.team.ids}
                          context={context}
                          temporary={finalTeam ? [] : teamPlan.team.temporary}
                          targets={teamPlan.strategy.targets}
                        />
                      </section>
                      {!finalTeam && <section className="game-section game-transition">
                        <h3>
                          {viewedLevel <= 1
                            ? "Sua primeira equipe"
                            : `Transição do nível ${viewedLevel - 1} para o ${viewedLevel}`}
                        </h3>
                        <p className="game-caption">
                          Comparação entre equipes sugeridas, não leitura do seu
                          tabuleiro.
                        </p>
                        <p>
                          <b>Entram</b>{" "}
                          {names(teamPlan.entering) || "Mantenha as peças atuais."}
                        </p>
                        <p>
                          <b>Saem</b>{" "}
                          {names(teamPlan.leaving) || "Ninguém precisa sair."}
                        </p>
                        {teamPlan.leaving.length > 0 && (
                          <p className="game-caution">
                            Compre o substituto antes de vender. Uma peça 2★
                            pode segurar melhor que uma substituta 1★.
                          </p>
                        )}
                      </section>}
                      {!finalTeam && !!teamPlan.later.length && (
                        <section className="game-section">
                          <h3>Espere para procurar</h3>
                          <div className="game-later">
                            {teamPlan.later.map((id) => (
                              <div key={id}>
                                <img src={portrait(id)} alt="" />
                                <span>
                                  {byId[id].name}
                                  <small>
                                    Custo {byId[id].cost} ·{" "}
                                    {costOdds(viewedLevel, byId[id].cost)}%
                                    {` no nível ${viewedLevel}`}
                                  </small>
                                </span>
                                <b>Nv. {[0, 2, 3, 5, 8, 9][byId[id].cost]}</b>
                              </div>
                            ))}
                          </div>
                          <p className="game-caption">
                            Se aparecer antes, compre e guarde. Evite rolar só
                            para encontrar uma dessas peças.
                          </p>
                        </section>
                      )}
                    </div>
                  </div>
                )}
                {tab === "items" && (
                  <>
                    <header className="overlay-page-heading"><h2>Itens</h2><PerformanceSource comp={comp}/></header>
                    <CarryBuildStats comp={comp}/>
                    <ItemOrder comp={comp} />
                    <section className="game-section">
                      <h2>Equipe agora, transfira depois</h2>
                      <p>
                        Priorize o carry e a linha de frente. Os portadores
                        abaixo acompanham o seu nível.
                      </p>
                    </section>
                    {plan.transfers.map((t) => (
                      <section className="game-item-route" key={t.target}>
                        <div className="game-holder">
                          {t.holder ? (
                            <img src={portrait(t.holder)} alt="" />
                          ) : (
                            <Coins size={28} />
                          )}
                          <div>
                            <h3>
                              {t.holder
                                ? byId[t.holder].name
                                : "Reserve estes itens"}
                            </h3>
                            <p>
                              {t.holder === t.target
                                ? "Já é o portador final"
                                : `Depois: ${byId[t.target].name}`}
                            </p>
                          </div>
                          {t.holder !== t.target && (
                            <>
                              <ArrowRight size={15} />
                              <img
                                src={portrait(t.target)}
                                alt={byId[t.target].name}
                              />
                            </>
                          )}
                        </div>
                        <div className="game-recipes">
                          {t.items.map((id) => (
                            <ItemRecipe key={id} id={id} />
                          ))}
                        </div>
                        {t.temporary && t.holder && (
                          <p className="game-caption">
                            Só venda {byId[t.holder].name} para transferir
                            quando o substituto estiver pronto.
                          </p>
                        )}
                      </section>
                    ))}
                    {!plan.transfers.length && (
                      <p>
                        Este plano ainda não tem itens definidos. Adicione os
                        equipamentos no planejador do app.
                      </p>
                    )}
                  </>
                )}
                {tab === "match" && (
                  <>
                    <section className="game-section">
                      <h2>Sua partida</h2>
                      <p>
                        O ouro vem da tela do jogo. As compras confirmadas na
                        loja atualizam sua equipe automaticamente.
                      </p>
                      <div className="game-economy-readout">
                        <Coins size={20} />
                        <div>
                          <span>Ouro disponível</span>
                          <strong aria-label="Ouro lido">{goldValue}</strong>
                        </div>
                        <small>{goldStatus}</small>
                      </div>
                      {([["hp", "Vida", context.hp, 1, 200]] as const).map(
                        ([key, label, value, min, max]) => (
                          <div className="game-counter" key={key}>
                            <span>
                              {label}
                              <b aria-label={`${label} informado`}>{value}</b>
                            </span>
                            {[-10, -1, 1, 10].map((delta) => (
                              <button
                                key={delta}
                                aria-label={`${delta > 0 ? "Adicionar" : "Remover"} ${Math.abs(delta)} de ${label.toLowerCase()}`}
                                disabled={
                                  delta < 0 ? value <= min : value >= max
                                }
                                onClick={() => send({ type: key, delta })}
                              >
                                {delta > 0 ? "+" : ""}
                                {delta}
                              </button>
                            ))}
                          </div>
                        ),
                      )}
                      <div className="game-strength">
                        <span>Seu tabuleiro</span>
                        <button
                          aria-pressed={context.strength === "stable"}
                          onClick={() =>
                            send({ type: "strength", value: "stable" })
                          }
                        >
                          Estável
                        </button>
                        <button
                          aria-pressed={context.strength === "weak"}
                          onClick={() =>
                            send({ type: "strength", value: "weak" })
                          }
                        >
                          Perdendo forte
                        </button>
                      </div>
                      {plan.strategy.reroll && (
                        <button
                          role="checkbox"
                          className="game-contested"
                          aria-checked={context.contested}
                          onClick={() =>
                            send({
                              type: "contested",
                              value: !context.contested,
                            })
                          }
                        >
                          {context.contested ? "✓" : "□"} Outros jogadores
                          disputam meu núcleo 3★
                        </button>
                      )}
                    </section>
                    <section className="game-section">
                      <h3>Compras da partida</h3>
                      <p className="game-caption">
                        Compre normalmente na loja do jogo. Cada compra
                        confirmada soma uma cópia, sem clicar neste painel.
                      </p>
                      <details
                        className="game-copy-correction"
                        onToggle={(e) => setCorrectCopies(e.currentTarget.open)}
                      >
                        <summary>Corrigir uma contagem</summary>
                        <p className="game-caption">
                          Só para vendas, recompensas ou uma compra que escapou
                          da leitura. 2★ = 3 cópias; 3★ = 9.
                        </p>
                      </details>
                      <div
                        className="game-copies"
                        data-correcting={correctCopies}
                      >
                        {targetIds.map((id) => (
                          <div key={id}>
                            <img src={portrait(id)} alt="" />
                            <span>
                              {byId[id].name}
                              <small>
                                {plan.strategy.targets.includes(id)
                                  ? "Alvo de 3★"
                                  : plan.team.temporary.includes(id)
                                    ? "Temporário"
                                    : "Plano final"}
                              </small>
                            </span>
                            {correctCopies && (
                              <button
                                aria-label={`Remover cópia de ${byId[id].name}`}
                                disabled={!context.copies[id]}
                                onClick={() =>
                                  send({ type: "copies", id, delta: -1 })
                                }
                              >
                                <Minus size={13} />
                              </button>
                            )}
                            <b>{context.copies[id] || 0}</b>
                            {correctCopies && (
                              <button
                                aria-label={`Adicionar cópia de ${byId[id].name}`}
                                disabled={context.copies[id] >= 9}
                                onClick={() =>
                                  send({ type: "copies", id, delta: 1 })
                                }
                              >
                                <Plus size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="game-section">
                      <h3>Chances por custo no nível {context.level}</h3>
                      <div className="game-odds">
                        {plan.odds.map((odds, i) => (
                          <div key={i} className={`cost-${i + 1}`}>
                            <small>Custo {i + 1}</small>
                            <b>{odds}%</b>
                          </div>
                        ))}
                      </div>
                      <p className="game-caption">
                        Chance por espaço da loja, não de um campeão específico.
                      </p>
                    </section>
                    <section className="game-new-match">
                      <p className="game-caption">
                        Uma nova partida detectada zera ouro, nível e cópias.
                        Sair do jogo com Alt+Tab mantém os registros.
                      </p>
                      <button onClick={() => setConfirmReset(true)}>
                        <RotateCcw size={14} /> Nova partida
                      </button>
                      {confirmReset && (
                        <div>
                          <p>
                            Zerar nível, ouro, vida e cópias? A comp fixada
                            continua.
                          </p>
                          <button
                            onClick={() => {
                              send({ type: "reset" });
                              setConfirmReset(false);
                            }}
                          >
                            Recomeçar no nível 1
                          </button>
                          <button onClick={() => setConfirmReset(false)}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </div>
          </div>
          <footer className="game-footer">
            <button onClick={() => window.zyon?.setReader(!state.readerActive)}>
              {state.readerActive ? "Pausar OCR" : "Ler loja, nível e ouro"}
            </button>
            <span>Ctrl+Shift+O · ocultar</span>
            <p>
              {state.readerError ||
                (state.readerActive
                  ? "Compras acompanhadas. Vida e força do tabuleiro são informadas por você."
                  : "Leitura pausada. Ative para acompanhar ouro e compras.")}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}
