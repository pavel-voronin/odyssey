import {enabled} from '../rules.js';
import {ITEM_BASES} from '../content.js';
import {carriedFood} from './stores.js';
import {hasHabit} from './common.js';

const bases=new Set(ITEM_BASES.map(b=>b.id));
export const collectionsOn=s=>['collections','equipment','item-originals'].every(id=>enabled(s,id));
export function collectionItems(s,person=s.hero?.lineage){
 const h=s.hero?.lineage===person?s.hero:s.actorStates?.[person],p=s.people?.[person],items=h?[...h.bag,...Object.values(h.equipment||{}).filter(Boolean)]:[...(p?.looseItems||[]),...(p?.legacy?.keepsakes||[])];
 const ids=new Set();return items.filter(i=>i?.id&&!ids.has(i.id)&&ids.add(i.id));
}
export function collectible(item){return Boolean(item?.id&&item.creator&&bases.has(item.base)&&item.kind!=='workPart');}
// Inventory is the authority. History and the merchant archive are not a second
// store; exchanging or losing an original immediately changes this pure query.
export function collectionStatus(s,person=s.hero.lineage){
 const c=s.people?.[person]?.collection;if(c?.version!==1||![2,3].includes(c.target))return null;
 const items=collectionItems(s,person).filter(i=>collectible(i)&&i.creator===c.master),ordered=[...items].sort((a,b)=>Number(b.id===c.source?.item)-Number(a.id===c.source?.item)||(a.found||0)-(b.found||0)||a.id.localeCompare(b.id));
 const variants=new Set(),representatives=[];for(const item of ordered)if(!variants.has(item.base)&&representatives.length<c.target){variants.add(item.base);representatives.push(item);}
 const keep=new Set(representatives.map(i=>i.id));return {collection:c,representatives,surplus:items.filter(i=>!keep.has(i.id)),count:representatives.length,target:c.target,complete:representatives.length===c.target};
}
export function startCollection(s,person,item,source,target=2){
 const p=s.people?.[person];if(!collectionsOn(s)||!p||p.collection||!collectible(item)||!s.people[item.creator])return null;
 p.collection={version:1,master:item.creator,masterName:s.people[item.creator].name,target:target===3?3:2,since:s.tick,source:{...source,item:item.id,name:item.name,tick:s.tick,area:s.hero.area},satisfied:false,status:'seeking',history:[]};return p.collection;
}
export function refreshCollection(s,ctx,person=s.hero.lineage){
 if(!collectionsOn(s))return;const v=collectionStatus(s,person);if(!v)return;const c=v.collection,signature=v.representatives.map(i=>i.id).join('|');if(c.signature===signature)return;
 c.signature=signature;c.status=v.complete?'complete':v.count?'seeking':'empty';c.history.push({tick:s.tick,items:v.representatives.map(i=>i.id),status:c.status});if(c.history.length>8)c.history.shift();
 if(person!==s.hero.lineage)return;
 if(v.complete&&!c.satisfied){c.satisfied=true;c.showWish=true;if(enabled(s,'psychology'))s.hero.mind.stress=Math.max(0,s.hero.mind.stress-2);ctx.log(s,`${s.hero.name} собирает ${c.target} разные работы ${c.masterName}. Хочется однажды показать их другим. Монеты не заменили бы эту радость.`,'collection');}
 else if(c.satisfied&&!v.complete)ctx.log(s,`В собрании работ ${c.masterName} осталось ${v.count} из ${c.target}. Воспоминание не заменяет утраченный экземпляр.`,'collection');
}
export function observeOwnCollection(s,ctx){
 if(!collectionsOn(s)||!s.hero.alive||s.hero.transit)return;
 const h=s.hero,p=s.people?.[h.lineage];if(!p)return;
 if(!p.collection&&hasHabit(h,'collector')){
  const item=collectionItems(s).find(i=>collectible(i)&&(h.memory.people.includes(i.creator)||Object.hasOwn(h.relations||{},i.creator)));
  if(item){const c=startCollection(s,h.lineage,item,{kind:'owned-item'},h.personality.curiosity>=.8?3:2);if(c)ctx.log(s,`${h.name} рассматривает «${item.name}»: знакомая работа ${c.masterName}. Хочется сохранить ${c.target} разные вещи этого мастера, а не всё дорогое подряд.`,'collection');}
 }
 refreshCollection(s,ctx);
}
export function collectionKeep(s){return collectionsOn(s)?new Set(collectionStatus(s)?.representatives.map(i=>i.id)||[]):null;}
export function collectionEmergency(s){const h=s.hero;return collectionsOn(s)&&enabled(s,'body')&&h.hunger>=75&&h.gold<4&&carriedFood(s.people[h.lineage],h.inventory)===0;}
