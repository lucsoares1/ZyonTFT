import { Crosshair, Plus, Star, Target } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  byId,
  portrait,
  itemById,
  itemNames,
  traitThresholds,
  traitIcon,
  type Comp,
} from "./data";
import { boardPositions } from "./planning.mjs";
import {traitCounts} from './level-planner.mjs';
export { itemNames } from "./data";

function renderHighlightedText(text: string) {
  const parts = text.split(/(\+?\d+(?:,\d+)?%?(?:s\b)?)/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? <b key={idx}>{part}</b> : part,
  );
}

function ItemTooltip({
  id,
  x,
  y,
  above,
}: {
  id: string;
  x: number;
  y: number;
  above: boolean;
}) {
  const info = itemById[id];
  if (!info) return null;
  const clampedX = Math.max(156, Math.min(window.innerWidth - 156, x));
  const style: CSSProperties = above
    ? { left: clampedX, bottom: window.innerHeight - y + 10 }
    : { left: clampedX, top: y + 10 };
  return createPortal(
    <div
      className={`zy-item-tooltip ${above ? "is-above" : "is-below"}`}
      style={style}
      role="tooltip"
    >
      <div className="zy-item-tooltip-head">
        <img
          className="zy-item-tooltip-icon"
          src={`./assets/items/${id}.png`}
          alt=""
        />
        <div className="zy-item-tooltip-meta">
          <strong>{info.name}</strong>
          {info.recipe.length === 2 ? (
            <div className="zy-item-tooltip-craft" aria-label="Receita">
              <span className="zy-craft-slot">
                <img
                  src={`./assets/items/${info.recipe[0]}.png`}
                  alt={itemNames[info.recipe[0]] || ""}
                />
              </span>
              <span className="zy-craft-plus">+</span>
              <span className="zy-craft-slot">
                <img
                  src={`./assets/items/${info.recipe[1]}.png`}
                  alt={itemNames[info.recipe[1]] || ""}
                />
              </span>
            </div>
          ) : (
            <span className="zy-item-tooltip-cat">{info.category}</span>
          )}
        </div>
      </div>
      {info.stats.length > 0 && (
        <div className="zy-item-tooltip-stats">
          {info.stats.map((stat, i) => (
            <span key={i}>{stat}</span>
          ))}
        </div>
      )}
      {info.desc && (
        <div className="zy-item-tooltip-desc">
          {info.desc.split("\n").map((line, i) => (
            <p key={i}>{renderHighlightedText(line)}</p>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

export function Items({
  ids,
  className = "",
}: {
  ids: string[];
  className?: string;
}) {
  const [tip, setTip] = useState<{
    id: string;
    x: number;
    y: number;
    above: boolean;
  } | null>(null);
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, [tip]);
  return (
    <span className={`equipment ${className}`}>
      {ids.map((id, index) => (
        <img
          key={`${id}-${index}`}
          src={`./assets/items/${id}.png`}
          alt={itemNames[id]}
          title={itemById[id] ? undefined : itemNames[id]}
          onMouseEnter={(e) => {
            if (!itemById[id]) return;
            const r = e.currentTarget.getBoundingClientRect();
            const above = r.top > 180;
            setTip({
              id,
              x: r.left + r.width / 2,
              y: above ? r.top : r.bottom,
              above,
            });
          }}
          onMouseLeave={() => setTip(null)}
        />
      ))}
      {tip && <ItemTooltip {...tip} />}
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
  pointerEditing = false,
  traitProgress = false,
}: {
  comp: Comp;
  native?: boolean;
  onCellClick?: (cell: number) => void;
  onUnitDrop?: (id: string, cell: number) => void;
  selectedCell?: number;
  pinned?: boolean;
  pointerEditing?: boolean;
  traitProgress?: boolean;
}) {
  const board = useRef<HTMLElement>(null);
  const gesture = useRef<{id:string;x:number;y:number;active:boolean;target:number|null}|null>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{id:string;target:number|null}|null>(null);
  const traits = Object.entries(traitCounts(comp.champions,byId)).sort((a,b)=>b[1]-a[1]);
  const positions = new Map<number, string>(
    Object.entries(boardPositions(comp, byId)).map(([id, pos]) => [
      pos as number,
      id,
    ]),
  );
  return (
    <section
      ref={board}
      className={`tft-board-panel ${native ? "native-board-panel" : ""} ${pointerEditing ? "pointer-board" : ""} ${drag ? "is-moving-unit" : ""}`}
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
                  <b>{traitProgress?`${count} / ${traitThresholds[trait]?.find(threshold=>threshold>count)??traitThresholds[trait]?.at(-1)??count}`:count}</b>
                <span>{trait}</span>
              </div>
            );
          })}
          <div className="trait-divider" />
          {comp.champions.includes(comp.carry)&&<div className="trait-note">
            <Target size={13} />
            <span>
              Carry principal
              <br />
              <strong>{byId[comp.carry]?.name || comp.name}</strong>
            </span>
          </div>}
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
                      className={`tft-hex ${id ? "occupied" : ""} ${id === comp.carry ? "carry-hex" : ""} ${selectedCell === cell ? "cell-selected" : ""} ${drag?.id===id ? "drag-origin" : ""} ${drag?.target===cell ? "drop-target" : ""}`}
                      data-board-cell={cell}
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
                      onClick={() => {if(suppressClick.current){suppressClick.current=false;return;}onCellClick?.(cell);}}
                      draggable={Boolean(!pointerEditing && onUnitDrop && id)}
                      onPointerDown={e=>{
                        if(!pointerEditing||!onUnitDrop||!id||e.button!==0)return;
                        suppressClick.current=false;
                        gesture.current={id,x:e.clientX,y:e.clientY,active:false,target:cell};
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={e=>{
                        const g=gesture.current;if(!g)return;
                        if(!g.active&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<7)return;
                        g.active=true;
                        const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-board-cell]');
                        const target=hit&&board.current?.contains(hit)?Number(hit.dataset.boardCell):null;
                        if(!drag||g.target!==target){g.target=target;setDrag({id:g.id,target});}
                      }}
                      onPointerUp={e=>{
                        const g=gesture.current;gesture.current=null;setDrag(null);
                        if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
                        if(g?.active){suppressClick.current=true;if(g.target!==null&&g.target!==cell)onUnitDrop?.(g.id,g.target);}
                      }}
                      onPointerCancel={()=>{if(!pointerEditing)return;gesture.current=null;setDrag(null);suppressClick.current=false;}}
                      onLostPointerCapture={()=>{if(gesture.current){gesture.current=null;setDrag(null);}}}
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
                            <img src={portrait(id)} alt={byId[id]?.name} draggable={false} />
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
                        <span className="empty-hex">{pointerEditing&&<Plus size={18}/>}</span>
                      )}
                      {drag?.target===cell&&drag.id!==id&&<span className="hex-drop-preview"><img src={portrait(drag.id)} alt="" draggable={false}/><span>{id?'Trocar posições':'Mover aqui'}</span></span>}
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
