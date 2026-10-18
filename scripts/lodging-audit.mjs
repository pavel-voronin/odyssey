import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {lodgingFixture,npcLodgingFixture} from './lodging-scenarios.mjs';import {commonContext} from './common-life-scenarios.mjs';
import {lodgingPlan,bookRoom} from '../modules/lodging.js';import {step,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';import {YEAR_TICKS} from '../calendar.js';
const report={steps:0,checks:0,cases:[]},start=performance.now();
function physical(s,helper){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;const h=c.actorStates[helper];for(const k of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[k];c.actorStates={[helper]:h};delete c.hero;for(const k of ['generation','observation','journal','observerKnowledge','nextNPCObservation'])delete c[k];for(const p of Object.values(c.people))delete p.actorLink;for(const l of c.lives)for(const k of ['timeline','timelineDropped','milestones'])delete l[k];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}return JSON.stringify(c);}
for(const mode of ['stay','closed','off','npc']){
 const f=mode==='npc'?npcLodgingFixture():lodgingFixture();let a=f.s;const helper=f.h.lineage,owner=f.p.id,target=f.room.id,guest=f.guest?.id,watch=guest||owner;let entered=false,exited=false,captured=false,first=null;
 if(mode!=='npc'){assert.ok(lodgingPlan(a,commonContext));bookRoom(a,commonContext);}
 let b=restore(serialize(a)),c=restore(serialize(a));assert.ok(observeExistingPerson(c,watch));
 for(let i=0;i<YEAR_TICKS;i++){
  if(i===20&&['closed','off'].includes(mode))for(const s of [a,b,c]){if(mode==='closed')s.areas.a1.objects.find(o=>o.kind==='tavern').closed=true;else setModule(s,'lodging',false);}
  for(const s of [a,b,c]){step(s);report.steps++;}
  const body=guest?a.people[guest]:a.actorStates[helper],room=a.areas[target],r=room.lodging.booking;if(body.area===target)entered=true;else if(entered)exited=true;
  if(!first&&r)first={payer:r.payer,price:r.paid,started:r.started,until:r.until,occupants:r.occupants.length};
  if(mode==='stay'&&!captured&&body.area===target&&body.lastAction==='rest'){await writeFile('artifacts/lodging-mobile-life.json',serialize(a));captured=true;}
  if(i<130||i%307===0){assert.equal(physical(a,helper),physical(b,helper),mode+' repeat '+a.tick);assert.equal(physical(a,helper),physical(c,helper),mode+' observer '+a.tick);const save=serialize(a);a=restore(save);assert.equal(serialize(a),save);report.checks++;}
 }
 assert.ok(entered&&exited);assert.ok(first);assert.equal(first.payer,guest||helper);assert.equal(first.price,3);assert.equal(first.until-first.started,240);assert.equal(a.nextGeneration,1);
 report.cases.push({mode,tick:a.tick,first,entered,exited,heroAlive:a.actorStates[helper].alive,guestAlive:guest?a.people[guest].alive:undefined,roomStatus:a.areas[target].lodging.booking.status,bookings:a.areas[target].lodging.nextBooking});console.log(JSON.stringify(report.cases.at(-1)));
}
report.elapsedMs=performance.now()-start;await writeFile('artifacts/lodging-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
