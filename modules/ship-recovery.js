import {knownArea} from '../actor-atlas.js';
import {physicalDistance} from '../geometry.js';
import {shipRecoveryAvailable,shipRecoveryOn} from './ship-recovery-state.js';
import {launchShip} from './ship-launch.js';
import {chronicleChoice,narrativeChange} from './story-common.js';
export function shipRecoveryChoices(s,ctx){
 const h=s.hero;if(h.personality.curiosity<.55||h.stories.active)return [];
 return s.storyCases.filter(c=>shipRecoveryAvailable(s,c)&&knownArea(s,c.target)&&(ctx.knownRoute||ctx.route)(s,h.area,c.target).length).map(c=>({line:'returnship',id:c.id,area:c.target,score:26+h.personality.curiosity*65,reason:'После прежнего провала он действительно освоил подгонку. Теперь есть деталь и новое топливо: можно вернуться к уцелевшему сердцу.'}));
}
export function startShipRecovery(s,choice,ctx){
 const c=s.storyCases.find(c=>c.id===choice.id);if(!c||!shipRecoveryAvailable(s,c))return false;
 // Use the witnessed console position; never inspect distant current objects.
 ctx.goal(s,'shipRecover',c.target,82,'Вернуться к сердцу корабля',choice.reason,{recoveryStory:c.id});return true;
}
export function shipRecoveryAction(s,ctx){
 const h=s.hero,c=s.storyCases.find(c=>c.id===h.goal?.recoveryStory);
 if(!c||!shipRecoveryOn(s)||!shipRecoveryAvailable(s,c)||!h.alive||h.combat||h.transit||h.energy<20||h.hp<h.maxHp*.65||h.hunger>=65){h.goal=null;return false;}
 if(h.area!==c.target||physicalDistance(s.areas[h.area],h.x,82)>9)return false;
 const r=c.shipRecovery,o=s.areas[h.area].objects.find(o=>o.id===r.failure.object&&o.story===c.id);
 if(!o||o.dismantled){r.status='missing';h.goal=null;ctx.log(s,'Сердце не сохранилось. Подгонять больше нечего.','story');return false;}
 if(r.attempt?.lastTick===s.tick)return false;
 if(!r.attempt){const p=s.people[h.lineage],before=p.marketCargo.tools;p.marketCargo.tools--;r.attempt={id:c.id+'/recovery/1',actor:h.lineage,started:s.tick,material:{kind:'tools',before,after:p.marketCargo.tools},remaining:3,lastTick:-1,steps:[]};}
 const a=r.attempt;r.status='working';a.remaining--;a.lastTick=s.tick;a.steps.push({id:a.id+'/'+(3-a.remaining),tick:s.tick,energy:2});h.energy-=2;h.lastAction='work';
 if(a.remaining===0&&launchShip(s,c,ctx,a.id)){
  r.status='done';a.finished=s.tick;h.goal=null;chronicleChoice(s,c,'Вернулся с освоенной подгонкой и новой деталью.');narrativeChange(s,c,'После прежнего провала корабль открыл проход к острову под чужой луной. Прежние затраты не возвращены.');ctx.log(s,'Подогнанная деталь держит нагрузку. Новая реликвия зажигает корабль; прежний провал остался частью этой истории.','story');
 }return true;
}
