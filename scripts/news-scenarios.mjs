import assert from 'node:assert/strict';
import {aidFixture} from './aid-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';
import {planAidRequest,finishAidRequest,respondAid,performAid} from '../modules/personal-aid.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {createFreight} from '../modules/freight.js';
import {route} from '../engine.js';
export const newsContext=commonContext;
export function newsFixture(){
 const f=aidFixture(),{s,h,a,p:patient}=f;setModule(s,'witness-news',true);setModule(s,'npc-logistics',true);setModule(s,'supply',true);
 const target=a.links.map(id=>s.areas[id]).find(a=>a.civic&&!a.interior),used=new Set([h.lineage,patient.id]);assert.ok(target);
 function pick(job){const p=Object.values(s.people).find(p=>p.alive&&!used.has(p.id)&&(!job||p.agenda?.job===job));assert.ok(p);used.add(p.id);return p;}
 const carrier=pick('merchant'),witness=pick('merchant'),listener=pick('farmer');
 for(const p of [carrier,witness,listener]){p.area=p===listener?target.id:a.id;p.x=p===listener?50:50;p.status='resident';p.health=p.maxHealth||100;p.ailment=null;Object.assign(p.needs,{sleeping:false,energy:100,hunger:0,loneliness:0});Object.assign(p.agenda,{task:null,due:1e9});}
 for(const p of [carrier,witness])if(!a.population.includes(p.id))a.population.push(p.id);if(!target.population.includes(listener.id))target.population.push(listener.id);
 carrier.agenda.duty=.8;carrier.agenda.job='merchant';
 // Prepared prior market visit and route, as in the existing freight fixture.
 // This records no knowledge of the new aid event; the new message must travel.
 target.civic.food=10;for(const id of route(s,a.id,target.id)){carrier.area=id;observeFreightActor(s,carrier);}carrier.area=a.id;observeFreightActor(s,carrier);
 for(const b of Object.values(s.areas))for(const o of b.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 h.x=50;patient.x=50;assert.equal(planAidRequest(s,patient),true);finishAidRequest(s,patient,patient.agenda.task,newsContext);assert.equal(respondAid(s,newsContext),false);assert.equal(patient.aidRequest.status,'agreed');
 return {...f,patient,carrier,witness,listener,target,event:'news/aid/'+patient.aidRequest.id};
}
export function finishNewsAid(f){f.s.tick++;assert.equal(performAid(f.s,newsContext),true);return f;}
export function launchNewsCarrier(f){f.s.tick++;const c=createFreight(f.s,f.a,f.target,newsContext,f.carrier.id);assert.ok(c);return c;}
