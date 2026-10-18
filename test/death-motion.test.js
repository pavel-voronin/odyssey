import {test} from 'node:test';import assert from 'node:assert/strict';
import {DeathMotion} from '../motion.js';import {lethalViewFixture} from '../scripts/death-view-scenarios.mjs';
import {step,serialize,restore} from '../engine.js';import {Scene} from '../scene.js';
const world=()=>({seed:1,tick:0,hero:{lineage:'one',born:0,area:'road',alive:true,life:{}},people:{}});
test('one observed death falls once, then world ticks and repeated observations keep its final form',()=>{
 const s=world(),motion=new DeathMotion();motion.update(s,{now:0});s.tick++;s.hero.alive=false;s.hero.deathSnapshot={tick:s.tick,x:82};motion.update(s,{now:100});assert.equal(motion.progress(100),0);assert.equal(motion.progress(220),.5);assert.equal(motion.progress(340),1);
 const before=JSON.stringify(s);for(let i=0;i<10;i++){motion.update(s,{now:350+i});assert.equal(motion.progress(350+i),1);}assert.equal(JSON.stringify(s),before);
 for(let i=0;i<100;i++){s.tick++;motion.update(s,{now:400+i});assert.equal(motion.progress(400+i),1);}
});
test('loading, skipped offline ticks and selecting an already dead observer start at the settled pose',()=>{
 const s=world(),motion=new DeathMotion();motion.update(s);s.tick=100;s.hero.alive=false;s.hero.life.endedAt=20;motion.update(s,{now:50});assert.equal(motion.progress(50),1);
 motion.update({...s,hero:{...s.hero}},{now:60,reset:true});assert.equal(motion.progress(60),1);motion.update({...s,hero:{...s.hero,lineage:'other',alive:true}},{now:70});motion.update(s,{now:80});assert.equal(motion.progress(80),1);
 const legacy=new DeathMotion();delete s.hero.life.endedAt;legacy.update(s);assert.equal(legacy.progress(0),1);
});
test('off and reduced motion settle the event permanently, while a genuinely new death after a live interval can fall',()=>{
 const s=world(),motion=new DeathMotion();motion.update(s);s.tick++;s.hero.alive=false;s.hero.deathSnapshot={tick:1};motion.update(s,{now:100});assert.equal(motion.progress(150),50/240);assert.equal(motion.progress(160,false),1);assert.equal(motion.progress(170,true),1);
 s.tick++;s.hero.alive=true;motion.update(s,{now:200});s.tick++;s.hero.alive=false;s.hero.deathSnapshot={tick:3};motion.update(s,{now:300});assert.equal(motion.progress(300),0);assert.equal(motion.progress(540),1);
 const off=new DeathMotion();const copy=world();off.update(copy);copy.tick++;copy.hero.alive=false;off.update(copy,{now:10,animate:false});assert.equal(off.progress(10,true),1);
});
function withScene(run){
 const keys=['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio','performance'],originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),frames=new Map();let serial=0,clock=1000,resize;
 const rotations=[],glyphs=[],ctx=new Proxy({rotate:angle=>rotations.push(angle),fillText:text=>glyphs.push(text)},{get:(target,key)=>key in target?target[key]:key==='measureText'?text=>({width:String(text).length*6}):['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{}}),canvas={clientWidth:390,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx};
 const mocks={document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{constructor(fn){resize=fn;}observe(){}disconnect(){}},requestAnimationFrame:fn=>{const id=++serial;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),devicePixelRatio:1,performance:{now:()=>clock}};
 for(const [k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});let scene;
 try{scene=new Scene(canvas,{profileMode:'legacy'});const poses=[],person=scene.person.bind(scene);scene.person=(...args)=>{if(args[3])poses.push({...args[10],rotation:rotations.at(-1)});return person(...args);};run({scene,canvas,poses,glyphs,clock:value=>clock=value,resize:()=>resize()});}
 finally{scene?.destroy();for(const [k,value]of originals){if(value)Object.defineProperty(globalThis,k,value);else delete globalThis[k];}}assert.equal(frames.size,0);
}
test('a genuine lethal tick plays the first fall, while 100 later ticks, resize and reload never replay or flip it',()=>withScene(({scene,canvas,poses,clock,resize})=>{
 const {s,h}=lethalViewFixture();scene.update(s);step(s);assert.equal(h.alive,false);const dead=serialize(s);clock(1100);scene.update(s);assert.equal(poses.at(-1).progress,0);assert.equal(serialize(s),dead);clock(1220);scene.draw();assert.equal(poses.at(-1).progress,.5);clock(1340);scene.draw();assert.equal(poses.at(-1).progress,1);const rotation=poses.at(-1).rotation;assert.equal(rotation,-Math.PI/2);
 for(let i=0;i<100;i++){step(s);clock(1341+i);scene.update(s);assert.equal(poses.at(-1).progress,1);}assert.equal(s.nextGeneration,1);
 const before=serialize(s);canvas.clientWidth=800;resize();assert.equal(poses.at(-1).rotation,rotation);assert.equal(poses.at(-1).progress,1);assert.equal(serialize(s),before);scene.update(restore(before));assert.equal(poses.at(-1).progress,1);
}));
test('a collected item stays taken and its finished sparkle cannot replay on reload or later redraws',()=>withScene(({scene,glyphs,clock})=>{
 const {s,h}=lethalViewFixture(),a=s.areas.a0,o=a.objects.find(o=>o.kind==='loot');h.area=a.id;h.x=o.x;h.combat=null;h.goal={kind:'collect',area:a.id,x:o.x,object:o.id};scene.update(s);glyphs.length=0;step(s);assert.equal(o.taken,true);clock(1100);scene.update(s);assert.ok(glyphs.includes('✧'));
 const save=serialize(s);glyphs.length=0;scene.reduced=true;scene.redraw();scene.reduced=false;scene.redraw();assert.equal(glyphs.includes('✧'),false);scene.update(restore(save));assert.equal(glyphs.includes('✧'),false);clock(1500);scene.redraw();assert.equal(glyphs.includes('✧'),false);assert.equal(serialize(s),save);
}));
test('two genuine successive living attacks each retain their own action phase',()=>withScene(({scene,poses,clock})=>{
 const {s,h,enemy}=lethalViewFixture();h.hp=h.maxHp=500;enemy.attack=1;scene.update(s);const hp=enemy.hp;step(s);assert.equal(h.lastAction,'attack');clock(1100);scene.update(s);assert.equal(poses.at(-1).kind,'attack');assert.equal(poses.at(-1).progress,0);clock(1220);scene.draw();assert.equal(poses.at(-1).progress,.5);const hp1=enemy.hp;assert.ok(hp1<hp);
 step(s);clock(1300);scene.update(s);assert.equal(poses.at(-1).kind,'attack');assert.equal(poses.at(-1).progress,0);assert.ok(enemy.hp<hp1);assert.equal(h.alive,true);
}));
