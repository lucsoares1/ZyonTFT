import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {_electron} from 'playwright';

const output=path.resolve('design/review/product-theme-2026-11-17');
const credentials=JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json','utf8'));
const environment={...process.env,ZYON_USER_DATA:path.resolve('.runtime/product-theme-'+Date.now()),ZYON_TEST_BACKGROUND:'1',ZYON_OVERLAY_PREVIEW:'1',ZYON_OCR_FIXTURE:path.resolve('design/references/17-game-ocr.png')};
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.ZYON_DEV_URL;
await fs.mkdir(output,{recursive:true});
const captures=[],checks=[],errors=[];
let application,mainPage;
async function resize(page,width,height){
  await application.evaluate(({BrowserWindow,screen},{url,width,height})=>{
    const original=screen.getPrimaryDisplay();
    const display={...original,bounds:{...original.bounds,width:width+24,height:Math.max(1080,height+100)}};
    screen.getPrimaryDisplay=()=>display;screen.getAllDisplays=()=>[display];
    BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url).setBounds({x:0,y:0,width,height});
  },{url:page.url(),width,height});
  await page.waitForFunction(({width,height})=>innerWidth===width&&innerHeight===height,{width,height});
}
async function capture(page,name){
  await page.mouse.move(0,0);
  await page.evaluate(async()=>{
    await document.fonts.ready;
    await Promise.race([Promise.all([...document.images].filter(image=>{const bounds=image.getBoundingClientRect();return bounds.top<innerHeight&&bounds.bottom>0;}).map(image=>image.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,4000))]);
  });
  const result=await page.evaluate(()=>{
    const content=document.querySelector('.game-content')||document.querySelector('.workspace-content')||document.documentElement;
    return{width:innerWidth,height:innerHeight,client:content.clientWidth,scroll:content.scrollWidth,broken:[...content.querySelectorAll('img')].filter(image=>image.complete&&!image.naturalWidth).length};
  });
  assert.ok(result.scroll<=result.client+1,name+' overflow '+JSON.stringify(result));
  assert.equal(result.broken,0,name+' broken images');
  const encoded=await application.evaluate(async({BrowserWindow},{url,width,height})=>{
    const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url);
    window.showInactive();
    try{
      await new Promise(resolve=>setTimeout(resolve,200));
      const image=await window.webContents.capturePage();
      const size=image.getSize();
      if(size.width!==width||size.height!==height)throw Error('Wrong bitmap size '+JSON.stringify({size,width,height}));
      return image.toPNG().toString('base64');
    }finally{window.hide();}
  },{url:page.url(),width:result.width,height:result.height});
  const destination=path.join(output,name+'.png');
  await fs.writeFile(destination,Buffer.from(encoded,'base64'));
  captures.push(destination);checks.push({name,...result});
}
async function showSocial(page,social,state){
  await application.evaluate(({BrowserWindow},{url,social,state})=>{
    const window=BrowserWindow.getAllWindows().find(window=>window.webContents.getURL()===url);
    if(state)window.webContents.send('state:update',{...state,social,gameSession:{...state.gameSession,tab:'duo',collapsed:false,shopOnly:false}});
    window.webContents.send('social:update',social);
  },{url:page.url(),social,state});
}
try{
  application=await _electron.launch({args:[process.cwd()],env:environment});
  await application.evaluate(({app,BrowserWindow})=>{
    const quiet=window=>{window.setOpacity(0);window.setIgnoreMouseEvents(true);window.setAlwaysOnTop(false);window.webContents.setBackgroundThrottling(false);};
    BrowserWindow.getAllWindows().forEach(quiet);app.on('browser-window-created',(_,window)=>quiet(window));
  });
  mainPage=await application.firstWindow();
  mainPage.on('pageerror',error=>errors.push(error.message));
  await resize(mainPage,1536,1000);
  await capture(mainPage,'login-1536');
  await mainPage.getByRole('textbox',{name:'E-mail da conta Zyon',exact:true}).fill(credentials[2].email);
  await mainPage.getByLabel('Senha da conta Zyon',{exact:true}).fill(credentials[2].password);
  await mainPage.getByRole('button',{name:'Entrar no Zyon',exact:true}).click();
  await mainPage.getByRole('heading',{name:'Composições',exact:true}).waitFor();
  const initial=await mainPage.evaluate(()=>window.zyon.getState());
  for(const [width,height]of[[1920,1080],[1536,1000],[1050,820]]){
    await resize(mainPage,width,height);
    for(const [name,selector,file]of[
      ['Composições','.comp-feed','comps'],
      ['Planejador','.studio-board','planner'],
      ['Banco de dados','.champion-performance-table','database'],
      ['Duplas Dinâmicas','.social-panel','duo'],
      ['Preferências','.settings-layout','settings'],
      ['Fontes e dados','.sources-panel','sources'],
      ['Como funciona','.help-panel','help'],
      ['Abrir meu perfil','.account-profile-page','account']
    ]){
      await mainPage.getByRole('button',{name,exact:true}).click();
      await mainPage.locator(selector).waitFor();
      await capture(mainPage,file+'-'+width);
      if(file==='comps'){
        const composition=mainPage.locator('[data-comp-id="s18-pivot-blossom-ahri-fast-9"]');
        await composition.getByRole('button',{name:'Expandir Blossom Ahri Fast 9',exact:true}).click();
        await composition.locator('.zy-plan-explorer').waitFor();
        assert.equal(await composition.locator('.zy-plan-explorer .tft-hex').count(),28);
        await capture(mainPage,'comp-detail-'+width);
        await composition.getByRole('button',{name:'Recolher Blossom Ahri Fast 9',exact:true}).click();
      }
      if(file==='planner'){
        await mainPage.locator('.studio-board [data-board-cell]').first().click();
        await mainPage.locator('.studio-dialog[open]').waitFor();
        await capture(mainPage,'planner-dialog-'+width);
        await mainPage.getByRole('button',{name:'Fechar seleção',exact:true}).click();
      }
      if(file==='duo'){
        await mainPage.getByRole('button',{name:'Adicionar amigo',exact:true}).click();
        await mainPage.getByRole('textbox',{name:'Código de amigo',exact:true}).waitFor();
        await capture(mainPage,'duo-add-'+width);
        await mainPage.getByRole('button',{name:'Fechar formulário de amizade',exact:true}).click();
      }
      if(file==='settings'){
        for(const category of['Overlay e monitor','Atualizações']){
          await mainPage.getByRole('button',{name:category,exact:true}).click();
          await capture(mainPage,'settings-'+(category==='Atualizações'?'updates':'overlay')+'-'+width);
        }
      }
    }
  }
  await mainPage.getByRole('button',{name:'Duplas Dinâmicas',exact:true}).click();
  const social=await mainPage.evaluate(()=>window.zyon.getSocial());
  const state=await mainPage.evaluate(()=>window.zyon.getState());
  const mine=state.guideComp||state.saved.comps[0];
  const partnerComp=state.saved.comps.find(comp=>comp.id!==mine.id);
  const partner={user_id:'local-visual-fixture',display_name:'Parceiro de teste',handle:'previa_local'};
  const fixture={...social,status:'online',session:{id:'local-visual-session'},partner,friends:[{id:'local-visual-friend',profile:partner}],friendRequests:[],invites:[],myPlan:{payload:{comp:mine}},partnerPlan:{updated_at:new Date().toISOString(),payload:{comp:partnerComp,playing:false,shopping:[{id:partnerComp.champions[0],goal:3,owned:1,priority:2,reason:'request'}]}}};
  await resize(mainPage,1536,1000);
  await showSocial(mainPage,fixture);
  await mainPage.getByRole('region',{name:'Planos da dupla',exact:true}).waitFor();
  await capture(mainPage,'duo-connected-fixture-1536');
  await mainPage.locator('.duo-requests').getByRole('button',{name:'Pedir campeão',exact:true}).click();
  await capture(mainPage,'duo-request-editor-fixture-1536');
  await mainPage.locator('.duo-requests').getByRole('button',{name:'Fechar',exact:true}).click();
  await mainPage.locator('.social-heading').scrollIntoViewIfNeeded();
  const disconnected={...fixture,partnerPlan:{...fixture.partnerPlan,updated_at:'2020-01-01T00:00:00Z'}};
  await showSocial(mainPage,disconnected);
  await capture(mainPage,'duo-stale-fixture-1536');
  await showSocial(mainPage,social);
  await mainPage.evaluate(()=>window.zyon.setOverlay(true));
  await mainPage.evaluate(()=>window.zyon.setReader(false));
  const guide=application.windows().find(page=>page.url().includes('view=guide'));
  assert.ok(guide);
  guide.on('pageerror',error=>errors.push(error.message));
  await guide.locator('.zy-native-reference').waitFor();
  for(const width of[840,640]){
    await resize(guide,width,800);
    await showSocial(guide,fixture,state);
    await guide.locator('.social-native').waitFor();
    await new Promise(resolve=>setTimeout(resolve,300));
    await showSocial(guide,fixture,state);
    await guide.getByRole('region',{name:'Planos da dupla',exact:true}).waitFor();
    await capture(guide,'duo-native-connected-fixture-'+width);
    await guide.locator('.duo-requests').getByRole('button',{name:'Pedir campeão',exact:true}).click();
    await guide.locator('.duo-request-editor').evaluate(element=>element.scrollIntoView({block:'start'}));
    const editorBounds=await guide.locator('.duo-request-catalog').boundingBox();
    const footerBounds=await guide.locator('.game-footer').boundingBox();
    assert.ok(editorBounds.y<footerBounds.y-80,'Request catalog visible at '+width);
    await capture(guide,'duo-native-request-editor-fixture-'+width);
    await guide.locator('.duo-requests').getByRole('button',{name:'Fechar',exact:true}).click();
    await guide.locator('.social-heading').scrollIntoViewIfNeeded();
    await showSocial(guide,disconnected,state);
    await capture(guide,'duo-native-stale-fixture-'+width);
  }
  assert.deepEqual((await mainPage.evaluate(()=>window.zyon.getState())).gameSession.context,initial.gameSession.context,'Styling previews do not change match context');
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({ok:true,checks,captures,errors,isolatedProfile:true,duoSnapshots:'local renderer fixtures only; no friend requests, invites or sessions created',ocrFixture:true},null,2));
  console.log(JSON.stringify({ok:true,captures:captures.length,output}));
}finally{
  if(mainPage)await mainPage.evaluate(()=>window.zyon.socialAction({type:'logout'})).catch(()=>{});
  await application?.close();
}
