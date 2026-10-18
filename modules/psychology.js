import { PSYCHOLOGIES } from '../content.js';
import { moduleRandom,enabled } from '../rules.js';
import { hasHabit } from './common.js';
export function initializeMind(s,h){
  if(h.mind)return;
  h.mind={type:PSYCHOLOGIES[Math.floor(moduleRandom(s,'psychology')*PSYCHOLOGIES.length)].id,stress:8,lastCoin:-100,lastArea:h.area,settled:0};
}
export function mindTick(s,ctx){
  const h=s.hero;if(!enabled(s,'psychology'))return;
  const m=h.mind;m.stress=Math.max(0,Math.min(100,m.stress+(h.combat?1.3:h.lastAction==='rest'?-1:0)));
  if(m.lastArea===h.area)m.settled++;else{m.lastArea=h.area;m.settled=0;m.stress=Math.max(0,m.stress-3);}
  if(h.companions.length&&s.tick%24===0)m.stress=Math.max(0,m.stress-2);
}
export function mindPlan(s,options,ctx){
  const h=s.hero;if(!enabled(s,'psychology')||options.length<2)return options;
  const m=h.mind;
  if(m.type==='claustrophobic') options.sort((a,b)=>(a.type==='cave'?1:0)-(b.type==='cave'?1:0));
  if((m.type==='superstition'||hasHabit(h,'superstitious')||hasHabit(h,'gambler'))&&s.tick-m.lastCoin>75){
    m.lastCoin=s.tick;const heads=moduleRandom(s,'coin')<.5;
    if(!heads)[options[0],options[1]]=[options[1],options[0]];
    ctx.log(s,`Монетка: ${heads?'орёл':'решка'}. Герой решает проверить путь к месту «${options[0].name}».`,'coin');
  }
  return options;
}
export function fearResponse(s,enemy){
  if(!enabled(s,'psychology'))return false;
  const h=s.hero,m=h.mind;
  if(m.type==='fearbeasts'&&enemy.tags?.includes('beast'))m.stress=Math.min(100,m.stress+9);
  return m.stress>75&&(m.type==='anxious'||m.type==='fearbeasts')&&h.hp<h.maxHp*.8;
}
