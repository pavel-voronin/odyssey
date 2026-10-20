import assert from 'node:assert/strict';
import {returnFixture,ritualAct,returnContext} from './return-ritual-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {availableOffers,acceptOfferedQuest,questAction,finishQuest} from '../modules/quests.js';
import {setModule} from '../rules.js';
import {recordAreaVisit} from '../actor-atlas.js';
import {setActorMoney,syncActiveActor} from '../actor-projection.js';
import {returnPastMeet,returnPastNPCTurn} from '../modules/return-past.js';
import {step} from '../engine.js';
export const pastContext={...commonContext,...returnContext,returnPastNPCTurn,returnPastMeet:(s,id)=>returnPastMeet(s,s.people[s.hero.lineage],s.people[id],pastContext)};
export function pastFixture({prepaid=false,fear=false,quest=true,desire=true}={}){
 let q,town,giver,doctor;const f=returnFixture({beforeDeath({s,h,a,enemy,caster}){
  setModule(s,'relationships',true);if(quest)setModule(s,'quests',true);
  h.gold-=4;setActorMoney(s,caster,4);
  town=Object.values(s.areas).find(t=>t.civic);const position={area:h.area,x:h.x,goal:h.goal,combat:h.combat};h.area=town.id;h.x=42;h.combat=null;recordAreaVisit(s,town);h.personality.curiosity=desire?1:.1;h.goal={kind:'talk',area:town.id,x:42,started:s.tick};
  if(fear){const id=createPerson(s,{name:'Осторожный служитель',race:'human',area:town.id,x:68},{initialJob:'healer'});doctor=s.people[id];doctor.agenda.curiosity=.1;doctor.agenda.duty=.9;doctor.agenda.task=null;doctor.agenda.due=1e9;town.population.unshift(id);}
  if(quest){const offer=availableOffers(s,town).find(o=>o.kind==='scout');assert.ok(offer,'selected town offers an actual unfinished road report');s.tick++;acceptOfferedQuest(s,offer.offer,pastContext);q=h.quests.at(-1);assert.equal(q.kind,'scout');giver=s.people[q.giver];if(prepaid){h.area=q.target;h.x=84;s.tick++;questAction(s,q,pastContext);h.area=q.source;h.x=giver.x;s.tick++;finishQuest(s,q,pastContext);assert.equal(q.status,'done');}}
  Object.assign(h,position);syncActiveActor(s);
 }});Object.assign(f,{quest:q,town,giver,doctor});return f;
}
export function returnPastFixture(options={}){const f=pastFixture(options);for(let i=0;i<4;i++)ritualAct(f);return f;}
export function meetOldGiver(f){const {s,h,giver}=f;giver.status='resident';h.area=giver.area;h.x=giver.x;h.goal=null;syncActiveActor(s);step(s);return f;}
