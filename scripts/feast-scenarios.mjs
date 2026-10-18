import {createWorld,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {observeNPCContacts} from '../modules/npc-contacts.js';
import {setActorMoney} from '../actor-projection.js';
import {organizeFeast,feastPreparation,decideFeast} from '../modules/feasts.js';
import {feastDate,FEAST} from '../modules/feast-state.js';
export const feastContext={route,knownRoute,log(){},random:()=>0,gainXp(){}};
export function feastFixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,['people','identity','npc-control','npc-knowledge','npc-contacts','local-feasts','relationships','equipment','goods-cycle','local-market'].includes(m.id));
 s.tick=feastDate(0)-FEAST.prepare;const a=s.areas.a6;
 for(const p of Object.values(s.people)){p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 const make=(name,job,social,parents=[])=>{const p=s.people[createPerson(s,{name,role:'житель',parents,area:a.id,culture:a.culture,alive:true},{initialJob:job})];p.status='resident';p.x=42;Object.assign(p.needs,{hunger:10,energy:100,sleeping:false});Object.assign(p.agenda,{job,sociability:social,task:null,due:1e9});setActorMoney(s,p,20);p.roadSupplies={food:10,medicine:0};return p;};
 const host=make('Нела','farmer',.9,[s.hero.lineage]),helper=make('Мир','artisan',.9,[host.id]),speaker=make('Ила','scholar',.8,[host.id]),merchant=make('Тор','merchant',.8,[host.id]),privatePerson=make('Рин','guard',.1,[host.id]);
 s.hero.area=a.id;s.hero.x=42;s.hero.quests=[];s.hero.stories.active=null;s.hero.hunger=10;s.hero.energy=100;
 a.civic.food=50;a.civic.safety=65;
 observeNPCContacts(s,host);if(!organizeFeast(s,host,feastContext))throw Error('No local calendar');s.tick++;if(!organizeFeast(s,host,feastContext))throw Error('No edition');
 return {s,a,host,helper,speaker,merchant,privatePerson,e:s.localFeast.edition};
}
export function prepareFeast(f,count=6){for(let i=0;i<count;i++){f.s.tick++;feastPreparation(f.s,f.host,feastContext);}for(const p of [f.helper,f.speaker,f.merchant,f.privatePerson])decideFeast(f.s,p);return f.e;}
