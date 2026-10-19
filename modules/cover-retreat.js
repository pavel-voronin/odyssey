import {physicalDistance,areaOffset} from '../geometry.js';
import {npcAction,npcController} from './npc-control.js';
import {partyBodySpent} from './party-combat-policy.js';
import {woundActivity,woundImpairment} from './wound-state.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {retreatOn,retreatBody,meleeThreat,unlockRetreat,creditProtection} from './cover-retreat-state.js';
export function retreatDrill(s,ctx={}){
 const h=s.hero;if(!retreatOn(s)||!h.alive||h.transit||h.combat||h.goal?.kind!=='rest'||h.hp<h.maxHp*.75||h.energy<40||h.hunger>=55||h.personality.generosity<.4||s.areas[h.area].objects.some(e=>e.kind==='enemy'&&e.alive&&!e.resolved&&physicalDistance(s.areas[h.area],e.x,h.x)<28))return false;
 const c=h.companions.find(c=>{const p=s.people[c.person],q=p?.skillPractice?.combat;return q?.total===2&&!q.instruction&&!partyBodySpent(s,p)&&p.alive&&p.area===h.area&&physicalDistance(s.areas[h.area],p.x,h.x)<=6&&p.health>=(p.maxHealth||100)*.8&&p.needs.energy>=40&&!p.needs.sleeping&&p.needs.hunger<55&&c.loyalty>=45&&(p.agenda.duty??0)>=.55&&(p.agenda.sociability??.5)>=.3&&woundImpairment(s,p,'leg')<.3&&npcController(s,p)==='party';});if(!c)return false;
 const p=s.people[c.person];if(!npcAction(s,p,'party','retreat-drill'))return false;const q=p.skillPractice.combat;
 q.instruction={id:p.id+'/retreat-drill/'+s.tick,at:s.tick,area:h.area,partner:h.lineage,energy:2};p.retreatDrillTick=s.tick;p.needs.energy-=2;h.energy-=2;h.lastAction='talk';unlockRetreat(s,p);ctx.log?.(s,p.name+' добровольно отрабатывает с партнёром отход за спину прикрывающего. Две настоящие защиты получили свой способ: прикрывающий отход.','skill');return true;
}
export function stopRetreat(s,reason){const r=s.hero.coverRetreat;if(r?.status==='active'){r.status='ended';r.ended=s.tick;r.reason=reason;}}
export function retreatTick(s){const h=s.hero,r=h.coverRetreat;if(r?.status!=='active')return;const p=s.people[r.guard],e=s.areas[r.area]?.objects.find(e=>e.id===r.enemy),c=h.companions.find(c=>c.person===r.guard),target=r.kind==='convoy'?s.people[s.logistics.convoys.find(c=>c.id===r.target)?.person]:h;if(!retreatOn(s)||!h.alive||h.transit||h.area!==r.area||!p?.alive||!c||p.area!==r.area||r.lastGuardTick<s.tick-1||!meleeThreat(s,e,p)||!target||target.area!==r.area||physicalDistance(s.areas[r.area],target.x,p.x)>12||!retreatBody(s,p,c,e))stopRetreat(s,'Позиция, цель или безопасное состояние больше не удерживаются.');}
export function coveredRetreat(s,e,ctx){
 const h=s.hero;if(!retreatOn(s)||!h.alive||h.transit||h.combat!==e?.id||!e.alive||e.resolved||e.hidden)return false;
 let r=h.coverRetreat?.status==='active'?h.coverRetreat:null;
 const c=h.companions.find(c=>{const p=s.people[c.person];return (!r||r.guard===p?.id)&&knowsPracticalMethod(s,p?.id,'combat')&&npcController(s,p)==='party'&&!partyBodySpent(s,p)&&p.area===h.area&&retreatBody(s,p,c,e)&&physicalDistance(s.areas[h.area],p.x,e.x)<=6;});if(!c)return false;const p=s.people[c.person],a=s.areas[h.area];
 const convoy=r?.kind==='convoy'?s.logistics.convoys.find(c=>c.id===r.target):!r&&s.logistics.convoys.find(c=>c.escort===h.lineage&&s.people[c.person]?.area===h.area&&!s.people[c.person].roadTransit&&physicalDistance(a,s.people[c.person].x,h.x)<=12);
 const target=convoy?s.people[convoy.person]:h,direction=r?.direction||Math.sign(target.x-e.x)||Math.sign(p.x-e.x)||h.facing||1,anchor=e.x+areaOffset(a,2)*direction;
 if(anchor<0||anchor>100||physicalDistance(a,p.x,anchor)>3||!meleeThreat(s,e,{...p,x:anchor})||target!==h&&Math.sign(convoy.endX-target.x)!==direction)return false;
 if(!npcAction(s,p,'party','combat'))return false;
 p.x=anchor;p.needs.energy-=7;woundActivity(s,p,'leg');
 if(!r){r=h.coverRetreat={version:1,id:p.id+'/withdrawal/'+s.tick,area:h.area,enemy:e.id,guard:p.id,target:convoy?.id||h.lineage,kind:convoy?'convoy':'actor',direction,started:s.tick,lastGuardTick:s.tick,status:'active',guardX:anchor,steps:0};if(convoy)convoy.coverWithdrawal={leader:h.lineage,id:r.id};}
 r.lastGuardTick=s.tick;r.guardX=anchor;r.steps++;
 p.partyCombat={version:1,tick:s.tick,enemy:e.id,leader:h.lineage,action:'cover',target:h.lineage,energy:7,medicine:0,healed:0,damage:0,intercepted:0,reason:'Удерживает ближнюю позицию для настоящего отхода вместо атаки/лечения.'};
 const round=h.partyCombat={version:1,tick:s.tick,enemy:e.id,people:[p.id],guard:p.id,replied:true,absorbed:0,withdrawal:r.id};
 // The existing reply receives this real defender as its target. No hero armor,
 // borrowed magic or second response protects the guard's own body.
 const raw=meleeThreat(s,e,p)?ctx.replyGuard(s,e,p):0,before=c.hp;if(raw>0&&meleeThreat(s,e,p)){ctx.hurtCompanion(s,c,raw,ctx,e.id);const actual=before-c.hp;round.absorbed=actual;p.partyCombat.intercepted=actual;creditProtection(s,e,c,before,c.hp,actual);}
 ctx.stepAway(s,Math.min(100,Math.max(0,h.x+areaOffset(a,6)*direction)));h.lastAction='flee';h.intent='Отойти под прикрытием';h.reason=p.name+' держит позицию своим ходом и принимает собственный риск.';
 ctx.log?.(s,p.name+' прикрывает отход: свой ход, силы и настоящий ответ противника. Путник отходит своим шагом.','guard');
 if(!p.alive||c.hp<=0)stopRetreat(s,'Прикрывающий погиб.');else if(physicalDistance(a,h.x,p.x)>12&&r.kind==='actor')stopRetreat(s,'Союзник вышел из ближней опасности.');
 if(r.status!=='active'){h.combat=null;h.goal=null;}return true;
}
