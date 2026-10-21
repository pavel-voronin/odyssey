import {limbWorkAllows} from './limb-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {setActorMoney} from '../actor-projection.js';
import {productionSources} from './goods.js';
import {ownedWorkshopSite,workshopPosition} from './workshop-place.js';
import {workToolReady} from './workshop-tool-state.js';
import {npcController,npcAction,canStartNPCActivity} from './npc-control.js';
import {npcLooseItems,actorItemLocation} from './item-originals.js';
import {fitsPack} from './container-state.js';
import {pegPart,fittedPeg,handPart,installedHook} from './prosthetic-state.js';

export const prostheticsOn=s=>enabled(s,'prosthetics')&&enabled(s,'forging')&&enabled(s,'goods-cycle')&&enabled(s,'property');
const near=(s,a,b)=>a?.area===b?.area&&Number.isFinite(a.x)&&Number.isFinite(b.x)&&physicalDistance(s.areas[a.area],a.x,b.x)<=9;
const money=(s,p)=>s.hero.lineage===p.id?s.hero.gold:s.actorStates?.[p.id]?.gold??p.agenda.wealth;
const healthy=p=>p?.alive&&p.health>=(p.maxHealth||100)*.75&&!p.needs?.sleeping&&p.needs?.energy>=35&&p.needs.hunger<55&&!p.ailment;
function siteFor(s,p){const site=p&&ownedWorkshopSite(s,p.area,p.id);if(!site||site.home||site.object.owner!==p.id||site.object.state!=='intact'||site.object.closed||!workToolReady(s,site.object))return null;return near(s,p,workshopPosition(s,site.area,site.object))?site:null;}
const available=(s,p)=>healthy(p)&&limbWorkAllows(p,'repair')&&p.agenda?.job==='artisan'&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p)&&!p.agenda.task&&!p.forging?.active;
const current=p=>p?.prostheticCraft?.orders[p.prostheticCraft.active];
function say(s,ctx,text){ctx?.log(s,text,'craft');}

