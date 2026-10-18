import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFreshAction,bindFreshChoice} from '../fresh-action.js';

test('a revealed next-story control requires a fresh tap and consumes it once, while keyboard activation remains available',()=>{
  const button=new EventTarget(),root=new EventTarget(),view=new EventTarget();
  let finished=false,stories=0;
  bindFreshAction(button,()=>finished,()=>{stories++;finished=false;},root,view);
  const pointer={pointerId:1,button:0,isPrimary:true,clientX:50,clientY:50};
  const send=(target,type,props={})=>target.dispatchEvent(Object.assign(new Event(type),pointer,props));
  send(button,'pointerdown');finished=true; // A control becomes available during an old press.
  send(button,'click',{detail:1});assert.equal(stories,0);
  send(button,'pointerdown');send(button,'click',{detail:1});assert.equal(stories,1);
  send(button,'click',{detail:1});assert.equal(stories,1);
  finished=true;send(button,'pointerdown');send(root,'pointermove',{clientY:80});send(button,'click',{detail:1});assert.equal(stories,1);
  send(button,'pointerdown');send(root,'pointercancel');send(button,'click',{detail:1});assert.equal(stories,1);
  send(button,'pointerdown');send(view,'blur');send(button,'click',{detail:1});assert.equal(stories,1);
  send(button,'pointerdown');send(button,'click',{detail:1,pointerId:2});assert.equal(stories,1);
  send(button,'click',{detail:0});assert.equal(stories,2);
  send(button,'click',{detail:0});assert.equal(stories,2);
});
test('leaving the game boundary or resizing cancels succession even below the normal drag threshold',()=>{
  const button=new EventTarget(),root=new EventTarget(),view=new EventTarget();let stories=0;
  const cancel=bindFreshAction(button,()=>true,()=>stories++,root,view,e=>e.clientX>=0&&e.clientX<100);
  const pointer={pointerId:1,button:0,isPrimary:true,clientX:99,clientY:50};
  const send=(target,type,props={})=>target.dispatchEvent(Object.assign(new Event(type),pointer,props));
  send(button,'pointerdown');send(root,'pointermove',{clientX:101});send(button,'click',{detail:1,clientX:101});assert.equal(stories,0);
  send(button,'pointerdown');send(view,'resize');send(button,'click',{detail:1});assert.equal(stories,0);
  send(button,'pointerdown');cancel();send(button,'click',{detail:1});assert.equal(stories,0);
  send(button,'click',{detail:0,clientX:0});assert.equal(stories,1);
});

test('delegated observer choices reject a press on another row, a scroll, cancellation and a stale release',()=>{
 const list=new EventTarget(),root=new EventTarget(),view=new EventTarget(),selected=[];let enabled=true;
 const cancel=bindFreshChoice(list,e=>e.choice??null,()=>enabled,id=>selected.push(id),root,view);
 const pointer={pointerId:1,button:0,isPrimary:true,clientX:50,clientY:50,choice:'a'};
 const send=(target,type,props={})=>target.dispatchEvent(Object.assign(new Event(type),pointer,props));
 send(list,'click',{detail:1});assert.deepEqual(selected,[]);
 send(list,'pointerdown');send(list,'click',{detail:1,choice:'b'});assert.deepEqual(selected,[]);
 send(list,'pointerdown');send(root,'pointermove',{clientY:80});send(list,'click',{detail:1});assert.deepEqual(selected,[]);
 send(list,'pointerdown');cancel();send(list,'click',{detail:1});assert.deepEqual(selected,[]);
 send(list,'pointerdown');enabled=false;send(list,'click',{detail:1});assert.deepEqual(selected,[]);enabled=true;
 send(list,'pointerdown');send(list,'click',{detail:1});assert.deepEqual(selected,['a']);
 send(list,'click',{detail:1});assert.deepEqual(selected,['a']);
 send(list,'click',{detail:0,choice:'b'});assert.deepEqual(selected,['a','b']);
});
