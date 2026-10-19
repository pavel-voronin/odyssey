import {createWorld,serialize,route} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {workshopAt} from '../modules/property.js';
import {productionSources,initializeGoodsArea} from '../modules/goods.js';
import {observeMarket} from '../modules/market-knowledge.js';
import {productionFinancePlan,fundProduction} from '../modules/production-finance.js';
import {peopleTick} from '../modules/people.js';
import {workshopPosition} from '../modules/workshop-place.js';
export const financeContext={log(){},route,knownRoute:route,maySpend:(s,k,n)=>s.hero.gold>=n,goal:(s,kind,area,x,title,reason,extra)=>s.hero.goal={kind,area,x,title,reason,...extra}};
export function financeFixture(){
 const flags=['production-finance','geography-frame','identity','people','districts','property','goods-cycle','local-market','market-knowledge','npc-control'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),p=s.people[o.owner];
 if(!p||p.id===h.lineage)throw Error('Missing actual producer');for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 Object.assign(h,{area:a.id,x:58,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,conditions:[],companions:[],quests:[],habits:[],goal:null});h.stories.active=null;h.destiny.completed=true;h.money={style:'purposeful',priority:null};Object.assign(p,{x:58,ailment:null,health:p.maxHealth||100});Object.assign(p.agenda,{task:null,due:0});Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});syncActiveActor(s);setActorMoney(s,s.people[h.lineage],80);setActorMoney(s,p,6);
 initializeGoodsArea(s,a);a.goods.ledger.tools.initial-=a.civic.tools;a.civic.tools=0;productionSources(s,a);observeMarket(s,p.id,{force:true});
 return {s,h,a,o,p};
}
export function financeSave(f){syncActiveActor(f.s);return serialize(f.s);}
export function fundFixture(f=financeFixture()){if(!productionFinancePlan(f.s,financeContext))throw Error('No local proposal');f.c=fundProduction(f.s,financeContext);if(!f.c)throw Error('No actual funding');return f;}
export function manufactureFixture(f){
 const pos=workshopPosition(f.s,f.a,f.o);f.p.area=pos.area;f.p.x=pos.x;f.p.agenda.task=null;f.p.agenda.due=f.s.tick;
 for(let n=0;n<3;n++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,financeContext);}return f;
}
