import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {personLocation} from '../person-location.js';
import {selfDrivenActor} from '../actor-projection.js';
import {marketWallet} from './market.js';
export const HOUSE_PLANS={small:{id:'small',name:'Малый дом',raw:4,work:3,capacity:1,chest:6,width:42},family:{id:'family',name:'Семейный дом',raw:6,work:4,capacity:2,chest:10,width:58}};
export const dwellingOn=s=>['home-building','homes','interiors','lodging','people','goods-cycle'].every(id=>enabled(s,id));
export function dwellingActor(s,p){const h=s.actorStates?.[p?.id]||(s.hero?.lineage===p?.id?s.hero:null);return selfDrivenActor(s,h)?h:null;}
export const dwellingEnergy=(s,p)=>dwellingActor(s,p)||p.needs;
export function dwellingReady(s,p){const h=dwellingActor(s,p);return p?.alive&&p.role!=='ребёнок'&&!p.needs.sleeping&&!p.ailment&&(h?h.hp>=h.maxHp*.75&&!h.combat&&!h.transit&&!h.carriedBy:p.health>=(p.maxHealth||100)*.75)&&dwellingEnergy(s,p).energy>=30&&(h?h.hunger:p.needs.hunger)<60;}
export function dwellingHere(s,p,a,x,range=2){const h=dwellingActor(s,p),b=h?{area:h.area,x:h.x,transit:h.transit}:personLocation(s,p.id);return Boolean(b&&!b.transit&&b.area===a.id&&physicalDistance(a,b.x,x)<=range);}
export const plotAllows=(plot,id)=>plot?.owner===id||plot?.permission?.person===id;
export function dwellingChoice(s,p,a){
 const h=dwellingActor(s,p),money=marketWallet(s,p.id),knownFamily=(p.navigation?.contacts||[]).some(c=>c.relative&&c.missingAt==null&&c.area===a.id&&s.people[c.person]?.parents.includes(p.id)),party=(h?.companions||[]).some(c=>c.person),need=knownFamily||party||p.housePreference==='family';
 const desired=need?'family':'small',rawCost=HOUSE_PLANS[desired].raw*3,owned=p.goodsRawCargo?.owner===p.id?p.goodsRawCargo.quantity:0;
 let plan=need&&money>=rawCost+8||need&&owned>=6?HOUSE_PLANS.family:HOUSE_PLANS.small;
 const costs=Math.max(0,plan.raw-owned)*3,hire=(h?h.personality.sociability>.65:p.agenda.duty<.55)&&money>=costs+plan.work*2+8;
 if(money<costs+(hire?plan.work*2:0)+8)return null;
 if(!need&&p.houseStay?.until>s.tick&&(h?h.personality.sociability>.75:p.agenda.sociability>.75))return null;
 return {plan,desired,mode:hire?'hire':'self',reserve:hire?plan.work*2:0};
}
export {residenceAdmission as dwellingAdmission} from './residence-access.js';
