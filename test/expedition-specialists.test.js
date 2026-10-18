import test from 'node:test';
import assert from 'node:assert/strict';
import {step,serialize,restore,createArea,connectAreas} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {partyCombatFixture} from '../scripts/party-combat-scenarios.mjs';
import {expeditionNode,expeditionNodePlan} from '../modules/expedition-specialists.js';
import * as expeditions from '../modules/expeditions.js';
import {storyAction,finishStory} from '../modules/stories.js';
import {storyObject} from '../modules/story-common.js';
import {npcAction,canStartNPCActivity} from '../modules/npc-control.js';
import {releaseParty} from '../modules/social.js';

// Prepared known apprentice with an already learned method, not a natural-life claim.
function fixture(){
 const f=partyCombatFixture({roles:['artisan']}),{s,h,members}=f,{person:p,companion:m}=members[0];
 const keep=['stories','expeditions','companions','people','relationships','identity','skill-branches','npc-control'];
 for(const mod of MODULES)setModule(s,mod.id,keep.includes(mod.id));
 h.combat=null;h.hp=h.maxHp;h.x=82;p.x=80;h.memory.people.push(p.id);
 p.skillPractice={craft:{operations:[],total:0,method:{id:'fit-working-part',learnedAt:0,source:[]}}};
 const c={id:'specialist-test',kind:'expedition',variant:'ship',status:'active',owner:h.lineage,source:h.area,target:h.area,started:s.tick,stage:'investigate',choices:[],effects:[],refs:[],accessNode:expeditionNode()};
 c.console=storyObject(s,c,h.area,'Сердце корабля',82);s.storyCases.push(c);h.stories.active=c.id;
 const ctx={...f.ctx,addArea:createArea,connect:connectAreas,storyFinish:finishStory,goal:(world,kind,area,x,intent,reason,extra)=>world.hero.goal={kind,area,x,intent,reason,...extra}};
 function turn(){s.tick++;expeditions.plan(s,c,ctx);h.x=h.goal.x;p.x=h.x-2;storyAction(s,c.id,ctx);}
 return {...f,p,m,c,ctx,turn};
}
test('known practical method chooses a real helper without mutation; two paid actions open the direct passage',()=>{
 const {s,h,p,c,ctx,turn}=fixture(),raw=serialize(s),energy=p.needs.energy;
 assert.deepEqual(expeditionNodePlan(s,c),{route:'repair',actor:p.id,x:82});assert.equal(serialize(s),raw);
 turn();assert.equal(c.accessNode.remaining,1);assert.equal(c.status,'active');assert.equal(p.needs.energy,energy-4);assert.equal(h.inventory.relics,0);assert.equal(p.expeditionWork.story,c.id);
 const once=serialize(s);storyAction(s,c.id,ctx);assert.equal(serialize(s),once);
 assert.equal(npcAction(s,p,'party','combat'),false);assert.equal(npcAction(s,p,'party','lesson'),false);
 const loaded=restore(once);assert.equal(serialize(loaded),once);
 turn();assert.equal(c.accessNode.status,'open');assert.equal(c.accessNode.route,'repair');assert.equal(p.needs.energy,energy-8);assert.deepEqual(c.accessNode.history.map(e=>e.actor),[p.id,p.id]);
 const twice=serialize(s);storyAction(s,c.id,ctx);assert.equal(serialize(s),twice,'opening does not grant same-tick console use');
});
test('job title or unrelated rank cannot replace the learned method; absent specialist uses a finite bypass',()=>{
 const {s,h,p,c,turn}=fixture();delete p.skillPractice;h.profession='soldier';h.stats.wit=20;
 assert.equal(expeditionNodePlan(s,c).route,'bypass');const before=h.energy;
 turn();turn();turn();assert.equal(c.accessNode.status,'open');assert.equal(c.accessNode.route,'bypass');assert.equal(c.accessNode.remaining,2);assert.equal(h.energy,before-15);assert.equal(p.expeditionWork,undefined);assert.equal(c.status,'active');
});
test('exhaustion, a personal deadline or low loyalty refuses specialist work without damage or payment',()=>{
 for(const change of [f=>f.p.needs.energy=29,f=>f.m.loyalty=44,f=>f.p.personalJourney={status:'active',due:f.s.tick+1},f=>f.p.needs.sleeping=true]){
  const f=fixture();change(f);assert.equal(expeditionNodePlan(f.s,f.c).route,'bypass');const hp=f.p.health,energy=f.p.needs.energy;f.turn();assert.equal(f.p.health,hp);assert.equal(f.p.needs.energy,energy);assert.equal(f.c.accessNode.history[0].route,'bypass');
 }
});
test('unknown, distant or lost participants are never selected from the world population',()=>{
 for(const change of [f=>f.h.memory.people=[],f=>f.p.area='a1',f=>f.p.x=60,f=>{f.p.alive=false;f.p.health=0;},f=>f.h.companions=[]]){const f=fixture();change(f);assert.equal(expeditionNodePlan(f.s,f.c).route,'bypass');}
});
test('losing a selected specialist between planning and execution cancels the stale goal and preserves partial repair',()=>{
 const f=fixture(),{s,h,p,c,ctx,turn}=f;turn();s.tick++;expeditions.plan(s,c,ctx);p.needs.energy=10;const energy=h.energy;storyAction(s,c.id,ctx);
 assert.equal(h.goal,null);assert.equal(c.accessNode.remaining,1);assert.equal(c.accessNode.history.length,1);assert.equal(h.energy,energy);
 expeditions.plan(s,c,ctx);assert.equal(h.goal.nodeRoute,'bypass');assert.equal(h.goal.x,64);turn();assert.equal(c.accessNode.remaining,1);assert.equal(c.accessNode.bypassRemaining,2);
});
test('the hero can use their own learned craft without borrowing a companion action',()=>{
 const f=fixture(),{s,h,p,c,turn}=f;s.people[h.lineage].skillPractice=structuredClone(p.skillPractice);const energy=p.needs.energy,own=h.energy;
 assert.equal(expeditionNodePlan(s,c).actor,h.lineage);turn();turn();assert.equal(h.energy,own-8);assert.equal(p.needs.energy,energy);assert.equal(p.expeditionWork,undefined);assert.equal(c.accessNode.status,'open');
});
test('a previously spent action blocks work; accepted work cannot be refunded by rule disable or party release',()=>{
 for(const arbiter of [true,false]){
  const f=fixture(),{s,h,p,c,ctx,turn}=f;setModule(s,'npc-control',arbiter);turn();setModule(s,'expeditions',false);setModule(s,'npc-control',false);
  assert.equal(npcAction(s,p,'party','combat'),false);releaseParty(s,ctx);h.companions=[];assert.equal(canStartNPCActivity(s,p),false);s.tick++;assert.equal(canStartNPCActivity(s,p),true);assert.equal(c.accessNode.remaining,1);
 }
 const f=fixture();f.s.tick++;assert.equal(npcAction(f.s,f.p,'party','lesson'),true);assert.equal(expeditionNodePlan(f.s,f.c).route,'bypass');
});
test('OFF preserves node progress and former current stories restore without adding a node',()=>{
 const {s,c,ctx,turn}=fixture();turn();setModule(s,'expeditions',false);const raw=serialize(s);storyAction(s,c.id,ctx);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);
 delete c.accessNode;delete s.people[s.hero.companions[0].person].expeditionWork;const prior=serialize(s);assert.equal(serialize(restore(prior)),prior);
});
test('a real story dispatcher still consumes one relic and opens a real destination after the paid node',()=>{
 const {s,h,c,ctx,turn}=fixture();turn();turn();h.stats.wit=10;h.inventory.relics=1;s.tick++;expeditions.plan(s,c,ctx);storyAction(s,c.id,ctx);
 assert.equal(c.status,'done');assert.equal(h.inventory.relics,0);assert.ok(s.areas[c.target].links.some(id=>s.areas[id].name==='Остров под чужой луной'));assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('current constructors add the ship node only to ships; malformed node records are rejected',()=>{
 const {s,c,ctx}=fixture();
 const clean={id:'fresh-case',source:c.source,refs:[]};expeditions.start(s,clean,ctx);assert.equal(Boolean(clean.accessNode),clean.variant==='ship');
 c.accessNode.remaining=3;assert.throws(()=>restore(serialize(s)),/accessNode/);
});
test('isolated engine prefix replays the same specialist work through a save boundary (at most 12 ticks)',()=>{
 const {s,h,p,c,ctx}=fixture();for(const o of s.areas[h.area].objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 expeditions.plan(s,c,ctx);let copy=restore(serialize(s));
 for(let i=0;i<12&&c.accessNode.status!=='open';i++){step(s);step(copy);assert.equal(serialize(s),serialize(copy));}
 assert.equal(c.accessNode.status,'open');assert.equal(c.accessNode.route,'repair');assert.equal(c.accessNode.history.length,2);assert.equal(p.expeditionWork.energy,4);
});
