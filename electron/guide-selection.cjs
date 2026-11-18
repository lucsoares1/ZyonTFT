function chooseGuideComposition(state,id,effectiveComp,catalog) {
  if(typeof id!=='string')return null;
  const base=state.saved?.comps?.find(c=>c.id===id);
  if(!base)return null;
  const comp=effectiveComp(base,state.overlayPlans?.[id],catalog);
  const selected=comp.champions;
  return {...state,pinned:id,baseGuideComp:base,guideComp:comp,comp,compName:comp.name,selected,
    compSelectionRevision:(state.compSelectionRevision||0)+1,
    saved:{...state.saved,pinned:id,active:id,selected}};
}
function guardCompositionPublication(state,next) {
  if((next.compSelectionRevision||0)>=(state.compSelectionRevision||0))return next;
  const guarded={...next,saved:{...next.saved,comps:state.saved?.comps,pinned:state.saved?.pinned,active:state.saved?.active,selected:state.selected}};
  for(const key of ['pinned','baseGuideComp','guideComp','comp','compName','selected'])guarded[key]=state[key];
  return guarded;
}
function commitPlannerComposition(state,incoming,effectiveComp,catalog){
  const base=state.saved?.comps?.find(comp=>comp.id===incoming?.id);
  if(!base||!Array.isArray(incoming.champions)||incoming.champions.length>28||incoming.champions.some(id=>typeof id!=='string'||!Object.hasOwn(catalog,id)))return null;
  const champions=[...new Set(incoming.champions)];
  const entries=field=>Object.fromEntries(champions.filter(id=>incoming[field]?.[id]!==undefined).map(id=>[id,incoming[field][id]]));
  const positions=Object.fromEntries(Object.entries(entries('positions')).filter(([,position])=>Number.isInteger(position)&&position>=0&&position<28));
  const stars=Object.fromEntries(Object.entries(entries('stars')).filter(([,count])=>[1,2,3].includes(count)));
  const items=Object.fromEntries(Object.entries(entries('items')).map(([id,value])=>[id,(Array.isArray(value)?value:[]).filter(item=>typeof item==='string'&&/^[a-zA-Z0-9_]+$/.test(item)).slice(0,3)]));
  const comp={...base,name:String(incoming.name||base.name).slice(0,80),champions,carry:champions.includes(incoming.carry)?incoming.carry:champions[0]||base.carry,positions,stars,items,placement:'manual',style:'Personalizada',pivot:undefined,source:undefined,strategy:undefined};
  const previous=state.overlayPlans?.[comp.id];
  const overlayPlans={...state.overlayPlans};
  if(previous?.requests?.length||previous?.traits?.length)overlayPlans[comp.id]={...previous,champions,goals:Object.fromEntries(champions.map(id=>[id,stars[id]===3?9:3])),excluded:[...new Set([...(previous.excluded||[]),...base.champions.filter(id=>!champions.includes(id))])]};
  else delete overlayPlans[comp.id];
  const saved={...state.saved,comps:state.saved.comps.map(value=>value.id===comp.id?comp:value),overlayPlans};
  return chooseGuideComposition({...state,saved,overlayPlans},comp.id,effectiveComp,catalog);
}
module.exports={chooseGuideComposition,guardCompositionPublication,commitPlannerComposition};
