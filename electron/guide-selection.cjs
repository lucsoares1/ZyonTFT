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
  const guarded={...next,saved:{...next.saved,pinned:state.saved?.pinned,active:state.saved?.active,selected:state.selected}};
  for(const key of ['pinned','baseGuideComp','guideComp','comp','compName','selected'])guarded[key]=state[key];
  return guarded;
}
module.exports={chooseGuideComposition,guardCompositionPublication};
