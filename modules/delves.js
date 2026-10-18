import {invitationAllowed,startInvitation} from './invitation-rhythm.js';
import {revealArea} from '../actor-atlas.js';
import {enabled,moduleRandom} from '../rules.js';
import {isTown} from './common.js';
import {receiveItem} from './inventory.js';
import {seedDungeonCaptive} from './dungeon-captives.js';
import {newDelveAllowed,claimDelveOpportunity} from './delve-rarity.js';
import {delveRecord,startDelve,pauseDelve,finishDelve,reconsiderDelve,priorDelve,reentryReason,delvePassage,prepareDelveEntry,delveEntryReason} from './delve-attempts.js';

export function delvePlan(s,ctx){
  if(!enabled(s,'delves'))return false;
  const h=s.hero,a=s.areas[h.area];
  if(h.delve)delveRecord(s);
  if(h.delve&&s.tick-h.delve.started>1200){
    ctx.log(s,'Поход затянулся. Герой оставляет подземелье другим искателям.','choice');
    finishDelve(s,'left');h.delve=null;h.memory.delveAfter=s.tick+500;
  }
  if(!h.delve){
    if(h.career.path==='peaceful'||s.tick-h.born<140||h.hp<h.maxHp*.85||h.energy<65||s.tick<(h.memory.delveAfter||0))return false;
    if(!isTown(a)&&!['camp','ruins','cave','dungeon'].includes(a.type))return false;
    let gate=a.links.map(id=>s.areas[id]).find(r=>r.dungeon&&!r.dungeon.cleared);
    const prior=gate&&priorDelve(s,gate),reason=prior?reentryReason(s,prior):enabled(s,'delve-attempts')?delveEntryReason(s,gate):'curiosity';
    if(!reason)return false;
    if(!newDelveAllowed(s,prior,reason))return false;
    const invitationKey=gate?.dungeon?.root||gate?.id||'entrance:'+a.id,continued=Boolean(prior)||reason.startsWith('promise:');
    if(!invitationAllowed(s,'delve',invitationKey,{continuation:continued}))return false;
    if(!gate){
      if(a.delveGate)return false;
      const name=['Соляная гробница','Колодец колокольщика','Погреб последнего короля','Зубы подземного бога'][Math.floor(moduleRandom(s,'delves')*4)];
      const id=ctx.addArea(s,'dungeon',name,Math.max(1,Math.min(5,a.depth+1)),{continent:a.continent,era:a.era});
      gate=s.areas[id];gate.dungeon={root:id,floor:1,cleared:false};revealArea(s,gate);a.delveGate=id;ctx.connect(s,a.id,id,{mode:'stairs',duration:2});
      seedDungeonCaptive(s,gate,a,ctx);
      ctx.log(s,`В ${a.name} найден спуск: ${name}. Это отдельный поход за сокровищами, без поручителя.`,'discover');
    }
    const preparation=prepareDelveEntry(s,gate,prior,ctx);if(!preparation.ready)return preparation.preparing;
    h.delve={root:enabled(s,'delve-attempts')?(gate.dungeon.root||gate.id):gate.id,room:gate.id,started:s.tick,floors:prior?.floors||2+Math.floor(moduleRandom(s,'delves')*3),cleared:0};
    startDelve(s,h.delve,reason);
    claimDelveOpportunity(s,gate.id,prior,reason);
    if(!continued)startInvitation(s,'delve',invitationKey);
    ctx.log(s,`${h.name} откладывает поручения и идёт в подземелье «${gate.name}». Вернуться живым важнее зачистки.${enabled(s,'delve-attempts')?' '+delveRecord(s).purpose.text+'.':''}`,'choice');
  }
  const d=h.delve,room=s.areas[d.room];
  if(!reconsiderDelve(s,ctx))return Boolean(h.goal?.preparation);
  const enemy=room.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved);
  if(enemy){
    if((h.memory.avoided[room.id]||0)>s.tick&&!delvePassage(s,room.id,enemy.id)){
      if(enabled(s,'delve-attempts')){pauseDelve(s,enemy);return false;}
      h.delve=null;h.memory.delveAfter=s.tick+600;return false;
    }
    ctx.goal(s,'hunt',room.id,enemy.x,`Подземелье: зал ${room.dungeon.floor}`,`Самостоятельный поход. Впереди ${enemy.name}; герой оценивает риск каждого боя.`,{object:enemy.id,delve:true,...(enabled(s,'delve-attempts')?{attemptId:d.attemptId}:{})});return true;
  }
  const treasure=room.objects.find(o=>['relic','loot'].includes(o.kind)&&!o.taken);
  if(treasure){ctx.goal(s,'collect',room.id,treasure.x,'Открыть сокровищницу','Зал очищен. Добыча остаётся настоящей вещью этого мира.',{object:treasure.id,delve:true});return true;}
  if(!room.dungeon.cleared){
    room.dungeon.cleared=true;d.cleared++;h.gold+=8+room.dungeon.floor*5;h.inventory.rations+=2;ctx.gainXp(s,10);receiveItem(s,ctx,room.dungeon.floor===d.floors?3:1);
    room.objects.push({id:room.id+'-safe-rest',kind:'rest',name:'Очищенный привал',x:68});
    ctx.log(s,`Зал ${room.dungeon.floor} очищен. Герой забирает добычу; павшие стражи больше не вернутся.`,'treasure');
  }
  if(room.dungeon.floor>=d.floors){
    h.counters.dungeons=(h.counters.dungeons||0)+1;finishDelve(s,'completed');h.delve=null;h.memory.delveAfter=s.tick+650;
    ctx.log(s,'Последняя сокровищница открыта. Поход завершён; пора решать, чем жить дальше.','victory');return false;
  }
  if(!room.dungeon.next){
    const floor=room.dungeon.floor+1;
    const id=ctx.addArea(s,'dungeon',`${s.areas[d.root].name}: ${['Врата','Катакомбы','Костяной зал','Забытый престол'][floor-1]}`,room.depth+1,{continent:room.continent,era:room.era});
    room.dungeon.next=id;s.areas[id].dungeon={root:d.root,floor,cleared:false};revealArea(s,id);ctx.connect(s,room.id,id,{mode:'stairs',duration:2});
    if(floor===d.floors){const boss=s.areas[id].objects.find(o=>o.kind==='enemy');if(boss){boss.boss=true;boss.hp=boss.maxHp=Math.ceil(boss.maxHp*1.8);boss.attack=Math.ceil(boss.attack*1.5);boss.name='Хранитель глубин · '+boss.name;}}
  }
  d.room=room.dungeon.next;
  return delvePlan(s,ctx);
}
