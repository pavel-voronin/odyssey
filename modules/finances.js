import {containersOn,packView,stackRoom} from './container-state.js';
import {marketEnabled,quoteMarket} from './market.js';
import {marketKnowledgeEnabled} from './market-knowledge.js';
import {foodBudgetMarket} from './market-food.js';
import {knownArea} from '../actor-atlas.js';
import {causalPurchase} from './causal-history.js';
import {purchaseMeaning} from '../event-meaning.js';
import {carriedFood} from './stores.js';
import {enabled} from '../rules.js';
import {hasHabit,isTown} from './common.js';
import {serviceReachable} from './supply.js';
import {foodPrice,equipmentPrice} from './prices.js';
import {hasArmor} from './armor.js';
import {knownServiceAllows,consumeMerchantGood,observeServices} from './service-access.js';

export const MONEY_STYLES={cautious:'Бережливый',purposeful:'Целевой',carefree:'Беспечный'};
export function initializeFinances(h){
  h.money ||= {style:hasHabit(h,'reckless')||hasHabit(h,'gambler')?'carefree':hasHabit(h,'hoarder')||hasHabit(h,'homebody')||h.personality.courage<.5?'cautious':'purposeful',priority:null};
}
function knownService(s,a,x,ctx){
  if(!knownArea(s,a)||!ctx?.route||!knownServiceAllows(s,a,x===58?'merchant':'food'))return false;
  const path=(ctx.knownRoute||ctx.route)(s,s.hero.area,a.id);
  return path.length>0&&path.length<=5&&path.every(id=>knownArea(s,id))&&serviceReachable(s,a,x,ctx);
}
export function moneyBudget(s,ctx){
  const h=s.hero,style=h.money?.style||'carefree',known=h.memory.merchant,merchant=s.areas[known];
  const shopKnown=knownService(s,merchant,58,ctx)&&(h.memory.shopAfter||0)<=s.tick;
  const foodSource=enabled(s,'body')&&(marketKnowledgeEnabled(s)&&enabled(s,'supply')?foodBudgetMarket(s,a=>knownServiceAllows(s,a,'food')):Object.values(s.areas).find(a=>isTown(a)&&(!enabled(s,'supply')||a.civic?.food>=(marketEnabled(s)?1:4)&&(!marketEnabled(s)||quoteMarket(s,a,'food','buy',4).quantity>0))&&knownService(s,a,42,ctx)));
  const foodKnown=Boolean(foodSource);
  const food=foodKnown&&(!enabled(s,'supply')||!carriedFood(s.people[h.lineage],h.inventory))?foodPrice(s,foodSource.id):0;
  const medicine=shopKnown&&knownServiceAllows(s,merchant,'merchant',{purchase:'potion'})&&h.hp<h.maxHp*.7&&!h.inventory.potions?equipmentPrice(s,'potion',known):0;
  const reserve=enabled(s,'finances')&&style!=='carefree'?Math.min(10,food+medicine):0;
  const p=h.commitments?.personal,targetAvailable=Boolean(enabled(s,'commitments')&&p?.status==='active'&&h.weapon<p.target&&shopKnown&&knownServiceAllows(s,merchant,'merchant',{purchase:'weapon'}));
  const targetCost=targetAvailable?equipmentPrice(s,'weapon',known):0;
  return {style,reserve,spendable:Math.max(0,h.gold-reserve),targetAvailable,targetCost,targetNeed:targetAvailable?Math.max(0,targetCost+reserve-h.gold):0,foodKnown,shopKnown};
}
export function maySpend(s,kind,price,ctx,{urgent=false}={}){
  const h=s.hero;if(price===null||h.gold<price)return false;
  if(!enabled(s,'finances')||urgent)return true;
  const b=moneyBudget(s,ctx),earmarked=b.style==='purposeful'&&kind!=='weapon'?b.targetCost:0;
  return h.gold-price>=b.reserve+earmarked;
}
export function needsIncome(s,ctx){return enabled(s,'finances')&&moneyBudget(s,ctx).targetNeed>0;}
export function nextPurchase(s,ctx,area=s.hero.area){
  if(!knownArea(s,area))return null;
  const h=s.hero,kinds=[];if(containersOn(s)&&packView(s).excess)return null;
  if(!h.inventory.potions&&h.hp<h.maxHp*.45)kinds.push('potion');
  if(h.weapon<3)kinds.push('weapon');if(!hasArmor(h))kinds.push('armor');if(!h.inventory.potions&&!kinds.includes('potion'))kinds.push('potion');
  for(const kind of kinds){if(kind==='potion'&&stackRoom(s,h.lineage,'potions',1)<1)continue;if(!knownServiceAllows(s,s.areas[area],'merchant',{purchase:kind}))continue;const price=equipmentPrice(s,kind,area);if(maySpend(s,kind,price,ctx,{urgent:kind==='potion'&&h.hp<h.maxHp*.45}))return{kind,price,area};}
  return null;
}
export function buyUpgrade(s,ctx){
  if(!enabled(s,'finances'))return false;
  observeServices(s);
  const q=nextPurchase(s,ctx);if(!q)return false;
  if(!consumeMerchantGood(s,q.kind))return false;
  const h=s.hero;h.gold-=q.price;
  if(q.kind==='weapon'){h.weapon++;const label=['','железный меч','стальной меч','меч мастера'][h.weapon];ctx.log(s,`Накопленные деньги превращаются в ${label}. Цена ◈${q.price}. Следующий бой будет легче.`,'trade',h.area,{meaning:purchaseMeaning(s,q.kind,label,q.price)});}
  else if(q.kind==='armor'){h.armor=1;ctx.log(s,`Сава продаёт кожаную броню за ◈${q.price}. Теперь удары причиняют меньше вреда.`,'trade',h.area,{meaning:purchaseMeaning(s,q.kind,'кожаная броня',q.price)});}
  else{h.inventory.potions++;ctx.log(s,`Герой покупает лечебное зелье за ◈${q.price}.`,'trade',h.area,{meaning:purchaseMeaning(s,q.kind,'лечебное зелье',q.price)});}
  causalPurchase(s,q.kind,q.price);
  return true;
}
export function noticeMoneyPriority(s,ctx){
  if(!enabled(s,'finances'))return;
  const h=s.hero,b=moneyBudget(s,ctx),phase=b.targetNeed>0?'save':b.reserve>0?'reserve':'free';
  if(h.money.priority?.phase===phase)return;
  h.money.priority={phase,tick:s.tick};
  if(phase==='save')ctx.log(s,`Герой считает деньги: на намеченное оружие и ближайшие нужды не хватает ◈${b.targetNeed}. Он ищет заработок, который приблизит покупку.`,'choice');
  else if(phase==='reserve')ctx.log(s,`Герой оставляет ◈${b.reserve} из своего кошелька на известные ближайшие нужды.`,'choice');
}
