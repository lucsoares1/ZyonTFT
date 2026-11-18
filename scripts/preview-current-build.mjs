import fs from 'node:fs/promises';
import path from 'node:path';
import { _electron } from 'playwright';

const credentials = JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json', 'utf8'));
const environment = { ...process.env, ZYON_USER_DATA: path.resolve('.runtime/preview-fullhd-' + Date.now()), ZYON_TEST_BACKGROUND: '1' };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.ZYON_DEV_URL;
const duoPreview = process.argv.includes('--duo');
const destination = path.resolve(`design/review/reference-2026-11-17/main-current-${duoPreview?'duo-':''}1920x1080.png`);
let application;
let page;
try {
  application = await _electron.launch({ args: [process.cwd()], env: environment });
  await application.evaluate(({ BrowserWindow }) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.setOpacity(0);
      window.setIgnoreMouseEvents(true);
      window.setBackgroundColor('#0b1118');
      window.webContents.setBackgroundThrottling(false);
      window.setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
    }
  });
  page = await application.firstWindow();
  await page.getByRole('textbox', { name: 'E-mail da conta Zyon', exact: true }).fill(credentials[2].email);
  await page.getByLabel('Senha da conta Zyon', { exact: true }).fill(credentials[2].password);
  await page.getByRole('button', { name: 'Entrar no Zyon', exact: true }).click();
  await page.getByRole('heading', { name: 'Composições', exact: true }).waitFor();
  if (duoPreview) {
    await page.getByRole('button', { name: 'Duplas Dinâmicas', exact: true }).click();
    await page.locator('.social-panel').waitFor();
  }
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find(candidate => !candidate.webContents.getURL().includes('view='));
    window.setBounds({ x: 0, y: 0, width: 1920, height: 1080 });
  });
  const debuggerSession = await page.context().newCDPSession(page);
  await debuggerSession.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await page.waitForFunction(() => innerWidth === 1920 && innerHeight === 1080);
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image=>{const bounds=image.getBoundingClientRect();return bounds.top<innerHeight&&bounds.bottom>0;}).map(image => image.decode().catch(() => {})));
  });
  await application.evaluate(async ({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows().find(candidate => !candidate.webContents.getURL().includes('view='));
    window.showInactive();
    await window.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  });
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const screenshot = await debuggerSession.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: {x:0,y:0,width:1920,height:1080,scale:1} });
  await fs.writeFile(destination, Buffer.from(screenshot.data, 'base64'));
  console.log(destination);
} finally {
  if (page) await page.evaluate(() => window.zyon.socialAction({ type: 'logout' })).catch(() => {});
  await application?.close();
}
