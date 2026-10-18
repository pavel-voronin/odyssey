import test from 'node:test';import assert from 'node:assert/strict';
import {pointInGame,startsInGame} from '../input-region.js';
import {beginGesture,moveGesture,isTap} from '../gestures.js';
test('only a noninteractive target in the actual game frame starts a pointer gesture',()=>{
 const bounds={left:467,top:0,right:899,bottom:768},target={closest:()=>null},outside={closest:()=>null};
 const root={contains:node=>node===target,getBoundingClientRect:()=>bounds};
 assert.equal(startsInGame(root,{target,clientX:500,clientY:200}),true);
 assert.equal(startsInGame(root,{target:outside,clientX:200,clientY:200}),false);
 assert.equal(startsInGame(root,{target,clientX:466,clientY:200}),false);
 target.closest=()=>({tagName:'BUTTON'});assert.equal(startsInGame(root,{target,clientX:500,clientY:200}),false);
});
test('a pointer leaving the frame is rejected even when it moved less than the scroll threshold',()=>{
 const bounds={left:467,top:0,right:899,bottom:768},down={pointerId:1,clientX:468,clientY:200},g=beginGesture(down),up={pointerId:1,clientX:465,clientY:200};
 moveGesture(g,up);assert.equal(isTap(g,up),true);assert.equal(pointInGame(bounds,up),false);
 assert.equal(pointInGame(bounds,{clientX:467,clientY:0}),true);assert.equal(pointInGame(bounds,{clientX:899,clientY:200}),false);assert.equal(pointInGame(bounds,{clientX:500,clientY:768}),false);assert.equal(pointInGame(bounds,{clientX:NaN,clientY:20}),false);
});
