import {createEnemy} from '../engine.js';
import {creatureTrace} from '../modules/bestiary.js';
import {setModule} from '../rules.js';
import {peopleTick} from '../modules/people.js';
import {npcAction} from '../modules/npc-control.js';
import {npcTrackingTurn} from '../modules/tracking.js';
import {serialize} from '../engine.js';
import {syncActiveActor} from '../actor-projection.js';
import {selectionFixture,selectionContext} from './action-selection-scenarios.mjs';
import {publicDestinations,startPublicJourney,advancePublicJourney} from '../modules/public-journeys.js';
import {observeLocalRoutes,revealArea,revealRoad} from '../actor-atlas.js';
import {step} from '../engine.js';
const trackingContext=selectionContext;export {trackingContext};
export function trackingFixture(){
 const f=selectionFixture(['identity','skill-branches','npc-travel','npc-knowledge','npc-control']),{s,h,a}=f;
 h.profession='ranger';h.x=100;h.personality.curiosity=.8;h.personality.courage=.3;h.memory.shopAfter=100000;observeLocalRoutes(s);
 for(const q of Object.values(s.people))if(q.agenda){q.agenda.task=null;q.agenda.due=100000;}
 for(const id of ['a2','a3'])s.areas[id].objects=s.areas[id].objects.filter(o=>o.kind!=='enemy');
 const sources=a.population.map(id=>s.people[id]).filter(p=>p?.alive&&p.id!==h.lineage&&p.role!=='ребёнок'&&p.agenda?.job!=='student').slice(0,2);if(sources.length!==2)throw Error('Missing actual adults');
 return {...f,sources};
}
export function crossTraveller(f,p){
 const {s,a}=f;p.area=a.id;p.x=42;p.status='resident';p.health=p.maxHealth||100;Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});
 p.navigation={version:1,places:[{area:'a3',name:s.areas.a3.name,seen:s.tick,workSeen:s.tick,payroll:true}],roads:[['a1','a2'],['a2','a3']].map(([from,to])=>({key:[from,to].sort().join('|'),from,to,seen:s.tick}))};
 const j=startPublicJourney(s,p,a,publicDestinations(s,p).find(d=>d.place.area==='a3'),selectionContext);if(!j)throw Error('No actual public journey');
 // A prepared checkpoint immediately before the first real boundary.
 p.x=99;j.startX=99;j.endX=100;j.remaining=j.segmentTicks=1;s.tick++;advancePublicJourney(s,j,selectionContext);if(p.area!=='a2')throw Error('Traveller did not cross');return j;
}
export function studyGoal(f,t){f.h.goal={kind:'trackStudy',area:f.h.area,x:f.h.x,trace:t.id,traceAt:t.at,started:f.s.tick};}
export function trainedTracker(){
 const f=trackingFixture(),{s,h,sources}=f;crossTraveller(f,sources[0]);crossTraveller(f,sources[1]);
 const trails=s.edges['a1|a2'].traces;studyGoal(f,trails[0]);step(s);syncActiveActor(s);f.unknownRaw=serialize(s);
 h.goal={kind:'explore',area:'a2',x:5,started:s.tick};step(s);
 studyGoal(f,trails[1]);step(s);h.goal={kind:'rest',area:'a2',x:h.x,started:s.tick};step(s);
 revealArea(s,'a1');revealRoad(s,'a1','a2');return f;
}

export function teacherFixture(){
 const f=trackingFixture(),{s,h,a,sources}=f,teacher=a.population.map(id=>s.people[id]).find(p=>p.alive&&p.id!==h.lineage&&!sources.includes(p)&&p.role!=='ребёнок');
 crossTraveller(f,sources[0]);crossTraveller(f,sources[1]);Object.assign(teacher,{area:a.id,x:100,status:'resident',health:teacher.maxHealth||100});Object.assign(teacher.needs,{energy:100,hunger:0,sleeping:false});Object.assign(teacher.agenda,{curiosity:.9,sociability:.9,task:null,due:0});
 s.tick=3;npcAction(s,teacher,'personal');if(!npcTrackingTurn(s,teacher))throw Error('No actual first NPC study');
 teacher.agenda.home='a2';teacher.agenda.task={kind:'return',target:'a2',x:5,remaining:1};teacher.navigation={version:1,places:[{area:'a1',name:a.name,seen:0},{area:'a2',name:s.areas.a2.name,seen:0}],roads:[{key:'a1|a2',from:'a1',to:'a2',seen:0}]};
 // Four isolated personal phases at the road/wait/study/confirmation boundaries.
 for(const tick of [8,16,24,32]){s.tick=tick;peopleTick(s,trackingContext);}
 if(!teacher.skillPractice?.tracking?.method)throw Error('NPC did not earn two distinct proofs '+JSON.stringify({area:teacher.area,x:teacher.x,task:teacher.agenda.task,notes:teacher.tracking?.notes,practice:teacher.skillPractice?.tracking}));
 h.goal={kind:'explore',area:'a2',x:5,started:s.tick};step(s);h.goal=null;
 // Reuse the earned knowledge at a prepared checkpoint after the short return.
 teacher.x=42;teacher.agenda.task=null;teacher.agenda.due=100000;const resident=s.areas.a2.objects.find(o=>o.person===teacher.id);if(resident)resident.x=42;h.x=42;
 setModule(s,'bestiary',true);s.tick=48;const wolf=createEnemy(s,s.areas.a2,{requestedSpecies:'wolf',x:42});wolf.hidden=false;wolf.x=43;wolf.patrol=0;const trace=creatureTrace(s,s.areas.a2,wolf,42);if(!trace)throw Error('No actual moving wolf trace');
 // The source has since walked farther; the local reader keeps its old imprint.
 s.tick=88;wolf.x=56;syncActiveActor(s);return {...f,teacher,wolf,lessonTrace:trace};
}
