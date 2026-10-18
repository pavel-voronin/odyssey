import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorld,step,serialize,restore,createNextStory} from '../engine.js';
import {setModule} from '../rules.js';
import {bodyRemains,recordRemains,recordPersonRemains} from '../modules/remains.js';
import {ActorTracks,remainsView,visibleRemains,REMAINS_TICKS} from '../actor-facts.js';
import {personNeeds} from '../modules/needs.js';
import {partyHurt} from '../modules/social.js';
import {deathFixture} from '../scripts/death-record-scenarios.mjs';
import {meaningFixture} from '../scripts/event-meaning-scenarios.mjs';
import {partyCare} from '../modules/party-needs.js';
import {sendGuards,ordersTick} from '../modules/orders.js';
import {receiveItem,recoverHeirloom} from '../modules/inventory.js';
import {recordSilhouette} from '../silhouette.js';
import {paintPet} from '../pet-shapes.js';
import {petMotion} from '../pet-motion.js';
import {createPerson} from '../modules/lineage.js';
import {race} from '../content.js';
import {Scene} from '../scene.js';
import {encounter} from '../modules/encounters.js';
import {PETS} from '../content.js';
const bodies=s=>Object.values(s.remains?.byId||{});
function lethal(kind='battle'){const f=deathFixture(kind);setModule(f.s,'remains',true);return f;}
function killed(shape='wolf'){
  const f=meaningFixture('victory');setModule(f.s,'remains',true);f.enemy.shape=shape;step(f.s);assert.equal(f.enemy.alive,false);return f;
}
function forgetRecords(s){
  delete s.remains;
  for(const h of Object.values(s.actorStates||{})){delete h.remainsId;if(h.deathSnapshot)delete h.deathSnapshot.remainsId;}
  for(const p of Object.values(s.people))delete p.remainsId;
  for(const g of s.graves)delete g.remainsId;
  for(const a of Object.values(s.areas))for(const o of a.objects){delete o.remainsId;if(o.deathView)delete o.deathView.remainsId;}
  for(const l of s.lives)delete l.remainsId;
}
test('one real hero death links its one body, person, marker, snapshot and biography without cloning the cache',()=>{
  const {s,h}=lethal(),gold=h.gold;step(s);const b=bodyRemains(s,h),a=s.areas[h.area];
  assert.equal(bodies(s).length,1);assert.equal(b.source.id,h.lineage);assert.equal(b.carrier,null);
  assert.equal(s.people[h.lineage].remainsId,b.id);assert.equal(s.graves[0].remainsId,b.id);
  assert.equal(a.objects.find(o=>o.kind==='grave').remainsId,b.id);assert.equal(h.deathSnapshot.remainsId,b.id);
  assert.equal(s.lives[0].remainsId,b.id);assert.equal(b.position.kind,'area');assert.equal(b.position.x,h.x);
  const cache=a.objects.find(o=>o.kind==='heirloom');assert.ok(cache);assert.deepEqual(b.loot,[{kind:'cache',area:a.id,object:cache.id}]);
  assert.equal(cache.gold,Math.floor(gold*.3));assert.equal(h.gold,0);assert.equal(b.gold,undefined);assert.equal(b.items,undefined);assert.equal(b.inventory,undefined);
  const snapshot=JSON.stringify(b.death);for(let i=0;i<100;i++)step(s);
  assert.equal(JSON.stringify(b.death),snapshot);assert.equal(bodies(s).length,1);assert.equal(s.lives.length,1);assert.equal(h.alive,false);assert.equal(s.generation,1);
});
test('a fatal sea crossing retains the exact journey instead of placing a physical body at the departure port',()=>{
  const {s,h}=lethal('storm');step(s);const b=bodyRemains(s,h);
  assert.equal(h.alive,false);assert.equal(h.transit,null);assert.equal(b.position.kind,'transit');
  assert.equal(b.position.journey.mode,'sea');assert.equal(b.position.journey.from,'a2');assert.equal(b.position.journey.to,'a1');
  assert.equal(b.position.journey.total,2);assert.equal(b.position.journey.remaining,3);
  assert.equal(remainsView(s,s.areas[h.area].objects.find(o=>o.kind==='grave')),null);
  assert.equal(b.death.position.kind,'transit');const save=serialize(s);assert.equal(serialize(restore(save)),save);
});
test('an actual enemy stays one physical body beyond the old visual TTL, with no revived enemy or replayed fall',()=>{
  const {s,enemy}=killed(),b=bodyRemains(s,enemy),track=new ActorTracks();
  assert.equal(b.source.kind,'enemy');assert.equal(b.source.id,enemy.id);assert.equal(b.death.anatomy.form,'wolf');
  assert.equal(enemy.deathView.remainsId,b.id);assert.equal(bodies(s).length,1);
  s.tick+=REMAINS_TICKS+1;assert.equal(visibleRemains(s,enemy),false);const before=serialize(s);
  assert.equal(remainsView(s,enemy).body,b);track.update(s,'after-old-animation');assert.equal(track.tracks.get(enemy.id).dead,true);assert.equal(track.tracks.get(enemy.id).death,false);
  for(let i=0;i<20;i++){remainsView(s,enemy);bodyRemains(s,enemy);}assert.equal(serialize(s),before);
  assert.equal(serialize(restore(before)),before);assert.equal(enemy.alive,false);
});
test('a corpse keeps its resolved facing when a different observer approaches from the opposite side',()=>{
  const {s,enemy}=killed(),b=bodyRemains(s,enemy),snapshot=JSON.stringify(b.death),directions=[];
  for(const offset of [-20,20]){const copy=restore(serialize(s));copy.hero.x=b.position.x+offset;const tracks=new ActorTracks();tracks.update(copy,'view-'+offset);directions.push(tracks.tracks.get(enemy.id).direction);}
  assert.equal(directions[0],directions[1]);assert.equal(directions[0],b.facing);assert.equal(JSON.stringify(b.death),snapshot);
});
test('a new local starvation death records the actual resident and only one marker without giving another wallet',()=>{
  const s=createWorld(9),p=s.people[s.areas.a1.population.find(id=>s.people[id].alive)];
  p.area='a1';p.x=0;p.health=1;p.needs={hunger:100,energy:100,loneliness:0};s.tick=96;
  const wealth=p.agenda.wealth;assert.equal(personNeeds(s,p,{log:()=>{}},{onlyUpkeep:true,migration:false}),true);
  assert.equal(p.alive,false);const b=bodyRemains(s,p);assert.equal(b.position.area,'a1');assert.equal(b.position.x,0);
  assert.equal(b.death.source.id,p.id);assert.equal(b.death.tick,96);assert.equal(p.agenda.wealth,wealth);
  const count=bodies(s).length;recordPersonRemains(s,p);assert.equal(bodies(s).length,count);
  assert.equal(s.areas.a1.objects.filter(o=>o.remainsId===b.id).length,1);
});
test('a real child casualty retains its small body and NPC outfit rather than gaining the observed adventurer backpack',()=>{
  const s=createWorld(9);for(const id of Object.keys(s.rules))setModule(s,id,false);
  for(const id of ['remains','npc-needs','lineage','appearance'])setModule(s,id,true);
  s.hero.area='a1';s.hero.x=80;
  const id=createPerson(s,{name:'Маленький житель',race:'human',role:'ребёнок',area:'a1',x:35,alive:true}),p=s.people[id];
  p.health=1;p.needs={hunger:100,energy:100,loneliness:0};s.tick=96;personNeeds(s,p,{log:()=>{}},{onlyUpkeep:true,migration:false});
  const b=bodyRemains(s,p);assert.equal(p.alive,false);assert.equal(b.death.role,'ребёнок');assert.equal(b.death.anatomy.stature,.65);assert.equal(b.death.traveller,false);
  const keys=['document','matchMedia','ResizeObserver','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio','performance'],originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const ctx=new Proxy({},{get:(_,key)=>key==='measureText'?text=>({width:String(text).length*6}):['createLinearGradient','createRadialGradient'].includes(key)?()=>({addColorStop(){}}):()=>{}});
  const canvas={clientWidth:390,clientHeight:180,width:0,height:0,dataset:{},getContext:()=>ctx},mocks={document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},devicePixelRatio:1,performance:{now:()=>1000}};
  for(const [k,value]of Object.entries(mocks))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});
  let scene;const deaths=[];
  try{scene=new Scene(canvas,{profileMode:'legacy'});const person=scene.person.bind(scene);scene.person=(...args)=>{if(args[10]?.kind==='death')deaths.push(args);return person(...args);};const before=serialize(s);scene.update(s);assert.equal(serialize(s),before);}
  finally{scene?.destroy();for(const [k,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}}
  assert.equal(deaths.length,1);assert.equal(deaths[0][3],false);assert.equal(deaths[0][9].height,race('human').height*.65);assert.deepEqual(deaths[0][8],b.death.appearance);
});
test('a real pet casualty links its existing memorial and preserves its individual identity and form',()=>{
  let f;
  for(let seed=0;seed<30&&!f;seed++){
    const s=createWorld(seed),c={id:'cat',uid:'body-test-cat',name:'Кошка',attack:1,hp:1,maxHp:12};s.hero.companions=[c];
    partyHurt(s,100,{log:()=>{}});if(!s.hero.companions.length)f={s,c};
  }
  assert.ok(f);const {s,c}=f,b=bodyRemains(s,c),g=s.areas[s.hero.area].objects.find(o=>o.id==='memorial-'+c.uid);
  assert.equal(b.source.id,c.uid);assert.equal(b.death.shape,'cat');assert.equal(g.remainsId,b.id);assert.equal(bodies(s).length,1);
  s.tick+=81;assert.equal(remainsView(s,g).body,b);assert.equal(b.items,undefined);
});
test('two actual current cat acquisitions retain their separate birth IDs through death without inventing people',()=>{
  const s=createWorld(31),h=s.hero,people=Object.keys(s.people).length;setModule(s,'invitation-rhythm',false);h.stats.spirit=10;
  const random=()=> (PETS.findIndex(p=>p.id==='cat')+.01)/PETS.length;
  for(let n=0;n<2;n++){const o={id:'current-cat-'+n,kind:'encounter',encounter:'familiar',name:'Знакомство у дороги',x:h.x,resolved:false};s.areas[h.area].objects.push(o);encounter(s,o,{random,log(){}});}
  const cats=[...h.companions],ids=cats.map(c=>c.uid);assert.equal(cats.length,2);assert.ok(ids.every(Boolean));assert.equal(new Set(ids).size,2);for(const c of cats)c.hp=1;
  partyHurt(s,100,{log:()=>{}});assert.equal(h.companions.length,0);assert.equal(h.social.lostCompanions,2);assert.deepEqual(cats.map(c=>c.uid),ids);
  assert.equal(bodies(s).length,2);assert.equal(new Set(cats.map(c=>c.remainsId)).size,2);assert.equal(s.remains.nextCompanion,undefined);
  for(const c of cats){const b=bodyRemains(s,c);assert.equal(b.source.id,c.uid);assert.equal(b.death.name,c.name);assert.equal(b.death.shape,'cat');assert.equal(b.source.kind,'companion');assert.equal(s.areas[h.area].objects.filter(o=>o.id==='memorial-'+c.uid&&o.remainsId===b.id).length,1);}
  assert.equal(Object.keys(s.people).length,people);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);
});

