import {campaignOrderTick} from './campaign-orders.js';
import {campaignsOn} from './campaign-state.js';
import {woundForce,woundActivity} from './wound-state.js';
import {commissionedOn,commissionGuard,guardWeapon,commissionedWalk,finishCommission,commissionReports} from './commissioned-orders.js';
import {wearOwnedItem} from './item-condition.js';
import {physicalDistance,areaOffset} from '../geometry.js';
import {recordPersonRemains} from './remains.js';
import {actorFact} from '../actor-facts.js';
import { enabled,moduleRandom } from '../rules.js';
import {enemyDamage,enemyReply} from './adversaries.js';
import {npcAction,markNPCDeparture} from './npc-control.js';
import {watchNeedsActive,provisionWatch,watchNeeds,watchNote} from './watch-needs.js';
import {recordDangerContact,guardSafetyAdvice} from './danger-contact.js';
import {walkCampOrder} from './camp-route.js';
import {beginWatchDuty,spendWatchDuty,canHoldWatch,relieveWatch} from './watch-duty.js';
import {recordLastingInjury} from './injury-events.js';
import {encounterBestiary} from './bestiary.js';

export function sendGuards(s,source,crisis,ctx){
  if(!enabled(s,'orders')||!crisis?.enemy||s.society.orders.some(o=>o.enemy===crisis.enemy&&o.owner===s.hero.lineage&&(!o.commission||!s.areas[o.from].commandLedger?.notices[o.commission.id]))||source.commandLedger?.history.some(r=>r.enemy===crisis.enemy&&r.chief===s.hero.lineage&&r.notified===null&&!source.commandLedger.notices[r.id]))return false;
  const order=commissionGuard(s,source,crisis,ctx);if(!order)return false;const id=order.person;
  s.society.orders.push(order);provisionWatch(s,s.people[id],source);
  if(!source.objects.some(o=>o.person===id))source.objects.push({id:'watch-'+id,kind:'resident',person:id,name:s.people[id].name,x:s.people[id].x});
  const text=`${s.people[id].name} выходит по приказу совета. Герой поручает безопасность другому человеку.`;
  if(enabled(s,'npc-watch-needs'))watchNote(s,s.people[id],text,ctx,'orders');else ctx.log(s,text,'orders');return true;
}
function guardReply(s,order,p,enemy,source,target,ctx){
  const before=p.health,physical=!(enabled(s,'mutations')&&enemy.mutation==='mirror'&&enemy.battle?.echo>0);
  const reply=enemyReply(s,enemy,enemy.attack+Math.floor(moduleRandom(s,'npc-combat')*3)+(enabled(s,'enemies')&&enemy.powers?.includes('fury')&&enemy.hp<enemy.maxHp*.35?3:0),{...ctx,combatArea:target.id},p);p.health=Math.max(0,p.health-reply);
  recordDangerContact(s,p,enemy,reply,'orders');
  if(p.health>0)encounterBestiary(s,p,enemy);
  recordLastingInjury(s,p,enemy,{before,after:p.health,maximum:p.maxHealth||100,area:target.id,controller:'orders',physical},ctx);
  if(enabled(s,'npc-watch-needs')&&reply>0)actorFact(s,'hurt',p.id,enemy.id,reply);
  if(enabled(s,'enemies')&&enemy.powers?.includes('regrowth'))enemy.hp=Math.min(enemy.maxHp,enemy.hp+2);
  if(p.health!==0)return;
  p.alive=false;p.status='dead';p.died=s.tick;p.deathCause=enemy.name||enemy.baseName||'Опасность на дороге';target.objects.push({id:'grave-'+p.id,kind:'grave',name:p.name,x:enabled(s,'npc-watch-needs')?p.x??40:40});
  recordPersonRemains(s,p,{area:target.id});
  finishCommission(s,order,'lost');
  s.society.orders=s.society.orders.filter(o=>o!==order);
  const text=`${p.name} не возвращается с поручения совета. ${enemy.baseName} остаётся на дороге.`;
  if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,ctx,'loss');else{s.society.events.unshift({tick:s.tick,area:source.id,text,kind:'loss'});if(s.hero.area===source.id||s.hero.area===target.id)ctx.log(s,text,'loss');}
}
export function ordersTick(s,ctx){
  if(!enabled(s,'orders'))return;
  commissionReports(s,ctx);
  for(const order of [...s.society.orders]){
    if(order.campaign&&!campaignsOn(s))continue;if(order.commission&&!commissionedOn(s))continue;
    const p=s.people[order.person],target=s.areas[order.to],source=s.areas[order.from];if(order.campaign&&!p?.alive){campaignOrderTick(s,order,ctx);continue;}if(!p?.alive){finishCommission(s,order,'lost');s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
    if(!npcAction(s,p,'orders'))continue;if(order.campaign){campaignOrderTick(s,order,ctx);continue;}
    beginWatchDuty(s,p,order);
    if(order.commission&&!guardWeapon(s,p,order.commission.weapon)&&order.stage!=='returning'){order.commission.failure='Настоящее оружие потеряно или сломано. Исполнитель возвращается.';order.stage='returning';p.status='returning';}
    if(order.localAssistance&&order.stage==='returning'){
      p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;s.society.orders=s.society.orders.filter(o=>o!==order);
      watchNote(s,p,`${p.name} завершает местную помощь. Он остаётся там, где закончился бой.`,ctx,'orders');continue;
    }
    if(order.stage==='marching'||order.stage==='returning'){
      const needs=watchNeeds(s,p,ctx);
      if(!p.alive){finishCommission(s,order,'lost');s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
      if(needs.blocked)continue;
      spendWatchDuty(s,p,'march',1);
      const destination=order.stage==='returning'?source:target;
      if(order.commission||order.mechanismWalk||order.campWalk||order.fordWalk||source?.temporaryCamp||target?.temporaryCamp){
        if(source?.temporaryCamp||target?.temporaryCamp)order.campWalk=true;const result=order.commission?commissionedWalk(s,p,order,ctx):walkCampOrder(s,p,destination.id,order.stage==='returning'?51:40,ctx,order);
        if(result==='blocked'){
          if(order.stage!=='returning'){order.stage='returning';p.status='returning';}
          else {finishCommission(s,order,'stranded');p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;s.society.orders=s.society.orders.filter(o=>o!==order);}
          watchNote(s,p,`${p.name} не может пройти ${order.fordWalk?'по дороге':'к лагерю'}. Люди и поклажа остаются с этой стороны прохода.`,ctx,'orders');continue;
        }
        if(result!=='arrived')continue;
      }else {order.remaining--;if(order.remaining>0)continue;}
      if(order.stage==='returning'){
        p.area=source.id;p.status='resident';source.population ||= [];if(!source.population.includes(p.id))source.population.push(p.id);
        if(enabled(s,'npc-watch-needs')){if(!order.commission)p.x=51;const body=source.objects.find(o=>o.person===p.id);if(body)body.x=p.x;}
        if(!source.objects.some(o=>o.person===p.id))source.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:51});
        finishCommission(s,order,'returned');commissionReports(s,ctx);s.society.orders=s.society.orders.filter(o=>o!==order);const text=`${p.name} возвращается с дороги. Последний приказ завершён.`;if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,ctx,'orders');else if(s.hero.area===source.id)ctx.log(s,text,'orders');continue;
      }
      order.stage='fighting';p.area=target.id;p.status='guarding';
      if(watchNeedsActive(s)&&!order.commission)p.x=40;
      if(!target.objects.some(o=>o.person===p.id))target.objects.push({id:'guard-'+p.id,kind:'resident',person:p.id,name:p.name,x:40});
      if(watchNeedsActive(s))continue;
    }
    const enemy=target.objects.find(o=>o.id===order.enemy);
    if(!enemy?.alive||enemy.resolved){if(order.commission){order.commission.completed=Boolean(enemy&&(!enemy.alive||enemy.resolved));if(!enemy)order.commission.failure='Указанный противник на месте не обнаружен.';}order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';continue;}
    if(order.commission&&physicalDistance(target,p.x,enemy.x)>13){order.stage='marching';p.status='marching';continue;}
    const advice=guardSafetyAdvice(s,p,enemy);
    const tired=watchNeedsActive(s)&&((p.needs?.energy??100)<25||p.needs?.sleeping||p.health<(p.maxHealth||100)*.3);
    if(!order.commission&&tired&&relieveWatch(s,p,order,enemy,ctx))continue;
    const holding=tired&&!advice?.retreat&&canHoldWatch(s,p,enemy);
    const needs=watchNeeds(s,p,ctx,true,Boolean(advice?.retreat));
    if(!p.alive){s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
    if(advice)watchNote(s,p,`${p.name} ${advice.retreat?'принимает предупреждение':'решает продолжать бой'}: ${advice.reason}`,ctx,'orders');
    const frightened=order.commission&&(!guardWeapon(s,p,order.commission.weapon)||p.health<(p.maxHealth||100)*.5||(enemy.attack+2)>=p.health*(.2+(p.agenda.duty||0)*.2));
    if(needs.retreat&&!holding||advice?.retreat||frightened){
      if(order.commission)order.commission.failure='Исполнитель отступил: увиденная сила противника, раны или усталость важнее приказа.';
      spendWatchDuty(s,p,'retreat',1);
      order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';if(p.needs)p.needs.sleeping=false;
      p.x=Math.max(8,Math.min(92,(p.x??40)-Math.sign(enemy.x-(p.x??40)||1)*areaOffset(s.areas[p.area],12)));
      const body=target.objects.find(o=>o.person===p.id);if(body)body.x=p.x;
      watchNote(s,p,`${p.name} отступает: силы или тяжёлые раны больше не позволяют держать дорогу. Противник успевает ответить.`,ctx,'orders');
      guardReply(s,order,p,enemy,source,target,ctx);continue;
    }
    if(needs.blocked){guardReply(s,order,p,enemy,source,target,ctx);continue;}
    spendWatchDuty(s,p,holding?'hold':'fight',holding?3:2);
    const armored=enabled(s,'enemies')&&enemy.powers?.includes('armored');
    woundActivity(s,p,'arm');const hit=enemyDamage(s,enemy,Math.max(1,woundForce(s,p)*((order.commission?3+Math.min(6,guardWeapon(s,p,order.commission.weapon)?.power||0):p.attack)+Math.floor(moduleRandom(s,'npc-combat')*4)-(armored?3:0))),'physical',ctx,s.hero.area===target.id);enemy.hp-=hit;
    if(order.commission&&hit>0)wearOwnedItem(s,guardWeapon(s,p,order.commission.weapon),p.id,'attack',enemy.id,ctx);
    actorFact(s,'attack',p.id,enemy.id);if(hit>0)actorFact(s,'hurt',enemy.id,p.id,hit);
    if(enemy.hp<=0){
      if(order.commission)order.commission.completed=true;
      ctx.npcVictory(s,target,enemy,p);if(!order.commission)source.civic.safety=Math.min(100,source.civic.safety+25);
      if(!order.commission&&source.civic.crisis?.enemy===enemy.id){const remaining=target.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved);if(remaining)source.civic.crisis.enemy=remaining.id;else source.civic.crisis=null;}
      order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';continue;
    }
    guardReply(s,order,p,enemy,source,target,ctx);
  }
}
