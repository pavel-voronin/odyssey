import {commonFixture} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';import {syncActiveActor} from '../actor-projection.js';
import {materialFixture,acceptMaterialFixture,materialContext} from './materials-scenarios.mjs';
import {servicePlan} from '../modules/resident-orders.js';import {step} from '../engine.js';
// A prepared wound and old trained profession; no claim that every life meets this case.
export function aidFixture({trained=true,generosity=.8,clinic=0}={}){
 const f=commonFixture(),{s,h,a}=f;for(const id of ['personal-aid','people','npc-needs','npc-control','identity','relationships','npc-contacts','npc-knowledge'])setModule(s,id,true);
 h.inventory.herbs=1;h.inventory.potions=0;h.personality.generosity=generosity;h.career.records={clockmaker:{rank:3,xp:0},...(trained?{alchemist:{rank:4,xp:10}}:{})};h.career.history=trained?[{tick:s.tick,from:'alchemist',to:'clockmaker',reason:'Prepared prior training'}]:[];
 const p=Object.values(s.people).find(p=>p.id!==h.lineage&&p.alive&&p.area===a.id);Object.assign(p,{health:25,x:50,status:'resident',ailment:null});Object.assign(p.needs,{hunger:10,energy:90,loneliness:0,sleeping:false});Object.assign(p.agenda,{due:0,task:null,job:'farmer',tools:1,wealth:10});a.civic.medicine=clinic;
 for(const q of Object.values(s.people))if(q!==p&&q.id!==h.lineage)q.status='absent';syncActiveActor(s);return {...f,p};
}

export function aidCargoFixture({generosity=.8}={}){
 const f=materialFixture(),{s,h,source}=f;acceptMaterialFixture(f);servicePlan(s,materialContext);for(let i=0;i<160&&!f.c.toolPurchase;i++)step(s);if(!f.c.toolPurchase)throw Error('Prepared carrier never bought its actual tool');
 for(const id of ['personal-aid','people','npc-needs','npc-control','identity','relationships','npc-contacts','npc-knowledge'])setModule(s,id,true);
 h.personality.generosity=generosity;h.inventory.herbs=1;h.inventory.potions=0;h.career.records={clockmaker:{rank:3,xp:0},alchemist:{rank:4,xp:10}};
 const heardAtNextTurn=Math.max(4,Math.min(96,h.x+6*Math.max(0,8-s.tick%8-1)-8));
 const patient=Object.values(s.people).find(p=>p.alive&&p.id!==h.lineage&&p.id!==f.p.id&&p.area===source.id);Object.assign(patient,{health:25,x:heardAtNextTurn,status:'resident',ailment:null});Object.assign(patient.needs,{hunger:10,energy:90,loneliness:0,sleeping:false});Object.assign(patient.agenda,{job:'farmer',due:0,task:null,tools:1});source.civic.medicine=0;
 for(const q of Object.values(s.people))if(q!==patient&&q!==f.p&&q.id!==h.lineage)q.status='absent';return {...f,patient};
}
