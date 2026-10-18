import {areaOffset} from '../geometry.js';
import {itemLocation} from './item-originals.js';
import {itemWorth} from './item-condition.js';
import {dateLabel} from '../calendar.js';
import {moduleRandom,enabled} from '../rules.js';
import {hasHabit,stat,moral,repute} from './common.js';
import {addCondition} from './body.js';
import {storyObject,storyGoal,chronicleChoice,narrativeChange} from './story-common.js';
import {areaAvoided} from './route-memory.js';
export function start(s,c,ctx){
  c.variant=moduleRandom(s,'pacts')<.5?'fortune':'second-life';c.debt=64;c.due=s.tick+500;
  storyObject(s,c,c.source,c.variant==='fortune'?'Нотариус без тени':'Доктор с песочными часами');
  ctx.log(s,c.variant==='fortune'?'Нотариус без тени предлагает сорок монет сегодня. В договоре есть срок и очень мелкий шрифт.':'Доктор предлагает вернуть здоровье. Оплата понадобится позже; песок в его часах течёт вверх.','story');
}
export function plan(s,c,ctx){
  const h=s.hero;
  if(c.stage==='opening'){storyGoal(s,c,ctx,c.source,52,'Выслушать необычное предложение','Он сравнит выгоду с тем, чего не знает о договоре.');return true;}
  if(c.stage==='owed'){
    if(h.gold>=c.debt&&!c.defy||h.inventory.relics>0&&stat(h,'spirit')>=4){storyGoal(s,c,ctx,c.source,52,'Разобраться с долгом','Договор связывает обещание с будущей расплатой.');return true;}
    return false;
  }
  if(c.stage==='collection'){
    const ref=c.collector,o=s.areas[ref.area].objects.find(o=>o.id===ref.id);
    if(!o.alive||o.resolved){ctx.storyFinish(s,c,ctx,'done','Сборщик долга больше не преследует героя. Договор оборван, а имя должника осталось в чужой книге.');return false;}
    const known=enabled(s,'route-memory')&&h.memory.rejected?.[ref.area]?.enemy===o.id;
    const payable=h.gold+h.bag.reduce((n,i)=>n+i.value,0)>=c.debt;
    if(known&&payable&&c.defy&&areaAvoided(s,ref.area)){
      c.defy=false;chronicleChoice(s,c,'Оценил силу сборщика и предпочёл расплатиться, а не повторять прежнюю попытку.');
      ctx.log(s,'Он помнит силу сборщика. Накоплений хватит для расплаты; теперь важнее снова открыть себе дорогу.','choice');
    }
    if(h.gold>=c.debt&&(!c.defy||h.hp<h.maxHp*.65)||known&&payable&&!c.defy){
      storyGoal(s,c,ctx,ref.area,o.x,'Заплатить сборщику','Накоплений достаточно, чтобы закончить преследование.');
      if(known)h.goal.safePassage={kind:'debt',enemy:o.id};return true;
    }
    ctx.goal(s,'hunt',ref.area,o.x,'Разорвать договор силой','Отсрочка закончилась. Сборщик — настоящий противник на дороге.',{object:o.id,story:c.id});return true;
  }
  return false;
}
export function act(s,c,ctx){
  const h=s.hero;h.lastAction='talk';h.goal=null;
  if(c.stage==='opening'){
    const accept=c.variant==='fortune'?(hasHabit(h,'hoarder')||hasHabit(h,'gambler')||h.gold<10&&h.personality.courage>.65):(h.hp<h.maxHp*.6||hasHabit(h,'reckless'));
    if(!accept){chronicleChoice(s,c,'Отказался подписывать.');ctx.storyFinish(s,c,ctx,'declined','Герой возвращает перо: «Если шрифт мельче блохи, пусть блоха и подписывает». Договор остаётся неподписанным.');return;}
    chronicleChoice(s,c,'Подписал договор.');c.stage='owed';
    c.defy=h.alignment< -20||hasHabit(h,'reckless')&&stat(h,'wit')<4||hasHabit(h,'hoarder')&&!hasHabit(h,'superstitious')&&moduleRandom(s,'pacts')<.25;
    if(c.defy)chronicleChoice(s,c,'Решил не отдавать накопления: рассчитывает обойти договор.');
    if(c.variant==='fortune')h.gold+=40;else {h.hp=h.maxHp;h.energy=100;}
    addCondition(s,'curse',ctx);narrativeChange(s,c,`${h.name} подписал договор: ◈${c.debt}. Срок: ${dateLabel(s,c.due,s.areas[c.source])}.`);
    ctx.log(s,`Договор подписан. ${c.variant==='fortune'?'Получено ◈40.':'Раны закрылись, силы вернулись.'} Нужно вернуть ◈${c.debt} или найти способ разорвать печать. Срок: ${dateLabel(s,c.due,s.areas[c.source])}.${c.defy?' Герой не намерен отдавать накопления: надеется обойти договор.':''}`,'choice');return;
  }
  if(h.inventory.relics>0&&stat(h,'spirit')>=4&&h.gold<c.debt){
    h.inventory.relics--;h.conditions=h.conditions.filter(x=>x.id!=='curse');moral(s,3);chronicleChoice(s,c,'Отдал древний свет вместо монет.');narrativeChange(s,c,'Древняя реликвия погасла, выкупив имя должника.');
    ctx.storyFinish(s,c,ctx,'done','Древний свет прожигает мелкий шрифт. Реликвия исчезла, но долг больше не существует.');return;
  }
  if(c.stage==='collection'&&h.gold<c.debt&&h.gold+h.bag.reduce((sum,i)=>sum+itemWorth(i),0)>=c.debt){
    let owed=c.debt-h.gold;h.gold=0;const surrendered=[];h.bag.sort((a,b)=>itemWorth(a)-itemWorth(b));
    while(owed>0){const item=h.bag.shift();owed-=itemWorth(item);item.history ||= [];item.history.push({tick:s.tick,text:'Отдано сборщику в счёт договора.'});surrendered.push(item);}
    const collector=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);collector.paymentItems=surrendered;for(const item of surrendered)itemLocation(s,item,{kind:'object',area:c.collector.area,object:collector.id});collector.resolved=true;collector.pacified=true;h.combat=null;
    chronicleChoice(s,c,'Отдал накопленные вещи вместо недостающих монет.');ctx.storyFinish(s,c,ctx,'done','Сборщик принимает вещи по их стоимости. Дорога открыта, но сумка стала легче: накопления действительно пошли в расплату.');return;
  }
  if(h.gold>=c.debt){h.gold-=c.debt;h.conditions=h.conditions.filter(x=>x.id!=='curse');if(c.collector){const o=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);o.resolved=true;o.pacified=true;if(h.combat===o.id)h.combat=null;}chronicleChoice(s,c,'Погасил долг монетами.');repute(s,'clock',2);ctx.storyFinish(s,c,ctx,'done','Сборщик принимает настоящие монеты. Подпись исчезает из книги; на память остаётся уважение к крупному шрифту.');}
}
export function combat(s,c,enemy,ctx){
  if(c.stage!=='collection'||c.collector.id!==enemy.id||c.defy&&s.hero.hp>=s.hero.maxHp*.65&&(c.avoidances||0)<2||s.hero.gold+s.hero.bag.reduce((sum,i)=>sum+itemWorth(i),0)<c.debt)return false;
  chronicleChoice(s,c,(c.avoidances||0)>=2?'Повторная оценка угрозы заставила отказаться от уклонения.':s.hero.hp<s.hero.maxHp*.65?'Раны заставили предпочесть расплату дальнейшему бою.':'Предпочёл доступную расплату бою.');act(s,c,ctx);return true;
}
export function avoided(s,c,enemy,ctx){if(c.stage==='collection'&&c.collector.id===enemy.id){c.avoidances=(c.avoidances||0)+1;if(c.avoidances===2){c.defy=false;ctx.log(s,'Герой уже дважды оценил сборщика и отступил. Сэкономленные монеты теперь не стоят перекрытой дороги; он готов расплатиться.','choice');}}}
export function tick(s,c,ctx){
  if(c.stage==='collection'){
    const o=s.areas[c.collector.area].objects.find(o=>o.id===c.collector.id);
    if(!o?.alive||o.resolved)ctx.storyFinish(s,c,ctx,'done','Сборщик долга остановлен. Договор теряет силу, дорога снова принадлежит путникам.');
    return;
  }
  if(c.stage!=='owed'||s.tick<c.due||s.hero.transit)return;
  const h=s.hero,a=s.areas[h.area],o=ctx.spawnEnemy(s,a,{requestedSpecies:'ghost',boss:true,x:Math.max(areaOffset(a,8),Math.min(100-areaOffset(a,8),h.x+areaOffset(a,8)))});
  o.baseName='Сборщик невыплаченных мгновений';o.name=o.baseName+' · печать договора';o.attack=14+h.level*2;o.maxHp=70+h.level*8;o.hp=o.maxHp;o.powers=['hex','vampire'];o.story=c.id;
  c.collector={area:a.id,id:o.id};c.stage='collection';h.goal=null;
  narrativeChange(s,c,`Просроченный договор привёл сборщика в место «${a.name}».`);ctx.log(s,'Песок в часах кончился. На дороге появляется сборщик: долг превратился в опасность, которую нельзя стереть сменой области.','story');
}
