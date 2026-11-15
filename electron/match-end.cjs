const {parseLevel}=require("./level-ocr.cjs");
const {parseGold}=require("./gold-ocr.cjs");
function resultScreen(text){
  const clean=String(text||"").slice(0,4000).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return /(?:voce terminou em|partida encerrada|fim de jogo|resultado da partida|colocacao final|jogar novamente|play again|match complete|game over)/.test(clean)||
    /^\s*sair agora\s*$/m.test(clean)||
    /^\s*(?:vitoria|derrota|resultados?|victory|defeat|[1-8](?:o|º|°)?\s*(?:lugar|place))[.!]?\s*$/m.test(clean);
}
class MatchEndTracker{
  constructor(){this.reset();}
  reset(){this.matchId=null;this.hits=0;this.lastAt=0;}
  observe({matchId,at,levelText,goldText,endText}){
    if(this.matchId!==matchId){this.reset();this.matchId=matchId;}
    // A carousel, augment choice, pause, Alt+Tab or ordinary OCR failure is
    // never enough to erase purchases. Require an affirmative result screen.
    if(parseLevel(levelText)!==null||parseGold(goldText)!==null||!resultScreen(endText)){
      this.hits=0;return false;
    }
    if(!Number.isFinite(at)||at<=this.lastAt)return false;
    this.hits=at-this.lastAt<=10000?this.hits+1:1;this.lastAt=at;
    return this.hits>=2;
  }
}
module.exports={resultScreen,MatchEndTracker};
