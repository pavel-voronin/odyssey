import assert from 'node:assert/strict';
import {verdictFixture,verdictContext} from './verdict-knowledge-scenarios.mjs';
import {setModule} from '../rules.js';
import {recordReading} from '../modules/verdict-evidence.js';
import {verdictReviewPlan,verdictReviewAction} from '../modules/verdict-review.js';
import {peopleTick} from '../modules/people.js';
export const reviewContext=verdictContext;
export function reviewFixture({read=true}={}){
 const f=verdictFixture(),{s,h,c}=f;for(const id of ['verdict-review','people','npc-control'])setModule(s,id,true);setModule(s,'principles',false);
 // Bring an existing genuine guard to this prepared local jurisdiction. No
 // ordinary resident is promoted by a reader or converted into a free witness.
 const clerk=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='guard'&&![h.lineage,c.accused,c.other].includes(p.id));assert.ok(clerk);
 for(const p of Object.values(s.people))if(![h.lineage,c.accused,c.other,clerk.id].includes(p.id))p.status='absent';
 for(const p of Object.values(s.people))if(p.id!==clerk.id&&p.agenda){p.agenda.task=null;p.agenda.due=1e9;}
 for(const a of Object.values(s.areas)){a.population=a.population?.filter(id=>id!==clerk.id);for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}}
 const a=s.areas[c.source];a.population.push(clerk.id);Object.assign(clerk,{area:a.id,x:42,status:'resident',health:clerk.maxHealth||100,ailment:null});Object.assign(clerk.needs,{energy:100,hunger:0,sleeping:false});Object.assign(clerk.agenda,{home:a.id,task:null,due:1e9});a.danger=0;h.goal=null;h.x=f.o.x;h.memory.shopAfter=1e9;h.life.reflectAfter=1e9;h.destiny.completed=true;
 if(read){s.tick++;assert.equal(recordReading(s,f.entry,verdictContext),true);}h.x=42;
 return{...f,a,clerk,victim:s.people[c.verdict],culprit:s.people[c.other]};
}
export function petition(f){assert.equal(verdictReviewPlan(f.s,reviewContext),true);assert.equal(f.h.goal.kind,'verdictPetition');f.s.tick++;assert.equal(verdictReviewAction(f.s,reviewContext),true);return f.c.verdictReview;}
export function officialCheck(f){for(let n=0;n<16&&f.c.verdictReview.status==='checking';n++){f.s.tick=(Math.floor(f.s.tick/8)+1)*8;peopleTick(f.s,reviewContext);}assert.equal(f.c.verdictReview.status,'ready');}
export function hearing(f){f.s.tick++;f.h.goal=null;assert.equal(verdictReviewPlan(f.s,reviewContext),true);f.h.x=f.c.verdictReview.meetingX;return verdictReviewAction(f.s,reviewContext);}