test('each supported pet corpse keeps its horizontal silhouette on the floor instead of rotating into an upright body',()=>{
  for(const id of ['cat','fox','owl']){
    const pose=petMotion(id,{dead:true},1,{animate:false});
    const alive=recordSilhouette(c=>paintPet(c,id,{motion:pose})).polygons.flat();
    const dead=recordSilhouette(c=>paintPet(c,id,{motion:{...pose,dead:true}})).polygons.flat();
    assert.ok(dead.flat().every(Number.isFinite));assert.ok(Math.max(...dead.map(p=>p[1]))<.001);
    const height=points=>Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
    const width=points=>Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
    assert.ok(height(dead)<height(alive)*.5);assert.ok(width(dead)>=width(alive)*.95);
  }
});
test('a guard killed by a real reply leaves his own body at his actual coordinate without a hero death or reward',()=>{
  const {s,enemy}=meaningFixture();setModule(s,'orders',true);setModule(s,'remains',true);
  const source=s.areas.a1,target=s.areas[s.hero.area],ctx={route:()=>[source.id,target.id],log:()=>{}};
  assert.equal(sendGuards(s,source,{enemy:enemy.id,area:target.id},ctx),true);
  const order=s.society.orders.at(-1),p=s.people[order.person];order.stage='fighting';p.area=target.id;p.x=37;p.status='guarding';p.health=1;
  enemy.hp=enemy.maxHp=10000;enemy.attack=1000;const gold=s.hero.gold,kills=s.hero.kills;
  ordersTick(s,ctx);assert.equal(p.alive,false);const b=bodyRemains(s,p);
  assert.equal(b.position.area,target.id);assert.equal(b.position.x,37);assert.equal(b.source.id,p.id);
  assert.equal(s.hero.alive,true);assert.equal(s.hero.gold,gold);assert.equal(s.hero.kills,kills);assert.equal(s.lives.length,0);assert.equal(enemy.alive,true);
});
test('a passenger starvation death stores the exact shared crossing and never adds a corpse to the old port',()=>{
  const {s,h}=lethal('storm');for(const id of ['companions','npc-party-needs','npc-needs'])setModule(s,id,true);
  setModule(s,'npc-personal-supplies',false);setModule(s,'supply',false);
  const p=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage),c={uid:'actual-passenger',id:p.id,person:p.id,name:p.name,hp:1,maxHp:100};
  p.health=1;p.needs={hunger:100,energy:100,loneliness:0};h.companions=[c];h.inventory.rations=0;s.tick=96;
  const journey=JSON.stringify(h.transit),count=s.areas[h.area].objects.length;
  partyCare(s,c,{log:()=>{}});assert.equal(p.alive,false);assert.equal(p.area,null);assert.equal(p.x,null);assert.equal(h.companions.length,0);
  const b=bodyRemains(s,p);assert.equal(b.position.kind,'transit');assert.equal(JSON.stringify(b.position.journey),journey);
  assert.equal(s.areas[h.area].objects.length,count);assert.equal(bodies(s).length,1);assert.equal(b.carrier,null);
});
test('the same original item moves from the finite death cache to one successor while the corpse remains propertyless',()=>{
  const {s,h}=lethal(),ctx={random:()=>.2,log:()=>{},gainXp:()=>{}};setModule(s,'equipment',true);
  const item=receiveItem(s,ctx,2);step(s);const b=bodyRemains(s,h),cache=s.areas[h.area].objects.find(o=>o.kind==='heirloom');
  assert.equal(cache.items.filter(i=>i.id===item.id).length,1);assert.equal(h.bag.length,0);assert.ok(Object.values(h.equipment).every(v=>v===null));
  const snapshot=JSON.stringify(b),gold=cache.gold;createNextStory(s);const before=s.hero.gold;
  s.hero.area=b.position.area;s.hero.x=cache.x;recoverHeirloom(s,cache,ctx);
  assert.equal(s.hero.gold,before+gold);assert.equal(cache.items.length,0);assert.equal(cache.gold,0);assert.equal(cache.taken,true);
  assert.equal([...s.hero.bag,...Object.values(s.hero.equipment).filter(Boolean)].filter(i=>i.id===item.id).length,1);
  const after=serialize(s);recoverHeirloom(s,cache,ctx);assert.equal(serialize(s),after);assert.equal(JSON.stringify(b),snapshot);
});
test('frequent body observations and checkpoint loading preserve a genuine continued world prefix exactly',()=>{
  const {s,enemy}=killed(),copy=restore(serialize(s)),other=copy.areas[copy.hero.area].objects.find(o=>o.id===enemy.id);
  for(let i=0;i<160;i++){
    for(let q=0;q<8;q++){remainsView(copy,other);bodyRemains(copy,other);}
    step(s);step(copy);assert.equal(serialize(copy),serialize(s));
    if(i%20===0)assert.equal(serialize(restore(serialize(copy))),serialize(s));
  }
  assert.equal(s.tick,161);assert.equal(enemy.alive,false);
  assert.equal(bodies(s).filter(b=>b.source.kind==='enemy'&&b.source.id===enemy.id).length,1);
  assert.equal(new Set(bodies(s).map(b=>b.deathId)).size,bodies(s).length);
});
test('moving a current body position cannot edit its historical death place or create another carrier',()=>{
  const {s,enemy}=killed(),b=bodyRemains(s,enemy),snapshot=JSON.stringify(b.death);
  b.position={kind:'area',area:s.hero.area,x:14};assert.equal(remainsView(s,enemy).x,14);assert.equal(JSON.stringify(b.death),snapshot);
  b.carrier={kind:'person',id:s.hero.lineage};assert.equal(remainsView(s,enemy),null);
  assert.equal(bodies(s).length,1);assert.equal(b.carrier.id,s.hero.lineage);assert.equal(JSON.stringify(b.death),snapshot);
});
test('an explicit new story keeps the old remains, finite cache and historical snapshot rather than another corpse',()=>{
  const {s,h}=lethal();step(s);const b=bodyRemains(s,h),snapshot=JSON.stringify(b),tick=s.tick;
  createNextStory(s);assert.equal(s.tick,tick);assert.equal(s.hero.alive,true);assert.equal(s.hero.remainsId,undefined);
  assert.equal(bodyRemains(s,h),b);assert.equal(JSON.stringify(b),snapshot);assert.equal(bodies(s).length,1);
  assert.equal(s.lives.length,1);assert.equal(s.actorStates[h.lineage].hp,0);
});
test('OFF creates no new physical history, retains an existing body and restores the old expiring view',()=>{
  const {s,enemy}=killed(),b=bodyRemains(s,enemy),snapshot=JSON.stringify(b);setModule(s,'remains',false);s.tick+=100;
  assert.equal(remainsView(s,enemy),null);assert.equal(bodyRemains(s,enemy),b);assert.equal(JSON.stringify(b),snapshot);
  const f=lethal();setModule(f.s,'remains',false);step(f.s);assert.equal(f.h.alive,false);assert.equal(f.s.remains,undefined);
  const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);
  setModule(s,'remains',true);assert.equal(remainsView(s,enemy).body,b);assert.equal(JSON.stringify(b),snapshot);
});
test('a current death while OFF stays untracked after re-enable and reload, without materializing a historical body',()=>{
  const f=meaningFixture('victory');setModule(f.s,'remains',false);step(f.s);assert.equal(f.enemy.alive,false);assert.equal(f.s.remains,undefined);setModule(f.s,'remains',true);
  const raw=serialize(f.s),restored=restore(raw);assert.equal(restored.remains,undefined);assert.equal(serialize(restored),raw);
});

