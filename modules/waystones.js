import {WAYSTONE,waystonesOn,heldWaystones} from './waystone-state.js';
import {receiveItem} from './inventory.js';
import {rootWorld} from '../world-ref.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
import {marketWallet} from './market.js';
import {itemLocation} from './item-originals.js';
import {itemBearer} from './enchantments.js';
import {containersOn,fitsPack} from './container-state.js';
import {enabled} from '../rules.js';
const actor=(s,id)=>s.actorStates?.[id]||(s.hero?.lineage===id?s.hero:null);
const ownItems=(s,p)=>actor(s,p.id)?.bag||p.looseItems||[];
const known=(h,p)=>h.memory.people.includes(p.id)||Boolean(h.relations[p.id]);
export function findWaystone(input,object,ctx){
 const s=rootWorld(input),h=input.hero,a=s.areas[h.area];
 if(!waystonesOn(input)||!h.alive||h.life.ended||s.waystoneOrigin||object?.kind!=='relic'||!object.taken||!a.objects.includes(object)||physicalDistance(a,h.x,object.x)>9)return null;
 const id=`waystone/${a.id}/${object.id}`;s.waystoneOrigin={version:1,item:id,area:a.id,object:object.id,found:s.tick,finder:h.lineage};
 const item={id,kind:'waystone',base:'compass',name:'Путевой камень',slot:'charm',stat:'magic',power:0,rarity:2,modifier:'plain',value:10,found:s.tick,foundArea:a.id,creator:null,history:[],physical:{version:1,holder:{kind:'person',id:h.lineage},movedAt:s.tick},waystone:{version:1,capacity:WAYSTONE.capacity,charge:WAYSTONE.initial,foundCharge:WAYSTONE.initial,filled:0,spent:0,origin:{...s.waystoneOrigin},lastFill:null,lastUse:null,moves:[],choices:{}}};
 receiveItem(input,ctx,null,item);ctx.log(input,'В углублении реликта лежал путевой камень. Его слабый свет хранит немного маны; заклинания он не сообщает.','loot');return item;
}
export function fillWaystone(s,h,item){
 const w=item?.waystone,a=s.areas[h.area];if(!waystonesOn(s)||!enabled(s,'magic')||!h.alive||h.life.ended||!selfDrivenActor(s,h)||!heldWaystones(h).includes(item)||!h.magic.spells.length||h.combat||h.transit||h.hp<h.maxHp*.8||h.energy<40||h.hunger>=60||h.conditions.some(c=>['poison','fever'].includes(c.id))||h.magic.mana<WAYSTONE.fillMana||w.charge>=w.capacity||w.lastFill?.tick===s.tick||w.lastUse?.tick===s.tick||a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(a,h.x,o.x)<=30))return false;
 const mana=h.magic.mana,before=w.charge;h.magic.mana-=WAYSTONE.fillMana;h.energy-=2;w.charge++;w.filled++;w.lastFill={tick:s.tick,actor:h.lineage,before,after:w.charge,manaBefore:mana,manaAfter:h.magic.mana};item.history.push({tick:s.tick,text:'Одна мера заряда принята из двух мер личной маны.'});h.lastAction='think';return true;
}
const ready=p=>p?.alive&&!p.needs.sleeping&&p.needs.hunger<60&&p.needs.energy>=30;
function contact(s,h,p){const b=ready(p)&&localContact(s,p.id,h.area);return b&&physicalDistance(s.areas[h.area],h.x,b.x)<=12?b:null;}
export function interestedStoneBuyer(s,p){const h=actor(s,p?.id);return Boolean(p?.alive&&(selfDrivenActor(s,h)&&h.magic.spells.length||p.agenda?.job==='scholar'&&p.agenda.curiosity>=.6));}
export const stonePrice=item=>WAYSTONE.price+item.waystone.charge;
export function transferWaystone(s,h,item,p,mode){
 if(!waystonesOn(s)||!selfDrivenActor(s,h)||!heldWaystones(h).includes(item)||h.combat||h.transit||p?.id===h.lineage||!['sale','gift'].includes(mode)||!contact(s,h,p))return false;
 const bag=ownItems(s,p),price=mode==='sale'?stonePrice(item):0;
 if(containersOn(s)?!fitsPack(s,p.id,{items:[...bag,item]}):bag.length>=24)return false;
 if(mode==='gift'&&!known(h,p)||mode==='sale'&&(!interestedStoneBuyer(s,p)||npcController(s,p)!=='personal'||p.agenda.task||marketWallet(s,p.id)<price||!canStartNPCActivity(s,p)))return false;
 if(mode==='sale'&&!npcAction(s,p,'personal'))return false;
 if(price){setActorMoney(s,p,marketWallet(s,p.id)-price);setActorMoney(s,s.people[h.lineage],h.gold+price);p.needs.energy=Math.max(0,p.needs.energy-1);}
 h.bag=h.bag.filter(i=>i!==item);for(const slot of Object.keys(h.equipment))if(h.equipment[slot]===item)h.equipment[slot]=null;
 if(!actor(s,p.id))p.looseItems ||= [];const target=ownItems(s,p);target.push(item);itemLocation(s,item,{kind:'person',id:p.id});itemBearer(s,item,p.id);
 item.waystone.moves.push({tick:s.tick,from:h.lineage,to:p.id,mode,price,charge:item.waystone.charge});if(item.waystone.moves.length>16)item.waystone.moves.shift();item.history.push({tick:s.tick,text:`${mode==='sale'?'Продан':'Подарен'}: ${p.name}; остаток заряда сохранён.`});h.energy=Math.max(0,h.energy-1);return true;
}
export function waystoneDecision(s,h,item){
 if(!waystonesOn(s)||!heldWaystones(h).includes(item))return null;
 const committed=h.quests.some(q=>q.status==='active')||h.commitments.personal?.status==='active',caster=enabled(s,'magic')&&h.magic.spells.length>0;
 if(caster&&(h.personality.curiosity>=.5||committed))return {kind:'keep',reason:committed?'Запас пригодится на пути к принятому делу.':'Он знает чары и оставляет сохранённую ману для дороги.'};
 const locals=Object.values(s.people).filter(p=>p.id!==h.lineage&&contact(s,h,p));
 const gift=locals.find(p=>known(h,p)&&interestedStoneBuyer(s,p));if(h.personality.generosity>=.75&&gift)return {kind:'gift',person:gift.id,reason:'Он отдаёт находку знакомому, которому она интересна.'};
 const buyer=locals.find(p=>interestedStoneBuyer(s,p)&&npcController(s,p)==='personal'&&!p.agenda.task&&marketWallet(s,p.id)>=stonePrice(item));if(buyer)return {kind:'sale',person:buyer.id,reason:'Есть заинтересованный человек с настоящими деньгами.'};
 return {kind:'wait',reason:'Сейчас нет подходящего получателя или покупателя. Камень остаётся при нём.'};
}
