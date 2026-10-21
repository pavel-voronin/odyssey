import {foodSourceState} from './food-source-state.js';
import {localMethodAllowed} from './domestic-state.js';
import {stackRoom} from './container-state.js';
import {enabled} from '../rules.js';
import {areaScale} from '../geometry.js';
import {foodStores,LOCAL_FOODS} from './food-stores.js';
import {collectionItems} from './collection-state.js';
import {itemWorking,wearOwnedItem} from './item-condition.js';
export {LOCAL_FOODS} from './food-stores.js';
export const localFoodEnabled=s=>enabled(s,'local-food')&&enabled(s,'supply');
export function initializeFoodSource(s,a){
 if(!localFoodEnabled(s)||!a?.forage||a.forage.localFood||a.interior)return;
 const f=a.forage,mushroom=['forest','cave','undercity'].includes(a.type),fish=['port','island'].includes(a.type)&&!a.district;
 if(!mushroom&&!fish)return;
 // Reclassify the existing patch, never keep a duplicate generic patch. A port
 // with no legacy source gets its finite initial shoal exactly once.
 if(fish&&f.max===0){f.stock=8;f.max=8;f.x=82;}
 f.localFood={id:a.id+'/food-source',kind:mushroom?'mushroom':'fish',initial:f.stock,grown:0,harvested:0,legacyKind:f.kind,created:s.tick};
}
function methodKind(p,h){return h?['ranger','alchemist'].includes(h.profession)?'mushroom':h.profession==='sailor'?'fish':null:['farmer','healer'].includes(p.agenda?.job)?'mushroom':null;}
export function initializeFoodKit(s,p,h=null,{newborn=false}={}){
 if(!newborn||!localFoodEnabled(s)||!p||p.foodKitBirth||!h&&p.role==='герой')return;
 const kind=p.alive?methodKind(p,h):null;p.foodKitBirth={tick:s.tick,source:h?'profession/'+h.profession:p.agenda?.job?'occupation/'+p.agenda.job:null,kind};
 if(!kind)return;const q=foodStores(p),d=LOCAL_FOODS[kind];
 q.methods[kind] ||= {id:d.method,source:h?'profession/'+h.profession:'occupation/'+p.agenda.job,recordedAt:s.tick};
 q.tools[d.tool] ||= {id:p.id+'/food-'+d.tool,kind:d.tool,name:d.tool==='knife'?'Нож грибника':'Ручная леска с крючком',state:'working',owner:p.id,origin:h?'initial-life':'initial-resident'};
}
export {foodSourceState} from './food-source-state.js';
export function foodCapability(s,p,kind,h=null,area=null){
 area ||= s.areas[h?.area||p?.area];const d=LOCAL_FOODS[kind],q=p?.localFood;if(!d)return{allowed:false,code:'product',reason:'Неизвестный продукт.'};
 if(!q?.methods[kind]&&methodKind(p,h)!==kind)return{allowed:false,code:'method',reason:kind==='mushroom'?'Не умеет отличать съедобные грибы. Нужен совет знатока.':'Не знает способа ловли на леску.'};
 if(!localMethodAllowed(s,p,area,kind))return{allowed:false,code:'method',reason:'Этот местный источник ещё не знаком: нужен местный урок или иной известный канал еды.'};
 const kit=q?.tools[d.tool],knives=d.tool==='knife'?collectionItems(s,p.id).filter(i=>i.toolKind==='knife'&&itemWorking(i)):[],precise=knives.find(i=>i.refit?.mode==='precision'),tool=precise||(kit?.owner===p.id&&kit.state==='working'&&itemWorking(kit)?kit:knives[0]);if(!tool)return{allowed:false,code:'tool',reason:kind==='mushroom'?'Нет собственного ножа для сбора.':'Нет собственной лески с крючком.'};
 return{allowed:true,tool:tool.id,method:d.method,...(precise?{turns:Math.max(2,d.turns-1)}:{})};
}
export function localFoodChoice(s,p,h,a){
 if(!localFoodEnabled(s))return null;const source=foodSourceState(s,a);if(!source?.available||!foodCapability(s,p,source.kind,h,a).allowed)return null;
 return{...source,remaining:foodCapability(s,p,source.kind,h,a).turns??LOCAL_FOODS[source.kind].turns};
}
export function forageGrowth(s,a,amount){
 const f=a.forage;if(!f)return;const before=f.stock;
 if(localFoodEnabled(s)&&f.localFood&&!foodSourceState(s,a).open)return;
 f.stock=Math.min(f.max,f.stock+amount);if(f.localFood)f.localFood.grown+=f.stock-before;
}
export function takeForage(a,quantity){const f=a.forage;if(!f||!(quantity>0))return 0;const n=Math.min(f.stock,quantity);f.stock-=n;if(f.localFood)f.localFood.harvested+=n;return n;}
function harvestLocalFood(s,p,a,h=null){
 if(!localFoodEnabled(s)||!p?.alive||h?.transit||h?.combat||p.needs?.sleeping)return null;
 const source=foodSourceState(s,a),area=h?.area||p.area,x=h?.x??p.x;
 if(!source?.available||area!==a.id||Math.abs(x-source.x)*areaScale(a)>=2)return null;
 const capability=foodCapability(s,p,source.kind,h,a);if(!capability.allowed||p.localFood?.lastHarvest===s.tick)return null;
 const quantity=takeForage(a,stackRoom(s,p.id,source.kind,Math.min(3,source.stock)));if(!quantity)return null;
 const q=foodStores(p);q.stock[source.kind]=(q.stock[source.kind]||0)+quantity;q.obtained[source.kind]=(q.obtained[source.kind]||0)+quantity;q.lastHarvest=s.tick;
 q.methods[source.kind] ||= {id:capability.method,source:h?'profession/'+h.profession:'occupation/'+p.agenda.job,recordedAt:s.tick};
 const receipt={id:p.id+'/harvest/'+s.tick,tick:s.tick,area:a.id,source:source.id,kind:source.kind,quantity,owner:p.id,tool:capability.tool};q.history.push(receipt);if(q.history.length>16)q.history.shift();return receipt;
}
// Called by the existing hero/NPC action owner after physical arrival. One
// tick can contribute one work step, even if a hook is repeated after reload.
export function localFoodWork(s,p,a,task,h=null,ctx=null){
 const choice=localFoodChoice(s,p,h,a),x=h?.x??p.x,energy=h||p.needs;
 if(!choice||task.foodSource!==choice.id||(h?.area||p.area)!==a.id||Math.abs(x-choice.x)*areaScale(a)>=2||!p.alive||h&&!h.alive||p.needs?.sleeping||h?.transit||h?.combat||!Number.isFinite(energy?.energy)||energy.energy<1)return{finished:true,reason:'Добыча сейчас недоступна: нет запаса, способа, средства или подходящих условий.'};
 const store=foodStores(p);if(store.lastFoodWork>=s.tick)return{finished:false};store.lastFoodWork=s.tick;
 const work=task.foodWork ||= {source:choice.id,kind:choice.kind,tool:foodCapability(s,p,choice.kind,h,a).tool,turns:0,lastTick:-1};
 const tool=collectionItems(s,p.id).find(i=>i.id===foodCapability(s,p,choice.kind,h,a).tool),wear=()=>wearOwnedItem(s,tool,p.id,'gather',choice.id,ctx);
 if(work.lastTick>=s.tick)return{finished:false};work.lastTick=s.tick;work.turns++;energy.energy=Math.max(0,energy.energy-LOCAL_FOODS[choice.kind].energy);task.remaining=Math.max(0,choice.remaining-work.turns);
 if(task.remaining>0){wear();return{finished:false};}const receipt=harvestLocalFood(s,p,a,h);wear();
 if(receipt&&!h&&task.home)p.localFood.homeCargo={area:task.home,kind:receipt.kind,quantity:receipt.quantity,source:receipt.source};
 return{finished:true,receipt};
}
export function deliverLocalFood(s,p,a){
 if(!localFoodEnabled(s)||p.area!==a.id||!a.civic||p.localFood?.homeCargo?.area!==a.id)return null;
 const q=p.localFood,cargo=q.homeCargo;let portions=0;const products={};
 const id=cargo.kind,d=LOCAL_FOODS[id],n=Math.min(q.stock[id]||0,cargo.quantity);if(n){q.stock[id]-=n;q.delivered[id]=(q.delivered[id]||0)+n;portions=n*d.portions;products[id]=n;}delete q.homeCargo;
 return portions?{portions,products}:null;
}
