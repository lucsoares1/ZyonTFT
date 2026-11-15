import { useState, useContext } from "react";
import { PivotTiersContext } from "./PivotGuide";
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
import { BoardPanel, Items, UnitStrip, equipmentFor } from "./TftPanels";
import { ComponentNeeds, type GuideTab } from "./CompGuide";
import {BrandMark} from "./Brand";
import { summarizePlan } from "./plan-summary.mjs";
import { boardPositions, moveUnit } from "./planning.mjs";
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function TraitStrip({ comp }: { comp: Comp }) {
  const counts: Record<string, number> = {};
  for (const id of comp.champions)
    for (const trait of byId[id]?.traits || [])
      counts[trait] = (counts[trait] || 0) + 1;
  return (
    <div className="comp-traits" aria-label="Contagem base de características">
      {Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => (
          <span key={name} title={`${name} · ${count} unidades, sem bônus`}>
            <img src={traitIcon(name)} alt="" />
            <b>{count}</b>
            <span>{name}</span>
          </span>
        ))}
    </div>
  );
}
export function PlanAside({
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
    <aside
      className="plan-aside shopping-aside"
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
      <details className="preparation-checklist">
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
    </aside>
  );
}
export function Planner({
  comp,
  onChange,
  onPin,
  pinned,
  onNotify,
  focusId,
}: {
  comp: Comp;
  onChange: (c: Comp) => void;
  onPin: () => void;
  pinned: boolean;
  onNotify: (s: string) => void;
  focusId?: string;
}) {
  const [cell, setCell] = useState<number>(() =>
      focusId
        ? ((boardPositions(comp, byId) as Record<string, number>)[focusId] ??
          21)
        : 21,
    ),
    [query, setQuery] = useState(""),
    [cost, setCost] = useState("Todas"),
    [pool, setPool] = useState<"champions" | "items">("champions");
  const positions = boardPositions(comp, byId) as Record<string, number>;
  const selected = Object.keys(positions).find((id) => positions[id] === cell);
  const edited = (value: Partial<Comp>) =>
    onChange({ ...comp, ...value, style: "Personalizada", source: undefined });
  const put = (id: string, target = cell) => {
    onChange(moveUnit(comp, id, target, byId) as Comp);
    setCell(target);
  };
  const remove = () => {
    if (!selected) return;
    edited({
      champions: comp.champions.filter((id) => id !== selected),
      carry:
        comp.carry === selected
          ? comp.champions.find((id) => id !== selected) || comp.carry
          : comp.carry,
    });
  };
  const equip = (id: string) => {
    if (!selected) {
      onNotify("Selecione uma unidade do tabuleiro para equipar.");
      return;
    }
    const equipped = comp.items?.[selected] || [];
    if (equipped.length >= 3) {
      onNotify("A unidade já tem três itens. Remova um para trocar.");
      return;
    }
    edited({ items: { ...comp.items, [selected]: [...equipped, id] } });
  };
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
      onChange({
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
  return (
    <main className="planner-page">
      <div className="planner-topline">
        <label>
          Nome do plano
          <input
            value={comp.name}
            maxLength={40}
            onChange={(e) => onChange({ ...comp, name: e.target.value })}
            aria-label="Nome do plano"
          />
        </label>
        <span>
          <Check size={13} />
          Salvo neste dispositivo
        </span>
        <button
          className={`pin-button ${pinned ? "pinned" : ""}`}
          disabled={!comp.champions.length}
          onClick={onPin}
        >
          <BrandMark />
          {pinned ? "Comp fixada" : "Fixar comp"}
        </button>
      </div>
      <div className="planner-board">
        <BoardPanel
          comp={comp}
          pinned={pinned}
          selectedCell={cell}
          onCellClick={setCell}
          onUnitDrop={put}
        />
      </div>
      <div className="planner-actions">
        <span>
          <Crosshair size={14} />
          Clique numa casa e adicione uma unidade. Arraste para mover.
        </span>
        <button onClick={importPlan}>
          <Copy size={14} />
          Importar plano
        </button>
        <button onClick={exportPlan}>
          <Copy size={14} />
          Copiar plano
        </button>
        <button
          disabled={!comp.champions.length}
          onClick={() =>
            edited({ champions: [], positions: {}, items: {}, stars: {} })
          }
        >
          <Trash2 size={14} />
          Limpar
        </button>
      </div>
      <div className="planner-workbench">
        <section className="unit-pool">
          <div className="pool-tabs">
            <button
              className={pool === "champions" ? "active" : ""}
              onClick={() => {
                setPool("champions");
                setQuery("");
              }}
            >
              Campeões <span>{champions.length}</span>
            </button>
            <button
              className={pool === "items" ? "active" : ""}
              onClick={() => {
                setPool("items");
                setQuery("");
              }}
            >
              Itens <span>{allItems.length}</span>
            </button>
          </div>
          <div className="pool-toolbar">
            <label className="search-field">
              <Search size={15} />
              <input
                aria-label="Buscar no planejador"
                placeholder={
                  pool === "champions"
                    ? "Buscar campeão ou característica"
                    : "Buscar item"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {pool === "champions" && (
              <select
                aria-label="Custo no planejador"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              >
                <option>Todas</option>
                {[1, 2, 3, 4, 5].map((c) => (
                  <option key={c} value={c}>
                    Custo {c}
                  </option>
                ))}
              </select>
            )}
          </div>
          {pool === "champions" ? (
            <div className="champion-pool">
              {champions
                .filter(
                  (c) =>
                    (cost === "Todas" || c.cost === Number(cost)) &&
                    norm(`${c.name} ${c.traits.join(" ")}`).includes(
                      norm(query),
                    ),
                )
                .map((c) => (
                  <button
                    className={`pool-unit ${comp.champions.includes(c.id) ? "on-board" : ""}`}
                    key={c.id}
                    title={`${c.name} · ${c.cost} de ouro · ${c.traits.join(", ")}`}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", c.id)
                    }
                    onClick={() => put(c.id)}
                    aria-label={`Adicionar ${c.name}`}
                  >
                    <img
                      className={`cost-${c.cost}`}
                      src={portrait(c.id)}
                      alt=""
                    />
                    <span>{c.name}</span>
                    {comp.champions.includes(c.id) && (
                      <Check className="pool-check" size={11} />
                    )}
                  </button>
                ))}
            </div>
          ) : (
            <div className="item-pool">
              {allItems
                .filter(
                  (i) =>
                    i.category !== "Componente" &&
                    norm(i.name).includes(norm(query)),
                )
                .map((i) => (
                  <button
                    key={i.id}
                    onClick={() => equip(i.id)}
                    title={`Equipar ${i.name}`}
                    aria-label={`Equipar ${i.name}`}
                  >
                    <img src={`./assets/items/${i.id}.png`} alt="" />
                    <span>{i.name}</span>
                  </button>
                ))}
            </div>
          )}
        </section>
        <section className="unit-inspector">
          <h3>Unidade selecionada</h3>
          {selected ? (
            <>
              <div className="inspector-unit">
                <img
                  className={`cost-${byId[selected].cost}`}
                  src={portrait(selected)}
                  alt=""
                />
                <div>
                  <h4>{byId[selected].name}</h4>
                  <p>{byId[selected].traits.join(" · ")}</p>
                </div>
              </div>
              <label className="stars-control">
                Estrelas do plano
                <select
                  aria-label="Estrelas do plano"
                  value={comp.stars?.[selected] || 0}
                  onChange={(e) =>
                    onChange({
                      ...comp,
                      stars: {
                        ...comp.stars,
                        [selected]: Number(e.target.value),
                      },
                    })
                  }
                >
                  <option value={0}>Sem indicação</option>
                  <option value={1}>1 estrela</option>
                  <option value={2}>2 estrelas</option>
                  <option value={3}>3 estrelas</option>
                </select>
              </label>
              <div className="inspector-items">
                <h4>
                  Equipamentos{" "}
                  <span>{(comp.items?.[selected] || []).length}/3</span>
                </h4>
                <div>
                  {Array.from({ length: 3 }, (_, index) => {
                    const item = comp.items?.[selected]?.[index];
                    return (
                      <button
                        className={item ? "equipped-slot" : "empty-item-slot"}
                        key={index}
                        title={
                          item ? `Remover ${itemNames[item]}` : "Escolher item"
                        }
                        onClick={() => {
                          if (item)
                            edited({
                              items: {
                                ...comp.items,
                                [selected]: (
                                  comp.items?.[selected] || []
                                ).filter((_, i) => i !== index),
                              },
                            });
                          else {
                            setPool("items");
                            setQuery("");
                          }
                        }}
                      >
                        {item ? (
                          <>
                            <img
                              src={`./assets/items/${item}.png`}
                              alt={itemNames[item]}
                            />
                            <X size={10} />
                          </>
                        ) : (
                          <Plus size={18} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p>
                  Escolha um item no catálogo ao lado para equipar. Clique no
                  item equipado para remover.
                </p>
              </div>
              <button
                className="secondary-action"
                onClick={() => onChange({ ...comp, carry: selected })}
              >
                <Crosshair size={14} />
                {comp.carry === selected
                  ? "Carry principal"
                  : "Definir como carry"}
              </button>
              <button className="remove-unit" onClick={remove}>
                <Trash2 size={14} />
                Remover do tabuleiro
              </button>
            </>
          ) : (
            <div className="inspector-empty">
              <Crosshair size={25} />
              <strong>Casa {cell + 1} selecionada</strong>
              <p>Escolha um campeão no catálogo para colocá-lo aqui.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
export function Database({
  comps,
  onPlanner,
  focusComp,
}: {
  comps: Comp[];
  focusComp?: Comp;
  onPlanner: (id?: string) => void;
}) {
  const tiers = useContext(PivotTiersContext);
  const [tab, setTab] = useState<"champions" | "traits" | "items" | "augments">(
      "champions",
    ),
    [query, setQuery] = useState(""),
    [cost, setCost] = useState("Todas"),
    [trait, setTrait] = useState("Todas"),
    [kind, setKind] = useState("Todos"),
    [sort, setSort] = useState("cost");
  const [focusOnly,setFocusOnly]=useState(false);
  const focusItems=new Set(Object.values(focusComp?.items||{}).flat());
  const focusTraits=new Set(focusComp?.champions.flatMap(id=>byId[id]?.traits||[])||[]);
  const guides = comps.filter((c) => c.source);
  const itemTiers = new Map(tiers.items.map((t) => [t.id, t.tier]));
  const augmentRows = tiers.augments.filter((a) =>
    norm(allAugments[a.id]?.name || a.id).includes(norm(query)) && (!focusOnly || focusComp?.pivot?.augments.includes(a.id)),
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
      sort === "name"
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
    <main className="database-page">
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
        {tab === "champions" && (
          <>
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
            <label className="table-sort">
              <ArrowDownAZ size={14} />
              <select
                aria-label="Ordenar campeões"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="cost">Por custo</option>
                <option value="name">Por nome</option>
                <option value="guides">Por presença nos guias</option>
              </select>
            </label>
          </>
        )}
        {tab === "items" && (
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
        )}
        <span className="database-results">
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
        <section className="pivot-augments">
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
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                {tab === "champions" ? (
                  <>
                    <th>Campeão</th>
                    <th>Custo</th>
                    <th>Características</th>
                    <th>Posição sugerida</th>
                    <th>Nos guias</th>
                    <th>Planejar</th>
                  </>
                ) : tab === "traits" ? (
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
              {tab === "champions"
                ? units.map((c, i) => (
                    <tr key={c.id}>
                      <td>{i + 1}</td>
                      <td>
                        <div className="table-unit">
                          <img
                            className={`cost-${c.cost}`}
                            src={portrait(c.id)}
                            alt=""
                          />
                          <strong>{c.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`cost-pill cost-${c.cost}`}>
                          <span className="coin-dot" />
                          {c.cost}
                        </span>
                      </td>
                      <td>
                        <div className="table-traits">
                          {c.traits.map((t) => (
                            <button
                              key={t}
                              onClick={() => setTrait(t)}
                              title={`Filtrar ${t}`}
                            >
                              <img src={traitIcon(t)} alt="" />
                              {t}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="muted-cell">{c.role}</td>
                      <td>
                        <span
                          className="usage-count"
                          title={`Presença em ${guides.length} guias curados`}
                        >
                          {usages(c.id).length}
                          <small>/{guides.length}</small>
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-plan-button"
                          onClick={() => onPlanner(c.id)}
                          aria-label={`Planejar com ${c.name}`}
                        >
                          <Plus size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                : tab === "traits"
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
          {!(tab === "champions"
            ? units.length
            : tab === "traits"
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
