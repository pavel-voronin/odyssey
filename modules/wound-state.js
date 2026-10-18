import {enabled} from '../rules.js';
import {RACES} from '../content.js';

const human=[['head','голова','head'],['torso','туловище','body'],['leftArm','левая рука','arm'],['rightArm','правая рука','arm'],['leftLeg','левая нога','leg'],['rightLeg','правая нога','leg']];
export function woundParts(p){
 let parts=!RACES.some(r=>r.id===p?.race)?[['surface','поверхность тела','body']]:p.race==='automaton'?[['core','ядро','head'],['plating','обшивка','body'],['leftTool','левый манипулятор','arm'],['rightTool','правый манипулятор','arm'],['leftDrive','левый привод','leg'],['rightDrive','правый привод','leg']]:p.race==='myconid'?[['cap','шляпка','head'],['stem','ножка','body'],['leftTendril','левый отросток','arm'],['rightTendril','правый отросток','arm'],['roots','корневое основание','leg']]:human;
 return parts.filter(([id])=>!p.anatomy?.missing?.includes(id)&&(!Array.isArray(p.anatomy?.parts)||p.anatomy.parts.includes(id)));
}
export function woundActor(s,p){const h=s.hero.lineage===p?.id?s.hero:s.actorStates?.[p?.id];return h?.alive&&!h.life?.ended&&h.actorMode!=='npc'?h:null;}
export function woundImpairment(s,p,role){
 if(!enabled(s,'local-wounds'))return 0;
 return Math.min(.85,(p?.localWounds?.active||[]).filter(w=>w.role===role).reduce((n,w)=>Math.max(n,w.lastHit===s.tick?w.effectBefore:w.severity/3*(1-w.function/100)),0));
}
export const woundStride=(s,p=s.people[s.hero.lineage])=>1-.55*woundImpairment(s,p,'leg');
export const woundForce=(s,p=s.people[s.hero.lineage])=>1-.6*woundImpairment(s,p,'arm');
export const woundFocus=(s,p=s.people[s.hero.lineage])=>woundImpairment(s,p,'head')<.65;
export function woundActivity(s,p,role,rest=false){const t=p?.localWounds;if(t&&enabled(s,'local-wounds'))t.activity={tick:s.tick,role,rest};}
export function woundSummary(p){return (p?.localWounds?.active||[]).map(w=>`${w.kind==='cut'?'Порез':'Ушиб'}: ${w.label}, тяжесть ${w.severity}; ${w.closure<100?'закрытие '+w.closure+'%':'закрыт'}, функция ${w.function}%${w.bleed>0?' · кровоточит':''}${w.dressing?' · '+(w.dressing.remaining>4?'повязка '+w.dressing.remaining+'/'+w.dressing.quality:'повязку нужно сменить'):''}`).join('; ');}
