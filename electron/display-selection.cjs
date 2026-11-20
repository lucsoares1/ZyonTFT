function selectDisplay(displays,primary,selectedId){
  return displays.find(display=>display.id===selectedId)||primary;
}
function displaySignature(display){
  return JSON.stringify([display.id,display.bounds,display.scaleFactor]);
}
module.exports={selectDisplay,displaySignature};
