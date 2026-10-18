import assert from 'node:assert/strict';
import {createWorld,createArea,connectAreas,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {workshopAt} from '../modules/property.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeNPCContacts} from '../modules/npc-contacts.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {migrationsTick} from '../modules/migrations.js';
export const migrationContext={route,knownRoute,log(){},random:()=>0,gainXp(){}};
export function migrationKnowledgeFixture({known=true,at=0}={}){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,['migrations','migration-knowledge','npc-knowledge','npc-contacts','people','npc-control','identity','property','property-damage','facades','equipment','witness-news','npc-logistics'].includes(m.id));
 s.tick=at;
 const target=s.areas.a6,other=s.areas.a5,o=workshopAt(s,target),host=s.people[o.owner],from=s.areas[createArea(s,'village','Тихая слобода',0)];connectAreas(s,from.id,target.id,{mode:'road',duration:2});connectAreas(s,from.id,other.id,{mode:'road',duration:2});
 for(const p of Object.values(s.people)){p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 host.area=target.id;host.x=42;host.status='resident';
 const parent=s.people[createPerson(s,{name:'Рен',role:'житель',area:from.id,culture:from.culture,alive:true},{initialJob:'artisan'})],child=s.people[createPerson(s,{name:'Лин',role:'ребёнок',parents:[parent.id],area:from.id,culture:from.culture,alive:true})];from.population=[parent.id,child.id];
 const courier=Object.values(s.people).find(p=>p.alive&&p.agenda?.job==='merchant'&&![parent.id,child.id,host.id,s.hero.lineage].includes(p.id));assert.ok(courier);courier.area=target.id;courier.x=42;courier.status='resident';courier.health=courier.maxHealth||100;Object.assign(courier.needs,{hunger:0,energy:100,sleeping:false,loneliness:0});Object.assign(courier.agenda,{duty:.8,task:null});if(!target.population.includes(courier.id))target.population.push(courier.id);
 for(const p of [parent,child]){p.x=44;p.agenda.duty=.1;p.agenda.due=1e9;Object.assign(p.needs,{hunger:10,energy:100,sleeping:false,loneliness:0});}
 from.civic.food=10;target.civic.food=80;target.civic.safety=65;other.civic.food=50;other.civic.safety=65;
 // Prepared genuine prior observations of these addresses, without any future
 // fire/stock knowledge. Actual migration and message travel are checked below.
 if(known){for(const a of [target,other,from]){parent.area=a.id;parent.x=42;observeNPCPlace(s,parent);observeNPCContacts(s,parent);}parent.area=from.id;parent.x=44;}
 for(const a of [from,target]){courier.area=a.id;courier.x=42;observeFreightActor(s,courier);}courier.area=target.id;courier.x=42;
 s.hero.area='a0';s.hero.x=50;s.hero.goal=null;s.hero.combat=null;s.hero.transit=null;
 for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 migrationsTick(s,migrationContext);return {s,from,target,other,o,host,parent,child,courier,h:s.hero};
}
export function beginKnownMigration(f){f.s.tick=Math.max(96,Math.ceil(f.s.tick/16)*16);migrationsTick(f.s,migrationContext);return Object.values(f.s.migrations).find(g=>g.source===f.from.id)||null;}
