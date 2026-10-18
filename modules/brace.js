import {enabled} from '../rules.js';
import {profile,stat} from './common.js';
import {itemBonus} from './inventory.js';
import {legacyArmorDefense} from './armor.js';
const on=s=>enabled(s,'brace');
export const BRACE_ENERGY=8;
export function noticeCharge(s,e){
 if(!on(s)||!s.hero.alive||s.hero.combat!==e.id||e.tactic!=='charged'||e.battle?.intent!=='strike')return;
 const m=s.hero.defenseMemory ||= {warnings:{},braces:0};m.warnings[e.id]={enemy:e.id,area:s.hero.area,turn:e.battle.turns,seen:s.tick};
 const entries=Object.entries(m.warnings).sort((a,b)=>a[1].seen-b[1].seen);for(const [id]of entries.slice(0,Math.max(0,entries.length-32)))delete m.warnings[id];
}
export function braceAvailable(s,e){
 const h=s.hero,w=h.defenseMemory?.warnings?.[e.id];return Boolean(on(s)&&enabled(s,'tactics')&&h.alive&&!h.transit&&h.combat===e.id&&h.energy>=BRACE_ENERGY&&h.defenseMemory?.lastBrace?.tick!==s.tick&&e.alive&&e.tactic==='charged'&&e.battle?.intent==='strike'&&w?.enemy===e.id&&w.area===h.area&&w.turn===e.battle.turns&&s.tick-w.seen<=1&&s.tick>=w.seen);
}
export function braceStrength(s){const h=s.hero;return Math.min(.65,.3+(profile(h).skill==='physical'?.12:0)+Math.min(.15,(itemBonus(h,'defense')+legacyArmorDefense(h))*.02)+Math.min(.08,Math.max(0,stat(h,'might')-1)*.01));}
export function braceDamage(s,e,damage,{preview=false}={}){
 if(!on(s)||damage<=0)return damage;const frame=s.hero.defenseMemory?.lastBrace,strength=preview?braceStrength(s):frame?.tick===s.tick&&frame.enemy===e.id?frame.strength:0;return strength?Math.max(1,Math.ceil(damage*(1-strength))):damage;
}
export function performBrace(s,e,ctx){
 if(!braceAvailable(s,e))return false;const h=s.hero,m=h.defenseMemory;h.energy-=BRACE_ENERGY;m.braces++;m.lastBrace={tick:s.tick,enemy:e.id,strength:braceStrength(s),energy:BRACE_ENERGY,sourceTurn:e.battle.turns};h.lastAction='guard';h.speech='Выдержать размах.';h.intent='Прикрыться от размаха';ctx.log(s,'Он тратит силы на заслон. Противник всё равно нанесёт подготовленный удар.','guard');return true;
}
