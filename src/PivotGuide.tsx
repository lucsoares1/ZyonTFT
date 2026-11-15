import { createContext, useContext, useEffect, useState } from "react";
import { ExternalLink, ShieldCheck, Search, Sparkles } from "lucide-react";
import {
  allAugments,
  allItems,
  byId,
  itemNames,
  pivotSnapshot,
  portrait,
  type Comp,
  type PivotLevel,
} from "./data";
import { summarizePlan } from "./plan-summary.mjs";
import { BoardPanel, Items, UnitStrip } from "./TftPanels";
import { boardPositions } from "./planning.mjs";
import { costOdds, teamSlots } from "./level-planner.mjs";
import { CompTierBadge } from "./CompTier";
import {augmentCatalog,compAugments} from './comp-augments.mjs';
import "./pivot-guide.css";

const names = (ids: string[]) => ids.map((id) => byId[id]?.name).join(", ");
export const PivotTiersContext = createContext(pivotSnapshot.tiers);
export const PivotAugmentContext = createContext(augmentCatalog(pivotSnapshot));
export function BuildSwitch({
  comp,
  builds,
  onBuild,
}: {
  comp: Comp;
  builds: Comp[];
  onBuild: (id: string) => void;
}) {
  if (!comp.pivot || builds.length < 2) return null;
  return (
    <nav className="pivot-builds" aria-label="Variações da composição">
      {builds.map((b) => (
        <button
          key={b.id}
          aria-pressed={b.id === comp.id}
          onClick={() => onBuild(b.id)}
        >
          <CompTierBadge comp={b} />
          {b.pivot?.build}
        </button>
      ))}
    </nav>
  );
}
export function ItemOrder({ comp }: { comp: Comp }) {
  if (!comp.pivot?.itemOrder.length) return null;
  return (
    <section className="pivot-item-order">
      <h3>Ordem de montagem</h3>
      <ol>
        {comp.pivot.itemOrder.map((id, i) => (
          <li key={`${id}-${i}`}>
            <b>{i + 1}</b>
            <Items ids={[id]} />
            <span>{itemNames[id]}</span>
          </li>
        ))}
      </ol>
      <p>
        Prioridade da build. Adapte aos componentes que encontrar e evite deixar
        o portador sem itens.
      </p>
    </section>
  );
}
export function AugmentGuide({ comp }: { comp: Comp }) {
  const [query,setQuery]=useState("");
  const [tier,setTier]=useState("all");
  const catalog=useContext(PivotAugmentContext);
  const guide=compAugments(comp,catalog,allAugments);
  const recommended:string[]=guide.ids;
  useEffect(()=>{setQuery('');setTier('all');},[comp.id,guide.source?.id]);
  const currentTiers = useContext(PivotTiersContext);
  const tiers = new Map(currentTiers.augments.map((a) => [a.id, a.tier]));
  const shown=recommended.filter(id=>(tier==="all"||tiers.get(id)===tier)&&
    (allAugments[id]?.name||id).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const focus: Record<string, string> = {
    econ: "Economia e experiência",
    items: "Itens e componentes",
    combat: "Força de combate",
    traits: "Características",
      emblem: "Emblemas",
    reroll: "Cópias e rolagens",
  };
  return (
    <section className="pivot-augments">
      <h3>Aprimoramentos para esta build</h3>
      <p>{guide.adapted?<>Referência de <strong>{guide.source?.name}</strong> para seu plano adaptado. Compare com as peças e itens que você mudou.</>:<>Escolhas para <strong>{comp.name}</strong>. Compare com suas peças e itens antes de escolher.</>}</p>
      {guide.source?.url&&<a className="augment-guide-source" href={guide.source.url} target="_blank" rel="noreferrer">PivotTFT · Patch {guide.source.patch}<ExternalLink size={12}/></a>}
      <div className="augment-focus">{guide.focus.map(f=><span key={f}><Sparkles size={12}/>{focus[f]||f}</span>)}</div>
      {recommended.length>0 && <div className="augment-toolbar">
        <label className="search-field"><Search size={15}/><input aria-label="Buscar aprimoramento da comp" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Encontre um aprimoramento"/></label>
        <select aria-label="Tier de aprimoramento da comp" value={tier} onChange={e=>setTier(e.target.value)}><option value="all">Todos os tiers</option>{[...new Set(recommended.map(id=>tiers.get(id)).filter(Boolean))].map(t=><option key={t} value={t}>Tier {t}</option>)}</select>
      </div>}
      <div className="pivot-augment-list">
        {shown.map((id) => {
          const a = allAugments[id];
          return (
            <div key={id}>
              {a?.icon ? (
                <img src={`./assets/augments/${id}.png`} alt="" />
              ) : (
                <ShieldCheck size={28} />
              )}
              <span>
                <strong>{a?.name || id}</strong>
                <small>
                  {a?.unresolved
                    ? "Nome da fonte; sem correspondência no catálogo Riot"
                    : guide.adapted?"Recomendado no guia-base":"Recomendado para esta build"}
                </small>
              </span>
              {tiers.get(id) && (
                <b title="Tier editorial do PivotTFT">{tiers.get(id)}</b>
              )}
            </div>
          );
        })}
      </div>
      {!!recommended.length&&!shown.length&&<p>Nenhum aprimoramento corresponde à busca. <button className="game-text-action" onClick={()=>{setQuery("");setTier("all");}}>Limpar filtros</button></p>}
      {!recommended.length && (
          <p>{guide.source?'O guia desta build não publicou recomendações de aprimoramentos.':'Esta composição não tem um guia do PivotTFT vinculado. Planos criados a partir de uma build mantêm as recomendações da origem.'}</p>
      )}
    </section>
  );
}
function StepDetails({
  comp,
  step,
  previous,
  live = false,
}: {
  comp: Comp;
  step: PivotLevel;
  previous?: PivotLevel;
  live?: boolean;
}) {
  const entering = step.units.filter((id) => !previous?.units.includes(id));
  const leaving =
    previous?.units.filter((id) => !step.units.includes(id)) || [];
  const scarce = step.units.filter(
    (id) => byId[id].cost >= 4 && step.level < (byId[id].cost === 5 ? 9 : 8),
  );
  const capacity = teamSlots(step.units);
  return (
    <div className="pivot-step-detail">
      <div className="pivot-step-heading">
        <strong>Nível {step.level}</strong>
        {step.stage && <span>Rodada {step.stage}</span>}
        <small>{capacity} espaços</small>
      </div>
      {!!Object.keys(step.economy).length && (
        <p className="pivot-economy">
          {step.economy.reserve !== undefined &&
            `Reserve ${step.economy.reserve} de ouro. `}
          {step.economy.floor !== undefined &&
            `Referência de rolagem: parar em ${step.economy.floor} de ouro. `}
          {step.economy.until && `Prepare a rodada ${step.economy.until}. `}
          Reavalie com sua vida e força do tabuleiro.
        </p>
      )}
      <UnitStrip comp={{ ...comp, items: {} }} ids={step.units} />
      <div className="pivot-changes">
        <p>
          <b>Entram</b> {names(entering) || "Mantenha a equipe."}
        </p>
        {!!leaving.length && (
          <p>
            <b>Saem</b> {names(leaving)}
          </p>
        )}
      </div>
      {!!step.swaps.length && (
        <div className="pivot-swaps">
          <h4>Trocas desta etapa</h4>
          {step.swaps.map((s, i) => (
            <p key={i}>
              <img src={portrait(s.championId)} alt="" />
              <strong>{byId[s.championId].name}</strong>
              <span>no lugar de {byId[s.replaces].name}</span>
            </p>
          ))}
        </div>
      )}
      {!!step.variants.length && (
        <div className="pivot-alternatives">
          <h4>Se não encontrar as peças</h4>
          {step.variants.map((group, i) => (
            <p key={i}>
              <b>Opção {i + 1}</b>
              {group
                .map(
                  (s) =>
                    `${byId[s.championId].name} no lugar de ${byId[s.replaces].name}`,
                )
                .join("; ")}
              .
            </p>
          ))}
        </div>
      )}
      {!!scarce.length && (
        <p className="pivot-caution">
          {names(scarce)}: compre se aparecer naturalmente. A chance de custo{" "}
          {byId[scarce[0]].cost} é {costOdds(step.level, byId[scarce[0]].cost)}%
          por espaço neste nível; não gaste rerolls perseguindo essa peça.
        </p>
      )}
      {capacity > step.level && (
        <p className="pivot-caution">
          Referência com {capacity} espaços: exige capacidade extra. Sem ela,
          use a equipe adaptativa em {live ? "Agora" : "Progressão"}.
        </p>
      )}
      {!!leaving.length && (
        <small>
          Compre o substituto antes de vender. Preserve um portador 2★ até a
          troca ficar pronta.
        </small>
      )}
    </div>
  );
}
export function PivotGuide({
  comp,
  level = 3,
  compact = false,
  wide = false,
}: {
  comp: Comp;
  level?: number;
  compact?: boolean;
  wide?: boolean;
}) {
  const [selected, setSelected] = useState<number | "final">(
    compact ? Math.max(3, level) : "final",
  );
  useEffect(() => {
    if (compact) setSelected(Math.max(3, level));
  }, [level, compact, comp.id]);
  const guide = comp.pivot;
  if (!guide) return null;
  const step =
    selected === "final"
      ? null
      : guide.levels.filter((s) => s.level <= selected).at(-1) ||
        guide.levels[0];
  const previous = step
    ? guide.levels.filter((s) => s.level < step.level).at(-1)
    : undefined;
  const preview = step
    ? {
        ...comp,
        name: `${comp.name} · nível ${step.level}`,
        champions: step.units,
        carry: step.units.includes(comp.carry)
          ? comp.carry
          : step.units.find((id) => byId[id].role === "Retaguarda") ||
            step.units[0],
        items: {},
        positions: undefined,
        stars: {},
      }
    : comp;
  if (step)
    preview.positions = boardPositions(preview, byId) as Record<string, number>;
  const needsEmblem = [
    ...new Set(
      Object.values(comp.items || {})
        .flat()
        .filter((id): id is string => Boolean(id?.includes("Emblem"))),
    ),
  ];
  const routeDetails = step ? (
    <StepDetails comp={comp} step={step} previous={previous} live={compact} />
  ) : (
    <div className="pivot-final-note">
      <h3>Seu destino: nível {guide.finalLevel}</h3>
      <p>{comp.description}</p>
      {teamSlots(comp.champions) > guide.finalLevel && (
        <p className="pivot-caution">
          A lista completa ocupa {teamSlots(comp.champions)} espaços. Ela inclui
          peças para uma equipe com capacidade extra; confira o plano adaptativo
          para o limite normal.
        </p>
      )}
      <p>
        Escolha um nível acima para ver quem entra, quem sai e as alternativas.
      </p>
    </div>
  );
  return (
    <div
      className={`pivot-guide ${compact ? "pivot-compact" : ""} ${wide ? "pivot-wide" : ""}`}
    >
      <div className="pivot-route-main">
        <nav className="pivot-levels" aria-label="Equipe do roteiro">
          <button
            aria-pressed={selected === "final"}
            onClick={() => setSelected("final")}
          >
            Final
          </button>
          {guide.levels.map((s) => (
            <button
              key={s.level}
              aria-pressed={step?.level === s.level}
              onClick={() => setSelected(s.level)}
            >
              {s.level}
            </button>
          ))}
        </nav>
        {compact && (
          <p className="pivot-live-caption">
            Nível atual: {level}.{" "}
            {selected !== "final" && step?.level === Math.max(3, level)
              ? "Roteiro acompanha o nível da partida."
              : "Consultando outra etapa."}
            {level === 2
              ? " No nível 2, use duas peças da abertura e guarde a terceira."
              : ""}
          </p>
        )}
        {(!compact || wide) && (
          <>
            <BoardPanel comp={preview} native={compact} />
            <p className="pivot-position-caption">
              {step
                ? "Equipe e alternativas: PivotTFT. Posições desta etapa: sugestão Zyon."
                : "Posicionamento final: PivotTFT."}
            </p>
          </>
        )}
        {!wide && routeDetails}
        {compact && !wide && (
          <details className="pivot-board-disclosure">
            <summary>
              Ver posicionamento{" "}
              {step ? "sugerido para esta etapa" : "final da fonte"}
            </summary>
            <BoardPanel comp={preview} native />
          </details>
        )}
        {!compact && (
          <section className="pivot-timeline">
            <h3>Do início ao time final</h3>
            {guide.levels.map((s, i) => (
              <details key={s.level} open={s.level === 3}>
                <summary>
                  <b>Nível {s.level}</b>
                  <span>{s.stage ? `Rodada ${s.stage}` : "Abertura"}</span>
                  <small>
                    {names(
                      s.units.filter(
                        (id) => !guide.levels[i - 1]?.units.includes(id),
                      ),
                    )}
                  </small>
                </summary>
                <StepDetails
                  comp={comp}
                  step={s}
                  previous={guide.levels[i - 1]}
                />
              </details>
            ))}
          </section>
        )}
      </div>
      <aside className="pivot-route-aside">
        {wide && routeDetails}
        <section>
          <h3>Quando seguir esta rota</h3>
          <p>
            {guide.opening?.rounds.length
              ? `Avalie a abertura entre as rodadas ${guide.opening.rounds.join(" e ")}. `
              : "Avalie suas primeiras lojas. "}
            {guide.opening?.pairs
              ? "Pares na abertura favorecem esta rota. "
              : "Procure uma frente 2★ e um portador de itens. "}
            {guide.opening?.highHealth
              ? "Preserve vida para chegar ao núcleo caro. "
              : ""}
          </p>
          <UnitStrip comp={{ ...comp, items: {} }} ids={guide.openers} />
          {!!guide.opening?.components.length && (
            <>
              <p>Componentes indicados na abertura:</p>
              <div className="component-needs">
                {guide.opening.components.map((id) => (
                  <span key={id} title={itemNames[id]}>
                    <Items ids={[id]} />
                    {guide.opening?.counts?.[id] && (
                      <b>×{guide.opening.counts[id]}</b>
                    )}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
        {!!needsEmblem.length && (
          <section>
            <h3>Emblemas da equipe final</h3>
            <Items ids={needsEmblem} />
            <p>
              Confira esses emblemas antes de comprometer a rota. Sem eles,
              escolha uma variação que feche suas características.
            </p>
          </section>
        )}
        <ItemOrder comp={comp} />
        <section>
          <h3>Componentes do plano</h3>
          <div className="component-needs">
            {summarizePlan(comp, byId, allItems).components.map(
              ([id, count]) => (
                <span key={id} title={itemNames[id]}>
                  <Items ids={[id]} />
                  <b>×{count}</b>
                </span>
              ),
            )}
          </div>
        </section>
        <section>
          <h3>Se a rota ficar disputada</h3>
          <p>
            Compare as outras builds da família e preserve seu portador
            melhorado. Itens e peças em comum reduzem o custo da transição.
          </p>
        </section>
        {!!guide.upgrades.length && (
          <section>
            <h3>Expansões sugeridas</h3>
            <UnitStrip comp={{ ...comp, items: {} }} ids={guide.upgrades} />
          </section>
        )}
        <a href={comp.source?.url} target="_blank" rel="noreferrer">
          Guia completo no PivotTFT <ExternalLink size={12} />
        </a>
      </aside>
    </div>
  );
}
