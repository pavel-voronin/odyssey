import {RACES} from '../content.js';
export const boneBody=p=>p?.returnEpisode?.form==='skeleton';
const human=[['head','голова','head'],['torso','туловище','body'],['leftArm','левая рука','arm'],['rightArm','правая рука','arm'],['leftLeg','левая нога','leg'],['rightLeg','правая нога','leg']];
export function bodyParts(p){
 const unknown=p?.anatomy?.form&&!['humanoid','biped',p.race].includes(p.anatomy.form)||p?.anatomy?.missing!==undefined&&!Array.isArray(p.anatomy.missing)||p?.anatomy?.parts!==undefined&&!Array.isArray(p.anatomy.parts);
 const parts=unknown||!RACES.some(r=>r.id===p?.race)?[['surface','поверхность тела','body']]:p.race==='automaton'?[['core','ядро','head'],['plating','обшивка','body'],['leftTool','левый манипулятор','arm'],['rightTool','правый манипулятор','arm'],['leftDrive','левый привод','leg'],['rightDrive','правый привод','leg']]:p.race==='myconid'?[['cap','шляпка','head'],['stem','ножка','body'],['leftTendril','левый отросток','arm'],['rightTendril','правый отросток','arm'],['roots','корневое основание','leg']]:human;
 return parts.filter(([id])=>!Array.isArray(p?.anatomy?.parts)||p?.anatomy.parts.includes(id));
}
export function presentParts(p){return bodyParts(p).filter(([id])=>!(Array.isArray(p?.anatomy?.missing)&&p.anatomy.missing.includes(id)));}
