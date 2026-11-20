import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {itemTooltipBounds}=createRequire(import.meta.url)('../electron/item-tooltip.cjs');
test('item tooltips stay outside the complete overlay on either monitor',()=>{
  for(const origin of [-1920,0])for(const height of [196,803])for(const left of [12,1320]){
    const display={x:origin,y:0,width:1920,height:1080};
    const owner={x:origin+left,y:12,width:568,height};
    const tip=itemTooltipBounds(owner,display,45,180);
    assert.ok(tip);
    assert.ok(tip.x>=display.x&&tip.y>=display.y);
    assert.ok(tip.x+tip.width<=display.x+display.width&&tip.y+tip.height<=display.y+display.height);
    assert.equal(tip.x<owner.x+owner.width&&tip.x+tip.width>owner.x&&tip.y<owner.y+owner.height&&tip.y+tip.height>owner.y,false);
  }
});
test('item tooltip declines to cover the overlay when no exterior space exists',()=>{
  const display={x:0,y:0,width:568,height:196};
  assert.equal(itemTooltipBounds(display,display,40,180),null);
});
