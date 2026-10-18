import test from 'node:test';
import assert from 'node:assert/strict';
import {serialize,restore,step,route,observeExistingPerson} from '../engine.js';
import {campAffairTalk,companionGoalsTick,campPersonalTalk} from '../modules/companion-goals.js';
import {companionAffairFixture,companionAffairContext as ctx} from '../scripts/companion-affair-scenarios.mjs';
import {npcController} from '../modules/npc-control.js';
import {knownNPCDeeds} from '../modules/npc-deeds.js';
import {peopleTick} from '../modules/people.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {companionAffairsHTML,companionAffairsBriefHTML} from '../companion-affairs-sheet.js';
import {postponedCompanionAffair} from '../modules/companion-affair-state.js';
import {partyCare} from '../modules/party-needs.js';
import {socialTick} from '../modules/social.js';

test('a real paid lesson and a known critical family need coexist; the camp decision parts peacefully at the same physical fire',()=>{
 const f=companionAffairFixture(),{s,p,h,parent,c,order,camp}=f,g=p.personalJourney,lessons=structuredClone(g.lessons),due=g.due,end=g.abandonAfter,heroPlan=structuredClone(h.goal),energy=p.needs.energy,stock=p.roadSupplies.medicine;
 assert.ok(campAffairTalk(s,ctx));assert.equal(h.companions.length,0);assert.equal(p.area,camp.id);assert.equal(p.x,h.x);assert.equal(p.status,'wandering');assert.equal(npcController(s,p),'personal');assert.equal(p.companionAffairs.current.domain,'family');assert.equal(p.companionAffairs.history.at(-1).outcome,'parted');assert.equal(h.relations[p.id].trust,52);assert.deepEqual(g.lessons,lessons);assert.equal(g.due,due);assert.equal(g.abandonAfter,end);assert.equal(g.phase,'independent');assert.equal(order.progress,1);assert.equal(p.roadSupplies.medicine,stock);assert.equal(p.needs.energy,energy-1);assert.deepEqual(h.goal,heroPlan);assert.equal(h.quests.length,0);assert.ok(p.familyNeeds.cases[parent.id]);assert.equal(c.hp,30);
});

test('a known common road produces one bounded agreement without rewriting the hero goal, paid lessons or deadlines',()=>{
 const {s,p,h}=companionAffairFixture({shared:true}),goal=serialize(s),due=p.personalJourney.due;assert.ok(campAffairTalk(s,ctx));assert.equal(h.companions.length,1);const a=p.companionAffairs.agreement;assert.equal(a.to,'a1');assert.ok(a.until>s.tick&&a.until-s.tick<=16);assert.equal(p.personalJourney.due,due);assert.equal(p.personalJourney.lessons.length,1);assert.deepEqual(h.goal,JSON.parse(goal).hero.goal);assert.equal(h.campSession.activity,'companion-affairs');const before=serialize(s);assert.equal(campAffairTalk(s,ctx),false);assert.equal(serialize(s),before);
});

test('equal friendship with less urgent family news preserves paid learning instead of inventing a quarrel',()=>{
 const urgent=companionAffairFixture(),calm=companionAffairFixture({health:65,paid:2});assert.equal(urgent.h.relations[urgent.p.id].trust,calm.h.relations[calm.p.id].trust);assert.ok(campAffairTalk(urgent.s,ctx));assert.ok(campAffairTalk(calm.s,ctx));assert.equal(urgent.p.companionAffairs.current.domain,'family');assert.equal(calm.p.companionAffairs.current.domain,'learning');assert.equal(calm.p.companionAffairs.postponed.domain,'family');assert.equal(calm.p.personalJourney.lessons.length,2);assert.ok(calm.h.relations[calm.p.id].trust>=50);
});

test('a conversation is not also a personal action on the handoff tick, including control OFF',()=>{
 const {s,p}=companionAffairFixture();s.tick=Math.ceil(s.tick/8)*8;assert.ok(campAffairTalk(s,ctx));setModule(s,'npc-control',false);const before=JSON.stringify(p);peopleTick(s,ctx);assert.equal(p.agenda.task,null);assert.equal(p.companionAffairs.lastActionTick,s.tick);assert.equal(p.personalJourney.lessons.length,1);assert.equal(JSON.stringify(p),before);
});

