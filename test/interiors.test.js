import {revealArea,revealRoad} from '../actor-atlas.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,observeExistingPerson} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {initializeInteriors,tavernIn,tavernAvailable,interiorPassage,npcTavernPlan} from '../modules/interiors.js';
import {weatherAt} from '../modules/weather.js';
import {sceneLights} from '../lighting.js';
function fixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);
 for(const id of ['interiors','npc-control'])setModule(s,id,true);
 const d=tavernIn(s,'a1');assert.ok(d);s.tick=30;s.hero.area='a1';s.hero.x=d.x;s.hero.goal={kind:'tavernVisit',area:d.hall,x:50,remaining:3};
 return {s,d,h:s.hero,p:s.people[d.owner],hall:s.areas[d.hall]};
}
test('a canonical optional hall has an existing host and no new people, civic stock or town districts',()=>{
 const {s,d,hall}=fixture(),count=Object.keys(s.people).length,rng=s.rng,next=s.nextArea,streams=JSON.stringify(s.randomStreams);
 assert.equal(hall.type,'hall');assert.equal(hall.city,undefined);assert.equal(hall.civic,undefined);assert.equal(hall.forage.stock,0);assert.equal(d.owner,s.people[d.owner].id);assert.equal(hall.interior.parent,'a1');
 const old=serialize(s);for(let i=0;i<5;i++)initializeInteriors(s);assert.equal(serialize(s),old);assert.equal(Object.keys(s.people).length,count);assert.equal(s.rng,rng);assert.equal(s.nextArea,next);assert.equal(JSON.stringify(s.randomStreams),streams);
 const absent=createWorld(3);assert.equal(tavernIn(absent,'a1'),null);
 const initial=createWorld(0),initialSave=serialize(initial);assert.equal(serialize(restore(initialSave)),initialSave);
});
test('ordinary steps approach the real door, enter once, and exit at that same door without a body or wallet copy',()=>{
 const {s,d,h,hall}=fixture(),body=h.lineage,gold=h.gold,people=Object.keys(s.people).length;h.x=70;
 let entered=false,left=false,lastX=h.x;
 for(let i=0;i<100;i++){const before=h.area;lastX=h.x;step(s);if(before==='a1'&&h.area===hall.id){entered=true;assert.equal(lastX,d.x);assert.equal(h.x,8);}if(before===hall.id&&h.area==='a1'){left=true;assert.equal(lastX,8);assert.equal(h.x,d.x);break;}}
 assert.ok(entered&&left);assert.equal(h.lineage,body);assert.equal(h.gold,gold);assert.equal(Object.keys(s.people).length,people);assert.equal(Object.values(s.areas).filter(a=>a.interior?.kind==='tavern').length,1);
});
test('closure, owner death, absence and off refuse entrants but never close the inside exit',()=>{
 for(const condition of ['closed','dead','absent','off','hours']){
  const {s,d,p,h,hall}=fixture();if(condition==='closed')d.closed=true;if(condition==='dead')p.alive=false;if(condition==='absent')p.area='a2';if(condition==='off')setModule(s,'interiors',false);if(condition==='hours')s.tick=0;
  assert.equal(tavernAvailable(s,d),false);step(s);assert.equal(h.area,'a1');assert.equal(h.goal,null);
  h.area=hall.id;revealArea(s,'a1');revealArea(s,hall);revealRoad(s,hall.id,'a1');h.x=8;h.goal=null;step(s);assert.equal(h.area,'a1',condition);assert.equal(h.x,d.x);
 }
});
test('a real personal host walks inside while transport claims cannot acquire a second tavern action',()=>{
 const {s,d,p,h,hall}=fixture();setModule(s,'people',true);h.goal={kind:'routeWait',area:h.area,x:h.x,until:10000};p.x=d.x;p.agenda.task=null;p.agenda.due=0;p.needs.hunger=10;p.needs.energy=100;
 let entered=false;for(let i=0;i<130;i++){step(s);if(p.area===hall.id)entered=true;assert.equal(Object.values(s.areas).filter(a=>(a.population||[]).includes(p.id)).length,1);}
 assert.ok(entered);assert.equal(Object.values(s.people).filter(other=>other.id===p.id).length,1);
 const other=fixture();other.s.logistics.convoys.push({person:other.p.id});other.p.status='caravan';assert.equal(npcTavernPlan(other.s,other.p),false);
});
test('loading the occupied hall preserves the canonical doorway, people, items and exact continuation',()=>{
 const {s,h,hall}=fixture();while(h.area!==hall.id)step(s);const saved=serialize(s),copy=restore(saved);assert.equal(serialize(copy),saved);
 for(let i=0;i<100;i++){step(s);step(copy);}assert.equal(serialize(copy),serialize(s));
});
test('interior scenery is sheltered and lit locally without sun or moon',()=>{
 const {s,hall}=fixture(),weather=weatherAt(s,hall);assert.equal(weather.id,'shelter');setModule(s,'lighting',true);
 const lights=sceneLights(s,hall,{width:390,height:210,ground:150,view:{sunX:.7,sunY:.2},night:false,heroX:100});assert.equal(lights.sky,null);assert.equal(lights.local.length,1);assert.equal(lights.local[0].kind,'hanging');
});
test('the old world migration draws no RNG and does not regenerate a city, host or treasury',()=>{
 const {s,d,hall}=fixture();delete s.areas[hall.id];s.areas.a1.objects=s.areas.a1.objects.filter(o=>o!==d);s.areas.a1.links=s.areas.a1.links.filter(id=>id!==hall.id);delete s.areas.a1.interiorsVersion;
 const people=JSON.stringify(s.people),civic=JSON.stringify(s.areas.a1.civic),rng=s.rng,streams=JSON.stringify(s.randomStreams);initializeInteriors(s);
 assert.ok(tavernIn(s,'a1'));assert.equal(JSON.stringify(s.people),people);assert.equal(JSON.stringify(s.areas.a1.civic),civic);assert.equal(s.rng,rng);assert.equal(JSON.stringify(s.randomStreams),streams);
 const after=serialize(s);initializeInteriors(s);assert.equal(serialize(s),after);
});
test('urgent needs inside leave by the door without pitching a camp or charging a fictitious service',()=>{
 const {s,h,hall,d}=fixture();for(const id of ['body','fieldcamp','preparation'])setModule(s,id,true);h.area=hall.id;revealArea(s,'a1');revealArea(s,hall);revealRoad(s,hall.id,'a1');h.x=8;h.goal=null;h.energy=2;h.hp=h.maxHp*.3;const wallet=h.gold,herbs=h.inventory.herbs;h.inventory.herbs=0;
 step(s);assert.equal(h.area,'a1');assert.equal(h.x,d.x);assert.equal(h.gold,wallet);assert.equal(Object.values(s.areas).filter(a=>a.temporaryCamp).length,0);assert.ok(h.hp<h.maxHp);h.inventory.herbs=herbs;
});
