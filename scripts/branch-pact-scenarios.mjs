import assert from 'node:assert/strict';
import {aidFixture} from './aid-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {factionPathPlan,factionDuty} from '../modules/faction-paths.js';
import {planAidRequest,finishAidRequest,respondAid,performAid} from '../modules/personal-aid.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {createFreight} from '../modules/freight.js';
import {route} from '../engine.js';
export const pactContext=commonContext;
export function pactFixture({generosity=.9,duty=.9,curiosity=.7,resident=true}={}){
 const f=aidFixture({generosity}),{s,h,a,p:patient}=f;
 for(const id of ['branch-pacts','factions','diplomacy','faction-paths','witness-news','npc-logistics','supply'])setModule(s,id,true);
 a.faction='crown';h.profession='soldier';h.affiliation.after=0;h.reputation.crown=20;h.x=42;
 const leader=s.people[createPerson(s,{name:'Вельт',role:'страж',area:a.id,culture:a.culture,alive:true},{initialJob:'guard'})];leader.x=42;Object.assign(leader.agenda,{task:null,duty,curiosity,due:1e9});Object.assign(leader.needs,{energy:100,hunger:0,sleeping:false});a.population.push(leader.id);
 assert.equal(factionPathPlan(s,pactContext),true);assert.equal(h.affiliation.paths.crown.branch,'marshal');for(let n=0;n<4;n++){s.tick++;factionDuty(s,pactContext);}assert.ok(h.branchPact);leader.x=50;
 const foreign=a.links.map(id=>s.areas[id]).find(b=>b.civic&&!b.interior);assert.ok(foreign);foreign.faction='tide';h.area=foreign.id;h.x=50;patient.area=foreign.id;patient.x=50;patient.agenda.home=resident?foreign.id:a.id;patient.agenda.task=null;foreign.population ||= [];if(!foreign.population.includes(patient.id))foreign.population.push(patient.id);
 const carrier=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='merchant'&&![h.lineage,patient.id,leader.id].includes(p.id));assert.ok(carrier);carrier.area=foreign.id;carrier.x=50;carrier.status='resident';carrier.health=carrier.maxHealth||100;Object.assign(carrier.needs,{hunger:0,energy:100,sleeping:false});Object.assign(carrier.agenda,{duty:.8,task:null,due:1e9});if(!foreign.population.includes(carrier.id))foreign.population.push(carrier.id);
 a.civic.food=10;foreign.civic.food=70;for(const id of route(s,foreign.id,a.id)){carrier.area=id;observeFreightActor(s,carrier);}carrier.area=foreign.id;observeFreightActor(s,carrier);
 for(const b of Object.values(s.areas))for(const o of b.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 assert.equal(planAidRequest(s,patient),true);assert.equal(finishAidRequest(s,patient,patient.agenda.task,pactContext),true);
 return {...f,patient,leader,foreign,carrier,event:'news/aid/'+patient.aidRequest.id};
}
export function answerPactAid(f){respondAid(f.s,pactContext);return f.h.branchPact.cases[f.patient.aidRequest.id];}
export function helpAgainstPact(f){const c=answerPactAid(f);assert.equal(c.choice,'help');f.s.tick++;assert.equal(performAid(f.s,pactContext),true);return c;}
export function launchPactCarrier(f){f.s.tick++;const convoy=createFreight(f.s,f.foreign,f.a,pactContext,f.carrier.id);assert.ok(convoy);return convoy;}
