import {physicalDistance} from '../geometry.js';
import {layoutOn,layoutRoot,layoutMemory,observeDelveLayout} from './delve-layout.js';
import {areaAvoided,expectedLoss} from './route-memory.js';
import {delveRecord,pauseDelve,finishDelve,reentryReason,reconsiderDelve} from './delve-attempts.js';
const ownNote=(m,a,b)=>{const x=m.rooms[a]?.exits[b],y=m.rooms[b]?.exits[a];return !x?y:!y?x:x.seen>=y.seen?x:y;};
function passable(s,m,a,b){
 const h=s.hero,n=ownNote(m,a,b),r=delveRecord(s);if(!n)return false;
 if(areaAvoided(s,b))return false;
 if(r?.last?.area===b&&r.risk?.area!==b&&!reentryReason(s,r))return false;
 return n.gate!=='closed'||n.lever?.area===a&&h.personality.curiosity>=.5&&h.energy>=35;
}
export function personalLayoutPath(s,m,from,to){
 const queue=[from],parents={[from]:null};
 for(let i=0;i<queue.length;i++){
  const a=queue[i],next=new Set([...Object.keys(m.rooms[a]?.exits||{}),...Object.values(m.rooms).filter(r=>r.exits[a]).map(r=>r.area)]);
  for(const b of [...next].sort((a,b)=>Number(Boolean(m.rooms[b]))-Number(Boolean(m.rooms[a]))||a.localeCompare(b)))if(!(b in parents)&&passable(s,m,a,b)){parents[b]=a;queue.push(b);}
 }
 if(!(to in parents))return [];const out=[];for(let id=to;id!==null;id=parents[id])out.push(id);return out.reverse();
}
function move(s,m,to,ctx,reason){
 const h=s.hero,n=ownNote(m,h.area,to);
 if(n?.gate==='closed'&&n.lever?.area===h.area){const known=s.people[h.lineage].mechanisms?.known.find(e=>e.key===n.key);ctx.goal(s,'mechanism',h.area,n.lever.x,known?.understood?'Поднять известную решётку':'Разобраться с известным рычагом',reason,{key:n.key,operation:known?.understood?'open':'inspect'});return true;}
 ctx.goal(s,'layoutMove',to,42,'Поход: '+(m.rooms[to]?.name||m.rooms[h.area]?.exits[to]?.label||'известный проход'),reason,{delve:true,layoutRoot:h.delve.root});return true;
}
function leaving(s,m,ctx,why){
 const h=s.hero;if(m.returning===null){m.returning=why;ctx.log(s,why,'choice');}
 const path=m.exit&&personalLayoutPath(s,m,h.area,m.exit);if(path?.length>1)return move(s,m,path[1],ctx,'Он возвращается по лично осмотренным проходам. Зачищать оставшиеся залы не требуется.');
 if(h.area===m.exit){ctx.goal(s,'layoutMove',h.area,42,'Завершить поход у входа',why,{delve:true,layoutRoot:h.delve.root});return true;}
 ctx.goal(s,'layoutWait',h.area,h.x,'Найти доступный обратный проход','Известный путь сейчас не проходит. Решётка, люди и вещи остаются на своих местах.',{delve:true,layoutRoot:h.delve.root});return true;
}
export function layoutPlan(s,ctx){
 const h=s.hero,d=h.delve,root=d&&s.areas[d.root];if(!root?.dungeon?.layout)return false;if(!layoutOn(s))return false;
 if(h.quests.some(q=>q.status==='active'&&q.dungeonRescue))return false;
 const m=observeDelveLayout(s)||layoutMemory(s,d.root),here=layoutRoot(s,h.area);
 if(!here){if(m?.returning)return leaving(s,m,ctx,m.returning);ctx.goal(s,'layoutMove',d.root,42,'Войти в известный спуск','За входом пока нет лично осмотренных залов.',{delve:true,layoutRoot:d.root});return true;}
 const n=m.rooms[h.area],record=delveRecord(s);if(record?.status==='paused'&&record.last?.area!==h.area){record.status='active';record.reason='known-alternative';record.risk=null;}
 const gained=m.gains.slice(d.layoutGainStart),purpose=record?.purpose?.kind||'curiosity',fulfilled=purpose==='relics'?gained.some(g=>g.kind==='relic'):gained.length>0;
 if(s.tick-d.started>1200)return leaving(s,m,ctx,'Поход затянулся. Он возвращается к настоящему выходу по известным проходам.');
 if(m.returning||fulfilled&&(h.personality.courage<.65||h.personality.curiosity<.6||gained.some(g=>g.role==='final'))||h.hp<h.maxHp*.55||h.energy<30)return leaving(s,m,ctx,m.returning||'Он добыл нужное или исчерпал безопасный запас сил. Возвращение важнее полной зачистки.');
 const enemy=s.areas[h.area].objects.find(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<=30);
 if(enemy){
  if(record?.status==='paused'&&record.last?.enemy===enemy.id&&!reconsiderDelve(s,ctx))return leaving(s,m,ctx,'Прежний риск не изменился. Он ищет обратный путь, сохраняя память о неудаче.');
  if(expectedLoss(s,enemy)>h.hp*(.35+h.personality.courage*.6)){pauseDelve(s,enemy,'observed-risk');h.memory.avoided[h.area]=s.tick+160;return leaving(s,m,ctx,'Увиденная угроза слишком велика. Он уходит по известным проходам.');}
  ctx.goal(s,'hunt',h.area,enemy.x,'Пройти мимо: '+enemy.name,'Препятствие действительно находится перед ним; чужие залы пока неизвестны.',{object:enemy.id,delve:true});return true;
 }
 const find=Object.values(n.finds).find(o=>!o.taken);if(find){ctx.goal(s,'collect',h.area,find.x,find.name,'Это лично замеченный предмет, а не награда за число очищенных комнат.',{object:find.id,delve:true});return true;}
 if(n.min>30||n.max<70){ctx.goal(s,'layoutSurvey',h.area,n.min>30?25:75,'Осмотреть зал и его проходы','Содержимое дальних комнат не известно. Он сначала подходит и смотрит.',{delve:true,layoutRoot:d.root});return true;}
 const candidates=[];
 for(const r of Object.values(m.rooms))for(const e of Object.values(r.exits)){
  if(e.to===m.exit||m.rooms[e.to]||!passable(s,m,r.area,e.to))continue;
  const path=personalLayoutPath(s,m,h.area,r.area);if(!path.length)continue;
  const gate=e.gate==='closed',shape=e.kind==='side'?(h.personality.courage<.65?5:0):e.kind==='deep'?(h.personality.courage>=.65?6:-2):0;
  const score=10+shape+(purpose==='relics'&&e.kind==='deep'?8:0)+(e.lever?(h.personality.courage<.65?3:-3):0)-path.length;
  candidates.push({e,from:r.area,path,score});
 }
 candidates.sort((a,b)=>b.score-a.score||a.e.to.localeCompare(b.e.to));const next=candidates[0];
 if(next){m.lastChoice={tick:s.tick,from:h.area,toward:next.e.to,via:next.from,reason:next.e.gate==='closed'?'known-lever':next.e.kind};return move(s,m,next.path.length>1?next.path[1]:next.e.to,ctx,next.e.gate==='closed'?'Известный рычаг предлагает другой путь; его ещё нужно привести в действие.':'Он выбирает лично замеченный проход по своему делу и готовности к риску.');}
 return leaving(s,m,ctx,'Доступные лично известные цели закончились. Он не обязан искать последнего стража.');
}
export function layoutAction(s,ctx){
 const h=s.hero,g=h.goal,m=g?.layoutRoot&&layoutMemory(s,g.layoutRoot);if(!g||!layoutOn(s))return false;h.lastAction='look';h.goal=null;observeDelveLayout(s);
 if(m?.returning&&h.area===m.exit){finishDelve(s,m.gains.slice(h.delve.layoutGainStart).length?'loot':'left');h.delve=null;h.memory.delveAfter=s.tick+650;ctx.log(s,'Поход закончен у настоящего выхода. Непотревоженные комнаты и вещи остались в мире.','choice');}
 return true;
}

export {layoutOn};
