import {registerSpatialEdge} from '../modules/spatial.js';
import {forgingFixture,placeAtBench,forgingContext} from './forging-scenarios.mjs';
import {setModule} from '../rules.js';
import {fordEnd,fordPassage} from '../modules/fords.js';
import {surveyCauseway,fundCauseway,workCauseway} from '../modules/causeway-actions.js';
import {syncActiveActor} from '../actor-projection.js';
import {departFreight,advanceFreight} from '../modules/freight.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeFreightActor} from '../modules/freight-memory.js';
export const causewayContext=forgingContext;
export function causewayFixture({local=false,heroOwner=false,fund=true}={}){
 const f=forgingFixture({npc:!heroOwner}),{s,h,worker:p}=f;for(const k of Object.keys(s.rules))setModule(s,k,false);for(const k of ['causeways','fords','property','goods-cycle','finances','equipment','containers','npc-control','world-eras','historical-calendar','travel'])setModule(s,k,true);if(heroOwner)setModule(s,'identity',true);
 // Two selected standing fords isolate the existing canonical village supply system;
 // no invented city, region, signature or retrospective catastrophe.
 for(const key of ['a5|a6',...(!local?['a5|a7']:[])]){const e=s.edges[key];delete e.metric;e.ford={version:1,id:'ford/'+key,period:24,low:4,offset:12,foot:3,cart:6,forecastBias:0};registerSpatialEdge(s,key);}
 const key='a5|a6',from='a6',to='a5',x=fordEnd(s,from,to);if(x===null)throw Error('No real shore');Object.assign(p,{status:'resident',health:p.maxHealth||100});Object.assign(heroOwner?h:p,{area:from,x});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});p.agenda.home=f.a.id;h.combat=null;h.goal=null;h.hunger=0;h.hp=h.maxHp;h.companions=[];
 for(const id of ['a0','a1','a5','a6','a7',f.a.id])for(const e of s.areas[id].objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 const water=fordPassage(s,heroOwner?h:p,to,95);if(water.status!=='closed')throw Error('Expected actual high-water encounter');s.tick++;if(!surveyCauseway(s,p,key,forgingContext))throw Error('No actual survey');placeAtBench(f);s.tick++;const q=fund?fundCauseway(s,p,key,f.a.id,forgingContext):null;if(fund&&!q)throw Error('No actual funded project');syncActiveActor(s);return {...f,p,q,key,from,to,ownerBody:heroOwner?h:p};
}
export function depositCauseway(f){Object.assign(f.ownerBody,{area:f.q.site.area,x:f.q.site.x});f.s.tick++;if(!workCauseway(f.s,f.p,f.key,'deposit',forgingContext))throw Error('No actual deposit');return f;}
export function finishCauseway(f){depositCauseway(f);for(let n=0;n<4;n++){f.s.tick++;if(!workCauseway(f.s,f.p,f.key,'work',forgingContext))throw Error('No actual work');}return f;}
export function deliverOverCauseway(f,{stop=null}={}){const {s,h,q}=f;for(const k of ['npc-logistics','npc-knowledge','npc-travel','supply'])setModule(s,k,true);const source=s.areas.a1,to=s.areas.a5,p=source.population.map(id=>s.people[id]).find(p=>p.alive&&p.id!==h.lineage&&p.id!==q.owner&&!s.actorStates[p.id]);if(!p)throw Error('No existing driver');Object.assign(p,{area:source.id,x:55,status:'resident',health:p.maxHealth||100});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});p.roadSupplies={food:2,medicine:0};p.agenda.task=null;const path=['a1','a0','a6','a5'];for(const area of path){p.area=area;observeNPCPlace(s,p);observeFreightActor(s,p);}p.area=source.id;s.tick++;
 const before=source.civic.food,c=departFreight(s,source,to,{driver:p,path,author:p.id,market:{name:to.name,area:to.id,seen:s.tick}},forgingContext);if(!c||source.civic.food!==before-12)throw Error('No actual finite shipment');
 // Prepared last approach to the actual bridge; two real crossing phases follow.
 p.area=f.from;p.x=fordEnd(s,f.from,f.to);c.index=2;c.startX=c.endX=p.x;c.remaining=c.segmentTicks=1;
 s.tick++;advanceFreight(s,c,forgingContext);if(!p.fordCrossing?.causeway)throw Error('No actual bridge admission');if(stop==='admitted')return {c,driver:p};s.tick++;advanceFreight(s,c,forgingContext);if(p.area!==to.id||!c.causewayUses?.length)throw Error('No physical bridge completion');if(stop==='crossed')return {c,driver:p};
 // Prepared final local approach, then actual finite destination settlement.
 p.x=55;c.startX=c.endX=55;c.remaining=c.segmentTicks=1;s.tick++;advanceFreight(s,c,forgingContext);if(!q.firstDelivery)throw Error('No accepted real delivery');return {c,driver:p};
}
