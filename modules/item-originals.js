import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
export const ITEM_CAPACITY=24;
export const originalsOn=s=>enabled(s,'item-originals');
export function presentItem(input,id){
 const s=rootWorld(input),actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));actors.set(input.hero.lineage,input.hero);
 for(const h of actors.values())for(const item of [...h.bag,...Object.values(h.equipment).filter(Boolean)])if(item.id===id)return {item,kind:'person',id:h.lineage};
 for(const item of s.merchant.items||[])if(item.id===id)return {item,kind:'merchant',id:'merchant'};
 for(const edge of Object.values(s.edges||{}))for(const item of edge.lift?.parts||[])if(item.id===id)return {item,kind:'mechanism',id:edge.lift.id};
 for(const p of Object.values(s.people))for(const order of Object.values(p.forging?.orders||{}))if(order.status==='working')for(const m of order.materials)if(m.state==='reserved'&&m.original?.id===id)return {item:m.original,kind:'forge-order',id:order.id};
 for(const a of Object.values(s.areas))for(const o of a.objects)for(const item of [...(o.items||[]),...(o.paymentItems||[])])if(item.id===id)return {item,kind:o.paymentItems?.includes(item)?'object':'cache',area:a.id,object:o.id};
 for(const p of Object.values(s.people)){const items=actors.has(p.id)?[]:[...(p.looseItems||[]),...(p.legacy?.keepsakes||[])];for(const item of items)if(item.id===id)return {item,kind:'person',id:p.id};}
 return null;
}
export function itemLocation(s,item,holder){
 if(!item||!originalsOn(s)&&!item.physical&&!item.durability)return;
 item.physical={version:1,holder:{...holder},movedAt:s.tick};
}
export function actorItemLocation(s,item,actor=s.hero.lineage){itemLocation(s,item,{kind:'person',id:actor});}
export function consumeOriginal(s,item,{area,object,reason}){
 if(!originalsOn(s)&&!item.physical)return;itemLocation(s,item,{kind:'consumed',area,object,reason});s.itemDisposals ||= {};s.itemDisposals[item.id] ||= {version:1,tick:s.tick,area,object,reason};
}
export function cacheItems(s,items,{area=s.hero.area,x=s.hero.x,leftBy=s.hero.lineage,name='Оставленная поклажа'}={}){
 if(!items.length||!s.areas[area])return null;const a=s.areas[area];
 let o=a.objects.find(o=>o.itemOriginals===1&&o.leftBy===leftBy&&o.x===x&&o.kind==='heirloom');
 if(!o){const h=s.actorStates?.[leftBy]||(s.hero.lineage===leftBy?s.hero:null),p=s.people[leftBy],source=h||p;if(!source)return null;source.nextItemCache=(source.nextItemCache||0)+1;o={id:`items-${leftBy}-${source.nextItemCache}`,kind:'heirloom',name,x,items:[],gold:0,taken:false,itemOriginals:1,leftBy};a.objects.push(o);}
 for(const item of items){if(!o.items.some(i=>i.id===item.id)){o.items.push(item);itemLocation(s,item,{kind:'cache',area,object:o.id});}}
 o.taken=false;return o;
}
export function cacheCollectible(s,o){
 if(!originalsOn(s)&&o.itemOriginals!==1)return !o.taken&&(enabled(s,'equipment')||o.gold>0);
 if(o.taken)return false;if(o.gold>0)return true;if(!enabled(s,'equipment'))return false;
 return Boolean(o.items?.length&&s.hero.bag.length<ITEM_CAPACITY);
}
export function npcLooseItems(s,p){const h=s.actorStates?.[p.id];return h?.bag||(p.looseItems ||= []);}
export function npcCachePlan(s,p){
 if(!originalsOn(s)||p.role==='ребёнок'||p.ailment||p.health<(p.maxHealth||100)*.85||p.needs?.sleeping||p.needs?.energy<35||p.needs?.hunger>55)return null;
 if(p.agenda.job!=='merchant'&&!(p.agenda.wealth<10&&p.agenda.duty<.5))return null;
 const bag=s.actorStates?.[p.id]?.bag||p.looseItems||[];if(bag.length>=ITEM_CAPACITY)return null;
 const a=s.areas[p.area],cache=a?.objects.find(o=>o.itemOriginals===1&&!o.taken&&o.items?.some(i=>i.value>0)&&physicalDistance(a,p.x,o.x)<=18);
 return cache?{kind:'itemSalvage',target:a.id,x:cache.x,object:cache.id,remaining:1}:null;
}
export function npcTakeCache(s,p,t){
 if(!originalsOn(s))return 0;const a=s.areas[p.area],o=a?.objects.find(o=>o.id===t.object);if(!o||o.itemOriginals!==1||o.taken||p.area!==t.target||physicalDistance(a,p.x,o.x)>1)return 0;
 const bag=npcLooseItems(s,p),count=Math.min(ITEM_CAPACITY-bag.length,o.items.length);if(count<=0)return 0;
 for(const item of o.items.splice(0,count)){bag.push(item);actorItemLocation(s,item,p.id);item.history ||= [];item.history.push({tick:s.tick,text:`Подобрано: ${p.name}.`});}
 o.taken=o.items.length===0&&!(o.gold>0);return count;
}
export function releaseLooseItems(s,p){
 if(p.alive)return;const h=s.actorStates?.[p.id],items=h?.actorMode==='npc'?[...h.bag,...Object.values(h.equipment).filter(Boolean)].filter(i=>i.physical?.version===1):p.looseItems;
 if(p.alive||!items?.length||!s.areas[p.area])return;
 const cache=cacheItems(s,items,{area:p.area,x:p.x??42,leftBy:p.id,name:`Вещи ${p.name}`});if(cache){p.looseItems=[];if(h?.actorMode==='npc'){h.bag=h.bag.filter(i=>!items.includes(i));for(const key of Object.keys(h.equipment))if(items.includes(h.equipment[key]))h.equipment[key]=null;}}
}
