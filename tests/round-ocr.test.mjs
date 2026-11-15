import test from 'node:test';import assert from 'node:assert/strict';
import {parseRound,freshRoundReading,acceptRound} from '../electron/round-ocr.cjs';
test('only a single explicit stage-round pair is accepted from the top crop',()=>{
 for(const [text,round]of [['3-3','3-3'],['Round 4-1','4-1'],[' 1 – 2 ','1-2'],['5—7','5-7']])assert.equal(parseRound(text),round);
 for(const text of ['Round','29','Nv. 8','3/3','0-1','13-3','3-30','3-3 4-1',''])assert.equal(parseRound(text),null,text);
});
test('two independent captures confirm the bar; blank, delayed or duplicate captures cannot confirm new evidence',()=>{
 let r=acceptRound(freshRoundReading(),'Round 3-3',1000);assert.equal(r.status,'confirming');
 assert.equal(acceptRound(r,'Round 3-3',1000).status,'confirming');
 r=acceptRound(r,'Round 3-3',1800);assert.equal(r.round,'3-3');assert.equal(r.status,'confirmed');
 r=acceptRound(r,'',2600);assert.equal(r.round,'3-3');assert.equal(r.status,'unreadable');
 assert.equal(acceptRound(r,'Round 1-1',2200),r,'late captures cannot override a newer unreadable observation');
 assert.equal(acceptRound(r,'Round 3-3',3400).status,'confirming');
 assert.equal(acceptRound(r,'Round 1-1',9000).round,'3-3');
});
