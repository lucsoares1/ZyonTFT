import { useMemo } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Coins,
  Heart,
  RotateCw,
  SlidersHorizontal,
} from "lucide-react";
import { byId, portrait, type Comp } from "./data";
import { BoardPanel, Items } from "./TftPanels";
import {LevelRail} from "./LevelRail";
import { boardPositions } from "./planning.mjs";
import {
  planForLevel,
  shopRules,
  costOdds,
  unitSlots,
  type LevelContext,
} from "./level-planner.mjs";

function LevelUnits({
  ids,
  temporary = [],
  copies = {},
  targets = [],
  compact = false,
}: {
  ids: string[];
  temporary?: string[];
  copies?: Record<string, number>;
  targets?: string[];
  compact?: boolean;
}) {
  return (
    <div className={`level-units ${compact ? "level-units-compact" : ""}`}>
      {ids.map((id) => (
        <div className="level-unit" key={id} data-unit={id}>
          <div className={`level-portrait cost-${byId[id].cost}`}>
            <img src={portrait(id)} alt="" />
            <b>{byId[id].cost}</b>
          </div>
          <span>
            {byId[id].name}
            <small>
              {targets.includes(id)
                ? `${copies[id] || 0}/9 · buscar 3★`
                : temporary.includes(id)
                  ? "Temporário"
                  : unitSlots(id) > 1
                    ? "Final · 2 espaços"
                    : "Plano final"}
            </small>
          </span>
        </div>
      ))}
    </div>
  );
}

