import {step} from '../engine.js';import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {skillFixture,skillContext,actualRepair} from './skill-practice-scenarios.mjs';
import {peopleTick} from '../modules/people.js';import {craftPractice,craftStudyPlan,craftStudyAction} from '../modules/craft-practice.js';import {observeProperty} from '../modules/property.js';import {planFieldCamp} from '../modules/fieldcamp.js';
export function campLessonFixture({heroTeacher=false}={}){
 const f=skillFixture(),{s,h,a,o}=f;
 for(let i=0;i<3;i++)actualRepair(f);
 const p=Object.values(s.people).find(p=>p.id!==h.lineage&&p.alive&&p.role!=='ребёнок'&&p.localFood?.tools?.knife?.state==='working');if(!p)throw Error('Actual initial knife owner required');
 for(const area of Object.values(s.areas))if(area.population)area.population=area.population.filter(id=>id!==p.id);a.population.push(p.id);
 Object.assign(p,{area:a.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(p.agenda,{job:'artisan',home:a.id,wealth:200,tools:3,curiosity:.9,sociability:.8,duty:.9,due:s.tick,task:null});p.needs={hunger:0,energy:100,loneliness:0,meals:0,sleeps:0,conversations:0,sleeping:false};o.owner=p.id;
 for(let i=0;i<3;i++){
  o.state='burned';o.damagedAt=s.tick;o.repair=null;p.agenda.task=null;p.agenda.due=s.tick;let actions=0;
  while(o.state!=='intact'&&actions++<8){s.tick+=8-s.tick%8;peopleTick(s,skillContext);}
  if(o.state!=='intact')throw Error('Actual NPC restoration failed');
 }
 if(craftPractice(s,p.id)?.total!==3||craftPractice(s)?.total!==3)throw Error('Six canonical real restorations required');
 if(heroTeacher){
  h.energy=100;h.goal=null;observeProperty(s,a);if(!craftStudyPlan(s,skillContext))throw Error('Actual hero bench study required');
  for(let i=0;i<8&&!craftPractice(s)?.method;i++){s.tick++;craftStudyAction(s,skillContext);}if(!craftPractice(s)?.method)throw Error('Actual hero method required: '+JSON.stringify({goal:h.goal,state:craftPractice(s),x:h.x}));
 }else{
  for(let i=0;i<20&&!craftPractice(s,p.id)?.method;i++){s.tick+=8-s.tick%8;peopleTick(s,skillContext);}if(!craftPractice(s,p.id)?.method)throw Error('Actual NPC bench study required');
 }
 for(const id of ['camp-lesson','companions','fieldcamp'])setModule(s,id,true);
 h.companions=[{id:p.id,uid:p.id,person:p.id,name:p.name,role:'person',attack:0,healing:0,scouting:0,ethics:1,loyalty:80,hp:30,maxHp:30}];h.relations[p.id]={trust:20};p.status='withHero';p.needs.energy=100;p.needs.hunger=0;p.needs.sleeping=false;p.agenda.task=null;
 h.area='a0';h.x=24;h.goal=null;h.combat=null;h.transit=null;h.hp=h.maxHp;h.energy=80;h.hunger=0;h.magic.mana=h.magic.maxMana;syncActiveActor(s);
 if(!planFieldCamp(s,skillContext))throw Error('Actual quiet camp plan required');step(s);step(s);if(!s.areas[h.area].temporaryCamp)throw Error('Actual pitched camp required');
 return {...f,p,camp:s.areas[h.area],teacher:heroTeacher?s.people[h.lineage]:p,pupil:heroTeacher?p:s.people[h.lineage]};
}
