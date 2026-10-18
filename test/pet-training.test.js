import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createArea,step,serialize,restore,createNextStory} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {encounter} from '../modules/encounters.js';
import {releaseParty,hurtCompanion,partyRest} from '../modules/social.js';
import {partyAvailable} from '../modules/party-needs.js';
import {carriedFood} from '../modules/stores.js';
import {petTrainingTick,dogTrainingPlan,teachDog,dogLessonAction,dogSearchPlan,dogSearchAction,feedDog,petTrainingHTML} from '../modules/pet-training.js';
import {scentPlantKnown,observeScentPlants} from '../modules/pet-scent-policy.js';
import {planQuest} from '../modules/quests.js';
const ctx={random:()=>.99,log:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture({dogs=1}={}){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['pet-training','companions'].includes(m.id));const h=s.hero;h.area='a1';h.x=42;h.hp=h.maxHp;h.energy=100;h.hunger=0;h.goal=null;h.combat=null;h.personality.generosity=.9;h.personality.curiosity=.9;h.inventory.rations=3;h.inventory.herbs=1;
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 h.companions=[];for(let i=0;i<dogs;i++){const o={id:'test-dog-'+i,kind:'encounter',encounter:'familiar',name:'Незнакомый пёс',icon:'pet',x:h.x,resolved:false};s.areas[h.area].objects.push(o);encounter(s,o,ctx);}
 const c=h.companions[0],p=s.people[h.lineage],a=s.areas.a2,herb=a.objects.find(o=>o.kind==='herb');assert.equal(c.id,'dog');
 const teach=()=>{s.tick=Math.max(s.tick+1,c.petTraining?.after||0);return teachDog(s,c.uid,ctx);},train=()=>{for(let i=0;i<3;i++)assert.equal(teach(),true);};return {s,h,c,p,a,herb,teach,train};
}
test('three real safe lessons use one present dog, an owned sample, finite food and separate body actions; another dog stays untrained',()=>{
 const {s,h,c,p,teach,train}=fixture({dogs:2}),food=carriedFood(p,h.inventory),energy=h.energy;assert.equal(c.petTraining,undefined);train();assert.equal(c.petTraining.lessons.length,3);assert.equal(c.petTraining.energy,94);assert.equal(h.energy,energy-6);assert.equal(carriedFood(p,h.inventory),food-3);assert.equal(h.inventory.herbs,1);assert.equal(h.companions[1].petTraining,undefined);assert.equal(c.scouting,1);assert.equal(partyAvailable(s,c),false);assert.equal(teach(),false);assert.equal(c.petTraining.lessons.length,3);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('another owner can preserve food and time; low trust, no sample, danger, hunger or separation cannot be forced into a free lesson',()=>{
 for(const reason of ['careful','trust','sample','danger','hungry','absent']){
  const {s,h,c,p,teach}=fixture();if(reason==='careful')h.personality.generosity=.2;if(reason==='trust')c.loyalty=10;if(reason==='sample')h.inventory.herbs=0;if(reason==='danger'){const e=s.areas[h.area].objects.find(o=>o.kind==='enemy')||{id:'near-threat',kind:'enemy',x:h.x};e.alive=true;e.resolved=false;e.hidden=false;s.areas[h.area].objects.push(e);}if(reason==='hungry'){teach();s.tick=c.petTraining.after;c.petTraining.hunger=70;}if(reason==='absent')h.companions=[];const food=carriedFood(p,h.inventory),lessons=c.petTraining?.lessons.length||0;
  if(reason==='careful')assert.equal(dogTrainingPlan(s,ctx),false);else assert.equal(teachDog(s,c.uid,ctx),false,reason);assert.equal(carriedFood(p,h.inventory),food);assert.equal(c.petTraining?.lessons.length||0,lessons);
 }
});
test('the trained scent changes search without creating herbs or reporting a hidden enemy; the hero still walks and collects one finite unit',()=>{
 const {s,h,c,p,a,herb,train}=fixture();train();h.area=a.id;h.x=10;h.goal=null;assert.equal(scentPlantKnown(s,h,a,herb),false);const count=herb.count,held=h.inventory.herbs,knowledge=JSON.stringify(h.memory.threats),e=a.objects.find(o=>o.kind==='enemy');e.hidden=true;e.alive=true;e.resolved=false;e.x=25;
 s.tick++;assert.equal(dogSearchPlan(s,ctx),true);assert.equal(h.goal.kind,'dogSearch');assert.equal(dogSearchAction(s,ctx),true);assert.equal(h.goal.kind,'collect');assert.equal(herb.count,count);assert.equal(h.inventory.herbs,held);assert.equal(h.combat,null);assert.equal(e.hidden,true);assert.equal(JSON.stringify(h.memory.threats),knowledge);assert.equal(c.petTraining.finds[0].object,herb.id);assert.equal(scentPlantKnown(s,h,a,herb),true);assert.equal(partyAvailable(s,c),false);e.alive=false;e.resolved=true;
 let ticks=0;while(h.inventory.herbs===held&&ticks++<16)step(s);assert.ok(ticks<=16);assert.equal(h.inventory.herbs,held+1);assert.equal(herb.count,count-1);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a stale or exhausted plant produces no new stock, and an untrained dog of the same species has no scent search',()=>{
 const {s,h,c,herb,a,train}=fixture({dogs:2});train();h.area=a.id;h.x=10;s.tick++;dogSearchPlan(s,ctx);herb.count=0;const held=h.inventory.herbs,energy=c.petTraining.energy;assert.equal(dogSearchAction(s,ctx),false);assert.equal(h.inventory.herbs,held);assert.equal(c.petTraining.energy,energy);herb.count=2;h.companions=h.companions.filter(q=>q!==c);assert.equal(dogSearchPlan(s,ctx),false);assert.equal(h.memory.scentPlants,undefined);assert.equal(herb.count,2);
});
test('release interrupts a pending lesson and actual re-recruitment transfers the same UID and existing knowledge to another owner',()=>{
 const {s,h,c,train}=fixture();train();const uid=c.uid,lessons=structuredClone(c.petTraining.lessons),owner=h.lineage,area=h.area;releaseParty(s,ctx);h.companions=[];const waiting=s.areas[area].objects.find(o=>o.existingPet?.uid===uid);assert.ok(waiting);const saved=serialize(s);assert.equal(serialize(restore(saved)),saved);assert.equal(createNextStory(s,{allowLiving:true}),true);const next=s.hero;assert.notEqual(next.lineage,owner);next.area=area;next.x=waiting.x;next.personality.generosity=1;next.energy=100;next.hunger=0;next.hp=next.maxHp;encounter(s,waiting,ctx);const joined=next.companions.find(q=>q.uid===uid);assert.ok(joined);assert.equal(waiting.existingPet,undefined);assert.deepEqual(joined.petTraining.lessons,lessons);assert.equal(joined.petTraining.lessons[0].owner,owner);assert.equal(joined.loyalty,50);assert.equal(teachDog(s,uid,ctx),false);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('a dead or separated dog cannot finish the queued lesson or spend a second portion',()=>{
 for(const reason of ['death','separation']){const {s,h,c,p,teach}=fixture();teach();s.tick=c.petTraining.after;dogTrainingPlan(s,ctx);assert.equal(h.goal.kind,'dogLesson');const food=carriedFood(p,h.inventory);if(reason==='death')hurtCompanion(s,c,100,ctx);else{releaseParty(s,ctx);h.companions=[];}dogLessonAction(s,ctx);assert.equal(h.goal,null);assert.equal(carriedFood(p,h.inventory),food);assert.equal(c.petTraining.lessons.length,1);assert.equal(serialize(restore(serialize(s))),serialize(s));}
});
test('feeding and resting use the same current needs, a repeated upkeep cannot run twice, and OFF preserves skill and spent action',()=>{
 const {s,h,c,p,train}=fixture();train();c.petTraining.hunger=70;s.tick++;const food=carriedFood(p,h.inventory);assert.equal(feedDog(s,c.uid,ctx),true);assert.equal(carriedFood(p,h.inventory),food-1);assert.equal(c.petTraining.hunger,22);assert.equal(feedDog(s,c.uid,ctx),false);setModule(s,'pet-training',false);assert.equal(partyAvailable(s,c),false);const raw=serialize(s);petTrainingTick(s);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);setModule(s,'pet-training',true);s.tick=56;const hunger=c.petTraining.hunger;petTrainingTick(s);petTrainingTick(s);assert.equal(c.petTraining.hunger,hunger+.8);const energy=c.petTraining.energy;partyRest(s);assert.equal(c.petTraining.energy,Math.min(100,energy+8));
});
test('only actual new forest plants gain cover; nearby sight and quest search work without a dog, while restore and sheets stay read-only',()=>{
 const s=createWorld(4,{rules:{'pet-training':false}});for(const m of MODULES)setModule(s,m.id,m.id==='pet-training');const h=s.hero,old=s.areas.a2.objects.find(o=>o.kind==='herb');assert.equal(old.scentCover,undefined);const id=createArea(s,'forest','Новая роща',1),a=s.areas[id],herb=a.objects.find(o=>o.kind==='herb');assert.ok(herb.scentCover);h.area=id;h.x=5;h.goal=null;const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);assert.equal(scentPlantKnown(s,h,a,herb),false);const q={id:'test-herbs',kind:'herbs',target:id,status:'active',title:'Травы',cause:'Лекарю нужно растение'};planQuest(s,q,ctx);assert.equal(h.goal.kind,'explore');assert.equal(h.goal.x,85);h.x=herb.x;observeScentPlants(s);assert.equal(scentPlantKnown(s,h,a,herb),true);planQuest(s,q,ctx);assert.equal(h.goal.kind,'collect');const f=fixture();f.train();const before=serialize(f.s);assert.match(petTrainingHTML(f.c),/освоен/);assert.equal(serialize(f.s),before);
});
test('one isolated lesson tick exactly replays through a save boundary and rejects invented fourth lessons',()=>{
 const {s,h,c}=fixture();dogTrainingPlan(s,ctx);assert.equal(h.goal.kind,'dogLesson');const copy=restore(serialize(s));step(s);step(copy);assert.equal(serialize(s),serialize(copy));assert.equal(c.petTraining.lessons.length,1);const bad=JSON.parse(serialize(s)),dog=bad.hero.companions[0];dog.petTraining.lessons=Array.from({length:4},()=>dog.petTraining.lessons[0]);assert.throws(()=>restore(JSON.stringify(bad)),/petTraining|companions/);
});
