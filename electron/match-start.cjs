const {parseLevel}=require('./level-ocr.cjs');
const {parseGold}=require('./gold-ocr.cjs');
// The standalone TFT client keeps its PID between games. A result screen can
// be missed while unfocused, so corroborate an early-game HUD across captures.
class MatchStartTracker{
 constructor(){this.reset();}
 reset(){this.matchId=null;this.candidate=null;this.firstAt=0;this.lastAt=0;this.hits=0;}
 observe({session,matchId,at,levelText,goldText,idle=false}){
  const level=parseLevel(levelText),gold=parseGold(goldText);
  const early=!idle&&session?.matchId===matchId&&!session.ended&&session.startedAt>0&&
   at-session.startedAt>=180000&&session.context?.level>=4&&level>=1&&level<=3&&
   session.context.level-level>=2&&gold!==null&&gold<=15&&Number.isFinite(at);
  if(!early){this.reset();return {pending:false,started:false};}
  if(this.matchId!==matchId||this.candidate!==level||at-this.lastAt>5000){
   this.reset();this.matchId=matchId;this.candidate=level;this.firstAt=at;
  }
  if(at>this.lastAt){this.hits++;this.lastAt=at;}
  const started=this.hits>=4&&at-this.firstAt>=1600;
  if(started)this.reset();
  return {pending:true,started};
 }
}
module.exports={MatchStartTracker};
