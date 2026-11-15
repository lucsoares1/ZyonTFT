const gameNames = new Set(require("./game-processes.json").map((name) => name.toLowerCase()));
class OverlayGate {
  constructor() {
    this.matchId = null;
    this.startedId = null;
    this.foreground = false;
    this.suppressed = false;
    this.interacting = false;
    this.endedId = null;
  }
  presence(data, guideHandle = null) {
    const previous = this.matchId;
    if (data.endedMatchId && data.endedMatchId === this.matchId) {
      this.matchId = null;
      this.startedId = null;
      this.suppressed = false;
      this.endedId = null;
    }
    // Only the native guide window may keep a confirmed game attached while
    // the player clicks its controls. The main app and other windows cannot.
    this.interacting = this.isGuideWindow(data, guideHandle);
    if (this.interacting) {
      this.foreground = true;
      return { changedMatch: false, ended: false };
    }
    const valid =
      data.foreground === true &&
      gameNames.has(String(data.processName || "").toLowerCase()) &&
      typeof data.matchId === "string" &&
      data.matchId.length > 0 &&
      data.matchId.length <= 100;
    if (valid && data.matchId !== this.matchId) {
      this.matchId = data.matchId;
      this.startedId = null;
      this.suppressed = false;
      this.endedId = null;
    }
    this.foreground = valid && data.matchId === this.matchId;
    return {
      changedMatch: this.matchId !== previous,
      ended: !!previous && !this.matchId,
    };
  }
  confirmGold(matchId, reading) {
    if (
      !this.foreground ||
      this.endedId === matchId ||
      matchId !== this.matchId ||
      reading?.status !== "confirmed" ||
      !Number.isInteger(reading.gold) ||
      reading.gold < 0 ||
      reading.gold > 999
    )
      return false;
    this.startedId = matchId;
    return !this.suppressed;
  }
  confirmRound(matchId,reading){
    if(!this.foreground||this.endedId===matchId||matchId!==this.matchId||reading?.status!=='confirmed'||!/^\d-\d$/.test(reading.round||''))return false;
    this.startedId=matchId;
    return !this.suppressed;
  }
  isGuideWindow(data, guideHandle) {
    return Boolean(
      guideHandle && data.foregroundWindow === guideHandle &&
      this.matchId && data.matchId === this.matchId &&
      this.endedId !== this.matchId &&
      this.startedId === this.matchId && !data.endedMatchId
    );
  }
  away() {
    this.foreground = false;
    this.interacting = false;
  }
  endGame(id) {
    if(id!==this.matchId)return;
    this.endedId=id;this.startedId=null;this.interacting=false;
  }
  resumeGame(id) {
    if(id===this.matchId&&id===this.endedId){this.endedId=null;this.startedId=null;this.suppressed=false;}
  }
  setEnabled(value) {
    this.suppressed = !value;
  }
  canShow(enabled, pinned) {
    return (
      !!enabled &&
      !!pinned &&
      this.foreground &&
      this.endedId !== this.matchId &&
      this.startedId === this.matchId &&
      !this.suppressed
    );
  }
}
module.exports = { OverlayGate };
