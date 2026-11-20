import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOverlayLayout, overlayAction, moduleBounds } from '../electron/overlay-modules.cjs';
import { OverlayGate } from '../electron/overlay-visibility.cjs';

test('integrated experiment restores the exact prior floating layout',()=>{
  const original=normalizeOverlayLayout({activePanel:'duo',pinnedPanel:'comp',summaryCollapsed:true,launcherPosition:{x:700,y:60},panels:{duo:{x:80,y:120},comp:{x:580,y:140}}});
  const source=structuredClone(original);
  let integrated=overlayAction(original,{type:'setPresentation',value:'integrated'});
  assert.equal(integrated.presentation,'integrated');assert.equal(integrated.activePanel,null);assert.equal(integrated.pinnedPanel,null);assert.equal(integrated.summaryCollapsed,false);
  assert.deepEqual(original,source);
  integrated=overlayAction(integrated,{type:'open',panel:'champions'});
  integrated.launcherPosition={x:30,y:12};
  integrated=normalizeOverlayLayout(JSON.parse(JSON.stringify(integrated)));
  assert.equal(overlayAction(integrated,{type:'pin',panel:'champions'}).pinnedPanel,null);
  const minimized=overlayAction(integrated,{type:'summaryToggle'});
  assert.equal(minimized.summaryCollapsed,true);
  assert.equal(minimized.activePanel,null);
  assert.equal(normalizeOverlayLayout(JSON.parse(JSON.stringify(minimized))).summaryCollapsed,true);
  assert.equal(moduleBounds({x:0,y:0,width:1920,height:1080},minimized,null,.82,{summaryChampions:9}).height,42);
  assert.equal(moduleBounds({x:0,y:0,width:1920,height:1080},minimized,null,.82,{summaryChampions:9}).width,244);
  assert.equal(overlayAction(minimized,{type:'open',panel:'champions'}).summaryCollapsed,false);
  assert.equal(overlayAction(minimized,{type:'summaryToggle'}).summaryCollapsed,false);
  assert.deepEqual(overlayAction(integrated,{type:'setPresentation',value:'floating'}),source);
});

test('integrated window grows without moving its toolbar or changing roster width',()=>{
  for(const display of [{x:-1920,y:0,width:1920,height:1080},{x:0,y:0,width:1280,height:720}]){
    const resting=overlayAction({launcherPosition:{x:900,y:68}},{type:'setPresentation',value:'integrated'});
    const compact=moduleBounds(display,resting,null,.82,{summaryChampions:12});
    for(const panel of ['comp','champions','duo','status']){
      const opened=moduleBounds(display,overlayAction(resting,{type:'open',panel}),null,.82,{summaryChampions:12});
      assert.equal(opened.x,compact.x);assert.equal(opened.y,compact.y);assert.equal(opened.width,compact.width);
      assert.ok(opened.height>compact.height);assert.ok(opened.y+opened.height<=display.y+display.height*.82);
      assert.ok(opened.y+opened.height>=display.y+display.height*.82-13,'Integrated content uses all safe vertical space');
    }
    assert.equal(moduleBounds(display,resting,null,.82,{summaryChampions:0}).height,42);
  }
});

