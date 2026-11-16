const automaticShopRect=(width,height)=>{const reference=Math.min(width,height*16/9);return{x:((width-reference)/2+reference*.2295)/width,y:.858,width:reference*.53/width,height:.139};};
async function captureMonitor({display,window,desktopCapturer,nativeImage,fixturePath}) {
 if(fixturePath){const image=nativeImage.createFromPath(fixturePath);if(image.isEmpty())throw Error('Captura de teste inválida.');return{image:image.toDataURL(),...image.getSize(),displayId:display.id};}
 const visible=window.isVisible(),focused=window.isFocused();
 try{
  if(visible)window.hide();
  await new Promise(r=>setTimeout(r,250));
  const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:2560,height:1440},fetchWindowIcons:false});
  const selected=sources.find(s=>String(s.display_id)===String(display.id));
  if(!selected||selected.thumbnail.isEmpty())throw Error('Não foi possível capturar este monitor. Verifique o monitor selecionado e tente novamente.');
  return{image:selected.thumbnail.toDataURL(),width:Math.round(display.bounds.width*display.scaleFactor),height:Math.round(display.bounds.height*display.scaleFactor),displayId:display.id};
 }finally{if(visible&&!window.isDestroyed()){if(focused)window.show();else window.showInactive();}}
}
module.exports={captureMonitor,automaticShopRect};
