import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {selectDisplay,displaySignature}=require('../electron/display-selection.cjs');
const {moduleBounds,overlayAction}=require('../electron/overlay-modules.cjs');
const {captureMonitor}=require('../electron/calibration-capture.cjs');

const displays=[
  {id:11,bounds:{x:0,y:0,width:1920,height:1080},scaleFactor:1},
  {id:22,bounds:{x:-1707,y:0,width:1707,height:960},scaleFactor:1.5},
  {id:33,bounds:{x:0,y:-1440,width:2560,height:1440},scaleFactor:1.25},
  {id:44,bounds:{x:1920,y:-200,width:1080,height:1920},scaleFactor:2}
];
test('one to four displays honor the selected monitor, independent of enumeration order',()=>{
  for(let count=1;count<=4;count++){
    const connected=displays.slice(0,count);
    for(const primary of connected){
      assert.equal(selectDisplay(connected,primary,null),primary);
      assert.equal(selectDisplay(connected,primary,999),primary);
      for(const chosen of connected)assert.equal(selectDisplay([...connected].reverse(),primary,chosen.id),chosen);
    }
  }
});
test('disconnect falls back to the current primary and reconnect restores the explicit selection',()=>{
  assert.equal(selectDisplay(displays,displays[0],22),displays[1]);
  assert.equal(selectDisplay([displays[0]],displays[0],22),displays[0]);
  assert.equal(selectDisplay(displays,displays[2],22),displays[1]);
  assert.notEqual(displaySignature(displays[0]),displaySignature({...displays[0],scaleFactor:1.5}));
  assert.notEqual(displaySignature(displays[0]),displaySignature({...displays[0],bounds:{...displays[0].bounds,width:1280,height:720}}));
});
test('integrated overlay stays inside the chosen DIP display at different resolutions and scales',()=>{
  for(const [pixelsWide,pixelsHigh] of [[1280,720],[1920,1080],[2560,1440],[3840,2160],[3440,1440],[1080,1920]])for(const scale of [1,1.25,1.5,2]){
    const display={x:-2200,y:-400,width:Math.round(pixelsWide/scale),height:Math.round(pixelsHigh/scale)};
    for(const count of [8,9,12])for(const panel of [null,'comp','champions','duo','status']){
      let layout=overlayAction({launcherPosition:{x:9999,y:9999}},{type:'setPresentation',value:'integrated'});
      if(panel)layout=overlayAction(layout,{type:'open',panel});
      const bounds=moduleBounds(display,layout,null,.82,{summaryChampions:count});
      assert.ok(bounds.x>=display.x&&bounds.y>=display.y);
      assert.ok(bounds.x+bounds.width<=display.x+display.width);
      assert.ok(bounds.y+bounds.height<=display.y+display.height*.82);
      assert.ok(bounds.width>0&&bounds.height>0);
    }
  }
});
test('capture chooses the configured source by id with one to four screens and mixed DPI',async()=>{
  for(let count=1;count<=4;count++)for(const display of displays.slice(0,count)){
    const result=await captureMonitor({display,window:{isVisible:()=>false,isFocused:()=>false},desktopCapturer:{getSources:async()=>displays.slice(0,count).reverse().map(candidate=>({display_id:String(candidate.id),thumbnail:{isEmpty:()=>false,toDataURL:()=>String(candidate.id)}}))}});
    assert.equal(result.image,String(display.id));
    assert.equal(result.width,Math.round(display.bounds.width*display.scaleFactor));
    assert.equal(result.height,Math.round(display.bounds.height*display.scaleFactor));
  }
});
test('production does not replace Electron screen discovery with a QA monitor',()=>{
  const source=fs.readFileSync(new URL('../electron/main.cjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/screen\.(getPrimaryDisplay|getAllDisplays)\s*=/);
  assert.doesNotMatch(source,/DISPLAY2|x:\s*-1920|x:\s*-1536/);
});
