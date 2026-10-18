import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {commonFixture,commonContext as ctx} from './common-life-scenarios.mjs';
import {step,restore,serialize,createNextStory,observeDetailedActor} from '../engine.js';
import {actorView} from '../actor-view.js';import {setModule} from '../rules.js';import {YEAR_TICKS} from '../calendar.js';
import {rememberRetreat} from '../modules/commitments.js';import {revealArea} from '../actor-atlas.js';
const report={steps:0,checks:0,limit:2*YEAR_TICKS,maxBytes:0,actions:{},obligation:null},started=performance.now();
let {s:a,h,a:home}=commonFixture();const person=h.lineage;
for(const id of ['body','supply','commitments','finances'])setModule(a,id,true);
for(const area of Object.values(a.areas)){if(area.civic)area.civic.food=100000;for(const o of area.objects)if(o.kind==='enemy')o.alive=false;revealArea(a,area.id);}
createNextStory(a,{allowLiving:true});a.hero.goal={kind:'routeWait',area:a.hero.area,x:a.hero.x,until:1000000};const other=a.hero.lineage;assert.ok(observeDetailedActor(a,person));
let repeat=restore(serialize(a)),background=restore(serialize(a));assert.ok(observeDetailedActor(background,other));repeat.hero.life.phase='resident';repeat.hero.life.residence.nextOuting=Number.MAX_SAFE_INTEGER;a.hero.life.phase='wandering';a.hero.life.residence.nextOuting=0;
function physical(s){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;delete c.hero;for(const key of ['generation','observation','journal','observerKnowledge'])delete c[key];for(const body of Object.values(c.actorStates)){for(const key of ['actorJournal','speech','timeline','timelineDropped','biography'])delete body[key];delete body.life.phase;if(body.life.residence)delete body.life.residence.nextOuting;}for(const l of c.lives)for(const key of ['timeline','timelineDropped','milestones'])delete l[key];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}c.actorStates=Object.fromEntries(Object.entries(c.actorStates).sort(([x],[y])=>x.localeCompare(y)));return JSON.stringify(c);}
function diff(a,b,path='',out=[]){if(out.length>=5)return out;if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)out.push({path,a,b});return out;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[key],b[key],path+'.'+key,out);return out;}
await writeFile('artifacts/common-quiet-life.json',serialize(a));
for(let i=0;i<report.limit;i++){
 if(i===400){
  for(const s of [a,repeat,background]){const body=s.actorStates[person],view=actorView(s,body);body.weapon=1;body.memory.shopAfter=0;body.memory.merchant=s.merchant.area;rememberRetreat(view,s.areas.a2.objects.find(o=>o.kind==='enemy'));}
  await writeFile('artifacts/common-obligation-life.json',serialize(a));
 }
 for(const s of [a,repeat,background]){step(s);report.steps++;}
 const body=a.actorStates[person];report.actions[body.lastAction]=(report.actions[body.lastAction]||0)+1;
 if(i===399)assert.equal(body.counters.peacefulWork||0,0,'a wealthy supplied master should not grind wages');
 if(i===1600){assert.equal(body.commitments.personal.status,'done');assert.ok(body.weapon>=2);report.obligation={tick:a.tick,status:body.commitments.personal.status,weapon:body.weapon,place:body.area,gold:body.gold};}
 if(i%997===0){const left=physical(a);for(const s of [repeat,background]){const right=physical(s);assert.ok(left===right,'phase/observer changed physical world: '+JSON.stringify(diff(JSON.parse(left),JSON.parse(right))));}const save=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save));a=restore(save);assert.equal(serialize(a),save);report.checks++;}
}
assert.equal(physical(a),physical(repeat));assert.equal(physical(a),physical(background));const body=a.actorStates[person];assert.equal(body.alive,true);assert.equal(body.life.ended,false);assert.equal(body.life.home,home.id);assert.equal(a.nextGeneration,2);assert.ok(report.actions.walk>0);assert.ok(body.counters.peacefulWork>0);report.final={person,tick:a.tick,alive:body.alive,gold:body.gold,work:body.counters.peacefulWork,rank:body.career.rank,weapon:body.weapon,home:body.life.home,area:body.area};report.elapsedMs=performance.now()-started;await writeFile('artifacts/common-life-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
