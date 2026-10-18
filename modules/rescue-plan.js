import {enabled} from '../rules.js';
import {recordValueOutcome} from './value-revision.js';
import {areaOffset,physicalDistance} from '../geometry.js';
import {moral,repute} from './common.js';
import {canPayRansom} from './rescue-choice.js';
import {rememberPromise} from './commitments.js';
import {meetPerson} from './social.js';
import {rememberRescue} from './camp-life.js';
import {finishDelve,reconsiderDelve} from './delve-attempts.js';
import {isDungeonRescue,beginRescueEscape,rescueGuardPass,dungeonRescueReady} from './rescue-escape.js';
export const dungeonRescueOn=s=>['dungeon-rescue','quests','people','npc-control'].every(id=>enabled(s,id));
function localCage(s,id){return s.areas[s.hero.area]?.objects.find(o=>o.id===id&&o.kind==='captive'&&o.dungeonRescue?.version===1);}
export function hearCaptivePlan(s,ctx){
 const h=s.hero;if(!dungeonRescueOn(s)||!h.alive||h.combat||h.transit||h.quests.filter(q=>q.status==='active').length>=4)return false;
 const a=s.areas[h.area];if(!a.dungeon?.captive)return false;
 const cage=a.objects.find(o=>o.id===a.dungeon.captive&&o.dungeonRescue?.version===1&&o.kind==='captive'&&!o.resolved&&s.people[o.person]?.alive&&s.people[o.person].area===a.id&&physicalDistance(a,h.x,o.x)<=30);
 if(!cage||h.quests.some(q=>q.object===cage.id)||h.memory.rescueSeen?.some(e=>e.cage===cage.id))return false;
 ctx.goal(s,'rescueHear',h.area,h.x,'Ответить на зов пленника','В этом зале слышен живой человек. Решение помочь не требует зачищать всё подземелье.',{object:cage.id});return true;
}
export function hearCaptive(s,ctx){
 const h=s.hero,cage=localCage(s,h.goal?.object);h.goal=null;
 if(!dungeonRescueOn(s)||!cage||cage.resolved||!s.people[cage.person]?.alive||physicalDistance(s.areas[h.area],h.x,cage.x)>30||h.quests.some(q=>q.object===cage.id))return false;
 h.memory.rescueSeen ||= [];const willing=h.personality.generosity>=.55||(h.relations[cage.person]?.trust||0)>=20;
 h.memory.rescueSeen.push({cage:cage.id,tick:s.tick,choice:willing?'help':'decline'});if(h.memory.rescueSeen.length>8)h.memory.rescueSeen.shift();h.lastAction='talk';
 if(!willing){ctx.log(s,`${s.people[cage.person].name} зовёт из-за решётки. Герой не берётся выводить незнакомца и сохраняет прежнюю цель.`,'choice');return true;}
 if(h.quests.filter(q=>q.status==='active').length>=4)return false;
 const guard=s.areas[h.area].objects.find(o=>o.id===cage.dungeonRescue.guard),q={id:`quest-${s.generation}-${s.tick}-${h.quests.length}`,kind:'rescue',status:'active',source:cage.dungeonRescue.exit,target:h.area,object:cage.id,person:cage.person,giver:null,required:1,reward:0,accepted:s.tick,title:'Вывести пленника из подземелья',cause:'Сам решил помочь человеку выйти живым. Сокровища и дальние стражи могут подождать.',offer:`${cage.dungeonRescue.exit}:rescue:${h.area}:${cage.id}`,targets:guard?[guard.id]:[],dungeonRescue:{version:1,stage:'captive',guard:cage.dungeonRescue.guard,guardX:guard?.x??cage.x,cageX:cage.x,knownAt:s.tick,method:null}};
 h.quests.push(q);rememberPromise(s,q);meetPerson(s,q.person,ctx,1);
 ctx.log(s,`${s.people[q.person].name}: «Помоги добраться до выхода». Герой берётся помочь; платы никто не обещал. За клеткой остались другие опасности и добыча.`,'rescue');return true;
}
export function planDungeonRescue(s,q,ctx){
 if(!isDungeonRescue(q))return false;
 const h=s.hero,r=q.dungeonRescue,p=s.people[q.person];
 if(r.stage==='captive'){
  if(!dungeonRescueOn(s)){h.goal=null;return true;}
  if(h.delve?.root===q.target&&h.delveMemory?.places[q.target]?.status==='paused'&&!reconsiderDelve(s,ctx)){h.goal=null;return true;}
  if(h.area!==q.target){ctx.goal(s,'rescueApproach',q.target,r.guardX,'Вернуться за пленником',q.cause,{quest:q.id});return true;}
  if(physicalDistance(s.areas[h.area],h.x,r.cageX)>30){ctx.goal(s,'rescueApproach',q.target,r.guardX,'Вернуться к известной клетке','С этого края зала пока не видно, что стало с пленником.',{quest:q.id});return true;}
  const cage=localCage(s,q.object),guard=s.areas[h.area].objects.find(o=>o.id===r.guard&&physicalDistance(s.areas[h.area],h.x,o.x)<=30&&physicalDistance(s.areas[h.area],cage?.x??r.cageX,o.x)<=12);
  if(!cage||cage.resolved||!p?.alive||p.area!==h.area||p.status!=='captive'){ctx.failQuest(s,q,ctx,'Пленника больше нет в известной клетке.');return true;}
  if(guard?.alive&&!guard.resolved&&!rescueGuardPass(s,guard,h.lineage,cage.x)){ctx.goal(s,'rescueApproach',h.area,guard.x,'Добраться до стража клетки','Можно заплатить настоящий выкуп, рискнуть боем или отступить.',{quest:q.id});return true;}
  ctx.goal(s,'rescueFree',h.area,cage.x,'Открыть клетку','Нужно подойти к тому самому человеку. Остальных врагов трогать не обязательно.',{quest:q.id});return true;
 }
 if(r.stage==='escorting'){
  const a=s.areas[h.area];
  if(p?.area===h.area&&!h.transit&&physicalDistance(a,h.x,p.x)<=30){
   r.lastSeen={area:h.area,x:p.x,tick:s.tick};
   if(!p.alive){ctx.failQuest(s,q,ctx,'Спасаемый погиб до встречи у выхода.');return true;}
   const obstruction=p.rescueFlight?.blocked,enemy=obstruction?.area===h.area&&a.objects.find(o=>o.id===obstruction.enemy&&o.alive&&!o.resolved);
   if(enemy){ctx.goal(s,'hunt',h.area,enemy.x,'Освободить путь к выходу','Спасённый сам заметил преграду. Пока она здесь, он не проходит.',{quest:q.id,object:enemy.id});return true;}
   const exitX=h.area===q.source?42:(Number(q.source.slice(1))>Number(h.area.slice(1))?100:0),x=Math.max(0,Math.min(100,p.x+Math.sign(exitX-p.x)*areaOffset(a,4)));
   ctx.goal(s,'rescueEscort',h.area,x,'Идти рядом с освобождённым','Он идёт собственными шагами. Герой ждёт и проверяет дорогу, не переносит человека в поселение.',{quest:q.id});return true;
  }
  ctx.goal(s,'rescueEscort',q.source,42,'Встретиться у условленного выхода','Договорились встретиться в поселении у входа. Нового адреса герой не знает.',{quest:q.id});return true;
 }
 return true;
}
export function rescueGuardContact(s,enemy,ctx){
 const h=s.hero,q=h.quests.find(q=>q.id===h.goal?.quest),g=enemy.rescueGuard;
 if(!dungeonRescueOn(s)||!isDungeonRescue(q)||q.status!=='active'||q.dungeonRescue.stage!=='captive'||q.dungeonRescue.guard!==enemy.id||g?.version!==1||g.agreement||g.cage!==q.object||g.person!==q.person||!enemy.tags?.includes('human')||!Number.isFinite(g.fee)||g.fee<=0||!Number.isFinite(g.purse)||g.purse<0||!enemy.alive||enemy.resolved||h.area!==g.room||physicalDistance(s.areas[h.area],h.x,enemy.x)>9)return false;
 const captive=s.people[q.person],cage=localCage(s,q.object);if(!cage||cage.resolved||!captive?.alive||captive.status!=='captive'||captive.area!==h.area)return false;
 const quote={fee:g.fee,faction:enemy.faction,guard:enemy.id,area:h.area,x:enemy.x,learnedAt:s.tick},willing=canPayRansom(s,quote);q.dungeonRescue.quote={...quote,usableAtContact:willing};
 if(!willing)return false;
 h.gold-=g.fee;g.purse+=g.fee;g.agreement={tick:s.tick,payer:h.lineage,person:q.person,paid:g.fee,permits:[h.lineage,q.person]};q.dungeonRescue.paid=g.fee;h.energy=Math.max(0,h.energy-1);h.lastAction='talk';h.goal=null;
 ctx.log(s,`${enemy.baseName||enemy.name} принимает ◈${g.fee} за выход пленника. Монеты остаются у стража; герой и ${s.people[q.person].name} могут вернуться к лестнице. Дальняя сокровищница в сделку не входит.`,'rescue');return true;
}
export function rescueTarget(s,ctx){
 const h=s.hero;if(!h.goal?.quest)return true;const q=h.quests.find(q=>q.id===h.goal.quest);if(!isDungeonRescue(q))return true;
 if(q.status!=='active'||!dungeonRescueReady(s,q)&&(!enabled(s,'people')||!enabled(s,'npc-control')||q.dungeonRescue.stage==='captive'&&!dungeonRescueOn(s))){h.goal=null;return false;}
 const p=s.people[q.person];
 if(q.dungeonRescue.stage==='captive'&&h.area===q.target&&physicalDistance(s.areas[h.area],h.x,q.dungeonRescue.cageX)<=30){
  const cage=localCage(s,q.object);
  if(!cage||cage.resolved||!p?.alive||p.area!==h.area||p.status!=='captive'){ctx.failQuest(s,q,ctx,'В известной клетке больше нет живого пленника.');return false;}
 }
 return true;
}
export function rescueAction(s,ctx){
 const h=s.hero,g=h.goal,q=h.quests.find(q=>q.id===g?.quest);if(!q||q.status!=='active'||!isDungeonRescue(q)){h.goal=null;return false;}
 if(g.kind==='rescueFree'){
  if(!dungeonRescueOn(s)){h.goal=null;return false;}
  const p=s.people[q.person];if(!beginRescueEscape(s,p,q)){h.goal=null;return false;}
  const guard=s.areas[h.area].objects.find(o=>o.id===q.dungeonRescue.guard);
  q.dungeonRescue.method=guard?.rescueGuard?.agreement?.payer===h.lineage?'ransom':guard?.alive&&guard.resolved?'parley':guard&&!guard.alive?'combat':'unguarded';
  h.lastAction='talk';h.goal=null;ctx.log(s,`${p.name} выходит из клетки и сам направляется к лестнице. Помочь выбраться — ещё не значит довести живым.`,'rescue');return true;
 }
 h.lastAction=g.kind==='rescueEscort'?'wait':'think';h.goal=null;return true;
}
export function finishDungeonRescue(s,q,ctx){
 if(q.status!=='active'||!s.hero.quests.includes(q)||!dungeonRescueReady(s,q))return false;
 const h=s.hero,p=s.people[q.person],a=s.areas[h.area];q.status='done';q.completed=s.tick;q.rescued=true;q.dungeonRescue.stage='arrived';q.dungeonRescue.exitedAt=p.rescueFlight.arrivedAt;rememberRescue(s,q);ctx.gainXp(s,12);meetPerson(s,p.id,ctx,10);h.social.fame++;moral(s,3);if(a.faction)repute(s,a.faction,5);h.lastAction='talk';
  recordValueOutcome(s,q,'rescue',ctx);
  if(a.civic&&q.offer&&!a.civic.completedOffers.includes(q.offer))a.civic.completedOffers.push(q.offer);
 if(h.delve?.root===q.target){finishDelve(s,'rescued');h.delve=null;h.memory.delveAfter=s.tick+650;}
 ctx.log(s,`${p.name} живым дошёл до условленного места. Спасение завершено без награды за зачистку; непотревоженные стражи и сокровища остались под землёй.`,'rescue');s.changes.push({tick:s.tick,text:`${p.name} вышел из подземелья с помощью ${h.name}.`});h.goal=null;return true;
}
export function dropRescuePurse(s,a,enemy){
 const g=enemy?.rescueGuard;if(g?.version!==1||enemy.alive||!(g.purse>0))return false;
 const id=enemy.id+'/ransom-purse';if(a.objects.some(o=>o.id===id))return false;
 a.objects.push({id,kind:'loot',name:'Кошель стража клетки',x:enemy.x,gold:g.purse,taken:false,origin:{enemy:enemy.id,case:g.cage,kind:'ransom'}});g.dropped=g.purse;g.purse=0;g.droppedAt=s.tick;return true;
}
