import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  Activity,
  GripVertical,
  Layers3,
  Pin,
  PinOff,
  Search,
  Users,
  X,
  Eye,
  ChevronUp,
  ChevronDown,
  Star,
  PanelTop,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { BrandMark } from "./Brand";
import { OverlayChampions } from "./OverlayChampions";
import { SocialPanel } from "./SocialPanel";
import { CompTierBadge } from "./CompTier";
import { byId, portrait } from "./data";
import { Items, equipmentFor } from "./TftPanels";
import { OverlayCompDetails } from "./OverlayCompDetails";

const destinations = [
  { id: "comp", label: "Comp", Icon: Layers3 },
  { id: "champions", label: "Campeões", Icon: Search },
  { id: "duo", label: "Dupla", Icon: Users },
  { id: "status", label: "Leitura e partida", Icon: Activity },
] as const;
function action(type: string, panel?: string) {
  return window.zyon?.overlayAction({ type, panel } as any);
}
function useOverlayState(enabled = true) {
  const [state, setState] = useState<any>(null);
  useEffect(() => {
    if(!enabled)return;
    document.body.classList.add("overlay-body");
    document.documentElement.classList.add("overlay-root");
    void window.zyon?.getState().then(setState);
    return window.zyon?.onState(setState);
  }, [enabled]);
  return state;
}

