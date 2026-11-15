import {ChevronRight, Layers3, Route, Monitor} from "lucide-react";
import {byId,portrait,splash,type Comp} from "./data";
import {BrandMark} from "./Brand";

export function SidebarComp({comp,onTeam,onRoute,onOverlay}: {
  comp?:Comp;onTeam:()=>void;onRoute:()=>void;onOverlay:()=>void;
}) {
  return <section className="sidebar-comp" aria-label="Atalhos do plano escolhido">
    {comp ? <>
      <button className="sidebar-comp-cover" onClick={onTeam} title={`Ver equipe de ${comp.name}`}>
        <div className="sidebar-comp-art-frame"><img className="sidebar-comp-art" src={splash(comp.carry)} alt=""/></div>
        <img className="sidebar-comp-compact-art" src={portrait(comp.carry)} alt=""/>
        <div className="sidebar-comp-copy">
          <span className="sidebar-comp-label"><BrandMark/>Sua comp</span>
          <strong>{comp.name}</strong><small>{comp.style}</small>
        </div>
      </button>
      <div className="sidebar-comp-roster">{comp.champions.map(id=><img key={id} src={portrait(id)} title={byId[id]?.name} alt={byId[id]?.name} className={`cost-${byId[id]?.cost}`}/>)}</div>
      <div className="sidebar-comp-links">
        <button onClick={onTeam} title="Abrir equipe escolhida"><Layers3 size={14}/><span>Ver equipe</span><ChevronRight size={12}/></button>
        <button onClick={onRoute} title="Abrir progressão da comp"><Route size={14}/><span>Plano de nível</span><ChevronRight size={12}/></button>
      </div>
    </> : <div className="sidebar-comp-empty"><BrandMark/><strong>Seu próximo plano</strong><p>Escolha uma comp na biblioteca para preparar sua partida.</p></div>}
    <button className="sidebar-game-action" onClick={onOverlay} title="Configurar overlay"><Monitor size={15}/><span>Pronto para jogar</span><ChevronRight size={12}/></button>
  </section>;
}
