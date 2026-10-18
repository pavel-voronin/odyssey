import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createWorld,serialize,restore,route,knownRoute} from '../engine.js';
import {advanceLife,lifeFinished} from '../playback.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty} from '../modules/property.js';
import {propertyContractPlan,propertyContractAction} from '../modules/property-contracts.js';
const seeds=[0,1,2,3,44,56,68,78,91];
const report={seeds,limit:16000,actualSteps:0,maxBytes:0,samples:0,different:0,agreements:0,lives:[]};
const signature=s=>`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.hp}/${s.hero.gold}/${s.hero.life.outcome}`;
for(const seed of seeds){
 let a=createWorld(seed),b=createWorld(seed),off=createWorld(seed);setModule(off,'property-contracts',false);
 for(let i=0;i<report.limit;i++){
  for(const s of [a,b,off])if(!lifeFinished(s)){advanceLife(s);report.actualSteps++;}
  if(i%997===0){assert.equal(serialize(a),serialize(b));a=restore(serialize(a));assert.equal(serialize(a),serialize(b));}
  if(i%80===0){report.samples++;report.different+=signature(a)!==signature(off);}
  if(lifeFinished(a)&&lifeFinished(off))break;
 }
 assert.equal(serialize(a),serialize(b));report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(serialize(a)));
 const agreements=Object.values(a.propertyContracts);for(const c of agreements){const o=a.areas[c.area].objects.find(o=>o.id===c.property);assert.ok(o);assert.ok(c.credit<=36);assert.ok(c.paidClaim<=(c.claimAmount||0));if(c.status==='done')assert.equal(o.history.filter(e=>e.contract===c.id&&e.kind==='purchase').length,1);}
 report.agreements+=agreements.length;report.lives.push({seed,ticks:a.tick,outcome:a.hero.life.outcome,agreements:agreements.length});console.log(seed,a.tick,agreements.length);
}
report.divergence=report.different/report.samples;
// Controlled existing fire, seller and solvent craft buyer: this is not a natural-frequency sample.
const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,false);for(const id of ['property','property-damage','property-contracts','identity','finances'])setModule(s,id,true);
const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');Object.assign(h,{area:a.id,x:42,profession:'clockmaker',gold:200,energy:100,hp:h.maxHp,goal:null});h.career.path='peaceful';h.career.rank=3;h.personality.curiosity=.5;h.money.style='carefree';
const o=workshopAt(s,a),p=s.people[o.owner];p.x=42;p.agenda.wealth=17;o.state='burned';o.damagedAt=0;o.offer={owner:p.id,price:120,since:0};a.civic.tools=3;a.civic.treasury=60;observeProperty(s,a);
const ctx={route,knownRoute,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
assert.equal(propertyContractPlan(s,ctx),true);assert.equal(propertyContractAction(s,ctx),true);
await writeFile('artifacts/property-contract-start.json',serialize(s));
const paused=restore(serialize(s));setModule(paused,'property-contracts',false);await writeFile('artifacts/property-contract-paused.json',serialize(paused));
for(let i=0;i<60&&o.owner!==h.lineage;i++)advanceLife(s);assert.equal(o.owner,h.lineage);assert.equal(h.gold,98);assert.equal(p.agenda.wealth,101);assert.equal(a.civic.treasury,78);assert.equal(a.civic.tools,2);
report.controlled={ticks:s.tick,heroGold:h.gold,sellerWealth:p.agenda.wealth,treasury:a.civic.treasury,tools:a.civic.tools};await writeFile('artifacts/property-contract-finished.json',serialize(s));
await writeFile('artifacts/property-contract-audit.json',JSON.stringify(report,null,2));console.log(report);
