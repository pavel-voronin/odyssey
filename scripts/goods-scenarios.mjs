import {createWorld} from '../engine.js';import {MODULES,setModule} from '../rules.js';import {civicArea} from '../modules/society.js';import {peopleArea,initializePersonAgenda} from '../modules/people.js';import {createPerson} from '../modules/lineage.js';
// Prepared two-town/controller specimen, not a natural cohort or a new world generator.
export function goodsTownFixture(){
 const s=createWorld(1),h=s.hero;for(const m of MODULES)setModule(s,m.id,false);for(const id of ['goods-cycle','people','npc-control','npc-needs','supply','property','npc-knowledge'])setModule(s,id,true);
 for(const p of Object.values(s.people)){if(p.id!==h.lineage){p.status='absent';if(p.agenda)p.agenda.task=null;}if(p.agenda)p.agenda.due=100000;}
 for(const a of Object.values(s.areas)){for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}if(a.forage){a.forage.stock=0;a.forage.max=0;}}
 const towns=[s.areas.a1,s.areas.a2];s.areas.a2.type='village';s.areas.a2.name='Второй Брод';civicArea(s,s.areas.a2);peopleArea(s,s.areas.a2);
 const workers=[];
 for(const a of towns){a.population ||= [];a.civic.food=35;a.civic.tools=3;a.civic.treasury=60;
  for(const job of ['farmer','artisan']){const id=createPerson(s,{name:`${job} ${a.id}`,race:'human',role:job==='farmer'?'земледелец':'ремесленник',area:a.id,x:42,alive:true,status:'resident'}),p=s.people[id];initializePersonAgenda(s,p);p.agenda.job=job;p.agenda.duty=job==='farmer'?.9:0;p.agenda.curiosity=0;p.agenda.sociability=0;p.agenda.due=0;p.agenda.task=null;p.needs.hunger=10;p.needs.energy=100;p.needs.loneliness=0;a.population.push(id);a.objects.push({id:'resident-'+id,kind:'resident',person:id,name:p.name,x:42});workers.push(p);
   if(job==='artisan')a.objects.push({id:a.id+'-goods-bench',kind:'workshop',name:'Рабочая мастерская',owner:id,state:'intact',x:42,history:[],rent:2});
  }
 }
 h.area='a0';h.x=15;h.goal={kind:'routeWait',area:'a0',x:15,until:100000};h.combat=null;h.quests=[];h.inventory.rations=0;h.companions=[];return {s,h,towns,workers};
}
