import {substanceEvent} from './remains-cycle-state.js';
import {physicalDistance} from '../geometry.js';
import {rootWorld} from '../world-ref.js';
import {setActorMoney} from '../actor-projection.js';
import {profile} from './common.js';
import {bodyRemains} from './remains.js';
import {BIO_MATERIAL,biomaterialOn,bodyMaterialAvailable,isFang} from './biomaterial-state.js';
import {collectionItems} from './collection-state.js';
import {itemWorking,wearOwnedItem} from './item-condition.js';
import {actorItemLocation,npcLooseItems,ITEM_CAPACITY} from './item-originals.js';
import {npcController,canStartNPCActivity,npcAction} from './npc-control.js';
const actor=(s,p)=>s.hero.lineage===p.id?s.hero:s.actorStates?.[p.id];
const body=(s,p)=>{const h=actor(s,p);return h?.actorMode!=='npc'?h:null;};
const at=(s,p)=>body(s,p)||p;
const bag=(s,p)=>actor(s,p)?.bag||p.looseItems||[];
const healthy=(s,p)=>{const h=body(s,p);return p.alive&&!p.needs?.sleeping&&(h?h.alive&&!h.combat&&!h.transit&&h.hp>=h.maxHp*.7&&h.energy>=20&&h.hunger<60:p.health>=(p.maxHealth||100)*.7&&p.needs.energy>=20&&p.needs.hunger<60&&npcController(s,p)==='personal');};
const knows=(s,p)=>{const h=body(s,p);return Boolean(p.bioMaterialKnowledge?.['wolf-fang']||(h?profile(h).skill==='beast':p.agenda?.job==='farmer'));};
function tool(s,p){const kit=p.localFood?.tools.knife;return collectionItems(s,p.id).find(i=>i.toolKind==='knife'&&itemWorking(i))||(kit?.owner===p.id&&kit.state==='working'&&itemWorking(kit)?kit:null);}
function near(s,p,b,range=2){const a=at(s,p);return b?.position.kind==='area'&&a.area===b.position.area&&physicalDistance(s.areas[a.area],a.x,b.position.x)<=range;}
function usable(s,p,b){return biomaterialOn(s)&&healthy(s,p)&&b&&bodyRemains(s,b.id)===b&&bodyMaterialAvailable(s,b)&&knows(s,p)&&tool(s,p)&&bag(s,p).length<ITEM_CAPACITY;}
export function extractBodyMaterial(s,p,b,ctx){
 if(!usable(s,p,b)||!near(s,p,b)||b.material.work?.lastTick>=s.tick)return false;
 const m=b.material,t=tool(s,p),w=m.work?.actor===p.id?m.work:(m.work={actor:p.id,steps:0,lastTick:-1,started:s.tick,tool:t.id});
 w.steps++;w.lastTick=s.tick;const h=body(s,p);if(h){h.energy-=2;h.lastAction='work';h.speech=`Пригодный клык: ${w.steps}/${BIO_MATERIAL.work}`;}else p.needs.energy-=2;
 if(w.steps<BIO_MATERIAL.work){wearOwnedItem(s,t,p.id,'gather',b.id,ctx);return true;}
 // Atomic finite withdrawal precedes delivery; the body holds the receipt,
 // never a second copy of the extracted material.
 const provenance={version:1,body:b.id,deathId:b.deathId,animal:b.source.id,animalName:b.death.name,species:'wolf',extractor:p.id,extractorName:p.name,extractedAt:s.tick};
 const item={id:m.id,kind:'bioMaterial',base:m.kind,name:BIO_MATERIAL.name,slot:'material',stat:'material',power:0,rarity:1,modifier:'plain',value:BIO_MATERIAL.price,found:s.tick,foundArea:at(s,p).area,creator:null,physical:{version:1,holder:{kind:'person',id:p.id},movedAt:s.tick},bioMaterial:provenance,history:[{tick:s.tick,text:`Извлечено: ${p.name}, из останков «${b.death.name}». Тот же клык; ${w.steps} рабочих действий.`}]};
 if(b.substance&&!substanceEvent(s,b,'structure','extracted',1,{kind:'person',id:p.id}))return false;
 m.remaining=0;m.state='extracted';m.extracted={item:item.id,person:p.id,tick:s.tick,actions:w.steps};m.work=null;p.bioMaterialKnowledge ||= {};p.bioMaterialKnowledge[m.kind] ||= {source:body(s,p)?'profession/'+h.profession:'occupation/'+p.agenda.job,recordedAt:s.tick};
 if(h)ctx.receiveItem(s,ctx,null,item);else{npcLooseItems(s,p).push(item);actorItemLocation(s,item,p.id);}
 wearOwnedItem(s,t,p.id,'gather',b.id,ctx);ctx.log(s,`${p.name} извлекает один пригодный клык из ${b.death.name}. Другому сборщику он уже не достанется.`,'craft');return true;
}
function candidate(s,p){const a=at(s,p),margin=body(s,p)?24:Infinity;return Object.values(rootWorld(s).remains?.byId||{}).find(b=>usable(s,p,b)&&near(s,p,b,30)&&!s.areas[a.area].objects.some(e=>e.kind==='enemy'&&e.alive&&physicalDistance(s.areas[a.area],a.x,e.x)<margin));}
function buyer(s,p){const h=body(s,p);return Object.values(s.people).find(m=>m.id!==p.id&&m.alive&&m.area===at(s,p).area&&['artisan','merchant'].includes(m.agenda?.job)&&m.agenda.wealth>=BIO_MATERIAL.price&&!m.agenda.task&&!m.needs.sleeping&&m.needs.energy>=25&&m.needs.hunger<60&&npcController(s,m)==='personal'&&canStartNPCActivity(s,m)&&bag(s,m).length<ITEM_CAPACITY&&(h.memory.people.includes(m.id)||Object.hasOwn(h.relations,m.id)));}
export function sellBodyMaterial(s,p,m,item,ctx){
 const h=body(s,p);if(!biomaterialOn(s)||!h||!healthy(s,p)||!isFang(item)||!h.bag.includes(item)||buyer(s,p)?.id!==m?.id||physicalDistance(s.areas[h.area],h.x,m.x)>2||!npcAction(s,m,'personal','material-purchase'))return false;
 h.bag.splice(h.bag.indexOf(item),1);npcLooseItems(s,m).push(item);setActorMoney(s,p,h.gold+BIO_MATERIAL.price);setActorMoney(s,m,m.agenda.wealth-BIO_MATERIAL.price);actorItemLocation(s,item,m.id);item.history.push({tick:s.tick,text:`Куплено: ${m.name} у ${p.name} за ◈${BIO_MATERIAL.price}.`});h.lastAction='talk';h.goal=null;ctx.log(s,`${m.name} покупает пригодный клык за ◈${BIO_MATERIAL.price} из своего кошелька. Клык теперь у покупателя.`,'trade');return true;
}
export function biomaterialPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(h.goal||!biomaterialOn(s)||!healthy(s,p))return false;
 const b=candidate(s,p);if(b){ctx.goal(s,'bodyMaterial',h.area,b.position.x,'Извлечь пригодный клык','Он знает, как работать с этим зверем. Останки конечны; извлечение займёт время и силы.',{body:b.id});return true;}
 const item=h.bag.find(isFang);if(!item||p.forging?.active||p.forging?.recipes['working-knife']&&!collectionItems(s).some(i=>i.toolKind==='knife'&&itemWorking(i))&&h.gold>=3)return false;
 const m=buyer(s,p);if(!m)return false;ctx.goal(s,'bodyMaterialSale',h.area,m.x,'Предложить клык ремесленнику','Знакомому мастеру нужен настоящий материал. Оплата возможна только из его кошелька.',{person:m.id,item:item.id});return true;
}
export function biomaterialAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;if(!g)return false;
 if(g.kind==='bodyMaterialSale'){const m=s.people[g.person],item=h.bag.find(i=>i.id===g.item);const ok=sellBodyMaterial(s,p,m,item,ctx);if(!ok)h.goal=null;return ok;}
 const b=bodyRemains(s,g.body);if(!b||!extractBodyMaterial(s,p,b,ctx)){h.goal=null;return false;}if(b.material.state==='extracted')h.goal=null;return true;
}
export function npcBiomaterialPlan(s,p){if(!biomaterialOn(s)||!healthy(s,p))return null;const b=candidate(s,p);return b?{kind:'bodyMaterial',target:b.position.area,x:b.position.x,body:b.id,remaining:1}:null;}
export function npcBiomaterialAction(s,p,t,ctx){const b=bodyRemains(s,t.body),ok=b&&extractBodyMaterial(s,p,b,ctx);if(!ok||b.material.state==='extracted'){p.agenda.task=null;p.agenda.due=s.tick+48;}return Boolean(ok);}
