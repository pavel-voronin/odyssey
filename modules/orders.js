import {areaScale,areaOffset,routeDistance} from '../geometry.js';
import {recordPersonRemains} from './remains.js';
import {actorFact} from '../actor-facts.js';
import { enabled,moduleRandom } from '../rules.js';
import { createPerson } from './lineage.js';
import {enemyDamage,enemyReply} from './adversaries.js';
import {npcAction,markNPCDeparture} from './npc-control.js';
import {watchNeedsActive,provisionWatch,watchNeeds,watchNote} from './watch-needs.js';
import {recordDangerContact,guardSafetyAdvice} from './danger-contact.js';
import {walkCampOrder} from './camp-route.js';
import {pathHasFord} from './fords.js';

export function sendGuards(s,source,crisis,ctx){
  if(!enabled(s,'orders')||!crisis?.enemy||s.society.orders.some(o=>o.enemy===crisis.enemy))return false;
  const family=s.people[source.population?.[0]]?.name.split(' ').slice(1).join(' ')||s.hero.family;
  const id=createPerson(s,{name:'Фарен '+family,race:s.hero.race,role:'страж',area:source.id,parents:[],alive:true,health:60,maxHealth:60,attack:5+s.hero.career.rank,status:'marching',procedural:true});
  const path=ctx.route(s,source.id,crisis.area),long=path.some(id=>areaScale(s.areas[id])!==1),travelTicks=Math.max(12,Math.ceil(routeDistance(s,path)/100*12));
  s.society.orders.push({...(long?{returnTicks:travelTicks}:{}),...(pathHasFord(s,path)?{fordWalk:true}:{}),person:id,owner:s.hero.lineage,from:source.id,to:crisis.area,enemy:crisis.enemy,stage:'marching',remaining:travelTicks});
  markNPCDeparture(s,s.people[id],'orders');
  provisionWatch(s,s.people[id],source);
  if(enabled(s,'npc-watch-needs'))source.objects.push({id:'watch-'+id,kind:'resident',person:id,name:s.people[id].name,x:s.people[id].x??42});
  const text=`${s.people[id].name} выходит по приказу совета. Герой поручает безопасность другому человеку.`;
  if(enabled(s,'npc-watch-needs'))watchNote(s,s.people[id],text,ctx,'orders');else ctx.log(s,text,'orders');return true;
}
function guardReply(s,order,p,enemy,source,target,ctx){
  const reply=enemyReply(s,enemy,enemy.attack+Math.floor(moduleRandom(s,'npc-combat')*3)+(enabled(s,'enemies')&&enemy.powers?.includes('fury')&&enemy.hp<enemy.maxHp*.35?3:0),{...ctx,combatArea:target.id},p);p.health=Math.max(0,p.health-reply);
  recordDangerContact(s,p,enemy,reply,'orders');
  if(enabled(s,'npc-watch-needs')&&reply>0)actorFact(s,'hurt',p.id,enemy.id,reply);
  if(enabled(s,'enemies')&&enemy.powers?.includes('regrowth'))enemy.hp=Math.min(enemy.maxHp,enemy.hp+2);
  if(p.health!==0)return;
  p.alive=false;p.status='dead';p.died=s.tick;p.deathCause=enemy.name||enemy.baseName||'Опасность на дороге';target.objects.push({id:'grave-'+p.id,kind:'grave',name:p.name,x:enabled(s,'npc-watch-needs')?p.x??40:40});
  recordPersonRemains(s,p,{area:target.id});
  s.society.orders=s.society.orders.filter(o=>o!==order);
  const text=`${p.name} не возвращается с поручения совета. ${enemy.baseName} остаётся на дороге.`;
  if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,ctx,'loss');else{s.society.events.unshift({tick:s.tick,area:source.id,text,kind:'loss'});if(s.hero.area===source.id||s.hero.area===target.id)ctx.log(s,text,'loss');}
}
export function ordersTick(s,ctx){
  if(!enabled(s,'orders'))return;
  for(const order of [...s.society.orders]){
    const p=s.people[order.person],target=s.areas[order.to],source=s.areas[order.from];if(!p?.alive){s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
    if(!npcAction(s,p,'orders'))continue;
    if(order.localAssistance&&order.stage==='returning'){
      p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;s.society.orders=s.society.orders.filter(o=>o!==order);
      watchNote(s,p,`${p.name} завершает местную помощь. Он остаётся там, где закончился бой.`,ctx,'orders');continue;
    }
    if(order.stage==='marching'||order.stage==='returning'){
      const needs=watchNeeds(s,p,ctx);
      if(!p.alive){s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
      if(needs.blocked)continue;
      const destination=order.stage==='returning'?source:target;
      if(order.campWalk||order.fordWalk||source?.temporaryCamp||target?.temporaryCamp){
        if(source?.temporaryCamp||target?.temporaryCamp)order.campWalk=true;const result=walkCampOrder(s,p,destination.id,order.stage==='returning'?51:40,ctx,order);
        if(result==='blocked'){
          if(order.stage!=='returning'){order.stage='returning';p.status='returning';}
          else {p.status='resident';p.agenda.task=null;p.agenda.due=s.tick+8;s.society.orders=s.society.orders.filter(o=>o!==order);}
          watchNote(s,p,`${p.name} не может пройти ${order.fordWalk?'по дороге':'к лагерю'}. Люди и поклажа остаются с этой стороны прохода.`,ctx,'orders');continue;
        }
        if(result!=='arrived')continue;
      }else {order.remaining--;if(order.remaining>0)continue;}
      if(order.stage==='returning'){
        p.area=source.id;p.status='resident';source.population ||= [];if(!source.population.includes(p.id))source.population.push(p.id);
        if(enabled(s,'npc-watch-needs')){p.x=51;const body=source.objects.find(o=>o.person===p.id);if(body)body.x=p.x;}
        if(!source.objects.some(o=>o.person===p.id))source.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:51});
        s.society.orders=s.society.orders.filter(o=>o!==order);const text=`${p.name} возвращается с дороги. Последний приказ завершён.`;if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,ctx,'orders');else if(s.hero.area===source.id)ctx.log(s,text,'orders');continue;
      }
      order.stage='fighting';p.area=target.id;p.status='guarding';
      if(watchNeedsActive(s))p.x=40;
      if(!target.objects.some(o=>o.person===p.id))target.objects.push({id:'guard-'+p.id,kind:'resident',person:p.id,name:p.name,x:40});
      if(watchNeedsActive(s))continue;
    }
    const enemy=target.objects.find(o=>o.id===order.enemy);
    if(!enemy?.alive||enemy.resolved){order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';continue;}
    const advice=guardSafetyAdvice(s,p,enemy);
    const needs=watchNeeds(s,p,ctx,true,Boolean(advice?.retreat));
    if(!p.alive){s.society.orders=s.society.orders.filter(o=>o!==order);continue;}
    if(advice)watchNote(s,p,`${p.name} ${advice.retreat?'принимает предупреждение':'решает продолжать бой'}: ${advice.reason}`,ctx,'orders');
    if(needs.retreat||advice?.retreat){
      order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';if(p.needs)p.needs.sleeping=false;
      p.x=Math.max(8,Math.min(92,(p.x??40)-Math.sign(enemy.x-(p.x??40)||1)*areaOffset(s.areas[p.area],12)));
      const body=target.objects.find(o=>o.person===p.id);if(body)body.x=p.x;
      watchNote(s,p,`${p.name} отступает: силы или тяжёлые раны больше не позволяют держать дорогу. Противник успевает ответить.`,ctx,'orders');
      guardReply(s,order,p,enemy,source,target,ctx);continue;
    }
    if(needs.blocked){guardReply(s,order,p,enemy,source,target,ctx);continue;}
    const armored=enabled(s,'enemies')&&enemy.powers?.includes('armored');
    const hit=enemyDamage(s,enemy,Math.max(1,p.attack+Math.floor(moduleRandom(s,'npc-combat')*4)-(armored?3:0)),'physical',ctx,s.hero.area===target.id);enemy.hp-=hit;
    actorFact(s,'attack',p.id,enemy.id);if(hit>0)actorFact(s,'hurt',enemy.id,p.id,hit);
    if(enemy.hp<=0){
      ctx.npcVictory(s,target,enemy,p);source.civic.safety=Math.min(100,source.civic.safety+25);
      if(source.civic.crisis?.enemy===enemy.id){const remaining=target.objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved);if(remaining)source.civic.crisis.enemy=remaining.id;else source.civic.crisis=null;}
      order.stage='returning';order.remaining=order.returnTicks||12;p.status='returning';continue;
    }
    guardReply(s,order,p,enemy,source,target,ctx);
  }
}
