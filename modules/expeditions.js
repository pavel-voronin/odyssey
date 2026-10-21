import {heroLevel} from './progression-state.js';
import {launchShip} from './ship-launch.js';
import {rememberShipFailure} from './ship-recovery-state.js';
import {revealArea} from '../actor-atlas.js';
import {moduleRandom,enabled} from '../rules.js';
import {stat,profile,moral,hasHabit} from './common.js';
import {createPerson} from './lineage.js';
import {receiveItem} from './inventory.js';
import {storyObject,storyGoal,chronicleChoice,narrativeChange} from './story-common.js';
import {expeditionNode,expeditionNodePlan,workExpeditionNode} from './expedition-specialists.js';
export function start(s,c,ctx){
  const a=s.areas[c.source];c.variant=moduleRandom(s,'expeditions')<.5?'ship':'simulation';
  c.target=ctx.addArea(s,'clockwork',c.variant==='ship'?'Корабль, упавший из звёзд':'Комната, которая считает мир',a.depth+2,{continent:a.continent,era:a.era,realm:'clockwork'});
  ctx.connect(s,a.id,c.target,{mode:'portal',duration:3,cost:0});revealArea(s,c.target);
  c.console=storyObject(s,c,c.target,c.variant==='ship'?'Сердце звёздного корабля':'Пульт чужой симуляции',82);c.stage='investigate';
  if(c.variant==='ship')c.accessNode=expeditionNode();
  ctx.log(s,c.variant==='ship'?'За камнями обнаружен проход в корабль без мачт. Его сердце просит свет, которого не бывает в масляных лампах.':'Сломанный механизм показывает этот самый мир — вместе с героем у пульта. На изображении он ещё не пришёл.','story');
}
export function plan(s,c,ctx){
  const node=expeditionNodePlan(s,c);
  if(node){ctx.goal(s,'storyAction',c.target,node.x,node.route==='repair'?'Восстановить привод корабля':'Найти сервисный обход',node.route==='repair'?(node.actor===s.hero.lineage?'Освоенная подгонка позволяет починить узел самому.':`${s.people[node.actor].name} знает подгонку и может помочь, если сохранятся силы и время.`):'Согласного знающего спутника нет. Более долгий обход не требует чужой жертвы.',{story:c.id,nodeRoute:node.route,specialist:node.actor});return true;}
  storyGoal(s,c,ctx,c.target,82,c.variant==='ship'?'Исследовать звёздный корабль':'Проверить, кто считает этот мир','Механизм реален: к нему ведёт новый путь, а охрана преграждает проход.');return true;
}
export function act(s,c,ctx){
  if(c.status!=='active')return;
  if(workExpeditionNode(s,c,ctx))return;
  const h=s.hero,a=s.areas[c.target];h.goal=null;h.lastAction='collect';
  const clever=stat(h,'wit')>=4||['time','repair','magic','relic'].includes(profile(h).skill);
  const fuel=h.inventory.relics>0;
  if(c.variant==='ship'){
    if(clever&&fuel){
      if(!launchShip(s,c,ctx,c.id+'/launch'))return;
      chronicleChoice(s,c,'Восстановил корабль древним светом.');narrativeChange(s,c,'Звёздный корабль открыл постоянный проход к острову под чужой луной.');
      ctx.storyFinish(s,c,ctx,'done','Реликвия зажигает корабль. Открывается новый остров; бортовой дух спрашивает, почему пассажиры снова забыли эволюционировать.');
    }else if(hasHabit(h,'hoarder')||!fuel){
      const heart=a.objects.find(o=>o.id===c.console);if(heart)heart.dismantled=true;receiveItem(s,ctx,4);h.gold+=18;chronicleChoice(s,c,'Разобрал сердце корабля.');narrativeChange(s,c,'Корабль лишился сердца и больше никогда не полетит.');ctx.storyFinish(s,c,ctx,'done','Герой разбирает сердце корабля на полезные детали. Находка велика, но чужая луна остаётся недостижимой.');
    }else {const before=h.hp;h.inventory.relics--;h.hp=Math.max(1,h.hp-15);c.broken=true;rememberShipFailure(s,c,before);narrativeChange(s,c,'Неудачный запуск погасил звёздный корабль.');ctx.storyFinish(s,c,ctx,'failed','Древний свет перегружает систему. Герой получает ожоги, корабль замолкает. Знаний не хватило.');}
    return;
  }
  if(clever&&h.personality.curiosity>.65){
    const duplicate=createPerson(s,{name:h.name+' (резервная копия)',race:h.race,appearance:{...h.appearance},role:'эхо симуляции',alive:true,area:a.id,parents:[],echoOf:h.lineage});
    a.population ||= [];a.population.push(duplicate);a.objects.push({id:'resident-'+duplicate,kind:'resident',person:duplicate,name:s.people[duplicate].name,x:64});c.echo=duplicate;
    if(enabled(s,'magic'))h.magic.maxMana+=3;
    chronicleChoice(s,c,'Вывел резервную копию в мир.');narrativeChange(s,c,`Копия ${h.name} стала самостоятельным жителем. У неё другое прошлое, но то же лицо.`);ctx.storyFinish(s,c,ctx,'done','Из комнаты выходит второй герой. Он отказывается идти следом: «В прошлой версии я уже был главным». В мире остаётся самостоятельное эхо.');
  }else if(h.alignment< -15||hasHabit(h,'reckless')){
    const enemy=ctx.spawnEnemy(s,a,{boss:true,requestedSpecies:'automaton',x:75});enemy.name='Администратор несанкционированных реальностей';enemy.attack=12+heroLevel(h)*2;enemy.story=c.id;
    h.gold+=30;chronicleChoice(s,c,'Сломал ограничения системы.');narrativeChange(s,c,'Взлом выпустил опасного администратора в мир.');ctx.storyFinish(s,c,ctx,'failed','Герой ломает ограничитель и забирает ◈30. Система выпускает администратора: теперь это живая опасность у пульта.');
  }else {moral(s,3);h.energy=100;chronicleChoice(s,c,'Не стал менять чужие жизни.');ctx.storyFinish(s,c,ctx,'done','Герой закрывает пульт: «Даже если мы вычисление, людям завтра нужна еда». Машина остаётся тихой, чужие жизни продолжаются.');}
}
