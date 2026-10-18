import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,createEnemy,step,serialize,restore} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {creatureTrace,observeBestiaryTraces,encounterBestiary,bestiaryCaution,studyBestiaryPlan,studyBestiaryAction,shareBestiary,bestiaryHTML} from '../modules/bestiary.js';
import {creatureTraceVisible,drawCreatureTrace} from '../creature-trace-view.js';
import {escapeText} from '../text.js';
import {recordAreaVisit,observeLocalRoutes} from '../actor-atlas.js';
const ctx={log:()=>{},goal:(s,kind,area,x,intent,reason,extra)=>s.hero.goal={kind,area,x,intent,reason,...extra}};
function fixture(){
 const s=createWorld(4);for(const m of MODULES)setModule(s,m.id,['bestiary','tactics'].includes(m.id));
 const h=s.hero,p=s.people[h.lineage],a=s.areas.a2,e=a.objects.find(o=>o.kind==='enemy');h.area=a.id;h.x=40;h.hp=h.maxHp=100;h.energy=100;h.hunger=0;h.combat=null;h.goal=null;h.personality.courage=.2;
 recordAreaVisit(s,a.id);observeLocalRoutes(s);
 for(const o of a.objects)if(o.kind==='enemy'&&o!==e){o.alive=false;o.resolved=true;}
 e.x=42;e.hidden=false;e.species='wolf';e.hp=e.maxHp=100;e.attack=1;e.tactic='charged';e.battle.intent='strike';e.patrol=0;
 const mate=createEnemy(s,a,{requestedSpecies:'wolf',x:45});mate.tactic='charged';mate.battle.intent='strike';mate.attack=1;mate.patrol=0;
 function teach(){s.tick=24;const old=e.x;e.x+=1;const trace=creatureTrace(s,a,e,old);assert.ok(trace);observeBestiaryTraces(s,p,ctx);s.tick++;encounterBestiary(s,p,e);s.tick++;encounterBestiary(s,p,mate);return trace;}
 function opponent(){e.alive=mate.alive=false;e.resolved=mate.resolved=true;const next=createEnemy(s,a,{requestedSpecies:'wolf',x:46});next.hp=next.maxHp=20;next.attack=1;next.tactic='simple';next.mutation='none';next.patrol=0;return next;}
 return {s,h,p,a,e,mate,teach,opponent};
}
test('real patrol traces plus two different observed creatures produce a dated uncertain tendency, not instance traits',()=>{
 const {s,h,p,e,mate,teach,opponent}=fixture();teach();const next=opponent();h.energy=50;const advice=bestiaryCaution(s,next);assert.equal(advice.pack,true);assert.equal(advice.charge,true);assert.equal(advice.avoid,true);assert.equal(advice.uncertain,true);assert.equal(p.bestiary.species[0].encounters.length,2);assert.notEqual(e.id,mate.id);assert.equal(p.bestiary.species[0].encounters[0].mutation,undefined);assert.equal(p.bestiary.species[0].encounters[0].rates,undefined);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('one instance observed twice cannot reveal a whole species, and hidden or distant bodies create no new observations',()=>{
 const {s,h,p,a,e}=fixture();s.tick=24;const old=e.x;e.x++;creatureTrace(s,a,e,old);observeBestiaryTraces(s,p,ctx);s.tick++;encounterBestiary(s,p,e);s.tick++;encounterBestiary(s,p,e);assert.equal(p.bestiary.species[0].encounters.length,1);assert.equal(bestiaryCaution(s,e),null);delete p.bestiary;e.hidden=true;assert.equal(encounterBestiary(s,p,e),null);s.tick=48;assert.equal(creatureTrace(s,a,e,e.x-1),null);e.hidden=false;h.x=0;assert.equal(encounterBestiary(s,p,e),null);assert.equal(p.bestiary,undefined);
});
test('knowledge changes the ordinary one-tick approach decision; the same unknown weak threat enters combat',()=>{
 const {s,h,p,teach,opponent}=fixture();teach();const next=opponent();h.profession='soldier';h.energy=50;h.goal={kind:'routeWait',area:h.area,x:65,until:s.tick+100};const unknown=restore(serialize(s));delete unknown.people[p.id].bestiary;
 step(s);step(unknown);assert.equal(h.combat,null);assert.equal(h.goal.kind,'rest');assert.equal(unknown.hero.combat,next.id);assert.match(h.reason,/прежним встречам/);
});
test('two visible compositions use only prior species evidence; unknown mutations and exact elemental rates are never copied or changed',()=>{
 const {s,h,p,teach,opponent}=fixture();teach();const e=opponent();h.energy=50;h.memory.threats[e.id]={rates:{fire:.4}};const rates=JSON.stringify(h.memory.threats),first=bestiaryCaution(s,e);e.mutation='mirror';e.tactic='summoner';const raw=serialize(s);assert.deepEqual(bestiaryCaution(s,e),first);assert.equal(serialize(s),raw);assert.equal(JSON.stringify(h.memory.threats),rates);e.species='bandit';assert.equal(bestiaryCaution(s,e),null);e.species='wolf';e.hidden=true;assert.equal(bestiaryCaution(s,e),null);assert.equal(p.bestiary.species.length,1);
});
test('a ranger spends one ordinary observation action from a distance while a merchant can pass by',()=>{
 const {s,h,p,teach,opponent}=fixture();teach();const e=opponent();h.x=20;h.profession='merchant';assert.equal(studyBestiaryPlan(s,ctx),false);h.profession='ranger';assert.equal(studyBestiaryPlan(s,ctx),true);assert.equal(h.goal.enemy,e.id);const energy=h.energy;assert.equal(studyBestiaryAction(s,ctx),true);assert.equal(h.energy,energy-2);assert.equal(h.combat,null);assert.equal(h.lastAction,'study');assert.ok(p.bestiary.species[0].encounters.some(r=>r.enemy===e.id));assert.equal(studyBestiaryPlan(s,ctx),false);
});
test('local talk shares only actual dated observations and original witness, never a remote fresh update',()=>{
 const {s,h,p,teach}=fixture();teach();const q=Object.values(s.people).find(q=>q.id!==p.id&&q.alive&&q.status==='resident');q.area=h.area;q.x=h.x+1;q.needs.sleeping=false;s.tick+=20;assert.equal(shareBestiary(s,p.id,q.id),true);assert.equal(q.bestiary.species[0].encounters[0].witness,p.id);assert.equal(q.bestiary.species[0].encounters[0].lastSeen,25);assert.equal(q.bestiary.species[0].encounters[0].received,s.tick);const raw=serialize(s);assert.equal(shareBestiary(s,p.id,q.id),false);assert.equal(serialize(s),raw);q.area='a1';assert.equal(shareBestiary(s,p.id,q.id),false);assert.equal(serialize(restore(serialize(s))),serialize(s));
});
test('age keeps a fallible old hypothesis, readiness removes its extra refusal, and OFF preserves knowledge exactly',()=>{
 const {s,h,teach,opponent}=fixture();teach();const e=opponent();s.tick+=500;h.energy=50;assert.match(bestiaryCaution(s,e).reason,/давним/);h.energy=100;assert.equal(bestiaryCaution(s,e).avoid,false);setModule(s,'bestiary',false);const raw=serialize(s);assert.equal(bestiaryCaution(s,e),null);assert.equal(studyBestiaryPlan(s,ctx),false);assert.equal(serialize(s),raw);
});
test('trace drawing and sheet queries are local, dated and read-only; a short engine replay stays exact',()=>{
 const {s,h,a,p,teach}=fixture(),trace=teach();const raw=serialize(s);assert.equal(creatureTraceVisible(s,a,trace),true);const ops=[],c=new Proxy({}, {get:(_,key)=>(...args)=>ops.push([key,...args]),set:()=>true});drawCreatureTrace(c,50,100,true);assert.equal(ops.filter(o=>o[0]==='ellipse').length,6);assert.match(bestiaryHTML(s,escapeText),/БЕСТИАРИЙ/);assert.equal(serialize(s),raw);h.x=0;assert.equal(creatureTraceVisible(s,a,trace),false);h.x=40;h.goal={kind:'routeWait',area:a.id,x:40,until:1e5};h.combat=null;for(const o of a.objects)if(o.kind==='enemy')o.resolved=true;const copy=restore(serialize(s));for(let i=0;i<2;i++){step(s);step(copy);}assert.equal(serialize(s),serialize(copy));assert.equal(p.bestiary.species[0].encounters.length,2);
});
