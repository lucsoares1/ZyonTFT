import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { _electron } from 'playwright';

const baseline = process.argv.includes('--baseline');
const output = path.resolve('design/review/database-scroll-2026-11-18');
const credentials = JSON.parse(await fs.readFile('.runtime/duo-live-credentials.json', 'utf8'));
const environment = { ...process.env, ZYON_USER_DATA: path.resolve('.runtime/database-scroll-' + Date.now()), ZYON_TEST_BACKGROUND: '1' };
for (const key of ['ELECTRON_RUN_AS_NODE', 'ZYON_DEV_URL', 'ZYON_OVERLAY_PREVIEW', 'ZYON_OCR_FIXTURE', 'ZYON_PRESENCE_FIXTURE']) delete environment[key];
await fs.mkdir(output, { recursive: true });
const checks = [], errors = [];
let application, page;
async function capture(name) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
  const encoded = await application.evaluate(async ({ BrowserWindow }, url) => {
    const window = BrowserWindow.getAllWindows().find(window => window.webContents.getURL() === url);
    window.showInactive();
    try {
      await window.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      await new Promise(resolve => setTimeout(resolve, 180));
      return (await window.webContents.capturePage()).toPNG().toString('base64');
    } finally { window.hide(); }
  }, page.url());
  await fs.writeFile(path.join(output, name + '.png'), Buffer.from(encoded, 'base64'));
}
try {
  application = await _electron.launch({ args: ['.'], env: environment });
  await application.evaluate(({ app, BrowserWindow }) => {
    const quiet = window => { window.setOpacity(0); window.setIgnoreMouseEvents(true); window.webContents.setBackgroundThrottling(false); };
    BrowserWindow.getAllWindows().forEach(quiet);
    app.on('browser-window-created', (_, window) => quiet(window));
  });
  page = await application.firstWindow();
  page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('textbox', { name: 'E-mail da conta Zyon', exact: true }).fill(credentials[2].email);
  await page.getByLabel('Senha da conta Zyon', { exact: true }).fill(credentials[2].password);
  await page.getByRole('button', { name: 'Entrar no Zyon', exact: true }).click();
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Banco de dados', exact: true }).click();
  for (const [width, height] of (baseline ? [[1050, 820]] : [[1920, 1080], [1536, 1000], [1050, 820]])) {
    await application.evaluate(({ BrowserWindow, screen }, { url, width, height }) => {
      const display = screen.getPrimaryDisplay();
      screen.getPrimaryDisplay = () => ({ ...display, bounds: { ...display.bounds, width: width + 40, height: height + 40 }, workArea: { ...display.workArea, width: width + 40, height: height + 40 } });
      BrowserWindow.getAllWindows().find(window => window.webContents.getURL() === url).setBounds({ x: 0, y: 0, width, height });
    }, { url: page.url(), width, height });
    await page.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, { width, height });
    for (const [tab, file] of [['Campeões', 'champions'], ['Características', 'traits'], ['Itens', 'items'], ['Aprimoramentos', 'augments']]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const geometry = await page.evaluate(() => {
        const selectors = ['.workspace-content', '.database-page', '.champion-performance-wrap', '.data-table-wrap', '.pivot-augments'];
        return Object.fromEntries(selectors.map(selector => {
          const element = document.querySelector(selector);
          return [selector, element ? { top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, height: element.clientHeight, scroll: element.scrollHeight, overflow: getComputedStyle(element).overflowY } : null];
        }));
      });
      if (baseline) { console.log(JSON.stringify({ tab, geometry })); continue; }
      const scroller = page.locator(file === 'champions' ? '.champion-performance-wrap' : file === 'augments' ? '.pivot-augments' : '.data-table-wrap');
      console.log(JSON.stringify({ stage: 'top', tab, width }));
      await scroller.evaluate(element => { element.scrollTop = 0; });
      await capture(file + '-top-' + width);
      const bounds = await scroller.boundingBox();
      const footer = await page.locator('.statusbar').boundingBox();
      assert.ok(bounds.y + bounds.height <= footer.y + 1, tab + ' catalog stays above footer');
      await application.evaluate(({ BrowserWindow }, url) => { const window=BrowserWindow.getAllWindows().find(window => window.webContents.getURL() === url); window.setOpacity(.01); window.showInactive(); }, page.url());
      console.log(JSON.stringify({ stage: 'wheel', tab, width, bounds }));
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await Promise.race([page.mouse.wheel(0, 650), new Promise((_, reject) => setTimeout(() => reject(Error('Wheel input timed out')), 12000))]);
      await page.waitForTimeout(180);
      assert.ok(await scroller.evaluate(element => element.scrollTop > 0), tab + ' mouse wheel works');
      console.log(JSON.stringify({ stage: 'keyboard', tab, width }));
      await scroller.focus();
      await page.keyboard.press('Control+End');
      await page.waitForTimeout(150);
      const end = await scroller.evaluate(element => ({ top: element.scrollTop, height: element.clientHeight, total: element.scrollHeight }));
      assert.ok(end.top + end.height >= end.total - 2, tab + ' keyboard reaches last result');
      if (file !== 'augments') {
        const header = await scroller.locator('thead').boundingBox();
        assert.ok(Math.abs(header.y - bounds.y) <= 2, tab + ' header remains visible at last result');
      }
      await capture(file + '-bottom-' + width);
      assert.equal(await page.locator('.database-page').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, tab + ' no horizontal page overflow');
      checks.push({ tab, width, height, end });
    }
  }
  assert.deepEqual(errors, []);
  if (!baseline) await fs.writeFile(path.join(output, 'checks.json'), JSON.stringify({ ok: true, checks, errors, isolatedProfile: true }, null, 2));
  console.log(JSON.stringify({ ok: true, baseline, checks: checks.length }));
} finally {
  if (page) await page.evaluate(() => window.zyon.socialAction({ type: 'logout' })).catch(() => {});
  await application?.close();
}
