import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {assetStore,assetOwner} from './asset-risk-state.js';
import {marketWallet} from './market.js';
import {setActorMoney} from '../actor-projection.js';
import {carriedFood,consumeCarriedSupplies} from './stores.js';
import {canStartNPCActivity,npcController} from './npc-control.js';
import {localContact} from './npc-contacts.js';
import {walkCampOrder} from './camp-route.js';
import {woundActivity} from './wound-state.js';
const owned=(s,o)=>assetStore(o)&&assetOwner(o)===s.hero.lineage;
const guardReady=(s,p)=>p?.alive&&p.role!=='ребёнок'&&p.agenda?.job==='guard'&&npcController(s,p)==='personal'&&canStartNPCActivity(s,p)&&!p.agenda.task&&(!p.storeWatch||p.storeWatch.until<=s.tick||p.storeWatch.owner===s.hero.lineage)&&!p.needs.sleeping&&p.needs.energy>=35&&p.needs.hunger<60&&!p.ailment&&p.health>=(p.maxHealth||100)*.75&&(p.agenda.duty||0)>=.5;
function candidate(s){const h=s.hero,a=s.areas[h.area];return Object.values(s.people).filter(p=>p.id!==h.lineage&&p.area===h.area&&guardReady(s,p)&&physicalDistance(a,h.x,p.x)<=9).sort((a,b)=>Number(Boolean(b.storeWatch))-Number(Boolean(a.storeWatch))||a.id.localeCompare(b.id))[0]||null;}
function localStore(s,id){const a=s.areas[s.hero.area],o=a.objects.find(o=>o.id===id);return o&&owned(s,o)&&!s.hero.transit&&physicalDistance(a,s.hero.x,o.x)<=18?o:null;}
export function assetDefensePlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!enabled(s,'asset-risk')||!h.alive||h.transit||h.combat||h.energy<20)return false;
 const a=s.areas[h.area],o=a.objects.find(o=>owned(s,o)&&physicalDistance(a,h.x,o.x)<=18&&(o.food>=4||o.stockade?.progress<3)&&(p.assetWarnings||[]).some(w=>w.object===o.id&&s.tick-w.at<=96));if(!o)return false;
 const watching=Object.values(s.people).some(q=>q.alive&&q.storeWatch?.object===o.id&&q.storeWatch.until>s.tick);
 if(watching||o.stockade?.current>0)return false;
 const guard=candidate(s),old=p.assetDefenseAttempt;
 if(old?.object===o.id&&old.until>s.tick)return false;
 if(guard&&h.gold>=24&&carriedFood(p,h.inventory)>=2&&(!ctx.maySpend||ctx.maySpend(s,'guard',4,ctx))){ctx.goal(s,'assetHire',h.area,guard.x,'Нанять охрану припасов','Четыре монеты и две собственные порции оплачивают ограниченную службу у одного конкретного груза.',{object:o.id,person:guard.id});return true;}
 if(p.goodsRawCargo?.quantity>=2&&(p.marketCargo?.tools||0)>=1||o.stockade&&o.stockade.progress<3){ctx.goal(s,'assetFortify',h.area,o.x,'Укрепить вход к припасам','Две собственные заготовки и инструмент, затем три действия работы. Материалы и труд настоящие.',{object:o.id});return true;}
 ctx.goal(s,'assetEvacuate',h.area,o.x,'Перенести доступные припасы','Охранника и материалов сейчас нет. Он переносит только то, что помещается в собственную поклажу.',{object:o.id});return true;
}
export function hireStoreGuard(s,ctx){
 const h=s.hero,g=h.goal,o=s.areas[h.area].objects.find(o=>o.id===g?.object&&o.kind==='supplyCache'&&assetOwner(o)===h.lineage),p=s.people[g?.person],owner=s.people[h.lineage];h.goal=null;
 if(!enabled(s,'asset-risk')||!o||p?.storeWatch?.object===o.id&&p.storeWatch.until>s.tick||!guardReady(s,p)||p.area!==h.area||physicalDistance(s.areas[h.area],h.x,p.x)>9||h.gold<24||carriedFood(owner,h.inventory)<2||ctx.maySpend&&!ctx.maySpend(s,'guard',4,ctx))return false;
 const before=marketWallet(s,p.id),foodBefore=carriedFood(owner,h.inventory);if(!consumeCarriedSupplies(owner,null,'food',2))return false;setActorMoney(s,owner,h.gold-4);setActorMoney(s,p,before+4);p.roadSupplies ||= {food:0,medicine:0};p.roadSupplies.food+=2;
 const prior=p.storeWatch;if(prior){p.storeWatchHistory ||= [];p.storeWatchHistory.push({area:prior.area,object:prior.object,started:prior.started,ended:s.tick,reason:'reassigned'});if(p.storeWatchHistory.length>8)p.storeWatchHistory.shift();}
 p.storeWatch={version:1,owner:h.lineage,area:h.area,object:o.id,started:s.tick,until:s.tick+96,wage:4,food:2,walletBefore:before,walletAfter:before+4,foodBefore,foodAfter:foodBefore-2,lastTick:-1};p.agenda.task=null;p.productionTalkTick=s.tick;h.lastAction='talk';owner.assetDefenseAttempt={object:o.id,at:s.tick,until:s.tick+16};
 ctx.log(s,p.name+' принимает ◈4 и две порции на службу у этих припасов. К другому складу ему придётся идти тем же телом; прежняя плата не повторяется.','orders');return true;
}
export function npcStoreWatch(s,p,ctx){
 const w=p.storeWatch;if(!enabled(s,'asset-risk')||!w||w.until<=s.tick||w.lastTick===s.tick||!canStartNPCActivity(s,p,{inTurn:true})||p.ailment||p.health<(p.maxHealth||100)*.5||p.needs.energy<20)return false;
 const o=s.areas[w.area]?.objects.find(o=>o.id===w.object);if(!o||!assetStore(o)||assetOwner(o)!==w.owner)return false;
 w.lastTick=s.tick;p.storeWatchTick=s.tick;const result=walkCampOrder(s,p,w.area,o.x,ctx,w);p.needs.energy=Math.max(0,p.needs.energy-(result==='arrived'?.5:1));woundActivity(s,p,result==='arrived'?'body':'leg',result==='arrived');return true;
}
export function fortifyStore(s,ctx){
 const h=s.hero,g=h.goal,o=localStore(s,g?.object),p=s.people[h.lineage];if(!enabled(s,'asset-risk')||!o||physicalDistance(s.areas[h.area],h.x,o.x)>1||h.energy<2){h.goal=null;return false;}
 if(!o.stockade){if(p.goodsRawCargo?.quantity<2||(p.marketCargo?.tools||0)<1){h.goal=null;return false;}const raw=p.goodsRawCargo,tools=p.marketCargo.tools;raw.quantity-=2;p.marketCargo.tools--;o.stockade={version:1,by:h.lineage,at:s.tick,progress:0,required:3,current:0,max:2,material:{source:raw.source,rawBefore:raw.quantity+2,rawAfter:raw.quantity,toolsBefore:tools,toolsAfter:tools-1},lastTick:s.tick};h.energy-=2;h.lastAction='work';return true;}
 const f=o.stockade;if(f.progress>=3){h.goal=null;return false;}if(f.lastTick===s.tick)return false;f.lastTick=s.tick;f.progress++;h.energy-=2;h.lastAction='work';woundActivity(s,p,'arm');if(f.progress===3){f.current=2;h.goal=null;ctx.log(s,'Вход к припасам укреплён. Материалы израсходованы, но преграда не заменяет живую охрану.','work');}return true;
}
export function evacuateStore(s,ctx){const h=s.hero,g=h.goal,o=localStore(s,g?.object);h.goal=null;if(!enabled(s,'asset-risk')||!o||physicalDistance(s.areas[h.area],h.x,o.x)>1)return false;const before=(o.food||0)+(o.tools||0)+(o.medicine||0);ctx.recoverCargo?.(s,o,ctx);s.people[h.lineage].assetDefenseAttempt={object:o.id,at:s.tick,until:s.tick+64};h.lastAction='collect';return (o.food||0)+(o.tools||0)+(o.medicine||0)<before;}
