import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {startKnife,workKnife} from '../modules/forging.js';
import {createPerson} from '../modules/lineage.js';
import {setModule} from '../rules.js';
import {setActorMoney,syncActiveActor} from '../actor-projection.js';
import {observeNPCContacts} from '../modules/npc-contacts.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {mentorFixture} from './mentor-journey-scenarios.mjs';
import {observeMentors} from '../modules/mentor-memory.js';
import {startMentorJourney,mentorJourneyPlan} from '../modules/mentor-journey.js';
import {workshopSite} from '../modules/workshop-place.js';
export const npcDeedContext=forgingContext;
export function npcDeedFixture({interior=true,carried=true,injured=true}={}){
 const f=forgingFixture({npc:true,interior}),{s,p,worker,a}=f;for(const id of ['npc-intentions','npc-contacts','npc-knowledge','npc-control','lineage','supply','people'])setModule(s,id,true);
 const order=startKnife(s,worker,f.site,forgingContext);if(!order)throw Error('Actual worker order did not start');placeAtBench(f);s.tick++;if(!workKnife(s,worker,forgingContext))throw Error('Actual first work step failed');
 observeNPCPlace(s,p);const parentId=createPerson(s,{name:'Родитель работника',race:p.race,role:'житель',area:p.area,x:p.x+6,alive:true},{initialJob:'farmer'}),parent=s.people[parentId];p.parents.push(parentId);parent.health=injured?25:100;parent.maxHealth=100;parent.agenda.due=s.tick;
 if(carried){a.civic.medicine-=2;a.civic.treasury+=8;setActorMoney(s,p,p.agenda.wealth-8);p.roadSupplies={food:0,medicine:2};}
 p.agenda.task={kind:'forgeWork',target:p.area,x:p.x,property:f.o.id,remaining:1};p.agenda.due=s.tick;
 observeNPCContacts(s,p);syncActiveActor(s);return {...f,order,parent};
}
export function npcLearningDeedFixture({atTeacher=false}={}){
 const f=mentorFixture(),{s,pupil:p,a,o,room}=f;
 for(const id of ['npc-intentions','forging','goods-cycle','equipment','item-originals','lineage','supply'])setModule(s,id,true);
 p.agenda.job='artisan';p.area=a.id;p.x=42;setModule(s,'workshop-tools',false);
 const order=startKnife(s,p,workshopSite(s,a,o.id),forgingContext);if(!order)throw Error('Actual pre-existing knife order failed');p.area=room.id;p.x=68;s.tick++;if(!workKnife(s,p,forgingContext))throw Error('Actual partial work failed');setModule(s,'workshop-tools',true);observeMentors(s,p);
 if(atTeacher){p.area=f.target.id;p.x=f.teacher.x;observeNPCPlace(s,p);observeMentors(s,p);}
 if(!startMentorJourney(s,p))throw Error('Actual known mentor journey failed');mentorJourneyPlan(s,p,forgingContext);return {...f,p,worker:p,order};
}
export function addWorkerRelative(f,{carried=true}={}){
 const {s,p}=f,id=createPerson(s,{name:'Родитель ученика',race:p.race,role:'житель',area:p.area,x:p.x+6,alive:true},{initialJob:'farmer'}),parent=s.people[id];p.parents.push(id);parent.health=25;parent.maxHealth=100;parent.agenda.due=s.tick;
 if(carried){f.a.civic.medicine-=2;f.a.civic.treasury+=8;setActorMoney(s,p,p.agenda.wealth-8);p.roadSupplies={food:0,medicine:2};}observeNPCContacts(s,p);return parent;
}
