import test from "node:test";
import assert from "node:assert/strict";
import { OverlayGate } from "../electron/overlay-visibility.cjs";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const game = (id) => ({
  foreground: true,
  processName: "League of Legends",
  matchId: id,
});
const gold = { status: "confirmed", gold: 0 };
test('a confirmed round bar opens the focused game without gold; transient loss never removes its latch',()=>{
 const gate=new OverlayGate(),round={status:'confirmed',round:'3-3'};
 gate.presence(game('one'));assert.equal(gate.confirmRound('one',{...round,status:'confirming'}),false);
 assert.equal(gate.confirmRound('one',round),true);assert.equal(gate.canShow(true,true),true);
 assert.equal(gate.confirmGold('one',{status:'unreadable'}),false);assert.equal(gate.confirmRound('one',{status:'unreadable'}),false);assert.equal(gate.canShow(true,true),true);
 gate.presence({foreground:false,matchId:'one'});assert.equal(gate.canShow(true,true),false);assert.equal(gate.confirmRound('one',round),false);
 gate.presence(game('one'));assert.equal(gate.canShow(true,true),true);
 gate.setEnabled(false);assert.equal(gate.confirmRound('one',round),false);assert.equal(gate.canShow(true,true),false);
 gate.endGame('one');assert.equal(gate.confirmRound('one',round),false);
 gate.presence(game('two'));assert.equal(gate.confirmRound('one',round),false);assert.equal(gate.confirmRound('two',round),true);
});
test("native TFT shipping executable uses the same allowlist in both Windows readers and the gate", () => {
  const names = JSON.parse(fs.readFileSync("electron/game-processes.json", "utf8"));
  assert.ok(names.includes("TFTClient-Win64-Shipping"));
  for (const name of names) {
    const gate = new OverlayGate();
    gate.presence({ ...game("native"), processName: name.toUpperCase() });
    assert.equal(gate.confirmGold("native", { status: "confirmed", gold: 3 }), true, name);
  }
  for (const processName of ["LeagueClientUx", "TFTClient-Win64-Shipping-helper", "chrome"]) {
    const gate = new OverlayGate();
    gate.presence({ ...game("wrong"), processName });
    assert.equal(gate.confirmGold("wrong", gold), false);
  }
  for (const file of ["game-presence.ps1", "shop-reader.ps1"]) {
    const script = fs.readFileSync(`electron/${file}`, "utf8");
    assert.match(script, /Join-Path \$PSScriptRoot 'game-process.ps1'/);
    assert.match(script, /Test-ZyonGameProcess \$(candidate.ProcessName|foregroundName)/);
  }
});
test("Windows PowerShell 5 executes the shared matcher without nesting the JSON array", { skip: process.platform !== "win32" }, () => {
  const helper = path.resolve("electron/game-process.ps1").replaceAll("'", "''");
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    `. '${helper}'; @{count=$script:ZyonGameProcessNames.Count;shipping=(Test-ZyonGameProcess 'TFTClient-Win64-Shipping');league=(Test-ZyonGameProcess 'League of Legends');case=(Test-ZyonGameProcess 'tftclient-win64-shipping');browser=(Test-ZyonGameProcess 'brave');suffix=(Test-ZyonGameProcess 'TFTClient-Win64-Shipping-helper')} | ConvertTo-Json -Compress`,
  ], { windowsHide: true, timeout: 15000, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output.trim()), { count: 5, shipping: true, league: true, case: true, browser: false, suffix: false });
});
test("only a focused game with confirmed gold opens the overlay, including zero gold", () => {
  const gate = new OverlayGate();
  assert.equal(gate.canShow(true, true), false);
  gate.presence({ ...game("one"), processName: "LeagueClientUx" });
  assert.equal(gate.confirmGold("one", gold), false);
  gate.presence(game("one"));
  assert.equal(gate.canShow(true, true), false);
  assert.equal(
    gate.confirmGold("one", { status: "confirming", gold: 18 }),
    false,
  );
  assert.equal(gate.confirmGold("one", gold), true);
  assert.equal(gate.canShow(true, true), true);
  assert.equal(gate.canShow(true, false), false);
});
test("Alt+Tab hides immediately, stale gold cannot reopen it, returning resumes the same match", () => {
  const gate = new OverlayGate();
  gate.presence(game("one"));
  gate.confirmGold("one", gold);
  gate.presence({ foreground: false, matchId: "one" });
  assert.equal(gate.canShow(true, true), false);
  assert.equal(gate.confirmGold("one", gold), false);
  gate.presence(game("one"));
  assert.equal(gate.canShow(true, true), true);
  gate.away();
  assert.equal(gate.canShow(true, true), false);
});
test("a new process needs its own gold and manual hiding is respected until the next match", () => {
  const gate = new OverlayGate();
  gate.presence(game("one"));
  gate.confirmGold("one", gold);
  gate.setEnabled(false);
  assert.equal(gate.confirmGold("one", gold), false);
  assert.equal(gate.canShow(true, true), false);
  gate.presence(game("two"));
  assert.equal(gate.confirmGold("one", gold), false);
  assert.equal(gate.canShow(true, true), false);
  assert.equal(gate.confirmGold("two", gold), true);
  assert.equal(gate.canShow(true, true), true);
  gate.presence({ foreground: false, endedMatchId: "two" });
  assert.equal(gate.matchId, null);
  assert.equal(gate.canShow(true, true), false);
});
test("clicking the exact guide window keeps a confirmed match attached; the main app never does", () => {
  const gate = new OverlayGate();
  const guide = { foreground: false, foregroundWindow: "100", matchId: "one" };
  gate.presence(game("one"));
  gate.presence(guide, "100");
  assert.equal(gate.canShow(true, true), false, "guide cannot start a game before gold");
  gate.presence(game("one"));
  gate.confirmGold("one", gold);
  assert.equal(gate.interacting, false);
  assert.equal(gate.isGuideWindow(guide, "100"), true, "reader may identify the guide before the next focus heartbeat");
  gate.presence(guide, "100");
  assert.equal(gate.interacting, true);
  assert.equal(gate.canShow(true, true), true);
  gate.presence({ ...guide, foregroundWindow: "main-app" }, "100");
  assert.equal(gate.interacting, false);
  assert.equal(gate.canShow(true, true), false);
  gate.presence({ ...guide, matchId: "other" }, "100");
  assert.equal(gate.canShow(true, true), false);
  gate.presence({ ...guide, endedMatchId: "one" }, "100");
  assert.equal(gate.matchId, null);
  assert.equal(gate.canShow(true, true), false);
});
