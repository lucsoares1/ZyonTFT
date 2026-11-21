import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

test('native banner alignment recovers half-card offsets without using a desktop capture',{skip:process.platform!=='win32'},()=>{
  const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/verify-shop-banner-anchor.ps1'],{encoding:'utf8',windowsHide:true,timeout:45000});
  const cases=JSON.parse(output.replace(/^\uFEFF/,''));
  assert.equal(cases.length,12);
  for(const scenario of cases){
    assert.ok(Math.abs(scenario.left-209*scenario.scale)<=8*scenario.scale);
    assert.equal(scenario.cards.length,5);
  }
});
