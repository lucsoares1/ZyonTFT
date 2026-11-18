import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { _electron } from 'playwright';

const profile = path.resolve('.runtime', 'presence-recovery-' + Date.now());
const environment = { ...process.env, ZYON_USER_DATA: profile, ZYON_TEST_BACKGROUND: '1' };
for (const key of ['ELECTRON_RUN_AS_NODE', 'ZYON_DEV_URL', 'ZYON_OVERLAY_PREVIEW', 'ZYON_PRESENCE_FIXTURE', 'ZYON_OCR_FIXTURE']) delete environment[key];
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const run = promisify(execFile);
let application;
try {
  application = await _electron.launch({ args: ['.'], env: environment });
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(window => window.hide()));
  const parentId = await application.evaluate(() => process.pid);
  const children = async () => {
    const script = `$children=@(Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentId}'|Where-Object {$_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'game-presence\.ps1'}|ForEach-Object {[int]$_.ProcessId});ConvertTo-Json -Compress -InputObject $children`;
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
    return JSON.parse(stdout.trim());
  };
  const waitWorker = async excluded => {
    const until = Date.now() + 20000;
    while (Date.now() < until) {
      const workers = await children();
      if (workers.length === 1 && workers[0] !== excluded) return workers[0];
      await pause(300);
    }
    const diagnostic=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Get-CimInstance Win32_Process -Filter 'ParentProcessId=${parentId}'|Select-Object ProcessId,Name,CommandLine|ConvertTo-Json -Compress`],{windowsHide:true});
    throw Error('Presence watcher did not recover: '+parentId+' '+diagnostic.stdout);
  };
  const original = await waitWorker(null);
  await pause(6500);
  assert.deepEqual(await children(), [original], 'Healthy signed-out worker is not restarted');
  const workers = [original];
  for (let cycle = 0; cycle < 2; cycle++) {
    const previous = workers.at(-1);
    const script = `$child=Get-CimInstance Win32_Process -Filter 'ProcessId=${previous} AND ParentProcessId=${parentId}';if($child -and $child.CommandLine -match 'game-presence\.ps1'){Stop-Process -Id $child.ProcessId -Force}else{throw 'Not the isolated app watcher'}`;
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true });
    workers.push(await waitWorker(previous));
  }
  const log = await fs.readFile(path.join(profile, 'startup.log'), 'utf8');
  assert.equal((log.match(/Foreground watcher interrupted; restarting/g) || []).length, 2);
  const result = { ok: true, workers, isolatedProfile: true, realWatcherRestarts: 2, signedOutHeartbeatStable: true };
  await fs.writeFile(path.join(profile, 'recovery.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await application?.close();
}