// A quote is made face to face at this master's real bench. No remote search of
// private stock or a newly generated healer/workshop supplies the transaction.
export function orderPeg(s,p,ctx,{hand=false}={}){
 const h=s.hero,buyer=s.people[h.lineage],part=hand?handPart(buyer):pegPart(buyer),site=siteFor(s,p);
 if(!prostheticsOn(s)||!buyer.alive||!part||(hand?installedHook(buyer)&&installedHook(buyer).item.prosthesis.wear.remaining>8:fittedPeg(buyer))||pendingProsthetic(s,buyer)||h.combat||h.transit||!near(s,h,p)||!site||!available(s,p)||current(p)||!fitsPack(s,p.id,{items:[...npcLooseItems(s,p),{kind:'prosthesis'}]})||h.bag.some(i=>i.prosthesis?.patient===buyer.id&&i.prosthesis.part===part&&(!hand||i.prosthesis.wear.remaining>8))||Object.values(p.prostheticCraft?.orders||{}).some(o=>o.patient===buyer.id&&o.part===part&&(!hand||o.collected===undefined)))return null;
 const raw=productionSources(s,site.area)?.materials;if(!raw||raw.stock<2||h.gold<12)return null;
 if(!npcAction(s,p,'personal','prosthetic-order'))return null;
 const q=p.prostheticCraft ||= {version:1,serial:0,active:null,lastActionTick:-1,orders:{}};
 const id=p.id+'/peg/'+(++q.serial),quality=Object.values(p.forging?.orders||{}).filter(o=>o.status==='completed').length>=2?.75:.5;
 raw.stock-=2;raw.used+=2;site.area.civic.treasury+=6;setActorMoney(s,buyer,h.gold-12);setActorMoney(s,p,money(s,p)+6);p.needs.energy-=2;
 const o={id,...(hand?{kind:'hand'}:{}),patient:buyer.id,part,master:p.id,area:site.area.id,workshop:site.object.id,started:s.tick,lastWorkTick:-1,progress:0,required:3,status:'working',quality,paid:12,material:{source:raw.id,units:2,price:6,before:raw.stock+2,after:raw.stock}};
 q.orders[id]=o;q.active=id;q.lastActionTick=s.tick;buyer.prostheticRequest={version:1,master:p.id,order:id};h.energy=Math.max(0,h.energy-1);h.lastAction='talk';h.speech=hand?'Нужен подогнанный крюк.':'Нужна деревянная нога.';
 say(s,ctx,`${p.name} принимает ◈12: две заготовки со склада и работа. Нужны ещё три рабочих действия; ${hand?'крюка':'ноги'} пока нет.`);return o;
}
// Called only from the master's already claimed ordinary personal body phase.
export function prostheticNPCTurn(s,p,ctx){
 const o=current(p);if(!prostheticsOn(s)||npcController(s,p)!=='personal')return false;if(!o){if(Object.values(p.prostheticCraft?.orders||{}).some(o=>o.status==='completed'&&o.collected===undefined)&&restForProsthetic(s,p))return true;return false;}if(o.status!=='working')return false;
 if(p.prostheticCraft.lastActionTick>=s.tick)return true;
 const site=siteFor(s,p);if(!healthy(p)||!limbWorkAllows(p,'repair')||!site||site.object.id!==o.workshop||site.area.id!==o.area){restForProsthetic(s,p);return true;}
 if(o.progress===o.required-1&&!fitsPack(s,p.id,{items:[...npcLooseItems(s,p),{kind:'prosthesis'}]}))return true;
 p.prostheticCraft.lastActionTick=s.tick;o.lastWorkTick=s.tick;o.progress++;p.needs.energy-=2;
 if(o.progress<o.required)return true;
 o.status='completed';o.finished=s.tick;o.item=o.id+(o.kind==='hand'?'/hook':'/leg');p.prostheticCraft.active=null;
 const item={id:o.item,kind:'prosthesis',base:o.kind==='hand'?'wooden-hook':'wooden-leg',name:o.kind==='hand'?'Подогнанный деревянный крюк':'Деревянная нога',value:12,found:s.tick,foundArea:p.area,creator:p.id,createdAt:s.tick,prosthesis:{version:1,...(o.kind==='hand'?{kind:'hand',wear:{initial:24,remaining:24,used:0,lastTick:-1}}:{}),patient:o.patient,part:o.part,quality:o.quality,maker:p.id,order:o.id,created:s.tick},history:[{tick:s.tick,text:`${p.name}: две заготовки и три рабочих действия. Подгонка ${Math.round(o.quality*100)}%.`}]};
 npcLooseItems(s,p).push(item);actorItemLocation(s,item,p.id);return true;
}
export function collectPeg(s,p,ctx){
 const h=s.hero;if(!prostheticsOn(s)||!near(s,h,p)||h.combat||h.transit||!available(s,p)||p.prostheticCraft?.lastActionTick>=s.tick)return false;
 const o=Object.values(p.prostheticCraft?.orders||{}).find(o=>o.patient===h.lineage&&o.status==='completed'&&o.collected===undefined),bag=npcLooseItems(s,p),i=o&&bag.find(i=>i.id===o.item);
 if(!i||!fitsPack(s,h.lineage,{items:[...h.bag,i]})||!npcAction(s,p,'personal','prosthetic-delivery'))return false;
 bag.splice(bag.indexOf(i),1);h.bag.push(i);actorItemLocation(s,i,h.lineage);o.collected=s.tick;p.prostheticCraft.lastActionTick=s.tick;p.needs.energy--;h.lastAction='talk';
 say(s,ctx,`${p.name} передаёт готовый протез. Она ещё в поклаже; установка потребует отдельного действия.`);return true;
}
export function fitPeg(s,ctx){
 const h=s.hero,p=s.people[h.lineage],i=h.bag.find(i=>i.prosthesis?.patient===p.id&&i.prosthesis.part===pegPart(p));
 if(!prostheticsOn(s)||!p.alive||fittedPeg(p)||!i||h.combat||h.transit||h.energy<12||h.hunger>=65||h.hp<h.maxHp*.4||!bodyHands(p)||p.localWounds?.active.some(w=>w.part===i.prosthesis.part&&(w.closure<100||w.function<40)))return false;
 h.bag.splice(h.bag.indexOf(i),1);p.prosthetic={version:1,part:i.prosthesis.part,item:i,installedAt:s.tick,by:p.id};actorItemLocation(s,i,p.id);h.energy-=4;h.lastAction='heal';h.speech='Проверю крепления.';
 say(s,ctx,'Деревянная нога закреплена. Ходить легче, но утраченная нога не отросла и прежняя подвижность не вернулась.');return true;
}
function bodyHands(p){return !['leftArm','rightArm'].every(id=>p.anatomy?.missing?.includes(id));}
export function prostheticTurn(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!prostheticsOn(s)||!pegPart(p)||fittedPeg(p)||h.combat||h.transit||h.actorMode==='npc'||s.areas[h.area]?.objects.some(o=>o.kind==='enemy'&&o.alive&&physicalDistance(s.areas[h.area],h.x,o.x)<15))return false;
 if(fitPeg(s,ctx))return true;
 // Only a physically present master is discovered here. A person elsewhere is
 // never consulted through the world's actor registry.
 const masters=Object.values(s.people).filter(p=>p.id!==h.lineage&&near(s,h,p)&&siteFor(s,p));
 for(const master of masters){if(collectPeg(s,master,ctx))return true;if(orderPeg(s,master,ctx))return true;}
 const request=p.prostheticRequest,master=request&&s.people[request.master],order=master?.prostheticCraft?.orders[request?.order];
 if(order?.status==='working'&&near(s,h,master)&&s.tick-order.started<=32){h.lastAction='rest';h.energy=Math.min(100,h.energy+2);h.speech='Жду подгонки опоры.';return true;}
 return false;
}

function pendingProsthetic(s,p){const r=p.prostheticRequest,o=r&&s.people[r.master]?.prostheticCraft?.orders[r.order];return o&&(o.status==='working'||o.collected===undefined);}
export function observeProstheticMasters(s,p){if(!prostheticsOn(s)||!p?.alive)return;const b=s.hero?.lineage===p.id?s.hero:p;for(const d of (s.areas[b.area]?.population||[]).map(id=>s.people[id]).filter(Boolean)){if(d.id===p.id||!d.alive||d.agenda?.job!=='artisan'||!near(s,b,d)||!siteFor(s,d))continue;const q=p.prostheticKnowledge ||= {version:1,known:[]},old=q.known.find(n=>n.person===d.id),entry={person:d.id,area:d.area,x:d.x,seen:s.tick,source:'meeting',witness:p.id,missingAt:null};if(old)Object.assign(old,entry);else{q.known.push(entry);if(q.known.length>8)q.known.shift();}}}

function restForProsthetic(s,p){if(p.prostheticCraft?.lastActionTick>=s.tick||!siteFor(s,p)||p.needs.energy>=35||p.health<(p.maxHealth||100)*.75||p.needs.hunger>=55||p.needs.sleeping||s.areas[p.area].objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(s.areas[p.area],p.x,e.x)<=15))return false;p.needs.energy=Math.min(100,p.needs.energy+6);p.prostheticCraft.lastActionTick=s.tick;return true;}
