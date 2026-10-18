import {enabled} from '../rules.js';
import {rootWorld} from '../world-ref.js';
import {eventMeaning} from '../event-meaning.js';
import {itemWorking} from './item-condition.js';
export const LOOT_FATES=Object.freeze(Object.assign(Object.create(null),{equipped:'надел',bag:'убрал в сумку',left:'оставил',sold:'продал',heirloom:'осталось после гибели',unknown:'дальнейшая судьба не записана'}));
const pending=new WeakMap();
const active=s=>enabled(s,'loot-results')&&enabled(s,'event-meaning');
export function itemReference(item){return {kind:'item',id:item.id||null,label:item.name||'Неизвестная вещь',role:item.slot==='weapon'?'оружие':item.slot==='armor'?'доспех':item.slot==='charm'?'талисман':'предмет',stat:item.stat,power:Number.isFinite(item.power)?itemWorking(item)?item.power:0:null};}
function batch(s){const world=rootWorld(s);let p=pending.get(world);if(!p||p.tick!==s.tick){p={tick:s.tick,rows:[],left:new Set(),sold:new Set()};pending.set(world,p);}return p;}
export function beginLootResult(s,item,replaced=null){
 if(!active(s))return undefined;
 const meaning=eventMeaning(s,'loot-result',{item:itemReference(item),result:{fate:'unknown',replaced:replaced?{item:itemReference(replaced),fate:'unknown'}:null,left:[]}});
 batch(s).rows.push({owner:s.hero.lineage,actor:s.hero,area:s.hero.area,meaning});return meaning;
}
export function recordLootDiscard(s,items){
 if(!active(s)||!items.length)return;const p=batch(s),row=p.rows.findLast(r=>r.owner===s.hero.lineage);
 for(const item of items)p.left.add(item.id);if(row)row.meaning.result.left.push(...items.map(itemReference));
}
export function lootSaleMeaning(s,items,amount){
 if(!active(s))return undefined;const p=batch(s);for(const item of items)p.sold.add(item.id);
 return eventMeaning(s,'loot-sale',{target:{kind:'person',id:'merchant',label:'Сава',role:'торговец'},amount,result:{items:items.map(itemReference),quantity:items.length}});
}
function fate(world,row,id,p){
 const h=row.actor;if(Object.values(h.equipment||{}).some(i=>i?.id===id))return 'equipped';if(h.bag.some(i=>i.id===id))return 'bag';
 if(p.sold.has(id))return 'sold';if(p.left.has(id))return 'left';
 for(const area of new Set([h.area,row.area]))if(world.areas[area]?.objects.some(o=>o.kind==='heirloom'&&o.items?.some(i=>i.id===id)))return 'heirloom';
 return 'unknown';
}
export function settleLootResults(s){
 const world=rootWorld(s),p=pending.get(world);if(!p||p.tick!==world.tick)return;
 for(const row of p.rows){const m=row.meaning;m.result.fate=fate(world,row,m.item.id,p);if(m.result.replaced)m.result.replaced.fate=fate(world,row,m.result.replaced.item.id,p);
  // Archives can be created inside the same atomic tick before its presentation
  // facts settle. Only this tick's copied receipt is completed, never old history.
  for(const life of world.lives||[])if(life.lineage===row.owner&&life.ended===world.tick)for(const events of [life.timeline,life.milestones])for(const event of events||[])if(event.tick===world.tick&&event.meaning?.action==='loot-result'&&event.meaning.item?.id===m.item.id)event.meaning=JSON.parse(JSON.stringify(m));
 }
}
export function finishLootTick(s){settleLootResults(s);pending.delete(rootWorld(s));}
