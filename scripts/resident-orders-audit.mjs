import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {createWorld,observeExistingPerson,step,serialize,restore,log} from '../engine.js';
import {settleLife} from '../modules/lifecycle.js';import {workshopAt,observeProperty} from '../modules/property.js';import {revealArea} from '../actor-atlas.js';
const report={seeds:[],limit:4000,steps:0,checks:0,maxBytes:0,runs:[]},started=performance.now();
// Target the first three actual town starts; a road start has not generated workshops yet.
for(let seed=0;seed<64&&report.seeds.length<3;seed++)if(Object.values(createWorld(seed).areas).some(a=>a.district==='Мастерские'))report.seeds.push(seed);
assert.equal(report.seeds.length,3);
function physical(s,person){const c=JSON.parse(serialize(s)),selected=c.hero.lineage;c.actorStates[selected]=c.hero;const h=c.actorStates[person];for(const key of ['actorJournal','speech','timeline','timelineDropped','biography'])delete h[key];c.actorStates={[person]:h};delete c.hero;for(const key of ['generation','observation','journal','nextNPCObservation','observerKnowledge'])delete c[key];for(const p of Object.values(c.people))delete p.actorLink;c.lives=c.lives.filter(l=>l.actorMode!=='npc');for(const l of c.lives)for(const key of ['timeline','timelineDropped','milestones'])delete l[key];for(const f of c.actorFacts?.events||[]){if(f.actor==='hero')f.actor=selected;if(f.target==='hero')f.target=selected;}
 // knownBy is a detailed-profile visibility cache. Compare the common actor's cache,
 // all actual witnesses and every real NPC knowledge record, including the client.
 const normalize=value=>{if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='knownBy'&&Array.isArray(item))value[key]=item.filter(id=>id===person);else normalize(item);}};normalize(c);return JSON.stringify(c);}
function differences(a,b,path='',out=[]){if(out.length>=6)return out;if(typeof a!==typeof b||a===null||b===null||typeof a!=='object'){if(a!==b)out.push({path,a,b});return out;}for(const key of new Set([...Object.keys(a),...Object.keys(b)]))differences(a[key],b[key],path+'.'+key,out);return out;}
for(const seed of report.seeds){
 let a=createWorld(seed);const h=a.hero,area=Object.values(a.areas).find(t=>t.district==='Мастерские');Object.assign(h,{area:area.id,x:42,profession:'clockmaker',gold:50,energy:100,hp:h.maxHp,goal:null});h.career.path='peaceful';h.career.rank=3;h.personality.generosity=.8;h.personality.curiosity=.1;h.habits=['homebody'];h.quests=[];h.companions=[];h.commitments.personal=null;a.storyCases=[];h.life.home=area.id;h.life.motive='Местное ремесло';settleLife(a,{log});revealArea(a,area.id);
 const o=workshopAt(a,area),p=a.people[o.owner];Object.assign(p,{area:area.id,x:42,status:'resident'});Object.assign(p.agenda,{job:'artisan',wealth:50,duty:.5,tools:1,due:0,task:null});p.needs.energy=100;p.needs.hunger=10;o.state='burned';o.damagedAt=0;o.offer=null;area.civic.tools=3;area.civic.food=60;observeProperty(a,area);
 const person=h.lineage,client=p.id;let repeat=restore(serialize(a)),other=restore(serialize(a));assert.ok(observeExistingPerson(other,client));
 for(let i=0;i<report.limit;i++){
  for(const s of [a,repeat,other]){step(s);report.steps++;for(const c of Object.values(s.workOrders))assert.ok(Number.isInteger(c.escrow)&&c.escrow>=0);}
  if(i%499===0){assert.equal(serialize(a),serialize(repeat));const left=physical(a,person),right=physical(other,person);assert.ok(left===right,'client observer changed physics seed '+seed+' tick '+a.tick+': '+JSON.stringify(differences(JSON.parse(left),JSON.parse(right))));const save=serialize(a);report.maxBytes=Math.max(report.maxBytes,Buffer.byteLength(save),Buffer.byteLength(serialize(other)));a=restore(save);assert.equal(serialize(a),save);report.checks++;}
 }
 assert.equal(serialize(a),serialize(repeat));assert.equal(physical(a,person),physical(other,person));const orders=Object.values(a.workOrders);assert.ok(orders.some(c=>c.status==='done'));report.runs.push({seed,tick:a.tick,helperAlive:a.actorStates[person].alive,clientAlive:a.people[client].alive,completed:orders.filter(c=>c.status==='done').length,cancelled:orders.filter(c=>c.status==='cancelled').length,escrow:orders.reduce((n,c)=>n+c.escrow,0),customerWork:a.actorStates[person].counters.customerWork,birthCounter:a.nextGeneration});console.log(JSON.stringify(report.runs.at(-1)));
}
report.elapsedMs=performance.now()-started;await writeFile('artifacts/resident-orders-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

