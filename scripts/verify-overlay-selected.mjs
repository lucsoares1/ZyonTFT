import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {_electron} from 'playwright';

const output=path.resolve('design/review/overlay-selected-2026-11-17');
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const environment={...process.env,ZYON_USER_DATA:path.resolve('.runtime/overlay-selected-'+Date.now()),ZYON_TEST_BACKGROUND:'1',ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.ZYON_DEV_URL;
await fs.mkdir(output,{recursive:true});
const errors=[],checks=[],captures=[];
let application,mainPage,guide,expectedViewport;
async function capture(name){
  await guide.mouse.move(0,0);
  await guide.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.race([Promise.all([...document.images].filter(image=>{const bounds=image.getBoundingClientRect();return bounds.top<innerHeight&&bounds.bottom>0;}).map(image=>image.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,4000))]);
  });
  const geometry=await guide.evaluate(()=>{
    const root=document.querySelector('.game-guide');
    const bar=document.querySelector('.zy-overlay-windowbar')?.getBoundingClientRect();
    const footer=document.querySelector('.game-footer')?.getBoundingClientRect();
    const footerOutside=[...document.querySelectorAll('.game-footer>*')].some(element=>{const bounds=element.getBoundingClientRect();return bounds.height>0&&(bounds.top<footer.top-1||bounds.bottom>footer.bottom+1);});
    return{rootScroll:root?.scrollTop||0,barTop:bar?.top,footerBottom:footer?.bottom,footerOutside,height:innerHeight};
  });
  assert.equal(geometry.rootScroll,0,name+' window itself must not scroll '+JSON.stringify(geometry));
  if(geometry.barTop!==undefined)assert.ok(geometry.barTop>=0,name+' title bar visible');
  if(geometry.footerBottom!==undefined)assert.ok(geometry.footerBottom<=geometry.height&&!geometry.footerOutside,name+' footer contained '+JSON.stringify(geometry));
  const encoded=await application.evaluate(async({BrowserWindow},{url,expectedViewport})=>{
    const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url);
    window.showInactive();
    try{
      await new Promise(resolve=>setTimeout(resolve,220));
      const image=await window.webContents.capturePage();
      const size=image.getSize();
      if(expectedViewport&&(size.width!==expectedViewport.width||size.height!==expectedViewport.height))throw Error('Wrong capture size '+JSON.stringify({size,expectedViewport}));
      return image.toPNG().toString('base64');
    }finally{window.hide();}
  },{url:guide.url(),expectedViewport});
  const destination=path.join(output,name+'.png');
  await fs.writeFile(destination,Buffer.from(encoded,'base64'));
  captures.push(destination);
}
async function resize(width,height){
  expectedViewport={width,height};
  await application.evaluate(({BrowserWindow,screen},{url,width,height})=>{
    const original=screen.getPrimaryDisplay();
    const display={...original,bounds:{...original.bounds,width:width+24,height:Math.max(1080,height+100)},workArea:{...original.workArea,width:width+24,height:Math.max(1080,height+100)}};
    screen.getPrimaryDisplay=()=>display;screen.getAllDisplays=()=>[display];
    BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url).setBounds({x:0,y:0,width,height});
  },{url:guide.url(),width,height});
  await guide.waitForFunction(({width,height})=>innerWidth===width&&innerHeight===height,{width,height});
}
async function check(label){
  if(await guide.locator('.zy-overlay-windowbar').count()){
    const spacing=await guide.evaluate(()=>{
      const grip=document.querySelector('.zy-overlay-windowbar>.guide-drag-grip').getBoundingClientRect();
      const logo=document.querySelector('.zy-overlay-product>.zyon-mark').getBoundingClientRect();
      const name=document.querySelector('.zy-overlay-product>strong').getBoundingClientRect();
      return{gripGap:logo.left-grip.right,nameGap:name.left-logo.right,gripCenter:grip.y+grip.height/2,logoCenter:logo.y+logo.height/2,nameCenter:name.y+name.height/2};
    });
    assert.ok(spacing.gripGap>=8&&Math.abs(spacing.gripGap-spacing.nameGap)<=1,label+' balanced brand gaps '+JSON.stringify(spacing));
    assert.ok(Math.max(spacing.gripCenter,spacing.logoCenter,spacing.nameCenter)-Math.min(spacing.gripCenter,spacing.logoCenter,spacing.nameCenter)<=1,label+' vertically aligned brand');
  }
  const result=await guide.evaluate(()=>{
    const content=document.querySelector('.game-content')||document.querySelector('section');
    return{width:innerWidth,height:innerHeight,client:content.clientWidth,scroll:content.scrollWidth,broken:[...content.querySelectorAll('img')].filter(image=>image.complete&&!image.naturalWidth).length};
  });
  assert.ok(result.scroll<=result.client+1,label+' horizontal overflow '+JSON.stringify(result));
  assert.equal(result.broken,0,label+' broken images');
  checks.push({label,...result});
}
try{
  application=await _electron.launch({args:[process.cwd()],env:environment});
  await application.evaluate(({app,BrowserWindow})=>{
    const quiet=window=>{window.setOpacity(0);window.setIgnoreMouseEvents(true);window.setAlwaysOnTop(false);window.webContents.setBackgroundThrottling(false);};
    BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,window)=>quiet(window));
  });
  mainPage=await application.firstWindow();
  mainPage.on('pageerror',error=>errors.push(error.message));
  await mainPage.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials[2].email);
  await mainPage.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials[2].password);
  await mainPage.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
  await mainPage.getByRole('heading',{name:'Composições',exact:true}).waitFor();
  await mainPage.evaluate(()=>window.zyon.setOverlay(true));
  await mainPage.waitForFunction(async()=>{const state=await window.zyon.getState();return state.gameSession.matchId&&state.levelReading.status==='confirmed';},null,{timeout:45000});
  await mainPage.evaluate(()=>window.zyon.setReader(false));
  guide=application.windows().find(page=>page.url().includes('view=guide'));
  assert.ok(guide);
  guide.on('pageerror',error=>errors.push(error.message));
  await guide.locator('.zy-native-reference').waitFor();
  await guide.getByRole('button',{name:'Ampliar overlay',exact:true}).click();
  const initial=await mainPage.evaluate(async()=>(await window.zyon.getState()).gameSession.context);
  for(const [width,height] of [[1672,941],[1122,1402],[840,800],[640,800]]){
    await resize(width,height);
    await guide.getByRole('tab',{name:'Comps',exact:true}).click();
    await guide.locator('.overlay-selected-card').first().waitFor();
    const catalogCount=(await mainPage.evaluate(()=>window.zyon.getState())).saved.comps.length;
    assert.equal(await guide.locator('.overlay-comp-option').count(),catalogCount,'All comps visible without opening search at '+width);
    if(width<=840)assert.equal(await guide.locator('.zy-native-reference').evaluate(element=>getComputedStyle(element,'::after').display),'none','No ornament behind compact cards');
    await capture('library-'+width);
    await check('library '+width);
    const card=await guide.locator('.overlay-selected-card').first().boundingBox();
    assert.ok(card.height<260,'compact card at '+width);
    await guide.getByRole('tab',{name:'Equipe',exact:true}).click();
    await guide.getByLabel('Consultar equipe por nível',{exact:true}).selectOption('final');
    assert.equal(await guide.locator('.game-team-board .tft-hex').count(),28);
    await capture('team-final-'+width);
    await check('team final '+width);
    const board=await guide.locator('.game-team-board>.native-board-panel').boundingBox();
    const footer=await guide.locator('.game-footer').boundingBox();
    assert.ok(board.y+board.height<=footer.y+1,'Complete board visible at '+width+': '+JSON.stringify({board,footer}));
    for(const level of ['1','5','8','10'])await guide.getByLabel('Consultar equipe por nível',{exact:true}).selectOption(level);
    assert.deepEqual((await mainPage.evaluate(()=>window.zyon.getState())).gameSession.context,initial);
    for(const [name,file] of [['Agora','now'],['Planejar','planner'],['Roteiro','route'],['Itens','items'],['Aprim.','augments'],['Partida','match']]){
      await guide.getByRole('tab',{name,exact:true}).click();
      await capture(file+'-'+width);
      await check(file+' '+width);
    }
    await guide.getByRole('tab',{name:'Comps',exact:true}).click();
    await guide.locator('[data-comp="s18-pivot-blossom-ahri-fast-9"] .overlay-comp-detail-open').click();
    await guide.locator('.zy-plan-explorer').waitFor();
    await capture('comp-detail-'+width);
    await check('comp detail '+width);
    assert.equal(await guide.locator('.zy-plan-explorer .tft-hex').count(),28);
    await guide.getByRole('button',{name:'Recolher Blossom Ahri Fast 9',exact:true}).click();
    await guide.getByRole('button',{name:'Buscar e ordenar',exact:true}).click();
    assert.equal(await guide.locator('.overlay-comp-option').count(),(await mainPage.evaluate(()=>window.zyon.getState())).saved.comps.length);
    const clippedRosters=await guide.locator('.overlay-card-roster').evaluateAll(elements=>elements.filter(element=>element.querySelector('.lineup-strip').scrollWidth>element.clientWidth+1).length);
    assert.equal(clippedRosters,0,'Every roster fits at '+width);
    await guide.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill('zzzz-inexistente');
    await guide.locator('.overlay-comp-empty').waitFor();
    await capture('search-empty-'+width);
    await guide.getByRole('textbox',{name:'Buscar composição no overlay',exact:true}).fill('');
    await guide.getByRole('button',{name:'Fechar busca',exact:true}).click();
    assert.equal(await guide.locator('.overlay-comp-option').count(),catalogCount,'Closing search must not hide comps at '+width);
  }
  expectedViewport=null;
  await guide.getByRole('button',{name:'Voltar ao painel',exact:true}).click();
  await guide.getByRole('button',{name:'Ampliar overlay',exact:true}).click();
  await guide.getByRole('button',{name:'Voltar ao painel',exact:true}).waitFor();
  await capture('expanded-control');
  await guide.getByRole('button',{name:'Recolher guia',exact:true}).click();
  await guide.locator('.game-collapsed').waitFor();
  const compactComp=(await mainPage.evaluate(()=>window.zyon.getState())).guideComp;
  assert.equal(await guide.locator('.zy-overlay-mini-roster .lineup-unit').count(),compactComp.champions.length,'Compact mode includes every champion');
  assert.equal(await guide.locator('.zy-overlay-portrait').count(),0,'Compact mode replaces carry art with the full roster');
  assert.equal(await guide.locator('.zy-overlay-mini-roster .portrait-frame').evaluateAll(elements=>elements.filter(element=>{const bounds=element.getBoundingClientRect();return bounds.left<0||bounds.right>innerWidth||bounds.top<0||bounds.bottom>128;}).length),0,'All compact portraits fit');
  assert.ok((await guide.locator('.zy-overlay-mini-roster .portrait-frame').first().boundingBox()).width>=43,'Compact portraits enlarged to44px');
  await capture('compact');
  await check('compact');
  assert.equal(await guide.evaluate(()=>innerHeight),160);
  const compactAction=await guide.locator('.game-collapsed-action').boundingBox();
  assert.ok(compactAction.y+compactAction.height<=160,'Compact decision visible');
  await guide.getByRole('button',{name:'Encolher painel e manter avisos da loja',exact:true}).click();
  await guide.locator('.game-shop-only').waitFor();
  await capture('shop-only');
  await check('shop only');
  assert.deepEqual(await guide.evaluate(()=>[innerWidth,innerHeight]),[116,44]);
  await guide.getByRole('button',{name:'Expandir painel do overlay',exact:true}).click();
  await guide.locator('.game-collapsed').waitFor();
  await guide.getByRole('button',{name:'Expandir guia',exact:true}).click();
  await guide.getByRole('button',{name:'Voltar ao painel',exact:true}).waitFor();
  assert.deepEqual((await mainPage.evaluate(()=>window.zyon.getState())).gameSession.context,initial);
  assert.deepEqual(errors,[]);
  await guide.getByRole('button',{name:'Ocultar overlay',exact:true}).click();
  assert.equal(mainPage.isClosed(),false);
  assert.equal(await application.evaluate(({BrowserWindow},url)=>BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url)?.isVisible()||false,guide.url()),false);
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({ok:true,checks,captures,errors,isolatedProfile:true,ocrFixture:true},null,2));
  console.log(JSON.stringify({ok:true,checks:checks.length,captures:captures.length,output}));
}finally{
  if(mainPage)await mainPage.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
  await application?.close();
}