test('the old pitch talk does not grant another free trust increase for the new camp topic',()=>{
 const {s,p,h}=companionAffairFixture(),trust=h.relations[p.id].trust;campPersonalTalk(s,ctx);assert.equal(h.relations[p.id].trust,trust);assert.equal(p.personalJourney.talkedAt,null);assert.ok(campAffairTalk(s,ctx));assert.equal(h.relations[p.id].trust,trust+2);
});

test('OFF retains both affairs and the real lesson while the previous companionship rule remains in charge',()=>{
 const {s,p,h}=companionAffairFixture(),lessons=structuredClone(p.personalJourney.lessons);setModule(s,'companion-affairs',false);assert.equal(campAffairTalk(s,ctx),false);assert.equal(p.companionAffairs,undefined);assert.equal(knownNPCDeeds(s,p).some(d=>d.domain==='family'),true);assert.deepEqual(p.personalJourney.lessons,lessons);s.tick=p.personalJourney.due;companionGoalsTick(s,ctx);assert.equal(h.companions.length,0);assert.equal(p.personalJourney.phase,'independent');
});

test('a hidden distant worsening does not replace the actual old news or change the companion decision',()=>{
 const f=companionAffairFixture({health:65,paid:2});syncActiveActor(f.s);const other=restore(serialize(f.s));other.people[f.parent.id].health=5;assert.ok(campAffairTalk(f.s,ctx));assert.ok(campAffairTalk(other,ctx));const a=f.p.companionAffairs,b=other.people[f.p.id].companionAffairs;assert.equal(a.current.domain,'learning');assert.deepEqual(a,b);assert.equal(other.people[f.p.id].familyNeeds.cases[f.parent.id].health,65);
});

test('only an actual arriving relative can turn the remembered mild illness into urgent family news',()=>{
 const f=companionAffairFixture({health:65,paid:2}),{s,p,h,parent,camp}=f,home=parent.area;
 // Prior visit memory is a prepared starting fact; this new visit is walked by
 // the ordinary controller, including the real camp passage.
 const startX=parent.x;for(const id of route(s,home,camp.id)){parent.area=id;observeNPCPlace(s,parent);}parent.area=camp.temporaryCamp.parent;parent.x=camp.temporaryCamp.site.parentX;observeNPCPlace(s,parent);parent.area=home;parent.x=startX;parent.health=15;parent.agenda.task={kind:'visit',target:camp.id,x:h.x,remaining:2,person:p.id,home,knownNavigation:true};parent.agenda.due=s.tick;let crossed=false;
 assert.equal(p.familyNeeds.cases[parent.id].health,65);s.tick=Math.ceil((s.tick+1)/8)*8-8;for(let i=0;i<160&&(parent.area!==camp.id||Math.abs(parent.x-h.x)>20);i++){s.tick+=8;peopleTick(s,ctx);crossed ||= parent.area!==home;}
 assert.ok(crossed);assert.equal(parent.area,camp.id);assert.ok(Math.abs(parent.x-h.x)<=20);socialTick(s,ctx);assert.equal(p.familyNeeds.cases[parent.id].health,15);assert.ok(p.familyNeeds.cases[parent.id].revision>0);assert.ok(campAffairTalk(s,ctx));assert.equal(p.companionAffairs.current.domain,'family');assert.equal(p.personalJourney.lessons.length,2);
});

test('the same friendship and obligations choose differently as the original known lesson deadline approaches',()=>{
 const early=companionAffairFixture({health:65}),late=companionAffairFixture({health:65}),due=late.p.personalJourney.due;late.s.tick=due-8;assert.equal(early.h.relations[early.p.id].trust,late.h.relations[late.p.id].trust);assert.ok(campAffairTalk(early.s,ctx));assert.ok(campAffairTalk(late.s,ctx));assert.equal(early.p.companionAffairs.current.domain,'family');assert.equal(late.p.companionAffairs.current.domain,'learning');assert.equal(late.p.personalJourney.due,due);assert.equal(late.p.personalJourney.lessons.length,1);
});

test('two genuinely paid lessons can retain the course where the otherwise same one-lesson pupil chooses family',()=>{
 const one=companionAffairFixture({health:65,paid:1}),two=companionAffairFixture({health:65,paid:2});assert.ok(campAffairTalk(one.s,ctx));assert.ok(campAffairTalk(two.s,ctx));assert.equal(one.p.companionAffairs.current.domain,'family');assert.equal(two.p.companionAffairs.current.domain,'learning');assert.equal(one.p.personalJourney.lessons.length,1);assert.equal(two.p.personalJourney.lessons.length,2);
});

