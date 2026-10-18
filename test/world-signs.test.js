import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {tavernAvailable,tavernIn} from '../modules/interiors.js';
import {interiorDoorSigns,paintWorldSymbol,worldSignKind} from '../world-signs.js';
import {paintInterior} from '../interior-view.js';
import {Scene} from '../scene.js';
function recorder(){const calls=[];const ctx=new Proxy({},{get:(o,key)=>key in o?o[key]:(...args)=>calls.push([key,...args]),set:(o,key,value)=>(o[key]=value,true)});return {ctx,calls};}
test('symbols follow real linked door edges and target kinds, without opening a missing passage',()=>{
 const s=createWorld(0),d=tavernIn(s,'a1'),hall=s.areas[d.hall],room=s.areas[d.room];
 assert.deepEqual(interiorDoorSigns(s,hall).map(p=>[p.kind,p.direction,p.to]),[['exit',-1,'a1'],['bed',1,room.id]]);
 assert.deepEqual(interiorDoorSigns(s,room).map(p=>[p.kind,p.direction,p.to]),[['hall-return',-1,hall.id]]);
 room.objects[0].x=92;assert.equal(interiorDoorSigns(s,room)[0].direction,1);
 delete s.edges[[room.id,hall.id].sort().join('|')];assert.deepEqual(interiorDoorSigns(s,room),[]);
 hall.objects.push({id:'fake',kind:'door',x:50,to:'missing'});assert.equal(interiorDoorSigns(s,hall).length,1);
});
test('closed lodging and taverns keep identifying signs without changing admission, stock or world state',()=>{
 const s=createWorld(0),d=tavernIn(s,'a1'),hall=s.areas[d.hall],room=s.areas[d.room];d.closed=true;room.lodging.state='burned';
 const before=serialize(s);assert.equal(tavernAvailable(s,d),false);assert.ok(interiorDoorSigns(s,hall).some(p=>p.kind==='bed'));assert.ok(interiorDoorSigns(s,room).some(p=>p.kind==='hall-return'));
 for(const a of [hall,room]){const {ctx,calls}=recorder();paintInterior(ctx,a,320,180,145,s);assert.equal(calls.some(c=>c[0]==='fillText'),false);}
 assert.equal(serialize(s),before);assert.equal(serialize(restore(before)),before);
});
test('each vector symbol is finite and language independent; arrow direction does not mirror a mug or bed',()=>{
 for(const kind of ['mug','bed','exit','hall-return','help','sea','road','neutral'])for(const direction of [-1,1]){const {ctx,calls}=recorder();paintWorldSymbol(ctx,kind,10,20,16,direction);assert.ok(calls.some(c=>['stroke','fillRect'].includes(c[0])));assert.ok(calls.every(c=>!['fillText','strokeText'].includes(c[0])));assert.ok(calls.flat().filter(v=>typeof v==='number').every(Number.isFinite));}
 for(const kind of ['mug','bed']){const left=recorder(),right=recorder();paintWorldSymbol(left.ctx,kind,0,0,16,-1);paintWorldSymbol(right.ctx,kind,0,0,16,1);assert.deepEqual(left.calls,right.calls);}
 assert.deepEqual(['✚','≈','↓','unknown'].map(worldSignKind),['help','sea','road','neutral']);
});
test('the actual facade only marks its tavern building; legacy labels remain available when the module is off',()=>{
 const s=createWorld(0),d=tavernIn(s,'a1'),a=s.areas.a1,{ctx,calls}=recorder();s.hero.area=a.id;
 const scene=Object.create(Scene.prototype);Object.assign(scene,{ctx,state:s,canvas:{clientWidth:390},shadowCasters:[],contours:{world:()=>[]},facade:()=>{}});
 const profile=a.facades.profiles.find(p=>p.id===d.building);assert.ok(profile);
 let marked=0;scene.tavernSign=()=>marked++;scene.house(100,140,1,undefined,undefined,profile);assert.equal(marked,1);
 scene.house(250,140,1,undefined,undefined,{...profile,id:'ordinary-house'});assert.equal(marked,1);assert.equal(calls.some(c=>c[0]==='fillText'),false);
 setModule(s,'world-signs',false);scene.house(100,140,1,undefined,undefined,profile);assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='ТРАКТИР'));
 const legacy=recorder();paintInterior(legacy.ctx,s.areas[d.hall],390,180,145,s);assert.ok(legacy.calls.some(c=>c[0]==='fillText'&&c[1]==='ВЫХОД'));
});
test('visual on and off give the same actual simulation prefix and save replay',()=>{
 let on=createWorld(8),off=createWorld(8);setModule(off,'world-signs',false);
 const norm=s=>JSON.stringify(JSON.parse(serialize(s)),(k,v)=>k==='world-signs'?undefined:v);
 for(let i=0;i<240;i++){step(on);step(off);if(i%59===0){assert.equal(norm(on),norm(off));on=restore(serialize(on));off=restore(serialize(off));}}
 assert.equal(norm(on),norm(off));
});
