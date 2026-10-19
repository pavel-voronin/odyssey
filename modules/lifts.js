import {fitLiftDrive,blockedDrivePlan} from './mechanic-drive.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcAction} from './npc-control.js';
import {partyBodySpent} from './party-combat-policy.js';
import {ITEM_CAPACITY,itemLocation,npcLooseItems} from './item-originals.js';
import {initializeItemMemory} from './enchantments.js';
import {initializeNewItemCondition} from './item-condition.js';
import {knowsPracticalMethod} from './skill-branches.js';
import {liftAt} from './lift-policy.js';
const memory=p=>(p.liftMemory ||= {version:1,known:[],lastActionTick:-1});
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
function body(s,p){const h=actor(s,p);return h?(h.transit?null:{area:h.area,x:h.x}):p.liftTransit?null:localContact(s,p.id,p.area);}
export function createLift(s,from,to,bypass){
 const key=[from,to].sort().join('|'),e=s.edges[key];if(!enabled(s,'mechanisms')||!e||e.lift||e.mechanism||!s.areas[from].links.includes(bypass)||!s.areas[to].links.includes(bypass))return null;
 const id='lift/'+key,x=Number(to.slice(1))>Number(from.slice(1))?82:18;
 const n={version:1,id,from,to,bypass,status:'broken',created:s.tick,console:{id:id+'/console',area:from,x},repair:0,wear:0,rides:0,charge:{fed:0,remaining:0,spent:0,discarded:0,loads:0},parts:[],issued:[id+'/part/0',id+'/part/1'],history:[]};
 for(let i=0;i<2;i++){const item={id:n.issued[i],kind:'mechanismPart',base:'blade',name:i?'Крепёж подъёмника':'Шестерня подъёмника',slot:'weapon',stat:'attack',power:0,rarity:1,modifier:'plain',value:3,found:s.tick,foundArea:from,mechanismPart:{version:1,node:id,created:s.tick},physical:{version:1,holder:{kind:'mechanism',id},movedAt:s.tick},history:[{tick:s.tick,text:'Деталь действительного подъёмника.'}]};initializeItemMemory(item);initializeNewItemCondition(s,item);n.parts.push(item);}
 e.lift=n;s.areas[from].objects.push({id:n.console.id,kind:'liftConsole',name:'Привод подъёмника',x,key});s.graphRevision=(s.graphRevision||0)+1;return n;
}
export function observeLift(s,p,from,to){
 const n=liftAt(s,from,to),b=p&&body(s,p);if(!enabled(s,'mechanisms')||!n||!p.alive||p.needs.sleeping||!b||![n.from,n.to].includes(b.area))return null;
 const a=s.areas[b.area],other=b.area===n.from?n.to:n.from,console=b.area===n.console.area&&a.objects.find(o=>o.id===n.console.id&&o.kind==='liftConsole');
 if(physicalDistance(a,b.x,console?.x??(Number(other.slice(1))>Number(b.area.slice(1))?100:0))>30)return null;
 const m=memory(p),key=[from,to].sort().join('|'),old=m.known.find(k=>k.key===key),note={key,status:n.status,remaining:n.charge.remaining,at:s.tick,consoleArea:console?b.area:old?.consoleArea??null};if(old?.after!==undefined)note.after=old.after;if(old?.driveRetry)note.driveRetry=old.driveRetry;const index=m.known.findIndex(k=>k.key===key);if(index<0)m.known.push(note);else m.known[index]=note;if(m.known.length>24)m.known.shift();return note;
}
export function workLift(s,p,key,action,ctx={}){
 if(action==='repair'&&s.edges[key]?.lift?.drive)return fitLiftDrive(s,p,key,ctx);
 const n=s.edges[key]?.lift,h=p&&actor(s,p),b=p&&body(s,p),a=b&&s.areas[b.area],console=a?.objects.find(o=>o.id===n?.console.id&&o.kind==='liftConsole'),energy=h?.energy??p?.needs?.energy,inventory=(h||s.actorStates[p?.id])?.inventory;
 if(!enabled(s,'mechanisms')||!n||n.status==='dismantled'||!p?.alive||p.needs.sleeping||!b||b.area!==n.console.area||!console||physicalDistance(a,b.x,console.x)>9||partyBodySpent(s,p)||energy<5||!['repair','fuel','dismantle'].includes(action))return false;
 if(action==='repair'&&(n.status!=='broken'||n.parts.length!==2)||action==='fuel'&&(n.charge.remaining>0||!(inventory?.relics>0)))return false;
 const bag=h?.bag||s.actorStates[p.id]?.bag||p.looseItems||[];if(action==='dismantle'&&bag.length+n.parts.length>ITEM_CAPACITY)return false;
 if(!h&&!npcAction(s,p,'personal'))return false;
 const cost=action==='dismantle'?4:3;if(h){h.energy-=cost;h.lastAction='work';}else p.needs.energy-=cost;memory(p).lastActionTick=s.tick;
 if(action==='repair'){n.repair++;if(n.repair>=(knowsPracticalMethod(s,p.id,'craft')?2:3)){n.status='ready';n.repair=0;n.wear=0;}}
 else if(action==='fuel'){inventory.relics--;n.charge.fed+=3;n.charge.remaining=3;n.charge.loads++;n.charge.source={person:p.id,tick:s.tick,resource:'relic',quantity:1,before:inventory.relics+1,after:inventory.relics};}
 else{const held=h?.bag||npcLooseItems(s,p);for(const part of n.parts.splice(0)){held.push(part);itemLocation(s,part,{kind:'person',id:p.id});part.history.push({tick:s.tick,text:`Разобрано: ${p.name}.`});}n.status='dismantled';n.charge.discarded+=n.charge.remaining;n.charge.remaining=0;}
 n.history.push({tick:s.tick,person:p.id,action});if(n.history.length>12)n.history.shift();s.graphRevision=(s.graphRevision||0)+1;observeLift(s,p,n.from,n.to);
 ctx.log?.(s,`${p.name} ${action==='repair'?(n.status==='ready'?'восстанавливает привод подъёмника':'правит привод подъёмника'):action==='fuel'?'вставляет свой осколок света: хватит на три поездки':'разбирает подъёмник и забирает две его детали. Прямой путь теперь не работает'}.`,'craft');return true;
}
export function blockedLiftPlan(s,to,ctx){
 const h=s.hero,p=s.people[h.lineage],n=liftAt(s,h.area,to),note=observeLift(s,p,h.area,to);if(!note)return false;if(blockedDrivePlan(s,n,[h.area,to].sort().join('|'),ctx,note))return true;
 let action=null;if(note.consoleArea===h.area&&h.energy>=35&&h.personality.curiosity>=.5&&n.status!=='dismantled'){
  if(h.gold<8&&h.personality.generosity<.4)action='dismantle';else if(n.status==='broken')action='repair';else if(h.inventory.relics>0&&!(h.inventory.relics===1&&h.quests.some(q=>q.status==='active'&&q.kind==='relic')))action='fuel';
 }
 if(!action){h.goal=null;note.after=s.tick+48;ctx.log?.(s,'Подъёмник недоступен. Герой бережёт припасы и выбирает известный обход.','plan');return true;}
 const resume=structuredClone(h.goal);ctx.goal(s,'liftWork',h.area,n.console.x,action==='repair'?'Починить подъёмник':action==='fuel'?'Запитать подъёмник':'Разобрать подъёмник','Работа требует подойти к настоящему приводу. Реликвия и детали остаются конечными.',{key:[h.area,to].sort().join('|'),operation:action,resume});return true;
}
export function liftAction(s,ctx){const h=s.hero,g=h.goal;if(!g||!workLift(s,s.people[h.lineage],g.key,g.operation,ctx)){h.goal=null;return;}if(g.operation!=='repair'||s.edges[g.key].lift.status!=='broken')h.goal=g.resume;}
