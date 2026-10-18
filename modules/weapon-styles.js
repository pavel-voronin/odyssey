import {enabled} from '../rules.js';
import {profile} from './common.js';
import {itemWorking} from './item-condition.js';

export const WEAPON_STYLES={quick:{name:'Короткий удар',energy:2},heavy:{name:'Подготовленный удар',energy:3}};
export const weaponStylesOn=s=>enabled(s,'weapon-styles')&&enabled(s,'equipment')&&enabled(s,'identity');
export function itemStyle(item){return itemWorking(item)&&item.weaponStyle?.version===1&&item.slot==='weapon'&&item.stat==='attack'&&({blade:'quick',axe:'heavy'}[item.base])===item.weaponStyle.id?item.weaponStyle.id:null;}
export function markNewWeapon(s,item){if(weaponStylesOn(s)&&item.slot==='weapon'&&item.stat==='attack'&&['blade','axe'].includes(item.base))item.weaponStyle={version:1,id:item.base==='blade'?'quick':'heavy'};}
const person=s=>s.people[s.hero.lineage];
export function weaponKnowledge(s,id=itemStyle(s.hero.equipment?.weapon)){
 return weaponStylesOn(s)&&id?person(s)?.weaponPractice?.methods?.[id]||null:null;
}
export function rememberWeaponRole(s){
 const h=s.hero,id=itemStyle(h.equipment?.weapon),p=person(s);
 if(!weaponStylesOn(s)||!h.alive||!p?.alive||!id||profile(h).skill!=='physical')return;
 const state=p.weaponPractice ||= {methods:{},operations:[],total:0,observed:{}};
 state.methods[id] ||= {origin:'role',source:'profession/'+h.profession,recordedAt:s.tick};
}
export function recordWeaponHit(s,e,damage,before){
 const h=s.hero,item=h.equipment?.weapon,id=itemStyle(item),p=person(s);
 if(!weaponStylesOn(s)||!h.alive||!p?.alive||!id||!(damage>0)||h.lastAction!=='attack'||h.combat!==e.id||!s.areas[h.area].objects.includes(e)||before-e.hp!==damage)return;
 const state=p.weaponPractice ||= {methods:{},operations:[],total:0,observed:{}};
 if(state.lastTick>=s.tick)return;
 const record={id:`${p.id}/weapon-hit/${s.tick}`,tick:s.tick,area:h.area,enemy:e.id,weapon:item.id,style:id,damage};
 state.operations.push(record);if(state.operations.length>16)state.operations.shift();state.lastTick=s.tick;state.total++;
 state.counts ||= {};state.counts[id]=(state.counts[id]||0)+1;
 if(!state.methods[id]&&state.counts[id]>=3)state.methods[id]={origin:'practice',learnedAt:s.tick,source:state.operations.filter(o=>o.style===id).slice(-3).map(o=>o.id)};
}
export function observeWeaponReply(s,e,phase){
 const p=person(s),h=s.hero;
 if(!weaponStylesOn(s)||!p?.alive||!h.alive||!itemStyle(h.equipment?.weapon)||!enabled(s,'tactics')||!['warden','charged'].includes(e.tactic))return;
 const state=p.weaponPractice ||= {methods:{},operations:[],total:0,observed:{}};
 const old=state.observed[e.id],phases=[...new Set([...(old?.area===h.area&&old.tactic===e.tactic?old.phases:[]),e.battle.intent])];
 state.observed[e.id]={area:h.area,tactic:e.tactic,tick:s.tick,turn:e.battle.turns,phases,from:phase,to:e.battle.intent};
 const entries=Object.entries(state.observed).sort((a,b)=>a[1].tick-b[1].tick);for(const [id]of entries.slice(0,Math.max(0,entries.length-16)))delete state.observed[id];
}
export function knownWeaponCycle(s,e){
 const o=person(s)?.weaponPractice?.observed?.[e.id];
 return weaponStylesOn(s)&&enabled(s,'tactics')&&o?.area===s.hero.area&&o.tactic===e.tactic&&o.turn===e.battle?.turns&&o.to===e.battle?.intent&&s.tick-o.tick<=1&&s.tick>=o.tick&&o.phases.includes('guard')&&o.phases.includes('strike');
}
export function styleDamage(amount,style){return style==='quick'?Math.max(1,Math.floor(amount*.75)):style==='heavy'?2*Math.max(1,Math.floor(amount*.75)):amount;}
export function readyWeapon(s,e){
 const h=s.hero,p=h.weaponWindup;
 return Boolean(weaponStylesOn(s)&&h.alive&&!h.life?.ended&&person(s)?.alive&&person(s)?.status!=='captive'&&e?.alive&&!e.resolved&&!h.transit&&h.combat===e.id&&p?.enemy===e.id&&p.actor===h.lineage&&p.area===h.area&&p.weapon===h.equipment?.weapon?.id&&itemStyle(h.equipment.weapon)==='heavy'&&weaponKnowledge(s,'heavy')&&p.started+1===s.tick&&h.energy>=3);
}
export function cancelWeapon(s,reason){
 const h=s.hero,p=h.weaponWindup;if(!p)return;
 h.weaponLast={...p,status:'cancelled',ended:s.tick,reason};delete h.weaponWindup;
}
export function weaponTick(s){
 const h=s.hero,p=h.weaponWindup;if(!p)return;
 const e=s.areas[h.area]?.objects.find(o=>o.id===h.combat);
 if(!readyWeapon(s,e))cancelWeapon(s,'Условия подготовки изменились.');
}
export function beginWeapon(s,e,ctx){
 const h=s.hero;if(!weaponStylesOn(s)||!h.alive||h.combat!==e.id||!e.alive||e.resolved||h.transit||h.energy<5||!weaponKnowledge(s,'heavy')||itemStyle(h.equipment.weapon)!=='heavy')return false;
 if(h.weaponWindup||h.weaponLast?.started===s.tick)return false;
 h.energy-=2;h.weaponWindup={actor:h.lineage,enemy:e.id,area:h.area,weapon:h.equipment.weapon.id,started:s.tick,energy:2};
 h.lastAction='windup';h.intent='Подготовить сильный удар';h.speech='Не торопиться с размахом.';
 ctx.log(s,'Он готовит сильный удар и тратит силы. Противник не станет ждать.','combat');return true;
}
export function finishWeapon(s,e,style){
 const h=s.hero;if(style==='heavy'){
  if(!readyWeapon(s,e))return false;
  h.weaponLast={...h.weaponWindup,status:'released',ended:s.tick};delete h.weaponWindup;
 }else if(style!=='quick'||!weaponKnowledge(s,'quick')||itemStyle(h.equipment.weapon)!=='quick'||h.energy<2)return false;
 h.weaponStrike={tick:s.tick,enemy:e.id,style};return true;
}
export function weaponAcquisitionValue(s,item){
 const id=itemStyle(item);if(!weaponStylesOn(s)||!id||!weaponKnowledge(s,id))return 0;
 // One acquisition assessment only. Familiar untyped equipment stays usable.
 return id==='quick'&&s.hero.energy<40?.6:id==='heavy'&&s.hero.energy>=40&&s.hero.personality.courage>.6?.4:0;
}
export function weaponDescription(s,item){
 const id=itemStyle(item);if(!id)return '';
 return `${WEAPON_STYLES[id].name}: ${id==='quick'?'меньше урон, 2 силы за удар':'действие и 2 силы на подготовку, затем 3 силы на удар; враг отвечает во время подготовки'}.${weaponStylesOn(s)?weaponKnowledge(s,id)?' Приём знаком.':' Пока использует обычный удар; учится на настоящих попаданиях.':' Приёмы отключены.'}`;
}
