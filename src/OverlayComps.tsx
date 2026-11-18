import { TacticalOverview } from "./TacticalOverview";
import { TraitRail } from "./ZyonPieces";
import { UnitStrip } from "./TftPanels";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Search, ArrowRight, ArrowLeft, Layers3, ChevronDown } from "lucide-react";
import { BrandMark } from './Brand';
import { byId, portrait, splash, type Comp } from "./data";
import { CompTierBadge } from "./CompTier";
import {
  CompPerformance,
  CarryBuildStats,
  CompactAugments,
  PerformanceSource,
} from "./CompPerformance";
import { AugmentGuide } from "./PivotGuide";
import {BoardPanel} from './TftPanels';
import {effectiveComp} from './duo-plans.mjs';
const searchable = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function OverlayComps({ state }: { state: any }) {
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const previousInspect = useRef<string | null>(null);
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [inspect, setInspect] = useState<string | null>(null),
    [detailTab, setDetailTab] = useState<"overview" | "items" | "augments">("overview"),
    [scope,setScope]=useState<'all'|'top'|'personal'>('all'),
    [sort,setSort]=useState<'tier'|'average'|'games'>('tier'),
    [catalogOpen,setCatalogOpen]=useState(false);
  const comps: Comp[] = state.saved?.comps || [];
  const matches = useMemo(() => {
    const term = searchable(query.trim());
    const result=comps.filter(c=>scope==='all'||scope==='personal'&&c.style==='Personalizada'||scope==='top'&&c.style!=='Personalizada'&&['S','A'].includes(c.tier||'')).filter((c) =>
      searchable(
        `${c.name} ${c.style} ${c.champions.map((id) => byId[id]?.name || "").join(" ")}`,
      ).includes(term),
    );
    if(sort==='average')result.sort((a,b)=>(a.pivot?.statistics?.performance?.average??99)-(b.pivot?.statistics?.performance?.average??99));
    if(sort==='games')result.sort((a,b)=>(b.pivot?.statistics?.performance?.games??0)-(a.pivot?.statistics?.performance?.games??0));
    return result;
  }, [comps, query,scope,sort]);
  const referenceComp=comps.find((c) => c.id === inspect);
  const detail = effectiveComp(referenceComp,state.overlayPlans?.[inspect||''],byId) as Comp|undefined;
  useEffect(() => {
    if (inspect) detailHeading.current?.focus();
    else if (previousInspect.current)
      document
        .querySelector<HTMLButtonElement>(
          `[data-comp="${CSS.escape(previousInspect.current)}"] .overlay-comp-detail-open`,
        )
        ?.focus();
    previousInspect.current = inspect;
  }, [inspect]);
  async function choose(id: string) {
    setBusy(id);
    setError("");
    try {
      if (!(await window.zyon?.chooseComp(id)))
        setError("Não foi possível trocar a composição. Tente novamente.");
    } catch {
      setError("Não foi possível trocar a composição. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }
  if (detail)
    return (
      <section
        className="overlay-comp-detail"
        aria-label={`Detalhes de ${detail.name}`}
      >
        <div className="zy-overlay-inspector-toolbar"><button
          className="overlay-comp-detail-back"
          onClick={() => setInspect(null)}
        >
          <ArrowLeft size={14} />
          Todas as comps
        </button>
        <button className="zy-comp-disclosure overlay-comp-detail-close" aria-label={`Recolher ${detail.name}`} title="Fechar detalhes" onClick={()=>setInspect(null)}><BrandMark/></button></div>
        {detail.id === state.pinned ? <div className="zy-current-detail-source"><h2 ref={detailHeading} tabIndex={-1}>Plano escolhido</h2><PerformanceSource comp={detail}/></div> : <header className="overlay-comp-detail-top">
          <img src={portrait(detail.carry)} alt="" />
          <div>
            <h2 ref={detailHeading} tabIndex={-1}>
              Consultando {detail.name}
            </h2>
            <p>
              {detail.style} · {detail.champions.length} campeões
            </p>
          </div>
          <CompTierBadge comp={detail} />
          <button
            disabled={detail.id === state.pinned || busy !== null}
            onClick={() => choose(detail.id)}
          >
            {detail.id === state.pinned ? "Comp escolhida" : "Escolher comp"}
          </button>
        </header>}
        {detail.id !== state.pinned && <CompPerformance comp={detail} />}
        {error && <p role="alert">{error}</p>}
        <div
          className="overlay-comp-detail-tabs"
          role="tablist"
          aria-label="Detalhes da comp no overlay"
        >
          <button role="tab" aria-selected={detailTab==='overview'} onClick={()=>setDetailTab('overview')}>Visão geral</button>
          <button
            role="tab"
            aria-selected={detailTab === "items"}
            onClick={() => setDetailTab("items")}
          >
            Itens dos carries
          </button>
          <button
            role="tab"
            aria-selected={detailTab === "augments"}
            onClick={() => setDetailTab("augments")}
          >
            Aprimoramentos
          </button>
        </div>
        {detailTab==='overview'?<div className="overlay-comp-overview"><TacticalOverview comp={detail} referenceComp={referenceComp} onRestore={detail.id===state.pinned?()=>{void window.zyon?.editPlan({type:'restore',compId:detail.id});}:undefined} native context={detail.id===state.pinned?state.gameSession?.context:undefined}/><section className="overview-augment-callout"><div><h3>Aprimoramentos desta comp</h3><p>Confira as escolhas do guia antes de definir seu plano.</p></div><CompactAugments comp={detail} onOpen={()=>setDetailTab('augments')}/><button onClick={()=>setDetailTab('augments')}>Ver recomendações<ArrowRight size={14}/></button></section></div>:detailTab === "items" ? (
          <>
            <CarryBuildStats comp={detail} />
            {!detail.pivot?.statistics?.itemBuilds.length && (
              <p className="game-caption">
                Sem amostra de conjuntos publicada para este plano. Os itens
                definidos continuam disponíveis na aba Itens da comp escolhida.
              </p>
            )}
          </>
        ) : (
          <AugmentGuide comp={detail} />
        )}
      </section>
    );
  return (
    <section
      className="overlay-comp-library"
      aria-label="Composições no overlay"
    >
      <header>
        <div>
          <h2>Composições</h2>
        </div>
        <button className="overlay-catalog-toggle" aria-expanded={catalogOpen} aria-controls="overlay-catalog-tools" onClick={()=>setCatalogOpen(value=>!value)}>{catalogOpen?'Fechar busca':'Buscar e ordenar'}<Search size={18}/></button>
      </header>
      <div className="overlay-library-tools" id="overlay-catalog-tools" hidden={!catalogOpen}><label className="overlay-comp-search">
        <Search size={16} />
        <input
          aria-label="Buscar composição no overlay"
          placeholder="Buscar comp ou campeão"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label><select aria-label="Ordenar comps no overlay" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="tier">Por tier</option><option value="average">Melhor média</option><option value="games">Mais jogadas</option></select></div>
      <nav className="overlay-library-scopes" aria-label="Filtrar comps no overlay">{([['all','Todas'],['top','S e A'],['personal','Minhas comps']] as const).map(([id,label])=><button key={id} aria-pressed={scope===id} onClick={()=>setScope(id)}>{label}</button>)}</nav>
      {error && (
        <p className="duo-error" role="alert">
          {error}
        </p>
      )}
      <div className="overlay-comp-results" aria-live="polite">
        {matches.length} {matches.length === 1 ? "composição" : "composições"}
      </div>
      <div className="overlay-comp-grid">
        {matches.map((c) => {
          const selected = c.id === state.pinned;
          return (
            <article
              key={c.id}
              className="overlay-comp-option"
              aria-label={`Composição ${c.name}`}
              data-comp={c.id}
              data-current={selected || undefined}
            >
              <div className="overlay-selected-card">
                <div className="overlay-card-art" data-carry={c.carry}><img src={portrait(c.carry)} alt="" loading="lazy" draggable={false}/></div>
                <div className="overlay-card-heading"><h3 title={c.name}>{c.name}</h3><span className="zy-style-tag" title={c.style}>{c.style.replace(/\s*·\s*nível\s*/iu,' ')}</span></div>
                <div className="overlay-card-traits"><TraitRail comp={c}/><CompactAugments comp={c} onOpen={()=>{setInspect(c.id);setDetailTab('augments');}}/></div>
                <div className="overlay-card-roster" style={{'--roster-count':c.champions.length} as CSSProperties}><UnitStrip comp={c} showStars/></div>
                <button className="zy-comp-disclosure overlay-comp-detail-open" aria-expanded={false} aria-label={`Expandir ${c.name}`} title="Ver detalhes da composição" onClick={()=>{setInspect(c.id);setDetailTab('overview');}}><BrandMark/></button>
                <CompPerformance comp={c}/>
              </div>
            </article>
          );
        })}
      </div>
      {!matches.length && (
        <p className="overlay-comp-empty">
          Nenhuma comp encontrada. Busque pelo nome de outro campeão ou
          composição.
        </p>
      )}
    </section>
  );
}
