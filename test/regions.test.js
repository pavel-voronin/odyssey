import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route} from '../engine.js';
import {composeEnemy} from '../modules/world.js';
import {areaDanger,dangerAvoidance} from '../modules/danger.js';
import {personNeeds} from '../modules/needs.js';
import {setModule} from '../rules.js';
test('twelve starting regions include different towns, continents and safe places of birth',()=>{
  const names=new Set(),types=new Set(),starts=new Set();
  for(let seed=1;seed<=12;seed++){
    const s=createWorld(seed),a=s.areas[s.hero.area];assert.equal(s.hero.birthOrigin.area,a.id);names.add(s.continents.c0.name);types.add(s.areas.a1.type);starts.add(s.hero.area);
    assert.ok(!a.objects.some(o=>o.kind==='enemy'&&o.alive));assert.equal(a.danger,0);assert.equal(serialize(restore(serialize(s))),serialize(s));
  }
  assert.equal(names.size,12);assert.equal(types.size,4);assert.equal(starts.size,4);
});
test('settlements span connected scenes populated by working persistent specialists',()=>{
  const s=createWorld(3),city=s.areas.a1;assert.equal(city.districts.length,4);
  let residents=0;const jobs=new Set();
  for(const id of city.districts){const a=s.areas[id];assert.ok(route(s,city.id,id).length);residents+=a.population.length;for(const person of a.population)jobs.add(s.people[person].agenda.job);}
  assert.ok(residents>=20);assert.ok(jobs.size>=6);
  for(let i=0;i<300;i++)step(s);
  assert.ok(Object.values(s.people).some(p=>p.alive&&p.agenda.work>0));
});
test('regional danger belongs to the world, increases enemy force and is not scaled to the hero',()=>{
  const s=createWorld(1),a={id:'deep',type:'dungeon',depth:20,objects:[],faction:'crown'};areaDanger(s,a,{danger:14});
  const enemy=()=>({alive:true,hp:20,maxHp:20,requestedSpecies:'bandit'});
  const low=enemy(),high=enemy();s.hero.level=1;composeEnemy(s,a,low,()=>.2);const avoidance=dangerAvoidance(s,a);
  s.hero.level=30;composeEnemy(s,a,high,()=>.2);assert.equal(low.maxHp,high.maxHp);assert.equal(low.attack,high.attack);assert.ok(dangerAvoidance(s,a)<avoidance);
  const quiet=enemy();composeEnemy(s,{...a,danger:2},quiet,()=>.2);assert.ok(low.maxHp>quiet.maxHp*3);assert.ok(low.attack>quiet.attack*3);
});
test('residents eat finite supplies, sleep instead of working and can socialize without hero presence',()=>{
  const s=createWorld(3),a=s.areas.a1,p=s.people[a.population[0]],ctx={log(){}};
  p.needs.hunger=70;p.agenda.wealth=2;const stock=a.civic.food;assert.equal(personNeeds(s,p,ctx),true);assert.equal(a.civic.food,stock-1);assert.equal(p.agenda.wealth,1);
  p.needs.energy=10;assert.equal(personNeeds(s,p,ctx),true);assert.equal(p.needs.sleeping,true);
  p.needs.energy=100;p.needs.sleeping=false;p.needs.loneliness=80;assert.equal(personNeeds(s,p,ctx),true);assert.equal(p.needs.conversations,1);
  setModule(s,'npc-needs',false);const before=serialize(s);personNeeds(s,p,ctx);assert.equal(serialize(s),before);
});
test('loading a parent in transit does not teleport them home or change population membership',()=>{
  const s=createWorld(4),p=Object.values(s.people).find(p=>p.alive&&p.role==='родитель');
  assert.ok(p);p.area=null;p.status='travelling';const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);
});
