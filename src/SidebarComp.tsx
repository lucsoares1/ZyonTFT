import {useRef,useState} from 'react';
import {Bookmark,ChevronRight} from 'lucide-react';
import {portrait,type Comp} from './data';
import type {GuideTab} from './CompGuide';
import {PlanNavigation} from './PlanNavigation';
export function SidebarComp({comp,onTeam,onOpen,onPreparation}:{comp?:Comp;onTeam:()=>void;onRoute:()=>void;onOverlay:()=>void;onOpen:(tab:GuideTab)=>void;onPreparation:()=>void}){
 const menu=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:98,top:310});
 const close=()=>menu.current?.hidePopover();
 return <div className="zy-plan-dock">
  <button className="zy-plan-dock-trigger" popoverTarget="zyon-plan-menu" disabled={!comp} aria-label="Abrir categorias do plano escolhido" title={comp?.name||'Escolha uma composição'} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setPosition({left:r.right+16,top:Math.max(16,Math.min(r.top,window.innerHeight-430))})}}>
   <Bookmark size={20}/><span>Meu plano</span>
  </button>
  <div ref={menu} id="zyon-plan-menu" popover="auto" className="zy-plan-menu" style={position}>
   {comp&&<header><img src={portrait(comp.carry)} alt=""/><div><strong>{comp.name}</strong><span>Plano escolhido no overlay</span></div></header>}
   <button className="zy-plan-open" onClick={()=>{close();onOpen('overview')}}>Abrir composição<ChevronRight size={16}/></button>
   <PlanNavigation enabled={!!comp} onOpen={tab=>{close();onOpen(tab)}} onPreparation={()=>{close();onPreparation()}}/>
  </div>
 </div>;
}
