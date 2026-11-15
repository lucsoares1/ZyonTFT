import {useMemo,useState} from 'react';
import {Check,Search,ArrowRight,Layers3} from 'lucide-react';
import {byId,portrait,type Comp} from './data';
import {CompTierBadge} from './CompTier';
const searchable=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function OverlayComps({state}:{state:any}){
  const [query,setQuery]=useState(''),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
  const comps:Comp[]=state.saved?.comps||[];
  const matches=useMemo(()=>{const term=searchable(query.trim());return comps.filter(c=>searchable(`${c.name} ${c.style} ${c.champions.map(id=>byId[id]?.name||'').join(' ')}`).includes(term));},[comps,query]);
  async function choose(id:string){
    setBusy(id);setError('');
    try{if(!await window.zyon?.chooseComp(id))setError('Não foi possível trocar a composição. Tente novamente.');}
    catch{setError('Não foi possível trocar a composição. Tente novamente.');}
    finally{setBusy(null);}
  }
  return <section className="overlay-comp-library" aria-label="Composições no overlay">
    <header><div><h2>Qual é o próximo plano?</h2><p>Troque a comp sem sair do jogo. Nível, ouro e compras continuam acompanhados.</p></div><Layers3 size={22}/></header>
    <label className="overlay-comp-search"><Search size={16}/><input aria-label="Buscar composição no overlay" placeholder="Buscar comp ou campeão" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {error&&<p className="duo-error" role="alert">{error}</p>}
    <div className="overlay-comp-results" aria-live="polite">{matches.length} {matches.length===1?'composição':'composições'}</div>
    <div className="overlay-comp-grid">{matches.map(c=>{
      const selected=c.id===state.pinned;
      return <button key={c.id} className="overlay-comp-option" data-comp={c.id} data-current={selected||undefined} aria-label={`${selected?'Composição atual':'Usar composição'} ${c.name}`} disabled={selected||busy!==null} onClick={()=>choose(c.id)}>
        <img className="overlay-comp-carry" src={portrait(c.carry)} alt="" loading="lazy"/>
        <div className="overlay-comp-option-info"><strong title={c.name}>{c.name}</strong><small>{c.style} · {c.champions.length} campeões</small></div>
        <CompTierBadge comp={c}/>
        <div className="overlay-comp-units">{c.champions.map(id=><img key={id} className={`cost-${byId[id]?.cost}`} src={portrait(id)} alt={byId[id]?.name} loading="lazy"/>)}</div>
        <span className="overlay-comp-pick">{selected?<><Check size={13}/>Usando agora</>:busy===c.id?'Trocando…':<>Usar esta comp<ArrowRight size={13}/></>}</span>
      </button>;
    })}</div>
    {!matches.length&&<p className="overlay-comp-empty">Nenhuma comp encontrada. Busque pelo nome de outro campeão ou composição.</p>}
  </section>;
}
