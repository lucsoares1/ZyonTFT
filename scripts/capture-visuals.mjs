import { _electron as electron } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const out = path.resolve('design/review/0.5');
await fs.mkdir(out, { recursive: true });
const env = { ...process.env, ZYON_USER_DATA: path.resolve('.runtime', `visual-05-${Date.now()}`) };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ZYON_DEV_URL;
const app = await electron.launch({ args: ['.'], env });
try {
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1536, 1024));
  const ready = async () => {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every(i => i.complete && i.naturalWidth > 0));
  };
  const capture = async name => { await ready(); await page.screenshot({ path: path.join(out, name) }); };
  await page.getByRole('heading', { name: 'Composições', exact: true }).waitFor();
  await capture('compositions.png');
  await page.getByRole('button', { name: 'Expandir AP Exodia', exact: true }).click();
  await capture('expanded.png');
  await page.setViewportSize({ width: 1536, height: 1500 });
  await ready();
  await page.locator('.row-expanded').screenshot({ path: path.join(out, 'composition-detail.png') });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.locator('.comp-list').evaluate(el => el.scrollTop = 125);
  await capture('guide-and-checklist.png');
  await page.getByRole('button', { name: 'Planejar tabuleiro', exact: true }).click();
  await capture('planner.png');
  await page.locator('.planner-board').screenshot({ path: path.join(out, 'board.png') });
  console.log(await page.locator('.tft-board-grid').evaluate(grid => ({
    grid: grid.getBoundingClientRect().toJSON(),
    cells: [...grid.querySelectorAll('.tft-hex')].map(e => e.getBoundingClientRect().toJSON()).filter((_,i)=>[0,1,7,14,21,27].includes(i)),
  })));
  await page.setViewportSize({ width: 1280, height: 800 });
  await capture('planner-1280.png');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await capture('planner-1920.png');
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.locator('.overlay-toggle').click();
  const native = await app.waitForEvent('window');
  await native.locator('.native-board-panel .occupied').first().waitFor();
  await native.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
  await native.locator('.overlay-mini').screenshot({ path: path.join(out, 'native-overlay.png'), omitBackground: true });
} finally { await app.close(); }
