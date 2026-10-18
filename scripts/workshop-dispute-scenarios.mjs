import {createWorld,step,log,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt} from '../modules/property.js';
import {peopleTick} from '../modules/people.js';
import {workshopDisputesTick} from '../modules/workshop-dispute.js';
import {serviceRepairAllowed,fundServiceRepair,finishServiceRepair} from '../modules/resident-orders.js';
export const disputeContext={log,route,knownRoute,gainXp(s,x){s.hero.xp+=x;},goal(s,kind,area,x,intent,reason,extra={}){Object.assign(s.hero,{intent,reason,goal:{kind,area,x,started:s.tick,...extra}});},mayRepairProperty:serviceRepairAllowed,repairFunding:fundServiceRepair,workshopRepaired(s,a,o,proof){finishServiceRepair(s,a,o,proof,disputeContext);}};
// Prepared local shortage, not a claimed naturally occurring two-fire story.
// Both titles come from the real new-district generator and both adults exist.
export function disputeFixture({stock=1,wealth=24,duty=.5,damaged=true}={}){
 const s=createWorld(0),h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские');
 if(!a?.workshopLayout)throw Error('Actual new workshop district required');
 workshopAt(s,a);const buildings=a.objects.filter(o=>o.kind==='workshop');if(buildings.length!==2)throw Error('Two independently owned original workshops required');
 for(const m of MODULES)setModule(s,m.id,false);
 for(const id of ['identity','work','property','property-damage','people','npc-control','relationships','workshop-dispute','skill-branches','craft-respect'])setModule(s,id,true);
 Object.assign(h,{area:a.id,x:42,goal:null,combat:null,transit:null,hp:h.maxHp,energy:100,hunger:0,gold:50,profession:'diplomat',companions:[],quests:[],conditions:[],habits:[]});h.career.rank=3;h.personality.generosity=.8;h.commitments.personal=null;h.life.reflectAfter=1e9;h.memory.shopAfter=1e9;
 Object.assign(a.civic,{tools:stock,treasury:100,food:100,medicine:0});
 for(const p of Object.values(s.people))if(p.id!==h.lineage){p.status='absent';if(p.agenda){p.agenda.task=null;p.agenda.due=1e9;}}
 const owners=buildings.map(o=>s.people[o.owner]);
 for(const [i,p]of owners.entries()){
  Object.assign(p,{area:a.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(p.agenda,{home:a.id,job:'artisan',wealth,duty,tools:1,sociability:.7,curiosity:.1,due:0,task:null,bonds:{}});p.needs={hunger:0,energy:100,loneliness:0,meals:0,sleeps:0,conversations:0,sleeping:false};
  Object.assign(buildings[i],{state:damaged?'burned':'intact',damagedAt:damaged?s.tick:undefined,repair:null,offer:null});
 }
 h.profession='bard'; // A prepared mediator; no skill/knowledge/reward is granted.
 return {s,h,a,buildings,owners,p:owners[0],q:owners[1]};
}
export function disputeTurn(f){f.s.tick+=8-f.s.tick%8;workshopDisputesTick(f.s,disputeContext);peopleTick(f.s,disputeContext);return Object.values(f.s.workshopDisputes||{})[0];}
export function offerDispute(f){let r;for(let i=0;i<10;i++){r=disputeTurn(f);if(r?.status==='offered')return r;}throw Error('Actual personal-controller quotes missing: '+JSON.stringify(r));}
export function agreeDispute(f){const r=offerDispute(f);for(let i=0;i<5&&r.status==='offered';i++)disputeTurn(f);return r;}
export const disputeMoney=f=>f.h.gold+f.owners.reduce((n,p)=>n+p.agenda.wealth,0)+f.a.civic.treasury+Object.values(f.s.workOrders||{}).reduce((n,c)=>n+c.escrow,0);
export function runDispute(f,ticks){for(let i=0;i<ticks;i++)step(f.s);return f;}
