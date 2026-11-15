const unique=(ids,catalog)=>[...new Set(Array.isArray(ids)?ids:[])].filter(id=>catalog[id]).slice(0,28);
const goal=n=>[0,1,3,9].includes(Number(n))?Number(n):3;
export function normalizeWorkingPlan(base,value,catalog){
  if(!base||!value||!Array.isArray(value.champions))return null;
  const champions=unique(value.champions,catalog);
  return {champions,excluded:[...new Set(Array.isArray(value.excluded)?value.excluded:[])].filter(id=>catalog[id]&&!champions.includes(id)).slice(0,200),goals:Object.fromEntries(champions.map(id=>[id,goal(value.goals?.[id]??(base.stars?.[id]===3?9:3))]))};
}
export function effectiveComp(base,value,catalog){
  if(!base)return base;
  const edit=normalizeWorkingPlan(base,value,catalog);if(!edit)return base;
  const same=edit.champions.length===base.champions.length&&edit.champions.every((id,i)=>id===base.champions[i]);
  if(same&&!edit.excluded.length)return {...base,workingPlan:true};
  const carry=edit.champions.includes(base.carry)?base.carry:edit.champions.find(id=>catalog[id].role==='Retaguarda')||edit.champions[0]||base.carry;
  // Published level boards describe the original roster. A changed roster uses
  // the adaptive planner, instead of silently putting removed units back in.
  return {...base,champions:edit.champions,carry,pivot:undefined,source:undefined,strategy:undefined,
    style:'Personalizada',workingPlan:true,excludedChampions:edit.excluded,positions:Object.fromEntries(Object.entries(base.positions||{}).filter(([id])=>edit.champions.includes(id))),
    items:Object.fromEntries(Object.entries(base.items||{}).filter(([id])=>edit.champions.includes(id)))};
}
export function editWorkingPlan(base,value,action,catalog){
  if(!base)return null;if(action?.type==='restore')return null;
  const edit=normalizeWorkingPlan(base,value,catalog)||{champions:[...base.champions],excluded:[],goals:Object.fromEntries(base.champions.map(id=>[id,base.stars?.[id]===3?9:3]))};
  if(!catalog[action?.id])return edit;
  if(action.type==='toggle'){
    if(edit.champions.includes(action.id)){edit.champions=edit.champions.filter(id=>id!==action.id);edit.excluded=[...new Set([...edit.excluded,action.id])];delete edit.goals[action.id];}
    else if(edit.champions.length<28){edit.champions.push(action.id);edit.excluded=edit.excluded.filter(id=>id!==action.id);edit.goals[action.id]=3;}
  }
  if(action.type==='goal'&&edit.champions.includes(action.id))edit.goals[action.id]=goal(action.goal);
  return edit;
}
export function sharingPayload(comp,edit,session,catalog){
  const ids=unique(comp?.champions,catalog),copies=session?.context?.copies||{};
  return {comp:comp?{id:String(comp.id).slice(0,100),name:String(comp.name).slice(0,80),carry:comp.carry,champions:ids}:null,
    wishes:ids.map(id=>({id,goal:goal(edit?.goals?.[id]??(comp?.stars?.[id]===3?9:3)),owned:Math.max(0,Math.min(9,Number(copies[id])||0))})).filter(w=>w.goal>0),
    playing:Boolean(session?.matchId&&!session?.ended),startedAt:Number(session?.startedAt)||0,ended:session?.ended===true};
}
export function normalizeSharedPlan(value,catalog){
  if(!value||typeof value!=='object')return null;
  const ids=unique(value.comp?.champions,catalog);
  return {comp:value.comp?{id:String(value.comp.id||'').slice(0,100),name:String(value.comp.name||'Comp do parceiro').slice(0,80),carry:catalog[value.comp.carry]?value.comp.carry:ids[0],champions:ids}:null,
    wishes:(Array.isArray(value.wishes)?value.wishes:[]).filter(w=>catalog[w?.id]).slice(0,28).map(w=>({id:w.id,goal:goal(w.goal),owned:Math.max(0,Math.min(9,Number(w.owned)||0))})),
    playing:value.playing===true,ended:value.ended===true,startedAt:Number(value.startedAt)||0};
}
export function partnerNeeds(social,session,now=Date.now()){
  const p=social?.partnerPlan;
  if(!social?.session||!p?.payload||!session?.matchId||session.ended||!p.payload.playing||p.payload.ended)return [];
  const age=now-Date.parse(p.updated_at||'');
  if(!Number.isFinite(age)||age< -60000||age>45000)return [];
  // Two PCs have different game PIDs. Compare confirmed starts, not process IDs,
  // so a partner still showing the previous game cannot supply stale wishes.
  if(!session.startedAt||!p.payload.startedAt||Math.abs(session.startedAt-p.payload.startedAt)>180000)return [];
  return p.payload.wishes.filter(w=>w.goal>w.owned).map(w=>({...w,needed:w.goal-w.owned}));
}
