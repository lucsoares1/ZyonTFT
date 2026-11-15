import { useEffect, useMemo, useRef, useState } from "react";
import { version as appVersion } from "../package.json";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  ExternalLink,
  Grip,
  Layers3,
  LayoutGrid,
  Minus,
  Monitor,
  Plus,
  RotateCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Users,
  Trash2,
  X,
} from "lucide-react";
import {
  byId,
  champions,
  initialComps,
  portrait,
  splash,
  type Comp,
  dataset,
} from "./data";
import { migrateSaved } from "./preferences.mjs";
import { mergePivot } from "./pivot-catalog.mjs";
import { pivotSnapshot } from "./data";
import { PivotTiersContext } from "./PivotGuide";
import { TierBadge, CompTierBadge } from "./CompTier";
import { buildCompSections, tierSections, compTier } from "./comp-tiers.mjs";
import { matchShop, recognizeNames, mergeOverlaySnapshot, mergeShopUpdate } from "./shop.mjs";
import ScreenshotProof from "./ScreenshotProof";
import { Planner, Database, PlanAside, TraitStrip } from "./Workspace";
import { moveUnit, boardPositions, personalizePlan } from "./planning.mjs";
import { BoardPanel, UnitStrip, Items, equipmentFor } from "./TftPanels";
import { CompGuide, guideTabs, type GuideTab } from "./CompGuide";

import {
  DEFAULT_LEVEL_CONTEXT,
  planForLevel,
  type LevelContext,
} from "./level-planner.mjs";
import GameGuide from "./GameGuide";
import { ShopMedal, ShopFrostFrame } from "./ShopMedal";
import { BrandMark } from "./Brand";
import { CompSpotlight } from "./CompSpotlight";
import {SidebarComp} from "./SidebarComp";
import {SocialPanel,useSocial} from './SocialPanel';
import {AccountGate,AccountProfile} from './AccountGate';
import {effectiveComp,partnerNeeds} from './duo-plans.mjs';
import {UpdateProvider,UpdatesSettings,UpdateIndicator} from './Updates';