test('legacy layout migrates to launcher without opening a panel or mutating the session',()=>{
  const saved={collapsed:true,shopOnly:true,guidePosition:{x:800,y:50},context:{copies:{Ahri:3}}};
  const before=structuredClone(saved);
  assert.deepEqual(normalizeOverlayLayout(saved),{version:1,activePanel:null,pinnedPanel:null,summaryCollapsed:false,launcherPosition:{x:16,y:68},panels:{}});
  assert.deepEqual(saved,before);
});
test('one active panel and one explicitly pinned panel never duplicate a module',()=>{
  let layout=overlayAction(null,{type:'open',panel:'comp'});
  layout=overlayAction(layout,{type:'open',panel:'champions'});
  assert.equal(layout.activePanel,'champions');assert.equal(layout.pinnedPanel,null);
  layout=overlayAction(layout,{type:'pin',panel:'champions'});
  assert.equal(layout.activePanel,null);assert.equal(layout.pinnedPanel,'champions');
  layout=overlayAction(layout,{type:'open',panel:'comp'});
  layout=overlayAction(layout,{type:'open',panel:'champions'});
  assert.equal(layout.activePanel,'comp');assert.equal(layout.pinnedPanel,'champions');
  layout=overlayAction(layout,{type:'toggle',panel:'champions'});
  assert.equal(layout.pinnedPanel,null);assert.equal(layout.activePanel,'comp');
  layout=overlayAction(layout,{type:'hidePanels'});
  assert.equal(layout.activePanel,null);assert.equal(layout.pinnedPanel,null);
  layout=overlayAction({...layout,activePanel:'champions',pinnedPanel:'comp'},{type:'unpin'});
  assert.equal(layout.activePanel,'comp');assert.equal(layout.pinnedPanel,null);
});
test('real module windows use display-relative DIP positions and stop above the HUD',()=>{
  for(const display of [{x:-1536,y:0,width:1536,height:864},{x:1920,y:-50,width:1280,height:720}]){
    const layout={launcherPosition:{x:9000,y:9000},panels:{comp:{x:-900,y:9000}}};
    const launcher=moduleBounds(display,layout);
    assert.equal(launcher.width,204);assert.equal(launcher.height,48);
    for(const panel of ['comp','champions','duo','status']){
      const bounds=moduleBounds(display,layout,panel,0.72);
      assert.ok(bounds.x>=display.x);assert.ok(bounds.x+bounds.width<=display.x+display.width);
      assert.ok(bounds.y>=display.y);assert.ok(bounds.y+bounds.height<=display.y+display.height*0.72);
      assert.ok(bounds.width<=960);assert.ok(bounds.height<=740);
    }
  }
});
test('summary expands for the complete roster and collapses without hiding panels',()=>{
  const display={x:-1920,y:0,width:1920,height:1080};
  const layout=normalizeOverlayLayout({activePanel:'comp'});
  assert.equal(moduleBounds(display,layout,null,0.82,{summaryChampions:8}).width,568);
  assert.equal(moduleBounds(display,layout,null,0.82,{summaryChampions:12}).width,740);
  assert.equal(moduleBounds(display,layout,null,0.82,{summaryChampions:12}).height,234);
  const collapsed=overlayAction(layout,{type:'summaryToggle'});
  assert.equal(collapsed.summaryCollapsed,true);assert.equal(collapsed.activePanel,'comp');
  assert.equal(moduleBounds(display,collapsed,null,0.82,{summaryChampions:12}).height,48);
  assert.equal(moduleBounds(display,layout).height,48);
  assert.equal(overlayAction(collapsed,{type:'summaryToggle'}).summaryCollapsed,false);
});
test('detail and library actions open only the comp panel, respecting a pinned comp',()=>{
  for(const type of ['details','library']){
    const layout=overlayAction({activePanel:'champions',pinnedPanel:'duo'},{type,panel:'status'});
    assert.equal(layout.activePanel,'comp');assert.equal(layout.pinnedPanel,'duo');
    const pinned=overlayAction({activePanel:'champions',pinnedPanel:'comp'},{type});
    assert.equal(pinned.activePanel,'champions');assert.equal(pinned.pinnedPanel,'comp');
  }
});
test('summary and two panels pack without intersection above the shop on desktop sizes',()=>{
  const intersects=(first,second)=>first.x<second.x+second.width&&first.x+first.width>second.x&&first.y<second.y+second.height&&first.y+first.height>second.y;
  for(const width of [1280,1536,1920])for(const pinnedPanel of ['comp','champions','duo','status'])for(const activePanel of ['comp','champions','duo','status'].filter(panel=>panel!==pinnedPanel)){
    const display={x:-width,y:0,width,height:1080};
    const layout={pinnedPanel,activePanel,launcherPosition:{x:16,y:68}};
    const windows=[null,pinnedPanel,activePanel].map(panel=>moduleBounds(display,layout,panel,0.82,{summaryChampions:12}));
    for(const bounds of windows){assert.ok(bounds.x>=display.x);assert.ok(bounds.x+bounds.width<=0);assert.ok(bounds.y+bounds.height<=1080*0.82);assert.ok(bounds.width>=160&&bounds.height>=120);}
    assert.equal(intersects(windows[0],windows[1]),false,`${width} summary / ${pinnedPanel}`);
    assert.equal(intersects(windows[0],windows[2]),false,`${width} summary / ${activePanel}`);
    assert.equal(intersects(windows[1],windows[2]),false,`${width} ${pinnedPanel} / ${activePanel}`);
  }
});
test('720p comp and champion panels remain usable beside the full summary without persisting the temporary shift',()=>{
  const intersects=(first,second)=>first.x<second.x+second.width&&first.x+first.width>second.x&&first.y<second.y+second.height&&first.y+first.height>second.y;
  for(const width of [1280,1536]){
    const display={x:-width,y:0,width,height:720};
    const layout={pinnedPanel:'comp',activePanel:'champions',launcherPosition:{x:16,y:68}};
    const previous=structuredClone(layout);
    const [summary,comp,champions]=[null,'comp','champions'].map(panel=>moduleBounds(display,layout,panel,0.82,{summaryChampions:12}));
    assert.equal(summary.y,12);assert.equal(summary.height,234);
    assert.ok(comp.height>=450);assert.ok(comp.width>=500);
    assert.ok(champions.height>=320);assert.equal(champions.width,460);
    assert.equal(intersects(summary,comp)||intersects(summary,champions)||intersects(comp,champions),false);
    for(const bounds of [summary,comp,champions])assert.ok(bounds.y+bounds.height<=720*0.82);
    assert.deepEqual(layout,previous);
    const restored=moduleBounds(display,{...layout,activePanel:null},null,0.82,{summaryChampions:12});
    assert.equal(restored.y,68);
  }
});
test('all owned module HWNDs retain only an already confirmed match',()=>{
  const gate=new OverlayGate(),handles=['10','20','30'];
  gate.presence({foreground:true,processName:'League of Legends',matchId:'one'},handles);
  assert.equal(gate.isGuideWindow({foregroundWindow:'10',matchId:'one'},handles),false);
  gate.confirmGold('one',{status:'confirmed',gold:8});
  for(const handle of handles){
    gate.presence({foreground:false,foregroundWindow:handle,matchId:'one'},handles);
    assert.equal(gate.canShow(true,true),true);
  }
  assert.equal(gate.isGuideWindow({foregroundWindow:'99',matchId:'one'},handles),false);
  assert.equal(gate.isGuideWindow({foregroundWindow:'10',matchId:'two'},handles),false);
  gate.endGame('one');
  assert.equal(gate.isGuideWindow({foregroundWindow:'10',matchId:'one'},handles),false);
});
