import {recordHobbyUse} from './hobby-stock.js';
import {enabled} from '../rules.js';
import {safeCampActivity,reserveCampActivity,campActivityAvailable} from './camp-session.js';
export function initializeSmoking(s,h,newHero=false){
  if(h.smoking)return;
  let value=s.seed>>>0;for(const c of `pipe:${h.lineage}:${h.born}`)value=Math.imul(value^c.charCodeAt(0),16777619)>>>0;
  const habit=!['automaton','revenant','myconid'].includes(h.race)&&value%100<7;
  h.smoking={habit,tobacco:newHero&&habit?3:0,uses:0,lastUse:null,affectedUntil:0};
}
export function smokingEffect(s){
  const p=s.hero.smoking;
  if(!enabled(s,'smoking')||!enabled(s,'body')||!p||p.affectedUntil<=s.tick)return null;
  return {id:'smoking:aftereffect',icon:'≈',name:'Табачный кашель',text:'После трубки отдых возвращает на четверть меньше сил.',positive:false,phase:p.lastUse===s.tick?'fresh':'settled',until:p.affectedUntil};
}
export function smokeRestEnergy(s,amount){return smokingEffect(s)?amount*.75:amount;}
export function smokeCamp(s,ctx){
  if(!enabled(s,'smoking')||!enabled(s,'psychology')||!enabled(s,'body')||!safeCampActivity(s))return false;
  const h=s.hero,p=h.smoking;
  if(!p.habit||p.tobacco<=0||h.mind.stress<20||!campActivityAvailable(h)||p.lastUse!==null&&s.tick-p.lastUse<480)return false;
  reserveCampActivity(h,'pipe');const before=p.tobacco;p.tobacco--;recordHobbyUse(s,h,'tobacco',before);p.uses++;p.lastUse=s.tick;p.affectedUntil=s.tick+240;
  h.mind.stress=Math.max(0,h.mind.stress-12);h.energy=Math.max(0,h.energy-2);h.lastAction='rest';
  ctx.log(s,`${h.name} набивает трубку и сидит у огня. Дым немного успокаивает. После трубки труднее отдышаться; табака в кисете осталось ${p.tobacco}.`,'life');
  return true;
}
