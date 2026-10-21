import {replyRecovery} from './fresh-reply.js';
import {enabled} from '../rules.js';
import {braceAvailable,braceCost} from './brace.js';
import {hasCondition} from './common.js';
import {availableCombatSpells,preferMeasuredWard} from './magic.js';
import {incomingReply,weaponDamageRange,spellDamageRange} from './combat-forecast.js';
import {weaponAlternatives} from './weapon-decision.js';
import {knownComposition} from './composite-threats.js';

function attackOption(s,e,damage,{action='attack',spell=null}={}){
 const hp=s.hero.hp+(spell||action==='windup'?0:replyRecovery(s,e,damage.min));
 const win=damage.min>=e.hp,enemyHp={min:Math.max(0,e.hp-damage.max),max:Math.max(0,e.hp-damage.min)},currentEcho=e.battle?.echo||0;
 const echo=enabled(s,'mutations')&&e.mutation==='mirror'&&spell?{min:Math.min(12,currentEcho+Math.ceil(damage.min/4)),max:Math.min(12,currentEcho+Math.ceil(damage.max/4))}:{min:currentEcho,max:currentEcho};
 return {id:spell?.id||'attack',action,spell:spell?.id,hp,damage,mana:spell?.manaCost||0,charge:spell?.waystoneCost||0,potions:0,win,mayWin:damage.max>=e.hp,temporary:spell?.kind==='time',reply:incomingReply(s,e,{hp,blessed:hasCondition(s.hero,'blessing')||spell?.kind==='composite',enemyHp,echo,skip:win||spell?.kind==='time',exposed:!spell,mana:s.hero.magic.mana-(spell?.manaCost||0)})};
}
export function combatOptions(s,e){
 const h=s.hero,options=[attackOption(s,e,weaponDamageRange(s,e))];
 for(const style of weaponAlternatives(s,e)){
  const option=attackOption(s,e,style.damage,{action:style.id});option.id=style.id;option.energy=style.energy;option.followUp=style.followUp;options.push(option);
 }
 if(h.inventory.potions>0){const hp=Math.min(h.maxHp,h.hp+19);options.push({id:'potion',action:'potion',hp,mana:0,potions:1,reply:incomingReply(s,e,{hp})});}
 for(const spell of availableCombatSpells(s)){
  if(['damage','time','composite'].includes(spell.kind)){options.push(attackOption(s,e,spellDamageRange(s,e,spell),{action:'spell',spell}));continue;}
  const option={id:spell.id,measured:spell.measured,action:'spell',spell:spell.id,hp:h.hp,mana:spell.manaCost,charge:spell.waystoneCost||0,potions:0};
  if(spell.kind==='heal'){option.hp=Math.min(h.maxHp,h.hp+spell.effectPower);if(option.hp<=h.hp)continue;option.reply=incomingReply(s,e,{hp:option.hp,mana:h.magic.mana-spell.manaCost});}
  else if(spell.kind==='ward'&&!hasCondition(h,'blessing')){option.reply=incomingReply(s,e,{blessed:true,mana:h.magic.mana-spell.manaCost});option.protection=true;}
  else if(spell.kind==='pacify'){
   option.reply=incomingReply(s,e,{mana:h.magic.mana-spell.manaCost});option.reply={...option.reply,min:0,survivalLow:.45+.55*option.reply.survivalLow,survivalHigh:.45+.55*option.reply.survivalHigh};option.pacify=true;
  }else continue;
  if(spell.manaCost<=h.magic.mana)options.push(option);
 }
 const guardCost=braceCost(s);if(braceAvailable(s,e,guardCost))options.push({id:'brace',action:'brace',hp:h.hp,mana:guardCost.mana,potions:0,energy:guardCost.energy,protection:true,reply:incomingReply(s,e,{brace:true})});
 return options;
}
const price=o=>o.mana*.15+(o.charge||0)*.2+o.potions*3+(o.energy||0)*.2;
const score=o=>o.reply.survivalLow*100+(o.win?35:0)+Math.min(20,o.hp-o.reply.max)*.15+(o.damage?.min||0)*.05-price(o);
const best=list=>list.slice().sort((a,b)=>score(b)-score(a))[0];
export function chooseCombatAction(s,e,{retreatBlocked=false}={}){
 if(!enabled(s,'combat-judgment'))return null;
 const h=s.hero,options=combatOptions(s,e),attack=options[0],courage=Math.max(0,Math.min(1,h.personality.courage)),low=h.hp<h.maxHp*(.18+(1-courage)*.2),tired=h.energy<9;
 const baseline=incomingReply(s,e),danger=attack.reply.lethalPossible,severe=attack.reply.max>h.hp*(.55+courage*.3),opening=baseline.max===0&&h.hp<h.maxHp*.5;
 const decision=(option,reason)=>({action:option.action,spell:option.spell,form:option.form,reason,retreatBlocked,attackReply:attack.reply,selectedReply:option.reply||null,options,selected:option.id});
 const legacy=reason=>decision({id:'legacy',action:'legacy'},reason);
 const weaponFinisher=options.some(o=>o.win&&['quick','release'].includes(o.action));
 const guard=options.find(o=>o.id==='brace');if(guard&&!attack.win&&!weaponFinisher&&!danger&&!low&&h.energy>=(guard.energy+(guard.mana?0:1))&&courage<.65&&baseline.max>h.hp*(.2+courage*.3)&&guard.reply.max<baseline.max&&guard.reply.survivalLow===1)return decision(guard,'Замах уже замечен. Он бережёт здоровье и тратит силы на заслон вместо удара.');
 if(preferMeasuredWard(s,e))return decision({id:'measured-ward',action:'spell',spell:'ward',form:'measured',reply:baseline},'В действиях угрозы есть пауза, а маны мало. Он готовит знакомую защиту: этот ход остаётся уязвимым.');
 const prepared=options.find(o=>o.spell==='ward'&&o.measured&&o.reply.survivalLow===1);if(prepared)return decision(prepared,'Подготовка вложена в прошлый ход. Он завершает слово укрытия, оплачивая оставшуюся цену.');
 const composition=knownComposition(s,e);
 if(composition&&!danger&&!severe&&!low&&!tired&&!opening){
  const spells=options.filter(o=>o.action==='spell'&&o.damage&&o.reply.survivalLow===1&&!o.temporary);
  if(composition==='shell-warden'&&e.battle?.intent==='guard'){
   const spell=best(spells.filter(o=>o.damage.min>attack.damage.max&&o.reply.max<=h.hp*.4));
   if(spell)return decision(spell,'Панцирь и защитная стойка уже остановили оружие. Он обходит их известными чарами.');
  }
  if(composition==='mirror-warden'&&!attack.win&&spells.some(o=>o.reply.max>attack.reply.max))return decision(attack,'Он уже видел, как зеркало возвращает чары. Стойку придётся пробивать оружием, не усиливая ответ.');
 }
 if(!danger&&!severe&&!low&&!tired&&!opening)return legacy('Он продолжает бой, следя за ранами.');
 const certainWin=best(options.filter(o=>o.win));if(certainWin)return decision(certainWin,'Он успевает добить врага до ответного удара.');
 const safeCare=(danger||low||opening)&&best(options.filter(o=>!o.damage&&!o.pacify&&o.reply.survivalLow===1&&(o.reply.survivalLow>attack.reply.survivalLow||(low||opening)&&o.hp>h.hp)));
 if(safeCare)return decision(safeCare,retreatBlocked?'Путь перекрыт. Доступное средство поможет выдержать ближайший ответ.':opening?'Пока враг готовится, есть время восстановиться.':'Лечения или защиты хватит на ближайший ответ.');
 if(!danger&&!severe&&!low&&!tired)return legacy('Он использует паузу в действиях противника.');
 const q=h.quests.find(q=>q.id===h.goal?.quest&&q.status==='active'),duty=q?.kind==='rescue'&&q.target===h.area&&q.deadline-s.tick<240?.1:0;
 const hit=h.combatJudgment?.lastHit,shock=hit?.enemy===e.id?Math.min(.12,hit.damage/h.maxHp*.15):0;
 const gamble=best(options.filter(o=>o.mayWin));
 if(gamble&&courage>.84+shock-duty)return decision(gamble,'Он видит шанс добить врага и принимает риск ответного удара.');
 if(!retreatBlocked)return decision({id:'flee',action:'flee'},danger?'Ближайший ответ может стать последним. Он ищет выход.':tired?'Сил почти нет. Он выбирается из боя.':'Удар оставит его слишком уязвимым. Он ищет выход.');
 const delayed=best(options.filter(o=>o.temporary));if(delayed)return decision(delayed,'Путь перекрыт. Он выигрывает миг без ответного удара.');
 const improvement=best(options.filter(o=>o.id!=='attack'&&o.reply.survivalLow>attack.reply.survivalLow));
 if(improvement)return decision(improvement,improvement.pacify?'Путь перекрыт. Он пробует прекратить бой чарами.':'Путь перекрыт. Лечение даёт шанс выдержать удар.');
 if(gamble)return decision(gamble,'Путь перекрыт. Он пробует закончить бой раньше противника.');
 if(!danger)return legacy('Путь перекрыт. Он продолжает бой.');
 return decision(attack,'Путь перекрыт. Спасительного средства сейчас нет; он продолжает бой.');
}
export function rememberCombatChoice(s,e,choice,ctx){
 if(!choice)return;
 const h=s.hero,m=h.combatJudgment ||= {},signature=[e.id,choice.action,choice.spell||'',choice.retreatBlocked,choice.reason].join('/');
 m.last={tick:s.tick,enemy:e.id,action:choice.action,spell:choice.spell,selected:choice.selected,hp:h.hp,attackReply:{...choice.attackReply},selectedReply:choice.selectedReply?{...choice.selectedReply}:null,reason:choice.reason,retreatBlocked:choice.retreatBlocked,retreatAttempted:choice.retreatBlocked,alternatives:choice.options.map(o=>({id:o.id,hp:o.hp,mana:o.mana,potions:o.potions,win:Boolean(o.win),mayWin:Boolean(o.mayWin),...o.reply}))};
 if(choice.action!=='legacy'){
  h.reason=choice.reason;
  if(m.signature!==signature)ctx.log(s,`${h.name}: ${choice.reason}`,'choice');
 }
 m.signature=signature;
}
export function resolveCombatChoice(s,performed,extra={}){
 const last=s.hero.combatJudgment?.last;if(enabled(s,'combat-judgment')&&last?.tick===s.tick)Object.assign(last,{performed,...extra});
}
export function rememberCombatReply(s,e,damage,phase){
 if(!enabled(s,'combat-judgment'))return;
 const m=s.hero.combatJudgment ||= {},fact={tick:s.tick,enemy:e.id,damage,phase};m.lastReply=fact;if(damage>0)m.lastHit={...fact};
}
