function parseRound(text){
 const matches=[...String(text||'').matchAll(/(?:^|[^\d])([1-9])\s*[-–—]\s*([1-9])(?=$|[^\d])/g)];
 const rounds=[...new Set(matches.map(m=>`${m[1]}-${m[2]}`))];
 return rounds.length===1?rounds[0]:null;
}
function freshRoundReading(){return {round:null,candidate:null,hits:0,lastSeen:0,lastAt:0,status:'waiting'};}
function acceptRound(previous,text,at){
 const round=parseRound(text);
 if(!Number.isFinite(at)||at<=previous.lastAt)return previous;
 if(!round)return {...previous,candidate:null,hits:0,lastAt:at,status:'unreadable'};
 const hits=round===previous.candidate&&at-previous.lastSeen<=4000?Math.min(2,previous.hits+1):1;
 return {round:hits>=2?round:previous.round,candidate:round,hits,lastSeen:at,lastAt:at,status:hits>=2?'confirmed':'confirming'};
}
module.exports={parseRound,freshRoundReading,acceptRound};
