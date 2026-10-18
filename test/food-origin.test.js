import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,step,observeExistingPerson} from '../engine.js';
import {createPerson} from '../modules/lineage.js';import {openSettlement} from '../modules/districts.js';
import {initializeFoodKit,foodCapability,localFoodChoice,localFoodWork,foodSourceState} from '../modules/local-food.js';
import {setModule} from '../rules.js';import {NPC_JOBS} from '../modules/people.js';
const expected=p=>['farmer','healer'].includes(p.agenda?.job);
function check(s,p){if(p.role==='герой'||!p.alive)return;assert.equal(p.foodKitBirth.source,'occupation/'+p.agenda.job,p.id);assert.equal(p.foodKitBirth.kind,expected(p)?'mushroom':null,p.id);if(expected(p)){assert.equal(p.localFood.methods.mushroom.source,'occupation/'+p.agenda.job,p.id);assert.equal(p.localFood.tools.knife.owner,p.id);assert.equal(p.localFood.tools.knife.state,'working');assert.equal(p.localFood.methods.fish,undefined);}else assert.equal(p.localFood,undefined,p.id);}
const ctx={log:()=>{}};
test('seed3 specialists receive their final occupation kit before any action, fixing both false and missed grants',()=>{
 const s=createWorld(3);assert.equal(s.tick,0);assert.equal(s.people['person-14'].agenda.job,'scholar');assert.equal(s.people['person-14'].localFood,undefined);for(const id of ['person-8','person-22']){assert.equal(s.people[id].agenda.job,'healer');assert.equal(s.people[id].localFood.methods.mushroom.source,'occupation/healer');}assert.equal(s.people['person-28'].agenda.job,'farmer');for(const p of Object.values(s.people))check(s,p);
});
test('all new specialists and ordinary residents have consistent source and single owner across forty seeds',()=>{for(let seed=1;seed<=40;seed++){const s=createWorld(seed);for(const p of Object.values(s.people))check(s,p);}});
test('an invalid initial occupation cannot consume RNG, create a partial person or grant a kit',()=>{
 const s=createWorld(3);for(const initialJob of ['invented','constructor','toString']){const before=serialize(s);assert.throws(()=>createPerson(s,{name:'Не создан',alive:true},{initialJob}));assert.equal(serialize(s),before);}
});
test('ordinary creation without override keeps its real random agenda and an explicit initial override still consumes the same random draws',()=>{
 const a=createWorld(3),b=restore(serialize(a)),record={name:'Новый житель',role:'путник',alive:true,area:a.hero.area};const id=createPerson(a,record),other=createPerson(b,record,{initialJob:'healer'});assert.equal(id,other);assert.deepEqual(a.randomStreams,b.randomStreams);const p=a.people[id],q=b.people[other],agenda={...p.agenda,job:'healer'};assert.deepEqual(q.agenda,agenda);check(a,p);check(b,q);const invalid=serialize(b);assert.throws(()=>createPerson(b,record,{initialJob:'invented'}));assert.equal(serialize(b),invalid);
});
test('new people created at a late world tick receive initial means once, while dead people never receive a tool even after revival',()=>{
 const s=createWorld(3);for(let n=0;n<24;n++)step(s);for(const job of Object.keys(NPC_JOBS)){const id=createPerson(s,{name:'Поздний житель',alive:true,area:s.hero.area},{initialJob:job}),p=s.people[id];check(s,p);assert.equal(p.foodKitBirth.tick,24);const raw=JSON.stringify(p);initializeFoodKit(s,p,null,{newborn:true});assert.equal(JSON.stringify(p),raw);}
 const id=createPerson(s,{name:'Память усопшего',alive:false,area:s.hero.area},{initialJob:'healer'}),p=s.people[id];assert.equal(p.localFood,undefined);assert.equal(p.foodKitBirth.kind,null);p.alive=true;p.agenda={job:'healer'};initializeFoodKit(s,p,null,{newborn:true});assert.equal(p.localFood,undefined);
});
test('the actual settlement population path uses final jobs when a new district opens after world time has advanced',()=>{
 const s=createWorld(3);for(let n=0;n<12;n++)step(s);const template=structuredClone(s.areas.a1),a={...template,id:'late-town',name:'Поздняя слобода',population:[],objects:[],links:[]};delete a.city;delete a.districts;s.areas[a.id]=a;let count=0;const first=s.nextPerson;
 openSettlement(s,a,{log:()=>{},connect(w,left,right){w.areas[left].links.push(right);w.areas[right].links.push(left);},addArea(w,type,name,depth,settings){const id='late-district-'+count++;w.areas[id]={...structuredClone(template),...settings,id,type,name,depth,population:[],objects:[],links:[]};return id;}});
 assert.equal(s.nextPerson-first,16);for(let n=first;n<s.nextPerson;n++){const p=s.people['person-'+n];check(s,p);assert.equal(p.foodKitBirth.tick,12);}assert.equal(a.districts.length,4);
});
test('a later job change, lost/broken knife or a legitimate no-kit start cannot be rewritten by repeating initialization',()=>{
 const s=createWorld(3),p=s.people['person-8'],q=s.people['person-14'];p.localFood.tools.knife.state='broken';p.agenda.job='merchant';const owned=JSON.stringify(p.localFood);for(let n=0;n<3;n++){initializeFoodKit(s,p);initializeFoodKit(s,p,null,{newborn:true});}assert.equal(JSON.stringify(p.localFood),owned);delete p.localFood.tools.knife;initializeFoodKit(s,p,null,{newborn:true});assert.equal(p.localFood.tools.knife,undefined);q.agenda.job='farmer';initializeFoodKit(s,q,null,{newborn:true});assert.equal(q.localFood,undefined);
});
test('legacy mismatched ownership/source and missing means remain exact on load, initialization and changing the observer',()=>{
 const seed=createWorld(3),oldP=seed.people['person-14'];oldP.localFood=structuredClone(seed.people['person-8'].localFood);oldP.localFood.owner=oldP.id;oldP.localFood.methods.mushroom.source='occupation/farmer';Object.assign(oldP.localFood.tools.knife,{id:oldP.id+'/food-knife',owner:oldP.id});delete seed.people['person-8'].localFood;for(const p of Object.values(seed.people))delete p.foodKitBirth;
 const raw=serialize(seed),s=restore(raw);assert.equal(serialize(s),raw);const p=s.people['person-14'],old=JSON.stringify(p.localFood);initializeFoodKit(s,p);initializeFoodKit(s,s.people['person-8']);assert.equal(s.people['person-8'].localFood,undefined);assert.equal(JSON.stringify(p.localFood),old);assert.equal(p.foodKitBirth,undefined);assert.equal(observeExistingPerson(s,p.id),true);assert.equal(JSON.stringify(s.people[p.id].localFood),old);assert.equal(s.people[p.id].foodKitBirth,undefined);
});
test('module-off does not issue a kit, reenabling/planning is not a second birth, and a previously owned kit stays physical',()=>{
 const s=createWorld(3),p=s.people['person-8'],owned=JSON.stringify(p.localFood);setModule(s,'local-food',false);const id=createPerson(s,{name:'Без выдачи',alive:true,area:s.hero.area},{initialJob:'healer'}),q=s.people[id];assert.equal(q.localFood,undefined);setModule(s,'local-food',true);initializeFoodKit(s,q);assert.equal(q.localFood,undefined);initializeFoodKit(s,p);assert.equal(JSON.stringify(p.localFood),owned);
});
test('the hero uses its profession contract and canonical owner rather than its random resident occupation',()=>{
 const professions=new Set();for(let seed=1;seed<=60;seed++){const s=createWorld(seed),h=s.hero,p=s.people[h.lineage],kind=['ranger','alchemist'].includes(h.profession)?'mushroom':h.profession==='sailor'?'fish':null;professions.add(h.profession);assert.equal(p.foodKitBirth.source,'profession/'+h.profession);assert.equal(p.foodKitBirth.kind,kind);if(kind){assert.equal(p.localFood.methods[kind].source,'profession/'+h.profession);assert.equal(Object.values(p.localFood.tools)[0].owner,p.id);}const raw=serialize(s);initializeFoodKit(s,p,h,{newborn:true});assert.equal(serialize(s),raw);}for(const id of ['ranger','alchemist','sailor'])assert.ok(professions.has(id));
});
test('a newly equipped healer can do real local food work, while scholar, missing means and winter retain ordinary refusal',()=>{
 const s=createWorld(3),a=Object.values(s.areas).find(a=>a.forage?.localFood?.kind==='mushroom'),p=s.people['person-8'],q=s.people['person-14'];p.area=q.area=a.id;p.x=q.x=a.forage.x;p.needs.energy=100;p.needs.sleeping=false;a.climate='temperate';assert.ok(foodCapability(s,p,'mushroom').allowed);assert.equal(localFoodChoice(s,q,null,a),null);const task={foodSource:a.forage.localFood.id,remaining:3},stock=a.forage.stock;for(let n=0;n<3;n++){s.tick++;localFoodWork(s,p,a,task);}assert.ok(p.localFood.stock.mushroom>0);assert.ok(a.forage.stock<stock);p.localFood.tools.knife.state='lost';assert.equal(localFoodChoice(s,p,null,a),null);p.localFood.tools.knife.state='working';s.tick=60*240;assert.equal(foodSourceState(s,a).open,false);assert.equal(localFoodChoice(s,p,null,a),null);assert.equal(p.localFood.methods.fish,undefined);
});
