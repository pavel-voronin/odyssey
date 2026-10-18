import test from 'node:test';import assert from 'node:assert/strict';
import{createWorld,route,serialize,restore}from'../engine.js';
import{createPerson}from'../modules/lineage.js';
import{peopleArea,peopleTick}from'../modules/people.js';
import{observeNPCPlace}from'../modules/npc-knowledge.js';
import{observeNPCContacts,knownRelatives,localContact,NPC_CONTACT_LIMIT}from'../modules/npc-contacts.js';
import{assignCompanionGoal,personalVisitPlan}from'../modules/companion-goals.js';
import{socialTick}from'../modules/social.js';import{setModule}from'../rules.js';
const ctx={route,log:()=>{},gainXp:()=>{}};
function setup(){let s=createWorld(1),target=s.areas.a4;target.type='village';target.civic={food:65,medicine:55,treasury:60};peopleArea(s,target);
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='enemy')o.alive=false;
 setModule(s,'npc-needs',false);const id=s.areas.a1.population[0],p=s.people[id];
 for(const other of Object.values(s.people))if(other.agenda)other.agenda.due=100000;
 p.agenda.sociability=1;p.agenda.due=0;p.agenda.visits=0;p.agenda.task=null;p.agenda.home='a1';p.x=42;p.health=p.maxHealth||100;p.ailment=null;
 const relative=createPerson(s,{name:'Родной человек',parents:[p.id],race:p.race,alive:true,area:target.id,role:'житель'});target.population=[relative];s.people[relative].x=85;s.people[relative].agenda.due=100000;
 s=restore(serialize(s));return{s,p:s.people[id],r:s.people[relative],target:s.areas.a4};}
