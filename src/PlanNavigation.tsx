import {Layers3,Swords,Sparkles,Route,CheckSquare} from 'lucide-react';
import type {GuideTab} from './CompGuide';
export function PlanNavigation({enabled,onOpen,onPreparation}:{enabled:boolean;onOpen:(tab:GuideTab)=>void;onPreparation:()=>void}){
 return <nav className="plan-navigation" aria-label="Categorias do plano"><span className="nav-group-label">Seu plano</span>{([['units','Equipe',Layers3],['items','Itens dos carries',Swords],['progression','Progressão',Route],['augments','Aprimoramentos',Sparkles]] as const).map(([id,label,Icon])=><button key={id} disabled={!enabled} onClick={()=>onOpen(id)} title={label} aria-label={id==='augments'?'Aprimoramentos para esta comp':label}><Icon size={17}/><span>{label}</span></button>)}<button disabled={!enabled} onClick={onPreparation} title="Preparação" aria-label="Preparação"><CheckSquare size={17}/><span>Preparação</span></button></nav>;
}
