import type {CSSProperties} from "react";
import {ChevronLeft, ChevronRight, Flag, Radio} from "lucide-react";

/** A plan browser only. Its owner decides whether the current level follows OCR. */
export function LevelRail({levels,value,onChange,live,target,label,trackClass="",buttonLabel}: {
  levels:number[];value:number|null;onChange:(level:number)=>void;live?:number|null;
  target?:number;label:string;trackClass?:string;buttonLabel?:(level:number)=>string;
}) {
  const index=value===null?-1:levels.indexOf(value);
  const phase=value===null?"Referência final":value<5?"Construa sua base":target&&value>=target?"Complete o núcleo":"Prepare a transição";
  return <section className="level-navigator" aria-label={label}>
    <header className="level-rail-heading">
      <div><span>{value===null?"Equipe completa":"Nível em consulta"}</span><strong key={value}>{value===null?<Flag size={20}/>:value}<small>{phase}</small></strong></div>
      <div className="level-rail-arrows">
        <button aria-label="Consultar nível anterior" disabled={index<=0} onClick={()=>onChange(levels[index-1])}><ChevronLeft size={16}/></button>
        <button aria-label="Consultar próximo nível" disabled={index===levels.length-1} onClick={()=>onChange(levels[index+1])}><ChevronRight size={16}/></button>
      </div>
    </header>
    <div className={`level-rail-track ${trackClass}`} role="group" aria-label={label}
      style={{"--rail-count":levels.length,"--rail-index":Math.max(0,index),"--rail-visible":index<0?0:1} as CSSProperties}>
      {levels.map(level=><button type="button" key={level} aria-label={buttonLabel?.(level)||`Nível ${level}`}
        aria-pressed={value===level} data-live={live===level||undefined} data-target={target===level||undefined}
        title={`${level===live?"Nível atual no jogo. ":""}${level===target?"Núcleo do plano. ":""}Consultar nível ${level}`}
        onClick={()=>onChange(level)}><b>{level}</b>{target===level&&<Flag size={9} aria-hidden="true"/>}</button>)}
    </div>
    <footer className="level-rail-legend"><span>Início</span><span>Transição</span><span>Fechamento</span></footer>
    {live!=null&&<p className="level-rail-live"><Radio size={11}/>No jogo: nível {live}<span>A consulta não altera a leitura</span></p>}
  </section>;
}
