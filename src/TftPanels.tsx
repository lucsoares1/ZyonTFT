import { Crosshair, Star, Target } from "lucide-react";
import type { CSSProperties } from "react";
import {
  byId,
  portrait,
  itemNames,
  traitThresholds,
  traitIcon,
  type Comp,
} from "./data";
import { boardPositions } from "./planning.mjs";
export { itemNames } from "./data";
export function Items({
  ids,
  className = "",
}: {
  ids: string[];
  className?: string;
}) {
  return (
    <span className={`equipment ${className}`}>
      {ids.map((id, index) => (
        <img
          key={`${id}-${index}`}
          src={`./assets/items/${id}.png`}
          alt={itemNames[id]}
          title={itemNames[id]}
        />
      ))}
    </span>
  );
}
export function equipmentFor(comp: Comp, id: string) {
  return comp.items?.[id] || [];
}

export function UnitStrip({
  comp,
  ids = comp.champions,
  showStars = false,
}: {
  comp: Comp;
  ids?: string[];
  showStars?: boolean;
}) {
  return (
    <div className={`lineup-strip ${showStars ? "has-target-stars" : ""}`}>
      {ids.map((id) => (
        <div
          className={`lineup-unit ${equipmentFor(comp, id).length ? "has-equipment" : ""}`}
          key={id}
          title={byId[id]?.name}
        >
          {showStars && (
            <div className="lineup-stars">
              {comp.stars?.[id] === 3 && <Stars count={3} />}
            </div>
          )}
          <div className={`portrait-frame cost-${byId[id]?.cost || 1}`}>
            <img src={portrait(id)} alt={byId[id]?.name} />
          </div>
          <div className="mini-equipment">
            <Items ids={equipmentFor(comp, id)} />
          </div>
          <span>{byId[id]?.name}</span>
        </div>
      ))}
    </div>
  );
}
export function Stars({ count = 0 }: { count?: number }) {
  return (
    <span className={`unit-stars ${count === 3 ? "gold-stars" : ""}`}>
      {Array.from({ length: count }, (_, i) => (
        <Star key={i} size={13} fill="currentColor" strokeWidth={2.5} />
      ))}
    </span>
  );
}
export function BoardPanel({
  comp,
  native = false,
  onCellClick,
  onUnitDrop,
  selectedCell,
  pinned = false,
}: {
  comp: Comp;
  native?: boolean;
  onCellClick?: (cell: number) => void;
  onUnitDrop?: (id: string, cell: number) => void;
  selectedCell?: number;
  pinned?: boolean;
}) {
  const traits = Object.entries(
    comp.champions.reduce<Record<string, number>>((map, id) => {
      for (const trait of byId[id]?.traits || [])
        map[trait] = (map[trait] || 0) + 1;
      return map;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const positions = new Map<number, string>(
    Object.entries(boardPositions(comp, byId)).map(([id, pos]) => [
      pos as number,
      id,
    ]),
  );
  return (
    <section
      className={`tft-board-panel ${native ? "native-board-panel" : ""}`}
      aria-label="Preview do tabuleiro"
    >
      <div className="board-panel-heading">
        <div>
          <Crosshair size={15} />
          <strong>{comp.name}</strong>
        </div>
        <span>{comp.champions.length} unidades</span>
      </div>
      <div className="tft-board-content">
        <aside className="trait-stack">
          {traits.slice(0, 6).map(([trait, count]) => {
            return (
              <div
                className={`trait-line ${count >= (traitThresholds[trait]?.[0] || 99) ? "trait-active" : ""}`}
                key={trait}
              >
                <span className="trait-emblem">
                  <img src={traitIcon(trait)} alt="" />
                </span>
                <b>{count}</b>
                <span>{trait}</span>
              </div>
            );
          })}
          <div className="trait-divider" />
          <div className="trait-note">
            <Target size={13} />
            <span>
              Carry principal
              <br />
              <strong>{byId[comp.carry]?.name || comp.name}</strong>
            </span>
          </div>
        </aside>
        <div className="tft-board-grid">
          <div className="tft-board-lattice">
            {Array.from({ length: 4 }, (_, row) => (
              <div
                className={`tft-board-row ${row % 2 ? "shift-row" : ""}`}
                style={{ "--row": row } as CSSProperties}
                key={row}
              >
                {Array.from({ length: 7 }, (_, col) => {
                  const id = positions.get(row * 7 + col);
                  const cell = row * 7 + col;
                  const Cell = onCellClick ? "button" : "div";
                  return (
                    <Cell
                      className={`tft-hex ${id ? "occupied" : ""} ${id === comp.carry ? "carry-hex" : ""} ${selectedCell === cell ? "cell-selected" : ""}`}
                      key={col}
                      title={
                        id
                          ? `${byId[id]?.name}${
                              equipmentFor(comp, id).length
                                ? ` · ${equipmentFor(comp, id)
                                    .map((item) => itemNames[item])
                                    .join(", ")}`
                                : ""
                            }`
                          : `Casa ${cell + 1}`
                      }
                      aria-label={
                        onCellClick
                          ? `Casa ${cell + 1}${id ? ` · ${byId[id]?.name}` : " · vazia"}`
                          : undefined
                      }
                      onClick={() => onCellClick?.(cell)}
                      draggable={Boolean(onUnitDrop && id)}
                      onDragStart={(e) => {
                        if (id) e.dataTransfer.setData("text/plain", id);
                      }}
                      onDragOver={(e) => {
                        if (onUnitDrop) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onUnitDrop?.(
                          e.dataTransfer.getData("text/plain"),
                          cell,
                        );
                      }}
                    >
                      {id ? (
                        <>
                          <div
                            className={`hex-portrait cost-${byId[id]?.cost || 1}`}
                          >
                            <img src={portrait(id)} alt={byId[id]?.name} />
                          </div>

                          <span className="hex-unit-name">
                            {byId[id]?.name}
                          </span>
                          <Stars count={comp.stars?.[id]} />
                          <Items
                            ids={equipmentFor(comp, id)}
                            className="hex-equipment"
                          />
                        </>
                      ) : (
                        <span className="empty-hex" />
                      )}
                    </Cell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="board-panel-footer">
        <span>{native || pinned ? "Plano fixado" : "Plano local"}</span>
        <span>
          {comp.placement === "manual"
            ? "Posições do seu plano"
            : "Posições sugeridas"}{" "}
          · traits sem bônus
        </span>
      </div>
    </section>
  );
}
