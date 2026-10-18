import {workshopInteriorFixture} from './workshop-interior-scenarios.mjs';
import {setModule} from '../rules.js';import {route} from '../engine.js';
import {npcController} from '../modules/npc-control.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';import {observeMentors} from '../modules/mentor-memory.js';import {syncActiveActor} from '../actor-projection.js';
export function mentorFixture({order='before'}={}){
 const f=workshopInteriorFixture(),{s,h,p:teacher,a,o,room}=f;
 for(const id of ['mentor-journeys','companion-goals','people','npc-control','npc-knowledge','npc-contacts'])setModule(s,id,true);setModule(s,'npc-needs',false);
 const list=Object.values(s.people),index=list.indexOf(teacher),eligible=p=>p.id!==h.lineage&&p!==teacher&&p.alive&&p.role!=='ребёнок'&&p.agenda&&npcController(s,p)==='personal';
 const pupil=list.find((p,i)=>eligible(p)&&(order==='before'?i<index:i>index));if(!pupil)throw Error('Actual existing pupil unavailable');
 for(const p of list){if(p!==teacher&&p!==pupil&&p.id!==h.lineage)p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 const target=s.areas.a1;teacher.area=target.id;teacher.x=42;teacher.status='resident';teacher.agenda.job='artisan';teacher.agenda.wealth=40;Object.assign(teacher.needs,{energy:100,hunger:0,sleeping:false});
 Object.assign(pupil,{area:target.id,x:42,status:'resident',health:pupil.maxHealth||100});Object.assign(pupil.agenda,{job:'farmer',wealth:20,curiosity:.9,home:a.id,due:0});Object.assign(pupil.needs,{energy:100,hunger:0,sleeping:false});
 // Prepared prior physical contact and previously visited ordinary route; only
 // the subsequent journey/lessons/return/repair are run by the tested engine.
 observeNPCPlace(s,pupil);observeMentors(s,pupil);
 for(const id of route(s,target.id,room.id)){pupil.area=id;pupil.x=42;observeNPCPlace(s,pupil);}
 pupil.area=room.id;pupil.x=68;o.owner=pupil.id;o.offer=null;o.workTool={version:1,id:o.id+'/clamp',kind:'clamp',state:'broken',uses:24,limit:24,episode:1,brokenAt:s.tick};observeMentors(s,pupil);
 pupil.agenda.task=null;pupil.agenda.due=0;h.goal={kind:'routeWait',area:h.area,x:h.x,until:1e9};h.destiny.completed=true;h.life.reflectAfter=1e9;syncActiveActor(s);return {...f,pupil,teacher,target};
}
