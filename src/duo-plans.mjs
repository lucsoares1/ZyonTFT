import {planForLevel} from './level-planner.mjs';
const known=(catalog,id)=>typeof id==='string'&&Object.hasOwn(catalog,id);
const unique=(ids,catalog)=>[...new Set(Array.isArray(ids)?ids:[])].filter(id=>known(catalog,id)).slice(0,28);
const goal=n=>[0,1,3,9].includes(Number(n))?Number(n):3;
export function selectedTraits(value,catalog){
 const known=new Set(Object.values(catalog).flatMap(c=>c.traits||[]));
 return [...new Set(Array.isArray(value)?value:[])].filter(name=>typeof name==='string'&&known.has(name)).slice(0,64);
}
export function normalizeWorkingPlan(base,value,catalog){
  if(!base||!value||!Array.isArray(value.champions))return null;
  const champions=unique(value.champions,catalog);
  return {champions,traits:selectedTraits(value.traits,catalog),excluded:[...new Set(Array.isArray(value.excluded)?value.excluded:[])].filter(id=>known(catalog,id)&&!champions.includes(id)).slice(0,200),goals:Object.fromEntries(champions.map(id=>[id,goal(value.goals?.[id]??(base.stars?.[id]===3?9:3))]))};
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
  const edit=normalizeWorkingPlan(base,value,catalog)||{champions:[...base.champions],traits:[],excluded:[],goals:Object.fromEntries(base.champions.map(id=>[id,base.stars?.[id]===3?9:3]))};
  if(action?.type==='trait'){
   const name=selectedTraits([action.name],catalog)[0];if(!name)return edit;
   edit.traits=edit.traits.includes(name)?edit.traits.filter(t=>t!==name):[...edit.traits,name].slice(0,64);return edit;
  }
  if(!known(catalog,action?.id))return edit;
  if(action.type==='toggle'){
    if(edit.champions.includes(action.id)){edit.champions=edit.champions.filter(id=>id!==action.id);edit.excluded=[...new Set([...edit.excluded,action.id])];delete edit.goals[action.id];}
    else if(edit.champions.length<28){edit.champions.push(action.id);edit.excluded=edit.excluded.filter(id=>id!==action.id);edit.goals[action.id]=3;}
  }
  if(action.type==='goal'&&edit.champions.includes(action.id))edit.goals[action.id]=goal(action.goal);
  return edit;
}
export function shoppingWishes(comp,edit,session,catalog){
 if(!comp)return [];
 const copies=session?.context?.copies||{},ids=unique(comp.champions,catalog),traits=new Set(selectedTraits(edit?.traits,catalog));
 const wanted=new Map(ids.map(id=>[id,{id,goal:goal(edit?.goals?.[id]??(comp.stars?.[id]===3?9:3)),reason:'team'}]));
 const plan=planForLevel(comp,catalog,session?.context);
 for(const id of [...plan.search,...plan.reserve])if(catalog[id]&&!wanted.has(id)&&!edit?.excluded?.includes(id))wanted.set(id,{id,goal:3,reason:'transition'});
 for(const champion of Object.values(catalog))if(champion.traits?.some(t=>traits.has(t))&&!wanted.has(champion.id)&&!edit?.excluded?.includes(champion.id))wanted.set(champion.id,{id:champion.id,goal:1,reason:'trait'});
 return [...wanted.values()].filter(w=>w.goal>0).map(w=>({...w,owned:Math.max(0,Math.min(9,Number(copies[w.id])||0))}));
}
export function sharingPayload(comp,edit,session,catalog){
  const ids=unique(comp?.champions,catalog),copies=session?.context?.copies||{};
  return {comp:comp?{id:String(comp.id).slice(0,100),name:String(comp.name).slice(0,80),carry:comp.carry,champions:ids}:null,
    wishes:ids.map(id=>({id,goal:goal(edit?.goals?.[id]??(comp?.stars?.[id]===3?9:3)),owned:Math.max(0,Math.min(9,Number(copies[id])||0))})).filter(w=>w.goal>0),
    traits:selectedTraits(edit?.traits,catalog),shopping:shoppingWishes(comp,edit,session,catalog),
    playing:Boolean(session?.matchId&&!session?.ended),startedAt:Number(session?.startedAt)||0,ended:session?.ended===true};
}
export function normalizeSharedPlan(value,catalog){
  if(!value||typeof value!=='object')return null;
  const ids=unique(value.comp?.champions,catalog);
  return {comp:value.comp?{id:String(value.comp.id||'').slice(0,100),name:String(value.comp.name||'Comp do parceiro').slice(0,80),carry:known(catalog,value.comp.carry)?value.comp.carry:ids[0],champions:ids}:null,
    wishes:(Array.isArray(value.wishes)?value.wishes:[]).filter(w=>known(catalog,w?.id)).slice(0,28).map(w=>({id:w.id,goal:goal(w.goal),owned:Math.max(0,Math.min(9,Number(w.owned)||0))})),
    traits:selectedTraits(value.traits,catalog),
    shopping:[...new Map((Array.isArray(value.shopping)?value.shopping:Array.isArray(value.wishes)?value.wishes:[]).filter(w=>known(catalog,w?.id)).slice(0,200).map(w=>[w.id,{id:w.id,goal:goal(w.goal),owned:Math.max(0,Math.min(9,Number(w.owned)||0)),reason:['team','transition','trait'].includes(w.reason)?w.reason:'team'}])).values()],
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
  return (p.payload.shopping||p.payload.wishes).filter(w=>w.goal>w.owned).map(w=>({...w,needed:w.goal-w.owned}));
}
