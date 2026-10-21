import {wildGrazer} from './ecology-state.js';
import {lightToolHeld} from './prosthetic-state.js';
import {canHoldWeapon} from './limb-state.js';
import {enabled} from '../rules.js';
import {authorityBody} from './authority-state.js';
import {physicalDistance} from '../geometry.js';
import {collectionItems} from './collection-state.js';
import {itemWorking} from './item-condition.js';
import {npcController,canStartNPCActivity} from './npc-control.js';
import {bodyRemains} from './remains.js';
export const meatOn=s=>['game-meat','supply','equipment','remains','remains-cycle'].every(k=>enabled(s,k));
export const meatBody=(s,p)=>p&&authorityBody(s,p.id);
export const meatBag=(s,p)=>s.actorStates?.[p.id]?.bag||(s.hero?.lineage===p.id?s.hero.bag:p.looseItems ||= []);
export const knowsGameMeat=(s,p)=>meatOn(s)&&Boolean(p?.meatCraft?.knowledge||p?.foodKitBirth?.source==='profession/ranger');
export const meatMemory=p=>p.meatCraft ||= {version:1,knowledge:null,lastAction:-1,prey:[],bodies:[],hearths:[],depots:[],refusals:[],pending:null};
export function birthMeatKnowledge(s,p,h=null,{newborn=false}={}){if(!newborn||!meatOn(s)||!p?.alive||p.role==='ребёнок'||p.meatCraft||!h&&p.role==='герой')return false;if(h?h.profession!=='ranger':p.agenda?.job!=='farmer')return false;meatMemory(p).knowledge={kind:'initial',source:h?'profession/ranger':'occupation/farmer',at:s.tick};return true;}
export function meatKnife(s,p){const kit=p.localFood?.tools.knife;return collectionItems(s,p.id).find(i=>i.toolKind==='knife'&&itemWorking(i)&&lightToolHeld(p,i))||(lightToolHeld(p,kit)&&kit?.owner===p.id&&kit.state==='working'&&itemWorking(kit)?kit:null);}
export function meatReady(s,p){const b=meatBody(s,p);return Boolean(meatOn(s)&&p?.alive&&b&&!b.transit&&!b.combat&&!b.carriedBy&&!p.roadTransit&&!p.fordCrossing&&!p.liftTransit&&!p.ferryDuty&&!p.ferryTicket&&!p.needs.sleeping&&!p.ailment&&(b.lineage?b.hp>=b.maxHp*.5&&b.energy>=12:b.health>=(b.maxHealth||100)*.5&&p.needs.energy>=12)&&(!b.lineage?npcController(s,p)==='personal':b===s.hero));}
export function meatCanAct(s,p,{inTurn=false,need=false}={}){const b=meatBody(s,p),q=p?.meatCraft;return meatReady(s,p)&&q?.lastAction!==s.tick&&(b.lineage?b===s.hero:inTurn&&(s.rules['npc-control']===false||p.actionControl?.tick===s.tick&&p.actionControl.owner==='personal'&&p.actionControl.phases.every(x=>['act',...(need?['need']:[])].includes(x))&&(!need?canStartNPCActivity(s,p,{inTurn:true}):true)));}
export function meatSpend(s,p,cost=1){const q=meatMemory(p),b=meatBody(s,p);q.lastAction=s.tick;if(!q.knowledge&&p.foodKitBirth?.source==='profession/ranger')q.knowledge={kind:'initial-kit',source:'profession/ranger',birthAt:p.foodKitBirth.tick,at:s.tick};if(b.lineage){b.energy=Math.max(0,b.energy-cost);b.lastAction='work';}else p.needs.energy=Math.max(0,p.needs.energy-cost);}
export const meatNear=(s,p,area,x,gap=2)=>{const b=meatBody(s,p);return b?.area===area&&physicalDistance(s.areas[area],b.x,x)<=gap;};
export function gameBody(s,b){if(!b||bodyRemains(s,b.id)!==b||b.source.kind!=='enemy'||!['deer','wolf'].includes(b.death.species)||!b.substance||b.substance.kind!=='animal')return false;return Object.values(s.areas).some(a=>a.objects.some(e=>e.id===b.source.id&&e.ecology&&e.species===b.death.species));}
export const rawMeat=(s,p)=>meatBag(s,p).find(i=>i.kind==='rawMeat'&&i.meat?.owner===p.id&&i.meat.expires>s.tick&&i.meat.state==='raw');
export const fuelWood=(s,p)=>meatBag(s,p).find(i=>i.kind==='meatFuel'&&i.physical?.holder.kind==='person'&&i.physical.holder.id===p.id);

export function meatSafe(s,p,gap=18){const b=meatBody(s,p),a=s.areas[b?.area];return Boolean(a&&!a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&!wildGrazer(e)&&physicalDistance(a,b.x,e.x)<=gap));}
