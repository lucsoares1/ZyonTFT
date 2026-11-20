function itemTooltipBounds(owner,display,anchorX,height=180){
  const width=Math.min(328,display.width),gap=8;
  const boundedHeight=Math.min(Math.max(80,Math.ceil(height)),display.height);
  const x=Math.round(Math.max(display.x,Math.min(display.x+display.width-width,owner.x+anchorX-width/2)));
  const y=Math.round(Math.max(display.y,Math.min(display.y+display.height-boundedHeight,owner.y)));
  const candidates=[
    {x,y:owner.y-boundedHeight-gap},
    {x,y:owner.y+owner.height+gap},
    {x:owner.x+owner.width+gap,y},
    {x:owner.x-width-gap,y}
  ];
  const selected=candidates.find(candidate=>candidate.x>=display.x&&candidate.y>=display.y&&candidate.x+width<=display.x+display.width&&candidate.y+boundedHeight<=display.y+display.height);
  return selected?{...selected,width,height:boundedHeight}:null;
}
module.exports={itemTooltipBounds};
