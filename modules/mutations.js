import {enabled,moduleRandom} from '../rules.js';
import {spoilRation} from './supply.js';
export const MUTATIONS={none:{name:'Без мутации'},giant:{name:'Исполин',text:'Удар сильнее на 2.'},shell:{name:'Кристальный панцирь',text:'Снижает физический урон на 2, оставляя минимум 1.'},mirror:{name:'Зеркальный',text:'Накапливает четверть полученного магического урона (до 12) и добавляет его к следующему ответу.'},phase:{name:'Мерцающий',text:'Иногда избегает физического удара. Заклинания достигают его.'},hungry:{name:'Ненасытный',text:'Изматывает ударом и иногда портит дорожный паёк.'}};
export function initializeMutation(s,a,e){if(e.mutation)return;const keys=Object.keys(MUTATIONS);e.mutation=a.id==='a2'&&!e.boss?'none':moduleRandom(s,'mutations')<.55?'none':keys[1+Math.floor(moduleRandom(s,'mutations')*(keys.length-1))];}
export function mutatedDamage(s,e,amount,type,ctx){
  if(!enabled(s,'mutations')||!amount)return amount;
  if(e.mutation==='shell'&&type==='physical')return Math.max(1,amount-2);
  if(e.mutation==='phase'&&type==='physical'&&moduleRandom(s,'mutations')<.25){ctx.log(s,'Мерцающее тело смещается, оружие проходит сквозь пустоту.','combat');return 0;}
  if(e.mutation==='mirror'&&type!=='physical'){e.battle.echo=Math.min(12,e.battle.echo+Math.ceil(amount/4));ctx.log(s,`Зеркальная плоть накапливает ответ: ${e.battle.echo}.`,'combat');}
  return amount;
}
export function mutationReply(s,e,raw,ctx,actor=s.hero){
  if(!enabled(s,'mutations'))return raw;
  if(e.mutation==='giant'&&raw)raw+=2;
  if(e.mutation==='mirror'&&e.battle.echo){raw+=e.battle.echo;e.battle.echo=0;}
  if(e.mutation==='hungry'&&actor===s.hero){actor.energy=Math.max(0,actor.energy-2);if(enabled(s,'supply')&&actor.inventory.rations>0&&moduleRandom(s,'mutations')<.25&&spoilRation(s))ctx.log(s,'Ненасытное существо портит один дорожный паёк.','combat');}
  return raw;
}
export function mutationResponseValue(s,e,raw,echo=e.battle?.echo||0){
  if(!enabled(s,'mutations'))return raw;
  if(e.mutation==='giant'&&raw)raw+=2;
  if(e.mutation==='mirror'&&echo)raw+=echo;
  return raw;
}
