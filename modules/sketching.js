import {enabled} from '../rules.js';
import {hasHabit} from './common.js';
import {safeCampActivity,reserveCampActivity,campActivityAvailable} from './camp-session.js';
export function initializeSketching(h,newHero=false){
  if(h.sketchbook)return;
  const interest=h.personality.curiosity>=.65&&(hasHabit(h,'diary')||h.profession==='scholar');
  h.sketchbook={interest,paper:newHero&&interest?3:0,practice:0,pending:null,works:{}};
}
export function sketchingTick(s,ctx){
  if(!enabled(s,'sketching'))return;
  const h=s.hero,p=h.sketchbook.pending;if(!p)return;
  if(h.combat||h.transit||h.area!==p.camp||!s.areas[h.area].temporaryCamp){
    h.sketchbook.pending=null;
    ctx.log(s,'Недоконченный рисунок испорчен в спешке. Лист потрачен; до спокойной зарисовки дело не дошло.','life');
  }
}
export function sketchCamp(s,ctx){
  if(!enabled(s,'sketching')||!safeCampActivity(s))return false;
  const h=s.hero,b=h.sketchbook,a=s.areas[h.area],subject=s.areas[a.temporaryCamp.parent];
  if(!b.interest||!subject||!h.memory.places.includes(subject.id))return false;
  if(!b.pending){
    if(b.paper<=0||b.works[subject.id]||!campActivityAvailable(h))return false;
    reserveCampActivity(h,'sketch');b.paper--;b.pending={camp:a.id,subject:subject.id,remaining:3,started:s.tick};
    ctx.log(s,`${h.name} достаёт лист из дорожного блокнота и начинает рисовать место «${subject.name}». Спешить некуда.`,'life');
  }
  const p=b.pending;if(p.camp!==a.id)return false;
  p.remaining--;h.lastAction='work';h.energy=Math.min(100,h.energy+2);
  if(p.remaining>0){h.speech='Несколько линий угольком. Не всякая остановка должна становиться подвигом.';return true;}
  const quality=Math.min(5,1+b.practice);b.practice++;
  b.works[subject.id]={id:`sketch-${h.lineage}-${subject.id}`,area:subject.id,name:subject.name,tick:s.tick,quality,author:h.lineage,material:'Лист дорожного блокнота',started:p.started};b.pending=null;
  if(enabled(s,'psychology'))h.mind.stress=Math.max(0,h.mind.stress-(3+quality));
  ctx.log(s,`Закончена зарисовка «${subject.name}». Герой сохраняет её в блокноте; практика рисунка ${b.practice}. Герой прячет уголёк до следующего привала.`,'life');
  return true;
}
