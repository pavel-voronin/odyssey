import {enabled,moduleRandom} from '../rules.js';
import {addCondition} from './body.js';
export const ELEMENTS={
  normal:{name:'Обычная природа',color:null,rates:{}},
  fire:{name:'Огненный',color:'#c99362',rates:{fire:.4,nature:.8,physical:1.1}},
  frost:{name:'Ледяной',color:'#8cbac8',rates:{fire:1.4,time:.7,physical:.85}},
  storm:{name:'Грозовой',color:'#a6a5d4',rates:{nature:1.25,arcane:.5}},
  venom:{name:'Отравленный',color:'#9dbd79',rates:{fire:1.25,nature:.55}},
  arcane:{name:'Пожиратель магии',color:'#bc8fb7',rates:{fire:.6,nature:.6,time:.6,arcane:.4,physical:1.25}},
  grave:{name:'Могильный',color:'#94a49b',rates:{physical:.8,fire:1.3,time:.6,nature:.9}}
};
export const spellChannel=spell=>spell.kind==='time'?'time':spell.kind==='composite'&&spell.components?.[0]==='spark'?'fire':spell.id==='roots'?'nature':['spark','bluefire'].includes(spell.id)?'fire':'arcane';
export function initializeElement(s,a,e){if(e.element)return;const keys=Object.keys(ELEMENTS);e.element=a.id==='a2'&&!e.boss?'normal':moduleRandom(s,'elements')<.4?'normal':keys[1+Math.floor(moduleRandom(s,'elements')*(keys.length-1))];}
export function elementRate(s,e,type){return enabled(s,'elements')?(ELEMENTS[e.element]?.rates[type]??1):1;}
export function elementalDamage(s,e,amount,type,ctx,learn=true){
  if(!enabled(s,'elements'))return amount;
  const rate=elementRate(s,e,type),damage=Math.max(amount>0?1:0,Math.round(amount*rate));
  if(learn&&rate!==1){
    const memory=s.hero.memory.threats ||= {},known=memory[e.id] ||= {name:e.name,rates:{},seen:s.tick};
    if(known.rates[type]===undefined){known.rates[type]=rate;ctx.log(s,`${e.name}: ${rate<1?'сопротивляется':'уязвим'} к ${({physical:'оружию',fire:'огню',nature:'силе природы',time:'магии времени',arcane:'чарам'})[type]||type}. Герой запоминает результат.`,'knowledge');}
  }
  return damage;
}
export function elementImpact(s,e,ctx,actor=s.hero){
  if(!enabled(s,'elements')||e.element==='normal')return;
  const hero=actor===s.hero;
  if(e.element==='storm'){
    const stolen=hero&&enabled(s,'magic')?Math.min(4,actor.magic.mana):0;if(stolen){actor.magic.mana-=stolen;ctx.log(s,`${e.name} рассеивает ${stolen} маны.`, 'combat');}
    if(hero)actor.energy=Math.max(0,actor.energy-2);
  }
  if(e.element==='arcane'&&hero&&enabled(s,'magic')){const drained=Math.min(3,actor.magic.mana);actor.magic.mana-=drained;if(drained)ctx.log(s,'Магическая природа противника вытягивает оставшуюся ману.','combat');}
  const condition=({fire:'fever',frost:'frost',venom:'poison',grave:'curse'})[e.element];
  if(condition&&moduleRandom(s,'elements')<.15){if(hero)addCondition(s,condition,ctx,48);else if(condition==='poison'||condition==='fever'){actor.ailment=condition;actor.illSince=s.tick;}}
}
