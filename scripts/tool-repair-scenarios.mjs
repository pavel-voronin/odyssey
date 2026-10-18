import {setModule} from '../rules.js';
import {workTick} from '../modules/work.js';
import {observeProperty} from '../modules/property.js';
import {observeMaterials} from '../modules/work-materials.js';
import {recordToolUse,observeWorkTools} from '../modules/workshop-tools.js';
import {syncActiveActor} from '../actor-projection.js';
import {craftFixture,craftContext} from './craft-respect-scenarios.mjs';
export function toolFixture({curiosity=.8,teacher=true,knownSource=true,local=2}={}){
 const f=craftFixture(),{s,h,a,o,p}=f;setModule(s,'workshop-tools',true);setModule(s,'finances',false);setModule(s,'npc-control',true);
 o.owner=h.lineage;o.offer=null;h.gold=40;h.personality.curiosity=curiosity;h.energy=100;h.hp=h.maxHp;h.hunger=0;h.goal=null;
 for(const person of Object.values(s.people))if(person.agenda)person.agenda.due=1e8;
 for(const id of a.population){const person=s.people[id];if(person&&id!==p.id&&id!==h.lineage&&person.agenda?.job==='artisan')person.agenda.job='farmer';}
 p.agenda.job=teacher?'artisan':'farmer';p.agenda.task=null;observeProperty(s,a);
 recordToolUse(s,a,o,h.lineage,craftContext);o.workTool.uses=23;
 h.goal={kind:'work',area:a.id,x:o.x,job:'repair',remaining:1};s.tick++;workTick(s,craftContext);
 if(o.workTool.state!=='broken')throw Error('Prepared prior wear and a real paid job did not create a fault');
 const source=s.areas.a1;if(source.id===a.id)throw Error('Supplier must be another actual place');
 const provider=source.population.map(id=>s.people[id]).find(p=>p?.alive&&p.id!==h.lineage&&p.area===source.id&&p.agenda);if(!provider)throw Error('Prepared source lacks an actual resident');provider.agenda.job='merchant';provider.status='resident';provider.x=42;provider.needs.sleeping=false;provider.needs.energy=100;provider.needs.hunger=0;
 source.civic.tools=2;source.civic.treasury=30;a.civic.tools=local;
 if(knownSource){h.area=source.id;h.x=42;observeMaterials(s);h.area=a.id;h.x=o.x;}else h.workMaterials={known:{},cargo:[],revision:0};
 h.goal=null;h.workAfter=0;observeMaterials(s);observeWorkTools(s);syncActiveActor(s);return {...f,source,provider};
}
