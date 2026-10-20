import {createWorld,serialize,restore,knownRoute} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {observeLocalRoutes,recordAreaVisit} from '../actor-atlas.js';
import {workshopAt} from '../modules/property.js';
import {structureFor,damageStructure} from '../modules/building-condition.js';
import {observeMaterialObjects,hearMaterialWitness,surveyMaterialObject,inspectMaterialTrace,materialResearchTask} from '../modules/material-research.js';
const keep=['lineage','people','npc-control','npc-needs','npc-knowledge','npc-contacts','equipment','texts','property','facades','building-ruins','districts','background-towns','identity'];
export const materialRules=()=>Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]));
export function materialFixture(){const s=createWorld(4,{rules:materialRules()}),h=s.hero,p=s.people[h.lineage],a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),q=s.people[o.owner];Object.assign(h,{area:a.id,x:o.x,profession:'scholar',hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null});h.stories.active=null;h.quests=[];h.personality.curiosity=.9;p.culture=q.culture;h.culture=q.culture;Object.assign(q,{area:a.id,x:o.x,status:'resident',health:q.maxHealth||100,ailment:null});Object.assign(q.needs,{sleeping:false,energy:100,hunger:0});q.agenda.task=null;q.agenda.due=1e9;syncActiveActor(s);recordAreaVisit(s,a);observeLocalRoutes(s);observeMaterialObjects(s,q);return {s,h,p,a,o,q,profile:structureFor(s,a,o),actions:0};}
export function materialAction(f,fn){if(++f.actions>12)throw Error('Material component budget');f.s.tick++;return fn();}
export function damageMaterial(f){return materialAction(f,()=>damageStructure(f.s,f.a,f.profile,'fire'));}
export function hearMaterial(f){return materialAction(f,()=>hearMaterialWitness(f.s,f.p,f.q,f.q.materialResearch.observations[0].id));}
export function surveyMaterial(f){return materialAction(f,()=>surveyMaterialObject(f.s,f.p,f.p.materialResearch.reports[0].id));}
export function traceMaterial(f){const n=f.p.materialResearch.surveys[0];f.h.x=n.traceX;syncActiveActor(f.s);return materialAction(f,()=>inspectMaterialTrace(f.s,f.p,n.id));}
export function completedMaterial(){const f=materialFixture();damageMaterial(f);hearMaterial(f);surveyMaterial(f);traceMaterial(f);return f;}
export function exactMaterial(s){syncActiveActor(s);const raw=serialize(s);if(serialize(restore(raw))!==raw)throw Error('Material research restore changed facts');return raw;}
export function materialTask(f){return materialResearchTask(f.s,f.p,{knownRoute});}
