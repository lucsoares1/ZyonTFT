import { TacticalOverview } from "./TacticalOverview";
import { LevelGuide } from "./LevelGuide";
import type { LevelContext } from "./level-planner.mjs";
import { ArrowRight, Coins, ExternalLink } from "lucide-react";
import { allItems, byId, itemNames, portrait, type Comp } from "./data";
import { Items, equipmentFor } from "./TftPanels";
import { summarizePlan } from "./plan-summary.mjs";
import { PivotGuide, BuildSwitch, ItemOrder, AugmentGuide } from "./PivotGuide";
import {CarryBuildStats} from './CompPerformance';

export type GuideTab =
  "overview" | "items" | "units" | "progression" | "augments";
export const guideTabs: { id: GuideTab; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "items", label: "Itens" },
  { id: "units", label: "Unidades" },
  { id: "progression", label: "Progressão" },
  { id: "augments", label: "Aprimoramentos" },
];
const itemById = Object.fromEntries(allItems.map((item) => [item.id, item]));

export function ComponentNeeds({ comp }: { comp: Comp }) {
  const summary = summarizePlan(comp, byId, allItems);
  return (
    <div className="component-needs">
      {summary.components.map(([id, count]) => (
        <span key={id} title={`${itemNames[id]}: ${count} no plano`}>
          <Items ids={[id]} />
          <b>×{count}</b>
        </span>
      ))}
      {!summary.components.length && (
        <p className="guide-empty">
          Adicione itens no planejador para ver os componentes.
        </p>
      )}
    </div>
  );
}

export function ItemRecipe({ id }: { id: string }) {
  const recipe = itemById[id]?.recipe || [];
  return (
    <div className="item-recipe">
      <Items ids={[id]} />
      <div>
        <strong>{itemNames[id] || id}</strong>
        {recipe.length ? (
          <span className="recipe-parts">
            <Items ids={recipe} />
            <small>{recipe.map((part) => itemNames[part]).join(" + ")}</small>
          </span>
        ) : (
          <small>{itemById[id]?.category || "Item do plano"}</small>
        )}
      </div>
    </div>
  );
}

export function CompGuide({
  comp,
  referenceComp,
  onRestore,
  tab,
  onPlanner,
  levelContext,
  onLevelContext,
  builds = [],
  onBuild = () => {},
}: {
  comp: Comp;
  referenceComp?: Comp;
  onRestore?:()=>void;
  builds?: Comp[];
  onBuild?: (id: string) => void;
  tab: GuideTab;
  onPlanner: () => void;
  levelContext: LevelContext;
  onLevelContext: (value: LevelContext) => void;
}) {
  const summary = summarizePlan(comp, byId, allItems);
  const published=comp.pivot?comp:referenceComp?.pivot?referenceComp:undefined;
  const source=comp.source||published?.source;
  return (
    <div
      key={tab}
      className="comp-guide"
      role="tabpanel"
      aria-label={guideTabs.find((t) => t.id === tab)?.label}
    >
      <BuildSwitch comp={comp} builds={builds} onBuild={onBuild} />
      {tab!=='overview'&&published&&published!==comp&&<div className="zy-path-reference">Seu plano tem ajustes de elenco. As recomendações desta aba acompanham esses ajustes.{onRestore&&<button className="zy-source-restore" onClick={onRestore}>Restaurar plano do guia</button>}</div>}
      {tab === "overview" && <><TacticalOverview comp={comp} referenceComp={published} onRestore={onRestore} context={levelContext}/>{published&&<details className="zy-route-disclosure"><summary>Consultar roteiro por nível e transições{published!==comp?' do guia original':''}</summary><PivotGuide comp={published} context={levelContext}/></details>}</>}
      {tab === "items" && (
        <div className="guide-items-view">
          <CarryBuildStats comp={comp}/>
          <ItemOrder comp={comp} />
          <div className="guide-section-intro">
            <div>
              <h3>Equipamentos por unidade</h3>
              <p>Receitas dos itens definidos neste plano.</p>
            </div>
            <button onClick={onPlanner}>
              Editar itens <ArrowRight size={13} />
            </button>
          </div>
          {summary.holders.map((id) => (
            <section className="holder-loadout" key={id}>
              <div className="holder-heading">
                <img
                  src={portrait(id)}
                  alt=""
                  className={`cost-${byId[id].cost}`}
                />
                <div>
                  <strong>{byId[id].name}</strong>
                  <span>
                    {id === comp.carry ? "Carry principal" : byId[id].role}
                  </span>
                </div>
              </div>
              <div className="holder-recipes">
                {equipmentFor(comp, id).map((item, i) => (
                  <ItemRecipe key={`${item}-${i}`} id={item} />
                ))}
              </div>
            </section>
          ))}
          {!summary.holders.length && (
            <p className="guide-empty">
              Este plano ainda não tem itens. Escolha uma unidade no planejador
              para equipá-la.
            </p>
          )}
          <section className="guide-components">
            <h3>Lista total de componentes</h3>
            <ComponentNeeds comp={comp} />
          </section>
        </div>
      )}
      {tab === "units" && (
        <div className="guide-units-view">
          <div className="guide-section-intro">
            <div>
              <h3>Núcleo da composição</h3>
              <p>Função, características e equipamentos de cada unidade.</p>
            </div>
            <span>
              <Coins size={15} /> {summary.totalCost} de ouro{" "}
              <small>1 cópia de cada</small>
            </span>
          </div>
          <div className="guide-unit-table">
            <table>
              <thead>
                <tr>
                  <th>Campeão</th>
                  <th>Custo</th>
                  <th>Função</th>
                  <th>Características</th>
                  <th>Itens</th>
                </tr>
              </thead>
              <tbody>
                {comp.champions
                  .filter((id) => byId[id])
                  .map((id) => (
                    <tr key={id}>
                      <td>
                        <img
                          src={portrait(id)}
                          alt=""
                          className={`cost-${byId[id].cost}`}
                        />
                        <strong>{byId[id].name}</strong>
                      </td>
                      <td>
                        <Coins size={11} /> {byId[id].cost}
                      </td>
                      <td>
                        {id === comp.carry ? "Carry principal" : byId[id].role}
                      </td>
                      <td>{byId[id].traits.join(" · ")}</td>
                      <td>
                        <Items ids={equipmentFor(comp, id)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "progression" && (
        <LevelGuide
          comp={comp}
          value={levelContext}
          onChange={onLevelContext}
          timeline
        />
      )}
      {tab === "augments" && <AugmentGuide comp={comp} />}
      <footer className="guide-source">
        <span>
          {published
            ? "Equipes, trocas e posições finais: PivotTFT. Adaptação e posições intermediárias: Zyon."
            : "Roteiro e posições sugeridos pelo Zyon."}
        </span>
        {source ? (
          <a href={source.url} target="_blank" rel="noreferrer">
            {published!==comp&&comp.style==='Personalizada'?'Guia original · ':''}{source.name} · Patch {source.patch} · Conferida em{" "}
            {source.checkedAt.split("-").reverse().join("/")}{" "}
            <ExternalLink size={12} />
          </a>
        ) : (
          <span>Plano personalizado</span>
        )}
      </footer>
    </div>
  );
}
