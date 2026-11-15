import {ArrowRight, Check, BookOpen} from "lucide-react";
import {byId, splash, type Comp} from "./data";
import {CompTierBadge} from "./CompTier";
import {BrandMark} from "./Brand";
import {Items} from "./TftPanels";

export function CompSpotlight({comp,selected,onOpen,onSelect}: {
  comp:Comp;selected:boolean;onOpen:()=>void;onSelect:()=>void;
}) {
  return <section className="comp-spotlight" aria-label="Composição em foco">
    <div className="spotlight-art" style={{backgroundImage:`url(${splash(comp.carry)})`}} />
    <div className="spotlight-copy">
      <span className="spotlight-context"><CompTierBadge comp={comp}/>{selected ? "Seu plano para a partida" : "Conheça esta composição"}</span>
      <h2>{comp.name}</h2>
      <p><strong>{byId[comp.carry]?.name}</strong><span>{comp.style}</span><span>{comp.champions.length} campeões</span></p>
      <div className="spotlight-equipment"><Items ids={comp.items?.[comp.carry]||[]}/><span>Itens do carry</span></div>
      <div className="spotlight-actions">
        <button className="spotlight-primary" onClick={onOpen}><BookOpen size={15}/>Explorar plano<ArrowRight size={15}/></button>
        <button className={selected?"spotlight-selected":""} onClick={onSelect} aria-pressed={selected}><BrandMark/>{selected ? <><Check size={13}/>No seu overlay</> : "Escolher esta comp"}</button>
      </div>
    </div>
  </section>;
}
