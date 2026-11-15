const pivotId=id=>typeof id==='string'&&/^s18-pivot-[a-z0-9-]+$/.test(id);
const guideUrl=value=>{
 if(typeof value!=='string'||!value.startsWith('https://www.pivottft.com/'))return null;
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='www.pivottft.com'&&!u.username&&!u.password&&/^\/comps\/[a-z0-9-]+\/$/.test(u.pathname)?u.href:null;}catch{return null;}
};
export function augmentOrigin(comp){
 if(pivotId(comp?.augmentSource)||guideUrl(comp?.augmentSource))return comp.augmentSource;
 if(pivotId(comp?.id))return comp.id;
 return comp?.source?.name==='PivotTFT'?guideUrl(comp.source.url)||undefined:undefined;
}
// Only the recommendation facts travel to the overlay, not every level board.
export function augmentCatalog(snapshot){
 return {fetchedAt:snapshot?.fetchedAt,edition:snapshot?.edition,comps:(snapshot?.comps||[]).filter(c=>pivotId(c.id)).map(c=>({id:c.id,name:c.name,champions:c.champions,source:c.source,pivot:{augments:c.pivot?.augments||[],augmentFocus:c.pivot?.augmentFocus||[],updatedAt:c.pivot?.updatedAt}}))};
}
export function compAugments(comp,snapshot,registry){
 const comps=snapshot?.comps||[],origin=augmentOrigin(comp),originUrl=guideUrl(origin),sourceUrl=guideUrl(comp?.source?.url);
 const source=comps.find(c=>c.id===origin)||(originUrl&&comps.find(c=>guideUrl(c.source?.url)===originUrl))||comps.find(c=>c.id===comp?.id)||(sourceUrl&&comps.find(c=>guideUrl(c.source?.url)===sourceUrl));
 // A current published build takes precedence over a saved copy of its augments.
 // Personal boards keep their adaptive route; this reference supplies no units/items.
 const guide=source||(!origin&&comp?.pivot?comp:null);
 const ids=[...new Set(Array.isArray(guide?.pivot?.augments)?guide.pivot.augments:[])].filter(id=>typeof id==='string'&&Object.hasOwn(registry,id));
 const focus=[...new Set(Array.isArray(guide?.pivot?.augmentFocus)?guide.pivot.augmentFocus:[])].filter(f=>['econ','items','combat','traits','emblem','reroll'].includes(f));
 const adapted=Boolean(source&&(comp?.style==='Personalizada'||comp?.champions?.length!==source.champions?.length||comp.champions.some(id=>!source.champions.includes(id))));
 return {ids,focus,source:guide?{id:guide.id,name:guide.name,url:guideUrl(guide.source?.url),patch:guide.source?.patch,checkedAt:guide.source?.checkedAt}:null,adapted};
}