type Slot = string | null | { id: string | null; confidence: number };
type Rect = { x: number; y: number; width: number; height: number };
type Saved = {
  version: 2;
  dataRevision: string;
  comps: Comp[];
  active: string;
  pinned: string | null;
  selected: string[];
  opacity: number;
  rect: Rect;
  displayId: number | null;
  source: "demo" | "ocr";
  compact: boolean;
  checklists: Record<string, string[]>;
  levelContexts: Record<string, LevelContext>;
  levelRect?: Rect | null;
  overlayPlans: Record<string,any>;
};
const defaults: Saved = {
  version: 2,
  dataRevision: dataset.revision,
  comps: initialComps,
  active: initialComps[0].id,
  pinned: initialComps[0].id,
  selected: initialComps[0].champions,
  opacity: 92,
  rect: { x: 0.2295, y: 0.858, width: 0.53, height: 0.139 },
  displayId: null,
  source: "demo",
  compact: false,
  checklists: {},
  levelContexts: {},
  overlayPlans: {},
};
function loadSaved(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem("zyon:v1") || "null");
    return migrateSaved(value, defaults, champions, dataset.revision) as Saved;
  } catch {
    /* Start with defaults when local data is invalid. */
  }
  return defaults;
}
function Unit({
  id,
  small = false,
  selected = false,
  onClick,
}: {
  id: string;
  small?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const c = byId[id];
  return (
    <button
      type="button"
      className={`unit ${small ? "unit-small" : ""} ${selected ? "unit-selected" : ""}`}
      onClick={onClick}
      title={`${c.name} · ${c.role}`}
      aria-label={c.name}
      aria-pressed={onClick ? selected : undefined}
      style={{ "--unit-color": costColor(c.cost) } as React.CSSProperties}
    >
      <img src={portrait(id)} alt="" />
      <span className="unit-name">{c.name}</span>
      <span className="unit-cost">{c.cost}</span>
      {selected && (
        <span className="unit-tick">
          <Check size={10} />
        </span>
      )}
    </button>
  );
}
function costColor(cost: number) {
  return (
    ["", "#989f99", "#7cab8c", "#79a8c5", "#b69bc7", "#d4b66d"][cost] ||
    "#9fa9a3"
  );
}
function Badge({
  matched,
  preview = false,
  label = "Na sua comp",
  kind = "core",
}: {
  matched: boolean;
  preview?: boolean;
  label?: string;
  kind?: "buy" | "reserve" | "core" | "send" | "shared";
}) {
  return matched ? (
    <ShopMedal label={label} kind={kind} preview={preview} />
  ) : null;
}

function Overlay() {
  const [state, setState] = useState<any>(null);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(() => {
    document.body.classList.add("overlay-body");
    document.documentElement.classList.add("overlay-root");
    const accept=(next:any)=>setState((previous:any)=>mergeOverlaySnapshot(previous,next));
    window.zyon?.getState().then(accept);
    const offState=window.zyon?.onState(accept);
    const offShop=window.zyon?.onShop(next=>setState((previous:any)=>mergeShopUpdate(previous,next)));
    return ()=>{offState?.();offShop?.();};
  }, []);
  const livePlan = useMemo(()=>
    state?.guideComp && state?.pinned
      ? planForLevel(state.guideComp, byId, state.gameSession?.context)
      : null,[state?.guideComp,state?.pinned,state?.gameSession?.context]);
  if (!state) return null;
  const priority = livePlan?.search || [];
  const reserve = livePlan?.reserve || [];
  const send=partnerNeeds(state.social,state.gameSession,clock).map((w:any)=>w.id);
  const own=state.pinned?[...new Set([...state.selected,...priority,...reserve])]:[];
  const matches = matchShop(
    state.slots || [],
    [...new Set([...own,...send])],
  );
  const rect = state.shopRect || state.rect;
  return (
    <div className="native-overlay" style={{ opacity: state.opacity / 100 }}>
      {matches.map((slot: any) => {
        const card=state.shopCards?.[slot.index] || {x:rect.x+rect.width*slot.index/5+rect.width/5*.025,y:rect.y,width:rect.width/5*.94,height:rect.height};
        return (
        <div
          className="native-slot"
          key={slot.index}
          data-highlighted={slot.highlighted || undefined}
          data-kind={send.includes(slot.id)?own.includes(slot.id)?'shared':'send':priority.includes(slot.id)?'buy':reserve.includes(slot.id)?'reserve':'core'}
          style={{
            left: `${card.x * 100}%`,
            top: `${card.y * 100}%`,
            width: `${card.width * 100}%`,
            height: `${card.height * 100}%`,
            '--medal-size': `clamp(16px, ${card.width * 100 * .14}vw, 34px)`,
            '--medal-font': `clamp(7px, ${card.width * 100 * .045}vw, 10px)`,
          } as React.CSSProperties}
        >
          {slot.highlighted && state.shopCards?.[slot.index] && <ShopFrostFrame index={slot.index} jewel={(byId[slot.id]?.cost || 0) > 1} />}
          <Badge
            matched={slot.highlighted}
            kind={send.includes(slot.id)?own.includes(slot.id)?'shared':'send':priority.includes(slot.id) ? "buy" : reserve.includes(slot.id) ? "reserve" : "core"}
            label={
              send.includes(slot.id)?`${own.includes(slot.id)?'Você e sua dupla querem':'Enviar para'} ${state.social?.partner?.display_name||'sua dupla'}`:priority.includes(slot.id)
                ? "Comprar agora"
                : reserve.includes(slot.id)
                  ? "Guardar p/ transição"
                  : "Na sua comp"
            }
          />
        </div>
      );})}
    </div>
  );
}

export default function App() {
  if (new URLSearchParams(location.search).get("view") === "screenshot")
    return <ScreenshotProof />;
  if (new URLSearchParams(location.search).get("view") === "overlay")
    return <Overlay />;
  if (new URLSearchParams(location.search).get("view") === "guide")
    return <GameGuide />;
  return <UpdateProvider><AccountGate><Workbench /></AccountGate></UpdateProvider>;
}
function Workbench() {
  const social=useSocial();
  const [saved, setSaved] = useState<Saved>(loadSaved);
  const [tab, setTab] = useState("comps");
  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState("Todas");
  const [tierFilter, setTierFilter] = useState("Todas");
  const [libraryScope, setLibraryScope] = useState("all");
  const [plannerFocus, setPlannerFocus] = useState<string>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [overlay, setOverlay] = useState(false);
  const [reader, setReader] = useState(false);
  const [status, setStatus] = useState("Aguardando leitura");
  const [toast, setToast] = useState("");
  const [editor, setEditor] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideTab>("overview");
  const [expanded, setExpanded] = useState(false);
  const followBuild = useRef(false);
  useEffect(() => {
    if (!followBuild.current || !expanded) return;
    const row = document.querySelector(".row-expanded");
    if (row) {
      row.scrollIntoView({ block: "start", behavior: "auto" });
      followBuild.current = false;
    }
  }, [saved.active, expanded, tierFilter, query, libraryScope, guideTab]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [hydrated, setHydrated] = useState(!window.zyon);
  const [catalogStatus, setCatalogStatus] = useState<any>({
    snapshot: pivotSnapshot,
    error: null,
  });
  const [catalogBusy, setCatalogBusy] = useState(false);
  function applyCatalog(result: any) {
    if (!result?.snapshot) return;
    setCatalogStatus(result);
    setSaved((prev) => {
      const comps = mergePivot(prev.comps, result.snapshot.comps) as Comp[];
      const pinned = comps.find((c) => c.id === prev.pinned);
      return {
        ...prev,
        comps,
        selected: pinned?.pivot ? pinned.champions : prev.selected,
      };
    });
  }
  async function refreshCatalog(force = false) {
    if (!window.zyon) return;
    setCatalogBusy(true);
    try {
      applyCatalog(await window.zyon.refreshCatalog(force));
    } catch {
      setCatalogStatus((prev: any) => ({
        ...prev,
        error:
          "Não foi possível atualizar. O catálogo salvo continua disponível.",
      }));
    } finally {
      setCatalogBusy(false);
    }
  }
  useEffect(() => {
    if (!hydrated || !window.zyon) return;
    window.zyon.getCatalog().then((result) => {
      applyCatalog(result);
      return refreshCatalog();
    });
  }, [hydrated]);
  useEffect(
    () =>
      window.zyon?.onBuild((id) => {
        followBuild.current = true;
        setLibraryScope("all");
        setTierFilter("Todas");
        setQuery("");
        setStyleFilter("Todas");
        setExpanded(true);
        setSaved((prev) => {
          const build = prev.comps.find((c) => c.id === id && c.pivot);
          if (!build) return prev;
          return { ...prev, pinned: id, active: id, selected: build.champions };
        });
      }),
    [],
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeBase =
    saved.comps.find((c) => c.id === saved.active) || saved.comps[0];
  const pinnedBase = saved.comps.find((c) => c.id === saved.pinned);
  const active=effectiveComp(activeBase,saved.overlayPlans?.[activeBase.id],byId) as Comp;
  const pinned=effectiveComp(pinnedBase,pinnedBase?saved.overlayPlans?.[pinnedBase.id]:null,byId) as Comp|undefined;
  const selected =
    active.id === saved.pinned ? saved.selected : active.champions;
  const matches = matchShop(
    slots,
    saved.pinned ? saved.selected : [],
  );
  const hits = matches.filter((s: any) => s.highlighted).length;
  const update = (value: Partial<Saved>) =>
    setSaved((prev) => ({ ...prev, ...value }));
  useEffect(()=>window.zyon?.onPlan(({compId,edit})=>setSaved(prev=>{
    const overlayPlans={...prev.overlayPlans};if(edit)overlayPlans[compId]=edit;else delete overlayPlans[compId];
    return {...prev,overlayPlans,selected:prev.pinned===compId?(edit?.champions||prev.comps.find(c=>c.id===compId)?.champions||[]):prev.selected};
  })),[]);
  useEffect(()=>window.zyon?.onSocialOpen(()=>setTab('duo')),[]);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }
  useEffect(() => {
    if (!window.zyon) return;
    window.zyon.getState().then((data) => {
      if (data?.saved)
        setSaved({
          ...migrateSaved(data.saved, defaults, champions, dataset.revision),
          source: data.readerActive ? "ocr" : "demo",
        });
      setOverlay(Boolean(data?.overlayArmed ?? data?.overlayVisible));
      setReader(Boolean(data?.readerActive));
      setHydrated(true);
    });
    window.zyon.displays().then(setMonitors);
    return window.zyon.onOverlay(setOverlay);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem("zyon:v1", JSON.stringify(saved));
    } catch {
      notify("Não foi possível salvar as preferências neste navegador.");
    }
    window.zyon?.publish({
      saved,
      slots,
      selected: saved.selected,
      pinned: saved.pinned,
      compName: pinned?.name || "",
      comp: pinned ? { ...pinned, champions: saved.selected } : null,
      guideComp: pinned || null,
      baseGuideComp: pinnedBase || null,
      catalogTiers: catalogStatus.snapshot.tiers,
      opacity: saved.opacity,
      rect: saved.rect,
      levelRect: saved.levelRect,
      displayId: saved.displayId,
      source: saved.source,
      compact: saved.compact,
    });
  }, [saved, hydrated, catalogStatus]);
  useEffect(
    () =>
      window.zyon?.onDetection((data) => {
        if(data.matchEnded){
          setSlots([]);
          setStatus("Partida encerrada · aguardando a próxima partida");
          return;
        }
        if (data.error) {
          setStatus(data.error);
          setSlots([]);
          setReader(false);
          setSaved((prev) => ({ ...prev, source: "demo" }));
          return;
        }
        const recognized = recognizeNames(data.slots || [], champions);
        setSlots(recognized);
        setStatus(
          data.idle
            ? "Aguardando TFT em primeiro plano"
            : `${recognized.filter((s: any) => s.id).length}/5 reconhecidos · ${new Date().toLocaleTimeString("pt-BR")}`,
        );
      }),
    [],
  );
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  async function toggleOverlay() {
    if (!window.zyon) {
      notify("Abra o aplicativo desktop para exibir o overlay sobre o jogo.");
      return;
    }
    const enabled = await window.zyon.setOverlay(!overlay);
    setOverlay(enabled);
    if (enabled)
      notify(
        "Overlay pronto. Aparece no jogo após ler o ouro; Alt+Tab o esconde.",
      );
  }
  useEffect(
    () =>
      window.zyon?.onReader((enabled) => {
        setReader(enabled);
        setSaved((prev) => ({ ...prev, source: enabled ? "ocr" : "demo" }));
        setSlots([]);
        setStatus(enabled ? "Iniciando OCR local…" : "Leitura pausada");
      }),
    [],
  );
  async function toggleReader() {
    if (!window.zyon) {
      notify("A leitura local está disponível no aplicativo Windows.");
      return;
    }
    const enabled = await window.zyon.setReader(!reader);
    setReader(enabled);
    if (enabled) {
      update({ source: "ocr" });
      setSlots([]);
      setStatus("Iniciando OCR local…");
    } else {
      update({ source: "demo" });
      setSlots([]);
      setStatus("Leitura pausada");
    }
  }
  function pin() {
    if (saved.pinned === active.id) {
      update({ pinned: null });
      notify("Comp desafixada. Os destaques da loja foram limpos.");
    } else {
      update({ pinned: active.id, selected: active.champions });
      notify(`${active.name} fixada no overlay.`);
    }
  }
  function toggleChampion(id: string) {
    const current = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSaved((prev) => ({
      ...prev,
      comps: prev.comps.map((c) =>
        c.id === active.id
          ? {
              ...c,
              champions: current,
              carry: current.includes(c.carry)
                ? c.carry
                : current[0] || initialComps[0].carry,
              source: undefined,
              style: "Personalizada",
            }
          : c,
      ),
      selected: prev.pinned === active.id ? current : prev.selected,
    }));
  }
  function createComp() {
    const id = `comp-${Date.now()}`;
    setSaved((prev) => ({
      ...prev,
      active: id,
      comps: [
        {
          id,
          name: "Minha composição",
          subtitle: "Seu próximo plano começa aqui.",
          style: "Personalizada",
          champions: [],
          carry: initialComps[0].carry,
          color: "#bca778",
          description:
            "Selecione os campeões que você quer encontrar na loja. Depois, fixe a comp para ativar os destaques.",
        },
        ...prev.comps,
      ],
    }));
    setEditor(true);
    setExpanded(true);
    setLibraryScope("all");
    setTierFilter("Todas");
    setStyleFilter("Todas");
    setQuery("");
    setTab("comps");
  }
  function editPlan(next: Comp) {
    if(saved.overlayPlans?.[next.id])void window.zyon?.editPlan({type:'restore',compId:next.id});
    next = personalizePlan(next) as Comp;
    setSaved((prev) => ({
      ...prev,
      comps: prev.comps.map((c) => (c.id === next.id ? next : c)),
      selected: prev.pinned === next.id ? next.champions : prev.selected,
    }));
  }
  function openPlanner(id?: string) {
    if (id && !active.champions.includes(id)) {
      const positions = boardPositions(active, byId) as Record<string, number>;
      const next = moveUnit(
        active,
        id,
        positions[id] ??
          Array.from({ length: 28 }, (_, i) => i).find(
            (p) => !Object.values(positions).includes(p),
          ) ??
          21,
        byId,
      );
      editPlan(next as Comp);
    }
    setPlannerFocus(id);
    setTab("planner");
  }
  const pageTitle: Record<string, string> = {
    comps: "Composições",
    planner: "Planejador de equipe",
    champions: "Banco de dados",
    overlay: "Preferências",
    duo: "Duplas Dinâmicas",
    account: "Minha conta",
    help: "Como funciona",
  };
  const matching = saved.comps.filter(
    (c) =>
      `${c.name} ${c.champions.map((id) => byId[id]?.name).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (styleFilter === "Todas" || c.style === styleFilter) &&
      (libraryScope === "all" ||
        (libraryScope === "personal" ? !c.source : c.id === saved.pinned)),
  );
  const sections = buildCompSections(matching, {
    activeId: saved.active,
    filter: tierFilter,
    set: dataset.set,
    patch: dataset.patch,
  });
  const visible: Comp[] = sections.flatMap((s) => s.comps);
  function exploreComp(comp: Comp, section: GuideTab = "overview") {
    followBuild.current=true;
    update({active:comp.id});setTab("comps");setLibraryScope("all");
    setQuery("");setStyleFilter("Todas");setTierFilter("Todas");
    setGuideTab(section);setEditor(false);setExpanded(true);
    requestAnimationFrame(()=>document.querySelector(`.comp-row[data-comp-id="${comp.id}"]`)?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  }
  return (
    <PivotTiersContext.Provider value={catalogStatus.snapshot.tiers}>
      <div className="app-shell workspace-v4 zyon-reimagined">
        <aside className="sidebar" aria-label="Menu lateral">
          <div className="brand" title="Zyon TFT">
            <BrandMark />
            <div>
              zyon<span>Seu próximo tabuleiro.</span>
            </div>
          </div>
          <div className="sidebar-set">
            <img src={portrait("DA_Lux18_Base")} alt="" />
            <div>
              <strong>Enchanted Wilds</strong>
              <span>
                Set 18 <i /> Patch 18.6
              </span>
            </div>
          </div>
          <nav aria-label="Navegação principal">
            <span className="nav-group-label">Jogar TFT</span>
            {[
              ["comps", "Composições", Layers3],
              ["planner", "Planejador", LayoutGrid],
              ["champions", "Banco de dados", Swords],
              ["duo", "Duplas Dinâmicas", Users],
            ].map(([id, name, Icon]) => {
              const NavIcon = Icon as typeof Layers3;
              return (
                <button
                  key={id as string}
                  className={tab === id ? "nav-active" : ""}
                  onClick={() => setTab(id as string)}
                  title={name as string}
                >
                  <NavIcon size={19} />
                  <span>{name as string}</span>
                  {tab === id && (
                    <ChevronDown className="nav-current" size={12} />
                  )}
                </button>
              );
            })}
          </nav>
          <SidebarComp comp={pinned} onTeam={()=>{if(pinned)exploreComp(pinned,"units");}}
            onRoute={()=>{if(pinned)exploreComp(pinned,"progression");}} onOverlay={()=>setTab("overlay")}/>
          <div className="sidebar-bottom">
            <button onClick={() => setTab("help")} title="Como funciona">
              <CircleHelp size={18} />
              <span>Como funciona</span>
            </button>
            <button aria-label="Preferências" className={tab === "overlay" ? "nav-active" : ""} aria-current={tab === "overlay" ? "page" : undefined} onClick={() => setTab("overlay")} title="Preferências">
              <Settings2 size={18} />
              <span>Preferências</span>
              <UpdateIndicator/>
            </button>
            <button className="sidebar-profile" onClick={()=>setTab('account')} aria-label="Abrir meu perfil" title={`${social?.profile?.display_name||'Minha conta'} · Abrir perfil`}>
              <div className="profile-avatar">{social?.profile?.display_name?.slice(0,1)||'Z'}</div>
              <div>
                <strong>{social?.profile?.display_name||'Minha conta'}</strong>
                <span>@{social?.profile?.handle||'…'}</span>
              </div>
              <Settings2 size={14}/>
            </button>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="app-wordmark">
              ZYON <span>TFT</span>
            </div>
            <div className="topbar-divider" />
            <span className="topbar-section">
              TFT <ChevronDown size={12} /> {pageTitle[tab]}
            </span>
            <span className="data-label">
              <span className="tiny-dot" />
              Set {dataset.set} · Patch {dataset.patch}
            </span>
            <div className="window-actions">
              <span>{appVersion}</span>
              <button
                aria-label="Minimizar"
                onClick={() => window.zyon?.minimize()}
              >
                <Minus size={17} />
              </button>
              <button aria-label="Fechar" onClick={() => window.zyon?.close()}>
                <X size={17} />
              </button>
            </div>
          </header>
          <div className="workspace-heading">
            <div>
              <h1>{pageTitle[tab]}</h1>
              <p>
                {tab === "comps"
                  ? "Encontre sua comp. Entenda o plano. Entre no jogo."
                  : tab === "planner"
                    ? "Posicione, equipe e construa o seu próximo tabuleiro."
                    : tab === "champions"
                      ? "Campeões, características e receitas do set 18."
                      : tab === "overlay"
                        ? "Janela, monitor e leitura local da loja."
                        : tab==='duo' ? 'Contas, amigos e planos compartilhados para jogar em dupla.'
                        : tab==='account' ? 'Seu perfil, sua conexão e seus amigos no Zyon.'
                        : "Do plano fixado ao destaque na loja."}
              </p>
            </div>
            <div className="workspace-actions">
              <button className="new-comp" onClick={createComp}>
                <Plus size={15} />
                Nova comp
              </button>
              <button
                className={`overlay-toggle ${overlay ? "is-on" : ""}`}
                onClick={toggleOverlay}
              >
                <Monitor size={16} />
                {overlay ? "Overlay pronto" : "Ativar overlay"}
                <span className={overlay ? "live-dot" : "idle-dot"} />
              </button>
            </div>
          </div>
          {(tab === "comps" || tab === "planner") && <nav className="preparation-flow" aria-label="Fluxo da composição">
            <button aria-current={tab==="comps"&&!expanded?"step":undefined} onClick={()=>{setTab("comps");setExpanded(false);requestAnimationFrame(()=>document.querySelector(".comp-feed")?.scrollTo({top:0,behavior:"auto"}));}}><Layers3 size={15}/><span>Escolha sua comp</span></button>
            <ChevronDown size={13}/>
            <button aria-current={tab==="planner"||tab==="comps"&&expanded?"step":undefined} onClick={()=>exploreComp(pinned||active)}><LayoutGrid size={15}/><span>Prepare o plano</span></button>
            <span className="flow-note">{pinned ? <><BrandMark/>{pinned.name}</> : "Escolha uma comp para começar"}</span>
          </nav>}
          <div className="workspace-content">
            {tab === "comps" ? (
              <div className="composition-layout">
                <section
                  className="comp-feed"
                  aria-label="Biblioteca de composições"
                >
                  <CompSpotlight key={active.id} comp={active} selected={saved.pinned===active.id}
                    onOpen={()=>exploreComp(active)}
                    onSelect={()=>{update({pinned:active.id,selected:active.champions});notify(`${active.name} escolhida para o overlay.`);}}/>
                  <div className="library-tabs">
                    <button
                      className={libraryScope === "all" ? "active" : ""}
                      onClick={() => setLibraryScope("all")}
                    >
                      Todas as comps<span>{saved.comps.length}</span>
                    </button>
                    <button
                      className={libraryScope === "personal" ? "active" : ""}
                      onClick={() => setLibraryScope("personal")}
                    >
                      Minhas comps
                    </button>
                    <button
                      className={libraryScope === "pinned" ? "active" : ""}
                      onClick={() => setLibraryScope("pinned")}
                    >
                      Fixadas
                      <BrandMark />
                    </button>
                  </div>
                  <div className="feed-toolbar">
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar composição ou campeão"
                        aria-label="Buscar comp ou campeão"
                      />
                    </label>
                    <select
                      aria-label="Filtrar por estilo"
                      value={styleFilter}
                      onChange={(e) => setStyleFilter(e.target.value)}
                    >
                      <option value="Todas">Todos os estilos</option>
                      {[...new Set(saved.comps.map((c) => c.style))].map(
                        (style) => (
                          <option key={style}>{style}</option>
                        ),
                      )}
                    </select>
                    <select
                      aria-label="Filtrar por tier"
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                    >
                      <option value="Todas">Todos os tiers</option>
                      {tierSections
                        .filter((s) =>
                          saved.comps.some((c) => compTier(c) === s.id),
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                    </select>
                    <button
                      className="icon-button"
                      aria-label="Criar composição"
                      onClick={createComp}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="feed-caption">
                    <span>
                      {visible.length} composições ·{" "}
                      {sections.reduce((n, s) => n + s.builds, 0)} builds
                    </span>
                    <span>Tiers PivotTFT · Patch {dataset.patch}</span>
                  </div>
                  <details className="catalog-sources">
                    <summary>Fontes e atualização da base</summary>
                    <p>
                      {catalogStatus.snapshot.comps.length} builds do PivotTFT e
                      18 planos da base anterior. Patch {dataset.patch}.
                      Atualização automática ao abrir, com intervalo de 6 horas
                      e cópia local para jogar sem internet.
                    </p>
                    <p>
                      <a
                        href="https://mobalytics.gg/tft/guides/best-tft-comps"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mobalytics: guias e meta
                      </a>
                      <a
                        href="https://www.metatft.com/comps"
                        target="_blank"
                        rel="noreferrer"
                      >
                        MetaTFT: estatísticas
                      </a>
                      <a
                        href="https://www.pivottft.com/comps/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        PivotTFT: fonte das builds e rotas por nível
                      </a>
                    </p>
                    <small>
                      Última consulta:{" "}
                      {new Date(
                        catalogStatus.snapshot.fetchedAt,
                      ).toLocaleString("pt-BR")}
                      . Campeões, itens e ícones: Riot Games.
                    </small>
                    {catalogStatus.error && (
                      <p role="status">
                        {catalogStatus.error} O último catálogo válido foi
                        mantido.
                      </p>
                    )}
                    <button
                      onClick={() => refreshCatalog(true)}
                      disabled={catalogBusy || !window.zyon}
                    >
                      {catalogBusy
                        ? "Consultando PivotTFT…"
                        : "Atualizar agora"}
                    </button>
                  </details>
                  <div className="comp-list">
                    {sections.map((section) => (
                      <section
                        className="tier-section"
                        key={section.id}
                        data-tier={section.id}
                        aria-labelledby={`tier-heading-${section.id}`}
                      >
                        <header className="tier-section-heading">
                          <TierBadge tier={section.id} />
                          <div>
                            <h2 id={`tier-heading-${section.id}`}>
                              {section.title}
                            </h2>
                            <p>{section.description}</p>
                          </div>
                          <span>
                            {section.comps.length} comps
                            {section.builds !== section.comps.length
                              ? ` / ${section.builds} builds`
                              : ""}
                          </span>
                        </header>
                        <div className="tier-section-cards">
                          {section.comps.map((c: Comp) => (
                            <article
                              className={`comp-row ${c.id === active.id ? "row-selected" : ""} ${c.id === active.id && expanded ? "row-expanded" : ""}`}
                              key={c.id}
                              data-comp-id={c.id}
                              data-tier={compTier(c)}
                            >
                              <div className="comp-row-summary">
                                <div
                                  className="row-splash"
                                  style={{
                                    backgroundImage: `url(${splash(c.carry)})`,
                                  }}
                                />
                                <button
                                  className="comp-option"
                                  onClick={() => {
                                    if (c.id !== active.id) {
                                      update({ active: c.id });
                                      setExpanded(true);
                                      setEditor(false);
                                      setGuideTab("overview");
                                    } else setExpanded(!expanded);
                                  }}
                                  aria-expanded={c.id === active.id && expanded}
                                >
                                  <div className="comp-row-title">
                                    <span className="rank-marker">
                                      <CompTierBadge comp={c} />
                                    </span>
                                    <div className="comp-heading-copy">
                                      <strong>{c.name}</strong>
                                      <TraitStrip comp={c} />
                                    </div>
                                    <span className="row-style">{c.style}</span>
                                  </div>
                                  <div className="ranked-body">
                                    <div className="ranked-lineup">
                                      <div className="ranked-core">
                                        <span className="roster-label">
                                          Núcleo
                                        </span>
                                        <UnitStrip
                                          comp={c}
                                          showStars={c.champions.some(
                                            (id) => c.stars?.[id] === 3,
                                          )}
                                        />
                                      </div>
                                      {!!c.pivot?.upgrades.filter(
                                        (id) => !c.champions.includes(id),
                                      ).length && (
                                        <div className="ranked-flex">
                                          <span className="roster-label">
                                            Flex
                                          </span>
                                          <UnitStrip
                                            showStars={c.champions.some(
                                              (id) => c.stars?.[id] === 3,
                                            )}
                                            comp={{ ...c, items: {} }}
                                            ids={c.pivot.upgrades.filter(
                                              (id) => !c.champions.includes(id),
                                            )}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="comp-playstyle">
                                      <span>
                                        Nível final
                                        <b>
                                          {c.pivot?.finalLevel ||
                                            c.style.match(/\d+/)?.[0] ||
                                            "Livre"}
                                        </b>
                                      </span>
                                      <span>
                                        Carry<b>{byId[c.carry]?.name}</b>
                                      </span>
                                      <span>
                                        {c.pivot ? "Variações" : "Origem"}
                                        <b>
                                          {c.pivot
                                            ? saved.comps.filter(
                                                (other) =>
                                                  other.pivot?.family ===
                                                  c.pivot?.family,
                                              ).length
                                            : c.source?.name || "Pessoal"}
                                        </b>
                                      </span>
                                    </div>
                                  </div>
                                  <small className="comp-rank-source">
                                    {c.pivot && c.source
                                      ? `Tier ${c.tier} no PivotTFT · Patch ${c.source.patch}`
                                      : c.source
                                        ? "Guia da base anterior"
                                        : "Seu plano personalizado"}
                                  </small>
                                </button>
                                <div className="row-controls">
                                  <button
                                    className={`row-pin ${saved.pinned === c.id ? "row-pinned" : ""}`}
                                    aria-label={
                                      saved.pinned === c.id
                                        ? `Desafixar ${c.name}`
                                        : `Fixar ${c.name}`
                                    }
                                    title={
                                      saved.pinned === c.id
                                        ? "Comp fixada"
                                        : "Fixar no overlay"
                                    }
                                    onClick={() =>
                                      update({
                                        pinned:
                                          saved.pinned === c.id ? null : c.id,
                                        selected: c.champions,
                                      })
                                    }
                                  >
                                    <BrandMark />
                                  </button>
                                  <button
                                    className={`row-expand ${c.id === active.id && expanded ? "is-expanded" : ""}`}
                                    aria-label={
                                      c.id === active.id && expanded
                                        ? `Recolher ${c.name}`
                                        : `Expandir ${c.name}`
                                    }
                                    onClick={() => {
                                      update({ active: c.id });
                                      setExpanded(
                                        c.id === active.id ? !expanded : true,
                                      );
                                      setEditor(false);
                                      setGuideTab("overview");
                                    }}
                                  >
                                    <ChevronDown size={18} />
                                  </button>
                                </div>
                              </div>
                              {c.id === active.id && expanded && (
                                <div className="comp-expanded">
                                  <div className="detail-toolbar">
                                  <div
                                    className="detail-tabs"
                                    role="tablist"
                                    aria-label="Detalhes da composição"
                                  >
                                      {guideTabs.map((item) => (
                                      <button
                                        key={item.id}
                                        role="tab"
                                        aria-selected={
                                          !editor && guideTab === item.id
                                        }
                                        className={
                                          !editor && guideTab === item.id
                                            ? "tab-active"
                                            : ""
                                        }
                                        onClick={() => {
                                          setEditor(false);
                                          setGuideTab(item.id);
                                        }}
                                      >
                                        {item.id==="items" ? <Swords size={14}/> : item.id==="augments" ? <Sparkles size={14}/> : item.id==="units" ? <Layers3 size={14}/> : item.id==="progression" ? <ArrowRight size={14}/> : <LayoutGrid size={14}/>}
                                        {item.label}
                                      </button>
                                    ))}
                                    <button
                                      role="tab"
                                      aria-selected={editor}
                                      className={editor ? "tab-active" : ""}
                                      onClick={() => setEditor(true)}
                                    >
                                      Editar comp
                                    </button>
                                  </div>
                                  <button
                                    className="detail-planner"
                                    onClick={() => openPlanner()}
                                  >
                                    <LayoutGrid size={15} />
                                    Levar para o planejador
                                    <ArrowRight size={14} />
                                  </button>
                                  </div>
                                  {editor ? (
                                    <div className="editor-panel">
                                      <label className="field-label">
                                        Nome da composição
                                        <input
                                          maxLength={40}
                                          value={active.name}
                                          onChange={(e) =>
                                            editPlan({
                                              ...active,
                                              name: e.target.value,
                                            })
                                          }
                                        />
                                      </label>
                                      <p>
                                        Selecione os campeões que você quer
                                        encontrar na loja.
                                      </p>
                                      <div className="editor-champions">
                                        {champions.map((c) => (
                                          <Unit
                                            key={c.id}
                                            id={c.id}
                                            selected={selected.includes(c.id)}
                                            onClick={() => toggleChampion(c.id)}
                                          />
                                        ))}
                                      </div>
                                      {saved.comps.length > 1 && (
                                        <button
                                          className="delete-comp"
                                          onClick={() => {
                                            setSaved((prev) => ({
                                              ...prev,
                                              comps: prev.comps.filter(
                                                (c) => c.id !== active.id,
                                              ),
                                              active: prev.comps.find(
                                                (c) => c.id !== active.id,
                                              )!.id,
                                              pinned:
                                                prev.pinned === active.id
                                                  ? null
                                                  : prev.pinned,
                                            }));
                                            setEditor(false);
                                          }}
                                        >
                                          <Trash2 size={14} />
                                          Excluir composição
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <CompGuide
                                      key={active.id}
                                      comp={active}
                                      builds={saved.comps.filter(
                                        (c) =>
                                          c.pivot &&
                                          c.pivot.family ===
                                            active.pivot?.family,
                                      )}
                                      onBuild={(id) => {
                                        followBuild.current = true;
                                        setLibraryScope("all");
                                        update({ active: id });
                                        setExpanded(true);
                                        setQuery("");
                                        setStyleFilter("Todas");
                                        setTierFilter("Todas");
                                      }}
                                      tab={guideTab}
                                      onPlanner={() => openPlanner()}
                                      levelContext={
                                        saved.levelContexts?.[active.id] ||
                                        DEFAULT_LEVEL_CONTEXT
                                      }
                                      onLevelContext={(context) =>
                                        setSaved((prev) => ({
                                          ...prev,
                                          levelContexts: {
                                            ...prev.levelContexts,
                                            [active.id]: context,
                                          },
                                        }))
                                      }
                                    />
                                  )}
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                    {!visible.length && (
                      <div className="empty-library">
                        <Search size={24} />
                        <p>Nenhuma comp encontrada.</p>
                        <button
                          onClick={() => {
                            setQuery("");
                            setStyleFilter("Todas");
                            setTierFilter("Todas");
                          }}
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="demo-disclosure">
                    <CircleHelp size={12} />
                    Set {dataset.set} · Comps Mobalytics conferidas em{" "}
                    {dataset.checkedAt}. Builds PivotTFT sincronizadas.
                  </p>
                </section>
              </div>
            ) : tab==='account' ? <AccountProfile onDuo={()=>setTab('duo')}/> : tab==='duo' ? <main className="social-page"><SocialPanel comp={pinned}/></main> : tab === "planner" ? (
              <Planner
                key={`${active.id}:${plannerFocus || ""}`}
                focusId={plannerFocus}
                comp={active}
                onChange={editPlan}
                onPin={pin}
                pinned={saved.pinned === active.id}
                onNotify={notify}
              />
            ) : tab === "champions" ? (
              <Database comps={saved.comps} focusComp={pinned||active} onPlanner={openPlanner} />
            ) : tab === "overlay" ? (
              <main className="settings-panel">
                <UpdatesSettings/>
                <section>
                  <h2>Janela do overlay</h2>
                  <p>
                    Abre automaticamente ao confirmar o ouro no TFT. Alt+Tab
                    oculta o painel e os badges; voltar ao jogo retoma a
                    partida. Use o TFT em modo sem bordas.
                  </p>
                  <label className="setting-row">
                    <span>
                      Opacidade
                      <small>
                        Mantenha a loja legível por baixo dos marcadores.
                      </small>
                    </span>
                    <input
                      aria-label="Opacidade"
                      type="range"
                      min="30"
                      max="100"
                      value={saved.opacity}
                      onChange={(e) =>
                        update({ opacity: Number(e.target.value) })
                      }
                    />
                    <b>{saved.opacity}%</b>
                  </label>
                  <label className="setting-row">
                    <span>
                      Monitor
                      <small>Onde o TFT e a loja estão aparecendo.</small>
                    </span>
                    <select
                      aria-label="Monitor"
                      value={saved.displayId ?? ""}
                      onChange={(e) =>
                        update({
                          displayId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">Monitor principal</option>
                      {monitors.map((m, i) => (
                        <option key={m.id} value={m.id}>
                          Monitor {i + 1} · {m.width}×{m.height}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="setting-row">
                    <span>
                      Modo compacto
                      <small>
                        Mostra a comp completa numa faixa e mantém os badges.
                      </small>
                    </span>
                    <input
                      aria-label="Modo compacto"
                      type="checkbox"
                      checked={saved.compact}
                      onChange={(e) => update({ compact: e.target.checked })}
                    />
                  </label>
                </section>
                <section>
                  <h2>Leitura da loja</h2>
                  <p>
                    OCR local da loja, do nível e do ouro acima dos cards.
                    Compras confirmadas atualizam as cópias da partida no
                    overlay. Nenhuma imagem é enviada para servidores.
                  </p>
                  <div className="reader-status">
                    <span className={reader ? "live-dot" : "idle-dot"} />
                    {status}
                    <button
                      className={reader ? "secondary-button" : "primary-button"}
                      onClick={toggleReader}
                    >
                      {reader ? "Pausar leitura" : "Iniciar OCR local"}
                    </button>
                  </div>
                  <h3>Área dos cinco cards</h3>
                  <p>
                    A posição padrão acompanha a janela do jogo e a proporção
                    da tela. Se você mudou a escala da interface do TFT, ajuste
                    a área abaixo: leitura, moldura e medalha acompanham juntas.
                  </p>
                  <div className="calibration-fields">
                    {(["x", "y", "width", "height"] as const).map((key, i) => (
                      <label key={key}>
                        {["Esquerda", "Topo", "Largura", "Altura"][i]}
                        <div>
                          <input
                            aria-label={
                              ["Esquerda", "Topo", "Largura", "Altura"][i]
                            }
                            type="number"
                            min={
                              key === "width" ? 20 : key === "height" ? 2 : 0
                            }
                            max={100}
                            step="0.1"
                            value={Number((saved.rect[key] * 100).toFixed(1))}
                            onChange={(e) => {
                              const n = Number(e.target.value) / 100;
                              if (!Number.isFinite(n)) return;
                              update({ rect: { ...saved.rect, [key]: n } });
                            }}
                          />
                          <span>%</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => update({ rect: defaults.rect })}
                  >
                    Restaurar área padrão
                  </button>
                  <details className="level-calibration">
                    <summary>Ajustar a faixa do nível</summary>
                    <p>
                      Por padrão, acompanha a posição da loja. Recorte apenas
                      “Nv.” e o número, sem a barra de XP. Valores em
                      porcentagem da tela.
                    </p>
                    <div className="calibration-fields">
                      {(["x", "y", "width", "height"] as const).map(
                        (key, i) => {
                          const automatic = {
                            x: Math.max(0, saved.rect.x - saved.rect.width / 5),
                            y: Math.max(
                              0,
                              saved.rect.y - saved.rect.height * 0.29,
                            ),
                            width: (saved.rect.width / 5) * 0.4,
                            height: saved.rect.height * 0.16,
                          };
                          const region = saved.levelRect || automatic;
                          return (
                            <label key={key}>
                              {["Esquerda", "Topo", "Largura", "Altura"][i]}
                              <div>
                                <input
                                  aria-label={`Nível OCR: ${["Esquerda", "Topo", "Largura", "Altura"][i]}`}
                                  type="number"
                                  min={
                                    key === "width"
                                      ? 2
                                      : key === "height"
                                        ? 1
                                        : 0
                                  }
                                  max={
                                    key === "width"
                                      ? 25
                                      : key === "height"
                                        ? 15
                                        : 100
                                  }
                                  step="0.1"
                                  value={Number((region[key] * 100).toFixed(2))}
                                  onChange={(e) => {
                                    const n = Number(e.target.value) / 100;
                                    if (Number.isFinite(n))
                                      update({
                                        levelRect: { ...region, [key]: n },
                                      });
                                  }}
                                />
                                <span>%</span>
                              </div>
                            </label>
                          );
                        },
                      )}
                    </div>
                    <button
                      className="text-button"
                      onClick={() => update({ levelRect: null })}
                    >
                      Acompanhar posição da loja
                    </button>
                  </details>
                  <div className="reader-warning">
                    <CircleHelp size={16} />
                    <p>
                      A leitura em partida ainda precisa ser validada na sua
                      resolução. Em caso de nome incerto ou erro, o badge fica
                      oculto. O reconhecimento atual não importa automaticamente
                      o set de TFT.
                    </p>
                  </div>
                </section>
              </main>
            ) : (
              <main className="help-panel">
                <h2>Você escolhe. O Zyon lembra.</h2>
                <div className="help-step">
                  <BrandMark />
                  <div>
                    <h3>Fixe uma composição</h3>
                    <p>
                      Use uma das comps do set 18 ou crie a sua. Os campeões
                      fixados são a lista de alvos dos badges.
                    </p>
                  </div>
                </div>
                <div className="help-step">
                  <RotateCw />
                  <div>
                    <h3>Prepare seu plano</h3>
                    <p>
                      Confira a equipe por nível, os itens e os aprimoramentos.
                      Durante a partida, ajuste os campeões na aba Planejar
                      do overlay.
                    </p>
                  </div>
                </div>
                <div className="help-step">
                  <Monitor />
                  <div>
                    <h3>Abra sobre o jogo</h3>
                    <p>
                      Ative o overlay e a leitura para acompanhar nível, ouro e
                      compras. Consulte Equipe, Itens e Partida sem sair do
                      jogo. Ctrl+Shift+G recolhe o guia; Ctrl+Shift+O oculta
                      tudo. Ctrl+Shift+Q encerra o app. A leitura da loja pode
                      ser iniciada no próprio guia; calibre em Preferências.
                    </p>
                  </div>
                </div>
                <div className="help-disclaimer">
                  Zyon é um projeto pessoal independente, sem afiliação ou
                  aprovação da Riot Games. As imagens pertencem à Riot Games.
                  Catálogo do set 18, com comps do patch 18.6 conferidas em
                  14/11/2026 no Mobalytics. A curadoria é atualizada
                  manualmente.
                </div>
              </main>
            )}
            <PlanAside
              comp={
                pinned ? { ...pinned, champions: saved.selected } : undefined
              }
              owned={pinned ? saved.checklists?.[pinned.id] || [] : []}
              onOwnedChange={(owned) => {
                if (pinned)
                  setSaved((prev) => ({
                    ...prev,
                    checklists: { ...prev.checklists, [pinned.id]: owned },
                  }));
              }}
              overlay={overlay}
              reader={reader}
              hits={hits}
              onPlanner={() => {
                if (pinned) update({ active: pinned.id });
                setTab("planner");
              }}
              onOverlay={toggleOverlay}
              onUnpin={() => update({ pinned: null })}
              onSettings={() => setTab("overlay")}
              onGuide={(section)=>{if(pinned)exploreComp(pinned,section);}}
            />
          </div>
          <footer className="statusbar">
            <span>
              <span className="tiny-dot" />
              Salvo neste dispositivo
            </span>
            <span>
              {reader ? "Leitura do jogo ativa" : "Pronto para jogar"}
              <i />
              Zyon {appVersion}
            </span>
          </footer>
        </div>
        {toast && (
          <div className="toast" role="status">
            <Check size={16} />
            {toast}
          </div>
        )}
      </div>
    </PivotTiersContext.Provider>
  );
}