function remember(s,p,target){const original=p.area;for(const id of route(s,p.area,target.id)){p.area=id;observeNPCPlace(s,p);observeNPCContacts(s,p);}p.area=original;observeNPCPlace(s,p);observeNPCContacts(s,p);}
const advance=s=>{s.tick+=8;peopleTick(s,ctx);};
test('a visible hero map cannot reveal a relative address; a real visit records a last-known name and place',()=>{
 const {s,p,r,target}=setup();for(const a of Object.values(s.areas))a.discovered=true;observeNPCPlace(s,p);observeNPCContacts(s,p);assert.equal(knownRelatives(s,p,ctx).length,0);
 remember(s,p,target);const c=p.navigation.contacts.find(c=>c.person===r.id);assert.equal(c.area,target.id);const name=c.name;r.area='a3';r.name='Новый скрытый титул';assert.equal(c.area,target.id);assert.equal(c.name,name);assert.equal(knownRelatives(s,p,ctx)[0].contact.person,r.id);
 const save=serialize(s);assert.ok(serialize(restore(save))===save);
});
test('a real family visit walks to the visible relative and strengthens bonds only at a close live meeting',()=>{
 const {s,p,r,target}=setup();remember(s,p,target);s.tick=800;let reached=false,metAt=null;
 for(let i=0;i<150&&p.agenda.visits===0;i++){advance(s);if(p.area===target.id)reached=true;if(p.agenda.visits)metAt=p.x;}
 assert.ok(reached);assert.equal(p.agenda.visits,1);assert.ok(Math.abs(metAt-r.x)<12);assert.equal(p.agenda.bonds[r.id],5);assert.equal(r.agenda.bonds[p.id],5);
 for(let i=0;i<150&&p.status==='wandering';i++)advance(s);assert.equal(p.area,'a1');assert.equal(p.status,'resident');
});
test('a moved or remotely dead relative is missed at the old address, without new coordinates or bonds',()=>{
 for(const dead of [false,true]){const {s,p,r,target}=setup();remember(s,p,target);r.area='a3';if(dead){r.alive=false;r.status='dead';}s.tick=800;
  let visited=false;for(let i=0;i<180;i++){advance(s);visited ||=p.area===target.id;if(p.navigation.contacts.find(c=>c.person===r.id).missingAt!=null&&p.area==='a1')break;}
  const c=p.navigation.contacts.find(c=>c.person===r.id);assert.ok(visited);assert.ok(c.missingAt!=null);assert.equal(c.area,target.id);assert.equal(p.agenda.visits,0);assert.equal(p.agenda.bonds[r.id],undefined);assert.equal(knownRelatives(s,p,ctx).length,0);
 }
});
test('a promised old companion destination survives, while local absence does not reveal a remote death',()=>{
 const {s,p,r,target}=setup();p.personalJourney={kind:'visitKin',person:r.id,target:target.id,origin:'a1',status:'active',phase:'independent',abandonAfter:5000};
 r.area='a3';r.alive=false;assert.equal(personalVisitPlan(s,p,ctx),true);assert.equal(p.personalJourney.status,'active');assert.equal(p.agenda.task.target,target.id);
 p.area=target.id;assert.equal(personalVisitPlan(s,p,ctx),false);assert.equal(p.personalJourney.status,'missed');assert.notEqual(p.personalJourney.target,r.area);
});
test('new companion purposes require personal address knowledge and remain optional once that knowledge exists',()=>{
 let withGoal=0,without=0;
 for(let seed=0;seed<30;seed++){const {s,p,target}=setup();s.seed=seed;assignCompanionGoal(s,p,ctx);assert.equal(p.personalJourney,undefined);remember(s,p,target);assignCompanionGoal(s,p,ctx);if(p.personalJourney){withGoal++;assert.equal(p.personalJourney.contactMemory,true);const saved=JSON.stringify(p.personalJourney);assignCompanionGoal(s,p,ctx);assert.equal(JSON.stringify(p.personalJourney),saved);}else without++;}
 assert.ok(withGoal>0&&without>0);
});
test('party members observe their actual common place and skip transit rather than trusting a stale personal area',()=>{
 const {s,p,r,target}=setup();s.hero.companions=[{person:p.id,loyalty:90,hp:30,maxHp:30}];p.status='withHero';s.hero.area='a1';p.area=target.id;observeNPCContacts(s,p);assert.equal(p.navigation.contacts.some(c=>c.person===r.id),false);
 s.hero.area=target.id;s.hero.transit={from:'a1',to:target.id};socialTick(s,ctx);assert.equal(p.navigation.contacts.some(c=>c.person===r.id),false);assert.equal(localContact(s,p.id,target.id),null);
 s.hero.transit=null;socialTick(s,ctx);assert.equal(p.navigation.contacts.find(c=>c.person===r.id).area,target.id);assert.equal(p.area,target.id);
});
test('contact storage is bounded, observations do not spend RNG, and disabling preserves the same memory',()=>{
 const {s,p,target}=setup();p.area=target.id;for(let i=0;i<40;i++){const id=createPerson(s,{parents:[p.id],race:p.race,alive:true,area:target.id,role:'житель'});target.population.push(id);}
 const rng=s.rng,streams=JSON.stringify(s.randomStreams);observeNPCContacts(s,p);assert.equal(p.navigation.contacts.length,NPC_CONTACT_LIMIT);assert.equal(s.rng,rng);assert.equal(JSON.stringify(s.randomStreams),streams);
 setModule(s,'npc-contacts',false);const before=JSON.stringify(p.navigation.contacts);p.area='a1';observeNPCContacts(s,p);assert.equal(JSON.stringify(p.navigation.contacts),before);
});
test('the genealogy index refreshes after a same-tick birth and never caches a relative physical position',()=>{
 const {s,p,target}=setup();p.area=target.id;observeNPCContacts(s,p);
 const id=createPerson(s,{parents:[p.id],race:p.race,alive:true,area:target.id,role:'ребёнок'});s.people[id].x=30;observeNPCContacts(s,p);const contact=p.navigation.contacts.find(c=>c.person===id);assert.ok(contact);assert.equal(contact.x,30);
 s.people[id].area='a1';s.people[id].x=80;observeNPCContacts(s,p);assert.equal(contact.area,target.id);assert.equal(contact.x,30);
 s.people[id].area=target.id;s.people[id].x=90;observeNPCContacts(s,p);assert.equal(contact.x,90);
});
