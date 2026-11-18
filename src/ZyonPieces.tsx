import { type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Flag, Star } from 'lucide-react';
import { BrandMark } from './Brand';
import { byId, portrait, splash, traitIcon, type Comp } from './data';
import { CompTierBadge } from './CompTier';
import { Items, UnitStrip, equipmentFor } from './TftPanels';
import { CompactAugments } from './CompPerformance';
import {traitCounts} from './level-planner.mjs';

const rarity = ['#a4aeb9', '#a4aeb9', '#60bd92', '#51a9eb', '#b78aef', '#efc46b', '#ee906c'];
export function HexUnit({comp,id,items=true}:{comp:Comp;id:string;items?:boolean}) {
  const unit=byId[id];
  if(!unit)return null;
  return <div className="zy-piece" style={{'--piece-rarity':rarity[Math.min(unit.cost,6)]} as CSSProperties} title={`${unit.name} · Custo ${unit.cost}${comp.stars?.[id]?` · ${comp.stars[id]} estrelas`:''}`}>
    <div className="zy-piece-frame"><img src={portrait(id)} alt={unit.name} draggable={false}/><span className="zy-piece-name">{unit.name}</span></div>
    {comp.stars?.[id]===3&&<span className="zy-piece-stars" aria-label="Meta de três estrelas">{[0,1,2].map(n=><Star key={n} size={10} fill="currentColor"/>)}</span>}
    {items&&<Items ids={equipmentFor(comp,id)} className="zy-piece-items"/>}
  </div>;
}
export function HexRoster({comp,ids=comp.champions,items=true}:{comp:Comp;ids?:string[];items?:boolean}) {
  return <div className="zy-hex-roster">{ids.map(id=><HexUnit key={id} comp={comp} id={id} items={items}/>)}</div>;
}
export function TraitRail({comp}:{comp:Comp}) {
  const counts=traitCounts(comp.champions,byId);
  return <div className="zy-traits" aria-label="Características da equipe, sem emblemas">{Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([trait,count])=><span key={trait} title={`${trait}: ${count} pontos, sem emblemas`}><img src={traitIcon(trait)} alt={trait}/><b>{count}</b></span>)}</div>;
}
export function CompArtwork({comp}:{comp:Comp}) {
  return <div className="zy-comp-artwork">
    <img className="zy-comp-scene" src={splash(comp.carry)} alt="" loading="lazy" draggable={false}/>
    <div className="zy-comp-emblem"><img src={portrait(comp.carry)} alt={byId[comp.carry]?.name||''} draggable={false}/></div>
    <div className="zy-comp-art-caption"><strong>{byId[comp.carry]?.name}</strong><span>{comp.style}</span></div>
    <CompTierBadge comp={comp}/>
  </div>;
}
export function CompactRoster({comp}:{comp:Comp}) {
  const flex=comp.pivot?.upgrades.filter(id=>!comp.champions.includes(id))||[];
  const total=comp.champions.length+flex.length;
  return <div className="zy-compact-roster" style={{'--total-units':total,'--has-flex':flex.length>0?1:0} as CSSProperties}>
    <div className="zy-core-group"><span className="zy-roster-label">Núcleo da comp</span><UnitStrip comp={comp} showStars/></div>
    {flex.length>0&&<div className="zy-flex-group"><span className="zy-roster-label">Flex</span><UnitStrip comp={{...comp,items:{},stars:{}}} ids={flex} showStars/></div>}
  </div>;
}
export function CompFace({comp,onOpen,onPin,onAugments,expanded=false,pinned=false,children}:{comp:Comp;onOpen:()=>void;onPin?:()=>void;onAugments:()=>void;expanded?:boolean;pinned?:boolean;children?:ReactNode}) {
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button, a, input, select')) return;
    onOpen();
  }
  return <div className="zy-comp-face zy-compact-face zy-reference-face" onClick={handleCardClick}>
    <div className="zy-reference-art" data-carry={comp.carry}><img src={splash(comp.carry)} alt="" draggable={false} loading="lazy"/></div>
    <div className="zy-reference-identity">
      <button type="button" className="zy-comp-title" aria-expanded={expanded} aria-label={`${expanded?'Recolher':'Expandir'} ${comp.name}`} onClick={event=>{event.stopPropagation();onOpen();}}><strong>{comp.name}</strong></button>
      <div className="zy-reference-meta">
        <span className="zy-style-tag" title={comp.style}>{comp.style.replace(/\s*·\s*nível\s*/iu,' ')}</span>
        {comp.pivot?.finalLevel&&<span className="zy-level-tag"><Flag size={11}/>Nv. {comp.pivot.finalLevel}</span>}
        <CompactAugments comp={comp} onOpen={onAugments}/>
      </div>
      <TraitRail comp={comp}/>
    </div>
    <div className="zy-reference-roster"><CompactRoster comp={comp}/></div>
    <div className="zy-reference-decision">{children}<button type="button" className={`zy-comp-disclosure zy-comp-select ${pinned?'is-pinned':''}`} aria-pressed={pinned} aria-label={pinned?`Remover ${comp.name} do overlay`:`Selecionar ${comp.name} para o overlay`} title={pinned?'Comp selecionada para o overlay · Clique para remover':'Selecionar comp para o overlay'} onClick={event=>{event.stopPropagation();(onPin||onOpen)();}}><BrandMark/></button></div>
  </div>;
}