test('a damaged current motion record is refused instead of converted into physical history',()=>{
  for(const invalid of ['missing-until','unknown-shape','negative-tick','future-tick']){
    const {s,enemy}=killed();forgetRecords(s);
    if(invalid==='missing-until')delete enemy.deathView.until;
    if(invalid==='unknown-shape')enemy.deathView.shape='future-form';
    if(invalid==='negative-tick')enemy.deathView.tick=-1;
    if(invalid==='future-tick')enemy.deathView.tick=s.tick+1;
    assert.throws(()=>restore(serialize(s)),/deathView/,invalid);
  }
});
test('a current file missing the observed canonical person is refused instead of reconstructing it',()=>{
  const {s,h}=lethal();step(s);forgetRecords(s);s.graves.push({...s.graves[0]});delete s.people[h.lineage];
  assert.throws(()=>restore(serialize(s)),/Повреждённое/);
});
test('unsupported registry and individual contract versions are refused, never converted by loading',()=>{
  for(const individual of [false,true]){const {s,enemy}=killed();if(individual)bodyRemains(s,enemy).version=99;else s.remains.version=99;
    const before=serialize(s);recordRemains(s,enemy,{kind:'enemy',id:enemy.id,area:s.hero.area,x:enemy.x});
    assert.equal(serialize(s),before);assert.throws(()=>restore(before),/version/);
  }
});
test('an old death file is refused before any physical history is reconstructed',async()=>{
  const raw=await readFile(new URL('./fixtures/observed-death-v21.json',import.meta.url),'utf8');assert.throws(()=>restore(raw),/другой формат/);
});