export function LevelGuide({
  comp,
  value,
  onChange,
  timeline = false,
}: {
  comp: Comp;
  value: LevelContext;
  onChange: (value: LevelContext) => void;
  timeline?: boolean;
}) {
  const plan = useMemo(() => planForLevel(comp, byId, value), [comp, value]);
  const { context, strategy, team, decision } = plan;
  const update = (change: Partial<LevelContext>) =>
    onChange({ ...context, ...change });
  const preview = useMemo(() => {
    const catalog = Object.fromEntries(
      Object.entries(byId).map(([id, c]) => [
        id,
        {
          ...c,
          role: shopRules.units[id]?.frontline
            ? "Linha de frente"
            : "Retaguarda",
        },
      ]),
    );
    const base = {
      ...comp,
      champions: team.ids,
      carry: team.carry || comp.carry,
      items: plan.equipment,
      stars: Object.fromEntries(
        team.ids.map((id) => [
          id,
          context.copies[id] >= 9
            ? 3
            : context.copies[id] >= 3
              ? 2
              : context.copies[id] > 0
                ? 1
                : 0,
        ]),
      ),
    };
    return {
      ...base,
      positions: boardPositions(base, catalog) as Record<string, number>,
    };
  }, [comp, team, plan.equipment, context.copies]);
  const editable = [
    ...new Set([...strategy.targets, ...strategy.ids, ...team.temporary]),
  ];
  return (
    <section className="level-guide" aria-label="Plano adaptativo por nível">
      <header className="level-guide-heading">
        <div>
          <h3>Plano de nível</h3>
          <p>
            {strategy.reroll
              ? `Reroll de custo ${strategy.cost} · nível ${strategy.targetLevel}`
              : `Evolução até o nível ${strategy.targetLevel}`}
            <span> · {comp.name}</span>
          </p>
        </div>
        <span className="manual-context">
          <SlidersHorizontal size={13} /> Situação manual
        </span>
      </header>
      <LevelRail levels={[2,3,4,5,6,7,8,9,10]} value={context.level} target={strategy.targetLevel}
        onChange={level=>update({level})} trackClass="level-selector" label="Nível da partida"/>
      <div className="level-context">
        <label>
          <Coins size={13} /> Ouro{" "}
          <input
            aria-label="Ouro disponível"
            type="number"
            min="0"
            max="999"
            value={context.gold}
            onChange={(e) => update({ gold: Number(e.target.value) })}
          />
        </label>
        <label>
          <Heart size={13} /> Vida{" "}
          <input
            aria-label="Vida atual"
            type="number"
            min="1"
            max="200"
            value={context.hp}
            onChange={(e) => update({ hp: Number(e.target.value) })}
          />
        </label>
        <label>
          Tabuleiro{" "}
          <select
            aria-label="Força do tabuleiro"
            value={context.strength}
            onChange={(e) =>
              update({ strength: e.target.value as LevelContext["strength"] })
            }
          >
            <option value="stable">Estável</option>
            <option value="weak">Perdendo muito</option>
          </select>
        </label>
      </div>
      <div className="level-layout">
        <div className="level-team-section">
          <div className="level-section-title">
            <h4>Equipe sugerida no nível {context.level}</h4>
            <span>
              {team.slots}/{context.level} espaços
            </span>
          </div>
          <div className="guide-board level-board">
            <BoardPanel comp={preview} />
          </div>
          <LevelUnits
            ids={team.ids}
            temporary={team.temporary}
            copies={context.copies}
            targets={strategy.targets}
          />
          {!team.ids.length && (
            <p>
              Adicione campeões à comp no planejador para gerar uma evolução.
            </p>
          )}
          <p className="level-team-caption">
            Monte esta base conforme as peças aparecerem. Mantenha suas unidades
            melhoradas até os substitutos estarem prontos.
          </p>
        </div>
        <div className="level-actions">
          <div
            className={`level-decision decision-${decision.kind}`}
            role="status"
          >
            <span>
              {decision.kind === "roll" ? (
                <RotateCw size={21} />
              ) : decision.kind === "level" ? (
                <ArrowUpRight size={22} />
              ) : decision.kind === "stabilize" ? (
                <Heart size={20} />
              ) : (
                <Coins size={20} />
              )}
            </span>
            <div>
              <h4>{decision.title}</h4>
              <p>{plan.instruction}</p>
              <details className="level-reason">
                <summary>Por que seguir este plano?</summary>
                <p>{decision.text}</p>
              </details>
            </div>
          </div>
          <div
            className="shop-odds"
            aria-label={`Chances por custo no nível ${context.level}`}
          >
            <span>Loja no nível {context.level}</span>
            <div>
              {plan.odds.map((n, i) => (
                <span key={i} className={`odds-cost-${i + 1}`}>
                  <i />
                  {i + 1}
                  <b>{n}%</b>
                </span>
              ))}
            </div>
            <small>
              Chance por espaço de cada custo, não de um campeão específico.
            </small>
          </div>

          <section className="level-search">
            <h4>Procurar neste nível</h4>
            <ol className="level-priorities">
              {plan.priorities.map((p) => (
                <li key={p.id}>
                  <img src={portrait(p.id)} alt="" />
                  <span>
                    <strong>{byId[p.id].name}</strong>
                    <small>{p.reason}</small>
                  </span>
                </li>
              ))}
            </ol>
            <p>
              {strategy.reroll && context.level >= strategy.targetLevel
                ? "Priorize os alvos de 3★ e as melhorias que estabilizam o time."
                : "Compre nas lojas naturais. A recomendação acima indica se vale gastar em rolagens."}
            </p>
            <details className="level-all-search">
              <summary>Ver todas as oportunidades deste nível</summary>
              <LevelUnits
                ids={plan.search}
                temporary={team.temporary}
                copies={context.copies}
                targets={strategy.targets}
                compact
              />
            </details>
            {!plan.search.length && (
              <p>As melhorias informadas para este time estão completas.</p>
            )}
          </section>
          <section className="level-transitions">
            <h4>
              {context.level === 2
                ? "Sua primeira equipe"
                : `Transição: nível ${context.level - 1} → ${context.level}`}
            </h4>
            <p>Comparação entre as equipes sugeridas dos dois níveis.</p>
            <div className="transition-group">
              <strong>Entram</strong>
              {plan.entering.length ? (
                <LevelUnits
                  ids={plan.entering}
                  temporary={team.temporary}
                  compact
                />
              ) : (
                <span>Mantenha o núcleo atual.</span>
              )}
            </div>
            {!!plan.leaving.length && (
              <div className="transition-group leaving">
                <strong>Saem quando a troca estiver pronta</strong>
                <LevelUnits
                  ids={plan.leaving}
                  temporary={plan.leaving.filter(
                    (id) => !strategy.ids.includes(id),
                  )}
                  compact
                />
              </div>
            )}
            {!plan.leaving.length && context.level > 2 && (
              <p className="retain-note">
                <Check size={13} /> Mantenha as unidades do nível anterior.
              </p>
            )}
            {!!plan.leaving.length && (
              <p className="retain-note">
                Compre o substituto antes de vender o portador dos itens.
                Compare estrelas e sinergias antes de confirmar a troca.
              </p>
            )}
          </section>
          {!!plan.later.length && (
            <details className="level-later">
              <summary>
                <ChevronDown size={14} /> Deixar para depois ·{" "}
                {plan.later.length} unidades
              </summary>
              <div>
                {plan.later.map((id) => (
                  <div key={id}>
                    <img src={portrait(id)} alt="" />
                    <span>
                      {byId[id].name}
                      <small>
                        Custo {byId[id].cost} ·{" "}
                        {costOdds(context.level, byId[id].cost)}% agora
                      </small>
                    </span>
                    <b>Nv. {[0, 2, 3, 5, 8, 9][byId[id].cost]}</b>
                  </div>
                ))}
              </div>
              <p>
                Se encontrar antes, informe uma cópia abaixo. Não gaste rerolls
                só para caçá-las neste nível.
              </p>
            </details>
          )}
        </div>
      </div>
      {!!plan.transfers.length && (
        <section className="level-item-route">
          <h4>Quem segura os itens agora</h4>
          <div>
            {plan.transfers.map((t) => (
              <div key={t.target} className="item-route">
                <Items ids={t.items} />
                <span>
                  {t.holder ? byId[t.holder].name : "Reserve os itens"}
                  <small>
                    {t.holder === t.target ? (
                      "Portador final"
                    ) : (
                      <>
                        <ArrowRight size={11} /> {byId[t.target].name} quando a
                        transição estiver pronta
                      </>
                    )}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <details className="level-inventory">
        <summary>
          <SlidersHorizontal size={15} /> Cópias e disputa do núcleo{" "}
          <span>Ajustar partida</span>
        </summary>
        <p>
          Conte também as cópias combinadas: 2★ = 3 cópias; 3★ = 9. Peças já
          encontradas podem entrar antes do nível recomendado. Estes números são
          independentes da lista de compras lateral.
        </p>
        {strategy.reroll && (
          <label className="contested-control">
            <input
              type="checkbox"
              checked={context.contested}
              onChange={(e) => update({ contested: e.target.checked })}
            />{" "}
            Outros jogadores também estão buscando meu núcleo de 3★
          </label>
        )}
        <div className="level-copy-grid">
          {editable.map((id) => (
            <label key={id}>
              <img src={portrait(id)} alt="" />
              <span>
                {byId[id].name}
                <small>
                  {strategy.targets.includes(id)
                    ? "Alvo de 3★"
                    : team.temporary.includes(id)
                      ? "Temporário"
                      : "Plano final"}
                </small>
              </span>
              <input
                type="number"
                aria-label={`Cópias de ${byId[id].name}`}
                min="0"
                max="9"
                value={context.copies[id] || 0}
                onChange={(e) =>
                  update({
                    copies: { ...context.copies, [id]: Number(e.target.value) },
                  })
                }
              />
            </label>
          ))}
        </div>
        <button
          className="level-reset"
          onClick={() => update({ copies: {}, contested: false })}
        >
          Zerar cópias e disputa desta comp
        </button>
      </details>
      {timeline && (
        <section className="level-roadmap">
          <h4>Evolução completa</h4>
          {Object.entries(plan.teams)
            .filter(([n]) => Number(n) >= 4)
            .map(([n, t]) => (
              <button
                key={n}
                onClick={() => update({ level: Number(n) })}
                aria-label={`Ver equipe do nível ${n}`}
              >
                <b>{n}</b>
                <span>
                  {t.ids.map((id) => (
                    <img
                      key={id}
                      src={portrait(id)}
                      alt={byId[id].name}
                      title={byId[id].name}
                    />
                  ))}
                </span>
                <small>{t.slots} espaços</small>
                <ArrowRight size={14} />
              </button>
            ))}
        </section>
      )}
      {!!plan.notes.length && (
        <div className="level-notes">
          {plan.notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
      <footer className="level-rules-note">
        Roteiro sugerido pelo Zyon a partir das informações manuais. Não lê seu
        tabuleiro ou a reserva dos adversários.{" "}
        <a href={shopRules.source} target="_blank" rel="noreferrer">
          Chances da loja · Set 18 / {shopRules.patch}
        </a>
      </footer>
    </section>
  );
}
