import {createWorld,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {recordLocalWound} from '../modules/wound-events.js';
import {woundActivity} from '../modules/wound-state.js';
import {woundsTick} from '../modules/wound-world.js';
import {productionSources} from '../modules/goods.js';
export const fractureContext={log(){},cancelWeapon(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};s.hero.intent=intent;s.hero.reason=reason;},knownRoute(s,from,to){return from===to?[from]:[];}};
export function fractureFixture({part='leftLeg',race='human',damage=25,medicine=1,raw=3}={}){
 const flags=['local-wounds','wound-care','fractures','goods-cycle','body','identity','people','npc-control','districts','origins','birthplaces'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,p=s.people[h.lineage],a=Object.values(s.areas).find(a=>a.objects.some(e=>e.kind==='enemy')),enemy=a.objects.find(e=>e.kind==='enemy');
 Object.assign(h,{area:a.id,x:enemy.x,race,hp:100-damage,maxHp:100,energy:100,hunger:0,conditions:[],companions:[],quests:[],habits:[],combat:null,transit:null,goal:null});p.race=race;delete p.anatomy;enemy.species='guard';delete enemy.damageType;delete enemy.positionAttack;h.stories.active=null;h.destiny.completed=true;h.gold=20;h.personality.courage=.3;h.inventory.herbs=0;p.roadSupplies={food:0,medicine};syncActiveActor(s);
 const w=recordLocalWound(s,p,enemy,{before:100,after:100-damage,maximum:100,area:a.id,controller:'fracture-impact',scarPart:part});
 for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 h.area='a1';h.x=42;h.goal={kind:'work',area:'a1',x:42,job:'dock',remaining:4,started:s.tick};setActorMoney(s,p,20);syncActiveActor(s);
 for(const q of Object.values(s.people))if(q!==p&&q.area==='a1'&&['healer','alchemist'].includes(q.agenda?.job))q.x=85;
 const stock=productionSources(s,s.areas.a1).materials;stock.stock=raw;stock.initial=raw;stock.delivered=0;stock.used=0;
 return {s,h,p,w,enemy,a:s.areas.a1,stock};
}
export function fracturePhases(f,count,{rest=false,role=f.w.role}={}){for(let n=0;n<count;n++){woundActivity(f.s,f.p,role,rest);f.s.tick++;woundsTick(f.s,{bleed(){throw Error('Closed impact cannot debit HP again');}});}return f;}
export function fractureSave(f){syncActiveActor(f.s);return serialize(f.s);}
