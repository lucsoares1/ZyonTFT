import {ChampionTable} from './ChampionTable';
import { useState, useContext } from "react";
import { PivotTiersContext, PivotAugmentContext } from "./PivotGuide";
import {compAugments} from './comp-augments.mjs';
import {
  ArrowDownAZ,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Crosshair,
  ExternalLink,
  Layers3,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Swords,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  allItems,
  allAugments,
  allTraits,
  byId,
  champions,
  dataset,
  itemNames,
  portrait,
  splash,
  traitIcon,
  type Comp,
} from "./data";
import { Items, UnitStrip } from "./TftPanels";
import { ComponentNeeds, type GuideTab } from "./CompGuide";
import {BrandMark} from "./Brand";
import { summarizePlan } from "./plan-summary.mjs";
import {traitCounts} from './level-planner.mjs';
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function TraitStrip({ comp }: { comp: Comp }) {
  const counts=traitCounts(comp.champions,byId);
  return (
    <div className="comp-traits" aria-label="Características da equipe, sem emblemas">
      {Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => (
          <span key={name} title={`${name} · ${count} pontos, sem emblemas`}>
            <img src={traitIcon(name)} alt="" />
            <b>{count}</b>
            <span>{name}</span>
          </span>
        ))}
    </div>
  );
}
export function PlanAside(props:Parameters<typeof PreparationAside>[0]) {
 const {comp,overlay,reader,onGuide,onPlanner,onOverlay,onSettings}=props;
 return <aside className="plan-aside context-aside" aria-label="Plano fixado e overlay"><div className="aside-title"><h2>Plano escolhido</h2><span className="context-plan-state">{comp?'Pronto':'Nenhum'}</span></div>{comp?<><div className="context-plan-identity"><img src={portrait(comp.carry)} alt=""/><div><strong>{comp.name}</strong><span>{comp.style} · {comp.champions.length} campeões</span></div></div><button className="context-open-plan" onClick={()=>onGuide('overview')}>Abrir plano<ArrowRight size={15}/></button><button className="context-edit-plan" onClick={onPlanner}><Layers3 size={15}/>Editar no planejador</button></>:<p className="context-empty">Escolha uma composição para preparar sua partida.</p>}<div className="context-overlay-state"><Monitor size={16}/><div><strong>{overlay?'Overlay ativado':'Overlay desativado'}</strong><span>{reader?'Leitura da loja ativa':'Pronto para acompanhar o TFT'}</span></div><i data-active={overlay||undefined}/></div><button className="context-configure" onClick={onSettings}>Configurar leitura<ChevronRight size={14}/></button>{!overlay&&<button className="context-configure" onClick={onOverlay}>Ativar overlay<ArrowRight size={14}/></button>}</aside>;
}
export function PreparationAside({
  comp,
  owned,
  onOwnedChange,
  overlay,
  reader,
  hits,
  onPlanner,
  onOverlay,
  onUnpin,
  onSettings,
  onGuide,
}: {
  comp?: Comp;
  owned: string[];
  onOwnedChange: (ids: string[]) => void;
  overlay: boolean;
  reader: boolean;
  hits: number;
  onPlanner: () => void;
  onOverlay: () => void;
  onUnpin: () => void;
  onSettings: () => void;
  onGuide: (tab: GuideTab) => void;
}) {
  const summary = comp ? summarizePlan(comp, byId, allItems, owned) : null;
  const checked = new Set(Array.isArray(owned) ? owned : []);
  const openers = comp?.pivot?.openers || [];
  const holders = comp ? [...new Set([comp.carry,...Object.keys(comp.items||{})])].filter(id=>comp.items?.[id]?.length).slice(0,3) : [];
  return (
    <div
      className="preparation-legacy"
      aria-label="Plano fixado e overlay"
    >
      <div className="aside-title">
        <h2>Seu plano de jogo</h2>
        <span><BrandMark/>{comp ? "Sua comp" : "Escolha um plano"}</span>
      </div>
      {comp && (
        <div
          className="aside-carry"
          style={{
            backgroundImage: `linear-gradient(0deg, #0d1420 0%, #0d142000 100%), url(${splash(comp.carry)})`,
          }}
        >
          <img
            className={`cost-${byId[comp.carry]?.cost}`}
            src={portrait(comp.carry)}
            alt=""
          />
          <div>
            <small>{comp.style}</small>
            <strong>{comp.name}</strong>
            <Items ids={comp.items?.[comp.carry] || []} />
          </div>
        </div>
      )}
      {comp && <nav className="plan-shortcuts" aria-label="Estudar a comp escolhida">
        <button onClick={()=>onGuide("units")}><Layers3 size={17}/><span>Equipe<small>{comp.champions.length} campeões</small></span><ChevronRight size={14}/></button>
        <button onClick={()=>onGuide("items")}><Swords size={17}/><span>Itens<small>Portadores e receitas</small></span><ChevronRight size={14}/></button>
        <button aria-label="Aprimoramentos para esta comp" onClick={()=>onGuide("augments")}><Sparkles size={17}/><span>Augments<small>Escolhas para esta comp</small></span><ChevronRight size={14}/></button>
      </nav>}
      <section className="shopping-tools">
        <div>
          <Monitor size={15} />
          <h3>Leve o plano para o jogo</h3>
          <span className={overlay ? "live-dot" : "idle-dot"} />
        </div>
        <p>
          {reader ? "Leitura OCR ativa" : "Automático ao ler ouro no TFT"}
          <span>{reader ? `${hits} destaques` : ""}</span>
        </p>
        <button className="secondary-action" onClick={onOverlay}>
          {overlay ? "Esconder overlay" : "Ativar overlay"}
          <ChevronRight size={14} />
        </button>
        <div className="shopping-tool-links">
          <button onClick={onSettings}>Calibrar OCR</button>
        </div>
      </section>
      {comp && <section className="aside-playbook" aria-label="Resumo do plano escolhido">
        {!!openers.length && <button className="aside-opening" onClick={()=>onGuide("progression")}>
          <div><span>Comece por aqui</span><ChevronRight size={14}/></div>
          <strong>Uma base para a primeira etapa</strong>
          <div className="aside-opening-faces">{openers.map(id=><img key={id} src={portrait(id)} title={byId[id]?.name} alt={byId[id]?.name} className={`cost-${byId[id]?.cost}`}/>)}</div>
          <small>Veja as trocas no plano de nível</small>
        </button>}
        {!!holders.length&&<div className="aside-item-holders"><h3>Quem carrega seus itens</h3>{holders.map((id,i)=><button key={id} onClick={()=>onGuide("items")}>
          <img src={portrait(id)} alt="" className={`cost-${byId[id]?.cost}`}/><span><strong>{byId[id]?.name}</strong><small>{i===0?"Carry principal":"Portador do plano"}</small><Items ids={comp.items?.[id]||[]}/></span><ChevronRight size={12}/>
        </button>)}</div>}
      </section>}
      <details className="preparation-checklist" open>
      <summary>Checklist de preparação<ChevronDown size={14}/></summary>
      <section className="pinned-plan shopping-plan">
        <div className="shopping-plan-header">
          <BrandMark />
          <h3>{comp ? "Equipe final para estudo" : "Nenhuma comp fixada"}</h3>
          {comp && (
            <button
              onClick={onUnpin}
              title="Desafixar plano"
              aria-label="Desafixar plano"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {comp && summary ? (
          <>
            <p className="shopping-help">
              Marcação de preparação. Na partida, o overlay acompanha as compras automaticamente.
            </p>
            <div className="collection-status">
              <span>
                {summary.collected} de {summary.ids.length} encontrados
              </span>
              <button
                onClick={() => onOwnedChange([])}
                disabled={!summary.collected}
              >
                Reiniciar
              </button>
            </div>
            <progress
              value={summary.collected}
              max={Math.max(summary.ids.length, 1)}
              aria-label="Campeões encontrados"
            />
            <div className="purchase-checklist">
              {summary.ids.map((id) => (
                <button
                  key={id}
                  role="checkbox"
                  aria-checked={checked.has(id)}
                  aria-label={byId[id].name + " já comprado"}
                  className={checked.has(id) ? "collected" : ""}
                  onClick={() =>
                    onOwnedChange(
                      checked.has(id)
                        ? owned.filter((unit) => unit !== id)
                        : [...owned, id],
                    )
                  }
                >
                  <span className="purchase-tick">
                    {checked.has(id) && <Check size={12} />}
                  </span>
                  <img
                    className={"cost-" + byId[id].cost}
                    src={portrait(id)}
                    alt=""
                  />
                  <span>
                    {byId[id].name}
                    {id === comp.carry && <small>Carry</small>}
                  </span>
                  <b>
                    <i className="coin-dot" />
                    {byId[id].cost}
                  </b>
                </button>
              ))}
            </div>
            <div className="purchase-total">
              <div>
                <span>Faltam em compras</span>
                <small>1 cópia de cada · sem XP ou rerolls</small>
              </div>
              <strong>
                <i className="coin-dot" />
                {summary.remainingCost}
              </strong>
            </div>
            {!summary.missing.length && (
              <p className="checklist-complete">
                <Check size={14} /> Núcleo reunido. Confira os upgrades.
              </p>
            )}
            <button className="shopping-planner" onClick={onPlanner}>
              Abrir planejador <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <div className="shopping-empty">
            <p>Fixe uma composição para montar sua lista de compras.</p>
            <button onClick={onPlanner}>
              Criar um plano <ArrowRight size={14} />
            </button>
          </div>
        )}
      </section>
      </details>
      {comp && (
        <section className="shopping-components">
          <h3>Separar componentes</h3>
          <p>Total para os itens deste plano.</p>
          <ComponentNeeds comp={comp} />
        </section>
      )}
    </div>
  );
}
export {Planner} from "./PlannerStudio";
export function Database({
  comps,
  onPlanner,
  focusComp,
  statistics = {},
}: {
  comps: Comp[];
  focusComp?: Comp;
  statistics?: Record<string,any>;
  onPlanner: (id?: string) => void;
}) {
  const tiers = useContext(PivotTiersContext);
  const augmentGuides=useContext(PivotAugmentContext);
  const focusAugments=new Set(compAugments(focusComp,augmentGuides,allAugments).ids);
  const [tab, setTab] = useState<"champions" | "traits" | "items" | "augments">(
      "champions",
    ),
    [query, setQuery] = useState(""),
    [cost, setCost] = useState("Todas"),
    [trait, setTrait] = useState("Todas"),
    [kind, setKind] = useState("Todos"),
    [sort, setSort] = useState("pick");
  const [focusOnly,setFocusOnly]=useState(false);
  const focusItems=new Set(Object.values(focusComp?.items||{}).flat());
  const focusTraits=new Set(focusComp?.champions.flatMap(id=>byId[id]?.traits||[])||[]);
  const guides = comps.filter((c) => c.source);
  const itemTiers = new Map(tiers.items.map((t) => [t.id, t.tier]));
  const augmentRows = tiers.augments.filter((a) =>
    norm(allAugments[a.id]?.name || a.id).includes(norm(query)) && (!focusOnly || focusAugments.has(a.id)),
  );
  const usages = (id: string) => guides.filter((c) => c.champions.includes(id));
  const itemHolders = (id: string) => [
    ...new Set(
      guides.flatMap((c) =>
        Object.entries(c.items || {})
          .filter(([, items]) => items?.includes(id))
          .map(([unit]) => unit),
      ),
    ),
  ];
  const units = champions
    .filter(
      (c) =>
        (!focusOnly || focusComp?.champions.includes(c.id)) &&
        (cost === "Todas" || c.cost === Number(cost)) &&
        (trait === "Todas" || c.traits.includes(trait)) &&
        norm(`${c.name} ${c.traits.join(" ")}`).includes(norm(query)),
    )
    .sort((a, b) =>
      sort === "pick" ? (statistics[b.id]?.performance?.pickRate??-1)-(statistics[a.id]?.performance?.pickRate??-1) : sort === "average" ? (statistics[a.id]?.performance?.average??99)-(statistics[b.id]?.performance?.average??99) : sort === "name"
        ? a.name.localeCompare(b.name, "pt-BR")
        : sort === "guides"
          ? usages(b.id).length - usages(a.id).length
          : a.cost - b.cost || a.name.localeCompare(b.name, "pt-BR"),
    );
  const traits = allTraits.filter((t) => norm(t.name).includes(norm(query)) && (!focusOnly||focusTraits.has(t.name)));
  const items = allItems.filter(
    (i) =>
      (!focusOnly || focusItems.has(i.id)) &&
      (kind === "Todos" || i.category === kind) &&
      norm(i.name).includes(norm(query)),
  );
  return (
    <main className="database-page" data-catalog={tab}>
      {focusComp && <div className="database-comp-focus">
        <img src={portrait(focusComp.carry)} alt=""/>
        <div><small>Consulte a partir da sua comp</small><strong>{focusComp.name}</strong></div>
        <button aria-pressed={focusOnly} onClick={()=>setFocusOnly(!focusOnly)}><BrandMark/>{focusOnly?"Mostrando esta comp":"Somente esta comp"}</button>
      </div>}
      <div
        className="database-tabs"
        role="tablist"
        aria-label="Catálogos do set"
      >
        {[
          ["champions", "Campeões"],
          ["traits", "Características"],
          ["items", "Itens"],
          ["augments", "Aprimoramentos"],
        ].map(([id, name]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => {
              setTab(id as typeof tab);
              setQuery("");
            }}
          >
            {name}
          </button>
        ))}
        <span>
          SET {dataset.set} / {dataset.patch}
        </span>
      </div>
      <div className="database-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Buscar no catálogo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${tab === "champions" ? "campeão ou característica" : tab === "traits" ? "característica" : tab === "augments" ? "aprimoramento" : "item"}`}
          />
        </label>
        <div className="database-filters">
        {tab === "champions" && (
          <>
            <label className="database-filter"><span>Característica</span>
            <select
              aria-label="Filtrar característica"
              value={trait}
              onChange={(e) => setTrait(e.target.value)}
            >
              <option value="Todas">Todas as características</option>
              {allTraits.map((t) => (
                <option key={t.id}>{t.name}</option>
              ))}
            </select>
            </label>
            <label className="database-filter"><span>Custo</span>
            <select
              aria-label="Filtrar custo"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            >
              <option value="Todas">Todos os custos</option>
              {[1, 2, 3, 4, 5].map((c) => (
                <option key={c} value={c}>
                  Custo {c}
                </option>
              ))}
            </select>
            </label>
            <label className="database-filter table-sort">
              <span><ArrowDownAZ size={12} /> Ordenação</span>
              <select
                aria-label="Ordenar campeões"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="pick">Mais escolhidos</option><option value="average">Melhor média</option><option value="cost">Por custo</option>
                <option value="name">Por nome</option>
                <option value="guides">Por presença nos guias</option>
              </select>
            </label>
          </>
        )}
        {tab === "items" && (
          <label className="database-filter"><span>Categoria</span>
          <select
            aria-label="Tipo de item"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="Todos">Todos os itens</option>
            {["Completo", "Componente", "Emblema"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          </label>
        )}
        </div>
        <span className="database-results" role="status" aria-live="polite">
          {tab === "champions"
            ? units.length
            : tab === "traits"
              ? traits.length
              : tab === "augments"
                ? augmentRows.length
                : items.length}{" "}
          resultados
        </span>
      </div>
      {tab === "augments" ? (
        <section className="pivot-augments" tabIndex={0} aria-label="Lista de aprimoramentos">
          <p>
            Tiers editoriais do PivotTFT para o patch {dataset.patch}. A escolha
            depende da sua composição.
          </p>
          <div className="pivot-augment-list">
            {augmentRows.map((a) => (
              <div key={a.id}>
                {allAugments[a.id]?.icon ? (
                  <img src={`./assets/augments/${a.id}.png`} alt="" />
                ) : (
                  <ShieldCheck size={28} />
                )}
                <span>
                  <strong>{allAugments[a.id]?.name || a.id}</strong>
                  <small>
                    {allAugments[a.id]?.unresolved
                      ? "Nome da fonte, sem correspondência Riot"
                      : "PivotTFT"}
                  </small>
                </span>
                <b>{a.tier}</b>
              </div>
            ))}
          </div>
          {!augmentRows.length && <p className="catalog-empty">{focusOnly?"Esta comp não tem aprimoramentos que correspondam à busca. Desative o filtro para explorar o set.":"Nenhum aprimoramento encontrado."}</p>}
        </section>
      ) : tab === "champions" ? <ChampionTable units={units} statistics={statistics} onPlanner={onPlanner}/> : (
        <div className="data-table-wrap" key={tab} tabIndex={0} role="region" aria-label={tab === "traits" ? "Lista de características" : "Lista de itens"}>
          <table className={`data-table catalog-${tab}`} aria-label={tab === "traits" ? "Características do set" : "Itens do set"}>
            <colgroup>{(tab === "traits" ? ["index","name","levels","count","portraits"] : ["index","name","category","recipe","portraits"]).map(name=><col key={name} className={`catalog-col-${name}`}/>)}</colgroup>
            <thead>
              <tr>
                <th>#</th>
                {tab === "traits" ? (
                  <>
                    <th>Característica</th>
                    <th>Patamares</th>
                    <th>Unidades</th>
                    <th>Campeões do set</th>
                  </>
                ) : (
                  <>
                    <th>Item</th>
                    <th>Tipo</th>
                    <th>Receita</th>
                    <th>Unidades nos guias</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tab === "traits"
                  ? traits.map((t, i) => {
                      const roster = champions.filter((c) =>
                        c.traits.includes(t.name),
                      );
                      return (
                        <tr key={t.id}>
                          <td>{i + 1}</td>
                          <td>
                            <button
                              className="table-trait-name"
                              onClick={() => {
                                setTrait(t.name);
                                setTab("champions");
                                setQuery("");
                              }}
                            >
                              <img src={traitIcon(t.name)} alt="" />
                              <strong>{t.name}</strong>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                          <td>
                            <div className="breakpoints">
                              {[...new Set(t.breakpoints)].map((n) => (
                                <span key={n}>{n}</span>
                              ))}
                              {!t.breakpoints.length && <span>Especial</span>}
                            </div>
                          </td>
                          <td className="usage-count">{roster.length}</td>
                          <td>
                            <div className="table-portraits">
                              {roster.slice(0, 9).map((c) => (
                                <img
                                  key={c.id}
                                  className={`cost-${c.cost}`}
                                  src={portrait(c.id)}
                                  alt={c.name}
                                  title={c.name}
                                />
                              ))}
                              {roster.length > 9 && (
                                <small>+{roster.length - 9}</small>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : items.map((item, i) => {
                      const holders = itemHolders(item.id);
                      return (
                        <tr key={item.id}>
                          <td>{i + 1}</td>
                          <td>
                            <div className="table-unit item-name">
                              <img
                                src={`./assets/items/${item.id}.png`}
                                alt=""
                              />
                              <strong>{item.name}</strong>
                              {itemTiers.get(item.id) && (
                                <b
                                  className="pivot-tier"
                                  title="Tier editorial PivotTFT"
                                >
                                  {itemTiers.get(item.id)}
                                </b>
                              )}
                            </div>
                          </td>
                          <td className="muted-cell">{item.category}</td>
                          <td>
                            <div className="recipe">
                              {item.recipe.map((id, i) => (
                                <img
                                  key={`${id}-${i}`}
                                  src={`./assets/items/${id}.png`}
                                  alt={itemNames[id]}
                                  title={itemNames[id]}
                                />
                              ))}
                              {!item.recipe.length && (
                                <span>
                                  {item.category === "Componente"
                                    ? "Componente"
                                    : "Sem receita combinável"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="table-portraits">
                              {holders.slice(0, 6).map((id) => (
                                <img
                                  className={`cost-${byId[id]?.cost}`}
                                  key={id}
                                  src={portrait(id)}
                                  alt={byId[id]?.name}
                                  title={byId[id]?.name}
                                />
                              ))}
                              {!holders.length && (
                                <span className="muted-cell">
                                  Sem indicação nos {guides.length} guias
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
            </tbody>
          </table>
          {!(tab === "traits"
              ? traits.length
              : items.length) && (
            <div className="catalog-empty">
              <Search size={22} />
              <strong>Nenhum resultado encontrado</strong>
              <button
                onClick={() => {
                  setQuery("");
                  setTrait("Todas");
                  setCost("Todas");
                  setKind("Todos");
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
      <p className="database-disclosure">
        <ShieldCheck size={13} />
        Catálogo do set · Riot Data Dragon e CommunityDragon. “Nos guias” conta
        presenças nas {guides.length} builds. Tiers de itens e aprimoramentos:
        PivotTFT.
      </p>
    </main>
  );
}
