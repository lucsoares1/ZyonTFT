import { useContext } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import {
  allAugments,
  byId,
  portrait,
  type Comp,
  type Performance,
} from "./data";
import { PivotAugmentContext } from "./PivotGuide";
import { compAugments } from "./comp-augments.mjs";
import { Items } from "./TftPanels";
const percent = (n: number) =>
  `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const decimal = (n: number) =>
  n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function PerformanceNumbers({ value }: { value: Performance }) {
  return (
    <dl className="performance-numbers" aria-label="Estatísticas da composição">
      <div data-metric="average" title="Colocação média. Quanto menor, melhor.">
        <dt>Média</dt>
        <dd>{decimal(value.average)}</dd>
      </div>
      {value.pickRate !== undefined && (
        <div data-metric="pick" title="Participação nos tabuleiros da amostra Emerald+.">
          <dt>Escolha</dt>
          <dd>{percent(value.pickRate)}</dd>
        </div>
      )}
      <div data-metric="win" title="Partidas encerradas em primeiro lugar.">
        <dt>1º lugar</dt>
        <dd>{percent(value.winRate)}</dd>
      </div>
      <div data-metric="top4" title="Partidas encerradas entre os quatro primeiros.">
        <dt>Top 4</dt>
        <dd>{percent(value.top4)}</dd>
      </div>
    </dl>
  );
}
export function CompPerformance({ comp }: { comp: Comp }) {
  const s = comp.style !== "Personalizada" ? comp.pivot?.statistics : undefined;
  if (!s?.performance)
    return (
      <span className="performance-missing">
        {comp.style === "Personalizada"
          ? "Plano personalizado"
          : "Sem amostra publicada"}
      </span>
    );
  return (
    <div
      className="comp-performance"
      title={`PivotTFT · ${s.ranks} · Patch ${s.patch} · ${s.performance.games.toLocaleString("pt-BR")} partidas · Amostra de ${new Date(s.made * 1000).toLocaleString("pt-BR")}`}
    >
      <PerformanceNumbers value={s.performance} />
      <span className="performance-sample">
        <b>PivotTFT · {s.ranks}</b>
        {s.performance.games.toLocaleString("pt-BR")} partidas
      </span>
    </div>
  );
}
export function PerformanceSource({ comp }: { comp: Comp }) {
  const statistics = comp.style !== "Personalizada" ? comp.pivot?.statistics : undefined;
  if (!statistics?.performance) return null;
  return <span className="zy-performance-source" title={`Patch ${statistics.patch} · Amostra de ${new Date(statistics.made * 1000).toLocaleString("pt-BR")}`}>
    PivotTFT · {statistics.ranks} · {statistics.performance.games.toLocaleString("pt-BR")} partidas
  </span>;
}
export function CompactAugments({
  comp,
  onOpen,
}: {
  comp: Comp;
  onOpen: () => void;
}) {
  const catalog = useContext(PivotAugmentContext),
    guide = compAugments(comp, catalog, allAugments);
  const ids = guide.ids.slice(0, 3);
  if (!ids.length) return null;
  return (
    <span
      className="row-augment-preview"
      aria-label="Aprimoramentos recomendados"
    >
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          aria-label={`Ver aprimoramento ${allAugments[id].name}`}
          title={`${allAugments[id].name}${guide.adapted ? " · Guia-base" : ""}`}
        >
          {allAugments[id].icon ? (
            <img src={`./assets/augments/${id}.png`} alt="" draggable={false} />
          ) : (
            <Sparkles size={18} aria-hidden="true" />
          )}
        </button>
      ))}
    </span>
  );
}
export function CarryBuildStats({ comp }: { comp: Comp }) {
  const s = comp.style !== "Personalizada" ? comp.pivot?.statistics : undefined;
  if (!s?.itemBuilds.length) return null;
  const ids = [...new Set(s.itemBuilds.map((b) => b.championId))];
  return (
    <section
      className="carry-build-statistics"
      aria-label="Estatísticas dos itens dos carries"
    >
      <header>
        <div>
          <h3>Itens dos carries</h3>
          <p>Compare os conjuntos completos por campeão.</p>
        </div>
        <span>Emerald+ · {s.patch}</span>
      </header>
      <div className="carry-build-cards">
        {ids.map((id) => (
          <section key={id} className="carry-build-group">
            <h4>
              <img src={portrait(id)} alt="" />
              <span>
                {byId[id]?.name || id}
                <small>Conjuntos de três itens</small>
              </span>
            </h4>
            <table>
              <caption className="sr-only">
                Estatísticas de conjuntos para {byId[id]?.name || id}
              </caption>
              <thead>
                <tr>
                  <th>Itens</th>
                  <th>Média</th>
                  <th>Top 4</th>
                  <th>Partidas</th>
                </tr>
              </thead>
              <tbody>
                {s.itemBuilds
                  .filter((b) => b.championId === id)
                  .map((b, i) => (
                    <tr
                      className="carry-build-result"
                      data-best={i===0||undefined}
                      key={`${b.items.join("-")}-${i}`}
                    >
                      <td>
                        <Items ids={b.items} />
                      </td>
                      <td>{decimal(b.average)}</td>
                      <td>{percent(b.top4)}</td>
                      <td>{b.games.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <footer>
        <span>
          Dados do campeão em todas as comps · mínimo de 100 partidas por
          conjunto.
        </span>
        <a href={comp.source?.url} target="_blank" rel="noreferrer">
          PivotTFT <ExternalLink size={12} aria-hidden="true" />
        </a>
      </footer>
    </section>
  );
}
