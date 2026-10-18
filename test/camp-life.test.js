import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore} from '../engine.js';
import {setModule} from '../rules.js';
import {campConversation,rememberRescue} from '../modules/camp-life.js';
import {questAction} from '../modules/quests.js';
const ctx={log:()=>{}};
function camp(ethics=1,sociability=.8){
  const s=createWorld(3),h=s.hero;
  for(const id of ['body','stories','caravans','faction-paths','events','people'])setModule(s,id,false);
  h.area='a0';h.x=24;h.energy=12;h.hp=h.maxHp;h.hunger=0;h.magic.mana=h.magic.maxMana;h.goal=null;
  for(let i=0;i<3;i++)step(s);assert.ok(s.areas[h.area].temporaryCamp);
  // Reach the actual fire before arranging the conversation specimen.
  for(let i=0;i<12&&Math.abs(h.x-68)>1;i++)step(s);assert.ok(Math.abs(h.x-68)<=1);
  const [p,victim]=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage&&p.role!=='ребёнок');
  p.status='withHero';p.area=h.area;p.agenda.sociability=sociability;p.needs.energy=100;p.needs.sleeping=false;
  h.companions=[{id:p.id,uid:p.id,person:p.id,name:p.name,role:'person',attack:0,healing:0,scouting:0,ethics,loyalty:60,hp:30,maxHp:30}];h.relations[p.id]={trust:10};
  const q={id:'remembered-rescue',kind:'rescue',person:victim.id,rescued:true,status:'done',rescueWitnesses:[h.lineage,victim.id,p.id]};h.quests=[q];h.energy=60;
  return {s,h,p,q,c:h.companions[0]};
}
test('the same witnessed rescue brings gratitude, cautious disagreement or a respected refusal, once per pair',()=>{
  for(const [ethics,sociability,outcome,delta]of [[1,.8,'thanks',2],[-1,.8,'caution',-1],[1,.1,'quiet',0]]){
    const {s,h,p,q,c}=camp(ethics,sociability);const hp=h.hp,energy=h.energy;step(s);
    assert.equal(h.lastAction,'talk');assert.equal(h.hp,hp);assert.equal(h.energy,energy-1);assert.equal(h.relations[p.id].trust,10+delta);assert.equal(c.loyalty,60+delta);assert.equal(q.campTalks[p.id].outcome,outcome);
    h.counters.camps++;assert.equal(campConversation(s,ctx),false);assert.equal(h.relations[p.id].trust,10+delta);
  }
  const capped=camp();capped.h.relations[capped.p.id].trust=100;capped.c.loyalty=100;step(capped.s);
  assert.equal(capped.h.campLife.history[0].delta,0);assert.equal(capped.h.campLife.history[0].loyalty,0);
});
test('sleep and wounds take priority; a tired companion actually recovers before the shared conversation',()=>{
  const {s,h,p,q}=camp();p.needs.energy=10;
  step(s);assert.equal(h.lastAction,'rest');assert.equal(p.needs.energy,22);assert.equal(q.campTalks,undefined);
  step(s);assert.equal(p.needs.energy,34);step(s);assert.equal(h.lastAction,'talk');assert.ok(q.campTalks[p.id]);
  const injured=camp();injured.h.hp=Math.floor(injured.h.maxHp*.5);step(injured.s);assert.equal(injured.h.lastAction,'rest');assert.equal(injured.q.campTalks,undefined);
});
test('a later companion has no remote memory, solitude is allowed, and disabling preserves all recorded consequences',()=>{
  const {s,h,p,q}=camp();q.rescueWitnesses=[h.lineage,q.person];assert.equal(campConversation(s,ctx),false);
  h.companions=[];assert.equal(campConversation(s,ctx),false);
  h.companions=[{person:p.id,hp:30,maxHp:30,ethics:1,loyalty:60}];q.rescueWitnesses.push(p.id);assert.equal(campConversation(s,ctx),true);
  setModule(s,'camp-life',false);const before=serialize(s);assert.equal(campConversation(s,ctx),false);assert.equal(serialize(s),before);
});
test('actual rescue records only physically present witnesses, and repeating its record cannot add a late arrival',()=>{
  const {s,h,p}=camp(),victim=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.id!==h.companions[0].person);
  const q={id:'new-rescue',kind:'rescue',status:'active',person:victim.id,object:'captive'};s.areas[h.area].objects.push({id:q.object,kind:'captive',person:victim.id});h.quests=[q];
  questAction(s,q,{...ctx,random:()=>.5});assert.equal(q.rescued,true);assert.ok(q.rescueWitnesses.includes(p.id));assert.ok(q.rescueWitnesses.includes(victim.id));
  const first=[...q.rescueWitnesses];const later=Object.values(s.people).find(p=>p.alive&&!first.includes(p.id));h.companions.push({person:later.id,hp:30,maxHp:30});later.area=h.area;
  rememberRescue(s,q);assert.deepEqual(q.rescueWitnesses,first);
});
test('replay and save between the conversation and sleep retain the exact trust, topic and next actions',()=>{
  const {s}=camp();step(s);const saved=serialize(s),loaded=restore(saved);assert.equal(serialize(loaded),saved);
  for(let i=0;i<12;i++){step(s);step(loaded);assert.equal(serialize(s),serialize(loaded));}
});
