import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty,propertyPlan,propertyTarget,buyProperty,workspaceAccess} from '../modules/property.js';
import {workTick} from '../modules/work.js';
const ctx={route,knownRoute,goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};},log(){},gainXp(){}};
function fixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','work','finances','identity'])setModule(s,id,true);
 const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');
 Object.assign(h,{area:a.id,x:42,profession:'clockmaker',gold:200,weapon:3,armor:1,goal:null});h.career.path='peaceful';h.career.rank=3;h.personality.curiosity=.5;
 const o=workshopAt(s,a),p=s.people[o.owner];p.x=42;p.agenda.wealth=17;o.offer={owner:p.id,price:120,since:s.tick};observeProperty(s,a);
 return{s,h,a,o,p};
}
test('a workshop has one existing local NPC owner; registration is stable and loading grants no hero title or money',()=>{
 const {s,h,a,o,p}=fixture(),before=serialize(s),rng=s.rng;assert.equal(p.agenda.job,'artisan');assert.notEqual(o.owner,h.lineage);
 assert.equal(workshopAt(s,a),o);observeProperty(s,a);assert.equal(s.rng,rng);assert.equal(serialize(s),before);
 const loaded=restore(before);assert.equal(serialize(loaded),before);assert.equal(loaded.areas[a.id].objects.filter(o=>o.kind==='workshop').length,1);assert.equal(loaded.hero.gold,200);
});
test('an autonomous purchase spends two actions and transfers exactly one title and the same coins to its seller',()=>{
 const {s,h,o,p}=fixture(),total=h.gold+p.agenda.wealth;assert.equal(propertyPlan(s,ctx),true);
 assert.equal(buyProperty(s,ctx),true);assert.equal(o.owner,p.id);assert.equal(h.gold,200);
 const loaded=restore(serialize(s));buyProperty(s,ctx);buyProperty(loaded,ctx);assert.equal(serialize(s),serialize(loaded));
 assert.equal(o.owner,h.lineage);assert.equal(h.gold,80);assert.equal(p.agenda.wealth,137);assert.equal(h.gold+p.agenda.wealth,total);
 assert.equal(o.history.filter(e=>e.kind==='purchase').length,1);assert.equal(buyProperty(s,ctx),false);assert.equal(h.gold,80);
});
test('a sale to somebody else, an absent seller, damage or changed budget cannot charge an obsolete quote',()=>{
 for(const change of ['owner','absent','damage','funds','price']){
  const {s,h,a,o,p}=fixture();propertyPlan(s,ctx);buyProperty(s,ctx);const old=p.agenda.wealth;
  if(change==='owner')o.owner=a.population.find(id=>id!==p.id);
  if(change==='absent')p.area='a0';if(change==='damage')o.state='burned';if(change==='funds')h.gold=0;
  if(change==='price')o.offer.price++;
  const money=h.gold;assert.equal(buyProperty(s,ctx),false);assert.equal(h.gold,money);assert.equal(p.agenda.wealth,old);assert.notEqual(o.owner,h.lineage);assert.equal(h.goal,null);
 }
});
test('a lease costs one real interaction and one payment; a saved receipt survives and work requires an intact service',()=>{
 const {s,h,o,p}=fixture();h.goal={kind:'work',area:h.area,x:42,job:'repair',remaining:5,started:s.tick};
 const before=h.gold+p.agenda.wealth;workTick(s,ctx);assert.equal(h.goal.remaining,5);assert.equal(h.gold,198);assert.equal(p.agenda.wealth,19);assert.equal(h.gold+p.agenda.wealth,before);
 const loaded=restore(serialize(s));workTick(s,ctx);workTick(loaded,ctx);assert.equal(serialize(s),serialize(loaded));assert.equal(h.goal.remaining,4);assert.equal(h.gold,198);
 o.state='burned';workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.gold,198);
});
test('ownership permits the same work without rent; disabled property leaves titles and quoted funds intact',()=>{
 const {s,h,o,p}=fixture();propertyPlan(s,ctx);buyProperty(s,ctx);buyProperty(s,ctx);const wealth=p.agenda.wealth;
 h.goal={kind:'work',area:h.area,x:42,job:'repair',remaining:5,started:s.tick};assert.equal(workspaceAccess(s,ctx),'ready');assert.equal(h.gold,80);assert.equal(p.agenda.wealth,wealth);
 setModule(s,'property',false);const before=JSON.stringify(o);o.state='burned';const burned=JSON.stringify(o);assert.equal(workspaceAccess(s,ctx),'ready');assert.equal(JSON.stringify(o),burned);assert.equal(o.owner,h.lineage);
 setModule(s,'property',true);assert.equal(workspaceAccess(s,ctx),'denied');assert.equal(h.gold,80);
});
test('the actual engine reaches the seller and completes a single purchase without direct player commands',()=>{
 const {s,h,o,p}=fixture();h.area='a1';h.x=68;h.goal=null;h.energy=100;h.hp=h.maxHp;
 for(let i=0;i<150&&o.owner!==h.lineage;i++)step(s);
 assert.equal(o.owner,h.lineage);assert.equal(o.history.filter(e=>e.kind==='purchase').length,1);assert.ok(p.agenda.wealth>=137);
});

test('leasing requires walking to the landlord, then back to the workbench before the paid job progresses',()=>{
 const {s,h,o,p}=fixture();h.x=5;p.x=80;h.goal={kind:'work',area:h.area,x:42,job:'repair',remaining:5,started:s.tick};let paid=false;
 for(let i=0;i<80&&h.goal;i++){
  step(s);
  if(!paid&&h.goal?.workspace?.kind==='lease'){paid=true;assert.ok(h.x>=71);assert.equal(h.goal.remaining,5);assert.equal(h.gold,198);}
 }
 assert.equal(paid,true);assert.equal(h.goal,null);assert.equal(p.agenda.wealth,19);assert.equal(h.gold,208);assert.equal(o.owner,p.id);
});
