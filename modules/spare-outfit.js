import {enabled} from '../rules.js';import {physicalDistance} from '../geometry.js';
import {armorChoice,armorEffect} from './armor.js';import {itemWorking} from './item-condition.js';import {actorItemLocation} from './item-originals.js';import {packView} from './container-state.js';
export const spareOutfitEnabled=s=>enabled(s,'spare-outfit')&&enabled(s,'armor-balance')&&enabled(s,'equipment');
export function reserveArmor(s){
 if(!spareOutfitEnabled(s))return null;const h=s.hero,current=armorEffect(s,h.equipment.armor);if(!current)return null;let best=null,score=-Infinity;
 for(const i of h.bag){const e=armorEffect(s,i);if(!e||!itemWorking(i)||enabled(s,'enchantments')&&i.modifier==='curse'||Boolean(e.walkExtra)===Boolean(current.walkExtra))continue;if(e.defense>score||e.defense===score&&String(i.id)<String(best?.id)){best=i;score=e.defense;}}return best;
}
export function spareNeedsMoney(s,ctx){if(!spareOutfitEnabled(s))return false;if(ctx?.spareNeedsMoney)return ctx.spareNeedsMoney(s,ctx);const h=s.hero,p=s.people[h.lineage];return h.gold<4&&(h.hp<h.maxHp*.5||h.hunger>55&&!h.inventory.rations&&!(p.roadSupplies?.food>0)&&!Object.values(p.localFood?.stock||{}).some(n=>n>0));}
export function refreshReserve(s){
 if(!spareOutfitEnabled(s))return;const h=s.hero,reserve=reserveArmor(s);if(!reserve&&!h.wardrobe)return;const q=h.wardrobe ||= {version:1,reserve:null,revision:0,checked:null,lastActionTick:-1,history:[]};q.reserve=reserve?.id||null;q.revision++;q.checked=null;
}
function knownHunt(s,g){const h=s.hero,a=s.areas[h.area];if(g.kind!=='hunt')return null;
 const visible=g.area===h.area&&a.objects.find(e=>e.id===g.object&&e.kind==='enemy'&&e.alive&&!e.hidden&&!e.resolved&&physicalDistance(a,h.x,e.x)<=30);
 if(visible)return {kind:'visible',id:g.object,seen:s.tick};const remembered=s.people[h.lineage]?.bestiary?.species.flatMap(k=>k.encounters).find(r=>r.enemy===g.object)||h.memory.threats?.[g.object]||h.commitments?.memories?.find(m=>m.kind==='retreat'&&m.enemy===g.object);return remembered?{kind:'remembered',id:g.object,seen:remembered.lastSeen??remembered.seen??null}:null;
}
export function changeSpareOutfit(s,ctx){
 if(!spareOutfitEnabled(s))return false;const h=s.hero,g=h.goal,a=s.areas[h.area];if(!s.areas[g?.area]||!Number.isFinite(g?.x)||!h.alive||h.actorMode==='npc'||!g||h.transit||h.combat||h.energy<8||h.hunger>75||h.hp<h.maxHp*.48||h.wardrobe?.lastActionTick>=s.tick)return false;
 if(!['hunt','explore','work','travel','factionDuty','collect','turnin'].includes(g.kind))return false;
 if(a.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.hidden&&!e.resolved&&physicalDistance(a,h.x,e.x)<=12))return false;
 const proof=knownHunt(s,g);if(g.kind==='hunt'&&!proof)return false;
 const current=h.equipment.armor;if(!current)return false;
 const key=[g.kind,g.area,g.object||'',g.started??'',h.area,Math.floor(h.energy/25),Math.floor(h.hp/h.maxHp*4),g.area===h.area?Math.floor(physicalDistance(a,h.x,g.x)/36):'road',proof?.kind||'',proof?.kind==='remembered'?proof.seen:'',h.atlas?.known.length||0,h.atlas?.roads.length||0,current.id,h.wardrobe?.revision||0].join('/');if(h.wardrobe?.checked===key)return false;
 const candidate=reserveArmor(s);if(!candidate)return false;
 const q=h.wardrobe ||= {version:1,reserve:candidate.id,revision:0,checked:null,lastActionTick:-1,history:[]};q.checked=key;
 const next=armorChoice(s,candidate,ctx),old=armorChoice(s,current,ctx);if(!next||!old||next.value-old.value<.75||g.kind!=='hunt'&&(next.walkExtra||next.walks<12))return false;
 const bag=[...h.bag];bag.splice(bag.indexOf(candidate),1);bag.push(current);if(packView(s,h.lineage,{items:bag}).used>Math.max(packView(s).capacity,packView(s).used)||!h.bag.includes(candidate))return false;
 h.bag.splice(h.bag.indexOf(candidate),1);h.bag.push(current);h.equipment.armor=candidate;actorItemLocation(s,current);actorItemLocation(s,candidate);h.energy-=2;h.lastAction='equipment';
 const cause=proof?'Перед известным противником важнее защита.':'Перед известной дальней дорогой важнее сберечь силы.';q.lastActionTick=s.tick;q.history.push({tick:s.tick,area:h.area,from:current.id,to:candidate.id,goal:g.kind,target:g.area,proof:proof||{kind:'known-route',id:g.area},reason:cause});if(q.history.length>8)q.history.shift();refreshReserve(s);h.speech=cause;ctx?.log?.(s,h.name+' переодевается: '+candidate.name+'. '+cause,'equipment');return true;
}
