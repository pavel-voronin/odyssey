import {bodyParts} from './anatomy-state.js';
export function missingParts(p,role=null){return bodyParts(p).filter(([id,,r])=>(!role||role===r)&&Array.isArray(p?.anatomy?.missing)&&p.anatomy.missing.includes(id));}
export function limbStride(p){const n=missingParts(p,'leg').length;return !n?1:n>=bodyParts(p).filter(p=>p[2]==='leg').length? .18:.55;}
export function limbForce(p){const n=missingParts(p,'arm').length;return !n?1:n>=bodyParts(p).filter(p=>p[2]==='arm').length? .2:.55;}
export function canHoldWeapon(p){return !missingParts(p,'arm').length||limbForce(p)>.2;}
export function weaponBody(s,h=s.hero){return canHoldWeapon(s.people[h.lineage])?h:{...h,weapon:0,equipment:{...h.equipment,weapon:null}};}
export function limbCanCarry(p){return missingParts(p,'arm').length===0&&bodyParts(p).filter(p=>p[2]==='arm').length>=2;}
export function limbPace(s,p){const h=s.hero.lineage===p?.id?s.hero:s.actorStates?.[p?.id];return Math.min(limbStride(p),...(h?.actorMode!=='npc'?h?.companions||[]:[]).filter(c=>c.person&&s.people[c.person]?.alive).map(c=>limbStride(s.people[c.person])));}
export function limbWorkAllows(p,job){const arms=missingParts(p,'arm').length,legs=missingParts(p,'leg').length;if(job==='dock'&&(arms||legs))return false;if(arms&&['repair','harvest','medicine'].includes(job))return false;return true;}
export function limbLook(p){const lost=missingParts(p),has=id=>lost.some(([part])=>part===id),bits={leftArm:has('leftArm')||has('leftTool')||has('leftTendril'),rightArm:has('rightArm')||has('rightTool')||has('rightTendril'),leftLeg:has('leftLeg')||has('leftDrive')||has('roots'),rightLeg:has('rightLeg')||has('rightDrive')||has('roots')};return Object.values(bits).some(Boolean)?bits:null;}
export function withLimbLook(p,look){const bits=limbLook(p);return bits?{...look,missingLimbs:bits}:look;}
export function limbSummary(p){return missingParts(p).filter(([, ,role])=>['arm','leg'].includes(role)).map(([,label])=>'Утрачено: '+label).join('; ');}

export function adaptNPCWork(s,p){const t=p.agenda?.task;if(!p.limbLosses||!t||!missingParts(p,'arm').length||!['work','farm','toolMend','forgeWork','medicine'].includes(t.kind))return;p.agenda.task={kind:'study',target:p.area,x:p.x,remaining:3};}

