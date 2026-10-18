import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {CULTURES,makeName} from '../modules/cultures.js';
import {createPerson} from '../modules/lineage.js';
import {setModule} from '../rules.js';
test('eight cultures use distinct naming schemes and many combinations without numeric suffixes',()=>{
  const s=createWorld(1),all=[];
  for(const c of CULTURES){const sample=Array.from({length:200},(_,i)=>makeName(s,{id:'sample-'+i,culture:c.id}));
    assert.ok(new Set(sample.map(n=>n.full)).size>175,c.id);assert.ok(sample.every(n=>!/[0-9]/.test(n.full)));
    assert.ok(sample.every(n=>n.culture===c.id&&n.given&&n.full));all.push(sample[0]);
  }
  assert.equal(new Set(all.map(n=>n.style)).size,8);assert.ok(all.some(n=>n.full.includes('·')));
});
test('new town residents include more than one culture while districts retain their town tradition',()=>{
  const s=createWorld(0),town=s.areas.a1;
  const cultures=new Set(town.districts.flatMap(id=>s.areas[id].population.map(p=>s.people[p].culture)));
  assert.ok(cultures.size>1);assert.ok(town.districts.every(id=>s.areas[id].culture===town.culture));
  assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('children retain cultural lineage, an ember patronymic names a real parent, and explicit story names survive',()=>{
  const s=createWorld(1),parent=createPerson(s,{name:'Старое имя',culture:'ember',procedural:true,role:'житель',area:'a1',alive:true});
  const child=createPerson(s,{name:'Черновик',parents:[parent],family:'Устаревшая фамилия',procedural:true,role:'ребёнок',area:'a1',alive:true});
  assert.equal(s.people[child].culture,'ember');assert.equal(s.people[child].family,'дитя '+s.people[parent].naming.given);
  const hand=createPerson(s,{name:'Нотариус без тени',role:'нотариус',area:'a1',alive:true});assert.equal(s.people[hand].name,'Нотариус без тени');
  setModule(s,'cultures',false);const old=createPerson(s,{name:'Сохранённый Бран',procedural:true,area:'a1',alive:true});assert.equal(s.people[old].name,'Сохранённый Бран');
});
test('missing required culture is refused without renaming or enriching the world',()=>{
 const s=createWorld(9);for(let i=0;i<200;i++)step(s);delete s.areas.a0.culture;const before=serialize(s);assert.throws(()=>restore(before),/culture/);assert.equal(serialize(s),before);
});
