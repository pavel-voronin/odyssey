import assert from 'node:assert/strict';
import {createWorld,createArea,connectAreas,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';import {peopleTick} from '../modules/people.js';
import {establishAuthority,establishBorder} from '../modules/authority-foundation.js';
import {setActorMoney,syncActiveActor} from '../actor-projection.js';import {tradeGoods} from '../modules/market.js';
import {npcKnownRoute} from '../modules/npc-knowledge.js';
export const diplomaticContext={log(){},route:(s,a,b,p)=>p?npcKnownRoute(p,a,b):a===b?[a]:s.areas[a].links.includes(b)?[a,b]:[]};
export function diplomacyFixture({extraCenter=false,trust=0}={}){
 // A small source world made with ordinary current town/road/charter
 // constructors BEFORE a proposal; the treaty controller creates none of them.
 const keep=['territorial-authorities','authority-diplomacy','relationships','witness-news','politics','people','npc-control','npc-knowledge','identity','districts','background-towns','goods-cycle','local-market','travel','world-eras','historical-calendar'],s=createWorld(4,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]))}),h=s.hero,A=s.areas.a1;
 setModule(s,'geography-frame',true); // Enable metric capability without constructing a new geographic frame.
 const id=createArea(s,'village','Второй совет',0),B=s.areas[id];connectAreas(s,A.id,B.id,{mode:'road',metric:{version:1,unit:'world',distance:12,terrain:'road',speed:6}});
 const choose=a=>a.population.map(id=>s.people[id]).find(p=>p.alive&&p.id!==h.lineage&&p.role!=='ребёнок'&&p.agenda?.job!=='guard'),chiefA=choose(A),chiefB=choose(B);assert.ok(chiefA&&chiefB);for(const p of [chiefA,chiefB]){p.x=42;p.agenda.task=null;p.agenda.due=1e9;Object.assign(p.agenda,{duty:.9,curiosity:.8,sociability:.8});}
 establishAuthority(s,A.id,chiefA.id,{origin:'world-origin'});establishAuthority(s,B.id,chiefB.id,{origin:'world-origin'});const b=establishBorder(s,{initial:true});assert.ok(b);const guard=s.people[b.guard],agent=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&![chiefA,chiefB,guard].includes(p)&&p.agenda?.job==='merchant');assert.ok(agent);
 for(const p of Object.values(s.people))if(![chiefA,chiefB,guard,agent].includes(p)&&p.id!==h.lineage)p.status='absent';for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 Object.assign(agent,{area:A.id,x:42,status:'resident',health:agent.maxHealth||100,ailment:null});Object.assign(agent.needs,{energy:100,hunger:0,sleeping:false});Object.assign(agent.agenda,{task:null,due:0,home:B.id,tools:1,duty:.8,curiosity:.8,sociability:.8});A.civic.treasury-=50;setActorMoney(s,agent,50);assert.equal(tradeGoods(s,A,agent.id,'food','buy',4).quantity,4);
 // One actual short prior border trip is the personal report source. The
 // return-to-court meeting below is an explicit arrival checkpoint, not a
 // claim that an entire return journey was exercised.
 agent.x=b.x;agent.status='wandering';agent.agenda.task={kind:'visit',target:B.id,x:42,person:chiefB.id,remaining:1};for(let i=0;i<8&&agent.area!==B.id;i++){s.tick+=8;peopleTick(s,diplomaticContext);}assert.equal(agent.area,B.id,JSON.stringify({agent:agent.id,area:agent.area,x:agent.x,task:agent.agenda.task,access:agent.borderAccess,control:agent.actionControl,transit:agent.roadTransit}));assert.equal(agent.borderAccess.entries.at(-1).status,'crossed');
 Object.assign(agent,{area:A.id,x:42,status:'resident'});agent.agenda.task=null;agent.agenda.due=0;chiefB.agenda.bonds[chiefA.id]=trust;Object.assign(h,{area:A.id,x:15,goal:{kind:'explore',area:A.id,x:15,started:s.tick},energy:100,hunger:0});syncActiveActor(s);
 if(extraCenter){const other=createArea(s,'village','Независимый третий центр',0);connectAreas(s,B.id,other);for(const id of s.areas[other].population)s.people[id].status='absent';}
 return {s,h,A,B,b,chiefA,chiefB,guard,agent};
}
export function nativeDiplomaticStep(f){f.s.tick=Math.floor(f.s.tick/8+1)*8;peopleTick(f.s,diplomaticContext);return f.s.authorities.diplomacy&&Object.values(f.s.authorities.diplomacy.proposals)[0];}
export function originAccepted(f=diplomacyFixture()){for(let i=0;i<3;i++){const q=nativeDiplomaticStep(f);if(q?.status==='outbound'){f.q=q;return f;}}throw Error('No actual originating answer');}
export function destinationMeeting(f){const {agent,B,s,q}=f;Object.assign(agent,{area:B.id,x:42,status:'resident'});agent.agenda.task=null;agent.agenda.due=s.tick;nativeDiplomaticStep(f);if(q.status==='await-recipient')nativeDiplomaticStep(f);return f;}
export function mandateAtPost(f){const {agent,b,s,q}=f;assert.equal(q.status,'returning');Object.assign(agent,{area:b.from,x:b.x,status:'resident'});agent.agenda.task=null;agent.agenda.due=s.tick;nativeDiplomaticStep(f);if(q.status==='await-guard')nativeDiplomaticStep(f);return f;}
export function actualTreaty(f=diplomacyFixture()){originAccepted(f);destinationMeeting(f);mandateAtPost(f);assert.equal(f.q.status,'implemented');return f;}
export const exactDiplomacy=s=>{syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);};
