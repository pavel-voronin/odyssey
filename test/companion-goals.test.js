import {initializeMigrations} from '../modules/migrations.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,route,serialize,restore} from '../engine.js';
import {createPerson} from '../modules/lineage.js';
import {peopleTick} from '../modules/people.js';
import {companionGoalsTick,campPersonalTalk,assignCompanionGoal} from '../modules/companion-goals.js';
import {setModule} from '../rules.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeNPCContacts} from '../modules/npc-contacts.js';
const ctx={route,log:()=>{},gainXp:()=>{}};
function world(){
 const s=createWorld(17);s.hero.area='a1';s.hero.x=42;s.hero.combat=null;s.hero.transit=null;setModule(s,'npc-needs',false);
 for(const p of Object.values(s.people))if(p.agenda)p.agenda.due=100000;
 const first=s.areas.a1,next=s.areas.a0;next.type='village';next.population ||= [];next.civic={...first.civic,food:100,medicine:100};
 const parent=Object.keys(s.people)[0],id=createPerson(s,{name:'Лира',role:'житель',race:'human',alive:true,area:first.id,parents:[parent]}),kin=createPerson(s,{name:'Ори',role:'житель',race:'human',alive:true,area:next.id,parents:[parent]});
 const p=s.people[id],r=s.people[kin];p.agenda.due=100000;r.agenda.due=100000;p.home=first.id;p.status='withHero';p.x=42;r.x=42;
 first.population.push(id);next.population.push(kin);
 const c={person:id,id,uid:id,name:p.name,role:'person',loyalty:90,hp:30,maxHp:30,joined:0};s.hero.companions=[c];s.hero.relations[id]={trust:50};
 p.personalJourney={kind:'visitKin',person:kin,target:next.id,origin:first.id,status:'active',phase:'together',since:0,due:192,talkedAt:null};
 initializeMigrations(s);return{s,p,r,c,next};
}
test('the same trust allows different lengths of companionship and a peaceful departure keeps one canonical traveller',()=>{
 const {s,p,c,next}=world();const b=restore(serialize(s));b.people[p.id].personalJourney.due=600;s.tick=200;b.tick=200;
 companionGoalsTick(s,ctx);companionGoalsTick(b,ctx);
 assert.equal(s.hero.companions.length,0);assert.equal(b.hero.companions.length,1);assert.equal(p.area,'a1');assert.equal(p.x,s.hero.x);assert.equal(p.status,'wandering');assert.equal(s.hero.relations[p.id].trust,51);
 assert.equal(Object.values(s.areas).filter(a=>a.population?.includes(p.id)).length,1);
 let crossed=false;for(let i=0;i<160&&p.personalJourney.status==='active';i++){s.tick+=8;peopleTick(s,ctx);crossed ||=p.area===next.id;}
 assert.ok(crossed);assert.equal(p.personalJourney.status,'done');assert.equal(p.agenda.visits,1);assert.equal(p.agenda.bonds[s.people[p.personalJourney.person].id],5);assert.equal(s.hero.area,'a1');
});
test('camp conversation strengthens trust once per interval and does not force the hero to follow',()=>{
 const {s,p,c}=world(),before=JSON.stringify(s.hero.goal);campPersonalTalk(s,ctx);assert.equal(s.hero.relations[p.id].trust,52);assert.equal(c.loyalty,91);assert.equal(JSON.stringify(s.hero.goal),before);campPersonalTalk(s,ctx);assert.equal(s.hero.relations[p.id].trust,52);
});
test('a personal trip survives loading, pauses when disabled, and does not learn a hidden new location remotely',()=>{
 const {s,p,r}=world();s.tick=200;companionGoalsTick(s,ctx);s.tick+=8;peopleTick(s,ctx);let b=restore(serialize(s));
 for(let i=0;i<8;i++){s.tick+=8;b.tick+=8;peopleTick(s,ctx);peopleTick(b,ctx);}assert.equal(serialize(s),serialize(b));
 setModule(s,'companion-goals',false);const x=p.x,task=JSON.stringify(p.agenda.task);for(let i=0;i<8;i++){s.tick+=8;peopleTick(s,ctx);}assert.equal(p.x,x);assert.equal(JSON.stringify(p.agenda.task),task);
 setModule(s,'companion-goals',true);r.area='a4';for(let i=0;i<160&&p.personalJourney.status==='active';i++){s.tick+=8;peopleTick(s,ctx);}assert.equal(p.personalJourney.status,'missed');assert.notEqual(p.personalJourney.target,r.area);
});
test('family purposes are optional, require real relatives, and do not overwrite an existing life',()=>{
 let withGoal=0,withoutGoal=0;
 for(let seed=0;seed<40;seed++){const {s,p,c,next}=world();s.seed=seed;delete p.personalJourney;s.hero.companions=[];p.status='resident';p.area=next.id;observeNPCPlace(s,p);observeNPCContacts(s,p);p.area='a1';observeNPCPlace(s,p);p.status='withHero';s.hero.companions=[c];assignCompanionGoal(s,p,ctx);if(p.personalJourney)withGoal++;else withoutGoal++;}
 assert.ok(withGoal>0&&withoutGoal>0);
 const {s,p}=world(),before=JSON.stringify(p.personalJourney);assignCompanionGoal(s,p,ctx);assert.equal(JSON.stringify(p.personalJourney),before);
});

test('an own destination does not turn a companion with zero loyalty into a friendly departure',()=>{const {s,p,c}=world();s.tick=200;c.loyalty=0;companionGoalsTick(s,ctx);assert.equal(s.hero.companions.length,1);assert.equal(s.hero.relations[p.id].trust,50);assert.equal(p.personalJourney.phase,'together');});
