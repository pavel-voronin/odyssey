import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize} from '../engine.js';
import {sceneProfile,profileColor,profileCacheSize,profileContext,SceneGrade} from '../color-profile.js';
function context(){const calls=[],stack=[];return {calls,fillStyle:'#abcdef',strokeStyle:'#123456',shadowColor:'#000000',globalCompositeOperation:'source-over',globalAlpha:1,save(){stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,shadowColor:this.shadowColor,globalCompositeOperation:this.globalCompositeOperation,globalAlpha:this.globalAlpha});},restore(){Object.assign(this,stack.pop());},setTransform(...args){calls.push(['transform',...args]);},drawImage(...args){calls.push(['image',...args]);},fillRect(...args){calls.push(['rect',this.fillStyle,this.globalCompositeOperation,...args]);},createLinearGradient(){assert.equal(this.calls,calls);return {stops:[],addColorStop(offset,color){this.stops.push([offset,color]);}};}};}
test('one stable profile follows real day, weather and underground conditions without changing appearance or RNG',()=>{
 const s=createWorld(0),a=s.areas.a1,before=serialize(s),day=sceneProfile(s,a,{id:'clear'});assert.deepEqual(sceneProfile(s,a,{id:'clear'}),day);assert.equal(serialize(s),before);
 const night=sceneProfile({...s,tick:210},a,{id:'clear'}),storm=sceneProfile(s,a,{id:'storm'}),cave=sceneProfile(s,{...a,type:'cave'},{id:'clear'});assert.notEqual(day.key,night.key);assert.notEqual(day.key,storm.key);assert.notEqual(day.key,cave.key);assert.equal(cave.underground,true);assert.ok(parseInt(profileColor('#cccccc',night).slice(1,3),16)<parseInt(profileColor('#cccccc',day).slice(1,3),16));assert.equal(serialize(s),before);
});
test('the cached affine conversion preserves alpha and caller colors across eviction and profile changes',()=>{
 const p={key:'#808080/#000000',multiply:'#808080',lift:'#000000'};assert.equal(profileColor('#ffffff',p),'#808080');assert.equal(profileColor('#ff800044',p),'#80400044');assert.equal(profileColor('not-a-color',p),'not-a-color');assert.equal(profileColor('#ffffff',null),'#ffffff');
 const expected=profileColor('#ab897677',p);for(let i=0;i<5000;i++)profileColor('#'+i.toString(16).padStart(6,'0'),p);assert.equal(profileCacheSize(),4096);assert.equal(profileColor('#ab897677',p),expected);const q={key:'#ffffff/#000000',multiply:'#ffffff',lift:'#000000'};assert.equal(profileColor('#ab897677',q),'#ab897677');assert.equal(profileColor('#ab897677',p),expected);
});
test('palette fallback binds native receivers, profiles gradient stops once and restores uncorrected style reads',()=>{
 const native=context(),p={key:'#808080/#000000',multiply:'#808080',lift:'#000000'},c=profileContext(native,()=>p);
 c.fillStyle='#ff0000';assert.equal(native.fillStyle,'#800000');assert.equal(c.fillStyle,'#ff0000');c.save();c.fillStyle='#00ff00';c.restore();assert.equal(c.fillStyle,'#ff0000');assert.equal(native.fillStyle,'#800000');c.strokeStyle=c.fillStyle;assert.equal(native.strokeStyle,'#800000');
 const g=c.createLinearGradient(0,0,10,10);g.addColorStop(0,'#ffffff88');g.addColorStop(1,'#00000000');c.fillStyle=g;assert.deepEqual(native.fillStyle.stops,[[0,'#80808088'],[1,'#00000000']]);c.shadowColor='#224466';assert.equal(native.shadowColor,'#112233');
});
test('one reusable buffer applies one image and exactly two correction passes, with bounded allocation and normal mode switching',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'OffscreenCanvas'),native=context();let allocations=0;class Buffer{constructor(w,h){this.width=w;this.height=h;this.context=context();allocations++;}getContext(){return this.context;}}
 Object.defineProperty(globalThis,'OffscreenCanvas',{value:Buffer,configurable:true,writable:true});
 try{const grade=new SceneGrade(native),p=sceneProfile({tick:210},{type:'village'},{id:'clear'});let pass=grade.begin(360,160,2,p);assert.equal(pass.mode,'buffer');assert.equal(grade.buffer.width,720);assert.equal(grade.buffer.height,320);pass.finish();assert.equal(native.calls.filter(c=>c[0]==='image').length,1);assert.deepEqual(native.calls.filter(c=>c[0]==='rect').map(c=>c[2]),['multiply','screen']);assert.equal(native.globalCompositeOperation,'source-over');
  grade.begin(360,160,2,p);assert.equal(allocations,1);const buffer=grade.buffer;grade.begin(720,180,1,p);assert.equal(buffer,grade.buffer);assert.equal(buffer.width,720);assert.equal(buffer.height,180);assert.equal(grade.begin(10000,10000,2,p).mode,'palette');assert.equal(buffer.width,720);assert.equal(buffer.height,180);assert.equal(allocations,1);assert.equal(grade.begin(360,160,1,p,'palette').mode,'palette');assert.equal(grade.begin(360,160,1,null).mode,'legacy');grade.destroy();assert.equal(buffer.width,1);assert.equal(buffer.height,1);
 }finally{if(old)Object.defineProperty(globalThis,'OffscreenCanvas',old);else delete globalThis.OffscreenCanvas;}
});
test('a failed buffer allocation falls back once and never applies both color and image correction',()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'OffscreenCanvas'),native=context();let attempts=0;Object.defineProperty(globalThis,'OffscreenCanvas',{value:class{constructor(){attempts++;throw Error('unavailable');}},configurable:true,writable:true});
 try{const grade=new SceneGrade(native),p=sceneProfile({tick:210},{type:'road'},{id:'clear'});for(let i=0;i<20;i++){const pass=grade.begin(360,160,1,p);assert.equal(pass.mode,'palette');pass.context.fillStyle='#aabbcc';pass.finish();}assert.equal(attempts,1);assert.equal(native.calls.filter(c=>c[0]==='image'||c[0]==='rect').length,0);assert.equal(native.fillStyle,profileColor('#aabbcc',p));assert.equal(grade.begin(360,160,1,null).mode,'legacy');grade.destroy();
 }finally{if(old)Object.defineProperty(globalThis,'OffscreenCanvas',old);else delete globalThis.OffscreenCanvas;}
});
