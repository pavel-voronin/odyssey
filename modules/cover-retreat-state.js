import {physicalDistance} from '../geometry.js';
import {skillBranchesEnabled,knowsPracticalMethod} from './skill-branches.js';
import {woundImpairment} from './wound-state.js';
export const retreatOn=s=>skillBranchesEnabled(s)&&s.rules['party-combat']!==false&&s.rules.companions!==false;
export const meleeThreat=(s,e,p)=>e?.alive&&!e.resolved&&!e.hidden&&!['ghost','spirit','angel','notary'].includes(e.species)&&e.attackMode!=='ranged'&&s.areas[p?.area]?.objects.includes(e)&&physicalDistance(s.areas[p.area],e.x,p.x)<=(e.positionAttack?.melee||3)&&(!e.positionAttack||!['shard','approach'].includes(e.positionAttack.last?.kind));
export function retreatBody(s,p,c,e){const charge=s.rules.tactics!==false&&e.tactic==='charged'&&e.battle?.intent==='strike'?3:1;return p?.alive&&c?.hp>0&&p.health>=(p.maxHealth||100)*.65&&!p.needs.sleeping&&p.needs.energy>=35&&p.needs.hunger<65&&c.loyalty>=45&&woundImpairment(s,p,'leg')<.3&&(e.attack+3)*charge<c.hp*.65;}
export function unlockRetreat(s,p){const q=p.skillPractice?.combat;if(retreatOn(s)&&q?.total===2&&q.instruction&&!q.method)q.method={id:'cover-withdrawal',learnedAt:s.tick,origin:'practice',source:q.operations.map(e=>e.id),instruction:q.instruction.id};}
export function creditProtection(s,e,c,before,after,amount){
 const p=s.people[c?.person],a=p?.partyCombat,r=s.hero.partyCombat;if(!retreatOn(s)||!p?.alive||!s.hero.alive||!a||a.tick!==s.tick||a.action!=='cover'||r?.guard!==p.id||!r.replied||a.enemy!==e.id||amount<=0||before-after!==amount||c.hp!==after||!s.areas[p.area]?.objects.includes(e))return;
 const q=(p.skillPractice ||= {}).combat ||= {operations:[],total:0};if(q.total>=2||q.lastTick===s.tick||q.operations.some(r=>r.enemy===e.id))return;
 const event={id:p.id+'/protection/'+e.id,tick:s.tick,area:p.area,enemy:e.id,target:s.hero.lineage,before,after,amount};a.protection=event;q.operations.push(event);q.total++;q.lastTick=s.tick;unlockRetreat(s,p);
}
export function withdrawalCover(s,c,enemy=null){const proof=c.coverWithdrawal,h=proof&&(s.hero.lineage===proof.leader?s.hero:s.actorStates[proof.leader]),r=h?.coverRetreat,p=r&&s.people[r.guard],driver=s.people[c.person];if(!retreatOn(s)||!h?.alive||!p?.alive||r?.id!==proof?.id||r.status!=='active'||r.target!==c.id||r.kind!=='convoy'||r.lastGuardTick<s.tick-1||driver?.area!==r.area||p.area!==r.area||physicalDistance(s.areas[r.area],p.x,driver.x)>12||!knowsPracticalMethod(s,p.id,'combat'))return false;
 const e=s.areas[r.area].objects.find(e=>e.id===r.enemy);return p.needs.energy>0&&!p.needs.sleeping&&woundImpairment(s,p,'leg')<.3&&(!enemy||enemy===e)&&meleeThreat(s,e,p)&&(driver.x-p.x)*(p.x-e.x)>=0&&Math.sign(c.endX-driver.x)===r.direction;
}
