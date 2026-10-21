import {restoreHealth} from './fresh-reply.js';
import {socketDefense} from './socket-state.js';
import {enabled,moduleRandom} from '../rules.js';
import {profile,hasHabit} from './common.js';
import {itemWorking} from './item-condition.js';
export const ENCHANTMENT_TEXT={plain:'Особых эффектов нет.',blessing:'Снижает получаемый урон на 1–2, оставляя минимум 1.',time:'Снижает цену заклинаний и их восстановление на 1–2, оставляя минимум 1.',greed:'Находит 1–2 дополнительные монеты после победы; герой реже продаёт накопления.',curse:'Усиливает обычный удар на 1–2, но наращивает голод и напряжение.',luck:'Иногда усиливает обычный удар; вероятность зависит от числа удачных печатей.',healing:'На отдыхе дополнительно восстанавливает 1–2 здоровья.',spirit:'Усиливает удар по духам и магическим существам; помогает завоевать доверие.',explore:'Склоняет к неизвестным дорогам и даёт немного опыта при первом посещении.'};
export function initializeItemMemory(item){item.enchantment ||= {uses:0,resonance:0,owners:[],counts:{},memory:[]};return item.enchantment;}
export function itemBearer(s,item,owner=s.hero.lineage){
  const m=initializeItemMemory(item);
  if(owner&&!m.owners.includes(owner)){if(m.owners.length)m.resonance=Math.min(3,m.resonance+1);m.owners.push(owner);}
}
function items(h,id){return h.ruleFlags?.equipment===false||h.ruleFlags?.enchantments===false?[]:Object.values(h.equipment||{}).filter(i=>itemWorking(i)&&i.modifier===id);}
export function enchantmentStrength(h,id){return Math.min(2,items(h,id).reduce((n,i)=>n+1+(i.enchantment?.resonance>=2?1:0),0));}
function remember(s,id,kind,text,ctx){
  for(const item of items(s.hero,id)){
    const m=initializeItemMemory(item);m.uses++;m.counts[kind]=(m.counts[kind]||0)+1;
    if(m.counts[kind]===1||m.uses%20===0){
      const event={tick:s.tick,text};m.memory.push(event);if(m.memory.length>12)m.memory.shift();item.history ||= [];item.history.push(event);
      if(m.uses%20===0){m.resonance=Math.min(3,m.resonance+1);ctx.log(s,`${item.name}: ${m.resonance>=2?'отклик печати усилился':'память двадцати применений стала частью вещи'}.`,'artifact');}
    }
  }
}
export function enchantedAttack(s,enemy,damage,ctx){
  const h=s.hero;
  const curse=enchantmentStrength(h,'curse');if(curse){damage+=curse;remember(s,'curse','attack',`Усилен удар против ${enemy.name}.`,ctx);}
  const spirit=enchantmentStrength(h,'spirit');if(spirit&&(enemy.tags?.includes('spirit')||enemy.tags?.includes('magic'))){damage+=spirit*2;remember(s,'spirit','spirit',`Вещь узнала духа: ${enemy.name}.`,ctx);}
  const luck=enchantmentStrength(h,'luck');if(luck&&moduleRandom(s,'enchantments')<.15+luck*.1){damage+=2+luck;remember(s,'luck','luck',`Удачный удар против ${enemy.name}.`,ctx);ctx.log(s,'Печать удачи направляет удар в неожиданно открытое место.','artifact');}
  return damage;
}
export function enchantedDefense(s,damage,ctx){
  const shield=enchantmentStrength(s.hero,'blessing'),result=Math.max(1,damage-shield);
  if(result<damage)remember(s,'blessing','defense',`Благословение ослабило удар на ${damage-result}.`,ctx);return socketDefense(s,result,ctx);
}
export function enchantedRest(s,ctx){
  const h=s.hero,healing=enchantmentStrength(h,'healing'),amount=Math.min(healing,h.maxHp-h.hp);
  if(amount>0){restoreHealth(s,amount);remember(s,'healing','rest',`Память костра восстановила ${amount} здоровья.`,ctx);}
}
export function enchantedVictory(s,enemy,ctx){
  const h=s.hero,coins=enchantmentStrength(h,'greed');if(coins){h.gold+=coins;remember(s,'greed','gold',`Найден тайник ${enemy.name}: ещё ◈${coins}.`,ctx);}
}
export function enchantmentTick(s,ctx){
  if(!enabled(s,'enchantments')||s.tick%96)return;
  const curse=enchantmentStrength(s.hero,'curse');if(!curse)return;
  const hunger=enabled(s,'body')?Math.min(curse*2,100-s.hero.hunger):0,stress=enabled(s,'psychology')?Math.min(curse*2,100-s.hero.mind.stress):0;
  s.hero.hunger+=hunger;s.hero.mind.stress+=stress;
  if(hunger||stress)remember(s,'curse','cost',`Цена проклятой вещи: голод +${hunger}, напряжение +${stress}.`,ctx);
}
export function enchantedSpell(s,spell,ctx){
  const time=enchantmentStrength(s.hero,'time');if(time)remember(s,'time','spell',`Сокращена цена или пауза заклинания «${spell.name}».`,ctx);
}
export function enchantedTrust(s,name,ctx){const spirit=enchantmentStrength(s.hero,'spirit');if(spirit)remember(s,'spirit','trust',`Печать помогла разговору с ${name}.`,ctx);return spirit;}
export function enchantedDiscovery(s,a,ctx){const explore=enchantmentStrength(s.hero,'explore');if(explore)remember(s,'explore','place',`В памяти вещи осталось место «${a.name}».`,ctx);return explore;}
export function enchantmentPreference(h,item){
  if(h.ruleFlags?.enchantments===false)return 0;
  if(item.modifier==='time'&&h.magic?.spells.length>0)return .8;
  if(item.modifier==='spirit'&&profile(h).skill==='spirit')return .8;
  if(item.modifier==='greed'&&hasHabit(h,'hoarder'))return .7;
  if(item.modifier==='explore'&&h.personality.curiosity>.65)return .7;
  return 0;
}