test('postponement expires or is released when its actual chosen course is disabled, without erasing the family case',()=>{
 const {s,p}=companionAffairFixture({health:65,paid:2});assert.ok(campAffairTalk(s,ctx));const r=p.companionAffairs.postponed;assert.equal(r.domain,'family');assert.ok(postponedCompanionAffair(s,p,r.id));const saved=serialize(s);setModule(s,'mentor-journeys',false);assert.equal(postponedCompanionAffair(s,p,r.id),null);assert.ok(knownNPCDeeds(s,p).find(d=>d.id===r.id).available);const loaded=restore(saved);loaded.tick=r.until;assert.equal(postponedCompanionAffair(loaded,loaded.people[p.id],r.id),null);assert.equal(loaded.people[p.id].familyNeeds.serial,p.familyNeeds.serial);
});

test('a new observed family revision invalidates the old short postponement instead of binding the companion to old news',()=>{
 const {s,p,parent}=companionAffairFixture({health:65,paid:2});campAffairTalk(s,ctx);const r=p.companionAffairs.postponed;assert.ok(postponedCompanionAffair(s,p,r.id));const c=p.familyNeeds.cases[parent.id];c.revision++;assert.equal(postponedCompanionAffair(s,p,r.id),null);assert.equal(p.personalJourney.lessons.length,2);
});

test('a real meal already used the companion action, so the optional conversation waits for a later tick',()=>{
 const {s,p,h,a}=companionAffairFixture();setModule(s,'npc-needs',true);setModule(s,'npc-personal-supplies',true);setModule(s,'npc-party-needs',true);s.tick=Math.ceil(s.tick/8)*8;p.needs.hunger=80;p.roadSupplies.food=1;a.civic.food--;partyCare(s,h.companions[0],ctx);assert.equal(p.partyNeeds.activity,'eat');assert.equal(p.roadSupplies.food,0);const before=serialize(s);assert.equal(campAffairTalk(s,ctx),false);assert.equal(serialize(s),before);assert.equal(h.campSession,null);
});

test('unsafe fire, exhausted companion or a zero-loyalty companion cannot be converted into a friendly forced talk',()=>{
 for(const mode of ['threat','sleep','loyalty']){const {s,p,h,c,camp}=companionAffairFixture();if(mode==='threat')camp.objects.push({id:'fixture/threat',kind:'enemy',alive:true,resolved:false,x:h.x+4,hp:100,maxHp:100,attack:20});if(mode==='sleep')p.needs.sleeping=true;if(mode==='loyalty')c.loyalty=0;const before=serialize(s);assert.equal(campAffairTalk(s,ctx),false);assert.equal(serialize(s),before);assert.equal(h.relations[p.id].trust,50);}
});

test('the camp agreement and its actual paid facts survive an exact reload; altered future action clocks are rejected',()=>{
 const {s,p}=companionAffairFixture({shared:true});assert.ok(campAffairTalk(s,ctx));syncActiveActor(s);const raw=serialize(s),copy=restore(raw);assert.equal(serialize(copy),raw);for(const corrupt of [n=>n.version=99,n=>n.lastActionTick=s.tick+1,n=>n.agreement.until=n.agreement.since+49,n=>n.agreement.path=['unseen'],n=>n.postponed.family='another/family/1']){const data=JSON.parse(raw);corrupt(data.people[p.id].companionAffairs);assert.throws(()=>restore(JSON.stringify(data)));}
});

test('the common-road sheet is escaped and read-only, without selection controls or a new hero quest',()=>{
 const {s,p,h}=companionAffairFixture({shared:true});campAffairTalk(s,ctx);p.companionAffairs.agreement.toName='<script>road</script>';const before=serialize(s),escape=v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;'),html=companionAffairsHTML(s,p,escape);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<button'));assert.ok(!html.includes('<script>'));assert.equal(serialize(s),before);assert.equal(h.quests.length,0);
});

test('a bounded agreement really expires while the hero is still resting, leaving the same companion at the fire rather than teleporting to the promised node',()=>{
 const {s,p,h,camp}=companionAffairFixture({shared:true});assert.ok(campAffairTalk(s,ctx));const a={...p.companionAffairs.agreement};s.tick=a.until;companionGoalsTick(s,ctx);assert.equal(h.companions.length,0);assert.equal(p.companionAffairs.agreement,null);assert.equal(p.area,camp.id);assert.equal(p.x,h.x);assert.notEqual(p.area,a.to);assert.equal(p.personalJourney.lessons.length,1);assert.equal(p.companionAffairs.history.at(-1).outcome,'parted');
});

