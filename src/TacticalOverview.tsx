import type { Comp } from './data';
import { useState, type CSSProperties } from 'react';
import { byId, itemNames, portrait } from './data';
import { BoardPanel, Items, UnitStrip, equipmentFor } from './TftPanels';
import { ArrowRight, Crosshair } from 'lucide-react';
import { publishedBoard } from './board-preview.mjs';
import type { LevelContext } from './level-planner.mjs';
import { equipmentGroups } from './plan-summary.mjs';

type Mode = 'summary' | 'levels' | 'flex';
type Selection = { compId: string; mode: Mode; level: number | 'final'; variant: number };
const rosterColumns=(count:number)=>Math.max(1,Math.ceil(count/Math.ceil(Math.max(1,count)/9)));

function PlanEquipment({comp,referenceComp,title='Itens do plano'}:{comp:Comp;referenceComp?:Comp;title?:string}) {
 const groups=equipmentGroups(comp,byId,referenceComp?.pivot?.carries||comp.pivot?.carries);
 return <section className="zy-summary-equipment" aria-label={title}>
  <header><h3>{title}</h3></header>
  {groups.length?groups.map(group=><div className="zy-summary-equipment-group" key={group.key} data-equipment-group={group.key}>
   <h4>{group.label}</h4><div className="zy-summary-holder-list">{group.ids.map(id=><article className="zy-summary-holder" key={id} data-holder-id={id}>
    <img className={`zy-summary-holder-portrait cost-${byId[id].cost}`} src={portrait(id)} alt=""/>
    <strong>{byId[id].name}</strong>
    {equipmentFor(comp,id).length?<Items ids={equipmentFor(comp,id)}/>:<span className="zy-path-note">Sem itens definidos</span>}
   </article>)}</div>
  </div>):<p className="zy-path-note">Este plano ainda não tem itens definidos. Adicione-os no planejador.</p>}
 </section>;
}

