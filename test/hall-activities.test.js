import {test} from 'node:test';import assert from 'node:assert/strict';
import {interiorFixture} from '../scripts/interiors-scenarios.mjs';
import {commonContext} from '../scripts/common-life-scenarios.mjs';
import {songQuote,planSongWork,songAction,hallActivitiesTick,hallConversation} from '../modules/hall-activities.js';
import {setModule} from '../rules.js';import {serialize,restore,step,observeExistingPerson,createNextStory} from '../engine.js';
import {hallFixture} from '../scripts/hall-scenarios.mjs';
import {planWork,workTick} from '../modules/work.js';
const ctx={...commonContext,gainXp(s,n){s.hero.xp+=n;}};
const fixture=hallFixture;
test('an actual willing listener and finite payer reserve a fee and release it only after four real song actions',()=>{
 const {s,h,p,d}=fixture(),gold=h.gold,energy=h.energy,xp=h.xp;assert.ok(planSongWork(s,ctx,{reason:'Need income'}));songAction(s,ctx);assert.equal(p.agenda.wealth,11);assert.equal(h.gold,gold);assert.equal(d.performance.held,9);assert.equal(d.performance.remaining,4);
 songAction(s,ctx);assert.equal(d.performance.remaining,4);for(let i=0;i<4;i++){s.tick++;songAction(s,ctx);}assert.equal(h.gold,gold+9);assert.equal(p.agenda.wealth,11);assert.equal(d.performance.held,0);assert.equal(d.performance.paid,9);assert.equal(d.performance.status,'done');assert.equal(h.energy,energy-8);assert.equal(h.xp,xp+5);assert.equal(h.counters.peacefulWork,1);
});
test('no owner budget, missing or unwilling listeners and disabled service do not generate a song fee',()=>{
 for(const mode of ['poor','absent','sleep','hungry','busy','unwilling','off','unskilled']){const {s,h,p}=fixture(),before=h.gold;if(mode==='poor')p.agenda.wealth=8;if(mode==='absent')p.area='a1';if(mode==='sleep')p.needs.sleeping=true;if(mode==='hungry')p.needs.hunger=90;if(mode==='busy'){delete p.interiorStay;p.agenda.task={kind:'farm'};}if(mode==='unwilling')p.agenda.sociability=0;if(mode==='off')setModule(s,'hall-activities',false);if(mode==='unskilled')h.profession='clockmaker';assert.equal(songQuote(s),null,mode);assert.equal(planSongWork(s,ctx,{reason:'income'}),false);assert.equal(h.gold,before);}
});
test('departure, danger, closure, off, death or another actual plan refund the unspent reserve once',()=>{
 for(const mode of ['listener','danger','closed','off','dead','plan']){const {s,h,p,d}=fixture(),gold=h.gold;planSongWork(s,ctx,{reason:'income'});songAction(s,ctx);songAction(s,ctx);if(mode==='listener')p.area='a1';if(mode==='danger')h.combat='enemy';if(mode==='closed')d.closed=true;if(mode==='off')setModule(s,'hall-activities',false);if(mode==='dead')h.alive=false;if(mode==='plan')h.goal=null;hallActivitiesTick(s,ctx);assert.equal(d.performance.status,'cancelled',mode);assert.equal(p.agenda.wealth,20);assert.equal(d.performance.refunded,9);assert.equal(h.gold,gold);hallActivitiesTick(s,ctx);assert.equal(p.agenda.wealth,20);}
});
test('another performer, another nonce and a replay cannot collect or consume a reserved fee',()=>{
 const {s,h,p,d}=fixture(),gold=h.gold;planSongWork(s,ctx,{reason:'income'});songAction(s,ctx);const original={...h.goal};assert.equal(songQuote(s),null);h.goal={...original,performance:'other'};songAction(s,ctx);assert.equal(h.gold,gold);assert.equal(d.performance.held,9);h.goal=original;for(let i=0;i<4;i++){s.tick++;songAction(s,ctx);}assert.equal(h.gold,gold+9);h.goal=original;songAction(s,ctx);assert.equal(h.gold,gold+9);assert.equal(p.agenda.wealth,11);
});
test('a real conversation imports the participant own note once per cooldown and respects relationships off',()=>{
 const {s,h,p}=fixture();p.agenda.knowledge.push({tick:s.tick-1,text:'The bridge was damaged.'});assert.equal(hallConversation(s,ctx),true);const trust=h.relations[p.id].trust,bond=p.agenda.bonds[h.lineage];assert.ok(s.journal[0].text.includes('The bridge was damaged.'));assert.equal(hallConversation(s,ctx),false);assert.equal(h.relations[p.id].trust,trust);setModule(s,'relationships',false);h.hallTalkAfter[p.id]=0;hallConversation(s,ctx);assert.equal(h.relations[p.id].trust,trust);assert.equal(p.agenda.bonds[h.lineage],bond);
});
test('accepted payment survives exact loading and normal simulation, including observation through the real payer',()=>{
 const {s,h,p,d}=fixture();planSongWork(s,ctx,{reason:'income'});songAction(s,ctx);const before=h.gold,save=serialize(s),loaded=restore(save),observed=restore(save);assert.equal(serialize(loaded),save);assert.ok(observeExistingPerson(observed,p.id));
 for(let i=0;i<5;i++)for(const world of [s,loaded,observed])step(world);
 for(const world of [s,loaded,observed]){assert.equal(world.actorStates[h.lineage].gold,before+9);assert.equal(world.people[p.id].agenda.wealth,11);assert.equal(world.areas.a1.objects.find(o=>o.id===d.id).performance.status,'done');}
 assert.equal(serialize(s),serialize(loaded));
});
test('acceptance requires the actual performance position and a second real body cannot reserve the same slot',()=>{
 const {s,h,p,d,hall}=fixture();planSongWork(s,ctx,{reason:'income'});h.x=8;songAction(s,ctx);assert.equal(p.agenda.wealth,20);assert.equal(d.performance,undefined);
 h.x=50;planSongWork(s,ctx,{reason:'income'});songAction(s,ctx);const original=h.lineage;assert.ok(createNextStory(s,{allowLiving:true}));s.hero.area=hall.id;s.hero.x=50;s.hero.profession='bard';assert.notEqual(s.hero.lineage,original);assert.equal(songQuote(s),null);assert.equal(planSongWork(s,ctx,{reason:'income'}),false);assert.equal(d.performance.performer,original);assert.equal(d.performance.held,9);assert.equal(p.agenda.wealth,11);
});
test('a genuine lethal battle ends the body and returns the reserved fee once while the same world continues',()=>{
 const {s,h,p,d}=fixture();planSongWork(s,ctx,{reason:'income'});songAction(s,ctx);const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy');Object.assign(enemy,{hp:10000,maxHp:10000,attack:10000});h.area='a2';h.x=enemy.x;h.hp=h.maxHp;h.combat=enemy.id;h.inventory.herbs=0;h.inventory.potions=0;
 step(s);assert.equal(h.alive,false);assert.equal(d.performance.status,'cancelled');assert.equal(d.performance.refunded,9);assert.equal(p.agenda.wealth,20);assert.equal(s.lives.filter(l=>l.lineage===h.lineage&&l.outcome==='dead').length,1);step(s);assert.equal(p.agenda.wealth,20);assert.equal(s.nextGeneration,1);
});
test('a bard without a payable venue selects other real work and an old street-song goal cannot mint wages',()=>{
 const {s,h,p}=fixture();p.agenda.wealth=0;assert.equal(planWork(s,ctx),true);assert.equal(h.goal.job,'dock');assert.equal(s.areas[h.goal.area].interior,undefined);
 h.area='a1';h.x=42;h.goal={kind:'work',job:'song',area:'a1',x:42,remaining:1};const gold=h.gold,herbs=h.inventory.herbs;workTick(s,ctx);assert.equal(h.goal,null);assert.equal(h.gold,gold);assert.equal(h.inventory.herbs,herbs);assert.equal(p.agenda.wealth,0);
});