export function OverlayLauncher({state:providedState,renderGuide}:{state?:any;renderGuide?:(state:any)=>ReactNode} = {}) {
  const subscribedState = useOverlayState(!providedState);
  const state = providedState || subscribedState;
  const comp = state?.guideComp;
  const collapsed = state?.overlayLayout?.summaryCollapsed;
  const integrated = state?.overlayLayout?.presentation === 'integrated';
  const activePanel = integrated ? state?.overlayLayout?.activePanel : null;
  const [retainedPanel,setRetainedPanel] = useState<string|null>(null);
  const [retainedSummary,setRetainedSummary] = useState(false);
  useEffect(()=>{
    if(!collapsed)setRetainedSummary(true);
    const resize=()=>{if(collapsed&&innerHeight<=43)setRetainedSummary(false);};
    resize();
    window.addEventListener('resize',resize);
    return()=>window.removeEventListener('resize',resize);
  },[collapsed]);
  useEffect(()=>{
    if(activePanel)setRetainedPanel(activePanel);
    const resize=()=>{if(!activePanel&&innerHeight<=(comp&&!collapsed?196:42)+1)setRetainedPanel(null);};
    resize();
    window.addEventListener('resize',resize);
    return()=>window.removeEventListener('resize',resize);
  },[activePanel,comp,integrated,collapsed]);
  useLayoutEffect(()=>{
    if(integrated)void window.zyon?.overlayAction({type:'layoutReady',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  },[integrated,activePanel,comp?.champions?.length,collapsed]);
  const shownPanel=activePanel||retainedPanel;
  return (
    <section className={`zy-companion ${integrated?'zy-integrated':''}`} data-expanded={!!comp && !collapsed} data-open={!!shownPanel} data-has-comp={!!comp}>
    <nav className="zy-launcher" aria-label="Ferramentas Zyon TFT">
      <span className="zy-launcher-grip" title="Arraste para mover">
        <GripVertical size={12} />
      </span>
      {destinations.map(({ id, label, Icon }) => (
        <button
          key={id}
          title={label}
          aria-label={`Abrir ${label}`}
          aria-pressed={
            state?.overlayLayout?.activePanel === id ||
            state?.overlayLayout?.pinnedPanel === id
          }
          onClick={() => void action("toggle", id)}
        >
          <Icon size={21} />
        </button>
      ))}
      {integrated ? <button className="zy-summary-toggle" aria-label={collapsed?'Expandir overlay':'Minimizar overlay'} title={collapsed?'Expandir overlay':'Minimizar overlay'} aria-expanded={!collapsed} onClick={()=>void action('summaryToggle')}>{collapsed?<Maximize2 size={17}/>:<Minimize2 size={17}/>}</button> : comp&&!collapsed&&<button className="zy-presentation-control" aria-label="Testar painel integrado" title="Testar conteúdo e resumo na mesma janela" onClick={()=>void window.zyon?.overlayAction({type:'setPresentation',value:'integrated'})}><PanelTop size={16}/><span>Testar painel integrado</span></button>}
      {comp && !integrated && <button className="zy-summary-toggle" aria-label={collapsed ? "Mostrar resumo da comp" : "Recolher resumo da comp"} aria-expanded={!collapsed} onClick={() => void action("summaryToggle")}>
        {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
      </button>}
    </nav>
    {integrated&&<div className="zy-integrated-content" data-open={!!shownPanel} inert={!activePanel}>
      {shownPanel&&renderGuide&&<ModularPanel state={{...state,overlayLayout:{...state.overlayLayout,activePanel:shownPanel}}} renderGuide={renderGuide} embedded/>}
    </div>}
    {comp && (!collapsed || (integrated&&retainedSummary)) && <section className="zy-companion-summary" aria-label="Resumo da composição">
      <header className="zy-summary-identity"><CompTierBadge comp={comp} /><strong title={comp.name}>{comp.name}</strong><span>{comp.style}</span></header>
      <div className="zy-summary-roster" style={{gridTemplateColumns:`repeat(${comp.champions.length}, minmax(0, 1fr))`}} aria-label="Equipe completa">
        {comp.champions.map((id:string) => <div className="zy-summary-unit" key={id} title={byId[id]?.name || id}>
          {comp.stars?.[id] === 3 && <span className="zy-summary-stars" aria-label="Meta de três estrelas">{[0,1,2].map(index => <Star key={index} size={9} fill="currentColor"/>)}</span>}
          <img className={`zy-summary-portrait cost-${byId[id]?.cost || 1}`} src={portrait(id)} alt={byId[id]?.name || id} draggable={false}/>
          <Items ids={equipmentFor(comp,id)} className="zy-summary-items" compact/>
          <span>{byId[id]?.name || id}</span>
        </div>)}
      </div>
      <footer className="zy-summary-actions">
        <button onClick={() => void action("details")}><Eye size={15}/>Ver detalhes</button>
        <button onClick={() => void action("library")}><Layers3 size={15}/>Ver comps</button>
        <span className="zy-summary-reading" data-active={!!state.readerActive}>{state.readerActive ? "OCR ativo" : "OCR pausado"}</span>
      </footer>
    </section>}
    </section>
  );
}


export function ModularPanel({
  state,
  renderGuide,
  embedded = false,
}: {
  state: any;
  renderGuide: (state: any) => ReactNode;
  embedded?: boolean;
}) {
  const pinned = new URLSearchParams(location.search).get("view") === "panel";
  const panel = pinned
    ? state.overlayLayout?.pinnedPanel
    : state.overlayLayout?.activePanel;
  const destination = destinations.find((item) => item.id === panel);
  const [error, setError] = useState("");
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented)
        void action("close", panel);
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [panel]);
  if (!destination || (!embedded&&state.overlayLayout?.presentation==='integrated')) return null;
  const guideState = {
    ...state,
    gameSession: {
      ...state.gameSession,
      collapsed: false,
      shopOnly: false,
      tab: panel === "status" ? "match" : "team",
    },
  };
  return (
    <section
      className="zy-task-panel"
      data-panel={panel}
      aria-label={destination.label}
    >
      <header className="zy-task-heading">
        <span className="zy-task-drag">
          <GripVertical size={13} />
          <BrandMark />
          <strong>{destination.label}</strong>
        </span>
        <div>
          {!embedded&&<button
            aria-label={pinned ? "Desafixar painel" : "Fixar painel ao lado"}
            title={pinned ? "Desafixar painel" : "Fixar um segundo painel"}
            onClick={() => void action(pinned ? "unpin" : "pin", panel)}
          >
            {pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>}
          <button
            aria-label="Fechar painel"
            title="Fechar · Esc"
            onClick={() => void action("close", panel)}
          >
            <X size={18} />
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="zy-task-error">
          {error}
        </p>
      )}
      <div className="zy-task-body">
        {panel === "comp" ? <OverlayCompDetails state={state} renderGuide={renderGuide}/> : panel === "champions" ? (
          <OverlayChampions state={state} />
        ) : panel === "duo" ? (
          <div className="zy-duo-surface"><SocialPanel native gameState={state} /></div>
        ) : (
          <>
            {panel === "status" && (
              <div className="zy-reader-task">
                <h2>
                  {state.readerError
                    ? "Leitura interrompida"
                    : state.readerActive
                      ? "Leitura em andamento"
                      : "OCR pausado"}
                </h2>
                <p>
                  {state.readerError ||
                    "Nível, ouro e compras vêm da leitura do jogo. Abrir um painel não muda suas cópias."}
                </p>
                <p className="zy-shop-legend" aria-label="Legenda das bandeirinhas da loja">
                  <span><i data-kind="buy" />Para você</span>
                  <span><i data-kind="send" />Para a dupla</span>
                  <span><i data-kind="shared" />Para ambos</span>
                </p>
                <button
                  className="zy-task-button"
                  onClick={async () => {
                    try {
                      await window.zyon?.setReader(!state.readerActive);
                      setError("");
                    } catch {
                      setError(
                        "Não foi possível alterar a leitura. Tente novamente.",
                      );
                    }
                  }}
                >
                  {state.readerActive ? "Pausar leitura" : "Iniciar leitura"}
                </button>
              </div>
            )}
            {(panel !== "status" || state.guideComp) && (
              <div className="zy-embedded-guide">{renderGuide(guideState)}</div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