/** Read-only guide exploration. Never changes the live level, shopping or saved plan. */
export function TacticalOverview({comp,referenceComp,onRestore,native=false,context}:{comp:Comp;referenceComp?:Comp;onRestore?:()=>void;native?:boolean;context?:Partial<LevelContext>}) {
 const guide=comp.pivot?comp:referenceComp?.pivot?referenceComp:undefined;
 const isAdjusted=Boolean(guide&&guide!==comp);
 const levels=guide?.pivot?.levels||[];
 const openers=guide?.pivot?.openers||[];
 const priority=guide?.pivot?.itemOrder||[];
 const flex=(guide?.pivot?.upgrades||[]).filter(id=>byId[id]&&!(guide||comp).champions.includes(id));
 const hasFlex=flex.length>0||levels.some(s=>s.variants.length>0);
 const goals=comp.champions.filter(id=>byId[id]&&comp.stars?.[id]===3);
 const initial:Selection={compId:comp.id,mode:'summary',level:'final',variant:-1};
 const [selection,setSelection]=useState<Selection>(initial);
 const requested=selection.compId===comp.id?selection:initial;
 const modeAvailable=requested.mode==='summary'||(requested.mode==='levels'?levels.length>0:hasFlex);
 const current={...requested,mode:modeAvailable?requested.mode:initial.mode,level:requested.level==='final'||levels.some(s=>s.level===requested.level)?requested.level:'final' as const};
 const select=(change:Partial<Selection>)=>setSelection({...current,...change});
 const step=current.mode==='summary'||current.level==='final'?undefined:levels.find(s=>s.level===current.level);
 const previous=step?levels.filter(s=>s.level<step.level).at(-1):undefined;
 const variants=step?.variants||[];
 const variantIndex=variants[current.variant]?current.variant:-1;
 const continuation=step?levels.filter(s=>s.level>step.level).slice(0,2):levels.slice(-2);
 const basePlan=current.mode==='summary'?comp:guide||comp;
 const baseUnits=step?.units||basePlan.champions;
 const variant=variants[variantIndex];
 const units=variant?baseUnits.map(id=>variant.find(s=>s.replaces===id)?.championId||id):baseUnits;
 const isFinal=!step;
 const preview:Comp=step?publishedBoard(guide||comp,byId,{level:step.level,units,swaps:variant,context}):basePlan;
 const bare={...comp,items:{},stars:{}};
 const entering=step&&previous?units.filter(id=>!previous.units.includes(id)):[];
 const leaving=step&&previous?previous.units.filter(id=>!units.includes(id)):[];
 const label=step?`Nível ${step.level}`:isAdjusted&&current.mode!=='summary'?'Equipe final do guia':'Equipe final';
 return <div className="zy-tactical-overview zy-plan-explorer" data-has-path={true} data-mode={current.mode}>
  <span className="visually-hidden" role="status">Prévia: {label}{variant?`, opção ${variantIndex+1}`:''}.</span>
  <div className="zy-plan-path">
   <nav className="zy-path-modes" aria-label="Explorar o plano">
    <button aria-pressed={current.mode==='summary'} onClick={()=>select({mode:'summary',level:'final',variant:-1})}>Resumo</button>
    {levels.length>0&&<button aria-pressed={current.mode==='levels'} onClick={()=>select({mode:'levels',variant:-1})}>Níveis</button>}
    {hasFlex&&<button aria-pressed={current.mode==='flex'} onClick={()=>select({mode:'flex',variant:-1})}>Flex</button>}
   </nav>
   {isAdjusted&&<div className="zy-path-reference">{current.mode==='summary'?'Plano ajustado. O roteiro original continua disponível em Níveis.':'Roteiro do guia PivotTFT. Seu plano ajustado pode ter outras peças.'}{onRestore&&<button className="zy-source-restore" onClick={onRestore}>Restaurar plano do guia</button>}</div>}
   {current.mode==='summary'?<div className="zy-comp-summary" aria-label="Resumo da composição">
    <h3>Plano de jogo</h3>
    <dl>{(guide||comp.style!=='Personalizada')&&<div><dt>{guide?'Estilo do guia':'Estilo'}</dt><dd>{guide?.style||comp.style}</dd></div>}{byId[comp.carry]&&comp.champions.includes(comp.carry)&&<div><dt>Carry principal</dt><dd className="zy-summary-carry"><img src={portrait(comp.carry)} alt=""/><strong>{byId[comp.carry].name}</strong></dd></div>}</dl>
    {(!openers.length||isAdjusted)&&<div className="zy-summary-roster"><h4>Equipe do plano</h4><UnitStrip comp={bare} ids={comp.champions.filter(id=>byId[id])}/></div>}
    <PlanEquipment comp={comp} referenceComp={guide}/>
    {goals.length>0&&<div className="zy-summary-goals"><h4>Metas finais de três estrelas</h4><UnitStrip comp={bare} ids={goals}/></div>}
    {openers.length>0&&<div className="zy-summary-start"><h4>Primeiras peças do guia</h4><UnitStrip comp={bare} ids={openers}/></div>}
    {levels.length>0&&<button className="zy-path-option" onClick={()=>select({mode:'levels',level:levels[0].level,variant:-1})}>Ver equipe por nível<ArrowRight size={14}/></button>}
   </div>:<>
    {levels.length>0&&<nav className="zy-path-levels" aria-label="Níveis do roteiro">{levels.map(s=><button key={s.level} aria-pressed={current.level===s.level} onClick={()=>select({level:s.level,variant:-1})}><strong>Nv. {s.level}</strong>{s.stage&&<span>{s.stage}</span>}</button>)}<button aria-pressed={current.level==='final'} onClick={()=>select({level:'final',variant:-1})}><strong>Final</strong></button></nav>}
    <div className="zy-path-content">
     <div className="zy-path-team" style={{'--zy-roster-columns':rosterColumns(units.length)} as CSSProperties} aria-label={step?`Equipe no nível ${step.level}`:'Equipe final do roteiro'}>
      <header><h3>{label}{variant?` · Opção ${variantIndex+1}`:''}</h3><span>{step?.stage||'Elenco do plano'}</span></header>
      <UnitStrip comp={preview} ids={units} showStars/>
     </div>
     {variants.length>0&&<div className="zy-path-options" aria-label="Alternativas publicadas"><button className="zy-path-option" aria-pressed={variantIndex===-1} onClick={()=>select({variant:-1})}>Equipe do guia <span>{variantIndex===-1?'Em prévia':'Ver tabuleiro'}</span></button>{variants.map((group,i)=><button className="zy-path-option" key={i} aria-pressed={variantIndex===i} onClick={()=>select({variant:i})}><span>{group.map(s=><span className="zy-swap" key={s.championId}><img src={portrait(s.replaces)} alt={byId[s.replaces]?.name}/><ArrowRight size={12}/><img src={portrait(s.championId)} alt={byId[s.championId]?.name}/><b>{byId[s.championId]?.name}</b></span>)}</span><span>{variantIndex===i?'Em prévia':'Ver opção'}</span></button>)}</div>}
     {current.mode==='flex'?<div className="zy-flex-options"><h3>{flex.length?'Opções para a equipe final':'Substituições por nível'}</h3>{flex.length>0?<><UnitStrip comp={bare} ids={flex}/><p className="zy-path-note">Peças flex publicadas no guia. Ajuste a equipe conforme os espaços disponíveis.</p></>:<p className="zy-path-note">{variants.length?'As substituições publicadas para este nível estão acima.':step?'Nenhuma substituição publicada para este nível. Consulte outra etapa do roteiro.':'Selecione um nível para consultar as substituições publicadas naquela etapa.'}</p>}</div>:<>
      {(entering.length>0||leaving.length>0)&&<div className="zy-path-transitions">{entering.length>0&&<div><span>Entram</span><UnitStrip comp={bare} ids={entering}/></div>}{leaving.length>0&&<div><span>Saem</span><UnitStrip comp={bare} ids={leaving}/></div>}<p>Prepare a troca antes de vender. A loja acompanha o nível confirmado da partida.</p></div>}
      {step&&(step.economy.reserve!==undefined||step.economy.floor!==undefined)&&<p className="zy-path-economy">{step.economy.reserve!==undefined?`Reserva do guia: ${step.economy.reserve} de ouro.`:`Limite do guia: ${step.economy.floor} de ouro.`}</p>}
      {continuation.length>0&&variants.length===0&&<div className="zy-path-continuation"><h3>{step?'Próximos níveis':'Outras etapas do guia'}</h3>{continuation.map(s=><button key={s.level} style={{'--zy-roster-columns':rosterColumns(s.units.length)} as CSSProperties} aria-label={`Consultar equipe no nível ${s.level}`} onClick={()=>select({level:s.level,variant:-1})}><span><b>Nível {s.level}</b><span>{s.stage}</span><ArrowRight size={12}/></span><UnitStrip comp={bare} ids={s.units}/></button>)}</div>}
      {basePlan.description&&<details className="zy-path-description"><summary>Como jogar esta comp</summary><p>{basePlan.description}</p></details>}
     </>}
    </div>
   </>}
  </div>
  <div className="zy-plan-field">
   <section className="zy-plan-board" aria-label="Posicionamento em consulta"><header><h3><Crosshair size={15}/>Posicionamento</h3><span>{label}{variant?' · Alternativa':''}</span></header><BoardPanel comp={preview} native={native}/><p className="zy-path-note">{isFinal?(basePlan.style==='Personalizada'?'Posições do seu plano.':basePlan.pivot?'Posicionamento do guia PivotTFT.':'Posicionamento sugerido. Ajuste no planejador.'):'Posicionamento sugerido para esta prévia.'} A consulta não altera sua partida.</p></section>
   {(priority.length>0||current.mode!=='summary')&&<div className="zy-plan-loadouts">
    {priority.length>0&&<section className="zy-plan-priority"><header><h3>{isAdjusted?'Prioridade de itens do guia':'Prioridade de itens'}</h3><span>Ordem do guia</span></header><ol>{priority.map((id,index)=><li key={id+index}><span className="zy-priority-number" aria-label={`Prioridade ${index+1}`}>{index+1}</span><Items ids={[id]}/><span className="zy-priority-name">{itemNames[id]}</span></li>)}</ol></section>}
    {current.mode!=='summary'&&<PlanEquipment comp={basePlan} title="Itens da equipe final"/>}
   </div>}
  </div>
 </div>;
}
