export const DEFAULT_SHOP_RECT = {x:.2295,y:.858,width:.53,height:.139};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function constrainRect(rect,kind='shop') {
 const width=clamp(Number(rect.width)||0,kind==='level'?.02:.2,kind==='level'?.25:1);
 const height=clamp(Number(rect.height)||0,kind==='level'?.01:.02,kind==='level'?.15:1);
 return {x:clamp(Number(rect.x)||0,0,1-width),y:clamp(Number(rect.y)||0,0,1-height),width,height};
}
export function automaticLevelRect(rect) {return constrainRect({x:rect.x-rect.width/5,y:rect.y-rect.height*.29,width:rect.width/5*.4,height:rect.height*.16},'level');}
export function dragCalibration(rect,dx,dy,handle='move',kind='shop') {
 if(handle==='move')return constrainRect({...rect,x:rect.x+dx,y:rect.y+dy},kind);
 const minW=kind==='level'?.02:.2,minH=kind==='level'?.01:.02;
 let left=rect.x,top=rect.y,right=left+rect.width,bottom=top+rect.height;
 if(handle.includes('w'))left=clamp(left+dx,0,right-minW);
 if(handle.includes('e'))right=clamp(right+dx,left+minW,1);
 if(handle.includes('n'))top=clamp(top+dy,0,bottom-minH);
 if(handle.includes('s'))bottom=clamp(bottom+dy,top+minH,1);
 return constrainRect({x:left,y:top,width:right-left,height:bottom-top},kind);
}
export function resizeCalibration(rect,width,height,kind='shop') {return constrainRect({x:rect.x+(rect.width-width)/2,y:rect.y+(rect.height-height)/2,width,height},kind);}
export function followShopLevel(previous,next,level) {
 if(!level)return null;
 return constrainRect({x:next.x+(level.x-previous.x)*next.width/previous.width,y:next.y+(level.y-previous.y)*next.height/previous.height,width:level.width*next.width/previous.width,height:level.height*next.height/previous.height},'level');
}
