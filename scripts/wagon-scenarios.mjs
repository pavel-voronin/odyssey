import {initializeGoodsArea} from '../modules/goods.js';
import {createWorld,connectAreas,knownRoute,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {recordAreaVisit,revealRoad} from '../actor-atlas.js';
import {observeFreightActor} from '../modules/freight-memory.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {createFreight,advanceFreight} from '../modules/freight.js';
import {wagons} from '../modules/wagon-state.js';
import {syncWagons,passengerTurn} from '../modules/wagon-actions.js';
export const wagonContext={log(){},gainXp(){},knownRoute,enter(s,id){s.hero.area=id;recordAreaVisit(s,id);}};
export function wagonFixture({depart=false}={}){
 const flags=['riding','wagons','goods-cycle','containers','supply','people','npc-control','npc-logistics','npc-knowledge','identity','origins','birthplaces','districts','travel','geography-frame','item-originals'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,{w,a:from}=wagons(s)[0],m=Object.values(s.horses.byId)[0],p=s.people[w.owner],to=s.areas.a20;
 Object.assign(h,{area:to.id,x:42,gold:100,energy:100,hunger:0,hp:h.maxHp,transit:null,combat:null,conditions:[],companions:[],quests:[],habits:[],bag:[],goal:null});Object.assign(h.inventory,{rations:0,herbs:0,potions:0,relics:0});h.stories.active=null;h.destiny.completed=true;p.agenda.task=null;p.agenda.generosity=.8;p.agenda.duty=.8;Object.assign(p.needs,{energy:100,hunger:0,sleeping:false});
 for(const a of [from,to])for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}
 initializeGoodsArea(s,to);initializeGoodsArea(s,from);to.goods.ledger.food.initial+=10-to.civic.food;to.civic.food=10;from.goods.ledger.food.initial+=80-from.civic.food;from.civic.food=80;
 connectAreas(s,from.id,to.id,{metric:{version:1,unit:'world',distance:12,terrain:'road',speed:6}});const edge=s.edges[[from.id,to.id].sort().join('|')];delete edge.ford;delete edge.lift;edge.narrow=false;
 // An explicit recent visit checkpoint, no life-prefix simulation. Both current
 // local observations record real stocks/roads before the real dispatch.
 p.area=to.id;p.x=42;recordAreaVisit(s,to);observeNPCPlace(s,p);observeFreightActor(s,p);h.area=from.id;h.x=w.x;p.area=from.id;p.x=w.x;recordAreaVisit(s,from);revealRoad(s,from.id,to.id);observeNPCPlace(s,p);observeFreightActor(s,p);h.goal={kind:'travel',area:to.id,x:55,started:s.tick};m.body.x=w.x;syncActiveActor(s);
 const c=depart?createFreight(s,from,to,wagonContext,p.id):null;if(depart&&!c?.wagon)throw Error('Actual freight did not hitch original wagon');return {s,h,w,m,p,from,to,c};
}
export function wagonAct(f,kind,item=null){f.s.tick++;return import('../modules/wagon-actions.js').then(({wagonAction})=>wagonAction(f.s,f.w.id,kind,wagonContext,item));}
export function wagonPhase(f){f.s.tick++;advanceFreight(f.s,f.c,wagonContext);syncWagons(f.s);if(f.s.people[f.h.lineage].caravanPassenger)passengerTurn(f.s,wagonContext);return f;}
export function wagonSave(f){syncActiveActor(f.s);return serialize(f.s);}