test('after a real camp departure the independent worker physically exits, delivers one actual dose and continues the original paid course with exact reload replay',()=>{
 const f=companionAffairFixture(),{s,p,parent,camp,teacher}=f,first=structuredClone(p.personalJourney.lessons[0]),teacherMoney=teacher.agenda.wealth;assert.ok(campAffairTalk(s,ctx));syncActiveActor(s);let other=restore(serialize(s)),exited=false,supplied=false;
 for(let i=0;i<1200&&(p.familyNeeds.cases[parent.id].status!=='supplied'||p.personalJourney.lessons.length<3);i++){step(s);step(other);exited ||= p.area!==camp.id;supplied ||= p.familyNeeds.cases[parent.id].status==='supplied';if(i%37===36){const raw=serialize(s);assert.equal(serialize(other),raw);other=restore(raw);assert.equal(serialize(other),raw);}}
 assert.ok(exited);assert.ok(supplied);const need=p.familyNeeds.cases[parent.id];assert.equal(need.receipt.to,parent.id);assert.equal(need.receipt.medicine,2);assert.equal(parent.roadSupplies.medicine,2);assert.equal(p.roadSupplies.medicine,0);assert.deepEqual(p.personalJourney.lessons[0],first);assert.equal(p.personalJourney.lessons.length,3);assert.equal(teacher.agenda.wealth,teacherMoney+2);assert.equal(serialize(s),serialize(other));assert.equal(npcController(s,p),'personal');
});

test('when both known affairs are unavailable a postponement has a real boundary rather than permanent companionship',()=>{
 const {s,p,h,camp}=companionAffairFixture({carried:false});p.agenda.wealth=0;assert.ok(campAffairTalk(s,ctx));assert.equal(p.companionAffairs.history.at(-1).outcome,'postponed');assert.equal(h.companions.length,1);const review=p.companionAffairs.reviewAfter;assert.ok(review>s.tick&&review-s.tick<=48);s.tick=review;companionGoalsTick(s,ctx);assert.equal(h.companions.length,0);assert.equal(p.area,camp.id);assert.equal(p.agenda.wealth,0);assert.equal(p.personalJourney.lessons.length,1);assert.equal(p.companionAffairs.history.at(-1).outcome,'parted');
});

test('a pure party brief can explain the two actually known affairs before any conversation, without constructing a decision',()=>{
 const {s,p}=companionAffairFixture(),raw=serialize(s),html=companionAffairsBriefHTML(s,p,String);assert.ok(html.includes('Помнит два дела'));assert.ok(html.includes('1 / 3'));assert.equal(p.companionAffairs,undefined);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);
});

test('watching the same ordinary companion retains the party controller through the real camp decision and replays the handoff exactly',()=>{
 const {s,p,parent}=companionAffairFixture();syncActiveActor(s);assert.ok(observeExistingPerson(s,p.id));const copy=restore(serialize(s));for(let i=0;i<640;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));assert.equal(s.hero.actorMode,'npc');assert.equal(p.companionAffairs.history.at(-1).outcome,'parted');assert.equal(p.familyNeeds.cases[parent.id].status,'supplied');assert.equal(p.familyNeeds.cases[parent.id].receipt.medicine,2);assert.equal(p.personalJourney.lessons.length,3);
});

test('an observed companion explains its real bounded agreement while retaining the actual party intention',()=>{
 const {s,p}=companionAffairFixture({shared:true});assert.ok(campAffairTalk(s,ctx));syncActiveActor(s);assert.ok(observeExistingPerson(s,p.id));assert.match(s.hero.intent,/В отряде/);assert.equal(s.hero.reason,p.companionAffairs.history.at(-1).reason);assert.equal(npcController(s,p),'party');
});

test('recording the postponed lesson does not itself revoke the new common-road agreement on the next tick',()=>{
 const {s,p,h}=companionAffairFixture({shared:true});assert.ok(campAffairTalk(s,ctx));const a=structuredClone(p.companionAffairs.agreement),history=structuredClone(p.companionAffairs.history);for(let i=0;i<4;i++){s.tick++;companionGoalsTick(s,ctx);assert.equal(h.companions.length,1);assert.deepEqual(p.companionAffairs.agreement,a);assert.deepEqual(p.companionAffairs.history,history);}assert.equal(p.personalJourney.lessons.length,1);
});
